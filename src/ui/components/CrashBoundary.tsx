import { Component, type ReactNode } from 'react'
import { t } from '../../i18n/i18n'
import { clearSave } from '../../net/localTransport'

/** Last line of defence: a broken screen (for example a save from an older build) gets a way out, not a blank page. */
export class CrashBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  render() {
    if (!this.state.failed) return this.props.children
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
        <h1 className="text-3xl font-black">{t('crash.title')}</h1>
        <p className="text-carbon-20">{t('crash.body')}</p>
        <button type="button" onClick={() => { clearSave(); window.location.reload() }}
          className="rounded bg-nasa-red px-5 py-2.5 font-display font-bold uppercase text-white hover:bg-nasa-red-shade">
          {t('crash.reset')}
        </button>
      </div>
    )
  }
}
