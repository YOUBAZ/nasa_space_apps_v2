import { ROLES, type Role } from '../../engine/types'
import { t } from '../../i18n/i18n'
import { useGame } from '../../net/useGame'
import { Button } from '../components/Button'
import { Icon } from '../icons'
import { ROLE_META } from '../roles'

export function Lobby({ onExit }: { onExit: () => void }) {
  const { state, me, act, actAs, transport } = useGame()
  const online = state.mode === 'online'
  const isHost = !online || me === state.hostId
  const holderOf = (role: Role) => state.players.find((p) => p.roles.includes(role))
  const allClaimed = ROLES.every((r) => holderOf(r))

  /** Pass-and-play: seat a named player in a role, freeing it from whoever had it. */
  const give = (role: Role, playerId: string) => {
    const current = holderOf(role)
    if (current?.id === playerId) return actAs(playerId, { type: 'releaseRole', role })
    if (current) actAs(current.id, { type: 'releaseRole', role })
    actAs(playerId, { type: 'claimRole', role })
  }
  const autoAssign = () => {
    const seats = online ? state.players.filter((p) => p.connected) : state.players
    ROLES.forEach((role, i) => {
      const current = holderOf(role)
      const target = seats[i % seats.length]
      if (current?.id === target.id) return
      if (current) actAs(current.id, { type: 'releaseRole', role })
      actAs(target.id, { type: 'claimRole', role })
    })
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-5xl flex-col gap-6 px-4 py-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="label">{t(`diff.${state.difficulty}`)} · {state.campaign.teamName}</p>
          <h1 className="text-3xl font-black">{t('lobby.title')}</h1>
          <p className="text-carbon-30">{t('lobby.sub')}</p>
        </div>
        {online && transport.code && (
          <div className="panel px-5 py-3 text-center">
            <p className="label">{t('lobby.code')}</p>
            <p className="mono text-3xl tracking-[0.3em] text-active-green" data-testid="room-code">{transport.code}</p>
            <p className="text-xs text-carbon-40">{t('lobby.share')}</p>
          </div>
        )}
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        {ROLES.map((role) => {
          const meta = ROLE_META[role]
          const holder = holderOf(role)
          const mine = holder?.id === me
          return (
            <section key={role} data-testid={`role-${role}`} className="panel flex flex-col gap-3 p-4"
              style={{ borderColor: holder ? meta.color : undefined }}>
              <div className="flex items-center gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-full border-2" style={{ borderColor: meta.color, color: meta.color }}>
                  <Icon name={meta.icon} size={24} />
                </span>
                <div>
                  <h2 className="text-lg font-bold" style={{ color: meta.color }}>{t(`role.${role}`)}</h2>
                  <p className="text-sm text-carbon-30">{t(`role.${role}.job`)}</p>
                </div>
              </div>
              {online ? (
                <div className="flex items-center justify-between gap-2">
                  <span className="mono text-sm text-carbon-20">
                    {holder ? t('lobby.heldBy', { name: holder.name }) : t('lobby.unclaimed')}
                  </span>
                  {mine
                    ? <Button size="sm" variant="ghost" onClick={() => act({ type: 'releaseRole', role })}>{t('lobby.release')}</Button>
                    : <Button size="sm" disabled={!!holder} onClick={() => act({ type: 'claimRole', role })}>{t('lobby.claim')}</Button>}
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {state.players.map((p) => (
                    <button key={p.id} type="button" onClick={() => give(role, p.id)} aria-pressed={holder?.id === p.id}
                      className={`rounded border px-3 py-1 text-sm font-semibold transition ${holder?.id === p.id
                        ? 'border-transparent text-black' : 'border-carbon-60 text-carbon-20 hover:border-carbon-30'}`}
                      style={holder?.id === p.id ? { background: meta.color } : undefined}>
                      {p.name}
                    </button>
                  ))}
                </div>
              )}
            </section>
          )
        })}
      </div>

      {online && (
        <section className="panel p-4">
          <p className="label mb-2">{t('lobby.players')}</p>
          <ul className="flex flex-wrap gap-2">
            {state.players.map((p) => (
              <li key={p.id} className={`mono rounded border border-carbon-70 px-3 py-1 text-sm ${p.connected ? '' : 'opacity-40'}`}>
                {p.name}
                {p.id === me && <span className="text-active-green"> · {t('lobby.you')}</span>}
                {p.id === state.hostId && <span className="text-intl-orange"> · {t('lobby.host')}</span>}
                {!p.connected && <span> · {t('lobby.offline')}</span>}
              </li>
            ))}
          </ul>
        </section>
      )}

      <footer className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" icon="back" onClick={onExit}>{t('lobby.leave')}</Button>
        <div className="flex flex-wrap items-center gap-3">
          {!online && (
            <Button variant="ghost" icon="users" onClick={autoAssign}>{t('lobby.auto')}</Button>
          )}
          {isHost
            ? <Button variant="primary" size="lg" icon="rocket" disabled={!allClaimed} onClick={() => act({ type: 'startCampaign' })}>{t('lobby.start')}</Button>
            : <p className="mono text-sm text-carbon-30">{t('lobby.waitingHost')}</p>}
        </div>
      </footer>
    </div>
  )
}
