import { useEffect, useState } from 'react'
import SignInPage from './SignInPage.tsx'
import DashboardPage from './DashboardPage'
import { supabase } from '../supabaseClient'

function App() {
	const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)

	useEffect(() => {
		let isMounted = true

		const initAuth = async () => {
			const { data } = await supabase.auth.getSession()
			if (isMounted) {
				setIsAuthenticated(!!data.session)
			}
		}

		void initAuth()

		const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
			setIsAuthenticated(!!session)
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

	return <SignInPage onSignInSuccess={() => setIsAuthenticated(true)} />
}

export default App
