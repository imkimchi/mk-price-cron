#!/usr/bin/env node

'use strict';

const path = require('path');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const cron = require('node-cron');

// Load environment variables from .env in this directory (falls back to process cwd)
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const databaseConnect = require('./lib/database');
const { recordCustomerPriceHistory } = require('./lib/jobs/customerPriceHistoryJob');

const MODE_ONCE = 'once';
const MODE_SCHEDULE = 'schedule';
const DEFAULT_CRON = '0 15 * * *';
const DEFAULT_TZ = 'Europe/London';

function normalizeMode(rawMode) {
  const mode = (rawMode || '').toLowerCase();
  if (mode === MODE_ONCE || mode === MODE_SCHEDULE) {
    return mode;
  }
  return MODE_ONCE;
}

const modeArg = process.argv[2];
const mode = normalizeMode(modeArg || process.env.WORKER_MODE || MODE_SCHEDULE);
const cronExpression = process.env.WORKER_CRON || DEFAULT_CRON;
const cronTimezone = process.env.WORKER_TZ || DEFAULT_TZ;

if (process.env.DISABLE_PRICE_HISTORY_JOB === 'true') {
  console.log('[CustomerPriceHistoryWorker] Job is disabled via DISABLE_PRICE_HISTORY_JOB flag. Exiting.');
  process.exit(0);
}

async function ensureDatabaseConnection() {
  await databaseConnect();
  return mongoose.connection;
}

async function runJob(trigger = 'manual') {
  try {
    const { recorded, date } = await recordCustomerPriceHistory({ databaseConnect });
    const isoDate = date instanceof Date ? date.toISOString() : new Date(date).toISOString();
    console.log(
      '[CustomerPriceHistoryWorker] (%s) recorded %d entries for %s',
      trigger,
      recorded,
      isoDate
    );
    return { recorded, date };
  } catch (error) {
    console.error('[CustomerPriceHistoryWorker] (%s) failed: %s', trigger, error?.message || error);
    console.error(error);
    throw error;
  }
}

async function runOnceAndExit() {
  try {
    await ensureDatabaseConnection();
    await runJob('once');
  } finally {
    await mongoose.connection.close().catch(() => {});
  }
  process.exit(0);
}

async function startSchedule() {
  const connection = await ensureDatabaseConnection();
  console.log('[CustomerPriceHistoryWorker] Connected to MongoDB: %s', connection.name);
  console.log('[CustomerPriceHistoryWorker] Scheduling cron "%s" (%s)', cronExpression, cronTimezone);

  cron.schedule(cronExpression, () => {
    runJob('cron').catch(() => {});
  }, { timezone: cronTimezone });

  // Kick off an initial run immediately for up-to-date data
  await runJob('startup').catch(() => {});
}

function handleTermination(signal) {
  console.log('[CustomerPriceHistoryWorker] Received %s, shutting down...', signal);
  mongoose.connection.close(() => {
    process.exit(0);
  });
}

process.on('SIGINT', handleTermination);
process.on('SIGTERM', handleTermination);

if (mode === MODE_SCHEDULE) {
  startSchedule().catch(error => {
    console.error('[CustomerPriceHistoryWorker] Failed to start schedule:', error);
    process.exit(1);
  });
} else {
  runOnceAndExit().catch(error => {
    console.error('[CustomerPriceHistoryWorker] Run failed:', error);
    process.exit(1);
  });
}
