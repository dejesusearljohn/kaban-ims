const normalizeCellValue = (value: unknown): string => {
  if (value == null) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  return JSON.stringify(value)
}

const escapeCsvCell = (value: string): string => {
  if (value.includes('"')) {
    value = value.replaceAll('"', '""')
  }

  if (value.includes(',') || value.includes('\n') || value.includes('\r') || value.includes('"')) {
    return `"${value}"`
  }

  return value
}

export const toCsvString = (rows: Array<Record<string, unknown>>) => {
  if (rows.length === 0) return ''

  const headers = Array.from(
    rows.reduce((acc, row) => {
      Object.keys(row).forEach((key) => acc.add(key))
      return acc
    }, new Set<string>()),
  )

  const headerLine = headers.map(escapeCsvCell).join(',')
  const dataLines = rows.map((row) =>
    headers
      .map((header) => escapeCsvCell(normalizeCellValue(row[header])))
      .join(','),
  )

  return [headerLine, ...dataLines].join('\n')
}

export const downloadCsv = (filename: string, rows: Array<Record<string, unknown>>) => {
  const csv = toCsvString(rows)
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)

  link.href = url
  link.download = filename
  link.style.display = 'none'

  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}


