/**
 * Strip a data-URL prefix down to the raw base64 segment. jsPDF v4 and
 * JSZip both want the bare base64, not the full `data:image/png;base64,…`
 * URL. Tolerates input that is already raw base64.
 */
function toRawBase64(qr: string): string {
  return qr.includes(',') ? qr.split(',')[1] : qr;
}

/**
 * Normalize a QR value to a full PNG data URL. Location QRs arrive as raw
 * base64 (no prefix); the global signup QR already includes the prefix.
 */
export function toQrDataUrl(qr: string): string {
  return qr.startsWith('data:') ? qr : `data:image/png;base64,${qr}`;
}

/**
 * Download a base64 QR data-URL as a PNG file. Synchronous: just triggers
 * a browser download via an anchor tag.
 */
export function downloadQrPng(qrDataUrl: string, businessName: string): void {
  const link = document.createElement('a');
  link.href = qrDataUrl;
  link.download = `${businessName}-qr-code.png`;
  link.click();
}

/**
 * Download a printable A4 PDF with the business name on top, the QR
 * centered, and the signup URL underneath. Shared by `BusinessUrlCard`
 * (dashboard) and the onboarding `InstallStep` so the print output is
 * identical in both places.
 *
 * Lazy-loads `jspdf` to keep it out of the main bundle — the chunk only
 * ships when the owner taps "Save as PDF".
 */
export async function downloadQrPdf(
  qrDataUrl: string,
  businessName: string,
  signupUrl: string
): Promise<void> {
  const { default: jsPDF } = await import('jspdf');
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  doc.setFontSize(20);
  doc.text(businessName, 105, 40, { align: 'center' });

  doc.addImage(toRawBase64(qrDataUrl), 'PNG', 52.5, 60, 100, 100);

  doc.setFontSize(12);
  doc.setTextColor(100, 100, 100);
  doc.text(signupUrl, 105, 175, { align: 'center' });

  doc.save(`${businessName}-qr-code.pdf`);
}

/** A single QR to render into a batch PDF / ZIP. */
export interface QrSheetItem {
  /** Shown centered at the top of the PDF page. */
  name: string;
  /** Full data URL or raw base64 — both accepted. */
  qr: string;
  /** Filename stem used for the PNG inside the ZIP (omit `.png`). */
  fileName: string;
  /** Enrollment URL printed under the QR (PDF only). */
  url?: string;
}

/**
 * Build one printable A4 PDF with a page per QR — each page carries the
 * location name on top, the QR centered, and the enrollment URL underneath.
 * Layout matches `downloadQrPdf` so a per-location page and the global poster
 * look identical. Lazy-loads `jspdf`.
 */
export async function downloadAllQrPdf(
  items: QrSheetItem[],
  fileName: string
): Promise<void> {
  const { default: jsPDF } = await import('jspdf');
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  items.forEach((item, i) => {
    if (i > 0) doc.addPage();

    doc.setFontSize(20);
    doc.setTextColor(0, 0, 0);
    doc.text(item.name, 105, 40, { align: 'center' });

    doc.addImage(toRawBase64(item.qr), 'PNG', 52.5, 60, 100, 100);

    if (item.url) {
      doc.setFontSize(12);
      doc.setTextColor(100, 100, 100);
      doc.text(item.url, 105, 175, { align: 'center' });
    }
  });

  doc.save(`${fileName}.pdf`);
}

/**
 * Bundle one PNG per QR into a single ZIP — each entry named after the
 * item's `fileName` (the location slug, already filesystem-safe). Lazy-loads
 * `jszip`.
 */
export async function downloadAllQrZip(
  items: QrSheetItem[],
  fileName: string
): Promise<void> {
  const { default: JSZip } = await import('jszip');
  const zip = new JSZip();

  const used = new Set<string>();
  for (const item of items) {
    const stem = item.fileName || 'qr';
    let name = `${stem}.png`;
    let n = 2;
    while (used.has(name)) name = `${stem}-${n++}.png`;
    used.add(name);
    zip.file(name, toRawBase64(item.qr), { base64: true });
  }

  const blob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${fileName}.zip`;
  link.click();
  URL.revokeObjectURL(url);
}
