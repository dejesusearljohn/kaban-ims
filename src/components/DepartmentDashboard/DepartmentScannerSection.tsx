import { useEffect, useRef, useState } from 'react'
import jsQR from 'jsqr'
import { supabase } from '../../supabaseClient'

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
  departmentName?: string
  isReadOnly?: boolean
  isActive?: boolean
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
  date_acquired: string | null
}

const SCAN_DEBOUNCE_MS = 2500
const JSQR_SCAN_INTERVAL_MS = 250
const SCAN_NOTICE_MS = 2200
const DEFAULT_BORROW_DAYS = 14

const getDefaultReturnDate = (): string => {
  const date = new Date()
  date.setDate(date.getDate() + DEFAULT_BORROW_DAYS)
  return date.toISOString().slice(0, 10)
}

export default function DepartmentScannerSection({
  userId,
  departmentId,
  departmentName = '',
  isReadOnly = false,
  isActive = true,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const scanCanvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const scanLoopRef = useRef<number | null>(null)
  const jsqrIntervalRef = useRef<number | null>(null)
  const scanningRef = useRef(false)
  const capturePausedRef = useRef(false)
  const lookingUpRef = useRef(false)
  const scanNoticeTimeoutRef = useRef<number | null>(null)
  const cameraSessionRef = useRef(0)

  const [staffName, setStaffName] = useState('')
  const [staffContact, setStaffContact] = useState('')
  const [cameraStarting, setCameraStarting] = useState(false)
  const [cameraReady, setCameraReady] = useState(false)
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

  const clearScanNoticeTimeout = () => {
    if (scanNoticeTimeoutRef.current != null) {
      window.clearTimeout(scanNoticeTimeoutRef.current)
      scanNoticeTimeoutRef.current = null
    }
  }

  const showTransientScanNotice = (message: string) => {
    clearScanNoticeTimeout()
    setScanNotice(message)
    scanNoticeTimeoutRef.current = window.setTimeout(() => {
      setScanNotice('')
      scanNoticeTimeoutRef.current = null
    }, SCAN_NOTICE_MS)
  }

  const stopScanLoop = () => {
    if (scanLoopRef.current != null) {
      cancelAnimationFrame(scanLoopRef.current)
      scanLoopRef.current = null
    }
    if (jsqrIntervalRef.current != null) {
      window.clearInterval(jsqrIntervalRef.current)
      jsqrIntervalRef.current = null
    }
  }

  const pauseCapture = () => {
    capturePausedRef.current = true
    stopScanLoop()
  }

  const resumeCapture = () => {
    capturePausedRef.current = false
    lastScannedRef.current = null
    if (streamRef.current && scanningRef.current) {
      startScanLoop()
    }
  }

  const stopCamera = () => {
    cameraSessionRef.current += 1
    stopScanLoop()
    clearScanNoticeTimeout()
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    scanningRef.current = false
    capturePausedRef.current = false
    lookingUpRef.current = false
    setCameraStarting(false)
    setCameraReady(false)
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
  }

  const waitForVideoElement = async (): Promise<HTMLVideoElement> => {
    for (let attempt = 0; attempt < 20; attempt += 1) {
      if (videoRef.current) return videoRef.current
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
    }
    throw new Error('video-unavailable')
  }

  const getCameraStream = async (): Promise<MediaStream> => {
    const constraintAttempts: MediaStreamConstraints[] = [
      { video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 } }, audio: false },
      { video: { facingMode: { ideal: 'user' }, width: { ideal: 1280 } }, audio: false },
      { video: { width: { ideal: 1280 } }, audio: false },
      { video: true, audio: false },
    ]

    let lastError: unknown = null

    for (const constraints of constraintAttempts) {
      try {
        return await navigator.mediaDevices.getUserMedia(constraints)
      } catch (err) {
        lastError = err
        const name = (err as { name?: string }).name
        if (name === 'NotAllowedError' || name === 'PermissionDeniedError' || name === 'NotFoundError') {
          throw err
        }
      }
    }

    throw lastError ?? new Error('camera-unavailable')
  }

  const attachAndPlayVideo = async (stream: MediaStream, sessionId: number) => {
    const video = await waitForVideoElement()
    if (sessionId !== cameraSessionRef.current) {
      stream.getTracks().forEach((track) => track.stop())
      return
    }

    video.srcObject = stream
    video.muted = true
    video.playsInline = true

    try {
      await video.play()
    } catch (err) {
      const name = (err as { name?: string }).name
      if (name !== 'AbortError') throw err
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
      if (sessionId !== cameraSessionRef.current) return
      await video.play()
    }
  }

  const getCameraErrorMessage = (err: unknown) => {
    const name = (err as { name?: string }).name
    if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
      return 'Camera access was denied. Please allow camera permission and try again.'
    }
    if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
      return 'No camera was found on this device.'
    }
    if (name === 'NotReadableError' || name === 'TrackStartError') {
      return 'Camera is already in use by another app. Close other apps using the camera and try again.'
    }
    if (name === 'OverconstrainedError') {
      return 'Could not use the selected camera. Try choosing a different camera in your browser settings.'
    }
    if ((err as Error).message === 'video-unavailable') {
      return 'Camera preview could not be initialized. Please refresh and try again.'
    }
    return 'Unable to start camera. Please refresh and try again.'
  }

  const resetFlow = () => {
    setResult(null)
    setQtyInput('')
    setShowSummary(false)
    setError('')
    setSuccessMsg('')
    setScanNotice('')
    clearScanNoticeTimeout()
    resumeCapture()
  }

  const buildLookupFilter = (value: string) => {
    const trimmed = value.trim()
    const filters = [
      `qr_code.eq.${trimmed}`,
      `uid.eq.${trimmed}`,
      `property_no.eq.${trimmed}`,
    ]

    if (/^\d+$/.test(trimmed)) {
      filters.push(`item_id.eq.${trimmed}`)
    }

    return filters.join(',')
  }

  const lookupItem = async (value: string): Promise<boolean> => {
    const trimmed = value.trim()
    if (!trimmed || capturePausedRef.current || lookingUpRef.current) return false

    const now = Date.now()
    const last = lastScannedRef.current
    if (last && last.value === trimmed && now - last.at < SCAN_DEBOUNCE_MS) {
      return false
    }
    lastScannedRef.current = { value: trimmed, at: now }

    lookingUpRef.current = true
    setLookingUp(true)

    try {
      let query = supabase
        .from('inventory')
        .select('item_id, item_name, item_type, condition, quantity, unit_of_measure, unit_cost, property_no, status, qr_code, uid, date_acquired')
        .or(buildLookupFilter(trimmed))
        .is('archived_at', null)

      if (departmentId) query = query.eq('department_id', departmentId)

      const { data, error: qErr } = await query.maybeSingle()

      if (qErr) throw qErr
      if (!data) {
        showTransientScanNotice('Unrecognized QR code. Keep scanning.')
        return false
      }

      setError('')
      setScanNotice('')
      clearScanNoticeTimeout()
      setResult(data as ItemResult)
      pauseCapture()
      return true
    } catch {
      setError('Lookup failed. Please try again.')
      return false
    } finally {
      lookingUpRef.current = false
      setLookingUp(false)
    }
  }

  const decodeWithJsQr = (): string | null => {
    const video = videoRef.current
    const canvas = scanCanvasRef.current
    if (!video || !canvas || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return null

    const width = video.videoWidth
    const height = video.videoHeight
    if (!width || !height) return null

    canvas.width = width
    canvas.height = height

    const context = canvas.getContext('2d', { willReadFrequently: true })
    if (!context) return null

    context.drawImage(video, 0, 0, width, height)
    const imageData = context.getImageData(0, 0, width, height)
    const decoded = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: 'attemptBoth',
    })

    return decoded?.data?.trim() || null
  }

  const startScanLoop = () => {
    if (capturePausedRef.current || !scanningRef.current || !streamRef.current) return

    stopScanLoop()

    if (barcodeSupported && window.BarcodeDetector) {
      const detector = new window.BarcodeDetector({ formats: ['qr_code'] })

      const scanFrame = async () => {
        if (!scanningRef.current || !videoRef.current || !streamRef.current || capturePausedRef.current) return

        try {
          const barcodes = await detector.detect(videoRef.current)
          if (barcodes.length > 0) {
            await lookupItem(barcodes[0].rawValue)
          }
        } catch {
          // Keep scanning when detector throws on a frame decode.
        }

        if (!capturePausedRef.current && scanningRef.current) {
          scanLoopRef.current = requestAnimationFrame(scanFrame)
        }
      }

      scanLoopRef.current = requestAnimationFrame(scanFrame)
      return
    }

    jsqrIntervalRef.current = window.setInterval(() => {
      if (!scanningRef.current || capturePausedRef.current || lookingUpRef.current) return

      const decodedValue = decodeWithJsQr()
      if (!decodedValue) return

      void lookupItem(decodedValue)
    }, JSQR_SCAN_INTERVAL_MS)
  }

  const startCamera = async () => {
    if (!cameraSupported || !isActive) return

    if (streamRef.current) {
      if (!capturePausedRef.current) startScanLoop()
      setCameraReady(true)
      return
    }

    const sessionId = cameraSessionRef.current
    setCameraStarting(true)
    setError('')
    setSuccessMsg('')

    try {
      const stream = await getCameraStream()
      if (sessionId !== cameraSessionRef.current) {
        stream.getTracks().forEach((track) => track.stop())
        return
      }

      await attachAndPlayVideo(stream, sessionId)
      if (sessionId !== cameraSessionRef.current) {
        stream.getTracks().forEach((track) => track.stop())
        return
      }

      streamRef.current = stream
      scanningRef.current = true
      setCameraReady(true)
      setCameraStarting(false)

      if (!capturePausedRef.current) {
        startScanLoop()
      }
    } catch (err: unknown) {
      if (sessionId !== cameraSessionRef.current) return
      stopCamera()
      setError(getCameraErrorMessage(err))
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

      const borrowTimestamp = new Date().toISOString()
      const issueDate = borrowTimestamp.slice(0, 10)

      const rollbackInventory = async () => {
        let rollbackQuery = supabase
          .from('inventory')
          .update({ quantity: latestQty })
          .eq('item_id', result.item_id)
        if (departmentId) rollbackQuery = rollbackQuery.eq('department_id', departmentId)
        await rollbackQuery
      }

      const { data: logRow, error: logErr } = await supabase
        .from('accountability_reports')
        .insert({
          issued_to_id: userId,
          item_id: result.item_id,
          department_id: departmentId,
          quantity_logged: requestedQty,
          issue_date: issueDate,
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
        .select('accountability_id')
        .single()

      if (logErr || !logRow) {
        await rollbackInventory()
        throw logErr ?? new Error('accountability-log-failed')
      }

      const { error: borrowedErr } = await supabase.from('borrowed_items').insert({
        item_id: result.item_id,
        borrower_name: staffName.trim() || 'Staff',
        contact_number: staffContact.trim() || null,
        date_borrowed: borrowTimestamp,
        return_date: getDefaultReturnDate(),
        quantity: requestedQty,
        amount: result.unit_cost != null ? Number(result.unit_cost) : null,
        location: departmentName.trim() || null,
        remarks: 'Borrowed via QR scanner',
        status: 'borrowed',
      })

      if (borrowedErr) {
        await supabase.from('accountability_reports').delete().eq('accountability_id', logRow.accountability_id)
        await rollbackInventory()
        throw borrowedErr
      }

      setSuccessMsg('Success! Requisition recorded and inventory updated.')
      resetFlow()
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
      const { data } = await supabase.from('users').select('full_name, contact_info').eq('id', userId).maybeSingle()
      if (!mounted || !data) return
      if (data.full_name) setStaffName(data.full_name)
      if (data.contact_info) setStaffContact(data.contact_info)
    }

    void loadStaff()
    return () => { mounted = false }
  }, [userId])

  useEffect(() => {
    if (isActive && cameraSupported) {
      void startCamera()
    } else {
      stopCamera()
    }

    return () => stopCamera()
  }, [isActive, cameraSupported]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="dept-section">
      <div style={{ marginBottom: 14 }}>
        <h1 className="dept-page-title" style={{ marginBottom: 4 }}>Scanner</h1>
        <p style={{ fontSize: 13, color: 'var(--dept-text-muted)', margin: 0 }}>
          Camera stays on. Item details load automatically when a system QR code is detected.
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

      {scanNotice && !error && !result && (
        <div className="dept-alert dept-alert-info" style={{ marginBottom: 12 }}>
          <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
          {scanNotice}
        </div>
      )}

      <div className="dept-scanner-wrap">
        <canvas ref={scanCanvasRef} style={{ display: 'none' }} aria-hidden="true" />

        {cameraSupported && (
          <div className={`dept-viewfinder ${cameraReady ? 'dept-viewfinder-ready' : 'dept-viewfinder-starting'}`}>
            <video
              ref={videoRef}
              muted
              playsInline
              autoPlay
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
            <div className="dept-viewfinder-overlay">
              <div className="dept-viewfinder-frame" />
            </div>
            {cameraStarting && !cameraReady && (
              <div className="dept-viewfinder-loading">
                <div className="dept-spinner" />
                <span>Starting camera…</span>
              </div>
            )}
            {!result && cameraReady && (
              <p className="dept-scanner-live-label">Scanning for system QR codes…</p>
            )}
          </div>
        )}

        {!cameraSupported && (
          <div className="dept-alert dept-alert-error">
            <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            Camera is not available on this device.
          </div>
        )}

        {cameraSupported && !cameraReady && !cameraStarting && error && (
          <button type="button" className="dept-btn dept-btn-primary dept-btn-full" onClick={() => void startCamera()}>
            Retry Camera
          </button>
        )}

        {lookingUp && !result && (
          <div className="dept-loading-wrap" style={{ padding: 16 }}>
            <div className="dept-spinner" />
            <span>Checking QR code…</span>
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
                disabled={isReadOnly}
              />
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
              <button className="dept-btn dept-btn-secondary" style={{ flex: 1 }} onClick={resetFlow} disabled={isReadOnly}>
                Cancel
              </button>
              <button className="dept-btn dept-btn-primary" style={{ flex: 1 }} onClick={proceedToSummary} disabled={isReadOnly}>
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
                disabled={confirming || isReadOnly}
              >
                Back
              </button>
              <button
                className="dept-btn dept-btn-primary"
                style={{ flex: 1 }}
                onClick={() => void confirmRequisition()}
                disabled={confirming || isReadOnly}
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
