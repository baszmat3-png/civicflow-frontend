import { prisma } from '../config/database.js';
import { whatsAppProvider } from './whatsapp/index.js';

/**
 * Durable outbound message queue.
 *
 * - Callers (controllers, jobs) only INSERT a row -> API responses never wait for the provider.
 * - A worker claims rows with FOR UPDATE SKIP LOCKED, so several instances never double-send.
 * - Failures are retried with exponential backoff; rows survive restarts (Render free tier sleeps).
 * - If the queue table is unavailable (migration not applied yet) we degrade to a
 *   fire-and-forget direct send, so notifications never break.
 */

export interface EnqueueOptions {
  to: string;
  message: string;
  templateKey?: string;
  requestId?: string;
  /** 1 = most urgent (OTP), 5 = normal, 9 = bulk */
  priority?: number;
  /** Unique key: enqueueing the same key twice is a no-op (idempotent reminders) */
  dedupeKey?: string;
  /** Delay first attempt */
  delayMs?: number;
  maxAttempts?: number;
}

export interface EnqueueResult {
  success: boolean;
  queued: boolean;
  id?: string;
  duplicate?: boolean;
}

const CONCURRENCY = Math.max(1, Number(process.env.MESSAGE_QUEUE_CONCURRENCY || 6));
const POLL_INTERVAL_MS = Math.max(1000, Number(process.env.MESSAGE_QUEUE_POLL_MS || 4000));
const STALE_LOCK_MS = 2 * 60 * 1000;
const BACKOFF_SECONDS = [10, 30, 120, 300, 900];
const RETENTION_DAYS = Math.max(1, Number(process.env.MESSAGE_QUEUE_RETENTION_DAYS || 14));

let started = false;
let draining = false;
let drainAgain = false;
let pollTimer: NodeJS.Timeout | null = null;
let tableAvailable = true;

const errMsg = (e: unknown) => (e instanceof Error ? e.message : String(e));

const sendDirectFireAndForget = (opts: EnqueueOptions) => {
  setImmediate(() => {
    whatsAppProvider
      .sendMessage({
        to: opts.to,
        message: opts.message,
        templateKey: opts.templateKey,
        requestId: opts.requestId
      })
      .catch((e) => console.warn('⚠️ Direct WhatsApp send failed:', errMsg(e)));
  });
};

export const messageQueue = {
  /** Insert a message and wake the worker immediately. Resolves in a few ms. */
  async enqueue(opts: EnqueueOptions): Promise<EnqueueResult> {
    if (!opts.to || !opts.message) return { success: false, queued: false };

    if (!tableAvailable) {
      sendDirectFireAndForget(opts);
      return { success: true, queued: false };
    }

    try {
      const row = await prisma.outboundMessage.create({
        data: {
          phoneNumber: opts.to,
          message: opts.message,
          templateKey: opts.templateKey || null,
          requestId: opts.requestId || null,
          priority: opts.priority ?? 5,
          dedupeKey: opts.dedupeKey || null,
          maxAttempts: opts.maxAttempts ?? 5,
          nextAttemptAt: new Date(Date.now() + (opts.delayMs || 0))
        }
      });
      if (!opts.delayMs) messageQueue.kick();
      return { success: true, queued: true, id: row.id };
    } catch (err: any) {
      if (err?.code === 'P2002') {
        return { success: true, queued: false, duplicate: true };
      }
      // Table missing / DB hiccup -> never lose the notification
      if (err?.code === 'P2021' || /outbound_messages|does not exist/i.test(errMsg(err))) {
        tableAvailable = false;
        console.warn('⚠️ outbound_messages table missing; falling back to direct sending. Run `prisma migrate deploy`.');
      } else {
        console.warn('⚠️ Enqueue failed, sending directly:', errMsg(err));
      }
      sendDirectFireAndForget(opts);
      return { success: true, queued: false };
    }
  },

  /** Wake the worker now (no waiting for the next poll). */
  kick() {
    if (!tableAvailable) return;
    if (draining) {
      drainAgain = true;
      return;
    }
    setImmediate(() => {
      void drain();
    });
  },

  async stats() {
    const grouped = await prisma.outboundMessage.groupBy({
      by: ['status'],
      _count: { _all: true }
    });
    const counts: Record<string, number> = { PENDING: 0, PROCESSING: 0, SENT: 0, FAILED: 0 };
    for (const g of grouped) counts[g.status] = g._count._all;

    const oldestPending = await prisma.outboundMessage.findFirst({
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'asc' },
      select: { createdAt: true }
    });
    const recentFailed = await prisma.outboundMessage.findMany({
      where: { status: 'FAILED' },
      orderBy: { updatedAt: 'desc' },
      take: 20,
      select: { id: true, phoneNumber: true, templateKey: true, attempts: true, lastError: true, updatedAt: true }
    });

    return {
      counts,
      oldestPendingAgeSeconds: oldestPending ? Math.round((Date.now() - oldestPending.createdAt.getTime()) / 1000) : 0,
      concurrency: CONCURRENCY,
      recentFailed
    };
  },

  async retryFailed() {
    const r = await prisma.outboundMessage.updateMany({
      where: { status: 'FAILED' },
      data: { status: 'PENDING', attempts: 0, nextAttemptAt: new Date(), lastError: null, lockedAt: null }
    });
    messageQueue.kick();
    return r.count;
  }
};

