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

/* ───────── 1. إعدادات الكليشة (توقيت بغداد UTC+3) ───────── */
const FONT = 'Arial';                          // الخط العربي المعتمد
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

/**
 * تنسيق التاريخ بدقة وفق توقيت بغداد (UTC+3)
 */
function formatDate(input?: string): string {
  if (input && /^\d{4}-\d{2}-\d{2}$/.test(input)) {
    const [y, m, day] = input.split('-').map(Number);
    return toArabicDigits(`${day} / ${MONTHS[m - 1]} / ${y}`);
  }

  let d = input ? new Date(input) : new Date();
  if (isNaN(d.getTime())) d = new Date();

  // ضبط التوقيت وفق Asia/Baghdad (GMT+3)
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Baghdad',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  const parts = formatter.formatToParts(d);
  const year = parts.find((p) => p.type === 'year')?.value || String(d.getFullYear());
  const month = parseInt(parts.find((p) => p.type === 'month')?.value || '1', 10);
  const day = parseInt(parts.find((p) => p.type === 'day')?.value || '1', 10);

  return toArabicDigits(`${day} / ${MONTHS[month - 1]} / ${year}`);
}

function getBaghdadDateString(input?: string): string {
  if (input && /^\d{4}-\d{2}-\d{2}$/.test(input)) {
    return input;
  }
  const d = input ? new Date(input) : new Date();
  if (isNaN(d.getTime())) return new Date().toISOString().split('T')[0];
  
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Baghdad',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  return formatter.format(d);
}

/**
 * النموذج الأول: كتاب رسمي موجه إلى الوزارة / الجهة الحكومية
 * مع التذييل (مدير المكتب، التاريخ، الهامش: نسخة منه للحفظ، نسخة منه للصادر)
 */
export async function printOfficialLetterWord(req: WordRequestData) {
  const rtl = { alignment: AlignmentType.RIGHT, bidirectional: true };
  const START: any = (AlignmentType as any).START ?? AlignmentType.RIGHT;

  const run = (text: string, opts: any = {}) =>
    new TextRun({ text: text || '', rightToLeft: true, font: FONT, size: 24, ...opts });

  // فقرة بمسافات دقيقة
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

  const dateStr = getBaghdadDateString(req.submitDate);
  const formattedArabicDate = formatDate(req.submitDate);

  // تذييل الصفحة الرسمي (Footer): الهامش والنسخ فقط
  const footer = new Footer({
    children: [
      new Paragraph({
        ...rtl,
        spacing: { after: 60 },
        children: [run('نسخة منه للحفظ', { bold: true, size: 22 })]
      }),
      new Paragraph({
        ...rtl,
        children: [run('نسخة منه للصادر ... للعلم مع التقدير', { bold: true, size: 22 })]
      })
    ]
  });

  const children: Paragraph[] = [];

  // 1. البسملة
  children.push(
    para([run('بسم الله الرحمن الرحيم', { bold: true, size: 34 })], {
      align: AlignmentType.CENTER,
      line: 500,
      after: FIRST_LINE_TOP - 1134 - 500
    })
  );

  // 2. إلى / اسم الوزارة   (≈ 79 ملم من الأعلى)
  children.push(
    para(
      [
        run('إلى  /  ', { bold: true, size: 26 }),
        run(req.entity || 'الجهة الحكومية', { bold: true, size: 26 })
      ],
      { line: 360, after: 100, start: 0 }
    )
  );

  // 3. م / عنوان الطلب  (في الوسط)
  children.push(
    para(
      [
        run('م  /  ', { bold: true, size: 26 }),
        run(req.title || 'طلب مراجع', { bold: true, size: 26 })
      ],
      { align: AlignmentType.CENTER, line: 360, after: 430 }
    )
  );

  // 4. تحية طيبة
  children.push(
    para([run('تحية طيبة ...', { bold: true, size: 28 })], { line: 400, after: 300 })
  );

  // 5. نص الكتاب
  children.push(
    para(
      [
        run('نرفق اليكم ربطا التماس السيد ('),
        run(req.applicantName || 'المراجع', { bold: true }),
        run(') المنسوب الى وزارتكم الموقرة، المتضمن طلب '),
        run(req.type || req.title || 'عام', { bold: true }),
        run('.')
      ],
      { align: AlignmentType.BOTH, line: 454, after: 340 }
    )
  );

  // 6. سطر الختام
  children.push(
    para(
      [run('التفضل بالاطلاع وامكانية تلبية طلبه اصوليا واعلامنا .. مع التقدير.', { bold: true, size: 26 })],
      { line: 400, after: 2200, start: 0 }
    )
  );

  // 7. التوقيع: مدير المكتب + التاريخ (أسفل اليسار)
  children.push(
    para([run(OFFICE_TITLE, { bold: true, size: 26 })], {
      align: AlignmentType.LEFT,
      line: 400,
      after: 80
    })
  );
  children.push(
    para([run(formattedArabicDate, { bold: true, size: 26 })], {
      align: AlignmentType.LEFT,
      line: 400
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
              right: MARGIN_RIGHT,
              footer: 567
            }
          }
        },
        footers: { default: footer },
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

  const dateStr = getBaghdadDateString(req.submitDate);

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
        children: [run(`التاريخ: ${dateStr}`)]
      }),

      // سطران فارغان قبل نهاية الورقة
      emptyLine(),
      emptyLine(),

      // الأرشيف والنسخة
      new Paragraph({
        ...rtl,
        spacing: { after: 80 },
        children: [run('نسخة منه للحفظ', { bold: true })]
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

          // نص المعاملة
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
