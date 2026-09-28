import React, { useState } from 'react';
import { Star, CheckCircle, AlertCircle, X, MessageSquareHeart } from 'lucide-react';
import { Button } from '../ui/Button';
import { publicService } from '../../services/publicService';

interface PublicRatingModalProps {
  isOpen: boolean;
  onClose: () => void;
  requestNumber?: string;
  customerName?: string;
}

export const PublicRatingModal: React.FC<PublicRatingModalProps> = ({
  isOpen,
  onClose,
  requestNumber,
  customerName
}) => {
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setErrorMsg('');
      await publicService.submitRating({
        requestNumber,
        customerName,
        rating,
        comment
      });
      setSubmitted(true);
      setTimeout(() => {
        setSubmitted(false);
        onClose();
      }, 2500);
    } catch (err: any) {
      setErrorMsg(err.message || 'حدث خطأ أثناء إرسال التقييم');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" dir="rtl">
      <div className="bg-white dark:bg-gray-800 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 dark:border-gray-700 relative animate-in fade-in zoom-in duration-200">
        <button
          onClick={onClose}
          className="absolute top-4 left-4 p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          <X className="w-5 h-5" />
        </button>

        {submitted ? (
          <div className="text-center py-8 space-y-4">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto animate-bounce">
              <CheckCircle className="w-10 h-10" />
            </div>
            <h3 className="text-xl font-bold text-slate-800 dark:text-white">شكراً جزيلاً لتقييمك!</h3>
            <p className="text-sm text-slate-500">ملاحظاتك تساعدنا في تطوير وتحسين تجربة خدمة المراجعين دائماً.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 bg-amber-50 text-amber-500 rounded-2xl flex items-center justify-center mx-auto">
                <MessageSquareHeart className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">تقييم رضا المراجع</h3>
              <p className="text-xs text-slate-500">
                ما مدى رضاك عن سرعة وجودة متابعة المعاملة{' '}
                {requestNumber && <span className="font-mono font-bold text-blue-600">{requestNumber}</span>}؟
              </p>
            </div>

            {errorMsg && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Stars Selector */}
            <div className="flex justify-center items-center gap-2 py-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="p-1 transition transform hover:scale-125 focus:outline-none"
                >
                  <Star
                    className={`w-8 h-8 ${
                      (hoverRating || rating) >= star
                        ? 'fill-amber-400 text-amber-400'
                        : 'text-gray-300 dark:text-gray-600'
                    }`}
                  />
                </button>
              ))}
            </div>

            <div className="text-center text-xs font-bold text-amber-600">
              {rating === 5 && 'ممتاز جداً 🌟🌟🌟🌟🌟'}
              {rating === 4 && 'جيد جداً 👍'}
              {rating === 3 && 'مقبول 😐'}
              {rating === 2 && 'أقل من المتوقع 👎'}
              {rating === 1 && 'غير راضٍ تماماً ⚠️'}
            </div>

            {/* Comment */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 mb-1">
                اكتب تعليقك أو مقترحك (اختياري)
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="أخبرنا عن انطباعك أو أي ملاحظة تود مشاركتها مع إدارة المكتب..."
                rows={3}
                className="w-full text-xs p-3 rounded-2xl border border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div className="flex gap-2">
              <Button
                type="submit"
                variant="primary"
                className="w-full"
                isLoading={submitting}
              >
                إرسال التقييم
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
              >
                إلغاء
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
