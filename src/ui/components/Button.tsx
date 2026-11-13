import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Icon, type IconName } from '../icons'
import { sfx } from '../sound'

type Variant = 'primary' | 'action' | 'ghost' | 'go' | 'danger'
const VARIANT: Record<Variant, string> = {
  // HDS: red = "go somewhere", blue = "do something here"
  primary: 'bg-nasa-red text-white hover:bg-nasa-red-shade',
  action: 'bg-nasa-blue text-white hover:bg-nasa-blue-tint',
  ghost: 'border border-carbon-60 text-carbon-10 hover:border-carbon-30 hover:bg-carbon-80',
  go: 'bg-active-green text-black hover:brightness-110',
  danger: 'border border-nasa-red text-nasa-red-tint hover:bg-nasa-red hover:text-white',
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: 'sm' | 'md' | 'lg'
  icon?: IconName
  children?: ReactNode
}

export function Button({ variant = 'action', size = 'md', icon, children, className = '', onClick, ...rest }: ButtonProps) {
  const pad = size === 'sm' ? 'px-2.5 py-1 text-xs' : size === 'lg' ? 'px-6 py-3 text-base' : 'px-4 py-2 text-sm'
  return (
    <button type="button"
      className={`inline-flex items-center justify-center gap-2 rounded font-display font-bold uppercase tracking-wide transition
        disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:brightness-100 ${pad} ${VARIANT[variant]} ${className}`}
      onClick={(e) => { sfx('click'); onClick?.(e) }}
      {...rest}>
      {icon && <Icon name={icon} size={size === 'sm' ? 14 : 18} />}
      {children}
    </button>
  )
}
