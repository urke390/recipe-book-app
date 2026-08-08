// Exports an HTML string as a Word-openable .doc file - no server or extra
// library needed, Word reliably opens HTML content saved with this MIME
// type/extension. The exported markup keeps the same Tailwind class names as
// the live page (so it stays readable if something's missing), but since
// Word ignores the app's actual stylesheet, a small hand-written CSS block
// re-covers just the element types RecipePrintSection actually produces
// (headings, tables, the per-recipe page break) rather than reimplementing
// all of Tailwind.
const WORD_STYLES = `
  body { font-family: Arial, sans-serif; direction: rtl; }
  h2 { font-size: 20pt; font-weight: bold; margin: 0 0 4px; }
  h3 { font-size: 13pt; font-weight: bold; margin: 0 0 6px; }
  p { font-size: 10.5pt; margin: 0 0 4px; }
  table { width: 100%; border-collapse: collapse; font-size: 10.5pt; margin-bottom: 16px; }
  td { padding: 4px 8px; border-bottom: 1px solid #ccc; }
  ol { padding-right: 20px; font-size: 10.5pt; }
  li { margin-bottom: 4px; }
  section.print-recipe { page-break-before: always; margin-bottom: 24px; }
  section.print-recipe:first-of-type { page-break-before: avoid; }
  header { border-bottom: 2px solid #333; padding-bottom: 8px; margin-bottom: 16px; }
`

export function exportHtmlToWord(html, filename) {
  const doc = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="utf-8"><title>${filename}</title><style>${WORD_STYLES}</style></head>
<body dir="rtl">${html}</body>
</html>`
  const blob = new Blob(['﻿', doc], { type: 'application/msword' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename.endsWith('.doc') ? filename : `${filename}.doc`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
