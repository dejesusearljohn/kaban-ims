import { useEffect, useMemo, useRef, useState, type MouseEvent } from 'react'
import type { Tables } from '../../supabase'
import useResponsivePageSize from './useResponsivePageSize'
import { supabase } from '../supabaseClient'
import { getStatusBadgeClass } from '../utils/statusBadge'
import { getBorrowedItemStatus, isBorrowedItemReturned } from '../utils/itemUtils'
import { useSupabaseRealtime } from '../hooks/useSupabaseRealtime'

type InventoryRow = Tables<'inventory'>

type BorrowedItem = {
  borrowed_id: number
  item_id: number | null
  item_name: string
  property_no: string | null
  quantity: number
  amount: number | null
  borrower_name: string
  contact_number: string | null
  date_borrowed: string
  return_date: string
  date_returned: string | null
  location: string | null
  remarks: string | null
  return_remarks: string | null
  status: string | null
}

type BorrowedItemsSectionProps = {
  focusItemId?: number | null
  focusBorrowedId?: number | null
  onFocusHandled?: () => void
}

function BorrowedItemsSection({
  focusItemId = null,
  focusBorrowedId = null,
  onFocusHandled,
}: BorrowedItemsSectionProps = {}) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [borrowedItems, setBorrowedItems] = useState<BorrowedItem[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [selectedItem, setSelectedItem] = useState<BorrowedItem | null>(null)
  const [adding, setAdding] = useState(false)
  const [returningId, setReturningId] = useState<number | null>(null)
  const [returnRemarksModalItem, setReturnRemarksModalItem] = useState<BorrowedItem | null>(null)
  const [returnRemarksInput, setReturnRemarksInput] = useState('')
  const [mode, setMode] = useState<'list' | 'add'>('list')
  
  // Item picker modal state
  const [showItemPicker, setShowItemPicker] = useState(false)
  const [itemPickerSearch, setItemPickerSearch] = useState('')
  const [itemPickerSelectedIds, setItemPickerSelectedIds] = useState<string[]>([])
  const [itemPickerPage, setItemPickerPage] = useState(1)
  const itemPickerModalRef = useRef<HTMLDivElement | null>(null)
  
  // Add form state
  const [addItemId, setAddItemId] = useState('')
  const [addBorrowerName, setAddBorrowerName] = useState('')
  const [addContactNumber, setAddContactNumber] = useState('')
  const [addDateBorrowed, setAddDateBorrowed] = useState('')
  const [addReturnDate, setAddReturnDate] = useState('')
  const [addQuantity, setAddQuantity] = useState('1')
  const [addLocation, setAddLocation] = useState('')
  const [addRemarks, setAddRemarks] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'Borrowed' | 'Overdue' | 'Returned'>('all')
  
  const [inventoryItems, setInventoryItems] = useState<InventoryRow[]>([])
  
  const pageSize = useResponsivePageSize(10)
  const [page, setPage] = useState(1)

  useEffect(() => {
    void fetchBorrowedItems()
  }, [])

  useSupabaseRealtime(() => {
    void fetchBorrowedItems()
  })

  useEffect(() => {
    if (focusItemId == null && focusBorrowedId == null) return
    if (loading || borrowedItems.length === 0) return

    const match =
      (focusBorrowedId != null
        ? borrowedItems.find((item) => item.borrowed_id === focusBorrowedId)
        : null) ??
      borrowedItems.find(
        (item) => item.item_id === focusItemId && !isBorrowedItemReturned(item),
      ) ??
      borrowedItems.find((item) => item.item_id === focusItemId)

    if (!match) return

    setMode('list')
    setSelectedItem(match)
    setShowDetailModal(true)
    onFocusHandled?.()
  }, [borrowedItems, focusBorrowedId, focusItemId, loading, onFocusHandled])

  const getDefaultDateTimeLocal = () => {
    const now = new Date()
    const offsetMs = now.getTimezoneOffset() * 60_000
    return new Date(now.getTime() - offsetMs).toISOString().slice(0, 16)
  }

  const getDefaultReturnDateTimeLocal = () => {
    const date = new Date()
    date.setDate(date.getDate() + 14)
    const offsetMs = date.getTimezoneOffset() * 60_000
    return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16)
  }

  const openAddMode = () => {
    setAddDateBorrowed(getDefaultDateTimeLocal())
    setAddReturnDate(getDefaultReturnDateTimeLocal())
    setMode('add')
  }

  const filteredItems = useMemo(() => {
    return borrowedItems.filter((item) => {
      const status = getBorrowedItemStatus(item)
      const matchesStatus = statusFilter === 'all' || status === statusFilter
      const matchesSearch =
        item.item_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.borrower_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.property_no && item.property_no.toLowerCase().includes(searchQuery.toLowerCase()))

      return matchesStatus && matchesSearch
    })
  }, [borrowedItems, searchQuery, statusFilter])

  // Item picker logic
  const itemPickerPageSize = 8

  const filteredItemPickerItems = useMemo(() => {
    return inventoryItems.filter((item) => {
      const matchesSearch =
        item.item_name.toLowerCase().includes(itemPickerSearch.toLowerCase()) ||
        (item.property_no && item.property_no.toLowerCase().includes(itemPickerSearch.toLowerCase())) ||
        (item.item_type && item.item_type.toLowerCase().includes(itemPickerSearch.toLowerCase()))
      return matchesSearch
    })
  }, [inventoryItems, itemPickerSearch])

  const itemPickerTotalPages = Math.max(1, Math.ceil(filteredItemPickerItems.length / itemPickerPageSize))
  const paginatedItemPickerItems = useMemo(() => {
    const start = (itemPickerPage - 1) * itemPickerPageSize
    return filteredItemPickerItems.slice(start, start + itemPickerPageSize)
  }, [filteredItemPickerItems, itemPickerPage])

  const openItemPicker = () => {
    setShowItemPicker(true)
    setItemPickerSearch('')
    setItemPickerSelectedIds([])
    setItemPickerPage(1)
  }

  const closeItemPicker = () => {
    setShowItemPicker(false)
    setItemPickerSearch('')
    setItemPickerSelectedIds([])
    setItemPickerPage(1)
  }

  const toggleItemPickerSelection = (itemId: string) => {
    setItemPickerSelectedIds((prev) => {
      if (prev.includes(itemId)) {
        return prev.filter((id) => id !== itemId)
      }
      return [...prev, itemId]
    })
  }

  const handleApplySelectedItems = () => {
    if (itemPickerSelectedIds.length === 0) return

    // For borrowed items, we'll just select the first item for now
    // since the form is designed for single item borrowing
    const firstSelectedId = itemPickerSelectedIds[0]
    setAddItemId(firstSelectedId)
    closeItemPicker()
  }

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize))
  const paginatedItems = useMemo(() => {
    const start = (page - 1) * pageSize
    return filteredItems.slice(start, start + pageSize)
  }, [filteredItems, page, pageSize])

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages)
    }
  }, [page, totalPages])

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-PH', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    } catch {
      return dateString
    }
  }

  const formatTime = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleTimeString('en-PH', {
        hour: 'numeric',
        minute: '2-digit',
      })
    } catch {
      return ''
    }
  }

  const formatDateWithTime = (dateString: string) => {
    const date = formatDate(dateString)
    const time = formatTime(dateString)
    if (!time) return date
    return (
      <>
        {date}
        <br />
        <span className="borrowed-items-time">{time}</span>
      </>
    )
  }

  const getInventoryAmount = (itemId: string): number | null => {
    const inventoryItem = inventoryItems.find((item) => item.item_id.toString() === itemId)
    if (!inventoryItem || inventoryItem.unit_cost == null) return null
    return Number(inventoryItem.unit_cost)
  }

  const formatCurrency = (value: number | null) => {
    if (value === null) return '—'
    return `₱${value.toFixed(2)}`
  }

  const handleMarkReturned = async (item: BorrowedItem, returnRemarks: string) => {
    try {
      setReturningId(item.borrowed_id)
      setError(null)

      const returnedAt = new Date().toISOString()

      const { error: updateError } = await supabase
        .from('borrowed_items')
        .update({
          status: 'returned',
          date_returned: returnedAt,
          return_remarks: returnRemarks.trim() || null,
        } as never)
        .eq('borrowed_id', item.borrowed_id)

      if (updateError) throw updateError

      setBorrowedItems((prev) =>
        prev.map((current) =>
          current.borrowed_id === item.borrowed_id
            ? {
                ...current,
                status: 'returned',
                date_returned: returnedAt,
                return_remarks: returnRemarks.trim() || null,
              }
            : current,
        ),
      )

      if (selectedItem?.borrowed_id === item.borrowed_id) {
        setSelectedItem((prev) =>
          prev
            ? {
                ...prev,
                status: 'returned',
                date_returned: returnedAt,
                return_remarks: returnRemarks.trim() || null,
              }
            : prev,
        )
      }

      setReturnRemarksModalItem(null)
      setReturnRemarksInput('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to mark as returned')
    } finally {
      setReturningId(null)
    }
  }

  const openReturnRemarksModal = (item: BorrowedItem, event?: MouseEvent) => {
    event?.stopPropagation()
    setShowDetailModal(false)
    setReturnRemarksModalItem(item)
    setReturnRemarksInput('')
  }

  const confirmReturnWithRemarks = () => {
    if (!returnRemarksModalItem) return
    void handleMarkReturned(returnRemarksModalItem, returnRemarksInput)
  }

  const handleAddBorrowedItem = async () => {
    if (!addItemId) {
      setError('Please select an item from inventory.')
      return
    }
    if (!addBorrowerName.trim()) {
      setError('Borrower name is required.')
      return
    }
    if (!addDateBorrowed) {
      setError('Date borrowed is required.')
      return
    }
    if (!addReturnDate) {
      setError('Return date is required.')
      return
    }

    const quantityValue = parseInt(addQuantity, 10)
    if (!Number.isFinite(quantityValue) || quantityValue <= 0) {
      setError('Quantity must be a positive number.')
      return
    }

    const inventoryItem = inventoryItems.find((item) => item.item_id.toString() === addItemId)
    const availableQty = inventoryItem?.quantity ?? null
    if (availableQty != null && quantityValue > availableQty) {
      setError(`Only ${availableQty} ${inventoryItem?.unit_of_measure ?? 'unit(s)'} available in inventory.`)
      return
    }

    try {
      setAdding(true)
      setError(null)

      const inventoryAmount = getInventoryAmount(addItemId)

      const { error: insertError } = await supabase.from('borrowed_items').insert({
        item_id: parseInt(addItemId, 10),
        borrower_name: addBorrowerName.trim(),
        contact_number: addContactNumber.trim() || null,
        date_borrowed: new Date(addDateBorrowed).toISOString(),
        return_date: new Date(addReturnDate).toISOString(),
        quantity: quantityValue,
        amount: inventoryAmount,
        location: addLocation.trim() || null,
        remarks: addRemarks.trim() || null,
        status: 'borrowed',
      })

      if (insertError) throw insertError

      // Reset form
      setAddItemId('')
      setAddBorrowerName('')
      setAddContactNumber('')
      setAddDateBorrowed('')
      setAddReturnDate('')
      setAddQuantity('1')
      setAddLocation('')
      setAddRemarks('')
      setMode('list')

      // Refresh data
      void fetchBorrowedItems()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add borrowed item')
    } finally {
      setAdding(false)
    }
  }

  // Hide scrollbar when in add mode
  useEffect(() => {
    if (mode === 'add') {
      ;(document.body.style as any).scrollbarWidth = 'none'
      ;(document.body.style as any).msOverflowStyle = 'none'
    } else {
      ;(document.body.style as any).scrollbarWidth = ''
      ;(document.body.style as any).msOverflowStyle = ''
    }

    return () => {
      ;(document.body.style as any).scrollbarWidth = ''
      ;(document.body.style as any).msOverflowStyle = ''
    }
  }, [mode])

  const handleRowClick = (item: BorrowedItem) => {
    setSelectedItem(item)
    setShowDetailModal(true)
  }

  const fetchBorrowedItems = async () => {
    try {
      setLoading(true)
      setError(null)

      const [borrowedResult, inventoryResult] = await Promise.all([
        supabase.from('borrowed_items').select('*').order('date_borrowed', { ascending: false }),
        supabase.from('inventory').select('*').is('archived_at', null).order('item_name', { ascending: true }),
      ])

      if (borrowedResult.error) throw borrowedResult.error
      if (inventoryResult.error) throw inventoryResult.error

      const borrowedData = borrowedResult.data
      const inventoryData = inventoryResult.data

      const inventoryMap = new Map(inventoryData?.map((item) => [item.item_id, item]) || [])

      const transformedItems: BorrowedItem[] = (borrowedData || []).map((item: Tables<'borrowed_items'>) => {
        const inventoryItem = item.item_id ? inventoryMap.get(item.item_id) : null
        return {
          borrowed_id: item.borrowed_id,
          item_id: item.item_id,
          item_name: inventoryItem?.item_name || 'Unknown',
          property_no: inventoryItem?.property_no || null,
          quantity: item.quantity,
          amount: inventoryItem?.unit_cost != null ? Number(inventoryItem.unit_cost) : item.amount,
          borrower_name: item.borrower_name,
          contact_number: item.contact_number,
          date_borrowed: item.date_borrowed,
          return_date: item.return_date,
          date_returned: item.date_returned ?? null,
          location: item.location,
          remarks: item.remarks,
          return_remarks: item.return_remarks ?? null,
          status: item.status,
        }
      })

      setBorrowedItems(transformedItems.sort(
        (a, b) => new Date(b.date_borrowed).getTime() - new Date(a.date_borrowed).getTime(),
      ))
      setInventoryItems(inventoryData || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch borrowed items')
    } finally {
      setLoading(false)
    }
  }

  if (loading && borrowedItems.length === 0) {
    return (
      <div className="inventory-layout" aria-label="Borrowed Items">
        <header className="dashboard-header">
          <div>
            <h2>Borrowed Items</h2>
            <p>Track items currently borrowed by staff and departments</p>
          </div>
        </header>
        <div className="inventory-loading">Loading borrowed items...</div>
      </div>
    )
  }

  return (
    <div className="inventory-layout" aria-label="Borrowed Items" style={mode === 'add' ? { overflow: 'hidden', scrollbarWidth: 'none', msOverflowStyle: 'none' } : undefined}>
      <header className="dashboard-header">
        <div>
          <h2>Borrowed Items</h2>
          <p>Track items currently borrowed by staff and departments</p>
        </div>
      </header>

      {error && <p className="dashboard-error">{error}</p>}

      <section className="section-toolbar-row" aria-label="Borrowed items actions">
        <div className="inventory-toolbar">
          <button
            type="button"
            className={mode === 'list' ? 'inventory-primary-button' : 'inventory-secondary-button'}
            onClick={() => setMode('list')}
          >
            Manage Items
          </button>
          <button
            type="button"
            className={mode === 'add' ? 'inventory-primary-button' : 'inventory-secondary-button'}
            onClick={openAddMode}
          >
            Add Item
          </button>
        </div>
      </section>

      {mode === 'list' && (
        <>
          <section className="inventory-filters" aria-label="Borrowed items filters">
            <div className="inventory-search-wrapper">
              <input
                type="search"
                className="inventory-search-input"
                placeholder="Search by item name, borrower, or property number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="inventory-filter-selects">
              <select
                id="borrowed-status-filter"
                className="inventory-filter-select"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
                aria-label="Filter by status"
              >
                <option value="all">All Statuses</option>
                <option value="Borrowed">Borrowed</option>
                <option value="Overdue">Overdue</option>
                <option value="Returned">Returned</option>
              </select>
            </div>
          </section>

          <section className="inventory-table-section inventory-table-section-compact" aria-label="Borrowed items table">
            <div className="inventory-table-card">
              <table className="inventory-table inventory-list-table">
            <thead>
              <tr>
                <th scope="col" className="inventory-rowno-column">No.</th>
                <th scope="col" className="inventory-name-column">Item Name</th>
                <th scope="col" className="inventory-qty-column">Qty</th>
                <th scope="col">Amount</th>
                <th scope="col">Borrower</th>
                <th scope="col">Contact No.</th>
                <th scope="col">Date Borrowed</th>
                <th scope="col">Return Date</th>
                <th scope="col" className="inventory-status-column">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9}>Loading borrowed items…</td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={9}>No borrowed items found.</td>
                </tr>
              ) : (
                paginatedItems.map((item, index) => (
                  <tr 
                    key={item.borrowed_id} 
                    onClick={() => handleRowClick(item)}
                    style={{ cursor: 'pointer' }}
                  >
                    <td className="inventory-rowno-column">{(page - 1) * pageSize + index + 1}</td>
                    <td className="inventory-name-column">{item.item_name}</td>
                    <td className="inventory-qty-column">{item.quantity}</td>
                    <td>{formatCurrency(item.amount)}</td>
                    <td>{item.borrower_name}</td>
                    <td>{item.contact_number || '—'}</td>
                    <td>{formatDateWithTime(item.date_borrowed)}</td>
                    <td>{formatDateWithTime(item.return_date)}</td>
                    <td>
                      {(() => {
                        const status = getBorrowedItemStatus(item)
                        return (
                          <span className={`badge ${getStatusBadgeClass(status)}`}>{status}</span>
                        )
                      })()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {!loading && filteredItems.length > 0 && (
            <div className="inventory-pagination">
              {totalPages > 1 && (
                <div className="inventory-pagination-controls">
                  <button
                    type="button"
                    className="inventory-page-button"
                    disabled={page === 1}
                    onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                  >
                    Prev
                  </button>
                  <span className="inventory-pagination-text">
                    Page {page} of {totalPages}
                  </span>
                  <button
                    type="button"
                    className="inventory-page-button"
                    disabled={page === totalPages}
                    onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </section>
        </>
      )}

      {mode === 'add' && (
        <section className="inventory-add-section" aria-label="Add borrowed item" style={{ overflow: 'hidden', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          <div className="inventory-add-card" style={{ overflow: 'hidden', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            <h3 className="inventory-add-title">Add Borrowed Item</h3>
            <div className="inventory-add-grid">
              <div className="inventory-field">
                <label>
                  Item <span className="inventory-required">*</span>
                </label>
                <button
                  type="button"
                  className={`par-item-picker-button ${addItemId ? 'par-item-picker-button-selected' : ''}`}
                  onClick={openItemPicker}
                >
                  <span className="par-item-picker-button-label">
                    {inventoryItems.find((item) => item.item_id.toString() === addItemId)?.item_name || 'Select an item...'}
                  </span>
                </button>
              </div>
              <div className="inventory-field">
                <label htmlFor="add-borrower">
                  Borrower Name <span className="inventory-required">*</span>
                </label>
                <input
                  id="add-borrower"
                  className="inventory-input"
                  placeholder="Enter borrower name"
                  value={addBorrowerName}
                  onChange={(e) => setAddBorrowerName(e.target.value)}
                />
              </div>
              <div className="inventory-field">
                <label htmlFor="add-contact">Contact Number</label>
                <input
                  id="add-contact"
                  className="inventory-input"
                  placeholder="Enter contact number (optional)"
                  value={addContactNumber}
                  onChange={(e) => setAddContactNumber(e.target.value)}
                />
              </div>
              <div className="inventory-field">
                <label htmlFor="add-date-borrowed">
                  Date Borrowed <span className="inventory-required">*</span>
                </label>
                <input
                  id="add-date-borrowed"
                  type="datetime-local"
                  className="inventory-input"
                  value={addDateBorrowed}
                  onChange={(e) => setAddDateBorrowed(e.target.value)}
                />
              </div>
              <div className="inventory-field">
                <label htmlFor="add-return-date">
                  Return Date <span className="inventory-required">*</span>
                </label>
                <input
                  id="add-return-date"
                  type="datetime-local"
                  className="inventory-input"
                  value={addReturnDate}
                  onChange={(e) => setAddReturnDate(e.target.value)}
                />
              </div>
              <div className="inventory-field">
                <label htmlFor="add-quantity">Quantity</label>
                <input
                  id="add-quantity"
                  type="number"
                  min="1"
                  className="inventory-input"
                  placeholder="1"
                  value={addQuantity}
                  onChange={(e) => setAddQuantity(e.target.value)}
                />
              </div>
              {addItemId && (
                <div className="inventory-field">
                  <label>Amount (from inventory)</label>
                  <input
                    className="inventory-input"
                    value={formatCurrency(getInventoryAmount(addItemId))}
                    readOnly
                    aria-readonly="true"
                  />
                </div>
              )}
              {addItemId && (
                <div className="inventory-field">
                  <label>Available in Inventory</label>
                  <input
                    className="inventory-input"
                    value={(() => {
                      const item = inventoryItems.find((entry) => entry.item_id.toString() === addItemId)
                      if (!item) return '—'
                      return `${item.quantity ?? 0} ${item.unit_of_measure ?? 'unit(s)'}`
                    })()}
                    readOnly
                    aria-readonly="true"
                  />
                </div>
              )}
              <div className="inventory-field">
                <label htmlFor="add-location">Location</label>
                <input
                  id="add-location"
                  className="inventory-input"
                  placeholder="Enter location (optional)"
                  value={addLocation}
                  onChange={(e) => setAddLocation(e.target.value)}
                />
              </div>
              <div className="inventory-field inventory-field-full">
                <label htmlFor="add-remarks">Remarks</label>
                <textarea
                  id="add-remarks"
                  className="inventory-input"
                  placeholder="Enter remarks (optional)"
                  value={addRemarks}
                  onChange={(e) => setAddRemarks(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
            <div className="inventory-add-actions">
              <button
                type="button"
                className="inventory-secondary-button"
                onClick={() => setMode('list')}
                disabled={adding}
              >
                Cancel
              </button>
              <button
                type="button"
                className="inventory-add-submit"
                onClick={handleAddBorrowedItem}
                disabled={adding}
              >
                {adding ? 'Adding...' : 'Add Item'}
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Item Picker Modal */}
      {showItemPicker && (
        <div
          className="par-item-picker-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="item-picker-title"
          onClick={closeItemPicker}
        >
          <div
            ref={itemPickerModalRef}
            className="par-item-picker-modal"
            tabIndex={-1}
            onClick={(event) => event.stopPropagation()}
          >
            <header className="panel-header dashboard-drilldown-header">
              <h3 id="item-picker-title">Select Item</h3>
              <button
                type="button"
                className="dashboard-drilldown-close-button"
                onClick={closeItemPicker}
                aria-label="Close"
              >
                x
              </button>
            </header>

            <div className="panel-body">
              <div className="par-item-picker-toolbar">
                <input
                  type="search"
                  className="inventory-input"
                  placeholder="Search item name or property number"
                  value={itemPickerSearch}
                  onChange={(event) => setItemPickerSearch(event.target.value)}
                />
              </div>

              <div className="dashboard-drilldown-table-wrap par-item-picker-table-wrap">
                <table className="dashboard-drilldown-table">
                  <thead>
                    <tr>
                      <th scope="col">Item Name</th>
                      <th scope="col">Property No.</th>
                      <th scope="col">Type</th>
                      <th scope="col">Unit</th>
                      <th scope="col">Qty</th>
                      <th scope="col">Amount</th>
                      <th scope="col">Select</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedItemPickerItems.length === 0 ? (
                      <tr>
                        <td colSpan={7}>No items match your search.</td>
                      </tr>
                    ) : (
                      paginatedItemPickerItems.map((item) => (
                        <tr 
                          key={`item-picker-${item.item_id}`} 
                          onClick={() => toggleItemPickerSelection(String(item.item_id))}
                          style={{ cursor: 'pointer' }}
                        >
                          <td>{item.item_name}</td>
                          <td>{item.property_no || '—'}</td>
                          <td>{item.item_type || '—'}</td>
                          <td>{item.unit_of_measure || '—'}</td>
                          <td>{item.quantity ?? 0}</td>
                          <td>{item.unit_cost != null ? formatCurrency(Number(item.unit_cost)) : '—'}</td>
                          <td>
                            <input
                              type="checkbox"
                              className="par-item-picker-checkbox"
                              checked={itemPickerSelectedIds.includes(String(item.item_id))}
                              onChange={() => toggleItemPickerSelection(String(item.item_id))}
                              aria-label={`Select ${item.item_name}`}
                            />
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="par-item-picker-footer">
                <span className="par-item-picker-selected-count">{itemPickerSelectedIds.length} selected</span>

                <div className="par-item-picker-footer-center">
                  {itemPickerTotalPages > 1 && (
                    <div className="dashboard-drilldown-pagination" aria-label="Item picker pagination">
                      <button
                        type="button"
                        className="dashboard-drilldown-pagination-button"
                        onClick={() => setItemPickerPage((prev) => Math.max(1, prev - 1))}
                        disabled={itemPickerPage === 1}
                      >
                        Prev
                      </button>
                      {Array.from({ length: Math.min(5, itemPickerTotalPages) }, (_, i) => {
                        let pageNum
                        if (itemPickerTotalPages <= 5) {
                          pageNum = i + 1
                        } else if (itemPickerPage <= 3) {
                          pageNum = i + 1
                        } else if (itemPickerPage >= itemPickerTotalPages - 2) {
                          pageNum = itemPickerTotalPages - 4 + i
                        } else {
                          pageNum = itemPickerPage - 2 + i
                        }
                        return (
                          <button
                            key={`page-${pageNum}`}
                            type="button"
                            className={`dashboard-drilldown-pagination-button ${
                              itemPickerPage === pageNum ? 'dashboard-drilldown-pagination-button-active' : ''
                            }`}
                            onClick={() => setItemPickerPage(pageNum)}
                            aria-current={itemPickerPage === pageNum ? 'page' : undefined}
                          >
                            {pageNum}
                          </button>
                        )
                      })}
                      <button
                        type="button"
                        className="dashboard-drilldown-pagination-button"
                        onClick={() => setItemPickerPage((prev) => Math.min(itemPickerTotalPages, prev + 1))}
                        disabled={itemPickerPage === itemPickerTotalPages}
                      >
                        Next
                      </button>
                    </div>
                  )}
                </div>

                <div className="par-item-picker-footer-right">
                  <button
                    type="button"
                    className="inventory-add-submit"
                    onClick={handleApplySelectedItems}
                    disabled={itemPickerSelectedIds.length === 0}
                  >
                    Done
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedItem && (
        <div
          className="dashboard-drilldown-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="borrowed-item-title"
          onClick={() => setShowDetailModal(false)}
        >
          <div
            className="dashboard-drilldown-modal"
            tabIndex={-1}
            onClick={(e) => e.stopPropagation()}
          >
            <header className="panel-header dashboard-drilldown-header">
              <h3 id="borrowed-item-title">Borrowed Item Details</h3>
              <button
                type="button"
                className="dashboard-drilldown-close-button"
                onClick={() => setShowDetailModal(false)}
                aria-label="Close"
              >
                x
              </button>
            </header>
            <div className="panel-body">
              <div className="vehicle-info-grid">
                <p className="wmr-modal-text"><strong>Borrower Name:</strong> {selectedItem.borrower_name}</p>
                <p className="wmr-modal-text"><strong>Contact No:</strong> {selectedItem.contact_number || '—'}</p>
                <p className="wmr-modal-text"><strong>Location:</strong> {selectedItem.location || '—'}</p>
                <p className="wmr-modal-text"><strong>Item Borrowed:</strong> {selectedItem.item_name}</p>
                <p className="wmr-modal-text"><strong>Property No.:</strong> {selectedItem.property_no || '—'}</p>
                <p className="wmr-modal-text"><strong>Quantity:</strong> {selectedItem.quantity}</p>
                <p className="wmr-modal-text"><strong>Amount:</strong> {formatCurrency(selectedItem.amount)}</p>
                <p className="wmr-modal-text"><strong>Date Borrowed:</strong> {formatDateWithTime(selectedItem.date_borrowed)}</p>
                <p className="wmr-modal-text"><strong>Return Date:</strong> {formatDateWithTime(selectedItem.return_date)}</p>
                <p className="wmr-modal-text"><strong>Date Returned:</strong> {selectedItem.date_returned ? formatDateWithTime(selectedItem.date_returned) : '—'}</p>
                <p className="wmr-modal-text"><strong>Status:</strong>{' '}
                  <span className={`badge ${getStatusBadgeClass(getBorrowedItemStatus(selectedItem))}`}>
                    {getBorrowedItemStatus(selectedItem)}
                  </span>
                </p>
                <p className="wmr-modal-text inventory-field-full"><strong>Remarks:</strong> {selectedItem.remarks || '—'}</p>
                <p className="wmr-modal-text inventory-field-full"><strong>Return Remarks:</strong> {selectedItem.return_remarks || '—'}</p>
              </div>
            </div>
            <div style={{ borderTop: '1px solid #e5e7eb', padding: '12px 18px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                className="wmr-modal-button-save"
                disabled={
                  selectedItem.borrowed_id < 0 ||
                  isBorrowedItemReturned(selectedItem) ||
                  returningId === selectedItem.borrowed_id
                }
                onClick={() => openReturnRemarksModal(selectedItem)}
              >
                {returningId === selectedItem.borrowed_id ? 'Saving...' : 'Returned'}
              </button>
              <button
                type="button"
                className="wmr-modal-button-secondary"
                onClick={() => setShowDetailModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {returnRemarksModalItem && (
        <div
          className="dashboard-drilldown-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="return-remarks-title"
          onClick={() => setReturnRemarksModalItem(null)}
        >
          <div
            className="dashboard-drilldown-modal"
            tabIndex={-1}
            onClick={(e) => e.stopPropagation()}
          >
            <header className="panel-header dashboard-drilldown-header">
              <h3 id="return-remarks-title">Mark Item as Returned</h3>
              <button
                type="button"
                className="dashboard-drilldown-close-button"
                onClick={() => setReturnRemarksModalItem(null)}
                aria-label="Close"
              >
                x
              </button>
            </header>
            <div className="panel-body">
              <p className="wmr-modal-text">
                <strong>Item:</strong> {returnRemarksModalItem.item_name}
              </p>
              <div className="inventory-field inventory-field-full">
                <label htmlFor="return-remarks-input">Return Remarks</label>
                <textarea
                  id="return-remarks-input"
                  className="inventory-input"
                  placeholder="Enter remarks about the condition or receipt of the returned item (optional)"
                  value={returnRemarksInput}
                  onChange={(e) => setReturnRemarksInput(e.target.value)}
                  rows={4}
                />
              </div>
            </div>
            <div style={{ borderTop: '1px solid #e5e7eb', padding: '12px 18px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                className="wmr-modal-button-secondary"
                onClick={() => setReturnRemarksModalItem(null)}
                disabled={returningId === returnRemarksModalItem.borrowed_id}
              >
                Cancel
              </button>
              <button
                type="button"
                className="wmr-modal-button-save"
                disabled={returningId === returnRemarksModalItem.borrowed_id}
                onClick={confirmReturnWithRemarks}
              >
                {returningId === returnRemarksModalItem.borrowed_id ? 'Saving...' : 'Confirm Returned'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default BorrowedItemsSection
