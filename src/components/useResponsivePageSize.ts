import { useEffect, useState } from 'react'

const getPageSizeFromViewportHeight = (height: number) => {
  // Estimate only the rows that can fit in the visible table area.
  // This keeps pagination active once the table fills the screen,
  // even on larger monitors.
  const reservedLayoutHeight = 500
  const estimatedRowHeight = 78
  const visibleRows = Math.floor((height - reservedLayoutHeight) / estimatedRowHeight)

  return Math.min(8, Math.max(5, visibleRows))
}

const getInitialPageSize = () => {
  if (typeof window === 'undefined') {
    return 8
  }

  return getPageSizeFromViewportHeight(window.innerHeight)
}

function useResponsivePageSize(fixedPageSize?: number) {
  const [pageSize, setPageSize] = useState(() => fixedPageSize ?? getInitialPageSize())

  useEffect(() => {
    if (fixedPageSize != null) {
      setPageSize(fixedPageSize)
      return
    }

    const updatePageSize = () => {
      setPageSize(getPageSizeFromViewportHeight(window.innerHeight))
    }

    updatePageSize()
    window.addEventListener('resize', updatePageSize)

    return () => {
      window.removeEventListener('resize', updatePageSize)
    }
  }, [fixedPageSize])

  return pageSize
}

export default useResponsivePageSize
