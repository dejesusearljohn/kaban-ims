import { jsPDF } from 'jspdf'
import QRCode from 'qrcode'

export type InventoryQrPdfItem = {
  item_name: string
  qr_code: string
}

const COLS = 2
const ROWS = 3
const PER_PAGE = COLS * ROWS

const truncateText = (value: string, maxLength: number) =>
  value.length > maxLength ? `${value.slice(0, maxLength - 3)}...` : value

export async function downloadInventoryQrPdf(items: InventoryQrPdfItem[]): Promise<void> {
  if (items.length === 0) return

  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 14
  const cellWidth = (pageWidth - margin * 2) / COLS
  const cellHeight = (pageHeight - margin * 2) / ROWS

  for (let index = 0; index < items.length; index += 1) {
    if (index > 0 && index % PER_PAGE === 0) {
      doc.addPage()
    }

    const item = items[index]
    const slot = index % PER_PAGE
    const col = slot % COLS
    const row = Math.floor(slot / COLS)
    const cellX = margin + col * cellWidth
    const cellY = margin + row * cellHeight

    const qrDataUrl = await QRCode.toDataURL(item.qr_code, {
      margin: 1,
      width: 512,
      errorCorrectionLevel: 'M',
    })

    const labelHeight = 18
    const qrSize = Math.min(cellWidth - 16, cellHeight - labelHeight - 8, 52)
    const qrX = cellX + (cellWidth - qrSize) / 2
    const qrY = cellY + 6

    doc.addImage(qrDataUrl, 'PNG', qrX, qrY, qrSize, qrSize)

    const labelY = qrY + qrSize + 6
    const centerX = cellX + cellWidth / 2

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.text(truncateText(item.item_name, 48), centerX, labelY, {
      align: 'center',
      maxWidth: cellWidth - 8,
    })
  }

  const stamp = new Date().toISOString().slice(0, 10)
  doc.save(`inventory-qr-codes-${stamp}.pdf`)
}
