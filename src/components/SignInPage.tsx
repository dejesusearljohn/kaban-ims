import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import '../styles/App.css'
import { supabase } from '../supabaseClient'

function TermsModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="terms-backdrop" role="dialog" aria-modal="true" aria-labelledby="terms-title" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="terms-modal">
        <div className="terms-modal-header">
          <h2 id="terms-title">Terms and Conditions</h2>
          <button className="terms-close-btn" aria-label="Close" onClick={onClose}>✕</button>
        </div>
        <div className="terms-modal-body">
          <p className="terms-effective">Effective Date: January 1, 2025 &nbsp;|&nbsp; Barangay Banicain, Olongapo City, Philippines</p>

          <p>Welcome to <strong>KABAN</strong> — the Barangay Banicain Resource Management System. By accessing or using this system, you agree to be bound by the following Terms and Conditions. If you do not agree, do not use this system.</p>

          <h3>1. Purpose of the System</h3>
          <p>KABAN is an internal inventory and resource management system operated exclusively by authorized personnel of Barangay Banicain, Olongapo City. It is intended solely for official barangay government use in managing inventory, property accountability records (PAR), work and material requests (WMR), stockpile tracking, and vehicle monitoring.</p>

          <h3>2. Authorized Users</h3>
          <p>Access is restricted to duly appointed and authorized barangay officials and staff. Unauthorized access, sharing of credentials, or any attempt to circumvent access controls is strictly prohibited and may constitute a violation of Republic Act No. 10175 (Cybercrime Prevention Act of 2012).</p>

          <h3>3. Data Privacy — Republic Act No. 10173</h3>
          <p>The collection, storage, and processing of personal information within KABAN is governed by the <strong>Data Privacy Act of 2012 (RA 10173)</strong> and its Implementing Rules and Regulations (IRR), as administered by the National Privacy Commission (NPC).</p>
          <ul>
            <li>Personal data collected includes names, contact details, official positions, and records of transactions necessary for barangay operations.</li>
            <li>Data is collected for legitimate government purposes only, is proportionate to those purposes, and is retained only for as long as necessary.</li>
            <li>Data subjects have the right to access, correct, and object to the processing of their personal data, consistent with Section 16 of RA 10173.</li>
            <li>All personnel with access to this system are bound by confidentiality obligations and shall not disclose personal data outside of authorized purposes.</li>
            <li>Unauthorized disclosure, misuse, or unauthorized processing of personal data may result in administrative, civil, or criminal liability under RA 10173.</li>
          </ul>

          <h3>4. Government Property and Records</h3>
          <p>All records, documents, and data generated or managed within KABAN are official government records. Unauthorized alteration, deletion, or tampering with these records may constitute a violation of:</p>
          <ul>
            <li>Republic Act No. 9470 (National Archives of the Philippines Act of 2007)</li>
            <li>Revised Penal Code provisions on falsification of public documents (Articles 170–172)</li>
            <li>Republic Act No. 3019 (Anti-Graft and Corrupt Practices Act)</li>
          </ul>

          <h3>5. Acceptable Use</h3>
          <p>Users must use the system only for official and authorized barangay transactions. The following are strictly prohibited:</p>
          <ul>
            <li>Accessing another user's account without authorization</li>
            <li>Entering false, misleading, or unauthorized records</li>
            <li>Attempting to bypass, disable, or compromise system security features</li>
            <li>Using the system for personal gain or for purposes unrelated to official barangay functions</li>
          </ul>

          <h3>6. Account Security</h3>
          <p>Each user is responsible for maintaining the confidentiality of their login credentials. You must immediately report any unauthorized use of your account to the system administrator. The barangay reserves the right to suspend or revoke access at any time without prior notice.</p>

          <h3>7. Session and Inactivity Policy</h3>
          <p>For security purposes, user sessions automatically expire after <strong>20 minutes of inactivity</strong>. Users are advised to log out after each use, especially on shared devices.</p>

          <h3>8. Audit and Monitoring</h3>
          <p>All system activities, including logins, data entries, modifications, and deletions, may be logged and audited in accordance with applicable government accountability laws and Commission on Audit (COA) regulations.</p>

          <h3>9. Intellectual Property</h3>
          <p>KABAN and all associated software, design, and content are the property of Barangay Banicain. Unauthorized reproduction, distribution, or modification of any part of this system is prohibited.</p>

          <h3>10. Disclaimer of Warranties</h3>
          <p>This system is provided on an "as-is" basis. While the barangay makes reasonable efforts to maintain system availability and accuracy, it does not warrant uninterrupted or error-free operation. Users are encouraged to verify critical data.</p>

          <h3>11. Amendments</h3>
          <p>These Terms and Conditions may be updated from time to time. Continued use of the system after any amendment constitutes acceptance of the revised terms.</p>

          <h3>12. Governing Law and Jurisdiction</h3>
          <p>These Terms are governed by the laws of the Republic of the Philippines. Any dispute arising from the use of this system shall be subject to the jurisdiction of the appropriate courts of Olongapo City.</p>

          <p className="terms-footer-note">For concerns regarding data privacy, please contact the Barangay Banicain Data Protection Officer through the barangay hall of Barangay Banicain, Olongapo City.</p>
        </div>
        <div className="terms-modal-footer">
          <button className="primary-button" onClick={onClose}>I Understand</button>
        </div>
      </div>
    </div>
  )
}

