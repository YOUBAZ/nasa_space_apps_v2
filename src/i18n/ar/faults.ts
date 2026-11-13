// نصوص تقرير ما بعد المهمة: فكرة واحدة في كل جملة وبلا مصطلحات معقدة.
export const faults: Record<string, string> = {
  'fault.vehicle_cannot_reach.title': 'الصاروخ لا يستطيع الوصول',
  'fault.vehicle_cannot_reach.what': 'الصاروخ {vehicle} لا يستطيع إرسال أي شيء إلى {orbit}. لم تصل المركبة أبدًا.',
  'fault.vehicle_cannot_reach.why': 'لكل صاروخ حدّ لمدى دفع الحمولة. الوجهات البعيدة تحتاج صاروخًا أقوى بكثير من المدارات المنخفضة.',
  'fault.vehicle_cannot_reach.fix': 'اختر صاروخًا له رقم في عمود هذه الوجهة، أو اختر مدارًا أقرب.',

  'fault.over_capacity.title': 'أثقل من قدرة الصاروخ',
  'fault.over_capacity.what': 'وزن المركبة {mass} كغ، لكن {vehicle} يحمل {capacity} كغ فقط إلى {orbit}.',
  'fault.over_capacity.why': 'هذا الحدّ يسمى سعة الحمولة. كلما بعدت الوجهة قلّ ما يستطيع الصاروخ حمله إليها.',
  'fault.over_capacity.fix': 'استخدم صاروخًا أكبر، أو خفّف الكتلة: أجهزة أقل، هيكل أصغر، قطع أخف.',

  'fault.structure_overloaded.title': 'انهار الهيكل',
  'fault.structure_overloaded.what': 'كان على الهيكل حمل {carried} كغ من المعدات وهو مصمم لحمل {supports} كغ. تحطم أثناء الإطلاق.',
  'fault.structure_overloaded.why': 'الإطلاق يهزّ المركبة بقوة تعادل أضعاف وزنها. يجب أن يتحمل الهيكل كل ما يُثبَّت عليه.',
  'fault.structure_overloaded.fix': 'اختر هيكلًا أكبر أو احمل معدات أقل.',

  'fault.wrong_destination.title': 'المكان الخطأ لهذا العلم',
  'fault.wrong_destination.what': 'وصلت المركبة إلى {orbit}، لكن الهدف "{objective}" لا يمكن تحقيقه من هناك.',
  'fault.wrong_destination.why': 'المدار يحدد ما تستطيع المركبة رؤيته. يجب أن يتوافق الهدف العلمي مع الوجهة.',
  'fault.wrong_destination.fix': 'على العالِم ومشغّل الراديو الاتفاق على مدار يناسب الهدف قبل بدء التصميم.',

  'fault.power_deficit.title': 'الطاقة لا تكفي',
  'fault.power_deficit.what': 'تحتاج المركبة {powerDraw} واط لكنها تنتج {powerGen} واط فقط في {orbit}. فتوقفت عن العمل.',
  'fault.power_deficit.why': 'الألواح الشمسية تنتج طاقة أقل كلما ابتعدت عن الشمس: {sunPct}% من الطاقة الكاملة في هذه الوجهة.',
  'fault.power_deficit.fix': 'أضف ألواحًا شمسية أكبر، أو استخدم مولّدًا نوويًا بعيدًا عن الشمس، أو أطفئ الأجهزة التي تستهلك طاقة كبيرة.',

  'fault.thin_power_margin.title': 'هامش الطاقة ضيّق جدًا',
  'fault.thin_power_margin.what': 'تنتج المركبة {powerGen} واط وتستهلك {powerDraw} واط. الفائض أقل من 10%.',
  'fault.thin_power_margin.why': 'يحتفظ المهندسون بطاقة احتياطية لأن الألواح تضعف مع الزمن والأحمال ترتفع فجأة. نجحت هذه المرة بلا أي مجال للمفاجآت.',
  'fault.thin_power_margin.fix': 'استهدف فائض طاقة بين 10% و40%.',

  'fault.battery_short.title': 'فرغت البطارية في الظلام',
  'fault.battery_short.what': 'تقضي المركبة حتى {shadow} ساعة بلا ضوء الشمس وتحتاج {needWh} واط ساعة لتجاوزها. البطارية تخزّن {batteryWh} واط ساعة.',
  'fault.battery_short.why': 'في الظل أو الليل لا تنتج الألواح الشمسية شيئًا. كل شيء يعمل على البطارية حتى تعود الشمس.',
  'fault.battery_short.fix': 'ركّب بطارية أكبر، أو قلّل استهلاك الطاقة، أو استخدم مولّدًا نوويًا لا يحتاج ضوء الشمس.',

  'fault.no_capture_propulsion.title': 'لم تستطع التوقف عند الوجهة',
  'fault.no_capture_propulsion.what': 'وصلت المركبة إلى {orbit} بلا محرّك قادر على إبطائها لتدخل المدار.',
  'fault.no_capture_propulsion.why': 'تصل المركبة بسرعة عالية جدًا. يجب أن تشغّل محرّكًا لتُؤسَر في المدار أو لتحافظ على موقعها.',
  'fault.no_capture_propulsion.fix': 'أضف نظام دفع. الدوران حول عالم آخر يحتاج محرّكًا كيميائيًا أو أيونيًا.',

  'fault.no_landing_kit.title': 'لا وسيلة للهبوط',
  'fault.no_landing_kit.what': 'دخلت مركبة الهبوط غلاف المريخ الجوي بلا درع حراري أو مظلة أو محركات هبوط.',
  'fault.no_landing_kit.why': 'الهبوط على المريخ يعني الانتقال من آلاف الكيلومترات في الساعة إلى الصفر في نحو سبع دقائق.',
  'fault.no_landing_kit.fix': 'أضف عدّة الهبوط على المريخ في خانة الحماية. إنها ثقيلة، فراجع الصاروخ من جديد.',

  'fault.radiation_fried.title': 'أحرقها الإشعاع',
  'fault.radiation_fried.what': 'دمّر إشعاع المشتري الإلكترونيات بعد الوصول بقليل.',
  'fault.radiation_fried.why': 'يحبس المشتري جسيمات في أحزمة أقوى بملايين المرات من أي شيء قرب الأرض.',
  'fault.radiation_fried.fix': 'أضف دروعًا ضد الإشعاع في خانة الحماية.',

  'fault.telescope_blinded.title': 'أعمت الحرارة التلسكوب',
  'fault.telescope_blinded.what': 'بلا واقٍ شمسي سخن تلسكوب الأشعة تحت الحمراء فلم يرَ إلا وهجه.',
  'fault.telescope_blinded.why': 'تلسكوب الأشعة تحت الحمراء يرصد الحرارة، لذلك يجب أن يبقى شديد البرودة.',
  'fault.telescope_blinded.fix': 'أضف واقيًا شمسيًا في خانة الحماية.',

  'fault.tumbling.title': 'المركبة تتقلّب',
  'fault.tumbling.what': 'القضبان المغناطيسية لا تعمل في {orbit}. لم تستطع المركبة توجيه ألواحها أو هوائيها.',
  'fault.tumbling.why': 'القضبان المغناطيسية تدفع ضد المجال المغناطيسي للأرض. بعيدًا عن الأرض لا يوجد ما تدفع ضده.',
  'fault.tumbling.fix': 'استخدم عجلات التفاعل خارج مدار الأرض.',

  'fault.pointing_too_coarse.title': 'لم تستطع التصويب بدقة كافية',
  'fault.pointing_too_coarse.what': 'أحد الأجهزة أو الهوائي يحتاج تصويبًا أثبت مما يوفره نظام التوجيه. الصور مشوشة والاتصال ضعيف.',
  'fault.pointing_too_coarse.why': 'الكاميرات الحادة والتلسكوبات والأطباق الكبيرة مجال رؤيتها ضيق، فيجب أن تثبت المركبة كلها تمامًا.',
  'fault.pointing_too_coarse.fix': 'رقِّ نظام التوجيه إلى عجلات التفاعل، أو العجلات مع متتبعات النجوم.',

  'fault.no_link.title': 'لا اتصال لاسلكي',
  'fault.no_link.what': 'لم يستطع الهوائي ونطاق التردد الوصول إلى الأرض من {orbit}. لم يُسمع منها شيء.',
  'fault.no_link.why': 'الإشارة اللاسلكية تضعف مع المسافة. الوجهات البعيدة تحتاج طبقًا أكبر ونطاقًا مناسبًا.',
  'fault.no_link.fix': 'على مشغّل الراديو اختيار هوائي أعلى كسبًا ونطاق يعمل على هذه المسافة.',

  'fault.no_station_in_view.title': 'لا أحد يستمع',
  'fault.no_station_in_view.what': 'لا تستطيع أي محطة أرضية مختارة رؤية مركبة في {orbit}.',
  'fault.no_station_in_view.why': 'يجب أن تكون المركبة في سماء المحطة. خارج مدار الأرض لا يسمعها إلا شبكة الفضاء العميق.',
  'fault.no_station_in_view.fix': 'اختر محطات تغطي هذا المدار: محطات قطبية للمدارات القطبية، ومحطات شبكة الفضاء العميق للفضاء العميق.',

  'fault.coverage_low.title': 'وقت الاتصال قليل جدًا',
  'fault.coverage_low.what': 'رأت المحطات المركبة {coveragePct}% من اليوم. الهدف يحتاج {minCovPct}%.',
  'fault.coverage_low.why': 'التغطية هي نسبة اليوم التي تستطيع فيها محطة التحدث مع المركبة. تغطية أقل تعني أخبارًا أبطأ وبيانات أقل.',
  'fault.coverage_low.fix': 'أضف محطة ترى هذا المدار جيدًا.',

  'fault.downlink_bottleneck.title': 'معظم البيانات لم تصل',
  'fault.downlink_bottleneck.what': 'أنتجت الأجهزة {dataGenerated} غيغابت يوميًا، لكن أمكن إرسال {downlink} غيغابت يوميًا فقط إلى الأرض.',
  'fault.downlink_bottleneck.why': 'معدل البيانات يعتمد على النطاق والهوائي والمسافة ووقت الاتصال. العلم الذي يبقى على المتن علم ضائع.',
  'fault.downlink_bottleneck.fix': 'استخدم هوائيًا أكبر أو نطاقًا أسرع، أو أضف محطات، أو اختر أجهزة تنتج بيانات أقل.',

  'fault.computer_overloaded.title': 'الحاسوب لم يلحق',
  'fault.computer_overloaded.what': 'أنتجت الأجهزة {dataGenerated} غيغابت يوميًا. الحاسوب يعالج {computerGb} غيغابت يوميًا.',
  'fault.computer_overloaded.why': 'كل بت من الأجهزة يمر عبر الحاسوب قبل تخزينه أو إرساله.',
  'fault.computer_overloaded.fix': 'ركّب حاسوبًا أسرع أو أنتج بيانات أقل.',

  'fault.storage_overflow.title': 'امتلأ مسجّل البيانات',
  'fault.storage_overflow.what': 'بين فترات الاتصال كان على المركبة حفظ بيانات أكثر مما يسعه مسجّلها ({storageGb} غيغابت). فمُسحت البيانات القديمة.',
  'fault.storage_overflow.why': 'تخزّن المركبة البيانات حين لا تكون أي محطة في مجال الرؤية، ثم ترسلها في الاتصال التالي.',
  'fault.storage_overflow.fix': 'ركّب مسجّلًا أكبر أو أضف محطات أرضية.',

  'fault.thermal_failure.title': 'أبرد من أن تعمل',
  'fault.thermal_failure.what': 'لم يتحمل نظام التحكم الحراري ظروف {orbit}. تجمدت قطع وتعطلت مبكرًا.',
  'fault.thermal_failure.why': 'الإلكترونيات تعمل في مجال حراري ضيق. بعيدًا عن الشمس أو في ليل المريخ تحتاج إلى تدفئة.',
  'fault.thermal_failure.fix': 'رقِّ التحكم الحراري: سخّانات للوجهات الباردة، ودائرة سائل فعّالة لسطح المريخ.',

  'fault.short_lifetime.title': 'انتهت المهمة مبكرًا',
  'fault.short_lifetime.what': 'صمدت المركبة {life} سنة. الهدف يحتاج {needLife}.',
  'fault.short_lifetime.why': 'مقاومة الهواء في المدار المنخفض والإشعاع والغبار كلها تقصّر عمر المهمة.',
  'fault.short_lifetime.fix': 'في المدار المنخفض أضف نظام دفع لمقاومة السحب. في الإشعاع استخدم حاسوبًا مقاومًا أو دروعًا.',

  'fault.wasted_stations.title': 'دفعتَ ثمن محطات لا تحتاجها',
  'fault.wasted_stations.what': 'القمر الثابت يبقى فوق نقطة واحدة، فتراه محطة واحدة طوال اليوم. المحطات الأخرى ({extraStations}) زادت التكلفة فقط.',
  'fault.wasted_stations.why': 'المحطات الإضافية تفيد فقط عندما تتحرك المركبة في السماء.',
  'fault.wasted_stations.fix': 'استخدم محطة واحدة للمدار الثابت.',

  'fault.irrelevant_instruments.title': 'جهاز بلا شيء يدرسه',
  'fault.irrelevant_instruments.what': 'جهاز واحد على الأقل زاد الكتلة والطاقة والتكلفة ولم يقدّم علمًا مفيدًا للهدف "{objective}".',
  'fault.irrelevant_instruments.why': 'كل جهاز يجيب عن أسئلة معينة. بعضها يعمل على السطح فقط أو يحتاج قطعة لم تكن في المركبة.',
  'fault.irrelevant_instruments.fix': 'على العالِم اختيار أجهزة تناسب الهدف والوجهة.',

  'fault.schedule_overrun.title': 'أُطلقت بعد الموعد المخطط',
  'fault.schedule_overrun.what': 'كانت المركبة جاهزة في الشهر {readyMonth}. الخطة حددت الشهر {targetMonth}.',
  'fault.schedule_overrun.why': 'القطع المعقدة تحتاج وقتًا أطول للبناء، وأبطأ قطعة تحدد إيقاع المهمة كلها.',
  'fault.schedule_overrun.fix': 'على المخطِّط وضع موعد واقعي، أو استخدام الوضع السريع، أو طلب قطع أبسط.',

  'fault.missed_mars_window.title': 'فاتت نافذة الإطلاق إلى المريخ',
  'fault.missed_mars_window.what': 'انتظرت المركبة {waitMonths} شهرًا حتى النافذة التالية. كلّف انتظار الفريق ${waitCost} مليون.',
  'fault.missed_mars_window.why': 'تصطفّ الأرض والمريخ لرحلة اقتصادية مرة واحدة كل 26 شهرًا.',
  'fault.missed_mars_window.fix': 'على المخطِّط ضبط وقت التطوير لينتهي قبل النافذة مباشرة.',

  'fault.unused_allocation.title': 'ميزانية بقيت بلا استخدام',
  'fault.unused_allocation.what': 'أكثر من 30% من إحدى المخصصات لم يُنفق.',
  'fault.unused_allocation.why': 'المال المجمّد عند فريق كان يمكن أن يشتري هامشًا أو علمًا أو تغطية عند فريق آخر.',
  'fault.unused_allocation.fix': 'على المخطِّط الاحتفاظ باحتياطي وتوزيع المال عند طلب الفرق.',
}
