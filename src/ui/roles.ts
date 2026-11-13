import type { Role } from '../engine/types'
import type { IconName } from './icons'

export const ROLE_META: Record<Role, { color: string; icon: IconName }> = {
  planner: { color: '#ea6f24', icon: 'planner' },
  scientist: { color: '#47da84', icon: 'scientist' },
  designer: { color: '#288bff', icon: 'designer' },
  radio: { color: '#f6f6f6', icon: 'radio' },
}
