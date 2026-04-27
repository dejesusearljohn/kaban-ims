import { useEffect, useState } from 'react'
import SignInPage from './SignInPage.tsx'
import DashboardPage from './DashboardPage'
import { supabase } from '../supabaseClient'

function App() {
	const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)

	useEffect(() => {
		let isMounted = true

		const getDashboardTarget = async (userId: string) => {
			const { data, error } = await supabase
				.from('users')
				.select('role')
				.eq('id', userId)
				.maybeSingle()

			if (error || !data) return null

			const normalizedRole = (data.role ?? '').trim().toLowerCase()

			if (normalizedRole === 'super admin' || normalizedRole === 'admin') {
				return { kind: 'admin' as const }
			}

			return null
		}

		const applySessionAccess = async (
			session: Awaited<ReturnType<typeof supabase.auth.getSession>>['data']['session'],
		) => {
			if (!session) {
			if (isMounted) setIsAuthenticated(false)
			return
		}

			const target = await getDashboardTarget(session.user.id)

			if (!target) {
				await supabase.auth.signOut()
				if (isMounted) setIsAuthenticated(false)
				return
			}

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
		return <DashboardPage />
	}

	return <SignInPage onSignInSuccess={() => {}} />
}

export default App
