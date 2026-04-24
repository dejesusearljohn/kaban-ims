import { useState } from 'react'
import type { FormEvent } from 'react'
import '../styles/App.css'
import { supabase } from '../supabaseClient'

export const BANICAIN_LOGO_URL =
  'https://www.figma.com/api/mcp/asset/5f5a849e-9677-4067-b82e-3e6b9b319ffe'

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

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setLoading(true)

    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: username,
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

      const isSuperAdmin = !roleError && !!userRow && (userRow.role ?? '').trim().toLowerCase() === 'super admin'

      if (!isSuperAdmin) {
        await supabase.auth.signOut()
        setError('Access denied. Only the Super Admin account can access this system.')
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
                <input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
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
                <a className="link-muted" href="#">
                  Forgot Password?
                </a>
              </div>

              {error && <p className="signin-error">{error}</p>}

              <button type="submit" className="primary-button" disabled={loading}>
                {loading ? 'Signing in…' : 'Sign In'}
              </button>
            </form>
          </div>
        </section>
      </div>
    </main>
  )
}

export default SignInPage
