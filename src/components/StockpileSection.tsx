import type { Tables } from '../../supabase'

type StockpileRow = Tables<'stockpile'>
type DistributionLogRow = Tables<'distribution_logs'>

type StockpileReleaseLog = {
  log: DistributionLogRow
  itemName: string
  unit: string
  quantity: number
}

type StockpileSectionProps = {
  loading: boolean
  totalStockpiles: number
  formatValue: (value: number) => string
  stockpileError: string | null
  stockpileMode: 'list' | 'add'
  setStockpileMode: (mode: 'list' | 'add') => void
  searchQuery: string
  setSearchQuery: (value: string) => void
  categoryFilter: string
  setCategoryFilter: (value: string) => void
  categoryOptions: string[]
  stockpileLoading: boolean
  filteredStockpileItems: StockpileRow[]
  stockpileReleaseLogs: StockpileReleaseLog[]
  openReleaseModal: () => void
  handlePrintReleaseLogs: () => void
  formatDisplayDate: (dateString: string | null) => string
  newItemName: string
  setNewItemName: (value: string) => void
  newCategory: string
  setNewCategory: (value: string) => void
  newQuantity: string
  setNewQuantity: (value: string) => void
  newUnitOfMeasure: string
  setNewUnitOfMeasure: (value: string) => void
  newPackedDate: string
  setNewPackedDate: (value: string) => void
  newExpirationDate: string
  setNewExpirationDate: (value: string) => void
  addingStockpile: boolean
  handleAddStockpile: () => void
  unitOfMeasureOptions: string[]
}

function StockpileSection({
  loading,
  totalStockpiles,
  formatValue,
  stockpileError,
  stockpileMode,
  setStockpileMode,
  searchQuery,
  setSearchQuery,
  categoryFilter,
  setCategoryFilter,
  categoryOptions,
  stockpileLoading,
  filteredStockpileItems,
  stockpileReleaseLogs,
  openReleaseModal,
  handlePrintReleaseLogs,
  formatDisplayDate,
  newItemName,
  setNewItemName,
  newCategory,
  setNewCategory,
  newQuantity,
  setNewQuantity,
  newUnitOfMeasure,
  setNewUnitOfMeasure,
  newPackedDate,
  setNewPackedDate,
  newExpirationDate,
  setNewExpirationDate,
  addingStockpile,
  handleAddStockpile,
  unitOfMeasureOptions,
}: StockpileSectionProps) {
  return (
    <div className="inventory-layout">
      <header className="dashboard-header">
        <div>
          <h2>Stockpile</h2>
          <p>{loading ? 'Loading stockpiles…' : `${formatValue(totalStockpiles)} total items in stock`}</p>
        </div>
      </header>

      {stockpileError && <p className="dashboard-error">{stockpileError}</p>}

      <section className="inventory-toolbar" aria-label="Stockpile actions">
        <button
          type="button"
          className={stockpileMode === 'list' ? 'inventory-primary-button' : 'inventory-secondary-button'}
          onClick={() => setStockpileMode('list')}
        >
          Manage Stockpiles
        </button>
        <button
          type="button"
          className={stockpileMode === 'add' ? 'inventory-primary-button' : 'inventory-secondary-button'}
          onClick={() => setStockpileMode('add')}
        >
          <span className="inventory-add-plus" aria-hidden="true">
            +
          </span>
          Add Stockpile
        </button>
      </section>

      {stockpileMode === 'list' && (
        <>
          <section className="inventory-filters" aria-label="Stockpile filters">
            <div className="inventory-search-wrapper">
              <input
                type="search"
                className="inventory-search-input"
                placeholder="Search by item name…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="inventory-filter-selects">
              <select
                className="inventory-filter-select"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                <option value="all">All Categories</option>
                {categoryOptions.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="inventory-primary-button"
                onClick={openReleaseModal}
              >
                Stockpile Release
              </button>
            </div>
          </section>

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
                    filteredStockpileItems.map((item) => {
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
                            <span className={isExpired ? 'badge badge-status-unserviceable' : ''}>
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

          <section className="inventory-table-section" aria-label="Stockpile release logs">
            <div className="inventory-table-card">
              <div className="inventory-table-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 className="inventory-add-title" style={{ margin: 0 }}>Release Logs</h3>
                <button
                  type="button"
                  className="inventory-secondary-button"
                  onClick={handlePrintReleaseLogs}
                >
                  Print Release Logs
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
                    stockpileReleaseLogs.map((entry) => (
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
        </>
      )}

      {stockpileMode === 'add' && (
        <section className="inventory-add-section" aria-label="Add new stockpile">
          <div className="inventory-add-card">
            <h3 className="inventory-add-title">Add New Stockpile</h3>
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
                <label htmlFor="add-category">
                  Category <span className="inventory-required">*</span>
                </label>
                <select
                  id="add-category"
                  className="inventory-input"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                >
                  <option value="">Select category</option>
                  {categoryOptions.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>
              <div className="inventory-field">
                <label htmlFor="add-quantity">
                  Quantity <span className="inventory-required">*</span>
                </label>
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
                <label htmlFor="add-unit-of-measure">
                  Unit of Measure <span className="inventory-required">*</span>
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
              <div className="inventory-field">
                <label htmlFor="add-packed-date">Packed Date</label>
                <input
                  id="add-packed-date"
                  type="date"
                  className="inventory-input"
                  value={newPackedDate}
                  onChange={(e) => setNewPackedDate(e.target.value)}
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
            </div>
            <div className="inventory-add-actions">
              <button
                type="button"
                className="inventory-add-submit"
                onClick={handleAddStockpile}
                disabled={addingStockpile}
              >
                {addingStockpile ? 'Adding…' : 'Add Stockpile'}
              </button>
            </div>
          </div>
        </section>
      )}
    </div>
  )
}

export default StockpileSection
