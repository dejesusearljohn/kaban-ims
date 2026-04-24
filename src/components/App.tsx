import { useEffect, useState } from 'react'
import SignInPage from './SignInPage.tsx'
import DashboardPage from './DashboardPage'
import { DepartmentDashboardPage } from './DepartmentDashboard'
import { supabase } from '../supabaseClient'

type DashboardTarget =
  | { kind: 'admin' }
  | { kind: 'department'; departmentName: string }

function App() {
	const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)
	const [dashboardTarget, setDashboardTarget] = useState<DashboardTarget | null>(null)

	useEffect(() => {
		let isMounted = true

		const getDashboardTarget = async (userId: string) => {
			const { data, error } = await supabase
				.from('users')
				.select('role, department_id')
				.eq('id', userId)
				.maybeSingle()

			if (error || !data) return null

			const normalizedRole = (data.role ?? '').trim().toLowerCase()

			if (normalizedRole === 'super admin') {
				return { kind: 'admin' as const }
			}

			if (data.department_id == null) {
				return null
			}

			const { data: departmentRow, error: departmentError } = await supabase
				.from('departments')
				.select('dept_name')
				.eq('id', data.department_id)
				.maybeSingle()

			if (departmentError || !departmentRow) {
				return null
			}

			return {
				kind: 'department' as const,
				departmentName: departmentRow.dept_name,
			}
		}

		const applySessionAccess = async (
			session: Awaited<ReturnType<typeof supabase.auth.getSession>>['data']['session'],
		) => {
			if (!session) {
				if (isMounted) setDashboardTarget(null)
				if (isMounted) setIsAuthenticated(false)
				return
			}

			const target = await getDashboardTarget(session.user.id)

			if (!target) {
				await supabase.auth.signOut()
				if (isMounted) setDashboardTarget(null)
				if (isMounted) setIsAuthenticated(false)
				return
			}

			if (isMounted) setDashboardTarget(target)
			if (isMounted) setIsAuthenticated(true)
		}

		const initAuth = async () => {
			const { data } = await supabase.auth.getSession()
			await applySessionAccess(data.session)
		}

		void initAuth()

		const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
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

	if (isAuthenticated) {
		if (dashboardTarget?.kind === 'department') {
			return <DepartmentDashboardPage departmentName={dashboardTarget.departmentName} />
		}

		return <DashboardPage />
	}

	return <SignInPage onSignInSuccess={() => {}} />
}

export default App
