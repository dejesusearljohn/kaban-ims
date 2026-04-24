export type DepartmentDashboardSectionKey = 'dashboard' | 'inventory' | 'wmr' | 'qr-scanner'

export type DepartmentDashboardNavItem = {
  key: DepartmentDashboardSectionKey
  label: string
  description: string
}

export const SHARED_DEPARTMENT_NAV_ITEMS: DepartmentDashboardNavItem[] = [
  {
    key: 'dashboard',
    label: 'Dashboard',
    description: 'Department overview and quick metrics',
  },
  {
    key: 'inventory',
    label: 'Inventory',
    description: 'Track department inventory records',
  },
  {
    key: 'wmr',
    label: 'WMR',
    description: 'View waste materials reports',
  },
  {
    key: 'qr-scanner',
    label: 'QR Scanner',
    description: 'Scan item and staff QR codes',
  },
]

export const isRescueDepartment = (departmentName: string) =>
  departmentName.trim().toLowerCase() === 'rescue department'

export const getDepartmentDashboardNavItems = (departmentName: string) => {
  if (isRescueDepartment(departmentName)) {
    return []
  }

  return SHARED_DEPARTMENT_NAV_ITEMS
}
