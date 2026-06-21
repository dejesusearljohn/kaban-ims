import { formatStockpileRowId, isPackedStockpileItem, parseRepackContents, serializeRepackContents, type StockpileListKind } from '../utils/itemUtils'
import { MAX_PHOTO_FILE_SIZE_LABEL, validatePhotoFilesSelection } from '../utils/photoUtils'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { Tables } from '../../supabase'
import useResponsivePageSize from './useResponsivePageSize'
import { supabase } from '../supabaseClient'
import { getStatusBadgeClass } from '../utils/statusBadge'

type StockpileRow = Tables<'stockpile'> & {
  status?: string | null
  kind_item_no?: number | null
  property_no?: string | null
  item_description?: string | null
}
type DistributionLogRow = Tables<'distribution_logs'>

type StockpileReleaseLog = {
  log: DistributionLogRow
  itemName: string
  unit: string
  quantity: number
  attachmentUrls: string[]
}

type StockpileReleaseDraftItem = {
  stockpileId: string
  quantity: string
}

type PackedContentDraftRow = {
  name: string
  quantity: string
  unit: string
}

type StockpileSectionProps = {
  loading: boolean
  totalStockpiles: number
  formatValue: (value: number) => string
  stockpileError: string | null
  stockpileMode: 'list' | 'logs' | 'expired' | 'release' | 'repack'
  setStockpileMode: (mode: 'list' | 'logs' | 'expired' | 'release' | 'repack') => void
  openReleasePage: () => void
  stockpileLoading: boolean
  filteredStockpileItems: StockpileRow[]
  filteredExpiredStockpileItems: StockpileRow[]
  stockpileReleaseLogs: StockpileReleaseLog[]
  stockpileReleaseItems: StockpileReleaseDraftItem[]
  stockpileReleaseAttachmentFiles: File[]
  setStockpileReleaseAttachmentFiles: (files: File[]) => void
  setStockpileReleaseIssuedToInput: (value: string) => void
  stockpileReleaseIssuedToInput: string
  setStockpileReleaseReasonInput: (value: string) => void
  stockpileReleaseReasonInput: string
  availableReleaseItems: StockpileRow[]
  availableRepackItems: StockpileRow[]
  addStockpileReleaseItem: () => void
  updateStockpileReleaseItem: (index: number, field: keyof StockpileReleaseDraftItem, value: string) => void
  removeStockpileReleaseItem: (index: number) => void
  closeStockpileReleasePage: () => void
  handleReleaseStockpile: () => void
  releasingStockpile: boolean
  repackItems: StockpileReleaseDraftItem[]
  setRepackItems: (items: StockpileReleaseDraftItem[]) => void
  repackResultName: string
  setRepackResultName: (name: string) => void
  repackResultQuantity: string
  setRepackResultQuantity: (qty: string) => void
  addRepackItem: () => void
  updateRepackItem: (index: number, field: keyof StockpileReleaseDraftItem, value: string) => void
  removeRepackItem: (index: number) => void
  handleRepackStockpile: () => void
  repackingStockpile: boolean
  handlePrintReleaseLogs: () => void
  formatDisplayDate: (dateString: string | null) => string
  onExportCsv: (listKind: StockpileListKind | 'all') => void
}

