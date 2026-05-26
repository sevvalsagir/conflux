import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { AppLayout } from '../components/layout/AppLayout'
import { useAuthStore, useMeetingStore, useProjectStore } from '../store'
import type { Meeting } from '../types'

// ── helpers ───────────────────────────────────────────────────────────────────

function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}
function firstDayOf(year: number, month: number) {
  return new Date(year, month, 1).getDay() // 0=Sun
}
const MONTHS = ['January','February','March','April','May','June',
                 'July','August','September','October','November','December']
const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

function fmtTime(iso: string) {
  // iso like "2026-06-15T14:00"
  const [, timePart] = iso.split('T')
  if (!timePart) return ''
  const [h, m] = timePart.split(':')
  const hr = parseInt(h)
  const ampm = hr >= 12 ? 'PM' : 'AM'
  const hr12 = hr % 12 || 12
  return `${hr12}:${m} ${ampm}`
}
function fmtDate(iso: string) {
  return iso.split('T')[0]
}

// ── Meeting card ──────────────────────────────────────────────────────────────

function MeetingCard({ meeting, canDelete, onDelete }: {
  meeting: Meeting; canDelete: boolean; onDelete: () => void
}) {
  return (
    <div className="flex gap-3 p-3 rounded-xl bg-slate-50 dark:bg-bg-elevated border border-slate-100 dark:border-bg-border group">
      <div className="w-1 rounded-full bg-accent-green shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="font-medium text-slate-800 dark:text-white text-sm truncate">{meeting.title}</p>
        <div className="flex items-center gap-3 mt-0.5 flex-wrap">
          <span className="text-xs text-accent-green font-medium">{fmtTime(meeting.meeting_date)}</span>
          <span className="text-xs text-slate-500 dark:text-gray-500">{meeting.duration_minutes} min</span>
          {meeting.location && (
            <span className="text-xs text-slate-400 dark:text-gray-600">📍 {meeting.location}</span>
          )}
        </div>
        {meeting.description && (
          <p className="text-xs text-slate-500 dark:text-gray-500 mt-1 line-clamp-2">{meeting.description}</p>
        )}
        <p className="text-xs text-slate-400 dark:text-gray-600 mt-1">by {meeting.created_by.name}</p>
      </div>
      {canDelete && (
        <button
          onClick={onDelete}
          className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-500 transition-all shrink-0"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  )
}

// ── Create Modal ──────────────────────────────────────────────────────────────

function CreateModal({ defaultDate, onClose, onCreate }: {
  defaultDate: string; onClose: () => void
  onCreate: (data: { title: string; description?: string; meeting_date: string; duration_minutes: number; location?: string }) => Promise<void>
}) {
  const [title, setTitle] = useState('')
  const [desc, setDesc] = useState('')
  const [date, setDate] = useState(defaultDate)
  const [time, setTime] = useState('10:00')
  const [duration, setDuration] = useState(60)
  const [location, setLocation] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSubmit = async () => {
    if (!title.trim() || !date || !time) return
    setSaving(true)
    try {
      await onCreate({
        title: title.trim(),
        description: desc.trim() || undefined,
        meeting_date: `${date}T${time}`,
        duration_minutes: duration,
        location: location.trim() || undefined,
      })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white dark:bg-bg-card rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6"
        onClick={e => e.stopPropagation()}
      >
        <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-5">Schedule Meeting</h3>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-500 dark:text-gray-400 uppercase tracking-wide mb-1 block">Title *</label>
            <input
              autoFocus
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-bg-elevated border border-slate-200 dark:border-bg-border text-sm text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-accent-green/40"
              placeholder="Sprint review, design sync…"
              value={title}
              onChange={e => setTitle(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-500 dark:text-gray-400 uppercase tracking-wide mb-1 block">Date *</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-bg-elevated border border-slate-200 dark:border-bg-border text-sm text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-accent-green/40" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 dark:text-gray-400 uppercase tracking-wide mb-1 block">Time *</label>
              <input type="time" value={time} onChange={e => setTime(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-bg-elevated border border-slate-200 dark:border-bg-border text-sm text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-accent-green/40" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-500 dark:text-gray-400 uppercase tracking-wide mb-1 block">Duration (min)</label>
              <select value={duration} onChange={e => setDuration(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-bg-elevated border border-slate-200 dark:border-bg-border text-sm text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-accent-green/40">
                {[15,30,45,60,90,120].map(d => <option key={d} value={d}>{d} min</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 dark:text-gray-400 uppercase tracking-wide mb-1 block">Location</label>
              <input value={location} onChange={e => setLocation(e.target.value)} placeholder="Zoom, Room 3…"
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-bg-elevated border border-slate-200 dark:border-bg-border text-sm text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-accent-green/40" />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-500 dark:text-gray-400 uppercase tracking-wide mb-1 block">Description</label>
            <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={2}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-bg-elevated border border-slate-200 dark:border-bg-border text-sm text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-accent-green/40 resize-none"
              placeholder="Optional agenda or notes…" />
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-bg-border text-sm text-slate-600 dark:text-gray-400 hover:bg-slate-50 dark:hover:bg-bg-elevated transition-colors">
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={!title.trim() || saving}
            className="flex-1 py-2.5 rounded-xl bg-accent-green text-black font-semibold text-sm disabled:opacity-40 transition-opacity">
            {saving ? 'Saving…' : 'Schedule'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export function MeetingsPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const pid = Number(projectId)
  const { user } = useAuthStore()
  const { currentProject, fetchProject } = useProjectStore()
  const { meetings, fetchMeetings, createMeeting, deleteMeeting } = useMeetingStore()

  const today = new Date()
  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())
  const [selectedDate, setSelectedDate] = useState<string>(today.toISOString().split('T')[0])
  const [showCreate, setShowCreate] = useState(false)

  useEffect(() => {
    if (!currentProject || currentProject.id !== pid) fetchProject(pid)
    fetchMeetings(pid)
  }, [pid])

  const isManager = currentProject?.members.find(m => m.user_id === user?.id)?.role === 'manager'

  // Build calendar grid
  const totalDays = daysInMonth(viewYear, viewMonth)
  const firstDay = firstDayOf(viewYear, viewMonth)
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: totalDays }, (_, i) => i + 1),
  ]
  // Pad to full weeks
  while (cells.length % 7 !== 0) cells.push(null)

  // Map meetings to date strings
  const meetingsByDate: Record<string, Meeting[]> = {}
  meetings.forEach(m => {
    const d = fmtDate(m.meeting_date)
    if (!meetingsByDate[d]) meetingsByDate[d] = []
    meetingsByDate[d].push(m)
  })

  const todayStr = today.toISOString().split('T')[0]
  const selectedMeetings = meetingsByDate[selectedDate] ?? []

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11) }
    else setViewMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0) }
    else setViewMonth(m => m + 1)
  }

  return (
    <AppLayout>
      <div className="flex h-full overflow-hidden">
        {/* ── Calendar panel ──────────────────────────────────── */}
        <div className="flex-1 flex flex-col min-w-0 overflow-y-auto p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Meetings</h1>
              <p className="text-sm text-slate-500 dark:text-gray-500 mt-0.5">Team calendar & scheduling</p>
            </div>
            {isManager && (
              <button
                onClick={() => setShowCreate(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-accent-green text-black font-semibold text-sm hover:bg-accent-green/90 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
                </svg>
                Schedule Meeting
              </button>
            )}
          </div>

          {/* Calendar */}
          <div className="bg-white dark:bg-bg-card rounded-2xl border border-slate-200 dark:border-bg-border overflow-hidden">
            {/* Month nav */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-bg-border">
              <button onClick={prevMonth} className="w-8 h-8 rounded-lg hover:bg-slate-100 dark:hover:bg-bg-elevated flex items-center justify-center text-slate-500 dark:text-gray-400 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h2 className="text-base font-bold text-slate-800 dark:text-white">
                {MONTHS[viewMonth]} {viewYear}
              </h2>
              <button onClick={nextMonth} className="w-8 h-8 rounded-lg hover:bg-slate-100 dark:hover:bg-bg-elevated flex items-center justify-center text-slate-500 dark:text-gray-400 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            {/* Day labels */}
            <div className="grid grid-cols-7 border-b border-slate-100 dark:border-bg-border">
              {DAYS.map(d => (
                <div key={d} className="py-2 text-center text-xs font-semibold text-slate-400 dark:text-gray-600 uppercase tracking-wider">
                  {d}
                </div>
              ))}
            </div>

            {/* Cells */}
            <div className="grid grid-cols-7">
              {cells.map((day, i) => {
                if (day === null) return <div key={i} className="h-24 border-b border-r border-slate-50 dark:border-bg-border/40 last:border-r-0" />

                const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2,'0')}-${String(day).padStart(2,'0')}`
                const isToday = dateStr === todayStr
                const isSelected = dateStr === selectedDate
                const dayMeetings = meetingsByDate[dateStr] ?? []

                return (
                  <div
                    key={i}
                    onClick={() => setSelectedDate(dateStr)}
                    className={`h-24 p-2 border-b border-r border-slate-50 dark:border-bg-border/40 cursor-pointer transition-colors
                      ${isSelected ? 'bg-accent-green/10' : 'hover:bg-slate-50 dark:hover:bg-bg-elevated/50'}
                      ${(i + 1) % 7 === 0 ? 'border-r-0' : ''}
                    `}
                  >
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-semibold mb-1
                      ${isToday ? 'bg-accent-green text-black' : isSelected ? 'bg-accent-green/20 text-accent-green' : 'text-slate-700 dark:text-gray-300'}
                    `}>
                      {day}
                    </div>
                    <div className="space-y-0.5">
                      {dayMeetings.slice(0, 2).map(m => (
                        <div key={m.id} className="text-xs leading-tight px-1.5 py-0.5 rounded-md bg-accent-green/20 text-accent-green truncate">
                          {fmtTime(m.meeting_date)} {m.title}
                        </div>
                      ))}
                      {dayMeetings.length > 2 && (
                        <div className="text-xs text-slate-400 dark:text-gray-600 px-1">+{dayMeetings.length - 2} more</div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* ── Selected day detail panel ────────────────────────── */}
        <aside className="w-80 shrink-0 border-l border-slate-200 dark:border-bg-border bg-white dark:bg-bg-card overflow-y-auto p-5">
          <div className="mb-4">
            <p className="text-xs font-semibold text-slate-500 dark:text-gray-500 uppercase tracking-wide mb-0.5">Selected</p>
            <p className="text-lg font-bold text-slate-800 dark:text-white">
              {new Date(selectedDate + 'T12:00').toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
          </div>

          {selectedMeetings.length === 0 ? (
            <div className="text-center py-10 text-slate-400 dark:text-gray-600">
              <svg className="w-10 h-10 mx-auto mb-2 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="text-sm">No meetings this day</p>
              {isManager && (
                <button onClick={() => setShowCreate(true)}
                  className="mt-3 text-xs text-accent-green hover:underline">
                  + Schedule one
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {selectedMeetings
                .sort((a, b) => a.meeting_date.localeCompare(b.meeting_date))
                .map(m => (
                  <MeetingCard
                    key={m.id}
                    meeting={m}
                    canDelete={isManager}
                    onDelete={async () => {
                      if (confirm(`Delete "${m.title}"?`)) await deleteMeeting(pid, m.id)
                    }}
                  />
                ))}
            </div>
          )}

          {/* Upcoming meetings */}
          <div className="mt-6 pt-5 border-t border-slate-100 dark:border-bg-border">
            <p className="text-xs font-semibold text-slate-500 dark:text-gray-500 uppercase tracking-wide mb-3">Upcoming</p>
            {meetings
              .filter(m => fmtDate(m.meeting_date) >= todayStr && fmtDate(m.meeting_date) !== selectedDate)
              .slice(0, 5)
              .map(m => (
                <button
                  key={m.id}
                  onClick={() => { setSelectedDate(fmtDate(m.meeting_date)); setViewYear(Number(fmtDate(m.meeting_date).split('-')[0])); setViewMonth(Number(fmtDate(m.meeting_date).split('-')[1]) - 1) }}
                  className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-bg-elevated text-left transition-colors group"
                >
                  <div className="text-center w-10 shrink-0">
                    <div className="text-xs font-bold text-accent-green">{fmtDate(m.meeting_date).split('-')[2]}</div>
                    <div className="text-xs text-slate-400 dark:text-gray-600">{MONTHS[Number(fmtDate(m.meeting_date).split('-')[1]) - 1].slice(0,3)}</div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-700 dark:text-gray-200 truncate">{m.title}</p>
                    <p className="text-xs text-slate-400 dark:text-gray-600">{fmtTime(m.meeting_date)} · {m.duration_minutes}m</p>
                  </div>
                </button>
              ))}
            {meetings.filter(m => fmtDate(m.meeting_date) >= todayStr).length === 0 && (
              <p className="text-sm text-slate-400 dark:text-gray-600 text-center py-4">No upcoming meetings</p>
            )}
          </div>
        </aside>
      </div>

      {showCreate && (
        <CreateModal
          defaultDate={selectedDate}
          onClose={() => setShowCreate(false)}
          onCreate={async (data) => { await createMeeting(pid, data) }}
        />
      )}
    </AppLayout>
  )
}
