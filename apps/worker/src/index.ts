import { Worker } from 'bullmq';
import { redisConnectionOptions } from './connection';
import { processTestJob, TestJobPayload } from './jobs/test-job.processor';
import { processRecurringBillingJob } from './jobs/billing.processor';

export const QUEUE_NAME = 'system-tasks';

console.log(`[BullMQ Worker] 🚀 Initializing background worker process...`);
console.log(
  `[BullMQ Worker] 📡 Redis target: ${redisConnectionOptions.host}:${redisConnectionOptions.port}`,
);

export const worker = new Worker(
  QUEUE_NAME,
  async (job) => {
    switch (job.name) {
      case 'TEST_JOB':
        return await processTestJob(job as any);
      case 'RECURRING_BILLING_CYCLE':
        return await processRecurringBillingJob(job);
      default:
        console.warn(`[BullMQ Worker] ⚠️ Unknown job name: ${job.name}`);
        return { processed: false, reason: 'Unknown job name' };
    }
  },
  {
    connection: redisConnectionOptions,
    concurrency: parseInt(process.env.WORKER_CONCURRENCY || '5', 10),
  },
);

worker.on('ready', () => {
  console.log(
    `[BullMQ Worker] 🟢 Worker connected and listening for jobs on queue '${QUEUE_NAME}'`,
  );
});

worker.on('completed', (job, result) => {
  console.log(
    `[BullMQ Worker] 🌟 Job #${job.id} (${job.name}) completed successfully:`,
    result,
  );
});

worker.on('failed', (job, err) => {
  console.error(
    `[BullMQ Worker] ❌ Job #${job?.id} (${job?.name}) failed:`,
    err.message,
  );
});

worker.on('error', (err) => {
  console.error(`[BullMQ Worker] 🛑 Worker encountered an error:`, err.message);
});

// Graceful shutdown handling
process.on('SIGINT', async () => {
  console.log(`[BullMQ Worker] 🛑 SIGINT received, closing worker...`);
  await worker.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log(`[BullMQ Worker] 🛑 SIGTERM received, closing worker...`);
  await worker.close();
  process.exit(0);
});
