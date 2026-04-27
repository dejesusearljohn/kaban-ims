import { useEffect, useState } from 'react'
import { supabase } from '../../supabaseClient'

interface Props {
  userId: string
  departmentId: number | null
}

interface WmrReport {
  report_id: number
  item_id: number | null
  location: string | null
  reason_damage: string | null
  status: string | null
  date_reported: string | null
  item_name?: string
}

interface InventoryOption {
  item_id: number
  item_name: string
}

const statusClass = (s: string | null) => {
  if (s === 'resolved') return 'dept-badge dept-badge-resolved'
  if (s === 'rejected') return 'dept-badge dept-badge-rejected'
  return 'dept-badge dept-badge-pending'
}

export default function DepartmentReportsSection({ userId, departmentId }: Props) {
  const [reports, setReports] = useState<WmrReport[]>([])
  const [inventoryOptions, setInventoryOptions] = useState<InventoryOption[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [form, setForm] = useState({
    item_id: '',
    location: '',
    reason_damage: '',
    date_reported: new Date().toISOString().slice(0, 10),
  })

  const loadReports = async () => {
    const { data } = await supabase
      .from('wmr_reports')
      .select('report_id, item_id, location, reason_damage, status, date_reported')
      .eq('last_user_id', userId)
      .eq('is_archived', false)
      .order('date_reported', { ascending: false })

    if (!data) return

    // Enrich with item names
    const itemIds = [...new Set(data.map((r) => r.item_id).filter(Boolean))] as number[]
    let itemNames: Record<number, string> = {}
    if (itemIds.length) {
      const { data: inv } = await supabase
        .from('inventory')
        .select('item_id, item_name')
        .in('item_id', itemIds)
      if (inv) inv.forEach((i) => { itemNames[i.item_id] = i.item_name })
    }

    setReports(data.map((r) => ({ ...r, item_name: r.item_id ? itemNames[r.item_id] : undefined })))
  }

  useEffect(() => {
    if (!userId) return
    let mounted = true

    const init = async () => {
      try {
        await loadReports()
        const invQuery = supabase
          .from('inventory')
          .select('item_id, item_name')
          .order('item_name')
        if (departmentId) invQuery.eq('department_id', departmentId)
        const { data: inv } = await invQuery
        if (mounted) setInventoryOptions((inv ?? []) as InventoryOption[])
      } finally {
        if (mounted) setLoading(false)
      }
    }
    init()
    return () => { mounted = false }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, departmentId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!form.location.trim() || !form.reason_damage.trim()) {
      setError('Location and reason are required.')
      return
    }
    setSubmitting(true)
    try {
      const { error: dbErr } = await supabase.from('wmr_reports').insert({
        last_user_id: userId,
        location: form.location.trim(),
        reason_damage: form.reason_damage.trim(),
        date_reported: form.date_reported || new Date().toISOString().slice(0, 10),
        status: 'pending',
        is_archived: false,
        uid: crypto.randomUUID(),
        ...(form.item_id ? { item_id: Number(form.item_id) } : {}),
      })
      if (dbErr) throw dbErr

      setSuccess('Report submitted successfully.')
      setForm({ item_id: '', location: '', reason_damage: '', date_reported: new Date().toISOString().slice(0, 10) })
      setShowForm(false)
      await loadReports()
      setTimeout(() => setSuccess(''), 4000)
    } catch {
      setError('Failed to submit report. Please try again.')
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
                <label>Item (optional)</label>
                <select value={form.item_id} onChange={(e) => setForm({ ...form, item_id: e.target.value })}>
                  <option value="">— Select item —</option>
                  {inventoryOptions.map((i) => (
                    <option key={i.item_id} value={i.item_id}>{i.item_name}</option>
                  ))}
                </select>
              </div>
              <div className="dept-form-group">
                <label>Location *</label>
                <input
                  type="text"
                  placeholder="Where was the item located?"
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  required
                />
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
            <li key={r.report_id} className="dept-list-item" style={{ cursor: 'default' }}>
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
    </div>
  )
}
