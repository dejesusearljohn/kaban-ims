import { useEffect, useState } from 'react'
import { supabase } from '../../supabaseClient'

interface Props {
  userId: string
  departmentId: number | null
  initialReportId?: number | null
  onInitialReportHandled?: () => void
}

interface WmrReport {
  report_id: number
  item_id: number | null
  location: string | null
  reason_damage: string | null
  status: string | null
  date_reported: string | null
  admin_remarks: string | null
  quantity_reported: number
  item_name?: string
  unit_of_measure?: string | null
}

interface InventoryOption {
  item_id: number
  item_name: string
  quantity: number | null
  unit_of_measure: string | null
}

interface DepartmentOption {
  id: number
  dept_name: string
}

const statusClass = (s: string | null) => {
  if (s === 'resolved') return 'dept-badge dept-badge-resolved'
  if (s === 'rejected') return 'dept-badge dept-badge-rejected'
  return 'dept-badge dept-badge-pending'
}

export default function DepartmentReportsSection({ userId, departmentId, initialReportId = null, onInitialReportHandled }: Props) {
  const [reports, setReports] = useState<WmrReport[]>([])
  const [inventoryOptions, setInventoryOptions] = useState<InventoryOption[]>([])
  const [departmentOptions, setDepartmentOptions] = useState<DepartmentOption[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [selectedReport, setSelectedReport] = useState<WmrReport | null>(null)
  const [showDetailsModal, setShowDetailsModal] = useState(false)

  const [form, setForm] = useState({
    item_id: '',
    quantity_reported: '1',
    location: '',
    reason_damage: '',
    date_reported: new Date().toISOString().slice(0, 10),
  })

  const loadReports = async () => {
    const { data } = await supabase
      .from('wmr_reports')
      .select('report_id, item_id, location, reason_damage, status, date_reported, admin_remarks, quantity_reported')
      .eq('last_user_id', userId)
      .eq('is_archived', false)
      .order('date_reported', { ascending: false })

    if (!data) return

    // Enrich with item labels and units from inventory
    const itemIds = [...new Set(data.map((r) => r.item_id).filter(Boolean))] as number[]
    let itemMetaById: Record<number, { item_name: string; unit_of_measure: string | null }> = {}
    if (itemIds.length) {
      const { data: inv } = await supabase
        .from('inventory')
        .select('item_id, item_name, unit_of_measure')
        .in('item_id', itemIds)
      if (inv) inv.forEach((i) => { itemMetaById[i.item_id] = { item_name: i.item_name, unit_of_measure: i.unit_of_measure } })
    }

    setReports(data.map((r) => ({
      ...r,
      item_name: r.item_id ? itemMetaById[r.item_id]?.item_name : undefined,
      unit_of_measure: r.item_id ? itemMetaById[r.item_id]?.unit_of_measure ?? null : null,
    })))
  }

  const loadInventoryOptions = async () => {
    const invQuery = supabase
      .from('inventory')
      .select('item_id, item_name, quantity, unit_of_measure')
      .order('item_name')
    if (departmentId) invQuery.eq('department_id', departmentId)
    const { data: inv } = await invQuery
    setInventoryOptions((inv ?? []) as InventoryOption[])
  }

  const loadDepartmentOptions = async () => {
    const { data: departments } = await supabase
      .from('departments')
      .select('id, dept_name')
      .eq('is_archived', false)
      .order('dept_name')

    const nextDepartments = (departments ?? []) as DepartmentOption[]
    setDepartmentOptions(nextDepartments)

    if (!form.location && departmentId != null) {
      const currentDepartment = nextDepartments.find((department) => department.id === departmentId)
      if (currentDepartment) {
        setForm((prev) => ({ ...prev, location: currentDepartment.dept_name }))
      }
    }
  }

  useEffect(() => {
    if (!userId) return
    let mounted = true

    const init = async () => {
      try {
        await loadReports()
        if (mounted) {
          await Promise.all([loadInventoryOptions(), loadDepartmentOptions()])
        }
      } finally {
        if (mounted) setLoading(false)
      }
    }
    init()
    return () => { mounted = false }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, departmentId])

  useEffect(() => {
    if (!initialReportId || reports.length === 0) return

    const targetReport = reports.find((report) => report.report_id === initialReportId)
    if (!targetReport) {
      onInitialReportHandled?.()
      return
    }

    setSelectedReport(targetReport)
    setShowDetailsModal(true)
    onInitialReportHandled?.()
  }, [initialReportId, onInitialReportHandled, reports])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!form.item_id) {
      setError('Please select an item to report.')
      return
    }
    const selectedItem = inventoryOptions.find((item) => String(item.item_id) === form.item_id) ?? null
    const quantityReported = Number(form.quantity_reported)
    if (!selectedItem) {
      setError('Selected item is no longer available.')
      return
    }
    if (!Number.isInteger(quantityReported) || quantityReported <= 0) {
      setError('Quantity must be a whole number greater than zero.')
      return
    }
    if (quantityReported > (selectedItem.quantity ?? 0)) {
      setError('Reported quantity cannot exceed the available inventory quantity.')
      return
    }
    if (!form.location.trim() || !form.reason_damage.trim()) {
      setError('Location and reason are required.')
      return
    }
    setSubmitting(true)
    try {
      const itemId = Number(form.item_id)
      const { data: insertedReports, error: dbErr } = await supabase
        .from('wmr_reports')
        .insert({
          last_user_id: userId,
          item_id: itemId,
          quantity_reported: quantityReported,
          location: form.location.trim(),
          reason_damage: form.reason_damage.trim(),
          date_reported: form.date_reported || new Date().toISOString().slice(0, 10),
          status: 'Pending',
          is_archived: false,
          uid: crypto.randomUUID(),
        })
        .select('report_id')
      if (dbErr) throw dbErr

      const updatedQuantity = (selectedItem.quantity ?? 0) - quantityReported
      const { error: invErr } = await supabase
        .from('inventory')
        .update({ quantity: updatedQuantity })
        .eq('item_id', itemId)
      if (invErr) {
        const insertedReportId = insertedReports?.[0]?.report_id
        if (insertedReportId != null) {
          await supabase.from('wmr_reports').delete().eq('report_id', insertedReportId)
        }
        throw invErr
      }

      setSuccess('Report submitted successfully.')
      setForm((prev) => ({
        item_id: '',
        quantity_reported: '1',
        location: departmentId != null
          ? (departmentOptions.find((department) => department.id === departmentId)?.dept_name ?? prev.location)
          : '',
        reason_damage: '',
        date_reported: new Date().toISOString().slice(0, 10),
      }))
      setShowForm(false)
      await loadReports()
      await loadInventoryOptions()
      setTimeout(() => setSuccess(''), 4000)
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : 'Failed to submit report. Please try again.'
      setError(message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="dept-section">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div>
          <h1 className="dept-page-title" style={{ marginBottom: 4 }}>Reports</h1>
          <p style={{ fontSize: 13, color: 'var(--dept-text-muted)', margin: 0 }}>Submit and track WMR reports.</p>
        </div>
        {!showForm && (
          <button className="dept-btn dept-btn-primary" onClick={() => setShowForm(true)}>
            <svg viewBox="0 0 24 24" fill="none" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            New
          </button>
        )}
      </div>

      {success && (
        <div className="dept-alert dept-alert-success" style={{ marginBottom: 12 }}>
          <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          {success}
        </div>
      )}

      {showForm && (
        <div className="dept-card" style={{ marginBottom: 16 }}>
          <div className="dept-card-header">
            <p className="dept-card-title">New WMR Report</p>
            <button
              className="dept-btn dept-btn-secondary"
              style={{ padding: '4px 10px', fontSize: 12 }}
              onClick={() => { setShowForm(false); setError('') }}
            >
              Cancel
            </button>
          </div>
          <div className="dept-card-body">
            {error && (
              <div className="dept-alert dept-alert-error" style={{ marginBottom: 12 }}>
                <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                {error}
              </div>
            )}
            <form className="dept-form" onSubmit={handleSubmit}>
              <div className="dept-form-group">
                <label>Item *</label>
                <select
                  value={form.item_id}
                  onChange={(e) => {
                    const nextItemId = e.target.value
                    const nextItem = inventoryOptions.find((item) => String(item.item_id) === nextItemId) ?? null
                    const availableQuantity = Math.max(1, nextItem?.quantity ?? 1)
                    setForm((prev) => ({
                      ...prev,
                      item_id: nextItemId,
                      quantity_reported: String(Math.min(Number(prev.quantity_reported) || 1, availableQuantity)),
                    }))
                  }}
                >
                  <option value="">— Select item —</option>
                  {inventoryOptions.map((i) => (
                    <option key={i.item_id} value={i.item_id}>{i.item_name} ({i.quantity ?? 0} {i.unit_of_measure ?? 'units'} available)</option>
                  ))}
                </select>
              </div>
              <div className="dept-form-group">
                <label>Quantity *</label>
                <input
                  type="number"
                  min="1"
                  max={String(inventoryOptions.find((item) => String(item.item_id) === form.item_id)?.quantity ?? 1)}
                  value={form.quantity_reported}
                  onChange={(e) => setForm({ ...form, quantity_reported: e.target.value })}
                  required
                />
              </div>
              <div className="dept-form-group">
                <label>Location *</label>
                <select
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  required
                >
                  <option value="">— Select department —</option>
                  {departmentOptions.map((department) => (
                    <option key={department.id} value={department.dept_name}>{department.dept_name}</option>
                  ))}
                </select>
              </div>
              <div className="dept-form-group">
                <label>Reason / Description *</label>
                <textarea
                  placeholder="Describe the damage, loss, or disposal reason…"
                  value={form.reason_damage}
                  onChange={(e) => setForm({ ...form, reason_damage: e.target.value })}
                  required
                />
              </div>
              <div className="dept-form-group">
                <label>Date Reported</label>
                <input
                  type="date"
                  value={form.date_reported}
                  onChange={(e) => setForm({ ...form, date_reported: e.target.value })}
                />
              </div>
              <button className="dept-btn dept-btn-primary dept-btn-full" type="submit" disabled={submitting}>
                {submitting ? 'Submitting…' : 'Submit Report'}
              </button>
            </form>
          </div>
        </div>
      )}

      {loading ? (
        <div className="dept-loading-wrap"><div className="dept-spinner" /><span>Loading reports…</span></div>
      ) : reports.length === 0 ? (
        <div className="dept-empty">
          <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" />
          </svg>
          <p>No reports filed yet. Tap <strong>New</strong> to submit one.</p>
        </div>
      ) : (
        <ul className="dept-list">
          {reports.map((r) => (
            <li 
              key={r.report_id} 
              className="dept-list-item" 
              style={{ cursor: 'pointer' }}
              onClick={() => {
                setSelectedReport(r)
                setShowDetailsModal(true)
              }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  setSelectedReport(r)
                  setShowDetailsModal(true)
                }
              }}
            >
              <div className="dept-list-item-icon">
                <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" />
                </svg>
              </div>
              <div className="dept-list-item-content">
                <p className="dept-list-item-name">{r.item_name ?? `Item #${r.item_id ?? '—'}`}</p>
                <p className="dept-list-item-meta">
                  {r.location ?? '—'} · {r.date_reported ? new Date(r.date_reported).toLocaleDateString('en-PH') : '—'}
                </p>
              </div>
              <span className={statusClass(r.status)}>{r.status ?? 'pending'}</span>
            </li>
          ))}
        </ul>
      )}

      {showDetailsModal && selectedReport && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setShowDetailsModal(false)}
        >
          <div
            className="dept-card"
            style={{ maxWidth: 360, width: 'calc(100% - 56px)', maxHeight: '64vh', overflowY: 'auto' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="dept-card-header">
              <p className="dept-card-title">Report Details</p>
              <button
                className="dept-btn dept-btn-secondary"
                style={{ padding: '4px 10px', fontSize: 12 }}
                onClick={() => setShowDetailsModal(false)}
              >
                Close
              </button>
            </div>
            <div className="dept-card-body">
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 12, color: 'var(--dept-text-muted)', fontWeight: 500 }}>Item</label>
                <p style={{ margin: '4px 0 0', fontSize: 14, color: '#111827' }}>
                  {selectedReport.item_name || `Item #${selectedReport.item_id || '—'}`}
                </p>
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 12, color: 'var(--dept-text-muted)', fontWeight: 500 }}>Quantity Reported</label>
                <p style={{ margin: '4px 0 0', fontSize: 14, color: '#111827' }}>
                  {selectedReport.quantity_reported} {selectedReport.unit_of_measure ?? 'units'}
                </p>
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 12, color: 'var(--dept-text-muted)', fontWeight: 500 }}>Location</label>
                <p style={{ margin: '4px 0 0', fontSize: 14, color: '#111827' }}>
                  {selectedReport.location || '—'}
                </p>
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 12, color: 'var(--dept-text-muted)', fontWeight: 500 }}>Reason / Description</label>
                <p style={{ margin: '4px 0 0', fontSize: 14, color: '#111827', whiteSpace: 'pre-wrap' }}>
                  {selectedReport.reason_damage || '—'}
                </p>
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 12, color: 'var(--dept-text-muted)', fontWeight: 500 }}>Date Reported</label>
                <p style={{ margin: '4px 0 0', fontSize: 14, color: '#111827' }}>
                  {selectedReport.date_reported ? new Date(selectedReport.date_reported).toLocaleDateString('en-PH') : '—'}
                </p>
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 12, color: 'var(--dept-text-muted)', fontWeight: 500 }}>Status</label>
                <p style={{ margin: '4px 0 0' }}>
                  <span className={statusClass(selectedReport.status)} style={{ textTransform: 'capitalize' }}>
                    {selectedReport.status || 'Pending'}
                  </span>
                </p>
              </div>

              {selectedReport.status && selectedReport.status !== 'pending' && (
                <div style={{ marginBottom: 0 }}>
                  <label style={{ fontSize: 12, color: 'var(--dept-text-muted)', fontWeight: 500 }}>Admin Remarks</label>
                  <p style={{ margin: '4px 0 0', fontSize: 14, color: '#111827', whiteSpace: 'pre-wrap' }}>
                      {selectedReport.admin_remarks || 'No remarks provided.'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
