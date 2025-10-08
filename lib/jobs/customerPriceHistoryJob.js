const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');
const mongoose = require('mongoose');

const Invoice = require('../models/invoice');
const InvoiceItem = require('../models/invoiceItem');
const CustomerPriceHistory = require('../models/customerPriceHistory');

dayjs.extend(utc);
dayjs.extend(timezone);

const LONDON_TZ = 'Europe/London';

async function recordCustomerPriceHistory({ targetDate, databaseConnect } = {}) {
  if (typeof databaseConnect === 'function') {
    await databaseConnect();
  }

  const referenceDate = targetDate
    ? dayjs(targetDate).tz(LONDON_TZ)
    : dayjs().tz(LONDON_TZ);

  const startOfDay = referenceDate.startOf('day');
  const endOfDay = referenceDate.endOf('day');

  const salesInvoices = await Invoice.find({
    type: 'sales',
    company_model: 'Customer',
    date: {
      $gte: startOfDay.toDate(),
      $lte: endOfDay.toDate()
    }
  }).select('_id company_id');

  if (!salesInvoices.length) {
    return {
      recorded: 0,
      date: startOfDay.toDate()
    };
  }

  const invoiceCustomerMap = new Map();

  for (const invoice of salesInvoices) {
    if (!invoice.company_id) continue;

    invoiceCustomerMap.set(
      invoice._id.toString(),
      invoice.company_id instanceof mongoose.Types.ObjectId
        ? invoice.company_id
        : new mongoose.Types.ObjectId(invoice.company_id)
    );
  }

  if (!invoiceCustomerMap.size) {
    return {
      recorded: 0,
      date: startOfDay.toDate()
    };
  }

  const invoiceIds = Array.from(invoiceCustomerMap.keys()).map(
    id => new mongoose.Types.ObjectId(id)
  );

  const invoiceItems = await InvoiceItem.find({
    invoice_id: { $in: invoiceIds }
  }).select('invoice_id product_id unit unit_price final_unit_price');

  let recordedCount = 0;

  for (const item of invoiceItems) {
    const customerId = invoiceCustomerMap.get(item.invoice_id.toString());
    if (!customerId) continue;

    if (!item.product_id) continue;

    const effectiveUnitPrice =
      typeof item.final_unit_price === 'number' && item.final_unit_price > 0
        ? item.final_unit_price
        : item.unit_price;

    if (typeof effectiveUnitPrice !== 'number' || effectiveUnitPrice <= 0) {
      continue;
    }

    const unitValue = (item.unit && item.unit.trim()) || 'per kg';

    await CustomerPriceHistory.findOneAndUpdate(
      {
        customer_id: customerId,
        product_id: item.product_id,
        unit: unitValue,
        date: startOfDay.toDate()
      },
      {
        $set: {
          unit_price: effectiveUnitPrice,
          recorded_at: new Date(),
          invoice_id: item.invoice_id,
          invoice_item_id: item._id
        }
      },
      {
        upsert: true,
        new: true
      }
    );

    recordedCount += 1;
  }

  return {
    recorded: recordedCount,
    date: startOfDay.toDate()
  };
}

module.exports = {
  recordCustomerPriceHistory
};
