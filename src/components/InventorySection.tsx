import { useEffect, useMemo, useState, type MutableRefObject } from 'react'
import type { Tables } from '../../supabase'
import useResponsivePageSize from './useResponsivePageSize'

type InventoryRow = Tables<'inventory'>

type DepartmentOverview = {
  id: number
  name: string
}

type InventorySectionProps = {
  loading: boolean
  totalItems: number
  formatValue: (value: number) => string
  inventoryError: string | null
  inventoryMode: 'list' | 'add'
  setInventoryMode: (mode: 'list' | 'add') => void
  searchQuery: string
  setSearchQuery: (value: string) => void
  typeFilter: string
  setTypeFilter: (value: string) => void
  departmentFilter: string
  setDepartmentFilter: (value: string) => void
  sourceFilter: string
  setSourceFilter: (value: string) => void
  statusFilter: string
  setStatusFilter: (value: string) => void
  typeOptions: string[]
  departments: DepartmentOverview[]
  sourceOptions: string[]
  statusOptions: string[]
  inventoryLoading: boolean
  filteredInventoryItems: InventoryRow[]
  getItemStatus: (item: InventoryRow) => string | null
  getItemPhotoUrls: (item: InventoryRow) => string[]
  formatInventoryDate: (value: string | null | undefined) => string
  openEditItem: (item: InventoryRow) => void
  setViewImageItem: (item: InventoryRow | null) => void
  setViewImageIndex: (index: number) => void
  handleQrButtonClick: (item: InventoryRow) => void
  qrGeneratingId: number | null
  editDeleting: boolean
  openArchiveConfirmation: (item: InventoryRow) => void
  formatCurrency: (value: number | null) => string
  calculateTotalCost: (quantity: number | null, unitCost: number | null) => number | null
  newItemName: string
  setNewItemName: (value: string) => void
  newItemType: string
  setNewItemType: (value: string) => void
  newCondition: string
  setNewCondition: (value: string) => void
  newItemDepartmentId: string
  setNewItemDepartmentId: (value: string) => void
  newQuantity: string
  setNewQuantity: (value: string) => void
  newUnitOfMeasure: string
  setNewUnitOfMeasure: (value: string) => void
  newUnitCost: string
  setNewUnitCost: (value: string) => void
  newDateAcquired: string
  setNewDateAcquired: (value: string) => void
  newExpirationDate: string
  setNewExpirationDate: (value: string) => void
  newSource: string
  setNewSource: (value: string) => void
  newPhotoFiles: File[]
  setNewPhotoFiles: (files: File[]) => void
  addPhotoInputRef: MutableRefObject<HTMLInputElement | null>
  addingItem: boolean
  handleAddItem: () => void
  unitOfMeasureOptions: string[]
  acquisitionModeOptions: string[]
  newItemTotalCost: number | null
}

