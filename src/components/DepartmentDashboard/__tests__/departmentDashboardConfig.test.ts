import { describe, it, expect } from 'vitest'
import {
  isRescueDepartment,
  isNebruDepartment,
  getDepartmentDashboardNavItems,
  SHARED_DEPARTMENT_NAV_ITEMS,
} from '../departmentDashboardConfig'

describe('isRescueDepartment', () => {
  it('returns true for exact match', () => {
    expect(isRescueDepartment('Rescue Department')).toBe(true)
  })

  it('is case-insensitive', () => {
    expect(isRescueDepartment('rescue department')).toBe(true)
    expect(isRescueDepartment('RESCUE DEPARTMENT')).toBe(true)
  })

  it('trims whitespace', () => {
    expect(isRescueDepartment('  Rescue Department  ')).toBe(true)
  })

  it('returns false for other departments', () => {
    expect(isRescueDepartment('Fire Department')).toBe(false)
    expect(isRescueDepartment('Rescue')).toBe(false)
    expect(isRescueDepartment('')).toBe(false)
  })
})

describe('isNebruDepartment', () => {
  it('returns true for "NEBRU"', () => {
    expect(isNebruDepartment('NEBRU')).toBe(true)
  })

  it('is case-insensitive', () => {
    expect(isNebruDepartment('nebru')).toBe(true)
    expect(isNebruDepartment('Nebru')).toBe(true)
  })

  it('trims whitespace', () => {
    expect(isNebruDepartment('  NEBRU  ')).toBe(true)
  })

  it('returns false for other codes', () => {
    expect(isNebruDepartment('FIRE')).toBe(false)
    expect(isNebruDepartment('')).toBe(false)
  })
})

describe('getDepartmentDashboardNavItems', () => {
  it('returns shared items for non-NEBRU departments', () => {
    const items = getDepartmentDashboardNavItems('Fire Department', 'FIRE')
    expect(items).toEqual(SHARED_DEPARTMENT_NAV_ITEMS)
  })

  it('does not mutate the shared items array', () => {
    const before = [...SHARED_DEPARTMENT_NAV_ITEMS]
    getDepartmentDashboardNavItems('NEBRU Department', 'NEBRU')
    expect(SHARED_DEPARTMENT_NAV_ITEMS).toEqual(before)
  })

  it('includes shift-turnover for NEBRU department', () => {
    const items = getDepartmentDashboardNavItems('NEBRU Department', 'NEBRU')
    const keys = items.map((i) => i.key)
    expect(keys).toContain('shift-turnover')
  })

  it('places shift-turnover before the last item (profile)', () => {
    const items = getDepartmentDashboardNavItems('NEBRU Department', 'NEBRU')
    const keys = items.map((i) => i.key)
    const shiftIndex = keys.indexOf('shift-turnover')
    const profileIndex = keys.indexOf('profile')
    expect(shiftIndex).toBe(profileIndex - 1)
  })

  it('has exactly one more item than shared for NEBRU', () => {
    const items = getDepartmentDashboardNavItems('NEBRU Department', 'NEBRU')
    expect(items.length).toBe(SHARED_DEPARTMENT_NAV_ITEMS.length + 1)
  })

  it('handles empty department code', () => {
    const items = getDepartmentDashboardNavItems('Some Dept')
    expect(items).toEqual(SHARED_DEPARTMENT_NAV_ITEMS)
  })

  it('is case-insensitive for NEBRU code', () => {
    const items = getDepartmentDashboardNavItems('Nebru', 'nebru')
    const keys = items.map((i) => i.key)
    expect(keys).toContain('shift-turnover')
  })
})
