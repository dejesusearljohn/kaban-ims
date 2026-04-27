export type ReportOption = {
  staffId: string
  label: string
}

export type ReportPeriod = 'weekly' | 'monthly' | 'yearly'

export type ReportsSectionProps = {
  reportsError: string | null
  selectedReportPeriod: ReportPeriod
  setSelectedReportPeriod: (value: ReportPeriod) => void
  reportStartDate: string
  setReportStartDate: (value: string) => void
  reportEndDate: string
  setReportEndDate: (value: string) => void
  disablePrintActions?: boolean
  parOptions: ReportOption[]
  selectedParStaffId: string
  setSelectedParStaffId: (value: string) => void
  onPrintPar: () => void
  onPrintInventoryReport: () => void
  onPrintWmrSummary: () => void
  onPrintRepairLogs: () => void
  onPrintStockpileReleaseLogs: () => void
  parReportCount: number
  inventoryReportCount: number
  wmrReportCount: number
  repairLogCount: number
  stockpileReleaseLogCount: number
}

function ReportsSection({
  reportsError,
  selectedReportPeriod,
  setSelectedReportPeriod,
  reportStartDate,
  setReportStartDate,
  reportEndDate,
  setReportEndDate,
  disablePrintActions = false,
  parOptions,
  selectedParStaffId,
  setSelectedParStaffId,
  onPrintPar,
  onPrintInventoryReport,
  onPrintWmrSummary,
  onPrintRepairLogs,
  onPrintStockpileReleaseLogs,
  parReportCount,
  inventoryReportCount,
  wmrReportCount,
  repairLogCount,
  stockpileReleaseLogCount,
}: ReportsSectionProps) {
  return (
    <div className="reports-layout">
      <header className="dashboard-header">
        <div>
          <h2>Reports</h2>
          <p>Store and print centralized report views for PAR, inventory, WMR, and vehicle repairs.</p>
        </div>
      </header>

      {reportsError && <p className="dashboard-error">{reportsError}</p>}

      <section className="reports-period" aria-label="Report period filter">
        <div className="reports-period-item">
          <label htmlFor="reports-period-select">
            Report Period
          </label>
          <select
            id="reports-period-select"
            className="inventory-input reports-period-select"
            value={selectedReportPeriod}
            onChange={(e) => setSelectedReportPeriod(e.target.value as ReportPeriod)}
          >
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
          </select>
        </div>

        <div className="reports-date-group">
          <label htmlFor="reports-start-date">
            From
          </label>
          <input
            id="reports-start-date"
            type="date"
            className="inventory-input reports-date-input"
            value={reportStartDate}
            onChange={(e) => setReportStartDate(e.target.value)}
          />
        </div>

        <div className="reports-date-group">
          <label htmlFor="reports-end-date">
            To
          </label>
          <input
            id="reports-end-date"
            type="date"
            className="inventory-input reports-date-input"
            value={reportEndDate}
            onChange={(e) => setReportEndDate(e.target.value)}
          />
        </div>
      </section>

      <section className="reports-grid" aria-label="Printable reports">
        <article className="reports-card" aria-label="PAR report print card">
          <h3 className="reports-card-title">Property Acknowledgment Receipt (PAR)</h3>
          <p className="reports-card-meta">{parReportCount} PAR report{parReportCount === 1 ? '' : 's'} available</p>
          <div className="reports-card-controls">
            <label htmlFor="reports-par-select" className="reports-label">
              Select PAR Recipient
            </label>
            <select
              id="reports-par-select"
              className="inventory-input"
              value={selectedParStaffId}
              onChange={(e) => setSelectedParStaffId(e.target.value)}
            >
              {parOptions.length === 0 ? (
                <option value="">No PAR reports available</option>
              ) : (
                parOptions.map((option) => (
                  <option key={option.staffId} value={option.staffId}>
                    {option.label}
                  </option>
                ))
              )}
            </select>
          </div>
          <button
            type="button"
            className="wmr-modal-button-save reports-print-button"
            onClick={onPrintPar}
            disabled={!selectedParStaffId || disablePrintActions}
          >
            <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true" focusable="false">
              <path d="M7 9V4h10v5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              <rect x="5" y="10" width="14" height="7" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
              <path d="M8 14h8M8 17h8" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
            <span>Print</span>
          </button>
        </article>

        <article className="reports-card" aria-label="Inventory report print card">
          <h3 className="reports-card-title">Inventory Report</h3>
          <p className="reports-card-meta">{inventoryReportCount} inventory entr{inventoryReportCount === 1 ? 'y' : 'ies'} available</p>
          <p className="reports-card-description">
            Generates a printable inventory report with inventory items only.
          </p>
          <button
            type="button"
            className="wmr-modal-button-save reports-print-button"
            onClick={onPrintInventoryReport}
            disabled={disablePrintActions}
          >
            <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true" focusable="false">
              <path d="M7 9V4h10v5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              <rect x="5" y="10" width="14" height="7" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
              <path d="M8 14h8M8 17h8" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
            <span>Print</span>
          </button>
        </article>

        <article className="reports-card" aria-label="WMR summary print card">
          <h3 className="reports-card-title">Waste Materials Report (WMR) Summary</h3>
          <p className="reports-card-meta">{wmrReportCount} WMR entr{wmrReportCount === 1 ? 'y' : 'ies'} available</p>
          <p className="reports-card-description">
            Prints inventory and vehicle waste material report entries in one summary view.
          </p>
          <button
            type="button"
            className="wmr-modal-button-save reports-print-button"
            onClick={onPrintWmrSummary}
            disabled={disablePrintActions}
          >
            <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true" focusable="false">
              <path d="M7 9V4h10v5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              <rect x="5" y="10" width="14" height="7" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
              <path d="M8 14h8M8 17h8" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
            <span>Print</span>
          </button>
        </article>

        <article className="reports-card" aria-label="Vehicle repair logs print card">
          <h3 className="reports-card-title">Vehicle Repair Logs</h3>
          <p className="reports-card-meta">{repairLogCount} repair log entr{repairLogCount === 1 ? 'y' : 'ies'} available</p>
          <p className="reports-card-description">
            Prints repair records with vehicle details, costs, service center, and issued staff.
          </p>
          <button
            type="button"
            className="wmr-modal-button-save reports-print-button"
            onClick={onPrintRepairLogs}
            disabled={disablePrintActions}
          >
            <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true" focusable="false">
              <path d="M7 9V4h10v5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              <rect x="5" y="10" width="14" height="7" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
              <path d="M8 14h8M8 17h8" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
            <span>Print</span>
          </button>
        </article>

        <article className="reports-card" aria-label="Stockpile release logs print card">
          <h3 className="reports-card-title">Stockpile Release Logs</h3>
          <p className="reports-card-meta">{stockpileReleaseLogCount} release log entr{stockpileReleaseLogCount === 1 ? 'y' : 'ies'} available</p>
          <p className="reports-card-description">
            Prints stockpile release records including item, quantity, recipient, and reason.
          </p>
          <button
            type="button"
            className="wmr-modal-button-save reports-print-button"
            onClick={onPrintStockpileReleaseLogs}
            disabled={disablePrintActions}
          >
            <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true" focusable="false">
              <path d="M7 9V4h10v5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              <rect x="5" y="10" width="14" height="7" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
              <path d="M8 14h8M8 17h8" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
            <span>Print</span>
          </button>
        </article>
      </section>
    </div>
  )
}

export default ReportsSection
