import { useEffect, useRef, useState } from 'react'
import SignInPage from './SignInPage.tsx'
import DashboardPage from './DashboardPage'
import { DepartmentDashboardPage } from './DepartmentDashboard'
import { supabase } from '../supabaseClient'

const INACTIVITY_TIMEOUT_MS = 20 * 60 * 1000 // 20 minutes

function App() {
	const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)
	const [dashboardTarget, setDashboardTarget] = useState<'admin' | 'department' | null>(null)
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

	const resetInactivityTimer = () => {
		if (inactivityTimer.current) clearTimeout(inactivityTimer.current)
		inactivityTimer.current = setTimeout(async () => {
			await supabase.auth.signOut()
		}, INACTIVITY_TIMEOUT_MS)
	}

	useEffect(() => {
		if (!isAuthenticated) return

		const events: (keyof WindowEventMap)[] = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click']
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
				.select('role, department_id, is_archived, is_locked')
				.eq('id', userId)
				.maybeSingle()

			if (error || !data) return null
			if (data.is_archived || data.is_locked) return null

			const normalizedRole = (data.role ?? '').trim().toLowerCase()

			if (normalizedRole === 'super admin' || normalizedRole === 'admin') {
				return { kind: 'admin' as const }
			}

			if (normalizedRole === 'staff') {
				if (!data.department_id) {
					return { kind: 'department' as const, departmentName: 'Department', departmentId: null }
				}

				const { data: department } = await supabase
					.from('departments')
					.select('dept_name, dept_code')
					.eq('id', data.department_id)
					.maybeSingle()

				return {
					kind: 'department' as const,
					departmentName: department?.dept_name?.trim() || 'Department',
					departmentCode: department?.dept_code?.trim() || '',
					departmentId: data.department_id,
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
				}
				return
			}

			const target = await getDashboardTarget(session.user.id)

			if (!target) {
				await supabase.auth.signOut()
				if (isMounted) {
					setIsAuthenticated(false)
					setDashboardTarget(null)
				}
				return
			}

			if (isMounted) {
				setIsAuthenticated(true)
				setDashboardTarget(target.kind)
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

	if (isRecoveryFlow) {
		return (
			<SignInPage
				initialView="reset"
				onPasswordResetComplete={() => {
					setIsRecoveryFlow(false)
					if (window.location.hash) {
						window.history.replaceState(null, '', window.location.pathname + window.location.search)
					}
				}}
			/>
		)
	}

	if (isAuthenticated) {
		if (dashboardTarget === 'department') {
			return (
				<DepartmentDashboardPage
					departmentName={departmentName}
					departmentCode={departmentCode}
					userId={staffUserId ?? ''}
					departmentId={staffDepartmentId}
				/>
			)
		}

		return <DashboardPage />
	}

	return <SignInPage onSignInSuccess={() => {}} />
}

export default App
