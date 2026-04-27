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
}

export default function DepartmentScannerSection() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const scanLoopRef = useRef<number | null>(null)

  const [scanning, setScanning] = useState(false)
  const [manualInput, setManualInput] = useState('')
  const [result, setResult] = useState<ItemResult | null>(null)
  const [error, setError] = useState('')
  const [lookingUp, setLookingUp] = useState(false)
  const [cameraSupported] = useState(() => !!(navigator.mediaDevices?.getUserMedia))
  const [barcodeSupported] = useState(() => !!(window.BarcodeDetector))

  const stopCamera = () => {
    if (scanLoopRef.current) cancelAnimationFrame(scanLoopRef.current)
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    setScanning(false)
  }

  const lookupItem = async (value: string) => {
    const trimmed = value.trim()
    if (!trimmed) return
    setError('')
    setResult(null)
    setLookingUp(true)

    try {
      const { data, error: qErr } = await supabase
        .from('inventory')
        .select('item_id, item_name, item_type, condition, quantity, unit_of_measure, unit_cost, property_no, status, qr_code, uid')
        .or(`qr_code.eq.${trimmed},uid.eq.${trimmed}`)
        .maybeSingle()

      if (qErr) throw qErr
      if (!data) {
        setError('No item found for this code. Try scanning again or check the value.')
      } else {
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
    setResult(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 } },
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
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
            // continue
          }
          scanLoopRef.current = requestAnimationFrame(scanFrame)
        }
        scanLoopRef.current = requestAnimationFrame(scanFrame)
      }
    } catch {
      setError('Camera access denied. Use manual input below.')
    }
  }

  useEffect(() => () => stopCamera(), [])

  return (
    <div className="dept-section">
      <div style={{ marginBottom: 14 }}>
        <h1 className="dept-page-title" style={{ marginBottom: 4 }}>Scanner</h1>
        <p style={{ fontSize: 13, color: 'var(--dept-text-muted)', margin: 0 }}>
          Scan a QR code or enter an ID to look up an item.
        </p>
      </div>

      {error && (
        <div className="dept-alert dept-alert-error" style={{ marginBottom: 12 }}>
          <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          {error}
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

        {!scanning ? (
          <button className="dept-btn dept-btn-primary dept-btn-full" onClick={startCamera} disabled={!cameraSupported}>
            <svg viewBox="0 0 24 24" fill="none" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 7V5a2 2 0 012-2h2M17 3h2a2 2 0 012 2v2M21 17v2a2 2 0 01-2 2h-2M7 21H5a2 2 0 01-2-2v-2" />
              <line x1="3" y1="12" x2="21" y2="12" />
            </svg>
            {cameraSupported ? 'Start Camera' : 'Camera not available'}
          </button>
        ) : (
          <button className="dept-btn dept-btn-secondary dept-btn-full" onClick={stopCamera}>Stop Camera</button>
        )}

        {scanning && !barcodeSupported && (
          <div className="dept-alert dept-alert-info">
            <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
            Auto-detect not supported. Point camera then enter the code manually below.
          </div>
        )}

        <div style={{ display: 'flex', gap: 8 }}>
          <input
            type="text"
            placeholder="Enter QR code or item UID…"
            value={manualInput}
            onChange={(e) => setManualInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && lookupItem(manualInput)}
            style={{
              flex: 1,
              padding: '10px 12px',
              border: '1px solid var(--dept-border)',
              borderRadius: 'var(--dept-radius-sm)',
              fontSize: 14,
              outline: 'none',
              fontFamily: 'inherit',
            }}
          />
          <button
            className="dept-btn dept-btn-primary"
            onClick={() => lookupItem(manualInput)}
            disabled={!manualInput.trim() || lookingUp}
          >
            {lookingUp ? '…' : 'Look up'}
          </button>
        </div>

        {result && (
          <div className="dept-scanner-result">
            <h3>
              {result.item_name}
              {result.status && (
                <span className={`dept-badge ${result.status === 'active' ? 'dept-badge-active' : 'dept-badge-pending'}`}
                  style={{ marginLeft: 8, fontSize: 11 }}>
                  {result.status}
                </span>
              )}
            </h3>
            <div className="dept-result-grid">
              <div className="dept-result-field"><label>Type</label><span>{result.item_type || '—'}</span></div>
              <div className="dept-result-field"><label>Condition</label><span>{result.condition || '—'}</span></div>
              <div className="dept-result-field"><label>Quantity</label><span>{result.quantity ?? '—'} {result.unit_of_measure ?? ''}</span></div>
              <div className="dept-result-field"><label>Unit Cost</label><span>{result.unit_cost != null ? `₱${Number(result.unit_cost).toLocaleString()}` : '—'}</span></div>
              <div className="dept-result-field"><label>Property No.</label><span>{result.property_no || '—'}</span></div>
              <div className="dept-result-field"><label>UID</label><span style={{ fontSize: 12 }}>{result.uid}</span></div>
            </div>
            <button
              className="dept-btn dept-btn-secondary"
              style={{ marginTop: 12, width: '100%' }}
              onClick={() => { setResult(null); setManualInput('') }}
            >
              Clear
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
