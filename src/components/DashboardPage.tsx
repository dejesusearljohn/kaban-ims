import { useEffect, useRef, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
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
import { supabase } from '../supabaseClient'
import type { Tables } from '../../supabase'
import Sidebar from './Sidebar'
import InventorySection from './InventorySection'
import StockpileSection from './StockpileSection'
import WmrSection from './WmrSection'
import VehiclesSection from './VehiclesSection'
import ParSection from './ParSection'
import type { SidebarSection } from './Sidebar'
import '../styles/DashboardPage.css'
import '../styles/Inventory.css'
import '../styles/Wmr.css'
import '../styles/Par.css'
import '../styles/Dashboard.css'

type SummaryMetrics = {
  totalItems: number
  serviceable: number
  unserviceable: number
  expired: number
}

type DepartmentOverview = {
  id: number
  name: string
  totalItems: number
  serviceable: number
  unserviceable: number
  staffCount: number
  onlineCount: number
}

type InventoryRow = Tables<'inventory'>
type InventoryPhotoRow = Tables<'inventory_photos'>
type StockpileRow = Tables<'stockpile'>
type DistributionLogRow = Tables<'distribution_logs'>
type WmrReportRow = Tables<'wmr_reports'>
type ParRecordRow = Tables<'par_records'>
type VehicleRow = Tables<'vehicles'>
type VehicleRepairRow = Tables<'vehicle_repairs'>
type UserRow = Tables<'users'>

type StockpileReleaseLog = {
  log: DistributionLogRow
  itemName: string
  unit: string
  quantity: number
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
  'Gadgets',
  'Medicine',
  'Perishables',
]

const DEFAULT_UNITS_OF_MEASURE = [
  'Piece(s)',
  'Set',
  'Box',
  'Pair',
  'Pack',
  'Roll',
  'Bottle',
  'Liter',
  'Gallon',
  'Kilogram',
  'Gram',
  'Meter',
]

const DEFAULT_STOCKPILE_CATEGORIES = [
  'Food Packs',
  'Drinking Water',
  'Medicines & First Aid',
  'Hygiene & Sanitation',
  'Shelter & Sleeping Kits',
  'Infant Care',
  'Senior & PWD Support',
  'Emergency Tools & Equipment',
  'PPE & Protective Gear',
  'Rescue & Evacuation Supplies',
  'Communication & Power',
  'Non-Food Relief Items',
]

const INVENTORY_PHOTO_BUCKET = 'inventory-photos'
const TYPE_CHART_COLORS = ['#059669', '#0284c7', '#d97706', '#7c3aed', '#e11d48']
const STOCKPILE_STATUS_COLORS: Record<string, string> = {
  Available: '#16a34a',
  'Low Stock': '#f59e0b',
  'Out of Stock': '#dc2626',
  Expired: '#6b7280',
}

function DashboardPage() {
  // [STATE] Navigation and dashboard overview
  const [activeSection, setActiveSection] = useState<SidebarSection>('dashboard')
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

  // [STATE] Inventory section
  const [inventoryItems, setInventoryItems] = useState<InventoryRow[]>([])
  const [inventoryLoading, setInventoryLoading] = useState(false)
  const [inventoryError, setInventoryError] = useState<string | null>(null)
  const [newItemName, setNewItemName] = useState('')
  const [newItemType, setNewItemType] = useState('')
  const [newQuantity, setNewQuantity] = useState('')
  const [newUnitOfMeasure, setNewUnitOfMeasure] = useState('')
  const [newUnitCost, setNewUnitCost] = useState('')
  const [newDateAcquired, setNewDateAcquired] = useState('')
  const [newSource, setNewSource] = useState('')
  const [newPhotoFiles, setNewPhotoFiles] = useState<File[]>([])
  const [addingItem, setAddingItem] = useState(false)
  const addPhotoInputRef = useRef<HTMLInputElement | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [wmrSearchQuery, setWmrSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [departmentFilter, setDepartmentFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [wmrTypeFilter, setWmrTypeFilter] = useState('all')
  const [wmrDepartmentFilter, setWmrDepartmentFilter] = useState('all')
  const [wmrStatusFilter, setWmrStatusFilter] = useState('all')
  const [editingItem, setEditingItem] = useState<InventoryRow | null>(null)
  const [editItemName, setEditItemName] = useState('')
  const [editItemType, setEditItemType] = useState('')
  const [editQuantity, setEditQuantity] = useState('')
  const [editUnitOfMeasure, setEditUnitOfMeasure] = useState('')
  const [editUnitCost, setEditUnitCost] = useState('')
  const [editDateAcquired, setEditDateAcquired] = useState('')
  const [editExpirationDate, setEditExpirationDate] = useState('')
  const [editSource, setEditSource] = useState('')
  const [editStatus, setEditStatus] = useState('')
  const [editSaving, setEditSaving] = useState(false)
  const [editDeleting, setEditDeleting] = useState(false)
  const [deleteTargetItem, setDeleteTargetItem] = useState<InventoryRow | null>(null)
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

  // [STATE] Vehicles section
  const [activeVehicleLogsId, setActiveVehicleLogsId] = useState<number | null>(null)
  const [vehicleMode, setVehicleMode] = useState<'manage' | 'add-vehicle' | 'add-repair'>('manage')
  const [vehicles, setVehicles] = useState<VehicleRow[]>([])
  const [vehicleRepairs, setVehicleRepairs] = useState<VehicleRepairRow[]>([])
  const [vehicleLoading, setVehicleLoading] = useState(false)
  const [vehicleSaving, setVehicleSaving] = useState(false)
  const [vehicleError, setVehicleError] = useState<string | null>(null)
  const [newVehicleMakeModel, setNewVehicleMakeModel] = useState('')
  const [newVehicleYearModel, setNewVehicleYearModel] = useState('')
  const [newVehicleCrNumber, setNewVehicleCrNumber] = useState('')
  const [newVehicleEngineNumber, setNewVehicleEngineNumber] = useState('')
  const [newVehicleServiceable, setNewVehicleServiceable] = useState('true')
  const [newVehicleRepairHistory, setNewVehicleRepairHistory] = useState('')
  const [editingVehicle, setEditingVehicle] = useState<VehicleRow | null>(null)
  const [editVehicleServiceable, setEditVehicleServiceable] = useState('true')
  const [editVehicleRemarks, setEditVehicleRemarks] = useState('')
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
  const [stockpileMode, setStockpileMode] = useState<'list' | 'add'>('list')
  const [newStockpileItemName, setNewStockpileItemName] = useState('')
  const [newStockpileCategory, setNewStockpileCategory] = useState('')
  const [newStockpileQuantity, setNewStockpileQuantity] = useState('')
  const [newStockpileUnitOfMeasure, setNewStockpileUnitOfMeasure] = useState('')
  const [newStockpilePackedDate, setNewStockpilePackedDate] = useState('')
  const [newStockpileExpirationDate, setNewStockpileExpirationDate] = useState('')
  const [addingStockpile, setAddingStockpile] = useState(false)
  const [stockpileSearchQuery, setStockpileSearchQuery] = useState('')
  const [stockpileCategoryFilter, setStockpileCategoryFilter] = useState('all')
  const [stockpileReleaseLogs, setStockpileReleaseLogs] = useState<DistributionLogRow[]>([])
  const [stockpileReleaseLoading, setStockpileReleaseLoading] = useState(false)
  const [activeReleaseStockpile, setActiveReleaseStockpile] = useState<StockpileRow | null>(null)
  const [releaseQtyInput, setReleaseQtyInput] = useState('')
  const [releaseIssuedToInput, setReleaseIssuedToInput] = useState('')
  const [releaseReasonInput, setReleaseReasonInput] = useState('')
  const [releasingStockpile, setReleasingStockpile] = useState(false)

  // [EFFECTS] Initial data loading
  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true)
      setError(null)

      try {
        const [totalRes, serviceableRes, unserviceableRes, expiredRes] = await Promise.all([
          supabase.from('inventory').select('*', { count: 'exact', head: true }),
          supabase.from('inventory').select('*', { count: 'exact', head: true }).eq('status', 'Serviceable'),
          supabase.from('inventory').select('*', { count: 'exact', head: true }).eq('status', 'Unserviceable'),
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
          .select('id, dept_name')
          .order('id', { ascending: true })

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
              .eq('status', 'Serviceable'),
            supabase
              .from('inventory')
              .select('*', { count: 'exact', head: true })
              .eq('department_id', dept.id)
              .eq('status', 'Unserviceable'),
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
  }, [])

  useEffect(() => {
    const fetchInventory = async () => {
      setInventoryLoading(true)
      setInventoryError(null)

      const { data, error: invError } = await supabase.from('inventory').select('*').order('item_id', {
        ascending: true,
      })

      if (invError) {
        setInventoryError(invError.message)
      } else {
        setInventoryItems(data ?? [])
      }

      setInventoryLoading(false)
    }

    void fetchInventory()
  }, [])

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
  }, [])

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
  }, [])

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
  }, [])

  useEffect(() => {
    const fetchParUsers = async () => {
      const { data, error: parUsersError } = await supabase
        .from('users')
        .select('*')
        .order('full_name', { ascending: true })

      if (parUsersError) {
        setParError((prev) => prev ?? parUsersError.message)
      } else {
        setParUsers(data ?? [])
      }
    }

    void fetchParUsers()
  }, [])

  useEffect(() => {
    const fetchVehiclesData = async () => {
      setVehicleLoading(true)
      setVehicleError(null)

      const [{ data: vehicleRows, error: vehiclesFetchError }, { data: repairRows, error: repairsFetchError }] =
        await Promise.all([
          supabase.from('vehicles').select('*').order('id', { ascending: true }),
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
  }, [])

  useEffect(() => {
    const fetchStockpiles = async () => {
      setStockpileLoading(true)
      setStockpileError(null)

      const { data, error: stockpileFetchError } = await supabase
        .from('stockpile')
        .select('*')
        .order('stockpile_id', { ascending: true })

      if (stockpileFetchError) {
        setStockpileError(stockpileFetchError.message)
      } else {
        setStockpileItems(data ?? [])
      }

      setStockpileLoading(false)
    }

    void fetchStockpiles()
  }, [])

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
  }, [])

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
      selectedItem.property_no ?? selectedItem.qr_code ?? `ITEM-${selectedItem.item_id.toString().padStart(3, '0')}`,
    )
    setParDateAcquiredInput(selectedItem.date_acquired ?? '')
    setParCostInput(selectedItem.unit_cost != null ? String(selectedItem.unit_cost) : '')
  }, [parItemId, inventoryItems])

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
  const parseNumericInput = (value: string) => {
    const parsed = value.trim() ? Number(value) : null
    return parsed != null && Number.isFinite(parsed) ? parsed : null
  }
  const calculateTotalCost = (quantity: number | null, unitCost: number | null) =>
    quantity != null && unitCost != null ? quantity * unitCost : null

  const openVehicleEditModal = (vehicle: VehicleRow) => {
    setEditingVehicle(vehicle)
    setEditVehicleServiceable(String(vehicle.is_serviceable ?? true))
    setEditVehicleRemarks(getVehicleStatusRemark(vehicle.repair_history_log))
    setIsEditingVehicleDetails(false)
  }

  const closeVehicleEditModal = () => {
    if (editVehicleSaving) return
    setEditingVehicle(null)
    setEditVehicleServiceable('true')
    setEditVehicleRemarks('')
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
    new Set(inventoryItems.map((item) => item.status).filter((s): s is string => !!s)),
  )
  const statusOptions = Array.from(
    new Set<string>(['Serviceable', 'Unserviceable', ...dynamicStatusOptions]),
  ).sort()
  const acquisitionModeOptions = Array.from(
    new Set(inventoryItems.map((item) => item.acquisition_mode).filter((m): m is string => !!m)),
  ).sort()

  const wasteInventoryItems = inventoryItems.filter((item) => item.status?.trim() === 'Unserviceable')
  const vehicleWmrReports = wmrReports.filter((report) => report.item_id == null)

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

  const combinedFilteredWmrCount = filteredWasteItems.length + filteredVehicleWmrReports.length

  const filteredInventoryItems = inventoryItems.filter((item) => {
    const paddedId = `ITEM-${item.item_id.toString().padStart(3, '0')}`
    const matchesSearch =
      !normalizedSearch ||
      paddedId.toLowerCase().includes(normalizedSearch) ||
      item.item_name.toLowerCase().includes(normalizedSearch)

    const matchesType = typeFilter === 'all' || item.item_type === typeFilter

    const matchesDepartment =
      departmentFilter === 'all' || (item.department_id !== null && String(item.department_id) === departmentFilter)

    const matchesStatus = statusFilter === 'all' || item.status === statusFilter

    return matchesSearch && matchesType && matchesDepartment && matchesStatus
  })

  const today = new Date()
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

  const groupedParByStaff = parRecords.reduce(
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
  const activeVehicle =
    activeVehicleLogsId != null ? vehicles.find((vehicle) => vehicle.id === activeVehicleLogsId) ?? null : null
  const activeVehicleRepairs =
    activeVehicleLogsId != null
      ? vehicleRepairs.filter((repair) => repair.vehicle_id === activeVehicleLogsId)
      : []
  const activeVehicleRepairSpend = activeVehicleRepairs.reduce((sum, repair) => sum + Number(repair.amount ?? 0), 0)

  // [HANDLERS] PAR actions
  const escapeHtml = (value: string) =>
    value
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;')

  const handlePrintPar = () => {
    if (!activeParStaffId) return

    const rows = activeParRecords
      .slice()
      .sort((a, b) => b.par_id - a.par_id)
      .map((record) => {
        const item = inventoryItems.find((entry) => entry.item_id === record.item_id)

        return {
          quantity: String(record.quantity_issued ?? 0),
          unit: record.unit_snapshot ?? item?.unit_of_measure ?? 'N/A',
          description: record.description_snapshot ?? item?.item_name ?? '—',
          propertyNo:
            record.property_no_snapshot ??
            item?.property_no ??
            item?.qr_code ??
            (record.item_id != null ? `ITEM-${record.item_id.toString().padStart(3, '0')}` : '—'),
          dateAcquired: record.date_acquired_snapshot ?? item?.date_acquired ?? '—',
          cost:
            record.cost_snapshot != null
              ? formatCurrency(record.cost_snapshot)
              : item?.unit_cost != null
                ? formatCurrency(item.unit_cost)
                : 'N/A',
          lineTotal:
            record.cost_snapshot != null
              ? formatCurrency(calculateTotalCost(record.quantity_issued ?? null, record.cost_snapshot))
              : item?.unit_cost != null
                ? formatCurrency(calculateTotalCost(record.quantity_issued ?? null, item.unit_cost))
                : 'N/A',
        }
      })

    const rowsMarkup = rows
      .map(
        (row) =>
          `<tr>
            <td>${escapeHtml(row.quantity)}</td>
            <td>${escapeHtml(row.unit)}</td>
            <td>${escapeHtml(row.description)}</td>
            <td>${escapeHtml(row.propertyNo)}</td>
            <td>${escapeHtml(row.dateAcquired)}</td>
            <td>${escapeHtml(row.cost)}</td>
            <td>${escapeHtml(row.lineTotal)}</td>
          </tr>`,
      )
      .join('')

    const printWindow = window.open('', '_blank', 'width=980,height=760')

    if (!printWindow) {
      setParError('Could not open print window. Please allow pop-ups for this site.')
      return
    }

    printWindow.document.write(`
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>${escapeHtml(activeParNo)}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 24px; color: #111827; }
            h1 { margin: 0 0 16px; font-size: 20px; }
            .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 20px; margin-bottom: 16px; }
            .meta p { margin: 0; font-size: 14px; }
            table { width: 100%; border-collapse: collapse; font-size: 13px; }
            th, td { border: 1px solid #d1d5db; padding: 8px; text-align: left; }
            th { background: #f3f4f6; font-weight: 600; }
            .signatures { margin-top: 24px; display: grid; grid-template-columns: 1fr 1fr; gap: 40px; }
            .sign-line { margin-top: 48px; border-top: 1px solid #111827; padding-top: 6px; font-size: 12px; }
            @media print { body { margin: 10mm; } }
          </style>
        </head>
        <body>
          <h1>Property Acknowledgment Receipt</h1>
          <div class="meta">
            <p><strong>Employee Name:</strong> ${escapeHtml(activeParReceiver?.full_name ?? activeParStaffId)}</p>
            <p><strong>Department:</strong> ${escapeHtml(activeParDepartment)}</p>
            <p><strong>PAR No:</strong> ${escapeHtml(activeParNo)}</p>
            <p><strong>Date Printed:</strong> ${escapeHtml(new Date().toISOString().slice(0, 10))}</p>
          </div>

          <table>
            <thead>
              <tr>
                <th>QTY</th>
                <th>Unit</th>
                <th>Description</th>
                <th>Property No.</th>
                <th>Date Acquired</th>
                <th>Unit Cost</th>
                <th>Line Total</th>
              </tr>
            </thead>
            <tbody>
              ${rowsMarkup || '<tr><td colspan="7">No PAR items found.</td></tr>'}
            </tbody>
          </table>

          <div class="signatures">
            <div>
              <div class="sign-line">Received by (Employee)</div>
            </div>
            <div>
              <div class="sign-line">Issued by (Property Custodian)</div>
            </div>
          </div>
        </body>
      </html>
    `)

    printWindow.document.close()
    printWindow.focus()
    printWindow.print()
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
              selectedItem.qr_code ||
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

  // [HANDLERS] Vehicle actions
  const handleAddVehicle = async () => {
    if (!newVehicleMakeModel) {
      setVehicleError('Make/Model is required.')
      return
    }

    setVehicleSaving(true)
    setVehicleError(null)

    const yearValue = newVehicleYearModel ? Number(newVehicleYearModel) : null

    const { data, error: insertVehicleError } = await supabase
      .from('vehicles')
      .insert([
        {
          make_model: newVehicleMakeModel,
          year_model: Number.isNaN(yearValue) ? null : yearValue,
          cr_number: newVehicleCrNumber || null,
          engine_number: newVehicleEngineNumber || null,
          is_serviceable: newVehicleServiceable === 'true',
          repair_history_log: newVehicleRepairHistory || null,
        },
      ])
      .select('*')

    if (insertVehicleError) {
      setVehicleError(insertVehicleError.message)
      setVehicleSaving(false)
      return
    }

    const insertedVehicle = (data?.[0] ?? null) as VehicleRow | null

    if (insertedVehicle) {
      setVehicles((prev) => [...prev, insertedVehicle].sort((a, b) => a.id - b.id))
    }

    setNewVehicleMakeModel('')
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
        is_serviceable: editVehicleServiceable === 'true',
        repair_history_log: nextHistoryLog,
      })
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
              location: `Vehicle Registry - ${updatedVehicle.make_model ?? `VEH-${updatedVehicle.id.toString().padStart(3, '0')}`}`,
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
  const openWmrRemarksModal = (item: InventoryRow) => {
    const existingReport = wmrReports.find((report) => report.item_id === item.item_id) ?? null

    setActiveWmrItem(item)
    setActiveWmrReport(existingReport)
    setActiveWmrVehicleLabel(null)
    setWmrRemarksInput(existingReport?.admin_remarks ?? '')
    setWmrStatusInput(existingReport?.status ?? 'Pending')
    setIsEditingWmrRemarks(!existingReport || !existingReport.admin_remarks)
  }

  const openVehicleWmrRemarksModal = (report: WmrReportRow, label: string) => {
    setActiveWmrItem(null)
    setActiveWmrReport(report)
    setActiveWmrVehicleLabel(label)
    setWmrRemarksInput(report.admin_remarks ?? '')
    setWmrStatusInput(report.status ?? 'Pending')
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
    } else if (activeWmrItem) {
      const { data, error: insertError } = await supabase
        .from('wmr_reports')
        .insert([
          {
            item_id: activeWmrItem.item_id,
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
    setEditQuantity(item.quantity != null ? item.quantity.toString() : '')
    setEditUnitOfMeasure(item.unit_of_measure ?? '')
    setEditUnitCost(item.unit_cost != null ? item.unit_cost.toString() : '')
    setEditDateAcquired(item.date_acquired)
    setEditExpirationDate(item.expiration_date ?? '')
    setEditSource(item.acquisition_mode ?? '')
    setEditStatus(item.status ?? '')
  }

  const handleSaveEdit = async () => {
    if (!editingItem) return

    if (!editItemName || !editItemType || !editDateAcquired) {
      setInventoryError('Item name, type, and date acquired are required.')
      return
    }

    setEditSaving(true)
    setInventoryError(null)

    const quantityNumber = editQuantity ? Number(editQuantity) : null
    const unitCostNumber = editUnitCost ? Number(editUnitCost) : null

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
        quantity: Number.isNaN(quantityNumber) ? null : quantityNumber,
        unit_of_measure: editUnitOfMeasure || null,
        unit_cost: Number.isNaN(unitCostNumber) ? null : unitCostNumber,
        date_acquired: editDateAcquired,
        expiration_date: editExpirationDate || null,
        acquisition_mode: editSource || null,
        status: editStatus || null,
      })
      .eq('item_id', editingItem.item_id)

    if (updateError) {
      setInventoryError(updateError.message)
      setEditSaving(false)
      return
    }

    // Reload inventory list from database
    setInventoryLoading(true)
    const { data, error: reloadError } = await supabase.from('inventory').select('*').order('item_id', {
      ascending: true,
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

  const extractStoragePathFromPublicUrl = (url: string) => {
    const marker = `/object/public/${INVENTORY_PHOTO_BUCKET}/`
    const markerIndex = url.indexOf(marker)

    if (markerIndex === -1) return null

    return decodeURIComponent(url.slice(markerIndex + marker.length))
  }

  const openDeleteConfirmation = (item: InventoryRow) => {
    setDeleteTargetItem(item)
  }

  const handleDeleteItem = async (itemToDelete?: InventoryRow) => {
    const targetItem = itemToDelete ?? editingItem
    if (!targetItem) return

    setEditDeleting(true)
    setInventoryError(null)

    const [{ count: parCount, error: parCountError }, { count: wmrCount, error: wmrCountError }] = await Promise.all([
      supabase
        .from('par_records')
        .select('*', { count: 'exact', head: true })
        .eq('item_id', targetItem.item_id),
      supabase
        .from('wmr_reports')
        .select('*', { count: 'exact', head: true })
        .eq('item_id', targetItem.item_id),
    ])

    if (parCountError || wmrCountError) {
      setInventoryError(parCountError?.message || wmrCountError?.message || 'Failed to validate item dependencies.')
      setEditDeleting(false)
      return
    }

    if ((parCount ?? 0) > 0 || (wmrCount ?? 0) > 0) {
      setInventoryError('Cannot delete this item because it has related PAR/WMR records.')
      setEditDeleting(false)
      return
    }

    const linkedPhotos = inventoryPhotos.filter((photo) => photo.item_id === targetItem.item_id)
    const photoPathsToDelete = linkedPhotos
      .map((photo) => extractStoragePathFromPublicUrl(photo.photo_url))
      .filter((path): path is string => !!path)

    if (linkedPhotos.length > 0) {
      const { error: deletePhotoRowsError } = await supabase
        .from('inventory_photos')
        .delete()
        .eq('item_id', targetItem.item_id)

      if (deletePhotoRowsError) {
        setInventoryError(deletePhotoRowsError.message)
        setEditDeleting(false)
        return
      }
    }

    if (photoPathsToDelete.length > 0) {
      const { error: removeStorageError } = await supabase.storage
        .from(INVENTORY_PHOTO_BUCKET)
        .remove(photoPathsToDelete)

      if (removeStorageError) {
        setInventoryError(`Item deleted but failed to remove one or more photo files: ${removeStorageError.message}`)
      }
    }

    const { error: deleteInventoryError } = await supabase
      .from('inventory')
      .delete()
      .eq('item_id', targetItem.item_id)

    if (deleteInventoryError) {
      setInventoryError(deleteInventoryError.message)
      setEditDeleting(false)
      return
    }

    setInventoryItems((prev) => prev.filter((item) => item.item_id !== targetItem.item_id))
    setInventoryPhotos((prev) => prev.filter((photo) => photo.item_id !== targetItem.item_id))
    setEditDeleting(false)
    setDeleteTargetItem(null)
    if (editingItem?.item_id === targetItem.item_id) {
      setEditingItem(null)
    }
  }

  const handleAddItem = async () => {
    if (!newItemName || !newItemType || !newDateAcquired) {
      setInventoryError('Item name, type, and date acquired are required.')
      return
    }

    setAddingItem(true)
    setInventoryError(null)

    const quantityNumber = newQuantity ? Number(newQuantity) : null
    const unitCostNumber = newUnitCost ? Number(newUnitCost) : null
    const { data: insertedItems, error: insertError } = await supabase.from('inventory').insert([
      {
        item_name: newItemName,
        item_type: newItemType,
        quantity: Number.isNaN(quantityNumber) ? null : quantityNumber,
        unit_of_measure: newUnitOfMeasure || null,
        unit_cost: Number.isNaN(unitCostNumber) ? null : unitCostNumber,
        date_acquired: newDateAcquired,
        acquisition_mode: newSource || null,
      },
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

    const uploadedPhotoUrls: string[] = []

    for (const file of newPhotoFiles) {
      const fileExt = file.name.split('.').pop() || 'jpg'
      const fileName = `item-${insertedItem.item_id}-${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`
      const filePath = `items/${insertedItem.item_id}/${fileName}`

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
    setNewQuantity('')
    setNewUnitOfMeasure('')
    setNewUnitCost('')
    setNewDateAcquired('')
    setNewSource('')
    setNewPhotoFiles([])

    // Reload inventory list
    setInventoryLoading(true)
    const { data, error: reloadError } = await supabase.from('inventory').select('*').order('item_id', {
      ascending: true,
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

    const qrValue = `ITEM-${item.item_id.toString().padStart(3, '0')}`

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

  // [HANDLERS] Stockpile actions
  const handleAddStockpile = async () => {
    if (!newStockpileItemName || !newStockpileCategory || !newStockpileQuantity || !newStockpileUnitOfMeasure) {
      setStockpileError('Item name, category, quantity, and unit are required.')
      return
    }

    setAddingStockpile(true)
    setStockpileError(null)

    const quantityNumber = Number(newStockpileQuantity)

    if (Number.isNaN(quantityNumber) || quantityNumber <= 0) {
      setStockpileError('Quantity must be a positive number.')
      setAddingStockpile(false)
      return
    }

    const { error: insertError } = await supabase
      .from('stockpile')
      .insert([
        {
          item_name: newStockpileItemName,
          category: newStockpileCategory,
          quantity_on_hand: quantityNumber,
          unit_of_measure: newStockpileUnitOfMeasure,
          packed_date: newStockpilePackedDate || null,
          expiration_date: newStockpileExpirationDate || null,
        },
      ])

    if (insertError) {
      setStockpileError(insertError.message)
      setAddingStockpile(false)
      return
    }

    // Clear form
    setNewStockpileItemName('')
    setNewStockpileCategory('')
    setNewStockpileQuantity('')
    setNewStockpileUnitOfMeasure('')
    setNewStockpilePackedDate('')
    setNewStockpileExpirationDate('')
    setStockpileMode('list')

    // Reload stockpile list
    setStockpileLoading(true)
    const { data, error: reloadError } = await supabase
      .from('stockpile')
      .select('*')
      .order('stockpile_id', { ascending: true })

    if (reloadError) {
      setStockpileError(reloadError.message)
    } else {
      setStockpileItems(data ?? [])
    }

    setStockpileLoading(false)
    setAddingStockpile(false)
  }

  const openStockpileReleaseModal = () => {
    const targetItem = stockpileItems[0] ?? null

    if (!targetItem) {
      setStockpileError('No stockpile item available for release.')
      return
    }

    setActiveReleaseStockpile(targetItem)
    setReleaseQtyInput('')
    setReleaseIssuedToInput('')
    setReleaseReasonInput('')
  }

  const closeStockpileReleaseModal = () => {
    if (releasingStockpile) return
    setActiveReleaseStockpile(null)
  }

  const handleReleaseStockpile = async () => {
    if (!activeReleaseStockpile) return

    const expiration = activeReleaseStockpile.expiration_date
      ? new Date(activeReleaseStockpile.expiration_date)
      : null
    const isExpired = expiration != null && !Number.isNaN(expiration.getTime()) && expiration < new Date()
    const availableQty = Number(activeReleaseStockpile.quantity_on_hand ?? 0)

    if (isExpired) {
      setStockpileError('Item is not available for release because it is already expired.')
      return
    }

    if (!Number.isFinite(availableQty) || availableQty <= 0) {
      setStockpileError('Item is not available for release because there is no quantity on hand.')
      return
    }

    if (!releaseIssuedToInput.trim() || !releaseReasonInput.trim() || !releaseQtyInput.trim()) {
      setStockpileError('Release quantity, issued to, and reason are required.')
      return
    }

    const qtyToRelease = Number(releaseQtyInput)
    const currentQty = Number(activeReleaseStockpile.quantity_on_hand ?? 0)

    if (Number.isNaN(qtyToRelease) || qtyToRelease <= 0) {
      setStockpileError('Release quantity must be a positive number.')
      return
    }

    if (qtyToRelease > currentQty) {
      setStockpileError('Release quantity cannot exceed quantity on hand.')
      return
    }

    setReleasingStockpile(true)
    setStockpileError(null)

    const updatedQty = currentQty - qtyToRelease

    const { error: updateStockpileError } = await supabase
      .from('stockpile')
      .update({ quantity_on_hand: updatedQty })
      .eq('stockpile_id', activeReleaseStockpile.stockpile_id)

    if (updateStockpileError) {
      setStockpileError(updateStockpileError.message)
      setReleasingStockpile(false)
      return
    }

    const { error: insertLogError } = await supabase
      .from('distribution_logs')
      .insert([
        {
          operation_date: new Date().toISOString().slice(0, 10),
          calamity_name: releaseReasonInput.trim(),
          recipient_info: releaseIssuedToInput.trim(),
          items_distributed: [
            {
              stockpile_id: activeReleaseStockpile.stockpile_id,
              item_name: activeReleaseStockpile.item_name,
              quantity: qtyToRelease,
              unit_of_measure: activeReleaseStockpile.unit_of_measure,
            },
          ],
        },
      ])

    if (insertLogError) {
      // Best-effort rollback for stock quantity if log insert fails.
      await supabase
        .from('stockpile')
        .update({ quantity_on_hand: currentQty })
        .eq('stockpile_id', activeReleaseStockpile.stockpile_id)
      setStockpileError(insertLogError.message)
      setReleasingStockpile(false)
      return
    }

    const [{ data: reloadedStockpiles, error: reloadStockpileError }, { data: reloadedLogs, error: reloadLogsError }] =
      await Promise.all([
        supabase.from('stockpile').select('*').order('stockpile_id', { ascending: true }),
        supabase.from('distribution_logs').select('*').order('log_id', { ascending: false }),
      ])

    if (reloadStockpileError) {
      setStockpileError(reloadStockpileError.message)
    } else {
      setStockpileItems(reloadedStockpiles ?? [])
    }

    if (reloadLogsError) {
      setStockpileError((prev) => prev ?? reloadLogsError.message)
    } else {
      setStockpileReleaseLogs(reloadedLogs ?? [])
    }

    setReleasingStockpile(false)
    setActiveReleaseStockpile(null)
  }

  const handleReleaseItemSelection = (stockpileId: string) => {
    const selected = stockpileItems.find((item) => item.stockpile_id === Number(stockpileId)) ?? null
    setActiveReleaseStockpile(selected)
    setReleaseQtyInput('')
  }

  const handlePrintStockpileReleaseLogs = () => {
    const rows = parsedStockpileReleaseLogs
      .slice()
      .sort((a, b) => b.log.log_id - a.log.log_id)
      .map((entry) => ({
        date: formatDisplayDate(entry.log.operation_date),
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

    const printWindow = window.open('', '_blank', 'width=980,height=760')

    if (!printWindow) {
      setStockpileError('Could not open print window. Please allow pop-ups for this site.')
      return
    }

    printWindow.document.write(`
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Stockpile Release Logs</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 24px; color: #111827; }
            h1 { margin: 0 0 8px; font-size: 20px; }
            p { margin: 0 0 14px; color: #4b5563; font-size: 13px; }
            table { width: 100%; border-collapse: collapse; font-size: 13px; }
            th, td { border: 1px solid #d1d5db; padding: 8px; text-align: left; }
            th { background: #f3f4f6; font-weight: 600; }
            @media print { body { margin: 10mm; } }
          </style>
        </head>
        <body>
          <h1>Stockpile Release Logs</h1>
          <p>Printed on ${escapeHtml(new Date().toLocaleString('en-PH'))}</p>
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
        </body>
      </html>
    `)

    printWindow.document.close()
    printWindow.focus()
    printWindow.print()
  }

  const dynamicStockpileCategories = Array.from(
    new Set(stockpileItems.map((item) => item.category?.trim()).filter((cat): cat is string => !!cat)),
  )

  const categoryOptions = Array.from(
    new Set([...DEFAULT_STOCKPILE_CATEGORIES, ...dynamicStockpileCategories]),
  )

  const filteredStockpileItems = stockpileItems.filter((item) => {
    const matchesSearch =
      !stockpileSearchQuery ||
      (item.item_name ?? '').toLowerCase().includes(stockpileSearchQuery.toLowerCase())
    const matchesCategory = stockpileCategoryFilter === 'all' || item.category === stockpileCategoryFilter
    return matchesSearch && matchesCategory
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
  })

  const newItemQuantityValue = parseNumericInput(newQuantity)
  const newItemUnitCostValue = parseNumericInput(newUnitCost)
  const newItemTotalCost = calculateTotalCost(newItemQuantityValue, newItemUnitCostValue)

  const editItemQuantityValue = parseNumericInput(editQuantity)
  const editItemUnitCostValue = parseNumericInput(editUnitCost)
  const editItemTotalCost = calculateTotalCost(editItemQuantityValue, editItemUnitCostValue)

  const parQuantityValue = parseNumericInput(parQuantityIssued)
  const parUnitCostValue = parseNumericInput(parCostInput)
  const parLineTotal = calculateTotalCost(parQuantityValue, parUnitCostValue)

  // [RENDER] Main layout and section tabs
  return (
    <div className="dashboard-page">
      <Sidebar activeSection={activeSection} onChangeSection={setActiveSection} />

      <main className="dashboard-main">
        {activeSection === 'dashboard' && (
          <>
            <header className="dashboard-header">
              <div>
                <h2>Dashboard</h2>
                <p>Welcome back, Super Admin</p>
              </div>
            </header>

            {error && <p className="dashboard-error">{error}</p>}

            <section className="dashboard-metrics" aria-label="Item summary">
              <article className="metric-card">
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
                      strokeWidth="1.5"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              </article>
              <article className="metric-card metric-card-serviceable">
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
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              </article>
              <article className="metric-card metric-card-unserviceable">
                <div className="metric-text">
                  <div className="metric-label">Unserviceable</div>
                  <div className="metric-value">{formatValue(summary.unserviceable)}</div>
                </div>
                <div className="metric-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                    <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.8" />
                    <path d="M8 8l8 8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                </div>
              </article>
              <article className="metric-card">
                <div className="metric-text">
                  <div className="metric-label">Expired Items</div>
                  <div className="metric-value">{formatValue(summary.expired)}</div>
                </div>
                <div className="metric-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                    <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.8" />
                    <path
                      d="M12 8v4l3 2"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              </article>
            </section>

            <section className="dashboard-actions" aria-label="Key actions">
              <button
                type="button"
                className="action-card action-card-item"
                onClick={() => setActiveSection('inventory')}
              >
            <span className="action-card-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <rect x="5" y="8" width="14" height="10" rx="2" ry="2" fill="none" stroke="currentColor" strokeWidth="1.8" />
                <path d="M5 11h14" fill="none" stroke="currentColor" strokeWidth="1.6" />
              </svg>
            </span>
            <div className="action-card-body">
              <h3>Item Management</h3>
              <p>Add and manage inventory items</p>
            </div>
          </button>
          <button type="button" className="action-card action-card-staff">
            <span className="action-card-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <circle cx="9" cy="10" r="2.4" fill="none" stroke="currentColor" strokeWidth="1.6" />
                <circle cx="16" cy="11" r="2" fill="none" stroke="currentColor" strokeWidth="1.4" />
                <path d="M5.5 18c.6-2 1.9-3 3.5-3s2.9 1 3.5 3" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                <path d="M13.8 18c.4-1.3 1.3-2 2.3-2 1 0 1.9.6 2.3 1.7" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
            </span>
            <div className="action-card-body">
              <h3>Staff Management</h3>
              <p>Manage departments and staff</p>
            </div>
          </button>
          <button
            type="button"
            className="action-card action-card-wmr"
            onClick={() => setActiveSection('wmr')}
          >
            <span className="action-card-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path d="M12 4L3 19h18L12 4z" fill="none" stroke="currentColor" strokeWidth="1.8" />
                <path d="M12 9v5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                <circle cx="12" cy="16" r="0.9" fill="currentColor" />
              </svg>
            </span>
            <div className="action-card-body">
              <h3>Waste Material Reports</h3>
              <p>View WMR cases</p>
            </div>
          </button>
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
              {departments.map((dept) => (
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
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            typeOptions={typeOptions}
            departments={departments.map((dept) => ({ id: dept.id, name: dept.name }))}
            statusOptions={statusOptions}
            inventoryLoading={inventoryLoading}
            filteredInventoryItems={filteredInventoryItems}
            getItemPhotoUrls={getItemPhotoUrls}
            openEditItem={openEditItem}
            setViewImageItem={setViewImageItem}
            setViewImageIndex={setViewImageIndex}
            handleQrButtonClick={handleQrButtonClick}
            qrGeneratingId={qrGeneratingId}
            editDeleting={editDeleting}
            openDeleteConfirmation={openDeleteConfirmation}
            formatCurrency={formatCurrency}
            calculateTotalCost={calculateTotalCost}
            newItemName={newItemName}
            setNewItemName={setNewItemName}
            newItemType={newItemType}
            setNewItemType={setNewItemType}
            newQuantity={newQuantity}
            setNewQuantity={setNewQuantity}
            newUnitOfMeasure={newUnitOfMeasure}
            setNewUnitOfMeasure={setNewUnitOfMeasure}
            newUnitCost={newUnitCost}
            setNewUnitCost={setNewUnitCost}
            newDateAcquired={newDateAcquired}
            setNewDateAcquired={setNewDateAcquired}
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
          />
        )}

        {activeSection === 'stockpile' && (
          <StockpileSection
            loading={loading}
            totalStockpiles={stockpileItems.length}
            formatValue={formatValue}
            stockpileError={stockpileError}
            stockpileMode={stockpileMode}
            setStockpileMode={setStockpileMode}
            searchQuery={stockpileSearchQuery}
            setSearchQuery={setStockpileSearchQuery}
            categoryFilter={stockpileCategoryFilter}
            setCategoryFilter={setStockpileCategoryFilter}
            categoryOptions={categoryOptions}
            stockpileLoading={stockpileLoading || stockpileReleaseLoading}
            filteredStockpileItems={filteredStockpileItems}
            stockpileReleaseLogs={parsedStockpileReleaseLogs}
            openReleaseModal={openStockpileReleaseModal}
            handlePrintReleaseLogs={handlePrintStockpileReleaseLogs}
            formatDisplayDate={formatDisplayDate}
            newItemName={newStockpileItemName}
            setNewItemName={setNewStockpileItemName}
            newCategory={newStockpileCategory}
            setNewCategory={setNewStockpileCategory}
            newQuantity={newStockpileQuantity}
            setNewQuantity={setNewStockpileQuantity}
            newUnitOfMeasure={newStockpileUnitOfMeasure}
            setNewUnitOfMeasure={setNewStockpileUnitOfMeasure}
            newPackedDate={newStockpilePackedDate}
            setNewPackedDate={setNewStockpilePackedDate}
            newExpirationDate={newStockpileExpirationDate}
            setNewExpirationDate={setNewStockpileExpirationDate}
            addingStockpile={addingStockpile}
            handleAddStockpile={handleAddStockpile}
            unitOfMeasureOptions={unitOfMeasureOptions}
          />
        )}

        {activeSection === 'wmr' && (
          <WmrSection
            wmrLoading={wmrLoading}
            inventoryLoading={inventoryLoading}
            wmrError={wmrError}
            wasteInventoryItemsCount={wasteInventoryItems.length}
            vehicleWmrReportsCount={vehicleWmrReports.length}
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
            wmrReports={wmrReports}
            formatDisplayDate={formatDisplayDate}
            openWmrRemarksModal={openWmrRemarksModal}
            filteredVehicleWmrReports={filteredVehicleWmrReports}
            openVehicleWmrRemarksModal={openVehicleWmrRemarksModal}
          />
        )}

        {activeSection === 'vehicles' && (
          <VehiclesSection
            vehicleLoading={vehicleLoading}
            vehicleError={vehicleError}
            vehicleMode={vehicleMode}
            setVehicleMode={setVehicleMode}
            vehicles={vehicles}
            vehicleRepairs={vehicleRepairs}
            formatCurrency={formatCurrency}
            setActiveVehicleLogsId={setActiveVehicleLogsId}
            openVehicleEditModal={openVehicleEditModal}
            newVehicleMakeModel={newVehicleMakeModel}
            setNewVehicleMakeModel={setNewVehicleMakeModel}
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
          />
        )}

        {activeSection === 'par' && (
          <ParSection
            parError={parError}
            parMode={parMode}
            setParMode={setParMode}
            parItemId={parItemId}
            setParItemId={setParItemId}
            inventoryItems={inventoryItems}
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
            parSaving={parSaving}
            parSearchQuery={parSearchQuery}
            setParSearchQuery={setParSearchQuery}
            parLoading={parLoading}
            filteredParSummaries={filteredParSummaries}
            setActiveParStaffId={setActiveParStaffId}
          />
        )}
      </main>

      {/* [MODAL] Stockpile release */}
      {activeReleaseStockpile && (
        <div
          className="logout-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="stockpile-release-modal-title"
        >
          {(() => {
            const expiration = activeReleaseStockpile.expiration_date
              ? new Date(activeReleaseStockpile.expiration_date)
              : null
            const isExpired = expiration != null && !Number.isNaN(expiration.getTime()) && expiration < new Date()
            const availableQty = Number(activeReleaseStockpile.quantity_on_hand ?? 0)
            const isUnavailable = isExpired || !Number.isFinite(availableQty) || availableQty <= 0
            const releaseUnavailableMessage = isExpired
              ? 'Item is not available for release because it is already expired.'
              : !Number.isFinite(availableQty) || availableQty <= 0
                ? 'Item is not available for release because there is no quantity on hand.'
                : null

            return (
              <div className="logout-modal" style={{ maxWidth: 520 }}>
            <h2 id="stockpile-release-modal-title" className="logout-modal-title">
              Stockpile Release
            </h2>

            <p className="logout-modal-text" style={{ marginBottom: 12 }}>
              <strong>Item:</strong> {activeReleaseStockpile.item_name ?? '—'}
              <br />
              <strong>Available:</strong> {activeReleaseStockpile.quantity_on_hand ?? 0} {activeReleaseStockpile.unit_of_measure ?? ''}
            </p>

            {releaseUnavailableMessage && (
              <p className="dashboard-error" style={{ marginTop: 0, marginBottom: 10 }}>
                {releaseUnavailableMessage}
              </p>
            )}

            <div className="inventory-add-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
              <div className="inventory-field inventory-field-full" style={{ gridColumn: '1 / -1' }}>
                <label htmlFor="stockpile-release-item">
                  Stockpile Item <span className="inventory-required">*</span>
                </label>
                <select
                  id="stockpile-release-item"
                  className="inventory-input"
                  value={String(activeReleaseStockpile.stockpile_id)}
                  onChange={(e) => handleReleaseItemSelection(e.target.value)}
                  disabled={releasingStockpile}
                >
                  {stockpileItems.map((item) => (
                    <option key={item.stockpile_id} value={item.stockpile_id}>
                      {`${item.item_name ?? 'Unnamed'} (${item.quantity_on_hand ?? 0} ${item.unit_of_measure ?? ''})`}
                    </option>
                  ))}
                </select>
              </div>

              <div className="inventory-field">
                <label htmlFor="stockpile-release-qty">
                  Release Quantity <span className="inventory-required">*</span>
                </label>
                <input
                  id="stockpile-release-qty"
                  type="number"
                  min="1"
                  max={activeReleaseStockpile.quantity_on_hand ?? undefined}
                  className="inventory-input"
                  value={releaseQtyInput}
                  onChange={(e) => setReleaseQtyInput(e.target.value)}
                  disabled={isUnavailable}
                />
              </div>

              <div className="inventory-field">
                <label htmlFor="stockpile-release-issued-to">
                  Issued To <span className="inventory-required">*</span>
                </label>
                <input
                  id="stockpile-release-issued-to"
                  type="text"
                  className="inventory-input"
                  placeholder="e.g. Barangay Banicain"
                  value={releaseIssuedToInput}
                  onChange={(e) => setReleaseIssuedToInput(e.target.value)}
                />
              </div>

              <div className="inventory-field inventory-field-full" style={{ gridColumn: '1 / -1' }}>
                <label htmlFor="stockpile-release-reason">
                  Reason of Issuance <span className="inventory-required">*</span>
                </label>
                <input
                  id="stockpile-release-reason"
                  type="text"
                  className="inventory-input"
                  placeholder="e.g. Typhoon relief"
                  value={releaseReasonInput}
                  onChange={(e) => setReleaseReasonInput(e.target.value)}
                />
              </div>
            </div>

            <div className="logout-modal-actions" style={{ marginTop: 14 }}>
              <button
                type="button"
                className="logout-modal-button-secondary"
                onClick={closeStockpileReleaseModal}
                disabled={releasingStockpile}
              >
                Cancel
              </button>
              <button
                type="button"
                className="wmr-modal-button-save"
                onClick={handleReleaseStockpile}
                disabled={releasingStockpile || isUnavailable}
              >
                {releasingStockpile ? 'Releasing…' : 'Release'}
              </button>
            </div>
          </div>
            )
          })()}
        </div>
      )}

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
                    <th scope="col">Date Acquired</th>
                    <th scope="col">Unit Cost</th>
                    <th scope="col">Line Total</th>
                  </tr>
                </thead>
                <tbody>
                  {activeParRecords.length === 0 ? (
                    <tr>
                      <td colSpan={7}>No PAR items found.</td>
                    </tr>
                  ) : (
                    activeParRecords
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
                                item?.qr_code ??
                                (record.item_id != null ? `ITEM-${record.item_id.toString().padStart(3, '0')}` : '—')}
                            </td>
                            <td>{record.date_acquired_snapshot ?? item?.date_acquired ?? '—'}</td>
                            <td>
                              {record.cost_snapshot != null
                                ? formatCurrency(record.cost_snapshot)
                                : item?.unit_cost != null
                                  ? formatCurrency(item.unit_cost)
                                  : 'N/A'}
                            </td>
                            <td>
                              {record.cost_snapshot != null
                                ? formatCurrency(calculateTotalCost(record.quantity_issued ?? null, record.cost_snapshot))
                                : item?.unit_cost != null
                                  ? formatCurrency(calculateTotalCost(record.quantity_issued ?? null, item.unit_cost))
                                  : 'N/A'}
                            </td>
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
                onClick={handlePrintPar}
              >
                Print PAR
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
              <p className="wmr-modal-text"><strong>Vehicle:</strong> {activeVehicle.make_model}</p>
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
                    <th scope="col">Date Repaired</th>
                    <th scope="col">Job Order No.</th>
                    <th scope="col">Service Center</th>
                    <th scope="col">Remarks</th>
                    <th scope="col">Repair Cost</th>
                    <th scope="col">Issued To</th>
                  </tr>
                </thead>
                <tbody>
                  {activeVehicleRepairs.length === 0 ? (
                    <tr>
                      <td colSpan={7}>No repair logs for this vehicle.</td>
                    </tr>
                  ) : (
                    activeVehicleRepairs
                      .slice()
                      .sort((a, b) => b.repair_id - a.repair_id)
                      .map((repair) => {
                        const repairAdmin = parUsers.find((user) => user.id === repair.admin_id)

                        return (
                          <tr key={repair.repair_id}>
                            <td>{`VR-${repair.repair_id.toString().padStart(3, '0')}`}</td>
                            <td>{formatDisplayDate(repair.date_repaired)}</td>
                            <td>{repair.job_order_number || '—'}</td>
                            <td>{repair.service_center || '—'}</td>
                            <td>{getRepairDescription(repair.repair_id, activeVehicle.repair_history_log)}</td>
                            <td>{formatCurrency(Number(repair.amount ?? 0))}</td>
                            <td>{repairAdmin?.full_name || repair.admin_id || '—'}</td>
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
              View Vehicle
            </h2>

            <div className="par-meta-grid">
              <p className="wmr-modal-text">
                <strong>Vehicle ID:</strong> {`VEH-${editingVehicle.id.toString().padStart(3, '0')}`}
              </p>
              <p className="wmr-modal-text">
                <strong>Make / Model:</strong> {editingVehicle.make_model ?? '—'}
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
                <label htmlFor="edit-unit-cost">Unit Cost</label>
                <input
                  id="edit-unit-cost"
                  type="number"
                  min="0"
                  step="0.01"
                  className="inventory-input"
                  value={editUnitCost}
                  onChange={(e) => setEditUnitCost(e.target.value)}
                />
              </div>
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
              <div className="inventory-field">
                <label htmlFor="edit-date-acquired">
                  Date Acquired <span className="inventory-required">*</span>
                </label>
                <input
                  id="edit-date-acquired"
                  type="date"
                  className="inventory-input"
                  value={editDateAcquired}
                  onChange={(e) => setEditDateAcquired(e.target.value)}
                />
              </div>
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
              <div className="inventory-field">
                <label htmlFor="edit-source">Source</label>
                <select
                  id="edit-source"
                  className="inventory-input"
                  value={editSource}
                  onChange={(e) => setEditSource(e.target.value)}
                >
                  <option value="">Select source</option>
                  {acquisitionModeOptions.map((mode) => (
                    <option key={mode} value={mode}>
                      {mode}
                    </option>
                  ))}
                </select>
              </div>
              <div className="inventory-field">
                <label htmlFor="edit-status">Status</label>
                <select
                  id="edit-status"
                  className="inventory-input"
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                >
                  <option value="">Select status</option>
                  {statusOptions.map((statusOption) => (
                    <option key={statusOption} value={statusOption}>
                      {statusOption}
                    </option>
                  ))}
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

      {/* [MODAL] Inventory delete confirmation */}
      {deleteTargetItem && (
        <div
          className="inventory-delete-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="inventory-delete-modal-title"
        >
          <div className="inventory-delete-modal">
            <h2 id="inventory-delete-modal-title" className="inventory-delete-modal-title">
              Delete Item
            </h2>
            <p className="inventory-delete-modal-text">
              Delete <strong>{deleteTargetItem.item_name}</strong>? This action cannot be undone.
            </p>
            <p className="inventory-delete-modal-subtext">
              Items with linked PAR/WMR records cannot be deleted.
            </p>
            <div className="inventory-delete-modal-actions">
              <button
                type="button"
                className="inventory-delete-button-cancel"
                onClick={() => {
                  if (!editDeleting) setDeleteTargetItem(null)
                }}
                disabled={editDeleting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="inventory-delete-button-confirm"
                onClick={() => {
                  void handleDeleteItem(deleteTargetItem)
                }}
                disabled={editDeleting}
              >
                {editDeleting ? 'Deleting…' : 'Delete'}
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
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
                <QRCodeSVG
                  value={viewQrItem.qr_code}
                  size={200}
                  bgColor="transparent"
                  fgColor="#111827"
                  includeMargin
                />
              </div>
            ) : (
              <p className="logout-modal-text">No QR code available for this item.</p>
            )}
            <div className="logout-modal-actions">
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
