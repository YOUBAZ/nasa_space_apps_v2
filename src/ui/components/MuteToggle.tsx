import { useSyncExternalStore } from 'react'
import { t } from '../../i18n/i18n'
import { Icon } from '../icons'
import { isMuted, onMuteChange, setMuted, sfx } from '../sound'

export function MuteToggle() {
  const muted = useSyncExternalStore(onMuteChange, isMuted)
  return (
    <button type="button" aria-label={t(muted ? 'sound.on' : 'sound.off')} aria-pressed={!muted}
      onClick={() => { setMuted(!muted); if (muted) sfx('click') }}
      className="inline-flex h-8 w-8 items-center justify-center rounded border border-carbon-60 text-carbon-20 hover:border-carbon-30 hover:text-white">
      <Icon name={muted ? 'mute' : 'volume'} size={16} />
    </button>
  )
}
