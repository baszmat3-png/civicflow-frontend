import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { WhatsAppTemplate } from '../../types';
import { FileCode2, Edit, Save, ArrowRight, Copy, Check, MessageSquare } from 'lucide-react';

export const WhatsAppTemplatesPage: React.FC = () => {
  const navigate = useNavigate();
  const { settings, handleUpdateSettings } = useData();
  const { success, error } = useToast();

  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [editingTemplate, setEditingTemplate] = useState<WhatsAppTemplate | null>(null);
  const [editText, setEditText] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (settings?.whatsappTemplates) {
      setTemplates(settings.whatsappTemplates);
    }
  }, [settings]);

  const openEditModal = (tpl: WhatsAppTemplate) => {
    setEditingTemplate(tpl);
    setEditText(tpl.content);
  };

  const handleSaveModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTemplate) return;

    setTemplates((prev) =>
      prev.map((t) =>
        t.id === editingTemplate.id
          ? {
              ...t,
              content: editText,
              lastUpdated: new Date().toISOString().split('T')[0]
            }
          : t
      )
    );

    success('تم تحديث القالب محلياً');
    setEditingTemplate(null);
  };

  const handleInsertVariable = (variable: string) => {
    setEditText((prev) => `${prev} {{${variable}}}`);
  };

  const handleSaveAll = async () => {
    if (!settings) return;
    setIsLoading(true);
    try {
      await handleUpdateSettings({ whatsappTemplates: templates });
      success('تم حفظ كافة قوالب الرسائل بنجاح');
    } catch (err) {
      error('حدث خطأ أثناء الحفظ');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/settings')}
            icon={<ArrowRight className="w-4 h-4" />}
          >
            العودة للإعدادات
          </Button>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">قوالب رسائل WhatsApp</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              تخصيص نصوص الرسائل التلقائية والمتغيرات الديناميكية للمعاملات والمواعيد
            </p>
          </div>
        </div>

        <Button
          variant="primary"
          size="md"
          onClick={handleSaveAll}
          isLoading={isLoading}
          icon={<Save className="w-4 h-4" />}
        >
          حفظ التعديلات
        </Button>
      </div>

      {/* Available Variables Guide */}
      <Card className="bg-slate-900 text-white border-slate-800">
        <CardContent className="p-4 sm:p-5">
          <p className="text-xs font-bold text-slate-300 mb-2">المتغيرات الديناميكية المتاحة للاستخدام في القوالب:</p>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="font-mono bg-slate-800 text-teal-400 px-2.5 py-1 rounded-lg border border-slate-700">
              {'{{customer_name}}'} : اسم المراجع
            </span>
            <span className="font-mono bg-slate-800 text-teal-400 px-2.5 py-1 rounded-lg border border-slate-700">
              {'{{request_number}}'} : رقم المعاملة
            </span>
            <span className="font-mono bg-slate-800 text-teal-400 px-2.5 py-1 rounded-lg border border-slate-700">
              {'{{appointment_number}}'} : رقم الموعد
            </span>
            <span className="font-mono bg-slate-800 text-teal-400 px-2.5 py-1 rounded-lg border border-slate-700">
              {'{{appointment_date}}'} : تاريخ الموعد
            </span>
            <span className="font-mono bg-slate-800 text-teal-400 px-2.5 py-1 rounded-lg border border-slate-700">
              {'{{appointment_time}}'} : وقت الموعد
            </span>
            <span className="font-mono bg-slate-800 text-teal-400 px-2.5 py-1 rounded-lg border border-slate-700">
              {'{{target_person}}'} : صفة المسؤول (النائب/مدير المكتب)
            </span>
            <span className="font-mono bg-slate-800 text-teal-400 px-2.5 py-1 rounded-lg border border-slate-700">
              {'{{status}}'} : الحالة الجديدة
            </span>
            <span className="font-mono bg-slate-800 text-teal-400 px-2.5 py-1 rounded-lg border border-slate-700">
              {'{{ministry}}'} : اسم الجهة
            </span>
            <span className="font-mono bg-slate-800 text-teal-400 px-2.5 py-1 rounded-lg border border-slate-700">
              {'{{expected_date}}'} : موعد الإنجاز
            </span>
            <span className="font-mono bg-slate-800 text-teal-400 px-2.5 py-1 rounded-lg border border-slate-700">
              {'{{tracking_link}}'} : رابط الاستعلام العام
            </span>
            <span className="font-mono bg-slate-800 text-teal-400 px-2.5 py-1 rounded-lg border border-slate-700">
              {'{{notes}}'} : ملاحظات وتوجيهات
            </span>
            <span className="font-mono bg-slate-800 text-teal-400 px-2.5 py-1 rounded-lg border border-slate-700">
              {'{{reason}}'} : سبب الرفض أو الاعتذار
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {templates.map((tpl) => (
          <Card key={tpl.id} className="border-slate-200 hover:border-teal-300 transition">
            <CardHeader className="bg-slate-50/70 pb-3">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-teal-600" />
                <CardTitle className="text-sm">{tpl.title}</CardTitle>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => openEditModal(tpl)}
                icon={<Edit className="w-3.5 h-3.5" />}
              >
                تعديل القالب
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-800 leading-relaxed font-mono">
                {tpl.content}
              </div>
              <p className="text-[11px] text-slate-400">آخر تحديث: {tpl.lastUpdated}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Edit Template Modal */}
      {editingTemplate && (
        <Modal
          isOpen={!!editingTemplate}
          onClose={() => setEditingTemplate(null)}
          title={`تعديل قالب: ${editingTemplate.title}`}
          maxWidth="lg"
        >
          <form onSubmit={handleSaveModal} className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-700">نص الرسالة</label>
                <div className="flex flex-wrap gap-1 text-[11px]">
                  <span className="text-slate-400">انقر لإدراج: </span>
                  <button
                    type="button"
                    onClick={() => handleInsertVariable('customer_name')}
                    className="text-blue-600 hover:underline font-mono"
                  >
                    +اسم المراجع
                  </button>
                  <button
                    type="button"
                    onClick={() => handleInsertVariable('appointment_number')}
                    className="text-blue-600 hover:underline font-mono"
                  >
                    +رقم الموعد
                  </button>
                  <button
                    type="button"
                    onClick={() => handleInsertVariable('appointment_date')}
                    className="text-blue-600 hover:underline font-mono"
                  >
                    +تاريخ الموعد
                  </button>
                  <button
                    type="button"
                    onClick={() => handleInsertVariable('appointment_time')}
                    className="text-blue-600 hover:underline font-mono"
                  >
                    +وقت الموعد
                  </button>
                  <button
                    type="button"
                    onClick={() => handleInsertVariable('target_person')}
                    className="text-blue-600 hover:underline font-mono"
                  >
                    +المسؤول
                  </button>
                  <button
                    type="button"
                    onClick={() => handleInsertVariable('request_number')}
                    className="text-blue-600 hover:underline font-mono"
                  >
                    +رقم المعاملة
                  </button>
                  <button
                    type="button"
                    onClick={() => handleInsertVariable('tracking_link')}
                    className="text-blue-600 hover:underline font-mono"
                  >
                    +رابط التتبع
                  </button>
                  <button
                    type="button"
                    onClick={() => handleInsertVariable('notes')}
                    className="text-blue-600 hover:underline font-mono"
                  >
                    +ملاحظات
                  </button>
                  <button
                    type="button"
                    onClick={() => handleInsertVariable('reason')}
                    className="text-blue-600 hover:underline font-mono"
                  >
                    +السبب
                  </button>
                </div>
              </div>

              <textarea
                rows={6}
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                required
                className="w-full rounded-xl border border-slate-300 p-3.5 text-xs text-slate-900 leading-relaxed font-mono focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <Button type="button" variant="outline" onClick={() => setEditingTemplate(null)}>
                إلغاء
              </Button>
              <Button type="submit" variant="primary">
                حفظ القالب
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
