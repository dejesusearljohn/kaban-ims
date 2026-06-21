export type InventoryKind = 'stockpile' | 'par' | 'office_supplies'

export type InventoryKindFilter = InventoryKind | 'all'

export const PAR_CATEGORY_OPTIONS = [
  'ICT Equipment',
  'Office Supplies/Equipment',
  'Disaster/Emergency Equipment',
  'Maintenance Tools',
  'Electrical Items',
  'Furniture/Fixtures',
  'Equipment',
  'Cleaning Materials',
  'Tools & Light Equipment',
  'Mechanical Equipment',
  'Transportation Equipment',
  'Personal Protective Equipment/Uniform',
] as const

export const PAR_CATEGORY_CODE_MAP: Record<string, string> = {
    'ICT Equipment': 'ICT',
    'Office Supplies/Equipment': 'OFC',
    'Disaster/Emergency Equipment': 'EMG',
    'Maintenance Tools': 'MNT',
    'Electrical Items': 'ELE',
    'Furniture/Fixtures': 'FUR',
  Equipment: 'FFE',
    'Cleaning Materials': 'CLN',
    'Tools & Light Equipment': 'TLE',
    'Mechanical Equipment': 'MEQ',
    'Transportation Equipment': 'TE',
  'Personal Protective Equipment/Uniform': 'PPE',
}

export const STOCKPILE_CATEGORY_OPTIONS = [
  'Rice',
  'Canned Goods',
  'Noodles',
  'Hygiene',
  'Powdered Drinks',
  'Bottled Water',
  'Medicine',
] as const

export const OFFICE_SUPPLY_CATEGORY_OPTIONS = [
  'Ballpen',
  'Paper',
  'Bond Paper',
  'Folder',
  'Envelope',
  'Stapler',
  'Tape',
  'Marker',
  'Clipboard',
  'Ink',
  'Toner',
  'Other',
] as const

export type OfficeSupplyCategory = (typeof OFFICE_SUPPLY_CATEGORY_OPTIONS)[number]
export type StockpileCategory = (typeof STOCKPILE_CATEGORY_OPTIONS)[number]
export type ParCategory = (typeof PAR_CATEGORY_OPTIONS)[number]

type CategoryKeywordRule<T extends string> = {
  category: T
  keywords: RegExp[]
}

