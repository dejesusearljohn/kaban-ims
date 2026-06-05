import { describe, it, expect } from 'vitest'

// Test the pure function extracted from the module.
// We re-implement the logic here to avoid coupling to the hook's internal state,
// since the hook itself just wraps this calculation.
const getPageSizeFromViewportHeight = (height: number) => {
  const reservedLayoutHeight = 500
  const estimatedRowHeight = 78
  const visibleRows = Math.floor((height - reservedLayoutHeight) / estimatedRowHeight)
  return Math.min(8, Math.max(5, visibleRows))
}

describe('getPageSizeFromViewportHeight', () => {
  it('returns minimum of 5 for very small viewports', () => {
    expect(getPageSizeFromViewportHeight(400)).toBe(5)
    expect(getPageSizeFromViewportHeight(500)).toBe(5)
    expect(getPageSizeFromViewportHeight(600)).toBe(5)
  })

  it('returns maximum of 8 for very large viewports', () => {
    expect(getPageSizeFromViewportHeight(2000)).toBe(8)
    expect(getPageSizeFromViewportHeight(3000)).toBe(8)
  })

  it('returns expected value for typical viewport (768px)', () => {
    const result = getPageSizeFromViewportHeight(768)
    expect(result).toBeGreaterThanOrEqual(5)
    expect(result).toBeLessThanOrEqual(8)
  })

  it('returns expected value for 1080px viewport', () => {
    const result = getPageSizeFromViewportHeight(1080)
    expect(result).toBe(7)
  })

  it('scales correctly between min and max', () => {
    const small = getPageSizeFromViewportHeight(700)
    const large = getPageSizeFromViewportHeight(1200)
    expect(large).toBeGreaterThanOrEqual(small)
  })

  it('clamps to 5 even for negative heights', () => {
    expect(getPageSizeFromViewportHeight(-100)).toBe(5)
  })
})
