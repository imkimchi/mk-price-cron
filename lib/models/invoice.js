const mongoose = require('mongoose');

const invoiceSchema = new mongoose.Schema({
  invoice_number: { type: String, unique: true },
  type: {
    type: String,
    required: true,
    enum: ['sales', 'purchase']
  },
  company_id: { type: mongoose.Schema.Types.ObjectId, refPath: 'company_model' },
  company_model: {
    type: String,
    required: true,
    enum: ['Customer', 'Contact']
  },
  date: { type: Date, required: true },
  due_date: { type: Date, required: true },
  subtotal: { type: Number, required: true },
  vat: { type: Number, default: 0.0 },
  total: { type: Number, required: true },
  amount_paid: { type: Number, default: 0.0 },
  payments: [
    {
      amount: { type: Number, required: true },
      payment_date: { type: Date, default: Date.now },
      payment_method: {
        type: String,
        enum: ['cash', 'cheque', 'electronic', 'credit_card', 'debit_card'],
        default: 'cash'
      },
      paid_into: { type: String, default: '' },
      reference: { type: String, default: '' },
      recorded_at: { type: Date, default: Date.now }
    }
  ],
  notes: { type: String, default: '' },
  terms: { type: String, default: '' },
  sage_id: { type: String },
  reference: { type: String },
  sage_invoice_number: { type: String },
  created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'AdminUser' },
  updated_by: { type: mongoose.Schema.Types.ObjectId, ref: 'AdminUser' },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
});

module.exports = mongoose.models.Invoice || mongoose.model('Invoice', invoiceSchema);
