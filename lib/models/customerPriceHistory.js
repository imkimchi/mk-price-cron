const mongoose = require('mongoose');

const customerPriceHistorySchema = new mongoose.Schema({
  customer_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: true
  },
  product_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  unit: {
    type: String,
    required: true,
    trim: true
  },
  unit_price: {
    type: Number,
    required: true,
    min: 0
  },
  date: {
    type: Date,
    required: true
  },
  recorded_at: {
    type: Date,
    default: Date.now
  },
  invoice_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Invoice'
  },
  invoice_item_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'InvoiceItem'
  }
});

customerPriceHistorySchema.index(
  { customer_id: 1, product_id: 1, unit: 1, date: 1 },
  { unique: true }
);
customerPriceHistorySchema.index({ customer_id: 1, product_id: 1, date: -1 });

module.exports =
  mongoose.models.CustomerPriceHistory ||
  mongoose.model('CustomerPriceHistory', customerPriceHistorySchema);
