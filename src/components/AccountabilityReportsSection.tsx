import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../supabaseClient'
import type { Tables } from '../../supabase'
import useResponsivePageSize from './useResponsivePageSize'

type AccountabilityReportRow = Tables<'accountability_reports'>
type UserRow = Tables<'users'>
type InventoryRow = Tables<'inventory'>
type DepartmentRow = Tables<'departments'>

type AccountabilityRow = {
  key: number
  no: number
  itemName: string
  quantity: number
  unit: string
  propertyNo: string
  issueDate: string | null
  staffName: string
  staffId: string
  departmentId: number | null
  departmentName: string
}

function AccountabilityReportsSection() {
  const pageSize = useResponsivePageSize(10)
  const [page, setPage] = useState(1)
  const [searchQuery, setSearchQuery] = useState('')
  const [departmentFilter, setDepartmentFilter] = useState('all')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [accountabilityReports, setAccountabilityReports] = useState<AccountabilityReportRow[]>([])
  const [users, setUsers] = useState<UserRow[]>([])
  const [inventoryItems, setInventoryItems] = useState<InventoryRow[]>([])
  const [departments, setDepartments] = useState<DepartmentRow[]>([])

  const normalizedSearch = searchQuery.trim().toLowerCase()
  const totalAccountabilityCases = accountabilityReports.filter((record) => record.is_archived !== true).length

  useEffect(() => {
    let mounted = true

    const load = async () => {
      setLoading(true)
      setError(null)

      try {
        const [accRes, usersRes, invRes, deptRes] = await Promise.all([
          supabase
            .from('accountability_reports')
            .select('*')
            .eq('is_archived', false)
            .order('issue_date', { ascending: false })
            .order('accountability_id', { ascending: false }),
          supabase.from('users').select('*').order('full_name', { ascending: true }),
          supabase.from('inventory').select('*').order('item_name', { ascending: true }),
          supabase.from('departments').select('*').eq('is_archived', false).order('dept_name', { ascending: true }),
        ])

        if (accRes.error) throw accRes.error
        if (usersRes.error) throw usersRes.error
        if (invRes.error) throw invRes.error
        if (deptRes.error) throw deptRes.error

        if (!mounted) return

        setAccountabilityReports((accRes.data ?? []) as AccountabilityReportRow[])
        setUsers((usersRes.data ?? []) as UserRow[])
        setInventoryItems((invRes.data ?? []) as InventoryRow[])
        setDepartments((deptRes.data ?? []) as DepartmentRow[])
      } catch (loadError) {
        if (!mounted) return
        const message = loadError instanceof Error ? loadError.message : 'Failed to load accountability reports.'
        setError(message)
      } finally {
        if (mounted) setLoading(false)
      }
    }

    void load()
    return () => { mounted = false }
  }, [])

  const accountabilityRows = useMemo<AccountabilityRow[]>(() => {
    return accountabilityReports
      .filter((record) => record.is_archived !== true)
      .map((record) => {
        const receiver = record.issued_to_id
          ? users.find((user) => user.id === record.issued_to_id) ?? null
          : null
        const inventoryItem = record.item_id != null
          ? inventoryItems.find((item) => item.item_id === record.item_id) ?? null
          : null
        const departmentName = record.department_id != null
          ? departments.find((department) => department.id === record.department_id)?.dept_name ?? '—'
          : '—'

        return {
          key: record.accountability_id,
          no: record.accountability_id,
          itemName: record.description_snapshot ?? inventoryItem?.item_name ?? '—',
          quantity: record.quantity_logged,
          unit: record.unit_snapshot ?? inventoryItem?.unit_of_measure ?? 'units',
          propertyNo: record.property_no_snapshot ?? inventoryItem?.property_no ?? '—',
          issueDate: record.issue_date,
          staffName: receiver?.full_name ?? 'Unknown Staff',
          staffId: receiver?.staff_id ?? '—',
          departmentId: record.department_id,
          departmentName,
        }
      })
      .filter((row) => {
        if (departmentFilter !== 'all' && String(row.departmentId ?? '') !== departmentFilter) {
          return false
        }

        if (!normalizedSearch) return true

        return (
          String(row.no).includes(normalizedSearch) ||
          row.itemName.toLowerCase().includes(normalizedSearch) ||
          row.staffName.toLowerCase().includes(normalizedSearch) ||
          row.staffId.toLowerCase().includes(normalizedSearch) ||
          row.departmentName.toLowerCase().includes(normalizedSearch) ||
          row.propertyNo.toLowerCase().includes(normalizedSearch)
        )
      })
      .sort((a, b) => {
        const aTime = a.issueDate ? new Date(a.issueDate).getTime() : 0
        const bTime = b.issueDate ? new Date(b.issueDate).getTime() : 0
        return bTime - aTime
      })
  }, [accountabilityReports, departmentFilter, departments, inventoryItems, normalizedSearch, users])

  const totalPages = Math.max(1, Math.ceil(accountabilityRows.length / pageSize))

  useEffect(() => {
    setPage(1)
  }, [normalizedSearch, departmentFilter])

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages)
    }
  }, [page, totalPages])

  const visibleRows = useMemo(() => {
    const start = (page - 1) * pageSize
    return accountabilityRows.slice(start, start + pageSize)
  }, [accountabilityRows, page, pageSize])

  const formatDate = (value: string | null) => {
    if (!value) return '—'
    return new Date(value).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })
  }

  return (
    <div className="wmr-layout">
      <header className="dashboard-header">
        <div>
          <h2>Accountability Reports</h2>
          <p>Total Accountability Cases: {totalAccountabilityCases}</p>
        </div>
      </header>

      {error && <p className="dashboard-error">{error}</p>}

      <section className="wmr-toolbar" aria-label="Accountability reports tools">
        <div className="inventory-filters">
          <div className="inventory-search-wrapper">
            <input
              type="search"
              className="inventory-search-input"
              placeholder="Search by no., item, or staff..."
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
          </div>
        </div>
      </section>

      <section className="inventory-table-section" aria-label="Accountability reports table">
        <div className="inventory-table-card">
          <table className="inventory-table">
            <thead>
              <tr>
                <th scope="col">No.</th>
                <th scope="col">Item</th>
                <th scope="col">Quantity</th>
                <th scope="col">Property No.</th>
                <th scope="col">Issued To</th>
                <th scope="col">Department</th>
                <th scope="col">Issue Date</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7}>Loading accountability reports…</td>
                </tr>
              ) : visibleRows.length === 0 ? (
                <tr>
                  <td colSpan={7}>No accountability reports found.</td>
                </tr>
              ) : (
                visibleRows.map((row) => (
                  <tr key={row.key}>
                    <td>{row.no}</td>
                    <td>{row.itemName}</td>
                    <td>{row.quantity} {row.unit}</td>
                    <td>{row.propertyNo}</td>
                    <td>
                      <strong>{row.staffName}</strong>
                      <div style={{ color: '#6b7280', fontSize: 12 }}>{row.staffId}</div>
                    </td>
                    <td>{row.departmentName}</td>
                    <td>{formatDate(row.issueDate)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {!loading && accountabilityRows.length > 0 && (
            <div className="inventory-pagination">
              <span className="inventory-pagination-text">
                {accountabilityRows.length} accountability report{accountabilityRows.length === 1 ? '' : 's'}
              </span>
              {totalPages > 1 && (
                <div className="inventory-pagination-controls">
                  <button type="button" className="inventory-page-button" disabled={page === 1} onClick={() => setPage((prev) => Math.max(1, prev - 1))}>
                    Prev
                  </button>
                  <span className="inventory-pagination-text">Page {page} of {totalPages}</span>
                  <button type="button" className="inventory-page-button" disabled={page === totalPages} onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}>
                    Next
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

export default AccountabilityReportsSection