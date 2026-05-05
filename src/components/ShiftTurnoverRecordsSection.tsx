import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../supabaseClient'
import type { Tables } from '../../supabase'
import useResponsivePageSize from './useResponsivePageSize'

type ShiftTurnoverRow = Tables<'shift_turnovers'>
type UserRow = Pick<Tables<'users'>, 'id' | 'full_name' | 'staff_id' | 'department_id'>
type DepartmentRow = Pick<Tables<'departments'>, 'id' | 'dept_name'>
type DailyCheckRow = Pick<Tables<'daily_checks'>, 'check_id' | 'check_date'>

type AdminReviewState = 'pending' | 'approved' | 'rejected'
type TurnoverStatus = 'pending' | 'approved' | 'disapproved'

type ShiftTurnoverRecord = {
  turnoverId: number
  createdAt: string | null
  dailyCheckId: number | null
  checkDate: string | null
  status: TurnoverStatus
  adminReview: AdminReviewState
  outgoingName: string
  outgoingStaffId: string
  incomingName: string
  incomingStaffId: string
  departmentId: number | null
  departmentName: string
}

type ShiftTurnoverDetailItem = {
  key: number
  itemName: string
  propertyNo: string
  unit: string
  condition: string
  remarks: string
  scannedAt: string
}

type RawShiftTurnoverDetailItem = {
  check_item_id: number
  condition: string
  remarks: string | null
  scanned_at: string
  item_id: number
  item: {
    item_name: string | null
    property_no: string | null
    unit_of_measure: string | null
  } | null
}

const normalizeTurnoverStatus = (value: string | null | undefined): TurnoverStatus => {
  const normalized = (value ?? 'pending').trim().toLowerCase()
  if (normalized === 'approved' || normalized === 'disapproved') {
    return normalized
  }
  return 'pending'
}

const getAdminReviewState = (value: boolean | null): AdminReviewState => {
  if (value === true) return 'approved'
  if (value === false) return 'rejected'
  return 'pending'
}

