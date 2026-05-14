/**
 * Download a base64 QR data-URL as a PNG file. Synchronous: just triggers
 * a browser download via an anchor tag.
 */
export function downloadQrPng(qrDataUrl: string, businessName: string): void {
  const link = document.createElement('a');
  link.href = qrDataUrl;
  link.download = `${sanitize(businessName)}-qr-code.png`;
  link.click();
}

/**
 * Download a printable A4 PDF with the business name on top, the QR
 * centered, and the signup URL underneath. Matches `BusinessUrlCard`'s
 * existing layout so the printed page is identical whether the owner
 * downloads from the onboarding wizard or from the dashboard later.
 *
 * Lazy-loads `jspdf` to keep it out of the main bundle — the wizard ships
 * it on demand only when the owner taps "PDF".
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

  const base64 = qrDataUrl.includes(',') ? qrDataUrl.split(',')[1] : qrDataUrl;
  doc.addImage(base64, 'PNG', 52.5, 60, 100, 100);

  doc.setFontSize(12);
  doc.setTextColor(100, 100, 100);
  doc.text(signupUrl, 105, 175, { align: 'center' });

  doc.save(`${sanitize(businessName)}-qr-code.pdf`);
}

function sanitize(name: string): string {
  return name.trim().replace(/[^\w\-]+/g, '-') || 'business';
}
