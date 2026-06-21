import { useEffect, useMemo, useState } from 'react'
import type { Tables } from '../../supabase'
import useResponsivePageSize from './useResponsivePageSize'
import { resolveStaffParNumber } from '../utils/itemUtils'

type UserRow = Tables<'users'>

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

  const parTotalPages = Math.max(1, Math.ceil(filteredParSummaries.length / parPageSize))

  useEffect(() => {
    setParPage(1)
  }, [parSearchQuery])

  useEffect(() => {
    if (parPage > parTotalPages) {
      setParPage(parTotalPages)
    }
  }, [parPage, parTotalPages])

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
          <p>View accountable property issued to staff and track receipt history.</p>
        </div>
      </header>

      {parError && <p className="dashboard-error">{parError}</p>}

      <section className="section-toolbar-row par-table-toolbar" aria-label="PAR search and export">
        <div className="inventory-filters">
          <div className="inventory-search-wrapper">
            <input
              type="search"
              className="inventory-search-input"
              placeholder="Search by PAR number, item, type, or recipient…"
              value={parSearchQuery}
              onChange={(e) => setParSearchQuery(e.target.value)}
            />
          </div>
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

      <section className="inventory-table-section" aria-label="PAR records table">
        <div className="inventory-table-card">
          <table className="inventory-table inventory-list-table">
            <thead>
              <tr>
                <th scope="col" className="inventory-id-column">PAR No.</th>
                <th scope="col" className="inventory-name-column">Issued To</th>
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
                      <td className="inventory-id-column">{parId}</td>
                      <td className="inventory-name-column">
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
    </div>
  )
}

export default ParSection
