export type DepartmentDashboardSectionKey = 'home' | 'scanner' | 'requests' | 'reports' | 'profile'

export type DepartmentDashboardNavItem = {
  key: DepartmentDashboardSectionKey
  label: string
  description: string
}

export const SHARED_DEPARTMENT_NAV_ITEMS: DepartmentDashboardNavItem[] = [
  {
    key: 'home',
    label: 'Home',
    description: 'Department overview and quick stats',
  },
  {
    key: 'requests',
    label: 'Inventory Log',
    description: 'Department inventory and pulled-out item logs',
  },
  {
    key: 'scanner',
    label: 'Scanner',
    description: 'Scan inventory QR codes',
  },
  {
    key: 'reports',
    label: 'Reports',
    description: 'Submit and view WMR reports',
  },
  {
    key: 'profile',
    label: 'Profile',
    description: 'Your account and department info',
  },
]

export const isRescueDepartment = (departmentName: string) =>
  departmentName.trim().toLowerCase() === 'rescue department'

export const getDepartmentDashboardNavItems = (_departmentName: string): DepartmentDashboardNavItem[] =>
  SHARED_DEPARTMENT_NAV_ITEMS
