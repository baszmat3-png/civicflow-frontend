import { apiClient } from './apiClient';

export interface BackupItem {
  filename: string;
  createdAt: string;
  sizeBytes: number;
  sizeFormatted: string;
  counts: {
    users: number;
    customers: number;
    requests: number;
    attachments: number;
    ministries: number;
    cities: number;
    requestTypes: number;
    auditLogs: number;
  };
}

export const backupService = {
  getBackups: async (): Promise<BackupItem[]> => {
    const res = await apiClient.get<{ backups: BackupItem[] }>('/backup');
    return res.backups || [];
  },

  createBackup: async (label = 'manual'): Promise<BackupItem> => {
    return apiClient.post<BackupItem>('/backup/create', { label });
  },

  exportBackup: async () => {
    const now = new Date().toISOString().split('T')[0];
    await apiClient.download('/backup/export', `civicflow_full_backup_${now}.json`);
  },

  downloadBackup: async (filename: string) => {
    await apiClient.download(`/backup/download/${filename}`, filename);
  },

  restoreBackup: async (backupFile?: File, payload?: any) => {
    if (backupFile) {
      const formData = new FormData();
      formData.append('backupFile', backupFile);
      return apiClient.post('/backup/restore', formData);
    }
    return apiClient.post('/backup/restore', payload);
  }
};
