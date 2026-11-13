import type { Action, ActionResult, GameState, Mission, Mode } from './state'
import { fail, GameError } from './state'
import type { Difficulty, Role } from './types'
import { ROLES } from './types'
import { STARTING_BUDGET } from './catalog'
import { findRequest, requireReason } from './requests'
import { holderOf, log, missionOf, newId, playerOf, requirePhase, requireRole } from './ctx'
import { proposeObjective, reviewObjective } from './phases/objective'
import { confirmPlan, setPlan } from './phases/planning'
import {
  moveFunds, requestFunds, requestInstruments, resolveBackorder, reviewFunding, reviewInstruments,
  setOrbit, setReady, setSlot, setStations, setVehicle,
} from './phases/design'
import { finishDebrief, nextMission } from './campaign'
import { advanceOps, agreePairing, launch, reviewPurchase, submitPurchase, vote } from './phases/integration'

export interface CreateOpts {
  mode: Mode
  difficulty: Difficulty
  seed: number
  hostName: string
}

export function createGame(opts: CreateOpts): GameState {
  return {
    mode: opts.mode,
    difficulty: opts.difficulty,
    seed: opts.seed,
    rng: opts.seed,
    hostId: 'p1',
    phase: 'lobby',
    players: [{
      id: 'p1', name: cleanName(opts.hostName), connected: true, xp: 0, badges: [],
      roles: opts.mode === 'solo' ? [...ROLES] : [],
    }],
    campaign: {
      funds: STARTING_BUDGET[opts.difficulty], launches: 0, month: 0, unlocked: [], history: [], patches: [],
      teamName: 'Team ' + cleanName(opts.hostName),
    },
    mission: null,
    chat: [],
    log: [],
    nextId: 0,
  }
}

export function newMission(): Mission {
  return {
    requests: [], rejectedObjectives: [], planSet: false,
    budget: { total: 0, designer: 0, radio: 0, reserve: 0 }, targetMonth: 0, scheduleMode: 'standard',
    design: {},
    instrumentRequest: [],
    instrumentStatus: 'none', scientistOverrode: false, banned: [], backorders: [], fees: 0,
    ready: { scientist: false, designer: false, radio: false },
    pairing: { designer: false, radio: false }, purchaseApproved: false, votes: {},
  }
}

export const rolesOf = (s: GameState, playerId: string): Role[] =>
  s.players.find((p) => p.id === playerId)?.roles ?? []

const cleanName = (name: string) => (name ?? '').trim().slice(0, 24) || 'Player'

/** The single entry point for every rule in the game. Never mutates `state`. */
export function applyAction(state: GameState, action: Action, actorId: string): ActionResult {
  const s: GameState = structuredClone(state)
  try {
    reduce(s, action, actorId)
    return { ok: true, state: s }
  } catch (e) {
    if (e instanceof GameError) return { ok: false, error: e.code }
    throw e
  }
}