const OFFICE_SUPPLY_CATEGORY_KEYWORDS: CategoryKeywordRule<OfficeSupplyCategory>[] = [
  {
    category: 'Toner',
    keywords: [
      /\btoner\b/i,
      /\blaser\s*cartridge\b/i,
      /\bdrum\s*unit\b/i,
      /\b(brother|canon|hp|samsung|xerox|epson)\s*(tn|cf|mlt|w|ce|cb|crg|cart)/i,
      /\b(tn-|cf-|mlt-|ce\d|cb\d)/i,
    ],
  },
  {
    category: 'Ink',
    keywords: [
      /\bink\s*(cartridge|bottle|tank|refill)?\b/i,
      /\bstamp\s*pad\b/i,
      /\bstamping\s*ink\b/i,
      /\b(pilot|pentel|tombow)\s*ink\b/i,
      /\b(epson|canon|brother|hp)\s*(gi-|pg-|bt-|gt-|ink)/i,
      /\b(003|664|774|811|812|813|814|815)\s*ink\b/i,
      /\b(black|cyan|magenta|yellow|light\s*cyan|light\s*magenta|photo\s*black|grey|gray|red|blue|green)\s*(ink|cartridge|tank|bottle)\b/i,
      /\b(ink|cartridge|tank|bottle)\s*(black|cyan|magenta|yellow|light\s*cyan|light\s*magenta|photo\s*black|grey|gray|red|blue|green)\b/i,
      /\btri[- ]?color\s*(ink|cartridge)?\b/i,
      /\bcolor\s*(ink\s*)?cartridge\b/i,
      /\bcmyk\b/i,
      /\b(bk|pbk|pk|lc|lm|gy)\s*(ink|cartridge|tank|bottle)\b/i,
      /\b(ink|cartridge|tank|bottle)\s*(bk|pbk|pk|lc|lm|gy)\b/i,
      /\b(epson|canon|brother|hp|samsung)\b.*\b(black|cyan|magenta|yellow|light\s*cyan|light\s*magenta|photo\s*black|tri[- ]?color|bk|pbk|c|m|y)\b/i,
      /\b(003|664|774|811|812|813|814|815|gi-|pg-|bt-|gt-|cl-|cli-).*\b(black|cyan|magenta|yellow|light\s*cyan|light\s*magenta|photo\s*black|bk|pbk|c|m|y)\b/i,
      /\b(black|cyan|magenta|yellow|light\s*cyan|light\s*magenta|photo\s*black)\s*-\s*(ink|cartridge|tank)\b/i,
    ],
  },
  {
    category: 'Bond Paper',
    keywords: [
      /\bbond\s*paper\b/i,
      /\bcopy\s*paper\b/i,
      /\bmultipurpose\s*paper\b/i,
      /\ba4\s*paper\b/i,
      /\bshort\s*bond\b/i,
      /\blong\s*bond\b/i,
      /\bhardcopy\b/i,
      /\bik\s*\+?\b/i,
      /\bipm\b/i,
      /\bgenica\b/i,
      /\btree\s*friendly\b/i,
      /\bbiotop\b/i,
      /\bsintra\b/i,
      /\bpremiere\s*(paper|bond)?\b/i,
      /\b(canon|epson)\s*(paper|copy)\b/i,
    ],
  },
  {
    category: 'Ballpen',
    keywords: [
      /\bball\s*pen\b/i,
      /\bballpen\b/i,
      /\bgel\s*pen\b/i,
      /\bsign\s*pen\b/i,
      /\bfountain\s*pen\b/i,
      /\broller\s*pen\b/i,
      /\bpencil\b/i,
      /\bmechanical\s*pencil\b/i,
      /\b(pilot|panda|faber[- ]?castell|staedtler|stabilo|pentel|uni[- ]?ball|zebra|bic|dong[- ]?a|paper\s*mate|schneider|trivium|snowman)\b/i,
      /\b(g-tec|hi-tecpoint|v5|v7|energel|sarasa|grip|click|frixion|crystal)\b/i,
    ],
  },
  {
    category: 'Marker',
    keywords: [
      /\bmarker\b/i,
      /\bwhiteboard\s*marker\b/i,
      /\bboard\s*marker\b/i,
      /\bdry\s*erase\b/i,
      /\bpermanent\s*marker\b/i,
      /\bhighlighter\b/i,
      /\btextliner\b/i,
      /\b(sharpie|snowman|pilot\s*super\s*color|pentel\s*permanent)\b/i,
    ],
  },
  {
    category: 'Stapler',
    keywords: [
      /\bstapler\b/i,
      /\bstaple\s*remover\b/i,
      /\bstaple\s*wire\b/i,
      /\b(kangaro|swingline|rapid|max)\s*(stapler|hd)?\b/i,
    ],
  },
  {
    category: 'Tape',
    keywords: [
      /\b(scotch|magic)\s*tape\b/i,
      /\bmasking\s*tape\b/i,
      /\bpackaging\s*tape\b/i,
      /\bpacking\s*tape\b/i,
      /\bdouble[- ]sided\s*tape\b/i,
      /\btransparent\s*tape\b/i,
      /\bcellophane\s*tape\b/i,
      /\bbrown\s*tape\b/i,
      /\bduct\s*tape\b/i,
      /\b3m\s*tape\b/i,
      /\badhesive\s*tape\b/i,
    ],
  },
  {
    category: 'Folder',
    keywords: [
      /\bfolder\b/i,
      /\bclearbook\b/i,
      /\bclear\s*book\b/i,
      /\bl[- ]?folder\b/i,
      /\bring\s*binder\b/i,
      /\bbinder\b/i,
      /\bdocument\s*wallet\b/i,
      /\bplastic\s*cover\b/i,
      /\b(maped|deli|avery)\b/i,
      /\bexpandable\s*folder\b/i,
      /\borganizer\s*folder\b/i,
    ],
  },
  {
    category: 'Envelope',
    keywords: [
      /\benvelope\b/i,
      /\bbrown\s*envelope\b/i,
      /\bdocumentary\s*envelope\b/i,
      /\bwindow\s*envelope\b/i,
      /\bexpanding\s*envelope\b/i,
      /\bclasp\s*envelope\b/i,
    ],
  },
  {
    category: 'Clipboard',
    keywords: [/\bclipboard\b/i, /\bclip\s*board\b/i],
  },
  {
    category: 'Paper',
    keywords: [
      /\byellow\s*pad\b/i,
      /\byellowpad\b/i,
      /\bpad\s*paper\b/i,
      /\bnote\s*pad\b/i,
      /\bmemo\s*pad\b/i,
      /\bsketch\s*pad\b/i,
      /\bgraphing\s*pad\b/i,
      /\bkodigo\b/i,
      /\bcrosswise\s*pad\b/i,
      /\bintermediate\s*pad\b/i,
      /\bwriting\s*pad\b/i,
      /\bnotebook\b/i,
      /\bcomposition\s*notebook\b/i,
      /\bspiral\s*notebook\b/i,
    ],
  },
]

