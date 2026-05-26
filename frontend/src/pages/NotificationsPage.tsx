import { useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { AppLayout } from '../components/layout/AppLayout'
import { useNotificationStore } from '../store'
import type { Notification } from '../types'

const TYPE_ICONS: Record<string, string> = {
  new_message: '💬',
  cr_status: '🔄',
  cr_comment: '💭',
  meeting: '📅',
  member: '👤',
  feature: '✨',
}

const TYPE_COLORS: Record<string, string> = {
  new_message: 'bg-blue-500/10 text-blue-400',
  cr_status:   'bg-amber-500/10 text-amber-400',
  cr_comment:  'bg-violet-500/10 text-violet-400',
  meeting:     'bg-emerald-500/10 text-emerald-400',
  member:      'bg-cyan-500/10 text-cyan-400',
  feature:     'bg-pink-500/10 text-pink-400',
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

function NotifRow({ notif, onRead }: { notif: Notification; onRead: (id: number) => void }) {
  const icon = TYPE_ICONS[notif.notif_type] ?? '🔔'
  const color = TYPE_COLORS[notif.notif_type] ?? 'bg-slate-500/10 text-slate-400'

  return (
    <div
      onClick={() => !notif.is_read && onRead(notif.id)}
      className={`flex gap-4 p-4 rounded-xl border transition-all cursor-pointer group
        ${notif.is_read
          ? 'border-slate-100 dark:border-bg-border bg-white dark:bg-bg-card opacity-60 hover:opacity-80'
          : 'border-accent-green/20 bg-accent-green/5 dark:bg-accent-green/5 hover:bg-accent-green/10'
        }`}
    >
      {/* Icon */}
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 ${color}`}>
        {icon}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={`text-sm font-semibold leading-snug ${notif.is_read ? 'text-slate-600 dark:text-gray-400' : 'text-slate-800 dark:text-white'}`}>
            {notif.title}
          </p>
          <span className="text-xs text-slate-400 dark:text-gray-600 shrink-0 mt-0.5">{timeAgo(notif.created_at)}</span>
        </div>
        {notif.body && (
          <p className="text-xs text-slate-500 dark:text-gray-500 mt-0.5 line-clamp-2">{notif.body}</p>
        )}
      </div>

      {/* Unread dot */}
      {!notif.is_read && (
        <div className="w-2 h-2 rounded-full bg-accent-green mt-1.5 shrink-0" />
      )}
    </div>
  )
}

export function NotificationsPage() {
  const { notifications, unreadCount, fetchNotifications, markRead, markAllRead } = useNotificationStore()

  useEffect(() => {
    fetchNotifications()
    const t = setInterval(fetchNotifications, 15_000)
    return () => clearInterval(t)
  }, [])

  const unread = notifications.filter(n => !n.is_read)
  const read = notifications.filter(n => n.is_read)

  return (
    <AppLayout>
      <div className="flex-1 overflow-y-auto p-6 max-w-2xl mx-auto w-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
              Notifications
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-rose-500 text-white text-xs font-bold">
                  {unreadCount}
                </span>
              )}
            </h1>
            <p className="text-sm text-slate-500 dark:text-gray-500 mt-0.5">
              {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up!'}
            </p>
          </div>
          {unreadCount > 0 && (
            <button
              onClick={() => markAllRead()}
              className="text-sm text-accent-green hover:text-accent-green/80 font-medium transition-colors"
            >
              Mark all read
            </button>
          )}
        </div>

        {notifications.length === 0 && (
          <div className="text-center py-20 text-slate-400 dark:text-gray-600">
            <svg className="w-14 h-14 mx-auto mb-3 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <p className="text-sm font-medium">No notifications yet</p>
          </div>
        )}

        {unread.length > 0 && (
          <div className="mb-6">
            <h2 className="text-xs font-semibold text-slate-500 dark:text-gray-500 uppercase tracking-wider mb-3">New</h2>
            <div className="space-y-2">
              {unread.map(n => (
                <NotifRow key={n.id} notif={n} onRead={markRead} />
              ))}
            </div>
          </div>
        )}

        {read.length > 0 && (
          <div>
            <h2 className="text-xs font-semibold text-slate-500 dark:text-gray-500 uppercase tracking-wider mb-3">Earlier</h2>
            <div className="space-y-2">
              {read.map(n => (
                <NotifRow key={n.id} notif={n} onRead={markRead} />
              ))}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  )
}
