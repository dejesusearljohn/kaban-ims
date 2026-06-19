import { useEffect, useMemo, useState, type MutableRefObject } from 'react'
import type { Tables } from '../../supabase'
import useResponsivePageSize from './useResponsivePageSize'
import { formatInventoryItemId, generateParPropertyNumber, getCategoryOptionsForInventoryKind, getInventoryLocationDisplay, getInventoryQuantityDisplay, getInventoryTypeColumnDisplay, getInventoryUnitDisplay, getMaxKindItemNo, inferCategoryFromItemName, INVENTORY_KIND_FILTER_OPTIONS, OFFICE_SUPPLY_CATEGORY_OPTIONS, PAR_CATEGORY_OPTIONS, PAR_DEFAULT_QUANTITY, PAR_DEFAULT_UNIT, previewAutoItemId, STOCKPILE_CATEGORY_OPTIONS, type InventoryKind, type InventoryKindFilter } from '../utils/itemUtils'

type InventoryRow = Tables<'inventory'>

type DepartmentOverview = {
  id: number
  name: string
  code?: string
}

type StaffOption = {
  id: string
  full_name: string
  staff_id: string
  par_no: string
  department_id: number | null
  position: string | null
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
  inventoryKindFilter: InventoryKindFilter
  setInventoryKindFilter: (kind: InventoryKindFilter) => void
  categoryFilter: string
  setCategoryFilter: (value: string) => void
  departmentFilter: string
  setDepartmentFilter: (value: string) => void
  sourceFilter: string
  setSourceFilter: (value: string) => void
  statusFilter: string
  setStatusFilter: (value: string) => void
  departments: DepartmentOverview[]
  staffOptions: StaffOption[]
  sourceOptions: string[]
  statusOptions: string[]
  inventoryLoading: boolean
  filteredInventoryItems: InventoryRow[]
  inventoryItems: InventoryRow[]
  getItemStatus: (item: InventoryRow) => string | null
  getItemPhotoUrls: (item: InventoryRow) => string[]
  formatInventoryDate: (value: string | null | undefined) => string
  openEditItem: (item: InventoryRow) => void
  openViewItem: (item: InventoryRow) => void
  setViewImageItem: (item: InventoryRow | null) => void
  setViewImageIndex: (index: number) => void
  handleQrButtonClick: (item: InventoryRow) => void
  qrGeneratingId: number | null
  editDeleting: boolean
  openArchiveConfirmation: (item: InventoryRow) => void
  formatCurrency: (value: number | null) => string
  newInventoryKind: InventoryKind
  setNewInventoryKind: (kind: InventoryKind) => void
  newItemName: string
  setNewItemName: (value: string) => void
  newItemType: string
  setNewItemType: (value: string) => void
  newItemCategory: string
  setNewItemCategory: (value: string) => void
  newItemDescription: string
  setNewItemDescription: (value: string) => void
  newCondition: string
  setNewCondition: (value: string) => void
  newDonorIdentification: string
  setNewDonorIdentification: (value: string) => void
  newItemDepartmentId: string
  setNewItemDepartmentId: (value: string) => void
  newAssignedTo: string
  setNewAssignedTo: (value: string) => void
  newRemarks: string
  setNewRemarks: (value: string) => void
  newEstimatedUsefulLife: string
  setNewEstimatedUsefulLife: (value: string) => void
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
  newDateLastRestocked: string
  setNewDateLastRestocked: (value: string) => void
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
  onExportCsv: () => void
  existingPropertyNumbers: Array<{ property_no?: string | null }>
  officeSuppliesAssignee: string
  officeSuppliesLocationLabel: string
}