const STOCKPILE_CATEGORY_KEYWORDS: CategoryKeywordRule<StockpileCategory>[] = [
  { category: 'Medicine', 
    keywords: [
      /\bmedicine\b/i, 
      /\bdoxycline\b/i, 
      /\bparacetamol\b/i, 
      /\bbiogesic\b/i, 
      /\bbioflu\b/i, 
      /\bfirst\s*aid\s*kit\b/i, 
      /\bvitamin\b/i, 
      /\bantibiotic\b/i
    ] },
  { category: 'Canned Goods', keywords: [/\bcanned\b/i, /\bsardines\b/i, /\bcorned\s*beef\b/i, /\btuna\b/i, /\bluncheon\s*meat\b/i] },
  { category: 'Noodles', keywords: [/\bnoodles?\b/i, /\binstant\s*noodles?\b/i, /\blucky\s*me\b/i, /\bnissin\b/i, /\bindomie\b/i] },
  {
    category: 'Hygiene',
    keywords: [
      /\bhygiene\b/i,
      /\bhygiene\s*kit\b/i,
      /\bsanitary\s*kit\b/i,
      /\btoiletries\b/i,
      /\bsoap\b/i,
      /\balcohol\b/i,
      /\bshampoo\b/i,
      /\btoothpaste\b/i,
      /\bsanitizer\b/i,
      /\bdiaper\b/i,
    ],
  },
  {
    category: 'Powdered Drinks',
    keywords: [
      /\bpowdered\s*drink\b/i,
      /\bjuice\s*powder\b/i,
      /\bmilo\b/i,
      /\bovaltine\b/i,
      /\bnestea\b/i,
      /\btang\b/i,
      /\b3\s*in\s*1\s*coffee\b/i,
      /\bcoffee\s*3\s*in\s*1\b/i,
      /\bcoffee\b/i,
      /\binstant\s*coffee\b/i,
      /\binstant\s*drink\b/i,
      /\bnescafe\s*3\s*in\s*1\b/i,
      /\bkopiko\s*blanca\b/i,
      /\bkopiko\s*black\b/i,
      /\bkopiko\s*brown\b/i,
    ],
  },
  { category: 'Bottled Water', keywords: [/\bbottled\s*water\b/i, /\bmineral\s*water\b/i, /\bwilkins\b/i] },
  { category: 'Rice', keywords: [/\brice\b/i, /\bsack\s*of\s*rice\b/i, /\bnfa\s*rice\b/i] },
]

const PAR_CATEGORY_KEYWORDS: CategoryKeywordRule<ParCategory>[] = [
  {
    category: 'ICT Equipment',
    keywords: [
      /\b(computer|desktop|laptop|monitor|printer|scanner|keyboard|mouse|router|modem|switch|tablet|projector|webcam|camera|cctv|ups)\b/i,
    ],
  },
  {
    category: 'Disaster/Emergency Equipment',
    keywords: [
      /\b(first aid|stretcher|fire extinguisher|megaphone|siren|rescue|life vest|life jacket|emergency|disaster|flashlight|radio|helmet|raincoat|go bag)\b/i,
    ],
  },
  {
    category: 'Maintenance Tools',
    keywords: [
      /\b(hammer|screwdriver|wrench|pliers|drill|saw|shovel|rake|trowel|toolbox|paint brush|roller|spade|crowbar)\b/i,
    ],
  },
  {
    category: 'Electrical Items',
    keywords: [
      /\b(wire|cable|extension cord|bulb|lamp|switch|outlet|breaker|socket|battery|charger|electrical|led|fuse)\b/i,
    ],
  },
  {
    category: 'Furniture/Fixtures',
    keywords: [
      /\b(chair|table|desk|cabinet|shelf|rack|drawer|bench|sofa|fixture|partition|locker)\b/i,
    ],
  },
  {
    category: 'Cleaning Materials',
    keywords: [
      /\b(mop|broom|dustpan|detergent|soap|disinfectant|alcohol|bleach|cleaner|trash bag|garbage bag|sponge|rag|tissue)\b/i,
    ],
  },
  {
    category: 'Tools & Light Equipment',
    keywords: [
      /\b(ladder|wheelbarrow|grass cutter|blower|sprayer|hose|nozzle|light equipment|portable tool|pressure washer)\b/i,
    ],
  },
  {
    category: 'Mechanical Equipment',
    keywords: [
      /\b(engine|pump|compressor|generator|motor|chainsaw|mechanical|water pump)\b/i,
    ],
  },
  {
    category: 'Transportation Equipment',
    keywords: [
      /\b(vehicle|motorcycle|tricycle|bicycle|bike|truck|van|ambulance|boat|car|tire|wheel|transport)\b/i,
    ],
  },
  {
    category: 'Personal Protective Equipment/Uniform',
    keywords: [
      /\b(ppe|hard hat|safety vest|reflective vest|uniform|coverall|rain boots|safety shoes|face shield|goggles)\b/i,
    ],
  },
  {
    category: 'Equipment',
    keywords: [
      /\b(aircon|air condition|air conditioner|refrigerator|freezer|fan|blower|equipment)\b/i,
      /\b(fire extinguisher|extinguisher)\b/i,
    ],
  },
  {
    category: 'Office Supplies/Equipment',
    keywords: [
      /\b(calculator|puncher|paper trimmer|laminator|shredder|whiteboard|bulletin board)\b/i,
    ],
  },
]

