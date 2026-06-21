import { useEffect, useMemo, useRef, useState } from 'react'
import type { Tables } from '../../supabase'
import useResponsivePageSize from './useResponsivePageSize'
import { resolveStaffParNumber } from '../utils/itemUtils'
import { MAX_PHOTO_FILE_SIZE_LABEL, validatePhotoFileSelection } from '../utils/photoUtils'

type InventoryRow = Tables<'inventory'>
type UserRow = Tables<'users'>

export type ParDraftItem = {
  itemId: string
  quantity: string
  unit: string
  costSnapshot: number | null
  totalCost: number | null
  description: string
  propertyId: string
  photo: File | null
  photoPreview: string | null
}

type ParSummary = {
  staffId: string
  latestIssueDate: string | null
  totalQuantity: number
  itemCount: number
  records: { par_id: number; contact_snapshot: string | null }[]
  receiver: UserRow | null
}

type ParSectionProps = {
  parError: string | null
  parMode: 'manage' | 'add'
  setParMode: (mode: 'manage' | 'add') => void
  parItemId: string
  setParItemId: (value: string) => void
  inventoryItems: InventoryRow[]
  parIssuedToId: string
  setParIssuedToId: (value: string) => void
  parUsers: UserRow[]
  parQuantityIssued: string
  setParQuantityIssued: (value: string) => void
  parIssueDate: string
  setParIssueDate: (value: string) => void
  parUnitInput: string
  setParUnitInput: (value: string) => void
  unitOfMeasureOptions: string[]
  parPropertyNoInput: string
  setParPropertyNoInput: (value: string) => void
  parDateAcquiredInput: string
  setParDateAcquiredInput: (value: string) => void
  parCostInput: string
  setParCostInput: (value: string) => void
  parLineTotal: number | null
  formatCurrency: (value: number | null) => string
  parDescriptionInput: string
  setParDescriptionInput: (value: string) => void
  handleCreateParRecord: () => void
  handleCreateParRecordsBatch: (items: ParDraftItem[], issuedToId: string, issueDate: string) => Promise<void>
  parSaving: boolean
  parSearchQuery: string
  setParSearchQuery: (value: string) => void
  parLoading: boolean
  filteredParSummaries: ParSummary[]
  setActiveParStaffId: (staffId: string | null) => void
  handleArchiveParSummary: (staffId: string) => void
  onExportCsv: () => void
}

