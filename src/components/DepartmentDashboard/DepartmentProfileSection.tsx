import { useEffect, useState, useRef } from 'react'
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
  recovery_email: string | null
  qr_code: string | null
  department_code?: string
  department_name?: string
  department_id: number | null
}

interface EditForm {
  first_name: string
  last_name: string
  position: string
  contact_info: string
  emergency_contact: string
  recovery_email: string
  new_password: string
  confirm_password: string
}

export default function DepartmentProfileSection({ userId, onSignOut }: Props) {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [showSignOut, setShowSignOut] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editError, setEditError] = useState('')
  const [editSuccess, setEditSuccess] = useState('')
  const [showNewPw, setShowNewPw] = useState(false)
  const [showConfirmPw, setShowConfirmPw] = useState(false)
  const [form, setForm] = useState<EditForm>({
    first_name: '', last_name: '', position: '', contact_info: '',
    emergency_contact: '', recovery_email: '',
    new_password: '', confirm_password: '',
  })
  const successTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!userId) return
    let mounted = true
    const load = async () => {
      try {
        const { data } = await supabase
          .from('users')
          .select('full_name, email, role, position, staff_id, contact_info, emergency_contact, recovery_email, qr_code, department_id')
          .eq('id', userId)
          .maybeSingle()
        if (!data || !mounted) return
        let dept_name: string | undefined
        let dept_code: string | undefined
        if (data.department_id) {
          const { data: dept } = await supabase
            .from('departments')
            .select('dept_name, dept_code')
            .eq('id', data.department_id)
            .maybeSingle()
          dept_name = dept?.dept_name ?? undefined
          dept_code = dept?.dept_code ?? undefined
        }
        if (mounted) setProfile({ ...data, department_name: dept_name, department_code: dept_code } as UserProfile)
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [userId])

  const startEdit = () => {
    if (!profile) return
    const nameParts = splitName(profile.full_name)
    setForm({
      first_name: nameParts.firstName,
      last_name: nameParts.lastName,
      position: profile.position ?? '',
      contact_info: profile.contact_info ?? '',
      emergency_contact: profile.emergency_contact ?? '',
      recovery_email: profile.recovery_email ?? '',
      new_password: '',
      confirm_password: '',
    })
    setEditError('')
    setEditing(true)
  }

  const cancelEdit = () => {
    setEditing(false)
    setEditError('')
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setEditError('')
    if (!form.first_name.trim()) { setEditError('First name is required.'); return }
    if (!form.last_name.trim()) { setEditError('Last name is required.'); return }
    if (form.recovery_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.recovery_email)) {
      setEditError('Recovery email is not a valid email address.')
      return
    }
    if (form.new_password || form.confirm_password) {
      if (form.new_password.length < 6) { setEditError('New password must be at least 6 characters.'); return }
      if (form.new_password !== form.confirm_password) { setEditError('Passwords do not match.'); return }
    }
    setSaving(true)
    try {
      const fullName = `${form.first_name.trim()} ${form.last_name.trim()}`.trim()
      const updates = {
        full_name: fullName,
        position: form.position.trim() || null,
        contact_info: form.contact_info.trim() || null,
        emergency_contact: form.emergency_contact.trim() || null,
        recovery_email: form.recovery_email.trim() || null,
      }
      const { error: dbErr } = await supabase.from('users').update(updates).eq('id', userId)
      if (dbErr) throw dbErr
      if (form.new_password) {
        const { error: pwErr } = await supabase.auth.updateUser({ password: form.new_password })
        if (pwErr) throw pwErr
      }
      setProfile((prev) => prev ? { ...prev, ...updates } : prev)
      setEditing(false)
      setEditSuccess('Profile updated successfully.')
      if (successTimer.current) clearTimeout(successTimer.current)
      successTimer.current = setTimeout(() => setEditSuccess(''), 4000)
    } catch {
      setEditError('Failed to save changes. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleSignOut = async () => {
    setSigningOut(true)
    await supabase.auth.signOut()
    onSignOut()
  }

  const initials = (name: string) =>
    name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()

  const splitName = (name: string) => {
    const parts = name.trim().split(/\s+/).filter(Boolean)
    if (parts.length === 0) return { firstName: '', lastName: '' }
    if (parts.length === 1) return { firstName: parts[0], lastName: '' }
    return { firstName: parts.slice(0, -1).join(' '), lastName: parts[parts.length - 1] }
  }

  const qrUrl = (code: string) =>
    `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(code)}&bgcolor=ffffff&color=0f172a&qzone=2`

  const EyeIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
    </svg>
  )
  const EyeOffIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  )

  return (
    <div className="dept-section">
      <div style={{ marginBottom: 14 }}>
        <h1 className="dept-page-title" style={{ marginBottom: 4 }}>Profile</h1>
        <p style={{ fontSize: 13, color: 'var(--dept-text-muted)', margin: 0 }}>
          {editing ? 'Edit your profile details.' : 'Your credentials and department info.'}
        </p>
      </div>

      {loading ? (
        <div className="dept-loading-wrap"><div className="dept-spinner" /><span>Loading profile…</span></div>
      ) : !profile ? (
        <div className="dept-alert dept-alert-error">Could not load profile. Please sign out and sign back in.</div>
      ) : (
        <>
          {editSuccess && (
            <div className="dept-alert dept-alert-success" style={{ marginBottom: 12 }}>
              <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              {editSuccess}
            </div>
          )}

          <div className="dept-profile-header" style={{ marginBottom: 14 }}>
            <div className="dept-profile-avatar">{initials(profile.full_name)}</div>
            <div className="dept-profile-header-info">
              <h2>{profile.full_name}</h2>
              <p>{profile.position ?? profile.role ?? 'Staff'} · {profile.department_code ?? 'Unknown Dept'}</p>
            </div>
            {!editing && (
              <button
                className="dept-btn dept-btn-secondary"
                style={{ marginLeft: 'auto', whiteSpace: 'nowrap' }}
                onClick={startEdit}
              >
                <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
                Edit
              </button>
            )}
          </div>

          {profile.qr_code && (
            <div className="dept-profile-qr">
              <img src={qrUrl(profile.qr_code)} alt="Staff QR Code" loading="lazy" />
              <p>Scan to identify yourself</p>
            </div>
          )}

          {!editing ? (
            <div className="dept-card" style={{ marginBottom: 14 }}>
              <div className="dept-card-header">
                <p className="dept-card-title">Account Details</p>
              </div>
              <div className="dept-info-rows">
                <div className="dept-info-row"><label>Full Name</label><span>{profile.full_name || '—'}</span></div>
                <div className="dept-info-row"><label>Email</label><span>{profile.email}</span></div>
                <div className="dept-info-row"><label>Staff ID</label><span>{profile.staff_id}</span></div>
                <div className="dept-info-row"><label>Role</label><span style={{ textTransform: 'capitalize' }}>{profile.role ?? '—'}</span></div>
                <div className="dept-info-row"><label>Position</label><span>{profile.position ?? '—'}</span></div>
                <div className="dept-info-row"><label>Department</label><span>{profile.department_code ?? '—'}</span></div>
                <div className="dept-info-row"><label>Contact</label><span>{profile.contact_info ?? '—'}</span></div>
                <div className="dept-info-row"><label>Emergency</label><span>{profile.emergency_contact ?? '—'}</span></div>
                <div className="dept-info-row"><label>Recovery Email</label><span>{profile.recovery_email ?? '—'}</span></div>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSave} noValidate>
              <div className="dept-card" style={{ marginBottom: 14 }}>
                <div className="dept-card-header">
                  <p className="dept-card-title">Account Details</p>
                  <span style={{ fontSize: 12, color: 'var(--dept-text-muted)' }}>Greyed fields are read-only</span>
                </div>
                <div className="dept-card-body">
                  {editError && (
                    <div className="dept-alert dept-alert-error" style={{ marginBottom: 12 }}>
                      <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                      </svg>
                      {editError}
                    </div>
                  )}

                  <div className="dept-info-rows" style={{ marginBottom: 16 }}>
                    <div className="dept-info-row dept-info-row-readonly"><label>Email</label><span>{profile.email}</span></div>
                    <div className="dept-info-row dept-info-row-readonly"><label>Staff ID</label><span>{profile.staff_id}</span></div>
                    <div className="dept-info-row dept-info-row-readonly"><label>Role</label><span style={{ textTransform: 'capitalize' }}>{profile.role ?? '—'}</span></div>
                    <div className="dept-info-row dept-info-row-readonly"><label>Department</label><span>{profile.department_code ?? '—'}</span></div>
                  </div>

                  <div className="dept-form-group">
                    <label className="dept-form-label">First Name</label>
                    <input className="dept-form-input" value={form.first_name} onChange={(e) => setForm((f) => ({ ...f, first_name: e.target.value }))} required />
                  </div>
                  <div className="dept-form-group">
                    <label className="dept-form-label">Last Name</label>
                    <input className="dept-form-input" value={form.last_name} onChange={(e) => setForm((f) => ({ ...f, last_name: e.target.value }))} required />
                  </div>
                  <div className="dept-form-group">
                    <label className="dept-form-label">Position</label>
                    <input className="dept-form-input" value={form.position} onChange={(e) => setForm((f) => ({ ...f, position: e.target.value }))} placeholder="e.g. Nurse, Responder" />
                  </div>
                  <div className="dept-form-group">
                    <label className="dept-form-label">Contact Number</label>
                    <input className="dept-form-input" value={form.contact_info} onChange={(e) => setForm((f) => ({ ...f, contact_info: e.target.value }))} placeholder="+63 9XX XXX XXXX" />
                  </div>
                  <div className="dept-form-group">
                    <label className="dept-form-label">Emergency Contact</label>
                    <input className="dept-form-input" value={form.emergency_contact} onChange={(e) => setForm((f) => ({ ...f, emergency_contact: e.target.value }))} placeholder="Name / Number" />
                  </div>
                  <div className="dept-form-group">
                    <label className="dept-form-label">Recovery Email</label>
                    <input className="dept-form-input" type="email" value={form.recovery_email} onChange={(e) => setForm((f) => ({ ...f, recovery_email: e.target.value }))} placeholder="your@personal.com" />
                  </div>
                </div>
              </div>

              <div className="dept-card" style={{ marginBottom: 14 }}>
                <div className="dept-card-header">
                  <p className="dept-card-title">Change Password</p>
                  <span style={{ fontSize: 12, color: 'var(--dept-text-muted)' }}>Leave blank to keep current</span>
                </div>
                <div className="dept-card-body">
                  <div className="dept-form-group">
                    <label className="dept-form-label">New Password</label>
                    <div className="dept-input-wrap">
                      <input
                        className="dept-form-input"
                        type={showNewPw ? 'text' : 'password'}
                        value={form.new_password}
                        onChange={(e) => setForm((f) => ({ ...f, new_password: e.target.value }))}
                        placeholder="Min. 6 characters"
                        autoComplete="new-password"
                      />
                      <button type="button" className="dept-pw-toggle" onClick={() => setShowNewPw((v) => !v)} aria-label="Toggle password visibility">
                        {showNewPw ? <EyeOffIcon /> : <EyeIcon />}
                      </button>
                    </div>
                  </div>
                  <div className="dept-form-group">
                    <label className="dept-form-label">Confirm New Password</label>
                    <div className="dept-input-wrap">
                      <input
                        className="dept-form-input"
                        type={showConfirmPw ? 'text' : 'password'}
                        value={form.confirm_password}
                        onChange={(e) => setForm((f) => ({ ...f, confirm_password: e.target.value }))}
                        placeholder="Repeat new password"
                        autoComplete="new-password"
                      />
                      <button type="button" className="dept-pw-toggle" onClick={() => setShowConfirmPw((v) => !v)} aria-label="Toggle password visibility">
                        {showConfirmPw ? <EyeOffIcon /> : <EyeIcon />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
                <button type="button" className="dept-btn dept-btn-secondary" style={{ flex: 1 }} onClick={cancelEdit} disabled={saving}>
                  Cancel
                </button>
                <button type="submit" className="dept-btn dept-btn-primary" style={{ flex: 1 }} disabled={saving}>
                  {saving ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </form>
          )}

          <button
            className="dept-btn dept-btn-danger dept-btn-full dept-signout-mobile-only"
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
              <button className="dept-btn dept-btn-secondary" onClick={() => setShowSignOut(false)} disabled={signingOut}>
                Cancel
              </button>
              <button className="dept-btn dept-btn-danger" onClick={handleSignOut} disabled={signingOut}>
                {signingOut ? 'Signing out…' : 'Sign Out'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
