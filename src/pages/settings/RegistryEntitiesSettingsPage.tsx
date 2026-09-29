import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import {
  Building2,
  Plus,
  Search,
  Edit2,
  Trash2,
  Phone,
  Mail,
  MapPin,
  CheckCircle2,
  AlertCircle,
  X,
  ArrowRight
} from 'lucide-react';
import { registryService, RegistryEntityItem } from '../../services/registryService';

export const RegistryEntitiesSettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const [entities, setEntities] = useState<RegistryEntityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEntity, setEditingEntity] = useState<RegistryEntityItem | null>(null);
  const [name, setName] = useState('');
  const [type, setType] = useState('GOVERNMENT');
  const [code, setCode] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const fetchEntities = async () => {
    try {
      setLoading(true);
      const data = await registryService.getEntities();
      setEntities(data);
    } catch (err) {
      console.error('Failed to fetch entities:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEntities();
  }, []);

  const openCreateModal = () => {
    setEditingEntity(null);
    setName('');
    setType('GOVERNMENT');
    setCode('');
    setPhone('');
    setEmail('');
    setAddress('');
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const openEditModal = (ent: RegistryEntityItem) => {
    setEditingEntity(ent);
    setName(ent.name);
    setType(ent.type);
    setCode(ent.code || '');
    setPhone(ent.phone || '');
    setEmail(ent.email || '');
    setAddress(ent.address || '');
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg('يرجى إدخال اسم الجهة');
      return;
    }

    try {
      setSaving(true);
      setErrorMsg('');
      if (editingEntity) {
        await registryService.updateEntity(editingEntity.id, {
          name: name.trim(),
          type,
          code: code.trim() || undefined,
          phone: phone.trim() || undefined,
          email: email.trim() || undefined,
          address: address.trim() || undefined
        });
      } else {
        await registryService.createEntity({
          name: name.trim(),
          type,
          code: code.trim() || undefined,
          phone: phone.trim() || undefined,
          email: email.trim() || undefined,
          address: address.trim() || undefined
        });
      }
      setIsModalOpen(false);
      fetchEntities();
    } catch (err: any) {
      setErrorMsg(err.message || 'فشل حفظ الجهة');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('هل أنت متأكد من تعطيل هذه الجهة؟')) return;
    try {
      await registryService.deleteEntity(id);
      fetchEntities();
    } catch (err: any) {
      alert(err.message || 'فشل تعطيل الجهة');
    }
  };

  const filteredEntities = entities.filter(
    (e) =>
      e.name.toLowerCase().includes(search.toLowerCase()) ||
      (e.code && e.code.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6 max-w-5xl mx-auto" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Building2 className="w-6 h-6 text-blue-600" />
            إدارة الجهات والمؤسسات (الصادر والوارد)
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            تعريف وإدارة الوزارات والدوائر والهيئات الحكومية والشركات لربطها بكتب الصادر والوارد بسهولة.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => navigate('/settings')}
            icon={<ArrowRight className="w-4 h-4" />}
          >
            العودة للإعدادات
          </Button>

          <Button variant="primary" onClick={openCreateModal} icon={<Plus className="w-4 h-4" />}>
            إضافة جهة جديدة
          </Button>
        </div>
      </div>

      {/* Filter Card */}
      <Card className="rounded-2xl border-slate-200 dark:border-gray-700 shadow-xs">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="بحث باسم الجهة أو رمزها..."
              className="w-full text-xs pr-9 pl-3 py-2.5 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </CardContent>
      </Card>

      {/* Grid List */}
      {loading ? (
        <div className="py-16 text-center text-xs text-slate-400">جاري تحميل قائمة الجهات...</div>
      ) : filteredEntities.length === 0 ? (
        <div className="py-16 text-center text-xs text-slate-400 bg-white dark:bg-gray-800 rounded-3xl border border-slate-200 dark:border-gray-700">
          لا توجد جهات مسجلة تطابق البحث.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredEntities.map((ent) => (
            <Card
              key={ent.id}
              className="rounded-3xl border-slate-200 dark:border-gray-700 shadow-xs hover:shadow-md transition"
            >
              <div className="p-5 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 flex items-center justify-center shrink-0">
                      <Building2 className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-slate-900 dark:text-white leading-snug">
                        {ent.name}
                      </h3>
                      {ent.code && (
                        <span className="font-mono text-[10px] text-slate-400 block">{ent.code}</span>
                      )}
                    </div>
                  </div>

                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-gray-750 text-slate-700 dark:text-gray-300">
                    {ent.type === 'GOVERNMENT'
                      ? 'حكومية'
                      : ent.type === 'MINISTRY'
                      ? 'وزارة'
                      : ent.type === 'JUDICIAL'
                      ? 'قضائية'
                      : ent.type === 'PRIVATE'
                      ? 'خاص'
                      : 'أخرى'}
                  </span>
                </div>

                <div className="space-y-1.5 text-xs text-slate-500 pt-2 border-t border-slate-100 dark:border-gray-750">
                  {ent.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      <span className="font-mono">{ent.phone}</span>
                    </div>
                  )}
                  {ent.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-slate-400" />
                      <span className="font-mono">{ent.email}</span>
                    </div>
                  )}
                  {ent.address && (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      <span>{ent.address}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-end gap-1 pt-2 border-t border-slate-100 dark:border-gray-750">
                  <button
                    onClick={() => openEditModal(ent)}
                    className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                    title="تعديل"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(ent.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                    title="تعطيل"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 relative">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 left-4 p-2 text-gray-400 hover:text-gray-600 rounded-full"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Building2 className="w-5 h-5 text-blue-600" />
              {editingEntity ? 'تعديل بيانات الجهة' : 'إضافة جهة جديدة'}
            </h3>

            {errorMsg && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 mb-1">
                  اسم الجهة / المؤسسة <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="مثال: وزارة التربية / محافظة بغداد..."
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-900 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 mb-1">
                    نوع الجهة
                  </label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-900 focus:outline-none"
                  >
                    <option value="GOVERNMENT">جهة حكومية</option>
                    <option value="MINISTRY">وزارة</option>
                    <option value="JUDICIAL">قضائية</option>
                    <option value="PRIVATE">قطاع خاص</option>
                    <option value="OTHER">أخرى</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 mb-1">
                    الرمز / الاختصار
                  </label>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="MOE"
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-900 font-mono focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 mb-1">
                  رقم الهاتف (اختياري)
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-900 font-mono focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 mb-1">
                  البريد الإلكتروني (اختياري)
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-900 font-mono focus:outline-none"
                />
              </div>

              <div className="flex gap-2 pt-3 border-t border-slate-100 dark:border-gray-700">
                <Button type="submit" variant="primary" className="w-full font-bold" isLoading={saving}>
                  حفظ الجهة
                </Button>
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                  إلغاء
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
