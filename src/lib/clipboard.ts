/**
 * Write text to the clipboard with a fallback for non-secure contexts.
 *
 * The Clipboard API (`navigator.clipboard`) is only exposed on HTTPS and
 * `http://localhost`. Our dev setup uses HTTP `*.nip.io` subdomains, which
 * the browser treats as insecure → `navigator.clipboard` is `undefined`.
 * The textarea/`execCommand` fallback still works there.
 */
export async function copyToClipboard(text: string): Promise<void> {
  if (typeof navigator !== 'undefined' && navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch {
      // fall through to legacy path
    }
  }
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  textarea.style.pointerEvents = 'none';
  document.body.appendChild(textarea);
  textarea.select();
  try {
    document.execCommand('copy');
  } finally {
    document.body.removeChild(textarea);
  }
}
