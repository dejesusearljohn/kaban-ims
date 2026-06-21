import { useEffect, useRef, useState, type FormEvent } from 'react'
import SignInPage from './SignInPage.tsx'
import DashboardPage from './DashboardPage'
import { DepartmentDashboardPage } from './DepartmentDashboard'
import { supabase } from '../supabaseClient'
import '../styles/App.css'
import '../styles/shared.css'

// Auto-logout after 5 minutes of inactivity for session security
const INACTIVITY_TIMEOUT_MS = 5 * 60 * 1000 // 5 minutes

const hashPasswordForStorage = async (password: string) => {
	if (typeof window === 'undefined' || !window.crypto?.subtle) {
		throw new Error('Secure hashing is not available in this environment.')
	}

	const encoded = new TextEncoder().encode(password)
	const digest = await window.crypto.subtle.digest('SHA-256', encoded)
	const hashHex = Array.from(new Uint8Array(digest))
		.map((byte) => byte.toString(16).padStart(2, '0'))
		.join('')

	return `sha256:${hashHex}`
}

function ForcePasswordChange({ userId, onComplete }: { userId: string; onComplete: () => void }) {
	const [newPassword, setNewPassword] = useState('')
	const [confirmPassword, setConfirmPassword] = useState('')
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)

	const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault()
		setError(null)

		if (newPassword.length < 8) {
			setError('New password must be at least 8 characters.')
			return
		}

		if (newPassword !== confirmPassword) {
			setError('Password confirmation does not match.')
			return
		}

		setLoading(true)

		const { error: updatePasswordError } = await supabase.auth.updateUser({ password: newPassword })
		if (updatePasswordError) {
			setError(updatePasswordError.message)
			setLoading(false)
			return
		}

		try {
			const passwordHash = await hashPasswordForStorage(newPassword)
			const { error: updateProfileError } = await supabase
				.from('users')
				.update({ password_hash: passwordHash, must_change_password: false })
				.eq('id', userId)

			if (updateProfileError) {
				setError(updateProfileError.message)
				setLoading(false)
				return
			}
		} catch (hashError) {
			setError(hashError instanceof Error ? hashError.message : 'Failed to save password status.')
			setLoading(false)
			return
		}

		setLoading(false)
		onComplete()
	}

	return (
		<main className="signin-page">
			<div className="signin-shell signin-shell-compact">
				<section className="signin-card signin-card-compact" aria-label="Change initial password">
					<div className="signin-compact-content">
						<h2 className="signin-heading">CHANGE PASSWORD</h2>
						<p className="signin-forgot-desc">
							For account security, set a new password before using KABAN.
						</p>

						<form className="signin-form" onSubmit={handleSubmit}>
							<div className="field-group">
								<label htmlFor="forced-new-password">New Password</label>
								<input
									id="forced-new-password"
									type="password"
									placeholder="Enter new password"
									autoComplete="new-password"
									value={newPassword}
									onChange={(event) => setNewPassword(event.target.value)}
									required
								/>
							</div>

							<div className="field-group">
								<label htmlFor="forced-confirm-password">Confirm New Password</label>
								<input
									id="forced-confirm-password"
									type="password"
									placeholder="Confirm new password"
									autoComplete="new-password"
									value={confirmPassword}
									onChange={(event) => setConfirmPassword(event.target.value)}
									required
								/>
							</div>

							{error && <p className="signin-error">{error}</p>}

							<button type="submit" className="primary-button" disabled={loading}>
								{loading ? 'Updating...' : 'Update Password'}
							</button>
						</form>
					</div>
				</section>
			</div>
		</main>
	)
}

