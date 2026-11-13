import type { GameState, Mission, Request, RequestKind } from './state'
import { fail, MAX_APPEALS } from './state'
import type { ObjectiveId, Role } from './types'
import { newId } from './ctx'

export function openRequest(
  s: GameState, m: Mission, kind: RequestKind, from: Role, text: string,
  extra: { objectiveId?: ObjectiveId; amount?: number; target?: 'designer' | 'radio' } = {},
): Request {
  const r: Request = {
    id: newId(s, 'r'), kind, from, status: 'pending', appeals: 0,
    reasons: text.trim() ? [{ by: from, text: text.trim() }] : [], ...extra,
  }
  m.requests.push(r)
  return r
}

export const findRequest = (m: Mission, id: string): Request =>
  m.requests.find((r) => r.id === id) ?? fail('unknown_request')

export const appealsLeft = (r: Request): number => MAX_APPEALS - r.appeals

/** Requests still waiting on someone, by the role that raised them. */
export const hasOpenRequest = (m: Mission, from: Role, kind?: RequestKind): boolean =>
  m.requests.some((r) => r.from === from && r.status === 'pending' && (!kind || r.kind === kind))

export function closeOpen(m: Mission, kind: RequestKind): void {
  for (const r of m.requests) {
    if (r.kind === kind && (r.status === 'pending' || r.status === 'rejected')) r.status = 'closed'
  }
}

export function requireReason(text: string | undefined): string {
  const t = (text ?? '').trim()
  if (!t) fail('reason_required')
  return t.slice(0, 300)
}
