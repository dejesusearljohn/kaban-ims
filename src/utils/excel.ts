import ExcelJS from 'exceljs'

const HEADER_TEXT = [
  'City of Olongapo',
  'BARANGAY NEW BANICAIN',
  'Luna Street New Banicain Olongapo City, Philippines 2200',
]

const getReportTitle = (filename: string): string => {
  if (filename.includes('wmr')) return 'WASTE MATERIALS REPORT SUMMARY'
  if (filename.includes('stockpile')) return 'STOCKPILE REPORT'
  if (filename.includes('inventory')) return 'INVENTORY REPORT'
  if (filename.includes('vehicles')) return 'VEHICLES REPORT'
  if (filename.includes('par')) return 'PROPERTY ACKNOWLEDGMENT RECEIPT REPORT'
  return 'REPORT'
}

type VehicleLedgerRow = {
  dateRepaired: string
  jobOrderNo: string
  serviceCenter: string
  remarks: string
  repairCost: number | string
}

type VehicleLedgerSheet = {
  sheetName: string
  propertyEquipment: string
  classification: string
  accountCode: string
  propertyNumber: string
  plateNumber: string
  usefulLife: string
  description: string
  brandModel: string
  depreciationRate: string
  rows: VehicleLedgerRow[]
}

const sanitizeSheetName = (value: string, fallback: string): string => {
  const trimmed = value.trim()
  const safe = trimmed.replace(/[\\/?*\[\]:]/g, '').slice(0, 31)
  return safe.length > 0 ? safe : fallback
}

