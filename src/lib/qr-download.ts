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

  // jsPDF v4 wants the raw base64 segment, not the full data URL.
  const base64Data = qrDataUrl.includes(',') ? qrDataUrl.split(',')[1] : qrDataUrl;
  doc.addImage(base64Data, 'PNG', 52.5, 60, 100, 100);

  doc.setFontSize(12);
  doc.setTextColor(100, 100, 100);
  doc.text(signupUrl, 105, 175, { align: 'center' });

  doc.save(`${businessName}-qr-code.pdf`);
}
