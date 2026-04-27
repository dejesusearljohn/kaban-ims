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
}

function DepartmentDashboardSidebar({
  departmentName,
  activeSection,
  navItems,
  onSelectSection,
  isCollapsed,
  onToggleCollapse,
}: DepartmentDashboardSidebarProps) {
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)

  useEffect(() => {
    document.body.classList.toggle('logout-modal-open', showLogoutConfirm)

    return () => {
      document.body.classList.remove('logout-modal-open')
    }
  }, [showLogoutConfirm])

  const getNavIcon = (key: DepartmentDashboardSectionKey) => {
    switch (key) {
      case 'dashboard':
        return (
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <rect x="4" y="4" width="16" height="16" rx="3" ry="3" fill="none" stroke="currentColor" strokeWidth="1.8" />
            <path d="M4 12h16M12 4v16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        )
      case 'inventory':
        return (
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <rect x="5" y="7" width="14" height="11" rx="2" ry="2" fill="none" stroke="currentColor" strokeWidth="1.8" />
            <path d="M5 10h14" fill="none" stroke="currentColor" strokeWidth="1.6" />
            <path d="M9 4h6l1 3H8z" fill="none" stroke="currentColor" strokeWidth="1.6" />
          </svg>
        )
      case 'wmr':
        return (
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M12 4L3 19h18L12 4z" fill="none" stroke="currentColor" strokeWidth="1.8" />
            <path d="M12 9v5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            <circle cx="12" cy="16" r="0.9" fill="currentColor" />
          </svg>
        )
      case 'qr-scanner':
        return (
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <rect x="4" y="4" width="5" height="5" fill="none" stroke="currentColor" strokeWidth="1.7" />
            <rect x="15" y="4" width="5" height="5" fill="none" stroke="currentColor" strokeWidth="1.7" />
            <rect x="4" y="15" width="5" height="5" fill="none" stroke="currentColor" strokeWidth="1.7" />
            <path d="M14 14h2v2h-2zM18 14h2v2h-2zM16 18h2v2h-2z" fill="currentColor" />
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
