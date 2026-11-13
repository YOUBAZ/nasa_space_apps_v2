import { STATIONS, VEHICLES } from '../../engine/catalog'

const SLOT: Record<string, string> = {
  structure: 'الهيكل', power: 'مصدر الطاقة', battery: 'البطاريات', computer: 'الحاسوب', attitude: 'التحكم بالتوجيه',
  thermal: 'التحكم الحراري', propulsion: 'الدفع', storage: 'تخزين البيانات', protection: 'الحماية', antenna: 'الهوائي', band: 'نطاق التردد',
}
const OPT: Record<string, Record<string, string>> = {
  structure: { small: 'هيكل صغير', medium: 'هيكل متوسط', large: 'هيكل كبير' },
  power: { body_solar: 'خلايا شمسية على الجسم', deploy_solar: 'ألواح شمسية قابلة للفتح', large_solar: 'ألواح شمسية كبيرة', rtg: 'مولّد نووي (RTG)' },
  battery: { small: 'بطارية صغيرة', medium: 'بطارية متوسطة', large: 'بطارية كبيرة' },
  computer: { basic: 'حاسوب أساسي', radhard: 'حاسوب مقاوم للإشعاع', highperf: 'حاسوب عالي الأداء' },
  attitude: { magnetorquer: 'قضبان مغناطيسية', wheels: 'عجلات تفاعل', wheels_star: 'عجلات + متتبعات نجوم' },
  thermal: { passive: 'تحكم سلبي (طلاء وأغطية)', heaters: 'سخّانات + مشعّات', active: 'دائرة سائل فعّالة' },
  propulsion: { none: 'بلا دفع', cold_gas: 'دافعات غاز بارد', chemical: 'محرك كيميائي + وقود', ion: 'محرك كهربائي (أيوني)' },
  storage: { small: 'مسجّل صغير', medium: 'مسجّل متوسط', large: 'مسجّل كبير' },
  protection: { none: 'بلا حماية', rad_shield: 'دروع ضد الإشعاع', sunshield: 'واقٍ شمسي', mars_edl: 'عدّة الهبوط على المريخ' },
  antenna: { omni: 'هوائي شامل الاتجاهات', medium: 'هوائي متوسط الكسب', hga: 'طبق عالي الكسب (1 م)', dsa: 'طبق الفضاء العميق (3 م)' },
  band: { uhf: 'نطاق UHF', s: 'نطاق S', x: 'نطاق X', ka: 'نطاق Ka' },
}
const INST: Record<string, string> = {
  hires_cam: 'كاميرا عالية الدقة', multispectral: 'مصوّر متعدد الأطياف', hyperspectral: 'مصوّر فائق الأطياف',
  thermal_ir: 'كاميرا حرارية تحت الحمراء', sar: 'رادار الفتحة الاصطناعية', gpr: 'رادار مخترق للأرض', spectrometer: 'مطياف',
  magnetometer: 'مقياس المغناطيسية', radiation: 'كاشف الإشعاع', weather: 'محطة طقس', ir_telescope: 'تلسكوب الأشعة تحت الحمراء',
  drill: 'حفّار ومحلل عينات',
}
const ORB: Record<string, string> = {
  leo: 'مدار أرضي منخفض (400 كم)', sso: 'مدار متزامن مع الشمس (700 كم)', meo: 'مدار أرضي متوسط', geo: 'مدار ثابت بالنسبة للأرض',
  heo: 'مدار شديد الاستطالة (مولنيا)', l2: 'نقطة لاغرانج L2', lunar: 'مدار حول القمر', asteroid: 'ملاقاة كويكب',
  mars_orbit: 'مدار حول المريخ', mars_surf: 'سطح المريخ', jupiter: 'نظام المشتري',
}
const STN: Record<string, string> = {
  svalbard: 'سفالبارد (النرويج)', kiruna: 'كيرونا (السويد)', fairbanks: 'فيربانكس (ألاسكا)', wallops: 'والوبس (فرجينيا)',
  hawaii: 'هاواي', santiago: 'سانتياغو (تشيلي)', hartebeesthoek: 'هارتبيستهوك (جنوب أفريقيا)', singapore: 'سنغافورة',
  goldstone: 'غولدستون – شبكة الفضاء العميق (كاليفورنيا)', madrid: 'مدريد – شبكة الفضاء العميق (إسبانيا)', canberra: 'كانبيرا – شبكة الفضاء العميق (أستراليا)',
}
const OBJ: Record<string, string> = {
  wildfire: 'رصد حرائق الغابات والكوارث', polar_ice: 'الجليد القطبي والمناخ', crops: 'المحاصيل وموارد المياه',
  telescope: 'تلسكوب فضائي بالأشعة تحت الحمراء', asteroid: 'مسح كويكب', jupiter: 'أقمار المشتري الجليدية',
  mars_ice: 'رسم خريطة جليد الماء على المريخ', mars_scout: 'مستكشف موقع الهبوط ومحطة الطقس', mars_isru: 'مركبة هبوط لاختبار الموارد',
}

