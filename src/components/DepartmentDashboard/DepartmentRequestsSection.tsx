import { useEffect, useState } from 'react'
import { supabase } from '../../supabaseClient'

interface Props {
  departmentId: number | null
  departmentName: string
}

interface InventoryItem {
  item_id: number
  item_name: string
  item_type: string
  quantity: number | null
  unit_of_measure: string | null
  condition: string | null
  status: string | null
  property_no: string | null
}

export default function DepartmentRequestsSection({ departmentId }: Props) {
  const [items, setItems] = useState<InventoryItem[]>([])
  const [filtered, setFiltered] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [error, setError] = useState('')
  const [requestedId, setRequestedId] = useState<number | null>(null)
  const [successMsg, setSuccessMsg] = useState('')

  useEffect(() => {
    if (!departmentId) {
      setLoading(false)
      return
    }
    let mounted = true
    const load = async () => {
      try {
        const { data, error: dbErr } = await supabase
          .from('inventory')
          .select('item_id, item_name, item_type, quantity, unit_of_measure, condition, status, property_no')
          .eq('department_id', departmentId)
          .neq('status', 'archived')
          .order('item_name')

        if (dbErr) throw dbErr
        if (mounted) {
          setItems((data ?? []) as InventoryItem[])
          setFiltered((data ?? []) as InventoryItem[])
        }
      } catch {
        if (mounted) setError('Failed to load inventory.')
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [departmentId])

  useEffect(() => {
    const q = search.toLowerCase()
    setFiltered(
      q ? items.filter((i) => i.item_name.toLowerCase().includes(q) || i.item_type.toLowerCase().includes(q)) : items
    )
  }, [search, items])

  const handleRequest = (itemId: number) => {
    setRequestedId(itemId)
    setSuccessMsg('Request submitted. An admin will review your issuance request shortly.')
    setTimeout(() => { setSuccessMsg(''); setRequestedId(null) }, 4000)
  }

  const statusBadge = (status: string | null) => {
    if (!status) return <span className="dept-list-item-badge gray">—</span>
    if (status === 'active') return <span className="dept-list-item-badge green">Active</span>
    return <span className="dept-list-item-badge gray">{status}</span>
  }

  return (
    <div className="dept-section">
      <div style={{ marginBottom: 14 }}>
        <h1 className="dept-page-title" style={{ marginBottom: 4 }}>Requests</h1>
        <p style={{ fontSize: 13, color: 'var(--dept-text-muted)', margin: 0 }}>
          Your department's inventory. Tap an item to request issuance.
        </p>
      </div>

      {successMsg && (
        <div className="dept-alert dept-alert-success" style={{ marginBottom: 12 }}>
          <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          {successMsg}
        </div>
      )}

      {error && (
        <div className="dept-alert dept-alert-error" style={{ marginBottom: 12 }}>
          <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          {error}
        </div>
      )}

      {!departmentId ? (
        <div className="dept-empty">
          <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2" />
          </svg>
          <p>No department assigned. Contact your admin.</p>
        </div>
      ) : loading ? (
        <div className="dept-loading-wrap"><div className="dept-spinner" /><span>Loading items…</span></div>
      ) : (
        <>
          <div className="dept-search-bar">
            <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="Search items…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {filtered.length === 0 ? (
            <div className="dept-empty">
              <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <p>No items found.</p>
            </div>
          ) : (
            <ul className="dept-list">
              {filtered.map((item) => (
                <li key={item.item_id} className="dept-list-item" onClick={() => handleRequest(item.item_id)}>
                  <div className="dept-list-item-icon">
                    <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2" />
                    </svg>
                  </div>
                  <div className="dept-list-item-content">
                    <p className="dept-list-item-name">{item.item_name}</p>
                    <p className="dept-list-item-meta">
                      {item.item_type} · Qty: {item.quantity ?? '—'} {item.unit_of_measure ?? ''}
                      {item.condition ? ` · ${item.condition}` : ''}
                    </p>
                  </div>
                  {requestedId === item.item_id
                    ? <span className="dept-list-item-badge green">Requested</span>
                    : statusBadge(item.status)
                  }
                </li>
              ))}
            </ul>
          )}
          <p style={{ fontSize: 12, color: 'var(--dept-text-muted)', textAlign: 'center', marginTop: 16 }}>
            {filtered.length} of {items.length} item{items.length !== 1 ? 's' : ''}
          </p>
        </>
      )}
    </div>
  )
}
