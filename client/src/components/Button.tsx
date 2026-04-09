import type { ButtonHTMLAttributes } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'danger' | 'ghost'
}

const VARIANT_CLASSES: Record<string, string> = {
  primary: 'bg-black text-white shadow-[6px_6px_0px_0px_rgba(255,0,110,1)] hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px]',
  danger:  'bg-[#FF006E] text-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px]',
  ghost:   'bg-white text-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px]',
}

export default function Button({ variant = 'primary', className = '', ...props }: ButtonProps) {
  const base = 'rounded-none border-4 border-black font-grotesk font-black uppercase px-4 py-2 transition-all disabled:opacity-50 disabled:pointer-events-none'
  return <button className={`${base} ${VARIANT_CLASSES[variant]} ${className}`} {...props} />
}
