import { core } from './core'
import { faults } from './faults'
import { ui, stages } from './ui'
import { board } from './board'
import { handbook } from './handbook'
import { endgame } from './endgame'
import { catalogNames, generatedHandbook } from './catalog'

export const en: Record<string, string> = {
  ...core, ...faults, ...ui, ...stages, ...board, ...endgame, ...catalogNames(), ...handbook, ...generatedHandbook(),
}
