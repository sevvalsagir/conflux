import { clsx } from 'clsx'
import { InputHTMLAttributes, TextareaHTMLAttributes } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export function Input({ label, error, className, ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-sm font-medium text-gray-300">{label}</label>}
      <input
        className={clsx(
          'bg-bg-elevated border rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 outline-none transition-colors',
          'focus:border-accent-green/60 focus:ring-1 focus:ring-accent-green/30',
          error ? 'border-red-500/60' : 'border-bg-border',
          className
        )}
        {...props}
      />
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  )
}

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
}

export function Textarea({ label, error, className, ...props }: TextareaProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-sm font-medium text-gray-300">{label}</label>}
      <textarea
        className={clsx(
          'bg-bg-elevated border rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 outline-none transition-colors resize-none',
          'focus:border-accent-green/60 focus:ring-1 focus:ring-accent-green/30',
          error ? 'border-red-500/60' : 'border-bg-border',
          className
        )}
        {...props}
      />
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  )
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
}

export function Select({ label, error, className, children, ...props }: SelectProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-sm font-medium text-gray-300">{label}</label>}
      <select
        className={clsx(
          'bg-bg-elevated border rounded-lg px-3 py-2 text-sm text-white outline-none transition-colors',
          'focus:border-accent-green/60',
          error ? 'border-red-500/60' : 'border-bg-border',
          className
        )}
        {...props}
      >
        {children}
      </select>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  )
}
