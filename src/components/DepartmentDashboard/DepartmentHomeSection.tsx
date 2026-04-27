import { useEffect, useState } from 'react'
import { supabase } from '../../supabaseClient'

interface Props {
  userId: string
  departmentName: string
  departmentId: number | null
  onOpenReport: (reportId: number) => void
}

interface Stats {
  totalItems: number
  pendingWmr: number
  lowStock: number
}

interface NotificationItem {
  id: number
  title: string
  body: string
  dateLabel: string
  badgeLabel: string
  badgeTone: 'green' | 'red' | 'yellow' | 'orange' | 'gray'
}

export default function DepartmentHomeSection({ userId, departmentName, departmentId, onOpenReport }: Props) {
  const [stats, setStats] = useState<Stats>({ totalItems: 0, pendingWmr: 0, lowStock: 0 })
  const [loading, setLoading] = useState(true)
  const [fullName, setFullName] = useState('')
  const [notifications, setNotifications] = useState<NotificationItem[]>([])

  const greeting = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 18) return 'Good afternoon'
    return 'Good evening'
  }

  useEffect(() => {
    if (!userId) return
    let mounted = true

    const load = async () => {
      try {
        const [userRes, invRes, wmrRes] = await Promise.all([
          supabase.from('users').select('full_name').eq('id', userId).maybeSingle(),
          departmentId
            ? supabase
              .from('inventory')
              .select('item_id, quantity, status')
              .eq('department_id', departmentId)
              .or('status.neq.Archived,status.neq.archived,status.is.null')
            : Promise.resolve({ data: [], error: null }),
          supabase
            .from('wmr_reports')
            .select('report_id, item_id, status, admin_remarks, date_reported')
            .eq('last_user_id', userId)
            .eq('is_archived', false)
            .order('date_reported', { ascending: false }),
        ])

        if (!mounted) return

        if (userRes.data) setFullName(userRes.data.full_name ?? '')

        const items = invRes.data ?? []
        const wmrList = wmrRes.data ?? []

        const reportItemIds = [...new Set(wmrList.map((report) => report.item_id).filter((itemId): itemId is number => itemId != null))]
        let itemNameMap: Record<number, string> = {}

        if (reportItemIds.length > 0) {
          const { data: reportItems } = await supabase
            .from('inventory')
            .select('item_id, item_name')
            .in('item_id', reportItemIds)

          itemNameMap = Object.fromEntries((reportItems ?? []).map((item) => [item.item_id, item.item_name]))
        }

        const notificationItems: NotificationItem[] = wmrList.map((report) => {
          const normalizedStatus = (report.status ?? '').trim().toLowerCase()
          const itemName = report.item_id != null ? itemNameMap[report.item_id] ?? `Item #${report.item_id}` : 'Waste Material Report'
          const dateLabel = report.date_reported
            ? new Date(report.date_reported).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
            : 'No date'

          if (normalizedStatus === 'pending') {
            return {
              id: report.report_id,
              title: `${itemName} report is awaiting review`,
              body: 'Your waste material report was submitted and is pending admin action.',
              dateLabel,
              badgeLabel: 'Pending',
              badgeTone: 'yellow',
            }
          }

          return {
            id: report.report_id,
            title: `${itemName} waste material report was verified`,
            body: report.admin_remarks?.trim() || `Status updated to ${report.status ?? 'reviewed'}.`,
            dateLabel,
            badgeLabel: report.status?.trim() || 'Updated',
            badgeTone:
              normalizedStatus === 'repaired' ? 'green'
              : normalizedStatus === 'for repair' ? 'yellow'
              : normalizedStatus === 'for disposal' ? 'orange'
              : normalizedStatus === 'disposed' ? 'gray'
              : 'red',
          }
        })

        setStats({
          totalItems: items.length,
          pendingWmr: wmrList.filter((w) => (w.status ?? '').trim().toLowerCase() === 'pending').length,
          lowStock: items.filter((i) => (i.quantity ?? 0) <= 2).length,
        })
        setNotifications(notificationItems)
      } finally {
        if (mounted) setLoading(false)
      }
    }

    load()
    return () => { mounted = false }
  }, [userId, departmentId])

  return (
    <div className="dept-section">
      <div className="dept-greeting-banner">
        <h2>{greeting()}{fullName ? `, ${fullName.split(' ')[0]}` : ''}!</h2>
        <p>{departmentName} · Today is {new Date().toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
      </div>

      {loading ? (
        <div className="dept-loading-wrap">
          <div className="dept-spinner" />
          <span>Loading stats…</span>
        </div>
      ) : (
        <div className="dept-stat-row">
          <div className="dept-stat-card green">
            <p className="stat-label">Dept Items</p>
            <p className="stat-value">{stats.totalItems}</p>
            <p className="stat-sub">in inventory</p>
          </div>
          <div className="dept-stat-card orange">
            <p className="stat-label">Low Stock</p>
            <p className="stat-value">{stats.lowStock}</p>
            <p className="stat-sub">≤ 2 remaining</p>
          </div>
          <div className="dept-stat-card red">
            <p className="stat-label">Pending WMR</p>
            <p className="stat-value">{stats.pendingWmr}</p>
            <p className="stat-sub">awaiting review</p>
          </div>
        </div>
      )}

      <div className="dept-card">
        <div className="dept-card-header">
          <p className="dept-card-title">Notifications</p>
        </div>
        <div className="dept-card-body">
          {notifications.length === 0 ? (
            <div className="dept-empty" style={{ minHeight: 180 }}>
              <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 01-3.46 0" />
              </svg>
              <p>No account notifications yet.</p>
            </div>
          ) : (
            <ul className="dept-list" style={{ marginTop: 0 }}>
              {notifications.map((notification) => (
                <li
                  key={notification.id}
                  className="dept-list-item"
                  role="button"
                  tabIndex={0}
                  style={{ cursor: 'pointer' }}
                  onClick={() => onOpenReport(notification.id)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      onOpenReport(notification.id)
                    }
                  }}
                >
                  <div className="dept-list-item-icon">
                    <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
                      <path d="M13.73 21a2 2 0 01-3.46 0" />
                    </svg>
                  </div>
                  <div className="dept-list-item-content">
                    <p className="dept-list-item-name">{notification.title}</p>
                    <p className="dept-list-item-meta">{notification.body}</p>
                    <p className="dept-list-item-meta" style={{ marginTop: 4 }}>{notification.dateLabel}</p>
                  </div>
                  <span className={`dept-list-item-badge ${notification.badgeTone}`}>{notification.badgeLabel}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
