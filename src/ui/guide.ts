import type { GameState } from '../engine/state'
import type { Role } from '../engine/types'
import { ROLES } from '../engine/types'
import { readyBlocker } from '../engine/phases/design'
import { completeDesign } from '../engine/spend'

/** What each role should do next, as an i18n key. Roles with nothing to do are absent. */
export function duties(s: GameState): Partial<Record<Role, string>> {
  const m = s.mission
  const out: Partial<Record<Role, string>> = {}
  if (!m) return out
  const solo = s.mode === 'solo'
  const pending = (kind: string) => m.requests.some((r) => r.kind === kind && r.status === 'pending')
  const rejected = (kind: string, from: Role) => m.requests.some((r) => r.kind === kind && r.from === from && r.status === 'rejected')
  switch (s.phase) {
    case 'objective_proposal':
      out.scientist = rejected('objective', 'scientist') ? 'todo.appealOrChange' : 'todo.pickObjective'
      break
    case 'objective_review':
      out.planner = 'todo.reviewObjective'
      break
    case 'planning':
      out.planner = 'todo.setBudget'
      break
    case 'design': {
      if (solo) {
        const ready = completeDesign(m, s.difficulty) && m.instrumentStatus === 'accepted'
        if (m.instrumentStatus !== 'accepted') out.scientist = 'todo.requestInstruments'
        if (readyBlocker(s, 'designer')) out.designer = 'todo.finishDesign'
        if (readyBlocker(s, 'radio')) out.radio = 'todo.finishDesign'
        if (ready) out.planner = 'todo.launch'
        break
      }
      if (m.instrumentStatus === 'none') out.scientist = 'todo.requestInstruments'
      else if (m.instrumentStatus === 'pushed_back') out.scientist = 'todo.answerPushback'
      else if (m.instrumentStatus === 'capped') out.scientist = 'todo.finalInstruments'
      else if (m.instrumentStatus === 'accepted' && !m.ready.scientist) out.scientist = 'todo.markReady'
      for (const role of ['designer', 'radio'] as const) {
        if (role === 'designer' && (m.instrumentStatus === 'pending' || m.instrumentStatus === 'final')) out.designer = 'todo.reviewInstruments'
        else if (rejected('funding', role)) out[role] = 'todo.appealOrChange'
        else if (readyBlocker(s, role) === 'incomplete_design') out[role] = 'todo.finishDesign'
        else if (!m.ready[role] && !readyBlocker(s, role)) out[role] = 'todo.markReady'
      }
      if (m.instrumentStatus === 'escalated') out.planner = 'todo.ruleInstruments'
      else if (pending('funding')) out.planner = 'todo.reviewFunding'
      else if (m.backorders.some((b) => b.status === 'open' && m.design[b.slot] === b.option)) out.planner = 'todo.backorder'
      break
    }
    case 'integration':
      if (!m.pairing.designer) out.designer = 'todo.agreePairing'
      else if (!m.purchaseApproved && !pending('purchase')) out.designer = rejected('purchase', 'designer') ? 'todo.appealOrChange' : 'todo.submitPurchase'
      if (!m.pairing.radio) out.radio = 'todo.agreePairing'
      if (pending('purchase')) out.planner = 'todo.reviewPurchase'
      break
    case 'go_poll':
      for (const role of ROLES) if (!m.votes[role]) out[role] = 'todo.vote'
      if (ROLES.every((r) => m.votes[r] === 'go')) out.planner = 'todo.launch'
      break
    case 'launch':
    case 'operations':
      out.radio = 'todo.advance'
      break
  }
  return out
}
