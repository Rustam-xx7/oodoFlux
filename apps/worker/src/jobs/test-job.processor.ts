import { Job } from 'bullmq';

export interface TestJobPayload {
  message: string;
  triggeredAt: string;
}

export interface TestJobResult {
  processed: boolean;
  jobId: string;
  receivedMessage: string;
  completedAt: string;
  workerPid: number;
}

export async function processTestJob(
  job: Job<TestJobPayload>,
): Promise<TestJobResult> {
  console.log(`[BullMQ Worker] ⚙️ Processing Test Job #${job.id}:`, job.data);

  // Simulate minimal asynchronous work
  await new Promise((resolve) => setTimeout(resolve, 100));

  const result: TestJobResult = {
    processed: true,
    jobId: job.id ?? 'unknown',
    receivedMessage: job.data.message,
    completedAt: new Date().toISOString(),
    workerPid: process.pid,
  };

  console.log(
    `[BullMQ Worker] ✅ Successfully finished Test Job #${job.id}:`,
    result,
  );
  return result;
}
