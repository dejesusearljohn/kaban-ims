import type { Tables } from '../../supabase'

type InventoryRow = Tables<'inventory'>
type WmrReportRow = Tables<'wmr_reports'>

type DepartmentOverview = {
  id: number
  name: string
}

type WmrSectionProps = {
  wmrLoading: boolean
  inventoryLoading: boolean
  wmrError: string | null
  wasteInventoryItemsCount: number
  vehicleWmrReportsCount: number
  wmrSearchQuery: string
  setWmrSearchQuery: (value: string) => void
  wmrTypeFilter: string
  setWmrTypeFilter: (value: string) => void
  wmrDepartmentFilter: string
  setWmrDepartmentFilter: (value: string) => void
  wmrStatusFilter: string
  setWmrStatusFilter: (value: string) => void
  typeOptions: string[]
  departments: DepartmentOverview[]
  combinedFilteredWmrCount: number
  filteredWasteItems: InventoryRow[]
  wmrReports: WmrReportRow[]
  formatDisplayDate: (value: string | null | undefined) => string
  openWmrRemarksModal: (item: InventoryRow) => void
  filteredVehicleWmrReports: WmrReportRow[]
  openVehicleWmrRemarksModal: (report: WmrReportRow, label: string) => void
}

function WmrSection({
  wmrLoading,
  inventoryLoading,
  wmrError,
  wasteInventoryItemsCount,
  vehicleWmrReportsCount,
  wmrSearchQuery,
  setWmrSearchQuery,
  wmrTypeFilter,
  setWmrTypeFilter,
  wmrDepartmentFilter,
  setWmrDepartmentFilter,
  wmrStatusFilter,
  setWmrStatusFilter,
  typeOptions,
  departments,
  combinedFilteredWmrCount,
  filteredWasteItems,
  wmrReports,
  formatDisplayDate,
  openWmrRemarksModal,
  filteredVehicleWmrReports,
  openVehicleWmrRemarksModal,
}: WmrSectionProps) {
  return (
    <div className="wmr-layout">
      <header className="dashboard-header">
        <div>
          <h2>Waste Materials Report</h2>
          <p>
            {wmrLoading || inventoryLoading
              ? 'Loading waste materials…'
              : `Total WMR Cases: ${wasteInventoryItemsCount + vehicleWmrReportsCount}`}
          </p>
        </div>
      </header>

      <section className="wmr-toolbar" aria-label="Waste materials filters">
        <div className="inventory-filters">
          <div className="wmr-search-wrapper">
            <input
              type="search"
              className="inventory-search-input"
              placeholder="Search by report ID, item, or type…"
              value={wmrSearchQuery}
              onChange={(e) => setWmrSearchQuery(e.target.value)}
            />
          </div>
          <div className="inventory-filter-selects">
            <select
              className="inventory-filter-select"
              value={wmrTypeFilter}
              onChange={(e) => setWmrTypeFilter(e.target.value)}
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
              value={wmrDepartmentFilter}
              onChange={(e) => setWmrDepartmentFilter(e.target.value)}
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
              value={wmrStatusFilter}
              onChange={(e) => setWmrStatusFilter(e.target.value)}
            >
              <option value="all">All Status</option>
              <option value="Pending">Pending</option>
              <option value="For Disposal">For Disposal</option>
              <option value="For Repair">For Repair</option>
              <option value="Repaired">Repaired</option>
            </select>
          </div>
        </div>
      </section>

      <section className="inventory-table-section" aria-label="Waste materials table">
        <div className="inventory-table-card">
          {wmrError && <p className="dashboard-error">{wmrError}</p>}
          <table className="inventory-table">
            <thead>
              <tr>
                <th scope="col">Report ID</th>
                <th scope="col">Item Name</th>
                <th scope="col">Type</th>
                <th scope="col">Reason</th>
                <th scope="col">Status</th>
                <th scope="col">Location</th>
                <th scope="col">Date Reported</th>
                <th scope="col">Remarks</th>
              </tr>
            </thead>
            <tbody>
              {inventoryLoading ? (
                <tr>
                  <td colSpan={8}>Loading waste materials…</td>
                </tr>
              ) : combinedFilteredWmrCount === 0 ? (
                <tr>
                  <td colSpan={8}>No waste materials reported.</td>
                </tr>
              ) : (
                <>
                  {filteredWasteItems.map((item) => {
                    const report = wmrReports.find((r) => r.item_id === item.item_id) || null
                    const reportId = report
                      ? `WMR-${report.report_id.toString().padStart(3, '0')}`
                      : `WMR-${item.item_id.toString().padStart(3, '0')}`
                    const status = report?.status?.trim() || null
                    const reason = report?.reason_damage?.trim() || ''
                    const department =
                      report?.location?.trim() ||
                      (item.department_id != null
                        ? departments.find((dept) => dept.id === item.department_id)?.name ?? ''
                        : '')
                    const dateReported = report?.date_reported ?? item.created_at ?? item.date_acquired
                    const hasRemarks = !!(report && report.admin_remarks && report.admin_remarks.trim().length > 0)

                    return (
                      <tr key={item.item_id}>
                        <td>{reportId}</td>
                        <td>{item.item_name}</td>
                        <td>{item.item_type}</td>
                        <td>{reason || '—'}</td>
                        <td>
                          {status ? (
                            <span
                              className={`badge ${
                                status === 'Pending'
                                  ? 'badge-status-pending'
                                  : status === 'For Disposal'
                                    ? 'badge-status-disposal'
                                    : status === 'For Repair'
                                      ? 'badge-status-repair'
                                      : status === 'Repaired'
                                        ? 'badge-status-repaired'
                                        : ''
                              }`}
                            >
                              {status}
                            </span>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td>{department || '—'}</td>
                        <td>{formatDisplayDate(dateReported)}</td>
                        <td>
                          <button
                            type="button"
                            className="wmr-remarks-button"
                            onClick={() => openWmrRemarksModal(item)}
                          >
                            {hasRemarks ? 'View remarks' : 'Add remarks'}
                          </button>
                        </td>
                      </tr>
                    )
                  })}

                  {filteredVehicleWmrReports.map((report) => {
                    const reportId = `WMR-${report.report_id.toString().padStart(3, '0')}`
                    const status = report.status?.trim() || null
                    const reason = report.reason_damage?.trim() || ''
                    const location = report.location?.trim() || 'Vehicle Registry'
                    const itemName = report.location?.startsWith('Vehicle Registry - ')
                      ? report.location.slice('Vehicle Registry - '.length)
                      : 'Vehicle'
                    const hasRemarks = !!(report.admin_remarks && report.admin_remarks.trim().length > 0)

                    return (
                      <tr key={`vehicle-wmr-${report.report_id}`}>
                        <td>{reportId}</td>
                        <td>{itemName || 'Vehicle'}</td>
                        <td>Vehicle</td>
                        <td>{reason || '—'}</td>
                        <td>
                          {status ? (
                            <span
                              className={`badge ${
                                status === 'Pending'
                                  ? 'badge-status-pending'
                                  : status === 'For Disposal'
                                    ? 'badge-status-disposal'
                                    : status === 'For Repair'
                                      ? 'badge-status-repair'
                                      : status === 'Repaired'
                                        ? 'badge-status-repaired'
                                        : ''
                              }`}
                            >
                              {status}
                            </span>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td>{location}</td>
                        <td>{formatDisplayDate(report.date_reported)}</td>
                        <td>
                          <button
                            type="button"
                            className="wmr-remarks-button"
                            onClick={() => openVehicleWmrRemarksModal(report, itemName || 'Vehicle')}
                          >
                            {hasRemarks ? 'View remarks' : 'Add remarks'}
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

export default WmrSection
