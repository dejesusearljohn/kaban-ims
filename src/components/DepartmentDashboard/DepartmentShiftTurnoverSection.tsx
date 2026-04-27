import { useEffect, useState } from 'react'
import { supabase } from '../../supabaseClient'

interface Props {
  userId: string
  departmentId: number | null
}

interface InventoryItem {
  item_id: number
  item_name: string
  property_no: string | null
  quantity: number | null
  unit_of_measure: string | null
  qr_code: string | null
  condition: 'serviceable' | 'unserviceable' | null
  remarks: string
  confirmed: boolean
}

interface StaffOption {
  id: string
  full_name: string
  staff_id: string
}

interface CheckItemRow {
  check_item_id: number
  item_id: number
  condition: string
  scanned_at: string
  remarks: string | null
  item: { item_name: string; property_no: string | null } | null
}

interface TurnoverRequest {
  turnover_id: number
  created_at: string | null
  status: string
  daily_check_id: number | null
  outgoing_staff: { full_name: string; staff_id: string } | null
  checkItems: CheckItemRow[]
  loadingItems: boolean
}

type TabKey = 'submit' | 'incoming'

const formatDateTime = (value: string | null) => (value ? new Date(value).toLocaleString() : '--')

export default function DepartmentShiftTurnoverSection({ userId, departmentId }: Props) {
  const [activeTab, setActiveTab] = useState<TabKey>('submit')

  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([])
  const [staffList, setStaffList] = useState<StaffOption[]>([])
  const [incomingStaffId, setIncomingStaffId] = useState('')
  const [loadingItems, setLoadingItems] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [submitError, setSubmitError] = useState('')
  const [submitSuccess, setSubmitSuccess] = useState('')

  const [incoming, setIncoming] = useState<TurnoverRequest[]>([])
  const [loadingIncoming, setLoadingIncoming] = useState(true)
  const [actionError, setActionError] = useState('')

  useEffect(() => {
    if (!departmentId) {
      setLoadingItems(false)
      return
    }

    let mounted = true
    const load = async () => {
      setLoadingItems(true)
      setLoadError('')

      try {
        const [invRes, staffRes] = await Promise.all([
          supabase
            .from('inventory')
            .select('item_id, item_name, property_no, quantity, unit_of_measure, qr_code')
            .eq('department_id', departmentId)
            .is('archived_at', null)
            .order('item_name'),
          supabase
            .from('users')
            .select('id, full_name, staff_id')
            .eq('department_id', departmentId)
            .eq('is_archived', false)
            .neq('id', userId),
        ])

        if (invRes.error) throw invRes.error
        if (staffRes.error) throw staffRes.error
        if (!mounted) return

        setInventoryItems(
          (invRes.data ?? []).map((item) => ({
            ...item,
            condition: null,
            remarks: '',
            confirmed: false,
          })),
        )
        setStaffList(staffRes.data ?? [])
      } catch (error) {
        if (!mounted) return
        const message =
          error instanceof Error
            ? error.message
            : typeof error === 'object' && error !== null && 'message' in error
              ? String((error as { message?: unknown }).message ?? 'Failed to load turnover form data.')
              : 'Failed to load turnover form data.'
        setLoadError(message)
      } finally {
        if (mounted) setLoadingItems(false)
      }
    }

    void load()
    return () => {
      mounted = false
    }
  }, [departmentId, userId])

  const loadIncoming = async () => {
    setLoadingIncoming(true)
    setActionError('')

    const { data, error } = await supabase
      .from('shift_turnovers')
      .select('turnover_id, created_at, status, daily_check_id, outgoing_staff:users!shift_turnovers_outgoing_staff_id_fkey(full_name, staff_id)')
      .eq('incoming_staff_id', userId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })

    if (error) {
      setActionError(error.message)
      setIncoming([])
      setLoadingIncoming(false)
      return
    }

    const parsed = (data ?? []) as unknown as Array<{
      turnover_id: number
      created_at: string | null
      status: string
      daily_check_id: number | null
      outgoing_staff: { full_name: string; staff_id: string } | null
    }>

    setIncoming(parsed.map((row) => ({ ...row, checkItems: [], loadingItems: false })))
    setLoadingIncoming(false)
  }

  useEffect(() => {
    if (activeTab === 'incoming') {
      void loadIncoming()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, userId])

  const loadCheckItems = async (turnover: TurnoverRequest) => {
    if (!turnover.daily_check_id) return

    setIncoming((prev) =>
      prev.map((entry) =>
        entry.turnover_id === turnover.turnover_id
          ? { ...entry, loadingItems: true }
          : entry,
      ),
    )

    const { data, error } = await supabase
      .from('daily_check_items')
      .select('check_item_id, item_id, condition, scanned_at, remarks, item:inventory(item_name, property_no)')
      .eq('check_id', turnover.daily_check_id)
      .order('scanned_at')

    if (error) {
      setActionError(error.message)
      setIncoming((prev) =>
        prev.map((entry) =>
          entry.turnover_id === turnover.turnover_id
            ? { ...entry, loadingItems: false }
            : entry,
        ),
      )
      return
    }

    setIncoming((prev) =>
      prev.map((entry) =>
        entry.turnover_id === turnover.turnover_id
          ? {
            ...entry,
            checkItems: (data ?? []) as unknown as CheckItemRow[],
            loadingItems: false,
          }
          : entry,
      ),
    )
  }

  const setItemCondition = (itemId: number, condition: 'serviceable' | 'unserviceable') => {
    setInventoryItems((prev) =>
      prev.map((item) =>
        item.item_id === itemId ? { ...item, condition, confirmed: true } : item,
      ),
    )
  }

  const setItemRemarks = (itemId: number, remarks: string) => {
    setInventoryItems((prev) =>
      prev.map((item) => (item.item_id === itemId ? { ...item, remarks } : item)),
    )
  }

  const resetSubmissionState = () => {
    setSubmitSuccess('')
    setSubmitError('')
    setIncomingStaffId('')
    setInventoryItems((prev) =>
      prev.map((item) => ({
        ...item,
        condition: null,
        remarks: '',
        confirmed: false,
      })),
    )
  }

  const handleSubmit = async () => {
    setSubmitError('')
    setSubmitSuccess('')

    if (!departmentId) {
      setSubmitError('Your account has no assigned department.')
      return
    }

    if (!incomingStaffId) {
      setSubmitError('Please select the incoming staff member.')
      return
    }

    if (inventoryItems.length === 0) {
      setSubmitError('No inventory items are available for the daily turnover log.')
      return
    }

    const unconfirmed = inventoryItems.filter((item) => !item.confirmed)
    if (unconfirmed.length > 0) {
      setSubmitError(`Please mark all ${unconfirmed.length} item(s) before submitting.`)
      return
    }

    setSubmitting(true)

    const today = new Date().toISOString().split('T')[0]
    const { data: checkData, error: checkError } = await supabase
      .from('daily_checks')
      .insert({
        check_date: today,
        department_id: departmentId,
        submitted_by: userId,
        is_submitted: true,
      })
      .select('check_id')
      .single()

    if (checkError || !checkData) {
      setSubmitError(checkError?.message ?? 'Failed to create daily check record.')
      setSubmitting(false)
      return
    }

    const checkItems = inventoryItems.map((item) => ({
      check_id: checkData.check_id,
      item_id: item.item_id,
      condition: item.condition as string,
      remarks: item.remarks || null,
    }))

    const { error: checkItemsError } = await supabase
      .from('daily_check_items')
      .insert(checkItems)

    if (checkItemsError) {
      await supabase.from('daily_checks').delete().eq('check_id', checkData.check_id)
      setSubmitError(checkItemsError.message)
      setSubmitting(false)
      return
    }

    const unserviceableItems = inventoryItems.filter((item) => item.condition === 'unserviceable')
    if (unserviceableItems.length > 0) {
      const wmrRows = unserviceableItems.map((item) => ({
        item_id: item.item_id,
        last_user_id: userId,
        status: 'pending',
        reason_damage: item.remarks || 'Reported unserviceable during shift turnover',
        location: null as string | null,
        quantity_reported: 1,
      }))
      await supabase.from('wmr_reports').insert(wmrRows)
    }

    const { error: turnoverError } = await supabase.from('shift_turnovers').insert({
      outgoing_staff_id: userId,
      incoming_staff_id: incomingStaffId,
      daily_check_id: checkData.check_id,
      status: 'pending',
      details: `Shift turnover submitted on ${today}`,
    })

    if (turnoverError) {
      await supabase.from('daily_checks').delete().eq('check_id', checkData.check_id)
      setSubmitError(turnoverError.message)
      setSubmitting(false)
      return
    }

    const unserviceableCount = unserviceableItems.length
    setSubmitSuccess(
      unserviceableCount > 0
        ? `Shift turnover submitted. ${unserviceableCount} item(s) were marked unserviceable and drafted to WMR.`
        : 'Shift turnover submitted successfully.',
    )
    setSubmitting(false)
  }

  const handleDecision = async (turnoverId: number, decision: 'approved' | 'disapproved') => {
    setActionError('')
    const { error } = await supabase
      .from('shift_turnovers')
      .update({ status: decision })
      .eq('turnover_id', turnoverId)

    if (error) {
      setActionError(error.message)
      return
    }

    setIncoming((prev) => prev.filter((entry) => entry.turnover_id !== turnoverId))
  }

  const allConfirmed = inventoryItems.length > 0 && inventoryItems.every((item) => item.confirmed)
  const confirmedCount = inventoryItems.filter((item) => item.confirmed).length

  return (
    <div className="dept-section dept-turnover">
      <header className="dept-turnover-header">
        <h1 className="dept-page-title">Shift Turnover</h1>
        <p className="dept-page-subtitle">Daily inventory log and shift handover for NEBRU.</p>
      </header>

      <div className="dept-segmented dept-turnover-tabs" role="tablist" aria-label="Shift turnover views">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'submit'}
          className={`dept-segmented-btn${activeTab === 'submit' ? ' active' : ''}`}
          onClick={() => setActiveTab('submit')}
        >
          Submit Turnover
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'incoming'}
          className={`dept-segmented-btn${activeTab === 'incoming' ? ' active' : ''}`}
          onClick={() => setActiveTab('incoming')}
        >
          Incoming Requests
        </button>
      </div>

      {activeTab === 'submit' && (
        <section className="dept-card dept-turnover-card" aria-label="Shift turnover submit form">
          {submitSuccess ? (
            <div className="dept-turnover-success">
              <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M20 6L9 17l-5-5" />
              </svg>
              <h2>Turnover Submitted</h2>
              <p>{submitSuccess}</p>
              <button type="button" className="dept-btn dept-btn-primary" onClick={resetSubmissionState}>
                Submit Another Turnover
              </button>
            </div>
          ) : !departmentId ? (
            <div className="dept-empty">
              <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="9" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <p>No department assigned. Contact your admin.</p>
            </div>
          ) : (
            <div className="dept-card-body">
              {loadError && (
                <div className="dept-alert dept-alert-error dept-turnover-alert">
                  <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  {loadError}
                </div>
              )}

              {loadingItems ? (
                <div className="dept-loading-wrap">
                  <div className="dept-spinner" />
                  <span>Loading department inventory...</span>
                </div>
              ) : inventoryItems.length === 0 ? (
                <div className="dept-empty">
                  <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="7" width="20" height="14" rx="2" />
                    <path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2" />
                  </svg>
                  <p>No inventory items assigned to this department.</p>
                </div>
              ) : (
                <>
                  <form className="dept-form dept-turnover-form" onSubmit={(event) => event.preventDefault()}>
                    <div className="dept-form-group">
                      <label htmlFor="incoming-staff-select">Hand over shift to</label>
                      <select
                        id="incoming-staff-select"
                        value={incomingStaffId}
                        onChange={(event) => setIncomingStaffId(event.target.value)}
                        disabled={submitting || staffList.length === 0}
                      >
                        <option value="">Select incoming staff</option>
                        {staffList.map((staff) => (
                          <option key={staff.id} value={staff.id}>
                            {staff.full_name} ({staff.staff_id})
                          </option>
                        ))}
                      </select>
                      {staffList.length === 0 && (
                        <p className="dept-turnover-helper">No other active staff found in this department.</p>
                      )}
                    </div>
                  </form>

                  <div className="dept-turnover-progress" aria-live="polite">
                    <strong>
                      {confirmedCount}/{inventoryItems.length}
                    </strong>{' '}
                    items checked
                    {allConfirmed && <span className="dept-turnover-progress-done">All items logged</span>}
                  </div>

                  <ul className="dept-turnover-list" aria-label="Department inventory turnover checklist">
                    {inventoryItems.map((item) => {
                      const itemStateClass = item.condition === 'serviceable'
                        ? ' is-serviceable'
                        : item.condition === 'unserviceable'
                          ? ' is-unserviceable'
                          : ''
                      const quantityLabel = item.quantity === null
                        ? 'Qty: --'
                        : item.unit_of_measure
                          ? `Qty: ${item.quantity} ${item.unit_of_measure}`
                          : `Qty: ${item.quantity}`

                      return (
                        <li key={item.item_id} className={`dept-turnover-item${itemStateClass}`}>
                          <div className="dept-turnover-item-header">
                            <div className="dept-turnover-item-main">
                              <p className="dept-turnover-item-name">{item.item_name}</p>
                              <p className="dept-turnover-item-meta">
                                {item.property_no ? `Property No: ${item.property_no} | ` : ''}
                                {quantityLabel}
                              </p>
                            </div>

                            <div className="dept-turnover-status-actions">
                              <button
                                type="button"
                                className={`dept-turnover-status-btn serviceable${item.condition === 'serviceable' ? ' active' : ''}`}
                                onClick={() => setItemCondition(item.item_id, 'serviceable')}
                              >
                                Serviceable
                              </button>
                              <button
                                type="button"
                                className={`dept-turnover-status-btn unserviceable${item.condition === 'unserviceable' ? ' active' : ''}`}
                                onClick={() => setItemCondition(item.item_id, 'unserviceable')}
                              >
                                Unserviceable
                              </button>
                            </div>
                          </div>

                          {item.condition === 'unserviceable' && (
                            <div className="dept-form-group dept-turnover-remarks">
                              <label htmlFor={`turnover-remarks-${item.item_id}`}>Damage remarks (optional)</label>
                              <input
                                id={`turnover-remarks-${item.item_id}`}
                                type="text"
                                placeholder="Describe issue for WMR draft"
                                value={item.remarks}
                                onChange={(event) => setItemRemarks(item.item_id, event.target.value)}
                              />
                            </div>
                          )}
                        </li>
                      )
                    })}
                  </ul>

                  {submitError && (
                    <div className="dept-alert dept-alert-error dept-turnover-alert">
                      <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="8" x2="12" y2="12" />
                        <line x1="12" y1="16" x2="12.01" y2="16" />
                      </svg>
                      {submitError}
                    </div>
                  )}

                  <div className="dept-turnover-submit-row">
                    <button
                      type="button"
                      className="dept-btn dept-btn-primary"
                      disabled={submitting || !allConfirmed || !incomingStaffId || staffList.length === 0}
                      onClick={handleSubmit}
                    >
                      {submitting ? 'Submitting...' : 'Submit Shift Turnover'}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </section>
      )}

      {activeTab === 'incoming' && (
        <section className="dept-turnover-incoming" aria-label="Incoming turnover requests">
          {actionError && (
            <div className="dept-alert dept-alert-error dept-turnover-alert">
              <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              {actionError}
            </div>
          )}

          {loadingIncoming ? (
            <div className="dept-loading-wrap">
              <div className="dept-spinner" />
              <span>Loading turnover requests...</span>
            </div>
          ) : incoming.length === 0 ? (
            <div className="dept-empty">
              <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
              <p>No pending shift turnover requests.</p>
            </div>
          ) : (
            <ul className="dept-turnover-request-list">
              {incoming.map((request) => (
                <li key={request.turnover_id} className="dept-card dept-turnover-request-card">
                  <div className="dept-card-body">
                    <div className="dept-turnover-request-header">
                      <div>
                        <p className="dept-turnover-request-name">
                          {request.outgoing_staff?.full_name ?? 'Unknown Staff'}
                          <span>{request.outgoing_staff?.staff_id ? ` (${request.outgoing_staff.staff_id})` : ''}</span>
                        </p>
                        <p className="dept-turnover-request-meta">Submitted {formatDateTime(request.created_at)}</p>
                      </div>

                      <div className="dept-turnover-request-actions">
                        {request.checkItems.length === 0 && !request.loadingItems && (
                          <button
                            type="button"
                            className="dept-btn dept-btn-secondary"
                            onClick={() => loadCheckItems(request)}
                          >
                            View Items
                          </button>
                        )}

                        <button
                          type="button"
                          className="dept-btn dept-btn-primary"
                          onClick={() => handleDecision(request.turnover_id, 'approved')}
                        >
                          Accept
                        </button>
                        <button
                          type="button"
                          className="dept-btn dept-btn-danger"
                          onClick={() => handleDecision(request.turnover_id, 'disapproved')}
                        >
                          Reject
                        </button>
                      </div>
                    </div>

                    {request.loadingItems && (
                      <p className="dept-turnover-inline-note">Loading checklist items...</p>
                    )}

                    {request.checkItems.length > 0 && (
                      <div className="dept-turnover-table-wrap">
                        <table className="dept-turnover-table">
                          <thead>
                            <tr>
                              <th>Item</th>
                              <th>Property No.</th>
                              <th>Condition</th>
                              <th>Remarks</th>
                            </tr>
                          </thead>
                          <tbody>
                            {request.checkItems.map((checkItem) => (
                              <tr key={checkItem.check_item_id}>
                                <td>{checkItem.item?.item_name ?? `Item #${checkItem.item_id}`}</td>
                                <td>{checkItem.item?.property_no ?? '--'}</td>
                                <td>
                                  <span className={checkItem.condition === 'serviceable' ? 'dept-turnover-condition-ok' : 'dept-turnover-condition-bad'}>
                                    {checkItem.condition}
                                  </span>
                                </td>
                                <td>{checkItem.remarks ?? '--'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  )
}