const matchCategoryFromName = <T extends string>(
  itemName: string,
  rules: CategoryKeywordRule<T>[],
): T | '' => {
  const normalizedName = itemName.trim()
  if (!normalizedName) return ''

  const match = rules.find((entry) => entry.keywords.some((keyword) => keyword.test(normalizedName)))
  return match?.category ?? ''
}

export const inferOfficeSupplyCategoryFromName = (itemName: string): OfficeSupplyCategory | '' =>
  matchCategoryFromName(itemName, OFFICE_SUPPLY_CATEGORY_KEYWORDS)

export const inferStockpileCategoryFromName = (itemName: string): StockpileCategory | '' =>
  matchCategoryFromName(itemName, STOCKPILE_CATEGORY_KEYWORDS)

export const inferParCategoryFromName = (itemName: string): ParCategory | '' =>
  matchCategoryFromName(itemName, PAR_CATEGORY_KEYWORDS)

export const inferCategoryFromItemName = (
  itemName: string,
  inventoryKind: InventoryKind,
): string => {
  if (inventoryKind === 'office_supplies') return inferOfficeSupplyCategoryFromName(itemName)
  if (inventoryKind === 'stockpile') return inferStockpileCategoryFromName(itemName)
  if (inventoryKind === 'par') return inferParCategoryFromName(itemName)
  return ''
}

export const getItemIdPrefix = (
  itemType: string | null | undefined,
  inventoryKind?: InventoryKind | string | null,
): string => {
  if (inventoryKind === 'stockpile' || itemType?.trim().toLowerCase() === 'stockpile') return 'STOCK'
  if (inventoryKind === 'office_supplies' || itemType?.trim().toLowerCase() === 'office supplies') return 'SUP'

  if (!itemType) return 'ITEM'
  const type = itemType.trim()
  const typeMap: Record<string, string> = {
    ...PAR_CATEGORY_CODE_MAP,
    Vehicle: 'VEH',
    Stockpile: 'STOCK',
    'Office Supplies': 'SUP',
  }
  return typeMap[type] || 'ITEM'
}

export const formatItemId = (
  displayNo: number | null | undefined,
  itemType?: string | null,
  inventoryKind?: InventoryKind | string | null,
  propertyNo?: string | null,
): string => {
  if (propertyNo?.trim()) return propertyNo.trim()
  if (displayNo == null) return '—'
  const prefix = getItemIdPrefix(itemType, inventoryKind)
  return `${prefix}-${displayNo.toString().padStart(3, '0')}`
}

export const resolveInventoryDisplayNo = (item: {
  kind_item_no?: number | null
  item_id?: number | null
}): number | null => item.kind_item_no ?? item.item_id ?? null

export const formatInventoryItemId = (item: {
  kind_item_no?: number | null
  item_id: number
  item_type: string
  inventory_kind?: string | null
  property_no?: string | null
  unit_of_measure?: string | null
}): string => {
  if (item.property_no?.trim()) return item.property_no.trim()

  if (resolveInventoryKind(item) === 'stockpile' && isPackedStockpileItem(item)) {
    const sequenceNo = resolveInventoryDisplayNo(item)
    return sequenceNo != null ? formatReliefGoodsId(sequenceNo) : '—'
  }

  return formatItemId(
    resolveInventoryDisplayNo(item),
    item.item_type,
    item.inventory_kind,
    item.property_no,
  )
}

export const getMaxKindItemNo = (
  items: Array<{
    kind_item_no?: number | null
    inventory_kind?: string | null
    item_type?: string | null
    unit_of_measure?: string | null
  }>,
  inventoryKind: InventoryKind,
): number =>
  items.reduce((max, item) => {
    if (resolveInventoryKind(item) !== inventoryKind) return max
    if (inventoryKind === 'stockpile' && isPackedStockpileItem(item)) return max
    return Math.max(max, item.kind_item_no ?? 0)
  }, 0)

export const getNextKindItemNo = (
  items: Array<{
    kind_item_no?: number | null
    inventory_kind?: string | null
    item_type?: string | null
    unit_of_measure?: string | null
  }>,
  inventoryKind: InventoryKind,
): number => getMaxKindItemNo(items, inventoryKind) + 1

export const getItemNameCode = (itemName: string): string => {
  const words = itemName
    .trim()
    .split(/\s+/)
    .map((word) => word.replace(/[^a-zA-Z0-9]/g, ''))
    .filter(Boolean)

  if (words.length === 0) return 'UNK'
  if (words.length === 1) return words[0].slice(0, 3).toUpperCase()
  return words
    .slice(0, 3)
    .map((word) => word[0])
    .join('')
    .toUpperCase()
}

export const formatStaffParNumber = (staffId: string): string => {
  const normalized = staffId.trim().toUpperCase()
  return normalized ? `PAR-${normalized}` : ''
}

