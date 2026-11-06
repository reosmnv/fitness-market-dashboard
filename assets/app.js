/* Конкуренты рядом с нашими клубами. Одна страница, данные из data/data.json. */
(function () {
  'use strict';
  var D = null;
  var F = { city: '', chain: '', our: '' };
  var PF = { type: '', source: '', our: '' };
  var EV = { our: '', kind: '' };
  var TGF = { our: '', kind: '' };
  var TK = { opening: 'opened', presale: 'presale', announced: 'announced', closing: 'closed' };
  var CF = { status: '', q: '' };
  var $ = function (id) { return document.getElementById(id); };
  var KIND = {
    presale: { label: 'Предпродажа', mark: 'presale' },
    announced: { label: 'Анонс', mark: 'announced' },
    opened: { label: 'Открылся', mark: 'opened' },
    closed: { label: 'Закрыт', mark: 'closed' }
  };
  var ST = { announced: 'Анонс', presale: 'Предпродажа', open: 'Работает', closed: 'Закрыт' };
  var SEG = { low: 'массовый сегмент', mid: 'средний сегмент', premium: 'премиум' };
  var PN = { yandex: 'Яндекс Карты', '2gis': '2ГИС', otzovik: 'Отзовик', irecommend: 'irecommend' };

  /* ---------- подсказки: как считаем / зачем нам / как читать ---------- */
  var HELP = {
    threats: ['Берём списки клубов с сайтов 8 сетей и посты их Telegram-каналов. Событием считаем анонс, предпродажу, открытие за последние 60 дней и закрытие. Для каждого события ищем наш ближайший клуб по пешему маршруту.',
      'Новый клуб конкурента рядом забирает прежде всего новых клиентов и тех, у кого заканчивается карта. Предпродажа идёт до открытия, это время на ответ.',
      'Сводка считает наши клубы, у которых событие ближе 15 минут пешком. Их стоит разобрать первыми.'],
    ladder: ['Строка это наш клуб World Class (значок WC стоит на нуле), точки на линии это клубы конкурентов, для которых этот наш клуб ближайший. По горизонтали пешие минуты по улицам (OpenStreetMap, сервис Valhalla, около 5 км/ч). Показаны события до 60 минут.',
      'Сразу видно, какие наши клубы окружены и насколько плотно.',
      'Чем короче линия от WC до точки, тем ближе конкурент. Красноватая зона до 15 минут: та же аудитория, разбирать в первую очередь. Серая 15–30: частичное пересечение. Наведите на точку или выберите её клавишей Tab, чтобы увидеть клуб, дату и расстояние.'],
    states: ['Анонс: «скоро открытие», стройка или будущая дата открытия на сайте сети (у DDX также клубы, скрытые в интерфейсе, но уже есть в данных). Предпродажа: слово «предпродажа» на странице клуба или пост об этом в канале. Открылся: дата открытия за 60 дней. Закрыт: прямая отметка на сайте.',
      'Этап показывает, сколько времени осталось на ответ.',
      'Цвет всегда продублирован формой и подписью: круг, кольцо, квадрат, перечёркнутый квадрат.'],
    walk: ['Пеший маршрут по улицам до ближайшего нашего клуба. Кандидаты: 5 наших клубов, ближайших по прямой. Км это длина маршрута; если маршрута нет (дальше 25 км), расстояние по прямой.',
      'Клиент выбирает зал по удобству дороги, а не по прямой на карте.',
      'Если км мало, а минут много, между клубами река или промзона. Для клиента это разные районы.'],
    tg: ['Посты официальных каналов сетей за 60 дней. Модель (GPT) отбирает посты об открытиях, предпродажах и закрытиях и достаёт клуб и даты.',
      'Сети часто объявляют в Telegram раньше, чем обновляют сайт.',
      'Это сигнал, а не подтверждение. Если клуб нашёлся на сайте, его статус уже учтён выше.'],
    changes: ['Сравниваем статусы клубов с прошлым сбором: новый клуб, смена статуса, пропал с сайта.',
      'Это недельная лента новостей о конкурентах.',
      'Показывает новые клубы, смену статуса и клубы, пропавшие с сайта, между двумя последними сборами.'],
    promos: ['Страницы акций на сайтах сетей и посты Telegram за 60 дней. Истёкшие по дате убраны. Акции на всю сеть отнесены ко всем её городам из нашей географии.',
      'Видно, кто и чем атакует: глубина скидок, подарки, переход от другого клуба.',
      'Ищите повторы: если несколько сетей одновременно дают одну механику, это уже норма рынка, а не акция.'],
    ptype: ['Тип определяется по ключевым словам текста или моделью при разборе Telegram. Нажмите на строку, чтобы оставить в списке только этот тип.',
      'Позволяет сравнивать механики, а не формулировки.',
      'Метка автоматическая и может ошибаться. Решение принимайте по тексту условий.'],
    chains: ['Сведения с сайтов сетей и из СМИ (РБК, Ведомости, retail.ru и др.), каждое с датой и ссылкой. Собраны моделью GPT, выборочно перепроверены. Число клубов в нашей географии посчитано по текущему сбору.',
      'Понять, как устроен конкурент: модель продаж, условия выхода, динамика, финансовое давление.',
      '«Нет данных» означает, что надёжного источника не нашлось. Это не то же самое, что «нет».'],
    reviews: ['Отзывы за 12 месяцев с Яндекс Карт и irecommend, до 80 на сеть по клубам нашей географии. Модель выделяет темы, каждая цитата проверена: она дословно есть в собранных отзывах. 2ГИС и Отзовик на момент сбора были недоступны.',
      'Слабые места конкурента подсказывают, что подчеркнуть в нашей рекламе. Сильные показывают, где нам подтянуться.',
      '«10 из 80»: тему упоминают 10 отзывов выборки. Это ориентир, а не доля всех клиентов: выборка небольшая и в основном московская.'],
    season: ['Месячная динамика продаж клубных карт и посещаемости по исследованиям НФС и сроки налогового вычета по ФНС. Только пункты с первоисточником.',
      'Планировать кампании под реальные пики и спады.',
      'База сравнения в источниках разная (к прошлому месяцу или к прошлому году), смотрите формулировку. Месяц без данных помечен.'],
    sources: ['Сколько записей пришло из каждого источника при последнем сборе.',
      'Контроль полноты: если у сети вдруг 0 клубов, скорее сломался сбор, а не закрылась сеть.',
      'Сравнивайте с прошлым сбором. Резкий провал сначала проверьте на сайте сети.']
  };
  function info(k) { return HELP[k] ? '<button type="button" class="info" data-help="' + k + '" aria-label="Как это считается">i</button>' : ''; }

  /* ---------- утилиты ---------- */
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function fmtDate(s) {
    if (!s) return '';
    var p = String(s).slice(0, 10).split('-');
    return p.length === 3 ? p[2] + '.' + p[1] + '.' + p[0] : esc(s);
  }
  function km(x) { return String(x).replace('.', ','); }
  var WCP = 'M9.71191 1.70435V21.7961H11.0508L11.1592 21.4436L17.2539 1.70435H24.2656L24.1934 21.2942L24.1924 21.7961H25.5273L25.6387 21.4504L32.0264 1.70435H38.1689L25.8115 40.2952H19.1299L18.7188 18.1086L18.71 17.6174H17.3809L17.2725 17.969L10.3389 40.2952H3.64453V1.70435H9.71191Z';
  var WCSVG = '<svg class="wcg" viewBox="0 0 42 42" aria-hidden="true"><path d="' + WCP + '"/></svg>';
  function chainName(id) { return D.meta.chains[id] || id; }
  /* Фирменные цвета сетей: самый частый насыщенный цвет в CSS их сайтов (сбор 06.11.2026), приблизительно. */
  var CC = { ddx: '#ff7d20', spirit: '#7827f6', xfit: '#36b647', cccp: '#c9a23f', ufc: '#d20a0a', terfit: '#cf132c', crocus: '#e31f26', encore: '#282929' };
  function textOn(hex) { var n = parseInt(hex.slice(1), 16), c = [n >> 16, (n >> 8) & 255, n & 255].map(function (v) { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); var L = 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; return (L + 0.05) / 0.05 > 1.05 / (L + 0.05) ? '#121212' : '#ffffff'; }
  function cvar(id) { var c = CC[id] || '#5a5a5a'; return '--c:' + c + ';--ct:' + textOn(c); }
  function badge(id) { return '<span class="cb" style="' + cvar(id) + '">' + esc(chainName(id)) + '</span>'; }
  var REFRESH = '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M21 12a9 9 0 0 1-15.5 6.2M3 12a9 9 0 0 1 15.5-6.2M18.5 2v4h-4M5.5 22v-4h4"/></svg>';
  var UP = '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 10v11M15 5.9 14 10h5.8a2 2 0 0 1 1.9 2.6l-2.3 8a2 2 0 0 1-1.9 1.4H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.8a2 2 0 0 0 1.8-1.1L12 2a3.1 3.1 0 0 1 3 3.9Z"/></svg>';
  var DOWN = '<svg class="ico ico--down" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 10v11M15 5.9 14 10h5.8a2 2 0 0 1 1.9 2.6l-2.3 8a2 2 0 0 1-1.9 1.4H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.8a2 2 0 0 0 1.8-1.1L12 2a3.1 3.1 0 0 1 3 3.9Z"/></svg>';
  /* Единая полоса «живых» цифр: подпись сверху, крупное число под ней. Пересчитывается по фильтрам и при каждом сборе. */
  function kpis(items) {
    return '<div class="kpis" role="group" aria-label="Ключевые цифры">' + items.map(function (i) {
      return '<div class="kpi"><div class="kpi__l">' + (i.k ? mark(i.k) : '') + i.l + '</div><div class="kpi__n">' + i.n + '</div>' + (i.s ? '<div class="kpi__s">' + i.s + '</div>' : '') + '</div>';
    }).join('') + '<div class="kpi kpi--live">' + REFRESH + '<span>Цифры пересчитываются при каждом сборе и при смене фильтров</span></div></div>';
  }
  var SHORT = { ddx: 'DDX', spirit: 'Spirit', xfit: 'XFIT', cccp: 'С.С.С.Р.', ufc: 'UFC GYM', terfit: 'Территория Фитнеса', crocus: 'Crocus', encore: 'Encore' };
  function clubLabel(c) { var s = SHORT[c.chain] || ''; var n = c.name.replace(/^CF\s+/, 'Crocus '); return n.toLowerCase().indexOf(s.toLowerCase().slice(0, 4)) === 0 ? n : s + ' ' + n; }
  function regName(id) { return D.meta.regions[id] || id; }
  function link(u, t) { return u ? '<a href="' + esc(u) + '" target="_blank" rel="noopener">' + esc(t || 'источник') + '</a>' : ''; }
  function mark(k) { return '<span class="mark mark--' + KIND[k].mark + '" aria-hidden="true"></span>'; }
  function state(k) { return '<span class="state">' + mark(k) + KIND[k].label + '</span>'; }
  function empty(t) { return '<p class="empty">' + t + '</p>'; }
  function word(n, a, b, c) { var m = n % 10, h = n % 100; return m === 1 && h !== 11 ? a : m >= 2 && m <= 4 && (h < 12 || h > 14) ? b : c; }
  function plural(n, a, b, c) { return n + ' ' + word(n, a, b, c); }
  function cite(s) {
    return esc(s).replace(/\[([^\[\]]*?https?:\/\/[^\[\]]*?)\]/g, function (m, inner) {
      var date = (inner.match(/\d{4}-\d{2}-\d{2}/) || [''])[0];
      var urls = inner.match(/https?:\/\/[^\s;,]+/g) || [];
      return ' <span class="cite">(' + urls.map(function (u) {
        return '<a href="' + u + '" target="_blank" rel="noopener">' + u.replace(/^https?:\/\/(www\.)?/, '').split('/')[0] + '</a>';
      }).join(', ') + (date ? ', ' + fmtDate(date) : '') + ')</span>';
    });
  }
  function ourById(id) { for (var i = 0; i < D.ours.length; i++) if (D.ours[i].id === id) return D.ours[i]; return null; }
  function walkOf(c) { var n = c.nearest; if (!n) return 1e9; return n.walkMin != null ? n.walkMin : n.km * 12; }
  function distHTML(n) {
    if (!n) return '<b>?</b><small>нет координат</small>';
    var k = n.walkKm != null ? n.walkKm : n.km;
    return n.walkMin != null ? '<b>' + n.walkMin + ' мин</b><small>' + km(k) + ' км</small>' : '<b>' + km(n.km) + ' км</b><small>по прямой</small>';
  }
  function passClub(c) {
    return (!F.city || c.city === F.city) && (!F.chain || c.chain === F.chain) && (!F.our || (c.nearest && c.nearest.our === F.our));
  }

  /* ---------- события ---------- */
  function events() {
    var since = new Date(D.meta.generatedAt); since.setDate(since.getDate() - 60);
    var s60 = since.toISOString().slice(0, 10);
    var out = [];
    D.clubs.forEach(function (c) {
      var k = null;
      if (c.status === 'presale') k = 'presale';
      else if (c.status === 'announced') k = 'announced';
      else if (c.status === 'closed') k = 'closed';
      else if (c.status === 'open' && c.openDate && c.openDate >= s60 && c.openDate <= D.meta.generatedAt) k = 'opened';
      if (k && passClub(c)) out.push({ c: c, k: k, w: walkOf(c) });
    });
    return out.sort(function (a, b) { return a.w - b.w; });
  }

  /* ---------- 1. Угрозы ---------- */
  function renderThreats() {
    var ev = events();
    var byOur = {};
    ev.forEach(function (e) { if (e.c.nearest) (byOur[e.c.nearest.our] = byOur[e.c.nearest.our] || []).push(e); });
    var hot = Object.keys(byOur).filter(function (id) { return byOur[id].some(function (e) { return e.w <= 15; }); });
    var cnt = { presale: 0, announced: 0, opened: 0, closed: 0 };
    ev.forEach(function (e) { cnt[e.k]++; });
    var h = '<h2 id="hThreats" class="headline">';
    h += hot.length ? '<span class="hl num">' + hot.length + '</span> ' + word(hot.length, 'наш клуб', 'наших клуба', 'наших клубов') + ' в 15 минутах пешком от нового или закрытого клуба конкурента'
      : 'Ни один наш клуб не находится в 15 минутах пешком от нового клуба конкурента';
    h += info('threats') + '</h2>';
    h += kpis([{ k: 'presale', l: 'В предпродаже', n: cnt.presale, s: word(cnt.presale, 'клуб', 'клуба', 'клубов') }, { k: 'announced', l: 'В анонсе', n: cnt.announced, s: word(cnt.announced, 'клуб', 'клуба', 'клубов') },
      { k: 'opened', l: 'Открылись', n: cnt.opened, s: word(cnt.opened, 'клуб', 'клуба', 'клубов') + ' за 60 дней' }, { k: 'closed', l: 'Закрыты', n: cnt.closed, s: word(cnt.closed, 'клуб', 'клуба', 'клубов') }]);
    h += '<div class="legend" role="list">' + ['presale', 'announced', 'opened', 'closed'].map(function (k) { return '<span role="listitem">' + mark(k) + KIND[k].label + '</span>'; }).join('') + info('states') + '</div>';
    h += ladder(byOur, ev);
    h += '<h3 style="margin-top:28px">События до 30 минут пешком' + info('walk') + '</h3><div id="evBlock"></div>';
    h += '<h3 style="margin-top:28px">Сигналы из Telegram-каналов сетей' + info('tg') + '</h3><div id="tgBlock"></div>';
    if (D.meta.hasHistory) h += '<p class="note" style="margin-top:14px">' + (D.changes.length ? 'С прошлого сбора изменилось статусов: ' + D.changes.length + '.' : 'С прошлого сбора статусы не менялись.') + info('changes') + '</p>';
    $('threats').innerHTML = h;
    renderEvBlock(); renderTgBlock();
  }

  /* ---------- ленты с фильтрами: клуб + вид, 10 строк, остальное в прокрутке ---------- */
  function nice(s) { return String(s || '').replace(/(\d{4})-(\d{2})-(\d{2})/g, '$3.$2.$1'); }
  function trimAddr(s) { return String(s || '').replace(/[,\s]+$/, ''); }
  function chipsHTML(f, items, cur) {
    return '<div class="chips" role="group" aria-label="Вид события">' + items.map(function (i) {
      return '<button type="button" class="chipbtn" data-f="' + f + '" data-v="' + i.v + '" aria-pressed="' + (cur === i.v) + '">' + (i.v ? mark(i.v) : '') + esc(i.l) + ' <span class="cn">' + i.n + '</span></button>';
    }).join('') + '</div>';
  }
  function ourSelect(id, cur, counts) {
    var ids = D.ours.filter(function (o) { return counts[o.id] || o.id === cur; }).sort(function (a, b) { return a.address > b.address ? 1 : -1; });
    return '<select id="' + id + '"><option value="">все клубы</option>' + ids.map(function (o) {
      return '<option value="' + o.id + '"' + (o.id === cur ? ' selected' : '') + '>' + esc(o.address) + ' (' + (counts[o.id] || 0) + ')</option>';
    }).join('') + '</select>';
  }
  function kindChips(f, cKind, tot, cur) {
    return chipsHTML(f, [{ v: '', l: 'Все', n: tot }].concat(['presale', 'announced', 'opened', 'closed'].map(function (k) { return { v: k, l: KIND[k].label, n: cKind[k] || 0 }; })), cur);
  }
  function evCard(e) {
    var c = e.c, o = ourById(c.nearest.our);
    return '<li class="club"><div><div class="club__name">' + esc(o.address) + '</div><div class="club__city">' + esc(regName(o.city)) + '</div></div><ul class="threats"><li class="threat' + (e.w <= 15 ? ' near' : '') + '"><div class="threat__dist">' + distHTML(c.nearest) + '</div><div class="threat__what">' +
      state(e.k) + ' ' + badge(c.chain) + ' <b>' + esc(c.name) + '</b>' + (c.openDate && e.k !== 'closed' ? ', открытие ' + fmtDate(c.openDate) : '') +
      '<div class="meta">' + esc(trimAddr(c.address)) + '. ' + esc(nice(c.statusNote)) + '. ' + link(c.url, 'Сайт сети') + (c.tg ? ', ' + link(c.tg, 'пост') : '') + '</div></div></li></ul></li>';
  }
  function renderEvBlock() {
    var box = $('evBlock'); if (!box) return;
    var all = events().filter(function (e) { return e.w <= 30 && e.c.nearest; });
    var okOur = function (e) { return !EV.our || e.c.nearest.our === EV.our; }, okKind = function (e) { return !EV.kind || e.k === EV.kind; };
    var cOur = {}; all.filter(okKind).forEach(function (e) { cOur[e.c.nearest.our] = (cOur[e.c.nearest.our] || 0) + 1; });
    var cKind = {}, byOurList = all.filter(okOur); byOurList.forEach(function (e) { cKind[e.k] = (cKind[e.k] || 0) + 1; });
    var list = byOurList.filter(okKind);
    var h = '<div class="tools"><label for="eOur">Наш клуб</label>' + ourSelect('eOur', EV.our, cOur) + kindChips('ev', cKind, byOurList.length, EV.kind) + '<span class="muted small">В списке: ' + list.length + '</span></div>';
    h += list.length ? '<ul class="answer feed" data-limit="10" aria-label="Список событий">' + list.map(evCard).join('') + '</ul>' : empty('По выбранным фильтрам событий нет.');
    var far = events().filter(function (e) { return e.w > 30; }).length;
    if (far) h += '<p class="note" style="margin-top:12px">Ещё ' + plural(far, 'событие', 'события', 'событий') + ' дальше 30 минут пешком: полный список в разделе <a href="#all">«Все данные»</a>.</p>';
    box.innerHTML = h; limitFeeds(box);
  }
  function tgOur(t) {
    if (!t.matched) return null;
    for (var i = 0; i < D.clubs.length; i++) { var x = D.clubs[i]; if (x.chain === t.chain && x.name === t.matched) return x; }
    return null;
  }
  function renderTgBlock() {
    var box = $('tgBlock'); if (!box) return;
    var all = (D.tgEvents || []).filter(function (t) { return (!F.chain || t.chain === F.chain) && (!F.city || (t.cities || []).indexOf(F.city) >= 0); })
      .map(function (t) { var c = tgOur(t); return { t: t, k: TK[t.kind], c: c, our: c && c.nearest ? c.nearest.our : null }; });
    var okOur = function (x) { return !TGF.our || x.our === TGF.our; }, okKind = function (x) { return !TGF.kind || x.k === TGF.kind; };
    var cOur = {}; all.filter(okKind).forEach(function (x) { if (x.our) cOur[x.our] = (cOur[x.our] || 0) + 1; });
    var cKind = {}, byOurList = all.filter(okOur); byOurList.forEach(function (x) { cKind[x.k] = (cKind[x.k] || 0) + 1; });
    var list = byOurList.filter(okKind);
    var h = '<div class="tools"><label for="tOur">Наш клуб</label>' + ourSelect('tOur', TGF.our, cOur) + kindChips('tg', cKind, byOurList.length, TGF.kind) + '<span class="muted small">В списке: ' + list.length + '</span></div>';
    h += list.length ? '<ul class="threats feed" data-limit="10" aria-label="Список постов">' + list.map(function (x) {
      var t = x.t, n = x.c && x.c.nearest;
      return '<li class="threat"><div class="threat__dist"><small>' + fmtDate(t.date) + '</small></div><div class="threat__what">' + state(x.k) + ' ' + badge(t.chain) + ' ' + esc(t.title || '') +
        '<div class="meta">' + (x.c ? 'Сверено с сайтом: ' + esc(t.matched) + (n ? '. Ближайший наш клуб: ' + esc(n.ourAddress) + (n.walkMin != null ? ', ' + n.walkMin + ' мин пешком' : '') : '') + '. ' : 'На сайте сети пока не найден. ') + link(t.post, 'Пост') + '</div></div></li>';
    }).join('') + '</ul>' : empty('По выбранным фильтрам постов нет.');
    box.innerHTML = h; limitFeeds(box);
  }
  /* показываем 10 строк, остальные доступны прокруткой внутри списка */
  function limitFeeds(root) {
    (root || document).querySelectorAll('.feed[data-limit]').forEach(function (f) {
      var n = +f.getAttribute('data-limit');
      f.style.maxHeight = ''; f.classList.remove('feed--scroll'); f.removeAttribute('tabindex');
      var cap = f.nextElementSibling; if (cap && cap.classList.contains('feed-cap')) cap.remove();
      var it = f.children; if (it.length <= n) return;
      f.classList.add('feed--scroll'); f.setAttribute('tabindex', '0');
      var gap = parseFloat(getComputedStyle(f).rowGap) || 0;
      var bw = f.offsetHeight - f.clientHeight;
      f.style.maxHeight = (it[n].offsetTop - it[0].offsetTop - gap + bw) + 'px';
      f.insertAdjacentHTML('afterend', '<p class="feed-cap note">Показано ' + n + ' из ' + it.length + '. Остальные ниже: прокрутите список.</p>');
    });
  }

  function ladder(byOur, ev) {
    var MAX = 60;
    var ok = function (e) { return e.c.nearest && e.c.nearest.walkMin != null && e.c.nearest.walkMin <= MAX; };
    var ids = Object.keys(byOur).filter(function (id) { return byOur[id].some(ok); })
      .sort(function (a, b) { return byOur[a][0].w - byOur[b][0].w; });
    if (!ids.length) return empty('По выбранным фильтрам событий ближе часа пешком нет.');
    var W = 1000, L = 230, P0 = L + 34, R = 16, T = 50, CW = 6.4;
    var x = function (m) { return P0 + (W - P0 - R) * Math.min(m, MAX) / MAX; };
    // раскладка подписей по двум дорожкам: над линией и под ней
    var rows = ids.map(function (id) {
      var list = byOur[id].filter(ok).slice().sort(function (a, b) { return a.c.nearest.walkMin - b.c.nearest.walkMin; });
      var lanes = [-1e9, -1e9], labels = [];
      list.forEach(function (e) {
        var text = clubLabel(e.c), cx = x(e.c.nearest.walkMin);
        var w = (String(e.c.nearest.walkMin).length + 5 + text.length) * CW;
        var right = cx + 12 + w > W - 4, x0 = right ? cx - 12 - w : cx + 12, x1 = right ? cx - 12 : cx + 12 + w;
        var lane = x0 > lanes[0] + 8 ? 0 : (x0 > lanes[1] + 8 ? 1 : -1);
        if (lane >= 0) lanes[lane] = x1;
        labels.push({ e: e, cx: cx, text: text, right: right, lane: lane });
      });
      var two = labels.some(function (l) { return l.lane === 1; });
      return { id: id, labels: labels, h: two ? 58 : 44 };
    });
    var H = T + rows.reduce(function (s, r) { return s + r.h; }, 0) + 34;
    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Наши клубы World Class и пешие минуты до клубов конкурентов. Подробности в списке ниже.">';
    // зоны и шапка
    s += '<rect class="zone" x="' + x(0) + '" y="' + (T - 10) + '" width="' + (x(15) - x(0)) + '" height="' + (H - T - 24) + '"/>';
    s += '<rect class="zone2" x="' + x(15) + '" y="' + (T - 10) + '" width="' + (x(30) - x(15)) + '" height="' + (H - T - 24) + '"/>';
    s += '<text class="band-label" x="' + (x(0) + 6) + '" y="14">до 15 мин: та же аудитория</text>';
    s += '<text class="band-label" x="' + (x(15) + 6) + '" y="14">15–30: пересечение</text>';
    s += '<text class="band-label" x="' + (x(30) + 6) + '" y="14">30–60: соседний район</text>';
    [0, 15, 30, 45, 60].forEach(function (m) {
      s += '<line class="grid" x1="' + x(m) + '" x2="' + x(m) + '" y1="' + (T - 10) + '" y2="' + (H - 34) + '"/>';
      s += '<text class="tick" x="' + x(m) + '" y="' + (T - 16) + '" text-anchor="middle">' + m + '</text>';
      s += '<text class="tick" x="' + x(m) + '" y="' + (H - 20) + '" text-anchor="middle">' + m + '</text>';
    });
    s += '<text class="axis-title" x="' + (W - R) + '" y="' + (H - 4) + '" text-anchor="end">минут пешком от нашего клуба →</text>';
    var shape = function (k, cx, cy) {
      var col = 'var(--s-' + k + ')';
      if (k === 'presale') return '<circle cx="' + cx + '" cy="' + cy + '" r="7" fill="' + col + '" stroke="var(--surface)" stroke-width="2"/>';
      if (k === 'announced') return '<circle cx="' + cx + '" cy="' + cy + '" r="6" fill="var(--surface)" stroke="' + col + '" stroke-width="3"/>';
      if (k === 'opened') return '<rect x="' + (cx - 6.5) + '" y="' + (cy - 6.5) + '" width="13" height="13" rx="2" fill="' + col + '" stroke="var(--surface)" stroke-width="2"/>';
      return '<rect x="' + (cx - 6) + '" y="' + (cy - 6) + '" width="12" height="12" rx="2" fill="var(--surface)" stroke="' + col + '" stroke-width="2"/><line x1="' + (cx - 6) + '" y1="' + (cy + 6) + '" x2="' + (cx + 6) + '" y2="' + (cy - 6) + '" stroke="' + col + '" stroke-width="2"/>';
    };
    var y0 = T;
    rows.forEach(function (row, i) {
      var o = ourById(row.id), y = y0 + 24;
      if (i) s += '<line class="rowsep" x1="0" x2="' + W + '" y1="' + y0 + '" y2="' + y0 + '"/>';
      var lab = o.address.length > 30 ? o.address.slice(0, 29) + '…' : o.address;
      s += '<text class="row-label' + (F.our === row.id ? ' is-sel' : '') + '" x="' + (L - 4) + '" y="' + (y - 1) + '" text-anchor="end"><title>' + esc(o.address) + '</title>' + esc(lab) + '</text>';
      s += '<text class="row-sub" x="' + (L - 4) + '" y="' + (y + 13) + '" text-anchor="end">' + esc(regName(o.city)) + '</text>';
      var far = row.labels[row.labels.length - 1].cx;
      s += '<line class="ruler" x1="' + x(0) + '" x2="' + far + '" y1="' + y + '" y2="' + y + '"/>';
      s += '<g aria-hidden="true"><rect class="our-box" x="' + (x(0) - 13) + '" y="' + (y - 9) + '" width="26" height="18" rx="4"/><svg class="our-glyph" x="' + (x(0) - 8) + '" y="' + (y - 8) + '" width="16" height="16" viewBox="0 0 42 42"><path d="' + WCP + '"/></svg></g>';
      row.labels.slice().reverse().forEach(function (l) {
        var c = l.e.c;
        var tip = esc(KIND[l.e.k].label + ': ' + c.name + ' (' + chainName(c.chain) + ')') + '|' + esc(c.address || '') + '|' + c.nearest.walkMin + ' мин пешком, ' + km(c.nearest.walkKm != null ? c.nearest.walkKm : c.nearest.km) + ' км от нашего клуба ' + esc(o.address) + (c.openDate ? '|Открытие ' + fmtDate(c.openDate) : '');
        s += '<g class="dot" tabindex="0" role="img" data-tip="' + tip + '" aria-label="' + tip.replace(/\|/g, '. ') + '">' + shape(l.e.k, l.cx, y) + '<circle class="hit" cx="' + l.cx + '" cy="' + y + '" r="12" fill="transparent"/></g>';
      });
      row.labels.forEach(function (l) {
        if (l.lane < 0) return;
        var ly = l.lane === 0 ? y - 11 : y + 21;
        s += '<text class="dlabel" x="' + (l.right ? l.cx - 12 : l.cx + 12) + '" y="' + ly + '"' + (l.right ? ' text-anchor="end"' : '') + '><tspan class="m">' + l.e.c.nearest.walkMin + ' мин</tspan> ' + esc(l.text) + '</text>';
      });
      y0 += row.h;
    });
    s += '</svg>';
    var beyond = ev.filter(function (e) { return !ok(e); }).length;
    var howto = '<div class="howto"><span><span class="wc" aria-hidden="true">' + WCSVG + '</span>наш клуб World Class, отсчёт от 0 минут</span>' +
      '<span><span class="arrow" aria-hidden="true"></span>клубы конкурентов: чем правее, тем дальше идти пешком</span>' +
      '<span><span class="swatch" aria-hidden="true"></span>до 15 минут</span><span><span class="swatch swatch--2" aria-hidden="true"></span>15–30 минут</span></div>';
    return '<div class="ladder"><h3 style="font-size:.95rem;margin:0 0 6px">Наши клубы и пешие минуты до клубов конкурентов' + info('ladder') + '</h3>' + howto + s + '</div>' +
      (beyond ? '<p class="note" style="margin-top:6px">Дальше часа пешком или без координат: ' + plural(beyond, 'событие', 'события', 'событий') + '. Они в списке ниже и в разделе «Все данные».</p>' : '');
  }

  /* ---------- 2. Акции ---------- */
  function renderPromos() {
    var base = D.promos.filter(function (p) { return (!F.city || p.cities.indexOf(F.city) >= 0) && (!F.chain || p.chain === F.chain); });
    var byType = {}; base.forEach(function (p) { byType[p.type] = (byType[p.type] || 0) + 1; });
    var types = Object.keys(byType).sort(function (a, b) { return byType[b] - byType[a] || (a > b ? 1 : -1); });
    var max = Math.max.apply(null, types.map(function (t) { return byType[t]; }).concat([1]));
    var ourCity = PF.our ? (ourById(PF.our) || {}).city : '';
    var list = base.filter(function (p) { return (!PF.type || p.type === PF.type) && (!PF.source || p.source === PF.source) && (!ourCity || p.cities.indexOf(ourCity) >= 0); });
    var chains = {}; base.forEach(function (p) { chains[p.chain] = 1; });
    var h = '<h2 id="hPromos">Акции конкурентов' + info('promos') + '</h2>';
    h += kpis([{ l: 'Действующих акций', n: base.length, s: 'с сайтов и Telegram' }, { l: 'Сетей с акциями', n: Object.keys(chains).length, s: 'из 8 в нашей географии' },
      { l: 'Чаще всего', n: types[0] ? byType[types[0]] : 0, s: types[0] ? 'механика «' + esc(types[0]) + '»' : 'нет данных' }]);
    h += '<div class="split"><div><h3 style="margin-bottom:10px;font-size:.92rem">Механики' + info('ptype') + '</h3><ul class="bars">' + types.map(function (t) {
      return '<li><button type="button" data-type="' + esc(t) + '" aria-pressed="' + (PF.type === t) + '"><span>' + esc(t) + '</span><span class="track"><span class="fill" style="width:' + (100 * byType[t] / max) + '%"></span></span><span class="n">' + byType[t] + '</span></button></li>';
    }).join('') + '</ul>' + (PF.type ? '<p style="margin-top:10px"><button type="button" class="linkbtn" id="pAll">Показать все механики</button></p>' : '') + '</div><div>';
    h += '<div class="promo-tools"><label for="pOur">Наш клуб</label><select id="pOur"><option value="">все клубы</option>' + D.ours.slice().sort(function (a, b) { return a.address > b.address ? 1 : -1; }).map(function (o) { return '<option value="' + o.id + '"' + (PF.our === o.id ? ' selected' : '') + '>' + esc(o.address) + ' (' + esc(regName(o.city)) + ')</option>'; }).join('') + '</select><label for="pSrc">Источник</label><select id="pSrc"><option value="">сайт и Telegram</option><option value="site"' + (PF.source === 'site' ? ' selected' : '') + '>только сайт</option><option value="telegram"' + (PF.source === 'telegram' ? ' selected' : '') + '>только Telegram</option></select><span>В списке: ' + list.length + '</span></div>';
    h += list.length ? '<ul class="promos feed" data-limit="10" aria-label="Список акций">' + list.map(function (p, i) {
      var long = (p.mechanic || '').length > 220;
      return '<li class="promo" id="pr' + i + '" style="' + cvar(p.chain) + '">' + (p.image ? '<img class="promo__img" loading="lazy" referrerpolicy="no-referrer" src="' + esc(p.image) + '" alt="" onerror="this.outerHTML=\'<span class=&quot;promo__noimg&quot; aria-hidden=&quot;true&quot;></span>\'">' : '<span class="promo__noimg" aria-hidden="true"></span>') +
        '<div><div class="promo__head">' + badge(p.chain) + '<span class="promo__title">' + esc(p.title) + '</span><span class="chip">' + esc(p.type) + '</span></div>' +
        '<div class="promo__meta">' + (p.validTo ? 'До ' + fmtDate(p.validTo) : 'Срок не указан') + '. ' + esc(p.cities.map(regName).join(', ')) + (p.club ? ', клуб ' + esc(p.club) : '') + '. ' +
        link(p.url, p.source === 'telegram' ? 'Пост в Telegram' + (p.postDate ? ' от ' + fmtDate(p.postDate) : '') : 'Страница акции') + '</div>' +
        (p.mechanic ? '<p class="promo__text">' + esc(p.mechanic) + '</p>' + (long ? '<button type="button" class="linkbtn" data-more="pr' + i + '">Показать полностью</button>' : '') : '<p class="promo__text">Условия только на баннере, текста на странице нет.</p>') + '</div></li>';
    }).join('') + '</ul>' : empty('По выбранным фильтрам акций нет.');
    h += '</div></div>';
    $('promos').innerHTML = h; limitFeeds($('promos'));
  }

  /* ---------- 3. Конкуренты ---------- */
  function renderChains() {
    var cards = (D.cards || []).filter(function (c) { return !F.chain || c.id === F.chain; });
    var h = '<h2 id="hChains">Конкуренты: кто они и что о них пишут' + info('chains') + '</h2>';
    var allMine = D.clubs.filter(passClub);
    h += kpis([{ l: 'Сетей', n: cards.length, s: 'в сравнении' }, { l: 'Клубов конкурентов', n: allMine.length, s: 'в нашей географии' },
      { l: 'В 15 минутах от нашего', n: allMine.filter(function (x) { return x.nearest && x.nearest.walkMin != null && x.nearest.walkMin <= 15; }).length, s: 'пешком' }]);
    h += '<p class="lede">Откройте строку сети: модель продаж, условия, новости и отзывы с цитатами.</p>';
    if (!cards.length) { $('chains').innerHTML = h + empty('Карточки не собраны.'); return; }
    var byCount = function (a, b) { return b.count - a.count; };
    h += '<ul class="chains">' + cards.map(function (c) {
      var mine = D.clubs.filter(function (x) { return x.chain === c.id && passClub(x); });
      var near = mine.filter(function (x) { return x.nearest && x.nearest.walkMin != null && x.nearest.walkMin <= 15; }).length;
      var reg = {}; mine.forEach(function (x) { reg[x.city] = (reg[x.city] || 0) + 1; });
      var r = (D.reviews && D.reviews.chains && D.reviews.chains[c.id]) || null;
      var posTop = r && r.positive && r.positive.slice().sort(byCount)[0];
      var negTop = r && r.negative && r.negative.slice().sort(byCount)[0];
      function say(kind, top, rv) {
        return '<div class="say say--' + kind + '"><div class="say__h">' + (kind === 'good' ? UP + 'Хвалят' : DOWN + 'Ругают') + '</div>' +
          (top ? '<div class="say__t">' + esc(top.theme) + '</div><div class="say__c">' + top.count + ' из ' + rv.sample + ' отзывов</div>' : '<div class="say__t say__t--none">нет данных</div>') + '</div>';
      }
      function row(k, v) { return v ? '<dt>' + k + '</dt><dd>' + v + '</dd>' : ''; }
      function list(a) { return (a || []).map(function (x) { return cite(typeof x === 'string' ? x : x.text); }).join('<br>'); }
      function themes(arr) {
        if (!arr || !arr.length) return '<p class="note">Нет данных</p>';
        return '<ul>' + arr.slice().sort(byCount).map(function (t) {
          var q = (t.quotes || [])[0];
          return '<li><b>' + esc(t.theme) + '</b>, ' + t.count + ' из ' + r.sample + (q ? '<span class="q">«' + esc(q.text) + '» ' + link(q.url, (PN[q.platform] || q.platform || '') + (q.date ? ', ' + fmtDate(q.date) : '')) + '</span>' : '') + '</li>';
        }).join('') + '</ul>';
      }
      var by = r ? Object.keys(r.byPlatform || {}).filter(function (k) { return r.byPlatform[k]; }).map(function (k) { return (PN[k] || k) + ' ' + r.byPlatform[k]; }).join(', ') : '';
      return '<li class="chain" style="' + cvar(c.id) + '"><details><summary>' +
        '<div><div class="chain__name">' + badge(c.id) + '</div><div class="chain__sub">' + esc(SEG[c.segment] || '') + '</div></div>' +
        '<div class="chain__col"><span class="big num">' + mine.length + '</span> ' + word(mine.length, 'клуб', 'клуба', 'клубов') + ' у нас<small>' + ['msk', 'mo', 'spb', 'sochi'].filter(function (k) { return reg[k]; }).map(function (k) { return { msk: 'Москва', mo: 'МО', spb: 'СПб', sochi: 'Сочи' }[k] + ' ' + reg[k]; }).join(', ') + (near ? '; ' + near + ' в 15 мин от нашего' : '') + '</small></div>' +
        say('good', posTop, r) + say('bad', negTop, r) +
        '<span class="chev" aria-hidden="true"></span></summary>' +
        '<div class="chain__body"><dl class="kv">' + row('Сайт', link(c.site, (c.site || '').replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')) + (c.telegram ? ', ' + link(c.telegram, 'Telegram') : '')) +
        row('Всего по сети', cite(c.clubs)) + row('Модель продаж', cite(c.model)) + row('Заморозка', cite(c.freeze)) + row('Выход из договора', cite(c.exit)) + row('Форматы', cite(c.formats)) +
        row('На чём конкурирует', cite(c.competes)) + row('Динамика', cite(c.changes)) + row('Отчёты сети', list(c.selfReports)) + row('Признаки давления', list(c.pressure)) +
        row('Новости', (c.news || []).map(function (x) { return fmtDate(x.date) + ' ' + link(x.url, x.text); }).join('<br>')) + row('Проверено', fmtDate(c.checkedAt)) + '</dl>' +
        '<div class="rev">' + (r && r.sample ? '<p class="note" style="margin-bottom:10px">Отзывы' + info('reviews') + ': выборка ' + r.sample + ' за 12 месяцев (' + esc(by) + ')' + (r.avgRating != null ? ', средняя оценка ' + km(r.avgRating) : '') + '.</p><h3 class="rv rv--good">' + UP + 'Хвалят</h3>' + themes(r.positive) + '<h3 class="rv rv--bad">' + DOWN + 'Ругают</h3>' + themes(r.negative) : empty('Отзывы не собраны.')) + '</div></div></details></li>';
    }).join('') + '</ul>';
    $('chains').innerHTML = h;
  }

  /* ---------- 4. Сезон ---------- */
  function renderSeason() {
    var M = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
    var now = new Date(D.meta.generatedAt).getMonth() + 1;
    var h = '<h2 id="hSeason">Что происходит на рынке по месяцам' + info('season') + '</h2><p class="lede">По исследованиям Национального фитнес-сообщества и разъяснениям ФНС. Текущий месяц отмечен линией сверху.</p>' + kpis([{ l: 'Месяцев с подтверждением', n: (D.season || []).filter(function (s) { return s.verified; }).length, s: 'из 12 по первоисточникам' }]);
    if (!D.season || !D.season.length) { $('season').innerHTML = h + empty('Календарь не собран.'); return; }
    h += '<div class="months">' + D.season.slice().sort(function (a, b) { return a.m - b.m; }).map(function (s) {
      var title = s.verified ? s.title.replace(/^[А-Яа-яё]+:\s*/, '') : 'Нет подтверждённых данных';
      return '<article class="month' + (s.m === now ? ' month--now' : '') + (s.verified ? '' : ' month--none') + '"><h3>' + M[s.m - 1] + (s.m === now ? ', сейчас' : '') + '</h3><p><b>' + esc(title) + '.</b> ' + (s.verified ? esc(s.note) : '') + '</p>' +
        (s.src || []).slice(0, 1).map(function (x) { return '<p style="margin-top:6px">' + link(x.u, 'Источник') + '</p>'; }).join('') + '</article>';
    }).join('') + '</div>';
    $('season').innerHTML = h;
  }

  /* ---------- 5. Все данные ---------- */
  function renderAll() {
    var cs = D.clubs.filter(passClub).filter(function (c) {
      return (!CF.status || c.status === CF.status) && (!CF.q || (c.name + ' ' + (c.address || '')).toLowerCase().indexOf(CF.q.toLowerCase()) >= 0);
    }).sort(function (a, b) { return walkOf(a) - walkOf(b); });
    var h = '<h2 id="hAll">Все данные и методика</h2><div class="all">';
    h += '<details id="dClubs"' + (CF.status || CF.q ? ' open' : '') + '><summary>Все клубы конкурентов <span>(' + D.clubs.length + ' в нашей географии)</span></summary>' +
      '<div class="promo-tools" style="margin-top:10px"><label for="cSt">Статус</label><select id="cSt"><option value="">любой</option>' + Object.keys(ST).map(function (k) { return '<option value="' + k + '"' + (CF.status === k ? ' selected' : '') + '>' + ST[k] + '</option>'; }).join('') + '</select>' +
      '<label for="cQ">Поиск</label><input type="search" id="cQ" value="' + esc(CF.q) + '" placeholder="название или адрес"><span>Найдено: ' + cs.length + '</span></div>' +
      '<div class="tbl"><table><thead><tr><th>Сеть</th><th>Клуб</th><th>Статус</th><th>Ближайший наш клуб</th><th class="r">Пешком</th><th class="r">Км</th><th>Источник</th></tr></thead><tbody>' +
      cs.map(function (c) {
        var n = c.nearest;
        return '<tr><td>' + badge(c.chain) + '</td><td>' + esc(c.name) + '<br><span class="note">' + esc(c.address || '') + '</span></td><td>' + esc(ST[c.status] || c.status) + (c.openDate ? '<br><span class="note">' + fmtDate(c.openDate) + '</span>' : '') + '</td><td>' + esc(n ? n.ourAddress : '') + '</td><td class="r">' + (n && n.walkMin != null ? n.walkMin + ' мин' : '') + '</td><td class="r">' + (n ? km(n.walkKm != null ? n.walkKm : n.km) : '') + '</td><td>' + link(c.url, 'сайт') + '</td></tr>';
      }).join('') + '</tbody></table></div></details>';
    h += '<details><summary>Что собрано и откуда <span>(сбор ' + fmtDate(D.meta.generatedAt) + ')</span></summary><p class="note" style="margin:10px 0">Полнота сбора по сетям' + info('sources') + '</p><div class="tbl"><table><thead><tr><th>Сеть</th><th class="r">Клубов у нас</th><th class="r">С координатами</th><th class="r">Акций с сайта</th><th class="r">Акций из Telegram</th></tr></thead><tbody>' +
      D.sources.map(function (s) { return '<tr><td>' + badge(s.chain) + '</td><td class="r">' + s.clubs + '</td><td class="r">' + s.withCoords + '</td><td class="r">' + s.promosSite + '</td><td class="r">' + s.promosTelegram + '</td></tr>'; }).join('') + '</tbody></table></div>';
    var pl = (D.reviews && D.reviews.platforms) || [];
    h += '<p class="note" style="margin:14px 0 4px">Площадки отзывов</p><div class="tbl"><table><tbody>' + pl.map(function (p) { return '<tr><td>' + esc(p.name) + '</td><td>' + esc({ ok: 'собрано', partial: 'собрано частично', blocked: 'недоступна' }[p.status] || p.status) + '</td><td class="note">' + esc(p.note) + '</td></tr>'; }).join('') + '</tbody></table></div></details>';
    h += '<details><summary>Как считается</summary><ul class="method" style="margin-top:10px">' +
      '<li>Только реальные данные: у каждой записи ссылка на источник и дата сбора. Если данных нет, блок пустой.</li>' +
      '<li>Наши клубы: ' + D.ours.length + ' адресов, координаты по OpenStreetMap. Клубы в Жуковке и Новинках определены с точностью до населённого пункта.</li>' +
      '<li>Пешие минуты и км: маршрут по улицам OpenStreetMap (Valhalla, FOSSGIS) до ближайшего из 5 наших клубов по прямой. Дальше 25 км маршрут не строится, показываем км по прямой.</li>' +
      '<li>Статусы: с сайтов сетей и из постов их каналов. Сочи считается без Сириуса.</li>' +
      '<li>Акции: только действующие в Москве, МО, СПб и Сочи. Тип механики определён автоматически.</li>' +
      '<li>Отзывы, карточки и календарь собраны моделью GPT с источниками; цитаты отзывов сверены с исходными текстами дословно.</li></ul></details>';
    h += '<details><summary>Архив</summary><p style="margin-top:8px"><a href="v1/">Версия 1 на демо-данных от 31.10.2026</a></p></details></div>';
    $('all').innerHTML = h;
  }

  /* ---------- каркас ---------- */
  function renderAllBlocks() {
    renderThreats(); renderPromos(); renderChains(); renderSeason(); renderAll();
    var q = new URLSearchParams(); ['city', 'chain', 'our'].forEach(function (k) { if (F[k]) q.set(k, F[k]); });
    history.replaceState(null, '', location.pathname + (q.toString() ? '?' + q : '') + location.hash);
  }
  function opts(sel, list, val) { sel.innerHTML = list.map(function (o) { return '<option value="' + esc(o[0]) + '"' + (o[0] === val ? ' selected' : '') + '>' + esc(o[1]) + '</option>'; }).join(''); }
  function initFilters() {
    var p = new URLSearchParams(location.search);
    ['city', 'chain', 'our'].forEach(function (k) { F[k] = p.get(k) || ''; });
    opts($('fCity'), [['', 'все']].concat(Object.keys(D.meta.regions).map(function (k) { return [k, D.meta.regions[k]]; })), F.city);
    opts($('fChain'), [['', 'все 8']].concat(Object.keys(D.meta.chains).map(function (k) { return [k, D.meta.chains[k]]; })), F.chain);
    opts($('fOur'), [['', 'все ' + D.ours.length]].concat(D.ours.slice().sort(function (a, b) { return a.address > b.address ? 1 : -1; }).map(function (o) { return [o.id, o.address]; })), F.our);
  }
  function bind() {
    $('fCity').onchange = function (e) { F.city = e.target.value; renderAllBlocks(); };
    $('fChain').onchange = function (e) { F.chain = e.target.value; renderAllBlocks(); };
    $('fOur').onchange = function (e) { F.our = e.target.value; renderAllBlocks(); };
    $('fReset').onclick = function () { F = { city: '', chain: '', our: '' }; PF = { type: '', source: '', our: '' }; EV = { our: '', kind: '' }; TGF = { our: '', kind: '' }; CF = { status: '', q: '' }; history.replaceState(null, '', location.pathname); initFilters(); renderAllBlocks(); };
    document.addEventListener('click', function (e) {
      var ch = e.target.closest ? e.target.closest('[data-f]') : null;
      if (ch) {
        var f = ch.getAttribute('data-f'), v = ch.getAttribute('data-v');
        if (f === 'ev') { EV.kind = EV.kind === v ? '' : v; renderEvBlock(); } else { TGF.kind = TGF.kind === v ? '' : v; renderTgBlock(); }
        var nb = document.querySelector('[data-f="' + f + '"][data-v="' + v + '"]'); if (nb) nb.focus();
        return;
      }
      var t = e.target.closest ? e.target.closest('[data-type],#pAll,[data-more]') : null;
      if (!t) return;
      if (t.id === 'pAll') { PF.type = ''; renderPromos(); return; }
      if (t.hasAttribute('data-more')) { var li = $(t.getAttribute('data-more')); li.classList.toggle('is-open'); t.textContent = li.classList.contains('is-open') ? 'Свернуть' : 'Показать полностью'; return; }
      var ty = t.getAttribute('data-type');
      PF.type = PF.type === ty ? '' : ty; renderPromos();
      var b = document.querySelector('[data-type="' + ty + '"]'); if (b) b.focus();
    });
    document.addEventListener('change', function (e) {
      if (e.target.id === 'eOur') { EV.our = e.target.value; renderEvBlock(); $('eOur').focus(); }
      if (e.target.id === 'tOur') { TGF.our = e.target.value; renderTgBlock(); $('tOur').focus(); }
      if (e.target.id === 'pOur') { PF.our = e.target.value; renderPromos(); $('pOur').focus(); }
      if (e.target.id === 'pSrc') { PF.source = e.target.value; renderPromos(); $('pSrc').focus(); }
      if (e.target.id === 'cSt') { CF.status = e.target.value; renderAll(); $('cSt').focus(); }
    });
    document.addEventListener('input', function (e) {
      if (e.target.id === 'cQ') { CF.q = e.target.value; var pos = e.target.selectionStart; renderAll(); var q = $('cQ'); q.focus(); q.setSelectionRange(pos, pos); }
    });
  }
  function initTips() {
    var tip = $('tipbox'), cur = null, pinned = false;
    function content(el) {
      if (el.hasAttribute('data-help')) {
        var h = HELP[el.getAttribute('data-help')];
        return '<p><b>Как считаем.</b> ' + h[0] + '</p><p><b>Зачем нам.</b> ' + h[1] + '</p><p><b>Как читать.</b> ' + h[2] + '</p>';
      }
      var parts = el.getAttribute('data-tip').split('|');
      return '<p><b>' + parts[0] + '</b></p>' + parts.slice(1).map(function (x) { return '<p>' + x + '</p>'; }).join('');
    }
    function show(el) {
      cur = el; tip.innerHTML = content(el); tip.hidden = false; el.setAttribute('aria-describedby', 'tipbox');
      var r = el.getBoundingClientRect(), w = Math.min(380, window.innerWidth - 24);
      tip.style.width = w + 'px';
      tip.style.left = Math.min(Math.max(12, r.left + r.width / 2 - w / 2), window.innerWidth - w - 12) + 'px';
      var top = r.bottom + 8; tip.style.top = top + 'px';
      var th = tip.offsetHeight;
      if (top + th > window.innerHeight - 8 && r.top - th - 8 > 8) tip.style.top = (r.top - th - 8) + 'px';
    }
    function hide() { if (cur) cur.removeAttribute('aria-describedby'); tip.hidden = true; cur = null; pinned = false; }
    var sel = '.info,[data-tip]';
    document.addEventListener('mouseover', function (e) { var b = e.target.closest && e.target.closest(sel); if (b && !pinned) show(b); });
    document.addEventListener('mouseout', function (e) { var b = e.target.closest && e.target.closest(sel); if (b && !pinned) hide(); });
    document.addEventListener('focusin', function (e) { var b = e.target.closest && e.target.closest(sel); if (b) show(b); });
    document.addEventListener('focusout', function (e) { var b = e.target.closest && e.target.closest(sel); if (b && !pinned) hide(); });
    document.addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest(sel);
      if (b) { if (b.classList.contains('info')) e.preventDefault(); if (pinned && cur === b) hide(); else { show(b); pinned = true; } }
      else if (pinned && !tip.contains(e.target)) hide();
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') hide(); });
    window.addEventListener('scroll', function () { if (!pinned) hide(); else if (cur) show(cur); }, { passive: true });
  }
  function jumpHighlight() {
    if (!('IntersectionObserver' in window)) return;
    var links = document.querySelectorAll('.jump a');
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) links.forEach(function (a) { a.classList.toggle('is-on', a.getAttribute('href') === '#' + e.target.id); }); });
    }, { rootMargin: '-40% 0px -55% 0px' });
    document.querySelectorAll('main > section').forEach(function (s) { io.observe(s); });
  }

  fetch('data/data.json', { cache: 'no-cache' }).then(function (r) { return r.json(); }).then(function (d) {
    D = d;
    $('sub').textContent = 'Москва, Московская область, Санкт-Петербург, Сочи. Данные на ' + fmtDate(d.meta.generatedAt) + ', у каждой записи есть ссылка на источник.';
    $('foot').innerHTML = 'Только реальные данные: сайты 8 сетей, их Telegram-каналы, Яндекс Карты и irecommend, НФС и ФНС. Файл данных: <code>data/data.json</code>. <a href="v1/">Архив версии 1</a>.';
    initFilters(); bind(); initTips(); renderAllBlocks(); jumpHighlight();
    var rz; window.addEventListener('resize', function () { clearTimeout(rz); rz = setTimeout(function () { limitFeeds(); }, 150); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { limitFeeds(); });
    if (location.hash) { var t = document.querySelector(location.hash); if (t) t.scrollIntoView(); }
  }).catch(function (e) { $('threats').innerHTML = empty('Не удалось загрузить data/data.json: ' + esc(e.message) + '. Обновите страницу.'); });
})();
