import { useEffect, useRef, useState } from 'react'
import SignInPage from './SignInPage.tsx'
import DashboardPage from './DashboardPage'
import { supabase } from '../supabaseClient'

const INACTIVITY_TIMEOUT_MS = 20 * 60 * 1000 // 20 minutes

function App() {
	const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)
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
