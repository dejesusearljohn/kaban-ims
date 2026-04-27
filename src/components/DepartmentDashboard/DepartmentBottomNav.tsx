import type { DepartmentDashboardSectionKey } from './departmentDashboardConfig'

interface Props {
  active: DepartmentDashboardSectionKey
  onSelect: (key: DepartmentDashboardSectionKey) => void
}

const HomeIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </svg>
)
const RequestsIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
    <rect x="9" y="3" width="6" height="4" rx="1" />
    <line x1="9" y1="12" x2="15" y2="12" />
    <line x1="9" y1="16" x2="12" y2="16" />
  </svg>
)
const ScannerIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 7V5a2 2 0 012-2h2M17 3h2a2 2 0 012 2v2M21 17v2a2 2 0 01-2 2h-2M7 21H5a2 2 0 01-2-2v-2" />
    <line x1="3" y1="12" x2="21" y2="12" />
  </svg>
)
const ReportsIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <polyline points="10 9 9 9 8 9" />
  </svg>
)
const ProfileIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
)

export default function DepartmentBottomNav({ active, onSelect }: Props) {
  return (
    <nav className="dept-bottom-nav">
      <button
        className={`dept-bottom-nav-btn${active === 'home' ? ' active' : ''}`}
        onClick={() => onSelect('home')}
        aria-label="Home"
      >
        <HomeIcon />
        <span>Home</span>
      </button>

      <button
        className={`dept-bottom-nav-btn${active === 'requests' ? ' active' : ''}`}
        onClick={() => onSelect('requests')}
        aria-label="Requests"
      >
        <RequestsIcon />
        <span>Requests</span>
      </button>

      <button
        className={`dept-bottom-nav-btn fab${active === 'scanner' ? ' active' : ''}`}
        onClick={() => onSelect('scanner')}
        aria-label="Scanner"
      >
        <div className="fab-circle">
          <ScannerIcon />
        </div>
        <span>Scan</span>
      </button>

      <button
        className={`dept-bottom-nav-btn${active === 'reports' ? ' active' : ''}`}
        onClick={() => onSelect('reports')}
        aria-label="Reports"
      >
        <ReportsIcon />
        <span>Reports</span>
      </button>

      <button
        className={`dept-bottom-nav-btn${active === 'profile' ? ' active' : ''}`}
        onClick={() => onSelect('profile')}
        aria-label="Profile"
      >
        <ProfileIcon />
        <span>Profile</span>
      </button>
    </nav>
  )
}
