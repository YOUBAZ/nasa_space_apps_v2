import { useState } from 'react'
import { t } from '../../i18n/i18n'
import { useGame } from '../../net/useGame'
import { Button } from './Button'
import { Modal } from './Modal'

export function FundsDialog({ from, target: initialTarget, amount: initial, onClose }:
  { from: 'designer' | 'radio'; target?: 'designer' | 'radio'; amount: number; onClose(): void }) {
  const { act, state } = useGame()
  const [amount, setAmount] = useState(Math.max(1, Math.ceil(initial)))
  const [target, setTarget] = useState<'designer' | 'radio'>(initialTarget ?? from)
  const [reason, setReason] = useState('')
  const reserve = state.mission?.budget.reserve ?? 0
  return (
    <Modal title={t('funds.title')} onClose={onClose}>
      <div className="flex flex-col gap-3">
        <p className="mono text-sm text-carbon-30">{t('funds.reserve', { n: Math.round(reserve) })}</p>
        <label className="flex flex-col gap-1">
          <span className="label">{t('funds.amount')}</span>
          <input type="number" min={1} value={amount} onChange={(e) => setAmount(Number(e.target.value))}
            className="mono rounded border border-carbon-60 bg-black/60 px-3 py-2 text-white outline-none focus:border-nasa-blue-tint" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="label">{t('funds.for')}</span>
          <select value={target} onChange={(e) => setTarget(e.target.value as 'designer' | 'radio')}
            className="rounded border border-carbon-60 bg-black/60 px-3 py-2 text-white">
            <option value="designer">{t('plan.designer')}</option>
            <option value="radio">{t('plan.radio')}</option>
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="label">{t('req.reason')}</span>
          <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} maxLength={300}
            className="rounded border border-carbon-60 bg-black/60 px-3 py-2 text-white outline-none focus:border-nasa-blue-tint" />
        </label>
        <Button icon="send" disabled={!reason.trim() || !(amount > 0)}
          onClick={() => { act({ type: 'requestFunds', from, target, amount, reason: reason.trim() }, from); onClose() }}>
          {t('funds.send')}
        </Button>
      </div>
    </Modal>
  )
}
