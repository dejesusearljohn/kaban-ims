import { useEffect, useMemo, useRef, useState } from 'react'
import type { Tables } from '../../supabase'
import useResponsivePageSize from './useResponsivePageSize'

type StockpileRow = Tables<'stockpile'> & { status?: string | null }
type DistributionLogRow = Tables<'distribution_logs'>

type StockpileReleaseLog = {
  log: DistributionLogRow
  itemName: string
  unit: string
  quantity: number
}

type StockpileReleaseDraftItem = {
  stockpileId: string
  quantity: string
}

type StockpileSectionProps = {
  loading: boolean
  totalStockpiles: number
  formatValue: (value: number) => string
  stockpileError: string | null
  stockpileMode: 'list' | 'logs' | 'expired' | 'release'
  setStockpileMode: (mode: 'list' | 'logs' | 'expired' | 'release') => void
  openReleasePage: () => void
  stockpileLoading: boolean
  filteredStockpileItems: StockpileRow[]
  filteredExpiredStockpileItems: StockpileRow[]
  stockpileReleaseLogs: StockpileReleaseLog[]
  stockpileReleaseItems: StockpileReleaseDraftItem[]
  setStockpileReleaseIssuedToInput: (value: string) => void
  stockpileReleaseIssuedToInput: string
  setStockpileReleaseReasonInput: (value: string) => void
  stockpileReleaseReasonInput: string
  availableReleaseItems: StockpileRow[]
  addStockpileReleaseItem: () => void
  updateStockpileReleaseItem: (index: number, field: keyof StockpileReleaseDraftItem, value: string) => void
  removeStockpileReleaseItem: (index: number) => void
  closeStockpileReleasePage: () => void
  handleReleaseStockpile: () => void
  releasingStockpile: boolean
  handlePrintReleaseLogs: () => void
  formatDisplayDate: (dateString: string | null) => string
  onExportCsv: () => void
  onImportCsv: (file: File) => void | Promise<void>
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
  setStockpileReleaseIssuedToInput,
  stockpileReleaseIssuedToInput,
  setStockpileReleaseReasonInput,
  stockpileReleaseReasonInput,
  availableReleaseItems,
  addStockpileReleaseItem,
  updateStockpileReleaseItem,
  removeStockpileReleaseItem,
  closeStockpileReleasePage,
  handleReleaseStockpile,
  releasingStockpile,
  handlePrintReleaseLogs,
  formatDisplayDate,
  onExportCsv,
  onImportCsv,
}: StockpileSectionProps) {
  const stockpilePageSize = useResponsivePageSize(10)
  const [stockpilePage, setStockpilePage] = useState(1)
  const stockpileCsvInputRef = useRef<HTMLInputElement | null>(null)
  const csvMenuRef = useRef<HTMLDivElement | null>(null)
  const [csvMenuOpen, setCsvMenuOpen] = useState(false)

  const currentStockpileItems = useMemo(
    () => (stockpileMode === 'expired' ? filteredExpiredStockpileItems : filteredStockpileItems),
    [stockpileMode, filteredStockpileItems, filteredExpiredStockpileItems],
  )
  const currentStockpileRowCount = stockpileMode === 'logs' ? stockpileReleaseLogs.length : currentStockpileItems.length

  const stockpileTotalPages = Math.max(1, Math.ceil(currentStockpileRowCount / stockpilePageSize))

  useEffect(() => {
    setStockpilePage(1)
  }, [stockpileMode])

  useEffect(() => {
    if (stockpilePage > stockpileTotalPages) {
      setStockpilePage(stockpileTotalPages)
    }
  }, [stockpilePage, stockpileTotalPages])

  useEffect(() => {
    if (!csvMenuOpen) return

    const onMouseDown = (event: MouseEvent) => {
      if (!csvMenuRef.current) return
      if (csvMenuRef.current.contains(event.target as Node)) return
      setCsvMenuOpen(false)
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setCsvMenuOpen(false)
      }
    }

    window.addEventListener('mousedown', onMouseDown)
    window.addEventListener('keydown', onKeyDown)

    return () => {
      window.removeEventListener('mousedown', onMouseDown)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [csvMenuOpen])

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

  return (
    <div className="inventory-layout">
      <header className="dashboard-header">
        <div>
          <h2>Stockpile</h2>
          <p>{loading ? 'Loading stockpiles…' : `${formatValue(totalStockpiles)} total items in stock`}</p>
        </div>
      </header>

      {stockpileError && <p className="dashboard-error">{stockpileError}</p>}

      <section className="section-toolbar-row" aria-label="Stockpile actions">
        <div className="inventory-toolbar">
          <button
            type="button"
            className={stockpileMode === 'list' ? 'inventory-primary-button' : 'inventory-secondary-button'}
            onClick={() => setStockpileMode('list')}
          >
            Manage Stockpiles
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

        <div className="csv-menu" ref={csvMenuRef}>
          <button
            type="button"
            className="csv-action-button"
            onClick={() => setCsvMenuOpen((prev) => !prev)}
            aria-haspopup="menu"
            aria-expanded={csvMenuOpen}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path d="M4 6h16M4 12h16M4 18h16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span>Import/Export</span>
          </button>
          {csvMenuOpen && (
            <div className="csv-menu-panel" role="menu" aria-label="Import or export CSV">
              <button
                type="button"
                className="csv-menu-item"
                role="menuitem"
                onClick={() => {
                  setCsvMenuOpen(false)
                  onExportCsv()
                }}
              >
                Export CSV
              </button>
              <button
                type="button"
                className="csv-menu-item"
                role="menuitem"
                onClick={() => {
                  setCsvMenuOpen(false)
                  stockpileCsvInputRef.current?.click()
                }}
              >
                Import CSV
              </button>
            </div>
          )}
          <input
            ref={stockpileCsvInputRef}
            type="file"
            accept=".csv,text/csv"
            style={{ display: 'none' }}
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) {
                void onImportCsv(file)
              }
              e.currentTarget.value = ''
            }}
          />
        </div>
      </section>

      {stockpileMode === 'list' && (
        <>
          <section className="inventory-table-section" aria-label="Stockpile table">
            <div className="inventory-table-card">
              <table className="inventory-table">
                <thead>
                  <tr>
                    <th scope="col">ID</th>
                    <th scope="col">Item Name</th>
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
                      <td colSpan={7}>Loading stockpiles…</td>
                    </tr>
                  ) : filteredStockpileItems.length === 0 ? (
                    <tr>
                      <td colSpan={7}>No stockpiles found.</td>
                    </tr>
                  ) : (
                    paginatedStockpileItems.map((item) => {
                      const paddedId = `STOCK-${item.stockpile_id.toString().padStart(3, '0')}`
                      const isExpired =
                        item.expiration_date && new Date(item.expiration_date) < new Date()

                      return (
                        <tr key={item.stockpile_id}>
                          <td>{paddedId}</td>
                          <td>{item.item_name ?? '—'}</td>
                          <td>{item.category ?? '—'}</td>
                          <td>{item.quantity_on_hand ?? '—'}</td>
                          <td>{item.unit_of_measure ?? '—'}</td>
                          <td>{formatDisplayDate(item.packed_date)}</td>
                          <td>
                            <span className={isExpired ? 'badge badge-status-expired' : 'badge badge-status-valid'}>
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
                          <select
                            className="inventory-input stockpile-release-select"
                            value={item.stockpileId}
                            onChange={(e) => updateStockpileReleaseItem(index, 'stockpileId', e.target.value)}
                            disabled={releasingStockpile || availableReleaseItems.length === 0}
                          >
                            <option value="">Select stockpile item</option>
                            {availableReleaseItems.map((stockpileItem) => {
                              const stockpileIdValue = String(stockpileItem.stockpile_id)
                              const isSelectedInAnotherLine =
                                selectedReleaseItemIds.has(stockpileIdValue) && stockpileIdValue !== item.stockpileId

                              return (
                                <option
                                  key={stockpileItem.stockpile_id}
                                  value={stockpileItem.stockpile_id}
                                  disabled={isSelectedInAnotherLine}
                                >
                                  {`${stockpileItem.item_name ?? 'Unnamed'} (${stockpileItem.quantity_on_hand ?? 0} ${stockpileItem.unit_of_measure ?? ''})`}
                                </option>
                              )
                            })}
                          </select>
                        </td>
                        <td className="stockpile-release-qty-column">
                          <input
                            type="number"
                            min="1"
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
            <table className="inventory-table">
              <thead>
                <tr>
                  <th scope="col">Date</th>
                  <th scope="col">Item</th>
                  <th scope="col">Qty</th>
                  <th scope="col">Unit</th>
                  <th scope="col">Issued To</th>
                  <th scope="col">Reason</th>
                </tr>
              </thead>
              <tbody>
                {stockpileLoading ? (
                  <tr>
                    <td colSpan={6}>Loading release logs...</td>
                  </tr>
                ) : stockpileReleaseLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6}>No release logs found.</td>
                  </tr>
                ) : (
                  paginatedStockpileReleaseLogs.map((entry) => (
                    <tr key={entry.log.log_id}>
                      <td>{formatDisplayDate(entry.log.operation_date)}</td>
                      <td>{entry.itemName || '—'}</td>
                      <td>{entry.quantity}</td>
                      <td>{entry.unit || '—'}</td>
                      <td>{entry.log.recipient_info ?? '—'}</td>
                      <td>{entry.log.calamity_name ?? '—'}</td>
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
              <table className="inventory-table">
                <thead>
                  <tr>
                    <th scope="col">ID</th>
                    <th scope="col">Item Name</th>
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
                      const paddedId = `STOCK-${item.stockpile_id.toString().padStart(3, '0')}`
                      const isExpired =
                        item.status?.trim() === 'Expired' ||
                        (item.expiration_date && new Date(item.expiration_date) < new Date())

                      return (
                        <tr key={item.stockpile_id}>
                          <td>{paddedId}</td>
                          <td>{item.item_name ?? '—'}</td>
                          <td>{item.category ?? '—'}</td>
                          <td>{item.quantity_on_hand ?? '—'}</td>
                          <td>{item.unit_of_measure ?? '—'}</td>
                          <td>{formatDisplayDate(item.packed_date)}</td>
                          <td>
                            <span className={isExpired ? 'badge badge-status-expired' : 'badge badge-status-valid'}>
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

    </div>
  )
}

export default StockpileSection
