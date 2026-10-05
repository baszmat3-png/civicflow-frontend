import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from '../ui/Button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('CivicFlow Global ErrorBoundary caught an error:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = '/dashboard';
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4" dir="rtl">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-100 p-8 text-center space-y-6">
            <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto ring-8 ring-red-50/50">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-slate-800">حدث خطأ غير متوقع</h2>
              <p className="text-slate-600 text-sm">
                نعتذر عن هذا الخطأ. واجه النظام مشكلة أثناء تحميل هذه الصفحة. يمكنك إعادة المحاولة أو العودة للرئيسية.
              </p>
            </div>

            {this.state.error && (
              <details className="bg-slate-50 p-3 rounded-xl text-right text-xs border border-slate-200 cursor-pointer">
                <summary className="font-bold text-slate-600 hover:text-slate-900 select-none">
                  عرض تفاصيل الخطأ البرمجي
                </summary>
                <pre className="mt-2 p-2 bg-slate-900 text-rose-300 rounded-lg text-left text-[11px] font-mono overflow-x-auto max-h-40 whitespace-pre-wrap select-all" dir="ltr">
                  {this.state.error.name}: {this.state.error.message}
                  {this.state.error.stack ? `\n\n${this.state.error.stack}` : ''}
                </pre>
              </details>
            )}

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button
                variant="primary"
                onClick={this.handleReload}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-xl shadow-sm transition-all"
              >
                <RefreshCw className="w-4 h-4" />
                إعادة المحاولة
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  try {
                    localStorage.removeItem('civicflow_cache_customers');
                    localStorage.removeItem('civicflow_cache_requests');
                  } catch {}
                  window.location.href = '/customers';
                }}
                className="w-full flex items-center justify-center gap-2 border-slate-200 text-slate-700 hover:bg-slate-50 font-medium py-2.5 rounded-xl transition-all"
              >
                <Home className="w-4 h-4" />
                تحديث قائمة المراجعين
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
