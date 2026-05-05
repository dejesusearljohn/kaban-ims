import { useEffect, useRef, useState } from 'react'
import { QRCodeCanvas } from 'qrcode.react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { createTransientSupabaseClient, supabase } from '../supabaseClient'
import type { Tables } from '../../supabase'
import Sidebar from './Sidebar'
import InventorySection from './InventorySection'
import StockpileSection from './StockpileSection'
import WmrSection from './WmrSection'
import VehiclesSection from './VehiclesSection'
import ParSection, { type ParDraftItem } from './ParSection'
import AccountabilityReportsSection from './AccountabilityReportsSection'
import ShiftTurnoverRecordsSection from './ShiftTurnoverRecordsSection'
import ReportsSection, { type ReportPeriod } from './ReportsSection'
import type { SidebarSection } from './Sidebar'
import '../styles/DashboardPage.css'
import '../styles/Inventory.css'
import '../styles/Wmr.css'
import '../styles/Par.css'
import '../styles/Dashboard.css'
import '../styles/Reports.css'
import { downloadCsv, parseCsvFile } from '../utils/csv'

type SummaryMetrics = {
  totalItems: number
  serviceable: number
  unserviceable: number
  expired: number
}

type DepartmentOverview = {
  id: number
  name: string
  code: string
  totalItems: number
  serviceable: number
  unserviceable: number
  staffCount: number
  onlineCount: number
}

type InventoryRow = Tables<'inventory'>
type InventoryPhotoRow = Tables<'inventory_photos'>
type StockpileRow = Tables<'stockpile'> & { status?: string | null }
type DistributionLogRow = Tables<'distribution_logs'>
type WmrReportRow = Tables<'wmr_reports'>
type ParRecordRow = Tables<'par_records'>
type VehicleRow = Tables<'vehicles'> & {
  vehicle_name?: string | null
  color?: string | null
}
type VehicleRepairRow = Tables<'vehicle_repairs'>
type UserRow = Tables<'users'>

type StockpileReleaseLog = {
  log: DistributionLogRow
  itemName: string
  unit: string
  quantity: number
}

type StockpileReleaseDraftItem = {
  stockpileId: string
  quantity: string
}

type ArchiveModalConfig = {
  kind: 'inventory' | 'department' | 'staff' | 'vehicle' | 'wmr' | 'par'
  title: string
  text: string
  subtext: string
  onConfirm: () => Promise<void> | void
}

const STAFF_PAGE_SIZE = 5
const DEPARTMENT_PAGE_SIZE = 10
const DASHBOARD_DRILLDOWN_PAGE_SIZE = 10

const getVisiblePageNumbers = (currentPage: number, totalPages: number, maxVisiblePages = 5) => {
  if (totalPages <= maxVisiblePages) {
    return Array.from({ length: totalPages }, (_, index) => index + 1)
  }

  const halfWindow = Math.floor(maxVisiblePages / 2)
  let start = Math.max(1, currentPage - halfWindow)
  let end = Math.min(totalPages, start + maxVisiblePages - 1)

  if (end - start + 1 < maxVisiblePages) {
    start = Math.max(1, end - maxVisiblePages + 1)
  }

  return Array.from({ length: end - start + 1 }, (_, index) => start + index)
}

const mapInventoryItemToStockpileRow = (item: InventoryRow): StockpileRow => ({
  stockpile_id: item.item_id,
  item_name: item.item_name,
  category: item.acquisition_mode,
  quantity_on_hand: item.quantity,
  unit_of_measure: item.unit_of_measure,
  packed_date: item.date_acquired,
  expiration_date: item.expiration_date,
  archived_at: null,
  is_archived: false,
  status: item.status,
  uid: item.uid,
})