export const downloadVehicleLedgerExcel = (
  filename: string,
  sheets: VehicleLedgerSheet[],
) => {
  void (async () => {
    if (sheets.length === 0) {
      alert('No vehicles to export')
      return
    }

    const workbook = new ExcelJS.Workbook()

    let logoImageId: number | null = null
    try {
      const logoUrl = `${window.location.origin}/Banicain-logo.png`
      const logoResponse = await fetch(logoUrl)
      if (logoResponse.ok) {
        const logoBuffer = await logoResponse.arrayBuffer()
        logoImageId = workbook.addImage({
          buffer: logoBuffer,
          extension: 'png',
        })
      }
    } catch {
      logoImageId = null
    }

    sheets.forEach((sheet, index) => {
      const worksheet = workbook.addWorksheet(
        sanitizeSheetName(sheet.sheetName, `Vehicle-${index + 1}`),
        {
          pageSetup: {
            paperSize: 9,
            orientation: 'portrait',
            fitToPage: true,
            fitToWidth: 1,
            fitToHeight: 1,
            margins: {
              left: 0.35,
              right: 0.35,
              top: 0.35,
              bottom: 0.35,
              header: 0.2,
              footer: 0.2,
            },
          },
        },
      )

      worksheet.columns = [
        { width: 18 },
        { width: 22 },
        { width: 26 },
        { width: 46 },
        { width: 16 },
      ]

      const topRows = [1, 2, 3, 5, 6, 8, 9, 10, 11]
      topRows.forEach((rowNumber) => {
        const row = worksheet.getRow(rowNumber)
        row.height = 20
      })

      worksheet.mergeCells('C1:F1')
      worksheet.mergeCells('C2:F2')
      worksheet.mergeCells('C3:F3')
      worksheet.mergeCells('A5:F5')
      worksheet.mergeCells('A6:F6')

      worksheet.getCell('C1').value = HEADER_TEXT[0]
      worksheet.getCell('C2').value = HEADER_TEXT[1]
      worksheet.getCell('C3').value = HEADER_TEXT[2]
      worksheet.getCell('A5').value = 'VEHICLES REPORT'
      worksheet.getCell('A6').value = new Date().toLocaleDateString('en-PH')

      worksheet.getCell('C1').alignment = { horizontal: 'left', vertical: 'middle' }
      worksheet.getCell('C2').alignment = { horizontal: 'left', vertical: 'middle' }
      worksheet.getCell('C3').alignment = { horizontal: 'left', vertical: 'middle' }
      worksheet.getCell('A5').alignment = { horizontal: 'center', vertical: 'middle' }
      worksheet.getCell('A6').alignment = { horizontal: 'center', vertical: 'middle' }

      worksheet.getCell('C1').font = { name: 'Arial', size: 13 }
      worksheet.getCell('C2').font = { name: 'Arial', size: 18, bold: true }
      worksheet.getCell('C3').font = { name: 'Arial', size: 12 }
      worksheet.getCell('A5').font = { name: 'Arial', size: 17, bold: true }
      worksheet.getCell('A6').font = { name: 'Arial', size: 11 }

      if (logoImageId != null) {
        worksheet.addImage(logoImageId, {
          tl: { col: 0.15, row: 0.15 },
          ext: { width: 92, height: 92 },
          editAs: 'oneCell',
        })
      }

      worksheet.mergeCells('A8:F8')
      worksheet.getCell('A8').value = ''

      worksheet.getCell('A9').value = `Property/Equipment: ${sheet.propertyEquipment || '—'}`
      worksheet.getCell('C9').value = `Classification: ${sheet.classification || '—'}`
      worksheet.getCell('E9').value = `Account Code: ${sheet.accountCode || '—'}`

      worksheet.getCell('A10').value = `Property #: ${sheet.propertyNumber || '—'}`
      worksheet.getCell('C10').value = `Plate # : ${sheet.plateNumber || '—'}`
      worksheet.getCell('E10').value = `Est. Useful Life: ${sheet.usefulLife || '—'}`

      worksheet.getCell('A11').value = `Description: ${sheet.description || '—'}`
      worksheet.getCell('C11').value = `Brand/Model: ${sheet.brandModel || '—'}`
      worksheet.getCell('E11').value = `Rate of Depreciation: ${sheet.depreciationRate || '—'}`

      ;['A9', 'C9', 'E9', 'A10', 'C10', 'E10', 'A11', 'C11', 'E11'].forEach((cellAddress) => {
        const cell = worksheet.getCell(cellAddress)
        cell.font = { name: 'Arial', size: 10 }
      })

      worksheet.getCell('A12').value = 'Date of Acquisition'
      worksheet.getCell('A13').value = 'Date Repaired'
      worksheet.getCell('B12').value = 'Job Order No.'
      worksheet.getCell('C12').value = 'Service Center'
      worksheet.getCell('D12').value = 'Remarks'
      worksheet.getCell('E12').value = 'Repair Cost'

      worksheet.mergeCells('B12:B13')
      worksheet.mergeCells('C12:C13')
      worksheet.mergeCells('D12:D13')
      worksheet.mergeCells('E12:E13')

      ;['A12', 'A13', 'B12', 'C12', 'D12', 'E12'].forEach((cellAddress) => {
        const cell = worksheet.getCell(cellAddress)
        cell.font = { name: 'Arial', size: 10, bold: true }
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
      })

      const bodyStart = 14
      const maxRowsPerPage = 31
      const visibleRows = sheet.rows.slice(0, maxRowsPerPage)

      visibleRows.forEach((entry, rowIndex) => {
        const rowNumber = bodyStart + rowIndex
        worksheet.getCell(rowNumber, 1).value = entry.dateRepaired
        worksheet.getCell(rowNumber, 2).value = entry.jobOrderNo
        worksheet.getCell(rowNumber, 3).value = entry.serviceCenter
        worksheet.getCell(rowNumber, 4).value = entry.remarks
        worksheet.getCell(rowNumber, 5).value = entry.repairCost === '' ? '' : Number(entry.repairCost)

        worksheet.getCell(rowNumber, 1).alignment = { vertical: 'top', horizontal: 'center' }
        worksheet.getCell(rowNumber, 2).alignment = { vertical: 'top', horizontal: 'left', wrapText: true }
        worksheet.getCell(rowNumber, 3).alignment = { vertical: 'top', horizontal: 'left', wrapText: true }
        worksheet.getCell(rowNumber, 4).alignment = { vertical: 'top', horizontal: 'left', wrapText: true }
        worksheet.getCell(rowNumber, 5).alignment = { vertical: 'top', horizontal: 'right' }
      })

      for (let row = 12; row <= 44; row += 1) {
        for (let col = 1; col <= 5; col += 1) {
          const cell = worksheet.getCell(row, col)
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' },
          }
          if (!cell.font) {
            cell.font = { name: 'Arial', size: 10 }
          }
        }
      }
    })

    const buffer = await workbook.xlsx.writeBuffer()
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.href = url
    link.download = filename
    link.style.display = 'none'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  })()
}

