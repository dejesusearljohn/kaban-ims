import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { BANICAIN_LOGO_URL } from './SignInPage'
import { supabase } from '../supabaseClient'
import '../styles/Sidebar.css'

export type SidebarSection =
  | 'dashboard'
  | 'inventory'
  | 'stockpile'
  | 'wmr'
  | 'par'
  | 'accountability'
  | 'shift-turnover-records'
  | 'vehicles'
  | 'reports'
  | 'settings'
  | 'departments-staff'

type SidebarProps = {
  activeSection: SidebarSection
  onChangeSection: (section: SidebarSection) => void
  isCollapsed: boolean
  onToggleCollapse: () => void
  displayName: string
}

function Sidebar({ activeSection, onChangeSection, isCollapsed, onToggleCollapse, displayName }: SidebarProps) {
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)

  useEffect(() => {
    document.body.classList.toggle('logout-modal-open', showLogoutConfirm)

    return () => {
      document.body.classList.remove('logout-modal-open')
    }
  }, [showLogoutConfirm])

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

      <div className="sidebar-user">{displayName}</div>

      <nav className="sidebar-nav" aria-label="Main">
        <button
          className={`sidebar-link ${activeSection === 'dashboard' ? 'sidebar-link-active' : ''}`}
          type="button"
          onClick={() => onChangeSection('dashboard')}
        >
          <span className="sidebar-link-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <rect x="4" y="4" width="16" height="16" rx="3" ry="3" fill="none" stroke="currentColor" strokeWidth="1.8" />
              <path d="M4 12h16M12 4v16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </span>
          <span className="sidebar-link-text">Dashboard</span>
        </button>
        <button
          className={`sidebar-link ${activeSection === 'inventory' ? 'sidebar-link-active' : ''}`}
          type="button"
          onClick={() => onChangeSection('inventory')}
        >
          <span className="sidebar-link-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <rect x="5" y="7" width="14" height="11" rx="2" ry="2" fill="none" stroke="currentColor" strokeWidth="1.8" />
              <path d="M5 10h14" fill="none" stroke="currentColor" strokeWidth="1.6" />
              <path d="M9 4h6l1 3H8z" fill="none" stroke="currentColor" strokeWidth="1.6" />
            </svg>
          </span>
          <span className="sidebar-link-text">Inventory</span>
        </button>
        <button
          className={`sidebar-link ${activeSection === 'stockpile' ? 'sidebar-link-active' : ''}`}
          type="button"
          onClick={() => onChangeSection('stockpile')}
        >
          <span className="sidebar-link-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <rect x="3" y="5" width="18" height="14" rx="2" ry="2" fill="none" stroke="currentColor" strokeWidth="1.8" />
              <path d="M3 9h18M7 5v14M17 5v14" fill="none" stroke="currentColor" strokeWidth="1.6" />
            </svg>
          </span>
          <span className="sidebar-link-text">Stockpile</span>
        </button>
        <button
          className={`sidebar-link ${activeSection === 'wmr' ? 'sidebar-link-active' : ''}`}
          type="button"
          onClick={() => onChangeSection('wmr')}
        >
          <span className="sidebar-link-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path d="M12 4L3 19h18L12 4z" fill="none" stroke="currentColor" strokeWidth="1.8" />
              <path d="M12 9v5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              <circle cx="12" cy="16" r="0.9" fill="currentColor" />
            </svg>
          </span>
          <span className="sidebar-link-text">Waste Materials Report</span>
        </button>
        <button
          className={`sidebar-link ${activeSection === 'par' ? 'sidebar-link-active' : ''}`}
          type="button"
          onClick={() => onChangeSection('par')}
        >
          <span className="sidebar-link-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <rect x="7" y="3" width="10" height="18" rx="2" ry="2" fill="none" stroke="currentColor" strokeWidth="1.8" />
              <path d="M9 7h6M9 11h6M9 15h4" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
          </span>
          <span className="sidebar-link-text">PAR</span>
        </button>
        <button
          className={`sidebar-link ${activeSection === 'accountability' ? 'sidebar-link-active' : ''}`}
          type="button"
          onClick={() => onChangeSection('accountability')}
        >
          <span className="sidebar-link-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path d="M7 4h10a2 2 0 012 2v12a2 2 0 01-2 2H7a2 2 0 01-2-2V6a2 2 0 012-2z" fill="none" stroke="currentColor" strokeWidth="1.8" />
              <path d="M9 8h6M9 12h6M9 16h4" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
          </span>
          <span className="sidebar-link-text">Accountability Reports</span>
        </button>
        <button
          className={`sidebar-link ${activeSection === 'shift-turnover-records' ? 'sidebar-link-active' : ''}`}
          type="button"
          onClick={() => onChangeSection('shift-turnover-records')}
        >
          <span className="sidebar-link-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path d="M17 1l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M3 11V9a4 4 0 014-4h14" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M7 23l-4-4 4-4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M21 13v2a4 4 0 01-4 4H3" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <span className="sidebar-link-text">Shift Turnover Records</span>
        </button>
        <button
          className={`sidebar-link ${activeSection === 'vehicles' ? 'sidebar-link-active' : ''}`}
          type="button"
          onClick={() => onChangeSection('vehicles')}
        >
          <span className="sidebar-link-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <rect x="3" y="9" width="18" height="7" rx="2" ry="2" fill="none" stroke="currentColor" strokeWidth="1.8" />
              <path d="M6 9l1.5-3h9L18 9" fill="none" stroke="currentColor" strokeWidth="1.6" />
              <circle cx="8" cy="17" r="1.3" fill="currentColor" />
              <circle cx="16" cy="17" r="1.3" fill="currentColor" />
            </svg>
          </span>
          <span className="sidebar-link-text">Vehicles</span>
        </button>
        <button
          className={`sidebar-link ${activeSection === 'reports' ? 'sidebar-link-active' : ''}`}
          type="button"
          onClick={() => onChangeSection('reports')}
        >
          <span className="sidebar-link-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path d="M6 3h9l3 3v15H6z" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
              <path d="M15 3v4h4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
              <path d="M9 11h6M9 14h6M9 17h5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </span>
          <span className="sidebar-link-text">Reports</span>
        </button>
        <button
          className={`sidebar-link ${activeSection === 'departments-staff' ? 'sidebar-link-active' : ''}`}
          type="button"
          onClick={() => onChangeSection('departments-staff')}
        >
          <span className="sidebar-link-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <circle cx="9" cy="9" r="2.4" fill="none" stroke="currentColor" strokeWidth="1.6" />
              <circle cx="17" cy="10" r="2" fill="none" stroke="currentColor" strokeWidth="1.4" />
              <path d="M5.5 17.5c.6-2 1.9-3 3.5-3s2.9 1 3.5 3" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              <path d="M14.5 17.5c.4-1.4 1.4-2.2 2.5-2.2 1 0 1.9.6 2.3 1.8" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
          </span>
          <span className="sidebar-link-text">Departments &amp; Staffs</span>
        </button>
        <button
          className={`sidebar-link ${activeSection === 'settings' ? 'sidebar-link-active' : ''}`}
          type="button"
          onClick={() => onChangeSection('settings')}
        >
          <span className="sidebar-link-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" strokeWidth="1.6" />
              <path
                d="M12 4.5v2.2M12 17.3v2.2M4.5 12h2.2M17.3 12h2.2M6.7 6.7l1.6 1.6M15.7 15.7l1.6 1.6M17.3 6.7l-1.6 1.6M8.3 15.7l-1.6 1.6"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
          </span>
          <span className="sidebar-link-text">Settings</span>
        </button>
      </nav>

      <button
        className="sidebar-signout"
        type="button"
        onClick={() => setShowLogoutConfirm(true)}
      >
        <span className="sidebar-link-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M10 5H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            <path d="M14 9l3 3-3 3" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M11 12h6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </span>
        <span className="sidebar-link-text">Sign Out</span>
      </button>

      {showLogoutConfirm &&
        createPortal(
          <div className="logout-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="logout-modal-title">
            <div className="logout-modal">
              <h2 id="logout-modal-title" className="logout-modal-title">
                Sign out
              </h2>
              <p className="logout-modal-text">Are you sure you want to sign out of KABAN?</p>
              <div className="logout-modal-actions">
                <button
                  type="button"
                  className="logout-modal-button-secondary"
                  onClick={() => setShowLogoutConfirm(false)}
                >
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
          </div>,
          document.body,
        )}
    </aside>
  )
}

export default Sidebar
