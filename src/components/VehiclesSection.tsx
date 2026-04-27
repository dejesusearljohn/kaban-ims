import { useEffect, useMemo, useState } from 'react'
import type { Tables } from '../../supabase'
import useResponsivePageSize from './useResponsivePageSize'

type VehicleRow = Tables<'vehicles'>
type VehicleRepairRow = Tables<'vehicle_repairs'>
type UserRow = Tables<'users'>

type VehiclesSectionProps = {
  vehicleLoading: boolean
  vehicleError: string | null
  vehicleMode: 'manage' | 'add-vehicle' | 'add-repair'
  setVehicleMode: (mode: 'manage' | 'add-vehicle' | 'add-repair') => void
  vehicles: VehicleRow[]
  vehicleRepairs: VehicleRepairRow[]
  formatCurrency: (value: number | null) => string
  setActiveVehicleLogsId: (id: number | null) => void
  openVehicleEditModal: (vehicle: VehicleRow) => void
  newVehicleMakeModel: string
  setNewVehicleMakeModel: (value: string) => void
  newVehicleYearModel: string
  setNewVehicleYearModel: (value: string) => void
  newVehicleCrNumber: string
  setNewVehicleCrNumber: (value: string) => void
  newVehicleEngineNumber: string
  setNewVehicleEngineNumber: (value: string) => void
  newVehicleServiceable: string
  setNewVehicleServiceable: (value: string) => void
  newVehicleRepairHistory: string
  setNewVehicleRepairHistory: (value: string) => void
  handleAddVehicle: () => void
  vehicleSaving: boolean
  newRepairVehicleId: string
  setNewRepairVehicleId: (value: string) => void
  newRepairAdminId: string
  setNewRepairAdminId: (value: string) => void
  newRepairAmount: string
  setNewRepairAmount: (value: string) => void
  newRepairDate: string
  setNewRepairDate: (value: string) => void
  newRepairJobOrder: string
  setNewRepairJobOrder: (value: string) => void
  newRepairServiceCenter: string
  setNewRepairServiceCenter: (value: string) => void
  newRepairDescription: string
  setNewRepairDescription: (value: string) => void
  parUsers: UserRow[]
  handleAddVehicleRepair: () => void
  handleArchiveVehicle: (vehicle: VehicleRow) => void
}

