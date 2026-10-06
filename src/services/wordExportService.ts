import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  AlignmentType,
  LineRuleType,
  BorderStyle,
  Footer
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

/* ───────── 1. إعدادات كليشة الكتاب الرسمي (النموذج 1) ───────── */
const FONT = 'Arial';                          // يمكن تغييره الى Simplified Arabic
const OFFICE_TITLE = 'مدير مكتب النائب الأول';
// الصفحة A4 — الهوامش بالتويبس (1 ملم ≈ 56.7)
const PAGE = { width: 11906, height: 16838 };
const MARGIN_RIGHT = 1650;                     // ≈ 29 ملم
const MARGIN_LEFT = 1760;                      // ≈ 31 ملم
const MARGIN_BOTTOM = 1134;
// بداية النص تحت ترويسة الورقة: ≈ 76 ملم من اعلى الصفحة
const FIRST_LINE_TOP = 4298;

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

/**
 * النموذج الأول: كتاب رسمي موجه إلى الوزارة / الجهة الحكومية
 */
export async function printOfficialLetterWord(req: WordRequestData) {
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
        run(req.applicantName || 'المراجع', { bold: true }),
        run(') المنسوب الى وزارتكم الموقرة، المتضمن طلب '),
        run(req.type || 'عام', { bold: true }),
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
  saveAs(blob, `كتاب-رسمي-${cleanTitle}.docx`);
}

/**
 * النموذج الثاني: استمارة طلب المعاملة (الصادر والوارد والأرشيف)
 */
export async function printRequestFormWord(req: WordRequestData) {
  const rtl = { alignment: AlignmentType.RIGHT, bidirectional: true };
  const center = { alignment: AlignmentType.CENTER, bidirectional: true };
  const run = (text: string, opts: any = {}) =>
    new TextRun({ text: text || '', rightToLeft: true, font: 'Arial', size: 26, ...opts });

  const date = req.submitDate || new Date().toISOString().split('T')[0];

  // سطر فارغ
  const emptyLine = () => new Paragraph({ children: [run('')] });

  // ===== التذييل: بيانات المراجع (أسفل اليسار) + الأرشيف + النسخة =====
  const footer = new Footer({
    children: [
      // بيانات المراجع أسفل اليسار
      new Paragraph({
        alignment: AlignmentType.LEFT,
        bidirectional: true,
        spacing: { after: 80 },
        children: [run(`المراجع: ${req.applicantName || '---'}`, { bold: true })]
      }),
      new Paragraph({
        alignment: AlignmentType.LEFT,
        bidirectional: true,
        spacing: { after: 80 },
        children: [run(`رقم الهاتف: ${req.applicantPhone || '---'}`)]
      }),
      new Paragraph({
        alignment: AlignmentType.LEFT,
        bidirectional: true,
        spacing: { after: 80 },
        children: [run(`التاريخ: ${date}`)]
      }),

      // سطران فارغان قبل نهاية الورقة
      emptyLine(),
      emptyLine(),

      // الأرشيف والنسخة
      new Paragraph({
        ...rtl,
        spacing: { after: 80 },
        children: [run('الأرشيف للحفظ', { bold: true })]
      }),
      new Paragraph({
        ...rtl,
        children: [run('نسخة منه للصادر ... للعلم مع التقدير', { bold: true })]
      })
    ]
  });

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1134, bottom: 1134, left: 1134, right: 1134, footer: 567 }
          }
        },
        footers: { default: footer },
        children: [
          // البسملة (في المنتصف)
          new Paragraph({
            ...center,
            spacing: { after: 400 },
            children: [run('بسم الله الرحمن الرحيم', { bold: true, size: 34 })]
          }),

          // الوزارة / الجهة
          new Paragraph({
            ...rtl,
            spacing: { after: 250 },
            children: [
              run('الوزارة / الجهة: ', { bold: true }),
              run(req.entity || 'غير محدد')
            ]
          }),

          // الموضوع (في المنتصف)
          new Paragraph({
            ...center,
            spacing: { after: 150 },
            children: [
              run('م/ ', { bold: true }),
              run(req.title || 'طلب مراجع', { bold: true, underline: {} })
            ]
          }),

          // نوع الطلب (في المنتصف)
          new Paragraph({
            ...center,
            spacing: { after: 400 },
            children: [
              run('نوع الطلب: ', { bold: true }),
              run(req.type || 'عام', { bold: true })
            ]
          }),

          // تحية طيبة
          new Paragraph({
            ...rtl,
            spacing: { after: 250 },
            children: [run('تحية طيبة ،،،', { bold: true })]
          }),

          // نص المعاملة (بدون عنوان "تفاصيل الطلب" وبدون رقم المعاملة)
          new Paragraph({
            ...rtl,
            spacing: { after: 400, line: 360 },
            children: [run(req.description || 'لا يوجد وصف تفصيلي إضافي للمعاملة.')]
          }),

          // الخاتمة (في المنتصف، بنفس الحجم وبخط عريض)
          new Paragraph({
            ...center,
            spacing: { before: 200, after: 300 },
            children: [run('ولكم الأمر بما ترونه مناسباً مع التقدير', { bold: true })]
          }),

          // خط فاصل في نهاية الطلب
          new Paragraph({
            spacing: { before: 200, after: 200 },
            border: {
              bottom: { style: BorderStyle.SINGLE, size: 8, color: '000000', space: 1 }
            },
            children: [run('')]
          })
        ]
      }
    ]
  });

  const blob = await Packer.toBlob(doc);
  const cleanTitle = (req.title || req.requestNumber || 'معاملة').replace(/[\\/:*?"<>|]/g, '_');
  saveAs(blob, `طلب-${cleanTitle}.docx`);
}

// Helpers for RequestItem
export async function exportOfficialLetterToWord(req: RequestItem) {
  return printOfficialLetterWord({
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

export async function exportRequestFormToWord(req: RequestItem) {
  return printRequestFormWord({
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

// Default export alias
export const exportRequestItemToWord = exportOfficialLetterToWord;
export const printRequestWord = printOfficialLetterWord;
