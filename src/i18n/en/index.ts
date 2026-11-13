import { core } from './core'
import { faults } from './faults'
import { ui, stages } from './ui'

export const en: Record<string, string> = { ...core, ...faults, ...ui, ...stages }
