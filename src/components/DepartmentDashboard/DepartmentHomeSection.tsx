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
  key: string
  source: 'wmr' | 'shift-turnover'
  reportId?: number
  title: string
  body: string
  dateLabel: string
  badgeLabel: string
  badgeTone: 'green' | 'red' | 'yellow' | 'orange' | 'gray'
  sortDate: number
}

type ShiftTurnoverNotificationRow = {
  turnover_id: number
  created_at: string | null
  status: string
  outgoing_staff_id: string | null
  incoming_staff_id: string | null
  is_approved_by_admin: boolean | null
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
        const [userRes, invRes, wmrRes, incomingTurnoverRes, outgoingTurnoverRes] = await Promise.all([
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
          supabase
            .from('shift_turnovers')
            .select('turnover_id, created_at, status, outgoing_staff_id, incoming_staff_id, is_approved_by_admin')
            .eq('incoming_staff_id', userId)
            .order('created_at', { ascending: false }),
          supabase
            .from('shift_turnovers')
            .select('turnover_id, created_at, status, outgoing_staff_id, incoming_staff_id, is_approved_by_admin')
            .eq('outgoing_staff_id', userId)
            .order('created_at', { ascending: false }),
        ])

        if (incomingTurnoverRes.error) throw incomingTurnoverRes.error
        if (outgoingTurnoverRes.error) throw outgoingTurnoverRes.error

        if (!mounted) return

        if (userRes.data) setFullName(userRes.data.full_name ?? '')

        const items = invRes.data ?? []
        const wmrList = wmrRes.data ?? []
        const incomingTurnovers = (incomingTurnoverRes.data ?? []) as unknown as ShiftTurnoverNotificationRow[]
        const outgoingTurnovers = (outgoingTurnoverRes.data ?? []) as unknown as ShiftTurnoverNotificationRow[]

        const reportItemIds = [...new Set(wmrList.map((report) => report.item_id).filter((itemId): itemId is number => itemId != null))]
        let itemNameMap: Record<number, string> = {}

        if (reportItemIds.length > 0) {
          const { data: reportItems } = await supabase
            .from('inventory')
            .select('item_id, item_name')
            .in('item_id', reportItemIds)

          itemNameMap = Object.fromEntries((reportItems ?? []).map((item) => [item.item_id, item.item_name]))
        }

        const wmrNotifications: NotificationItem[] = wmrList.map((report) => {
          const normalizedStatus = (report.status ?? '').trim().toLowerCase()
          const itemName = report.item_id != null ? itemNameMap[report.item_id] ?? `Item #${report.item_id}` : 'Waste Material Report'
          const dateLabel = report.date_reported
            ? new Date(report.date_reported).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
            : 'No date'
          const sortDate = report.date_reported ? new Date(report.date_reported).getTime() : 0

          if (normalizedStatus === 'pending') {
            return {
              key: `wmr-${report.report_id}`,
              source: 'wmr',
              reportId: report.report_id,
              title: `${itemName} report is awaiting review`,
              body: 'Your waste material report was submitted and is pending admin action.',
              dateLabel,
              badgeLabel: 'Pending',
              badgeTone: 'yellow',
              sortDate,
            }
          }

          return {
            key: `wmr-${report.report_id}`,
            source: 'wmr',
            reportId: report.report_id,
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
            sortDate,
          }
        })

        const partnerIds = Array.from(
          new Set(
            [
              ...incomingTurnovers.map((entry) => entry.outgoing_staff_id),
              ...outgoingTurnovers.map((entry) => entry.incoming_staff_id),
            ].filter((id): id is string => !!id),
          ),
        )

        let partnerMap: Record<string, { full_name: string | null; staff_id: string | null }> = {}

        if (partnerIds.length > 0) {
          const { data: partnerRows } = await supabase
            .from('users')
            .select('id, full_name, staff_id')
            .in('id', partnerIds)

          partnerMap = Object.fromEntries(
            (partnerRows ?? []).map((row) => [row.id, { full_name: row.full_name, staff_id: row.staff_id }]),
          )
        }

        const buildTurnoverDateLabel = (value: string | null) =>
          value
            ? new Date(value).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
            : 'No date'

        const incomingTurnoverNotifications: NotificationItem[] = incomingTurnovers.map((entry) => {
          const normalizedStatus = (entry.status ?? 'pending').trim().toLowerCase()
          const requester = entry.outgoing_staff_id ? partnerMap[entry.outgoing_staff_id] : null
          const requesterName = requester?.full_name ?? 'Staff member'
          const requesterStaffId = requester?.staff_id ? ` (${requester.staff_id})` : ''

          const baseBody =
            normalizedStatus === 'approved'
              ? 'You accepted this shift turnover request.'
              : normalizedStatus === 'disapproved'
                ? 'You rejected this shift turnover request.'
                : 'Please review and accept or reject this shift turnover request.'

          const adminTail =
            entry.is_approved_by_admin === true
              ? ' Admin marked this request as approved.'
              : entry.is_approved_by_admin === false
                ? ' Admin marked this request as rejected.'
                : ''

          return {
            key: `incoming-shift-${entry.turnover_id}`,
            source: 'shift-turnover',
            title: `Shift turnover request from ${requesterName}${requesterStaffId}`,
            body: `${baseBody}${adminTail}`,
            dateLabel: buildTurnoverDateLabel(entry.created_at),
            badgeLabel:
              normalizedStatus === 'approved'
                ? 'Accepted'
                : normalizedStatus === 'disapproved'
                  ? 'Rejected'
                  : 'Needs Review',
            badgeTone:
              normalizedStatus === 'approved'
                ? 'green'
                : normalizedStatus === 'disapproved'
                  ? 'red'
                  : 'yellow',
            sortDate: entry.created_at ? new Date(entry.created_at).getTime() : 0,
          }
        })

        const outgoingTurnoverNotifications: NotificationItem[] = outgoingTurnovers.map((entry) => {
          const normalizedStatus = (entry.status ?? 'pending').trim().toLowerCase()
          const target = entry.incoming_staff_id ? partnerMap[entry.incoming_staff_id] : null
          const targetName = target?.full_name ?? 'Assigned staff'
          const targetStaffId = target?.staff_id ? ` (${target.staff_id})` : ''

          const baseBody =
            normalizedStatus === 'approved'
              ? 'Your shift turnover request was accepted by incoming staff.'
              : normalizedStatus === 'disapproved'
                ? 'Your shift turnover request was rejected by incoming staff.'
                : 'Your shift turnover request is still waiting for incoming staff review.'

          const adminTail =
            entry.is_approved_by_admin === true
              ? ' Admin approved this turnover request.'
              : entry.is_approved_by_admin === false
                ? ' Admin rejected this turnover request.'
                : ''

          return {
            key: `outgoing-shift-${entry.turnover_id}`,
            source: 'shift-turnover',
            title: `Shift turnover sent to ${targetName}${targetStaffId}`,
            body: `${baseBody}${adminTail}`,
            dateLabel: buildTurnoverDateLabel(entry.created_at),
            badgeLabel:
              normalizedStatus === 'approved'
                ? 'Accepted'
                : normalizedStatus === 'disapproved'
                  ? 'Rejected'
                  : 'Pending',
            badgeTone:
              normalizedStatus === 'approved'
                ? 'green'
                : normalizedStatus === 'disapproved'
                  ? 'red'
                  : 'yellow',
            sortDate: entry.created_at ? new Date(entry.created_at).getTime() : 0,
          }
        })

        const notificationItems = [
          ...incomingTurnoverNotifications,
          ...outgoingTurnoverNotifications,
          ...wmrNotifications,
        ]
          .sort((a, b) => b.sortDate - a.sortDate)
          .slice(0, 30)

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
              {notifications.map((notification) => {
                const isWmrNotification = notification.source === 'wmr' && notification.reportId != null

                return (
                  <li
                    key={notification.key}
                    className="dept-list-item"
                    role={isWmrNotification ? 'button' : undefined}
                    tabIndex={isWmrNotification ? 0 : undefined}
                    style={{ cursor: isWmrNotification ? 'pointer' : 'default' }}
                    onClick={() => {
                      if (isWmrNotification && notification.reportId != null) {
                        onOpenReport(notification.reportId)
                      }
                    }}
                    onKeyDown={(event) => {
                      if (!isWmrNotification) return
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        if (notification.reportId != null) {
                          onOpenReport(notification.reportId)
                        }
                      }
                    }}
                  >
                    <div className="dept-list-item-icon">
                      {notification.source === 'wmr' ? (
                        <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                          <path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
                          <path d="M13.73 21a2 2 0 01-3.46 0" />
                        </svg>
                      ) : (
                        <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                          <path d="M17 1l4 4-4 4" />
                          <path d="M3 11V9a4 4 0 014-4h14" />
                          <path d="M7 23l-4-4 4-4" />
                          <path d="M21 13v2a4 4 0 01-4 4H3" />
                        </svg>
                      )}
                    </div>
                    <div className="dept-list-item-content">
                      <p className="dept-list-item-name">{notification.title}</p>
                      <p className="dept-list-item-meta">{notification.body}</p>
                      <p className="dept-list-item-meta" style={{ marginTop: 4 }}>{notification.dateLabel}</p>
                    </div>
                    <span className={`dept-list-item-badge ${notification.badgeTone}`}>{notification.badgeLabel}</span>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
