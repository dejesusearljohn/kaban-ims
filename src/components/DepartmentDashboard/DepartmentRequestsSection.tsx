import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../supabaseClient'
import { getStatusBadgeClass } from '../../utils/statusBadge'
import { useSupabaseRealtime } from '../../hooks/useSupabaseRealtime'
import { getBorrowedItemStatus, isActiveBorrowedItem } from '../../utils/itemUtils'

interface Props {
  departmentId: number | null
  departmentName: string
  userId: string
  isReadOnly?: boolean
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

interface InventoryLog {
  borrowed_id: number
  item_id: number | null
  issue_date: string | null
  quantity_logged: number
  description_snapshot: string | null
  unit_snapshot: string | null
  property_no_snapshot: string | null
  borrower_name: string
  borrowed_status: string | null
}

type ViewMode = 'inventory' | 'logs'

export default function DepartmentRequestsSection({ departmentId, departmentName, userId, isReadOnly: _isReadOnly = false }: Props) {
  const [view, setView] = useState<ViewMode>('inventory')
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([])
  const [logs, setLogs] = useState<InventoryLog[]>([])
  const [activeBorrowedItemIds, setActiveBorrowedItemIds] = useState<Set<number>>(new Set())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [inventorySearch, setInventorySearch] = useState('')
  const [logSearch, setLogSearch] = useState('')
  const [realtimeTick, setRealtimeTick] = useState(0)

  useSupabaseRealtime(() => {
    setRealtimeTick((tick) => tick + 1)
  })

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
        const [inventoryRes, borrowedRes] = await Promise.all([
          supabase
            .from('inventory')
            .select('item_id, item_name, item_type, quantity, unit_of_measure, condition, status, property_no')
            .eq('department_id', departmentId)
            .or('status.neq.archived,status.is.null')
            .order('item_name'),
          supabase
            .from('borrowed_items')
            .select('borrowed_id, item_id, borrower_name, quantity, date_borrowed, status, date_returned, return_remarks, inventory:inventory!borrowed_items_item_id_fkey(item_name, property_no, unit_of_measure, department_id)')
            .order('date_borrowed', { ascending: false }),
        ])

        if (inventoryRes.error) throw inventoryRes.error
        if (borrowedRes.error) throw borrowedRes.error

        if (!mounted) return

        const inventoryData = (inventoryRes.data ?? []) as InventoryItem[]
        const borrowedRows = (borrowedRes.data ?? []) as Array<{
          borrowed_id: number
          item_id: number | null
          borrower_name: string
          quantity: number
          date_borrowed: string
          status: string | null
          date_returned: string | null
          return_remarks: string | null
          inventory: {
            item_name: string | null
            property_no: string | null
            unit_of_measure: string | null
            department_id: number | null
          } | null
        }>

        const departmentBorrowedRows = borrowedRows.filter(
          (row) => row.inventory?.department_id === departmentId,
        )

        const borrowedItemIds = new Set<number>()
        for (const row of departmentBorrowedRows) {
          if (row.item_id != null && isActiveBorrowedItem(row)) {
            borrowedItemIds.add(row.item_id)
          }
        }

        const departmentLogs: InventoryLog[] = departmentBorrowedRows.map((row) => ({
          borrowed_id: row.borrowed_id,
          item_id: row.item_id,
          issue_date: row.date_borrowed?.slice(0, 10) ?? null,
          quantity_logged: row.quantity,
          description_snapshot: row.inventory?.item_name ?? null,
          unit_snapshot: row.inventory?.unit_of_measure ?? null,
          property_no_snapshot: row.inventory?.property_no ?? null,
          borrower_name: row.borrower_name,
          borrowed_status: getBorrowedItemStatus(row),
        }))

        setInventoryItems(inventoryData)
        setLogs(departmentLogs)
        setActiveBorrowedItemIds(borrowedItemIds)
      } catch {
        if (mounted) setError('Failed to load inventory log data.')
      } finally {
        if (mounted) setLoading(false)
      }
    }

    void load()
    return () => { mounted = false }
  }, [departmentId, userId, realtimeTick])

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
      log.borrower_name.toLowerCase().includes(q) ||
      (log.property_no_snapshot ?? '').toLowerCase().includes(q),
    )
  }, [logs, logSearch])

  const statusBadge = (status: string | null) => {
    const label = status?.trim() || 'Serviceable'
    return <span className={`badge ${getStatusBadgeClass(status || 'serviceable')}`}>{label}</span>
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
                      {statusBadge(activeBorrowedItemIds.has(item.item_id) ? 'Borrowed' : item.status)}
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
                    <li key={log.borrowed_id} className="dept-list-item">
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
                          Qty pulled: {log.quantity_logged} {log.unit_snapshot ?? 'unit(s)'}
                          {log.property_no_snapshot ? ` · ${log.property_no_snapshot}` : ''}
                        </p>
                        <p className="dept-list-item-meta" style={{ marginTop: 2 }}>
                          By: {log.borrower_name}
                          {log.issue_date ? ` · ${new Date(log.issue_date).toLocaleDateString('en-PH')}` : ''}
                        </p>
                      </div>
                      <span className={`badge ${getStatusBadgeClass(log.borrowed_status ?? 'Borrowed')}`}>
                        {log.borrowed_status ?? 'Borrowed'}
                      </span>
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
