import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../supabaseClient'

interface Props {
  departmentId: number | null
  departmentName: string
  userId: string
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

interface IssuedUser {
  full_name: string | null
  staff_id: string | null
  department_id: number | null
}

interface InventoryLog {
  par_id: number
  issue_date: string | null
  quantity_issued: number
  description_snapshot: string | null
  unit_snapshot: string | null
  property_no_snapshot: string | null
  issued_to_id: string | null
  issued_user: IssuedUser | null
}

type ViewMode = 'inventory' | 'logs'

export default function DepartmentRequestsSection({ departmentId, departmentName, userId }: Props) {
  const [view, setView] = useState<ViewMode>('inventory')
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([])
  const [logs, setLogs] = useState<InventoryLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [inventorySearch, setInventorySearch] = useState('')
  const [logSearch, setLogSearch] = useState('')

  useEffect(() => {
    if (!departmentId) {
      setLoading(false)
      return
    }

    let mounted = true
    const load = async () => {
      setLoading(true)
      setError('')
      try {
        const [inventoryRes, logsRes] = await Promise.all([
          supabase
            .from('inventory')
            .select('item_id, item_name, item_type, quantity, unit_of_measure, condition, status, property_no')
            .eq('department_id', departmentId)
            .or('status.neq.archived,status.is.null')
            .order('item_name'),
          supabase
            .from('par_records')
            .select('par_id, issue_date, quantity_issued, description_snapshot, unit_snapshot, property_no_snapshot, issued_to_id, issued_user:users!par_records_issued_to_id_fkey(full_name, staff_id, department_id)')
            .eq('is_archived', false)
            .order('issue_date', { ascending: false })
            .order('par_id', { ascending: false }),
        ])

        if (inventoryRes.error) throw inventoryRes.error
        if (logsRes.error) throw logsRes.error

        if (!mounted) return

        const inventoryData = (inventoryRes.data ?? []) as InventoryItem[]
        const rawLogs = (logsRes.data ?? []) as unknown as InventoryLog[]
        const departmentLogs = rawLogs.filter((log) => log.issued_user?.department_id === departmentId)

        setInventoryItems(inventoryData)
        setLogs(departmentLogs)
      } catch {
        if (mounted) setError('Failed to load inventory log data.')
      } finally {
        if (mounted) setLoading(false)
      }
    }

    void load()
    return () => { mounted = false }
  }, [departmentId, userId])

  const filteredInventory = useMemo(() => {
    const q = inventorySearch.trim().toLowerCase()
    if (!q) return inventoryItems
    return inventoryItems.filter((item) =>
      item.item_name.toLowerCase().includes(q) ||
      item.item_type.toLowerCase().includes(q) ||
      (item.property_no ?? '').toLowerCase().includes(q),
    )
  }, [inventoryItems, inventorySearch])

  const filteredLogs = useMemo(() => {
    const q = logSearch.trim().toLowerCase()
    if (!q) return logs
    return logs.filter((log) =>
      (log.description_snapshot ?? '').toLowerCase().includes(q) ||
      (log.issued_user?.full_name ?? '').toLowerCase().includes(q) ||
      (log.issued_user?.staff_id ?? '').toLowerCase().includes(q) ||
      (log.property_no_snapshot ?? '').toLowerCase().includes(q),
    )
  }, [logs, logSearch])

  const statusBadge = (status: string | null) => {
    if (!status) return <span className="dept-list-item-badge gray">—</span>
    if (status === 'active') return <span className="dept-list-item-badge green">Active</span>
    if (status === 'expired') return <span className="dept-list-item-badge red">Expired</span>
    return <span className="dept-list-item-badge gray">{status}</span>
  }

  return (
    <div className="dept-section">
      <div style={{ marginBottom: 14 }}>
        <h1 className="dept-page-title" style={{ marginBottom: 4 }}>Inventory Log</h1>
        <p style={{ fontSize: 13, color: 'var(--dept-text-muted)', margin: 0 }}>
          Department inventory and pulled-out item history for {departmentName}.
        </p>
      </div>

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
        <div className="dept-loading-wrap"><div className="dept-spinner" /><span>Loading inventory log…</span></div>
      ) : (
        <>
          <div className="dept-segmented" role="tablist" aria-label="Inventory log views">
            <button
              className={`dept-segmented-btn${view === 'inventory' ? ' active' : ''}`}
              onClick={() => setView('inventory')}
              role="tab"
              aria-selected={view === 'inventory'}
            >
              Department Inventory
            </button>
            <button
              className={`dept-segmented-btn${view === 'logs' ? ' active' : ''}`}
              onClick={() => setView('logs')}
              role="tab"
              aria-selected={view === 'logs'}
            >
              Inventory Logs
            </button>
          </div>

          {view === 'inventory' ? (
            <>
              <div className="dept-search-bar" style={{ marginTop: 10 }}>
                <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  type="text"
                  placeholder="Search department inventory…"
                  value={inventorySearch}
                  onChange={(e) => setInventorySearch(e.target.value)}
                />
              </div>

              {filteredInventory.length === 0 ? (
                <div className="dept-empty">
                  <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                  <p>No inventory items found.</p>
                </div>
              ) : (
                <ul className="dept-list" style={{ marginTop: 10 }}>
                  {filteredInventory.map((item) => (
                    <li key={item.item_id} className="dept-list-item">
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
                          {item.property_no ? ` · ${item.property_no}` : ''}
                        </p>
                      </div>
                      {statusBadge(item.status)}
                    </li>
                  ))}
                </ul>
              )}

              <p style={{ fontSize: 12, color: 'var(--dept-text-muted)', textAlign: 'center', marginTop: 16 }}>
                {filteredInventory.length} of {inventoryItems.length} item{inventoryItems.length !== 1 ? 's' : ''}
              </p>
            </>
          ) : (
            <>
              <div className="dept-search-bar" style={{ marginTop: 10 }}>
                <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  type="text"
                  placeholder="Search inventory logs…"
                  value={logSearch}
                  onChange={(e) => setLogSearch(e.target.value)}
                />
              </div>

              {filteredLogs.length === 0 ? (
                <div className="dept-empty">
                  <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                  <p>No pulled-out items logged yet.</p>
                </div>
              ) : (
                <ul className="dept-list" style={{ marginTop: 10 }}>
                  {filteredLogs.map((log) => (
                    <li key={log.par_id} className="dept-list-item">
                      <div className="dept-list-item-icon">
                        <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                          <polyline points="14 2 14 8 20 8" />
                          <line x1="9" y1="15" x2="15" y2="15" />
                        </svg>
                      </div>
                      <div className="dept-list-item-content">
                        <p className="dept-list-item-name">{log.description_snapshot ?? 'Inventory Item'}</p>
                        <p className="dept-list-item-meta">
                          Qty pulled: {log.quantity_issued} {log.unit_snapshot ?? 'unit(s)'}
                          {log.property_no_snapshot ? ` · ${log.property_no_snapshot}` : ''}
                        </p>
                        <p className="dept-list-item-meta" style={{ marginTop: 2 }}>
                          By: {log.issued_user?.full_name ?? 'Unknown Staff'}
                          {log.issued_user?.staff_id ? ` (${log.issued_user.staff_id})` : ''}
                          {log.issue_date ? ` · ${new Date(log.issue_date).toLocaleDateString('en-PH')}` : ''}
                        </p>
                      </div>
                      <span className="dept-list-item-badge green">Logged</span>
                    </li>
                  ))}
                </ul>
              )}

              <p style={{ fontSize: 12, color: 'var(--dept-text-muted)', textAlign: 'center', marginTop: 16 }}>
                {filteredLogs.length} of {logs.length} log entr{logs.length === 1 ? 'y' : 'ies'}
              </p>
            </>
          )}
        </>
      )}
    </div>
  )
}