export const resolveStaffParNumber = (
  user: { par_no?: string | null; staff_id?: string | null } | null | undefined,
): string => {
  if (!user) return ''
  const stored = user.par_no?.trim()
  if (stored) return stored
  return user.staff_id ? formatStaffParNumber(user.staff_id) : ''
}

export const findStaffByParNumber = <
  T extends { id: string; par_no?: string | null; staff_id?: string | null },
>(
  parNo: string,
  staffLists: T[][],
): T | null => {
  const normalizedParNo = parNo.trim()
  if (!normalizedParNo) return null

  for (const staffList of staffLists) {
    const match = staffList.find((user) => resolveStaffParNumber(user) === normalizedParNo)
    if (match) return match
  }

  return null
}

export const generateParPropertyNumber = (
  categoryType: string,
  itemName: string,
  dateAcquired: string,
  existingItems: Array<{ property_no?: string | null }>,
): string => {
  const categoryCode = PAR_CATEGORY_CODE_MAP[categoryType] || 'GEN'
  const nameCode = getItemNameCode(itemName)
  const year = dateAcquired
    ? new Date(dateAcquired).getFullYear()
    : new Date().getFullYear()
  const prefix = `${categoryCode}-${nameCode}-${year}`

  const matchingCount = existingItems.filter((item) => {
    const propertyNo = item.property_no?.trim().toUpperCase()
    return propertyNo?.startsWith(`${prefix}-`) ?? false
  }).length

  return `${prefix}-${(matchingCount + 1).toString().padStart(2, '0')}`
}

export const previewAutoItemId = (
  maxKindItemNo: number,
  inventoryKind: InventoryKind,
): string => {
  const nextId = maxKindItemNo + 1
  if (inventoryKind === 'stockpile') return `STOCK-${nextId.toString().padStart(3, '0')}`
  if (inventoryKind === 'office_supplies') return `SUP-${nextId.toString().padStart(3, '0')}`
  return `ITEM-${nextId.toString().padStart(3, '0')}`
}

export const isParInventoryItem = (item: {
  inventory_kind?: string | null
  item_type?: string | null
}): boolean => {
  if (item.inventory_kind === 'par') return true
  if (item.inventory_kind === 'stockpile' || item.inventory_kind === 'office_supplies') return false

  const normalizedType = (item.item_type ?? '').trim().toLowerCase()
  if (normalizedType === 'stockpile' || normalizedType === 'office supplies') return false

  const parTypes = PAR_CATEGORY_OPTIONS.map((type) => type.toLowerCase())
  return parTypes.includes(normalizedType)
}

export const PAR_DEFAULT_QUANTITY = 1
export const PAR_DEFAULT_UNIT = 'Piece(s)'

export type StockpileListKind = 'individual' | 'packed'

export const isStockpilePackUnit = (unit: string | null | undefined): boolean =>
  (unit ?? '').trim().toLowerCase() === 'pack'

export const isPackedStockpileItem = (item: { unit_of_measure?: string | null }): boolean =>
  isStockpilePackUnit(item.unit_of_measure)

const RELIEF_GOODS_ID_PATTERN = /^RG-(\d+)$/i

export const parseReliefGoodsNumber = (propertyNo: string | null | undefined): number | null => {
  const match = (propertyNo ?? '').trim().match(RELIEF_GOODS_ID_PATTERN)
  if (!match) return null
  const parsed = Number(match[1])
  return Number.isFinite(parsed) ? parsed : null
}

export const formatReliefGoodsId = (sequenceNo: number): string =>
  `RG-${sequenceNo.toString().padStart(2, '0')}`

export const getMaxReliefGoodsNo = (
  items: Array<{ property_no?: string | null; unit_of_measure?: string | null }>,
): number =>
  items.reduce((max, item) => {
    if (!isPackedStockpileItem(item)) return max
    const parsed = parseReliefGoodsNumber(item.property_no)
    return parsed != null ? Math.max(max, parsed) : max
  }, 0)

export const getNextReliefGoodsId = (
  items: Array<{ property_no?: string | null; unit_of_measure?: string | null }>,
): string => formatReliefGoodsId(getMaxReliefGoodsNo(items) + 1)

export const formatStockpileRowId = (item: {
  kind_item_no?: number | null
  stockpile_id?: number | null
  item_id?: number | null
  property_no?: string | null
  unit_of_measure?: string | null
}): string => {
  if (item.property_no?.trim()) return item.property_no.trim()

  const sequenceNo = item.kind_item_no ?? item.stockpile_id ?? item.item_id ?? null
  if (sequenceNo == null) return '—'

  if (isPackedStockpileItem(item)) {
    return formatReliefGoodsId(sequenceNo)
  }

  return formatItemId(sequenceNo, 'Stockpile', 'stockpile')
}

