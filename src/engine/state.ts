import type {
  Design, Difficulty, Fault, InstrumentId, ObjectiveId, OrbitId, Role, ScheduleMode, Slot,
  StationId, VehicleId,
} from './types'
import type { MissionReport, Outcome } from './evaluate'

export type Mode = 'solo' | 'local' | 'online'

export type Phase =
  | 'lobby' | 'objective_proposal' | 'objective_review' | 'planning' | 'design' | 'integration'
  | 'go_poll' | 'launch' | 'operations' | 'debrief' | 'campaign' | 'campaign_over'

export interface Player {
  id: string
  name: string
  roles: Role[]
  connected: boolean
  xp: number
  badges: string[]
  /** roles this player held when they dropped; handed back on return if still free */
  lostRoles?: Role[]
}

export type RequestKind = 'objective' | 'funding' | 'purchase'
export interface Request {
  id: string
  kind: RequestKind
  from: Role
  status: 'pending' | 'approved' | 'rejected' | 'closed'
  /** appeals used so far (max 2) */
  appeals: number
  /** rejected with no appeals left */
  exhausted?: boolean
  /** alternating thread: requester's pitch, planner's reason, appeal, … */
  reasons: { by: Role; text: string }[]
  objectiveId?: ObjectiveId
  amount?: number
  target?: 'designer' | 'radio'
}
export const MAX_APPEALS = 2

export interface Backorder {
  id: string
  slot: Slot
  option: string
  status: 'open' | 'wait' | 'express' | 'substitute'
}

/**
 * Where the instrument list stands between the Scientist and the Designer:
 * none → pending (Designer to decide) ⇄ pushed_back (Scientist to insist or change), at most two push-backs;
 * at the third look the Designer approves or escalates → escalated (Planner sets a limit) → capped
 * (Scientist picks a final list inside the limit) → final (Designer must accept) → accepted.
 */
export type InstrumentStatus = 'none' | 'pending' | 'pushed_back' | 'escalated' | 'capped' | 'final' | 'accepted'
export const MAX_PUSHBACKS = 2
export interface InstrumentStep {
  by: Role
  kind: 'list' | 'insist' | 'change' | 'pushback' | 'escalate' | 'cap' | 'accept'
  text?: string
  list?: InstrumentId[]
  amount?: number
}
export type ReadyRole = 'scientist' | 'designer' | 'radio'

export interface Budget {
  total: number
  designer: number
  radio: number
  reserve: number
  /** what the Designer was first given, before any top-ups (for scoring) */
  initialDesigner?: number
}

/** The budget and schedule of a mission, kept so "fly again" can restore them exactly. */
export interface PlanMemory {
  total: number
  designer: number
  radio: number
  /** months between the mission starting and its target launch */
  lead: number
  scheduleMode: ScheduleMode
}

export interface Award {
  id: 'cost_efficiency' | 'scientific_value' | 'new_gear' | 'effective_decision'
  role?: Role
  unlock?: string
}

export interface MissionResult {
  objectiveId: ObjectiveId
  outcome: Outcome
  roleScores: Record<Role, number>
  teamPoints: 0 | 400 | 1000
  awards: Award[]
  grant: number
  cost: number
  science: number
  faults: Fault[]
  launchMonth: number
}

export interface Mission {
  objectiveId?: ObjectiveId
  pitch?: string
  requests: Request[]
  /** objectives turned down after both appeals */
  rejectedObjectives: ObjectiveId[]
  /** how many times each objective has been turned down this mission */
  objectiveRejections: Partial<Record<ObjectiveId, number>>
  planSet: boolean
  budget: Budget
  targetMonth: number
  scheduleMode: ScheduleMode
  design: Partial<Design>
  /** what the Scientist last asked for (design.instruments holds what the Designer accepted) */
  instrumentRequest: InstrumentId[]
  instrumentStatus: InstrumentStatus
  /** the Designer's latest reason for not approving */
  pushbackReason?: string
  /** push-backs the Designer has used this mission (at most MAX_PUSHBACKS) */
  instrumentPushbacks: number
  /** the Planner's ruling after an escalation: the most the Scientist's instruments may cost */
  instrumentCap?: number
  /** the whole conversation, oldest first */
  instrumentThread: InstrumentStep[]
  /** options the Planner told the team to replace */
  banned: { slot: Slot; option: string }[]
  backorders: Backorder[]
  /** express fees and other extras paid out of the reserve */
  fees: number
  ready: Record<ReadyRole, boolean>
  pairing: { designer: boolean; radio: boolean }
  purchaseApproved: boolean
  votes: Partial<Record<Role, 'go' | 'nogo'>>
  /** "Fly again with fixes": the previous design, re-applied when the design phase opens */
  template?: Design
  /** "Fly again" when the old budget is no longer affordable: the old numbers, for the Planner to adjust */
  suggestedPlan?: PlanMemory
  // --- filled at launch
  report?: MissionReport
  finalDesign?: Design
  readyMonth?: number
  launchMonth?: number
  waitMonths?: number
  waitCost?: number
  totalCost?: number
  result?: MissionResult
}