function maskEmail(email: string): string {
  const [local, domain] = email.split('@')
  if (!domain) return email
  const visible = local.length <= 2 ? local[0] : local.slice(0, 2)
  return `${visible}${'*'.repeat(Math.max(local.length - 2, 3))}@${domain}`
}

export const BANICAIN_LOGO_URL = '/Banicain-logo.png'

type SignInPageProps = {
	onSignInSuccess?: () => void
}

function SignInPage({ onSignInSuccess }: SignInPageProps) {
  const rememberedUsername =
    typeof window !== 'undefined' ? window.localStorage.getItem('kabanRememberedUsername') ?? '' : ''

  const [username, setUsername] = useState(rememberedUsername)
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [rememberMe, setRememberMe] = useState(Boolean(rememberedUsername))
  const [showPassword, setShowPassword] = useState(false)
  const [view, setView] = useState<'signin' | 'forgot'>('signin')
  const [showTerms, setShowTerms] = useState(false)

  // Forgot password state
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotLoading, setForgotLoading] = useState(false)
  const [forgotError, setForgotError] = useState<string | null>(null)
  const [forgotSuccess, setForgotSuccess] = useState<string | null>(null)

  useEffect(() => {
    if (!forgotError) return
    const id = window.setTimeout(() => setForgotError(null), 5000)
    return () => window.clearTimeout(id)
  }, [forgotError])

  useEffect(() => {
    if (!forgotSuccess) return
    const id = window.setTimeout(() => setForgotSuccess(null), 8000)
    return () => window.clearTimeout(id)
  }, [forgotSuccess])

  useEffect(() => {
    if (!error) return

    const timeoutId = window.setTimeout(() => {
      setError(null)
    }, 5000)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [error])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setLoading(true)

    // The user types their system/fake email (e.g. brd001@kaban.com).
    // Look up the real recovery_email stored in the users table — that is
    // what is registered in Supabase Auth.
    const typedEmail = username.trim().toLowerCase()
    const { data: lookupRow } = await supabase
      .from('users')
      .select('recovery_email')
      .eq('email', typedEmail)
      .maybeSingle()

    const authEmail = lookupRow?.recovery_email?.trim() || typedEmail

    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: authEmail,
      password,
    })

    if (signInError) {
      setError(signInError.message)
    } else {
      const userId = signInData.user?.id

      if (!userId) {
        await supabase.auth.signOut()
        setError('Unable to validate account access. Please try again.')
        setLoading(false)
        return
      }

      const { data: userRow, error: roleError } = await supabase
        .from('users')
        .select('role')
        .eq('id', userId)
        .maybeSingle()

      if (roleError || !userRow) {
        await supabase.auth.signOut()
        setError('Unable to validate account access. Please try again.')
        setLoading(false)
        return
      }

      const normalizedRole = (userRow.role ?? '').trim().toLowerCase()

      if (normalizedRole === 'super admin' || normalizedRole === 'admin' || normalizedRole === 'staff') {
        if (rememberMe) window.localStorage.setItem('kabanRememberedUsername', username)
        else window.localStorage.removeItem('kabanRememberedUsername')
        if (onSignInSuccess) onSignInSuccess()
        setLoading(false)
        return
      }

      await supabase.auth.signOut()
      setError('Access denied. Your account does not have a valid role.')
    }

    setLoading(false)
  }

  const handleForgotPassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setForgotError(null)
    setForgotSuccess(null)

    const trimmedEmail = forgotEmail.trim().toLowerCase()
    if (!trimmedEmail) {
      setForgotError('Please enter your staff email.')
      return
    }

    setForgotLoading(true)

    // Look up the user to confirm the account exists and get recovery email
    const { data: userRow, error: lookupError } = await supabase
      .from('users')
      .select('recovery_email')
      .eq('email', trimmedEmail)
      .maybeSingle()

    if (lookupError || !userRow) {
      setForgotError('No account found for that email address.')
      setForgotLoading(false)
      return
    }

    if (!userRow.recovery_email) {
      setForgotError('No recovery email is on file for this account. Contact your Super Admin to set one.')
      setForgotLoading(false)
      return
    }

    // Send the reset link to the real auth email (recovery_email)
    await supabase.auth.resetPasswordForEmail(userRow.recovery_email.trim(), {
      redirectTo: window.location.origin,
    })

    const maskedRecovery = maskEmail(userRow.recovery_email)
    setForgotSuccess(`A password reset link has been sent to ${maskedRecovery}.`)
    setForgotLoading(false)
  }

  return (
    <>
    <main className="signin-page">
      <div className="signin-shell">
        <div className="signin-background-logo" aria-hidden="true">
          <img src={BANICAIN_LOGO_URL} alt="" />
        </div>

        <section className="signin-card" aria-label="KABAN sign in">
          <div className="signin-left">
            <div className="signin-left-panel">
              <div className="signin-left-inner">
                <h1 className="signin-title">KABAN</h1>
                <p className="signin-subtitle">
                  Barangay Banicain Resource
                  <br />
                  Management System
                </p>

                <div className="signin-emblem">
                  <img
                    src={BANICAIN_LOGO_URL}
                    alt="Barangay Banicain seal"
                  />
                </div>

                <p className="signin-tagline">
                  Efficiency in Every Entry
                  <br />
                  Transparency in Every Task.
                </p>
              </div>
            </div>
          </div>

          <div className="signin-right">
            {view === 'signin' ? (
              <>
                <h2 className="signin-heading">SIGN IN</h2>

                <form className="signin-form" onSubmit={handleSubmit}>
                  <div className="field-group">
                    <label htmlFor="username">Username</label>
                    <input
                      id="username"
                      name="username"
                      type="text"
                      placeholder="Enter your username"
                      autoComplete="username"
                      value={username}
                      onChange={(event) => setUsername(event.target.value)}
                      required
                    />
                  </div>

                  <div className="field-group">
                    <label htmlFor="password">Password</label>
                    <div className="password-input-wrapper">
                      <input
                        id="password"
                        name="password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Enter your password"
                        autoComplete="current-password"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        required
                      />
                      <button
                        type="button"
                        className="password-toggle"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        onClick={() => setShowPassword((v) => !v)}
                      >
                        {showPassword ? (
                          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                            <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                            <line x1="1" y1="1" x2="23" y2="23"/>
                          </svg>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                            <circle cx="12" cy="12" r="3"/>
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="signin-meta">
                    <label className="checkbox">
                      <input
                        id="remember"
                        name="remember"
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(event) => setRememberMe(event.target.checked)}
                      />
                      <span>Remember me</span>
                    </label>
                    <button
                      type="button"
                      className="link-muted"
                      onClick={() => { setForgotEmail(''); setForgotError(null); setForgotSuccess(null); setView('forgot') }}
                    >
                      Forgot Password?
                    </button>
                  </div>

                  {error && <p className="signin-error">{error}</p>}

                  <button type="submit" className="primary-button" disabled={loading}>
                    {loading ? 'Signing in…' : 'Sign In'}
                  </button>

                  <p className="signin-terms">
                    By signing in, you accept our{' '}
                    <button type="button" className="signin-terms-link" onClick={() => setShowTerms(true)}>Terms and Conditions</button>.
                  </p>
                </form>
              </>
            ) : (
              <>
                <h2 className="signin-heading">RESET PASSWORD</h2>
                <p className="signin-forgot-desc">
                  Enter your staff email (e.g. brd001@kaban.com). A reset link will be sent if the account is found.
                </p>

                <form className="signin-form" onSubmit={handleForgotPassword}>
                  <div className="field-group">
                    <label htmlFor="forgot-email">Staff Email</label>
                    <input
                      id="forgot-email"
                      name="forgot-email"
                      type="email"
                      placeholder="Enter your staff email"
                      autoComplete="email"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      required
                    />
                  </div>

                  {forgotError && <p className="signin-error">{forgotError}</p>}
                  {forgotSuccess && <p className="signin-success">{forgotSuccess}</p>}

                  <button type="submit" className="primary-button" disabled={forgotLoading}>
                    {forgotLoading ? 'Looking up…' : 'Send Reset Link'}
                  </button>

                  <button
                    type="button"
                    className="signin-back-link"
                    onClick={() => { setView('signin'); setForgotError(null); setForgotSuccess(null) }}
                  >
                    ← Back to Sign In
                  </button>
                </form>
              </>
            )}
          </div>
        </section>
      </div>
    </main>

    {showTerms && <TermsModal onClose={() => setShowTerms(false)} />}
  </>
  )
}

export default SignInPage
