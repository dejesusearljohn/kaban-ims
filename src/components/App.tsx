import { useEffect, useRef, useState } from 'react'
import SignInPage from './SignInPage.tsx'
import DashboardPage from './DashboardPage'
import { DepartmentDashboardPage } from './DepartmentDashboard'
import { supabase } from '../supabaseClient'
import '../styles/App.css'

// Auto-logout after 5 minutes of inactivity for session security
const INACTIVITY_TIMEOUT_MS = 5 * 60 * 1000 // 5 minutes
const SHIFT_TURNOVER_LOCK_WINDOW_MS = 48 * 60 * 60 * 1000 // 48 hours

function App() {
	const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)
	const [dashboardTarget, setDashboardTarget] = useState<'admin' | 'department' | null>(null)
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
				.select('role, department_id, is_archived, is_locked, created_at')
				.eq('id', userId)
				.maybeSingle()

			if (error || !data) return null
			if (data.is_archived) return null

			const normalizedRole = (data.role ?? '').trim().toLowerCase()

			if (normalizedRole === 'super admin' || normalizedRole === 'admin') {
				if (data.is_locked) return null
				return { kind: 'admin' as const, isReadOnly: false }
			}

			if (normalizedRole === 'staff') {
				if (!data.department_id) {
					if (data.is_locked) return null
					return { kind: 'department' as const, departmentName: 'Department', departmentId: null, isReadOnly: false }
				}

				const { data: department } = await supabase
					.from('departments')
					.select('dept_name, dept_code')
					.eq('id', data.department_id)
					.maybeSingle()

				const departmentCode = department?.dept_code?.trim() || ''
				const isNebruStaff = departmentCode.toUpperCase() === 'NEBRU'
				let isLocked = Boolean(data.is_locked)

				if (isNebruStaff) {
					const { data: latestTurnover } = await supabase
						.from('shift_turnovers')
						.select('created_at')
						.eq('outgoing_staff_id', userId)
						.order('created_at', { ascending: false })
						.limit(1)
						.maybeSingle()

					const referenceDate = latestTurnover?.created_at ?? data.created_at ?? null
					const isOverdueForTurnover = referenceDate
						? Date.now() - new Date(referenceDate).getTime() > SHIFT_TURNOVER_LOCK_WINDOW_MS
						: false

					if (isOverdueForTurnover && !isLocked) {
						const { error: lockError } = await supabase
							.from('users')
							.update({ is_locked: true })
							.eq('id', userId)

						if (!lockError) {
							isLocked = true
						}
					}
				}

				if (isLocked && !isNebruStaff) return null

				return {
					kind: 'department' as const,
					departmentName: department?.dept_name?.trim() || 'Department',
					departmentCode,
					departmentId: data.department_id,
					isReadOnly: isLocked && isNebruStaff,
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
					setIsReadOnlyAccount(false)
				}
				return
			}

			if (isMounted) {
				setIsAuthenticated(true)
				setDashboardTarget(target.kind)
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
