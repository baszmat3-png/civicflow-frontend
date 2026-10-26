-- Durable outbound message queue
CREATE TABLE IF NOT EXISTS "outbound_messages" (
    "id" TEXT NOT NULL,
    "channel" TEXT NOT NULL DEFAULT 'WHATSAPP',
    "phoneNumber" TEXT NOT NULL,
    "templateKey" TEXT,
    "message" TEXT NOT NULL,
    "requestId" TEXT,
    "dedupeKey" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 5,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 5,
    "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastError" TEXT,
    "providerMessageId" TEXT,
    "lockedAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "outbound_messages_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "outbound_messages_dedupeKey_key" ON "outbound_messages"("dedupeKey");
CREATE INDEX IF NOT EXISTS "outbound_messages_status_nextAttemptAt_priority_idx" ON "outbound_messages"("status", "nextAttemptAt", "priority");
CREATE INDEX IF NOT EXISTS "outbound_messages_createdAt_idx" ON "outbound_messages"("createdAt");

-- Appointment reminders: day-before stage + faster reminder lookups
ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "reminder24Sent" BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS "appointments_status_appointmentDate_idx" ON "appointments"("status", "appointmentDate");
