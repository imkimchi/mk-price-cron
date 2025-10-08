#!/usr/bin/env node

'use strict';

const path = require('path');
const dotenv = require('dotenv');
const mongoose = require('mongoose');

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const databaseConnect = require('./lib/database');
const { recordCustomerPriceHistory } = require('./lib/jobs/customerPriceHistoryJob');

async function runManual() {
  if (process.env.DISABLE_PRICE_HISTORY_JOB === 'true') {
    console.log('[CustomerPriceHistoryWorker] Job disabled via DISABLE_PRICE_HISTORY_JOB flag.');
    return;
  }

  try {
    await databaseConnect();
    const { recorded, date } = await recordCustomerPriceHistory({ databaseConnect });
    const isoDate = date instanceof Date ? date.toISOString() : new Date(date).toISOString();
    console.log('[CustomerPriceHistoryWorker] (manual) recorded %d entries for %s', recorded, isoDate);
  } catch (error) {
    console.error('[CustomerPriceHistoryWorker] (manual) run failed:', error?.message || error);
    console.error(error);
    process.exitCode = 1;
  } finally {
    await mongoose.connection.close().catch(() => {});
  }
}

runManual();
