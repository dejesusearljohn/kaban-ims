import { useState } from 'react'
import { BANICAIN_LOGO_URL } from './SignInPage'
import { supabase } from '../supabaseClient'
import '../styles/Sidebar.css'

export type SidebarSection = 'dashboard' | 'inventory' | 'wmr'

type SidebarProps = {
  activeSection: SidebarSection
  onChangeSection: (section: SidebarSection) => void
}

function Sidebar({ activeSection, onChangeSection }: SidebarProps) {
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-logo" aria-hidden="true">
          <img src={BANICAIN_LOGO_URL} alt="" />
        </div>
        <div className="sidebar-title">
          <h1>KABAN</h1>
          <p>Barangay Banicain Inventory</p>
        </div>
      </div>

      <div className="sidebar-user">Super Admin</div>

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
        <button className="sidebar-link" type="button">
          <span className="sidebar-link-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <rect x="7" y="3" width="10" height="18" rx="2" ry="2" fill="none" stroke="currentColor" strokeWidth="1.8" />
              <path d="M9 7h6M9 11h6M9 15h4" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
          </span>
          <span className="sidebar-link-text">PAR</span>
        </button>
        <button className="sidebar-link" type="button">
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
        <button className="sidebar-link" type="button">
          <span className="sidebar-link-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path d="M12 3l8 4.5-8 4.5L4 7.5 12 3z" fill="none" stroke="currentColor" strokeWidth="1.8" />
              <path d="M4 12l8 4.5 8-4.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
            </svg>
          </span>
          <span className="sidebar-link-text">Stockpile</span>
        </button>
        <button className="sidebar-link" type="button">
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

      {showLogoutConfirm && (
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
        </div>
      )}
    </aside>
  )
}

export default Sidebar