const formatDateLabel = (value: string | null) => {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

const formatDateTimeLabel = (value: string | null) => {
  if (!value) return '—'
  return new Date(value).toLocaleString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const getStatusPillStyle = (state: TurnoverStatus | AdminReviewState) => {
  if (state === 'approved') {
    return { backgroundColor: '#dcfce7', color: '#166534' }
  }

  if (state === 'disapproved' || state === 'rejected') {
    return { backgroundColor: '#fee2e2', color: '#991b1b' }
  }

  return { backgroundColor: '#fef3c7', color: '#92400e' }
}

function ShiftTurnoverRecordsSection() {
  const pageSize = useResponsivePageSize(10)
  const [page, setPage] = useState(1)
  const [searchQuery, setSearchQuery] = useState('')
  const [departmentFilter, setDepartmentFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [adminReviewFilter, setAdminReviewFilter] = useState('all')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [reviewingTurnoverId, setReviewingTurnoverId] = useState<number | null>(null)

  const [shiftTurnovers, setShiftTurnovers] = useState<ShiftTurnoverRow[]>([])
  const [users, setUsers] = useState<UserRow[]>([])
  const [departments, setDepartments] = useState<DepartmentRow[]>([])
  const [dailyChecks, setDailyChecks] = useState<DailyCheckRow[]>([])

  const [activeRecord, setActiveRecord] = useState<ShiftTurnoverRecord | null>(null)
  const [detailItems, setDetailItems] = useState<ShiftTurnoverDetailItem[]>([])
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true

    const load = async () => {
      setLoading(true)
      setError(null)

      try {
        const [turnoversRes, usersRes, departmentsRes, checksRes] = await Promise.all([
          supabase
            .from('shift_turnovers')
            .select('*')
            .order('created_at', { ascending: false })
            .order('turnover_id', { ascending: false }),
          supabase
            .from('users')
            .select('id, full_name, staff_id, department_id')
            .eq('is_archived', false)
            .order('full_name', { ascending: true }),
          supabase
            .from('departments')
            .select('id, dept_name')
            .eq('is_archived', false)
            .order('dept_name', { ascending: true }),
          supabase
            .from('daily_checks')
            .select('check_id, check_date')
            .order('check_id', { ascending: false }),
        ])

        if (turnoversRes.error) throw turnoversRes.error
        if (usersRes.error) throw usersRes.error
        if (departmentsRes.error) throw departmentsRes.error
        if (checksRes.error) throw checksRes.error

        if (!mounted) return

        setShiftTurnovers(turnoversRes.data ?? [])
        setUsers((usersRes.data ?? []) as UserRow[])
        setDepartments((departmentsRes.data ?? []) as DepartmentRow[])
        setDailyChecks((checksRes.data ?? []) as DailyCheckRow[])
      } catch (loadError) {
        if (!mounted) return
        const message = loadError instanceof Error ? loadError.message : 'Failed to load shift turnover records.'
        setError(message)
      } finally {
        if (mounted) setLoading(false)
      }
    }

    void load()

    return () => {
      mounted = false
    }
  }, [])

  const normalizedSearch = searchQuery.trim().toLowerCase()

  const rows = useMemo<ShiftTurnoverRecord[]>(() => {
    const userMap = new Map(users.map((user) => [user.id, user]))
    const departmentMap = new Map(departments.map((department) => [department.id, department]))
    const checkMap = new Map(dailyChecks.map((check) => [check.check_id, check]))

    return shiftTurnovers
      .map((record) => {
        const outgoing = record.outgoing_staff_id ? userMap.get(record.outgoing_staff_id) ?? null : null
        const incoming = record.incoming_staff_id ? userMap.get(record.incoming_staff_id) ?? null : null
        const departmentId = outgoing?.department_id ?? incoming?.department_id ?? null
        const departmentName = departmentId ? departmentMap.get(departmentId)?.dept_name ?? '—' : '—'
        const checkDate = record.daily_check_id ? checkMap.get(record.daily_check_id)?.check_date ?? null : null

        return {
          turnoverId: record.turnover_id,
          createdAt: record.created_at,
          dailyCheckId: record.daily_check_id,
          checkDate,
          status: normalizeTurnoverStatus(record.status),
          adminReview: getAdminReviewState(record.is_approved_by_admin),
          outgoingName: outgoing?.full_name ?? 'Unknown Staff',
          outgoingStaffId: outgoing?.staff_id ?? '—',
          incomingName: incoming?.full_name ?? 'Unknown Staff',
          incomingStaffId: incoming?.staff_id ?? '—',
          departmentId,
          departmentName,
        }
      })
      .filter((row) => {
        if (departmentFilter !== 'all' && String(row.departmentId ?? '') !== departmentFilter) {
          return false
        }

        if (statusFilter !== 'all' && row.status !== statusFilter) {
          return false
        }

        if (adminReviewFilter !== 'all' && row.adminReview !== adminReviewFilter) {
          return false
        }

        if (!normalizedSearch) {
          return true
        }

        return (
          String(row.turnoverId).includes(normalizedSearch) ||
          row.outgoingName.toLowerCase().includes(normalizedSearch) ||
          row.outgoingStaffId.toLowerCase().includes(normalizedSearch) ||
          row.incomingName.toLowerCase().includes(normalizedSearch) ||
          row.incomingStaffId.toLowerCase().includes(normalizedSearch) ||
          row.departmentName.toLowerCase().includes(normalizedSearch)
        )
      })
  }, [shiftTurnovers, users, departments, dailyChecks, departmentFilter, statusFilter, adminReviewFilter, normalizedSearch])

  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize))

  useEffect(() => {
    setPage(1)
  }, [normalizedSearch, departmentFilter, statusFilter, adminReviewFilter])

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages)
    }
  }, [page, totalPages])

  const visibleRows = useMemo(() => {
    const startIndex = (page - 1) * pageSize
    return rows.slice(startIndex, startIndex + pageSize)
  }, [rows, page, pageSize])

  useEffect(() => {
    if (!activeRecord) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        setActiveRecord(null)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [activeRecord])

  const totalTurnovers = shiftTurnovers.length

  const loadDetailItems = async (record: ShiftTurnoverRecord) => {
    setActiveRecord(record)
    setDetailItems([])
    setDetailError(null)

    if (!record.dailyCheckId) {
      setDetailError('This turnover has no linked daily check record.')
      return
    }

    setDetailLoading(true)

    const { data, error: detailLoadError } = await supabase
      .from('daily_check_items')
      .select('check_item_id, item_id, condition, remarks, scanned_at, item:inventory(item_name, property_no, unit_of_measure)')
      .eq('check_id', record.dailyCheckId)
      .order('scanned_at', { ascending: true })

    if (detailLoadError) {
      setDetailError(detailLoadError.message)
      setDetailLoading(false)
      return
    }

    const mapped = ((data ?? []) as unknown as RawShiftTurnoverDetailItem[]).map((item) => ({
      key: item.check_item_id,
      itemName: item.item?.item_name ?? `Item #${item.item_id}`,
      propertyNo: item.item?.property_no ?? '—',
      unit: item.item?.unit_of_measure ?? 'units',
      condition: item.condition,
      remarks: item.remarks ?? '—',
      scannedAt: formatDateTimeLabel(item.scanned_at),
    }))

    setDetailItems(mapped)
    setDetailLoading(false)
  }

  const applyAdminReview = async (turnoverId: number, isApproved: boolean) => {
    setReviewingTurnoverId(turnoverId)
    setActionError(null)

    const { error: updateError } = await supabase
      .from('shift_turnovers')
      .update({ is_approved_by_admin: isApproved })
      .eq('turnover_id', turnoverId)

    if (updateError) {
      setActionError(updateError.message)
      setReviewingTurnoverId(null)
      return
    }

    setShiftTurnovers((prev) =>
      prev.map((row) =>
        row.turnover_id === turnoverId
          ? { ...row, is_approved_by_admin: isApproved }
          : row,
      ),
    )

    if (activeRecord?.turnoverId === turnoverId) {
      setActiveRecord((prev) => (prev
        ? {
          ...prev,
          adminReview: isApproved ? 'approved' : 'rejected',
        }
        : prev))
    }

    setReviewingTurnoverId(null)
  }

  return (
    <div className="wmr-layout">
      <header className="dashboard-header">
        <div>
          <h2>Shift Turnover Records</h2>
          <p>Total Shift Turnovers: {totalTurnovers}</p>
        </div>
      </header>

      {error && <p className="dashboard-error">{error}</p>}
      {actionError && <p className="dashboard-error">{actionError}</p>}

      <section className="wmr-toolbar" aria-label="Shift turnover records tools">
        <div className="inventory-filters">
          <div className="inventory-search-wrapper">
            <input
              type="search"
              className="inventory-search-input"
              placeholder="Search by no., outgoing, incoming, or department..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
          </div>

          <div className="inventory-filter-selects">
            <select
              className="inventory-filter-select"
              value={departmentFilter}
              onChange={(event) => setDepartmentFilter(event.target.value)}
            >
              <option value="all">All Departments</option>
              {departments.map((department) => (
                <option key={department.id} value={String(department.id)}>
                  {department.dept_name}
                </option>
              ))}
            </select>

            <select
              className="inventory-filter-select"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="all">All Turnover Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="disapproved">Disapproved</option>
            </select>

            <select
              className="inventory-filter-select"
              value={adminReviewFilter}
              onChange={(event) => setAdminReviewFilter(event.target.value)}
            >
              <option value="all">All Admin Reviews</option>
              <option value="pending">Pending Review</option>
              <option value="approved">Admin Approved</option>
              <option value="rejected">Admin Rejected</option>
            </select>
          </div>
        </div>
      </section>

      <section className="inventory-table-section" aria-label="Shift turnover records table">
        <div className="inventory-table-card">
          <table className="inventory-table">
            <thead>
              <tr>
                <th scope="col">No.</th>
                <th scope="col">Outgoing Staff</th>
                <th scope="col">Incoming Staff</th>
                <th scope="col">Department</th>
                <th scope="col">Check Date</th>
                <th scope="col">Turnover Status</th>
                <th scope="col">Admin Review</th>
                <th scope="col">Submitted</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9}>Loading shift turnover records...</td>
                </tr>
              ) : visibleRows.length === 0 ? (
                <tr>
                  <td colSpan={9}>No shift turnover records found.</td>
                </tr>
              ) : (
                visibleRows.map((row) => {
                  const isReviewing = reviewingTurnoverId === row.turnoverId

                  return (
                    <tr key={row.turnoverId}>
                      <td>{row.turnoverId}</td>
                      <td>
                        <strong>{row.outgoingName}</strong>
                        <div style={{ color: '#6b7280', fontSize: 12 }}>{row.outgoingStaffId}</div>
                      </td>
                      <td>
                        <strong>{row.incomingName}</strong>
                        <div style={{ color: '#6b7280', fontSize: 12 }}>{row.incomingStaffId}</div>
                      </td>
                      <td>{row.departmentName}</td>
                      <td>{formatDateLabel(row.checkDate)}</td>
                      <td>
                        <span
                          style={{
                            ...getStatusPillStyle(row.status),
                            borderRadius: 999,
                            display: 'inline-block',
                            fontSize: 12,
                            fontWeight: 600,
                            padding: '4px 10px',
                            textTransform: 'capitalize',
                          }}
                        >
                          {row.status}
                        </span>
                      </td>
                      <td>
                        <span
                          style={{
                            ...getStatusPillStyle(row.adminReview),
                            borderRadius: 999,
                            display: 'inline-block',
                            fontSize: 12,
                            fontWeight: 600,
                            padding: '4px 10px',
                            textTransform: 'capitalize',
                          }}
                        >
                          {row.adminReview === 'pending' ? 'pending review' : row.adminReview}
                        </span>
                      </td>
                      <td>{formatDateTimeLabel(row.createdAt)}</td>
                      <td className="inventory-row-actions inventory-row-actions-left">
                        <div className="shift-turnover-actions-grid">
                          <button
                            type="button"
                            aria-label="View checklist items"
                            title="View checklist items"
                            className="inventory-icon-button"
                            onClick={() => {
                              void loadDetailItems(row)
                            }}
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
                            aria-label="Approve turnover"
                            title="Approve turnover"
                            className="inventory-icon-button inventory-icon-button-success"
                            onClick={() => {
                              void applyAdminReview(row.turnoverId, true)
                            }}
                            disabled={isReviewing || row.adminReview === 'approved'}
                          >
                            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                              <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="1.6" />
                              <path
                                d="M8.5 12.3l2.2 2.2 4.8-5.2"
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
                            aria-label="Reject turnover"
                            title="Reject turnover"
                            className="inventory-icon-button inventory-icon-button-danger"
                            onClick={() => {
                              void applyAdminReview(row.turnoverId, false)
                            }}
                            disabled={isReviewing || row.adminReview === 'rejected'}
                          >
                            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                              <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="1.6" />
                              <path
                                d="M9 9l6 6M15 9l-6 6"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.6"
                                strokeLinecap="round"
                                strokeLinejoin="round"
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

          {!loading && rows.length > 0 && totalPages > 1 && (
            <div className="inventory-pagination">
              <div className="inventory-pagination-controls">
                <button
                  type="button"
                  className="inventory-page-button"
                  disabled={page === 1}
                  onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                >
                  Prev
                </button>
                <span className="inventory-pagination-text">
                  Page {page} of {totalPages}
                </span>
                <button
                  type="button"
                  className="inventory-page-button"
                  disabled={page === totalPages}
                  onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      {activeRecord && (
        <div className="wmr-modal-backdrop shift-turnover-preview-backdrop" role="dialog" aria-modal="true" aria-labelledby="shift-turnover-items-modal-title">
          <div className="wmr-modal shift-turnover-preview-modal">
            <h2 id="shift-turnover-items-modal-title" className="wmr-modal-title">
              Shift Turnover Checklist
            </h2>
            <div className="shift-turnover-preview-meta">
              <p className="wmr-modal-text shift-turnover-preview-meta-line">
                <strong>Turnover No:</strong> {activeRecord.turnoverId}
              </p>
              <p className="wmr-modal-text shift-turnover-preview-meta-line">
                <strong>Check Date:</strong> {formatDateLabel(activeRecord.checkDate)}
              </p>
              <p className="wmr-modal-text shift-turnover-preview-meta-line">
                <strong>Outgoing:</strong> {activeRecord.outgoingName} ({activeRecord.outgoingStaffId})
              </p>
              <p className="wmr-modal-text shift-turnover-preview-meta-line">
                <strong>Incoming:</strong> {activeRecord.incomingName} ({activeRecord.incomingStaffId})
              </p>
              <p className="wmr-modal-text shift-turnover-preview-meta-line shift-turnover-preview-meta-full">
                <strong>Department:</strong> {activeRecord.departmentName}
              </p>
            </div>

            {detailError && (
              <p className="dashboard-error shift-turnover-preview-error">
                {detailError}
              </p>
            )}

            <div className="inventory-table-card shift-turnover-preview-table-wrap">
              <div className="shift-turnover-preview-table-scroll">
                <table className="inventory-table">
                  <thead>
                    <tr>
                      <th scope="col">Item</th>
                      <th scope="col">Property No.</th>
                      <th scope="col">Condition</th>
                      <th scope="col">Remarks</th>
                      <th scope="col">Scanned At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detailLoading ? (
                      <tr>
                        <td colSpan={5}>Loading checklist items...</td>
                      </tr>
                    ) : detailItems.length === 0 ? (
                      <tr>
                        <td colSpan={5}>No checklist items found.</td>
                      </tr>
                    ) : (
                      detailItems.map((item) => (
                        <tr key={item.key}>
                          <td>{item.itemName} ({item.unit})</td>
                          <td>{item.propertyNo}</td>
                          <td style={{ textTransform: 'capitalize' }}>{item.condition}</td>
                          <td>{item.remarks}</td>
                          <td>{item.scannedAt}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="wmr-modal-actions">
              <button type="button" className="wmr-modal-button-secondary" onClick={() => setActiveRecord(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ShiftTurnoverRecordsSection
