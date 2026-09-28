-- AlterEnum
ALTER TYPE "OtpPurpose" ADD VALUE IF NOT EXISTS 'PUBLIC_TRACKING';

-- AlterTable users
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "assignedMinistries" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "isAutoAssignEnabled" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable appointments
CREATE TABLE IF NOT EXISTS "appointments" (
    "id" TEXT NOT NULL,
    "appointmentNumber" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "customerPhone" TEXT NOT NULL,
    "customerNationalId" TEXT,
    "targetPerson" TEXT NOT NULL DEFAULT 'DEPUTY',
    "appointmentDate" TIMESTAMP(3) NOT NULL,
    "timeSlot" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "adminNotes" TEXT,
    "reminderSent" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "appointments_pkey" PRIMARY KEY ("id")
);

-- CreateTable appointment_schedules
CREATE TABLE IF NOT EXISTS "appointment_schedules" (
    "id" TEXT NOT NULL,
    "targetPerson" TEXT NOT NULL DEFAULT 'DEPUTY',
    "dayOfWeek" INTEGER NOT NULL,
    "dayName" TEXT NOT NULL,
    "isWorkingDay" BOOLEAN NOT NULL DEFAULT true,
    "startTime" TEXT NOT NULL DEFAULT '09:00',
    "endTime" TEXT NOT NULL DEFAULT '14:00',
    "slotDurationMinutes" INTEGER NOT NULL DEFAULT 30,
    "maxPerSlot" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "appointment_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable citizen_ratings
CREATE TABLE IF NOT EXISTS "citizen_ratings" (
    "id" TEXT NOT NULL,
    "requestId" TEXT,
    "requestNumber" TEXT,
    "customerName" TEXT NOT NULL,
    "customerPhone" TEXT,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "isApproved" BOOLEAN NOT NULL DEFAULT true,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "adminNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "citizen_ratings_pkey" PRIMARY KEY ("id")
);

-- CreateTable registry_entities
CREATE TABLE IF NOT EXISTS "registry_entities" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'GOVERNMENT',
    "code" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "registry_entities_pkey" PRIMARY KEY ("id")
);

-- CreateTable outgoing_letters
CREATE TABLE IF NOT EXISTS "outgoing_letters" (
    "id" TEXT NOT NULL,
    "letterNumber" TEXT NOT NULL,
    "issueDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "subject" TEXT NOT NULL,
    "recipientEntityId" TEXT,
    "recipientName" TEXT,
    "ministryId" TEXT,
    "citizenName" TEXT,
    "citizenPhone" TEXT,
    "summary" TEXT,
    "notes" TEXT,
    "fileName" TEXT,
    "fileSize" TEXT,
    "mimeType" TEXT,
    "fileData" BYTEA,
    "status" TEXT NOT NULL DEFAULT 'SENT',
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "outgoing_letters_pkey" PRIMARY KEY ("id")
);

-- CreateTable incoming_letters
CREATE TABLE IF NOT EXISTS "incoming_letters" (
    "id" TEXT NOT NULL,
    "incomingNumber" TEXT NOT NULL,
    "externalLetterNumber" TEXT,
    "receiveDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "subject" TEXT NOT NULL,
    "senderEntityId" TEXT,
    "senderName" TEXT,
    "ministryId" TEXT,
    "citizenName" TEXT,
    "citizenPhone" TEXT,
    "summary" TEXT,
    "actionRequired" TEXT,
    "priority" "PriorityLevel" NOT NULL DEFAULT 'NORMAL',
    "status" TEXT NOT NULL DEFAULT 'RECEIVED',
    "fileName" TEXT,
    "fileSize" TEXT,
    "mimeType" TEXT,
    "fileData" BYTEA,
    "assignedToId" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "incoming_letters_pkey" PRIMARY KEY ("id")
);

-- CreateIndexes
CREATE UNIQUE INDEX IF NOT EXISTS "appointments_appointmentNumber_key" ON "appointments"("appointmentNumber");
CREATE INDEX IF NOT EXISTS "appointments_appointmentNumber_idx" ON "appointments"("appointmentNumber");
CREATE INDEX IF NOT EXISTS "appointments_customerPhone_idx" ON "appointments"("customerPhone");
CREATE INDEX IF NOT EXISTS "appointments_appointmentDate_idx" ON "appointments"("appointmentDate");
CREATE INDEX IF NOT EXISTS "appointments_status_idx" ON "appointments"("status");

CREATE UNIQUE INDEX IF NOT EXISTS "appointment_schedules_targetPerson_dayOfWeek_key" ON "appointment_schedules"("targetPerson", "dayOfWeek");

CREATE INDEX IF NOT EXISTS "citizen_ratings_requestId_idx" ON "citizen_ratings"("requestId");
CREATE INDEX IF NOT EXISTS "citizen_ratings_rating_idx" ON "citizen_ratings"("rating");
CREATE INDEX IF NOT EXISTS "citizen_ratings_isApproved_idx" ON "citizen_ratings"("isApproved");

CREATE UNIQUE INDEX IF NOT EXISTS "registry_entities_name_key" ON "registry_entities"("name");

CREATE UNIQUE INDEX IF NOT EXISTS "outgoing_letters_letterNumber_key" ON "outgoing_letters"("letterNumber");
CREATE INDEX IF NOT EXISTS "outgoing_letters_letterNumber_idx" ON "outgoing_letters"("letterNumber");
CREATE INDEX IF NOT EXISTS "outgoing_letters_issueDate_idx" ON "outgoing_letters"("issueDate");
CREATE INDEX IF NOT EXISTS "outgoing_letters_recipientEntityId_idx" ON "outgoing_letters"("recipientEntityId");
CREATE INDEX IF NOT EXISTS "outgoing_letters_ministryId_idx" ON "outgoing_letters"("ministryId");

CREATE UNIQUE INDEX IF NOT EXISTS "incoming_letters_incomingNumber_key" ON "incoming_letters"("incomingNumber");
CREATE INDEX IF NOT EXISTS "incoming_letters_incomingNumber_idx" ON "incoming_letters"("incomingNumber");
CREATE INDEX IF NOT EXISTS "incoming_letters_receiveDate_idx" ON "incoming_letters"("receiveDate");
CREATE INDEX IF NOT EXISTS "incoming_letters_senderEntityId_idx" ON "incoming_letters"("senderEntityId");
CREATE INDEX IF NOT EXISTS "incoming_letters_ministryId_idx" ON "incoming_letters"("ministryId");

-- AddForeignKeys
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'citizen_ratings_requestId_fkey') THEN
    ALTER TABLE "citizen_ratings" ADD CONSTRAINT "citizen_ratings_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'outgoing_letters_recipientEntityId_fkey') THEN
    ALTER TABLE "outgoing_letters" ADD CONSTRAINT "outgoing_letters_recipientEntityId_fkey" FOREIGN KEY ("recipientEntityId") REFERENCES "registry_entities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'outgoing_letters_ministryId_fkey') THEN
    ALTER TABLE "outgoing_letters" ADD CONSTRAINT "outgoing_letters_ministryId_fkey" FOREIGN KEY ("ministryId") REFERENCES "ministries"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'incoming_letters_senderEntityId_fkey') THEN
    ALTER TABLE "incoming_letters" ADD CONSTRAINT "incoming_letters_senderEntityId_fkey" FOREIGN KEY ("senderEntityId") REFERENCES "registry_entities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'incoming_letters_ministryId_fkey') THEN
    ALTER TABLE "incoming_letters" ADD CONSTRAINT "incoming_letters_ministryId_fkey" FOREIGN KEY ("ministryId") REFERENCES "ministries"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
