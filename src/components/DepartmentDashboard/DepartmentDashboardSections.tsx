import type { DepartmentDashboardSectionKey } from './departmentDashboardConfig'

type DepartmentDashboardOverviewProps = {
  departmentName: string
  onSelectSection: (section: DepartmentDashboardSectionKey) => void
}

export function DepartmentDashboardOverview({ departmentName, onSelectSection }: DepartmentDashboardOverviewProps) {
  return (
    <>
      <header className="dashboard-header">
        <div>
          <h2>{departmentName} Dashboard</h2>
          <p>Shared dashboard layout for department operations, styled like the Super Admin view.</p>
        </div>
      </header>

      <section className="dashboard-metrics" aria-label={`${departmentName} metrics`}>
        <article className="metric-card">
          <div className="metric-text">
            <div className="metric-label">Inventory Records</div>
            <div className="metric-value">--</div>
          </div>
          <div className="metric-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path d="M7 8l5-3 5 3-5 3-5-3Z M7 8v6l5 3 5-3V8 M7 14l5 3 5-3 M12 11v6" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
            </svg>
          </div>
        </article>
        <article className="metric-card">
          <div className="metric-text">
            <div className="metric-label">WMR Cases</div>
            <div className="metric-value">--</div>
          </div>
          <div className="metric-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path d="M12 4L3 19h18L12 4z" fill="none" stroke="currentColor" strokeWidth="1.6" />
              <path d="M12 9v5" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              <circle cx="12" cy="16" r="0.9" fill="currentColor" />
            </svg>
          </div>
        </article>
        <article className="metric-card">
          <div className="metric-text">
            <div className="metric-label">QR Scans</div>
            <div className="metric-value">--</div>
          </div>
          <div className="metric-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <rect x="4" y="4" width="5" height="5" fill="none" stroke="currentColor" strokeWidth="1.6" />
              <rect x="15" y="4" width="5" height="5" fill="none" stroke="currentColor" strokeWidth="1.6" />
              <rect x="4" y="15" width="5" height="5" fill="none" stroke="currentColor" strokeWidth="1.6" />
              <path d="M14 14h2v2h-2zM18 14h2v2h-2zM16 18h2v2h-2z" fill="currentColor" />
            </svg>
          </div>
        </article>
        <article className="metric-card">
          <div className="metric-text">
            <div className="metric-label">Active Staff</div>
            <div className="metric-value">--</div>
          </div>
          <div className="metric-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <circle cx="9" cy="9" r="2.4" fill="none" stroke="currentColor" strokeWidth="1.6" />
              <circle cx="17" cy="10" r="2" fill="none" stroke="currentColor" strokeWidth="1.4" />
              <path d="M5.5 17.5c.6-2 1.9-3 3.5-3s2.9 1 3.5 3" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              <path d="M14.5 17.5c.4-1.4 1.4-2.2 2.5-2.2 1 0 1.9.6 2.3 1.8" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
          </div>
        </article>
      </section>

      <section className="dashboard-actions" aria-label="Department quick actions">
        <button type="button" className="action-card action-card-item" onClick={() => onSelectSection('requests')}>
          <div className="action-card-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <rect x="5" y="7" width="14" height="11" rx="2" ry="2" fill="none" stroke="currentColor" strokeWidth="1.8" />
              <path d="M5 10h14" fill="none" stroke="currentColor" strokeWidth="1.6" />
            </svg>
          </div>
          <div className="action-card-body">
            <h3>Inventory</h3>
            <p>Open the shared department inventory view.</p>
          </div>
        </button>

        <button type="button" className="action-card action-card-wmr" onClick={() => onSelectSection('reports')}>
          <div className="action-card-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path d="M12 4L3 19h18L12 4z" fill="none" stroke="currentColor" strokeWidth="1.6" />
              <path d="M12 9v5" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
          </div>
          <div className="action-card-body">
            <h3>WMR</h3>
            <p>Review department waste materials reports.</p>
          </div>
        </button>

        <button type="button" className="action-card action-card-staff action-card-qr" onClick={() => onSelectSection('scanner')}>
          <div className="action-card-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <rect x="4" y="4" width="5" height="5" fill="none" stroke="currentColor" strokeWidth="1.6" />
              <rect x="15" y="4" width="5" height="5" fill="none" stroke="currentColor" strokeWidth="1.6" />
              <rect x="4" y="15" width="5" height="5" fill="none" stroke="currentColor" strokeWidth="1.6" />
              <path d="M14 14h2v2h-2zM18 14h2v2h-2zM16 18h2v2h-2z" fill="currentColor" />
            </svg>
          </div>
          <div className="action-card-body">
            <h3>QR Scanner</h3>
            <p>Scan items or staff codes from the same dashboard shell.</p>
          </div>
        </button>
      </section>
    </>
  )
}

function DepartmentPanel({ title, description }: { title: string; description: string }) {
  return (
    <section className="panel panel-wide">
      <header className="panel-header">
        <h3>{title}</h3>
      </header>
      <div className="panel-body">
        <p className="panel-body-placeholder">{description}</p>
      </div>
    </section>
  )
}

export function DepartmentInventorySection() {
  return <DepartmentPanel title="Inventory" description="This is the shared inventory workspace for the department." />
}

export function DepartmentWmrSection() {
  return <DepartmentPanel title="WMR" description="This is the shared waste materials reporting workspace." />
}

export function DepartmentQrScannerSection() {
  return <DepartmentPanel title="QR Scanner" description="This area is ready for QR scanner integration and live lookup controls." />
}
