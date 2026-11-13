import type { HTMLAttributes, ReactNode } from 'react'

export function Card({ title, right, children, className = '', ...rest }:
  { title?: ReactNode; right?: ReactNode } & Omit<HTMLAttributes<HTMLElement>, 'title'>) {
  return (
    <section className={`panel p-4 ${className}`} {...rest}>
      {(title || right) && (
        <header className="mb-3 flex items-center justify-between gap-2">
          {title && <h3 className="label">{title}</h3>}
          {right}
        </header>
      )}
      {children}
    </section>
  )
}
