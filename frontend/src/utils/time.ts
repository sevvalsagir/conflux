/**
 * Centralised time-formatting utilities — all output is in Europe/Istanbul (UTC+3).
 *
 * Root problem: the backend stores naive UTC datetimes and returns them without
 * a timezone suffix ("2026-05-28T10:30:00" instead of "…Z").  Browsers parse
 * naive ISO strings as LOCAL time, so Turkish users (UTC+3) get timestamps that
 * are 3 hours off.
 *
 * Fix: always treat bare ISO strings as UTC by appending "Z" when no offset is
 * present, then display using Intl.DateTimeFormat with timeZone: 'Europe/Istanbul'.
 */

const TZ = 'Europe/Istanbul'

/** Parse a (possibly naive) UTC ISO string into a correct Date object. */
export function parseUTC(iso: string): Date {
  if (!iso) return new Date(NaN)
  // If already has timezone info, parse as-is
  if (iso.endsWith('Z') || iso.includes('+') || (iso.length > 19 && iso[19] === '-')) {
    return new Date(iso)
  }
  // Naive string — append Z so the browser treats it as UTC
  return new Date(iso + 'Z')
}

// ── Formatters ────────────────────────────────────────────────────────────────

/** "14:35" */
export function fmtTime(iso: string): string {
  return new Intl.DateTimeFormat('tr-TR', {
    timeZone: TZ,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(parseUTC(iso))
}

/** "28 May" */
export function fmtDateShort(iso: string): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: TZ,
    month: 'short',
    day: 'numeric',
  }).format(parseUTC(iso))
}

/** "May 28, 2026" */
export function fmtDate(iso: string): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: TZ,
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(parseUTC(iso))
}

/** "May 28, 14:35" */
export function fmtDateTime(iso: string): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: TZ,
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(parseUTC(iso))
}

/** "May 2026" — for Gantt month headers */
export function fmtMonthYear(d: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: TZ,
    month: 'short',
    year: 'numeric',
  }).format(d)
}

/** "May 28" — for Gantt day headers */
export function fmtMonthDay(d: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: TZ,
    month: 'short',
    day: 'numeric',
  }).format(d)
}

/** "Wednesday, May 28" — for Meetings day panel */
export function fmtWeekdayLong(dateStr: string): string {
  // dateStr is "YYYY-MM-DD" — treat as local calendar date (no UTC shift needed)
  const [y, mo, d] = dateStr.split('-').map(Number)
  const date = new Date(y, mo - 1, d)
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).format(date)
}

/**
 * Chat bubble timestamp:
 * - Same day in Istanbul → "14:35"
 * - Older              → "May 28  14:35"
 */
export function fmtChatTime(iso: string): string {
  const d = parseUTC(iso)
  const now = new Date()

  const dayFmt = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, dateStyle: 'short' })
  if (dayFmt.format(d) === dayFmt.format(now)) {
    return fmtTime(iso)
  }
  return fmtDateTime(iso)
}

/**
 * Relative time: "just now", "5m ago", "3h ago", "2d ago"
 * Uses parseUTC so the diff is always correct regardless of browser timezone.
 */
export function timeAgo(iso: string): string {
  const diff = Date.now() - parseUTC(iso).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 30) return `${days}d ago`
  return fmtDateShort(iso)
}

/**
 * formatDistanceToNow replacement — returns strings like "3 hours ago", "2 days ago".
 * Used in project cards and CR lists.
 */
export function timeAgoLong(iso: string): string {
  const diff = Date.now() - parseUTC(iso).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins} minute${mins !== 1 ? 's' : ''} ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs} hour${hrs !== 1 ? 's' : ''} ago`
  const days = Math.floor(hrs / 24)
  if (days < 30) return `${days} day${days !== 1 ? 's' : ''} ago`
  const months = Math.floor(days / 30)
  if (months < 12) return `${months} month${months !== 1 ? 's' : ''} ago`
  return `over a year ago`
}
