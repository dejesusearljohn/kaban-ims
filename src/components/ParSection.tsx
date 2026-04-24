import type { Tables } from '../../supabase'

type InventoryRow = Tables<'inventory'>
type UserRow = Tables<'users'>

type ParSummary = {
  staffId: string
  latestIssueDate: string | null
  totalQuantity: number
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
  parSaving: boolean
  parSearchQuery: string
  setParSearchQuery: (value: string) => void
  parLoading: boolean
  filteredParSummaries: ParSummary[]
  setActiveParStaffId: (staffId: string | null) => void
}

function ParSection({
  parError,
  parMode,
  setParMode,
  parItemId,
  setParItemId,
  inventoryItems,
  parIssuedToId,
  setParIssuedToId,
  parUsers,
  parQuantityIssued,
  setParQuantityIssued,
  parIssueDate,
  setParIssueDate,
  parUnitInput,
  setParUnitInput,
  unitOfMeasureOptions,
  parPropertyNoInput,
  setParPropertyNoInput,
  parDateAcquiredInput,
  setParDateAcquiredInput,
  parCostInput,
  setParCostInput,
  parLineTotal,
  formatCurrency,
  parDescriptionInput,
  setParDescriptionInput,
  handleCreateParRecord,
  parSaving,
  parSearchQuery,
  setParSearchQuery,
  parLoading,
  filteredParSummaries,
  setActiveParStaffId,
}: ParSectionProps) {
  return (
    <div className="par-layout">
      <header className="dashboard-header">
        <div>
          <h2>Property Acknowledgment Receipt (PAR)</h2>
          <p>Record issued accountable property and track receipt history for assigned staff.</p>
        </div>
      </header>

      {parError && <p className="dashboard-error">{parError}</p>}

      <section className="inventory-toolbar" aria-label="PAR actions">
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
      </section>

      {parMode === 'add' && (
        <section className="par-form-card" aria-label="Create PAR record">
          <h3 className="par-form-title">Create New PAR</h3>
          <div className="par-form-grid">
            <div className="inventory-field">
              <label htmlFor="par-item-select">
                Item <span className="inventory-required">*</span>
              </label>
              <select
                id="par-item-select"
                className="inventory-input"
                value={parItemId}
                onChange={(e) => setParItemId(e.target.value)}
              >
                <option value="">Select item</option>
                {inventoryItems.map((item) => (
                  <option key={item.item_id} value={String(item.item_id)}>
                    {`ITEM-${item.item_id.toString().padStart(3, '0')} • ${item.item_name}`}
                  </option>
                ))}
              </select>
            </div>

            <div className="inventory-field">
              <label htmlFor="par-issued-to-select">
                Issued To <span className="inventory-required">*</span>
              </label>
              <select
                id="par-issued-to-select"
                className="inventory-input"
                value={parIssuedToId}
                onChange={(e) => setParIssuedToId(e.target.value)}
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
              <label htmlFor="par-quantity-issued">
                Quantity Issued <span className="inventory-required">*</span>
              </label>
              <input
                id="par-quantity-issued"
                type="number"
                min="1"
                className="inventory-input"
                value={parQuantityIssued}
                onChange={(e) => setParQuantityIssued(e.target.value)}
              />
            </div>

            <div className="inventory-field">
              <label htmlFor="par-issue-date">Issue Date</label>
              <input
                id="par-issue-date"
                type="date"
                className="inventory-input"
                value={parIssueDate}
                onChange={(e) => setParIssueDate(e.target.value)}
              />
            </div>

            <div className="inventory-field">
              <label htmlFor="par-unit-input">Unit</label>
              <select
                id="par-unit-input"
                className="inventory-input"
                value={parUnitInput}
                onChange={(e) => setParUnitInput(e.target.value)}
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
              <label htmlFor="par-property-no-input">Property No.</label>
              <input
                id="par-property-no-input"
                type="text"
                className="inventory-input"
                value={parPropertyNoInput}
                onChange={(e) => setParPropertyNoInput(e.target.value)}
                placeholder="Property number"
              />
            </div>

            <div className="inventory-field">
              <label htmlFor="par-date-acquired-input">Date Acquired</label>
              <input
                id="par-date-acquired-input"
                type="date"
                className="inventory-input"
                value={parDateAcquiredInput}
                onChange={(e) => setParDateAcquiredInput(e.target.value)}
              />
            </div>

            <div className="inventory-field">
              <label htmlFor="par-cost-input">Unit Cost (per 1 qty)</label>
              <input
                id="par-cost-input"
                type="number"
                min="0"
                step="0.01"
                className="inventory-input"
                value={parCostInput}
                onChange={(e) => setParCostInput(e.target.value)}
                placeholder="0.00"
              />
            </div>

            <div className="inventory-field">
              <label htmlFor="par-line-total">Line Total (Qty x Unit Cost)</label>
              <input
                id="par-line-total"
                type="text"
                className="inventory-input"
                value={formatCurrency(parLineTotal)}
                readOnly
              />
            </div>

            <div className="inventory-field inventory-field-full">
              <label htmlFor="par-description-input">Description</label>
              <textarea
                id="par-description-input"
                className="inventory-input"
                style={{ minHeight: 72, resize: 'vertical' }}
                value={parDescriptionInput}
                onChange={(e) => setParDescriptionInput(e.target.value)}
                placeholder="Item description for PAR"
              />
            </div>
          </div>

          <div className="inventory-add-actions">
            <button
              type="button"
              className="inventory-add-submit"
              onClick={handleCreateParRecord}
              disabled={parSaving}
            >
              {parSaving ? 'Saving…' : 'Add Item To PAR'}
            </button>
          </div>
        </section>
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
                  filteredParSummaries.map((summary) => {
                    const parId = summary.receiver?.staff_id
                      ? `PAR-${summary.receiver.staff_id}`
                      : `PAR-${summary.staffId.slice(0, 8)}`

                    return (
                      <tr key={summary.staffId}>
                        <td>{parId}</td>
                        <td>
                          {summary.receiver
                            ? `${summary.receiver.full_name} (${summary.receiver.staff_id})`
                            : summary.staffId}
                        </td>
                        <td>{summary.latestIssueDate ?? '—'}</td>
                        <td>{summary.records.length}</td>
                        <td>{summary.totalQuantity}</td>
                        <td>{summary.receiver?.contact_info ?? summary.records[0]?.contact_snapshot ?? '—'}</td>
                        <td>
                          <button
                            type="button"
                            className="wmr-remarks-button"
                            onClick={() => setActiveParStaffId(summary.staffId)}
                          >
                            View PAR
                          </button>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  )
}

export default ParSection
