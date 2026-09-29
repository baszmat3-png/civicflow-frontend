import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import {
  Star,
  Search,
  Trash2,
  Eye,
  EyeOff,
  CheckCircle,
  AlertTriangle,
  MessageSquare,
  ShieldAlert,
  User,
  Phone,
  ArrowRight
} from 'lucide-react';
import { ratingService, CitizenRatingItem } from '../../services/ratingService';

export const RatingModerationPage: React.FC = () => {
  const navigate = useNavigate();
  const [ratings, setRatings] = useState<CitizenRatingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [ratingFilter, setRatingFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const fetchRatings = async () => {
    try {
      setLoading(true);
      const data = await ratingService.getAdminRatings({
        search,
        rating: ratingFilter,
        status: statusFilter
      });
      setRatings(data);
    } catch (err) {
      console.error('Failed to fetch ratings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRatings();
  }, [ratingFilter, statusFilter]);

  const handleTogglePublic = async (item: CitizenRatingItem) => {
    try {
      await ratingService.moderateRating(item.id, { isPublic: !item.isPublic });
      fetchRatings();
    } catch (err: any) {
      alert(err.message || 'فشل تعديل حالة العرض');
    }
  };

  const handleDelete = async (item: CitizenRatingItem) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا التقييم/التعليق بشكل نهائي؟')) return;
    try {
      await ratingService.moderateRating(item.id, { isDeleted: true });
      fetchRatings();
    } catch (err: any) {
      alert(err.message || 'فشل حذف التقييم');
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Star className="w-6 h-6 text-amber-500 fill-amber-500" />
            إدارة وتقييمات رضا المراجعين
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            مراجعة آراء وتقييمات المواطنين مع إمكانية إخفاء أو حذف التعليقات غير اللائقة وحفظ إحصائيات الرضا.
          </p>
        </div>

        <Button
          variant="outline"
          onClick={() => navigate('/settings')}
          icon={<ArrowRight className="w-4 h-4" />}
        >
          العودة للإعدادات
        </Button>
      </div>

      {/* Filter Card */}
      <Card className="rounded-2xl border-slate-200 dark:border-gray-700 shadow-xs">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchRatings()}
                placeholder="بحث باسم المراجع أو رقم المعاملة..."
                className="w-full text-xs pr-9 pl-3 py-2.5 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <select
              value={ratingFilter}
              onChange={(e) => setRatingFilter(e.target.value)}
              className="text-xs p-2.5 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-900 focus:outline-none"
            >
              <option value="ALL">جميع التقييمات (1 إلى 5 نجوم)</option>
              <option value="5">5 نجوم (ممتاز)</option>
              <option value="4">4 نجوم (جيد جداً)</option>
              <option value="3">3 نجوم (مقبول)</option>
              <option value="2">2 نجوم (منخفض)</option>
              <option value="1">نجمة واحدة (غير راضٍ)</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs p-2.5 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-900 focus:outline-none"
            >
              <option value="ALL">كل الحالات (الظاهرة والمخفية)</option>
              <option value="APPROVED">التقييمات المعتمدة</option>
              <option value="HIDDEN">التقييمات المخفية</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Ratings Grid */}
      {loading ? (
        <div className="py-16 text-center text-xs text-slate-400">جاري تحميل التقييمات...</div>
      ) : ratings.length === 0 ? (
        <div className="py-16 text-center text-xs text-slate-400 bg-white dark:bg-gray-800 rounded-3xl border border-slate-200 dark:border-gray-700">
          لا توجد تقييمات مطابقة لخيارات البحث.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {ratings.map((item) => (
            <Card
              key={item.id}
              className={`rounded-3xl border shadow-sm transition ${
                !item.isPublic
                  ? 'border-amber-200 bg-amber-50/20 dark:border-amber-900/50'
                  : 'border-slate-200 dark:border-gray-700'
              }`}
            >
              <div className="p-5 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                      <User className="w-4 h-4 text-slate-400" />
                      {item.customerName}
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                      {item.requestNumber && (
                        <span className="font-mono font-bold text-blue-600">#{item.requestNumber}</span>
                      )}
                      <span>•</span>
                      <span>{new Date(item.createdAt).toISOString().split('T')[0]}</span>
                    </div>
                  </div>

                  {/* Stars */}
                  <div className="flex items-center gap-1 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-1 rounded-full border border-amber-200 dark:border-amber-800">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={`w-3.5 h-3.5 ${
                          item.rating >= s
                            ? 'fill-amber-400 text-amber-400'
                            : 'text-slate-300 dark:text-gray-600'
                        }`}
                      />
                    ))}
                    <span className="font-mono font-bold text-xs text-amber-700 dark:text-amber-300 mr-1">
                      {item.rating}
                    </span>
                  </div>
                </div>

                {/* Comment */}
                {item.comment ? (
                  <p className="text-xs text-slate-700 dark:text-gray-300 leading-relaxed bg-slate-50 dark:bg-gray-750 p-3 rounded-2xl border border-slate-100 dark:border-gray-700">
                    "{item.comment}"
                  </p>
                ) : (
                  <p className="text-xs text-slate-400 italic">بدون تعليق نصي مكتوب</p>
                )}

                {/* Actions */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-gray-750">
                  <span className="text-[11px] font-bold text-slate-500">
                    {item.isPublic ? (
                      <span className="text-emerald-600">ظاهر للعامة ✓</span>
                    ) : (
                      <span className="text-amber-600">مخفي عن العامة</span>
                    )}
                  </span>

                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs"
                      onClick={() => handleTogglePublic(item)}
                      icon={item.isPublic ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    >
                      {item.isPublic ? 'إخفاء' : 'إظهار'}
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs text-rose-600 border-rose-200 hover:bg-rose-50"
                      onClick={() => handleDelete(item)}
                      icon={<Trash2 className="w-3.5 h-3.5" />}
                    >
                      حذف نهائي
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