function StockpileSection({
  loading,
  totalStockpiles,
  formatValue,
  stockpileError,
  stockpileMode,
  setStockpileMode,
  openReleasePage,
  stockpileLoading,
  filteredStockpileItems,
  filteredExpiredStockpileItems,
  stockpileReleaseLogs,
  stockpileReleaseItems,
  stockpileReleaseAttachmentFiles,
  setStockpileReleaseAttachmentFiles,
  setStockpileReleaseIssuedToInput,
  stockpileReleaseIssuedToInput,
  setStockpileReleaseReasonInput,
  stockpileReleaseReasonInput,
  availableReleaseItems,
  availableRepackItems,
  addStockpileReleaseItem,
  updateStockpileReleaseItem,
  removeStockpileReleaseItem,
  closeStockpileReleasePage,
  handleReleaseStockpile,
  releasingStockpile,
  repackItems,
  repackResultName,
  setRepackResultName,
  repackResultQuantity,
  setRepackResultQuantity,
  addRepackItem,
  updateRepackItem,
  removeRepackItem,
  handleRepackStockpile,
  repackingStockpile,
  handlePrintReleaseLogs,
  formatDisplayDate,
  onExportCsv,
}: StockpileSectionProps) {
  const stockpilePageSize = useResponsivePageSize(10)
  const [stockpilePage, setStockpilePage] = useState(1)
  const [releaseItemPickerRowIndex, setReleaseItemPickerRowIndex] = useState<number | null>(null)
  const [releaseItemPickerSource, setReleaseItemPickerSource] = useState<'release' | 'repack' | null>(null)
  const [releaseItemPickerSearch, setReleaseItemPickerSearch] = useState('')
  const [releaseItemPickerCategory, setReleaseItemPickerCategory] = useState('all')
  const [releaseItemPickerSelectedIds, setReleaseItemPickerSelectedIds] = useState<string[]>([])
  const [releaseItemPickerPage, setReleaseItemPickerPage] = useState(1)
  const releaseItemPickerModalRef = useRef<HTMLDivElement | null>(null)
  const releaseAttachmentInputRef = useRef<HTMLInputElement | null>(null)
  const [stockpileListKind, setStockpileListKind] = useState<StockpileListKind>('individual')
  const [selectedPackedItem, setSelectedPackedItem] = useState<StockpileRow | null>(null)
  const [releasePhotoFileError, setReleasePhotoFileError] = useState<string | null>(null)
  const [packedContentDraftRows, setPackedContentDraftRows] = useState<PackedContentDraftRow[]>([
    { name: '', quantity: '', unit: '' },
  ])
  const [savingPackedContents, setSavingPackedContents] = useState(false)
  const [packedContentsError, setPackedContentsError] = useState<string | null>(null)

  const individualStockpileItems = useMemo(
    () => filteredStockpileItems.filter((item) => !isPackedStockpileItem(item)),
    [filteredStockpileItems],
  )

  const packedStockpileItems = useMemo(
    () => filteredStockpileItems.filter((item) => isPackedStockpileItem(item)),
    [filteredStockpileItems],
  )

  const activeListStockpileItems = useMemo(
    () => (stockpileListKind === 'packed' ? packedStockpileItems : individualStockpileItems),
    [stockpileListKind, packedStockpileItems, individualStockpileItems],
  )

  const currentStockpileItems = useMemo(() => {
    if (stockpileMode === 'expired') return filteredExpiredStockpileItems
    if (stockpileMode === 'list') return activeListStockpileItems
    return filteredStockpileItems
  }, [stockpileMode, filteredExpiredStockpileItems, activeListStockpileItems, filteredStockpileItems])
  const currentStockpileRowCount = stockpileMode === 'logs' ? stockpileReleaseLogs.length : currentStockpileItems.length

  const stockpileTotalPages = Math.max(1, Math.ceil(currentStockpileRowCount / stockpilePageSize))

  useEffect(() => {
    setStockpilePage(1)
  }, [stockpileMode, stockpileListKind])

  useEffect(() => {
    if (stockpilePage > stockpileTotalPages) {
      setStockpilePage(stockpileTotalPages)
    }
  }, [stockpilePage, stockpileTotalPages])


  const paginatedStockpileItems = useMemo(() => {
    const start = (stockpilePage - 1) * stockpilePageSize
    return currentStockpileItems.slice(start, start + stockpilePageSize)
  }, [currentStockpileItems, stockpilePage, stockpilePageSize])
  const paginatedStockpileReleaseLogs = useMemo(() => {
    const start = (stockpilePage - 1) * stockpilePageSize
    return stockpileReleaseLogs.slice(start, start + stockpilePageSize)
  }, [stockpileReleaseLogs, stockpilePage, stockpilePageSize])

  const visibleStockpilePageNumbers = useMemo(() => {
    const maxVisiblePages = 5
    if (stockpileTotalPages <= maxVisiblePages) {
      return Array.from({ length: stockpileTotalPages }, (_, index) => index + 1)
    }

    const halfWindow = Math.floor(maxVisiblePages / 2)
    let start = Math.max(1, stockpilePage - halfWindow)
    let end = Math.min(stockpileTotalPages, start + maxVisiblePages - 1)

    if (end - start + 1 < maxVisiblePages) {
      start = Math.max(1, end - maxVisiblePages + 1)
    }

    return Array.from({ length: end - start + 1 }, (_, index) => start + index)
  }, [stockpilePage, stockpileTotalPages])

  const selectedReleaseItemIds = useMemo(
    () => new Set(stockpileReleaseItems.map((item) => item.stockpileId).filter((itemId) => itemId.trim())),
    [stockpileReleaseItems],
  )
  const selectedRepackItemIds = useMemo(
    () => new Set(repackItems.map((item) => item.stockpileId).filter((itemId) => itemId.trim())),
    [repackItems],
  )
  const activePickerItems = useMemo(
    () => (releaseItemPickerSource === 'repack' ? repackItems : stockpileReleaseItems),
    [releaseItemPickerSource, repackItems, stockpileReleaseItems],
  )
  const selectedPickerItemIds = useMemo(
    () => (releaseItemPickerSource === 'repack' ? selectedRepackItemIds : selectedReleaseItemIds),
    [releaseItemPickerSource, selectedRepackItemIds, selectedReleaseItemIds],
  )

  const closeReleaseItemPicker = () => {
    setReleaseItemPickerRowIndex(null)
    setReleaseItemPickerSource(null)
    setReleaseItemPickerSearch('')
    setReleaseItemPickerCategory('all')
    setReleaseItemPickerSelectedIds([])
    setReleaseItemPickerPage(1)
  }

  const openReleaseItemPicker = (source: 'release' | 'repack', index: number) => {
    setReleaseItemPickerRowIndex(index)
    setReleaseItemPickerSource(source)
    setReleaseItemPickerSearch('')
    setReleaseItemPickerCategory('all')
    setReleaseItemPickerSelectedIds([])
    setReleaseItemPickerPage(1)
  }

  const toggleReleaseItemPickerSelection = (stockpileId: string) => {
    setReleaseItemPickerSelectedIds((prev) => {
      if (prev.includes(stockpileId)) {
        return prev.filter((id) => id !== stockpileId)
      }

      return [...prev, stockpileId]
    })
  }

  const updatePackedContentDraftRow = (index: number, field: keyof PackedContentDraftRow, value: string) => {
    setPackedContentDraftRows((prev) =>
      prev.map((row, rowIndex) => (rowIndex === index ? { ...row, [field]: value } : row)),
    )
  }

  const addPackedContentDraftRow = () => {
    setPackedContentDraftRows((prev) => [...prev, { name: '', quantity: '', unit: '' }])
  }

  const removePackedContentDraftRow = (index: number) => {
    setPackedContentDraftRows((prev) => {
      const next = prev.filter((_, rowIndex) => rowIndex !== index)
      return next.length > 0 ? next : [{ name: '', quantity: '', unit: '' }]
    })
  }

  const handleSavePackedContents = async () => {
    if (!selectedPackedItem) return

    const contents = packedContentDraftRows
      .map((row, index) => ({
        index,
        name: row.name.trim(),
        quantity: Number(row.quantity),
        unit: row.unit.trim(),
      }))
      .filter((row) => row.name || row.quantity || row.unit)

    if (contents.length === 0) {
      setPackedContentsError('Add at least one item in this pack.')
      return
    }

    const invalid = contents.find((row) => !row.name || !Number.isFinite(row.quantity) || row.quantity <= 0)
    if (invalid) {
      setPackedContentsError(`Line ${invalid.index + 1}: item name and positive quantity are required.`)
      return
    }

    const serializedContents = serializeRepackContents(
      contents.map((row) => ({
        name: row.name,
        quantity: row.quantity,
        unit: row.unit,
      })),
    )

    setSavingPackedContents(true)
    setPackedContentsError(null)

    const { error } = await supabase
      .from('inventory')
      .update({ item_description: serializedContents })
      .eq('item_id', selectedPackedItem.stockpile_id)

    if (error) {
      setPackedContentsError(error.message)
      setSavingPackedContents(false)
      return
    }

    setSelectedPackedItem((prev) => (prev ? { ...prev, item_description: serializedContents } : prev))
    setSavingPackedContents(false)
  }

  const pickerCatalogItems = useMemo(
    () => (releaseItemPickerSource === 'repack' ? availableRepackItems : availableReleaseItems),
    [releaseItemPickerSource, availableRepackItems, availableReleaseItems],
  )

  const releaseItemPickerCategoryOptions = useMemo(() => {
    return Array.from(
      new Set(
        pickerCatalogItems
          .map((item) => item.category?.trim() || 'Uncategorized')
          .filter((category) => category.length > 0),
      ),
    ).sort((a, b) => a.localeCompare(b))
  }, [pickerCatalogItems])

  const filteredReleasePickerItems = useMemo(() => {
    const normalizedSearch = releaseItemPickerSearch.trim().toLowerCase()

    return pickerCatalogItems
      .filter((item) => {
        const category = item.category?.trim() || 'Uncategorized'

        if (releaseItemPickerCategory !== 'all' && category !== releaseItemPickerCategory) {
          return false
        }

        if (!normalizedSearch) return true

        const displayId = formatStockpileRowId(item).toLowerCase()

        return (
          displayId.includes(normalizedSearch) ||
          (item.item_name ?? '').toLowerCase().includes(normalizedSearch) ||
          category.toLowerCase().includes(normalizedSearch)
        )
      })
      .sort((a, b) => {
        const categoryA = a.category?.trim() || 'Uncategorized'
        const categoryB = b.category?.trim() || 'Uncategorized'
        const categoryCompare = categoryA.localeCompare(categoryB)
        if (categoryCompare !== 0) return categoryCompare

        return (a.item_name ?? '').localeCompare(b.item_name ?? '')
      })
  }, [pickerCatalogItems, releaseItemPickerCategory, releaseItemPickerSearch])

  const releaseItemPickerPageSize = 8
  const releaseItemPickerTotalPages = Math.max(1, Math.ceil(filteredReleasePickerItems.length / releaseItemPickerPageSize))
  const paginatedReleasePickerItems = filteredReleasePickerItems.slice(
    (releaseItemPickerPage - 1) * releaseItemPickerPageSize,
    (releaseItemPickerPage - 1) * releaseItemPickerPageSize + releaseItemPickerPageSize,
  )

  const releaseItemPickerVisiblePageNumbers = useMemo(() => {
    const maxVisiblePages = 5
    if (releaseItemPickerTotalPages <= maxVisiblePages) {
      return Array.from({ length: releaseItemPickerTotalPages }, (_, index) => index + 1)
    }

    const halfWindow = Math.floor(maxVisiblePages / 2)
    let start = Math.max(1, releaseItemPickerPage - halfWindow)
    let end = Math.min(releaseItemPickerTotalPages, start + maxVisiblePages - 1)

    if (end - start + 1 < maxVisiblePages) {
      start = Math.max(1, end - maxVisiblePages + 1)
    }

    return Array.from({ length: end - start + 1 }, (_, index) => start + index)
  }, [releaseItemPickerPage, releaseItemPickerTotalPages])

  const getReleaseItemDisplayLabel = (stockpileId: string, source: 'release' | 'repack') => {
    const emptyLabel = source === 'release' ? 'Select pack to release' : 'Select stockpile item'
    if (!stockpileId) return emptyLabel

    const catalog = source === 'repack' ? availableRepackItems : availableReleaseItems
    const found = catalog.find((item) => String(item.stockpile_id) === stockpileId)
    if (!found) return emptyLabel

    const displayId = formatStockpileRowId(found)
    return `${displayId} — ${found.item_name ?? 'Unnamed'}`
  }

  const handleApplySelectedReleaseItems = () => {
    if (releaseItemPickerRowIndex == null || releaseItemPickerSource == null || releaseItemPickerSelectedIds.length === 0) return

    const currentRow = activePickerItems[releaseItemPickerRowIndex]
    const currentRowId = currentRow?.stockpileId ?? ''

    const validSelectedIds = releaseItemPickerSelectedIds.filter((stockpileId) => {
      if (!selectedPickerItemIds.has(stockpileId)) return true
      return stockpileId === currentRowId
    })

    if (validSelectedIds.length === 0) {
      closeReleaseItemPicker()
      return
    }

    if (releaseItemPickerSource === 'repack') {
      updateRepackItem(releaseItemPickerRowIndex, 'stockpileId', validSelectedIds[0])

      const currentQty = currentRow?.quantity?.trim() || '1'
      updateRepackItem(releaseItemPickerRowIndex, 'quantity', currentQty)

      validSelectedIds.slice(1).forEach((stockpileId, offset) => {
        addRepackItem()
        const nextIndex = repackItems.length + offset
        updateRepackItem(nextIndex, 'stockpileId', stockpileId)
        updateRepackItem(nextIndex, 'quantity', '1')
      })
    } else {
      updateStockpileReleaseItem(releaseItemPickerRowIndex, 'stockpileId', validSelectedIds[0])

      const currentQty = currentRow?.quantity?.trim() || '1'
      updateStockpileReleaseItem(releaseItemPickerRowIndex, 'quantity', currentQty)

      validSelectedIds.slice(1).forEach((stockpileId, offset) => {
        addStockpileReleaseItem()
        const nextIndex = stockpileReleaseItems.length + offset
        updateStockpileReleaseItem(nextIndex, 'stockpileId', stockpileId)
        updateStockpileReleaseItem(nextIndex, 'quantity', '1')
      })
    }

    closeReleaseItemPicker()
  }

  useEffect(() => {
    if (releaseItemPickerRowIndex == null) return

    const frameId = window.requestAnimationFrame(() => {
      releaseItemPickerModalRef.current?.focus()
    })

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        closeReleaseItemPicker()
      }
    }

    window.addEventListener('keydown', onKeyDown)

    return () => {
      window.cancelAnimationFrame(frameId)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [releaseItemPickerRowIndex])

  useEffect(() => {
    const contents = parseRepackContents(selectedPackedItem?.item_description)
    setPackedContentsError(null)
    setSavingPackedContents(false)
    setPackedContentDraftRows(
      contents && contents.length > 0
        ? contents.map((entry) => ({
            name: entry.name,
            quantity: String(entry.quantity),
            unit: entry.unit,
          }))
        : [{ name: '', quantity: '', unit: '' }],
    )
  }, [selectedPackedItem])

  useEffect(() => {
    if (releaseItemPickerRowIndex == null) return
    if (releaseItemPickerRowIndex >= activePickerItems.length) {
      closeReleaseItemPicker()
    }
  }, [activePickerItems.length, releaseItemPickerRowIndex])

  useEffect(() => {
    if (releaseItemPickerSource == null || releaseItemPickerRowIndex == null) return
    if (stockpileMode !== releaseItemPickerSource) {
      closeReleaseItemPicker()
    }
  }, [releaseItemPickerRowIndex, releaseItemPickerSource, stockpileMode])

  useEffect(() => {
    if (releaseItemPickerRowIndex == null) return
    setReleaseItemPickerPage(1)
  }, [releaseItemPickerSearch, releaseItemPickerCategory, releaseItemPickerRowIndex])

  useEffect(() => {
    if (releaseItemPickerPage > releaseItemPickerTotalPages) {
      setReleaseItemPickerPage(releaseItemPickerTotalPages)
    }
  }, [releaseItemPickerPage, releaseItemPickerTotalPages])

  return (
    <div className="inventory-layout">
      <header className="dashboard-header">
        <div>
          <h2>Stockpile</h2>
          <p>
            {loading
              ? 'Loading stockpiles…'
              : stockpileMode === 'list'
                ? stockpileListKind === 'packed'
                  ? `${formatValue(packedStockpileItems.length)} packed relief goods`
                  : `${formatValue(individualStockpileItems.length)} individual stockpile items`
                : `${formatValue(totalStockpiles)} total items in stock`}
          </p>
        </div>
      </header>

      {stockpileError && <p className="dashboard-error">{stockpileError}</p>}

      <section className="section-toolbar-row" aria-label="Stockpile actions">
        <div className="inventory-toolbar">
          <button
            type="button"
            className={stockpileMode === 'repack' ? 'inventory-primary-button' : 'inventory-secondary-button'}
            onClick={() => setStockpileMode('repack')}
          >
            Repack
          </button>
          <button
            type="button"
            className={stockpileMode === 'list' ? 'inventory-primary-button' : 'inventory-secondary-button'}
            onClick={() => setStockpileMode('list')}
          >
            Manage Stockpile
          </button>
          <button
            type="button"
            className={stockpileMode === 'release' ? 'inventory-primary-button' : 'inventory-secondary-button'}
            onClick={openReleasePage}
          >
            Stockpile Release
          </button>
          <button
            type="button"
            className={stockpileMode === 'logs' ? 'inventory-primary-button' : 'inventory-secondary-button'}
            onClick={() => setStockpileMode('logs')}
          >
            Release Logs
          </button>
          <button
            type="button"
            className={stockpileMode === 'expired' ? 'inventory-primary-button' : 'inventory-secondary-button'}
            onClick={() => setStockpileMode('expired')}
          >
            Expired
          </button>
        </div>

        <div className="csv-menu">
          <button
            type="button"
            className="csv-action-button"
            onClick={() => onExportCsv(stockpileMode === 'list' ? stockpileListKind : 'all')}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path d="M4 6h16M4 12h16M4 18h16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span>Export CSV</span>
          </button>
        </div>
      </section>

      {stockpileMode === 'list' && (
        <>
          <section className="inventory-table-section inventory-table-section-compact inventory-list-section" aria-label="Stockpile table">
            <div className="inventory-table-card">
              <div className="inventory-table-title stockpile-list-toolbar" aria-label="Stockpile list filters">
                <div className="inventory-kind-switch" role="tablist" aria-label="Stockpile item type">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={stockpileListKind === 'individual'}
                    className={`inventory-kind-switch-btn ${stockpileListKind === 'individual' ? 'inventory-kind-switch-btn-active' : ''}`}
                    onClick={() => setStockpileListKind('individual')}
                  >
                    Individual
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={stockpileListKind === 'packed'}
                    className={`inventory-kind-switch-btn ${stockpileListKind === 'packed' ? 'inventory-kind-switch-btn-active' : ''}`}
                    onClick={() => setStockpileListKind('packed')}
                  >
                    Packed
                  </button>
                </div>
                <p className="inventory-help-text stockpile-list-kind-help">
                  {stockpileListKind === 'individual'
                    ? 'Bulk stockpile items added from Inventory (rice, canned goods, etc.).'
                    : 'Relief packs created from the Repack tab, ready for Stockpile Release.'}
                </p>
              </div>

              <table className="inventory-table inventory-list-table stockpile-list-table">
                <thead>
                  <tr>
                    <th scope="col" className="inventory-id-column">ID</th>
                    <th scope="col" className="inventory-name-column">Item Name</th>
                    <th scope="col">Category</th>
                    <th scope="col">Quantity</th>
                    <th scope="col">Unit</th>
                    <th scope="col">{stockpileListKind === 'packed' ? 'Packed Date' : 'Acquired'}</th>
                    <th scope="col">Expiration Date</th>
                  </tr>
                </thead>
                <tbody>
                  {stockpileLoading ? (
                    <tr>
                      <td colSpan={7}>Loading stockpiles…</td>
                    </tr>
                  ) : activeListStockpileItems.length === 0 ? (
                    <tr>
                      <td colSpan={7}>
                        {stockpileListKind === 'packed'
                          ? 'No packed relief goods yet. Use Repack to combine stockpile items into packs.'
                          : 'No individual stockpile items found. Add stockpile items from Inventory.'}
                      </td>
                    </tr>
                  ) : (
                    paginatedStockpileItems.map((item) => {
                      const paddedId = formatStockpileRowId(item)
                      const isExpired =
                        item.expiration_date && new Date(item.expiration_date) < new Date()
                      const isClickablePacked = stockpileListKind === 'packed'

                      return (
                        <tr
                          key={item.stockpile_id}
                          onClick={isClickablePacked ? () => setSelectedPackedItem(item) : undefined}
                          style={isClickablePacked ? { cursor: 'pointer' } : undefined}
                          title={isClickablePacked ? 'Click to view pack contents' : undefined}
                        >
                          <td className="inventory-id-column">{paddedId}</td>
                          <td className="inventory-name-column">{item.item_name ?? '—'}</td>
                          <td>{item.category ?? '—'}</td>
                          <td>{item.quantity_on_hand ?? '—'}</td>
                          <td>{item.unit_of_measure ?? '—'}</td>
                          <td>{formatDisplayDate(item.packed_date)}</td>
                          <td>
                            <span className={`badge ${getStatusBadgeClass(isExpired ? 'expired' : 'valid')}`}>
                              {formatDisplayDate(item.expiration_date)}
                            </span>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {!stockpileLoading && stockpileTotalPages > 1 && (
            <div className="inventory-pagination" aria-label="Stockpile pagination">
              <div className="inventory-pagination-controls">
                <button
                  type="button"
                  className="inventory-pagination-button inventory-pagination-circle"
                  onClick={() => setStockpilePage((prev) => Math.max(1, prev - 1))}
                  disabled={stockpilePage === 1}
                  aria-label="Previous page"
                >
                  <svg viewBox="0 0 24 24" width="8" height="8" aria-hidden="true" focusable="false">
                    <path
                      d="M15 6l-6 6 6 6"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>

                {visibleStockpilePageNumbers.map((pageNumber) => (
                  <button
                    key={pageNumber}
                    type="button"
                    className={`inventory-pagination-button inventory-pagination-circle ${
                      pageNumber === stockpilePage ? 'inventory-pagination-circle-active' : ''
                    }`}
                    onClick={() => setStockpilePage(pageNumber)}
                    aria-label={`Page ${pageNumber}`}
                    aria-current={pageNumber === stockpilePage ? 'page' : undefined}
                  >
                    {pageNumber}
                  </button>
                ))}

                <button
                  type="button"
                  className="inventory-pagination-button inventory-pagination-circle"
                  onClick={() => setStockpilePage((prev) => Math.min(stockpileTotalPages, prev + 1))}
                  disabled={stockpilePage === stockpileTotalPages}
                  aria-label="Next page"
                >
                  <svg viewBox="0 0 24 24" width="8" height="8" aria-hidden="true" focusable="false">
                    <path
                      d="M9 6l6 6-6 6"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {stockpileMode === 'release' && (
        <>
          <section className="inventory-add-section" aria-label="Stockpile release details">
            <div className="inventory-add-card">
              <div className="stockpile-release-header">
                <h3 className="inventory-add-title">Stockpile Release</h3>
              </div>

              <p className="inventory-help-text stockpile-release-help">
                Add one or more stockpile items, then submit them as a single release transaction.
              </p>

              <div className="inventory-add-grid">
                <div className="inventory-field">
                  <label htmlFor="stockpile-release-issued-to">
                    Issued To <span className="inventory-required">*</span>
                  </label>
                  <input
                    id="stockpile-release-issued-to"
                    type="text"
                    className="inventory-input"
                    placeholder="e.g. Barangay Banicain"
                    value={stockpileReleaseIssuedToInput}
                    onChange={(e) => setStockpileReleaseIssuedToInput(e.target.value)}
                    disabled={releasingStockpile}
                  />
                </div>

                <div className="inventory-field">
                  <label htmlFor="stockpile-release-reason">
                    Reason of Issuance <span className="inventory-required">*</span>
                  </label>
                  <input
                    id="stockpile-release-reason"
                    type="text"
                    className="inventory-input"
                    placeholder="e.g. Typhoon relief"
                    value={stockpileReleaseReasonInput}
                    onChange={(e) => setStockpileReleaseReasonInput(e.target.value)}
                    disabled={releasingStockpile}
                  />
                </div>

                <div className="inventory-field" style={{ gridColumn: '1 / -1' }}>
                  <label htmlFor="stockpile-release-attachments">Attachments</label>
                  <p className="inventory-help-text">Maximum file size: {MAX_PHOTO_FILE_SIZE_LABEL}</p>
                  <input
                    id="stockpile-release-attachments"
                    ref={releaseAttachmentInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="inventory-input"
                    onChange={(e) => {
                      const { files, error } = validatePhotoFilesSelection(Array.from(e.target.files ?? []))
                      setReleasePhotoFileError(error)
                      setStockpileReleaseAttachmentFiles(files)
                      if (error && releaseAttachmentInputRef.current) {
                        releaseAttachmentInputRef.current.value = ''
                      }
                    }}
                    disabled={releasingStockpile}
                  />
                  {releasePhotoFileError && <p className="dashboard-error">{releasePhotoFileError}</p>}
                  {stockpileReleaseAttachmentFiles.length > 0 && (
                    <p className="inventory-help-text" style={{ marginTop: 8 }}>
                      {stockpileReleaseAttachmentFiles.length} photo(s) selected
                    </p>
                  )}
                </div>
              </div>
            </div>
          </section>

          <section className="inventory-table-section inventory-table-section-compact" aria-label="Stockpile release items">
            <div className="inventory-table-card stockpile-release-lines-card">
              <div className="inventory-table-title stockpile-release-lines-header">
                <h3 className="inventory-add-title">Release Items</h3>
              </div>

              <table className="inventory-table stockpile-release-table">
                <thead>
                  <tr>
                    <th scope="col" className="stockpile-release-no-column">No.</th>
                    <th scope="col" className="stockpile-release-item-column">Stockpile Item</th>
                    <th scope="col" className="stockpile-release-qty-column">Release Qty</th>
                    <th scope="col" className="stockpile-release-avail-column">Available</th>
                    <th scope="col" className="stockpile-release-action-column">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {stockpileReleaseItems.map((item, index) => {
                    const selectedItem = availableReleaseItems.find(
                      (stockpileItem) => stockpileItem.stockpile_id === Number(item.stockpileId),
                    )

                    return (
                      <tr key={`release-line-${index}`}>
                        <td className="stockpile-release-line-number stockpile-release-no-column">{index + 1}</td>
                        <td className="stockpile-release-item-column">
                          <button
                            type="button"
                            className={`stockpile-release-picker-button ${item.stockpileId ? 'stockpile-release-picker-button-selected' : ''}`}
                            onClick={() => openReleaseItemPicker('release', index)}
                            disabled={releasingStockpile}
                          >
                            {getReleaseItemDisplayLabel(item.stockpileId, 'release')}
                          </button>
                        </td>
                        <td className="stockpile-release-qty-column">
                          <input
                            type="number"
                            min="1"
                            max={selectedItem ? Number(selectedItem.quantity_on_hand ?? 0) : undefined}
                            className="inventory-input stockpile-release-quantity-input"
                            placeholder="Enter quantity"
                            value={item.quantity}
                            onChange={(e) => updateStockpileReleaseItem(index, 'quantity', e.target.value)}
                            disabled={releasingStockpile || !item.stockpileId}
                          />
                        </td>
                        <td className="stockpile-release-avail-column">
                          {selectedItem
                            ? `${selectedItem.quantity_on_hand ?? 0} ${selectedItem.unit_of_measure ?? ''}`.trim()
                            : '—'}
                        </td>
                        <td className="stockpile-release-action-column stockpile-release-action-cell">
                          <button
                            type="button"
                            className="stockpile-row-remove-link"
                            onClick={() => removeStockpileReleaseItem(index)}
                            disabled={releasingStockpile || stockpileReleaseItems.length === 1}
                            aria-label={`Remove release item ${index + 1}`}
                          >
                            ×
                          </button>
                        </td>
                      </tr>
                    )
                  })}

                  <tr className="stockpile-release-add-row">
                    <td colSpan={5}>
                      <button
                        type="button"
                        className="stockpile-release-add-button"
                        onClick={addStockpileReleaseItem}
                        disabled={releasingStockpile}
                      >
                        <span className="stockpile-release-add-icon">+</span>
                        <span>Add Item</span>
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="stockpile-release-actions">
              <button
                type="button"
                className="inventory-secondary-button"
                onClick={closeStockpileReleasePage}
                disabled={releasingStockpile}
              >
                Cancel
              </button>
              <button
                type="button"
                className="inventory-add-submit"
                onClick={handleReleaseStockpile}
                disabled={releasingStockpile || availableReleaseItems.length === 0}
              >
                {releasingStockpile ? 'Releasing…' : 'Submit Release'}
              </button>
            </div>
          </section>
        </>
      )}

      {stockpileMode === 'repack' && (
        <>
          <section className="inventory-add-section" aria-label="Stockpile repack details">
            <div className="inventory-add-card">
              <div className="stockpile-release-header">
                <h3 className="inventory-add-title">Repack Stockpile Items</h3>
              </div>

              <p className="inventory-help-text stockpile-release-help">
                Combine bulk stockpile inventory (rice, canned goods, etc.) into new pack units for release.
              </p>

              {availableRepackItems.length === 0 && !stockpileLoading && (
                <p className="inventory-help-text stockpile-repack-empty-notice">
                  No bulk stockpile items are available to repack. Add stockpile inventory with quantity on hand first.
                </p>
              )}

              <div className="inventory-add-grid">
                <div className="inventory-field">
                  <label htmlFor="repack-result-name">
                    New Package Name <span className="inventory-required">*</span>
                  </label>
                  <input
                    id="repack-result-name"
                    type="text"
                    className="inventory-input"
                    placeholder="e.g. Combined Relief Pack"
                    value={repackResultName}
                    onChange={(e) => setRepackResultName(e.target.value)}
                    disabled={repackingStockpile}
                  />
                </div>

                <div className="inventory-field">
                  <label htmlFor="repack-result-quantity">
                    Result Quantity <span className="inventory-required">*</span>
                  </label>
                  <input
                    id="repack-result-quantity"
                    type="number"
                    min="1"
                    className="inventory-input"
                    placeholder="1"
                    value={repackResultQuantity}
                    onChange={(e) => setRepackResultQuantity(e.target.value)}
                    disabled={repackingStockpile}
                  />
                </div>
              </div>
            </div>
          </section>

          <section className="inventory-table-section inventory-table-section-compact" aria-label="Repack source items">
            <div className="inventory-table-card stockpile-release-lines-card">
              <div className="inventory-table-title stockpile-release-lines-header">
                <h3 className="inventory-add-title">Items to Repack</h3>
              </div>

              <table className="inventory-table stockpile-release-table">
                <thead>
                  <tr>
                    <th scope="col" className="stockpile-release-no-column">No.</th>
                    <th scope="col" className="stockpile-release-item-column">Stockpile Item</th>
                    <th scope="col" className="stockpile-release-qty-column">Repack Qty</th>
                    <th scope="col" className="stockpile-release-avail-column">Available</th>
                    <th scope="col" className="stockpile-release-action-column">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {repackItems.map((item, index) => {
                    const selectedItem = availableRepackItems.find(
                      (stockpileItem) => stockpileItem.stockpile_id === Number(item.stockpileId),
                    )

                    return (
                      <tr key={`repack-line-${index}`}>
                        <td className="stockpile-release-line-number stockpile-release-no-column">{index + 1}</td>
                        <td className="stockpile-release-item-column">
                          <button
                            type="button"
                            className={`stockpile-release-picker-button ${item.stockpileId ? 'stockpile-release-picker-button-selected' : ''}`}
                            onClick={() => openReleaseItemPicker('repack', index)}
                            disabled={repackingStockpile}
                          >
                            {getReleaseItemDisplayLabel(item.stockpileId, 'repack')}
                          </button>
                        </td>
                        <td className="stockpile-release-qty-column">
                          <input
                            type="number"
                            min="1"
                            max={selectedItem ? Number(selectedItem.quantity_on_hand ?? 0) : undefined}
                            className="inventory-input stockpile-release-quantity-input"
                            placeholder="Enter quantity"
                            value={item.quantity}
                            onChange={(e) => updateRepackItem(index, 'quantity', e.target.value)}
                            disabled={repackingStockpile || !item.stockpileId}
                          />
                        </td>
                        <td className="stockpile-release-avail-column">
                          {selectedItem
                            ? `${selectedItem.quantity_on_hand ?? 0} ${selectedItem.unit_of_measure ?? ''}`.trim()
                            : '—'}
                        </td>
                        <td className="stockpile-release-action-column stockpile-release-action-cell">
                          <button
                            type="button"
                            className="stockpile-row-remove-link"
                            onClick={() => removeRepackItem(index)}
                            disabled={repackingStockpile || repackItems.length === 1}
                            aria-label={`Remove repack item ${index + 1}`}
                          >
                            ×
                          </button>
                        </td>
                      </tr>
                    )
                  })}

                  <tr className="stockpile-release-add-row">
                    <td colSpan={5}>
                      <button
                        type="button"
                        className="stockpile-release-add-button stockpile-repack-add-button"
                        onClick={addRepackItem}
                        disabled={repackingStockpile || availableRepackItems.length === 0}
                      >
                        <span className="stockpile-release-add-icon">+</span>
                        <span>Add Item</span>
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="stockpile-release-actions stockpile-repack-actions">
              <button
                type="button"
                className="inventory-add-cancel"
                onClick={() => setStockpileMode('list')}
                disabled={repackingStockpile}
              >
                Cancel
              </button>
              <button
                type="button"
                className="inventory-add-submit"
                onClick={handleRepackStockpile}
                disabled={repackingStockpile || availableRepackItems.length === 0}
              >
                {repackingStockpile ? 'Repacking…' : 'Submit Repack'}
              </button>
            </div>
          </section>
        </>
      )}

      {stockpileMode === 'logs' && (
        <>
          <section className="inventory-table-section" aria-label="Stockpile release logs">
            <div className="inventory-table-card">
            <div
              className="inventory-table-title"
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
            >
              <h3 className="inventory-add-title" style={{ margin: 0 }}>
                Release Logs
              </h3>
              <button
                type="button"
                className="wmr-modal-button-save"
                onClick={handlePrintReleaseLogs}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true" focusable="false">
                  <path
                    d="M7 9V4h10v5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <rect
                    x="5"
                    y="10"
                    width="14"
                    height="7"
                    rx="1.5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                  />
                  <path
                    d="M8 14h8M8 17h8"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.4"
                    strokeLinecap="round"
                  />
                </svg>
                <span>Print</span>
              </button>
            </div>
            <table className="inventory-table inventory-list-table">
              <thead>
                <tr>
                  <th scope="col" className="inventory-date-column">Date</th>
                  <th scope="col" className="inventory-name-column">Item</th>
                  <th scope="col">Qty</th>
                  <th scope="col">Unit</th>
                  <th scope="col">Issued To</th>
                  <th scope="col">Reason</th>
                  <th scope="col">Attachments</th>
                </tr>
              </thead>
              <tbody>
                {stockpileLoading ? (
                  <tr>
                    <td colSpan={7}>Loading release logs...</td>
                  </tr>
                ) : stockpileReleaseLogs.length === 0 ? (
                  <tr>
                    <td colSpan={7}>No release logs found.</td>
                  </tr>
                ) : (
                  paginatedStockpileReleaseLogs.map((entry) => (
                    <tr key={entry.log.log_id}>
                      <td className="inventory-date-column">{formatDisplayDate(entry.log.operation_date)}</td>
                      <td className="inventory-name-column">{entry.itemName || '—'}</td>
                      <td>{entry.quantity}</td>
                      <td>{entry.unit || '—'}</td>
                      <td>{entry.log.recipient_info ?? '—'}</td>
                      <td>{entry.log.calamity_name ?? '—'}</td>
                      <td>
                        {entry.attachmentUrls.length > 0 ? (
                          <div className="release-log-attachments">
                            {entry.attachmentUrls.map((url, idx) => (
                              <a
                                key={`${entry.log.log_id}-attachment-${idx}`}
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="release-log-attachment-link"
                                title={`${entry.itemName || 'Release item'} — Photo ${idx + 1} | ${formatDisplayDate(entry.log.operation_date)} | Issued To: ${entry.log.recipient_info ?? '—'} | Reason: ${entry.log.calamity_name ?? '—'}`}
                              >
                                Photo {idx + 1}
                              </a>
                            ))}
                          </div>
                        ) : (
                          '—'
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            </div>
          </section>

          {!stockpileLoading && stockpileReleaseLogs.length > stockpilePageSize && (
            <div className="inventory-pagination" aria-label="Stockpile release logs pagination">
              <div className="inventory-pagination-controls">
                <button
                  type="button"
                  className="inventory-pagination-button inventory-pagination-circle"
                  onClick={() => setStockpilePage((prev) => Math.max(1, prev - 1))}
                  disabled={stockpilePage === 1}
                  aria-label="Previous page"
                >
                  <svg viewBox="0 0 24 24" width="8" height="8" aria-hidden="true" focusable="false">
                    <path d="M15 6l-6 6 6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>

                {visibleStockpilePageNumbers.map((pageNumber) => (
                  <button
                    key={pageNumber}
                    type="button"
                    className={`inventory-pagination-button inventory-pagination-circle ${
                      pageNumber === stockpilePage ? 'inventory-pagination-circle-active' : ''
                    }`}
                    onClick={() => setStockpilePage(pageNumber)}
                    aria-label={`Page ${pageNumber}`}
                    aria-current={pageNumber === stockpilePage ? 'page' : undefined}
                  >
                    {pageNumber}
                  </button>
                ))}

                <button
                  type="button"
                  className="inventory-pagination-button inventory-pagination-circle"
                  onClick={() => setStockpilePage((prev) => Math.min(stockpileTotalPages, prev + 1))}
                  disabled={stockpilePage === stockpileTotalPages}
                  aria-label="Next page"
                >
                  <svg viewBox="0 0 24 24" width="8" height="8" aria-hidden="true" focusable="false">
                    <path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {stockpileMode === 'expired' && (
        <>
          <section className="inventory-table-section" aria-label="Expired stockpile table">
            <div className="inventory-table-card">
              <div className="inventory-table-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 className="inventory-add-title" style={{ margin: 0 }}>
                  Expired Stockpiles
                </h3>
              </div>
              <table className="inventory-table inventory-list-table stockpile-list-table">
                <thead>
                  <tr>
                    <th scope="col" className="inventory-id-column">ID</th>
                    <th scope="col" className="inventory-name-column">Item Name</th>
                    <th scope="col">Category</th>
                    <th scope="col">Quantity</th>
                    <th scope="col">Unit</th>
                    <th scope="col">Packed Date</th>
                    <th scope="col">Expiration Date</th>
                  </tr>
                </thead>
                <tbody>
                  {stockpileLoading ? (
                    <tr>
                      <td colSpan={7}>Loading expired stockpiles…</td>
                    </tr>
                  ) : filteredExpiredStockpileItems.length === 0 ? (
                    <tr>
                      <td colSpan={7}>No expired stockpiles found.</td>
                    </tr>
                  ) : (
                    paginatedStockpileItems.map((item) => {
                      const paddedId = formatStockpileRowId(item)
                      const isExpired =
                        (item.status ?? '').trim().toUpperCase() === 'EXPIRED' ||
                        (item.expiration_date && new Date(item.expiration_date) < new Date())

                      return (
                        <tr key={item.stockpile_id}>
                          <td className="inventory-id-column">{paddedId}</td>
                          <td className="inventory-name-column">{item.item_name ?? '—'}</td>
                          <td>{item.category ?? '—'}</td>
                          <td>{item.quantity_on_hand ?? '—'}</td>
                          <td>{item.unit_of_measure ?? '—'}</td>
                          <td>{formatDisplayDate(item.packed_date)}</td>
                          <td>
                            <span className={`badge ${getStatusBadgeClass(isExpired ? 'expired' : 'valid')}`}>
                              {formatDisplayDate(item.expiration_date)}
                            </span>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {!stockpileLoading && stockpileTotalPages > 1 && (
            <div className="inventory-pagination" aria-label="Expired stockpile pagination">
              <div className="inventory-pagination-controls">
                <button
                  type="button"
                  className="inventory-pagination-button inventory-pagination-circle"
                  onClick={() => setStockpilePage((prev) => Math.max(1, prev - 1))}
                  disabled={stockpilePage === 1}
                  aria-label="Previous page"
                >
                  <svg viewBox="0 0 24 24" width="8" height="8" aria-hidden="true" focusable="false">
                    <path
                      d="M15 6l-6 6 6 6"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>

                {visibleStockpilePageNumbers.map((pageNumber) => (
                  <button
                    key={pageNumber}
                    type="button"
                    className={`inventory-pagination-button inventory-pagination-circle ${
                      pageNumber === stockpilePage ? 'inventory-pagination-circle-active' : ''
                    }`}
                    onClick={() => setStockpilePage(pageNumber)}
                    aria-label={`Page ${pageNumber}`}
                    aria-current={pageNumber === stockpilePage ? 'page' : undefined}
                  >
                    {pageNumber}
                  </button>
                ))}

                <button
                  type="button"
                  className="inventory-pagination-button inventory-pagination-circle"
                  onClick={() => setStockpilePage((prev) => Math.min(stockpileTotalPages, prev + 1))}
                  disabled={stockpilePage === stockpileTotalPages}
                  aria-label="Next page"
                >
                  <svg viewBox="0 0 24 24" width="8" height="8" aria-hidden="true" focusable="false">
                    <path
                      d="M9 6l6 6-6 6"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {releaseItemPickerRowIndex != null && releaseItemPickerSource != null && stockpileMode === releaseItemPickerSource && (
        <div
          className="stockpile-picker-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="stockpile-picker-title"
          onClick={closeReleaseItemPicker}
        >
          <div
            ref={releaseItemPickerModalRef}
            className="stockpile-picker-modal"
            tabIndex={-1}
            onClick={(event) => event.stopPropagation()}
          >
            <header className="panel-header dashboard-drilldown-header">
              <h3 id="stockpile-picker-title">
                {releaseItemPickerSource === 'repack' ? 'Select Stockpile Inventory' : 'Select Pack to Release'}
              </h3>
              <button
                type="button"
                className="dashboard-drilldown-close-button"
                onClick={closeReleaseItemPicker}
                aria-label="Close"
              >
                x
              </button>
            </header>

            <div className="panel-body">
              <div className="stockpile-picker-toolbar">
                <input
                  type="search"
                  className="inventory-input"
                  placeholder={releaseItemPickerSource === 'repack' ? 'Search by ID, name, or category' : 'Search item name or category'}
                  value={releaseItemPickerSearch}
                  onChange={(event) => setReleaseItemPickerSearch(event.target.value)}
                />
                <select
                  className="inventory-input"
                  value={releaseItemPickerCategory}
                  onChange={(event) => setReleaseItemPickerCategory(event.target.value)}
                >
                  <option value="all">All Categories</option>
                  {releaseItemPickerCategoryOptions.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>

              <div className="dashboard-drilldown-table-wrap">
                <table className="dashboard-drilldown-table">
                  <thead>
                    <tr>
                      <th scope="col">ID</th>
                      <th scope="col">Item</th>
                      <th scope="col">Category</th>
                      <th scope="col">Unit</th>
                      <th scope="col">Available Qty</th>
                      <th scope="col">Select</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredReleasePickerItems.length === 0 ? (
                      <tr>
                        <td colSpan={6}>
                          {releaseItemPickerSource === 'repack'
                            ? 'No bulk stockpile items available. Add stockpile inventory with quantity on hand.'
                            : 'No repack packages available. Create packs using the Repack tab first.'}
                        </td>
                      </tr>
                    ) : (
                      paginatedReleasePickerItems.map((stockpileItem) => {
                        const stockpileId = String(stockpileItem.stockpile_id)
                        const displayId = formatStockpileRowId(stockpileItem)
                        const currentRowId =
                          releaseItemPickerRowIndex != null
                            ? activePickerItems[releaseItemPickerRowIndex]?.stockpileId ?? ''
                            : ''
                        const selectedInAnotherLine = selectedPickerItemIds.has(stockpileId) && stockpileId !== currentRowId

                        return (
                          <tr key={`stockpile-picker-${stockpileItem.stockpile_id}`} onClick={() => !selectedInAnotherLine && toggleReleaseItemPickerSelection(stockpileId)} style={{ cursor: selectedInAnotherLine ? 'not-allowed' : 'pointer' }}>
                            <td>{displayId}</td>
                            <td>{stockpileItem.item_name ?? 'Unnamed'}</td>
                            <td>{stockpileItem.category ?? 'Uncategorized'}</td>
                            <td>{stockpileItem.unit_of_measure ?? '—'}</td>
                            <td>{stockpileItem.quantity_on_hand ?? 0}</td>
                            <td>
                              <input
                                type="checkbox"
                                className="stockpile-picker-checkbox"
                                checked={releaseItemPickerSelectedIds.includes(stockpileId)}
                                onChange={() => toggleReleaseItemPickerSelection(stockpileId)}
                                disabled={selectedInAnotherLine}
                                aria-label={`Select ${stockpileItem.item_name ?? 'item'}`}
                              />
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>

              <div className="stockpile-picker-footer">
                <span className="stockpile-picker-selected-count">{releaseItemPickerSelectedIds.length} selected</span>

                <div className="stockpile-picker-footer-center">
                  {releaseItemPickerTotalPages > 1 && (
                    <div className="dashboard-drilldown-pagination" aria-label="Stockpile picker pagination">
                      <button
                        type="button"
                        className="dashboard-drilldown-pagination-button"
                        onClick={() => setReleaseItemPickerPage((prev) => Math.max(1, prev - 1))}
                        disabled={releaseItemPickerPage === 1}
                      >
                        Prev
                      </button>
                      {releaseItemPickerVisiblePageNumbers.map((pageNumber) => (
                        <button
                          key={`stockpile-picker-page-${pageNumber}`}
                          type="button"
                          className={`dashboard-drilldown-pagination-button ${
                            releaseItemPickerPage === pageNumber ? 'dashboard-drilldown-pagination-button-active' : ''
                          }`}
                          onClick={() => setReleaseItemPickerPage(pageNumber)}
                          aria-current={releaseItemPickerPage === pageNumber ? 'page' : undefined}
                        >
                          {pageNumber}
                        </button>
                      ))}
                      <button
                        type="button"
                        className="dashboard-drilldown-pagination-button"
                        onClick={() => setReleaseItemPickerPage((prev) => Math.min(releaseItemPickerTotalPages, prev + 1))}
                        disabled={releaseItemPickerPage === releaseItemPickerTotalPages}
                      >
                        Next
                      </button>
                    </div>
                  )}
                </div>

                <div className="stockpile-picker-footer-right">
                  <button
                    type="button"
                    className="inventory-add-submit"
                    onClick={handleApplySelectedReleaseItems}
                    disabled={releaseItemPickerSelectedIds.length === 0}
                  >
                    Done
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedPackedItem && (
        <div
          className="dashboard-drilldown-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="packed-item-contents-title"
          onClick={() => setSelectedPackedItem(null)}
        >
          <div
            className="dashboard-drilldown-modal"
            tabIndex={-1}
            onClick={(event) => event.stopPropagation()}
          >
            <header className="panel-header dashboard-drilldown-header">
              <h3 id="packed-item-contents-title">
                {selectedPackedItem.item_name ?? 'Relief Pack'} Contents
              </h3>
              <button
                type="button"
                className="dashboard-drilldown-close-button"
                onClick={() => setSelectedPackedItem(null)}
                aria-label="Close"
              >
                x
              </button>
            </header>
            <div className="panel-body">
              <p className="wmr-modal-text">
                <strong>Pack ID:</strong> {formatStockpileRowId(selectedPackedItem)}
              </p>
              {(() => {
                const contents = parseRepackContents(selectedPackedItem.item_description)

                if (!contents || contents.length === 0) {
                  return (
                    <div className="stockpile-pack-contents-editor">
                      <p className="wmr-modal-text">
                        No contents are recorded yet. Add what each pack contains.
                      </p>
                      {packedContentsError && <p className="dashboard-error">{packedContentsError}</p>}
                      <div className="dashboard-drilldown-table-wrap">
                        <table className="dashboard-drilldown-table">
                          <thead>
                            <tr>
                              <th scope="col">Item Name</th>
                              <th scope="col">Quantity per 1 Pack</th>
                              <th scope="col">Unit</th>
                              <th scope="col">Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {packedContentDraftRows.map((row, index) => (
                              <tr key={`packed-content-draft-${index}`}>
                                <td>
                                  <input
                                    type="text"
                                    className="inventory-input"
                                    value={row.name}
                                    onChange={(event) => updatePackedContentDraftRow(index, 'name', event.target.value)}
                                    placeholder="e.g. Rice"
                                    disabled={savingPackedContents}
                                  />
                                </td>
                                <td>
                                  <input
                                    type="number"
                                    min="1"
                                    className="inventory-input"
                                    value={row.quantity}
                                    onChange={(event) => updatePackedContentDraftRow(index, 'quantity', event.target.value)}
                                    placeholder="1"
                                    disabled={savingPackedContents}
                                  />
                                </td>
                                <td>
                                  <input
                                    type="text"
                                    className="inventory-input"
                                    value={row.unit}
                                    onChange={(event) => updatePackedContentDraftRow(index, 'unit', event.target.value)}
                                    placeholder="pcs"
                                    disabled={savingPackedContents}
                                  />
                                </td>
                                <td>
                                  <button
                                    type="button"
                                    className="stockpile-row-remove-link"
                                    onClick={() => removePackedContentDraftRow(index)}
                                    disabled={savingPackedContents || packedContentDraftRows.length === 1}
                                  >
                                    Remove
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <div className="stockpile-pack-contents-actions">
                        <button
                          type="button"
                          className="inventory-add-cancel"
                          onClick={addPackedContentDraftRow}
                          disabled={savingPackedContents}
                        >
                          Add Row
                        </button>
                        <button
                          type="button"
                          className="inventory-add-submit"
                          onClick={handleSavePackedContents}
                          disabled={savingPackedContents}
                        >
                          {savingPackedContents ? 'Saving...' : 'Save Contents'}
                        </button>
                      </div>
                    </div>
                  )
                }

                return (
                  <div className="dashboard-drilldown-table-wrap">
                    <table className="dashboard-drilldown-table">
                      <thead>
                        <tr>
                          <th scope="col">Item Name</th>
                          <th scope="col">Quantity per 1 Pack</th>
                        </tr>
                      </thead>
                      <tbody>
                        {contents.map((entry, index) => {
                          const unit = entry.unit?.trim()
                          const quantity = unit ? `${entry.quantity} ${unit}` : entry.quantity

                          return (
                            <tr key={`${entry.name}-${index}`}>
                              <td>{entry.name}</td>
                              <td>{quantity}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )
              })()}
            </div>
            <div style={{ borderTop: '1px solid #e5e7eb', padding: '12px 18px', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="wmr-modal-button-secondary"
                onClick={() => setSelectedPackedItem(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

export default StockpileSection
