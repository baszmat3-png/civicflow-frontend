import React from 'react';
import { RequestPriority, DeadlineStatus } from '../../types';
import { Flame, Clock, AlertTriangle, CheckCircle2 } from 'lucide-react';

export const PriorityBadge: React.FC<{ priority?: RequestPriority | string; className?: string }> = ({
  priority,
  className
}) => {
  if (priority === 'عاجل') {
    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200 ${className || ''}`}>
        <Flame className="w-3 h-3 text-rose-600 animate-pulse" />
        عاجل
      </span>
    );
  }
  if (priority === 'مهم') {
    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200 ${className || ''}`}>
        <Clock className="w-3 h-3 text-amber-600" />
        مهم
      </span>
    );
  }
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200 ${className || ''}`}>
      عادي
    </span>
  );
};

export const DeadlineBadge: React.FC<{
  status?: DeadlineStatus | string;
  daysRemainingOrOverdue?: number;
  expectedDate?: string;
  className?: string;
}> = ({ status, daysRemainingOrOverdue, expectedDate, className }) => {
  if (status === 'متأخر') {
    const days = Math.abs(Number(daysRemainingOrOverdue) || 1);
    return (
      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 ${className || ''}`}>
        <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
        <span>متأخر {days} {days === 1 ? 'يوم' : days === 2 ? 'يومان' : 'أيام'}</span>
      </div>
    );
  }

  if (status === 'اقترب الموعد') {
    return (
      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200 ${className || ''}`}>
        <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
        <span>اقترب الموعد ({Number(daysRemainingOrOverdue) || 1} يوم)</span>
      </div>
    );
  }

  return (
    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 ${className || ''}`}>
      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
      <span>ضمن المدة</span>
    </div>
  );
};
