import { useEffect, useRef, useState } from 'react'
import { supabase } from '../../supabaseClient'

// BarcodeDetector Web API types (not in default lib)
declare global {
  interface Window {
    BarcodeDetector?: new (opts: { formats: string[] }) => {
      detect(source: HTMLVideoElement): Promise<Array<{ rawValue: string }>>
    }
  }
}

interface Props {
  userId: string
  departmentId: number | null
}

interface ItemResult {
  item_id: number
  item_name: string
  item_type: string
  condition: string | null
  quantity: number | null
  unit_of_measure: string | null
  unit_cost: number | null
  property_no: string | null
  status: string | null
  qr_code: string | null
  uid: string
  date_acquired: string
}

export default function DepartmentScannerSection({ userId, departmentId }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const scanLoopRef = useRef<number | null>(null)

  const [staffName, setStaffName] = useState('')
  const [scanning, setScanning] = useState(false)
  const [result, setResult] = useState<ItemResult | null>(null)
  const [error, setError] = useState('')
  const [lookingUp, setLookingUp] = useState(false)
  const [cameraSupported] = useState(() => !!(navigator.mediaDevices?.getUserMedia))
  const [barcodeSupported] = useState(() => !!(window.BarcodeDetector))
  const [qtyInput, setQtyInput] = useState('')
  const [showSummary, setShowSummary] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')
  const [scanNotice, setScanNotice] = useState('')
  const lastScannedRef = useRef<{ value: string; at: number } | null>(null)

  const stopCamera = () => {
    if (scanLoopRef.current) cancelAnimationFrame(scanLoopRef.current)
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    setScanning(false)
  }

  const resetFlow = () => {
    setResult(null)
    setQtyInput('')
    setShowSummary(false)
    setError('')
    setSuccessMsg('')
    setScanNotice('')
  }

  const lookupItem = async (value: string) => {
    const trimmed = value.trim()
    if (!trimmed) return
    setError('')
    setResult(null)
    setQtyInput('')
    setShowSummary(false)
    setLookingUp(true)

    try {
      const now = Date.now()
      const last = lastScannedRef.current
      if (last && last.value === trimmed && now - last.at < 2500) {
        return
      }
      lastScannedRef.current = { value: trimmed, at: now }

      let query = supabase
        .from('inventory')
        .select('item_id, item_name, item_type, condition, quantity, unit_of_measure, unit_cost, property_no, status, qr_code, uid, date_acquired')
        .or(`qr_code.eq.${trimmed},uid.eq.${trimmed}`)

      if (departmentId) query = query.eq('department_id', departmentId)

      const { data, error: qErr } = await query.maybeSingle()

      if (qErr) throw qErr
      if (!data) {
        // Invalid/unmapped QR codes should not be shown as hard errors while scanning.
        setScanNotice('QR not found in your department inventory. Keep scanning.')
      } else {
        setScanNotice('')
        setResult(data as ItemResult)
        stopCamera()
      }
    } catch {
      setError('Lookup failed. Please try again.')
    } finally {
      setLookingUp(false)
    }
  }

  const startCamera = async () => {
    setError('')
    setSuccessMsg('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 } },
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      setError('')
      setScanNotice('')
      setScanning(true)

      if (barcodeSupported && window.BarcodeDetector) {
        const detector = new window.BarcodeDetector({ formats: ['qr_code', 'code_128', 'code_39', 'ean_13'] })

        const scanFrame = async () => {
          if (!videoRef.current || !streamRef.current) return
          try {
            const barcodes = await detector.detect(videoRef.current)
            if (barcodes.length > 0) {
              await lookupItem(barcodes[0].rawValue)
              return
            }
          } catch {
            // Keep scanning when detector throws on frame decode.
          }
          scanLoopRef.current = requestAnimationFrame(scanFrame)
        }
        scanLoopRef.current = requestAnimationFrame(scanFrame)
      }
    } catch (err: unknown) {
      const maybeDomErr = err as { name?: string }
      if (maybeDomErr?.name === 'NotAllowedError' || maybeDomErr?.name === 'PermissionDeniedError') {
        setError('Camera access was denied. Please allow camera permission and try again.')
      } else {
        setError('Unable to start camera. Please retry.')
      }
    }
  }

  const availableQty = result?.quantity ?? 0
  const requestedQty = Number(qtyInput)

  const proceedToSummary = () => {
    if (!result) return
    setError('')

    if (!Number.isFinite(requestedQty) || !Number.isInteger(requestedQty) || requestedQty <= 0) {
      setError('Enter a valid whole number for quantity.')
      return
    }

    if (requestedQty > availableQty) {
      setError(`Only ${availableQty} ${result.unit_of_measure ?? 'unit(s)'} available.`)
      return
    }

    setShowSummary(true)
  }

  const confirmRequisition = async () => {
    if (!result) return
    setError('')
    setConfirming(true)

    try {
      let latestQuery = supabase
        .from('inventory')
        .select('item_id, quantity')
        .eq('item_id', result.item_id)

      if (departmentId) latestQuery = latestQuery.eq('department_id', departmentId)

      const { data: latestRow, error: latestErr } = await latestQuery.maybeSingle()
      if (latestErr || !latestRow) throw new Error('reload-failed')

      const latestQty = latestRow.quantity ?? 0
      if (requestedQty > latestQty) {
        setError(`Stock changed. Only ${latestQty} ${result.unit_of_measure ?? 'unit(s)'} now available.`)
        setShowSummary(false)
        setResult((prev) => (prev ? { ...prev, quantity: latestQty } : prev))
        return
      }

      const newQty = latestQty - requestedQty

      let updateQuery = supabase
        .from('inventory')
        .update({ quantity: newQty })
        .eq('item_id', result.item_id)
      if (departmentId) updateQuery = updateQuery.eq('department_id', departmentId)
      const { error: updateErr } = await updateQuery

      if (updateErr) throw updateErr

      const { error: logErr } = await supabase.from('accountability_reports').insert({
        issued_to_id: userId,
        item_id: result.item_id,
        department_id: departmentId,
        quantity_logged: requestedQty,
        issue_date: new Date().toISOString().slice(0, 10),
        source: 'inventory_log',
        reference_type: 'scanner_requisition',
        contact_snapshot: staffName || null,
        description_snapshot: result.item_name,
        unit_snapshot: result.unit_of_measure,
        property_no_snapshot: result.property_no,
        remarks: null,
        is_archived: false,
        uid: crypto.randomUUID(),
      })

      if (logErr) {
        let rollbackQuery = supabase
          .from('inventory')
          .update({ quantity: latestQty })
          .eq('item_id', result.item_id)
        if (departmentId) rollbackQuery = rollbackQuery.eq('department_id', departmentId)
        await rollbackQuery
        throw logErr
      }

      setSuccessMsg('Success! Requisition recorded and inventory updated.')
      resetFlow()
      void startCamera()
    } catch {
      setError('Failed to finalize requisition. Please try again.')
    } finally {
      setConfirming(false)
    }
  }

  const currentStep = showSummary ? 3 : result ? 2 : 1

  useEffect(() => {
    if (!userId) return
    let mounted = true

    const loadStaff = async () => {
      const { data } = await supabase.from('users').select('full_name').eq('id', userId).maybeSingle()
      if (mounted && data?.full_name) setStaffName(data.full_name)
    }

    void loadStaff()
    return () => { mounted = false }
  }, [userId])

  // Auto-start camera when section mounts
  useEffect(() => {
    if (cameraSupported) void startCamera()
    return () => stopCamera()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="dept-section">
      <div style={{ marginBottom: 14 }}>
        <h1 className="dept-page-title" style={{ marginBottom: 4 }}>Scanner</h1>
        <p style={{ fontSize: 13, color: 'var(--dept-text-muted)', margin: 0 }}>
          Scan and process item requisitions quickly and accurately.
        </p>
      </div>

      <div className="dept-scan-steps" aria-label="QR requisition steps">
        <div className={`dept-scan-step ${currentStep === 1 ? 'active' : currentStep > 1 ? 'done' : ''}`}>
          <span className="dept-scan-step-num">1</span>
          <span className="dept-scan-step-label">Scan QR</span>
        </div>
        <div className="dept-scan-step-line" />
        <div className={`dept-scan-step ${currentStep === 2 ? 'active' : currentStep > 2 ? 'done' : ''}`}>
          <span className="dept-scan-step-num">2</span>
          <span className="dept-scan-step-label">Input Quantity</span>
        </div>
        <div className="dept-scan-step-line" />
        <div className={`dept-scan-step ${currentStep === 3 ? 'active' : ''}`}>
          <span className="dept-scan-step-num">3</span>
          <span className="dept-scan-step-label">Confirm Details</span>
        </div>
      </div>

      {error && (
        <div className="dept-alert dept-alert-error" style={{ marginBottom: 12 }}>
          <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          {error}
        </div>
      )}

      {successMsg && (
        <div className="dept-alert dept-alert-success" style={{ marginBottom: 12 }}>
          <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          {successMsg}
        </div>
      )}

      {scanNotice && !error && (
        <div className="dept-alert dept-alert-info" style={{ marginBottom: 12 }}>
          <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
          {scanNotice}
        </div>
      )}

      <div className="dept-scanner-wrap">
        {cameraSupported && (
          <div className="dept-viewfinder" style={{ display: scanning ? 'block' : 'none' }}>
            <video ref={videoRef} muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            <div className="dept-viewfinder-overlay">
              <div className="dept-viewfinder-frame" />
            </div>
          </div>
        )}

        {!cameraSupported ? (
          <div className="dept-alert dept-alert-error">
            <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            Camera is not available on this device.
          </div>
        ) : scanning ? (
          <button className="dept-btn dept-btn-secondary dept-btn-full" onClick={stopCamera}>Stop Camera</button>
        ) : (
          <button className="dept-btn dept-btn-primary dept-btn-full" onClick={() => void startCamera()}>
            <svg viewBox="0 0 24 24" fill="none" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 7V5a2 2 0 012-2h2M17 3h2a2 2 0 012 2v2M21 17v2a2 2 0 01-2 2h-2M7 21H5a2 2 0 01-2-2v-2" />
              <line x1="3" y1="12" x2="21" y2="12" />
            </svg>
            Retry Camera
          </button>
        )}

        {scanning && !barcodeSupported && (
          <div className="dept-alert dept-alert-info">
            <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
            Automatic QR detection is not supported on this browser. Upgrade to Chrome or Edge for best results.
          </div>
        )}

        {lookingUp && (
          <div className="dept-loading-wrap" style={{ padding: 16 }}>
            <div className="dept-spinner" />
            <span>Looking up item…</span>
          </div>
        )}

        {result && !showSummary && (
          <div className="dept-scanner-result">
            <h3>{result.item_name}</h3>
            <div className="dept-result-grid">
              <div className="dept-result-field"><label>Type</label><span>{result.item_type || '—'}</span></div>
              <div className="dept-result-field"><label>Available Stock</label><span>{availableQty} {result.unit_of_measure ?? 'unit(s)'}</span></div>
              <div className="dept-result-field"><label>Condition</label><span>{result.condition || '—'}</span></div>
              <div className="dept-result-field"><label>Property No.</label><span>{result.property_no || '—'}</span></div>
            </div>

            <div className="dept-form-group" style={{ marginTop: 12 }}>
              <label className="dept-form-label">Quantity Taking</label>
              <input
                className="dept-form-input"
                type="number"
                min={1}
                step={1}
                value={qtyInput}
                onChange={(e) => setQtyInput(e.target.value)}
                placeholder="Enter quantity"
              />
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
              <button className="dept-btn dept-btn-secondary" style={{ flex: 1 }} onClick={() => { resetFlow(); void startCamera() }}>
                Cancel
              </button>
              <button className="dept-btn dept-btn-primary" style={{ flex: 1 }} onClick={proceedToSummary}>
                Review Summary
              </button>
            </div>
          </div>
        )}

        {result && showSummary && (
          <div className="dept-scanner-result">
            <h3>Verify Requisition</h3>
            <div className="dept-info-rows">
              <div className="dept-info-row"><label>Staff Name</label><span>{staffName || '—'}</span></div>
              <div className="dept-info-row"><label>Item Name</label><span>{result.item_name}</span></div>
              <div className="dept-info-row"><label>Quantity</label><span>{requestedQty} {result.unit_of_measure ?? 'unit(s)'}</span></div>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
              <button
                className="dept-btn dept-btn-secondary"
                style={{ flex: 1 }}
                onClick={() => setShowSummary(false)}
                disabled={confirming}
              >
                Back
              </button>
              <button
                className="dept-btn dept-btn-primary"
                style={{ flex: 1 }}
                onClick={() => void confirmRequisition()}
                disabled={confirming}
              >
                {confirming ? 'Confirming…' : 'Confirm'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
