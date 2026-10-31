import { Queue, QueueEvents } from 'bullmq';
import { redisConnectionOptions } from './connection';
import { QUEUE_NAME } from './index';

async function runTestJob() {
  console.log(`[Test Job Runner] 📡 Connecting to queue '${QUEUE_NAME}'...`);
  const queue = new Queue(QUEUE_NAME, { connection: redisConnectionOptions });
  const queueEvents = new QueueEvents(QUEUE_NAME, {
    connection: redisConnectionOptions,
  });

  try {
    console.log(
      `[Test Job Runner] 📤 Enqueuing TEST_JOB into '${QUEUE_NAME}'...`,
    );
    const job = await queue.add('TEST_JOB', {
      message: 'Infrastructure verification ping from test-job-runner',
      triggeredAt: new Date().toISOString(),
    });

    console.log(
      `[Test Job Runner] ⏳ Job enqueued with ID: ${job.id}. Waiting for worker to complete...`,
    );

    const result = await job.waitUntilFinished(queueEvents, 10000);
    console.log(
      `[Test Job Runner] 🎉 TEST_JOB completed successfully! Result:`,
      result,
    );
  } catch (error) {
    console.error(
      `[Test Job Runner] ❌ Test job execution error:`,
      (error as Error).message,
    );
  } finally {
    await queue.close();
    await queueEvents.close();
    process.exit(0);
  }
}

runTestJob();
