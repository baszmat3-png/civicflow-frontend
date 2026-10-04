import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  AlignmentType
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

export async function printRequestWord(req: WordRequestData) {
  const rtl = { alignment: AlignmentType.RIGHT, bidirectional: true };
  const run = (text: string, opts: any = {}) =>
    new TextRun({ text: text || '', rightToLeft: true, font: 'Arial', size: 26, ...opts });

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1134, bottom: 1134, left: 1134, right: 1134 }
          }
        },
        children: [
          // البسملة
          new Paragraph({
            alignment: AlignmentType.CENTER,
            bidirectional: true,
            spacing: { after: 400 },
            children: [run('بسم الله الرحمن الرحيم', { bold: true, size: 34 })]
          }),

          // الوزارة والجهة
          new Paragraph({
            ...rtl,
            spacing: { after: 200 },
            children: [
              run('الوزارة / الجهة: ', { bold: true }),
              run(req.entity || 'غير محدد')
            ]
          }),

          // م/ عنوان الطلب ونوعه
          new Paragraph({
            ...rtl,
            spacing: { after: 250 },
            children: [
              run('م/ ', { bold: true }),
              run(req.title || 'طلب مراجع', { bold: true, underline: {} })
            ]
          }),

          new Paragraph({
            ...rtl,
            spacing: { after: 300 },
            children: [
              run('نوع الطلب: ', { bold: true }),
              run(req.type || 'عام'),
              ...(req.requestNumber
                ? [
                    run('       رقم المعاملة: ', { bold: true }),
                    run(req.requestNumber, { bold: true })
                  ]
                : [])
            ]
          }),

          // تفاصيل الطلب
          new Paragraph({
            ...rtl,
            spacing: { after: 400, line: 360 },
            children: [
              run('تفاصيل الطلب: ', { bold: true }),
              run(req.description || 'لا يوجد وصف تفصيلي إضافي للمعاملة.')
            ]
          }),

          // فاصل
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 300, after: 300 },
            children: [run('────────────────────────────────────────────', { color: '888888' })]
          }),

          // صاحب الطلب ورقمه
          new Paragraph({
            ...rtl,
            spacing: { before: 200, after: 120 },
            children: [run(`مقدم الطلب: ${req.applicantName || '---'}`, { bold: true })]
          }),

          new Paragraph({
            ...rtl,
            spacing: { after: 120 },
            children: [run(`رقم الهاتف: ${req.applicantPhone || '---'}`)]
          }),

          ...(req.nationalId
            ? [
                new Paragraph({
                  ...rtl,
                  spacing: { after: 120 },
                  children: [run(`رقم الهوية: ${req.nationalId}`)]
                })
              ]
            : []),

          ...(req.address
            ? [
                new Paragraph({
                  ...rtl,
                  spacing: { after: 120 },
                  children: [run(`العنوان: ${req.address}`)]
                })
              ]
            : []),

          // التاريخ
          new Paragraph({
            ...rtl,
            spacing: { after: 120 },
            children: [run(`التاريخ: ${req.submitDate || new Date().toISOString().split('T')[0]}`)]
          })
        ]
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
