import { useEffect, useMemo, useState } from 'react'
import DepartmentDashboardSidebar from './DepartmentDashboardSidebar'
import DepartmentBottomNav from './DepartmentBottomNav'
import DepartmentHomeSection from './DepartmentHomeSection'
import DepartmentScannerSection from './DepartmentScannerSection'
import DepartmentRequestsSection from './DepartmentRequestsSection'
import DepartmentReportsSection from './DepartmentReportsSection'
import DepartmentProfileSection from './DepartmentProfileSection'
import DepartmentShiftTurnoverSection from './DepartmentShiftTurnoverSection'
import {
  getDepartmentDashboardNavItems,
  type DepartmentDashboardSectionKey,
} from './departmentDashboardConfig'
import '../../styles/Sidebar.css'
import '../../styles/DashboardPage.css'
import './DepartmentDashboard.css'
import './dept-mobile.css'

type DepartmentDashboardPageProps = {
  departmentName: string
  departmentCode: string
  userId: string
  departmentId: number | null
  showReadOnlyNotice?: boolean
  isReadOnly?: boolean
}

function DepartmentDashboardPage({
  departmentName,
  departmentCode,
  userId,
  departmentId,
  showReadOnlyNotice = false,
  isReadOnly = false,
}: DepartmentDashboardPageProps) {
  const [activeSection, setActiveSection] = useState<DepartmentDashboardSectionKey>('home')
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [reportToOpenId, setReportToOpenId] = useState<number | null>(null)
  const [isReadOnlyNoticeVisible, setIsReadOnlyNoticeVisible] = useState(showReadOnlyNotice)
  const isNebruStaff = departmentCode.trim().toUpperCase() === 'NEBRU'

  useEffect(() => {
    if (!showReadOnlyNotice) {
      setIsReadOnlyNoticeVisible(false)
      return
    }

    setIsReadOnlyNoticeVisible(true)
    const timeoutId = window.setTimeout(() => {
      setIsReadOnlyNoticeVisible(false)
    }, 2800)

    return () => window.clearTimeout(timeoutId)
  }, [showReadOnlyNotice])

  const navItems = useMemo(() => getDepartmentDashboardNavItems(departmentName, departmentCode), [departmentName, departmentCode])

  const handleSignOut = () => {
    // Supabase auth state change in App.tsx will redirect to sign-in automatically
  }

  const handleOpenReport = (reportId: number) => {
    setReportToOpenId(reportId)
    setActiveSection('reports')
  }

  const renderSection = () => {
    switch (activeSection) {
      case 'home':
        return (
          <DepartmentHomeSection
            userId={userId}
            departmentName={departmentName}
            departmentId={departmentId}
            onOpenReport={handleOpenReport}
            isReadOnly={isReadOnly}
          />
        )
      case 'scanner':
        return <DepartmentScannerSection userId={userId} departmentId={departmentId} isReadOnly={isReadOnly} isActive={activeSection === 'scanner'} />
      case 'requests':
        return <DepartmentRequestsSection departmentId={departmentId} departmentName={departmentName} userId={userId} isReadOnly={isReadOnly} />
      case 'reports':
        return (
          <DepartmentReportsSection
            userId={userId}
            departmentId={departmentId}
            initialReportId={reportToOpenId}
            onInitialReportHandled={() => setReportToOpenId(null)}
            isReadOnly={isReadOnly}
          />
        )
      case 'profile':
        return <DepartmentProfileSection userId={userId} onSignOut={handleSignOut} isReadOnly={isReadOnly} />
      case 'shift-turnover':
        return <DepartmentShiftTurnoverSection userId={userId} departmentId={departmentId} isReadOnly={isReadOnly} />
      default:
        return null
    }
  }

  return (
    <div className={`dept-app-shell ${isSidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      {isReadOnlyNoticeVisible && isNebruStaff && (
        <div className="dept-readonly-toast" role="alert" aria-live="polite">
          <p className="dept-readonly-toast-eyebrow">NEBRU account locked</p>
          <h2>Read-only notice</h2>
          <p>This account can sign in normally. The notice will disappear shortly.</p>
        </div>
      )}

      {/* Desktop sidebar */}
      <DepartmentDashboardSidebar
        departmentName={departmentCode || departmentName}
        activeSection={activeSection}
        navItems={navItems}
        onSelectSection={setActiveSection}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed((prev) => !prev)}
        showHeaderProfileButton={isNebruStaff}
      />

      {/* Page content */}
      <div className="dept-page">
        {renderSection()}
      </div>

      {/* Mobile bottom nav */}
      <DepartmentBottomNav
        active={activeSection}
        onSelect={setActiveSection}
        showShiftTurnover={isNebruStaff}
        showProfile={!isNebruStaff}
      />
    </div>
  )
}

export default DepartmentDashboardPage
