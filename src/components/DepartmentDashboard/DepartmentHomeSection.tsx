import { useEffect, useState } from 'react'
import { supabase } from '../../supabaseClient'

interface Props {
  userId: string
  departmentName: string
  departmentId: number | null
}

interface Stats {
  totalItems: number
  pendingWmr: number
  lowStock: number
}

export default function DepartmentHomeSection({ userId, departmentName, departmentId }: Props) {
  const [stats, setStats] = useState<Stats>({ totalItems: 0, pendingWmr: 0, lowStock: 0 })
  const [loading, setLoading] = useState(true)
  const [fullName, setFullName] = useState('')

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
            ? supabase.from('inventory').select('item_id, quantity').eq('department_id', departmentId).neq('status', 'archived')
            : Promise.resolve({ data: [], error: null }),
          supabase.from('wmr_reports').select('report_id, status').eq('last_user_id', userId).eq('is_archived', false),
        ])

        if (!mounted) return

        if (userRes.data) setFullName(userRes.data.full_name ?? '')

        const items = invRes.data ?? []
        const wmrList = wmrRes.data ?? []

        setStats({
          totalItems: items.length,
          pendingWmr: wmrList.filter((w) => w.status === 'pending').length,
          lowStock: items.filter((i) => (i.quantity ?? 0) <= 2).length,
        })
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
          <p className="dept-card-title">Quick Guide</p>
        </div>
        <div className="dept-card-body">
          <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <li style={{ fontSize: 13, color: 'var(--dept-text-muted)' }}>Use <strong>Scanner</strong> to look up any item by QR code.</li>
            <li style={{ fontSize: 13, color: 'var(--dept-text-muted)' }}>Browse <strong>Requests</strong> to see your department's inventory and request items.</li>
            <li style={{ fontSize: 13, color: 'var(--dept-text-muted)' }}>File a <strong>Report</strong> if an item is damaged or lost.</li>
            <li style={{ fontSize: 13, color: 'var(--dept-text-muted)' }}>View your credentials and QR code under <strong>Profile</strong>.</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
