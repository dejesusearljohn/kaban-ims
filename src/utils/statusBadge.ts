export function normalizeStatusKey(status: string | null | undefined): string {
  return (status ?? '').trim().toLowerCase().replace(/_/g, ' ')
}

/**
 * Maps any inventory / WMR / borrowed / report status to a shared semantic badge class.
 * Green = good/complete, amber = pending/in progress, red = problem, blue = repair in progress.
 */
export function getStatusBadgeClass(status: string | null | undefined): string {
  const key = normalizeStatusKey(status)
  if (!key) return 'badge-status-serviceable'

  const map: Record<string, string> = {
    serviceable: 'badge-status-serviceable',
    returned: 'badge-status-serviceable',
    resolved: 'badge-status-serviceable',
    accepted: 'badge-status-serviceable',
    approved: 'badge-status-serviceable',
    active: 'badge-status-serviceable',
    logged: 'badge-status-serviceable',
    valid: 'badge-status-serviceable',
    available: 'badge-status-serviceable',
    good: 'badge-status-serviceable',
    increased: 'badge-status-serviceable',
    'full stock': 'badge-status-serviceable',
    repaired: 'badge-status-repaired',
    disposed: 'badge-status-repaired',

    pending: 'badge-status-pending',
    borrowed: 'badge-status-pending',
    low: 'badge-status-pending',
    'low stock': 'badge-status-pending',
    'needs review': 'badge-status-pending',

    'for repair': 'badge-status-repair',

    unserviceable: 'badge-status-unserviceable',
    'for disposal': 'badge-status-disposal',
    expired: 'badge-status-expired',
    overdue: 'badge-status-expired',
    rejected: 'badge-status-expired',
    disapproved: 'badge-status-expired',
    missing: 'badge-status-expired',
    defective: 'badge-status-expired',
    used: 'badge-status-pending',

    archived: 'badge-status-neutral',
  }

  return map[key] ?? 'badge-status-neutral'
}