export const INVENTORY_KIND_FILTER_OPTIONS: Array<{ value: InventoryKindFilter; label: string }> = [
  { value: 'all', label: 'All Item Types' },
  { value: 'office_supplies', label: 'Office Supplies' },
  { value: 'stockpile', label: 'Stockpile' },
  { value: 'par', label: 'Property' },
]

export const getCategoryOptionsForInventoryKind = (kind: InventoryKind): readonly string[] => {
  if (kind === 'stockpile') return STOCKPILE_CATEGORY_OPTIONS
  if (kind === 'office_supplies') return OFFICE_SUPPLY_CATEGORY_OPTIONS
  return PAR_CATEGORY_OPTIONS
}

export type ReportInventoryTypeOption = {
  value: string
  label: string
}

export type ReportInventoryTypeOptionGroup = {
  label: string
  options: ReportInventoryTypeOption[]
}

export const buildReportInventoryTypeOptionGroups = (
  additionalTypes: string[] = [],
): ReportInventoryTypeOptionGroup[] => {
  const knownTypeKeys = new Set<string>([
    'stockpile',
    'office supplies',
    ...PAR_CATEGORY_OPTIONS.map((type) => type.toLowerCase()),
  ])

  const otherTypes = Array.from(
    new Map(
      additionalTypes
        .map((type) => type.trim())
        .filter((type) => type.length > 0 && !knownTypeKeys.has(type.toLowerCase()))
        .map((type) => [type.toLowerCase(), type] as const),
    ).values(),
  ).sort((a, b) => a.localeCompare(b))

  return [
    {
      label: 'Item Types',
      options: [
        { value: 'kind:stockpile', label: 'Stockpile' },
        { value: 'kind:office_supplies', label: 'Office Supplies' },
        { value: 'kind:par', label: 'Property (PAR)' },
      ],
    },
    {
      label: 'Property Types',
      options: PAR_CATEGORY_OPTIONS.map((type) => ({
        value: `par-type:${type}`,
        label: type,
      })),
    },
    {
      label: 'Stockpile Categories',
      options: STOCKPILE_CATEGORY_OPTIONS.map((category) => ({
        value: `category:stockpile:${category}`,
        label: category,
      })),
    },
    {
      label: 'Office Supply Categories',
      options: OFFICE_SUPPLY_CATEGORY_OPTIONS.map((category) => ({
        value: `category:office_supplies:${category}`,
        label: category,
      })),
    },
    ...(otherTypes.length > 0
      ? [
          {
            label: 'Other Types',
            options: otherTypes.map((type) => ({
              value: `par-type:${type}`,
              label: type,
            })),
          },
        ]
      : []),
  ]
}

export const getReportInventoryTypeFilterLabel = (
  filterValue: string,
  optionGroups: ReportInventoryTypeOptionGroup[],
): string => {
  if (!filterValue || filterValue === 'all') return 'All Item Types'

  for (const group of optionGroups) {
    const match = group.options.find((option) => option.value === filterValue)
    if (match) return match.label
  }

  return filterValue
}

export const matchesReportInventoryTypeFilter = (
  item: {
    inventory_kind?: string | null
    item_type?: string | null
    item_category?: string | null
  },
  filterValue: string,
): boolean => {
  if (!filterValue || filterValue === 'all') return true

  if (filterValue === 'kind:stockpile') return resolveInventoryKind(item) === 'stockpile'
  if (filterValue === 'kind:office_supplies') return resolveInventoryKind(item) === 'office_supplies'
  if (filterValue === 'kind:par') return resolveInventoryKind(item) === 'par'

  if (filterValue.startsWith('par-type:')) {
    const typeValue = filterValue.slice('par-type:'.length)
    return (item.item_type ?? '').trim().toLowerCase() === typeValue.trim().toLowerCase()
  }

  if (filterValue.startsWith('category:stockpile:')) {
    const category = filterValue.slice('category:stockpile:'.length)
    return (
      resolveInventoryKind(item) === 'stockpile' &&
      getInventoryItemCategoryValue(item).toLowerCase() === category.trim().toLowerCase()
    )
  }

  if (filterValue.startsWith('category:office_supplies:')) {
    const category = filterValue.slice('category:office_supplies:'.length)
    return (
      resolveInventoryKind(item) === 'office_supplies' &&
      getInventoryItemCategoryValue(item).toLowerCase() === category.trim().toLowerCase()
    )
  }

  return (item.item_type ?? '').trim().toLowerCase() === filterValue.trim().toLowerCase()
}

export const resolveInventoryKind = (item: {
  inventory_kind?: string | null
  item_type?: string | null
}): InventoryKind | null => {
  if (item.inventory_kind === 'stockpile' || item.inventory_kind === 'par' || item.inventory_kind === 'office_supplies') {
    return item.inventory_kind
  }

  const normalizedType = (item.item_type ?? '').trim().toLowerCase()
  if (normalizedType === 'stockpile') return 'stockpile'
  if (normalizedType === 'office supplies') return 'office_supplies'
  if (isParInventoryItem(item)) return 'par'
  return null
}