export function catalogNames(): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [slot, name] of Object.entries(SLOT)) out[`slot.${slot}`] = name
  for (const [slot, opts] of Object.entries(OPT)) for (const [id, name] of Object.entries(opts)) out[`opt.${slot}.${id}`] = name
  for (const [id, name] of Object.entries(INST)) out[`inst.${id}`] = name
  for (const v of Object.values(VEHICLES)) out[`veh.${v.id}`] = v.name // rocket names stay as they are known worldwide
  for (const [id, name] of Object.entries(ORB)) out[`orb.${id}`] = name
  for (const [id, name] of Object.entries(STN)) out[`stn.${id}`] = name
  for (const [id, name] of Object.entries(OBJ)) out[`obj.${id}`] = name
  return out
}

export function generatedHandbook(): Record<string, string> {
  const out: Record<string, string> = {}
  const kg = (n: number | null) => (n === null ? 'لا يصل' : `${n.toLocaleString('en-US')} كغ`)
  for (const v of Object.values(VEHICLES)) {
    out[`hb.veh.${v.id}.what`] = `تكلفة ${v.name} هي $${v.cost} مليون. يرفع ${kg(v.cap.LEO)} إلى المدار الأرضي المنخفض، و${kg(v.cap.SSO)} إلى المدار المتزامن مع الشمس، و${kg(v.cap.GTO)} إلى المدارات الأرضية العالية، و${kg(v.cap.ESC)} إلى ما بعد الأرض.`
    out[`hb.veh.${v.id}.why`] = 'الصاروخ نفسه يحمل أقل كلما كان عليه رمي الحمولة أبعد. اختر أرخص صاروخ يبقى له فائض قدرة لوجهتك.'
  }
  for (const s of Object.values(STATIONS)) {
    const name = STN[s.id]
    out[`hb.stn.${s.id}.what`] = s.network === 'dsn'
      ? `${name} أحد ثلاثة مواقع لشبكة الفضاء العميق، بأطباق عملاقة للمركبات البعيدة. $${s.cost} مليون لكل مهمة.`
      : `${name} محطة أرضية للأقمار التي تدور حول الأرض. $${s.cost} مليون لكل مهمة.`
    out[`hb.stn.${s.id}.why`] = s.network === 'dsn'
      ? 'خارج مدار الأرض لا يسمع المركبة إلا شبكة الفضاء العميق. المواقع الثلاثة موزعة حول الكرة الأرضية ليواجهها أحدها دائمًا.'
      : s.id === 'svalbard' || s.id === 'kiruna' || s.id === 'fairbanks'
        ? 'المحطات القريبة من القطبين ترى القمر ذا المدار القطبي في كل دورة تقريبًا، فتعطي أطول وقت اتصال للمدارات المتزامنة مع الشمس.'
        : s.rainy
          ? 'المحطات القريبة من خط الاستواء ترى المدارات قليلة الميل جيدًا، لكن المطر الاستوائي يُضعف إشارات نطاق Ka.'
          : 'محطة في خطوط العرض الوسطى ترى القمر مرات قليلة في اليوم. محطات أكثر تعني وقت اتصال أطول وتكلفة أعلى.'
  }
  return out
}