const useAutoDismissMessage = (
  message: string | null,
  clearMessage: () => void,
  delay = 5000,
) => {
  useEffect(() => {
    if (!message) return

    const timeoutId = window.setTimeout(() => {
      clearMessage()
    }, delay)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [message, clearMessage, delay])
}

const DEFAULT_ITEM_TYPES = [
  'Office Equipment',
  'Water Equipment',
  'Fire Equipment',
  'Medical Equipment',
  'Electrical Equipment',
  'Power Tools',
  'Hand Tools',
  'Furniture',
  'Vehicle',
  'Stockpile',
  'Gadgets',
  'Medicine',
  'Perishables',
]

const isLoanableParItem = (item: InventoryRow) => {
  const normalizedType = item.item_type.trim().toLowerCase()
  const isEquipment = normalizedType.includes('equipment') && normalizedType !== 'office equipment'

  return (
    isEquipment ||
    normalizedType === 'hand tools' ||
    normalizedType === 'power tools' ||
    normalizedType === 'gadgets'
  )
}

const DEFAULT_UNITS_OF_MEASURE = [
  'Piece(s)',
  'Set',
  'Box',
  'Pair',
  'Pack',
  'Sack',
  'Roll',
  'Bottle',
  'Liter',
  'Gallon',
  'Kilogram',
  'Gram',
  'Meter',
]

const INVENTORY_IMPORT_DEFAULT_HEADERS = [
  'item_name',
  'item_type',
  'department_id',
  'department_name',
  'department_code',
  'quantity',
  'unit_of_measure',
  'unit_cost',
  'date_acquired',
  'expiration_date',
  'acquisition_mode',
  'status',
  'condition',
  'donor_identification',
]

const INVENTORY_PHOTO_BUCKET = 'inventory-photos'
const TYPE_CHART_COLORS = ['#059669', '#0284c7', '#d97706', '#7c3aed', '#e11d48']
const STOCKPILE_STATUS_COLORS: Record<string, string> = {
  Available: '#16a34a',
  'Low Stock': '#f59e0b',
  'Out of Stock': '#dc2626',
  Expired: '#6b7280',
}

const DEFAULT_STAFF_INITIAL_PASSWORD = '123456'

const parseFullName = (fullName: string) => {
  const normalizedName = fullName.trim().replace(/\s+/g, ' ')

  if (!normalizedName) {
    return { firstName: '', lastName: '' }
  }

  const nameParts = normalizedName.split(' ')

  if (nameParts.length === 1) {
    return { firstName: nameParts[0], lastName: '' }
  }

  if (nameParts.length === 2) {
    return { firstName: nameParts[0], lastName: nameParts[1] }
  }

  const lowerParts = nameParts.map((part) => part.toLowerCase())
  const twoWordSurnamePrefixes = new Set(['de', 'del', 'dela', 'de la', 'de los', 'de las', 'da', 'dos', 'das'])
  const penultimate = lowerParts[lowerParts.length - 2]
  const antepenultimate = lowerParts[lowerParts.length - 3]

  if (antepenultimate === 'de' && (penultimate === 'la' || penultimate === 'los' || penultimate === 'las')) {
    return {
      firstName: nameParts.slice(0, -3).join(' '),
      lastName: nameParts.slice(-3).join(' '),
    }
  }

  if (twoWordSurnamePrefixes.has(penultimate)) {
    return {
      firstName: nameParts.slice(0, -2).join(' '),
      lastName: nameParts.slice(-2).join(' '),
    }
  }

  return {
    firstName: nameParts.slice(0, -1).join(' '),
    lastName: nameParts.slice(-1).join(' '),
  }
}

function DashboardPage() {
  // [STATE] Navigation and dashboard overview
  const [activeSection, setActiveSection] = useState<SidebarSection>('dashboard')
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [inventoryMode, setInventoryMode] = useState<'list' | 'add'>('list')
  const [summary, setSummary] = useState<SummaryMetrics>({
    totalItems: 0,
    serviceable: 0,
    unserviceable: 0,
    expired: 0,
  })
  const [departments, setDepartments] = useState<DepartmentOverview[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [realtimeTick, setRealtimeTick] = useState(0)
  const [newDepartmentName, setNewDepartmentName] = useState('')
  const [newDepartmentCode, setNewDepartmentCode] = useState('')
  const [addingDepartment, setAddingDepartment] = useState(false)
  const [departmentFormMode, setDepartmentFormMode] = useState<'add' | 'edit'>('add')
  const [departmentFormTargetId, setDepartmentFormTargetId] = useState<number | null>(null)
  const [departmentUpdatingId, setDepartmentUpdatingId] = useState<number | null>(null)
  const [departmentError, setDepartmentError] = useState<string | null>(null)
  const [departmentSuccess, setDepartmentSuccess] = useState<string | null>(null)
  const [currentAdminName, setCurrentAdminName] = useState('Super Admin')
  const [currentAdminPosition, setCurrentAdminPosition] = useState('')
  const [currentAdminFirstName, setCurrentAdminFirstName] = useState('')
  const [currentAdminLastName, setCurrentAdminLastName] = useState('')
  const [currentUserRole, setCurrentUserRole] = useState('')
  const [settingsProfileLoading, setSettingsProfileLoading] = useState(false)
  const [settingsUserId, setSettingsUserId] = useState<string | null>(null)
  const [settingsStaffId, setSettingsStaffId] = useState('')
  const [settingsNameInput, setSettingsNameInput] = useState('')
  const [settingsFirstNameInput, setSettingsFirstNameInput] = useState('')
  const [settingsLastNameInput, setSettingsLastNameInput] = useState('')
  const [settingsPositionInput, setSettingsPositionInput] = useState('')
  const [settingsNameSaving, setSettingsNameSaving] = useState(false)
  const [settingsPasswordInput, setSettingsPasswordInput] = useState('')
  const [settingsConfirmPasswordInput, setSettingsConfirmPasswordInput] = useState('')
  const [settingsPasswordSaving, setSettingsPasswordSaving] = useState(false)
  const [settingsTab, setSettingsTab] = useState<'profile' | 'archive'>('profile')
  const [archiveTableSelector, setArchiveTableSelector] = useState<
    'inventory' | 'wmr' | 'par' | 'vehicles' | 'staff' | 'departments'
  >('inventory')
  const [settingsSuccessMessage, setSettingsSuccessMessage] = useState<string | null>(null)
  const [settingsErrorMessage, setSettingsErrorMessage] = useState<string | null>(null)
  const [staffDepartmentFilter, setStaffDepartmentFilter] = useState('all')
  const [staffPage, setStaffPage] = useState(1)
  const [departmentPage, setDepartmentPage] = useState(1)
  const [departmentStaffMode, setDepartmentStaffMode] = useState<
    'add-staff' | 'add-department' | 'manage-staff' | 'manage-department'
  >('manage-staff')
  const [staffFormMode, setStaffFormMode] = useState<'add' | 'edit'>('add')
  const [staffFormTargetId, setStaffFormTargetId] = useState<string | null>(null)
  const [staffFormDepartmentId, setStaffFormDepartmentId] = useState('')
  const [staffFormLastName, setStaffFormLastName] = useState('')
  const [staffFormFirstName, setStaffFormFirstName] = useState('')
  const [staffFormStaffId, setStaffFormStaffId] = useState('')
  const [staffFormPosition, setStaffFormPosition] = useState('')
  const [staffFormRole, setStaffFormRole] = useState('Staff')
  const [staffFormContact, setStaffFormContact] = useState('')
  const [staffFormEmergencyContact, setStaffFormEmergencyContact] = useState('')
  const [staffFormRecoveryEmail, setStaffFormRecoveryEmail] = useState('')
  const [staffSaving, setStaffSaving] = useState(false)
  const [staffUpdatingId, setStaffUpdatingId] = useState<string | null>(null)
  const [staffError, setStaffError] = useState<string | null>(null)
  const [staffSuccess, setStaffSuccess] = useState<string | null>(null)
  const [viewStaffQrItem, setViewStaffQrItem] = useState<UserRow | null>(null)

  const normalizeStaffRole = (role: string | null | undefined) => {
    const trimmedRole = role?.trim() || 'Staff'
    const normalizedRole = trimmedRole.toLowerCase()

    if (normalizedRole === 'staff') {
      return 'Staff'
    }

    if (normalizedRole === 'admin') {
      return 'Admin'
    }

    if (normalizedRole === 'super admin') {
      return 'Super Admin'
    }

    return trimmedRole
  }

  const mapStaffRoleToOption = (role: string | null | undefined) => {
    const normalizedRole = normalizeStaffRole(role)
    if (normalizedRole === 'Super Admin') return 'Super Admin'
    if (normalizedRole === 'Admin') return 'Admin'
    return 'Staff'
  }

  const isSuperAdminRole = (role: string | null | undefined) =>
    normalizeStaffRole(role) === 'Super Admin'

  const isCurrentUserAdmin = normalizeStaffRole(currentUserRole) === 'Admin'
  const isCurrentUserSuperAdmin = normalizeStaffRole(currentUserRole) === 'Super Admin'
  const canEditUser = (user: UserRow) => !(isCurrentUserAdmin && isSuperAdminRole(user.role))

  useAutoDismissMessage(error, () => setError(null))
  useAutoDismissMessage(departmentError, () => setDepartmentError(null))
  useAutoDismissMessage(departmentSuccess, () => setDepartmentSuccess(null))
  useAutoDismissMessage(settingsErrorMessage, () => setSettingsErrorMessage(null))
  useAutoDismissMessage(settingsSuccessMessage, () => setSettingsSuccessMessage(null))
  useAutoDismissMessage(staffError, () => setStaffError(null))
  useAutoDismissMessage(staffSuccess, () => setStaffSuccess(null))

  const buildStaffEmail = (staffId: string) => {
    const normalizedStaffId = staffId.trim().toLowerCase().replace(/\s+/g, '')
    return normalizedStaffId ? `${normalizedStaffId}@kaban.com` : ''
  }

  const buildStaffQrCode = (staffId: string) => {
    const normalizedStaffId = staffId.trim().toLowerCase().replace(/\s+/g, '')
    return normalizedStaffId ? `staff-${normalizedStaffId}` : ''
  }

  const buildStaffId = (departmentId: number, existingStaff: UserRow[]) => {
    const departmentCode = (departments.find((dept) => dept.id === departmentId)?.code ?? '')
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')

    if (!departmentCode) return ''

    const matchingSuffixes = existingStaff
      .map((user) => user.staff_id.trim().toUpperCase())
      .filter((staffId) => staffId.startsWith(departmentCode))
      .map((staffId) => staffId.slice(departmentCode.length))
      .map((suffix) => Number.parseInt(suffix, 10))
      .filter((value) => Number.isFinite(value))

    const nextNumber = matchingSuffixes.length > 0 ? Math.max(...matchingSuffixes) + 1 : 1
    return `${departmentCode}${String(nextNumber).padStart(3, '0')}`
  }

  const DEPT_CODE_SKIP_WORDS = new Set(['AND', 'OF', 'THE', 'FOR', 'IN', 'AT', 'BY', 'TO', 'A', 'AN'])
  const buildDepartmentCode = (departmentName: string) =>
    departmentName
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9 ]/g, '')
      .split(/\s+/)
      .filter((part) => part.length > 0 && !DEPT_CODE_SKIP_WORDS.has(part))
      .map((part) => part[0])
      .join('')
      .slice(0, 8)

  // [STATE] Inventory section
  const [inventoryItems, setInventoryItems] = useState<InventoryRow[]>([])
  const [inventoryLoading, setInventoryLoading] = useState(false)
  const [inventoryError, setInventoryError] = useState<string | null>(null)
  const [newItemName, setNewItemName] = useState('')
  const [newItemType, setNewItemType] = useState('')
  const [newCondition, setNewCondition] = useState('')
  const [newDonorIdentification, setNewDonorIdentification] = useState('')
  const [newItemDepartmentId, setNewItemDepartmentId] = useState('')
  const [newQuantity, setNewQuantity] = useState('')
  const [newUnitOfMeasure, setNewUnitOfMeasure] = useState('')
  const [newUnitCost, setNewUnitCost] = useState('')
  const [newDateAcquired, setNewDateAcquired] = useState('')
  const [newExpirationDate, setNewExpirationDate] = useState('')
  const [newSource, setNewSource] = useState('')
  const [newPhotoFiles, setNewPhotoFiles] = useState<File[]>([])
  const [addingItem, setAddingItem] = useState(false)
  const [inventoryImportRows, setInventoryImportRows] = useState<Array<Record<string, string>>>([])
  const [inventoryImportHeaders, setInventoryImportHeaders] = useState<string[]>([])
  const [inventoryImportSaving, setInventoryImportSaving] = useState(false)
  const [inventoryImportError, setInventoryImportError] = useState<string | null>(null)
  const addPhotoInputRef = useRef<HTMLInputElement | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [wmrSearchQuery, setWmrSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [departmentFilter, setDepartmentFilter] = useState('all')
  const [sourceFilter, setSourceFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [wmrTypeFilter, setWmrTypeFilter] = useState('all')
  const [wmrDepartmentFilter, setWmrDepartmentFilter] = useState('all')
  const [wmrStatusFilter, setWmrStatusFilter] = useState('all')
  const [dashboardMetricDrilldown, setDashboardMetricDrilldown] = useState<
    'total' | 'serviceable' | 'unserviceable' | 'purchased' | 'donated' | 'low' | 'fullStock' | 'expired' | null
  >(null)
  const [dashboardDrilldownPage, setDashboardDrilldownPage] = useState(1)
  const dashboardDrilldownModalRef = useRef<HTMLDivElement | null>(null)
  const [editingItem, setEditingItem] = useState<InventoryRow | null>(null)
  const [editItemName, setEditItemName] = useState('')
  const [editItemType, setEditItemType] = useState('')
  const [editDepartmentId, setEditDepartmentId] = useState('')
  const [editQuantity, setEditQuantity] = useState('')
  const [editUnitOfMeasure, setEditUnitOfMeasure] = useState('')
  const [editUnitCost, setEditUnitCost] = useState('')
  const [editDateAcquired, setEditDateAcquired] = useState('')
  const [editExpirationDate, setEditExpirationDate] = useState('')
  const [editSource, setEditSource] = useState('')
  const [editStatus, setEditStatus] = useState('')
  const [editCondition, setEditCondition] = useState('')
  const [editDonorIdentification, setEditDonorIdentification] = useState('')
  const [editSaving, setEditSaving] = useState(false)
  const [editDeleting, setEditDeleting] = useState(false)
  const [archiveModalConfig, setArchiveModalConfig] = useState<ArchiveModalConfig | null>(null)
  const [viewImageItem, setViewImageItem] = useState<InventoryRow | null>(null)
  const [viewImageIndex, setViewImageIndex] = useState(0)
  const [viewQrItem, setViewQrItem] = useState<InventoryRow | null>(null)
  const [qrGeneratingId, setQrGeneratingId] = useState<number | null>(null)
  const [inventoryPhotos, setInventoryPhotos] = useState<InventoryPhotoRow[]>([])

  // [STATE] WMR section
  const [wmrReports, setWmrReports] = useState<WmrReportRow[]>([])
  const [wmrLoading, setWmrLoading] = useState(false)
  const [wmrError, setWmrError] = useState<string | null>(null)
  const [activeWmrItem, setActiveWmrItem] = useState<InventoryRow | null>(null)
  const [activeWmrReport, setActiveWmrReport] = useState<WmrReportRow | null>(null)
  const [activeWmrVehicleLabel, setActiveWmrVehicleLabel] = useState<string | null>(null)
  const [wmrRemarksInput, setWmrRemarksInput] = useState('')
  const [wmrStatusInput, setWmrStatusInput] = useState('Pending')
  const [isEditingWmrRemarks, setIsEditingWmrRemarks] = useState(false)
  const [wmrSaving, setWmrSaving] = useState(false)

  // [STATE] PAR section
  const [parRecords, setParRecords] = useState<ParRecordRow[]>([])
  const [parUsers, setParUsers] = useState<UserRow[]>([])
  const [parLoading, setParLoading] = useState(false)
  const [parSaving, setParSaving] = useState(false)
  const [parError, setParError] = useState<string | null>(null)
  const [parSearchQuery, setParSearchQuery] = useState('')
  const [parMode, setParMode] = useState<'manage' | 'add'>('manage')
  const [parItemId, setParItemId] = useState('')
  const [parIssuedToId, setParIssuedToId] = useState('')
  const [parQuantityIssued, setParQuantityIssued] = useState('1')
  const [parIssueDate, setParIssueDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [parUnitInput, setParUnitInput] = useState('')
  const [parDescriptionInput, setParDescriptionInput] = useState('')
  const [parPropertyNoInput, setParPropertyNoInput] = useState('')
  const [parDateAcquiredInput, setParDateAcquiredInput] = useState('')
  const [parCostInput, setParCostInput] = useState('')
  const [activeParStaffId, setActiveParStaffId] = useState<string | null>(null)
  const [selectedParReportStaffId, setSelectedParReportStaffId] = useState('')
  const [selectedReportPeriod, setSelectedReportPeriod] = useState<ReportPeriod>('monthly')
  const [reportStartDate, setReportStartDate] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  })
  const [reportEndDate, setReportEndDate] = useState(() => new Date().toISOString().slice(0, 10))

  // [STATE] Vehicles section
  const [activeVehicleLogsId, setActiveVehicleLogsId] = useState<number | null>(null)
  const [vehicleMode, setVehicleMode] = useState<'manage' | 'add-vehicle' | 'add-repair'>('manage')
  const [vehicles, setVehicles] = useState<VehicleRow[]>([])
  const [vehicleRepairs, setVehicleRepairs] = useState<VehicleRepairRow[]>([])
  const [vehicleLoading, setVehicleLoading] = useState(false)
  const [vehicleSaving, setVehicleSaving] = useState(false)
  const [vehicleError, setVehicleError] = useState<string | null>(null)
  const [newVehicleName, setNewVehicleName] = useState('')
  const [newVehicleMakeModel, setNewVehicleMakeModel] = useState('')
  const [newVehicleColor, setNewVehicleColor] = useState('')
  const [newVehicleYearModel, setNewVehicleYearModel] = useState('')
  const [newVehicleCrNumber, setNewVehicleCrNumber] = useState('')
  const [newVehicleEngineNumber, setNewVehicleEngineNumber] = useState('')
  const [newVehicleServiceable, setNewVehicleServiceable] = useState('true')
  const [newVehicleRepairHistory, setNewVehicleRepairHistory] = useState('')
  const [editingVehicle, setEditingVehicle] = useState<VehicleRow | null>(null)
  const [editVehicleServiceable, setEditVehicleServiceable] = useState('true')
  const [editVehicleRemarks, setEditVehicleRemarks] = useState('')
  const [editVehicleName, setEditVehicleName] = useState('')
  const [editVehicleColor, setEditVehicleColor] = useState('')
  const [isEditingVehicleDetails, setIsEditingVehicleDetails] = useState(false)
  const [editVehicleSaving, setEditVehicleSaving] = useState(false)
  const [newRepairVehicleId, setNewRepairVehicleId] = useState('')
  const [newRepairAdminId, setNewRepairAdminId] = useState('')
  const [newRepairAmount, setNewRepairAmount] = useState('')
  const [newRepairDate, setNewRepairDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [newRepairJobOrder, setNewRepairJobOrder] = useState('')
  const [newRepairServiceCenter, setNewRepairServiceCenter] = useState('')
  const [newRepairDescription, setNewRepairDescription] = useState('')

  // [STATE] Stockpile section
  const [stockpileItems, setStockpileItems] = useState<StockpileRow[]>([])
  const [stockpileLoading, setStockpileLoading] = useState(false)
  const [stockpileError, setStockpileError] = useState<string | null>(null)
  const [stockpileMode, setStockpileMode] = useState<'list' | 'logs' | 'expired' | 'release'>('list')
  const [stockpileReleaseLogs, setStockpileReleaseLogs] = useState<DistributionLogRow[]>([])
  const [stockpileReleaseLoading, setStockpileReleaseLoading] = useState(false)
  const [stockpileReleaseItems, setStockpileReleaseItems] = useState<StockpileReleaseDraftItem[]>([
    { stockpileId: '', quantity: '' },
  ])
  const [stockpileReleaseIssuedToInput, setStockpileReleaseIssuedToInput] = useState('')
  const [stockpileReleaseReasonInput, setStockpileReleaseReasonInput] = useState('')
  const [releasingStockpile, setReleasingStockpile] = useState(false)

  useAutoDismissMessage(inventoryError, () => setInventoryError(null))
  useAutoDismissMessage(wmrError, () => setWmrError(null))
  useAutoDismissMessage(parError, () => setParError(null))
  useAutoDismissMessage(vehicleError, () => setVehicleError(null))
  useAutoDismissMessage(stockpileError, () => setStockpileError(null))

  const resetDepartmentForm = () => {
    setDepartmentFormMode('add')
    setDepartmentFormTargetId(null)
    setNewDepartmentName('')
    setNewDepartmentCode('')
  }

  const startEditDepartment = (department: DepartmentOverview) => {
    setDepartmentFormMode('edit')
    setDepartmentFormTargetId(department.id)
    setNewDepartmentName(department.name)
    setNewDepartmentCode(department.code)
    setDepartmentError(null)
    setDepartmentSuccess(null)
  }

  const handleSaveDepartment = async () => {
    const trimmedName = newDepartmentName.trim()
    const trimmedCodeInput = newDepartmentCode.trim().toUpperCase().replace(/[^A-Z0-9]/g, '')
    const deptCode = trimmedCodeInput || buildDepartmentCode(trimmedName)

    if (!trimmedName) {
      setDepartmentError('Department name is required.')
      return
    }

    if (!deptCode) {
      setDepartmentError('Department code could not be generated. Please enter a code manually.')
      return
    }

    setAddingDepartment(true)
    setDepartmentError(null)
    setDepartmentSuccess(null)

    if (departmentFormMode === 'edit' && departmentFormTargetId != null) {
      setDepartmentUpdatingId(departmentFormTargetId)

      const { data, error: updateError } = await supabase
        .from('departments')
        .update({
          dept_name: trimmedName,
          dept_code: deptCode,
        })
        .eq('id', departmentFormTargetId)
        .select('id, dept_name, dept_code')
        .single()

      if (updateError) {
        setDepartmentError(updateError.message)
        setDepartmentUpdatingId(null)
        setAddingDepartment(false)
        return
      }

      if (data) {
        setDepartments((prev) =>
          prev
            .map((dept) =>
              dept.id === data.id
                ? {
                    ...dept,
                    name: data.dept_name,
                    code: data.dept_code,
                  }
                : dept,
            )
            .sort((a, b) => b.id - a.id),
        )
      }

      setDepartmentSuccess('Department updated successfully.')
      resetDepartmentForm()
      setDepartmentUpdatingId(null)
      setAddingDepartment(false)
      return
    }

    const { data, error: insertError } = await supabase
      .from('departments')
      .insert([
        {
          dept_name: trimmedName,
          dept_code: deptCode,
        },
      ])
      .select('id, dept_name, dept_code')
      .single()

    if (insertError) {
      setDepartmentError(insertError.message)
      setAddingDepartment(false)
      return
    }

    if (data) {
      setDepartments((prev) =>
        [...prev, { id: data.id, name: data.dept_name, code: data.dept_code, totalItems: 0, serviceable: 0, unserviceable: 0, staffCount: 0, onlineCount: 0 }].sort((a, b) => b.id - a.id),
      )
    }

    resetDepartmentForm()
    setDepartmentSuccess('Department added successfully.')
    setAddingDepartment(false)
  }

  const handleArchiveDepartment = async (department: DepartmentOverview) => {
    setDepartmentUpdatingId(department.id)
    setDepartmentError(null)
    setDepartmentSuccess(null)

    const { error: archiveError } = await supabase
      .from('departments')
      .update({ is_archived: true, archived_at: new Date().toISOString() } as never)
      .eq('id', department.id)

    if (archiveError) {
      setDepartmentError(archiveError.message)
      setDepartmentUpdatingId(null)
      return
    }

    setDepartments((prev) => prev.filter((dept) => dept.id !== department.id))

    if (staffDepartmentFilter === String(department.id)) {
      setStaffDepartmentFilter('all')
    }

    if (departmentFormTargetId === department.id) {
      resetDepartmentForm()
    }

    setDepartmentSuccess('Department archived successfully.')
    setDepartmentUpdatingId(null)
    setArchiveModalConfig(null)
  }

  // [EFFECTS] Initial data loading
  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true)
      setError(null)

      try {
        const [totalRes, serviceableRes, unserviceableRes, expiredRes] = await Promise.all([
          supabase.from('inventory').select('*', { count: 'exact', head: true }),
          supabase
            .from('inventory')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'Serviceable')
            .neq('item_type', 'Stockpile'),
          supabase
            .from('inventory')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'Unserviceable')
            .neq('item_type', 'Stockpile'),
          supabase.from('inventory').select('*', { count: 'exact', head: true }).eq('status', 'Expired'),
        ])

        if (totalRes.error || serviceableRes.error || unserviceableRes.error || expiredRes.error) {
          throw totalRes.error || serviceableRes.error || unserviceableRes.error || expiredRes.error
        }

        setSummary({
          totalItems: totalRes.count ?? 0,
          serviceable: serviceableRes.count ?? 0,
          unserviceable: unserviceableRes.count ?? 0,
          expired: expiredRes.count ?? 0,
        })

        const { data: deptRows, error: deptError } = await supabase
          .from('departments')
          .select('id, dept_name, dept_code')
          .order('id', { ascending: false })

        if (deptError) throw deptError

        const deptMetrics: DepartmentOverview[] = []

        for (const dept of deptRows ?? []) {
          const [invTotalRes, invServRes, invUnservRes, staffTotalRes, staffOnlineRes] = await Promise.all([
            supabase
              .from('inventory')
              .select('*', { count: 'exact', head: true })
              .eq('department_id', dept.id),
            supabase
              .from('inventory')
              .select('*', { count: 'exact', head: true })
              .eq('department_id', dept.id)
              .eq('status', 'Serviceable')
              .neq('item_type', 'Stockpile'),
            supabase
              .from('inventory')
              .select('*', { count: 'exact', head: true })
              .eq('department_id', dept.id)
              .eq('status', 'Unserviceable')
              .neq('item_type', 'Stockpile'),
            supabase
              .from('users')
              .select('*', { count: 'exact', head: true })
              .eq('department_id', dept.id),
            supabase
              .from('users')
              .select('*', { count: 'exact', head: true })
              .eq('department_id', dept.id)
              .eq('is_online', true),
          ])

          if (
            invTotalRes.error ||
            invServRes.error ||
            invUnservRes.error ||
            staffTotalRes.error ||
            staffOnlineRes.error
          ) {
            throw (
              invTotalRes.error ||
              invServRes.error ||
              invUnservRes.error ||
              staffTotalRes.error ||
              staffOnlineRes.error
            )
          }

          deptMetrics.push({
            id: dept.id,
            name: dept.dept_name,
            code: dept.dept_code,
            totalItems: invTotalRes.count ?? 0,
            serviceable: invServRes.count ?? 0,
            unserviceable: invUnservRes.count ?? 0,
            staffCount: staffTotalRes.count ?? 0,
            onlineCount: staffOnlineRes.count ?? 0,
          })
        }

        setDepartments(deptMetrics)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load dashboard data.'
        setError(message)
      } finally {
        setLoading(false)
      }
    }

    void fetchDashboardData()
  }, [realtimeTick])

  useEffect(() => {
    const fetchInventory = async () => {
      setInventoryLoading(true)
      setInventoryError(null)

      const { data, error: invError } = await supabase.from('inventory').select('*').order('item_id', {
        ascending: false,
      })

      if (invError) {
        setInventoryError(invError.message)
      } else {
        setInventoryItems(data ?? [])
      }

      setInventoryLoading(false)
    }

    void fetchInventory()
  }, [realtimeTick])

  useEffect(() => {
    const fetchWmrReports = async () => {
      setWmrLoading(true)
      setWmrError(null)

      const { data, error: wmrFetchError } = await supabase
        .from('wmr_reports')
        .select('*')
        .order('report_id', { ascending: true })

      if (wmrFetchError) {
        setWmrError(wmrFetchError.message)
      } else {
        setWmrReports(data ?? [])
      }

      setWmrLoading(false)
    }

    void fetchWmrReports()
  }, [realtimeTick])

  useEffect(() => {
    const fetchInventoryPhotos = async () => {
      const { data, error: photosError } = await supabase
        .from('inventory_photos')
        .select('*')
        .order('photo_id', { ascending: true })

      if (photosError) {
        setInventoryError((prev) => prev ?? photosError.message)
      } else {
        setInventoryPhotos(data ?? [])
      }
    }

    void fetchInventoryPhotos()
  }, [realtimeTick])

  useEffect(() => {
    if (viewImageItem) {
      setViewImageIndex(0)
    }
  }, [viewImageItem])

  // [EFFECTS] Form synchronization
  useEffect(() => {
    const fetchParRecords = async () => {
      setParLoading(true)
      setParError(null)

      const { data, error: parFetchError } = await supabase
        .from('par_records')
        .select('*')
        .order('par_id', { ascending: false })

      if (parFetchError) {
        setParError(parFetchError.message)
      } else {
        setParRecords(data ?? [])
      }

      setParLoading(false)
    }

    void fetchParRecords()
  }, [realtimeTick])

  useEffect(() => {
    const fetchParUsers = async () => {
      const { data, error: parUsersError } = await supabase
        .from('users')
        .select('*')
        .neq('role', 'Super Admin')
        .order('full_name', { ascending: true })

      if (parUsersError) {
        setParError((prev) => prev ?? parUsersError.message)
      } else {
        setParUsers(data ?? [])
      }
    }

    void fetchParUsers()
  }, [realtimeTick])

  useEffect(() => {
    const fetchSettingsProfile = async () => {
      setSettingsProfileLoading(true)
      setSettingsErrorMessage(null)

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser()

      if (authError) {
        setSettingsErrorMessage(authError.message)
        setSettingsProfileLoading(false)
        return
      }

      if (!user) {
        setSettingsErrorMessage('No active user session found.')
        setSettingsProfileLoading(false)
        return
      }

      setSettingsUserId(user.id)

      const { data: userRow, error: userRowError } = await supabase
        .from('users')
        .select('id, full_name, email, staff_id, position, role')
        .eq('id', user.id)
        .maybeSingle()

      if (userRowError) {
        setSettingsErrorMessage(userRowError.message)
      } else {
        setSettingsNameInput(userRow?.full_name ?? '')
        const rawFullName = userRow?.full_name ?? ''
        const parsedName = parseFullName(rawFullName)
        setSettingsFirstNameInput(parsedName.firstName)
        setSettingsLastNameInput(parsedName.lastName)
        setSettingsStaffId(userRow?.staff_id ?? '')
        setSettingsPositionInput(userRow?.position ?? '')
        setCurrentAdminPosition(userRow?.position ?? '')
        setCurrentAdminName(userRow?.full_name?.trim() || 'Admin')
        setCurrentAdminFirstName(parsedName.firstName)
        setCurrentAdminLastName(parsedName.lastName)
        setCurrentUserRole(userRow?.role ?? '')
      }

      setSettingsProfileLoading(false)
    }

    void fetchSettingsProfile()
  }, [])

  useEffect(() => {
    const fetchVehiclesData = async () => {
      setVehicleLoading(true)
      setVehicleError(null)

      const [{ data: vehicleRows, error: vehiclesFetchError }, { data: repairRows, error: repairsFetchError }] =
        await Promise.all([
          supabase.from('vehicles').select('*').order('id', { ascending: false }),
          supabase.from('vehicle_repairs').select('*').order('repair_id', { ascending: false }),
        ])

      if (vehiclesFetchError || repairsFetchError) {
        setVehicleError(vehiclesFetchError?.message || repairsFetchError?.message || 'Failed to load vehicles.')
      } else {
        setVehicles(vehicleRows ?? [])
        setVehicleRepairs(repairRows ?? [])
      }

      setVehicleLoading(false)
    }

    void fetchVehiclesData()
  }, [realtimeTick])

  useEffect(() => {
    const fetchStockpiles = async () => {
      setStockpileLoading(true)
      setStockpileError(null)

      const { data, error: stockpileFetchError } = await supabase
        .from('inventory')
        .select('*')
        .eq('item_type', 'Stockpile')
        .order('item_id', { ascending: false })

      if (stockpileFetchError) {
        setStockpileError(stockpileFetchError.message)
      } else {
        setStockpileItems((data ?? []).map(mapInventoryItemToStockpileRow))
      }

      setStockpileLoading(false)
    }

    void fetchStockpiles()
  }, [realtimeTick])

  useEffect(() => {
    const fetchStockpileReleaseLogs = async () => {
      setStockpileReleaseLoading(true)

      const { data, error: logsFetchError } = await supabase
        .from('distribution_logs')
        .select('*')
        .order('log_id', { ascending: false })

      if (logsFetchError) {
        setStockpileError((prev) => prev ?? logsFetchError.message)
      } else {
        setStockpileReleaseLogs(data ?? [])
      }

      setStockpileReleaseLoading(false)
    }

    void fetchStockpileReleaseLogs()
  }, [realtimeTick])

  useEffect(() => {
    if (!parItemId) {
      setParUnitInput('')
      setParDescriptionInput('')
      setParPropertyNoInput('')
      setParDateAcquiredInput('')
      setParCostInput('')
      return
    }

    const selectedItem = inventoryItems.find((item) => item.item_id === Number(parItemId))

    if (!selectedItem) return

    setParUnitInput(selectedItem.unit_of_measure ?? '')
    setParDescriptionInput(selectedItem.item_name ?? '')
    setParPropertyNoInput(
      selectedItem.property_no ?? `ITEM-${selectedItem.item_id.toString().padStart(3, '0')}`,
    )
    setParDateAcquiredInput(selectedItem.date_acquired ?? '')
    setParCostInput(selectedItem.unit_cost != null ? String(selectedItem.unit_cost) : '')
  }, [parItemId, inventoryItems])

  // [EFFECTS] Realtime background refresh
  useEffect(() => {
    const channel = supabase
      .channel('realtime-dashboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory' }, () =>
        setRealtimeTick((t) => t + 1),
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'wmr_reports' }, () =>
        setRealtimeTick((t) => t + 1),
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vehicles' }, () =>
        setRealtimeTick((t) => t + 1),
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vehicle_repairs' }, () =>
        setRealtimeTick((t) => t + 1),
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'par_records' }, () =>
        setRealtimeTick((t) => t + 1),
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, () =>
        setRealtimeTick((t) => t + 1),
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'distribution_logs' }, () =>
        setRealtimeTick((t) => t + 1),
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory_photos' }, () =>
        setRealtimeTick((t) => t + 1),
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [])

  // [HELPERS] Formatting and utility functions
  const formatValue = (value: number) => (loading ? '—' : value.toString())
  const formatCurrency = (value: number | null) =>
    value == null
      ? '—'
      : new Intl.NumberFormat('en-PH', {
          style: 'currency',
          currency: 'PHP',
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }).format(value)
  const formatDisplayDate = (value: string | null | undefined) => {
    if (!value) return '—'

    const trimmed = value.trim()
    const dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed)

    const parsedDate = dateOnlyMatch
      ? new Date(Number(dateOnlyMatch[1]), Number(dateOnlyMatch[2]) - 1, Number(dateOnlyMatch[3]))
      : new Date(trimmed)

    if (Number.isNaN(parsedDate.getTime())) {
      return value
    }

    return parsedDate.toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
    })
  }
  const formatInventoryDate = (value: string | null | undefined) => {
    if (!value) return '—'

    const trimmed = value.trim()
    const dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed)

    const parsedDate = dateOnlyMatch
      ? new Date(Number(dateOnlyMatch[1]), Number(dateOnlyMatch[2]) - 1, Number(dateOnlyMatch[3]))
      : new Date(trimmed)

    if (Number.isNaN(parsedDate.getTime())) {
      return value
    }

    const year = parsedDate.getFullYear()
    const month = String(parsedDate.getMonth() + 1).padStart(2, '0')
    const day = String(parsedDate.getDate()).padStart(2, '0')

    return `${year}/${month}/${day}`
  }
  const parseNumericInput = (value: string) => {
    const parsed = value.trim() ? Number(value) : null
    return parsed != null && Number.isFinite(parsed) ? parsed : null
  }
  const parseIntegerInput = (value: string | null | undefined) => {
    if (!value) return null
    const parsed = Number.parseInt(value.trim(), 10)
    return Number.isFinite(parsed) ? parsed : null
  }
  const parseBooleanInput = (value: string | null | undefined, fallback = true) => {
    if (!value) return fallback
    const normalized = value.trim().toLowerCase()
    if (['true', '1', 'yes', 'y', 'serviceable'].includes(normalized)) return true
    if (['false', '0', 'no', 'n', 'unserviceable', 'needs repair'].includes(normalized)) return false
    return fallback
  }
  const parseDateLikeValue = (value: string | null | undefined) => {
    if (!value) return null

    const trimmed = value.trim()
    const dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed)

    const parsedDate = dateOnlyMatch
      ? new Date(Number(dateOnlyMatch[1]), Number(dateOnlyMatch[2]) - 1, Number(dateOnlyMatch[3]))
      : new Date(trimmed)

    return Number.isNaN(parsedDate.getTime()) ? null : parsedDate
  }
  const getInventoryStatus = (item: InventoryRow) => {
    const explicitStatus = item.status?.trim() || null
    if (explicitStatus === 'Archived') return 'Archived'

    if (item.item_type.trim().toLowerCase() === 'stockpile') {
      const expirationDate = parseDateLikeValue(item.expiration_date)
      const quantityValue = Number(item.quantity ?? 0)
      const now = new Date()
      now.setHours(0, 0, 0, 0)

      if (expirationDate) {
        expirationDate.setHours(0, 0, 0, 0)
        if (expirationDate < now) return 'Expired'
      }

      return Number.isFinite(quantityValue) && quantityValue <= 10 ? 'Low' : 'Full Stock'
    }

    if (explicitStatus) return explicitStatus

    const quantityValue = item.quantity
    if (quantityValue == null || Number.isNaN(Number(quantityValue))) return null

    return Number(quantityValue) <= 10 ? 'Low' : 'Full Stock'
  }
  const isArchivedRow = (row: unknown) => {
    if (!row || typeof row !== 'object') return false

    const statusValue = (row as { status?: string | null }).status
    if ((statusValue ?? '').trim() === 'Archived') return true

    return (row as { is_archived?: boolean | null }).is_archived === true
  }
  const getReportPeriodBounds = (period: ReportPeriod) => {
    const now = new Date()
    const start = new Date(now)
    const end = new Date(now)

    if (period === 'weekly') {
      start.setDate(now.getDate() - 6)
      start.setHours(0, 0, 0, 0)
      end.setHours(23, 59, 59, 999)
      return { start, end }
    }

    if (period === 'monthly') {
      start.setDate(1)
      start.setHours(0, 0, 0, 0)
      end.setMonth(now.getMonth() + 1, 0)
      end.setHours(23, 59, 59, 999)
      return { start, end }
    }

    start.setMonth(0, 1)
    start.setHours(0, 0, 0, 0)
    end.setMonth(11, 31)
    end.setHours(23, 59, 59, 999)
    return { start, end }
  }
  const getReportPeriodLabel = (period: ReportPeriod) => {
    if (period === 'weekly') return 'Weekly'
    if (period === 'monthly') return 'Monthly'
    return 'Yearly'
  }
  const formatDateForInput = (date: Date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }
  const formatDateForReportHeader = (date: Date) =>
    date.toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
    })
  const getReportDateRangeLabel = (startDate: string, endDate: string) => {
    const start = parseDateLikeValue(startDate)
    const end = parseDateLikeValue(endDate)

    if (!start || !end) return 'N/A'
    return `${formatDateForReportHeader(start)} to ${formatDateForReportHeader(end)}`
  }
  const isDateWithinReportRange = (
    value: string | null | undefined,
    startDate: string,
    endDate: string,
  ) => {
    const dateValue = parseDateLikeValue(value)
    const start = parseDateLikeValue(startDate)
    const end = parseDateLikeValue(endDate)

    if (!dateValue || !start || !end) return false

    start.setHours(0, 0, 0, 0)
    end.setHours(23, 59, 59, 999)

    return dateValue >= start && dateValue <= end
  }
  const calculateTotalCost = (quantity: number | null, unitCost: number | null) =>
    quantity != null && unitCost != null ? quantity * unitCost : null

  const getVehicleDisplayLabel = (vehicle: VehicleRow) => {
    const vehicleName = vehicle.vehicle_name?.trim()
    if (vehicleName) return vehicleName

    const makeModel = vehicle.make_model?.trim()
    if (makeModel) return makeModel

    return `VEH-${vehicle.id.toString().padStart(3, '0')}`
  }

  const openVehicleEditModal = (vehicle: VehicleRow) => {
    setEditingVehicle(vehicle)
    setEditVehicleServiceable(String(vehicle.is_serviceable ?? true))
    setEditVehicleRemarks(getVehicleStatusRemark(vehicle.repair_history_log))
    setEditVehicleName(vehicle.vehicle_name ?? '')
    setEditVehicleColor(vehicle.color ?? '')
    setIsEditingVehicleDetails(false)
  }

  const closeVehicleEditModal = () => {
    if (editVehicleSaving) return
    setEditingVehicle(null)
    setEditVehicleServiceable('true')
    setEditVehicleRemarks('')
    setEditVehicleName('')
    setEditVehicleColor('')
    setIsEditingVehicleDetails(false)
  }

  const getRepairDescription = (repairId: number, historyLog: string | null) => {
    if (!historyLog) return '—'

    const repairCode = `VR-${repairId.toString().padStart(3, '0')}:`
    const historyLine = historyLog
      .split('\n')
      .find((line) => line.trim().startsWith(repairCode))

    if (!historyLine) return '—'

    return historyLine.trim().slice(repairCode.length).trim() || '—'
  }

  const getVehicleStatusRemark = (historyLog: string | null) => {
    if (!historyLog) return ''

    const statusNote = historyLog
      .split('\n')
      .find((line) => line.trim().startsWith('STATUS NOTE:'))

    return statusNote ? statusNote.trim().slice('STATUS NOTE:'.length).trim() : ''
  }

  const stripVehicleStatusRemark = (historyLog: string | null) => {
    if (!historyLog) return ''

    return historyLog
      .split('\n')
      .filter((line) => !line.trim().startsWith('STATUS NOTE:'))
      .join('\n')
      .trim()
  }

  const getItemPhotoUrls = (item: InventoryRow) => {
    const urls = inventoryPhotos
      .filter((photo) => photo.item_id === item.item_id)
      .map((photo) => photo.photo_url)
      .filter((url): url is string => !!url)

    if (urls.length > 0) return urls

    return item.photo_path ? [item.photo_path] : []
  }

  useEffect(() => {
    const { start, end } = getReportPeriodBounds(selectedReportPeriod)
    setReportStartDate(formatDateForInput(start))
    setReportEndDate(formatDateForInput(end))
  }, [selectedReportPeriod])

  // [DERIVED] Search, filters, and computed view data
  const normalizedSearch = searchQuery.trim().toLowerCase()
  const normalizedWmrSearch = wmrSearchQuery.trim().toLowerCase()
  const normalizedParSearch = parSearchQuery.trim().toLowerCase()

  const typeOptions = Array.from(
    new Map(
      [...DEFAULT_ITEM_TYPES, ...inventoryItems.map((item) => item.item_type)]
        .map((type) => type.trim())
        .filter((type) => type.length > 0)
        .map((type) => [type.toLowerCase(), type] as const),
    ).values(),
  ).sort((a, b) => a.localeCompare(b))
  const loanableParItems = inventoryItems.filter(isLoanableParItem)
  const unitOfMeasureOptions = Array.from(
    new Map(
      [
        ...DEFAULT_UNITS_OF_MEASURE,
        ...inventoryItems.map((item) => item.unit_of_measure ?? ''),
        ...parRecords.map((record) => record.unit_snapshot ?? ''),
      ]
        .map((unit) => unit.trim())
        .filter((unit) => unit.length > 0)
        .map((unit) => [unit.toLowerCase(), unit] as const),
    ).values(),
  ).sort((a, b) => a.localeCompare(b))
  const dynamicStatusOptions = Array.from(
    new Set(
      inventoryItems
        .map((item) => getInventoryStatus(item))
        .filter((s): s is string => !!s)
        .filter((status) => status.trim() !== 'Archived'),
    ),
  )
  const statusOptions = Array.from(
    new Set<string>([
      'Serviceable',
      'Unserviceable',
      'Valid',
      'Expired',
      'Low',
      'Full Stock',
      ...dynamicStatusOptions,
    ]),
  ).sort()
  const editableStatusOptions = statusOptions.filter(
    (statusOption) => !['Valid', 'Full Stock', 'Low'].includes(statusOption),
  )
  const acquisitionModeOptions = Array.from(
    new Set(['Purchased', 'Donated', ...inventoryItems.map((item) => item.acquisition_mode).filter((m): m is string => !!m)]),
  ).sort()

  const wasteInventoryItems = inventoryItems.filter((item) => {
    const s = getInventoryStatus(item)
    return s === 'Unserviceable' || s === 'For Repair' || s === 'For Disposal' || s === 'Disposed'
  })
  // Filter reports that have an item_id (these are inventory-based WMR from staff): includes both reported items and items explicitly updated to waste status
  const staffWmrReports = wmrReports.filter((report) => {
    if (report.item_id == null) return false
    if (isArchivedRow(report)) return false
    return true
  })
  const vehicleWmrReports = wmrReports.filter((report) => report.item_id == null && !isArchivedRow(report))

  const filteredWasteItems = wasteInventoryItems.filter((item) => {
    const reportId = `WMR-${item.item_id.toString().padStart(3, '0')}`

    if (normalizedWmrSearch) {
      const matchesSearch =
        reportId.toLowerCase().includes(normalizedWmrSearch) ||
        item.item_name.toLowerCase().includes(normalizedWmrSearch) ||
        item.item_type.toLowerCase().includes(normalizedWmrSearch)

      if (!matchesSearch) return false
    }

    if (wmrTypeFilter !== 'all' && item.item_type !== wmrTypeFilter) {
      return false
    }

    if (
      wmrDepartmentFilter !== 'all' &&
      (item.department_id === null || String(item.department_id) !== wmrDepartmentFilter)
    ) {
      return false
    }

    if (wmrStatusFilter !== 'all') {
      const report = wmrReports.find((r) => r.item_id === item.item_id) || null
      const status = report?.status?.trim() || null

      if (status !== wmrStatusFilter) {
        return false
      }
    }

    return true
  })

  const filteredVehicleWmrReports = vehicleWmrReports.filter((report) => {
    const reportId = `WMR-${report.report_id.toString().padStart(3, '0')}`
    const reportType = 'Vehicle'
    const locationValue = report.location?.trim() || ''
    const reasonValue = report.reason_damage?.trim() || ''

    if (normalizedWmrSearch) {
      const matchesSearch =
        reportId.toLowerCase().includes(normalizedWmrSearch) ||
        reportType.toLowerCase().includes(normalizedWmrSearch) ||
        locationValue.toLowerCase().includes(normalizedWmrSearch) ||
        reasonValue.toLowerCase().includes(normalizedWmrSearch)

      if (!matchesSearch) return false
    }

    if (wmrTypeFilter !== 'all' && reportType !== wmrTypeFilter) {
      return false
    }

    if (wmrDepartmentFilter !== 'all') {
      const selectedDeptName = departments.find((dept) => String(dept.id) === wmrDepartmentFilter)?.name ?? ''
      if (!selectedDeptName || locationValue !== selectedDeptName) {
        return false
      }
    }

    if (wmrStatusFilter !== 'all') {
      const status = report.status?.trim() || null
      if (status !== wmrStatusFilter) {
        return false
      }
    }

    return true
  })

  const filteredStaffWmrReports = staffWmrReports.filter(
    (report) => !wasteInventoryItems.some((item) => item.item_id === report.item_id),
  )

  const combinedFilteredWmrCount =
    filteredWasteItems.length + filteredStaffWmrReports.length + filteredVehicleWmrReports.length
  const activeVehicles = vehicles.filter((vehicle) => !isArchivedRow(vehicle))

  const filteredInventoryItems = inventoryItems.filter((item) => {
    if (getInventoryStatus(item) === 'Archived') {
      return false
    }

    const paddedId = `ITEM-${item.item_id.toString().padStart(3, '0')}`
    const matchesSearch =
      !normalizedSearch ||
      paddedId.toLowerCase().includes(normalizedSearch) ||
      item.item_name.toLowerCase().includes(normalizedSearch)

    const matchesType = typeFilter === 'all' || item.item_type === typeFilter

    const matchesDepartment =
      departmentFilter === 'all' || (item.department_id !== null && String(item.department_id) === departmentFilter)

    const matchesSource =
      sourceFilter === 'all' || (item.acquisition_mode ?? '').trim() === sourceFilter

    const derivedStatus = getInventoryStatus(item)
    const matchesStatus = statusFilter === 'all' || derivedStatus === statusFilter

    return matchesSearch && matchesType && matchesDepartment && matchesSource && matchesStatus
  }).sort((a, b) => b.item_id - a.item_id)

  const archivedInventoryItems = inventoryItems.filter((item) => getInventoryStatus(item) === 'Archived')
  const archivedWmrReports = wmrReports
    .filter((report) => isArchivedRow(report) || (report.status ?? '').trim() === 'Archived')
    .slice()
    .sort((a, b) => b.report_id - a.report_id)
  const archivedParRecords = parRecords
    .filter((record) => isArchivedRow(record))
    .slice()
    .sort((a, b) => b.par_id - a.par_id)
  const archivedVehicles = vehicles
    .filter((vehicle) => isArchivedRow(vehicle))
    .slice()
    .sort((a, b) => b.id - a.id)
  const visibleDepartments = departments.filter((department) => department.name !== 'Stockpile Room')
  const archivedStaff = parUsers
    .filter((user) => isArchivedRow(user))
    .filter((user) => (user.role ?? '').trim().toLowerCase() !== 'super admin')
    .slice()
    .sort((a, b) => {
      const aTime = a.created_at ? new Date(a.created_at).getTime() : 0
      const bTime = b.created_at ? new Date(b.created_at).getTime() : 0
      const safeATime = Number.isNaN(aTime) ? 0 : aTime
      const safeBTime = Number.isNaN(bTime) ? 0 : bTime
      return safeBTime - safeATime
    })
  const archivedDepartments = visibleDepartments
    .filter((department) => {
      const departmentRow = (department as unknown as { is_archived?: boolean | null })
      return departmentRow.is_archived === true
    })
    .slice()
    .sort((a, b) => b.id - a.id)
  const showArchiveTable = (tableKey: 'inventory' | 'wmr' | 'par' | 'vehicles' | 'staff' | 'departments') =>
    archiveTableSelector === tableKey
  const filteredDepartmentStaff = parUsers
    .filter((user) => !isArchivedRow(user))
    .filter((user) => (user.role ?? '').trim().toLowerCase() !== 'super admin')
    .filter((user) => {
      if (staffDepartmentFilter === 'all') return true
      return user.department_id != null && String(user.department_id) === staffDepartmentFilter
    })
    .sort((a, b) => {
      const aTime = a.created_at ? new Date(a.created_at).getTime() : 0
      const bTime = b.created_at ? new Date(b.created_at).getTime() : 0
      const safeATime = Number.isNaN(aTime) ? 0 : aTime
      const safeBTime = Number.isNaN(bTime) ? 0 : bTime
      return safeBTime - safeATime
    })
  const staffTotalPages = Math.max(1, Math.ceil(filteredDepartmentStaff.length / STAFF_PAGE_SIZE))
  const paginatedDepartmentStaff = filteredDepartmentStaff.slice(
    (staffPage - 1) * STAFF_PAGE_SIZE,
    (staffPage - 1) * STAFF_PAGE_SIZE + STAFF_PAGE_SIZE,
  )
  const visibleStaffPageNumbers = getVisiblePageNumbers(staffPage, staffTotalPages)

  const departmentTotalPages = Math.max(1, Math.ceil(visibleDepartments.length / DEPARTMENT_PAGE_SIZE))
  const paginatedDepartments = visibleDepartments.slice(
    (departmentPage - 1) * DEPARTMENT_PAGE_SIZE,
    (departmentPage - 1) * DEPARTMENT_PAGE_SIZE + DEPARTMENT_PAGE_SIZE,
  )
  const visibleDepartmentPageNumbers = getVisiblePageNumbers(departmentPage, departmentTotalPages)

  const departmentStaffCountMap = parUsers
    .filter((user) => !isArchivedRow(user))
    .filter((user) => (user.role ?? '').trim().toLowerCase() !== 'super admin')
    .reduce((acc, user) => {
      if (user.department_id == null) return acc
      acc.set(user.department_id, (acc.get(user.department_id) ?? 0) + 1)
      return acc
    }, new Map<number, number>())

  const today = new Date()

  useEffect(() => {
    if (departmentStaffMode !== 'manage-staff') {
      return
    }

    setStaffPage(1)
  }, [departmentStaffMode, staffDepartmentFilter])

  useEffect(() => {
    if (staffPage > staffTotalPages) {
      setStaffPage(staffTotalPages)
    }
  }, [staffPage, staffTotalPages])

  useEffect(() => {
    if (departmentStaffMode !== 'manage-department') {
      return
    }

    setDepartmentPage(1)
  }, [departmentStaffMode])

  useEffect(() => {
    if (departmentPage > departmentTotalPages) {
      setDepartmentPage(departmentTotalPages)
    }
  }, [departmentPage, departmentTotalPages])

  useEffect(() => {
    setDashboardDrilldownPage(1)
  }, [dashboardMetricDrilldown])

  const stockpileStatusCountMap = stockpileItems.reduce((acc, item) => {
    const quantity = Number(item.quantity_on_hand ?? 0)
    const expiration = item.expiration_date ? new Date(item.expiration_date) : null
    const isExpired = expiration != null && !Number.isNaN(expiration.getTime()) && expiration < today

    let status = 'Available'

    if (quantity <= 0) {
      status = 'Out of Stock'
    } else if (isExpired) {
      status = 'Expired'
    } else if (quantity <= 10) {
      status = 'Low Stock'
    }

    acc.set(status, (acc.get(status) ?? 0) + 1)
    return acc
  }, new Map<string, number>())

  const stockpileStatusChartData = ['Available', 'Low Stock', 'Out of Stock', 'Expired']
    .map((status) => ({
      name: status,
      count: stockpileStatusCountMap.get(status) ?? 0,
    }))
    .filter((entry) => entry.count > 0)

  // Reflect both inventory-expired and stockpile-expired totals on the dashboard metric.
  const dashboardExpiredCount = summary.expired + (stockpileStatusCountMap.get('Expired') ?? 0)

  const purchasedCount = inventoryItems.filter(
    (item) => (item.acquisition_mode ?? '').trim().toLowerCase() === 'purchased',
  ).length
  const donatedCount = inventoryItems.filter((item) => (item.acquisition_mode ?? '').trim().toLowerCase() === 'donated').length
  const lowStockCount = inventoryItems.filter((item) => getInventoryStatus(item) === 'Low').length
  const fullStockCount = inventoryItems.filter((item) => getInventoryStatus(item) === 'Full Stock').length
  const dashboardMetricLabelMap = {
    total: 'Total Items',
    serviceable: 'Serviceable',
    unserviceable: 'Unserviceable',
    purchased: 'Purchased',
    donated: 'Donated',
    low: 'Low Stock',
    fullStock: 'Full Stock',
    expired: 'Expired Items',
  } as const

  const dashboardDrilldownItems = dashboardMetricDrilldown
    ? inventoryItems.filter((item) => {
        const status = getInventoryStatus(item)
        const source = (item.acquisition_mode ?? '').trim().toLowerCase()

        if (status === 'Archived') return false

        if (dashboardMetricDrilldown === 'total') return true
        if (dashboardMetricDrilldown === 'serviceable') return status === 'Serviceable'
        if (dashboardMetricDrilldown === 'unserviceable') return status === 'Unserviceable'
        if (dashboardMetricDrilldown === 'purchased') return source === 'purchased'
        if (dashboardMetricDrilldown === 'donated') return source === 'donated'
        if (dashboardMetricDrilldown === 'low') return status === 'Low'
        if (dashboardMetricDrilldown === 'fullStock') return status === 'Full Stock'
        if (dashboardMetricDrilldown === 'expired') return status === 'Expired'

        return false
      })
    : []
  const dashboardDrilldownTotalPages = Math.max(
    1,
    Math.ceil(dashboardDrilldownItems.length / DASHBOARD_DRILLDOWN_PAGE_SIZE),
  )
  const dashboardDrilldownPaginatedItems = dashboardDrilldownItems.slice(
    (dashboardDrilldownPage - 1) * DASHBOARD_DRILLDOWN_PAGE_SIZE,
    (dashboardDrilldownPage - 1) * DASHBOARD_DRILLDOWN_PAGE_SIZE + DASHBOARD_DRILLDOWN_PAGE_SIZE,
  )
  const dashboardDrilldownVisiblePageNumbers = getVisiblePageNumbers(
    dashboardDrilldownPage,
    dashboardDrilldownTotalPages,
  )

  useEffect(() => {
    if (!dashboardMetricDrilldown) return

    const frameId = window.requestAnimationFrame(() => {
      dashboardDrilldownModalRef.current?.focus()
    })

    return () => {
      window.cancelAnimationFrame(frameId)
    }
  }, [dashboardMetricDrilldown])

  useEffect(() => {
    if (!dashboardMetricDrilldown) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        setDashboardMetricDrilldown(null)
        return
      }

      if (event.key === 'ArrowLeft') {
        event.preventDefault()
        setDashboardDrilldownPage((prev) => Math.max(1, prev - 1))
        return
      }

      if (event.key === 'ArrowRight') {
        event.preventDefault()
        setDashboardDrilldownPage((prev) => Math.min(dashboardDrilldownTotalPages, prev + 1))
      }
    }

    window.addEventListener('keydown', onKeyDown)

    return () => {
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [dashboardMetricDrilldown, dashboardDrilldownTotalPages])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return

      if (inventoryImportRows.length > 0) {
        event.preventDefault()
        if (!inventoryImportSaving) {
          closeInventoryImportModal()
        }
        return
      }

      if (activeWmrItem || activeWmrReport) {
        event.preventDefault()
        if (!wmrSaving) {
          setActiveWmrItem(null)
          setActiveWmrReport(null)
          setActiveWmrVehicleLabel(null)
          setWmrRemarksInput('')
          setWmrStatusInput('Pending')
          setIsEditingWmrRemarks(false)
          setWmrSaving(false)
        }
        return
      }

      if (viewQrItem) {
        event.preventDefault()
        setViewQrItem(null)
        return
      }

      if (viewStaffQrItem) {
        event.preventDefault()
        setViewStaffQrItem(null)
        return
      }

      if (viewImageItem) {
        event.preventDefault()
        setViewImageItem(null)
        return
      }

      if (archiveModalConfig) {
        event.preventDefault()
        setArchiveModalConfig(null)
        return
      }

      if (dashboardMetricDrilldown) {
        event.preventDefault()
        setDashboardMetricDrilldown(null)
        return
      }

      if (editingItem && !editSaving && !editDeleting) {
        event.preventDefault()
        setEditingItem(null)
        return
      }

      if (editingVehicle) {
        event.preventDefault()
        closeVehicleEditModal()
        return
      }

      if (activeVehicleLogsId != null) {
        event.preventDefault()
        setActiveVehicleLogsId(null)
        return
      }

      if (activeParStaffId) {
        event.preventDefault()
        setActiveParStaffId(null)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [
    activeParStaffId,
    activeVehicleLogsId,
    editingVehicle,
    editingItem,
    editSaving,
    editDeleting,
    dashboardMetricDrilldown,
    archiveModalConfig,
    viewImageItem,
    viewStaffQrItem,
    viewQrItem,
    activeWmrItem,
    activeWmrReport,
    wmrSaving,
    inventoryImportRows.length,
    inventoryImportSaving,
  ])

  useEffect(() => {
    if (dashboardDrilldownPage > dashboardDrilldownTotalPages) {
      setDashboardDrilldownPage(dashboardDrilldownTotalPages)
    }
  }, [dashboardDrilldownPage, dashboardDrilldownTotalPages])

  const itemTypeCountMap = inventoryItems.reduce((acc, item) => {
    const type = item.item_type.trim()
    if (!type) return acc
    acc.set(type, (acc.get(type) ?? 0) + 1)
    return acc
  }, new Map<string, number>())

  const itemsByTypeTopFive = Array.from(itemTypeCountMap.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5)

  const groupedParByStaff = parRecords
    .filter((record) => !isArchivedRow(record))
    .reduce(
    (acc, record) => {
      if (!record.issued_to_id) return acc

      const existing = acc.get(record.issued_to_id)
      if (existing) {
        existing.push(record)
      } else {
        acc.set(record.issued_to_id, [record])
      }

      return acc
    },
      new Map<string, ParRecordRow[]>(),
    )

  const filteredParSummaries = Array.from(groupedParByStaff.entries())
    .map(([staffId, records]) => {
      const receiver = parUsers.find((user) => user.id === staffId) ?? null
      const latestIssueDate = records
        .map((record) => record.issue_date)
        .filter((value): value is string => !!value)
        .sort((a, b) => b.localeCompare(a))[0] ?? null

      const totalQuantity = records.reduce((sum, record) => sum + (record.quantity_issued ?? 0), 0)

      return {
        staffId,
        records,
        receiver,
        latestIssueDate,
        totalQuantity,
      }
    })
    .filter((summary) => {
      if (!normalizedParSearch) return true

      const parNo = summary.receiver?.staff_id
        ? `PAR-${summary.receiver.staff_id}`
        : `PAR-${summary.staffId.slice(0, 8)}`

      const matchesSummary =
        parNo.toLowerCase().includes(normalizedParSearch) ||
        (summary.receiver?.full_name.toLowerCase().includes(normalizedParSearch) ?? false) ||
        (summary.receiver?.staff_id.toLowerCase().includes(normalizedParSearch) ?? false)

      if (matchesSummary) return true

      return summary.records.some((record) => {
        const item = inventoryItems.find((entry) => entry.item_id === record.item_id)

        return (
          (item?.item_name.toLowerCase().includes(normalizedParSearch) ?? false) ||
          (item?.item_type.toLowerCase().includes(normalizedParSearch) ?? false) ||
          (record.description_snapshot?.toLowerCase().includes(normalizedParSearch) ?? false) ||
          (record.property_no_snapshot?.toLowerCase().includes(normalizedParSearch) ?? false)
        )
      })
    })

  const reportPeriodParSummaries = Array.from(groupedParByStaff.entries())
    .map(([staffId, records]) => {
      const recordsWithinPeriod = records.filter((record) =>
        isDateWithinReportRange(record.issue_date, reportStartDate, reportEndDate),
      )

      const receiver = parUsers.find((user) => user.id === staffId) ?? null

      return {
        staffId,
        receiver,
        recordsWithinPeriod,
      }
    })
    .filter((summary) => summary.recordsWithinPeriod.length > 0)

  const reportParOptions = reportPeriodParSummaries
    .slice()
    .sort((a, b) => {
      const aName = a.receiver?.full_name ?? a.staffId
      const bName = b.receiver?.full_name ?? b.staffId
      return aName.localeCompare(bName)
    })
    .map((summary) => {
      const label = summary.receiver
        ? `${summary.receiver.full_name} (${summary.receiver.staff_id})`
        : summary.staffId

      return {
        staffId: summary.staffId,
        label,
      }
    })

  useEffect(() => {
    if (reportParOptions.length === 0) {
      setSelectedParReportStaffId('')
      return
    }

    setSelectedParReportStaffId((prev) => {
      if (prev && reportParOptions.some((option) => option.staffId === prev)) {
        return prev
      }

      return reportParOptions[0].staffId
    })
  }, [reportParOptions])

  const activeParRecords = activeParStaffId ? groupedParByStaff.get(activeParStaffId) ?? [] : []
  const activeParReceiver = activeParStaffId
    ? parUsers.find((user) => user.id === activeParStaffId) ?? null
    : null
  const activeParNo = activeParReceiver?.staff_id
    ? `PAR-${activeParReceiver.staff_id}`
    : activeParStaffId
      ? `PAR-${activeParStaffId.slice(0, 8)}`
      : 'PAR-'
  const activeParDepartment =
    activeParReceiver?.department_id != null
      ? departments.find((dept) => dept.id === activeParReceiver.department_id)?.name ?? '—'
      : '—'
  const activeParCostTotals = activeParRecords.map((record) => {
    const item = inventoryItems.find((entry) => entry.item_id === record.item_id)

    if (record.cost_snapshot != null) {
      return calculateTotalCost(record.quantity_issued ?? null, record.cost_snapshot)
    }

    if (item?.unit_cost != null) {
      return calculateTotalCost(record.quantity_issued ?? null, item.unit_cost)
    }

    return null
  })
  const activeParHasCost = activeParCostTotals.some((value) => value != null)
  let activeParTotalCost = 0
  for (const value of activeParCostTotals) {
    activeParTotalCost += value ?? 0
  }
  const activeVehicle =
    activeVehicleLogsId != null ? vehicles.find((vehicle) => vehicle.id === activeVehicleLogsId) ?? null : null
  const activeVehicleRepairs =
    activeVehicleLogsId != null
      ? vehicleRepairs.filter((repair) => repair.vehicle_id === activeVehicleLogsId)
      : []
  const activeVehicleRepairSpend = activeVehicleRepairs.reduce((sum, repair) => sum + Number(repair.amount ?? 0), 0)
  const activeReportsError = parError ?? stockpileError ?? wmrError ?? vehicleError

  // [HANDLERS] PAR actions
  const escapeHtml = (value: string) =>
    value
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;')

  const printHtmlViaIframe = (html: string, onError: (message: string) => void) => {
    const frame = document.createElement('iframe')
    frame.style.position = 'fixed'
    frame.style.width = '0'
    frame.style.height = '0'
    frame.style.border = '0'
    frame.style.opacity = '0'
    frame.style.pointerEvents = 'none'
    frame.setAttribute('aria-hidden', 'true')
    document.body.appendChild(frame)

    const cleanup = () => {
      window.setTimeout(() => {
        if (frame.parentNode) {
          frame.parentNode.removeChild(frame)
        }
      }, 0)
    }

    const frameDoc = frame.contentDocument
    const frameWindow = frame.contentWindow

    if (!frameDoc || !frameWindow) {
      cleanup()
      onError('Could not start print preview. Please try again.')
      return
    }

    frame.onload = () => {
      frameWindow.focus()
      frameWindow.print()
      cleanup()
    }

    frameDoc.open()
    frameDoc.write(html)
    frameDoc.close()
  }

  const printHeaderLogoSrc = `${window.location.origin}/Banicain-logo.png`

  const buildPrintReportHeader = (reportTitle: string) => `
    <div class="report-header">
      <img class="report-header-logo" src="${escapeHtml(printHeaderLogoSrc)}" alt="Barangay New Banicain logo" />
      <div class="report-header-text">
        <p class="report-header-city">City of Olongapo</p>
        <p class="report-header-barangay">BARANGAY NEW BANICAIN</p>
        <p class="report-header-address">Luna Street New Banicain Olongapo City, Philippines 2200</p>
      </div>
    </div>
    <div class="report-title">${escapeHtml(reportTitle)}</div>
  `

  const getPrintCommonStyles = () => `
    body { font-family: Arial, sans-serif; margin: 24px; color: #111827; }
    p { margin: 0 0 12px; color: #4b5563; font-size: 13px; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th, td { border: 1px solid #d1d5db; padding: 8px; text-align: left; }
    th { background: #f3f4f6; font-weight: 600; }
    .report-header {
      display: flex;
      align-items: center;
      gap: 12px;
      border-bottom: 1.5px solid #111827;
      padding-bottom: 8px;
      margin-bottom: 10px;
    }
    .report-header-logo {
      width: 58px;
      height: 58px;
      object-fit: contain;
      flex: 0 0 auto;
    }
    .report-header-text {
      line-height: 1.18;
    }
    .report-header-city {
      margin: 0;
      font-size: 11px;
      color: #374151;
    }
    .report-header-barangay {
      margin: 2px 0;
      font-size: 19px;
      font-weight: 700;
      letter-spacing: 0.2px;
      color: #111827;
    }
    .report-header-address {
      margin: 0;
      font-size: 11px;
      color: #374151;
    }
    .report-title {
      margin: 8px 0 12px;
      font-size: 20px;
      font-weight: 700;
      color: #111827;
      text-align: center;
    }
    .signatures { margin-top: 24px; display: grid; grid-template-columns: 1fr; }
    .sign-line { margin-top: 48px; width: 280px; }
    .sign-name { display: block; width: 100%; box-sizing: border-box; border-bottom: 1px solid #111827; padding: 0 8px 2px; font-size: 12px; white-space: nowrap; text-align: center; }
    .sign-role { margin-top: 4px; font-size: 12px; color: #374151; width: 280px; text-align: left; }
    @media print {
      body { margin: 10mm; }
      .report-header-logo { width: 54px; height: 54px; }
      .report-header-barangay { font-size: 17px; }
    }
  `

  const handlePrintParForStaff = (staffId: string, startDate?: string, endDate?: string) => {
    if (!staffId) return

    const rangeStart = startDate ?? reportStartDate
    const rangeEnd = endDate ?? reportEndDate

    const records = (groupedParByStaff.get(staffId) ?? []).filter((record) => {
      return isDateWithinReportRange(record.issue_date, rangeStart, rangeEnd)
    })
    const receiver = parUsers.find((user) => user.id === staffId) ?? null
    const issuedByName = currentAdminName.trim() || settingsNameInput.trim() || 'Super Admin'
    const parNo = receiver?.staff_id ? `PAR-${receiver.staff_id}` : `PAR-${staffId.slice(0, 8)}`
    const departmentName =
      receiver?.department_id != null
        ? departments.find((dept) => dept.id === receiver.department_id)?.name ?? '—'
        : '—'

    const rows = records
      .slice()
      .sort((a, b) => a.par_id - b.par_id)
      .map((record) => {
        const item = inventoryItems.find((entry) => entry.item_id === record.item_id)
        const lineTotalAmount =
          record.cost_snapshot != null
            ? calculateTotalCost(record.quantity_issued ?? null, record.cost_snapshot)
            : item?.unit_cost != null
              ? calculateTotalCost(record.quantity_issued ?? null, item.unit_cost)
              : null

        return {
          quantity: String(record.quantity_issued ?? 0),
          unit: record.unit_snapshot ?? item?.unit_of_measure ?? 'N/A',
          description: record.description_snapshot ?? item?.item_name ?? '—',
          propertyNo:
            record.property_no_snapshot ??
            item?.property_no ??
            (record.item_id != null ? `ITEM-${record.item_id.toString().padStart(3, '0')}` : '—'),
          issuedDate: formatInventoryDate(record.issue_date),
          dateAcquired: formatInventoryDate(record.date_acquired_snapshot ?? item?.date_acquired),
          cost:
            record.cost_snapshot != null
              ? formatCurrency(record.cost_snapshot)
              : item?.unit_cost != null
                ? formatCurrency(item.unit_cost)
                : 'N/A',
          lineTotalAmount,
        }
      })

    const totalCostAmount = rows.reduce((sum, row) => sum + (row.lineTotalAmount ?? 0), 0)
    const totalCostDisplay = rows.some((row) => row.lineTotalAmount != null) ? formatCurrency(totalCostAmount) : 'N/A'

    const rowsMarkup = rows
      .map(
        (row) =>
          `<tr>
            <td>${escapeHtml(row.quantity)}</td>
            <td>${escapeHtml(row.unit)}</td>
            <td>${escapeHtml(row.description)}</td>
            <td>${escapeHtml(row.propertyNo)}</td>
            <td>${escapeHtml(row.issuedDate)}</td>
            <td>${escapeHtml(row.dateAcquired)}</td>
            <td>${escapeHtml(row.cost)}</td>
          </tr>`,
      )
      .join('')
    const totalRowMarkup = rows.some((row) => row.lineTotalAmount != null)
      ? `<tr>
            <td colspan="6" style="text-align:right;"><strong>Total Cost</strong></td>
            <td><strong>${escapeHtml(totalCostDisplay)}</strong></td>
          </tr>`
      : ''

    const printDocument = `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>${escapeHtml(parNo)}</title>
          <style>
            ${getPrintCommonStyles()}
            .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 20px; margin-bottom: 16px; }
            .meta p { margin: 0; font-size: 14px; }
            .signatures { grid-template-columns: 1fr 1fr; gap: 40px; }
            .signatures > div { width: 220px; }
            .sign-line { width: 100%; }
            .sign-role { width: 100%; }
          </style>
        </head>
        <body>
          ${buildPrintReportHeader('PROPERTY ACKNOWLEDGMENT RECEIPT')}
          <div class="meta">
            <p><strong>Employee Name:</strong> ${escapeHtml(receiver?.full_name ?? staffId)}</p>
            <p><strong>Department:</strong> ${escapeHtml(departmentName)}</p>
            <p><strong>PAR No:</strong> ${escapeHtml(parNo)}</p>
            <p><strong>Date Printed:</strong> ${escapeHtml(new Date().toISOString().slice(0, 10))}</p>
          </div>

          <table>
            <thead>
              <tr>
                <th>QTY</th>
                <th>Unit</th>
                <th>Description</th>
                <th>Property No.</th>
                <th>Issue Date</th>
                <th>Date Acquired</th>
                <th>Unit Cost</th>
              </tr>
            </thead>
            <tbody>
              ${rowsMarkup || '<tr><td colspan="7">No PAR items found.</td></tr>'}
              ${totalRowMarkup}
            </tbody>
          </table>

          <div class="signatures">
            <div>
              <div class="sign-line"><span class="sign-name">${escapeHtml(receiver?.full_name ?? staffId)}</span></div>
              <div class="sign-role">Received by</div>
            </div>
            <div>
              <div class="sign-line"><span class="sign-name">${escapeHtml(issuedByName)}</span></div>
              <div class="sign-role">Issued by</div>
            </div>
          </div>
        </body>
      </html>
    `

    printHtmlViaIframe(printDocument, setParError)
  }

  const handlePrintPar = () => {
    if (!activeParStaffId) return
    handlePrintParForStaff(activeParStaffId)
  }

  const handleCreateParRecord = async () => {
    if (!parItemId || !parIssuedToId) {
      setParError('Item and issued-to staff are required for PAR.')
      return
    }

    const quantityValue = Number(parQuantityIssued)

    if (!Number.isFinite(quantityValue) || quantityValue <= 0) {
      setParError('Quantity issued must be greater than zero.')
      return
    }

    const selectedItem = inventoryItems.find((item) => item.item_id === Number(parItemId))
    const selectedUser = parUsers.find((user) => user.id === parIssuedToId)

    if (!selectedItem) {
      setParError('Selected item was not found in inventory.')
      return
    }

    if (!isLoanableParItem(selectedItem)) {
      setParError('Only equipment, hand tools, power tools, and gadgets can be issued through PAR.')
      return
    }

    if (selectedItem.quantity !== null && quantityValue > selectedItem.quantity) {
      setParError('Quantity issued cannot be greater than the available quantity.')
      return
    }

    const parsedCost = parCostInput.trim() ? Number(parCostInput) : null
    const costSnapshot = Number.isFinite(parsedCost) ? parsedCost : null

    setParSaving(true)
    setParError(null)

    const existingStaffItemRecord = parRecords.find(
      (record) => record.issued_to_id === parIssuedToId && record.item_id === selectedItem.item_id,
    )

    if (existingStaffItemRecord) {
      const nextQuantity = (existingStaffItemRecord.quantity_issued ?? 0) + quantityValue

      const { data, error: updateError } = await supabase
        .from('par_records')
        .update({
          quantity_issued: nextQuantity,
          issue_date: parIssueDate || existingStaffItemRecord.issue_date || null,
          contact_snapshot: selectedUser?.contact_info ?? existingStaffItemRecord.contact_snapshot ?? null,
          unit_snapshot: parUnitInput || existingStaffItemRecord.unit_snapshot || null,
          description_snapshot: parDescriptionInput || existingStaffItemRecord.description_snapshot || selectedItem.item_name,
          property_no_snapshot: parPropertyNoInput || existingStaffItemRecord.property_no_snapshot || null,
          date_acquired_snapshot: parDateAcquiredInput || existingStaffItemRecord.date_acquired_snapshot || null,
          cost_snapshot: costSnapshot ?? existingStaffItemRecord.cost_snapshot ?? null,
        })
        .eq('par_id', existingStaffItemRecord.par_id)
        .select('*')

      if (updateError) {
        setParError(updateError.message)
        setParSaving(false)
        return
      }

      const updatedRecord = (data?.[0] ?? null) as ParRecordRow | null

      if (updatedRecord) {
        setParRecords((prev) => prev.map((record) => (record.par_id === updatedRecord.par_id ? updatedRecord : record)))
      }
    } else {
      const { data, error: insertError } = await supabase
        .from('par_records')
        .insert([
          {
            item_id: selectedItem.item_id,
            issued_to_id: parIssuedToId,
            quantity_issued: quantityValue,
            issue_date: parIssueDate || null,
            contact_snapshot: selectedUser?.contact_info ?? null,
            unit_snapshot: parUnitInput || selectedItem.unit_of_measure || null,
            description_snapshot: parDescriptionInput || selectedItem.item_name,
            property_no_snapshot:
              parPropertyNoInput ||
              selectedItem.property_no ||
              `ITEM-${selectedItem.item_id.toString().padStart(3, '0')}`,
            date_acquired_snapshot: parDateAcquiredInput || selectedItem.date_acquired,
            cost_snapshot: costSnapshot ?? selectedItem.unit_cost ?? null,
          },
        ])
        .select('*')

      if (insertError) {
        setParError(insertError.message)
        setParSaving(false)
        return
      }

      const createdRecord = (data?.[0] ?? null) as ParRecordRow | null

      if (createdRecord) {
        setParRecords((prev) => [createdRecord, ...prev])
      }
    }

    setParItemId('')
    setParIssuedToId('')
    setParQuantityIssued('1')
    setParIssueDate(new Date().toISOString().slice(0, 10))
    setParUnitInput('')
    setParDescriptionInput('')
    setParPropertyNoInput('')
    setParDateAcquiredInput('')
    setParCostInput('')
    setParSaving(false)
  }

  const handleCreateParRecordsBatch = async (draftItems: ParDraftItem[], issuedToId: string, issueDate: string) => {
    if (!issuedToId) {
      setParError('Issued To is required.')
      return
    }
    const validItems = draftItems.filter((row) => row.itemId !== '')
    if (validItems.length === 0) {
      setParError('At least one item must be selected.')
      return
    }

    setParSaving(true)
    setParError(null)

    const selectedUser = parUsers.find((user) => user.id === issuedToId)

    for (const row of validItems) {
      const selectedItem = inventoryItems.find((item) => String(item.item_id) === row.itemId)
      if (!selectedItem) continue

      if (!isLoanableParItem(selectedItem)) {
        setParError('Only equipment, hand tools, power tools, and gadgets can be issued through PAR.')
        setParSaving(false)
        return
      }

      const quantityValue = Number(row.quantity)
      if (!Number.isFinite(quantityValue) || quantityValue <= 0) continue

      const existingRecord = parRecords.find(
        (record) => record.issued_to_id === issuedToId && record.item_id === selectedItem.item_id,
      )

      if (existingRecord) {
        const nextQuantity = (existingRecord.quantity_issued ?? 0) + quantityValue
        const { data, error: updateError } = await supabase
          .from('par_records')
          .update({
            quantity_issued: nextQuantity,
            issue_date: issueDate || existingRecord.issue_date || null,
            contact_snapshot: selectedUser?.contact_info ?? existingRecord.contact_snapshot ?? null,
            unit_snapshot: row.unit || existingRecord.unit_snapshot || null,
            description_snapshot: row.description || existingRecord.description_snapshot || selectedItem.item_name,
            cost_snapshot: row.costSnapshot ?? existingRecord.cost_snapshot ?? null,
          })
          .eq('par_id', existingRecord.par_id)
          .select('*')

        if (updateError) {
          setParError(updateError.message)
          setParSaving(false)
          return
        }

        const updatedRecord = (data?.[0] ?? null) as ParRecordRow | null
        if (updatedRecord) {
          setParRecords((prev) => prev.map((r) => (r.par_id === updatedRecord.par_id ? updatedRecord : r)))
        }
      } else {
        const { data, error: insertError } = await supabase
          .from('par_records')
          .insert([
            {
              item_id: selectedItem.item_id,
              issued_to_id: issuedToId,
              quantity_issued: quantityValue,
              issue_date: issueDate || null,
              contact_snapshot: selectedUser?.contact_info ?? null,
              unit_snapshot: row.unit || selectedItem.unit_of_measure || null,
              description_snapshot: row.description || selectedItem.item_name,
              property_no_snapshot:
                selectedItem.property_no ||
                `ITEM-${selectedItem.item_id.toString().padStart(3, '0')}`,
              date_acquired_snapshot: selectedItem.date_acquired,
              cost_snapshot: row.costSnapshot ?? selectedItem.unit_cost ?? null,
            },
          ])
          .select('*')

        if (insertError) {
          setParError(insertError.message)
          setParSaving(false)
          return
        }

        const createdRecord = (data?.[0] ?? null) as ParRecordRow | null
        if (createdRecord) {
          setParRecords((prev) => [createdRecord, ...prev])
        }
      }
    }

    setParSaving(false)
  }

  // [HANDLERS] Vehicle actions
  const handleAddVehicle = async () => {
    const trimmedVehicleName = newVehicleName.trim()
    if (!trimmedVehicleName) {
      setVehicleError('Vehicle name is required.')
      return
    }

    setVehicleSaving(true)
    setVehicleError(null)

    const trimmedMakeModel = newVehicleMakeModel.trim()
    const trimmedColor = newVehicleColor.trim()
    const yearValue = newVehicleYearModel ? Number(newVehicleYearModel) : null

    const { data, error: insertVehicleError } = await supabase
      .from('vehicles')
      .insert([
        ({
          vehicle_name: trimmedVehicleName,
          make_model: trimmedMakeModel || null,
          color: trimmedColor || null,
          year_model: Number.isNaN(yearValue) ? null : yearValue,
          cr_number: newVehicleCrNumber || null,
          engine_number: newVehicleEngineNumber || null,
          is_serviceable: newVehicleServiceable === 'true',
          repair_history_log: newVehicleRepairHistory || null,
        } as never),
      ])
      .select('*')

    if (insertVehicleError) {
      setVehicleError(insertVehicleError.message)
      setVehicleSaving(false)
      return
    }

    const insertedVehicle = (data?.[0] ?? null) as VehicleRow | null

    if (insertedVehicle) {
      setVehicles((prev) => [...prev, insertedVehicle].sort((a, b) => b.id - a.id))
    }

    setNewVehicleName('')
    setNewVehicleMakeModel('')
    setNewVehicleColor('')
    setNewVehicleYearModel('')
    setNewVehicleCrNumber('')
    setNewVehicleEngineNumber('')
    setNewVehicleServiceable('true')
    setNewVehicleRepairHistory('')
    setVehicleSaving(false)
    setVehicleMode('manage')
  }

  const handleAddVehicleRepair = async () => {
    if (!newRepairVehicleId) {
      setVehicleError('Vehicle is required.')
      return
    }

    if (!newRepairDescription.trim()) {
      setVehicleError('Repair description is required.')
      return
    }

    setVehicleSaving(true)
    setVehicleError(null)

    const amountValue = newRepairAmount ? Number(newRepairAmount) : null

    const { data, error: insertRepairError } = await supabase
      .from('vehicle_repairs')
      .insert([
        {
          vehicle_id: Number(newRepairVehicleId),
          admin_id: newRepairAdminId || null,
          amount: Number.isNaN(amountValue) ? null : amountValue,
          date_repaired: newRepairDate || null,
          job_order_number: newRepairJobOrder || null,
          service_center: newRepairServiceCenter || null,
        },
      ])
      .select('*')

    if (insertRepairError) {
      setVehicleError(insertRepairError.message)
      setVehicleSaving(false)
      return
    }

    const insertedRepair = (data?.[0] ?? null) as VehicleRepairRow | null

    if (insertedRepair) {
      setVehicleRepairs((prev) => [insertedRepair, ...prev])

      const descriptionValue = newRepairDescription.trim()

      if (descriptionValue.length > 0 && insertedRepair.vehicle_id != null) {
        const vehicleId = insertedRepair.vehicle_id
        const currentVehicle = vehicles.find((vehicle) => vehicle.id === vehicleId) ?? null
        const currentLog = currentVehicle?.repair_history_log?.trim() ?? ''
        const repairCode = `VR-${insertedRepair.repair_id.toString().padStart(3, '0')}`
        const appendedEntry = `${repairCode}: ${descriptionValue}`
        const nextHistoryLog = currentLog ? `${currentLog}\n${appendedEntry}` : appendedEntry

        const { data: updatedVehicleRows, error: updateVehicleError } = await supabase
          .from('vehicles')
          .update({ repair_history_log: nextHistoryLog })
          .eq('id', vehicleId)
          .select('*')

        if (updateVehicleError) {
          setVehicleError(updateVehicleError.message)
        } else {
          const updatedVehicle = (updatedVehicleRows?.[0] ?? null) as VehicleRow | null
          if (updatedVehicle) {
            setVehicles((prev) => prev.map((vehicle) => (vehicle.id === updatedVehicle.id ? updatedVehicle : vehicle)))
          }
        }
      }
    }

    setNewRepairVehicleId('')
    setNewRepairAdminId('')
    setNewRepairAmount('')
    setNewRepairDate(new Date().toISOString().slice(0, 10))
    setNewRepairJobOrder('')
    setNewRepairServiceCenter('')
    setNewRepairDescription('')
    setVehicleSaving(false)
    setVehicleMode('manage')
  }

  const handleSaveVehicleEdit = async () => {
    if (!editingVehicle) return

    const trimmedEditVehicleName = editVehicleName.trim()
    if (!trimmedEditVehicleName) {
      setVehicleError('Vehicle name is required.')
      return
    }

    if (editVehicleServiceable === 'false' && !editVehicleRemarks.trim()) {
      setVehicleError('Remarks are required when the vehicle is Unserviceable.')
      return
    }

    setEditVehicleSaving(true)
    setVehicleError(null)

    const baseHistoryLog = stripVehicleStatusRemark(editingVehicle.repair_history_log)
    const nextHistoryLog =
      editVehicleServiceable === 'false'
        ? [baseHistoryLog, `STATUS NOTE: ${editVehicleRemarks.trim()}`].filter((value) => value.length > 0).join('\n')
        : baseHistoryLog || null
    const shouldCreateVehicleWmr = (editingVehicle.is_serviceable ?? true) && editVehicleServiceable === 'false'

    const { data, error: updateError } = await supabase
      .from('vehicles')
      .update({
        vehicle_name: trimmedEditVehicleName,
        color: editVehicleColor.trim() || null,
        is_serviceable: editVehicleServiceable === 'true',
        repair_history_log: nextHistoryLog,
      } as never)
      .eq('id', editingVehicle.id)
      .select('*')

    if (updateError) {
      setVehicleError(updateError.message)
      setEditVehicleSaving(false)
      return
    }

    const updatedVehicle = (data?.[0] ?? null) as VehicleRow | null

    if (updatedVehicle) {
      setVehicles((prev) => prev.map((vehicle) => (vehicle.id === updatedVehicle.id ? updatedVehicle : vehicle)))
      setEditingVehicle(updatedVehicle)

      if (shouldCreateVehicleWmr) {
        const { data: createdWmrRows, error: createWmrError } = await supabase
          .from('wmr_reports')
          .insert([
            {
              item_id: null,
              status: 'Pending',
              reason_damage: editVehicleRemarks.trim() || null,
              location: `Vehicle Registry - ${getVehicleDisplayLabel(updatedVehicle)}`,
              admin_remarks: editVehicleRemarks.trim() || null,
              date_reported: new Date().toISOString().slice(0, 10),
            },
          ])
          .select('*')

        if (createWmrError) {
          setVehicleError(`Vehicle was updated, but WMR creation failed: ${createWmrError.message}`)
        } else {
          const createdWmr = (createdWmrRows?.[0] ?? null) as WmrReportRow | null
          if (createdWmr) {
            setWmrReports((prev) => [createdWmr, ...prev])
          }
        }
      }
    }

    setEditVehicleSaving(false)
    setIsEditingVehicleDetails(false)
  }

  // [HANDLERS] WMR actions
  const normalizeWmrStatus = (status: string | null | undefined) => {
    if (!status) return 'Pending'
    const normalized = status.toLowerCase().trim()
    if (normalized === 'pending') return 'Pending'
    if (normalized === 'for disposal') return 'For Disposal'
    if (normalized === 'disposed') return 'Disposed'
    if (normalized === 'for repair') return 'For Repair'
    if (normalized === 'repaired') return 'Repaired'
    return status // fallback to original if no match
  }

  const openWmrRemarksModal = (item: InventoryRow) => {
    const existingReport = wmrReports.find((report) => report.item_id === item.item_id) ?? null

    setActiveWmrItem(item)
    setActiveWmrReport(existingReport)
    setActiveWmrVehicleLabel(null)
    setWmrRemarksInput(existingReport?.admin_remarks ?? '')
    setWmrStatusInput(normalizeWmrStatus(existingReport?.status))
    setIsEditingWmrRemarks(!existingReport || !existingReport.admin_remarks)
  }

  const openVehicleWmrRemarksModal = (report: WmrReportRow, label: string) => {
    setActiveWmrItem(null)
    setActiveWmrReport(report)
    setActiveWmrVehicleLabel(label)
    setWmrRemarksInput(report.admin_remarks ?? '')
    setWmrStatusInput(normalizeWmrStatus(report.status))
    setIsEditingWmrRemarks(!report.admin_remarks)
  }

  const closeWmrRemarksModal = () => {
    if (wmrSaving) return
    setActiveWmrItem(null)
    setActiveWmrReport(null)
    setActiveWmrVehicleLabel(null)
    setWmrRemarksInput('')
    setWmrStatusInput('Pending')
    setIsEditingWmrRemarks(false)
    setWmrSaving(false)
  }

  const handleSaveWmrRemarks = async () => {
    if (!activeWmrItem && !activeWmrReport) return

    setWmrSaving(true)
    setWmrError(null)

    const existingReport = activeWmrReport

    const statusToSave = wmrStatusInput || 'Pending'

    const reconcileInventoryQuantity = async (
      itemId: number,
      quantityReported: number,
      previousStatus: string | null | undefined,
      nextStatus: string | null | undefined,
    ) => {
      const normalizedPrevious = (previousStatus ?? '').trim().toLowerCase()
      const normalizedNext = (nextStatus ?? '').trim().toLowerCase()
      const wasRepaired = normalizedPrevious === 'repaired'
      const isRepaired = normalizedNext === 'repaired'

      let quantityDelta = 0
      if (!wasRepaired && isRepaired) quantityDelta = quantityReported
      if (wasRepaired && !isRepaired) quantityDelta = -quantityReported
      if (quantityDelta === 0) return

      const currentItem = inventoryItems.find((item) => item.item_id === itemId) ?? null
      if (!currentItem) return

      const nextQuantity = Math.max(0, (currentItem.quantity ?? 0) + quantityDelta)
      const { error: invQuantityErr } = await supabase
        .from('inventory')
        .update({ quantity: nextQuantity })
        .eq('item_id', itemId)

      if (!invQuantityErr) {
        setInventoryItems((prev) =>
          prev.map((item) => (item.item_id === itemId ? { ...item, quantity: nextQuantity } : item)),
        )
      }
    }

    if (existingReport) {
      const { data, error: updateError } = await supabase
        .from('wmr_reports')
        .update({ admin_remarks: wmrRemarksInput || null, status: statusToSave })
        .eq('report_id', existingReport.report_id)
        .select('*')

      if (updateError) {
        setWmrError(updateError.message)
        setWmrSaving(false)
        return
      }

      const updated = (data?.[0] ?? existingReport) as WmrReportRow
      setActiveWmrReport(updated)
      setWmrReports((prev) => prev.map((r) => (r.report_id === updated.report_id ? updated : r)))

      const linkedItemId = updated.item_id ?? activeWmrItem?.item_id ?? null
      if (linkedItemId != null) {
        await reconcileInventoryQuantity(
          linkedItemId,
          updated.quantity_reported ?? 1,
          existingReport.status,
          statusToSave,
        )
      }
    } else if (activeWmrItem) {
      const { data, error: insertError } = await supabase
        .from('wmr_reports')
        .insert([
          {
            item_id: activeWmrItem.item_id,
            quantity_reported: 1,
            admin_remarks: wmrRemarksInput || null,
            status: statusToSave,
          },
        ])
        .select('*')

      if (insertError) {
        setWmrError(insertError.message)
        setWmrSaving(false)
        return
      }

      const inserted = (data?.[0] ?? null) as WmrReportRow | null

      if (inserted) {
        setActiveWmrReport(inserted)
        setWmrReports((prev) => [...prev, inserted])
      }
    } else {
      setWmrSaving(false)
    }

    setIsEditingWmrRemarks(false)
    setWmrSaving(false)
  }

  // [HANDLERS] Inventory actions
  const openEditItem = (item: InventoryRow) => {
    setEditingItem(item)
    setEditItemName(item.item_name)
    setEditItemType(item.item_type)
    setEditDepartmentId(item.department_id != null ? String(item.department_id) : '')
    setEditQuantity(item.quantity != null ? item.quantity.toString() : '')
    setEditUnitOfMeasure(item.unit_of_measure ?? '')
    setEditUnitCost(item.unit_cost != null ? item.unit_cost.toString() : '')
    setEditDateAcquired(item.date_acquired)
    setEditExpirationDate(item.expiration_date ?? '')
    setEditSource(item.acquisition_mode ?? '')
    setEditStatus(item.item_type.trim().toLowerCase() === 'stockpile' ? getInventoryStatus(item) ?? '' : item.status?.trim() ?? '')
    setEditCondition(item.condition ?? '')
    setEditDonorIdentification((item as InventoryRow & { donor_identification?: string | null }).donor_identification ?? '')
  }

  const handleSaveEdit = async () => {
    if (!editingItem) return

    if (!editItemName || !editItemType || !editDepartmentId) {
      setInventoryError('Item name, type, and department are required.')
      return
    }

    setEditSaving(true)
    setInventoryError(null)

    const quantityNumber = editQuantity ? Number(editQuantity) : null
    const unitCostNumber = editUnitCost ? Number(editUnitCost) : null
    const isStockpileType = editItemType.trim().toLowerCase() === 'stockpile'
    const editExpirationValue = parseDateLikeValue(editExpirationDate)
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const stockpileStatusToSave =
      editExpirationValue && (() => {
        editExpirationValue.setHours(0, 0, 0, 0)
        return editExpirationValue < todayStart
      })()
        ? 'Expired'
        : null
    const normalizedEditStatus = editStatus.trim()
    const sanitizedEditStatus =
      normalizedEditStatus.toLowerCase() === 'valid' ? null : normalizedEditStatus || null

    // Prevent manual quantity decrease from the edit form.
    if (
      editingItem.quantity != null &&
      quantityNumber != null &&
      !Number.isNaN(quantityNumber) &&
      quantityNumber < editingItem.quantity
    ) {
      setInventoryError('Quantity cannot be decreased manually.')
      setEditSaving(false)
      return
    }

    const { error: updateError } = await supabase
      .from('inventory')
      .update({
        item_name: editItemName,
        item_type: editItemType,
        department_id: Number(editDepartmentId),
        quantity: Number.isNaN(quantityNumber) ? null : quantityNumber,
        unit_of_measure: editUnitOfMeasure || null,
        unit_cost: Number.isNaN(unitCostNumber) ? null : unitCostNumber,
        date_acquired: editDateAcquired ? editDateAcquired : new Date().toISOString().split('T')[0],
        expiration_date: isStockpileType ? editExpirationDate || null : null,
        acquisition_mode: editSource || null,
        status: isStockpileType ? stockpileStatusToSave : sanitizedEditStatus,
        condition: editCondition || null,
        donor_identification: editDonorIdentification || null,
      } as any)
      .eq('item_id', editingItem.item_id)

    if (updateError) {
      setInventoryError(updateError.message)
      setEditSaving(false)
      return
    }

    // Reload inventory list from database
    setInventoryLoading(true)
    const { data, error: reloadError } = await supabase.from('inventory').select('*').order('item_id', {
      ascending: false,
    })

    if (reloadError) {
      setInventoryError(reloadError.message)
    } else {
      setInventoryItems(data ?? [])
    }

    setInventoryLoading(false)
    setEditSaving(false)
    setEditingItem(null)
  }

  const openArchiveConfirmation = (item: InventoryRow) => {
    setArchiveModalConfig({
      kind: 'inventory',
      title: 'Archive Item',
      text: `Are you sure you want to archive ${item.item_name}?`,
      subtext: 'This item will be removed from the main list.',
      onConfirm: () => handleArchiveItem(item),
    })
  }

  const isArchiveModalBusy =
    archiveModalConfig?.kind === 'inventory'
      ? editDeleting
      : archiveModalConfig?.kind === 'department'
        ? departmentUpdatingId != null
        : archiveModalConfig?.kind === 'staff'
          ? staffUpdatingId != null
          : archiveModalConfig?.kind === 'vehicle'
            ? vehicleSaving
            : archiveModalConfig?.kind === 'wmr'
              ? wmrSaving
              : archiveModalConfig?.kind === 'par'
                ? parSaving
                : false

  const closeArchiveModal = () => {
    if (isArchiveModalBusy) return
    setArchiveModalConfig(null)
  }

  const openArchiveDepartmentConfirmation = (department: DepartmentOverview) => {
    setArchiveModalConfig({
      kind: 'department',
      title: 'Archive Department',
      text: `Are you sure you want to archive ${department.name}?`,
      subtext: 'This department will be removed from the main list.',
      onConfirm: () => handleArchiveDepartment(department),
    })
  }

  const openArchiveStaffConfirmation = (user: UserRow) => {
    setArchiveModalConfig({
      kind: 'staff',
      title: 'Archive Staff',
      text: `Are you sure you want to archive ${user.full_name}?`,
      subtext: 'This staff account will be removed from the main list.',
      onConfirm: () => handleArchiveStaff(user),
    })
  }

  const openArchiveVehicleConfirmation = (vehicle: VehicleRow) => {
    const vehicleLabel = getVehicleDisplayLabel(vehicle)
    setArchiveModalConfig({
      kind: 'vehicle',
      title: 'Archive Vehicle',
      text: `Are you sure you want to archive ${vehicleLabel}?`,
      subtext: 'This vehicle will be removed from the main list.',
      onConfirm: () => handleArchiveVehicle(vehicle),
    })
  }

  const openArchiveWasteWmrConfirmation = (item: InventoryRow, report: WmrReportRow | null) => {
    if (!report) {
      setWmrError(`No WMR report exists for ${item.item_name}. Archive the WMR report only after remarks/report data has been created.`)
      return
    }

    setArchiveModalConfig({
      kind: 'wmr',
      title: 'Archive WMR Report',
      text: `Are you sure you want to archive report WMR-${report.report_id.toString().padStart(3, '0')}?`,
      subtext: 'This report will be removed from the main list.',
      onConfirm: () => handleArchiveWasteItemFromWmr(item, report),
    })
  }

  const openArchiveVehicleWmrConfirmation = (report: WmrReportRow) => {
    setArchiveModalConfig({
      kind: 'wmr',
      title: 'Archive WMR Report',
      text: `Are you sure you want to archive report WMR-${report.report_id.toString().padStart(3, '0')}?`,
      subtext: 'This report will be removed from the main list.',
      onConfirm: () => handleArchiveVehicleReportFromWmr(report),
    })
  }

  const openArchiveParSummaryConfirmation = (staffId: string) => {
    const receiver = parUsers.find((user) => user.id === staffId)
    const targetLabel = receiver?.full_name ?? staffId

    setArchiveModalConfig({
      kind: 'par',
      title: 'Archive PAR Summary',
      text: `Are you sure you want to archive the PAR record for ${targetLabel}?`,
      subtext: 'This record will be removed from the main list.',
      onConfirm: () => handleArchiveParSummary(staffId),
    })
  }

  const handleArchiveItem = async (itemToArchive?: InventoryRow) => {
    const targetItem = itemToArchive ?? editingItem
    if (!targetItem) return

    setEditDeleting(true)
    setInventoryError(null)

    const { error: archiveInventoryError } = await supabase
      .from('inventory')
      .update({ status: 'Archived' })
      .eq('item_id', targetItem.item_id)

    if (archiveInventoryError) {
      setInventoryError(archiveInventoryError.message)
      setEditDeleting(false)
      return
    }

    setInventoryItems((prev) =>
      prev.map((item) => (item.item_id === targetItem.item_id ? { ...item, status: 'Archived' } : item)),
    )
    setEditDeleting(false)
    setArchiveModalConfig(null)
    if (editingItem?.item_id === targetItem.item_id) {
      setEditingItem(null)
    }
  }

  const handleSaveSettingsName = async () => {
    const combinedName = (settingsFirstNameInput.trim() + ' ' + settingsLastNameInput.trim()).trim()
    const trimmedName = combinedName || settingsNameInput.trim()
    const trimmedPosition = settingsPositionInput.trim()

    if (!settingsUserId) {
      setSettingsErrorMessage('Unable to identify the signed-in user.')
      return
    }

    if (!trimmedName) {
      setSettingsErrorMessage('Name is required.')
      return
    }

    setSettingsNameSaving(true)
    setSettingsErrorMessage(null)
    setSettingsSuccessMessage(null)

    const { error: updateNameError } = await supabase
      .from('users')
      .update({ full_name: trimmedName, position: trimmedPosition || null })
      .eq('id', settingsUserId)

    if (updateNameError) {
      setSettingsErrorMessage(updateNameError.message)
      setSettingsNameSaving(false)
      return
    }

    setParUsers((prev) =>
      prev.map((user) =>
        user.id === settingsUserId
          ? { ...user, full_name: trimmedName, position: trimmedPosition || null }
          : user,
      ),
    )
    setCurrentAdminName(trimmedName)
    setCurrentAdminPosition(trimmedPosition)
    setCurrentAdminLastName(settingsLastNameInput.trim())
    setCurrentAdminFirstName(settingsFirstNameInput.trim())
    setSettingsSuccessMessage('Profile updated successfully.')
    setSettingsNameSaving(false)
  }

  const hashPasswordForStorage = async (password: string) => {
    if (typeof window === 'undefined' || !window.crypto?.subtle) {
      throw new Error('Secure hashing is not available in this environment.')
    }

    const encoded = new TextEncoder().encode(password)
    const digest = await window.crypto.subtle.digest('SHA-256', encoded)
    const hashHex = Array.from(new Uint8Array(digest))
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('')

    return `sha256:${hashHex}`
  }

  const handleChangeSettingsPassword = async () => {
    if (settingsPasswordInput.length < 8) {
      setSettingsErrorMessage('Password must be at least 8 characters long.')
      return
    }

    if (settingsPasswordInput !== settingsConfirmPasswordInput) {
      setSettingsErrorMessage('Password confirmation does not match.')
      return
    }

    setSettingsPasswordSaving(true)
    setSettingsErrorMessage(null)
    setSettingsSuccessMessage(null)

    const { error: updatePasswordError } = await supabase.auth.updateUser({
      password: settingsPasswordInput,
    })

    if (updatePasswordError) {
      setSettingsErrorMessage(updatePasswordError.message)
      setSettingsPasswordSaving(false)
      return
    }

    try {
      const passwordHash = await hashPasswordForStorage(settingsPasswordInput)

      if (!settingsUserId) {
        throw new Error('Unable to identify the signed-in user for password hash storage.')
      }

      const { error: updatePasswordHashError } = await supabase
        .from('users')
        .update({ password_hash: passwordHash })
        .eq('id', settingsUserId)

      if (updatePasswordHashError) {
        setSettingsErrorMessage(updatePasswordHashError.message)
        setSettingsPasswordSaving(false)
        return
      }
    } catch (hashError) {
      const hashErrorMessage = hashError instanceof Error ? hashError.message : 'Failed to hash password for storage.'
      setSettingsErrorMessage(hashErrorMessage)
      setSettingsPasswordSaving(false)
      return
    }

    setSettingsPasswordInput('')
    setSettingsConfirmPasswordInput('')
    setSettingsSuccessMessage('Password changed successfully and stored as a hash.')
    setSettingsPasswordSaving(false)
  }

  const resetStaffForm = () => {
    setStaffFormMode('add')
    setStaffFormTargetId(null)
    setStaffFormDepartmentId('')
    setStaffFormLastName('')
    setStaffFormFirstName('')
    setStaffFormStaffId('')
    setStaffFormPosition('')
    setStaffFormRole('Staff')
    setStaffFormContact('')
    setStaffFormEmergencyContact('')
    setStaffFormRecoveryEmail('')
  }

  const handleCancelStaffEdit = () => {
    resetStaffForm()
    setDepartmentStaffMode('manage-staff')
  }

  const startEditStaff = (user: UserRow) => {
    if (!canEditUser(user)) {
      setStaffError('Admins cannot edit Super Admin account information.')
      setStaffSuccess(null)
      return
    }

    setStaffFormMode('edit')
    setStaffFormTargetId(user.id)
    setStaffFormDepartmentId(user.department_id != null ? String(user.department_id) : '')
    const parsedName = parseFullName(user.full_name ?? '')
    setStaffFormFirstName(parsedName.firstName)
    setStaffFormLastName(parsedName.lastName)
    setStaffFormStaffId(user.staff_id)
    setStaffFormPosition(user.position ?? '')
    setStaffFormRole(mapStaffRoleToOption(user.role))
    setStaffFormContact(user.contact_info ?? '')
    setStaffFormEmergencyContact(user.emergency_contact ?? '')
    setStaffFormRecoveryEmail(user.recovery_email ?? '')
    setStaffError(null)
    setStaffSuccess(null)
  }

  const handleAddStaffDepartmentChange = (departmentId: string) => {
    setStaffFormDepartmentId(departmentId)

    if (!departmentId) {
      setStaffFormStaffId('')
      return
    }

    if (staffFormMode === 'edit') {
      return
    }

    const generatedStaffId = buildStaffId(Number(departmentId), parUsers)
    setStaffFormStaffId(generatedStaffId)
  }

  const handleSaveStaff = async () => {
    const trimmedName = `${staffFormFirstName.trim()} ${staffFormLastName.trim()}`.trim()
    const trimmedStaffId = staffFormStaffId.trim()
    const derivedEmail = buildStaffEmail(trimmedStaffId)
    const derivedQrCode = buildStaffQrCode(trimmedStaffId)
    const normalizedFormRole = staffFormRole.trim().toLowerCase()
    const trimmedRole =
      normalizedFormRole === 'super admin'
        ? 'Super Admin'
        : normalizedFormRole === 'admin'
          ? 'Admin'
          : 'Staff'
    const deptId = staffFormDepartmentId ? Number(staffFormDepartmentId) : null
    const existingStaffRecord = staffFormTargetId
      ? parUsers.find((user) => user.id === staffFormTargetId) ?? null
      : null

    if (isCurrentUserAdmin && trimmedRole === 'Super Admin') {
      setStaffError('Only Super Admin can assign the Super Admin role.')
      return
    }

    if (existingStaffRecord && !canEditUser(existingStaffRecord)) {
      setStaffError('Admins cannot edit Super Admin account information.')
      return
    }

    if (!trimmedName || !derivedEmail || !trimmedStaffId || deptId == null || Number.isNaN(deptId)) {
      setStaffError('Department and name are required.')
      return
    }

    const trimmedRecoveryEmail = staffFormRecoveryEmail.trim()
    if (staffFormMode === 'add' && !trimmedRecoveryEmail) {
      setStaffError('A real email address is required for password recovery.')
      return
    }

    setStaffSaving(true)
    setStaffError(null)
    setStaffSuccess(null)

    if (staffFormMode === 'edit' && staffFormTargetId) {
      const { data: updatedUser, error: updateError } = await supabase
        .from('users')
        .update({
          department_id: deptId,
          full_name: trimmedName,
          email: derivedEmail,
          staff_id: trimmedStaffId,
          qr_code: existingStaffRecord?.uid ?? derivedQrCode,
          uid: existingStaffRecord?.uid ?? undefined,
          position: staffFormPosition.trim() || null,
          role: trimmedRole,
          contact_info: staffFormContact.trim() || null,
          emergency_contact: staffFormEmergencyContact.trim() || null,
          recovery_email: staffFormRecoveryEmail.trim() || null,
        })
        .eq('id', staffFormTargetId)
        .select('*')
        .single()

      if (updateError) {
        setStaffError(updateError.message)
        setStaffSaving(false)
        return
      }

      setParUsers((prev) => prev.map((user) => (user.id === updatedUser.id ? updatedUser : user)))
      setStaffSuccess('Staff updated successfully.')
      resetStaffForm()
      setStaffSaving(false)
      return
    }

    const transientAuthClient = createTransientSupabaseClient()
    // Auth is registered with the real recovery_email so password reset emails work.
    // The fake system email (staffId@kaban.com) lives only in the users table.
    const authEmail = trimmedRecoveryEmail
    const { data: signUpData, error: signUpError } = await transientAuthClient.auth.signUp({
      email: authEmail,
      password: DEFAULT_STAFF_INITIAL_PASSWORD,
      options: {
        data: {
          full_name: trimmedName,
          staff_id: trimmedStaffId,
          role: trimmedRole,
        },
      },
    })

    let authUserId = signUpData.user?.id ?? null

    if (signUpError) {
      const normalizedAuthError = signUpError.message.trim().toLowerCase()
      const alreadyRegistered =
        normalizedAuthError.includes('already registered') ||
        normalizedAuthError.includes('already exists')

      if (!alreadyRegistered) {
        setStaffError(signUpError.message)
        setStaffSaving(false)
        return
      }

      const { data: existingAuthData, error: existingAuthError } =
        await transientAuthClient.auth.signInWithPassword({
          email: authEmail,
          password: DEFAULT_STAFF_INITIAL_PASSWORD,
        })

      if (existingAuthError || !existingAuthData.user?.id) {
        setStaffError('This sign-in account already exists. Please remove the old auth user or reset its password before trying again.')
        setStaffSaving(false)
        return
      }

      authUserId = existingAuthData.user.id
    }

    if (!authUserId) {
      setStaffError('Auth account was not created. Please check authentication settings and try again.')
      setStaffSaving(false)
      return
    }

    const staffUid = crypto.randomUUID()

    const { data: createdUser, error: createError } = await supabase
      .from('users')
      .upsert([
        {
          id: authUserId,
          uid: staffUid,
          department_id: deptId,
          full_name: trimmedName,
          email: derivedEmail,
          staff_id: trimmedStaffId,
          qr_code: staffUid,
          position: staffFormPosition.trim() || null,
          role: trimmedRole,
          contact_info: staffFormContact.trim() || null,
          emergency_contact: staffFormEmergencyContact.trim() || null,
          recovery_email: staffFormRecoveryEmail.trim() || null,
          is_locked: false,
          is_online: false,
        },
      ], { onConflict: 'id' })
      .select('*')
      .single()

    if (createError) {
      // .single() can fail even when the upsert succeeded (e.g. PGRST116 / no row returned).
      // Try fetching the row directly before giving up.
      const { data: refetchedUser, error: refetchError } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUserId)
        .single()

      if (refetchedUser && !refetchError) {
        void transientAuthClient.auth.signOut()
        setParUsers((prev) => [refetchedUser, ...prev])
        setStaffSuccess('Staff added successfully. Authentication account was created.')
        resetStaffForm()
        setStaffSaving(false)
        return
      }

      setStaffError(createError.message)
      setStaffSaving(false)
      return
    }

    void transientAuthClient.auth.signOut()

    setParUsers((prev) => [createdUser, ...prev])
    setStaffSuccess('Staff added successfully. Authentication account was created.')
    resetStaffForm()
    setStaffSaving(false)
  }

  const handleToggleStaffLock = async (user: UserRow) => {
    setStaffUpdatingId(user.id)
    setStaffError(null)
    setStaffSuccess(null)

    const nextLockState = !(user.is_locked ?? false)
    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update({ is_locked: nextLockState })
      .eq('id', user.id)
      .select('*')
      .single()

    if (updateError) {
      setStaffError(updateError.message)
      setStaffUpdatingId(null)
      return
    }

    setParUsers((prev) => prev.map((current) => (current.id === updatedUser.id ? updatedUser : current)))
    setStaffSuccess(nextLockState ? 'Staff account locked.' : 'Staff account unlocked.')
    setStaffUpdatingId(null)
  }

  const handleStaffQrButtonClick = async (user: UserRow) => {
    if (user.qr_code) {
      setViewStaffQrItem(user)
      return
    }

    setStaffUpdatingId(user.id)
    setStaffError(null)
    setStaffSuccess(null)

    const qrValue = buildStaffQrCode(user.staff_id)

    const { data, error: qrError } = await supabase
      .from('users')
      .update({ qr_code: qrValue })
      .eq('id', user.id)
      .select('*')
      .single()

    if (qrError) {
      setStaffError(qrError.message)
      setStaffUpdatingId(null)
      return
    }

    setParUsers((prev) => prev.map((row) => (row.id === data.id ? data : row)))
    setViewStaffQrItem(data)
    setStaffUpdatingId(null)
  }

  const handleArchiveStaff = async (user: UserRow) => {
    setStaffUpdatingId(user.id)
    setStaffError(null)
    setStaffSuccess(null)

    const { error: archiveError } = await supabase
      .from('users')
      .update({ is_archived: true, archived_at: new Date().toISOString() } as never)
      .eq('id', user.id)

    if (archiveError) {
      setStaffError(archiveError.message)
      setStaffUpdatingId(null)
      return
    }

    setParUsers((prev) => prev.map((current) => (current.id === user.id ? ({ ...current, is_archived: true } as UserRow) : current)))
    setStaffSuccess('Staff archived successfully.')
    if (staffFormTargetId === user.id) {
      resetStaffForm()
    }
    setStaffUpdatingId(null)
    setArchiveModalConfig(null)
  }

  const handleArchiveVehicle = async (vehicle: VehicleRow) => {
    setVehicleSaving(true)
    setVehicleError(null)

    const { error: archiveError } = await supabase
      .from('vehicles')
      .update({ is_archived: true, archived_at: new Date().toISOString() } as never)
      .eq('id', vehicle.id)

    if (archiveError) {
      setVehicleError(archiveError.message)
      setVehicleSaving(false)
      return
    }

    setVehicles((prev) => prev.map((current) => (current.id === vehicle.id ? ({ ...current, is_archived: true } as VehicleRow) : current)))
    if (activeVehicleLogsId === vehicle.id) {
      setActiveVehicleLogsId(null)
    }
    if (editingVehicle?.id === vehicle.id) {
      closeVehicleEditModal()
    }

    setVehicleSaving(false)
    setArchiveModalConfig(null)
  }

  const handleArchiveWasteItemFromWmr = async (item: InventoryRow, report: WmrReportRow | null) => {
    if (!report) {
      setWmrError(`No WMR report exists for ${item.item_name}. Archive the WMR report only after remarks/report data has been created.`)
      return
    }

    setWmrSaving(true)
    setWmrError(null)

    const { error: archiveError } = await supabase
      .from('wmr_reports')
      .update({ status: 'Archived', is_archived: true, archived_at: new Date().toISOString() } as never)
      .eq('report_id', report.report_id)

    if (archiveError) {
      setWmrError(archiveError.message)
      setWmrSaving(false)
      return
    }

    setWmrReports((prev) =>
      prev.map((current) =>
        current.report_id === report.report_id
          ? ({ ...current, status: 'Archived', is_archived: true } as WmrReportRow)
          : current,
      ),
    )

    setWmrSaving(false)
    setArchiveModalConfig(null)
  }

  const handleArchiveVehicleReportFromWmr = async (report: WmrReportRow) => {
    setWmrSaving(true)
    setWmrError(null)

    const { error: archiveError } = await supabase
      .from('wmr_reports')
      .update({ status: 'Archived', is_archived: true, archived_at: new Date().toISOString() } as never)
      .eq('report_id', report.report_id)

    if (archiveError) {
      setWmrError(archiveError.message)
      setWmrSaving(false)
      return
    }

    setWmrReports((prev) =>
      prev.map((current) =>
        current.report_id === report.report_id
          ? ({ ...current, status: 'Archived', is_archived: true } as WmrReportRow)
          : current,
      ),
    )

    setWmrSaving(false)
    setArchiveModalConfig(null)
  }

  const handleArchiveParSummary = async (staffId: string) => {
    setParSaving(true)
    setParError(null)

    const { error: archiveError } = await supabase
      .from('par_records')
      .update({ is_archived: true, archived_at: new Date().toISOString() } as never)
      .eq('issued_to_id', staffId)

    if (archiveError) {
      setParError(archiveError.message)
      setParSaving(false)
      return
    }

    setParRecords((prev) =>
      prev.map((record) =>
        record.issued_to_id === staffId ? ({ ...record, is_archived: true } as ParRecordRow) : record,
      ),
    )

    if (activeParStaffId === staffId) {
      setActiveParStaffId(null)
    }

    setParSaving(false)
    setArchiveModalConfig(null)
  }

  const handleAddItem = async () => {
    const normalizedSource = newSource.trim().toLowerCase()
    const isStockpileType = newItemType.trim().toLowerCase() === 'stockpile'
    const addExpirationValue = parseDateLikeValue(newExpirationDate)
    const addTodayStart = new Date()
    addTodayStart.setHours(0, 0, 0, 0)
    const stockpileStatusToInsert =
      addExpirationValue && (() => {
        addExpirationValue.setHours(0, 0, 0, 0)
        return addExpirationValue < addTodayStart
      })()
        ? 'Expired'
        : null

    if (!newItemName || !newItemType || !newItemDepartmentId) {
      setInventoryError('Item name, type, and department are required.')
      return
    }

    if (normalizedSource === 'purchased' && !newUnitCost.trim()) {
      setInventoryError('Unit cost is required for purchased items.')
      return
    }

    setAddingItem(true)
    setInventoryError(null)

    const quantityNumber = newQuantity ? Number(newQuantity) : null
    const unitCostNumber = normalizedSource === 'purchased' ? Number(newUnitCost) : null
    const itemUid = crypto.randomUUID()
    const { data: insertedItems, error: insertError } = await supabase.from('inventory').insert([
      {
        uid: itemUid,
        item_name: newItemName,
        item_type: newItemType,
        department_id: Number(newItemDepartmentId),
        quantity: Number.isNaN(quantityNumber) ? null : quantityNumber,
        unit_of_measure: newUnitOfMeasure || null,
        unit_cost: Number.isNaN(unitCostNumber) ? null : unitCostNumber,
        date_acquired: newDateAcquired || new Date().toISOString().split('T')[0],
        expiration_date: isStockpileType ? newExpirationDate || null : null,
        acquisition_mode: newSource || null,
        status: isStockpileType ? stockpileStatusToInsert : null,
        condition: newCondition || null,
        donor_identification: newDonorIdentification || null,
        qr_code: itemUid,
      } as any,
    ]).select('*')

    if (insertError) {
      setInventoryError(insertError.message)
      setAddingItem(false)
      return
    }

    const insertedItem = (insertedItems?.[0] ?? null) as InventoryRow | null

    if (!insertedItem) {
      setInventoryError('Item was added but could not be read back from the database.')
      setAddingItem(false)
      return
    }

    const { error: qrUpdateError } = await supabase
      .from('inventory')
      .update({ qr_code: insertedItem.uid ?? itemUid })
      .eq('item_id', insertedItem.item_id)

    if (qrUpdateError) {
      setInventoryError((prev) => prev ?? qrUpdateError.message)
    }

    const uploadedPhotoUrls: string[] = []

    for (const file of newPhotoFiles) {
      const fileExt = file.name.split('.').pop() || 'jpg'
      const fileName = `item-${insertedItem.item_id}-${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`
      const filePath = `items/${insertedItem.uid ?? insertedItem.item_id}/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from(INVENTORY_PHOTO_BUCKET)
        .upload(filePath, file, {
          contentType: file.type || 'image/jpeg',
          upsert: false,
        })

      if (uploadError) {
        setInventoryError(
          `Item added, but photo upload failed: ${uploadError.message}. Check storage policies for '${INVENTORY_PHOTO_BUCKET}'.`,
        )
        setAddingItem(false)
        return
      }

      const { data: publicUrlData } = supabase.storage.from(INVENTORY_PHOTO_BUCKET).getPublicUrl(filePath)
      uploadedPhotoUrls.push(publicUrlData.publicUrl)
    }

    if (uploadedPhotoUrls.length > 0) {
      const { data: insertedPhotos, error: photosInsertError } = await supabase
        .from('inventory_photos')
        .insert(
          uploadedPhotoUrls.map((url) => ({
            item_id: insertedItem.item_id,
            photo_url: url,
          })),
        )
        .select('*')

      if (photosInsertError) {
        setInventoryError(
          `Item and files uploaded, but photo records failed to save: ${photosInsertError.message}. Make sure 'inventory_photos' table exists.`,
        )
        setAddingItem(false)
        return
      }

      if (insertedPhotos && insertedPhotos.length > 0) {
        setInventoryPhotos((prev) => [...prev, ...(insertedPhotos as InventoryPhotoRow[])])
      }

      const { error: photoPathUpdateError } = await supabase
        .from('inventory')
        .update({ photo_path: uploadedPhotoUrls[0] })
        .eq('item_id', insertedItem.item_id)

      if (photoPathUpdateError) {
        setInventoryError((prev) => prev ?? photoPathUpdateError.message)
      }
    }

    // Clear form
    setNewItemName('')
    setNewItemType('')
    setNewCondition('')
    setNewDonorIdentification('')
    setNewItemDepartmentId('')
    setNewQuantity('')
    setNewUnitOfMeasure('')
    setNewUnitCost('')
    setNewDateAcquired('')
    setNewExpirationDate('')
    setNewSource('')
    setNewPhotoFiles([])

    // Auto-register vehicle in vehicles table
    if (newItemType.trim().toLowerCase() === 'vehicle') {
      await supabase.from('vehicles').insert([
        {
          vehicle_name: newItemName,
          make_model: newItemName,
          is_serviceable: newCondition.trim().toLowerCase() !== 'defective',
        } as never,
      ])
    }

    // Reload inventory list
    setInventoryLoading(true)
    const { data, error: reloadError } = await supabase.from('inventory').select('*').order('item_id', {
      ascending: false,
    })

    if (reloadError) {
      setInventoryError(reloadError.message)
    } else {
      setInventoryItems(data ?? [])
    }

    setInventoryLoading(false)
    setAddingItem(false)
  }

  const handleQrButtonClick = async (item: InventoryRow) => {
    if (item.qr_code) {
      setViewQrItem(item)
      return
    }

    setQrGeneratingId(item.item_id)
    setInventoryError(null)

    const qrValue = item.uid ?? `ITEM-${item.item_id.toString().padStart(3, '0')}`

    const { data, error: qrError } = await supabase
      .from('inventory')
      .update({ qr_code: qrValue })
      .eq('item_id', item.item_id)
      .select('*')

    if (qrError) {
      setInventoryError(qrError.message)
      setQrGeneratingId(null)
      return
    }

    const updatedItem = (data?.[0] ?? item) as InventoryRow

    setInventoryItems((prev) => prev.map((row) => (row.item_id === updatedItem.item_id ? updatedItem : row)))
    setViewQrItem(updatedItem)
    setQrGeneratingId(null)
  }

  const closeStockpileReleasePage = () => {
    if (releasingStockpile) return
    setStockpileMode('list')
  }

  const openStockpileReleasePage = () => {
    setStockpileError(null)
    setStockpileReleaseItems([{ stockpileId: '', quantity: '' }])
    setStockpileReleaseIssuedToInput('')
    setStockpileReleaseReasonInput('')
    setStockpileMode('release')
  }

  const addStockpileReleaseItem = () => {
    setStockpileReleaseItems((prev) => [...prev, { stockpileId: '', quantity: '' }])
  }

  const updateStockpileReleaseItem = (index: number, field: keyof StockpileReleaseDraftItem, value: string) => {
    setStockpileReleaseItems((prev) => prev.map((item, itemIndex) => (itemIndex === index ? { ...item, [field]: value } : item)))
  }

  const removeStockpileReleaseItem = (index: number) => {
    setStockpileReleaseItems((prev) => (prev.length === 1 ? prev : prev.filter((_, itemIndex) => itemIndex !== index)))
  }

  const handleReleaseStockpile = async () => {
    const validReleaseItems = stockpileReleaseItems
      .map((item, index) => ({ ...item, index }))
      .filter((item) => item.stockpileId.trim() && item.quantity.trim())

    if (!stockpileReleaseIssuedToInput.trim() || !stockpileReleaseReasonInput.trim()) {
      setStockpileError('Issued to and reason are required.')
      return
    }

    if (validReleaseItems.length === 0) {
      setStockpileError('Add at least one stockpile item to release.')
      return
    }

    const groupedReleases = new Map<number, { quantity: number; row: StockpileRow }>()

    for (const item of validReleaseItems) {
      const stockpileId = Number(item.stockpileId)
      const releaseQty = Number(item.quantity)

      if (!Number.isInteger(stockpileId)) {
        setStockpileError(`Line ${item.index + 1}: select a stockpile item.`)
        return
      }

      if (Number.isNaN(releaseQty) || releaseQty <= 0) {
        setStockpileError(`Line ${item.index + 1}: release quantity must be a positive number.`)
        return
      }

      const row = stockpileItems.find((entry) => entry.stockpile_id === stockpileId)
      if (!row) {
        setStockpileError(`Line ${item.index + 1}: selected stockpile item was not found.`)
        return
      }

      const expiration = row.expiration_date ? new Date(row.expiration_date) : null
      const isExpired =
        row.status?.trim() === 'Expired' ||
        (expiration != null && !Number.isNaN(expiration.getTime()) && expiration < new Date())

      if (isExpired) {
        setStockpileError(`Line ${item.index + 1}: expired stockpiles cannot be released.`)
        return
      }

      const nextQuantity = (groupedReleases.get(stockpileId)?.quantity ?? 0) + releaseQty
      const availableQty = Number(row.quantity_on_hand ?? 0)

      if (!Number.isFinite(availableQty) || availableQty <= 0) {
        setStockpileError(`Line ${item.index + 1}: selected item has no quantity on hand.`)
        return
      }

      if (nextQuantity > availableQty) {
        setStockpileError(`Line ${item.index + 1}: release quantity exceeds quantity on hand.`)
        return
      }

      groupedReleases.set(stockpileId, { quantity: nextQuantity, row })
    }

    setReleasingStockpile(true)
    setStockpileError(null)

    const updates = Array.from(groupedReleases.entries()).map(async ([stockpileId, entry]) => {
      const updatedQty = Number(entry.row.quantity_on_hand ?? 0) - entry.quantity
      const result = await supabase.from('inventory').update({ quantity: updatedQty }).eq('item_id', stockpileId)
      return { stockpileId, updatedQty, error: result.error }
    })

    const updateResults = await Promise.all(updates)
    const failedUpdate = updateResults.find((result) => result.error)

    if (failedUpdate) {
      await Promise.all(
        updateResults
          .filter((result) => !result.error)
          .map((result) => supabase.from('inventory').update({ quantity: groupedReleases.get(result.stockpileId)?.row.quantity_on_hand ?? 0 }).eq('item_id', result.stockpileId)),
      )
      setStockpileError(failedUpdate.error?.message ?? 'Unable to update stockpile quantities.')
      setReleasingStockpile(false)
      return
    }

    const { error: insertLogError } = await supabase.from('distribution_logs').insert([
      {
        operation_date: new Date().toISOString().slice(0, 10),
        calamity_name: stockpileReleaseReasonInput.trim(),
        recipient_info: stockpileReleaseIssuedToInput.trim(),
        items_distributed: Array.from(groupedReleases.values()).map((entry) => ({
          item_id: entry.row.stockpile_id,
          stockpile_id: entry.row.stockpile_id,
          item_name: entry.row.item_name,
          quantity: entry.quantity,
          unit_of_measure: entry.row.unit_of_measure,
        })),
      },
    ])

    if (insertLogError) {
      await Promise.all(
        updateResults.map((result) =>
          supabase
            .from('inventory')
            .update({ quantity: groupedReleases.get(result.stockpileId)?.row.quantity_on_hand ?? 0 })
            .eq('item_id', result.stockpileId),
        ),
      )
      setStockpileError(insertLogError.message)
      setReleasingStockpile(false)
      return
    }

    const [{ data: reloadedStockpiles, error: reloadStockpileError }, { data: reloadedLogs, error: reloadLogsError }] =
      await Promise.all([
        supabase
          .from('inventory')
          .select('*')
          .eq('item_type', 'Stockpile')
          .order('item_id', { ascending: false }),
        supabase.from('distribution_logs').select('*').order('log_id', { ascending: false }),
      ])

    if (reloadStockpileError) {
      setStockpileError(reloadStockpileError.message)
    } else {
      setStockpileItems((reloadedStockpiles ?? []).map(mapInventoryItemToStockpileRow))
    }

    if (reloadLogsError) {
      setStockpileError((prev) => prev ?? reloadLogsError.message)
    } else {
      setStockpileReleaseLogs(reloadedLogs ?? [])
    }

    setReleasingStockpile(false)
    setStockpileMode('logs')
    setStockpileReleaseItems([{ stockpileId: '', quantity: '' }])
    setStockpileReleaseIssuedToInput('')
    setStockpileReleaseReasonInput('')
  }

  const handlePrintStockpileReleaseLogs = (period?: ReportPeriod, startDate?: string, endDate?: string) => {
    const rangeStart = startDate ?? reportStartDate
    const rangeEnd = endDate ?? reportEndDate
    const reportSignerName = currentAdminName.trim() || settingsNameInput.trim() || 'Super Admin'

    const rows = parsedStockpileReleaseLogs
      .filter((entry) => {
        if (isArchivedRow(entry.log)) {
          return false
        }
        return isDateWithinReportRange(entry.log.operation_date, rangeStart, rangeEnd)
      })
      .slice()
      .sort((a, b) => b.log.log_id - a.log.log_id)
      .map((entry) => ({
        date: formatInventoryDate(entry.log.operation_date),
        item: entry.itemName || '—',
        quantity: String(entry.quantity),
        unit: entry.unit || '—',
        issuedTo: entry.log.recipient_info ?? '—',
        reason: entry.log.calamity_name ?? '—',
      }))

    const rowsMarkup = rows
      .map(
        (row) =>
          `<tr>
            <td>${escapeHtml(row.date)}</td>
            <td>${escapeHtml(row.item)}</td>
            <td>${escapeHtml(row.quantity)}</td>
            <td>${escapeHtml(row.unit)}</td>
            <td>${escapeHtml(row.issuedTo)}</td>
            <td>${escapeHtml(row.reason)}</td>
          </tr>`,
      )
      .join('')

    const printDocument = `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Stockpile Release Logs</title>
          <style>
            ${getPrintCommonStyles()}
          </style>
        </head>
        <body>
          ${buildPrintReportHeader('STOCKPILE RELEASE LOGS')}
          <p>Printed on ${escapeHtml(new Date().toLocaleString('en-PH'))}</p>
          ${period ? `<p><strong>Period:</strong> ${escapeHtml(getReportPeriodLabel(period))}</p>` : ''}
          <p><strong>Date Range:</strong> ${escapeHtml(getReportDateRangeLabel(rangeStart, rangeEnd))}</p>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Item</th>
                <th>Qty</th>
                <th>Unit</th>
                <th>Issued To</th>
                <th>Reason</th>
              </tr>
            </thead>
            <tbody>
              ${rowsMarkup || '<tr><td colspan="6">No release logs found.</td></tr>'}
            </tbody>
          </table>

          <div class="signatures">
            <div>
              <div class="sign-line"><span class="sign-name">${escapeHtml(reportSignerName)}</span></div>
              <div class="sign-role">Issued by</div>
            </div>
          </div>
        </body>
      </html>
    `

    printHtmlViaIframe(printDocument, setStockpileError)
  }

  const handlePrintInventoryReport = (period?: ReportPeriod, startDate?: string, endDate?: string) => {
    const rangeStart = startDate ?? reportStartDate
    const rangeEnd = endDate ?? reportEndDate
    const reportSignerName = currentAdminName.trim() || settingsNameInput.trim() || 'Super Admin'

    const inventoryRows = inventoryItems
      .filter((item) => {
        if (isArchivedRow(item) || getInventoryStatus(item) === 'Archived') {
          return false
        }

        return isDateWithinReportRange(item.date_acquired ?? item.created_at, rangeStart, rangeEnd)
      })
      .slice()
      .sort((a, b) => a.item_id - b.item_id)
      .map((item) => ({
        itemNo: `ITEM-${item.item_id.toString().padStart(3, '0')}`,
        item: item.item_name,
        type: item.item_type,
        quantity: String(item.quantity ?? '—'),
        unit: item.unit_of_measure ?? '—',
        source: item.acquisition_mode ?? '—',
        condition: item.condition ?? '—',
        status:
          item.item_type.trim().toLowerCase() === 'stockpile'
            ? (() => {
                const expirationDate = item.expiration_date ? new Date(item.expiration_date) : null
                const isExpired = expirationDate != null && !Number.isNaN(expirationDate.getTime()) && expirationDate < new Date()
                return isExpired ? 'Expired' : 'Valid'
              })()
            : item.status ?? '—',
      }))

    const inventoryRowsMarkup = inventoryRows
      .map(
        (row) =>
          `<tr>
            <td>${escapeHtml(row.itemNo)}</td>
            <td>${escapeHtml(row.item)}</td>
            <td>${escapeHtml(row.type)}</td>
            <td>${escapeHtml(row.quantity)}</td>
            <td>${escapeHtml(row.unit)}</td>
            <td>${escapeHtml(row.source)}</td>
            <td>${escapeHtml(row.condition)}</td>
            <td>${escapeHtml(row.status)}</td>
          </tr>`,
      )
      .join('')

    const printDocument = `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Inventory Report</title>
          <style>
            ${getPrintCommonStyles()}
            h2 { margin: 20px 0 8px; font-size: 16px; }
            table { margin-top: 8px; }
            th, td { vertical-align: top; }
            .section { margin-top: 18px; }
          </style>
        </head>
        <body>
          ${buildPrintReportHeader('INVENTORY REPORT')}
          <p>Printed on ${escapeHtml(new Date().toLocaleString('en-PH'))}</p>
          ${period ? `<p><strong>Period:</strong> ${escapeHtml(getReportPeriodLabel(period))}</p>` : ''}
          <p><strong>Date Range:</strong> ${escapeHtml(getReportDateRangeLabel(rangeStart, rangeEnd))}</p>

          <div class="section">
            <h2>Inventory Items</h2>
            <table>
              <thead>
                <tr>
                  <th>Item No.</th>
                  <th>Item</th>
                  <th>Type</th>
                  <th>Qty</th>
                  <th>Unit</th>
                  <th>Source</th>
                  <th>Condition</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                ${inventoryRowsMarkup || '<tr><td colspan="8">No inventory items found.</td></tr>'}
              </tbody>
            </table>
          </div>

          <div class="signatures">
            <div>
              <div class="sign-line"><span class="sign-name">${escapeHtml(reportSignerName)}</span></div>
              <div class="sign-role">Prepared by</div>
            </div>
          </div>
        </body>
      </html>
    `

    printHtmlViaIframe(printDocument, setInventoryError)
  }

  const handlePrintWmrSummary = (period?: ReportPeriod, startDate?: string, endDate?: string) => {
    const rangeStart = startDate ?? reportStartDate
    const rangeEnd = endDate ?? reportEndDate
    const reportSignerName = currentAdminName.trim() || settingsNameInput.trim() || 'Super Admin'

    const allRows = wmrReports
      .filter((report) => {
        if (isArchivedRow(report) || (report.status ?? '').trim() === 'Archived') {
          return false
        }

        if (report.item_id != null) {
          const mappedItem = inventoryItems.find((item) => item.item_id === report.item_id) ?? null
          if (mappedItem && (isArchivedRow(mappedItem) || getInventoryStatus(mappedItem) === 'Archived')) {
            return false
          }
        }

        const fallbackDate =
          report.item_id != null
            ? inventoryItems.find((item) => item.item_id === report.item_id)?.created_at ??
              inventoryItems.find((item) => item.item_id === report.item_id)?.date_acquired ??
              null
            : null

        return isDateWithinReportRange(report.date_reported ?? fallbackDate, rangeStart, rangeEnd)
      })
      .slice()
      .sort((a, b) => a.report_id - b.report_id)
      .map((report) => {
        const mappedItem =
          report.item_id != null ? inventoryItems.find((item) => item.item_id === report.item_id) ?? null : null

        return {
          reportNo: `WMR-${report.report_id.toString().padStart(3, '0')}`,
          description: report.reason_damage?.trim() || mappedItem?.item_name || 'Waste material report',
          type: mappedItem?.item_type || (report.item_id == null ? 'Vehicle' : 'Inventory Item'),
          location:
            report.location?.trim() ||
            (mappedItem?.department_id != null
              ? departments.find((dept) => dept.id === mappedItem.department_id)?.name ?? '—'
              : '—'),
          status: report.status?.trim() || 'Pending',
          dateReported: formatInventoryDate(report.date_reported ?? mappedItem?.created_at ?? mappedItem?.date_acquired),
        }
      })

    const rowsMarkup = allRows
      .map(
        (row) =>
          `<tr>
            <td>${escapeHtml(row.reportNo)}</td>
            <td>${escapeHtml(row.description)}</td>
            <td>${escapeHtml(row.type)}</td>
            <td>${escapeHtml(row.location)}</td>
            <td>${escapeHtml(row.status)}</td>
            <td>${escapeHtml(row.dateReported)}</td>
          </tr>`,
      )
      .join('')

    const printDocument = `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Waste Materials Report Summary</title>
          <style>
            ${getPrintCommonStyles()}
          </style>
        </head>
        <body>
          ${buildPrintReportHeader('WASTE MATERIALS REPORT SUMMARY')}
          <p>Printed on ${escapeHtml(new Date().toLocaleString('en-PH'))}</p>
          ${period ? `<p><strong>Period:</strong> ${escapeHtml(getReportPeriodLabel(period))}</p>` : ''}
          <p><strong>Date Range:</strong> ${escapeHtml(getReportDateRangeLabel(rangeStart, rangeEnd))}</p>
          <table>
            <thead>
              <tr>
                <th>Report No</th>
                <th>Description</th>
                <th>Type</th>
                <th>Location</th>
                <th>Status</th>
                <th>Date Reported</th>
              </tr>
            </thead>
            <tbody>
              ${rowsMarkup || '<tr><td colspan="6">No WMR entries found.</td></tr>'}
            </tbody>
          </table>
          <div class="signatures">
            <div>
              <div class="sign-line"><span class="sign-name">${escapeHtml(reportSignerName)}</span></div>
              <div class="sign-role">Prepared by</div>
            </div>
          </div>
        </body>
      </html>
    `

    printHtmlViaIframe(printDocument, setWmrError)
  }

  const handlePrintVehicleRepairLogs = (period?: ReportPeriod, startDate?: string, endDate?: string) => {
    const rangeStart = startDate ?? reportStartDate
    const rangeEnd = endDate ?? reportEndDate
    const reportSignerName = currentAdminName.trim() || settingsNameInput.trim() || 'Super Admin'

    const rows = vehicleRepairs
      .filter((repair) => {
        if (isArchivedRow(repair)) {
          return false
        }

        const mappedVehicle = repair.vehicle_id != null
          ? vehicles.find((vehicle) => vehicle.id === repair.vehicle_id) ?? null
          : null
        if (mappedVehicle && isArchivedRow(mappedVehicle)) {
          return false
        }

        return isDateWithinReportRange(repair.date_repaired, rangeStart, rangeEnd)
      })
      .slice()
      .sort((a, b) => b.repair_id - a.repair_id)
      .map((repair) => {
        const vehicle = vehicles.find((entry) => entry.id === repair.vehicle_id) ?? null
        const amountValue = Number(repair.amount ?? 0)

        return {
          repairNo: `VR-${repair.repair_id.toString().padStart(3, '0')}`,
          vehicle: vehicle?.make_model ?? `Vehicle ${repair.vehicle_id ?? '—'}`,
          date: formatInventoryDate(repair.date_repaired),
          jobOrder: repair.job_order_number ?? '—',
          serviceCenter: repair.service_center ?? '—',
          remarks: getRepairDescription(repair.repair_id, vehicle?.repair_history_log ?? null),
          amount: formatCurrency(amountValue),
          amountValue,
        }
      })

    const totalRepairCost = rows.reduce((sum, row) => sum + (Number.isFinite(row.amountValue) ? row.amountValue : 0), 0)
    const totalRowMarkup = rows.length
      ? `<tr>
            <td colspan="6" style="text-align:right;"><strong>Total Cost</strong></td>
            <td><strong>${escapeHtml(formatCurrency(totalRepairCost))}</strong></td>
          </tr>`
      : ''

    const rowsMarkup = rows
      .map(
        (row) =>
          `<tr>
            <td>${escapeHtml(row.repairNo)}</td>
            <td>${escapeHtml(row.vehicle)}</td>
            <td>${escapeHtml(row.date)}</td>
            <td>${escapeHtml(row.jobOrder)}</td>
            <td>${escapeHtml(row.serviceCenter)}</td>
            <td>${escapeHtml(row.remarks)}</td>
            <td>${escapeHtml(row.amount)}</td>
          </tr>`,
      )
      .join('')

    const printDocument = `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Vehicle Repair Logs</title>
          <style>
            ${getPrintCommonStyles()}
          </style>
        </head>
        <body>
          ${buildPrintReportHeader('VEHICLE REPAIR LOGS')}
          <p>Printed on ${escapeHtml(new Date().toLocaleString('en-PH'))}</p>
          ${period ? `<p><strong>Period:</strong> ${escapeHtml(getReportPeriodLabel(period))}</p>` : ''}
          <p><strong>Date Range:</strong> ${escapeHtml(getReportDateRangeLabel(rangeStart, rangeEnd))}</p>
          <table>
            <thead>
              <tr>
                <th>Repair No</th>
                <th>Vehicle</th>
                <th>Date Repaired</th>
                <th>Job Order</th>
                <th>Service Center</th>
                <th>Remarks</th>
                <th>Cost</th>
              </tr>
            </thead>
            <tbody>
              ${rowsMarkup || '<tr><td colspan="7">No repair logs found.</td></tr>'}
              ${totalRowMarkup}
            </tbody>
          </table>
          <div class="signatures">
            <div>
              <div class="sign-line"><span class="sign-name">${escapeHtml(reportSignerName)}</span></div>
              <div class="sign-role">Prepared by</div>
            </div>
          </div>
        </body>
      </html>
    `

    printHtmlViaIframe(printDocument, setVehicleError)
  }

  const getCsvTimestamp = () => new Date().toISOString().slice(0, 10)

  const handleExportInventoryCsv = () => {
    const rows = filteredInventoryItems.map((item) => ({
      item_id: item.item_id,
      item_name: item.item_name,
      item_type: item.item_type,
      department_id: item.department_id ?? '',
      department_name: departments.find((dept) => dept.id === item.department_id)?.name ?? '',
      quantity: item.quantity ?? '',
      unit_of_measure: item.unit_of_measure ?? '',
      unit_cost: item.unit_cost ?? '',
      date_acquired: item.date_acquired ?? '',
      expiration_date: item.expiration_date ?? '',
      acquisition_mode: item.acquisition_mode ?? '',
      status: getInventoryStatus(item) ?? '',
      condition: item.condition ?? '',
      donor_identification: (item as InventoryRow & { donor_identification?: string | null }).donor_identification ?? '',
    }))

    downloadCsv(`inventory-${getCsvTimestamp()}.csv`, rows)
  }

  const handleImportInventoryCsv = async (file: File) => {
    try {
      const csvRows = await parseCsvFile(file)
      if (csvRows.length === 0) {
        setInventoryError('The selected CSV file has no data rows.')
        return
      }

      const detectedHeaders = Array.from(
        csvRows.reduce((headerSet, row) => {
          Object.keys(row).forEach((key) => headerSet.add(key))
          return headerSet
        }, new Set<string>()),
      )

      const orderedHeaders = [
        ...INVENTORY_IMPORT_DEFAULT_HEADERS.filter((header) => detectedHeaders.includes(header)),
        ...detectedHeaders.filter((header) => !INVENTORY_IMPORT_DEFAULT_HEADERS.includes(header)),
      ]

      const finalHeaders = orderedHeaders.length > 0 ? orderedHeaders : INVENTORY_IMPORT_DEFAULT_HEADERS
      const normalizedRows = csvRows.map((row) =>
        finalHeaders.reduce<Record<string, string>>((acc, header) => {
          acc[header] = row[header] ?? ''
          return acc
        }, {}),
      )

      setInventoryImportHeaders(finalHeaders)
      setInventoryImportRows(normalizedRows)
      setInventoryImportError(null)
    } catch (error) {
      setInventoryError(error instanceof Error ? error.message : 'Failed to import inventory CSV.')
    }
  }

  const closeInventoryImportModal = () => {
    if (inventoryImportSaving) return
    setInventoryImportRows([])
    setInventoryImportHeaders([])
    setInventoryImportError(null)
  }

  const updateInventoryImportCell = (rowIndex: number, header: string, value: string) => {
    setInventoryImportRows((prev) =>
      prev.map((row, index) => (index === rowIndex ? { ...row, [header]: value } : row)),
    )
  }

  const removeInventoryImportRow = (rowIndex: number) => {
    setInventoryImportRows((prev) => prev.filter((_, index) => index !== rowIndex))
  }

  const addInventoryImportRow = () => {
    setInventoryImportRows((prev) => [
      ...prev,
      inventoryImportHeaders.reduce<Record<string, string>>((acc, header) => {
        acc[header] = ''
        return acc
      }, {}),
    ])
  }

  const saveInventoryImportRows = async () => {
    if (inventoryImportRows.length === 0) {
      setInventoryImportError('There are no rows to import.')
      return
    }

    setInventoryImportSaving(true)
    setInventoryImportError(null)

    const stockpileRoomDepartmentId =
      departments.find((dept) => dept.name.trim().toLowerCase() === 'stockpile room')?.id ?? null
    const payload: Array<Record<string, unknown>> = []
    let skippedRows = 0

    for (const row of inventoryImportRows) {
      const itemName = (row.item_name ?? row.name ?? '').trim()
      const itemType = (row.item_type ?? '').trim() || 'Office Equipment'

      if (!itemName) {
        skippedRows += 1
        continue
      }

      const deptIdFromCsv = parseIntegerInput(row.department_id)
      const deptName = (row.department_name ?? row.location ?? '').trim().toLowerCase()
      const deptCode = (row.department_code ?? row.location_code ?? '').trim().toLowerCase()
      const deptIdFromName = deptName
        ? departments.find((dept) => dept.name.trim().toLowerCase() === deptName)?.id ?? null
        : null
      const deptIdFromCode = deptCode
        ? departments.find((dept) => dept.code.trim().toLowerCase() === deptCode)?.id ?? null
        : null
      const isStockpileType = itemType.trim().toLowerCase() === 'stockpile'
      const resolvedDepartmentId =
        deptIdFromCsv ?? deptIdFromName ?? deptIdFromCode ?? (isStockpileType ? stockpileRoomDepartmentId : null)

      if (resolvedDepartmentId == null) {
        skippedRows += 1
        continue
      }

      const expirationDate = (row.expiration_date ?? '').trim() || null
      const expirationValue = parseDateLikeValue(expirationDate)
      const isExpired = expirationValue != null && expirationValue < new Date()
      const csvStatus = (row.status ?? '').trim() || null

      const uid = crypto.randomUUID()
      payload.push({
        uid,
        qr_code: uid,
        item_name: itemName,
        item_type: itemType,
        department_id: resolvedDepartmentId,
        quantity: parseNumericInput(row.quantity ?? '') ?? 0,
        unit_of_measure: (row.unit_of_measure ?? '').trim() || null,
        unit_cost: parseNumericInput(row.unit_cost ?? ''),
        date_acquired: (row.date_acquired ?? '').trim() || new Date().toISOString().slice(0, 10),
        expiration_date: isStockpileType ? expirationDate : null,
        acquisition_mode: (row.acquisition_mode ?? row.source ?? '').trim() || null,
        status: isStockpileType ? (isExpired || csvStatus === 'Expired' ? 'Expired' : null) : csvStatus,
        condition: (row.condition ?? '').trim() || null,
        donor_identification: (row.donor_identification ?? '').trim() || null,
      })
    }

    if (payload.length === 0) {
      setInventoryImportSaving(false)
      setInventoryImportError('No valid rows found to import. Fill in required fields like item_name and location.')
      return
    }

    const { error: insertError } = await supabase.from('inventory').insert(payload as never)
    if (insertError) {
      setInventoryImportSaving(false)
      setInventoryImportError(insertError.message)
      return
    }

    setInventoryImportSaving(false)
    setRealtimeTick((tick) => tick + 1)
    closeInventoryImportModal()
    window.alert(`Imported ${payload.length} inventory row(s).${skippedRows > 0 ? ` Skipped ${skippedRows} invalid row(s).` : ''}`)
  }

  const handleExportStockpileCsv = () => {
    const rows = filteredStockpileItems.map((item) => ({
      stockpile_id: item.stockpile_id,
      item_name: item.item_name ?? '',
      category: item.category ?? '',
      quantity_on_hand: item.quantity_on_hand ?? '',
      unit_of_measure: item.unit_of_measure ?? '',
      packed_date: item.packed_date ?? '',
      expiration_date: item.expiration_date ?? '',
      status: item.status ?? '',
      department_name: 'Stockpile Room',
    }))

    downloadCsv(`stockpile-${getCsvTimestamp()}.csv`, rows)
  }

  const handleImportStockpileCsv = async (file: File) => {
    try {
      const csvRows = await parseCsvFile(file)
      if (csvRows.length === 0) {
        setStockpileError('The selected CSV file has no data rows.')
        return
      }

      const stockpileRoomDepartmentId = departments.find((dept) => dept.name.trim().toLowerCase() === 'stockpile room')?.id ?? null
      if (stockpileRoomDepartmentId == null) {
        setStockpileError('Stockpile Room department is missing. Create it first before importing stockpile CSV.')
        return
      }

      const payload: Array<Record<string, unknown>> = []
      let skippedRows = 0

      for (const row of csvRows) {
        const itemName = (row.item_name ?? '').trim()
        if (!itemName) {
          skippedRows += 1
          continue
        }

        const expirationDate = (row.expiration_date ?? '').trim() || null
        const expirationValue = parseDateLikeValue(expirationDate)
        const isExpired = expirationValue != null && expirationValue < new Date()
        const uid = crypto.randomUUID()

        payload.push({
          uid,
          qr_code: uid,
          item_name: itemName,
          item_type: 'Stockpile',
          department_id: stockpileRoomDepartmentId,
          quantity: parseNumericInput(row.quantity_on_hand ?? row.quantity ?? '') ?? 0,
          unit_of_measure: (row.unit_of_measure ?? '').trim() || null,
          unit_cost: parseNumericInput(row.unit_cost ?? ''),
          date_acquired: (row.packed_date ?? row.date_acquired ?? '').trim() || new Date().toISOString().slice(0, 10),
          expiration_date: expirationDate,
          acquisition_mode: (row.category ?? row.acquisition_mode ?? '').trim() || null,
          status: isExpired ? 'Expired' : null,
          condition: (row.condition ?? '').trim() || null,
          donor_identification: (row.donor_identification ?? '').trim() || null,
        })
      }

      if (payload.length === 0) {
        setStockpileError('No valid stockpile rows were found in CSV.')
        return
      }

      const { error: insertError } = await supabase.from('inventory').insert(payload as never)
      if (insertError) {
        setStockpileError(insertError.message)
        return
      }

      setRealtimeTick((tick) => tick + 1)
      window.alert(`Imported ${payload.length} stockpile row(s).${skippedRows > 0 ? ` Skipped ${skippedRows} invalid row(s).` : ''}`)
    } catch (error) {
      setStockpileError(error instanceof Error ? error.message : 'Failed to import stockpile CSV.')
    }
  }

  const handleExportWmrCsv = () => {
    const rows = [
      ...filteredWasteItems.map((item) => {
        const report = wmrReports.find((entry) => entry.item_id === item.item_id)
        return {
          report_id: report?.report_id ?? '',
          item_id: item.item_id,
          item_name: item.item_name,
          type: item.item_type,
          quantity_reported: report?.quantity_reported ?? '',
          reason_damage: report?.reason_damage ?? '',
          status: report?.status ?? '',
          location: report?.location ?? departments.find((dept) => dept.id === item.department_id)?.name ?? '',
          admin_remarks: report?.admin_remarks ?? '',
          date_reported: report?.date_reported ?? item.created_at ?? item.date_acquired ?? '',
        }
      }),
      ...filteredStaffWmrReports.map((report) => {
        const linkedItem = report.item_id ? inventoryItems.find((item) => item.item_id === report.item_id) : null
        return {
          report_id: report.report_id,
          item_id: report.item_id ?? '',
          item_name: linkedItem?.item_name ?? '',
          type: linkedItem?.item_type ?? 'Staff Report',
          quantity_reported: report.quantity_reported ?? '',
          reason_damage: report.reason_damage ?? '',
          status: report.status ?? '',
          location: report.location ?? '',
          admin_remarks: report.admin_remarks ?? '',
          date_reported: report.date_reported ?? '',
        }
      }),
      ...filteredVehicleWmrReports.map((report) => ({
        report_id: report.report_id,
        item_id: '',
        item_name: report.location?.replace('Vehicle Registry - ', '') ?? 'Vehicle',
        type: 'Vehicle',
        quantity_reported: report.quantity_reported ?? '',
        reason_damage: report.reason_damage ?? '',
        status: report.status ?? '',
        location: report.location ?? '',
        admin_remarks: report.admin_remarks ?? '',
        date_reported: report.date_reported ?? '',
      })),
    ]

    downloadCsv(`wmr-${getCsvTimestamp()}.csv`, rows)
  }

  const handleImportWmrCsv = async (file: File) => {
    try {
      const csvRows = await parseCsvFile(file)
      if (csvRows.length === 0) {
        setWmrError('The selected CSV file has no data rows.')
        return
      }

      const payload: Array<Record<string, unknown>> = []
      let skippedRows = 0

      for (const row of csvRows) {
        const itemId = parseIntegerInput(row.item_id)
        const reason = (row.reason_damage ?? '').trim() || null
        const status = (row.status ?? '').trim() || 'Pending'
        const dateReported = (row.date_reported ?? '').trim() || new Date().toISOString().slice(0, 10)

        if (!reason && itemId == null) {
          skippedRows += 1
          continue
        }

        payload.push({
          item_id: itemId,
          quantity_reported: parseIntegerInput(row.quantity_reported) ?? 1,
          reason_damage: reason,
          status,
          location: (row.location ?? '').trim() || null,
          admin_remarks: (row.admin_remarks ?? '').trim() || null,
          date_reported: dateReported,
        })
      }

      if (payload.length === 0) {
        setWmrError('No valid WMR rows were found in CSV.')
        return
      }

      const { error: insertError } = await supabase.from('wmr_reports').insert(payload)
      if (insertError) {
        setWmrError(insertError.message)
        return
      }

      setRealtimeTick((tick) => tick + 1)
      window.alert(`Imported ${payload.length} WMR row(s).${skippedRows > 0 ? ` Skipped ${skippedRows} invalid row(s).` : ''}`)
    } catch (error) {
      setWmrError(error instanceof Error ? error.message : 'Failed to import WMR CSV.')
    }
  }

  const handleExportVehiclesCsv = () => {
    const rows = activeVehicles.map((vehicle) => ({
      id: vehicle.id,
      vehicle_name: vehicle.vehicle_name ?? '',
      make_model: vehicle.make_model ?? '',
      color: vehicle.color ?? '',
      year_model: vehicle.year_model ?? '',
      cr_number: vehicle.cr_number ?? '',
      engine_number: vehicle.engine_number ?? '',
      is_serviceable: vehicle.is_serviceable ?? true,
      repair_history_log: vehicle.repair_history_log ?? '',
    }))

    downloadCsv(`vehicles-${getCsvTimestamp()}.csv`, rows)
  }

  const handleImportVehiclesCsv = async (file: File) => {
    try {
      const csvRows = await parseCsvFile(file)
      if (csvRows.length === 0) {
        setVehicleError('The selected CSV file has no data rows.')
        return
      }

      const payload: Array<Record<string, unknown>> = []
      let skippedRows = 0

      for (const row of csvRows) {
        const vehicleName = (row.vehicle_name ?? '').trim()
        const makeModel = (row.make_model ?? '').trim()

        if (!vehicleName && !makeModel) {
          skippedRows += 1
          continue
        }

        payload.push({
          vehicle_name: vehicleName || makeModel,
          make_model: makeModel || null,
          color: (row.color ?? '').trim() || null,
          year_model: parseIntegerInput(row.year_model),
          cr_number: (row.cr_number ?? '').trim() || null,
          engine_number: (row.engine_number ?? '').trim() || null,
          is_serviceable: parseBooleanInput(row.is_serviceable, true),
          repair_history_log: (row.repair_history_log ?? '').trim() || null,
        })
      }

      if (payload.length === 0) {
        setVehicleError('No valid vehicle rows were found in CSV.')
        return
      }

      const { error: insertError } = await supabase.from('vehicles').insert(payload as never)
      if (insertError) {
        setVehicleError(insertError.message)
        return
      }

      setRealtimeTick((tick) => tick + 1)
      window.alert(`Imported ${payload.length} vehicle row(s).${skippedRows > 0 ? ` Skipped ${skippedRows} invalid row(s).` : ''}`)
    } catch (error) {
      setVehicleError(error instanceof Error ? error.message : 'Failed to import vehicles CSV.')
    }
  }

  const handleExportParCsv = () => {
    const activeParRecordsForExport = parRecords.filter((record) => !isArchivedRow(record))
    const rows = activeParRecordsForExport.map((record) => ({
      par_id: record.par_id,
      issued_to_id: record.issued_to_id ?? '',
      issued_to_name: parUsers.find((user) => user.id === record.issued_to_id)?.full_name ?? '',
      item_id: record.item_id ?? '',
      item_name: inventoryItems.find((item) => item.item_id === record.item_id)?.item_name ?? '',
      quantity_issued: record.quantity_issued ?? '',
      issue_date: record.issue_date ?? '',
      unit_snapshot: record.unit_snapshot ?? '',
      description_snapshot: record.description_snapshot ?? '',
      property_no_snapshot: record.property_no_snapshot ?? '',
      date_acquired_snapshot: record.date_acquired_snapshot ?? '',
      cost_snapshot: record.cost_snapshot ?? '',
      contact_snapshot: record.contact_snapshot ?? '',
    }))

    downloadCsv(`par-records-${getCsvTimestamp()}.csv`, rows)
  }

  const handleImportParCsv = async (file: File) => {
    try {
      const csvRows = await parseCsvFile(file)
      if (csvRows.length === 0) {
        setParError('The selected CSV file has no data rows.')
        return
      }

      const validUserIds = new Set(parUsers.map((user) => user.id))
      const validItemIds = new Set(inventoryItems.map((item) => item.item_id))
      const payload: Array<Record<string, unknown>> = []
      let skippedRows = 0

      for (const row of csvRows) {
        const issuedToId = (row.issued_to_id ?? '').trim()
        const itemId = parseIntegerInput(row.item_id)
        const quantityIssued = parseIntegerInput(row.quantity_issued) ?? 0

        if (!issuedToId || itemId == null || quantityIssued <= 0) {
          skippedRows += 1
          continue
        }

        if (!validUserIds.has(issuedToId) || !validItemIds.has(itemId)) {
          skippedRows += 1
          continue
        }

        payload.push({
          issued_to_id: issuedToId,
          item_id: itemId,
          quantity_issued: quantityIssued,
          issue_date: (row.issue_date ?? '').trim() || null,
          unit_snapshot: (row.unit_snapshot ?? '').trim() || null,
          description_snapshot: (row.description_snapshot ?? '').trim() || null,
          property_no_snapshot: (row.property_no_snapshot ?? '').trim() || null,
          date_acquired_snapshot: (row.date_acquired_snapshot ?? '').trim() || null,
          cost_snapshot: parseNumericInput(row.cost_snapshot ?? ''),
          contact_snapshot: (row.contact_snapshot ?? '').trim() || null,
        })
      }

      if (payload.length === 0) {
        setParError('No valid PAR rows were found in CSV.')
        return
      }

      const { error: insertError } = await supabase.from('par_records').insert(payload as never)
      if (insertError) {
        setParError(insertError.message)
        return
      }

      setRealtimeTick((tick) => tick + 1)
      window.alert(`Imported ${payload.length} PAR row(s).${skippedRows > 0 ? ` Skipped ${skippedRows} invalid row(s).` : ''}`)
    } catch (error) {
      setParError(error instanceof Error ? error.message : 'Failed to import PAR CSV.')
    }
  }

  const filteredStockpileItems = stockpileItems.filter((item) => {
    const explicitStatus = item.status?.trim() || null
    const expiration = item.expiration_date ? new Date(item.expiration_date) : null
    const isExpired =
      explicitStatus === 'Expired' ||
      (expiration != null && !Number.isNaN(expiration.getTime()) && expiration < today)
    return !isExpired
  }).sort((a, b) => b.stockpile_id - a.stockpile_id)

  const filteredExpiredStockpileItems = stockpileItems.filter((item) => {
    const explicitStatus = item.status?.trim() || null
    const expiration = item.expiration_date ? new Date(item.expiration_date) : null
    const isExpired =
      explicitStatus === 'Expired' ||
      (expiration != null && !Number.isNaN(expiration.getTime()) && expiration < today)

    return isExpired
  }).sort((a, b) => b.stockpile_id - a.stockpile_id)

  const availableReleaseStockpileItems = stockpileItems.filter((item) => {
    const explicitStatus = item.status?.trim() || null
    const expiration = item.expiration_date ? new Date(item.expiration_date) : null
    return !(
      explicitStatus === 'Expired' ||
      (expiration != null && !Number.isNaN(expiration.getTime()) && expiration < today)
    )
  })

  const parsedStockpileReleaseLogs: StockpileReleaseLog[] = stockpileReleaseLogs.flatMap((log) => {
    if (!Array.isArray(log.items_distributed)) return []

    return log.items_distributed.flatMap((rawItem): StockpileReleaseLog[] => {
      if (!rawItem || typeof rawItem !== 'object' || Array.isArray(rawItem)) return []

      const row = rawItem as Record<string, unknown>
      const quantity = Number(row.quantity)
      const itemName = typeof row.item_name === 'string' ? row.item_name : ''
      const unit = typeof row.unit_of_measure === 'string' ? row.unit_of_measure : ''

      if (Number.isNaN(quantity)) return []

      return [
        {
          log,
          itemName,
          unit,
          quantity,
        },
      ]
    })
  }).sort((a, b) => b.log.log_id - a.log.log_id)

  const reportInventoryCount =
    inventoryItems.filter((item) => {
      if (isArchivedRow(item) || getInventoryStatus(item) === 'Archived') {
        return false
      }

      return isDateWithinReportRange(item.date_acquired ?? item.created_at, reportStartDate, reportEndDate)
    }).length

  const reportWmrCount = wmrReports.filter((report) => {
    if (isArchivedRow(report) || (report.status ?? '').trim() === 'Archived') {
      return false
    }

    if (report.item_id != null) {
      const mappedItem = inventoryItems.find((item) => item.item_id === report.item_id) ?? null
      if (mappedItem && (isArchivedRow(mappedItem) || getInventoryStatus(mappedItem) === 'Archived')) {
        return false
      }
    }

    const fallbackDate =
      report.item_id != null
        ? inventoryItems.find((item) => item.item_id === report.item_id)?.created_at ??
          inventoryItems.find((item) => item.item_id === report.item_id)?.date_acquired ??
          null
        : null

    return isDateWithinReportRange(report.date_reported ?? fallbackDate, reportStartDate, reportEndDate)
  }).length

  const reportVehicleRepairCount = vehicleRepairs.filter((repair) => {
    if (isArchivedRow(repair)) {
      return false
    }

    const mappedVehicle = repair.vehicle_id != null
      ? vehicles.find((vehicle) => vehicle.id === repair.vehicle_id) ?? null
      : null
    if (mappedVehicle && isArchivedRow(mappedVehicle)) {
      return false
    }

    return isDateWithinReportRange(repair.date_repaired, reportStartDate, reportEndDate)
  }).length

  const reportStockpileReleaseCount = parsedStockpileReleaseLogs.filter((entry) =>
    !isArchivedRow(entry.log) &&
    isDateWithinReportRange(entry.log.operation_date, reportStartDate, reportEndDate),
  ).length

  const parsedReportStartDate = parseDateLikeValue(reportStartDate)
  const parsedReportEndDate = parseDateLikeValue(reportEndDate)
  const reportDateRangeInvalid =
    parsedReportStartDate != null &&
    parsedReportEndDate != null &&
    parsedReportStartDate.getTime() > parsedReportEndDate.getTime()
  const reportsErrorMessage = reportDateRangeInvalid
    ? 'Invalid date range. "From" date must not be later than "To" date.'
    : activeReportsError

  const newItemQuantityValue = parseNumericInput(newQuantity)
  const newItemUnitCostValue = parseNumericInput(newUnitCost)
  const newItemTotalCost = calculateTotalCost(newItemQuantityValue, newItemUnitCostValue)

  const editItemQuantityValue = parseNumericInput(editQuantity)
  const editItemUnitCostValue = parseNumericInput(editUnitCost)
  const editItemTotalCost = calculateTotalCost(editItemQuantityValue, editItemUnitCostValue)
  const editItemExpirationValue = parseDateLikeValue(editExpirationDate)
  const editStatusPreview = (() => {
    if (editItemType.trim().toLowerCase() !== 'stockpile') return editStatus || ''

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    if (editItemExpirationValue) {
      editItemExpirationValue.setHours(0, 0, 0, 0)
      if (editItemExpirationValue < today) return 'Expired'
    }

    return editItemQuantityValue != null && editItemQuantityValue <= 10 ? 'Low' : 'Full Stock'
  })()

  const parQuantityValue = parseNumericInput(parQuantityIssued)
  const parUnitCostValue = parseNumericInput(parCostInput)
  const parLineTotal = calculateTotalCost(parQuantityValue, parUnitCostValue)

  // [RENDER] Main layout and section tabs
  return (
    <div className={`dashboard-page ${isSidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      <Sidebar
        activeSection={activeSection}
        onChangeSection={setActiveSection}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed((prev) => !prev)}
        displayName={currentAdminPosition || currentAdminName}
      />

      <main className="dashboard-main">
        {activeSection === 'dashboard' && (
          <>
            <header className="dashboard-header">
              <div>
                <h2>Dashboard</h2>
                <p>Welcome back, {currentAdminFirstName || currentAdminLastName ? `${currentAdminFirstName} ${currentAdminLastName}`.trim() : currentAdminName}</p>
              </div>
            </header>

            {error && <p className="dashboard-error">{error}</p>}

            <section className="dashboard-metrics" aria-label="Item summary">
              <article
                className="metric-card metric-card-clickable"
                role="button"
                tabIndex={0}
                onClick={() => setDashboardMetricDrilldown('total')}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    setDashboardMetricDrilldown('total')
                  }
                }}
              >
                <div className="metric-text">
                  <div className="metric-label">Total Items</div>
                  <div className="metric-value">{formatValue(summary.totalItems)}</div>
                </div>
                <div className="metric-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                    <path
                      d="M7 8l5-3 5 3-5 3-5-3Z M7 8v6l5 3 5-3V8 M7 14l5 3 5-3 M12 11v6"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.4"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              </article>
              <article
                className="metric-card metric-card-serviceable metric-card-clickable"
                role="button"
                tabIndex={0}
                onClick={() => setDashboardMetricDrilldown('serviceable')}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    setDashboardMetricDrilldown('serviceable')
                  }
                }}
              >
                <div className="metric-text">
                  <div className="metric-label">Serviceable</div>
                  <div className="metric-value">{formatValue(summary.serviceable)}</div>
                </div>
                <div className="metric-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                    <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.8" />
                    <path
                      d="M8.5 12.5l2.2 2.2L15.5 10"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              </article>
              <article
                className="metric-card metric-card-unserviceable metric-card-clickable"
                role="button"
                tabIndex={0}
                onClick={() => setDashboardMetricDrilldown('unserviceable')}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    setDashboardMetricDrilldown('unserviceable')
                  }
                }}
              >
                <div className="metric-text">
                  <div className="metric-label">Unserviceable</div>
                  <div className="metric-value">{formatValue(summary.unserviceable)}</div>
                </div>
                <div className="metric-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                    <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.4" />
                    <path d="M8 8l8 8" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                  </svg>
                </div>
              </article>
              <article
                className="metric-card dashboard-source-card dashboard-source-card-purchased metric-card-clickable"
                role="button"
                tabIndex={0}
                onClick={() => setDashboardMetricDrilldown('purchased')}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    setDashboardMetricDrilldown('purchased')
                  }
                }}
              >
                <div className="metric-text">
                  <div className="dashboard-source-card-label">Purchased</div>
                  <div className="dashboard-source-card-value">{formatValue(purchasedCount)}</div>
                </div>
                <div className="metric-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                    <path
                      d="M6 8.5h12l-1 10.5H7L6 8.5Zm2.2 0V7.2A3.8 3.8 0 0 1 12 3.4a3.8 3.8 0 0 1 3.8 3.8v1.3"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              </article>
              <article
                className="metric-card dashboard-source-card dashboard-source-card-donated metric-card-clickable"
                role="button"
                tabIndex={0}
                onClick={() => setDashboardMetricDrilldown('donated')}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    setDashboardMetricDrilldown('donated')
                  }
                }}
              >
                <div className="metric-text">
                  <div className="dashboard-source-card-label">Donated</div>
                  <div className="dashboard-source-card-value">{formatValue(donatedCount)}</div>
                </div>
                <div className="metric-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                    <path
                      d="M12 21s-6.8-4.3-9-8.8C1.2 8.9 3.2 5.5 6.8 5.2c1.9-.2 3.8.8 5.2 2.5 1.4-1.7 3.3-2.7 5.2-2.5 3.6.3 5.6 3.7 3.8 7-2.2 4.5-9 8.8-9 8.8Z"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              </article>
              <article
                className="metric-card metric-card-low-stock metric-card-clickable"
                role="button"
                tabIndex={0}
                onClick={() => setDashboardMetricDrilldown('low')}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    setDashboardMetricDrilldown('low')
                  }
                }}
              >
                <div className="metric-text">
                  <div className="metric-label">Low Stock</div>
                  <div className="metric-value">{formatValue(lowStockCount)}</div>
                </div>
                <div className="metric-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                    <path
                      d="M12 4v10m0 0-3.2-3.2M12 14l3.2-3.2M5 20h14"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              </article>
              <article
                className="metric-card metric-card-full-stock metric-card-clickable"
                role="button"
                tabIndex={0}
                onClick={() => setDashboardMetricDrilldown('fullStock')}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    setDashboardMetricDrilldown('fullStock')
                  }
                }}
              >
                <div className="metric-text">
                  <div className="metric-label">Full Stock</div>
                  <div className="metric-value">{formatValue(fullStockCount)}</div>
                </div>
                <div className="metric-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                    <path
                      d="M4.5 12.5 9 17l10.5-10.5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              </article>
              <article
                className="metric-card metric-card-unserviceable metric-card-clickable"
                role="button"
                tabIndex={0}
                onClick={() => setDashboardMetricDrilldown('expired')}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    setDashboardMetricDrilldown('expired')
                  }
                }}
              >
                <div className="metric-text">
                  <div className="metric-label">Expired Items</div>
                  <div className="metric-value">{formatValue(dashboardExpiredCount)}</div>
                </div>
                <div className="metric-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                    <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.4" />
                    <path
                      d="M12 8v4l3 2"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              </article>
            </section>

          <section className="dashboard-row" aria-label="Charts">
          <article className="panel" aria-label="Stockpile Status">
            <header className="panel-header">
              <h3>Stockpile Status</h3>
            </header>
            <div className="panel-body chart-panel-body">
              {stockpileStatusChartData.length === 0 ? (
                <div className="panel-body-placeholder">No stockpile data to chart yet.</div>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={stockpileStatusChartData} margin={{ top: 8, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="count" name="Stockpile Items" radius={[6, 6, 0, 0]}>
                      {stockpileStatusChartData.map((entry) => (
                        <Cell
                          key={`stockpile-status-${entry.name}`}
                          fill={STOCKPILE_STATUS_COLORS[entry.name] ?? '#0284c7'}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </article>
          <article className="panel" aria-label="Items by Type (Top 5)">
            <header className="panel-header">
              <h3>Items by Type (Top 5)</h3>
            </header>
            <div className="panel-body chart-panel-body">
              {itemsByTypeTopFive.length === 0 ? (
                <div className="panel-body-placeholder">No inventory data to chart yet.</div>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={itemsByTypeTopFive}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={84}
                      labelLine={false}
                      label={({ percent }) => `${((percent ?? 0) * 100).toFixed(0)}%`}
                    >
                      {itemsByTypeTopFive.map((entry, index) => (
                        <Cell key={`type-cell-${entry.name}`} fill={TYPE_CHART_COLORS[index % TYPE_CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </article>
          </section>

          <section className="dashboard-row" aria-label="Department overview">
          <article className="panel panel-wide">
            <header className="panel-header">
              <h3>Department Overview</h3>
            </header>
            <div className="panel-body department-grid">
              {visibleDepartments.map((dept) => (
                <div key={dept.id} className="dept-card">
                  <h4>{dept.name}</h4>
                  <div className="dept-metrics">
                    <div className="dept-metric">
                      <span className="dept-metric-label">Total Items</span>
                      <span className="dept-metric-value">{formatValue(dept.totalItems)}</span>
                    </div>
                    <div className="dept-metric dept-metric-serviceable">
                      <span className="dept-metric-label">Serviceable</span>
                      <span className="dept-metric-value">{formatValue(dept.serviceable)}</span>
                    </div>
                    <div className="dept-metric dept-metric-unserviceable">
                      <span className="dept-metric-label">Unserviceable</span>
                      <span className="dept-metric-value">{formatValue(dept.unserviceable)}</span>
                    </div>
                  </div>
                  <p className="dept-footer">
                    {formatValue(dept.staffCount)} staff members • {formatValue(dept.onlineCount)} online
                  </p>
                </div>
              ))}
            </div>
          </article>
            </section>
          </>
        )}

        {activeSection === 'inventory' && (
          <InventorySection
            loading={loading}
            totalItems={summary.totalItems}
            formatValue={formatValue}
            inventoryError={inventoryError}
            inventoryMode={inventoryMode}
            setInventoryMode={setInventoryMode}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            typeFilter={typeFilter}
            setTypeFilter={setTypeFilter}
            departmentFilter={departmentFilter}
            setDepartmentFilter={setDepartmentFilter}
            sourceFilter={sourceFilter}
            setSourceFilter={setSourceFilter}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            typeOptions={typeOptions}
            departments={departments.map((dept) => ({ id: dept.id, name: dept.name, code: dept.code }))}
            sourceOptions={acquisitionModeOptions}
            statusOptions={statusOptions}
            inventoryLoading={inventoryLoading}
            filteredInventoryItems={filteredInventoryItems}
            getItemStatus={getInventoryStatus}
            getItemPhotoUrls={getItemPhotoUrls}
            formatInventoryDate={formatInventoryDate}
            openEditItem={openEditItem}
            setViewImageItem={setViewImageItem}
            setViewImageIndex={setViewImageIndex}
            handleQrButtonClick={handleQrButtonClick}
            qrGeneratingId={qrGeneratingId}
            editDeleting={editDeleting}
            openArchiveConfirmation={openArchiveConfirmation}
            formatCurrency={formatCurrency}
            calculateTotalCost={calculateTotalCost}
            newItemName={newItemName}
            setNewItemName={setNewItemName}
            newItemType={newItemType}
            setNewItemType={setNewItemType}
            newCondition={newCondition}
            setNewCondition={setNewCondition}
            newDonorIdentification={newDonorIdentification}
            setNewDonorIdentification={setNewDonorIdentification}
            newItemDepartmentId={newItemDepartmentId}
            setNewItemDepartmentId={setNewItemDepartmentId}
            newQuantity={newQuantity}
            setNewQuantity={setNewQuantity}
            newUnitOfMeasure={newUnitOfMeasure}
            setNewUnitOfMeasure={setNewUnitOfMeasure}
            newUnitCost={newUnitCost}
            setNewUnitCost={setNewUnitCost}
            newDateAcquired={newDateAcquired}
            setNewDateAcquired={setNewDateAcquired}
            newExpirationDate={newExpirationDate}
            setNewExpirationDate={setNewExpirationDate}
            newSource={newSource}
            setNewSource={setNewSource}
            newPhotoFiles={newPhotoFiles}
            setNewPhotoFiles={setNewPhotoFiles}
            addPhotoInputRef={addPhotoInputRef}
            addingItem={addingItem}
            handleAddItem={handleAddItem}
            unitOfMeasureOptions={unitOfMeasureOptions}
            acquisitionModeOptions={acquisitionModeOptions}
            newItemTotalCost={newItemTotalCost}
            onExportCsv={handleExportInventoryCsv}
            onImportCsv={handleImportInventoryCsv}
          />
        )}

        {activeSection === 'settings' && (
          <div className="inventory-layout" aria-label="Settings">
            <header className="dashboard-header">
              <div>
                <h2>Settings</h2>
                <p>Manage your profile and account settings</p>
              </div>
            </header>

            <section className="inventory-toolbar" aria-label="Settings sections">
              <button
                type="button"
                className={settingsTab === 'profile' ? 'inventory-primary-button' : 'inventory-secondary-button'}
                onClick={() => setSettingsTab('profile')}
              >
                Profile
              </button>
              <button
                type="button"
                className={settingsTab === 'archive' ? 'inventory-primary-button' : 'inventory-secondary-button'}
                onClick={() => setSettingsTab('archive')}
              >
                Archive
              </button>
            </section>

            {settingsErrorMessage && <p className="dashboard-error">{settingsErrorMessage}</p>}
            {settingsSuccessMessage && <p style={{ color: '#15803d', fontSize: 13 }}>{settingsSuccessMessage}</p>}

            {settingsTab === 'profile' && (
              <>
                <section className="inventory-add-section" aria-label="Profile settings">
                  <div className="inventory-add-card">
                    <h3 className="inventory-add-title">Profile</h3>
                    {settingsProfileLoading ? (
                      <p style={{ margin: 0, color: '#6b7280', fontSize: 13 }}>Loading profile…</p>
                    ) : (
                      <>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                          {/* Row 1: First Name | Last Name */}
                          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                            <div className="inventory-field" style={{ width: 200 }}>
                              <label htmlFor="settings-first-name">First Name</label>
                              <input
                                id="settings-first-name"
                                className="inventory-input"
                                value={settingsFirstNameInput}
                                onChange={(e) => setSettingsFirstNameInput(e.target.value)}
                                placeholder="First name"
                              />
                            </div>
                            <div className="inventory-field" style={{ width: 200 }}>
                              <label htmlFor="settings-last-name">Last Name</label>
                              <input
                                id="settings-last-name"
                                className="inventory-input"
                                value={settingsLastNameInput}
                                onChange={(e) => setSettingsLastNameInput(e.target.value)}
                                placeholder="Last name"
                              />
                            </div>
                          </div>
                          {/* Row 2: Position | User ID */}
                          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                            <div className="inventory-field" style={{ width: 200 }}>
                              <label htmlFor="settings-position">Position</label>
                              <input
                                id="settings-position"
                                className="inventory-input"
                                value={settingsPositionInput}
                                onChange={(e) => setSettingsPositionInput(e.target.value)}
                                placeholder="Enter position"
                              />
                            </div>
                            <div className="inventory-field" style={{ width: 200 }}>
                              <label>User ID</label>
                              <input className="inventory-input" value={settingsStaffId || '—'} readOnly style={{ background: '#f8fafc' }} />
                            </div>
                          </div>
                        </div>
                        <div className="inventory-add-actions">
                          <button
                            type="button"
                            className="inventory-add-submit"
                            onClick={() => { void handleSaveSettingsName() }}
                            disabled={settingsNameSaving || settingsProfileLoading}
                          >
                            {settingsNameSaving ? 'Saving…' : 'Save Profile'}
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </section>

                <section className="inventory-add-section" aria-label="Change password">
                  <div className="inventory-add-card">
                    <h3 className="inventory-add-title">Change Password</h3>
                    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                      <div className="inventory-field" style={{ width: 200 }}>
                        <label htmlFor="settings-new-password">New Password</label>
                        <input
                          id="settings-new-password"
                          type="password"
                          className="inventory-input"
                          value={settingsPasswordInput}
                          onChange={(e) => setSettingsPasswordInput(e.target.value)}
                          placeholder="At least 8 characters"
                        />
                      </div>
                      <div className="inventory-field" style={{ width: 200 }}>
                        <label htmlFor="settings-confirm-password">Confirm Password</label>
                        <input
                          id="settings-confirm-password"
                          type="password"
                          className="inventory-input"
                          value={settingsConfirmPasswordInput}
                          onChange={(e) => setSettingsConfirmPasswordInput(e.target.value)}
                          placeholder="Retype new password"
                        />
                      </div>
                    </div>
                    <div className="inventory-add-actions">
                      <button
                        type="button"
                        className="inventory-add-submit"
                        onClick={() => { void handleChangeSettingsPassword() }}
                        disabled={settingsPasswordSaving || settingsProfileLoading}
                      >
                        {settingsPasswordSaving ? 'Updating…' : 'Update Password'}
                      </button>
                    </div>
                  </div>
                </section>
              </>
            )}

            {settingsTab === 'archive' && (
              <div style={{ display: 'grid', gap: 14 }}>
                <section className="archive-bookmark-strip" aria-label="Archive table selector" role="tablist">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={archiveTableSelector === 'inventory'}
                    className={`archive-bookmark-tab ${archiveTableSelector === 'inventory' ? 'archive-bookmark-tab-active' : ''}`}
                    onClick={() => setArchiveTableSelector('inventory')}
                  >
                    Inventory
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={archiveTableSelector === 'wmr'}
                    className={`archive-bookmark-tab ${archiveTableSelector === 'wmr' ? 'archive-bookmark-tab-active' : ''}`}
                    onClick={() => setArchiveTableSelector('wmr')}
                  >
                    WMR
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={archiveTableSelector === 'par'}
                    className={`archive-bookmark-tab ${archiveTableSelector === 'par' ? 'archive-bookmark-tab-active' : ''}`}
                    onClick={() => setArchiveTableSelector('par')}
                  >
                    PAR
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={archiveTableSelector === 'vehicles'}
                    className={`archive-bookmark-tab ${archiveTableSelector === 'vehicles' ? 'archive-bookmark-tab-active' : ''}`}
                    onClick={() => setArchiveTableSelector('vehicles')}
                  >
                    Vehicles
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={archiveTableSelector === 'staff'}
                    className={`archive-bookmark-tab ${archiveTableSelector === 'staff' ? 'archive-bookmark-tab-active' : ''}`}
                    onClick={() => setArchiveTableSelector('staff')}
                  >
                    Staff
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={archiveTableSelector === 'departments'}
                    className={`archive-bookmark-tab ${archiveTableSelector === 'departments' ? 'archive-bookmark-tab-active' : ''}`}
                    onClick={() => setArchiveTableSelector('departments')}
                  >
                    Departments
                  </button>
                </section>

                {showArchiveTable('inventory') && (
                  <section className="inventory-table-section inventory-table-section-compact archive-table-panel" aria-label="Archived inventory">
                    <div className="inventory-table-card">
                      <div className="inventory-table-title">
                        <h4 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#111827' }}>Archived Inventory ({archivedInventoryItems.length})</h4>
                      </div>
                      {archivedInventoryItems.length === 0 ? (
                        <p style={{ margin: 0, color: '#6b7280', fontSize: 13, padding: '0 16px 16px' }}>No archived inventory items.</p>
                      ) : (
                        <div style={{ overflowX: 'auto' }}>
                          <table className="inventory-table">
                            <thead>
                              <tr>
                                <th scope="col">ID</th>
                                <th scope="col">Name</th>
                                <th scope="col">Type</th>
                                <th scope="col">Qty</th>
                                <th scope="col">Date Acquired</th>
                                <th scope="col">Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {archivedInventoryItems.map((item) => (
                                <tr key={`archived-${item.item_id}`}>
                                  <td>{`ITEM-${item.item_id.toString().padStart(3, '0')}`}</td>
                                  <td>{item.item_name}</td>
                                  <td>{item.item_type}</td>
                                  <td>{item.quantity ?? '—'}</td>
                                  <td>{formatDisplayDate(item.date_acquired)}</td>
                                  <td><span className="badge">Archived</span></td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </section>
                )}

                {showArchiveTable('wmr') && (
                  <section className="inventory-table-section inventory-table-section-compact archive-table-panel" aria-label="Archived WMR reports">
                    <div className="inventory-table-card">
                      <div className="inventory-table-title">
                        <h4 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#111827' }}>Archived WMR Reports ({archivedWmrReports.length})</h4>
                      </div>
                      {archivedWmrReports.length === 0 ? (
                        <p style={{ margin: 0, color: '#6b7280', fontSize: 13, padding: '0 16px 16px' }}>No archived WMR reports.</p>
                      ) : (
                        <div style={{ overflowX: 'auto' }}>
                          <table className="inventory-table">
                            <thead>
                              <tr>
                                <th scope="col">Report ID</th>
                                <th scope="col">Item</th>
                                <th scope="col">Type</th>
                                <th scope="col">Location</th>
                                <th scope="col">Date Reported</th>
                                <th scope="col">Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {archivedWmrReports.map((report) => {
                                const mappedItem = report.item_id != null
                                  ? inventoryItems.find((item) => item.item_id === report.item_id)
                                  : null
                                const itemLabel = report.item_id == null
                                  ? report.location?.replace('Vehicle Registry - ', '') || 'Vehicle'
                                  : mappedItem?.item_name ?? '—'

                                return (
                                  <tr key={`archived-wmr-${report.report_id}`}>
                                    <td>{`WMR-${report.report_id.toString().padStart(3, '0')}`}</td>
                                    <td>{itemLabel}</td>
                                    <td>{report.item_id == null ? 'Vehicle' : mappedItem?.item_type ?? 'Inventory Item'}</td>
                                    <td>{report.location ?? '—'}</td>
                                    <td>{formatDisplayDate(report.date_reported)}</td>
                                    <td><span className="badge">Archived</span></td>
                                  </tr>
                                )
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </section>
                )}

                {showArchiveTable('par') && (
                  <section className="inventory-table-section inventory-table-section-compact archive-table-panel" aria-label="Archived PAR records">
                    <div className="inventory-table-card">
                      <div className="inventory-table-title">
                        <h4 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#111827' }}>Archived PAR Records ({archivedParRecords.length})</h4>
                      </div>
                      {archivedParRecords.length === 0 ? (
                        <p style={{ margin: 0, color: '#6b7280', fontSize: 13, padding: '0 16px 16px' }}>No archived PAR records.</p>
                      ) : (
                        <div style={{ overflowX: 'auto' }}>
                          <table className="inventory-table">
                            <thead>
                              <tr>
                                <th scope="col">PAR ID</th>
                                <th scope="col">Issued To</th>
                                <th scope="col">Item</th>
                                <th scope="col">Quantity</th>
                                <th scope="col">Issue Date</th>
                                <th scope="col">Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {archivedParRecords.map((record) => {
                                const issuedTo = parUsers.find((user) => user.id === record.issued_to_id)
                                const mappedItem = inventoryItems.find((item) => item.item_id === record.item_id)

                                return (
                                  <tr key={`archived-par-${record.par_id}`}>
                                    <td>{`PAR-${record.par_id.toString().padStart(3, '0')}`}</td>
                                    <td>{issuedTo?.full_name ?? record.issued_to_id ?? '—'}</td>
                                    <td>{record.description_snapshot ?? mappedItem?.item_name ?? '—'}</td>
                                    <td>{record.quantity_issued ?? 0}</td>
                                    <td>{formatDisplayDate(record.issue_date)}</td>
                                    <td><span className="badge">Archived</span></td>
                                  </tr>
                                )
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </section>
                )}

                {showArchiveTable('vehicles') && (
                  <section className="inventory-table-section inventory-table-section-compact archive-table-panel" aria-label="Archived vehicles">
                    <div className="inventory-table-card">
                      <div className="inventory-table-title">
                        <h4 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#111827' }}>Archived Vehicles ({archivedVehicles.length})</h4>
                      </div>
                      {archivedVehicles.length === 0 ? (
                        <p style={{ margin: 0, color: '#6b7280', fontSize: 13, padding: '0 16px 16px' }}>No archived vehicles.</p>
                      ) : (
                        <div style={{ overflowX: 'auto' }}>
                          <table className="inventory-table">
                            <thead>
                              <tr>
                                <th scope="col">Vehicle ID</th>
                                <th scope="col">Make / Model</th>
                                <th scope="col">Year</th>
                                <th scope="col">CR Number</th>
                                <th scope="col">Engine Number</th>
                                <th scope="col">Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {archivedVehicles.map((vehicle) => (
                                <tr key={`archived-veh-${vehicle.id}`}>
                                  <td>{`VEH-${vehicle.id.toString().padStart(3, '0')}`}</td>
                                  <td>{vehicle.make_model ?? '—'}</td>
                                  <td>{vehicle.year_model ?? '—'}</td>
                                  <td>{vehicle.cr_number ?? '—'}</td>
                                  <td>{vehicle.engine_number ?? '—'}</td>
                                  <td><span className="badge">Archived</span></td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </section>
                )}

                {showArchiveTable('staff') && (
                  <section className="inventory-table-section inventory-table-section-compact archive-table-panel" aria-label="Archived staff">
                    <div className="inventory-table-card">
                      <div className="inventory-table-title">
                        <h4 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#111827' }}>Archived Staff ({archivedStaff.length})</h4>
                      </div>
                      {archivedStaff.length === 0 ? (
                        <p style={{ margin: 0, color: '#6b7280', fontSize: 13, padding: '0 16px 16px' }}>No archived staff records.</p>
                      ) : (
                        <div style={{ overflowX: 'auto' }}>
                          <table className="inventory-table">
                            <thead>
                              <tr>
                                <th scope="col">Staff ID</th>
                                <th scope="col">Name</th>
                                <th scope="col">Email</th>
                                <th scope="col">Department</th>
                                <th scope="col">Position</th>
                                <th scope="col">Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {archivedStaff.map((staff) => (
                                <tr key={`archived-staff-${staff.id}`}>
                                  <td>{staff.staff_id}</td>
                                  <td>{staff.full_name}</td>
                                  <td>{staff.email}</td>
                                  <td>{departments.find((dept) => dept.id === staff.department_id)?.name ?? 'Unassigned'}</td>
                                  <td>{staff.position ?? '—'}</td>
                                  <td><span className="badge">Archived</span></td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </section>
                )}

                {showArchiveTable('departments') && (
                  <section className="inventory-table-section inventory-table-section-compact archive-table-panel" aria-label="Archived departments">
                    <div className="inventory-table-card">
                      <div className="inventory-table-title">
                        <h4 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#111827' }}>Archived Departments ({archivedDepartments.length})</h4>
                      </div>
                      {archivedDepartments.length === 0 ? (
                        <p style={{ margin: 0, color: '#6b7280', fontSize: 13, padding: '0 16px 16px' }}>No archived departments.</p>
                      ) : (
                        <div style={{ overflowX: 'auto' }}>
                          <table className="inventory-table">
                            <thead>
                              <tr>
                                <th scope="col">Department Code</th>
                                <th scope="col">Department Name</th>
                                <th scope="col">Total Items</th>
                                <th scope="col">Serviceable</th>
                                <th scope="col">Unserviceable</th>
                                <th scope="col">Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {archivedDepartments.map((dept) => (
                                <tr key={`archived-dept-${dept.id}`}>
                                  <td>{dept.code}</td>
                                  <td>{dept.name}</td>
                                  <td>{formatValue(dept.totalItems)}</td>
                                  <td>{formatValue(dept.serviceable)}</td>
                                  <td>{formatValue(dept.unserviceable)}</td>
                                  <td><span className="badge">Archived</span></td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </section>
                )}
              </div>
            )}

          </div>
        )}

        {activeSection === 'departments-staff' && (
          <div className="inventory-layout" aria-label="Departments and staff management">
            <header className="dashboard-header">
              <div>
                <h2>Departments &amp; Staff</h2>
                <p>{loading ? 'Loading…' : `${formatValue(parUsers.length)} total staff registered`}</p>
              </div>
            </header>

            {departmentError && <p className="dashboard-error">{departmentError}</p>}
            {departmentSuccess && <p style={{ color: '#15803d', fontSize: 13 }}>{departmentSuccess}</p>}
            {staffError && <p className="dashboard-error">{staffError}</p>}
            {staffSuccess && <p style={{ color: '#15803d', fontSize: 13 }}>{staffSuccess}</p>}

            <section className="inventory-toolbar" aria-label="Departments and staff actions">
              <button
                type="button"
                className={departmentStaffMode === 'manage-staff' ? 'inventory-primary-button' : 'inventory-secondary-button'}
                onClick={() => setDepartmentStaffMode('manage-staff')}
              >
                Manage Staff
              </button>
              <button
                type="button"
                className={departmentStaffMode === 'manage-department' ? 'inventory-primary-button' : 'inventory-secondary-button'}
                onClick={() => setDepartmentStaffMode('manage-department')}
              >
                Manage Department
              </button>
              <button
                type="button"
                className={departmentStaffMode === 'add-staff' ? 'inventory-primary-button' : 'inventory-secondary-button'}
                onClick={() => {
                  setDepartmentStaffMode('add-staff')
                  resetStaffForm()
                }}
              >
                Add Staff
              </button>
              <button
                type="button"
                className={departmentStaffMode === 'add-department' ? 'inventory-primary-button' : 'inventory-secondary-button'}
                onClick={() => {
                  setDepartmentStaffMode('add-department')
                  resetDepartmentForm()
                }}
              >
                Add Department
              </button>
            </section>

            {departmentStaffMode === 'add-department' && (
              <section className="inventory-add-section" aria-label="Add or edit department">
                <div className="inventory-add-card">
                  <h3 className="inventory-add-title">
                    {departmentFormMode === 'edit' ? 'Edit Department' : 'Add Department'}
                  </h3>
                  <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                    <div className="inventory-field" style={{ width: 240 }}>
                      <label>Department Name</label>
                      <input
                        className="inventory-input"
                        value={newDepartmentName}
                        onChange={(e) => {
                          setNewDepartmentName(e.target.value)
                          setNewDepartmentCode(buildDepartmentCode(e.target.value))
                        }}
                        placeholder="e.g. Rescue Department"
                      />
                    </div>
                    <div className="inventory-field" style={{ width: 140 }}>
                      <label>Department Code</label>
                      <input
                        className="inventory-input"
                        value={newDepartmentCode}
                        onChange={(e) => setNewDepartmentCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                        placeholder="Auto-generated"
                        style={{ fontWeight: 600, letterSpacing: '0.05em' }}
                      />
                    </div>
                  </div>
                  <div className="inventory-add-actions">
                    <button
                      type="button"
                      className="inventory-add-submit"
                      onClick={() => { void handleSaveDepartment() }}
                      disabled={addingDepartment}
                    >
                      {addingDepartment
                        ? departmentFormMode === 'edit' ? 'Saving…' : 'Adding…'
                        : departmentFormMode === 'edit' ? 'Save Department' : 'Add Department'}
                    </button>
                    {departmentFormMode === 'edit' && (
                      <button
                        type="button"
                        className="inventory-secondary-button"
                        onClick={resetDepartmentForm}
                        disabled={addingDepartment}
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              </section>
            )}

            {(departmentStaffMode === 'add-staff' || (departmentStaffMode === 'manage-staff' && staffFormMode === 'edit')) && (
              <section className="inventory-add-section" aria-label="Add or edit staff">
                <div className="inventory-add-card">
                  <h3 className="inventory-add-title">
                    {staffFormMode === 'edit' ? 'Edit Staff' : 'Add Staff'}
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

                    {/* Section: Personal Information */}
                    <div>
                      <p style={{ margin: '0 0 10px', fontSize: 12, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Personal Information</p>
                      {/* Row 1: First Name | Last Name */}
                      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 16 }}>
                        <div className="inventory-field" style={{ width: 180 }}>
                          <label>First Name</label>
                          <input className="inventory-input" value={staffFormFirstName} onChange={(e) => setStaffFormFirstName(e.target.value)} />
                        </div>
                        <div className="inventory-field" style={{ width: 180 }}>
                          <label>Last Name</label>
                          <input className="inventory-input" value={staffFormLastName} onChange={(e) => setStaffFormLastName(e.target.value)} />
                        </div>
                      </div>
                      {/* Row 2: Department | Position | Role */}
                      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                        <div className="inventory-field" style={{ width: 260 }}>
                          <label>Department</label>
                          <select
                            className="inventory-input"
                            value={staffFormDepartmentId}
                            onChange={(e) => handleAddStaffDepartmentChange(e.target.value)}
                          >
                            <option value="">Select department</option>
                            {visibleDepartments.map((dept) => (
                              <option key={`staff-dept-${dept.id}`} value={String(dept.id)}>
                                {dept.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="inventory-field" style={{ width: 180 }}>
                          <label>Position</label>
                          <input className="inventory-input" value={staffFormPosition} onChange={(e) => setStaffFormPosition(e.target.value)} />
                        </div>
                        <div className="inventory-field" style={{ width: 180 }}>
                          <label>Role</label>
                          <select
                            className="inventory-input"
                            value={staffFormRole}
                            onChange={(e) => setStaffFormRole(e.target.value)}
                          >
                            <option value="Staff">Staff</option>
                            <option value="Admin">Admin</option>
                            {isCurrentUserSuperAdmin && staffFormMode === 'edit' && <option value="Super Admin">Super Admin</option>}
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Section: Contact Information */}
                    <div>
                      <p style={{ margin: '0 0 10px', fontSize: 12, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Contact Information</p>
                      {/* Row 3: Email | System Email (edit) / Default Password (add) */}
                      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 16 }}>
                        <div className="inventory-field" style={{ width: 180 }}>
                          <label>
                            Email{staffFormMode === 'add' && <span style={{ color: '#dc2626', marginLeft: 2 }}>*</span>}
                          </label>
                          <input
                            type="email"
                            className="inventory-input"
                            value={staffFormRecoveryEmail}
                            onChange={(e) => setStaffFormRecoveryEmail(e.target.value)}
                          />
                        </div>
                        {staffFormMode === 'edit' ? (
                          <div className="inventory-field" style={{ width: 180 }}>
                            <label>System Email</label>
                            <div style={{ padding: '8px 10px', minHeight: 38, color: '#111827', fontSize: 13, lineHeight: 1.4 }}>
                              {buildStaffEmail(staffFormStaffId) || '—'}
                            </div>
                          </div>
                        ) : (
                          <div className="inventory-field" style={{ width: 180 }}>
                            <label>Default Password</label>
                            <input
                              className="inventory-input"
                              value={DEFAULT_STAFF_INITIAL_PASSWORD}
                              readOnly
                              style={{ fontWeight: 500, background: '#f8fafc' }}
                            />
                          </div>
                        )}
                      </div>
                      {/* Row 4: Contact No. | Emergency Contact */}
                      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                        <div className="inventory-field" style={{ width: 180 }}>
                          <label>Contact No.</label>
                          <input className="inventory-input" value={staffFormContact} onChange={(e) => setStaffFormContact(e.target.value)} />
                        </div>
                        <div className="inventory-field" style={{ width: 180 }}>
                          <label>Emergency Contact</label>
                          <input className="inventory-input" value={staffFormEmergencyContact} onChange={(e) => setStaffFormEmergencyContact(e.target.value)} />
                        </div>
                      </div>
                    </div>

                  </div>
                  <div className="inventory-add-actions">
                    <button
                      type="button"
                      className="inventory-add-submit"
                      onClick={() => { void handleSaveStaff() }}
                      disabled={staffSaving}
                    >
                      {staffSaving ? 'Saving…' : staffFormMode === 'edit' ? 'Save Changes' : 'Add Staff'}
                    </button>
                    {staffFormMode === 'edit' && (
                      <button
                        type="button"
                        className="inventory-add-cancel"
                        onClick={handleCancelStaffEdit}
                        disabled={staffSaving}
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              </section>
            )}

            {departmentStaffMode === 'manage-staff' && (
              <>
                <section className="inventory-table-section inventory-table-section-compact" aria-label="Manage staff table">
                  <div className="inventory-table-card">
                  <div className="inventory-table-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                    <h4 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#111827' }}>Staff Information</h4>
                    <select
                      className="inventory-input"
                      value={staffDepartmentFilter}
                      onChange={(e) => setStaffDepartmentFilter(e.target.value)}
                      style={{ maxWidth: 260 }}
                    >
                      <option value="all">All Departments</option>
                      {visibleDepartments.map((dept) => (
                        <option key={`staff-filter-${dept.id}`} value={String(dept.id)}>
                          {dept.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <table className="inventory-table staff-table">
                    <thead>
                      <tr>
                        <th scope="col">Staff ID</th>
                        <th scope="col">Name</th>
                        <th scope="col">Email</th>
                        <th scope="col">Department</th>
                        <th scope="col">Position</th>
                        <th scope="col">Role</th>
                        <th scope="col">Status</th>
                        <th scope="col">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredDepartmentStaff.length === 0 ? (
                        <tr>
                          <td colSpan={8}>No staff records found for this department.</td>
                        </tr>
                      ) : (
                        paginatedDepartmentStaff.map((user) => {
                          const departmentName =
                            departments.find((dept) => dept.id === user.department_id)?.name ?? 'Unassigned'

                          return (
                            <tr key={`staff-row-${user.id}`}>
                              <td>{user.staff_id}</td>
                              <td>{user.full_name}</td>
                              <td>{user.email}</td>
                              <td>{departmentName}</td>
                              <td>{user.position ?? '—'}</td>
                              <td>{mapStaffRoleToOption(user.role)}</td>
                              <td>{user.is_locked ? 'Locked' : 'Active'}</td>
                              <td>
                                <div className="staff-actions">
                                  <div className="staff-actions-main">
                                    <button
                                      type="button"
                                      className="staff-action-icon-button"
                                      title="Edit"
                                      aria-label="Edit"
                                      onClick={() => {
                                        startEditStaff(user)
                                        setDepartmentStaffMode('manage-staff')
                                      }}
                                      disabled={staffUpdatingId === user.id || !canEditUser(user)}
                                    >
                                      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                                        <path
                                          d="M5 19l2-0.3 9.1-9.1-1.7-1.7L5.3 17 5 19z"
                                          fill="none"
                                          stroke="currentColor"
                                          strokeWidth="1.6"
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                        />
                                        <path
                                          d="M14.8 6l1.8-1.8a1.4 1.4 0 012 2L18 8"
                                          fill="none"
                                          stroke="currentColor"
                                          strokeWidth="1.6"
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                        />
                                      </svg>
                                    </button>
                                    <button
                                      type="button"
                                      className="staff-action-icon-button"
                                      title="View QR"
                                      aria-label="View QR"
                                      onClick={() => {
                                        void handleStaffQrButtonClick(user)
                                      }}
                                      disabled={staffUpdatingId === user.id}
                                    >
                                      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                                        <rect x="4" y="4" width="6" height="6" fill="none" stroke="currentColor" strokeWidth="1.6" />
                                        <rect x="14" y="4" width="6" height="6" fill="none" stroke="currentColor" strokeWidth="1.6" />
                                        <rect x="4" y="14" width="6" height="6" fill="none" stroke="currentColor" strokeWidth="1.6" />
                                        <path d="M14 14h2v2h-2zM18 14h2v2h-2zM16 18h2v2h-2z" fill="currentColor" />
                                      </svg>
                                    </button>
                                    <button
                                      type="button"
                                      className="staff-action-icon-button"
                                      title={user.is_locked ? 'Unlock' : 'Lock'}
                                      aria-label={user.is_locked ? 'Unlock' : 'Lock'}
                                      onClick={() => {
                                        void handleToggleStaffLock(user)
                                      }}
                                      disabled={staffUpdatingId === user.id}
                                    >
                                      {user.is_locked ? (
                                        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                                          <rect x="5" y="10" width="14" height="9" rx="2" ry="2" fill="none" stroke="currentColor" strokeWidth="1.6" />
                                          <path d="M8 10V8a4 4 0 018 0v2" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                                          <path d="M12 13v3" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                                        </svg>
                                      ) : (
                                        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                                          <rect x="5" y="10" width="14" height="9" rx="2" ry="2" fill="none" stroke="currentColor" strokeWidth="1.6" />
                                          <path d="M8 10V8a4 4 0 018 0v2" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                                          <path d="M12 13v3" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                                        </svg>
                                      )}
                                    </button>
                                    <button
                                      type="button"
                                      className="inventory-icon-button"
                                      title="Archive"
                                      aria-label="Archive"
                                      onClick={() => {
                                          openArchiveStaffConfirmation(user)
                                      }}
                                      disabled={staffUpdatingId === user.id}
                                    >
                                      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                                        <path
                                          d="M4 6h16v4H4z"
                                          fill="none"
                                          stroke="currentColor"
                                          strokeWidth="1.6"
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                        />
                                        <path
                                          d="M6 10h12v9H6z"
                                          fill="none"
                                          stroke="currentColor"
                                          strokeWidth="1.6"
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                        />
                                        <path
                                          d="M9 13h6M12 13v4"
                                          fill="none"
                                          stroke="currentColor"
                                          strokeWidth="1.4"
                                          strokeLinecap="round"
                                        />
                                      </svg>
                                    </button>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )
                        })
                      )}
                    </tbody>
                  </table>
                  </div>
                </section>

                {filteredDepartmentStaff.length > STAFF_PAGE_SIZE && (
                  <div className="inventory-pagination" aria-label="Staff pagination">
                    <div className="inventory-pagination-controls">
                      <button
                        type="button"
                        className="inventory-pagination-button inventory-pagination-circle"
                        onClick={() => setStaffPage((prev) => Math.max(1, prev - 1))}
                        disabled={staffPage === 1}
                        aria-label="Previous page"
                      >
                        <svg viewBox="0 0 24 24" width="8" height="8" aria-hidden="true" focusable="false">
                          <path d="M15 6l-6 6 6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </button>

                      {visibleStaffPageNumbers.map((pageNumber) => (
                        <button
                          key={pageNumber}
                          type="button"
                          className={`inventory-pagination-button inventory-pagination-circle ${
                            pageNumber === staffPage ? 'inventory-pagination-circle-active' : ''
                          }`}
                          onClick={() => setStaffPage(pageNumber)}
                          aria-label={`Page ${pageNumber}`}
                          aria-current={pageNumber === staffPage ? 'page' : undefined}
                        >
                          {pageNumber}
                        </button>
                      ))}

                      <button
                        type="button"
                        className="inventory-pagination-button inventory-pagination-circle"
                        onClick={() => setStaffPage((prev) => Math.min(staffTotalPages, prev + 1))}
                        disabled={staffPage === staffTotalPages}
                        aria-label="Next page"
                      >
                        <svg viewBox="0 0 24 24" width="8" height="8" aria-hidden="true" focusable="false">
                          <path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}

            {departmentStaffMode === 'manage-department' && (
              <>
                <section className="inventory-table-section inventory-table-section-compact" aria-label="Manage department table">
                  <div className="inventory-table-card">
                  <div className="inventory-table-title">
                    <h4 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#111827' }}>Department Information</h4>
                  </div>
                  <table className="inventory-table">
                    <thead>
                      <tr>
                        <th scope="col">Department Code</th>
                        <th scope="col">Department Name</th>
                        <th scope="col">Total Items</th>
                        <th scope="col">Serviceable</th>
                        <th scope="col">Unserviceable</th>
                        <th scope="col">Staff Members</th>
                        <th scope="col">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleDepartments.length === 0 ? (
                        <tr>
                          <td colSpan={7}>No departments found.</td>
                        </tr>
                      ) : (
                        paginatedDepartments.map((dept) => (
                          <tr key={`dept-manage-${dept.id}`}>
                            <td>{dept.code}</td>
                            <td>{dept.name}</td>
                            <td>{formatValue(dept.totalItems)}</td>
                            <td>{formatValue(dept.serviceable)}</td>
                            <td>{formatValue(dept.unserviceable)}</td>
                            <td>{formatValue(departmentStaffCountMap.get(dept.id) ?? 0)}</td>
                            <td>
                              <div className="staff-actions">
                                <div className="staff-actions-main">
                                  <button
                                    type="button"
                                    className="staff-action-icon-button"
                                    title="Edit"
                                    aria-label="Edit"
                                    onClick={() => {
                                      startEditDepartment(dept)
                                      setDepartmentStaffMode('add-department')
                                    }}
                                    disabled={departmentUpdatingId === dept.id}
                                  >
                                    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                                      <path
                                        d="M5 19l2-0.3 9.1-9.1-1.7-1.7L5.3 17 5 19z"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="1.6"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                      />
                                      <path
                                        d="M14.8 6l1.8-1.8a1.4 1.4 0 012 2L18 8"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="1.6"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                      />
                                    </svg>
                                  </button>
                                  <button
                                    type="button"
                                    className="inventory-icon-button"
                                    title="Archive"
                                    aria-label="Archive"
                                    onClick={() => {
                                      openArchiveDepartmentConfirmation(dept)
                                    }}
                                    disabled={departmentUpdatingId === dept.id}
                                  >
                                    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                                      <path
                                        d="M4 6h16v4H4z"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="1.6"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                      />
                                      <path
                                        d="M6 10h12v9H6z"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="1.6"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                      />
                                      <path
                                        d="M9 13h6M12 13v4"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="1.4"
                                        strokeLinecap="round"
                                      />
                                    </svg>
                                  </button>
                                </div>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                  </div>
                </section>

                {departments.length > DEPARTMENT_PAGE_SIZE && (
                  <div className="inventory-pagination" aria-label="Department pagination">
                    <div className="inventory-pagination-controls">
                      <button
                        type="button"
                        className="inventory-pagination-button inventory-pagination-circle"
                        onClick={() => setDepartmentPage((prev) => Math.max(1, prev - 1))}
                        disabled={departmentPage === 1}
                        aria-label="Previous page"
                      >
                        <svg viewBox="0 0 24 24" width="8" height="8" aria-hidden="true" focusable="false">
                          <path d="M15 6l-6 6 6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </button>

                      {visibleDepartmentPageNumbers.map((pageNumber) => (
                        <button
                          key={pageNumber}
                          type="button"
                          className={`inventory-pagination-button inventory-pagination-circle ${
                            pageNumber === departmentPage ? 'inventory-pagination-circle-active' : ''
                          }`}
                          onClick={() => setDepartmentPage(pageNumber)}
                          aria-label={`Page ${pageNumber}`}
                          aria-current={pageNumber === departmentPage ? 'page' : undefined}
                        >
                          {pageNumber}
                        </button>
                      ))}

                      <button
                        type="button"
                        className="inventory-pagination-button inventory-pagination-circle"
                        onClick={() => setDepartmentPage((prev) => Math.min(departmentTotalPages, prev + 1))}
                        disabled={departmentPage === departmentTotalPages}
                        aria-label="Next page"
                      >
                        <svg viewBox="0 0 24 24" width="8" height="8" aria-hidden="true" focusable="false">
                          <path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {activeSection === 'stockpile' && (
          <StockpileSection
            loading={loading}
            totalStockpiles={stockpileItems.length}
            formatValue={formatValue}
            stockpileError={stockpileError}
            stockpileMode={stockpileMode}
            setStockpileMode={setStockpileMode}
            openReleasePage={openStockpileReleasePage}
            stockpileLoading={stockpileLoading || stockpileReleaseLoading}
            filteredStockpileItems={filteredStockpileItems}
            filteredExpiredStockpileItems={filteredExpiredStockpileItems}
            stockpileReleaseLogs={parsedStockpileReleaseLogs}
              stockpileReleaseItems={stockpileReleaseItems}
              setStockpileReleaseIssuedToInput={setStockpileReleaseIssuedToInput}
              stockpileReleaseIssuedToInput={stockpileReleaseIssuedToInput}
              setStockpileReleaseReasonInput={setStockpileReleaseReasonInput}
              stockpileReleaseReasonInput={stockpileReleaseReasonInput}
              availableReleaseItems={availableReleaseStockpileItems}
              addStockpileReleaseItem={addStockpileReleaseItem}
              updateStockpileReleaseItem={updateStockpileReleaseItem}
              removeStockpileReleaseItem={removeStockpileReleaseItem}
              closeStockpileReleasePage={closeStockpileReleasePage}
              handleReleaseStockpile={handleReleaseStockpile}
              releasingStockpile={releasingStockpile}
            handlePrintReleaseLogs={handlePrintStockpileReleaseLogs}
            formatDisplayDate={formatDisplayDate}
            onExportCsv={handleExportStockpileCsv}
            onImportCsv={handleImportStockpileCsv}
          />
        )}

        {activeSection === 'wmr' && (
          <WmrSection
            wmrLoading={wmrLoading}
            inventoryLoading={inventoryLoading}
            wmrError={wmrError}
            wasteInventoryItemsCount={wasteInventoryItems.length}
            vehicleWmrReportsCount={vehicleWmrReports.length}
            staffWmrReportsCount={staffWmrReports.filter((r) => !wasteInventoryItems.some((i) => i.item_id === r.item_id)).length}
            wmrSearchQuery={wmrSearchQuery}
            setWmrSearchQuery={setWmrSearchQuery}
            wmrTypeFilter={wmrTypeFilter}
            setWmrTypeFilter={setWmrTypeFilter}
            wmrDepartmentFilter={wmrDepartmentFilter}
            setWmrDepartmentFilter={setWmrDepartmentFilter}
            wmrStatusFilter={wmrStatusFilter}
            setWmrStatusFilter={setWmrStatusFilter}
            typeOptions={typeOptions}
            departments={departments.map((dept) => ({ id: dept.id, name: dept.name }))}
            combinedFilteredWmrCount={combinedFilteredWmrCount}
            filteredWasteItems={filteredWasteItems}
            filteredStaffWmrReports={filteredStaffWmrReports}
            wmrReports={wmrReports}
            inventoryItems={inventoryItems}
            formatDisplayDate={formatDisplayDate}
            openWmrRemarksModal={openWmrRemarksModal}
            openStaffWmrRemarksModal={(report) => {
              // Find the linked inventory item for this staff report
              const linkedItem = report.item_id ? inventoryItems.find((i) => i.item_id === report.item_id) : null
              setActiveWmrItem(linkedItem || null)
              setActiveWmrReport(report)
              setActiveWmrVehicleLabel(linkedItem ? null : 'Staff Report')
              setWmrRemarksInput(report.admin_remarks ?? '')
              setWmrStatusInput(normalizeWmrStatus(report.status))
              setIsEditingWmrRemarks(!report.admin_remarks)
            }}
            filteredVehicleWmrReports={filteredVehicleWmrReports}
            openVehicleWmrRemarksModal={openVehicleWmrRemarksModal}
            onArchiveWasteItem={(item, report) => {
              openArchiveWasteWmrConfirmation(item, report)
            }}
            onArchiveStaffWmrReport={(report) => {
              openArchiveVehicleWmrConfirmation(report)
            }}
            onArchiveVehicleReport={(report) => {
              openArchiveVehicleWmrConfirmation(report)
            }}
            onExportCsv={handleExportWmrCsv}
            onImportCsv={handleImportWmrCsv}
          />
        )}

        {activeSection === 'vehicles' && (
          <VehiclesSection
            vehicleLoading={vehicleLoading}
            vehicleError={vehicleError}
            vehicleMode={vehicleMode}
            setVehicleMode={setVehicleMode}
            vehicles={activeVehicles}
            vehicleRepairs={vehicleRepairs}
            formatCurrency={formatCurrency}
            setActiveVehicleLogsId={setActiveVehicleLogsId}
            openVehicleEditModal={openVehicleEditModal}
            newVehicleName={newVehicleName}
            setNewVehicleName={setNewVehicleName}
            newVehicleMakeModel={newVehicleMakeModel}
            setNewVehicleMakeModel={setNewVehicleMakeModel}
            newVehicleColor={newVehicleColor}
            setNewVehicleColor={setNewVehicleColor}
            newVehicleYearModel={newVehicleYearModel}
            setNewVehicleYearModel={setNewVehicleYearModel}
            newVehicleCrNumber={newVehicleCrNumber}
            setNewVehicleCrNumber={setNewVehicleCrNumber}
            newVehicleEngineNumber={newVehicleEngineNumber}
            setNewVehicleEngineNumber={setNewVehicleEngineNumber}
            newVehicleServiceable={newVehicleServiceable}
            setNewVehicleServiceable={setNewVehicleServiceable}
            newVehicleRepairHistory={newVehicleRepairHistory}
            setNewVehicleRepairHistory={setNewVehicleRepairHistory}
            handleAddVehicle={handleAddVehicle}
            vehicleSaving={vehicleSaving}
            newRepairVehicleId={newRepairVehicleId}
            setNewRepairVehicleId={setNewRepairVehicleId}
            newRepairAdminId={newRepairAdminId}
            setNewRepairAdminId={setNewRepairAdminId}
            newRepairAmount={newRepairAmount}
            setNewRepairAmount={setNewRepairAmount}
            newRepairDate={newRepairDate}
            setNewRepairDate={setNewRepairDate}
            newRepairJobOrder={newRepairJobOrder}
            setNewRepairJobOrder={setNewRepairJobOrder}
            newRepairServiceCenter={newRepairServiceCenter}
            setNewRepairServiceCenter={setNewRepairServiceCenter}
            newRepairDescription={newRepairDescription}
            setNewRepairDescription={setNewRepairDescription}
            parUsers={parUsers}
            handleAddVehicleRepair={handleAddVehicleRepair}
            handleArchiveVehicle={(vehicle) => {
              openArchiveVehicleConfirmation(vehicle)
            }}
            onExportCsv={handleExportVehiclesCsv}
            onImportCsv={handleImportVehiclesCsv}
          />
        )}

        {activeSection === 'par' && (
          <ParSection
            parError={parError}
            parMode={parMode}
            setParMode={setParMode}
            parItemId={parItemId}
            setParItemId={setParItemId}
            inventoryItems={loanableParItems}
            parIssuedToId={parIssuedToId}
            setParIssuedToId={setParIssuedToId}
            parUsers={parUsers}
            parQuantityIssued={parQuantityIssued}
            setParQuantityIssued={setParQuantityIssued}
            parIssueDate={parIssueDate}
            setParIssueDate={setParIssueDate}
            parUnitInput={parUnitInput}
            setParUnitInput={setParUnitInput}
            unitOfMeasureOptions={unitOfMeasureOptions}
            parPropertyNoInput={parPropertyNoInput}
            setParPropertyNoInput={setParPropertyNoInput}
            parDateAcquiredInput={parDateAcquiredInput}
            setParDateAcquiredInput={setParDateAcquiredInput}
            parCostInput={parCostInput}
            setParCostInput={setParCostInput}
            parLineTotal={parLineTotal}
            formatCurrency={formatCurrency}
            parDescriptionInput={parDescriptionInput}
            setParDescriptionInput={setParDescriptionInput}
            handleCreateParRecord={handleCreateParRecord}
            handleCreateParRecordsBatch={handleCreateParRecordsBatch}
            parSaving={parSaving}
            parSearchQuery={parSearchQuery}
            setParSearchQuery={setParSearchQuery}
            parLoading={parLoading}
            filteredParSummaries={filteredParSummaries}
            setActiveParStaffId={setActiveParStaffId}
            handleArchiveParSummary={(staffId) => {
              openArchiveParSummaryConfirmation(staffId)
            }}
            onExportCsv={handleExportParCsv}
            onImportCsv={handleImportParCsv}
          />
        )}

        {activeSection === 'accountability' && (
          <AccountabilityReportsSection />
        )}

        {activeSection === 'shift-turnover-records' && (
          <ShiftTurnoverRecordsSection />
        )}

        {activeSection === 'reports' && (
          <ReportsSection
            reportsError={reportsErrorMessage}
            selectedReportPeriod={selectedReportPeriod}
            setSelectedReportPeriod={setSelectedReportPeriod}
            reportStartDate={reportStartDate}
            setReportStartDate={setReportStartDate}
            reportEndDate={reportEndDate}
            setReportEndDate={setReportEndDate}
            disablePrintActions={reportDateRangeInvalid}
            parOptions={reportParOptions}
            selectedParStaffId={selectedParReportStaffId}
            setSelectedParStaffId={setSelectedParReportStaffId}
            onPrintPar={() =>
              handlePrintParForStaff(
                selectedParReportStaffId,
                reportStartDate,
                reportEndDate,
              )
            }
            onPrintInventoryReport={() =>
              handlePrintInventoryReport(selectedReportPeriod, reportStartDate, reportEndDate)
            }
            onPrintWmrSummary={() => handlePrintWmrSummary(selectedReportPeriod, reportStartDate, reportEndDate)}
            onPrintRepairLogs={() =>
              handlePrintVehicleRepairLogs(selectedReportPeriod, reportStartDate, reportEndDate)
            }
            onPrintStockpileReleaseLogs={() =>
              handlePrintStockpileReleaseLogs(selectedReportPeriod, reportStartDate, reportEndDate)
            }
            parReportCount={reportParOptions.length}
            inventoryReportCount={reportInventoryCount}
            wmrReportCount={reportWmrCount}
            repairLogCount={reportVehicleRepairCount}
            stockpileReleaseLogCount={reportStockpileReleaseCount}
          />
        )}
      </main>

      {/* [MODAL] PAR details */}
      {activeParStaffId && (
        <div
          className="par-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="par-view-modal-title"
        >
          <div className="par-modal">
            <h2 id="par-view-modal-title" className="wmr-modal-title">
              Property Acknowledgment Receipt
            </h2>
            <div className="par-meta-grid">
              <p className="wmr-modal-text"><strong>Employee Name:</strong> {activeParReceiver?.full_name ?? activeParStaffId}</p>
              <p className="wmr-modal-text"><strong>Department:</strong> {activeParDepartment}</p>
              <p className="wmr-modal-text"><strong>PAR No:</strong> {activeParNo}</p>
            </div>

            <div className="par-view-table-wrap">
              <table className="inventory-table par-view-table">
                <thead>
                  <tr>
                    <th scope="col">QTY</th>
                    <th scope="col">Unit</th>
                    <th scope="col">Description</th>
                    <th scope="col">Property No.</th>
                    <th scope="col" className="inventory-date-column">Date Acquired</th>
                    <th scope="col">Unit Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {activeParRecords.length === 0 ? (
                    <tr>
                      <td colSpan={6}>No PAR items found.</td>
                    </tr>
                  ) : (
                    <>
                      {activeParRecords
                        .slice()
                        .sort((a, b) => b.par_id - a.par_id)
                        .map((record) => {
                          const item = inventoryItems.find((entry) => entry.item_id === record.item_id)

                          return (
                            <tr key={record.par_id}>
                              <td>{record.quantity_issued}</td>
                              <td>{record.unit_snapshot ?? item?.unit_of_measure ?? 'N/A'}</td>
                              <td>{record.description_snapshot ?? item?.item_name ?? '—'}</td>
                              <td>
                                {record.property_no_snapshot ??
                                  item?.property_no ??
                                  (record.item_id != null ? `ITEM-${record.item_id.toString().padStart(3, '0')}` : '—')}
                              </td>
                              <td className="inventory-date-column">
                                {formatInventoryDate(record.date_acquired_snapshot ?? item?.date_acquired)}
                              </td>
                              <td>
                                {record.cost_snapshot != null
                                  ? formatCurrency(record.cost_snapshot)
                                  : item?.unit_cost != null
                                    ? formatCurrency(item.unit_cost)
                                    : 'N/A'}
                              </td>
                            </tr>
                          )
                        })}
                      <tr>
                        <td colSpan={5} style={{ textAlign: 'right' }}>
                          <strong>Total Cost</strong>
                        </td>
                        <td>
                          <strong>{activeParHasCost ? formatCurrency(activeParTotalCost) : 'N/A'}</strong>
                        </td>
                      </tr>
                    </>
                  )}
                </tbody>
              </table>
            </div>

            <div className="wmr-modal-actions">
              <button
                type="button"
                className="wmr-modal-button-save"
                onClick={handlePrintPar}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true" focusable="false">
                  <path
                    d="M7 9V4h10v5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <rect
                    x="5"
                    y="10"
                    width="14"
                    height="7"
                    rx="1.5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                  />
                  <path
                    d="M8 14h8M8 17h8"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.4"
                    strokeLinecap="round"
                  />
                </svg>
                <span>Print</span>
              </button>
              <button
                type="button"
                className="wmr-modal-button-secondary"
                onClick={() => setActiveParStaffId(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* [MODAL] Vehicle repair logs */}
      {activeVehicleLogsId != null && activeVehicle && (
        <div
          className="par-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="vehicle-logs-modal-title"
        >
          <div className="par-modal">
            <h2 id="vehicle-logs-modal-title" className="wmr-modal-title">
              Vehicle Repair Logs
            </h2>
            <div className="par-meta-grid">
              <p className="wmr-modal-text"><strong>Vehicle:</strong> {getVehicleDisplayLabel(activeVehicle)}</p>
              <p className="wmr-modal-text"><strong>Make / Model:</strong> {activeVehicle.make_model || '—'}</p>
              <p className="wmr-modal-text"><strong>Color:</strong> {activeVehicle.color || '—'}</p>
              <p className="wmr-modal-text"><strong>Vehicle ID:</strong> {`VEH-${activeVehicle.id.toString().padStart(3, '0')}`}</p>
              <p className="wmr-modal-text"><strong>Year Model:</strong> {activeVehicle.year_model ?? '—'}</p>
              <p className="wmr-modal-text"><strong>Status:</strong> {activeVehicle.is_serviceable ? 'Serviceable' : 'Needs Repair'}</p>
              {!activeVehicle.is_serviceable && (
                <p className="wmr-modal-text"><strong>Remarks:</strong> {getVehicleStatusRemark(activeVehicle.repair_history_log) || '—'}</p>
              )}
              <p className="wmr-modal-text"><strong>Total Logs:</strong> {activeVehicleRepairs.length}</p>
              <p className="wmr-modal-text"><strong>Total Repair Spend:</strong> {formatCurrency(activeVehicleRepairSpend)}</p>
            </div>

            <div className="par-view-table-wrap">
              <table className="inventory-table par-view-table">
                <thead>
                  <tr>
                    <th scope="col">Repair ID</th>
                    <th scope="col" className="inventory-date-column">Date Repaired</th>
                    <th scope="col">Job Order No.</th>
                    <th scope="col">Service Center</th>
                    <th scope="col">Remarks</th>
                    <th scope="col">Repair Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {activeVehicleRepairs.length === 0 ? (
                    <tr>
                      <td colSpan={6}>No repair logs for this vehicle.</td>
                    </tr>
                  ) : (
                    activeVehicleRepairs
                      .slice()
                      .sort((a, b) => b.repair_id - a.repair_id)
                      .map((repair) => {
                        return (
                          <tr key={repair.repair_id}>
                            <td>{`VR-${repair.repair_id.toString().padStart(3, '0')}`}</td>
                            <td className="inventory-date-column">{formatInventoryDate(repair.date_repaired)}</td>
                            <td>{repair.job_order_number || '—'}</td>
                            <td>{repair.service_center || '—'}</td>
                            <td>{getRepairDescription(repair.repair_id, activeVehicle.repair_history_log)}</td>
                            <td>{formatCurrency(Number(repair.amount ?? 0))}</td>
                          </tr>
                        )
                      })
                  )}
                </tbody>
              </table>
            </div>

            <div className="wmr-modal-actions">
              <button
                type="button"
                className="wmr-modal-button-save"
                onClick={() => {
                  setNewRepairVehicleId(String(activeVehicle.id))
                  setVehicleMode('add-repair')
                  setActiveVehicleLogsId(null)
                }}
              >
                Add Repair Log
              </button>
              <button
                type="button"
                className="wmr-modal-button-secondary"
                onClick={() => setActiveVehicleLogsId(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* [MODAL] Vehicle status edit */}
      {editingVehicle && (
        <div
          className="par-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="vehicle-edit-modal-title"
        >
          <div className="par-modal">
            <h2 id="vehicle-edit-modal-title" className="wmr-modal-title">
              Vehicle Information
            </h2>

            <div className="par-meta-grid">
              <p className="wmr-modal-text">
                <strong>Vehicle ID:</strong> {`VEH-${editingVehicle.id.toString().padStart(3, '0')}`}
              </p>
              <p className="wmr-modal-text">
                <strong>Vehicle Name:</strong> {editingVehicle.vehicle_name || '—'}
              </p>
              <p className="wmr-modal-text">
                <strong>Make / Model:</strong> {editingVehicle.make_model ?? '—'}
              </p>
              <p className="wmr-modal-text">
                <strong>Color:</strong> {editingVehicle.color || '—'}
              </p>
              <p className="wmr-modal-text">
                <strong>Year Model:</strong> {editingVehicle.year_model ?? '—'}
              </p>
              <p className="wmr-modal-text">
                <strong>CR Number:</strong> {editingVehicle.cr_number ?? '—'}
              </p>
              <p className="wmr-modal-text">
                <strong>Engine Number:</strong> {editingVehicle.engine_number ?? '—'}
              </p>
              <p className="wmr-modal-text">
                <strong>Vehicle Status:</strong> {editingVehicle.is_serviceable ? 'Serviceable' : 'Unserviceable'}
              </p>
              <p className="wmr-modal-text">
                <strong>Remarks:</strong> {getVehicleStatusRemark(editingVehicle.repair_history_log) || '—'}
              </p>
            </div>

            <div className="wmr-modal-actions">
              {!isEditingVehicleDetails ? (
                <>
                  <button
                    type="button"
                    className="wmr-modal-button-save"
                    onClick={() => setIsEditingVehicleDetails(true)}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="wmr-modal-button-secondary"
                    onClick={closeVehicleEditModal}
                  >
                    Close
                  </button>
                </>
              ) : (
                <div className="vehicle-edit-panel">
                  <div className="inventory-field inventory-field-full" style={{ flex: '1 1 100%' }}>
                    <label htmlFor="edit-vehicle-name">
                      Vehicle Name <span className="inventory-required">*</span>
                    </label>
                    <input
                      id="edit-vehicle-name"
                      className="inventory-input"
                      value={editVehicleName}
                      onChange={(e) => setEditVehicleName(e.target.value)}
                      placeholder="e.g. Rescue Van 1"
                    />
                  </div>

                  <div className="inventory-field inventory-field-full" style={{ flex: '1 1 100%' }}>
                    <label htmlFor="edit-vehicle-color">Color</label>
                    <input
                      id="edit-vehicle-color"
                      className="inventory-input"
                      value={editVehicleColor}
                      onChange={(e) => setEditVehicleColor(e.target.value)}
                      placeholder="e.g. White"
                    />
                  </div>

                  <div className="inventory-field inventory-field-full" style={{ flex: '1 1 100%' }}>
                    <label htmlFor="edit-vehicle-serviceable">
                      Vehicle Status <span className="inventory-required">*</span>
                    </label>
                    <select
                      id="edit-vehicle-serviceable"
                      className="inventory-input"
                      value={editVehicleServiceable}
                      onChange={(e) => setEditVehicleServiceable(e.target.value)}
                    >
                      <option value="true">Serviceable</option>
                      <option value="false">Unserviceable</option>
                    </select>
                  </div>

                  {editVehicleServiceable === 'false' && (
                    <div className="inventory-field inventory-field-full" style={{ flex: '1 1 100%' }}>
                      <label htmlFor="edit-vehicle-remarks">
                        Remarks <span className="inventory-required">*</span>
                      </label>
                      <textarea
                        id="edit-vehicle-remarks"
                        className="inventory-input"
                        style={{ minHeight: 96, resize: 'vertical' }}
                        value={editVehicleRemarks}
                        onChange={(e) => setEditVehicleRemarks(e.target.value)}
                        placeholder="Describe what is broken or why the vehicle is unserviceable"
                      />
                    </div>
                  )}

                  <div className="vehicle-edit-actions">
                    <button
                      type="button"
                      className="wmr-modal-button-save vehicle-edit-save"
                      onClick={handleSaveVehicleEdit}
                      disabled={editVehicleSaving}
                    >
                      {editVehicleSaving ? 'Saving…' : 'Save'}
                    </button>
                    <button
                      type="button"
                      className="wmr-modal-button-secondary vehicle-edit-cancel"
                      onClick={() => setIsEditingVehicleDetails(false)}
                      disabled={editVehicleSaving}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* [MODAL] Inventory edit */}
      {editingItem && (
        <div
          className="logout-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-item-modal-title"
        >
          <div className="logout-modal">
            <h2 id="edit-item-modal-title" className="logout-modal-title">
              Edit Item
            </h2>
            <div className="inventory-add-grid">
              <div className="inventory-field">
                <label htmlFor="edit-item-name">
                  Item Name <span className="inventory-required">*</span>
                </label>
                <input
                  id="edit-item-name"
                  type="text"
                  className="inventory-input"
                  value={editItemName}
                  onChange={(e) => setEditItemName(e.target.value)}
                />
              </div>
              <div className="inventory-field">
                <label htmlFor="edit-item-type">
                  Item Type <span className="inventory-required">*</span>
                </label>
                <select
                  id="edit-item-type"
                  className="inventory-input"
                  value={editItemType}
                  onChange={(e) => setEditItemType(e.target.value)}
                >
                  <option value="">Select item type</option>
                  {typeOptions.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>
              <div className="inventory-field">
                <label htmlFor="edit-donor-identification">Donor Identification</label>
                <input
                  id="edit-donor-identification"
                  type="text"
                  className="inventory-input"
                  placeholder="e.g., Name, Company, or Contact (optional)"
                  value={editDonorIdentification}
                  onChange={(e) => setEditDonorIdentification(e.target.value)}
                />
              </div>
              <div className="inventory-field">
                <label htmlFor="edit-item-department">
                  Location <span className="inventory-required">*</span>
                </label>
                <select
                  id="edit-item-department"
                  className="inventory-input"
                  value={editDepartmentId}
                  onChange={(e) => setEditDepartmentId(e.target.value)}
                >
                  <option value="">Select department</option>
                  {departments.map((dept) => (
                    <option key={dept.id} value={String(dept.id)}>
                      {dept.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="inventory-field">
                <label htmlFor="edit-quantity">Quantity</label>
                <input
                  id="edit-quantity"
                  type="number"
                  min={editingItem.quantity ?? 0}
                  className="inventory-input"
                  value={editQuantity}
                  onChange={(e) => setEditQuantity(e.target.value)}
                />
              </div>
              <div className="inventory-field">
                <label htmlFor="edit-unit-of-measure">Unit of Measure</label>
                <select
                  id="edit-unit-of-measure"
                  className="inventory-input"
                  value={editUnitOfMeasure}
                  onChange={(e) => setEditUnitOfMeasure(e.target.value)}
                >
                  <option value="">Select unit</option>
                  {unitOfMeasureOptions.map((unit) => (
                    <option key={unit} value={unit}>
                      {unit}
                    </option>
                  ))}
                </select>
              </div>
              <div className="inventory-field">
                <label htmlFor="edit-unit-cost">Unit Cost (per 1 qty)</label>
                <input
                  id="edit-unit-cost"
                  type="number"
                  min="0"
                  step="0.01"
                  className="inventory-input"
                  placeholder="0.00 (optional)"
                  value={editUnitCost}
                  onChange={(e) => setEditUnitCost(e.target.value)}
                />
              </div>
              {editSource.trim().toLowerCase() === 'purchased' && (
                <div className="inventory-field">
                  <label htmlFor="edit-total-cost">Total Cost (Qty x Unit Cost)</label>
                  <input
                    id="edit-total-cost"
                    type="text"
                    className="inventory-input"
                    value={formatCurrency(editItemTotalCost)}
                    readOnly
                  />
                </div>
              )}
              {editSource.trim().toLowerCase() === 'donated' && (
                <div className="inventory-field inventory-field-full">
                  <div className="inventory-help-text">Donated items do not require unit cost or total cost.</div>
                </div>
              )}
              <div className="inventory-field">
                <label htmlFor="edit-date-acquired">Date Acquired</label>
                <input
                  id="edit-date-acquired"
                  type="date"
                  className="inventory-input"
                  value={editDateAcquired}
                  onChange={(e) => setEditDateAcquired(e.target.value)}
                />
              </div>
              <div className="inventory-field">
                <label htmlFor="edit-source">Source</label>
                <select
                  id="edit-source"
                  className="inventory-input"
                  value={editSource}
                  onChange={(e) => {
                    const nextSource = e.target.value
                    setEditSource(nextSource)
                    if (nextSource.trim().toLowerCase() !== 'purchased') {
                      setEditUnitCost('')
                    }
                  }}
                >
                  <option value="">Select source</option>
                  {acquisitionModeOptions.map((mode) => (
                    <option key={mode} value={mode}>
                      {mode}
                    </option>
                  ))}
                </select>
              </div>
              {editItemType.trim().toLowerCase() === 'stockpile' && (
                <div className="inventory-field">
                  <label htmlFor="edit-expiration">Expiration Date</label>
                  <input
                    id="edit-expiration"
                    type="date"
                    className="inventory-input"
                    value={editExpirationDate}
                    onChange={(e) => setEditExpirationDate(e.target.value)}
                  />
                </div>
              )}
              <div className="inventory-field">
                <label htmlFor="edit-status">Status</label>
                {editItemType.trim().toLowerCase() === 'stockpile' ? (
                  <input
                    id="edit-status"
                    className="inventory-input"
                    value={editStatusPreview}
                    readOnly
                  />
                ) : (
                  <select
                    id="edit-status"
                    className="inventory-input"
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                  >
                    <option value="">Select status</option>
                    {editableStatusOptions.map((statusOption) => (
                      <option key={statusOption} value={statusOption}>
                        {statusOption}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              <div className="inventory-field">
                <label htmlFor="edit-condition">Condition</label>
                <select
                  id="edit-condition"
                  className="inventory-input"
                  value={editCondition}
                  onChange={(e) => setEditCondition(e.target.value)}
                >
                  <option value="">Select condition</option>
                  <option value="Good">Good</option>
                  <option value="Fully Functional">Fully Functional</option>
                  <option value="Defective">Defective</option>
                </select>
              </div>
            </div>
            <div className="logout-modal-actions wmr-modal-actions">
              <button
                type="button"
                className="wmr-modal-button-save"
                onClick={handleSaveEdit}
                disabled={editSaving || editDeleting}
              >
                {editSaving ? 'Saving…' : 'Save'}
              </button>
              <button
                type="button"
                className="logout-modal-button-secondary"
                onClick={() => !editSaving && !editDeleting && setEditingItem(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {dashboardMetricDrilldown && activeSection === 'dashboard' && (
        <div
          className="dashboard-drilldown-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="dashboard-drilldown-modal-title"
          onClick={() => setDashboardMetricDrilldown(null)}
        >
          <div
            ref={dashboardDrilldownModalRef}
            className="dashboard-drilldown-modal"
            tabIndex={-1}
            onClick={(e) => e.stopPropagation()}
          >
            <header className="panel-header dashboard-drilldown-header">
              <h3 id="dashboard-drilldown-modal-title">
                {dashboardMetricLabelMap[dashboardMetricDrilldown]} Items ({formatValue(dashboardDrilldownItems.length)})
              </h3>
              <button
                type="button"
                className="dashboard-drilldown-close-button"
                onClick={() => setDashboardMetricDrilldown(null)}
                aria-label="Close"
              >
                x
              </button>
            </header>
            <div className="panel-body">
              {dashboardDrilldownPaginatedItems.length === 0 ? (
                <div className="panel-body-placeholder">No items found for this metric.</div>
              ) : (
                <div className="dashboard-drilldown-table-wrap">
                  <table className="dashboard-drilldown-table">
                    <thead>
                      <tr>
                        <th scope="col">Item</th>
                        <th scope="col">Type</th>
                        <th scope="col">Location</th>
                        <th scope="col">Qty</th>
                        <th scope="col">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dashboardDrilldownPaginatedItems.map((item) => {
                        const status = getInventoryStatus(item) ?? '—'
                        const locationName = departments.find((dept) => dept.id === item.department_id)?.name ?? 'Unassigned'
                        return (
                          <tr key={`drilldown-item-${item.item_id}`}>
                            <td>{item.item_name}</td>
                            <td>{item.item_type}</td>
                            <td>{locationName}</td>
                            <td>{item.quantity ?? 0}</td>
                            <td>{status}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                  {dashboardDrilldownTotalPages > 1 && (
                    <div className="dashboard-drilldown-pagination" aria-label="Dashboard drilldown pagination">
                      <button
                        type="button"
                        className="dashboard-drilldown-pagination-button"
                        onClick={() => setDashboardDrilldownPage((prev) => Math.max(1, prev - 1))}
                        disabled={dashboardDrilldownPage === 1}
                      >
                        Prev
                      </button>
                      {dashboardDrilldownVisiblePageNumbers.map((pageNumber) => (
                        <button
                          key={`dashboard-drilldown-page-${pageNumber}`}
                          type="button"
                          className={`dashboard-drilldown-pagination-button ${
                            dashboardDrilldownPage === pageNumber ? 'dashboard-drilldown-pagination-button-active' : ''
                          }`}
                          onClick={() => setDashboardDrilldownPage(pageNumber)}
                          aria-current={dashboardDrilldownPage === pageNumber ? 'page' : undefined}
                        >
                          {pageNumber}
                        </button>
                      ))}
                      <button
                        type="button"
                        className="dashboard-drilldown-pagination-button"
                        onClick={() =>
                          setDashboardDrilldownPage((prev) => Math.min(dashboardDrilldownTotalPages, prev + 1))
                        }
                        disabled={dashboardDrilldownPage === dashboardDrilldownTotalPages}
                      >
                        Next
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {inventoryImportRows.length > 0 && activeSection === 'inventory' && (
        <div
          className="dashboard-drilldown-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="inventory-import-modal-title"
          onClick={closeInventoryImportModal}
        >
          <div
            className="dashboard-drilldown-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="panel-header dashboard-drilldown-header">
              <h3 id="inventory-import-modal-title">Review Inventory CSV Before Import</h3>
              <button
                type="button"
                className="dashboard-drilldown-close-button"
                onClick={closeInventoryImportModal}
                aria-label="Close"
                disabled={inventoryImportSaving}
              >
                x
              </button>
            </header>
            <div className="panel-body">
              <p className="wmr-modal-text" style={{ marginBottom: 10 }}>
                Edit values before saving. Required fields: <strong>item_name</strong> and a valid location via <strong>department_id</strong>, <strong>department_name</strong>, or <strong>department_code</strong>.
              </p>

              {inventoryImportError && <p className="dashboard-error">{inventoryImportError}</p>}

              <div className="dashboard-drilldown-table-wrap">
                <table className="inventory-table">
                  <thead>
                    <tr>
                      <th scope="col">#</th>
                      {inventoryImportHeaders.map((header) => (
                        <th key={`inventory-import-header-${header}`} scope="col">{header}</th>
                      ))}
                      <th scope="col">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inventoryImportRows.map((row, rowIndex) => (
                      <tr key={`inventory-import-row-${rowIndex}`}>
                        <td>{rowIndex + 1}</td>
                        {inventoryImportHeaders.map((header) => (
                          <td key={`inventory-import-cell-${rowIndex}-${header}`}>
                            <input
                              type="text"
                              className="inventory-input"
                              value={row[header] ?? ''}
                              onChange={(event) =>
                                updateInventoryImportCell(rowIndex, header, event.target.value)
                              }
                              disabled={inventoryImportSaving}
                            />
                          </td>
                        ))}
                        <td>
                          <button
                            type="button"
                            className="inventory-secondary-button"
                            onClick={() => removeInventoryImportRow(rowIndex)}
                            disabled={inventoryImportSaving || inventoryImportRows.length === 1}
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="logout-modal-actions" style={{ marginTop: 12 }}>
                <button
                  type="button"
                  className="inventory-secondary-button"
                  onClick={addInventoryImportRow}
                  disabled={inventoryImportSaving}
                >
                  Add Row
                </button>
                <button
                  type="button"
                  className="logout-modal-button-secondary"
                  onClick={closeInventoryImportModal}
                  disabled={inventoryImportSaving}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="inventory-add-submit"
                  onClick={() => {
                    void saveInventoryImportRows()
                  }}
                  disabled={inventoryImportSaving}
                >
                  {inventoryImportSaving ? 'Importing…' : 'Save Import'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* [MODAL] Shared archive confirmation */}
      {archiveModalConfig && (
        <div
          className="inventory-delete-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="inventory-delete-modal-title"
        >
          <div className="inventory-delete-modal">
            <h2 id="inventory-delete-modal-title" className="inventory-delete-modal-title">
              {archiveModalConfig.title}
            </h2>
            <p className="inventory-delete-modal-text">
              {archiveModalConfig.text}
            </p>
            <p className="inventory-delete-modal-subtext">
              {archiveModalConfig.subtext}
            </p>
            <div className="inventory-delete-modal-actions">
              <button
                type="button"
                className="inventory-delete-button-cancel"
                onClick={closeArchiveModal}
                disabled={isArchiveModalBusy}
              >
                Cancel
              </button>
              <button
                type="button"
                className="inventory-delete-button-confirm"
                onClick={() => {
                  void archiveModalConfig.onConfirm()
                }}
                disabled={isArchiveModalBusy}
              >
                {isArchiveModalBusy ? 'Archiving…' : 'Archive'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* [MODAL] Inventory photo viewer */}
      {viewImageItem && (
        <div
          className="logout-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="view-image-modal-title"
        >
          <div className="logout-modal">
            <h2 id="view-image-modal-title" className="logout-modal-title">
              Item Photos
            </h2>
            {(() => {
              const photoUrls = getItemPhotoUrls(viewImageItem)
              const activePhotoUrl = photoUrls[viewImageIndex] ?? null

              if (!activePhotoUrl) {
                return <p className="logout-modal-text">No photo available for this item.</p>
              }

              return (
                <>
                  <img
                    src={activePhotoUrl}
                    alt={viewImageItem.item_name}
                    style={{ width: '100%', borderRadius: 12, marginBottom: 12, maxHeight: 360, objectFit: 'contain' }}
                  />

                  {photoUrls.length > 1 && (
                    <div className="inventory-gallery-thumbs">
                      {photoUrls.map((url, index) => (
                        <button
                          key={`${url}-${index}`}
                          type="button"
                          className={`inventory-gallery-thumb ${index === viewImageIndex ? 'inventory-gallery-thumb-active' : ''}`}
                          onClick={() => setViewImageIndex(index)}
                        >
                          <img src={url} alt={`${viewImageItem.item_name} ${index + 1}`} />
                        </button>
                      ))}
                    </div>
                  )}

                  {photoUrls.length > 1 && (
                    <p className="logout-modal-text" style={{ marginTop: 8 }}>
                      Showing {viewImageIndex + 1} of {photoUrls.length}
                    </p>
                  )}
                </>
              )
            })()}
            <div className="logout-modal-actions">
              <button
                type="button"
                className="logout-modal-button-secondary"
                onClick={() => {
                  const photoUrls = getItemPhotoUrls(viewImageItem)
                  if (photoUrls.length <= 1) return
                  setViewImageIndex((prev) => (prev - 1 + photoUrls.length) % photoUrls.length)
                }}
                disabled={getItemPhotoUrls(viewImageItem).length <= 1}
              >
                Previous
              </button>
              <button
                type="button"
                className="logout-modal-button-secondary"
                onClick={() => {
                  const photoUrls = getItemPhotoUrls(viewImageItem)
                  if (photoUrls.length <= 1) return
                  setViewImageIndex((prev) => (prev + 1) % photoUrls.length)
                }}
                disabled={getItemPhotoUrls(viewImageItem).length <= 1}
              >
                Next
              </button>
              <button
                type="button"
                className="logout-modal-button-secondary"
                onClick={() => setViewImageItem(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* [MODAL] Staff QR viewer */}
      {viewStaffQrItem && (
        <div
          className="logout-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="view-staff-qr-modal-title"
        >
          <div className="logout-modal">
            <h2 id="view-staff-qr-modal-title" className="logout-modal-title">
              Staff QR Code
            </h2>
            <p className="logout-modal-text" style={{ marginBottom: 12 }}>
              <strong>{viewStaffQrItem.full_name}</strong>
              <br />
              {viewStaffQrItem.staff_id}
            </p>
            {viewStaffQrItem.qr_code ? (
              <div id="staff-qr-canvas-wrapper" style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
                <QRCodeCanvas
                  value={viewStaffQrItem.qr_code}
                  size={200}
                  bgColor="#ffffff"
                  fgColor="#111827"
                  includeMargin
                />
              </div>
            ) : (
              <p className="logout-modal-text">No QR code available for this staff record.</p>
            )}
            <div className="logout-modal-actions">
              {viewStaffQrItem.qr_code && (
                <button
                  type="button"
                  className="wmr-modal-button-save"
                  onClick={() => {
                    const canvas = document.querySelector<HTMLCanvasElement>('#staff-qr-canvas-wrapper canvas')
                    if (!canvas) return
                    const link = document.createElement('a')
                    link.href = canvas.toDataURL('image/png')
                    link.download = `${viewStaffQrItem.staff_id ?? 'staff'}-QR.png`
                    link.click()
                  }}
                >
                  Download
                </button>
              )}
              <button
                type="button"
                className="logout-modal-button-secondary"
                onClick={() => setViewStaffQrItem(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* [MODAL] Inventory QR viewer */}
      {viewQrItem && (
        <div
          className="logout-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="view-qr-modal-title"
        >
          <div className="logout-modal">
            <h2 id="view-qr-modal-title" className="logout-modal-title">
              Item QR Code
            </h2>
            {viewQrItem.qr_code ? (
              <div id="inventory-qr-canvas-wrapper" style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
                <QRCodeCanvas
                  value={viewQrItem.qr_code}
                  size={200}
                  bgColor="#ffffff"
                  fgColor="#111827"
                  includeMargin
                />
              </div>
            ) : (
              <p className="logout-modal-text">No QR code available for this item.</p>
            )}
            <div className="logout-modal-actions">
              {viewQrItem.qr_code && (
                <button
                  type="button"
                  className="wmr-modal-button-save"
                  onClick={() => {
                    const canvas = document.querySelector<HTMLCanvasElement>('#inventory-qr-canvas-wrapper canvas')
                    if (!canvas) return
                    const paddedId = `ITEM-${viewQrItem.item_id.toString().padStart(3, '0')}`
                    const link = document.createElement('a')
                    link.href = canvas.toDataURL('image/png')
                    link.download = `${paddedId}-QR.png`
                    link.click()
                  }}
                >
                  Download
                </button>
              )}
              <button
                type="button"
                className="logout-modal-button-secondary"
                onClick={() => setViewQrItem(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* [MODAL] WMR remarks */}
      {(activeWmrItem || activeWmrReport) && (
        <div
          className="wmr-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="wmr-remarks-modal-title"
        >
          <div className="wmr-modal">
            <h2 id="wmr-remarks-modal-title" className="wmr-modal-title">
              {activeWmrReport && !isEditingWmrRemarks ? 'View Remarks' : 'Add Remarks'}
            </h2>
            <p className="wmr-modal-text">
              {activeWmrItem ? (
                <>
                  {activeWmrItem.item_name}
                  <span style={{ color: '#6b7280', fontSize: 12 }}>
                    {' '}
                    ({activeWmrItem.item_type})
                  </span>
                </>
              ) : (
                <>
                  {activeWmrVehicleLabel ?? 'Vehicle'}
                  <span style={{ color: '#6b7280', fontSize: 12 }}> (Vehicle)</span>
                </>
              )}
            </p>
            {activeWmrReport && !isEditingWmrRemarks ? (
              <>
                <div className="inventory-field">
                  <label style={{ fontSize: 12, color: '#6b7280' }}>Quantity Reported</label>
                  <div className="inventory-input" style={{ minHeight: 44, paddingTop: 10 }}>
                    <span style={{ fontSize: 13, color: '#111827' }}>
                      {activeWmrReport.quantity_reported ?? 1} {activeWmrItem?.unit_of_measure ?? 'units'}
                    </span>
                  </div>
                </div>
                <div className="inventory-field">
                  <label style={{ fontSize: 12, color: '#6b7280' }}>Remarks</label>
                  <div className="inventory-input" style={{ minHeight: 60, paddingTop: 6 }}>
                    {wmrRemarksInput ? (
                      <span style={{ fontSize: 13, color: '#111827', whiteSpace: 'pre-wrap' }}>
                        {wmrRemarksInput}
                      </span>
                    ) : (
                      <span style={{ fontSize: 13, color: '#9ca3af' }}>No remarks yet.</span>
                    )}
                  </div>
                </div>
                <div className="inventory-field">
                  <label style={{ fontSize: 12, color: '#6b7280' }}>Status</label>
                  <div>
                    <span
                      className={`badge ${
                        wmrStatusInput === 'Pending'
                          ? 'badge-status-pending'
                          : wmrStatusInput === 'For Disposal'
                            ? 'badge-status-disposal'
                            : wmrStatusInput === 'Disposed'
                              ? 'badge-status-disposed'
                            : wmrStatusInput === 'For Repair'
                              ? 'badge-status-repair'
                              : wmrStatusInput === 'Repaired'
                                ? 'badge-status-repaired'
                                : ''
                      }`}
                    >
                      {wmrStatusInput}
                    </span>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="inventory-field">
                  <label htmlFor="wmr-remarks-input" style={{ fontSize: 12, color: '#6b7280' }}>
                    Remarks
                  </label>
                  <textarea
                    id="wmr-remarks-input"
                    className="inventory-input"
                    style={{ minHeight: 90, resize: 'vertical' }}
                    value={wmrRemarksInput}
                    onChange={(e) => setWmrRemarksInput(e.target.value)}
                  />
                </div>
                <div className="inventory-field">
                  <label htmlFor="wmr-status-select" style={{ fontSize: 12, color: '#6b7280' }}>
                    Status
                  </label>
                  <select
                    id="wmr-status-select"
                    className="inventory-input"
                    value={wmrStatusInput}
                    onChange={(e) => setWmrStatusInput(e.target.value)}
                  >
                    <option value="Pending">Pending</option>
                    <option value="For Disposal">For Disposal</option>
                    <option value="Disposed">Disposed</option>
                    <option value="For Repair">For Repair</option>
                    <option value="Repaired">Repaired</option>
                  </select>
                </div>
              </>
            )}
            <div className="wmr-modal-actions">
              {activeWmrReport && !isEditingWmrRemarks ? (
                <>
                  <button
                    type="button"
                    className="wmr-modal-button-save"
                    onClick={() => setIsEditingWmrRemarks(true)}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="wmr-modal-button-secondary"
                    onClick={closeWmrRemarksModal}
                  >
                    Close
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    className="wmr-modal-button-save"
                    onClick={handleSaveWmrRemarks}
                    disabled={wmrSaving}
                  >
                    {wmrSaving ? 'Saving…' : 'Save'}
                  </button>
                  <button
                    type="button"
                    className="wmr-modal-button-secondary"
                    onClick={closeWmrRemarksModal}
                    disabled={wmrSaving}
                  >
                    Cancel
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default DashboardPage
