import { useMemo, useState } from 'react'
import DepartmentDashboardSidebar from './DepartmentDashboardSidebar'
import DepartmentBottomNav from './DepartmentBottomNav'
import DepartmentHomeSection from './DepartmentHomeSection'
import DepartmentScannerSection from './DepartmentScannerSection'
import DepartmentRequestsSection from './DepartmentRequestsSection'
import DepartmentReportsSection from './DepartmentReportsSection'
import DepartmentProfileSection from './DepartmentProfileSection'
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
}

function DepartmentDashboardPage({ departmentName, departmentCode, userId, departmentId }: DepartmentDashboardPageProps) {
  const [activeSection, setActiveSection] = useState<DepartmentDashboardSectionKey>('home')
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [reportToOpenId, setReportToOpenId] = useState<number | null>(null)

  const navItems = useMemo(() => getDepartmentDashboardNavItems(departmentName), [departmentName])

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
          />
        )
      case 'scanner':
        return <DepartmentScannerSection userId={userId} departmentId={departmentId} />
      case 'requests':
        return <DepartmentRequestsSection departmentId={departmentId} departmentName={departmentName} userId={userId} />
      case 'reports':
        return (
          <DepartmentReportsSection
            userId={userId}
            departmentId={departmentId}
            initialReportId={reportToOpenId}
            onInitialReportHandled={() => setReportToOpenId(null)}
          />
        )
      case 'profile':
        return <DepartmentProfileSection userId={userId} onSignOut={handleSignOut} />
      default:
        return null
    }
  }

  return (
    <div className={`dept-app-shell ${isSidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      {/* Desktop sidebar */}
      <DepartmentDashboardSidebar
        departmentName={departmentCode || departmentName}
        activeSection={activeSection}
        navItems={navItems}
        onSelectSection={setActiveSection}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed((prev) => !prev)}
      />

      {/* Page content */}
      <div className="dept-page">
        {renderSection()}
      </div>

      {/* Mobile bottom nav */}
      <DepartmentBottomNav active={activeSection} onSelect={setActiveSection} />
    </div>
  )
}

export default DepartmentDashboardPage
