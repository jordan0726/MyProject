// src/components/DashboardDateSelector.tsx
// Month–year navigator with optional custom range popover.
// Props control only date/navigation callbacks; no data fetching here.

const DAY_MS = 24 * 60 * 60 * 1000 // Milliseconds per day

// Convert Date to 'YYYY-MM-DD' for <input type="date">
const toInputValue = (d: Date) => {
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

import React from 'react'
import Icon from '@mdi/react'
import { mdiChevronLeft, mdiChevronRight, mdiCalendarOutline } from '@mdi/js'

export type DashboardDateSelectorProps = {
  date: Date // Controlled date value (month is used for display)
  onPrev: () => void // Go to previous month
  onNext: () => void // Go to next month
  locale?: string // Optional BCP 47 locale tag (defaults to browser)
  format?: Intl.DateTimeFormatOptions // Optional override for label formatting
  className?: string // Optional className for the wrapper
  style?: React.CSSProperties // Optional inline style for the wrapper
  onRangeChange?: (start: Date, end: Date) => void // Emit when user applies a custom date range
  range?: { start?: Date; end?: Date }             // Optional current range to prefill the picker
}

export default function DashboardDateSelector({
  date,
  onPrev,
  onNext,
  locale,
  format,
  className,
  style,
  onRangeChange,
  range,
}: DashboardDateSelectorProps) {
  const labelBtnRef = React.useRef<HTMLButtonElement | null>(null) // Focus returns here after closing
  const dialogRef = React.useRef<HTMLDivElement | null>(null) // Used to detect outside clicks
  const startInputRef = React.useRef<HTMLInputElement | null>(null) // Autofocus target when opened

  // Month label (e.g., "Sep 2025"); honors optional format override
  const monthLabel = React.useMemo(() => {
    const fmt = new Intl.DateTimeFormat(locale, {
      month: 'short',
      year: 'numeric',
      ...format, // Only affects the month label
    })
    return fmt.format(date)
  }, [date, locale, format])

  // Today snapshot stored in a ref for stable comparisons across renders
  const todayRef = React.useRef(new Date())
  // Whether the shown month equals the current month
  const today = todayRef.current
  const isCurrentMonth =
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth()

  // Last applied range; keeps the center label in sync immediately
  const [appliedRange, setAppliedRange] = React.useState<{ start?: Date; end?: Date } | undefined>(range)
  
  // Formatter for labels like "Sep 1, 2025 — Sep 30, 2025"
  const rangeFormatter = React.useMemo(
    () => new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric', year: 'numeric' }),
    [locale]
  )

  // Popover visibility
  const [open, setOpen] = React.useState(false)

  const todayStr = toInputValue(today) // Max date for inputs

  // Prefill inputs with provided range or default to the current month boundaries
  const monthStart = new Date(date.getFullYear(), date.getMonth(), 1)
  const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 1) // exclusive end
  const [startStr, setStartStr] = React.useState<string>(toInputValue(range?.start ?? monthStart)) // Prefill start
  const initialLastDay = new Date(monthEnd.getTime() - DAY_MS) // Last day of the shown month
  const initialEnd = initialLastDay.getTime() > today.getTime() ? today : initialLastDay // Cap at today
  const [endStr, setEndStr] = React.useState<string>(toInputValue(range?.end ?? initialEnd)) // last day or today

  // Ensure end >= start while editing
  React.useEffect(() => {
    if (!startStr || !endStr) return
    if (endStr < startStr) setEndStr(startStr) // bump end to start if needed
  }, [startStr, endStr])

  // Sync local inputs and applied label when parent date (month) or range changes
  React.useEffect(() => {
    const todayLocal = todayRef.current // Stable 'today' from ref; avoids extra dependency

    // Recompute month boundaries inside the effect (avoid leaking objects into deps)
    const monthStartLocal = new Date(date.getFullYear(), date.getMonth(), 1) // Start of the shown month
    const monthEndLocal = new Date(date.getFullYear(), date.getMonth() + 1, 1) // Exclusive end (next month day 1)
    const lastDayOfMonth = new Date(monthEndLocal.getTime() - DAY_MS) // Inclusive end
    const defaultEnd = lastDayOfMonth.getTime() > todayLocal.getTime() ? todayLocal : lastDayOfMonth // Prevent future default

    // Format value for <input type="date">
    const fmt = (d: Date) => {
      const yyyy = d.getFullYear()
      const mm = String(d.getMonth() + 1).padStart(2, '0')
      const dd = String(d.getDate()).padStart(2, '0')
      return `${yyyy}-${mm}-${dd}`
    }

    setAppliedRange(range) // Sync label with external range (if controlled)
    setStartStr(fmt(range?.start ?? monthStartLocal))
    setEndStr(fmt(range?.end ?? defaultEnd))
  }, [date, range])

  // Manage focus and outside-click when the popover opens/closes
  React.useEffect(() => {
    // Autofocus the start input when opened
    if (open && startInputRef.current) {
      startInputRef.current.focus() // Move focus into dialog
    }

    // Restore focus to the label button when closed
    if (!open && labelBtnRef.current) {
      labelBtnRef.current.focus() // Return focus to trigger
    }

    if (!open) return // Do not bind listeners when closed

    const onDocMouseDown = (e: MouseEvent) => {
      const target = e.target as Node
      if (!dialogRef.current?.contains(target)) {
        setOpen(false) // Close on outside click
      }
    }

    document.addEventListener('mousedown', onDocMouseDown)
    return () => document.removeEventListener('mousedown', onDocMouseDown)
  }, [open])

  // Validate and submit the range
  const applyRange = () => {
    if (!startStr || !endStr) return // Require both dates
    const startDate = new Date(startStr)
    const endDate = new Date(endStr)
    if (endDate.getTime() > today.getTime()) return // Disallow future end date
    setAppliedRange({ start: startDate, end: endDate }) // Update label immediately
    if (onRangeChange) onRangeChange(startDate, endDate) // Notify parent
    setOpen(false)
  }

  const cancelRange = () => {
    // Reset inputs to last committed values (range props or current month)
    const lastDay = new Date(monthEnd.getTime() - DAY_MS) // Last day of the shown month
    const cappedEnd = lastDay.getTime() > today.getTime() ? today : lastDay // Cap at today
    setStartStr(toInputValue(range?.start ?? monthStart))
    setEndStr(toInputValue(range?.end ?? cappedEnd))
    setOpen(false)
  }

  return (
    <div
      className={className}
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr auto 1fr', // Left chevron | label | right chevron
        alignItems: 'center',
        marginBottom: 16,
        position: 'relative',
        ...(style || {}),
      }}
      data-testid="dashboard-date-selector"
    >
      <button
        type="button"
        onClick={onPrev}
        style={{ justifySelf: 'start', background: 'none', border: 'none', cursor: 'pointer' }}
        aria-label="Previous month"
        data-testid="prev-month"
      >
        <Icon path={mdiChevronLeft} size={1.2} />
      </button>

      <button
        id="dashboard-date-selector-label"
        ref={labelBtnRef}
        type="button"
        title="Select date range" // Inline: stable tooltip for tests and UX
        onClick={() => setOpen(o => !o)} // Toggle the date-range popover
        style={{
          display: 'inline-flex', // Icon + label in a row
          alignItems: 'center', // Vertically centered
          gap: 6, // Space between icon and label
          background: 'none', // No background
          border: 'none', // No border
          cursor: 'pointer', // Pointer on hover
          fontWeight: 'bold', // Emphasize label
          fontSize: '1.1rem', // Slightly larger text
          color: 'inherit', // Inherit text color
          padding: 4, // Small hit area
        }}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label="Select custom date range"
        aria-controls="dashboard-date-selector-dialog"
        data-testid="dashboard-date-selector-label"
      >
        <Icon path={mdiCalendarOutline} size={0.9} style={{ opacity: 0.8 }} />
        <span>
          {appliedRange?.start && appliedRange?.end
            ? `${rangeFormatter.format(appliedRange.start)} — ${rangeFormatter.format(appliedRange.end)}`
            : monthLabel}
        </span>
      </button>

      {!isCurrentMonth && (
        <button
          type="button"
          onClick={onNext}
          style={{ justifySelf: 'end', background: 'none', border: 'none', cursor: 'pointer' }}
          aria-label="Next month"
          data-testid="next-month"
        >
          <Icon path={mdiChevronRight} size={1.2} />
        </button>
      )}

      {open && (
        <div
          role="dialog"
          id="dashboard-date-selector-dialog"
          aria-labelledby="dashboard-date-selector-label"
          aria-modal="true"
          aria-live="polite"
          ref={dialogRef}
          data-testid="date-range-dialog"
          style={{
            position: 'absolute',
            left: '50%',
            top: '100%',
            transform: 'translate(-50%, 8px)',
            zIndex: 10,
            background: '#fff',
            border: '1px solid #ddd',
            borderRadius: 8,
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
            padding: 12,
            minWidth: 280,
          }}
          onKeyDown={(e) => { if (e.key === 'Escape') setOpen(false) }} // ESC closes dialog
          tabIndex={-1} // Make div focusable for key handling
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, alignItems: 'center' }}>
            <label style={{ display: 'grid', gap: 4 }}>
              <span style={{ fontSize: 12 }}>Start date</span>
              <input
                type="date"
                value={startStr}
                onChange={e => setStartStr(e.currentTarget.value)}
                aria-label="Start date"
                max={todayStr} // Disallow future dates
                ref={startInputRef}
                data-testid="start-date-input"
              />
            </label>
            <label style={{ display: 'grid', gap: 4 }}>
              <span style={{ fontSize: 12 }}>End date</span>
              <input
                type="date"
                value={endStr}
                onChange={e => setEndStr(e.currentTarget.value)}
                aria-label="End date"
                max={todayStr} // Disallow future dates
                min={startStr || undefined} // Do not allow end < start
                data-testid="end-date-input"
              />
            </label>
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 12 }}>
            <button
              type="button"
              onClick={cancelRange}
              style={{ background: 'none', border: '1px solid #ddd', padding: '6px 10px', borderRadius: 6, cursor: 'pointer' }}
              data-testid="cancel-range"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={applyRange}
              style={{ background: '#1677ff', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: 6, cursor: 'pointer' }}
              data-testid="apply-range"
            >
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
