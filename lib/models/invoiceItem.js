const mongoose = require('mongoose');

const invoiceItemSchema = new mongoose.Schema({
  invoice_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice', required: true },
  product_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  description: { type: String, required: true },
  quantity: { type: Number, required: true },
  net_amount: { type: Number, required: true },
  unit: { type: String, default: 'per kg' },
  markup_percentage: { type: Number, default: 20 },
  profit_percentage: { type: Number, default: 0 },
  unit_price: { type: Number, required: true },
  final_unit_price: { type: Number, default: 0 },
  manual_price_override: { type: Boolean, default: false },
  manual_price_override_until: { type: Date, default: null }
});

invoiceItemSchema.virtual('line_total').get(function () {
  return this.net_amount * (this.final_unit_price || this.unit_price);
});

module.exports =
  mongoose.models.InvoiceItem || mongoose.model('InvoiceItem', invoiceItemSchema);
