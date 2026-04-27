import { useEffect, useState } from 'react'
import { supabase } from '../../supabaseClient'

interface Props {
  userId: string
  onSignOut: () => void
}

interface UserProfile {
  full_name: string
  email: string
  role: string | null
  position: string | null
  staff_id: string
  contact_info: string | null
  emergency_contact: string | null
  qr_code: string | null
  department_name?: string
  department_id: number | null
}

export default function DepartmentProfileSection({ userId, onSignOut }: Props) {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [showSignOut, setShowSignOut] = useState(false)
  const [signingOut, setSigningOut] = useState(false)

  useEffect(() => {
    if (!userId) return
    let mounted = true

    const load = async () => {
      try {
        const { data } = await supabase
          .from('users')
          .select('full_name, email, role, position, staff_id, contact_info, emergency_contact, qr_code, department_id')
          .eq('id', userId)
          .maybeSingle()

        if (!data || !mounted) return

        let dept_name: string | undefined
        if (data.department_id) {
          const { data: dept } = await supabase
            .from('departments')
            .select('dept_name')
            .eq('id', data.department_id)
            .maybeSingle()
          dept_name = dept?.dept_name ?? undefined
        }

        if (mounted) setProfile({ ...data, department_name: dept_name } as UserProfile)
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [userId])

  const handleSignOut = async () => {
    setSigningOut(true)
    await supabase.auth.signOut()
    onSignOut()
  }

  const initials = (name: string) =>
    name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()

  const qrUrl = (code: string) =>
    `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(code)}&bgcolor=ffffff&color=0f172a&qzone=2`

  return (
    <div className="dept-section">
      <div style={{ marginBottom: 14 }}>
        <h1 className="dept-page-title" style={{ marginBottom: 4 }}>Profile</h1>
        <p style={{ fontSize: 13, color: 'var(--dept-text-muted)', margin: 0 }}>Your credentials and department info.</p>
      </div>

      {loading ? (
        <div className="dept-loading-wrap"><div className="dept-spinner" /><span>Loading profile…</span></div>
      ) : !profile ? (
        <div className="dept-alert dept-alert-error">Could not load profile. Please sign out and sign back in.</div>
      ) : (
        <>
          <div className="dept-profile-header">
            <div className="dept-profile-avatar">{initials(profile.full_name)}</div>
            <div className="dept-profile-header-info">
              <h2>{profile.full_name}</h2>
              <p>{profile.position ?? profile.role ?? 'Staff'} · {profile.department_name ?? 'Unknown Dept'}</p>
            </div>
          </div>

          {profile.qr_code && (
            <div className="dept-profile-qr">
              <img
                src={qrUrl(profile.qr_code)}
                alt="Staff QR Code"
                loading="lazy"
              />
              <p>Scan to identify yourself</p>
            </div>
          )}

          <div className="dept-card" style={{ marginBottom: 14 }}>
            <div className="dept-card-header">
              <p className="dept-card-title">Account Details</p>
            </div>
            <div className="dept-info-rows">
              <div className="dept-info-row"><label>Full Name</label><span>{profile.full_name}</span></div>
              <div className="dept-info-row"><label>Email</label><span>{profile.email}</span></div>
              <div className="dept-info-row"><label>Staff ID</label><span>{profile.staff_id}</span></div>
              <div className="dept-info-row"><label>Role</label><span style={{ textTransform: 'capitalize' }}>{profile.role ?? '—'}</span></div>
              <div className="dept-info-row"><label>Position</label><span>{profile.position ?? '—'}</span></div>
              <div className="dept-info-row"><label>Department</label><span>{profile.department_name ?? '—'}</span></div>
              <div className="dept-info-row"><label>Contact</label><span>{profile.contact_info ?? '—'}</span></div>
              <div className="dept-info-row"><label>Emergency</label><span>{profile.emergency_contact ?? '—'}</span></div>
            </div>
          </div>

          <button
            className="dept-btn dept-btn-danger dept-btn-full"
            onClick={() => setShowSignOut(true)}
          >
            <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Sign Out
          </button>
        </>
      )}

      {showSignOut && (
        <div className="dept-modal-overlay" onClick={() => !signingOut && setShowSignOut(false)}>
          <div className="dept-modal" onClick={(e) => e.stopPropagation()}>
            <p className="dept-modal-title">Sign out?</p>
            <p className="dept-modal-body">You will be returned to the sign-in screen.</p>
            <div className="dept-modal-actions">
              <button
                className="dept-btn dept-btn-secondary"
                onClick={() => setShowSignOut(false)}
                disabled={signingOut}
              >
                Cancel
              </button>
              <button
                className="dept-btn dept-btn-danger"
                onClick={handleSignOut}
                disabled={signingOut}
              >
                {signingOut ? 'Signing out…' : 'Sign Out'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
