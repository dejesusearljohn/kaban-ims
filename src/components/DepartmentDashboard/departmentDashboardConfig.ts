export type DepartmentDashboardSectionKey = 'home' | 'scanner' | 'requests' | 'reports' | 'profile' | 'shift-turnover'

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

export const isNebruDepartment = (departmentCode: string) =>
  departmentCode.trim().toUpperCase() === 'NEBRU'

export const getDepartmentDashboardNavItems = (
  _departmentName: string,
  departmentCode = '',
): DepartmentDashboardNavItem[] => {
  const items = [...SHARED_DEPARTMENT_NAV_ITEMS]
  if (isNebruDepartment(departmentCode)) {
    items.splice(items.length - 1, 0, {
      key: 'shift-turnover',
      label: 'Shift Turnover',
      description: 'Submit and review daily inventory shift turnovers',
    })
  }
  return items
}
