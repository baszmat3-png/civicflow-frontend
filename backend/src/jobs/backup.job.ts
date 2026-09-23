import cron from 'node-cron';
import { backupService } from '../services/backup.service.js';

/**
 * Daily Automated Backup Job
 * Runs every day at 03:00 AM (Server Time)
 * Also creates an initial startup snapshot if no backups exist
 */
export const startBackupBackgroundJob = () => {
  console.log('⏰ [BACKUP CRON] Initializing automated daily database backup scheduler (Runs at 03:00 AM daily)...');

  // Schedule daily backup at 3:00 AM: '0 3 * * *'
  cron.schedule('0 3 * * *', async () => {
    try {
      console.log('⏰ [BACKUP CRON] Triggering scheduled daily database backup...');
      const backup = await backupService.createBackup('daily_auto');
      console.log(`✅ [BACKUP CRON] Scheduled daily backup completed: ${backup.filename} (${backup.sizeFormatted})`);
    } catch (err) {
      console.error('❌ [BACKUP CRON] Scheduled daily backup failed:', err);
    }
  });

  // Check if a backup exists; if not, create an initial snapshot in background after 10 seconds
  setTimeout(async () => {
    try {
      const existing = await backupService.listBackups();
      if (existing.length === 0) {
        console.log('📦 [BACKUP CRON] No previous backups found. Creating initial startup database snapshot...');
        await backupService.createBackup('initial_startup');
      }
    } catch (startupErr) {
      console.warn('⚠️ [BACKUP CRON] Initial startup backup check notice:', startupErr);
    }
  }, 10000);
};
