import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  AlignmentType,
  LineRuleType
} from 'docx';
import { saveAs } from 'file-saver';
import { RequestItem } from '../types';

export interface WordRequestData {
  title: string;
  requestNumber?: string;
  entity: string;
  type: string;
  description: string;
  applicantName: string;
  applicantPhone: string;
  nationalId?: string;
  address?: string;
  submitDate: string;
  status?: string;
  priority?: string;
}

/* ───────── إعدادات الكليشة (عدّل هنا فقط) ───────── */
const FONT = 'Arial';                          // يمكن تغييره الى Simplified Arabic
const OFFICE_TITLE = 'مدير مكتب النائب الأول';
// الصفحة A4 — الهوامش بالتويبس (1 ملم ≈ 56.7)
const PAGE = { width: 11906, height: 16838 };
const MARGIN_RIGHT = 1650;                     // ≈ 29 ملم
const MARGIN_LEFT = 1760;                      // ≈ 31 ملم
const MARGIN_BOTTOM = 1134;
// بداية النص تحت ترويسة الورقة: ≈ 76 ملم من اعلى الصفحة
const FIRST_LINE_TOP = 4298;
/* ─────────────────────────────────────────────── */

const MONTHS = [
  'كانون الثاني', 'شباط', 'آذار', 'نيسان', 'أيار', 'حزيران',
  'تموز', 'آب', 'أيلول', 'تشرين الأول', 'تشرين الثاني', 'كانون الأول'
];

const toArabicDigits = (s: string) => s.replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[Number(d)]);

function formatDate(input?: string): string {
  let d = input ? new Date(input) : new Date();
  if (isNaN(d.getTime())) d = new Date();
  return toArabicDigits(`${d.getDate()} / ${MONTHS[d.getMonth()]} / ${d.getFullYear()}`);
}

export async function printRequestWord(req: WordRequestData) {
  // START = بداية السطر = اليمين في الفقرات العربية
  const START: any = (AlignmentType as any).START ?? AlignmentType.RIGHT;

  const run = (text: string, opts: any = {}) =>
    new TextRun({ text: text || '', rightToLeft: true, font: FONT, size: 24, ...opts });

  // فقرة بمسافات دقيقة (line = ارتفاع السطر ثابت، after = المسافة بعدها)
  const para = (
    children: TextRun[],
    o: { align?: any; line?: number; after?: number; start?: number } = {}
  ) =>
    new Paragraph({
      alignment: o.align ?? START,
      bidirectional: true,
      spacing: {
        line: o.line ?? 360,
        lineRule: LineRuleType.EXACT,
        before: 0,
        after: o.after ?? 0
      },
      ...(o.start ? { indent: { start: o.start } as any } : {}),
      children
    });

  const children: Paragraph[] = [];

  // البسملة
  children.push(
    para([run('بسم الله الرحمن الرحيم', { bold: true, size: 34 })], {
      align: AlignmentType.CENTER,
      line: 500,
      after: FIRST_LINE_TOP - 1134 - 500
    })
  );

  // إلى / اسم الوزارة   (≈ 79 ملم من الأعلى)
  children.push(
    para(
      [
        run('إلى  /  ', { bold: true, size: 26 }),
        run(req.entity || 'الجهة الحكومية', { bold: true, size: 26 })
      ],
      { line: 360, after: 100, start: 0 }
    )
  );

  // م / عنوان الطلب  (في الوسط)
  children.push(
    para(
      [
        run('م  /  ', { bold: true, size: 26 }),
        run(req.title || 'طلب مراجع', { bold: true, size: 26 })
      ],
      { align: AlignmentType.CENTER, line: 360, after: 430 }
    )
  );

  // تحية طيبة
  children.push(
    para([run('تحية طيبة ...', { bold: true, size: 28 })], { line: 400, after: 300 })
  );

  // نص الكتاب (فقرة واحدة متراصة، بين السطور ≈ 8 ملم)
  children.push(
    para(
      [
        run('نرفق اليكم ربطا التماس السيد ('),
        run(req.applicantName || 'المراجع'),
        run(') المنسوب الى وزارتكم الموقرة، المتضمن طلب '),
        run(req.type || 'عام'),
        run('.')
      ],
      { align: AlignmentType.BOTH, line: 454, after: 340 }
    )
  );

  // سطر الختام (مزاح قليلا عن الهامش)
  children.push(
    para(
      [run('التفضل بالاطلاع وامكانية تلبية طلبه اصوليا واعلامنا .. مع التقدير.', { bold: true, size: 26 })],
      { line: 400, after: 2095, start: 935 }
    )
  );

  // التوقيع: مدير المكتب + التاريخ (كتلة متوسطة في الجهة اليسرى من اليمين، كما في الأصل)
  children.push(
    para([run(OFFICE_TITLE, { bold: true, size: 26 })], {
      align: AlignmentType.CENTER,
      line: 400,
      start: 5050
    })
  );
  children.push(
    para([run(formatDate(req.submitDate), { bold: true, size: 26 })], {
      align: AlignmentType.CENTER,
      line: 400,
      start: 5050
    })
  );

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            size: PAGE,
            margin: {
              top: 1134,
              bottom: MARGIN_BOTTOM,
              left: MARGIN_LEFT,
              right: MARGIN_RIGHT
            }
          }
        },
        children
      }
    ]
  });

  const blob = await Packer.toBlob(doc);
  const cleanTitle = (req.title || req.requestNumber || 'معاملة').replace(/[\\/:*?"<>|]/g, '_');
  saveAs(blob, `طلب-${cleanTitle}.docx`);
}

export async function exportRequestItemToWord(req: RequestItem) {
  return printRequestWord({
    title: req.title,
    requestNumber: req.requestNumber,
    entity: req.ministryName || 'الجهة الحكومية',
    type: req.requestType || 'عام',
    description: req.details || '',
    applicantName: req.customerName || 'المراجع',
    applicantPhone: req.customerPhone || '',
    nationalId: req.nationalId || (req as any).customerNationalId,
    address: req.customerAddress,
    submitDate: req.receiveDate,
    status: req.status,
    priority: req.priority
  });
}
