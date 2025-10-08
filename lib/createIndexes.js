const mongoose = require('mongoose');

/**
 * Copy of backend/utils/createIndexes.js for standalone worker usage
 */

const createIndexes = async () => {
  const specs = {
    products: [
      [{ is_active: 1, category: 1, created_at: -1 }, { background: true }],
      [{ description: 'text', code: 'text' }, { background: true }],
      [{ category: 1 }, { background: true }],
      [{ stock_quantity: 1 }, { background: true }],
      [{ _id: 1, is_active: 1, category: 1 }, { background: true }]
    ],
    orders: [
      [{ customer_id: 1, created_at: -1 }, { background: true }],
      [{ status: 1, created_at: -1 }, { background: true }],
      [{ created_at: -1 }, { background: true }],
      [{ scheduled_for: -1 }, { background: true }],
      [{ order_number: 1 }, { background: true }],
      [{ _id: 1, status: 1 }, { background: true }]
    ],
    invoices: [
      [{ customer_id: 1, created_at: -1 }, { background: true }],
      [{ status: 1, created_at: -1 }, { background: true }],
      [{ type: 1, created_at: -1 }, { background: true }],
      [{ date: -1 }, { background: true }],
      [{ type: 1, date: -1 }, { background: true }],
      [{ company_id: 1, type: 1, date: -1 }, { background: true }],
      [{ invoice_number: 1 }, { background: true }]
    ],
    contacts: [
      [{ type: 1, created_at: -1 }, { background: true }],
      [{ name: 'text', email: 'text' }, { background: true }],
      [{ email: 1 }, { background: true }]
    ],
    customers: [
      [{ email: 1 }, { background: true }],
      [{ name: 'text' }, { background: true }],
      [{ _id: 1, markup_percentage: 1 }, { background: true }],
      [{ company_name: 1, username: 1 }, { background: true }]
    ],
    dailypricings: [
      [{ product_id: 1, unit: 1, date: -1 }, { background: true }],
      [{ date: -1 }, { background: true }],
      [{ product_id: 1, date: -1 }, { background: true }],
      [{ date: -1, product_id: 1, unit: 1 }, { background: true }]
    ],
    orderitems: [
      [{ order_id: 1 }, { background: true }],
      [{ product_id: 1 }, { background: true }],
      [{ order_id: 1, product_id: 1, unit: 1 }, { background: true }],
      [{ status: 1, order_id: 1 }, { background: true }]
    ],
    invoiceitems: [
      [{ invoice_id: 1 }, { background: true }],
      [{ product_id: 1 }, { background: true }],
      [{ invoice_id: 1, product_id: 1, unit: 1 }, { background: true }]
    ]
  };

  const collectionPromises = Object.entries(specs).map(async ([name, indexes]) => {
    const col = mongoose.connection.collection(name);
    const results = await Promise.allSettled(
      indexes.map(([keys, options]) =>
        col.createIndex(keys, options).catch(err => {
          if (err.code === 85 || err.code === 86 || err.message.includes('already exists')) {
            return { skipped: true, reason: 'Index already exists' };
          }
          throw err;
        })
      )
    );

    const realFailures = results.filter(
      r => r.status === 'rejected' && !r.reason?.message?.includes('already exists')
    );

    if (realFailures.length) {
      const err = new Error(
        `Index creation failed for collection "${name}" (${realFailures.length} of ${indexes.length})`
      );
      err.details = realFailures.map(f => f.reason?.message || String(f.reason));
      throw err;
    }
    return true;
  });

  const allResults = await Promise.allSettled(collectionPromises);
  const allFailures = allResults.filter(r => r.status === 'rejected');
  if (allFailures.length) {
    console.warn(
      `⚠️ Index creation encountered failures in ${allFailures.length} collection(s):`,
      allFailures.map(f => f.reason?.message || String(f.reason))
    );
    console.log('✅ Application will continue to work, but performance may not be optimal.');
    return false;
  }

  console.log('✅ All database indexes created successfully');
  return true;
};

const addIndexesToConnection = async () => {
  mongoose.connection.once('open', async () => {
    try {
      await createIndexes();
    } catch {
      // Ignore errors; indexes are best-effort for worker
    }
  });
};

module.exports = {
  createIndexes,
  addIndexesToConnection
};
