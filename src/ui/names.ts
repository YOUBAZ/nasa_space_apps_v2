import type { InstrumentId, ObjectiveId, OrbitId, Slot, StationId, VehicleId } from '../engine/types'
import { t } from '../i18n/i18n'

export const slotName = (slot: Slot) => t(`slot.${slot}`)
export const optName = (slot: Slot, id: string) => t(`opt.${slot}.${id}`)
export const instName = (id: InstrumentId) => t(`inst.${id}`)
export const vehName = (id: VehicleId) => t(`veh.${id}`)
export const orbName = (id: OrbitId) => t(`orb.${id}`)
export const stnName = (id: StationId) => t(`stn.${id}`)
export const objName = (id: ObjectiveId) => t(`obj.${id}`)
export const money = (n: number) => t('common.money', { n: Math.round(n).toLocaleString('en-US') })
export const num = (n: number, digits = 0) =>
  n.toLocaleString('en-US', { maximumFractionDigits: digits, minimumFractionDigits: 0 })
