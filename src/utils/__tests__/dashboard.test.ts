import { describe, it, expect } from 'vitest'
import {
  getVisiblePageNumbers,
  parseFullName,
  isLoanableItemType,
  normalizeStaffRole,
  mapStaffRoleToOption,
  buildStaffEmail,
  buildStaffQrCode,
} from '../dashboard'

describe('getVisiblePageNumbers', () => {
  it('returns all pages when totalPages <= maxVisiblePages', () => {
    expect(getVisiblePageNumbers(1, 3)).toEqual([1, 2, 3])
  })

  it('returns all pages when totalPages equals maxVisiblePages', () => {
    expect(getVisiblePageNumbers(3, 5)).toEqual([1, 2, 3, 4, 5])
  })

  it('returns empty array when totalPages is 0', () => {
    expect(getVisiblePageNumbers(1, 0)).toEqual([])
  })

  it('returns single page', () => {
    expect(getVisiblePageNumbers(1, 1)).toEqual([1])
  })

  it('centers the window around current page', () => {
    expect(getVisiblePageNumbers(5, 10)).toEqual([3, 4, 5, 6, 7])
  })

  it('clamps to the start when current page is near the beginning', () => {
    expect(getVisiblePageNumbers(1, 10)).toEqual([1, 2, 3, 4, 5])
  })

  it('clamps to the end when current page is near the end', () => {
    expect(getVisiblePageNumbers(10, 10)).toEqual([6, 7, 8, 9, 10])
  })

  it('respects custom maxVisiblePages', () => {
    expect(getVisiblePageNumbers(5, 10, 3)).toEqual([4, 5, 6])
  })

  it('handles current page at second position', () => {
    expect(getVisiblePageNumbers(2, 10)).toEqual([1, 2, 3, 4, 5])
  })

  it('handles current page near end', () => {
    expect(getVisiblePageNumbers(9, 10)).toEqual([6, 7, 8, 9, 10])
  })
})

describe('parseFullName', () => {
  it('returns empty first and last name for empty string', () => {
    expect(parseFullName('')).toEqual({ firstName: '', lastName: '' })
  })

  it('returns empty first and last name for whitespace-only', () => {
    expect(parseFullName('   ')).toEqual({ firstName: '', lastName: '' })
  })

  it('treats single word as first name with empty last name', () => {
    expect(parseFullName('Alice')).toEqual({ firstName: 'Alice', lastName: '' })
  })

  it('splits two words into first and last name', () => {
    expect(parseFullName('John Smith')).toEqual({ firstName: 'John', lastName: 'Smith' })
  })

  it('handles three words (first + middle as first, last as last)', () => {
    expect(parseFullName('John Michael Smith')).toEqual({
      firstName: 'John Michael',
      lastName: 'Smith',
    })
  })

  it('recognizes "de" two-word surname prefix', () => {
    expect(parseFullName('Juan de Leon')).toEqual({
      firstName: 'Juan',
      lastName: 'de Leon',
    })
  })

  it('recognizes "del" two-word surname prefix', () => {
    expect(parseFullName('Maria del Rosario')).toEqual({
      firstName: 'Maria',
      lastName: 'del Rosario',
    })
  })

  it('recognizes "dela" two-word surname prefix', () => {
    expect(parseFullName('Ana dela Cruz')).toEqual({
      firstName: 'Ana',
      lastName: 'dela Cruz',
    })
  })

  it('recognizes "de la" three-word surname prefix', () => {
    expect(parseFullName('Maria Jose de la Cruz')).toEqual({
      firstName: 'Maria Jose',
      lastName: 'de la Cruz',
    })
  })

  it('recognizes "de los" three-word surname prefix', () => {
    expect(parseFullName('Juan de los Santos')).toEqual({
      firstName: 'Juan',
      lastName: 'de los Santos',
    })
  })

  it('normalizes extra whitespace', () => {
    expect(parseFullName('  John   Smith  ')).toEqual({
      firstName: 'John',
      lastName: 'Smith',
    })
  })
})