const applyInferredCategory = (
  itemName: string,
  inventoryKind: InventoryKind,
  setters: {
    setNewItemType: (value: string) => void
    setNewItemCategory: (value: string) => void
  },
) => {
  const inferred = inferCategoryFromItemName(itemName, inventoryKind)
  if (!inferred) return

  if (inventoryKind === 'par') {
    setters.setNewItemType(inferred)
    return
  }

  setters.setNewItemCategory(inferred)
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
  inventoryKindFilter,
  setInventoryKindFilter,
  categoryFilter,
  setCategoryFilter,
  departmentFilter,
  setDepartmentFilter,
  sourceFilter,
  setSourceFilter,
  statusFilter,
  setStatusFilter,
  departments,
  staffOptions,
  sourceOptions,
  statusOptions,
  inventoryLoading,
  filteredInventoryItems,
  inventoryItems,
  getItemStatus,
  getItemPhotoUrls,
  formatInventoryDate,
  openEditItem,
  openViewItem,
  setViewImageItem,
  setViewImageIndex,
  handleQrButtonClick,
  qrGeneratingId,
  editDeleting,
  openArchiveConfirmation,
  formatCurrency,
  newInventoryKind,
  setNewInventoryKind,
  newItemName,
  setNewItemName,
  newItemType,
  setNewItemType,
  newItemCategory,
  setNewItemCategory,
  newItemDescription,
  setNewItemDescription,
  newCondition,
  setNewCondition,
  newDonorIdentification,
  setNewDonorIdentification,
  newItemDepartmentId,
  setNewItemDepartmentId,
  newAssignedTo,
  setNewAssignedTo,
  newRemarks,
  setNewRemarks,
  newEstimatedUsefulLife,
  setNewEstimatedUsefulLife,
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
  newDateLastRestocked,
  setNewDateLastRestocked,
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
  onExportCsv,
  existingPropertyNumbers,
  officeSuppliesAssignee,
  officeSuppliesLocationLabel,
}: InventorySectionProps) {
  const inventoryPageSize = useResponsivePageSize(5)
  const selectedSource = newSource.trim().toLowerCase()
  const isPurchased = selectedSource === 'purchased'
  const isDonated = selectedSource === 'donated'
  const isStockpile = newInventoryKind === 'stockpile'
  const isPar = newInventoryKind === 'par'
  const isOfficeSupplies = newInventoryKind === 'office_supplies'
  const [inventoryPage, setInventoryPage] = useState(1)

  const categoryFilterOptions = useMemo(() => {
    if (inventoryKindFilter === 'all') return []
    return getCategoryOptionsForInventoryKind(inventoryKindFilter)
  }, [inventoryKindFilter])

  const showCategoryFilter = inventoryKindFilter !== 'all'

  const departmentStaff = useMemo(() => {
    if (!newItemDepartmentId) return staffOptions
    return staffOptions.filter(
      (staff) => staff.department_id != null && String(staff.department_id) === newItemDepartmentId,
    )
  }, [newItemDepartmentId, staffOptions])

  const assignedToSelectValue = departmentStaff.some((staff) => staff.full_name === newAssignedTo)
    ? newAssignedTo
    : ''

  const previewId = useMemo(() => {
    if (isPar && newItemType && newItemName.trim()) {
      return generateParPropertyNumber(
        newItemType,
        newItemName,
        newDateAcquired || new Date().toISOString().split('T')[0],
        existingPropertyNumbers,
      )
    }
    if (isPar) return '—'
    return previewAutoItemId(getMaxKindItemNo(inventoryItems, newInventoryKind), newInventoryKind)
  }, [
    isPar,
    newItemType,
    newItemName,
    newDateAcquired,
    existingPropertyNumbers,
    inventoryItems,
    newInventoryKind,
  ])

  const inventoryTotalPages = Math.max(1, Math.ceil(filteredInventoryItems.length / inventoryPageSize))

  useEffect(() => {
    setInventoryPage(1)
  }, [searchQuery, inventoryKindFilter, categoryFilter, departmentFilter, sourceFilter, statusFilter, inventoryMode])

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

      <section className="section-toolbar-row" aria-label="Inventory actions">
        <div className="inventory-toolbar">
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
                aria-label="Filter by item type"
                value={inventoryKindFilter}
                onChange={(e) => {
                  const nextKind = e.target.value as InventoryKindFilter
                  setInventoryKindFilter(nextKind)
                  setCategoryFilter('all')
                }}
              >
                {INVENTORY_KIND_FILTER_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <select
                className={`inventory-filter-select inventory-filter-select-category${showCategoryFilter ? '' : ' inventory-filter-select-reserved'}`}
                aria-label="Filter by category"
                aria-hidden={!showCategoryFilter}
                tabIndex={showCategoryFilter ? 0 : -1}
                disabled={!showCategoryFilter}
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                <option value="all">All Categories</option>
                {categoryFilterOptions.map((category) => (
                  <option key={category} value={category}>
                    {category}
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

          <section className="inventory-table-section inventory-table-section-compact inventory-list-section" aria-label="Inventory table">
            <div className="inventory-table-card">
              <table className="inventory-table inventory-list-table">
                <thead>
                  <tr>
                    <th scope="col" className="inventory-id-column">ID</th>
                    <th scope="col">Name</th>
                    <th scope="col">Type</th>
                    <th scope="col">Location</th>
                    <th scope="col">Qty</th>
                    <th scope="col">Unit</th>
                    <th scope="col" className="inventory-date-column">Acquired</th>
                    <th scope="col">Status</th>
                    <th scope="col" className="inventory-condition-column">Condition</th>
                    <th scope="col" className="inventory-actions-column">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {inventoryLoading ? (
                    <tr>
                      <td colSpan={10}>Loading items…</td>
                    </tr>
                  ) : filteredInventoryItems.length === 0 ? (
                    <tr>
                      <td colSpan={10}>No items found.</td>
                    </tr>
                  ) : (
                    paginatedInventoryItems.map((item) => {
                        const paddedId = formatInventoryItemId(item)
                        const status = getItemStatus(item)
                        const locationCode = getInventoryLocationDisplay(item, departments)
                        const photoUrls = getItemPhotoUrls(item)
                        const displayQty = getInventoryQuantityDisplay(item)
                        const displayUnit = getInventoryUnitDisplay(item)

                        return (
                          <tr
                            key={item.item_id}
                            className="inventory-table-row-clickable"
                            onClick={() => openViewItem(item)}
                          >
                            <td className="inventory-id-column">{paddedId}</td>
                            <td>{item.item_name}</td>
                            <td>{getInventoryTypeColumnDisplay(item)}</td>
                            <td>{locationCode}</td>
                            <td>{displayQty}</td>
                            <td>{displayUnit}</td>
                            <td className="inventory-date-column">{formatInventoryDate(item.date_acquired)}</td>
                            <td>
                              {status ? (
                                <span
                                  className={`badge ${
                                    status === 'SERVICEABLE'
                                      ? 'badge-status-serviceable'
                                      : status === 'UNSERVICEABLE'
                                        ? 'badge-status-unserviceable'
                                        : status === 'LOW'
                                          ? 'badge-status-low'
                                          : status === 'FULL STOCK'
                                            ? 'badge-status-full-stock'
                                        : status === 'VALID'
                                          ? 'badge-status-valid'
                                          : status === 'EXPIRED'
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
                            <td className="inventory-condition-column">
                              {item.condition ? (
                                <span
                                  className={`badge ${
                                    item.condition === 'GOOD'
                                      ? 'badge-condition-good'
                                      : item.condition === 'FULLY FUNCTIONAL'
                                        ? 'badge-condition-functional'
                                        : item.condition === 'DEFECTIVE'
                                          ? 'badge-condition-defective'
                                          : ''
                                  }`}
                                  title={item.condition}
                                >
                                  {item.condition}
                                </span>
                              ) : (
                                '—'
                              )}
                            </td>
                            <td className="inventory-row-actions inventory-actions-column" onClick={(e) => e.stopPropagation()}>
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

            <div className="inventory-kind-switch" role="tablist" aria-label="Item record type">
              <button
                type="button"
                role="tab"
                aria-selected={isStockpile}
                className={`inventory-kind-switch-btn ${isStockpile ? 'inventory-kind-switch-btn-active' : ''}`}
                onClick={() => setNewInventoryKind('stockpile')}
              >
                Stockpile
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={isPar}
                className={`inventory-kind-switch-btn ${isPar ? 'inventory-kind-switch-btn-active' : ''}`}
                onClick={() => setNewInventoryKind('par')}
              >
                PAR (Property)
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={isOfficeSupplies}
                className={`inventory-kind-switch-btn ${isOfficeSupplies ? 'inventory-kind-switch-btn-active' : ''}`}
                onClick={() => setNewInventoryKind('office_supplies')}
              >
                Office Supplies
              </button>
            </div>

            <div className="inventory-add-grid">
              <div className="inventory-field">
                <label htmlFor="add-item-id-preview">
                  {isPar ? 'Property ID' : 'Item ID'}
                </label>
                <input
                  id="add-item-id-preview"
                  type="text"
                  className="inventory-input inventory-input-readonly"
                  value={previewId}
                  readOnly
                  aria-readonly="true"
                />
                {isPar && (
                  <p className="inventory-help-text">
                    Auto-generated from category, item name, year acquired, and series number.
                  </p>
                )}
              </div>

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
                  onChange={(e) => {
                    const nextName = e.target.value
                    setNewItemName(nextName)
                    applyInferredCategory(nextName, newInventoryKind, {
                      setNewItemType,
                      setNewItemCategory,
                    })
                  }}
                />
                {newItemName.trim() && (isOfficeSupplies || isStockpile) && newItemCategory && (
                  <p className="inventory-help-text">Suggested category: {newItemCategory}</p>
                )}
                {newItemName.trim() && isPar && newItemType && (
                  <p className="inventory-help-text">Suggested type: {newItemType}</p>
                )}
              </div>

              {isPar && (
                <div className="inventory-field inventory-field-full">
                  <label htmlFor="add-item-description">Item Description</label>
                  <textarea
                    id="add-item-description"
                    className="inventory-input inventory-textarea"
                    placeholder="Enter item description"
                    rows={3}
                    value={newItemDescription}
                    onChange={(e) => setNewItemDescription(e.target.value)}
                  />
                </div>
              )}

              <div className="inventory-field">
                <label htmlFor="add-item-type">
                  Item Type / Category <span className="inventory-required">*</span>
                </label>
                {isStockpile ? (
                  <select
                    id="add-item-type"
                    className="inventory-input"
                    value={newItemCategory}
                    onChange={(e) => setNewItemCategory(e.target.value)}
                  >
                    <option value="">Select category</option>
                    {STOCKPILE_CATEGORY_OPTIONS.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                ) : isOfficeSupplies ? (
                  <select
                    id="add-item-type"
                    className="inventory-input"
                    value={newItemCategory}
                    onChange={(e) => setNewItemCategory(e.target.value)}
                  >
                    <option value="">Select category</option>
                    {OFFICE_SUPPLY_CATEGORY_OPTIONS.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                ) : (
                  <select
                    id="add-item-type"
                    className="inventory-input"
                    value={newItemType}
                    onChange={(e) => setNewItemType(e.target.value)}
                  >
                    <option value="">Select item type</option>
                    {PAR_CATEGORY_OPTIONS.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {(isStockpile || isOfficeSupplies) && (
                <>
                  <div className="inventory-field">
                    <label htmlFor="add-quantity">
                      Quantity <span className="inventory-required">*</span>
                    </label>
                    <input
                      id="add-quantity"
                      type="number"
                      min="0"
                      className="inventory-input"
                      placeholder="0"
                      value={newQuantity}
                      onChange={(e) => setNewQuantity(e.target.value)}
                    />
                  </div>
                  <div className="inventory-field">
                    <label htmlFor="add-unit-of-measure">
                      Unit <span className="inventory-required">*</span>
                    </label>
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
                </>
              )}

              {isStockpile && (
                <>
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
                    <label htmlFor="add-expiration-date">Expiration Date</label>
                    <input
                      id="add-expiration-date"
                      type="date"
                      className="inventory-input"
                      value={newExpirationDate}
                      onChange={(e) => setNewExpirationDate(e.target.value)}
                    />
                  </div>
                </>
              )}

              {isPar && (
                <>
                  <div className="inventory-field">
                    <label htmlFor="add-date-acquired">
                      Date Acquired <span className="inventory-required">*</span>
                    </label>
                    <input
                      id="add-date-acquired"
                      type="date"
                      className="inventory-input"
                      value={newDateAcquired}
                      onChange={(e) => setNewDateAcquired(e.target.value)}
                    />
                  </div>
                  <div className="inventory-field">
                    <label htmlFor="add-par-qty">Quantity</label>
                    <input
                      id="add-par-qty"
                      type="text"
                      className="inventory-input inventory-input-readonly"
                      value={String(PAR_DEFAULT_QUANTITY)}
                      readOnly
                      aria-readonly="true"
                    />
                  </div>
                  <div className="inventory-field">
                    <label htmlFor="add-par-unit">Unit</label>
                    <input
                      id="add-par-unit"
                      type="text"
                      className="inventory-input inventory-input-readonly"
                      value={PAR_DEFAULT_UNIT}
                      readOnly
                      aria-readonly="true"
                    />
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
                      <option value="GOOD">GOOD</option>
                      <option value="FULLY FUNCTIONAL">FULLY FUNCTIONAL</option>
                      <option value="DEFECTIVE">DEFECTIVE</option>
                    </select>
                  </div>
                  <div className="inventory-field">
                    <label htmlFor="add-unit-cost">Cost</label>
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
                  {isPurchased && (
                    <div className="inventory-field">
                      <label htmlFor="add-total-cost">Total Cost</label>
                      <input
                        id="add-total-cost"
                        type="text"
                        className="inventory-input"
                        value={formatCurrency(newItemTotalCost)}
                        readOnly
                      />
                    </div>
                  )}
                  <div className="inventory-field">
                    <label htmlFor="add-useful-life">Est. Useful Life (years)</label>
                    <input
                      id="add-useful-life"
                      type="number"
                      min="0"
                      className="inventory-input"
                      placeholder="e.g. 5"
                      value={newEstimatedUsefulLife}
                      onChange={(e) => setNewEstimatedUsefulLife(e.target.value)}
                    />
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
                    <label htmlFor="add-assigned-to-select">Assigned To</label>
                    <select
                      id="add-assigned-to-select"
                      className="inventory-input"
                      value={assignedToSelectValue}
                      onChange={(e) => setNewAssignedTo(e.target.value)}
                      disabled={!newItemDepartmentId}
                    >
                      <option value="">
                        {newItemDepartmentId ? 'Select staff' : 'Select location first'}
                      </option>
                      {departmentStaff.map((staff) => (
                        <option key={staff.id} value={staff.full_name}>
                          {staff.full_name}
                          {staff.par_no ? ` · ${staff.par_no}` : staff.staff_id ? ` (${staff.staff_id})` : ''}
                        </option>
                      ))}
                    </select>
                    <input
                      id="add-assigned-to"
                      type="text"
                      className="inventory-input"
                      placeholder="Or type assignee name"
                      value={newAssignedTo}
                      onChange={(e) => setNewAssignedTo(e.target.value)}
                      style={{ marginTop: 8 }}
                    />
                    {newItemDepartmentId && departmentStaff.length === 0 && (
                      <p className="inventory-help-text">No staff found for this location. Type a name instead.</p>
                    )}
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
                        if (nextSource.trim().toLowerCase() !== 'donated') {
                          setNewDonorIdentification('')
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
                  {isDonated && (
                    <div className="inventory-field">
                      <label htmlFor="add-donor-identification">Donor Identification</label>
                      <input
                        id="add-donor-identification"
                        type="text"
                        className="inventory-input"
                        placeholder="e.g., Name, Company, or Contact"
                        value={newDonorIdentification}
                        onChange={(e) => setNewDonorIdentification(e.target.value)}
                      />
                    </div>
                  )}
                </>
              )}

              {isOfficeSupplies && (
                <>
                  <div className="inventory-field">
                    <label htmlFor="add-office-location">Location</label>
                    <input
                      id="add-office-location"
                      type="text"
                      className="inventory-input inventory-input-readonly"
                      value={officeSuppliesLocationLabel}
                      readOnly
                      aria-readonly="true"
                    />
                  </div>
                  <div className="inventory-field">
                    <label htmlFor="add-assigned-to-office">Assigned To</label>
                    <input
                      id="add-assigned-to-office"
                      type="text"
                      className="inventory-input inventory-input-readonly"
                      value={newAssignedTo || officeSuppliesAssignee}
                      readOnly
                      aria-readonly="true"
                    />
                  </div>
                  <div className="inventory-field">
                    <label htmlFor="add-date-restocked">Date of Last Restocked</label>
                    <input
                      id="add-date-restocked"
                      type="date"
                      className="inventory-input"
                      value={newDateLastRestocked}
                      onChange={(e) => setNewDateLastRestocked(e.target.value)}
                    />
                  </div>
                  <div className="inventory-field inventory-field-full">
                    <label htmlFor="add-remarks">Remarks</label>
                    <textarea
                      id="add-remarks"
                      className="inventory-input inventory-textarea"
                      placeholder="Optional remarks"
                      rows={2}
                      value={newRemarks}
                      onChange={(e) => setNewRemarks(e.target.value)}
                    />
                  </div>
                </>
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
