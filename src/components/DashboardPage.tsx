import { useEffect, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { supabase } from '../supabaseClient'
import type { Tables } from '../../supabase'
import Sidebar from './Sidebar'
import type { SidebarSection } from './Sidebar'
import '../styles/DashboardPage.css'
import '../styles/Inventory.css'
import '../styles/Wmr.css'
import '../styles/Dashboard.css'

type SummaryMetrics = {
  totalItems: number
  serviceable: number
  unserviceable: number
  expired: number
}

type DepartmentOverview = {
  id: number
  name: string
  totalItems: number
  serviceable: number
  unserviceable: number
  staffCount: number
  onlineCount: number
}

type InventoryRow = Tables<'inventory'>
type WmrReportRow = Tables<'wmr_reports'>

function DashboardPage() {
  const [activeSection, setActiveSection] = useState<SidebarSection>('dashboard')
  const [inventoryMode, setInventoryMode] = useState<'list' | 'add'>('list')
  const [summary, setSummary] = useState<SummaryMetrics>({
    totalItems: 0,
    serviceable: 0,
    unserviceable: 0,
    expired: 0,
  })
  const [departments, setDepartments] = useState<DepartmentOverview[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [inventoryItems, setInventoryItems] = useState<InventoryRow[]>([])
  const [inventoryLoading, setInventoryLoading] = useState(false)
  const [inventoryError, setInventoryError] = useState<string | null>(null)
  const [newItemName, setNewItemName] = useState('')
  const [newItemType, setNewItemType] = useState('')
  const [newQuantity, setNewQuantity] = useState('')
  const [newDateAcquired, setNewDateAcquired] = useState('')
  const [newSource, setNewSource] = useState('')
  const [addingItem, setAddingItem] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [wmrSearchQuery, setWmrSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [departmentFilter, setDepartmentFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [wmrTypeFilter, setWmrTypeFilter] = useState('all')
  const [wmrDepartmentFilter, setWmrDepartmentFilter] = useState('all')
  const [wmrStatusFilter, setWmrStatusFilter] = useState('all')
  const [editingItem, setEditingItem] = useState<InventoryRow | null>(null)
  const [editItemName, setEditItemName] = useState('')
  const [editItemType, setEditItemType] = useState('')
  const [editQuantity, setEditQuantity] = useState('')
  const [editDateAcquired, setEditDateAcquired] = useState('')
  const [editExpirationDate, setEditExpirationDate] = useState('')
  const [editSource, setEditSource] = useState('')
  const [editStatus, setEditStatus] = useState('')
  const [editSaving, setEditSaving] = useState(false)
  const [viewImageItem, setViewImageItem] = useState<InventoryRow | null>(null)
  const [viewQrItem, setViewQrItem] = useState<InventoryRow | null>(null)
  const [qrGeneratingId, setQrGeneratingId] = useState<number | null>(null)
  const [wmrReports, setWmrReports] = useState<WmrReportRow[]>([])
  const [wmrLoading, setWmrLoading] = useState(false)
  const [wmrError, setWmrError] = useState<string | null>(null)
  const [activeWmrItem, setActiveWmrItem] = useState<InventoryRow | null>(null)
  const [activeWmrReport, setActiveWmrReport] = useState<WmrReportRow | null>(null)
  const [wmrRemarksInput, setWmrRemarksInput] = useState('')
  const [wmrStatusInput, setWmrStatusInput] = useState('Pending')
  const [isEditingWmrRemarks, setIsEditingWmrRemarks] = useState(false)
  const [wmrSaving, setWmrSaving] = useState(false)

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true)
      setError(null)

      try {
        const [totalRes, serviceableRes, unserviceableRes, expiredRes] = await Promise.all([
          supabase.from('inventory').select('*', { count: 'exact', head: true }),
          supabase.from('inventory').select('*', { count: 'exact', head: true }).eq('status', 'Serviceable'),
          supabase.from('inventory').select('*', { count: 'exact', head: true }).eq('status', 'Unserviceable'),
          supabase.from('inventory').select('*', { count: 'exact', head: true }).eq('status', 'Expired'),
        ])

        if (totalRes.error || serviceableRes.error || unserviceableRes.error || expiredRes.error) {
          throw totalRes.error || serviceableRes.error || unserviceableRes.error || expiredRes.error
        }

        setSummary({
          totalItems: totalRes.count ?? 0,
          serviceable: serviceableRes.count ?? 0,
          unserviceable: unserviceableRes.count ?? 0,
          expired: expiredRes.count ?? 0,
        })

        const { data: deptRows, error: deptError } = await supabase
          .from('departments')
          .select('id, dept_name')
          .order('id', { ascending: true })

        if (deptError) throw deptError

        const deptMetrics: DepartmentOverview[] = []

        for (const dept of deptRows ?? []) {
          const [invTotalRes, invServRes, invUnservRes, staffTotalRes, staffOnlineRes] = await Promise.all([
            supabase
              .from('inventory')
              .select('*', { count: 'exact', head: true })
              .eq('department_id', dept.id),
            supabase
              .from('inventory')
              .select('*', { count: 'exact', head: true })
              .eq('department_id', dept.id)
              .eq('status', 'Serviceable'),
            supabase
              .from('inventory')
              .select('*', { count: 'exact', head: true })
              .eq('department_id', dept.id)
              .eq('status', 'Unserviceable'),
            supabase
              .from('users')
              .select('*', { count: 'exact', head: true })
              .eq('department_id', dept.id),
            supabase
              .from('users')
              .select('*', { count: 'exact', head: true })
              .eq('department_id', dept.id)
              .eq('is_online', true),
          ])

          if (
            invTotalRes.error ||
            invServRes.error ||
            invUnservRes.error ||
            staffTotalRes.error ||
            staffOnlineRes.error
          ) {
            throw (
              invTotalRes.error ||
              invServRes.error ||
              invUnservRes.error ||
              staffTotalRes.error ||
              staffOnlineRes.error
            )
          }

          deptMetrics.push({
            id: dept.id,
            name: dept.dept_name,
            totalItems: invTotalRes.count ?? 0,
            serviceable: invServRes.count ?? 0,
            unserviceable: invUnservRes.count ?? 0,
            staffCount: staffTotalRes.count ?? 0,
            onlineCount: staffOnlineRes.count ?? 0,
          })
        }

        setDepartments(deptMetrics)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load dashboard data.'
        setError(message)
      } finally {
        setLoading(false)
      }
    }

    void fetchDashboardData()
  }, [])

  useEffect(() => {
    const fetchInventory = async () => {
      setInventoryLoading(true)
      setInventoryError(null)

      const { data, error: invError } = await supabase.from('inventory').select('*').order('item_id', {
        ascending: true,
      })

      if (invError) {
        setInventoryError(invError.message)
      } else {
        setInventoryItems(data ?? [])
      }

      setInventoryLoading(false)
    }

    void fetchInventory()
  }, [])

  useEffect(() => {
    const fetchWmrReports = async () => {
      setWmrLoading(true)
      setWmrError(null)

      const { data, error: wmrFetchError } = await supabase
        .from('wmr_reports')
        .select('*')
        .order('report_id', { ascending: true })

      if (wmrFetchError) {
        setWmrError(wmrFetchError.message)
      } else {
        setWmrReports(data ?? [])
      }

      setWmrLoading(false)
    }

    void fetchWmrReports()
  }, [])

  const formatValue = (value: number) => (loading ? '—' : value.toString())

  const normalizedSearch = searchQuery.trim().toLowerCase()
  const normalizedWmrSearch = wmrSearchQuery.trim().toLowerCase()

  const typeOptions = Array.from(new Set(inventoryItems.map((item) => item.item_type))).sort()
  const dynamicStatusOptions = Array.from(
    new Set(inventoryItems.map((item) => item.status).filter((s): s is string => !!s)),
  )
  const statusOptions = Array.from(
    new Set<string>(['Serviceable', 'Unserviceable', ...dynamicStatusOptions]),
  ).sort()
  const acquisitionModeOptions = Array.from(
    new Set(inventoryItems.map((item) => item.acquisition_mode).filter((m): m is string => !!m)),
  ).sort()

  const wasteInventoryItems = inventoryItems.filter((item) => item.status?.trim() === 'Unserviceable')

  const filteredWasteItems = wasteInventoryItems.filter((item) => {
    const reportId = `WMR-${item.item_id.toString().padStart(3, '0')}`

    if (normalizedWmrSearch) {
      const matchesSearch =
        reportId.toLowerCase().includes(normalizedWmrSearch) ||
        item.item_name.toLowerCase().includes(normalizedWmrSearch) ||
        item.item_type.toLowerCase().includes(normalizedWmrSearch)

      if (!matchesSearch) return false
    }

    if (wmrTypeFilter !== 'all' && item.item_type !== wmrTypeFilter) {
      return false
    }

    if (
      wmrDepartmentFilter !== 'all' &&
      (item.department_id === null || String(item.department_id) !== wmrDepartmentFilter)
    ) {
      return false
    }

    if (wmrStatusFilter !== 'all') {
      const report = wmrReports.find((r) => r.item_id === item.item_id) || null
      const status = report?.status?.trim() || null

      if (status !== wmrStatusFilter) {
        return false
      }
    }

    return true
  })

  const filteredInventoryItems = inventoryItems.filter((item) => {
    const paddedId = `ITEM-${item.item_id.toString().padStart(3, '0')}`
    const matchesSearch =
      !normalizedSearch ||
      paddedId.toLowerCase().includes(normalizedSearch) ||
      item.item_name.toLowerCase().includes(normalizedSearch)

    const matchesType = typeFilter === 'all' || item.item_type === typeFilter

    const matchesDepartment =
      departmentFilter === 'all' || (item.department_id !== null && String(item.department_id) === departmentFilter)

    const matchesStatus = statusFilter === 'all' || item.status === statusFilter

    return matchesSearch && matchesType && matchesDepartment && matchesStatus
  })

  const openWmrRemarksModal = (item: InventoryRow) => {
    const existingReport = wmrReports.find((report) => report.item_id === item.item_id) ?? null

    setActiveWmrItem(item)
    setActiveWmrReport(existingReport)
    setWmrRemarksInput(existingReport?.admin_remarks ?? '')
    setWmrStatusInput(existingReport?.status ?? 'Pending')
    setIsEditingWmrRemarks(!existingReport || !existingReport.admin_remarks)
  }

  const closeWmrRemarksModal = () => {
    if (wmrSaving) return
    setActiveWmrItem(null)
    setActiveWmrReport(null)
    setWmrRemarksInput('')
    setWmrStatusInput('Pending')
    setIsEditingWmrRemarks(false)
    setWmrSaving(false)
  }

  const handleSaveWmrRemarks = async () => {
    if (!activeWmrItem) return

    setWmrSaving(true)
    setWmrError(null)

    const existingReport = activeWmrReport

    const statusToSave = wmrStatusInput || 'Pending'

    if (existingReport) {
      const { data, error: updateError } = await supabase
        .from('wmr_reports')
        .update({ admin_remarks: wmrRemarksInput || null, status: statusToSave })
        .eq('report_id', existingReport.report_id)
        .select('*')

      if (updateError) {
        setWmrError(updateError.message)
        setWmrSaving(false)
        return
      }

      const updated = (data?.[0] ?? existingReport) as WmrReportRow
      setActiveWmrReport(updated)
      setWmrReports((prev) => prev.map((r) => (r.report_id === updated.report_id ? updated : r)))
    } else {
      const { data, error: insertError } = await supabase
        .from('wmr_reports')
        .insert([
          {
            item_id: activeWmrItem.item_id,
            admin_remarks: wmrRemarksInput || null,
            status: statusToSave,
          },
        ])
        .select('*')

      if (insertError) {
        setWmrError(insertError.message)
        setWmrSaving(false)
        return
      }

      const inserted = (data?.[0] ?? null) as WmrReportRow | null

      if (inserted) {
        setActiveWmrReport(inserted)
        setWmrReports((prev) => [...prev, inserted])
      }
    }

    setIsEditingWmrRemarks(false)
    setWmrSaving(false)
  }

  const openEditItem = (item: InventoryRow) => {
    setEditingItem(item)
    setEditItemName(item.item_name)
    setEditItemType(item.item_type)
    setEditQuantity(item.quantity != null ? item.quantity.toString() : '')
    setEditDateAcquired(item.date_acquired)
    setEditExpirationDate(item.expiration_date ?? '')
    setEditSource(item.acquisition_mode ?? '')
    setEditStatus(item.status ?? '')
  }

  const handleSaveEdit = async () => {
    if (!editingItem) return

    if (!editItemName || !editItemType || !editDateAcquired) {
      setInventoryError('Item name, type, and date acquired are required.')
      return
    }

    setEditSaving(true)
    setInventoryError(null)

    const quantityNumber = editQuantity ? Number(editQuantity) : null

    const { error: updateError } = await supabase
      .from('inventory')
      .update({
        item_name: editItemName,
        item_type: editItemType,
        quantity: Number.isNaN(quantityNumber) ? null : quantityNumber,
        date_acquired: editDateAcquired,
        expiration_date: editExpirationDate || null,
        acquisition_mode: editSource || null,
        status: editStatus || null,
      })
      .eq('item_id', editingItem.item_id)

    if (updateError) {
      setInventoryError(updateError.message)
      setEditSaving(false)
      return
    }

    // Reload inventory list from database
    setInventoryLoading(true)
    const { data, error: reloadError } = await supabase.from('inventory').select('*').order('item_id', {
      ascending: true,
    })

    if (reloadError) {
      setInventoryError(reloadError.message)
    } else {
      setInventoryItems(data ?? [])
    }

    setInventoryLoading(false)
    setEditSaving(false)
    setEditingItem(null)
  }

  const handleAddItem = async () => {
    if (!newItemName || !newItemType || !newDateAcquired) {
      setInventoryError('Item name, type, and date acquired are required.')
      return
    }

    setAddingItem(true)
    setInventoryError(null)

    const quantityNumber = newQuantity ? Number(newQuantity) : null

    const { error: insertError } = await supabase.from('inventory').insert([
      {
        item_name: newItemName,
        item_type: newItemType,
        quantity: Number.isNaN(quantityNumber) ? null : quantityNumber,
        date_acquired: newDateAcquired,
        acquisition_mode: newSource || null,
      },
    ])

    if (insertError) {
      setInventoryError(insertError.message)
      setAddingItem(false)
      return
    }

    // Clear form
    setNewItemName('')
    setNewItemType('')
    setNewQuantity('')
    setNewDateAcquired('')
    setNewSource('')

    // Reload inventory list
    setInventoryLoading(true)
    const { data, error: reloadError } = await supabase.from('inventory').select('*').order('item_id', {
      ascending: true,
    })

    if (reloadError) {
      setInventoryError(reloadError.message)
    } else {
      setInventoryItems(data ?? [])
    }

    setInventoryLoading(false)
    setAddingItem(false)
  }

  const handleQrButtonClick = async (item: InventoryRow) => {
    if (item.qr_code) {
      setViewQrItem(item)
      return
    }

    setQrGeneratingId(item.item_id)
    setInventoryError(null)

    const qrValue = `ITEM-${item.item_id.toString().padStart(3, '0')}`

    const { data, error: qrError } = await supabase
      .from('inventory')
      .update({ qr_code: qrValue })
      .eq('item_id', item.item_id)
      .select('*')

    if (qrError) {
      setInventoryError(qrError.message)
      setQrGeneratingId(null)
      return
    }

    const updatedItem = (data?.[0] ?? item) as InventoryRow

    setInventoryItems((prev) => prev.map((row) => (row.item_id === updatedItem.item_id ? updatedItem : row)))
    setViewQrItem(updatedItem)
    setQrGeneratingId(null)
  }

  return (
    <div className="dashboard-page">
      <Sidebar activeSection={activeSection} onChangeSection={setActiveSection} />

      <main className="dashboard-main">
        {activeSection === 'dashboard' && (
          <>
            <header className="dashboard-header">
              <div>
                <h2>Dashboard</h2>
                <p>Welcome back, Super Admin</p>
              </div>
            </header>

            {error && <p className="dashboard-error">{error}</p>}

            <section className="dashboard-metrics" aria-label="Item summary">
              <article className="metric-card">
                <div className="metric-text">
                  <div className="metric-label">Total Items</div>
                  <div className="metric-value">{formatValue(summary.totalItems)}</div>
                </div>
                <div className="metric-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                    <path
                      d="M7 8l5-3 5 3-5 3-5-3Z M7 8v6l5 3 5-3V8 M7 14l5 3 5-3 M12 11v6"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              </article>
              <article className="metric-card metric-card-serviceable">
                <div className="metric-text">
                  <div className="metric-label">Serviceable</div>
                  <div className="metric-value">{formatValue(summary.serviceable)}</div>
                </div>
                <div className="metric-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                    <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.8" />
                    <path
                      d="M8.5 12.5l2.2 2.2L15.5 10"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              </article>
              <article className="metric-card metric-card-unserviceable">
                <div className="metric-text">
                  <div className="metric-label">Unserviceable</div>
                  <div className="metric-value">{formatValue(summary.unserviceable)}</div>
                </div>
                <div className="metric-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                    <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.8" />
                    <path d="M8 8l8 8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                </div>
              </article>
              <article className="metric-card">
                <div className="metric-text">
                  <div className="metric-label">Expired Items</div>
                  <div className="metric-value">{formatValue(summary.expired)}</div>
                </div>
                <div className="metric-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                    <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.8" />
                    <path
                      d="M12 8v4l3 2"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              </article>
            </section>

            <section className="dashboard-actions" aria-label="Key actions">
              <button
                type="button"
                className="action-card action-card-item"
                onClick={() => setActiveSection('inventory')}
              >
            <span className="action-card-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <rect x="5" y="8" width="14" height="10" rx="2" ry="2" fill="none" stroke="currentColor" strokeWidth="1.8" />
                <path d="M5 11h14" fill="none" stroke="currentColor" strokeWidth="1.6" />
              </svg>
            </span>
            <div className="action-card-body">
              <h3>Item Management</h3>
              <p>Add and manage inventory items</p>
            </div>
          </button>
          <button type="button" className="action-card action-card-staff">
            <span className="action-card-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <circle cx="9" cy="10" r="2.4" fill="none" stroke="currentColor" strokeWidth="1.6" />
                <circle cx="16" cy="11" r="2" fill="none" stroke="currentColor" strokeWidth="1.4" />
                <path d="M5.5 18c.6-2 1.9-3 3.5-3s2.9 1 3.5 3" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                <path d="M13.8 18c.4-1.3 1.3-2 2.3-2 1 0 1.9.6 2.3 1.7" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
            </span>
            <div className="action-card-body">
              <h3>Staff Management</h3>
              <p>Manage departments and staff</p>
            </div>
          </button>
          <button
            type="button"
            className="action-card action-card-wmr"
            onClick={() => setActiveSection('wmr')}
          >
            <span className="action-card-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path d="M12 4L3 19h18L12 4z" fill="none" stroke="currentColor" strokeWidth="1.8" />
                <path d="M12 9v5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                <circle cx="12" cy="16" r="0.9" fill="currentColor" />
              </svg>
            </span>
            <div className="action-card-body">
              <h3>Waste Material Reports</h3>
              <p>View WMR cases</p>
            </div>
          </button>
          </section>

          <section className="dashboard-row" aria-label="Charts">
          <article className="panel" aria-label="Inventory by Department">
            <header className="panel-header">
              <h3>Inventory by Department</h3>
            </header>
            <div className="panel-body panel-body-placeholder">Bar chart placeholder</div>
          </article>
          <article className="panel" aria-label="Items by Type (Top 5)">
            <header className="panel-header">
              <h3>Items by Type (Top 5)</h3>
            </header>
            <div className="panel-body panel-body-placeholder">Pie chart placeholder</div>
          </article>
          </section>

          <section className="dashboard-row" aria-label="Department overview">
          <article className="panel panel-wide">
            <header className="panel-header">
              <h3>Department Overview</h3>
            </header>
            <div className="panel-body department-grid">
              {departments.map((dept) => (
                <div key={dept.id} className="dept-card">
                  <h4>{dept.name}</h4>
                  <div className="dept-metrics">
                    <div className="dept-metric">
                      <span className="dept-metric-label">Total Items</span>
                      <span className="dept-metric-value">{formatValue(dept.totalItems)}</span>
                    </div>
                    <div className="dept-metric dept-metric-serviceable">
                      <span className="dept-metric-label">Serviceable</span>
                      <span className="dept-metric-value">{formatValue(dept.serviceable)}</span>
                    </div>
                    <div className="dept-metric dept-metric-unserviceable">
                      <span className="dept-metric-label">Unserviceable</span>
                      <span className="dept-metric-value">{formatValue(dept.unserviceable)}</span>
                    </div>
                  </div>
                  <p className="dept-footer">
                    {formatValue(dept.staffCount)} staff members • {formatValue(dept.onlineCount)} online
                  </p>
                </div>
              ))}
            </div>
          </article>
            </section>
          </>
        )}

        {activeSection === 'inventory' && (
          <div className="inventory-layout">
            <header className="dashboard-header">
              <div>
                <h2>Inventory</h2>
                <p>{loading ? 'Loading items…' : `${formatValue(summary.totalItems)} total items registered`}</p>
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
                <span className="inventory-add-plus" aria-hidden="true">
                  +
                </span>
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

                <section className="inventory-table-section" aria-label="Inventory table">
                  <div className="inventory-table-card">
                    <table className="inventory-table">
                      <thead>
                        <tr>
                          <th scope="col">ID</th>
                          <th scope="col">Name</th>
                          <th scope="col">Type</th>
                          <th scope="col">Qty</th>
                          <th scope="col">Acquired</th>
                          <th scope="col">Expiration</th>
                          <th scope="col">Source</th>
                          <th scope="col">Status</th>
                          <th scope="col">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {inventoryLoading ? (
                          <tr>
                            <td colSpan={9}>Loading items…</td>
                          </tr>
                        ) : filteredInventoryItems.length === 0 ? (
                          <tr>
                            <td colSpan={9}>No items found.</td>
                          </tr>
                        ) : (
                          filteredInventoryItems.map((item) => {
                            const paddedId = `ITEM-${item.item_id.toString().padStart(3, '0')}`
                            const acquisitionMode = item.acquisition_mode?.trim() || null
                            const status = item.status?.trim() || null

                            return (
                              <tr key={item.item_id}>
                                <td>{paddedId}</td>
                                <td>{item.item_name}</td>
                                <td>{item.item_type}</td>
                                <td>{item.quantity ?? '—'}</td>
                                <td>{item.date_acquired}</td>
                                <td>{item.expiration_date ?? '—'}</td>
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
                                            : ''
                                      }`}
                                    >
                                      {status}
                                    </span>
                                  ) : (
                                    '—'
                                  )}
                                </td>
                                <td className="inventory-row-actions">
                                  <button
                                    type="button"
                                    aria-label="Edit item"
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
                                    className="inventory-icon-button"
                                    disabled={!item.photo_path}
                                    onClick={() => {
                                      if (item.photo_path) setViewImageItem(item)
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
                                </td>
                              </tr>
                            )
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </section>
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
                    <div className="inventory-field inventory-field-full">
                      <label htmlFor="add-source">Source</label>
                      <select
                        id="add-source"
                        className="inventory-input"
                        value={newSource}
                        onChange={(e) => setNewSource(e.target.value)}
                      >
                        <option value="">Select source</option>
                        {acquisitionModeOptions.map((mode) => (
                          <option key={mode} value={mode}>
                            {mode}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="inventory-field inventory-field-full">
                      <span className="inventory-photo-label">Photo</span>
                      <div className="inventory-photo-drop">
                        <span className="inventory-photo-text">Click to capture / upload</span>
                      </div>
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
        )}

        {activeSection === 'wmr' && (
          <div className="wmr-layout">
            <header className="dashboard-header">
              <div>
                <h2>Waste Materials Report</h2>
                <p>
                  {wmrLoading || inventoryLoading
                    ? 'Loading waste materials…'
                    : `Total WMR Cases: ${wasteInventoryItems.length}`}
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
                        <td colSpan={7}>Loading waste materials…</td>
                      </tr>
                    ) : filteredWasteItems.length === 0 ? (
                      <tr>
                        <td colSpan={7}>No waste materials reported.</td>
                      </tr>
                    ) : (
                      filteredWasteItems.map((item) => {
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
                            <td>{dateReported}</td>
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
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        )}
      </main>

      {editingItem && (
        <div
          className="logout-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-item-modal-title"
        >
          <div className="logout-modal">
            <h2 id="edit-item-modal-title" className="logout-modal-title">
              Edit Item
            </h2>
            <div className="inventory-add-grid">
              <div className="inventory-field">
                <label htmlFor="edit-item-name">
                  Item Name <span className="inventory-required">*</span>
                </label>
                <input
                  id="edit-item-name"
                  type="text"
                  className="inventory-input"
                  value={editItemName}
                  onChange={(e) => setEditItemName(e.target.value)}
                />
              </div>
              <div className="inventory-field">
                <label htmlFor="edit-item-type">
                  Item Type <span className="inventory-required">*</span>
                </label>
                <select
                  id="edit-item-type"
                  className="inventory-input"
                  value={editItemType}
                  onChange={(e) => setEditItemType(e.target.value)}
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
                <label htmlFor="edit-quantity">Quantity</label>
                <input
                  id="edit-quantity"
                  type="number"
                  className="inventory-input"
                  value={editQuantity}
                  onChange={(e) => setEditQuantity(e.target.value)}
                />
              </div>
              <div className="inventory-field">
                <label htmlFor="edit-date-acquired">
                  Date Acquired <span className="inventory-required">*</span>
                </label>
                <input
                  id="edit-date-acquired"
                  type="date"
                  className="inventory-input"
                  value={editDateAcquired}
                  onChange={(e) => setEditDateAcquired(e.target.value)}
                />
              </div>
              <div className="inventory-field">
                <label htmlFor="edit-expiration">Expiration Date</label>
                <input
                  id="edit-expiration"
                  type="date"
                  className="inventory-input"
                  value={editExpirationDate}
                  onChange={(e) => setEditExpirationDate(e.target.value)}
                />
              </div>
              <div className="inventory-field">
                <label htmlFor="edit-source">Source</label>
                <select
                  id="edit-source"
                  className="inventory-input"
                  value={editSource}
                  onChange={(e) => setEditSource(e.target.value)}
                >
                  <option value="">Select source</option>
                  {acquisitionModeOptions.map((mode) => (
                    <option key={mode} value={mode}>
                      {mode}
                    </option>
                  ))}
                </select>
              </div>
              <div className="inventory-field">
                <label htmlFor="edit-status">Status</label>
                <select
                  id="edit-status"
                  className="inventory-input"
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                >
                  <option value="">Select status</option>
                  {statusOptions.map((statusOption) => (
                    <option key={statusOption} value={statusOption}>
                      {statusOption}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="logout-modal-actions wmr-modal-actions">
              <button
                type="button"
                className="logout-modal-button-secondary"
                onClick={() => !editSaving && setEditingItem(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="logout-modal-button-primary"
                onClick={handleSaveEdit}
                disabled={editSaving}
              >
                {editSaving ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {viewImageItem && (
        <div
          className="logout-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="view-image-modal-title"
        >
          <div className="logout-modal">
            <h2 id="view-image-modal-title" className="logout-modal-title">
              Item Photo
            </h2>
            {viewImageItem.photo_path ? (
              <img
                src={viewImageItem.photo_path}
                alt={viewImageItem.item_name}
                style={{ width: '100%', borderRadius: 12, marginBottom: 12 }}
              />
            ) : (
              <p className="logout-modal-text">No photo available for this item.</p>
            )}
            <div className="logout-modal-actions">
              <button
                type="button"
                className="logout-modal-button-secondary"
                onClick={() => setViewImageItem(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {viewQrItem && (
        <div
          className="logout-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="view-qr-modal-title"
        >
          <div className="logout-modal">
            <h2 id="view-qr-modal-title" className="logout-modal-title">
              Item QR Code
            </h2>
            {viewQrItem.qr_code ? (
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
                <QRCodeSVG
                  value={viewQrItem.qr_code}
                  size={200}
                  bgColor="transparent"
                  fgColor="#111827"
                  includeMargin
                />
              </div>
            ) : (
              <p className="logout-modal-text">No QR code available for this item.</p>
            )}
            <div className="logout-modal-actions">
              <button
                type="button"
                className="logout-modal-button-secondary"
                onClick={() => setViewQrItem(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {activeWmrItem && (
        <div
          className="wmr-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="wmr-remarks-modal-title"
        >
          <div className="wmr-modal">
            <h2 id="wmr-remarks-modal-title" className="wmr-modal-title">
              {activeWmrReport && !isEditingWmrRemarks ? 'View Remarks' : 'Add Remarks'}
            </h2>
            <p className="wmr-modal-text">
              {activeWmrItem.item_name} 
              <span style={{ color: '#6b7280', fontSize: 12 }}>
                {' '}
                ({activeWmrItem.item_type})
              </span>
            </p>
            {activeWmrReport && !isEditingWmrRemarks ? (
              <>
                <div className="inventory-field">
                  <label style={{ fontSize: 12, color: '#6b7280' }}>Remarks</label>
                  <div className="inventory-input" style={{ minHeight: 60, paddingTop: 6 }}>
                    {wmrRemarksInput ? (
                      <span style={{ fontSize: 13, color: '#111827', whiteSpace: 'pre-wrap' }}>
                        {wmrRemarksInput}
                      </span>
                    ) : (
                      <span style={{ fontSize: 13, color: '#9ca3af' }}>No remarks yet.</span>
                    )}
                  </div>
                </div>
                <div className="inventory-field">
                  <label style={{ fontSize: 12, color: '#6b7280' }}>Status</label>
                  <div>
                    <span
                      className={`badge ${
                        wmrStatusInput === 'Pending'
                          ? 'badge-status-pending'
                          : wmrStatusInput === 'For Disposal'
                            ? 'badge-status-disposal'
                            : wmrStatusInput === 'For Repair'
                              ? 'badge-status-repair'
                              : wmrStatusInput === 'Repaired'
                                ? 'badge-status-repaired'
                                : ''
                      }`}
                    >
                      {wmrStatusInput}
                    </span>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="inventory-field">
                  <label htmlFor="wmr-remarks-input" style={{ fontSize: 12, color: '#6b7280' }}>
                    Remarks
                  </label>
                  <textarea
                    id="wmr-remarks-input"
                    className="inventory-input"
                    style={{ minHeight: 90, resize: 'vertical' }}
                    value={wmrRemarksInput}
                    onChange={(e) => setWmrRemarksInput(e.target.value)}
                  />
                </div>
                <div className="inventory-field">
                  <label htmlFor="wmr-status-select" style={{ fontSize: 12, color: '#6b7280' }}>
                    Status
                  </label>
                  <select
                    id="wmr-status-select"
                    className="inventory-input"
                    value={wmrStatusInput}
                    onChange={(e) => setWmrStatusInput(e.target.value)}
                  >
                    <option value="Pending">Pending</option>
                    <option value="For Disposal">For Disposal</option>
                    <option value="For Repair">For Repair</option>
                    <option value="Repaired">Repaired</option>
                  </select>
                </div>
              </>
            )}
            <div className="wmr-modal-actions">
              {activeWmrReport && !isEditingWmrRemarks ? (
                <>
                  <button
                    type="button"
                    className="wmr-modal-button-secondary"
                    onClick={closeWmrRemarksModal}
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    className="wmr-modal-button-save"
                    onClick={() => setIsEditingWmrRemarks(true)}
                  >
                    Edit
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    className="wmr-modal-button-secondary"
                    onClick={closeWmrRemarksModal}
                    disabled={wmrSaving}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="wmr-modal-button-save"
                    onClick={handleSaveWmrRemarks}
                    disabled={wmrSaving}
                  >
                    {wmrSaving ? 'Saving…' : 'Save'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default DashboardPage
