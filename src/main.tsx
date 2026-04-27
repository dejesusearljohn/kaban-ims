import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { supabase } from './supabaseClient'

const MANIFEST_SELECTOR = 'link[rel="manifest"]'

const ensureManifestLink = () => {
  if (document.querySelector(MANIFEST_SELECTOR)) {
    return
  }

  const manifestLink = document.createElement('link')
  manifestLink.rel = 'manifest'
  manifestLink.href = '/manifest.webmanifest'
  document.head.appendChild(manifestLink)
}

const removeManifestLink = () => {
  document.querySelectorAll<HTMLLinkElement>(MANIFEST_SELECTOR).forEach((manifestLink) => {
    manifestLink.remove()
  })
}

const registerServiceWorker = () => {
  if (!('serviceWorker' in navigator)) {
    return
  }

  window.addEventListener(
    'load',
    () => {
      void navigator.serviceWorker.register('/sw.js')
    },
    { once: true },
  )
}

const unregisterServiceWorkers = async () => {
  if (!('serviceWorker' in navigator)) {
    return
  }

  const registrations = await navigator.serviceWorker.getRegistrations()
  await Promise.all(registrations.map((registration) => registration.unregister()))
}

const isAdminPortalSession = async (
  session: Awaited<ReturnType<typeof supabase.auth.getSession>>['data']['session'],
) => {
  if (!session) {
    return true
  }

  const { data, error } = await supabase
    .from('users')
    .select('role')
    .eq('id', session.user.id)
    .maybeSingle()

  if (error || !data) {
    return true
  }

  const normalizedRole = (data.role ?? '').trim().toLowerCase()
  return normalizedRole === 'super admin' || normalizedRole === 'admin'
}

const syncPwaByRole = async (
  session: Awaited<ReturnType<typeof supabase.auth.getSession>>['data']['session'],
) => {
  const adminPortalSession = await isAdminPortalSession(session)

  if (adminPortalSession) {
    removeManifestLink()
    await unregisterServiceWorkers()
    return
  }

  ensureManifestLink()
  registerServiceWorker()
}

void supabase.auth
  .getSession()
  .then(({ data }) => syncPwaByRole(data.session))

supabase.auth.onAuthStateChange((_event, session) => {
  void syncPwaByRole(session)
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