function InventorySection({
  loading,
  totalItems,
  formatValue,
  inventoryError,
  inventoryMode,
  setInventoryMode,
  searchQuery,
  setSearchQuery,
  typeFilter,
  setTypeFilter,
  departmentFilter,
  setDepartmentFilter,
  sourceFilter,
  setSourceFilter,
  statusFilter,
  setStatusFilter,
  typeOptions,
  departments,
  sourceOptions,
  statusOptions,
  inventoryLoading,
  filteredInventoryItems,
  getItemStatus,
  getItemPhotoUrls,
  formatInventoryDate,
  openEditItem,
  setViewImageItem,
  setViewImageIndex,
  handleQrButtonClick,
  qrGeneratingId,
  editDeleting,
  openArchiveConfirmation,
  formatCurrency,
  calculateTotalCost,
  newItemName,
  setNewItemName,
  newItemType,
  setNewItemType,
  newCondition,
  setNewCondition,
  newItemDepartmentId,
  setNewItemDepartmentId,
  newQuantity,
  setNewQuantity,
  newUnitOfMeasure,
  setNewUnitOfMeasure,
  newUnitCost,
  setNewUnitCost,
  newDateAcquired,
  setNewDateAcquired,
  newExpirationDate,
  setNewExpirationDate,
  newSource,
  setNewSource,
  newPhotoFiles,
  setNewPhotoFiles,
  addPhotoInputRef,
  addingItem,
  handleAddItem,
  unitOfMeasureOptions,
  acquisitionModeOptions,
  newItemTotalCost,
}: InventorySectionProps) {
  const inventoryPageSize = useResponsivePageSize(5)
  const selectedSource = newSource.trim().toLowerCase()
  const isPurchased = selectedSource === 'purchased'
  const isDonated = selectedSource === 'donated'
  const isStockpileType = newItemType.trim().toLowerCase() === 'stockpile'
  const [inventoryPage, setInventoryPage] = useState(1)

  const inventoryTotalPages = Math.max(1, Math.ceil(filteredInventoryItems.length / inventoryPageSize))

  useEffect(() => {
    setInventoryPage(1)
  }, [searchQuery, typeFilter, departmentFilter, sourceFilter, statusFilter, inventoryMode])

  useEffect(() => {
    if (inventoryPage > inventoryTotalPages) {
      setInventoryPage(inventoryTotalPages)
    }
  }, [inventoryPage, inventoryTotalPages])

  const paginatedInventoryItems = useMemo(() => {
    const start = (inventoryPage - 1) * inventoryPageSize
    return filteredInventoryItems.slice(start, start + inventoryPageSize)
  }, [filteredInventoryItems, inventoryPage, inventoryPageSize])

  const visibleInventoryPageNumbers = useMemo(() => {
    const maxVisiblePages = 5
    if (inventoryTotalPages <= maxVisiblePages) {
      return Array.from({ length: inventoryTotalPages }, (_, index) => index + 1)
    }

    const halfWindow = Math.floor(maxVisiblePages / 2)
    let start = Math.max(1, inventoryPage - halfWindow)
    let end = Math.min(inventoryTotalPages, start + maxVisiblePages - 1)

    if (end - start + 1 < maxVisiblePages) {
      start = Math.max(1, end - maxVisiblePages + 1)
    }

    return Array.from({ length: end - start + 1 }, (_, index) => start + index)
  }, [inventoryPage, inventoryTotalPages])

  return (
    <div className="inventory-layout">
      <header className="dashboard-header">
        <div>
          <h2>Inventory</h2>
          <p>{loading ? 'Loading items…' : `${formatValue(totalItems)} total items registered`}</p>
        </div>
      </header>

      {inventoryError && <p className="dashboard-error">{inventoryError}</p>}

      <section className="inventory-toolbar" aria-label="Inventory actions">
        <button
          type="button"
          className={inventoryMode === 'list' ? 'inventory-primary-button' : 'inventory-secondary-button'}
          onClick={() => setInventoryMode('list')}
        >
          Manage Items
        </button>
        <button
          type="button"
          className={inventoryMode === 'add' ? 'inventory-primary-button' : 'inventory-secondary-button'}
          onClick={() => setInventoryMode('add')}
        >
          Add Item
        </button>
      </section>

      {inventoryMode === 'list' && (
        <>
          <section className="inventory-filters" aria-label="Inventory filters">
            <div className="inventory-search-wrapper">
              <input
                type="search"
                className="inventory-search-input"
                placeholder="Search by name or ID…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="inventory-filter-selects">
              <select
                className="inventory-filter-select"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
              >
                <option value="all">All Types</option>
                {typeOptions.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
              <select
                className="inventory-filter-select"
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
              >
                <option value="all">All Departments</option>
                {departments.map((dept) => (
                  <option key={dept.id} value={String(dept.id)}>
                    {dept.name}
                  </option>
                ))}
              </select>
              <select
                className="inventory-filter-select"
                value={sourceFilter}
                onChange={(e) => setSourceFilter(e.target.value)}
              >
                <option value="all">All Sources</option>
                {sourceOptions.map((source) => (
                  <option key={source} value={source}>
                    {source}
                  </option>
                ))}
              </select>
              <select
                className="inventory-filter-select"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All Status</option>
                {statusOptions.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>
          </section>

          <section className="inventory-table-section inventory-table-section-compact" aria-label="Inventory table">
            <div className="inventory-table-card">
              <table className="inventory-table inventory-list-table">
                <thead>
                  <tr>
                    <th scope="col">ID</th>
                    <th scope="col">Name</th>
                    <th scope="col">Type</th>
                    <th scope="col">Location</th>
                    <th scope="col">Qty</th>
                    <th scope="col">Unit</th>
                    <th scope="col">Unit Cost</th>
                    <th scope="col">Total Cost</th>
                    <th scope="col" className="inventory-date-column">Acquired</th>
                    <th scope="col" className="inventory-date-column">Expiration</th>
                    <th scope="col">Source</th>
                    <th scope="col">Status</th>
                    <th scope="col">Condition</th>
                    <th scope="col">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {inventoryLoading ? (
                    <tr>
                      <td colSpan={14}>Loading items…</td>
                    </tr>
                  ) : filteredInventoryItems.length === 0 ? (
                    <tr>
                      <td colSpan={14}>No items found.</td>
                    </tr>
                  ) : (
                    paginatedInventoryItems.map((item) => {
                        const paddedId = `ITEM-${item.item_id.toString().padStart(3, '0')}`
                        const acquisitionMode = item.acquisition_mode?.trim() || null
                        const status = getItemStatus(item)
                        const locationName = departments.find((dept) => dept.id === item.department_id)?.name ?? 'Unassigned'
                        const photoUrls = getItemPhotoUrls(item)

                        return (
                          <tr key={item.item_id}>
                            <td>{paddedId}</td>
                            <td>{item.item_name}</td>
                            <td>{item.item_type}</td>
                            <td>{locationName}</td>
                            <td>{item.quantity ?? '—'}</td>
                            <td>{item.unit_of_measure ?? '—'}</td>
                            <td>{formatCurrency(item.unit_cost)}</td>
                            <td>{formatCurrency(calculateTotalCost(item.quantity, item.unit_cost))}</td>
                            <td className="inventory-date-column">{formatInventoryDate(item.date_acquired)}</td>
                            <td className="inventory-date-column">{formatInventoryDate(item.expiration_date)}</td>
                            <td>
                              {acquisitionMode ? (
                                <span
                                  className={`badge ${
                                    acquisitionMode === 'Purchased'
                                      ? 'badge-source-purchased'
                                      : acquisitionMode === 'Donated'
                                        ? 'badge-source-donated'
                                        : ''
                                  }`}
                                >
                                  {acquisitionMode}
                                </span>
                              ) : (
                                '—'
                              )}
                            </td>
                            <td>
                              {status ? (
                                <span
                                  className={`badge ${
                                    status === 'Serviceable'
                                      ? 'badge-status-serviceable'
                                      : status === 'Unserviceable'
                                        ? 'badge-status-unserviceable'
                                        : status === 'Valid'
                                          ? 'badge-status-valid'
                                          : status === 'Expired'
                                            ? 'badge-status-expired'
                                        : ''
                                  }`}
                                >
                                  {status}
                                </span>
                              ) : (
                                '—'
                              )}
                            </td>
                            <td>
                              {item.condition ? (
                                <span
                                  className={`badge ${
                                    item.condition === 'Good'
                                      ? 'badge-condition-good'
                                      : item.condition === 'Fully Functional'
                                        ? 'badge-condition-functional'
                                        : item.condition === 'Defective'
                                          ? 'badge-condition-defective'
                                          : ''
                                  }`}
                                >
                                  {item.condition}
                                </span>
                              ) : (
                                '—'
                              )}
                            </td>
                            <td className="inventory-row-actions">
                              <div className="inventory-actions-grid">
                                <button
                                  type="button"
                                  aria-label="Edit item"
                                  title="Edit item"
                                  className="inventory-icon-button"
                                  onClick={() => openEditItem(item)}
                                >
                                  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                                    <path
                                      d="M5 19l2-0.3 9.1-9.1-1.7-1.7L5.3 17 5 19z"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="1.6"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    />
                                    <path
                                      d="M14.8 6l1.8-1.8a1.4 1.4 0 012 2L18 8"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="1.6"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    />
                                  </svg>
                                </button>
                                <button
                                  type="button"
                                  aria-label="View item photo"
                                  title="View item photo"
                                  className="inventory-icon-button"
                                  disabled={photoUrls.length === 0}
                                  onClick={() => {
                                    if (photoUrls.length > 0) {
                                      setViewImageItem(item)
                                      setViewImageIndex(0)
                                    }
                                  }}
                                >
                                  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                                    <rect
                                      x="4"
                                      y="5"
                                      width="16"
                                      height="14"
                                      rx="2"
                                      ry="2"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="1.6"
                                    />
                                    <circle
                                      cx="10"
                                      cy="10"
                                      r="1.7"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="1.4"
                                    />
                                    <path
                                      d="M6 17l3.5-3.5 2.5 2.5 3-3 3 4"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="1.6"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    />
                                  </svg>
                                </button>
                                <button
                                  type="button"
                                  aria-label="View item QR code"
                                  title="View item QR code"
                                  className="inventory-icon-button"
                                  disabled={qrGeneratingId === item.item_id}
                                  onClick={() => {
                                    void handleQrButtonClick(item)
                                  }}
                                >
                                  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                                    <rect
                                      x="4"
                                      y="4"
                                      width="6"
                                      height="6"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="1.6"
                                    />
                                    <rect
                                      x="14"
                                      y="4"
                                      width="6"
                                      height="6"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="1.6"
                                    />
                                    <rect
                                      x="4"
                                      y="14"
                                      width="6"
                                      height="6"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="1.6"
                                    />
                                    <path d="M14 14h2v2h-2zM18 14h2v2h-2zM16 18h2v2h-2z" fill="currentColor" />
                                  </svg>
                                </button>
                                <button
                                  type="button"
                                  aria-label="Archive item"
                                  title="Archive item"
                                  className="inventory-icon-button"
                                  disabled={editDeleting}
                                  onClick={() => {
                                    openArchiveConfirmation(item)
                                  }}
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

          {!inventoryLoading && inventoryTotalPages > 1 && (
            <div className="inventory-pagination" aria-label="Inventory pagination">
              <div className="inventory-pagination-controls">
                <button
                  type="button"
                  className="inventory-pagination-button inventory-pagination-circle"
                  onClick={() => setInventoryPage((prev) => Math.max(1, prev - 1))}
                  disabled={inventoryPage === 1}
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

                {visibleInventoryPageNumbers.map((pageNumber) => (
                  <button
                    key={pageNumber}
                    type="button"
                    className={`inventory-pagination-button inventory-pagination-circle ${
                      pageNumber === inventoryPage ? 'inventory-pagination-circle-active' : ''
                    }`}
                    onClick={() => setInventoryPage(pageNumber)}
                    aria-label={`Page ${pageNumber}`}
                    aria-current={pageNumber === inventoryPage ? 'page' : undefined}
                  >
                    {pageNumber}
                  </button>
                ))}

                <button
                  type="button"
                  className="inventory-pagination-button inventory-pagination-circle"
                  onClick={() => setInventoryPage((prev) => Math.min(inventoryTotalPages, prev + 1))}
                  disabled={inventoryPage === inventoryTotalPages}
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

      {inventoryMode === 'add' && (
        <section className="inventory-add-section" aria-label="Add new item">
          <div className="inventory-add-card">
            <h3 className="inventory-add-title">Add New Item</h3>
            <div className="inventory-add-grid">
              <div className="inventory-field">
                <label htmlFor="add-item-name">
                  Item Name <span className="inventory-required">*</span>
                </label>
                <input
                  id="add-item-name"
                  type="text"
                  className="inventory-input"
                  placeholder="Enter item name"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                />
              </div>
              <div className="inventory-field">
                <label htmlFor="add-item-type">
                  Item Type <span className="inventory-required">*</span>
                </label>
                <select
                  id="add-item-type"
                  className="inventory-input"
                  value={newItemType}
                  onChange={(e) => setNewItemType(e.target.value)}
                >
                  <option value="">Select item type</option>
                  {typeOptions.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>
              <div className="inventory-field">
                <label htmlFor="add-condition">Condition</label>
                <select
                  id="add-condition"
                  className="inventory-input"
                  value={newCondition}
                  onChange={(e) => setNewCondition(e.target.value)}
                >
                  <option value="">Select condition</option>
                  <option value="Good">Good</option>
                  <option value="Fully Functional">Fully Functional</option>
                  <option value="Defective">Defective</option>
                </select>
              </div>
              <div className="inventory-field">
                <label htmlFor="add-item-department">
                  Location <span className="inventory-required">*</span>
                </label>
                <select
                  id="add-item-department"
                  className="inventory-input"
                  value={newItemDepartmentId}
                  onChange={(e) => setNewItemDepartmentId(e.target.value)}
                >
                  <option value="">Select department</option>
                  {departments.map((dept) => (
                    <option key={dept.id} value={String(dept.id)}>
                      {dept.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="inventory-field">
                <label htmlFor="add-quantity">Quantity</label>
                <input
                  id="add-quantity"
                  type="number"
                  className="inventory-input"
                  placeholder="1"
                  value={newQuantity}
                  onChange={(e) => setNewQuantity(e.target.value)}
                />
              </div>
              <div className="inventory-field">
                <label htmlFor="add-unit-of-measure">Unit of Measure</label>
                <select
                  id="add-unit-of-measure"
                  className="inventory-input"
                  value={newUnitOfMeasure}
                  onChange={(e) => setNewUnitOfMeasure(e.target.value)}
                >
                  <option value="">Select unit</option>
                  {unitOfMeasureOptions.map((unit) => (
                    <option key={unit} value={unit}>
                      {unit}
                    </option>
                  ))}
                </select>
              </div>
                {isPurchased && (
                  <div className="inventory-field">
                    <label htmlFor="add-unit-cost">
                      Unit Cost (per 1 qty) <span className="inventory-required">*</span>
                    </label>
                    <input
                      id="add-unit-cost"
                      type="number"
                      min="0"
                      step="0.01"
                      className="inventory-input"
                      placeholder="0.00"
                      value={newUnitCost}
                      onChange={(e) => setNewUnitCost(e.target.value)}
                    />
                  </div>
                )}
                {isPurchased && (
                  <div className="inventory-field">
                    <label htmlFor="add-total-cost">Total Cost (Qty x Unit Cost)</label>
                    <input
                      id="add-total-cost"
                      type="text"
                      className="inventory-input"
                      value={formatCurrency(newItemTotalCost)}
                      readOnly
                    />
                  </div>
                )}
                {isDonated && (
                  <div className="inventory-field inventory-field-full">
                    <div className="inventory-help-text">Donated items do not require unit cost or total cost.</div>
                  </div>
                )}
              <div className="inventory-field">
                <label htmlFor="add-date-acquired">Date Acquired</label>
                <input
                  id="add-date-acquired"
                  type="date"
                  className="inventory-input"
                  value={newDateAcquired}
                  onChange={(e) => setNewDateAcquired(e.target.value)}
                />
              </div>
              <div className="inventory-field">
                <label htmlFor="add-source">Source</label>
                <select
                  id="add-source"
                  className="inventory-input"
                  value={newSource}
                  onChange={(e) => {
                    const nextSource = e.target.value
                    setNewSource(nextSource)
                    if (nextSource.trim().toLowerCase() !== 'purchased') {
                      setNewUnitCost('')
                    }
                  }}
                >
                  <option value="">Select source</option>
                  {acquisitionModeOptions.map((mode) => (
                    <option key={mode} value={mode}>
                      {mode}
                    </option>
                  ))}
                </select>
              </div>
              {isStockpileType && (
                <div className="inventory-field">
                  <label htmlFor="add-expiration-date">Expiration Date</label>
                  <input
                    id="add-expiration-date"
                    type="date"
                    className="inventory-input"
                    value={newExpirationDate}
                    onChange={(e) => setNewExpirationDate(e.target.value)}
                  />
                </div>
              )}
              <div className="inventory-field inventory-field-full">
                <span className="inventory-photo-label">Photo</span>
                <input
                  ref={addPhotoInputRef}
                  id="add-photo-input"
                  type="file"
                  accept="image/*"
                  multiple
                  capture="environment"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    const files = Array.from(e.target.files ?? [])
                    setNewPhotoFiles(files)
                  }}
                />
                <button
                  type="button"
                  className="inventory-photo-drop"
                  onClick={() => addPhotoInputRef.current?.click()}
                >
                  <span className="inventory-photo-text">
                    {newPhotoFiles.length > 0
                      ? `${newPhotoFiles.length} photo(s) selected`
                      : 'Click to capture / upload'}
                  </span>
                </button>
                {newPhotoFiles.length > 0 && (
                  <div className="inventory-photo-list">
                    {newPhotoFiles.map((file) => (
                      <span key={`${file.name}-${file.size}`} className="inventory-photo-pill">
                        {file.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="inventory-add-actions">
              <button
                type="button"
                className="inventory-add-submit"
                onClick={handleAddItem}
                disabled={addingItem}
              >
                {addingItem ? 'Adding…' : 'Add Item'}
              </button>
            </div>
          </div>
        </section>
      )}
    </div>
  )
}

export default InventorySection