function App() {
	const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)
	const [dashboardTarget, setDashboardTarget] = useState<'admin' | 'department' | null>(null)
	const [mustChangePassword, setMustChangePassword] = useState(false)
	const [currentUserId, setCurrentUserId] = useState<string | null>(null)
	const [isReadOnlyAccount, setIsReadOnlyAccount] = useState(false)
	const [departmentName, setDepartmentName] = useState('Department')
	const [departmentCode, setDepartmentCode] = useState('')
	const [staffUserId, setStaffUserId] = useState<string | null>(null)
	const [staffDepartmentId, setStaffDepartmentId] = useState<number | null>(null)
	const detectRecoveryFlow = () => {
		const hash = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : window.location.hash
		const hashParams = new URLSearchParams(hash)
		const queryParams = new URLSearchParams(window.location.search)

		return hashParams.get('type') === 'recovery' || queryParams.get('type') === 'recovery'
	}
	const [isRecoveryFlow, setIsRecoveryFlow] = useState<boolean>(() =>
		typeof window !== 'undefined' ? detectRecoveryFlow() : false,
	)
	const inactivityTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
	const [sessionTimeoutMessage, setSessionTimeoutMessage] = useState<string | null>(null)

	useEffect(() => {
		if (!sessionTimeoutMessage) return

		const timeoutId = window.setTimeout(() => {
			setSessionTimeoutMessage(null)
		}, 5000)

		return () => {
			window.clearTimeout(timeoutId)
		}
	}, [sessionTimeoutMessage])

	const resetInactivityTimer = () => {
		if (inactivityTimer.current) clearTimeout(inactivityTimer.current)
		inactivityTimer.current = setTimeout(async () => {
			setSessionTimeoutMessage('Your session has timed out due to inactivity. Please sign in again.')
			await supabase.auth.signOut()
		}, INACTIVITY_TIMEOUT_MS)
	}

	useEffect(() => {
		if (!isAuthenticated) return

		// Only count meaningful interactions (not mousemove, which can happen even when idle)
		const events: (keyof WindowEventMap)[] = ['mousedown', 'keydown', 'touchstart', 'scroll', 'click']
		const handler = () => resetInactivityTimer()

		events.forEach((e) => window.addEventListener(e, handler, { passive: true }))
		resetInactivityTimer()

		return () => {
			events.forEach((e) => window.removeEventListener(e, handler))
			if (inactivityTimer.current) clearTimeout(inactivityTimer.current)
		}
	}, [isAuthenticated]) // eslint-disable-line react-hooks/exhaustive-deps

	useEffect(() => {
		let isMounted = true

		const getDashboardTarget = async (userId: string) => {
			const { data, error } = await supabase
				.from('users')
				.select('role, department_id, is_archived, is_locked, created_at, must_change_password')
				.eq('id', userId)
				.maybeSingle()

			if (error || !data) return null
			if (data.is_archived) return null

			const normalizedRole = (data.role ?? '').trim().toLowerCase()

			if (normalizedRole === 'super admin' || normalizedRole === 'admin') {
				if (data.is_locked) return null
				return { kind: 'admin' as const, isReadOnly: false, mustChangePassword: Boolean(data.must_change_password) }
			}

			if (normalizedRole === 'staff') {
				if (data.is_locked) return null

				if (!data.department_id) {
					return { kind: 'department' as const, departmentName: 'Department', departmentId: null, isReadOnly: false, mustChangePassword: Boolean(data.must_change_password) }
				}

				const { data: department } = await supabase
					.from('departments')
					.select('dept_name, dept_code')
					.eq('id', data.department_id)
					.maybeSingle()

				const departmentCode = department?.dept_code?.trim() || ''

				return {
					kind: 'department' as const,
					departmentName: department?.dept_name?.trim() || 'Department',
					departmentCode,
					departmentId: data.department_id,
					isReadOnly: false,
					mustChangePassword: Boolean(data.must_change_password),
				}
			}

			return null
		}

		const applySessionAccess = async (
			session: Awaited<ReturnType<typeof supabase.auth.getSession>>['data']['session'],
		) => {
			if (!session) {
				if (isMounted) {
					setIsAuthenticated(false)
					setDashboardTarget(null)
					setMustChangePassword(false)
					setCurrentUserId(null)
					setIsReadOnlyAccount(false)
				}
				return
			}

			const target = await getDashboardTarget(session.user.id)

			if (!target) {
				await supabase.auth.signOut()
				if (isMounted) {
					setIsAuthenticated(false)
					setDashboardTarget(null)
					setMustChangePassword(false)
					setCurrentUserId(null)
					setIsReadOnlyAccount(false)
				}
				return
			}

			if (isMounted) {
				setIsAuthenticated(true)
				setDashboardTarget(target.kind)
				setMustChangePassword(Boolean(target.mustChangePassword))
				setCurrentUserId(session.user.id)
				setIsReadOnlyAccount(Boolean(target.isReadOnly))
				if (target.kind === 'department') {
					setDepartmentName(target.departmentName)
					setDepartmentCode('departmentCode' in target ? (target.departmentCode ?? '') : '')
					setStaffUserId(session.user.id)
					setStaffDepartmentId(target.departmentId ?? null)
				}
			}
		}

		const initAuth = async () => {
			const { data } = await supabase.auth.getSession()
			await applySessionAccess(data.session)
		}

		void initAuth()

		const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
			if (event === 'PASSWORD_RECOVERY' && isMounted) {
				setIsRecoveryFlow(true)
			}
			void applySessionAccess(session)
		})

		return () => {
			isMounted = false
			listener.subscription.unsubscribe()
		}
	}, [])

	if (isAuthenticated === null) {
		return null
	}

	const sessionTimeoutToast = sessionTimeoutMessage ? (
		<div className="session-timeout-toast" role="alert" aria-live="polite">
			<div className="session-timeout-toast-accent" aria-hidden="true" />
			<div className="session-timeout-toast-content">
				<p className="session-timeout-toast-title">Session timed out</p>
				<p className="session-timeout-toast-text">{sessionTimeoutMessage}</p>
			</div>
		</div>
	) : null

	if (isRecoveryFlow) {
		return (
			<>
				<SignInPage
					initialView="reset"
					onPasswordResetComplete={() => {
						setIsRecoveryFlow(false)
						if (window.location.hash) {
							window.history.replaceState(null, '', window.location.pathname + window.location.search)
						}
					}}
				/>
				{sessionTimeoutToast}
			</>
		)
	}

	if (isAuthenticated) {
		if (mustChangePassword) {
			return (
				<>
					<ForcePasswordChange
						userId={currentUserId ?? ''}
						onComplete={() => setMustChangePassword(false)}
					/>
					{sessionTimeoutToast}
				</>
			)
		}

		if (dashboardTarget === 'department') {
			return (
				<>
					<DepartmentDashboardPage
						departmentName={departmentName}
						departmentCode={departmentCode}
						userId={staffUserId ?? ''}
						departmentId={staffDepartmentId}
						showReadOnlyNotice={isReadOnlyAccount}
						isReadOnly={isReadOnlyAccount}
					/>
					{sessionTimeoutToast}
				</>
			)
		}

		return (
			<>
				<DashboardPage />
				{sessionTimeoutToast}
			</>
		)
	}

	return (
		<>
			<SignInPage onSignInSuccess={() => {}} />
			{sessionTimeoutToast}
		</>
	)
}

export default App
