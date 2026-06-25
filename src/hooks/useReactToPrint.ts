import { useCallback, RefObject } from 'react';

export function useReactToPrint(ref: RefObject<HTMLDivElement | null>) {
  return useCallback(() => {
    const el = ref.current;
    if (!el) return;

    const originalTitle = document.title;
    document.title = 'Impressão';

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
      .map(s => s.outerHTML)
      .join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>Impressão</title>
          ${styles}
          <style>
            @page { size: A4; margin: 10mm; }
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            @media print { .no-print { display: none !important; } }
          </style>
        </head>
        <body>${el.innerHTML}</body>
      </html>
    `);
    printWindow.document.close();

    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
      printWindow.close();
      document.title = originalTitle;
    }, 500);
  }, [ref]);
}
