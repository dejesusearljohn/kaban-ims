import { describe, it, expect } from 'vitest'
import { toCsvString, parseCsvText } from '../csv'

describe('toCsvString', () => {
  it('returns empty string for empty array', () => {
    expect(toCsvString([])).toBe('')
  })

  it('converts a single row', () => {
    const rows = [{ name: 'Alice', age: 30 }]
    expect(toCsvString(rows)).toBe('name,age\nAlice,30')
  })

  it('converts multiple rows', () => {
    const rows = [
      { name: 'Alice', age: 30 },
      { name: 'Bob', age: 25 },
    ]
    expect(toCsvString(rows)).toBe('name,age\nAlice,30\nBob,25')
  })

  it('escapes commas by wrapping in quotes', () => {
    const rows = [{ note: 'hello, world' }]
    expect(toCsvString(rows)).toBe('note\n"hello, world"')
  })

  it('escapes double quotes by doubling them', () => {
    const rows = [{ note: 'say "hi"' }]
    expect(toCsvString(rows)).toBe('note\n"say ""hi"""')
  })

  it('escapes newlines by wrapping in quotes', () => {
    const rows = [{ note: 'line1\nline2' }]
    expect(toCsvString(rows)).toBe('note\n"line1\nline2"')
  })

  it('handles null and undefined values as empty strings', () => {
    const rows = [{ a: null, b: undefined }]
    expect(toCsvString(rows)).toBe('a,b\n,')
  })

  it('handles boolean values', () => {
    const rows = [{ active: true, deleted: false }]
    expect(toCsvString(rows)).toBe('active,deleted\ntrue,false')
  })

  it('handles object values via JSON.stringify', () => {
    const rows = [{ data: { x: 1 } }]
    const result = toCsvString(rows)
    // JSON is serialized then CSV-escaped (quotes doubled, wrapped)
    expect(result).toBe('data\n"{""x"":1}"')
  })

  it('unions headers across rows with differing keys', () => {
    const rows = [{ a: 1 }, { b: 2 }]
    const result = toCsvString(rows)
    const lines = result.split('\n')
    expect(lines[0]).toBe('a,b')
    expect(lines[1]).toBe('1,')
    expect(lines[2]).toBe(',2')
  })
})

describe('parseCsvText', () => {
  it('returns empty array for empty string', () => {
    expect(parseCsvText('')).toEqual([])
  })

  it('returns empty array for whitespace-only input', () => {
    expect(parseCsvText('   \n  \n  ')).toEqual([])
  })

  it('returns empty array for header-only CSV', () => {
    expect(parseCsvText('name,age')).toEqual([])
  })

  it('parses a simple CSV', () => {
    const csv = 'name,age\nAlice,30\nBob,25'
    expect(parseCsvText(csv)).toEqual([
      { name: 'Alice', age: '30' },
      { name: 'Bob', age: '25' },
    ])
  })

  it('handles quoted fields with commas', () => {
    const csv = 'note\n"hello, world"'
    expect(parseCsvText(csv)).toEqual([{ note: 'hello, world' }])
  })

  it('handles escaped double quotes', () => {
    const csv = 'note\n"say ""hi"""'
    expect(parseCsvText(csv)).toEqual([{ note: 'say "hi"' }])
  })

  it('handles Windows-style line endings (CRLF)', () => {
    const csv = 'name,age\r\nAlice,30\r\nBob,25'
    expect(parseCsvText(csv)).toEqual([
      { name: 'Alice', age: '30' },
      { name: 'Bob', age: '25' },
    ])
  })

  it('fills missing values with empty string', () => {
    const csv = 'a,b,c\n1'
    const result = parseCsvText(csv)
    expect(result).toEqual([{ a: '1', b: '', c: '' }])
  })

  it('trims header and cell whitespace', () => {
    const csv = ' name , age \n Alice , 30 '
    const result = parseCsvText(csv)
    expect(result).toEqual([{ name: 'Alice', age: '30' }])
  })
})

describe('toCsvString → parseCsvText roundtrip', () => {
  it('roundtrips simple data', () => {
    const original = [
      { name: 'Alice', city: 'NYC' },
      { name: 'Bob', city: 'LA' },
    ]
    const csv = toCsvString(original)
    const parsed = parseCsvText(csv)
    expect(parsed).toEqual(original)
  })

  it('roundtrips data with special characters', () => {
    const original = [{ note: 'hello, "world"' }]
    const csv = toCsvString(original)
    const parsed = parseCsvText(csv)
    expect(parsed).toEqual([{ note: 'hello, "world"' }])
  })
})
