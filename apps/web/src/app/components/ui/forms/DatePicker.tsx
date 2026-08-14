import { useEffect, useRef, useState } from 'react'
import { DayPicker, type Matcher } from 'react-day-picker'
import { format, parseISO } from 'date-fns'
import { Calendar as CalendarIcon } from 'lucide-react'
import 'react-day-picker/style.css'
import Button from '@/app/components/ui/buttons/Button'
import { cn } from '@/infra/core/utils/cn.util'

// Matches Tailwind's `sm` breakpoint (640px), reused elsewhere in this app
// (Sidebar/Navbar's lg:) — below it, native OS date pickers beat the popover.
const MOBILE_MEDIA_QUERY = '(max-width: 639px)'

interface DatePickerProps {
  id?: string
  label: string
  value: string
  onChange: (value: string) => void
  minDate?: string
  maxDate?: string
  className?: string
}

// Same boundary-conversion rationale as the (now removed) DateRangePicker —
// react-day-picker works in Date objects, reports.tsx works in ISO strings
function toIso(date: Date): string {
  return format(date, 'yyyy-MM-dd')
}

/**
 * DatePicker — single-date popover calendar. Split out from the earlier
 * combined range picker: selecting a range in one popover required two
 * clicks and was reported as unpredictable, so From and To are now two
 * independent pickers that each close immediately on their one selection —
 * matching how the original native <input type="date"> behaved.
 */
export default function DatePicker({
  id,
  label,
  value,
  onChange,
  minDate,
  maxDate,
  className,
}: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined'
      ? window.matchMedia(MOBILE_MEDIA_QUERY).matches
      : false,
  )

  // Native OS date pickers are faster to operate with touch than the
  // custom DayPicker popover — swap to native <input type="date"> below
  // this breakpoint instead of maintaining two separate calendar widgets.
  useEffect(() => {
    const mediaQuery = window.matchMedia(MOBILE_MEDIA_QUERY)
    function handleChange(event: MediaQueryListEvent) {
      setIsMobile(event.matches)
    }
    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // Only include bounds that are actually set — an always-true matcher
  // would disable every day when neither min nor max is passed
  const disabledMatchers: Matcher[] = [
    ...(minDate ? [{ before: parseISO(minDate) }] : []),
    ...(maxDate ? [{ after: parseISO(maxDate) }] : []),
  ]

  function handleSelect(date: Date | undefined) {
    if (!date) return
    onChange(toIso(date))
    // A single date completes the selection in one click — close right
    // away instead of waiting for a second interaction like range mode did
    setIsOpen(false)
  }

  // Below the mobile breakpoint, defer to the OS's own date picker UI
  // (touch-optimized wheel/calendar) instead of the desktop DayPicker
  // popover, which is cramped and harder to operate with touch input.
  if (isMobile) {
    return (
      <div className={cn('flex flex-col gap-1', className)}>
        <label className="text-label-md text-on-surface-variant" htmlFor={id}>
          {label}
        </label>
        <input
          type="date"
          id={id}
          value={value}
          min={minDate}
          max={maxDate}
          onChange={(event) => {
            if (event.target.value) onChange(event.target.value)
          }}
          className="h-10 rounded-lg border-2 border-outline-variant bg-transparent px-3 text-body-md text-on-surface focus:border-primary focus:outline-none"
        />
      </div>
    )
  }

  return (
    <div
      className={cn('relative flex flex-col gap-1', className)}
      ref={containerRef}
    >
      <label className="text-label-md text-on-surface-variant" htmlFor={id}>
        {label}
      </label>
      <Button
        id={id}
        variant="outline"
        color="neutral"
        leftIcon={<CalendarIcon className="h-4 w-4" />}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
      >
        {value ? format(parseISO(value), 'MMM d, yyyy') : 'Select date'}
      </Button>

      {isOpen && (
        <div className="absolute top-full left-0 z-dropdown mt-2 rounded-lg border-2 border-outline-variant bg-surface p-2 shadow-elevation-2">
          <DayPicker
            mode="single"
            selected={value ? parseISO(value) : undefined}
            defaultMonth={value ? parseISO(value) : undefined}
            onSelect={handleSelect}
            disabled={disabledMatchers.length ? disabledMatchers : undefined}
          />
        </div>
      )}
    </div>
  )
}