export const downloadExcel = (filename: string, rows: Array<Record<string, unknown>>) => {
  void (async () => {
    if (rows.length === 0) {
      alert('No data to export')
      return
    }

    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet('Report')

    const headers = Object.keys(rows[0])
    const title = getReportTitle(filename)
    const currentDate = new Date().toLocaleDateString('en-PH')
    const totalColumns = Math.max(headers.length, 6)

    // Reserve the top-left area for the logo.
    worksheet.getRow(1).height = 24
    worksheet.getRow(2).height = 24
    worksheet.getRow(3).height = 24

    worksheet.mergeCells(1, 3, 1, totalColumns)
    worksheet.mergeCells(2, 3, 2, totalColumns)
    worksheet.mergeCells(3, 3, 3, totalColumns)
    worksheet.mergeCells(5, 1, 5, totalColumns)
    worksheet.mergeCells(6, 1, 6, totalColumns)

    worksheet.getCell(1, 3).value = HEADER_TEXT[0]
    worksheet.getCell(2, 3).value = HEADER_TEXT[1]
    worksheet.getCell(3, 3).value = HEADER_TEXT[2]
    worksheet.getCell(5, 1).value = title
    worksheet.getCell(6, 1).value = currentDate

    worksheet.getCell(1, 3).alignment = { vertical: 'middle', horizontal: 'left' }
    worksheet.getCell(2, 3).alignment = { vertical: 'middle', horizontal: 'left' }
    worksheet.getCell(3, 3).alignment = { vertical: 'middle', horizontal: 'left' }
    worksheet.getCell(5, 1).alignment = { vertical: 'middle', horizontal: 'center' }
    worksheet.getCell(6, 1).alignment = { vertical: 'middle', horizontal: 'center' }

    worksheet.getCell(1, 3).font = { size: 13 }
    worksheet.getCell(2, 3).font = { size: 18, bold: true }
    worksheet.getCell(3, 3).font = { size: 12 }
    worksheet.getCell(5, 1).font = { size: 17, bold: true }
    worksheet.getCell(6, 1).font = { size: 11 }

    try {
      const logoUrl = `${window.location.origin}/Banicain-logo.png`
      const logoResponse = await fetch(logoUrl)
      if (logoResponse.ok) {
        const logoBuffer = await logoResponse.arrayBuffer()
        const logoImageId = workbook.addImage({
          buffer: logoBuffer,
          extension: 'png',
        })

        worksheet.addImage(logoImageId, {
          tl: { col: 0.15, row: 0.15 },
          ext: { width: 92, height: 92 },
          editAs: 'oneCell',
        })
      }
    } catch {
      // Continue export even if logo load fails.
    }

    const headerRowIndex = 8
    headers.forEach((header, columnIndex) => {
      const cell = worksheet.getCell(headerRowIndex, columnIndex + 1)
      cell.value = header
      cell.font = { bold: true }
      cell.alignment = { horizontal: 'center', vertical: 'middle' }
    })

    rows.forEach((row, rowIndex) => {
      const excelRowIndex = headerRowIndex + 1 + rowIndex
      headers.forEach((header, columnIndex) => {
        const value = row[header]
        let normalizedValue: string | number = ''
        if (value != null) {
          if (typeof value === 'string' || typeof value === 'number') {
            normalizedValue = value
          } else if (typeof value === 'boolean') {
            normalizedValue = value ? 'Yes' : 'No'
          } else {
            normalizedValue = JSON.stringify(value)
          }
        }
        worksheet.getCell(excelRowIndex, columnIndex + 1).value = normalizedValue
      })
    })

    headers.forEach((header, columnIndex) => {
      const longestCell = rows.reduce((max, row) => {
        const value = row[header]
        const length = value == null ? 0 : String(value).length
        return Math.max(max, length)
      }, header.length)
      worksheet.getColumn(columnIndex + 1).width = Math.min(Math.max(longestCell + 2, 12), 42)
    })

    const buffer = await workbook.xlsx.writeBuffer()
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.href = url
    link.download = filename
    link.style.display = 'none'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  })()
}
