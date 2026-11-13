import { core } from './core'
import { faults } from './faults'

export const en: Record<string, string> = { ...core, ...faults }
