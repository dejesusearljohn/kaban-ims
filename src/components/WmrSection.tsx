import { useEffect, useMemo, useState } from 'react'
import type { Tables } from '../../supabase'
import useResponsivePageSize from './useResponsivePageSize'

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
  staffWmrReportsCount: number
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
  filteredStaffWmrReports: WmrReportRow[]
  wmrReports: WmrReportRow[]
  inventoryItems: InventoryRow[]
  formatDisplayDate: (value: string | null | undefined) => string
  openWmrRemarksModal: (item: InventoryRow) => void
  openStaffWmrRemarksModal: (report: WmrReportRow) => void
  filteredVehicleWmrReports: WmrReportRow[]
  openVehicleWmrRemarksModal: (report: WmrReportRow, label: string) => void
  onArchiveWasteItem: (item: InventoryRow, report: WmrReportRow | null) => void
  onArchiveStaffWmrReport: (report: WmrReportRow) => void
  onArchiveVehicleReport: (report: WmrReportRow) => void
}

function WmrSection({
  wmrLoading,
  inventoryLoading,
  wmrError,
  wasteInventoryItemsCount,
  vehicleWmrReportsCount,
  staffWmrReportsCount,
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
  filteredStaffWmrReports,
  wmrReports,
  inventoryItems,
  formatDisplayDate,
  openWmrRemarksModal,
  openStaffWmrRemarksModal,
  filteredVehicleWmrReports,
  openVehicleWmrRemarksModal,
  onArchiveWasteItem,
  onArchiveStaffWmrReport,
  onArchiveVehicleReport,
}: WmrSectionProps) {
  const wmrPageSize = useResponsivePageSize(8)
  const [wmrPage, setWmrPage] = useState(1)

  const getWmrStatusBadgeClass = (status: string | null) => {
    const normalized = status?.toLowerCase().trim() || ''
    if (normalized === 'pending') return 'badge-status-pending'
    if (normalized === 'for disposal') return 'badge-status-disposal'
    if (normalized === 'disposed') return 'badge-status-disposed'
    if (normalized === 'for repair') return 'badge-status-repair'
    if (normalized === 'repaired') return 'badge-status-repaired'
    return ''
  }

  const combinedWmrRows = useMemo(
    () =>
      [
        ...filteredWasteItems.map((item) => {
        const report = wmrReports.find((r) => r.item_id === item.item_id) || null
        const reportId = report
          ? `WMR-${report.report_id.toString().padStart(3, '0')}`
          : `WMR-${item.item_id.toString().padStart(3, '0')}`
        const status = report?.status?.trim() || null
        const reason = report?.reason_damage?.trim() || ''
        const location =
          report?.location?.trim() ||
          (item.department_id != null ? departments.find((dept) => dept.id === item.department_id)?.name ?? '' : '')
        const dateReported = report?.date_reported ?? item.created_at ?? item.date_acquired
        const hasRemarks = !!(report && report.admin_remarks && report.admin_remarks.trim().length > 0)

          return {
            key: `waste-${item.item_id}`,
            reportId,
            itemName: item.item_name,
            type: item.item_type,
            reason,
            status,
            location,
            dateReported,
            hasRemarks,
            rowType: 'waste' as const,
            item,
            vehicleLabel: null as string | null,
            report,
          }
        }),
        ...filteredStaffWmrReports.map((report) => {
        const status = report.status?.trim() || null
        const reason = report.reason_damage?.trim() || ''
        const location = report.location?.trim() || 'Staff Report'
        const hasRemarks = !!(report.admin_remarks && report.admin_remarks.trim().length > 0)
        // Look up the actual item from inventory for this staff report
        const linkedItem = report.item_id ? inventoryItems.find((i) => i.item_id === report.item_id) : null
        const itemName = linkedItem?.item_name || `Item (ID: ${report.item_id || '—'})`

          return {
            key: `staff-wmr-${report.report_id}`,
            reportId: `WMR-${report.report_id.toString().padStart(3, '0')}`,
            itemName,
            type: 'Staff Report',
            reason,
            status,
            location,
            dateReported: report.date_reported,
            hasRemarks,
            rowType: 'staff' as const,
            item: linkedItem || null,
            vehicleLabel: null as string | null,
            report,
          }
        }),
        ...filteredVehicleWmrReports.map((report) => {
        const status = report.status?.trim() || null
        const reason = report.reason_damage?.trim() || ''
        const location = report.location?.trim() || 'Vehicle Registry'
        const vehicleLabel = report.location?.startsWith('Vehicle Registry - ')
          ? report.location.slice('Vehicle Registry - '.length)
          : 'Vehicle'
        const hasRemarks = !!(report.admin_remarks && report.admin_remarks.trim().length > 0)

          return {
            key: `vehicle-wmr-${report.report_id}`,
            reportId: `WMR-${report.report_id.toString().padStart(3, '0')}`,
            itemName: vehicleLabel || 'Vehicle',
            type: 'Vehicle',
            reason,
            status,
            location,
            dateReported: report.date_reported,
            hasRemarks,
            rowType: 'vehicle' as const,
            item: null as InventoryRow | null,
            vehicleLabel: vehicleLabel || 'Vehicle',
            report,
          }
        }),
      ].sort((a, b) => {
        const aTime = a.dateReported ? new Date(a.dateReported).getTime() : 0
        const bTime = b.dateReported ? new Date(b.dateReported).getTime() : 0

        if (Number.isNaN(aTime) && Number.isNaN(bTime)) return a.key.localeCompare(b.key)
        if (Number.isNaN(aTime)) return 1
        if (Number.isNaN(bTime)) return -1

        return bTime - aTime
      }),
    [filteredWasteItems, filteredStaffWmrReports, filteredVehicleWmrReports, wmrReports, departments, inventoryItems],
  )

  const wmrTotalPages = Math.max(1, Math.ceil(combinedWmrRows.length / wmrPageSize))

  useEffect(() => {
    setWmrPage(1)
  }, [wmrSearchQuery, wmrTypeFilter, wmrDepartmentFilter, wmrStatusFilter])

  useEffect(() => {
    if (wmrPage > wmrTotalPages) {
      setWmrPage(wmrTotalPages)
    }
  }, [wmrPage, wmrTotalPages])

  const paginatedWmrRows = useMemo(() => {
    const start = (wmrPage - 1) * wmrPageSize
    return combinedWmrRows.slice(start, start + wmrPageSize)
  }, [combinedWmrRows, wmrPage, wmrPageSize])

  const visibleWmrPageNumbers = useMemo(() => {
    const maxVisiblePages = 5
    if (wmrTotalPages <= maxVisiblePages) {
      return Array.from({ length: wmrTotalPages }, (_, index) => index + 1)
    }

    const halfWindow = Math.floor(maxVisiblePages / 2)
    let start = Math.max(1, wmrPage - halfWindow)
    let end = Math.min(wmrTotalPages, start + maxVisiblePages - 1)

    if (end - start + 1 < maxVisiblePages) {
      start = Math.max(1, end - maxVisiblePages + 1)
    }

    return Array.from({ length: end - start + 1 }, (_, index) => start + index)
  }, [wmrPage, wmrTotalPages])

  return (
    <div className="wmr-layout">
      <header className="dashboard-header">
        <div>
          <h2>Waste Materials Report</h2>
          <p>
            {wmrLoading || inventoryLoading
              ? 'Loading waste materials…'
              : `Total WMR Cases: ${wasteInventoryItemsCount + staffWmrReportsCount + vehicleWmrReportsCount}`}
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
              <option value="Disposed">Disposed</option>
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
                <th scope="col">Action</th>
              </tr>
            </thead>
            <tbody>
              {inventoryLoading ? (
                <tr>
                  <td colSpan={9}>Loading waste materials…</td>
                </tr>
              ) : combinedFilteredWmrCount === 0 ? (
                <tr>
                  <td colSpan={9}>No waste materials reported.</td>
                </tr>
              ) : (
                <>
                  {paginatedWmrRows.map((row) => (
                    <tr key={row.key}>
                      <td>{row.reportId}</td>
                      <td>{row.itemName || '—'}</td>
                      <td>{row.type}</td>
                      <td>{row.reason || '—'}</td>
                      <td>
                        {row.status ? (
                          <span className={`badge ${getWmrStatusBadgeClass(row.status)}`}>{row.status}</span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td>{row.location || '—'}</td>
                      <td>{formatDisplayDate(row.dateReported)}</td>
                      <td>
                        <button
                          type="button"
                          className="wmr-remarks-button"
                          onClick={() => {
                            if (row.rowType === 'waste' && row.item) {
                              openWmrRemarksModal(row.item)
                            } else if (row.rowType === 'staff' && row.report) {
                              openStaffWmrRemarksModal(row.report)
                            } else if (row.rowType === 'vehicle' && row.report) {
                              openVehicleWmrRemarksModal(row.report, row.vehicleLabel || 'Vehicle')
                            }
                          }}
                        >
                          {row.hasRemarks ? 'View remarks' : 'Add remarks'}
                        </button>
                      </td>
                      <td className="inventory-row-actions">
                        <div className="inventory-actions-grid">
                          <button
                            type="button"
                            aria-label="Archive item"
                            title="Archive item"
                            className="inventory-icon-button"
                            onClick={() => {
                              if (row.rowType === 'waste' && row.item) {
                                onArchiveWasteItem(row.item, row.report)
                              } else if (row.rowType === 'staff' && row.report) {
                                onArchiveStaffWmrReport(row.report)
                              } else if (row.rowType === 'vehicle' && row.report) {
                                onArchiveVehicleReport(row.report)
                              }
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
                  ))}
                </>
              )}
            </tbody>
          </table>

        </div>
      </section>

      {!inventoryLoading && wmrTotalPages > 1 && (
        <div className="inventory-pagination" aria-label="WMR pagination">
          <div className="inventory-pagination-controls">
            <button
              type="button"
              className="inventory-pagination-button inventory-pagination-circle"
              onClick={() => setWmrPage((prev) => Math.max(1, prev - 1))}
              disabled={wmrPage === 1}
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

            {visibleWmrPageNumbers.map((pageNumber) => (
              <button
                key={pageNumber}
                type="button"
                className={`inventory-pagination-button inventory-pagination-circle ${
                  pageNumber === wmrPage ? 'inventory-pagination-circle-active' : ''
                }`}
                onClick={() => setWmrPage(pageNumber)}
                aria-label={`Page ${pageNumber}`}
                aria-current={pageNumber === wmrPage ? 'page' : undefined}
              >
                {pageNumber}
              </button>
            ))}

            <button
              type="button"
              className="inventory-pagination-button inventory-pagination-circle"
              onClick={() => setWmrPage((prev) => Math.min(wmrTotalPages, prev + 1))}
              disabled={wmrPage === wmrTotalPages}
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
    </div>
  )
}

export default WmrSection
