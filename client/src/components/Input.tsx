import type { InputHTMLAttributes } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
}

export default function Input({ label, error, id, ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="font-grotesk font-black text-sm uppercase">{label}</label>
      <input
        id={id}
        className="rounded-none border-4 border-black font-mono px-3 py-2 focus:outline-none focus:shadow-[6px_6px_0px_0px_rgba(78,205,196,1)] transition-all"
        {...props}
      />
      {error && <span className="font-mono text-xs text-[#FF006E]">{error}</span>}
    </div>
  )
}