interface ClaimedRow {
  id: string;
  phoneNumber: string;
  message: string;
  templateKey: string | null;
  requestId: string | null;
  attempts: number;
  maxAttempts: number;
}

async function claimBatch(limit: number): Promise<ClaimedRow[]> {
  return prisma.$queryRaw<ClaimedRow[]>`
    UPDATE "outbound_messages"
    SET "status" = 'PROCESSING', "lockedAt" = NOW(), "attempts" = "attempts" + 1, "updatedAt" = NOW()
    WHERE "id" IN (
      SELECT "id" FROM "outbound_messages"
      WHERE "status" = 'PENDING' AND "nextAttemptAt" <= NOW()
      ORDER BY "priority" ASC, "nextAttemptAt" ASC
      LIMIT ${limit}
      FOR UPDATE SKIP LOCKED
    )
    RETURNING "id", "phoneNumber", "message", "templateKey", "requestId", "attempts", "maxAttempts"
  `;
}

async function deliver(row: ClaimedRow) {
  try {
    const result = await whatsAppProvider.sendMessage({
      to: row.phoneNumber,
      message: row.message,
      templateKey: row.templateKey || undefined,
      requestId: row.requestId || undefined
    });

    if (result.success) {
      await prisma.outboundMessage.update({
        where: { id: row.id },
        data: {
          status: 'SENT',
          sentAt: new Date(),
          providerMessageId: result.messageId || null,
          lastError: null,
          lockedAt: null
        }
      });
      return;
    }
    await markFailure(row, result.errorMessage || 'Provider rejected message');
  } catch (e) {
    await markFailure(row, errMsg(e));
  }
}

async function markFailure(row: ClaimedRow, error: string) {
  const exhausted = row.attempts >= row.maxAttempts;
  const delaySec = BACKOFF_SECONDS[Math.min(row.attempts - 1, BACKOFF_SECONDS.length - 1)];
  await prisma.outboundMessage
    .update({
      where: { id: row.id },
      data: {
        status: exhausted ? 'FAILED' : 'PENDING',
        lastError: error.slice(0, 500),
        nextAttemptAt: new Date(Date.now() + delaySec * 1000),
        lockedAt: null
      }
    })
    .catch((e) => console.warn('⚠️ Could not record message failure:', errMsg(e)));
}

async function drain() {
  if (draining || !tableAvailable) return;
  draining = true;
  try {
    do {
      drainAgain = false;
      // Keep pulling until nothing is due; each batch runs in parallel.
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const batch = await claimBatch(CONCURRENCY);
        if (batch.length === 0) break;
        await Promise.all(batch.map(deliver));
      }
    } while (drainAgain);
  } catch (err: any) {
    if (err?.code === 'P2010' || err?.code === 'P2021' || /outbound_messages|does not exist/i.test(errMsg(err))) {
      tableAvailable = false;
      console.warn('⚠️ Message queue disabled (table unavailable). Run `prisma migrate deploy`.');
    } else {
      console.warn('⚠️ Message queue drain error:', errMsg(err));
    }
  } finally {
    draining = false;
  }
}

async function housekeeping() {
  try {
    // Recover rows stuck in PROCESSING (crash mid-send)
    await prisma.outboundMessage.updateMany({
      where: { status: 'PROCESSING', lockedAt: { lt: new Date(Date.now() - STALE_LOCK_MS) } },
      data: { status: 'PENDING', lockedAt: null }
    });
    // Purge old finished rows
    await prisma.outboundMessage.deleteMany({
      where: {
        status: { in: ['SENT', 'FAILED'] },
        updatedAt: { lt: new Date(Date.now() - RETENTION_DAYS * 24 * 3600 * 1000) }
      }
    });
  } catch {
    /* non-critical */
  }
}

export const startMessageQueueWorker = () => {
  if (started) return;
  started = true;

  void housekeeping().then(() => drain());
  pollTimer = setInterval(() => {
    void drain();
  }, POLL_INTERVAL_MS);
  const hk = setInterval(() => void housekeeping(), 10 * 60 * 1000);
  pollTimer.unref?.();
  hk.unref?.();

  console.log(`📨 Message queue worker started (concurrency=${CONCURRENCY}, poll=${POLL_INTERVAL_MS}ms).`);
};

export const stopMessageQueueWorker = () => {
  if (pollTimer) clearInterval(pollTimer);
  pollTimer = null;
  started = false;
};
