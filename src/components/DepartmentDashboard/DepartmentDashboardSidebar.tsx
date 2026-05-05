import { useEffect, useState } from 'react'
import { BANICAIN_LOGO_URL } from '../SignInPage'
import { supabase } from '../../supabaseClient'
import type { DepartmentDashboardNavItem, DepartmentDashboardSectionKey } from './departmentDashboardConfig'

type DepartmentDashboardSidebarProps = {
  departmentName: string
  activeSection: DepartmentDashboardSectionKey
  navItems: DepartmentDashboardNavItem[]
  onSelectSection: (section: DepartmentDashboardSectionKey) => void
  isCollapsed: boolean
  onToggleCollapse: () => void
  showHeaderProfileButton?: boolean
}

function DepartmentDashboardSidebar({
  departmentName,
  activeSection,
  navItems,
  onSelectSection,
  isCollapsed,
  onToggleCollapse,
  showHeaderProfileButton = false,
}: DepartmentDashboardSidebarProps) {
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)

  useEffect(() => {
    document.body.classList.toggle('logout-modal-open', showLogoutConfirm)

    return () => {
      document.body.classList.remove('logout-modal-open')
    }
  }, [showLogoutConfirm])

  useEffect(() => {
    if (!showLogoutConfirm) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        setShowLogoutConfirm(false)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [showLogoutConfirm])

  const getNavIcon = (key: DepartmentDashboardSectionKey) => {
    switch (key) {
      case 'home':
        return (
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
        )
      case 'requests':
        return (
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
            <rect x="9" y="3" width="6" height="4" rx="1" />
            <line x1="9" y1="12" x2="15" y2="12" />
            <line x1="9" y1="16" x2="12" y2="16" />
          </svg>
        )
      case 'scanner':
        return (
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 7V5a2 2 0 012-2h2M17 3h2a2 2 0 012 2v2M21 17v2a2 2 0 01-2 2h-2M7 21H5a2 2 0 01-2-2v-2" />
            <line x1="3" y1="12" x2="21" y2="12" />
          </svg>
        )
      case 'reports':
        return (
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
          </svg>
        )
      case 'profile':
        return (
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        )
      case 'shift-turnover':
        return (
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 1l4 4-4 4" />
            <path d="M3 11V9a4 4 0 014-4h14" />
            <path d="M7 23l-4-4 4-4" />
            <path d="M21 13v2a4 4 0 01-4 4H3" />
          </svg>
        )
    }
  }

  return (
    <aside className={`sidebar ${isCollapsed ? 'sidebar-collapsed' : ''}`}>
      <div className="sidebar-header">
        <div className="sidebar-logo" aria-hidden="true">
          <img src={BANICAIN_LOGO_URL} alt="" />
        </div>
        <div className="sidebar-title">
          <h1>KABAN</h1>
          <p>Barangay Banicain Inventory</p>
        </div>
        {showHeaderProfileButton && (
          <button
            type="button"
            className={`sidebar-header-profile${activeSection === 'profile' ? ' active' : ''}`}
            aria-label="Open profile"
            title="Profile"
            onClick={() => onSelectSection('profile')}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </button>
        )}
        <button
          type="button"
          className="sidebar-toggle"
          aria-label={isCollapsed ? 'Show sidebar' : 'Hide sidebar'}
          title={isCollapsed ? 'Show sidebar' : 'Hide sidebar'}
          onClick={onToggleCollapse}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            {isCollapsed ? (
              <path
                d="M9 6l6 6-6 6"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ) : (
              <path
                d="M15 6l-6 6 6 6"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}
          </svg>
        </button>
      </div>

      <div className="sidebar-user">{departmentName}</div>

      <nav className="sidebar-nav" aria-label={`${departmentName} dashboard navigation`}>
        {navItems.map((item) => (
          <button
            key={item.key}
            className={`sidebar-link ${activeSection === item.key ? 'sidebar-link-active' : ''}`}
            type="button"
            onClick={() => onSelectSection(item.key)}
            title={item.description}
          >
            <span className="sidebar-link-icon" aria-hidden="true">
              {getNavIcon(item.key)}
            </span>
            <span className="sidebar-link-text">{item.label}</span>
          </button>
        ))}
      </nav>

      <button className="sidebar-signout" type="button" onClick={() => setShowLogoutConfirm(true)}>
        <span className="sidebar-link-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M10 5H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            <path d="M14 9l3 3-3 3" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M11 12h6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </span>
        <span className="sidebar-link-text">Sign Out</span>
      </button>

      {showLogoutConfirm && (
        <div className="logout-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="logout-modal-title">
          <div className="logout-modal">
            <h2 id="logout-modal-title" className="logout-modal-title">
              Sign out
            </h2>
            <p className="logout-modal-text">Are you sure you want to sign out?</p>
            <div className="logout-modal-actions">
              <button type="button" className="logout-modal-button-secondary" onClick={() => setShowLogoutConfirm(false)}>
                Cancel
              </button>
              <button
                type="button"
                className="logout-modal-button-primary"
                onClick={() => {
                  setShowLogoutConfirm(false)
                  void supabase.auth.signOut()
                }}
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  )
}

export default DepartmentDashboardSidebar
