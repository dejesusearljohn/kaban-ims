import { useEffect, useMemo, useRef, useState } from 'react'
import type { Tables } from '../../supabase'
import useResponsivePageSize from './useResponsivePageSize'
import { supabase } from '../supabaseClient'

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
  item_remarks: string | null
  status: string | null
}

function BorrowedItemsSection() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [borrowedItems, setBorrowedItems] = useState<BorrowedItem[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [selectedItem, setSelectedItem] = useState<BorrowedItem | null>(null)
  const [adding, setAdding] = useState(false)
  const [returningId, setReturningId] = useState<number | null>(null)
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
  const [addAmount, setAddAmount] = useState('')
  const [addLocation, setAddLocation] = useState('')
  const [addRemarks, setAddRemarks] = useState('')
  const [addItemRemarks, setAddItemRemarks] = useState('')
  
  const [inventoryItems, setInventoryItems] = useState<InventoryRow[]>([])
  
  const pageSize = useResponsivePageSize(10)
  const [page, setPage] = useState(1)

  useEffect(() => {
    void fetchBorrowedItems()
  }, [])

  const filteredItems = useMemo(() => {
    return borrowedItems.filter((item) => {
      const matchesSearch =
        item.item_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.borrower_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.property_no && item.property_no.toLowerCase().includes(searchQuery.toLowerCase()))

      return matchesSearch
    })
  }, [borrowedItems, searchQuery])

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

  const formatCurrency = (value: number | null) => {
    if (value === null) return '—'
    return `₱${value.toFixed(2)}`
  }

  const getBorrowedItemStatus = (item: BorrowedItem): 'Returned' | 'Overdue' | 'Borrowed' => {
    if ((item.status ?? '').trim().toLowerCase() === 'returned') return 'Returned'

    const returnDate = new Date(item.return_date)
    const now = new Date()
    now.setHours(0, 0, 0, 0)
    returnDate.setHours(0, 0, 0, 0)

    if (!Number.isNaN(returnDate.getTime()) && returnDate < now) {
      return 'Overdue'
    }

    return 'Borrowed'
  }

  const handleMarkReturned = async (item: BorrowedItem) => {
    try {
      setReturningId(item.borrowed_id)
      setError(null)

      const returnedDate = new Date().toISOString().slice(0, 10)

      const { error: updateError } = await supabase
        .from('borrowed_items')
        .update({ status: 'returned', date_returned: returnedDate } as never)
        .eq('borrowed_id', item.borrowed_id)

      if (updateError) throw updateError

      setBorrowedItems((prev) =>
        prev.map((current) =>
          current.borrowed_id === item.borrowed_id
            ? { ...current, status: 'returned', date_returned: returnedDate }
            : current,
        ),
      )

      if (selectedItem?.borrowed_id === item.borrowed_id) {
        setSelectedItem((prev) =>
          prev ? { ...prev, status: 'returned', date_returned: returnedDate } : prev,
        )
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to mark as returned')
    } finally {
      setReturningId(null)
    }
  }

  const handleAddBorrowedItem = async () => {
    try {
      setAdding(true)
      setError(null)

      const { error } = await supabase.from('borrowed_items').insert({
        item_id: addItemId ? parseInt(addItemId) : null,
        borrower_name: addBorrowerName,
        contact_number: addContactNumber,
        date_borrowed: addDateBorrowed,
        return_date: addReturnDate,
        quantity: parseInt(addQuantity),
        amount: addAmount ? parseFloat(addAmount) : null,
        location: addLocation,
        remarks: addRemarks,
        item_remarks: addItemRemarks,
        status: 'borrowed',
      })

      if (error) throw error

      // Reset form
      setAddItemId('')
      setAddBorrowerName('')
      setAddContactNumber('')
      setAddDateBorrowed('')
      setAddReturnDate('')
      setAddQuantity('1')
      setAddAmount('')
      setAddLocation('')
      setAddRemarks('')
      setAddItemRemarks('')
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

      // Fetch borrowed items
      const { data: borrowedData, error: borrowedError } = await supabase
        .from('borrowed_items')
        .select('*')
        .order('date_borrowed', { ascending: false })

      if (borrowedError) throw borrowedError

      // Fetch inventory items for the add form and to get item details
      const { data: inventoryData, error: inventoryError } = await supabase
        .from('inventory')
        .select('*')
        .is('archived_at', null)
        .order('item_name', { ascending: true })

      if (inventoryError) throw inventoryError

      // Create a map of inventory items for quick lookup
      const inventoryMap = new Map(inventoryData?.map((item) => [item.item_id, item]) || [])

      const transformedItems: BorrowedItem[] = (borrowedData || []).map((item: any) => {
        const inventoryItem = item.item_id ? inventoryMap.get(item.item_id) : null
        return {
          borrowed_id: item.borrowed_id,
          item_id: item.item_id,
          item_name: inventoryItem?.item_name || 'Unknown',
          property_no: inventoryItem?.property_no || null,
          quantity: item.quantity,
          amount: item.amount,
          borrower_name: item.borrower_name,
          contact_number: item.contact_number,
          date_borrowed: item.date_borrowed,
          return_date: item.return_date,
          date_returned: item.date_returned ?? null,
          location: item.location,
          remarks: item.remarks,
          item_remarks: item.item_remarks,
          status: item.status,
        }
      })

      setBorrowedItems(transformedItems)
      setInventoryItems(inventoryData || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch borrowed items')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
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

  if (error) {
    return (
      <div className="inventory-layout" aria-label="Borrowed Items">
        <header className="dashboard-header">
          <div>
            <h2>Borrowed Items</h2>
            <p>Track items currently borrowed by staff and departments</p>
          </div>
        </header>
        <div className="inventory-error">{error}</div>
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
            onClick={() => setMode('add')}
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
          </section>

          <section className="inventory-table-section inventory-table-section-compact" aria-label="Borrowed items table">
            <div className="inventory-table-card">
              <table className="inventory-table inventory-list-table">
            <thead>
              <tr>
                <th scope="col">No.</th>
                <th scope="col">Item Name</th>
                <th scope="col">Qty</th>
                <th scope="col">Borrower</th>
                <th scope="col">Contact No.</th>
                <th scope="col">Date Borrowed</th>
                <th scope="col">Return Date</th>
                <th scope="col">Status</th>
                <th scope="col">Action</th>
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
                    <td>{(page - 1) * pageSize + index + 1}</td>
                    <td>{item.item_name}</td>
                    <td>{item.quantity}</td>
                    <td>{item.borrower_name}</td>
                    <td>{item.contact_number || '—'}</td>
                    <td>{formatDate(item.date_borrowed)}</td>
                    <td>{formatDate(item.return_date)}</td>
                    <td>
                      {(() => {
                        const status = getBorrowedItemStatus(item)
                        const className =
                          status === 'Returned'
                            ? 'badge badge-status-serviceable'
                            : status === 'Overdue'
                              ? 'badge badge-status-expired'
                              : 'badge badge-status-low'
                        return <span className={className}>{status}</span>
                      })()}
                    </td>
                    <td className="inventory-row-actions inventory-row-actions-left">
                      <button
                        type="button"
                        className="borrowed-return-button"
                        title="Mark as returned"
                        aria-label="Mark as returned"
                        disabled={getBorrowedItemStatus(item) === 'Returned' || returningId === item.borrowed_id}
                        onClick={(event) => {
                          event.stopPropagation()
                          void handleMarkReturned(item)
                        }}
                      >
                        {returningId === item.borrowed_id ? '...' : 'Returned'}
                      </button>
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
                  type="date"
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
                  type="date"
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
              <div className="inventory-field">
                <label htmlFor="add-amount">Amount</label>
                <input
                  id="add-amount"
                  type="number"
                  step="0.01"
                  className="inventory-input"
                  placeholder="0.00 (optional)"
                  value={addAmount}
                  onChange={(e) => setAddAmount(e.target.value)}
                />
              </div>
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
              <div className="inventory-field inventory-field-full">
                <label htmlFor="add-item-remarks">Item Remarks</label>
                <textarea
                  id="add-item-remarks"
                  className="inventory-input"
                  placeholder="Enter item remarks (optional)"
                  value={addItemRemarks}
                  onChange={(e) => setAddItemRemarks(e.target.value)}
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
                      <th scope="col">Select</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedItemPickerItems.length === 0 ? (
                      <tr>
                        <td colSpan={6}>No items match your search.</td>
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
                          <td>{item.quantity || 0}</td>
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
                <p className="wmr-modal-text"><strong>Date Borrowed:</strong> {formatDate(selectedItem.date_borrowed)}</p>
                <p className="wmr-modal-text"><strong>Return Date:</strong> {formatDate(selectedItem.return_date)}</p>
                <p className="wmr-modal-text"><strong>Date Returned:</strong> {selectedItem.date_returned ? formatDate(selectedItem.date_returned) : '—'}</p>
                <p className="wmr-modal-text"><strong>Status:</strong> {getBorrowedItemStatus(selectedItem)}</p>
                <p className="wmr-modal-text inventory-field-full"><strong>Remarks:</strong> {selectedItem.remarks || '—'}</p>
                <p className="wmr-modal-text inventory-field-full"><strong>Item Remarks:</strong> {selectedItem.item_remarks || '—'}</p>
              </div>
            </div>
            <div style={{ borderTop: '1px solid #e5e7eb', padding: '12px 18px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                className="wmr-modal-button-save"
                disabled={getBorrowedItemStatus(selectedItem) === 'Returned' || returningId === selectedItem.borrowed_id}
                onClick={() => void handleMarkReturned(selectedItem)}
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
    </div>
  )
}

export default BorrowedItemsSection
