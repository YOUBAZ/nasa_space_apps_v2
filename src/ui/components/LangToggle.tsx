import { setLang, useLang } from '../../i18n/i18n'

export function LangToggle() {
  const lang = useLang()
  return (
    <button type="button" onClick={() => setLang(lang === 'en' ? 'ar' : 'en')}
      className="mono rounded border border-carbon-60 px-3 py-1 text-sm text-carbon-10 hover:border-carbon-30"
      aria-label={lang === 'en' ? 'العربية' : 'English'}>
      {lang === 'en' ? 'العربية' : 'English'}
    </button>
  )
}