function ParSection({
  parError,
  parMode,
  setParMode,
  inventoryItems,
  parUsers,
  unitOfMeasureOptions,
  formatCurrency,
  handleCreateParRecordsBatch,
  parSaving,
  parSearchQuery,
  setParSearchQuery,
  parLoading,
  filteredParSummaries,
  setActiveParStaffId,
  handleArchiveParSummary,
  onExportCsv,
}: ParSectionProps) {
  const parPageSize = useResponsivePageSize(10)
  const [parPage, setParPage] = useState(1)

  const emptyDraftItem = (): ParDraftItem => ({
    itemId: '',
    quantity: '1',
    unit: '',
    costSnapshot: null,
    totalCost: null,
    description: '',
    propertyId: '',
    photo: null,
    photoPreview: null,
  })

  const [parDraftItems, setParDraftItems] = useState<ParDraftItem[]>([emptyDraftItem()])
  const [localIssuedToId, setLocalIssuedToId] = useState('')
  const [localIssueDate, setLocalIssueDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [itemPickerRowIndex, setItemPickerRowIndex] = useState<number | null>(null)
  const [itemPickerSearch, setItemPickerSearch] = useState('')
  const [itemPickerCategory, setItemPickerCategory] = useState('all')
  const [draftPhotoError, setDraftPhotoError] = useState<string | null>(null)
  const [itemPickerSelectedIds, setItemPickerSelectedIds] = useState<string[]>([])
  const [itemPickerPage, setItemPickerPage] = useState(1)
  const itemPickerModalRef = useRef<HTMLDivElement | null>(null)
  const fileInputRefs = useRef<(HTMLInputElement | null)[]>([])

  const updateDraftRow = (index: number, patch: Partial<ParDraftItem>) => {
    setParDraftItems((prev) => {
      const updated = prev.map((row, i) => (i === index ? { ...row, ...patch } : row))
      return updated
    })
  }

  const handleDraftQtyChange = (index: number, qty: string) => {
    const draftItem = parDraftItems[index]
    const cost = draftItem.costSnapshot
    let qtyNum = Number(qty)
    
    // Cap quantity at available inventory
    if (draftItem.itemId) {
      const inventoryItem = inventoryItems.find((item) => String(item.item_id) === draftItem.itemId)
      const availableQty = Number(inventoryItem?.quantity ?? 0)
      if (!Number.isNaN(qtyNum) && qtyNum > availableQty) {
        qtyNum = availableQty
        qty = String(availableQty)
      }
    }
    
    const total = cost !== null && qtyNum > 0 ? cost * qtyNum : null
    updateDraftRow(index, { quantity: qty, totalCost: total })
  }

  const handleDraftPhoto = (index: number, file: File | null) => {
    if (!file) return
    const { file: acceptedFile, error } = validatePhotoFileSelection(file)
    setDraftPhotoError(error)
    if (!acceptedFile) return
    const url = URL.createObjectURL(acceptedFile)
    updateDraftRow(index, { photo: acceptedFile, photoPreview: url })
  }

  const addDraftRow = () => setParDraftItems((prev) => [...prev, emptyDraftItem()])

  const removeDraftRow = (index: number) => {
    setParDraftItems((prev) => {
      if (prev.length === 1) return [emptyDraftItem()]
      return prev.filter((_, i) => i !== index)
    })
  }

  const resetDraft = () => {
    setParDraftItems([emptyDraftItem()])
    setLocalIssuedToId('')
    setLocalIssueDate(new Date().toISOString().slice(0, 10))
    setItemPickerRowIndex(null)
    setItemPickerSearch('')
    setItemPickerCategory('all')
  }

  const closeItemPicker = () => {
    setItemPickerRowIndex(null)
    setItemPickerSearch('')
    setItemPickerCategory('all')
    setItemPickerSelectedIds([])
    setItemPickerPage(1)
  }

  const openItemPicker = (index: number) => {
    setItemPickerRowIndex(index)
    setItemPickerSearch('')
    setItemPickerCategory('all')
    setItemPickerSelectedIds([])
    setItemPickerPage(1)
  }

  const toggleItemPickerSelection = (itemId: string) => {
    setItemPickerSelectedIds((prev) => {
      if (prev.includes(itemId)) {
        return prev.filter((id) => id !== itemId)
      }

      return [...prev, itemId]
    })
  }

  const handleApplySelectedItems = () => {
    if (itemPickerRowIndex == null || itemPickerSelectedIds.length === 0) return

    const selectedItems = itemPickerSelectedIds
      .map((id) => inventoryItems.find((item) => String(item.item_id) === id) ?? null)
      .filter((item): item is InventoryRow => item != null)

    if (selectedItems.length === 0) {
      closeItemPicker()
      return
    }

    setParDraftItems((prev) => {
      if (itemPickerRowIndex == null || itemPickerRowIndex < 0 || itemPickerRowIndex >= prev.length) {
        return prev
      }

      const rows = [...prev]
      const targetRow = rows[itemPickerRowIndex]
      const targetQuantity = targetRow.quantity || '1'
      const primaryItem = selectedItems[0]
      const primaryCost = primaryItem.unit_cost ?? null
      const primaryQty = Number(targetQuantity)

      rows[itemPickerRowIndex] = {
        ...targetRow,
        itemId: String(primaryItem.item_id),
        unit: primaryItem.unit_of_measure ?? '',
        costSnapshot: primaryCost,
        totalCost: primaryCost !== null && primaryQty > 0 ? primaryCost * primaryQty : null,
        description: primaryItem.item_name ?? '',
      }

      if (selectedItems.length > 1) {
        const additionalRows = selectedItems.slice(1).map((item) => {
          const cost = item.unit_cost ?? null
          return {
            ...emptyDraftItem(),
            itemId: String(item.item_id),
            unit: item.unit_of_measure ?? '',
            costSnapshot: cost,
            totalCost: cost !== null ? cost : null,
            description: item.item_name ?? '',
          }
        })

        rows.push(...additionalRows)
      }

      return rows
    })

    closeItemPicker()
  }

  const handleSubmitPar = async () => {
    await handleCreateParRecordsBatch(parDraftItems, localIssuedToId, localIssueDate)
    resetDraft()
  }

  const parTotalPages = Math.max(1, Math.ceil(filteredParSummaries.length / parPageSize))

  useEffect(() => {
    setParPage(1)
  }, [parSearchQuery, parMode])

  useEffect(() => {
    if (parPage > parTotalPages) {
      setParPage(parTotalPages)
    }
  }, [parPage, parTotalPages])


  useEffect(() => {
    if (itemPickerRowIndex == null) return

    const frameId = window.requestAnimationFrame(() => {
      itemPickerModalRef.current?.focus()
    })

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        closeItemPicker()
      }
    }

    window.addEventListener('keydown', onKeyDown)

    return () => {
      window.cancelAnimationFrame(frameId)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [itemPickerRowIndex])

  useEffect(() => {
    if (itemPickerRowIndex == null) return
    if (itemPickerRowIndex >= parDraftItems.length) {
      closeItemPicker()
    }
  }, [itemPickerRowIndex, parDraftItems.length])

  const itemPickerCategoryOptions = useMemo(() => {
    return Array.from(
      new Set(
        inventoryItems
          .map((item) => item.item_type.trim())
          .filter((itemType) => itemType.length > 0),
      ),
    ).sort((a, b) => a.localeCompare(b))
  }, [inventoryItems])

  const filteredItemPickerItems = useMemo(() => {
    const normalizedSearch = itemPickerSearch.trim().toLowerCase()

    return inventoryItems
      .filter((item) => {
        const category = item.item_type.trim()
        if (itemPickerCategory !== 'all' && category !== itemPickerCategory) {
          return false
        }

        if (!normalizedSearch) return true

        return (
          item.item_name.toLowerCase().includes(normalizedSearch) ||
          category.toLowerCase().includes(normalizedSearch)
        )
      })
      .sort((a, b) => {
        const categoryCompare = a.item_type.localeCompare(b.item_type)
        if (categoryCompare !== 0) return categoryCompare
        return a.item_name.localeCompare(b.item_name)
      })
  }, [inventoryItems, itemPickerCategory, itemPickerSearch])

  const getDraftItemDisplayLabel = (itemId: string) => {
    if (!itemId) return 'Select item'
    const found = inventoryItems.find((item) => String(item.item_id) === itemId)
    return found ? found.item_name : 'Select item'
  }

  const itemPickerPageSize = 8
  const itemPickerTotalPages = Math.max(1, Math.ceil(filteredItemPickerItems.length / itemPickerPageSize))
  const paginatedItemPickerItems = filteredItemPickerItems.slice(
    (itemPickerPage - 1) * itemPickerPageSize,
    (itemPickerPage - 1) * itemPickerPageSize + itemPickerPageSize,
  )
  const itemPickerVisiblePageNumbers = useMemo(() => {
    const maxVisiblePages = 5
    if (itemPickerTotalPages <= maxVisiblePages) {
      return Array.from({ length: itemPickerTotalPages }, (_, index) => index + 1)
    }

    const halfWindow = Math.floor(maxVisiblePages / 2)
    let start = Math.max(1, itemPickerPage - halfWindow)
    let end = Math.min(itemPickerTotalPages, start + maxVisiblePages - 1)

    if (end - start + 1 < maxVisiblePages) {
      start = Math.max(1, end - maxVisiblePages + 1)
    }

    return Array.from({ length: end - start + 1 }, (_, index) => start + index)
  }, [itemPickerPage, itemPickerTotalPages])

  useEffect(() => {
    if (itemPickerRowIndex == null) return
    setItemPickerPage(1)
  }, [itemPickerSearch, itemPickerCategory, itemPickerRowIndex])

  useEffect(() => {
    if (itemPickerPage > itemPickerTotalPages) {
      setItemPickerPage(itemPickerTotalPages)
    }
  }, [itemPickerPage, itemPickerTotalPages])

  const paginatedParSummaries = useMemo(() => {
    const start = (parPage - 1) * parPageSize
    return filteredParSummaries.slice(start, start + parPageSize)
  }, [filteredParSummaries, parPage, parPageSize])

  const visibleParPageNumbers = useMemo(() => {
    const maxVisiblePages = 5
    if (parTotalPages <= maxVisiblePages) {
      return Array.from({ length: parTotalPages }, (_, index) => index + 1)
    }

    const halfWindow = Math.floor(maxVisiblePages / 2)
    let start = Math.max(1, parPage - halfWindow)
    let end = Math.min(parTotalPages, start + maxVisiblePages - 1)

    if (end - start + 1 < maxVisiblePages) {
      start = Math.max(1, end - maxVisiblePages + 1)
    }

    return Array.from({ length: end - start + 1 }, (_, index) => start + index)
  }, [parPage, parTotalPages])

  return (
    <div className="par-layout">
      <header className="dashboard-header">
        <div>
          <h2>Property Acknowledgment Receipt (PAR)</h2>
          <p>Record issued accountable property and track receipt history for assigned staff.</p>
        </div>
      </header>

      {parError && <p className="dashboard-error">{parError}</p>}

      <section className="section-toolbar-row" aria-label="PAR actions">
        <div className="inventory-toolbar">
          <button
            type="button"
            className={parMode === 'manage' ? 'inventory-primary-button' : 'inventory-secondary-button'}
            onClick={() => setParMode('manage')}
          >
            Manage PAR
          </button>
          <button
            type="button"
            className={parMode === 'add' ? 'inventory-primary-button' : 'inventory-secondary-button'}
            onClick={() => setParMode('add')}
          >
            Add PAR
          </button>
        </div>

        <div className="csv-menu">
          <button
            type="button"
            className="csv-action-button"
            onClick={onExportCsv}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path d="M4 6h16M4 12h16M4 18h16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span>Export CSV</span>
          </button>
        </div>
      </section>

      {parMode === 'add' && (
        <>
          {/* Top card: header fields */}
          <section className="inventory-add-section" aria-label="Add PAR header">
            <div className="inventory-add-card">
              <div className="stockpile-release-header">
                <h3 className="inventory-add-title">Create New PAR</h3>
              </div>
              <div className="inventory-add-grid">
                <div className="inventory-field">
                  <label htmlFor="par-issued-to-select">
                    Issued To <span className="inventory-required">*</span>
                  </label>
                  <select
                    id="par-issued-to-select"
                    className="inventory-input"
                    value={localIssuedToId}
                    onChange={(e) => setLocalIssuedToId(e.target.value)}
                  >
                    <option value="">Select staff</option>
                    {parUsers.map((user) => (
                      <option key={user.id} value={user.id}>
                        {`${user.full_name} (${user.staff_id})`}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="inventory-field">
                  <label htmlFor="par-issue-date">Issue Date</label>
                  <input
                    id="par-issue-date"
                    type="date"
                    className="inventory-input"
                    value={localIssueDate}
                    onChange={(e) => setLocalIssueDate(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Items table card */}
          <section className="inventory-table-section-compact" aria-label="PAR draft items">
            <div className="inventory-table-card">
              <p className="inventory-help-text">Photo maximum file size: {MAX_PHOTO_FILE_SIZE_LABEL}</p>
              {draftPhotoError && <p className="dashboard-error">{draftPhotoError}</p>}
              <div className="par-draft-table-wrap">
                <table className="inventory-table par-draft-table">
                  <thead>
                    <tr>
                      <th className="par-draft-no-col">No.</th>
                      <th className="par-draft-item-col">Item</th>
                      <th className="par-draft-qty-col">Qty</th>
                      <th className="par-draft-unit-col">Unit</th>
                      <th className="par-draft-cost-col">Unit Cost</th>
                      <th className="par-draft-total-col">Total Cost</th>
                      <th className="par-draft-desc-col">Description</th>
                      <th className="par-draft-desc-col">Property ID</th>
                      <th className="par-draft-photo-col">Photo</th>
                      <th className="par-draft-action-col">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parDraftItems.map((row, index) => (
                      <tr key={`par-draft-${index}`}>
                        <td className="par-draft-no-col stockpile-release-line-number">{index + 1}</td>
                        <td className="par-draft-item-col">
                          <button
                            type="button"
                            className={`par-item-picker-button ${row.itemId ? 'par-item-picker-button-selected' : ''}`}
                            onClick={() => openItemPicker(index)}
                          >
                            <span className="par-item-picker-button-label">{getDraftItemDisplayLabel(row.itemId)}</span>
                          </button>
                        </td>
                        <td className="par-draft-qty-col">
                          <input
                            type="number"
                            min="1"
                            max={row.itemId ? Number(inventoryItems.find((item) => String(item.item_id) === row.itemId)?.quantity ?? 0) : undefined}
                            className="inventory-input par-draft-qty-input"
                            value={row.quantity}
                            onChange={(e) => handleDraftQtyChange(index, e.target.value)}
                            placeholder="Qty"
                          />
                        </td>
                        <td className="par-draft-unit-col">
                          <select
                            className="inventory-input par-draft-select"
                            value={row.unit}
                            onChange={(e) => updateDraftRow(index, { unit: e.target.value })}
                          >
                            <option value="">—</option>
                            {unitOfMeasureOptions.map((u) => (
                              <option key={u} value={u}>{u}</option>
                            ))}
                          </select>
                        </td>
                        <td className="par-draft-cost-col par-draft-readonly">
                          {row.costSnapshot !== null ? formatCurrency(row.costSnapshot) : '—'}
                        </td>
                        <td className="par-draft-total-col par-draft-readonly">
                          {row.totalCost !== null ? formatCurrency(row.totalCost) : '—'}
                        </td>
                        <td className="par-draft-desc-col">
                          <input
                            type="text"
                            className="inventory-input par-draft-desc-input"
                            value={row.description}
                            onChange={(e) => updateDraftRow(index, { description: e.target.value })}
                            placeholder="Description"
                          />
                        </td>
                        <td className="par-draft-desc-col">
                          <input
                            type="text"
                            className="inventory-input par-draft-desc-input"
                            value={row.propertyId}
                            onChange={(e) => updateDraftRow(index, { propertyId: e.target.value })}
                            placeholder="Property ID"
                          />
                        </td>
                        <td className="par-draft-photo-col">
                          <input
                            type="file"
                            accept="image/*"
                            style={{ display: 'none' }}
                            ref={(el) => { fileInputRefs.current[index] = el }}
                            onChange={(e) => {
                              handleDraftPhoto(index, e.target.files?.[0] ?? null)
                              if (e.target.files?.[0] && !validatePhotoFileSelection(e.target.files[0]).file) {
                                e.target.value = ''
                              }
                            }}
                          />
                          {row.photoPreview ? (
                            <img
                              src={row.photoPreview}
                              alt="preview"
                              className="par-draft-photo-preview"
                              onClick={() => fileInputRefs.current[index]?.click()}
                            />
                          ) : (
                            <button
                              type="button"
                              className="par-draft-photo-button"
                              onClick={() => fileInputRefs.current[index]?.click()}
                            >
                              + Photo
                            </button>
                          )}
                        </td>
                        <td className="par-draft-action-col stockpile-release-action-cell">
                          <button
                            type="button"
                            className="stockpile-row-remove-link"
                            onClick={() => removeDraftRow(index)}
                            aria-label="Remove row"
                          >
                            ×
                          </button>
                        </td>
                      </tr>
                    ))}
                    <tr className="stockpile-release-add-row">
                      <td colSpan={10}>
                        <button
                          type="button"
                          className="stockpile-release-add-button"
                          onClick={addDraftRow}
                        >
                          <span className="stockpile-release-add-icon">+</span>
                          <span>Add Item</span>
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {/* Actions row */}
          <div className="stockpile-release-actions">
            <button
              type="button"
              className="inventory-secondary-button"
              onClick={resetDraft}
              disabled={parSaving}
            >
              Cancel
            </button>
            <button
              type="button"
              className="inventory-add-submit"
              onClick={handleSubmitPar}
              disabled={parSaving}
            >
              {parSaving ? 'Saving…' : 'Submit PAR'}
            </button>
          </div>
        </>
      )}

      {parMode === 'manage' && (
        <section className="par-table-toolbar" aria-label="PAR search">
          <div className="inventory-search-wrapper">
            <input
              type="search"
              className="inventory-search-input"
              placeholder="Search by PAR number, item, type, or recipient…"
              value={parSearchQuery}
              onChange={(e) => setParSearchQuery(e.target.value)}
            />
          </div>
        </section>
      )}

      {parMode === 'manage' && (
        <>
          <section className="inventory-table-section" aria-label="PAR records table">
            <div className="inventory-table-card">
              <table className="inventory-table">
                <thead>
                  <tr>
                    <th scope="col">PAR No.</th>
                    <th scope="col">Issued To</th>
                    <th scope="col">Last Updated</th>
                    <th scope="col">Items</th>
                    <th scope="col">Total Quantity</th>
                    <th scope="col">Contact</th>
                    <th scope="col">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {parLoading ? (
                    <tr>
                      <td colSpan={7}>Loading PAR records…</td>
                    </tr>
                  ) : filteredParSummaries.length === 0 ? (
                    <tr>
                      <td colSpan={7}>No PAR records found.</td>
                    </tr>
                  ) : (
                    paginatedParSummaries.map((summary) => {
                      const parId = resolveStaffParNumber(summary.receiver) || `PAR-${summary.staffId.slice(0, 8)}`

                      return (
                        <tr key={summary.staffId}>
                          <td>{parId}</td>
                          <td>
                            {summary.receiver
                              ? `${summary.receiver.full_name} (${summary.receiver.staff_id})`
                              : summary.staffId}
                          </td>
                          <td>{summary.latestIssueDate ?? '—'}</td>
                          <td>{summary.itemCount ?? summary.records.length}</td>
                          <td>{summary.totalQuantity}</td>
                          <td>{summary.receiver?.contact_info ?? summary.records[0]?.contact_snapshot ?? '—'}</td>
                          <td className="inventory-row-actions inventory-row-actions-left">
                            <div className="inventory-actions-grid">
                              <button
                                type="button"
                                aria-label="View PAR"
                                title="View PAR"
                                className="inventory-icon-button"
                                onClick={() => setActiveParStaffId(summary.staffId)}
                              >
                                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                                  <path
                                    d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6z"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="1.6"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  />
                                  <circle cx="12" cy="12" r="2.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
                                </svg>
                              </button>
                              <button
                                type="button"
                                aria-label="Archive PAR"
                                title="Archive PAR"
                                className="inventory-icon-button"
                                onClick={() => handleArchiveParSummary(summary.staffId)}
                              >
                                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                                  <path
                                    d="M4 6h16v4H4z"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="1.6"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  />
                                  <path
                                    d="M6 10h12v9H6z"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="1.6"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  />
                                  <path
                                    d="M9 13h6M12 13v4"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="1.4"
                                    strokeLinecap="round"
                                  />
                                </svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {!parLoading && parTotalPages > 1 && (
            <div className="inventory-pagination" aria-label="PAR pagination">
              <div className="inventory-pagination-controls">
                <button
                  type="button"
                  className="inventory-pagination-button inventory-pagination-circle"
                  onClick={() => setParPage((prev) => Math.max(1, prev - 1))}
                  disabled={parPage === 1}
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

                {visibleParPageNumbers.map((pageNumber) => (
                  <button
                    key={pageNumber}
                    type="button"
                    className={`inventory-pagination-button inventory-pagination-circle ${
                      pageNumber === parPage ? 'inventory-pagination-circle-active' : ''
                    }`}
                    onClick={() => setParPage(pageNumber)}
                    aria-label={`Page ${pageNumber}`}
                    aria-current={pageNumber === parPage ? 'page' : undefined}
                  >
                    {pageNumber}
                  </button>
                ))}

                <button
                  type="button"
                  className="inventory-pagination-button inventory-pagination-circle"
                  onClick={() => setParPage((prev) => Math.min(parTotalPages, prev + 1))}
                  disabled={parPage === parTotalPages}
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

      {itemPickerRowIndex != null && (
        <div
          className="par-item-picker-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="par-item-picker-title"
          onClick={closeItemPicker}
        >
          <div
            ref={itemPickerModalRef}
            className="par-item-picker-modal"
            tabIndex={-1}
            onClick={(event) => event.stopPropagation()}
          >
            <header className="panel-header dashboard-drilldown-header">
              <h3 id="par-item-picker-title">Select PAR Item</h3>
              <button
                type="button"
                className="dashboard-drilldown-close-button"
                onClick={closeItemPicker}
                aria-label="Close"
              >
                x
              </button>
            </header>

            <div className="panel-body">
              <div className="par-item-picker-toolbar">
                <input
                  type="search"
                  className="inventory-input"
                  placeholder="Search item name or category"
                  value={itemPickerSearch}
                  onChange={(event) => setItemPickerSearch(event.target.value)}
                />
                <select
                  className="inventory-input"
                  value={itemPickerCategory}
                  onChange={(event) => setItemPickerCategory(event.target.value)}
                >
                  <option value="all">All Categories</option>
                  {itemPickerCategoryOptions.map((category) => (
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
                      <th scope="col">Item</th>
                      <th scope="col">Category</th>
                      <th scope="col">Unit</th>
                      <th scope="col">Available Qty</th>
                      <th scope="col">Select</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredItemPickerItems.length === 0 ? (
                      <tr>
                        <td colSpan={5}>No items match your search/category filter.</td>
                      </tr>
                    ) : (
                      paginatedItemPickerItems.map((item) => (
                        <tr key={`par-item-picker-${item.item_id}`} onClick={() => toggleItemPickerSelection(String(item.item_id))} style={{ cursor: 'pointer' }}>
                          <td>{item.item_name}</td>
                          <td>{item.item_type}</td>
                          <td>{item.unit_of_measure ?? '—'}</td>
                          <td>{item.quantity ?? 0}</td>
                          <td>
                            <input
                              type="checkbox"
                              className="par-item-picker-checkbox"
                              checked={itemPickerSelectedIds.includes(String(item.item_id))}
                              onChange={() => toggleItemPickerSelection(String(item.item_id))}
                              aria-label={`Select ${item.item_name}`}
                            />
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="par-item-picker-footer">
                <span className="par-item-picker-selected-count">{itemPickerSelectedIds.length} selected</span>

                <div className="par-item-picker-footer-center">
                  {itemPickerTotalPages > 1 && (
                    <div className="dashboard-drilldown-pagination" aria-label="PAR item picker pagination">
                      <button
                        type="button"
                        className="dashboard-drilldown-pagination-button"
                        onClick={() => setItemPickerPage((prev) => Math.max(1, prev - 1))}
                        disabled={itemPickerPage === 1}
                      >
                        Prev
                      </button>
                      {itemPickerVisiblePageNumbers.map((pageNumber) => (
                        <button
                          key={`par-item-picker-page-${pageNumber}`}
                          type="button"
                          className={`dashboard-drilldown-pagination-button ${
                            itemPickerPage === pageNumber ? 'dashboard-drilldown-pagination-button-active' : ''
                          }`}
                          onClick={() => setItemPickerPage(pageNumber)}
                          aria-current={itemPickerPage === pageNumber ? 'page' : undefined}
                        >
                          {pageNumber}
                        </button>
                      ))}
                      <button
                        type="button"
                        className="dashboard-drilldown-pagination-button"
                        onClick={() => setItemPickerPage((prev) => Math.min(itemPickerTotalPages, prev + 1))}
                        disabled={itemPickerPage === itemPickerTotalPages}
                      >
                        Next
                      </button>
                    </div>
                  )}
                </div>

                <div className="par-item-picker-footer-right">
                  <button
                    type="button"
                    className="inventory-add-submit"
                    onClick={handleApplySelectedItems}
                    disabled={itemPickerSelectedIds.length === 0}
                  >
                    Done
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ParSection