export const isStockpileInventoryItem = (item: {
  inventory_kind?: string | null
  item_type?: string | null
}): boolean => resolveInventoryKind(item) === 'stockpile'

export const getInventoryItemCategoryValue = (item: {
  inventory_kind?: string | null
  item_type?: string | null
  item_category?: string | null
}): string => {
  const kind = resolveInventoryKind(item)
  if (kind === 'par') return (item.item_type ?? '').trim()
  return (item.item_category ?? '').trim()
}

export const getInventoryKindLabel = (item: {
  inventory_kind?: string | null
  item_type?: string | null
}): string => {
  const kind = resolveInventoryKind(item)
  if (kind === 'stockpile') return 'Stockpile'
  if (kind === 'office_supplies') return 'Office Supplies'
  if (kind === 'par') return 'PAR (Property)'
  return item.item_type?.trim() || '—'
}

export const getInventoryTypeColumnDisplay = (item: {
  inventory_kind?: string | null
  item_type?: string | null
  item_category?: string | null
}): string => {
  const kind = resolveInventoryKind(item)
  if (kind === 'stockpile') {
    const category = item.item_category?.trim()
    return category ? `Stockpile · ${category}` : 'Stockpile'
  }
  if (kind === 'office_supplies') {
    const category = item.item_category?.trim()
    return category ? `Office Supplies · ${category}` : 'Office Supplies'
  }
  if (kind === 'par') return item.item_type?.trim() || 'PAR (Property)'
  return item.item_type?.trim() || '—'
}

export const getInventoryQuantityDisplay = (item: {
  inventory_kind?: string | null
  item_type?: string | null
  quantity?: number | null
}): string | number => {
  if (resolveInventoryKind(item) === 'par') return item.quantity ?? PAR_DEFAULT_QUANTITY
  return item.quantity ?? '—'
}

export const OFFICE_SUPPLIES_LOCATION_LABEL = 'PB Office'

export const formatOfficeSuppliesAssignee = (superAdminName: string): string =>
  `Barangay Treasurer (${superAdminName.trim() || 'Super Admin'})`

export const findPbOfficeDepartment = <T extends { id: number; name: string; code?: string }>(
  departments: T[],
): T | null =>
  departments.find((dept) => {
    const name = dept.name.trim().toLowerCase()
    const code = (dept.code ?? '').trim().toLowerCase()
    return name.includes('pb office') || code === 'pb' || name === 'pb'
  }) ?? null

export const getInventoryLocationDisplay = (
  item: {
    inventory_kind?: string | null
    item_type?: string | null
    department_id?: number | null
  },
  departments: Array<{ id: number; name: string; code?: string }>,
): string => {
  if (resolveInventoryKind(item) === 'office_supplies') {
    const dept = item.department_id != null ? departments.find((d) => d.id === item.department_id) : null
    return dept?.code?.trim() || dept?.name?.trim() || OFFICE_SUPPLIES_LOCATION_LABEL
  }

  if (item.department_id == null) return 'Unassigned'
  return departments.find((dept) => dept.id === item.department_id)?.code?.trim() || 'Unassigned'
}

export const getInventoryUnitDisplay = (item: {
  inventory_kind?: string | null
  item_type?: string | null
  unit_of_measure?: string | null
}): string => {
  if (resolveInventoryKind(item) === 'par') return item.unit_of_measure?.trim() || PAR_DEFAULT_UNIT
  return item.unit_of_measure?.trim() || '—'
}

export const normalizeDbText = (value: string | null | undefined): string | null => {
  if (value == null) return null
  const trimmed = value.trim()
  return trimmed ? trimmed.toUpperCase() : null
}

const REPACK_CONTENTS_PREFIX = '__REPACK__:'

const INVENTORY_TEXT_FIELDS = [
  'item_name',
  'item_type',
  'item_category',
  'item_description',
  'assigned_to_name',
  'remarks',
  'condition',
  'acquisition_mode',
  'donor_identification',
  'unit_of_measure',
  'status',
  'property_no',
  'par_no',
] as const

export const normalizeInventoryRecord = <T extends Record<string, unknown>>(record: T): T => {
  const normalized = { ...record }

  for (const field of INVENTORY_TEXT_FIELDS) {
    if (!(field in normalized)) continue
    const value = normalized[field]
    if (typeof value === 'string' || value == null) {
      if (field === 'item_description' && value?.trim().toUpperCase().startsWith(REPACK_CONTENTS_PREFIX)) {
        ;(normalized as Record<string, unknown>)[field] = value.trim()
        continue
      }

      ;(normalized as Record<string, unknown>)[field] = normalizeDbText(value as string | null | undefined)
    }
  }

  return normalized
}

