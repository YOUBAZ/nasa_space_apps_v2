import { core } from './core'
import { faults } from './faults'
import { ui, stages } from './ui'
import { board } from './board'
import { endgame } from './endgame'
import { tutorial } from './tutorial'
import { handbook } from './handbook'
import { catalogNames, generatedHandbook } from './catalog'

export const ar: Record<string, string> = {
  ...core, ...faults, ...ui, ...stages, ...board, ...endgame, ...tutorial, ...catalogNames(), ...handbook, ...generatedHandbook(),
}
