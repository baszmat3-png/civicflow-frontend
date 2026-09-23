-- AlterTable
ALTER TABLE "request_attachments" ADD COLUMN IF NOT EXISTS "fileData" BYTEA;

-- AlterTable
ALTER TABLE "final_responses" ADD COLUMN IF NOT EXISTS "attachmentData" BYTEA;
