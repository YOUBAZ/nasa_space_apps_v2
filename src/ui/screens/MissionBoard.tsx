import { t } from '../../i18n/i18n'
import { useGame } from '../../net/useGame'

export function MissionBoard() {
  const { state } = useGame()
  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <h1 className="text-2xl font-black">{t(`stage.${state.phase}`)}</h1>
    </div>
  )
}
