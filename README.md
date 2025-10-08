# Customer Price History Worker

A lightweight Node.js worker that runs the daily customer price history crawler outside of the Vercel deployment. Use this service on a dedicated server (e.g. EC2, bare metal, cron box) to ensure pricing snapshots are captured even when serverless runtimes sleep.

## What It Does
- Reuses the existing `recordCustomerPriceHistory` job from `backend/jobs/customerPriceHistoryJob.js`
- Connects to the same MongoDB instance as the main app
- Supports one-off execution (ideal for cron) and long-running schedule mode

## Getting Started
1. Copy the example environment file and provide credentials:
   ```bash
   cp .env.example .env
   ```
2. Install dependencies (npm or pnpm both work):
   ```bash
   npm install
   # or
   pnpm install
   ```
3. Run the scheduler (default behaviour, fires daily at 15:00 UK time):
   ```bash
   npm run start:schedule
   # or simply
   npm start
   ```
4. Trigger a manual one-off run:
   ```bash
   npm run run:manual
   ```
5. Run the job once (exits after completion):
   ```bash
   npm run start:once
   ```

## Environment Variables
| Variable | Description | Default |
| --- | --- | --- |
| `MONGO_URI` | MongoDB connection string | Required |
| `MONGODB_DB` | Database name | `test` (from backend default) |
| `MAX_POOL_SIZE` | Max Mongo connections | `10` |
| `WORKER_MODE` | `once` or `schedule` | CLI arg overrides |
| `WORKER_CRON` | Cron expression for schedule mode | `0 15 * * *` |
| `DISABLE_PRICE_HISTORY_JOB` | Set to `true` to skip execution | `false` |

The worker defers to the shared `backend/config/database.js`, so any extra options supported there (e.g. `MONGODB_APPNAME`) are respected.

## Deployment Notes
- Clone the full repository so shared backend models are available.
- Install dependencies from the repository root (`pnpm install`) or inside this folder.
- For PM2/systemd, wire `npm run start:schedule` and ensure the `.env` file is present.
- Logs are written to STDOUT/STDERR; redirect as needed for your infra.

## Scheduling Suggestions
- Cron: `0 15 * * * cd /path/to/mkenterprise/customer-price-history-worker && npm run start:once`
- PM2: `pm2 start npm --name price-history-worker -- run start:schedule`

## Troubleshooting
- **Mongo auth errors**: verify credentials in `.env` match production cluster.
- **Duplicate key errors**: upserts are idempotent; reruns are safe.
- **Job disabled**: ensure `DISABLE_PRICE_HISTORY_JOB` is not `true` in the environment.