function reduce(s: GameState, a: Action, actorId: string): void {
  if (a.type === 'join') return join(s, a.name, actorId)
  playerOf(s, actorId)
  switch (a.type) {
    case 'claimRole': {
      const holder = holderOf(s, a.role)
      if (holder && holder.id !== actorId) fail('role_taken')
      const p = playerOf(s, actorId)
      if (!p.roles.includes(a.role)) p.roles.push(a.role)
      return
    }
    case 'releaseRole': {
      const p = playerOf(s, actorId)
      p.roles = p.roles.filter((r) => r !== a.role)
      return
    }
    case 'setConnected': {
      if (actorId !== s.hostId) fail('host_only')
      const p = playerOf(s, a.playerId)
      p.connected = a.connected
      if (!a.connected) {
        p.roles = []
        log(s, 'log.player.left', { name: p.name })
      }
      return
    }
    case 'setTeamName': {
      if (actorId !== s.hostId) fail('host_only')
      requirePhase(s, 'lobby')
      s.campaign.teamName = cleanName(a.name)
      return
    }
    case 'startCampaign': {
      requirePhase(s, 'lobby')
      if (actorId !== s.hostId) fail('host_only')
      if (ROLES.some((r) => !holderOf(s, r))) fail('roles_unclaimed')
      s.mission = newMission()
      s.phase = 'objective_proposal'
      log(s, 'log.campaign.started', { funds: s.campaign.funds })
      return
    }
    case 'chat': {
      const text = (a.text ?? '').trim()
      if (!text) fail('empty_message')
      if (text.length > 300) fail('message_too_long')
      s.chat.push({ n: Number(newId(s, '')), playerId: actorId, name: playerOf(s, actorId).name, text })
      if (s.chat.length > 200) s.chat.splice(0, s.chat.length - 200)
      return
    }
    case 'proposeObjective': return proposeObjective(s, a, actorId)
    case 'review': return review(s, a, actorId)
    case 'appeal': return appeal(s, a, actorId)
    case 'withdraw': return withdraw(s, a.requestId, actorId)
    case 'setPlan': return setPlan(s, a, actorId)
    case 'confirmPlan': return confirmPlan(s, actorId)
    case 'setSlot': return setSlot(s, a, actorId)
    case 'setVehicle': return setVehicle(s, a, actorId)
    case 'setOrbit': return setOrbit(s, a, actorId)
    case 'setStations': return setStations(s, a, actorId)
    case 'requestInstruments': return requestInstruments(s, a, actorId)
    case 'reviewInstruments': return reviewInstruments(s, a, actorId)
    case 'requestFunds': return requestFunds(s, a, actorId)
    case 'resolveBackorder': return resolveBackorder(s, a, actorId)
    case 'moveFunds': return moveFunds(s, a, actorId)
    case 'setReady': return setReady(s, a, actorId)
    case 'agreePairing': return agreePairing(s, a, actorId)
    case 'submitPurchase': return submitPurchase(s, actorId)
    case 'vote': return vote(s, a, actorId)
    case 'launch': return launch(s, actorId)
    case 'advanceOps': return advanceOps(s, actorId)
    case 'finishDebrief': return finishDebrief(s)
    case 'nextMission': return nextMission(s, a, actorId)
    default: fail('unknown_action')
  }
}

function join(s: GameState, name: string, actorId: string): void {
  const existing = s.players.find((p) => p.id === actorId)
  if (existing) {
    existing.connected = true
    return
  }
  if (s.mode === 'solo') fail('solo_game')
  if (s.players.length >= 4) fail('room_full')
  s.players.push({ id: actorId, name: cleanName(name), roles: [], connected: true, xp: 0, badges: [] })
  log(s, 'log.player.joined', { name: cleanName(name) })
}

function review(s: GameState, a: Extract<Action, { type: 'review' }>, actorId: string): void {
  requireRole(s, actorId, 'planner')
  const r = findRequest(missionOf(s), a.requestId)
  if (r.status !== 'pending') fail('not_pending')
  const approve = a.decision === 'approve'
  const reason = approve ? (a.reason ?? '').trim() : requireReason(a.reason)
  if (r.kind === 'objective') {
    setStatus()
    reviewObjective(s, r, approve)
  } else if (r.kind === 'funding') {
    reviewFunding(s, r, approve)
    setStatus()
  } else {
    reviewPurchase(s, r, approve)
    setStatus()
  }

  function setStatus() {
    r.status = approve ? 'approved' : 'rejected'
    if (reason) r.reasons.push({ by: 'planner', text: reason })
  }
}

function appeal(s: GameState, a: Extract<Action, { type: 'appeal' }>, actorId: string): void {
  const r = findRequest(missionOf(s), a.requestId)
  requireRole(s, actorId, r.from)
  if (r.status !== 'rejected') fail('not_rejected')
  if (r.appeals >= 2) fail('appeals_exhausted')
  r.reasons.push({ by: r.from, text: requireReason(a.reason) })
  r.appeals += 1
  r.status = 'pending'
  log(s, 'log.request.appealed', { kind: r.kind, n: r.appeals }, r.from)
  if (r.kind === 'objective') s.phase = 'objective_review'
}

function withdraw(s: GameState, requestId: string, actorId: string): void {
  const r = findRequest(missionOf(s), requestId)
  requireRole(s, actorId, r.from)
  if (r.status !== 'pending' && r.status !== 'rejected') fail('not_open')
  r.status = 'closed'
  if (r.kind === 'objective') s.phase = 'objective_proposal'
}
