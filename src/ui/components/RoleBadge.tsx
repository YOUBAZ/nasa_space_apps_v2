import type { Role } from '../../engine/types'
import { t } from '../../i18n/i18n'
import { Icon } from '../icons'
import { ROLE_META } from '../roles'

export function RoleBadge({ role, size = 'md', label = true }: { role: Role; size?: 'sm' | 'md'; label?: boolean }) {
  const meta = ROLE_META[role]
  return (
    <span className="inline-flex items-center gap-1.5 font-display font-bold" style={{ color: meta.color }}>
      <span className="inline-flex items-center justify-center rounded-full border"
        style={{ borderColor: meta.color, width: size === 'sm' ? 22 : 30, height: size === 'sm' ? 22 : 30 }}>
        <Icon name={meta.icon} size={size === 'sm' ? 12 : 16} />
      </span>
      {label && <span className={size === 'sm' ? 'text-xs' : 'text-sm'}>{t(`role.${role}`)}</span>}
    </span>
  )
}