describe('isLoanableItemType', () => {
  it('returns true for equipment types (except Office Equipment)', () => {
    expect(isLoanableItemType('Fire Equipment')).toBe(true)
    expect(isLoanableItemType('Water Equipment')).toBe(true)
    expect(isLoanableItemType('Medical Equipment')).toBe(true)
    expect(isLoanableItemType('Electrical Equipment')).toBe(true)
  })

  it('returns false for Office Equipment', () => {
    expect(isLoanableItemType('Office Equipment')).toBe(false)
  })

  it('returns true for Hand Tools', () => {
    expect(isLoanableItemType('Hand Tools')).toBe(true)
  })

  it('returns true for Power Tools', () => {
    expect(isLoanableItemType('Power Tools')).toBe(true)
  })

  it('returns true for Gadgets', () => {
    expect(isLoanableItemType('Gadgets')).toBe(true)
  })

  it('returns false for non-loanable types', () => {
    expect(isLoanableItemType('Furniture')).toBe(false)
    expect(isLoanableItemType('Vehicle')).toBe(false)
    expect(isLoanableItemType('Stockpile')).toBe(false)
    expect(isLoanableItemType('Medicine')).toBe(false)
    expect(isLoanableItemType('Perishables')).toBe(false)
  })

  it('is case-insensitive', () => {
    expect(isLoanableItemType('fire equipment')).toBe(true)
    expect(isLoanableItemType('HAND TOOLS')).toBe(true)
    expect(isLoanableItemType('gadgets')).toBe(true)
  })

  it('trims whitespace', () => {
    expect(isLoanableItemType('  Fire Equipment  ')).toBe(true)
  })
})

describe('normalizeStaffRole', () => {
  it('returns "Staff" for null', () => {
    expect(normalizeStaffRole(null)).toBe('Staff')
  })

  it('returns "Staff" for undefined', () => {
    expect(normalizeStaffRole(undefined)).toBe('Staff')
  })

  it('returns "Staff" for empty string', () => {
    expect(normalizeStaffRole('')).toBe('Staff')
  })

  it('normalizes "staff" to "Staff"', () => {
    expect(normalizeStaffRole('staff')).toBe('Staff')
  })

  it('normalizes "STAFF" to "Staff"', () => {
    expect(normalizeStaffRole('STAFF')).toBe('Staff')
  })

  it('normalizes "admin" to "Admin"', () => {
    expect(normalizeStaffRole('admin')).toBe('Admin')
  })

  it('normalizes "super admin" to "Super Admin"', () => {
    expect(normalizeStaffRole('super admin')).toBe('Super Admin')
  })

  it('returns trimmed value for unknown roles', () => {
    expect(normalizeStaffRole('Manager')).toBe('Manager')
  })

  it('trims whitespace', () => {
    expect(normalizeStaffRole('  Admin  ')).toBe('Admin')
  })
})

describe('mapStaffRoleToOption', () => {
  it('maps Super Admin role', () => {
    expect(mapStaffRoleToOption('super admin')).toBe('Super Admin')
  })

  it('maps Admin role', () => {
    expect(mapStaffRoleToOption('admin')).toBe('Admin')
  })

  it('maps Staff role', () => {
    expect(mapStaffRoleToOption('staff')).toBe('Staff')
  })

  it('defaults null to Staff', () => {
    expect(mapStaffRoleToOption(null)).toBe('Staff')
  })

  it('defaults unknown role to Staff', () => {
    expect(mapStaffRoleToOption('Manager')).toBe('Staff')
  })
})

describe('buildStaffEmail', () => {
  it('builds email from staff ID', () => {
    expect(buildStaffEmail('ABC123')).toBe('abc123@kaban.com')
  })

  it('returns empty string for empty input', () => {
    expect(buildStaffEmail('')).toBe('')
  })

  it('returns empty string for whitespace-only input', () => {
    expect(buildStaffEmail('   ')).toBe('')
  })

  it('lowercases and removes spaces', () => {
    expect(buildStaffEmail('  ABC 123  ')).toBe('abc123@kaban.com')
  })
})

describe('buildStaffQrCode', () => {
  it('builds QR code string from staff ID', () => {
    expect(buildStaffQrCode('ABC123')).toBe('staff-abc123')
  })

  it('returns empty string for empty input', () => {
    expect(buildStaffQrCode('')).toBe('')
  })

  it('returns empty string for whitespace-only input', () => {
    expect(buildStaffQrCode('   ')).toBe('')
  })

  it('lowercases and removes spaces', () => {
    expect(buildStaffQrCode('  ABC 123  ')).toBe('staff-abc123')
  })
})
