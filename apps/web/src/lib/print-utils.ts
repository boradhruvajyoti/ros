// =============================================================================
// Same-Tab Print Utility — Opens Print Dialog without opening blank new windows
// =============================================================================

export function printHtmlInSameTab(htmlContent: string): void {
  if (typeof document === 'undefined') return;

  // Clean up any previously created print iframe
  const existingFrame = document.getElementById('ros-print-frame');
  if (existingFrame) {
    existingFrame.remove();
  }

  const iframe = document.createElement('iframe');
  iframe.id = 'ros-print-frame';
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.style.visibility = 'hidden';
  iframe.setAttribute('aria-hidden', 'true');
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document || iframe.contentDocument;
  if (!doc) {
    iframe.remove();
    return;
  }

  doc.open();
  doc.write(htmlContent);
  doc.close();

  // Allow styles and resources inside iframe to layout before opening print dialog
  setTimeout(() => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch (err) {
      console.error('Same-tab print error:', err);
    } finally {
      // Clean up iframe after user completes/cancels print
      setTimeout(() => {
        const frameToRemove = document.getElementById('ros-print-frame');
        if (frameToRemove) {
          frameToRemove.remove();
        }
      }, 2000);
    }
  }, 250);
}
