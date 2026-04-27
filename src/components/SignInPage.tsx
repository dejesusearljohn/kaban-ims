import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import '../styles/App.css'
import { supabase } from '../supabaseClient'

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

      const normalizedRole = (userRow?.role ?? '').trim().toLowerCase()
      const isAdminPortalUser = !roleError && !!userRow && (normalizedRole === 'super admin' || normalizedRole === 'admin')

      if (!isAdminPortalUser) {
        await supabase.auth.signOut()
        setError('Access denied. This web app is only for Super Admin and Admin accounts. Staff accounts should use the staff web app.')
        setLoading(false)
        return
      }

      if (rememberMe) {
        window.localStorage.setItem('kabanRememberedUsername', username)
      } else {
        window.localStorage.removeItem('kabanRememberedUsername')
      }

      if (onSignInSuccess) {
        onSignInSuccess()
      }
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
                    <span className="signin-terms-link">Terms and Conditions</span>.
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
  )
}

export default SignInPage
