/**
 * BullMQ worker for asynchronous event parsing jobs.
 *
 * When the API receives a parse request, it can optionally enqueue a job
 * here instead of waiting synchronously. This is useful for:
 *  - Rate-limiting Claude API calls
 *  - Retry logic on transient failures
 *  - Decoupling parsing from the HTTP request lifecycle
 *
 * Usage:
 *   import { parseEventQueue } from './parseEventWorker';
 *   await parseEventQueue.add('parse', { description, eventId, userId });
 */

import { Queue, Worker, type Job } from 'bullmq';
import { createClient } from '@supabase/supabase-js';
import { claudeService } from '../services/claudeService';
import type { ParsedEventResponse, ParsedCategory } from '@hangout/shared';

const QUEUE_NAME = 'parse-event';

const redisConnection = {
  host: new URL(process.env.REDIS_URL ?? 'redis://localhost:6379').hostname,
  port: parseInt(
    new URL(process.env.REDIS_URL ?? 'redis://localhost:6379').port || '6379',
    10,
  ),
};

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

// ─── Job types ────────────────────────────────────────────────────────────────

export interface ParseEventJobData {
  description: string;
  eventId: string;
  userId: string;
}

export interface ParseEventJobResult {
  parsed: ParsedEventResponse;
  itemsCreated: number;
}

// ─── Queue (producer API) ─────────────────────────────────────────────────────

export const parseEventQueue = new Queue<ParseEventJobData, ParseEventJobResult>(
  QUEUE_NAME,
  {
    connection: redisConnection,
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 50 },
    },
  },
);

// ─── Worker (consumer) ────────────────────────────────────────────────────────

export function startParseEventWorker(): Worker<ParseEventJobData, ParseEventJobResult> {
  const worker = new Worker<ParseEventJobData, ParseEventJobResult>(
    QUEUE_NAME,
    async (job: Job<ParseEventJobData, ParseEventJobResult>) => {
      const { description, eventId } = job.data;

      console.log(`[parseEventWorker] Processing job ${job.id} for event ${eventId}`);

      // 1. Call Claude
      const parsed = await claudeService.parseEventDescription(description);

      // 2. Bulk-insert items into the database
      const items = (parsed.categories as ParsedCategory[]).flatMap((cat) =>
        cat.items.map((item) => ({
          event_id: eventId,
          category: cat.name,
          name: item.name,
          quantity: item.quantity,
          unit: item.unit,
          notes: item.notes,
          is_ai_generated: true,
        })),
      );

      let itemsCreated = 0;
      if (items.length > 0) {
        const { data, error } = await supabase.from('items').insert(items).select('id');
        if (error) {
          throw new Error(`Failed to insert items: ${error.message}`);
        }
        itemsCreated = data?.length ?? 0;
      }

      // 3. Update event with AI-inferred metadata
      if (parsed.eventName || parsed.suggestedDate) {
        await supabase
          .from('events')
          .update({
            ...(parsed.eventName ? { title: parsed.eventName } : {}),
            ...(parsed.suggestedDate ? { event_date: parsed.suggestedDate } : {}),
            status: 'active',
          })
          .eq('id', eventId);
      }

      console.log(`[parseEventWorker] Job ${job.id} complete: ${itemsCreated} items created`);

      return { parsed, itemsCreated };
    },
    { connection: redisConnection, concurrency: 5 },
  );

  worker.on('completed', (job) => {
    console.log(`[parseEventWorker] Job ${job.id} completed`);
  });

  worker.on('failed', (job, err) => {
    console.error(`[parseEventWorker] Job ${job?.id} failed:`, err.message);
  });

  return worker;
}
