export const getItemIdPrefix = (itemType: string | null | undefined): string => {
  if (!itemType) return 'ITEM'
  const type = itemType.trim()
  const typeMap: Record<string, string> = {
    'ICT Equipment': 'ICT',
    'Office Supplies/Equipment': 'OFC',
    'Disaster/Emergency Equipment': 'EMG',
    'Maintenance Tools': 'MNT',
    'Electrical Items': 'ELE',
    'Furniture/Fixtures': 'FUR',
    'Cleaning Materials': 'CLN',
    'Tools & Light Equipment': 'TLE',
    'Equipment': 'EQP',
    'Mechanical Equipment': 'MEQ',
    'Transportation Equipment': 'TE',
    'Vehicle': 'VEH',
    'Stockpile': 'STOCK'
  }
  return typeMap[type] || 'ITEM'
}

export const formatItemId = (itemId: number | null | undefined, itemType?: string | null): string => {
  if (itemId == null) return '—'
  const prefix = getItemIdPrefix(itemType)
  return `${prefix}-${itemId.toString().padStart(3, '0')}`
}
