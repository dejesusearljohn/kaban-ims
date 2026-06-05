export const getVisiblePageNumbers = (currentPage: number, totalPages: number, maxVisiblePages = 5) => {
  if (totalPages <= maxVisiblePages) {
    return Array.from({ length: totalPages }, (_, index) => index + 1)
  }

  const halfWindow = Math.floor(maxVisiblePages / 2)
  let start = Math.max(1, currentPage - halfWindow)
  const end = Math.min(totalPages, start + maxVisiblePages - 1)

  if (end - start + 1 < maxVisiblePages) {
    start = Math.max(1, end - maxVisiblePages + 1)
  }

  return Array.from({ length: end - start + 1 }, (_, index) => start + index)
}

export const parseFullName = (fullName: string) => {
  const normalizedName = fullName.trim().replace(/\s+/g, ' ')

  if (!normalizedName) {
    return { firstName: '', lastName: '' }
  }

  const nameParts = normalizedName.split(' ')

  if (nameParts.length === 1) {
    return { firstName: nameParts[0], lastName: '' }
  }

  if (nameParts.length === 2) {
    return { firstName: nameParts[0], lastName: nameParts[1] }
  }

  const lowerParts = nameParts.map((part) => part.toLowerCase())
  const twoWordSurnamePrefixes = new Set(['de', 'del', 'dela', 'de la', 'de los', 'de las', 'da', 'dos', 'das'])
  const penultimate = lowerParts[lowerParts.length - 2]
  const antepenultimate = lowerParts[lowerParts.length - 3]

  if (antepenultimate === 'de' && (penultimate === 'la' || penultimate === 'los' || penultimate === 'las')) {
    return {
      firstName: nameParts.slice(0, -3).join(' '),
      lastName: nameParts.slice(-3).join(' '),
    }
  }

  if (twoWordSurnamePrefixes.has(penultimate)) {
    return {
      firstName: nameParts.slice(0, -2).join(' '),
      lastName: nameParts.slice(-2).join(' '),
    }
  }

  return {
    firstName: nameParts.slice(0, -1).join(' '),
    lastName: nameParts.slice(-1).join(' '),
  }
}

export const isLoanableItemType = (itemType: string) => {
  const normalizedType = itemType.trim().toLowerCase()
  const isEquipment = normalizedType.includes('equipment') && normalizedType !== 'office equipment'

  return (
    isEquipment ||
    normalizedType === 'hand tools' ||
    normalizedType === 'power tools' ||
    normalizedType === 'gadgets'
  )
}

export const normalizeStaffRole = (role: string | null | undefined) => {
  const trimmedRole = role?.trim() || 'Staff'
  const normalizedRole = trimmedRole.toLowerCase()

  if (normalizedRole === 'staff') {
    return 'Staff'
  }

  if (normalizedRole === 'admin') {
    return 'Admin'
  }

  if (normalizedRole === 'super admin') {
    return 'Super Admin'
  }

  return trimmedRole
}

export const mapStaffRoleToOption = (role: string | null | undefined) => {
  const normalizedRole = normalizeStaffRole(role)
  if (normalizedRole === 'Super Admin') return 'Super Admin'
  if (normalizedRole === 'Admin') return 'Admin'
  return 'Staff'
}

export const buildStaffEmail = (staffId: string) => {
  const normalizedStaffId = staffId.trim().toLowerCase().replace(/\s+/g, '')
  return normalizedStaffId ? `${normalizedStaffId}@kaban.com` : ''
}

export const buildStaffQrCode = (staffId: string) => {
  const normalizedStaffId = staffId.trim().toLowerCase().replace(/\s+/g, '')
  return normalizedStaffId ? `staff-${normalizedStaffId}` : ''
}