export const normalizeUserRecord = <T extends Record<string, unknown>>(record: T): T => {
  const normalized = { ...record }
  const fields = ['full_name', 'position', 'contact_info', 'emergency_contact', 'par_no'] as const

  for (const field of fields) {
    if (!(field in normalized)) continue
    const value = normalized[field]
    if (typeof value === 'string' || value == null) {
      ;(normalized as Record<string, unknown>)[field] = normalizeDbText(value as string | null | undefined)
    }
  }

  if ('staff_id' in normalized && typeof normalized.staff_id === 'string') {
    ;(normalized as Record<string, unknown>).staff_id = normalized.staff_id.trim().toUpperCase()
  }

  return normalized
}

const PAR_RECORD_TEXT_FIELDS = [
  'contact_snapshot',
  'unit_snapshot',
  'description_snapshot',
  'property_no_snapshot',
] as const

export const normalizeParRecord = <T extends Record<string, unknown>>(record: T): T => {
  const normalized = { ...record }

  for (const field of PAR_RECORD_TEXT_FIELDS) {
    if (!(field in normalized)) continue
    const value = normalized[field]
    if (typeof value === 'string' || value == null) {
      ;(normalized as Record<string, unknown>)[field] = normalizeDbText(value as string | null | undefined)
    }
  }

  return normalized
}

export const equalsDbText = (left: string | null | undefined, right: string | null | undefined): boolean =>
  (left ?? '').trim().toUpperCase() === (right ?? '').trim().toUpperCase()

export type RepackContentEntry = {
  name: string
  quantity: number
  unit: string
}

export const serializeRepackContents = (entries: RepackContentEntry[]): string =>
  `${REPACK_CONTENTS_PREFIX}${JSON.stringify(entries)}`

export const parseRepackContents = (description: string | null | undefined): RepackContentEntry[] | null => {
  const trimmed = description?.trim()
  if (!trimmed?.toUpperCase().startsWith(REPACK_CONTENTS_PREFIX)) return null

  try {
    const parsed = JSON.parse(trimmed.slice(REPACK_CONTENTS_PREFIX.length)) as Array<Record<string, unknown>>
    if (!Array.isArray(parsed)) return null

    return parsed
      .map((entry) => {
        const name = typeof entry.name === 'string' ? entry.name : typeof entry.NAME === 'string' ? entry.NAME : ''
        const unit = typeof entry.unit === 'string' ? entry.unit : typeof entry.UNIT === 'string' ? entry.UNIT : ''
        const rawQuantity = entry.quantity ?? entry.QUANTITY
        const quantity = typeof rawQuantity === 'number' ? rawQuantity : Number(rawQuantity)

        return {
          name: name.trim() || 'Unknown item',
          quantity: Number.isFinite(quantity) ? quantity : 0,
          unit: unit.trim(),
        }
      })
      .filter((entry) => entry.quantity > 0)
  } catch {
    return null
  }
}

export const formatRepackContentsDisplay = (entries: RepackContentEntry[]): string =>
  entries
    .map((entry) => {
      const unitSuffix = entry.unit?.trim() ? ` ${entry.unit.trim()}` : ''
      return `${entry.quantity}${unitSuffix} ${entry.name}`.trim()
    })
    .join(', ')

export type BorrowedItemDisplayStatus = 'Returned' | 'Overdue' | 'Borrowed'

export type BorrowedItemStatusInput = {
  status?: string | null
  return_date?: string | null
  date_returned?: string | null
  return_remarks?: string | null
}

export const isBorrowedItemReturned = (item: BorrowedItemStatusInput): boolean => {
  const normalizedStatus = (item.status ?? '').trim().toLowerCase()
  if (normalizedStatus === 'returned') return true
  if ((item.date_returned ?? '').trim()) return true
  return Boolean((item.return_remarks ?? '').trim())
}

export const isActiveBorrowedItem = (item: BorrowedItemStatusInput): boolean => !isBorrowedItemReturned(item)

const parseBorrowedReturnDate = (value: string | null | undefined): Date | null => {
  if (!value?.trim()) return null
  const trimmed = value.trim()
  const parsed = trimmed.includes('T')
    ? new Date(trimmed)
    : new Date(`${trimmed.slice(0, 10)}T23:59:59`)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

export const getBorrowedItemStatus = (item: BorrowedItemStatusInput): BorrowedItemDisplayStatus => {
  if (isBorrowedItemReturned(item)) return 'Returned'

  const returnDateValue = item.return_date?.trim()
  if (!returnDateValue) return 'Borrowed'

  const returnDate = parseBorrowedReturnDate(returnDateValue)
  if (!returnDate) return 'Borrowed'

  if (returnDateValue.includes('T')) {
    return returnDate < new Date() ? 'Overdue' : 'Borrowed'
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  returnDate.setHours(0, 0, 0, 0)

  if (returnDate < today) return 'Overdue'
  return 'Borrowed'
}
