import { lazy, Suspense, useEffect, useState } from 'react'
import type { FaultCode } from '../../engine/types'
import { t } from '../../i18n/i18n'
import { useGame } from '../../net/useGame'
import { Button } from '../components/Button'
import { Icon } from '../icons'
import { num, orbName } from '../names'
import { Scene3D } from '../three/Scene3D'
import { sfx } from '../sound'

const OrbitView3D = lazy(() => import('../three/OrbitView3D'))

type Tone = 'ok' | 'warn' | 'bad'
interface Beat { key: string; bad: FaultCode[]; warn: FaultCode[] }
const BEATS: Beat[] = [
  { key: 'arrival', bad: ['no_capture_propulsion', 'no_landing_kit', 'wrong_destination'], warn: [] },
  { key: 'power', bad: ['power_deficit', 'radiation_fried'], warn: ['battery_short', 'thermal_failure', 'thin_power_margin'] },
  { key: 'instruments', bad: ['tumbling'], warn: ['pointing_too_coarse', 'telescope_blinded', 'computer_overloaded', 'irrelevant_instruments'] },
  { key: 'downlink', bad: ['no_link', 'no_station_in_view'], warn: ['downlink_bottleneck', 'coverage_low', 'storage_overflow'] },
]
const TONE: Record<Tone, string> = { ok: 'text-active-green border-active-green', warn: 'text-intl-orange border-intl-orange', bad: 'text-nasa-red-tint border-nasa-red' }

/** After launch only the Radio Operator talks to the spacecraft; everyone else watches the telemetry. */
export function Operations() {
  const { state, act, can } = useGame()
  const m = state.mission!
  const report = m.report!
  const design = m.finalDesign!
  const radio = can('radio')
  const [step, setStep] = useState(0) // beats revealed so far
  const has = (codes: FaultCode[]) => report.faults.some((f) => codes.includes(f.code))
  const tone = (b: Beat): Tone => (has(b.bad) ? 'bad' : has(b.warn) ? 'warn' : 'ok')
  // The first hard failure ends the conversation: nothing after it can be checked.
  const deadAt = BEATS.findIndex((b) => has(b.bad))
  const last = deadAt === -1 ? BEATS.length : deadAt + 1

  // Other devices follow along automatically; the Radio Operator drives with the buttons.
  useEffect(() => {
    if (radio || step >= last) return
    const id = setTimeout(() => setStep((s) => s + 1), 2200)
    return () => clearTimeout(id)
  }, [radio, step, last])
  useEffect(() => { if (step > 0) sfx('static') }, [step])

  const linkDead = has(['no_link', 'no_station_in_view']) || (deadAt !== -1 && deadAt < 3)
  const bars = step >= last && linkDead ? 0 : Math.max(1, Math.round(Math.min(1, report.coverage * 2.5) * 5))
  const data = step >= BEATS.length && !linkDead ? Math.min(report.downlink, report.dataGenerated) : 0
  const finished = step >= last

  return (
    <div className="mx-auto grid min-h-[calc(100vh-3rem)] max-w-6xl gap-3 px-3 py-3 lg:grid-cols-[1.2fr_1fr]">
      <div className="min-h-72 overflow-hidden rounded border border-carbon-70 bg-black">
        <Scene3D fallback={<p className="mono p-4 text-carbon-30">{orbName(design.orbit)}</p>}>
          <Suspense fallback={null}><OrbitView3D orbit={design.orbit} stations={design.stations} /></Suspense>
        </Scene3D>
      </div>
      <section className="panel flex flex-col gap-4 p-4">
        <header>
          <p className="label">{orbName(design.orbit)}</p>
          <h1 className="text-2xl font-black">{t('ops.title')}</h1>
          <p className="text-sm text-carbon-30">{t(radio ? 'ops.youDrive' : 'ops.radioDrives')}</p>
        </header>
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded border border-carbon-70 bg-black/40 p-3">
            <p className="label">{t('ops.signal')}</p>
            <div className="mt-1 flex h-8 items-end gap-1" role="img" aria-label={`${bars}/5`} dir="ltr">
              {[1, 2, 3, 4, 5].map((i) => (
                <span key={i} className={`w-2.5 rounded-sm transition-all ${i <= bars && step > 0 ? 'bg-active-green' : 'bg-carbon-70'}`} style={{ height: `${i * 20}%` }} />
              ))}
              {step >= last && linkDead && <span className="mono ms-2 text-sm text-nasa-red-tint">{t('ops.noSignal')}</span>}
            </div>
          </div>
          <div className="rounded border border-carbon-70 bg-black/40 p-3">
            <p className="label">{t('ops.data')}</p>
            <p className="mono text-2xl text-white" dir="ltr">{num(data, 1)} <span className="text-sm text-carbon-30">Gb/d</span></p>
          </div>
        </div>
        <ol className="flex flex-col gap-2">
          {BEATS.map((b, i) => {
            const shown = i < step
            const tn = tone(b)
            return (
              <li key={b.key} className={`flex items-center gap-3 rounded border px-3 py-2 transition ${shown ? TONE[tn] : 'border-carbon-70 text-carbon-50'}`}>
                <Icon name={!shown ? 'clock' : tn === 'ok' ? 'check' : tn === 'warn' ? 'alert' : 'x'} />
                <span className="flex-1">
                  <span className="block font-display text-sm font-bold">{t(`ops.beat.${b.key}`)}</span>
                  {shown && <span className="mono block text-xs">{t(`ops.${tn}.${b.key}`)}</span>}
                </span>
              </li>
            )
          })}
        </ol>
        <div className="mt-auto flex flex-wrap justify-end gap-2">
          {radio && !finished && (
            <Button icon={step === BEATS.length - 1 ? 'data' : 'send'} onClick={() => setStep(step + 1)}>
              {step === BEATS.length - 1 ? t('ops.downlink') : t('ops.send')}
            </Button>
          )}
          {finished && (radio
            ? <Button variant="primary" size="lg" icon="arrow" onClick={() => act({ type: 'advanceOps' }, 'radio')}>{t('ops.toDebrief')}</Button>
            : <p className="mono text-sm text-carbon-30">{t('launch.waitRadio')}</p>)}
        </div>
      </section>
    </div>
  )
}
