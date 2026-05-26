import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { AppLayout } from '../components/layout/AppLayout'
import { useAuthStore, useChatStore, useProjectStore } from '../store'
import type { User } from '../types'

function Avatar({ name, size = 8 }: { name: string; size?: number }) {
  const colors = [
    'bg-violet-500', 'bg-indigo-500', 'bg-blue-500', 'bg-emerald-500',
    'bg-rose-500', 'bg-amber-500', 'bg-cyan-500', 'bg-pink-500',
  ]
  const idx = name.charCodeAt(0) % colors.length
  return (
    <div className={`w-${size} h-${size} rounded-full ${colors[idx]} flex items-center justify-center text-white font-semibold text-xs shrink-0`}>
      {name.charAt(0).toUpperCase()}
    </div>
  )
}

function formatTime(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  const isToday = d.toDateString() === now.toDateString()
  if (isToday) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' +
    d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export function ChatPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const pid = Number(projectId)
  const { user } = useAuthStore()
  const { currentProject, fetchProject } = useProjectStore()
  const { messages, fetchMessages, sendMessage } = useChatStore()

  // null = general channel, number = DM with that user
  const [dmWith, setDmWith] = useState<User | null>(null)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval>>()

  useEffect(() => {
    if (!currentProject || currentProject.id !== pid) fetchProject(pid)
  }, [pid])

  // Load & poll messages
  const load = useCallback(() => {
    fetchMessages(pid, dmWith?.id)
  }, [pid, dmWith?.id])

  useEffect(() => {
    load()
    intervalRef.current = setInterval(load, 3000)
    return () => clearInterval(intervalRef.current)
  }, [load])

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    if (!text.trim() || sending) return
    setSending(true)
    try {
      await sendMessage(pid, text.trim(), dmWith?.id)
      setText('')
    } finally {
      setSending(false)
    }
  }

  const members = currentProject?.members ?? []
  const otherMembers = members.filter(m => m.user_id !== user?.id)

  return (
    <AppLayout>
      <div className="flex h-full overflow-hidden">
        {/* ── Left sidebar: channels + members ─────────────────── */}
        <aside className="w-60 shrink-0 flex flex-col border-r border-slate-200 dark:border-bg-border bg-white dark:bg-bg-card">
          <div className="px-4 py-4 border-b border-slate-200 dark:border-bg-border">
            <h2 className="text-xs font-semibold text-slate-500 dark:text-gray-500 uppercase tracking-wider">Channels</h2>
          </div>

          {/* General channel */}
          <button
            onClick={() => setDmWith(null)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm transition-colors ${
              dmWith === null
                ? 'bg-accent-green/10 text-accent-green font-medium'
                : 'text-slate-600 dark:text-gray-400 hover:bg-slate-50 dark:hover:bg-bg-elevated'
            }`}
          >
            <svg className="w-4 h-4 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
            </svg>
            general
          </button>

          <div className="px-4 py-3 border-t border-slate-100 dark:border-bg-border mt-1">
            <h2 className="text-xs font-semibold text-slate-500 dark:text-gray-500 uppercase tracking-wider mb-2">Direct Messages</h2>
          </div>

          {otherMembers.map(m => (
            <button
              key={m.user_id}
              onClick={() => setDmWith(m.user)}
              className={`flex items-center gap-2.5 px-4 py-2 text-sm transition-colors ${
                dmWith?.id === m.user_id
                  ? 'bg-accent-green/10 text-accent-green font-medium'
                  : 'text-slate-600 dark:text-gray-400 hover:bg-slate-50 dark:hover:bg-bg-elevated'
              }`}
            >
              <Avatar name={m.user.name} size={6} />
              <div className="flex flex-col items-start">
                <span className="text-sm leading-tight">{m.user.name}</span>
                <span className="text-xs text-slate-400 dark:text-gray-500">{m.role}</span>
              </div>
            </button>
          ))}
        </aside>

        {/* ── Main chat area ──────────────────────────────────── */}
        <div className="flex-1 flex flex-col min-w-0 bg-white dark:bg-bg-base">
          {/* Header */}
          <div className="px-6 py-4 border-b border-slate-200 dark:border-bg-border flex items-center gap-3">
            {dmWith ? (
              <>
                <Avatar name={dmWith.name} size={8} />
                <div>
                  <p className="font-semibold text-slate-800 dark:text-white">{dmWith.name}</p>
                  <p className="text-xs text-slate-500 dark:text-gray-500">Direct message</p>
                </div>
              </>
            ) : (
              <>
                <div className="w-8 h-8 rounded-lg bg-accent-green/20 flex items-center justify-center">
                  <span className="text-accent-green font-bold text-sm">#</span>
                </div>
                <div>
                  <p className="font-semibold text-slate-800 dark:text-white">general</p>
                  <p className="text-xs text-slate-500 dark:text-gray-500">{members.length} members</p>
                </div>
              </>
            )}
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-1">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center text-slate-400 dark:text-gray-600">
                <svg className="w-12 h-12 mb-3 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <p className="text-sm">No messages yet. Start the conversation!</p>
              </div>
            )}

            {messages.map((msg, i) => {
              const isMe = msg.sender_id === user?.id
              const prevMsg = messages[i - 1]
              const showSender = !prevMsg || prevMsg.sender_id !== msg.sender_id ||
                (new Date(msg.created_at).getTime() - new Date(prevMsg.created_at).getTime()) > 300000

              return (
                <div key={msg.id} className={`flex gap-3 ${showSender ? 'mt-4' : 'mt-0.5'} ${isMe ? 'flex-row-reverse' : ''}`}>
                  {showSender ? (
                    <Avatar name={msg.sender.name} size={8} />
                  ) : (
                    <div className="w-8 shrink-0" />
                  )}
                  <div className={`flex flex-col max-w-[70%] ${isMe ? 'items-end' : 'items-start'}`}>
                    {showSender && (
                      <div className={`flex items-baseline gap-2 mb-0.5 ${isMe ? 'flex-row-reverse' : ''}`}>
                        <span className="text-sm font-semibold text-slate-700 dark:text-gray-200">
                          {isMe ? 'You' : msg.sender.name}
                        </span>
                        <span className="text-xs text-slate-400 dark:text-gray-600">{formatTime(msg.created_at)}</span>
                      </div>
                    )}
                    <div className={`rounded-2xl px-4 py-2 text-sm leading-relaxed break-words ${
                      isMe
                        ? 'bg-accent-green text-black rounded-tr-sm'
                        : 'bg-slate-100 dark:bg-bg-elevated text-slate-800 dark:text-gray-200 rounded-tl-sm'
                    }`}>
                      {msg.text}
                    </div>
                  </div>
                </div>
              )
            })}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="px-6 py-4 border-t border-slate-200 dark:border-bg-border">
            <div className="flex items-end gap-3 bg-slate-50 dark:bg-bg-elevated rounded-2xl px-4 py-3">
              <textarea
                className="flex-1 bg-transparent text-sm text-slate-800 dark:text-gray-200 placeholder-slate-400 dark:placeholder-gray-600 resize-none outline-none max-h-32 min-h-[20px]"
                placeholder={dmWith ? `Message ${dmWith.name}…` : 'Message #general…'}
                value={text}
                rows={1}
                onChange={e => setText(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSend()
                  }
                }}
              />
              <button
                onClick={handleSend}
                disabled={!text.trim() || sending}
                className="w-8 h-8 rounded-xl bg-accent-green disabled:opacity-40 flex items-center justify-center transition-opacity shrink-0"
              >
                <svg className="w-4 h-4 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
            <p className="text-xs text-slate-400 dark:text-gray-600 mt-1.5 ml-1">Enter to send · Shift+Enter for new line</p>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
