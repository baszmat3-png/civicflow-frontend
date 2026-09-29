import React, { useRef, useEffect } from 'react';
import { ChevronRight, ChevronLeft, ChevronsRight, ChevronsLeft } from 'lucide-react';

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange
}) => {
  const activeBtnRef = useRef<HTMLButtonElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  if (totalPages <= 1) return null;

  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  // Auto-scroll the active page into view on mobile
  useEffect(() => {
    if (activeBtnRef.current && scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const btn = activeBtnRef.current;
      const scrollLeft = btn.offsetLeft - container.offsetWidth / 2 + btn.offsetWidth / 2;
      container.scrollTo({ left: scrollLeft, behavior: 'smooth' });
    }
  }, [currentPage]);

  // Generate page numbers
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

  return (
    <div className="px-4 sm:px-6 py-3.5 bg-white border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm select-none">
      {/* Items count summary */}
      <div className="text-slate-500 text-xs sm:text-sm order-2 sm:order-1 text-center sm:text-right">
        عرض <span className="font-bold text-slate-800">{startItem}</span> إلى{' '}
        <span className="font-bold text-slate-800">{endItem}</span> من إجمالي{' '}
        <span className="font-bold text-slate-800">{totalItems}</span> سجل
      </div>

      {/* Responsive Horizontal Scrollable Pages Container */}
      <div className="w-full sm:w-auto order-1 sm:order-2 flex items-center gap-1.5 justify-center sm:justify-end">
        {/* First / Prev Buttons */}
        {totalPages > 3 && (
          <button
            onClick={() => onPageChange(1)}
            disabled={currentPage === 1}
            className="hidden sm:flex p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition"
            title="الصفحة الأولى"
          >
            <ChevronsRight className="w-4 h-4" />
          </button>
        )}

        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition shrink-0"
          title="الصفحة السابقة"
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        {/* Scrollable Page Numbers Row with Visible Custom Scrollbar on Mobile */}
        <div
          ref={scrollContainerRef}
          className="max-w-[260px] xs:max-w-[320px] sm:max-w-none overflow-x-auto custom-scrollbar-x py-1 px-1 flex items-center gap-1"
        >
          {pages.map((page) => {
            const isActive = currentPage === page;
            return (
              <button
                key={page}
                ref={isActive ? activeBtnRef : null}
                onClick={() => onPageChange(page)}
                className={`min-w-8 h-8 px-2.5 rounded-lg text-xs font-bold transition shrink-0 ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-xs scale-105'
                    : 'border border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                {page}
              </button>
            );
          })}
        </div>

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition shrink-0"
          title="الصفحة التالية"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {totalPages > 3 && (
          <button
            onClick={() => onPageChange(totalPages)}
            disabled={currentPage === totalPages}
            className="hidden sm:flex p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition"
            title="الصفحة الأخيرة"
          >
            <ChevronsLeft className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};

export default Pagination;