export interface Patch {
  shape: 'circle' | 'shield' | 'hexagon' | 'triangle'
  colorA: string
  colorB: string
  icon: string
  objectiveId: ObjectiveId
  outcome: Outcome
  teamName: string
}

export interface Campaign {
  funds: number
  launches: number
  month: number
  unlocked: string[]
  history: MissionResult[]
  patches: Patch[]
  teamName: string
  lastDesign?: Design
  lastObjective?: ObjectiveId
  lastPlan?: PlanMemory
}

export interface ChatMsg {
  n: number
  playerId: string
  name: string
  text: string
}

export interface LogEntry {
  n: number
  key: string
  vars: Record<string, string | number>
  role?: Role
}

export interface GameState {
  mode: Mode
  difficulty: Difficulty
  seed: number
  /** current state of the seeded random generator */
  rng: number
  hostId: string
  phase: Phase
  players: Player[]
  campaign: Campaign
  mission: Mission | null
  chat: ChatMsg[]
  log: LogEntry[]
  nextId: number
}

export type Action =
  | { type: 'join'; name: string }
  | { type: 'claimRole'; role: Role }
  | { type: 'releaseRole'; role: Role }
  | { type: 'setConnected'; playerId: string; connected: boolean }
  | { type: 'setTeamName'; name: string }
  | { type: 'startCampaign' }
  | { type: 'chat'; text: string }
  | { type: 'proposeObjective'; objectiveId: ObjectiveId; pitch: string }
  | { type: 'review'; requestId: string; decision: 'approve' | 'reject'; reason?: string }
  | { type: 'appeal'; requestId: string; reason: string }
  | { type: 'withdraw'; requestId: string }
  | { type: 'setPlan'; total: number; designer: number; radio: number; targetMonth: number; scheduleMode: ScheduleMode }
  | { type: 'confirmPlan' }
  | { type: 'setSlot'; slot: Slot; option: string }
  | { type: 'setVehicle'; vehicle: VehicleId }
  | { type: 'setOrbit'; orbit: OrbitId }
  | { type: 'setStations'; stations: StationId[] }
  | { type: 'requestInstruments'; list: InstrumentId[]; note?: string }
  | { type: 'reviewInstruments'; decision: 'accept' | 'pushback' | 'escalate'; reason?: string }
  | { type: 'capInstruments'; amount: number; reason?: string }
  | { type: 'requestFunds'; from: 'designer' | 'radio'; target: 'designer' | 'radio'; amount: number; reason: string }
  | { type: 'resolveBackorder'; id: string; choice: 'wait' | 'express' | 'substitute' }
  | { type: 'topUp'; amount: number }
  | { type: 'moveFunds'; from: 'designer' | 'radio' | 'reserve'; to: 'designer' | 'radio' | 'reserve'; amount: number }
  | { type: 'setReady'; role: ReadyRole; ready: boolean }
  | { type: 'agreePairing'; role: 'designer' | 'radio'; agree: boolean }
  | { type: 'submitPurchase' }
  | { type: 'vote'; role: Role; vote: 'go' | 'nogo' }
  | { type: 'launch' }
  | { type: 'advanceOps' }
  | { type: 'finishDebrief' }
  | { type: 'nextMission'; flyAgain: boolean }

export type ActionResult = { ok: true; state: GameState } | { ok: false; error: string }

export class GameError extends Error {
  code: string
  constructor(code: string) {
    super(code)
    this.code = code
  }
}
export const fail = (code: string): never => {
  throw new GameError(code)
}