function VehiclesSection({
  vehicleLoading,
  vehicleError,
  vehicleMode,
  setVehicleMode,
  vehicles,
  vehicleRepairs,
  formatCurrency,
  setActiveVehicleLogsId,
  openVehicleEditModal,
  newVehicleMakeModel,
  setNewVehicleMakeModel,
  newVehicleYearModel,
  setNewVehicleYearModel,
  newVehicleCrNumber,
  setNewVehicleCrNumber,
  newVehicleEngineNumber,
  setNewVehicleEngineNumber,
  newVehicleServiceable,
  setNewVehicleServiceable,
  newVehicleRepairHistory,
  setNewVehicleRepairHistory,
  handleAddVehicle,
  vehicleSaving,
  newRepairVehicleId,
  setNewRepairVehicleId,
  newRepairAdminId,
  setNewRepairAdminId,
  newRepairAmount,
  setNewRepairAmount,
  newRepairDate,
  setNewRepairDate,
  newRepairJobOrder,
  setNewRepairJobOrder,
  newRepairServiceCenter,
  setNewRepairServiceCenter,
  newRepairDescription,
  setNewRepairDescription,
  parUsers,
  handleAddVehicleRepair,
  handleArchiveVehicle,
}: VehiclesSectionProps) {
  const vehiclesPageSize = useResponsivePageSize(8)
  const [vehiclePage, setVehiclePage] = useState(1)

  const vehicleTotalPages = Math.max(1, Math.ceil(vehicles.length / vehiclesPageSize))

  useEffect(() => {
    if (vehicleMode !== 'manage') {
      return
    }
    setVehiclePage(1)
  }, [vehicleMode])

  useEffect(() => {
    if (vehiclePage > vehicleTotalPages) {
      setVehiclePage(vehicleTotalPages)
    }
  }, [vehiclePage, vehicleTotalPages])

  const paginatedVehicles = useMemo(() => {
    const start = (vehiclePage - 1) * vehiclesPageSize
    return vehicles.slice(start, start + vehiclesPageSize)
  }, [vehicles, vehiclePage, vehiclesPageSize])

  const visibleVehiclePageNumbers = useMemo(() => {
    const maxVisiblePages = 5
    if (vehicleTotalPages <= maxVisiblePages) {
      return Array.from({ length: vehicleTotalPages }, (_, index) => index + 1)
    }

    const halfWindow = Math.floor(maxVisiblePages / 2)
    let start = Math.max(1, vehiclePage - halfWindow)
    let end = Math.min(vehicleTotalPages, start + maxVisiblePages - 1)

    if (end - start + 1 < maxVisiblePages) {
      start = Math.max(1, end - maxVisiblePages + 1)
    }

    return Array.from({ length: end - start + 1 }, (_, index) => start + index)
  }, [vehiclePage, vehicleTotalPages])

  return (
    <div className="inventory-layout">
      <header className="dashboard-header">
        <div>
          <h2>Vehicles</h2>
          <p>
            {vehicleLoading
              ? 'Loading vehicles and repair logs…'
              : `Total Vehicles: ${vehicles.length} • Repair Logs: ${vehicleRepairs.length}`}
          </p>
        </div>
      </header>

      {vehicleError && <p className="dashboard-error">{vehicleError}</p>}

      <section className="inventory-toolbar" aria-label="Vehicle actions">
        <button
          type="button"
          className={vehicleMode === 'manage' ? 'inventory-primary-button' : 'inventory-secondary-button'}
          onClick={() => setVehicleMode('manage')}
        >
          Manage Vehicles
        </button>
        <button
          type="button"
          className={vehicleMode === 'add-vehicle' ? 'inventory-primary-button' : 'inventory-secondary-button'}
          onClick={() => setVehicleMode('add-vehicle')}
        >
          Add Vehicle
        </button>
      </section>

      {vehicleMode === 'manage' && (
        <>
          <section className="dashboard-metrics vehicle-metrics" aria-label="Vehicle summary">
            <article className="dashboard-metric-card">
              <span className="dashboard-metric-label">Serviceable</span>
              <strong className="dashboard-metric-value">
                {vehicles.filter((vehicle) => vehicle.is_serviceable).length}
              </strong>
            </article>
            <article className="dashboard-metric-card warning">
              <span className="dashboard-metric-label">Needs Attention</span>
              <strong className="dashboard-metric-value">
                {vehicles.filter((vehicle) => !vehicle.is_serviceable).length}
              </strong>
            </article>
            <article className="dashboard-metric-card info">
              <span className="dashboard-metric-label">Overall Expenditures</span>
              <strong className="dashboard-metric-value">
                {formatCurrency(vehicleRepairs.reduce((sum, repair) => sum + Number(repair.amount ?? 0), 0))}
              </strong>
            </article>
          </section>

          <section className="inventory-table-section" aria-label="Vehicles table">
            <div className="inventory-table-card">
              <h3 className="par-form-title inventory-table-title">Vehicle Registry</h3>
              <table className="inventory-table">
                <thead>
                  <tr>
                    <th scope="col">ID</th>
                    <th scope="col">Make / Model</th>
                    <th scope="col">Year</th>
                    <th scope="col">CR Number</th>
                    <th scope="col">Engine Number</th>
                    <th scope="col">Status</th>
                    <th scope="col">Repair Logs</th>
                    <th scope="col">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {vehicleLoading ? (
                    <tr>
                      <td colSpan={8}>Loading vehicles…</td>
                    </tr>
                  ) : vehicles.length === 0 ? (
                    <tr>
                      <td colSpan={8}>No vehicles found.</td>
                    </tr>
                  ) : (
                    paginatedVehicles.map((vehicle) => (
                      <tr key={vehicle.id}>
                        <td>{`VEH-${vehicle.id.toString().padStart(3, '0')}`}</td>
                        <td>{vehicle.make_model}</td>
                        <td>{vehicle.year_model ?? '—'}</td>
                        <td>{vehicle.cr_number || '—'}</td>
                        <td>{vehicle.engine_number || '—'}</td>
                        <td>
                          <span className={`badge ${vehicle.is_serviceable ? 'badge-status-repaired' : 'badge-status-disposal'}`}>
                            {vehicle.is_serviceable ? 'Serviceable' : 'Needs Repair'}
                          </span>
                        </td>
                        <td>
                          <button
                            type="button"
                            className="wmr-remarks-button"
                            onClick={() => setActiveVehicleLogsId(vehicle.id)}
                          >
                            {`View Logs (${vehicleRepairs.filter((repair) => repair.vehicle_id === vehicle.id).length})`}
                          </button>
                        </td>
                        <td className="inventory-row-actions inventory-row-actions-left">
                          <div className="inventory-actions-grid">
                            <button
                              type="button"
                              aria-label="View vehicle"
                              title="View vehicle"
                              className="inventory-icon-button"
                              onClick={() => openVehicleEditModal(vehicle)}
                            >
                              <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                                <path
                                  d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6z"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="1.6"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                                <circle cx="12" cy="12" r="2.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
                              </svg>
                            </button>
                            <button
                              type="button"
                              aria-label="Archive vehicle"
                              title="Archive vehicle"
                              className="inventory-icon-button"
                              onClick={() => handleArchiveVehicle(vehicle)}
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
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>

            </div>
          </section>

          {!vehicleLoading && vehicleTotalPages > 1 && (
            <div className="inventory-pagination" aria-label="Vehicles pagination">
              <div className="inventory-pagination-controls">
                <button
                  type="button"
                  className="inventory-pagination-button inventory-pagination-circle"
                  onClick={() => setVehiclePage((prev) => Math.max(1, prev - 1))}
                  disabled={vehiclePage === 1}
                  aria-label="Previous page"
                >
                  <svg viewBox="0 0 24 24" width="8" height="8" aria-hidden="true" focusable="false">
                    <path
                      d="M15 6l-6 6 6 6"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>

                {visibleVehiclePageNumbers.map((pageNumber) => (
                  <button
                    key={pageNumber}
                    type="button"
                    className={`inventory-pagination-button inventory-pagination-circle ${
                      pageNumber === vehiclePage ? 'inventory-pagination-circle-active' : ''
                    }`}
                    onClick={() => setVehiclePage(pageNumber)}
                    aria-label={`Page ${pageNumber}`}
                    aria-current={pageNumber === vehiclePage ? 'page' : undefined}
                  >
                    {pageNumber}
                  </button>
                ))}

                <button
                  type="button"
                  className="inventory-pagination-button inventory-pagination-circle"
                  onClick={() => setVehiclePage((prev) => Math.min(vehicleTotalPages, prev + 1))}
                  disabled={vehiclePage === vehicleTotalPages}
                  aria-label="Next page"
                >
                  <svg viewBox="0 0 24 24" width="8" height="8" aria-hidden="true" focusable="false">
                    <path
                      d="M9 6l6 6-6 6"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {vehicleMode === 'add-vehicle' && (
        <section className="inventory-add-section" aria-label="Add vehicle form">
          <div className="inventory-add-card">
            <h3 className="inventory-add-title">Add Vehicle</h3>
            <div className="inventory-add-grid">
              <div className="inventory-field">
                <label htmlFor="vehicle-make-model">
                  Make / Model <span className="inventory-required">*</span>
                </label>
                <input
                  id="vehicle-make-model"
                  className="inventory-input"
                  value={newVehicleMakeModel}
                  onChange={(e) => setNewVehicleMakeModel(e.target.value)}
                  placeholder="e.g. Mitsubishi L300"
                />
              </div>

              <div className="inventory-field">
                <label htmlFor="vehicle-year-model">Year Model</label>
                <input
                  id="vehicle-year-model"
                  type="number"
                  className="inventory-input"
                  value={newVehicleYearModel}
                  onChange={(e) => setNewVehicleYearModel(e.target.value)}
                  placeholder="e.g. 2020"
                />
              </div>

              <div className="inventory-field">
                <label htmlFor="vehicle-cr-number">CR Number</label>
                <input
                  id="vehicle-cr-number"
                  className="inventory-input"
                  value={newVehicleCrNumber}
                  onChange={(e) => setNewVehicleCrNumber(e.target.value)}
                  placeholder="Certificate of Registration no."
                />
              </div>

              <div className="inventory-field">
                <label htmlFor="vehicle-engine-number">Engine Number</label>
                <input
                  id="vehicle-engine-number"
                  className="inventory-input"
                  value={newVehicleEngineNumber}
                  onChange={(e) => setNewVehicleEngineNumber(e.target.value)}
                  placeholder="Engine serial number"
                />
              </div>

              <div className="inventory-field">
                <label htmlFor="vehicle-serviceable">Condition</label>
                <select
                  id="vehicle-serviceable"
                  className="inventory-input"
                  value={newVehicleServiceable}
                  onChange={(e) => setNewVehicleServiceable(e.target.value)}
                >
                  <option value="true">Serviceable</option>
                  <option value="false">Needs Repair</option>
                </select>
              </div>

              <div className="inventory-field">
                <label htmlFor="vehicle-repair-history">Repair History Notes</label>
                <input
                  id="vehicle-repair-history"
                  className="inventory-input"
                  value={newVehicleRepairHistory}
                  onChange={(e) => setNewVehicleRepairHistory(e.target.value)}
                  placeholder="Optional summary of past repairs"
                />
              </div>
            </div>

            <div className="inventory-add-actions">
              <button
                type="button"
                className="inventory-add-submit"
                onClick={handleAddVehicle}
                disabled={vehicleSaving}
              >
                {vehicleSaving ? 'Saving…' : 'Save Vehicle'}
              </button>
            </div>
          </div>
        </section>
      )}

      {vehicleMode === 'add-repair' && (
        <section className="inventory-add-section" aria-label="Add vehicle repair form">
          <div className="inventory-add-card">
            <h3 className="inventory-add-title">Add Repair Log</h3>
            <div className="inventory-add-grid">
              <div className="inventory-field">
                <label htmlFor="repair-vehicle-id">
                  Vehicle <span className="inventory-required">*</span>
                </label>
                <select
                  id="repair-vehicle-id"
                  className="inventory-input"
                  value={newRepairVehicleId}
                  onChange={(e) => setNewRepairVehicleId(e.target.value)}
                >
                  <option value="">Select vehicle</option>
                  {vehicles.map((vehicle) => (
                    <option key={vehicle.id} value={String(vehicle.id)}>
                      {`VEH-${vehicle.id.toString().padStart(3, '0')} • ${vehicle.make_model}`}
                    </option>
                  ))}
                </select>
              </div>

              <div className="inventory-field">
                <label htmlFor="repair-admin-id">Issued To</label>
                <select
                  id="repair-admin-id"
                  className="inventory-input"
                  value={newRepairAdminId}
                  onChange={(e) => setNewRepairAdminId(e.target.value)}
                >
                  <option value="">Select user</option>
                  {parUsers.map((user) => (
                    <option key={user.id} value={user.id}>
                      {`${user.full_name} (${user.staff_id})`}
                    </option>
                  ))}
                </select>
              </div>

              <div className="inventory-field">
                <label htmlFor="repair-amount">Repair Cost</label>
                <input
                  id="repair-amount"
                  type="number"
                  className="inventory-input"
                  value={newRepairAmount}
                  onChange={(e) => setNewRepairAmount(e.target.value)}
                  placeholder="e.g. 12500"
                />
              </div>

              <div className="inventory-field">
                <label htmlFor="repair-date">Date Repaired</label>
                <input
                  id="repair-date"
                  type="date"
                  className="inventory-input"
                  value={newRepairDate}
                  onChange={(e) => setNewRepairDate(e.target.value)}
                />
              </div>

              <div className="inventory-field">
                <label htmlFor="repair-job-order">Job Order Number</label>
                <input
                  id="repair-job-order"
                  className="inventory-input"
                  value={newRepairJobOrder}
                  onChange={(e) => setNewRepairJobOrder(e.target.value)}
                  placeholder="e.g. JO-2026-014"
                />
              </div>

              <div className="inventory-field">
                <label htmlFor="repair-service-center">Service Center</label>
                <input
                  id="repair-service-center"
                  className="inventory-input"
                  value={newRepairServiceCenter}
                  onChange={(e) => setNewRepairServiceCenter(e.target.value)}
                  placeholder="e.g. City Motor Works"
                />
              </div>

              <div className="inventory-field inventory-field-full">
                <label htmlFor="repair-description">
                  Remarks <span className="inventory-required">*</span>
                </label>
                <input
                  id="repair-description"
                  className="inventory-input"
                  value={newRepairDescription}
                  onChange={(e) => setNewRepairDescription(e.target.value)}
                  placeholder="Describe what was fixed or what was broken"
                />
              </div>
            </div>

            <div className="inventory-add-actions">
              <button
                type="button"
                className="inventory-add-submit"
                onClick={handleAddVehicleRepair}
                disabled={vehicleSaving}
              >
                {vehicleSaving ? 'Saving…' : 'Save Repair Log'}
              </button>
            </div>
          </div>
        </section>
      )}
    </div>
  )
}

export default VehiclesSection
