import { useMemo, useState } from 'react'
import DepartmentDashboardSidebar from './DepartmentDashboardSidebar'
import {
  DepartmentDashboardOverview,
  DepartmentInventorySection,
  DepartmentQrScannerSection,
  DepartmentWmrSection,
} from './DepartmentDashboardSections'
import {
  getDepartmentDashboardNavItems,
  isRescueDepartment,
  type DepartmentDashboardSectionKey,
} from './departmentDashboardConfig'
import '../../styles/Sidebar.css'
import '../../styles/DashboardPage.css'
import './DepartmentDashboard.css'

type DepartmentDashboardPageProps = {
  departmentName: string
}

function DepartmentDashboardPage({ departmentName }: DepartmentDashboardPageProps) {
  const [activeSection, setActiveSection] = useState<DepartmentDashboardSectionKey>('dashboard')
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)

  const navItems = useMemo(() => getDepartmentDashboardNavItems(departmentName), [departmentName])

  if (isRescueDepartment(departmentName)) {
    return (
      <main className="dashboard-page department-dashboard-page">
        <section className="department-dashboard-rescue-note panel panel-wide">
          <h2>Rescue Department</h2>
          <p>
            This department uses a separate dashboard layout. The shared dashboard shell is stored
            here for all other departments.
          </p>
        </section>
      </main>
    )
  }

  return (
    <div className={`dashboard-page department-dashboard-page ${isSidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      <DepartmentDashboardSidebar
        departmentName={departmentName}
        activeSection={activeSection}
        navItems={navItems}
        onSelectSection={setActiveSection}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed((prev) => !prev)}
      />

      <main className="dashboard-main department-dashboard-main">
        {activeSection === 'dashboard' && (
          <DepartmentDashboardOverview departmentName={departmentName} onSelectSection={setActiveSection} />
        )}
        {activeSection === 'inventory' && <DepartmentInventorySection />}
        {activeSection === 'wmr' && <DepartmentWmrSection />}
        {activeSection === 'qr-scanner' && <DepartmentQrScannerSection />}
      </main>
    </div>
  )
}

export default DepartmentDashboardPage
