/* Дашборд 2: только реальные данные из data/data.json. */
(function () {
  'use strict';
  var D = null;
  var TABS = [
    ['events', 'События по клубам'],
    ['promos', 'Акции'],
    ['clubs', 'Клубы конкурентов'],
    ['cards', 'Карточки конкурентов'],
    ['season', 'Сезонный календарь'],
    ['about', 'Источники и методика']
  ];
  var ST = { announced: 'Анонс', presale: 'Предпродажа', open: 'Работает', closed: 'Закрыт' };
  var F = { city: '', chain: '', our: '' };
  var $ = function (id) { return document.getElementById(id); };

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
  function cite(s) {
    // «[2026-11-06; https://…]» → короткая ссылка с доменом и датой
    return esc(s).replace(/\[([^\[\]]*?https?:\/\/[^\[\]]*?)\]/g, function (m, inner) {
      var date = (inner.match(/\d{4}-\d{2}-\d{2}/) || [''])[0];
      var urls = inner.match(/https?:\/\/[^\s;,]+/g) || [];
      return '<span class="small">' + urls.map(function (u) {
        var d = u.replace(/^https?:\/\/(www\.)?/, '').split('/')[0];
        return '<a href="' + u + '" target="_blank" rel="noopener">' + d + (date ? ', ' + fmtDate(date) : '') + '</a>';
      }).join(' · ') + '</span>';
    }).replace(/(^|\s)(https?:\/\/[^\s<]+)/g, function (m, sp, u) {
      return sp + '<a class="small" href="' + u + '" target="_blank" rel="noopener">' + u.replace(/^https?:\/\/(www\.)?/, '').split('/')[0] + '</a>';
    });
  }

  /* Подсказки: как считаем / зачем нам / как читать */
  var HELP = {
    events: ['Берём списки клубов с сайтов 8 сетей и посты их Telegram-каналов. Оставляем клубы в анонсе, предпродаже, открытые за 60 дней и закрытые.',
      'Новый клуб конкурента рядом отнимает у нас прежде всего новых клиентов и тех, у кого заканчивается карта. Предпродажа идёт до открытия, это время на ответ.',
      'Сверху самые близкие к нашим клубам. Всё, что ближе 15–20 минут пешком, стоит разобрать: какой наш клуб под ударом и чем ответить.'],
    t_presale: ['Клубы, у которых на сайте сети или в её Telegram есть слово «предпродажа».',
      'Конкурент уже продаёт карты будущего клуба, часто со скидкой первым покупателям. Клиенты рядом решают сейчас.',
      'Чем ближе к нашему клубу, тем срочнее: удержание текущих клиентов и встречное предложение новым.'],
    t_announced: ['Клубы с отметкой «скоро открытие», будущей датой открытия или статусом «стройка». У DDX сюда входят и клубы, скрытые в интерфейсе, но уже присутствующие в данных сайта с датой.',
      'Самый ранний сигнал: до старта продаж есть время подготовиться.',
      'Это план конкурента, а не факт. Дата может сдвинуться. Следите за переходом в предпродажу.'],
    t_opened: ['Клубы со статусом «работает» и датой открытия за последние 60 дней. Дата берётся с сайта (DDX) или из поста об открытии в Telegram.',
      'Первые 1–3 месяца после открытия конкурент обычно максимально активен по акциям (гипотеза, на наших данных не проверено).',
      'Если рядом открылся клуб, сверьте отток и пробные визиты в нашем ближайшем клубе за эти недели.'],
    t_closed: ['Клубы, которые сайт сети прямо помечает закрытыми.',
      'Клиенты закрытого клуба ищут новый зал. Это окно для привлечения.',
      'Если закрытый клуб рядом с нашим, работает предложение «переходи к нам» (trade-in, зачёт остатка карты).'],
    t_nearest: ['Минимальное пешее время среди всех анонсов, предпродаж и недавних открытий при текущих фильтрах.',
      'Одна цифра: насколько близко к нам подошли конкуренты.',
      'Меньше 15 минут: прямой конкурент за тех же людей. 15–30 минут: частичное пересечение. Больше 30: другой район.'],
    changes: ['Сравниваем статусы клубов с прошлым сбором: появился новый, сменился статус (анонс, предпродажа, открыт), пропал с сайта.',
      'Это недельная лента новостей о конкурентах.',
      'Первый сбор задаёт точку отсчёта, поэтому сейчас здесь пусто. Изменения начнут копиться со следующего сбора.'],
    tg: ['Посты каналов сетей за 60 дней. Модель (GPT) отбирает посты об открытиях, предпродажах и закрытиях и достаёт клуб и даты.',
      'Сети часто объявляют в Telegram раньше, чем обновляют сайт.',
      'Это сигнал, а не подтверждение. Если клуб нашёлся на сайте, его статус уже учтён в таблицах выше.'],
    c_status: ['Статус по сайту сети. Анонс: «скоро», стройка, будущая дата. Предпродажа: на странице клуба есть слово «предпродажа» или о ней пост в канале. Работает. Закрыт.',
      'Показывает, на каком этапе угроза.',
      'Под статусом мелким шрифтом дословная отметка с сайта, по ней можно проверить вывод.'],
    c_open: ['Дата открытия с сайта сети или из поста в Telegram. «нет» означает, что сеть дату не публикует.',
      'Помогает приурочить ответ к нужной неделе.',
      'Дата анонса может сдвигаться, сверяйте с источником.'],
    c_our: ['Наш клуб с наименьшим пешим временем до клуба конкурента. Кандидаты: 5 наших клубов, ближайших по прямой.',
      'Сразу видно, какой наш клуб под ударом и кому из управляющих сообщить.',
      'Фильтр «Наш клуб» сверху оставит только конкурентов, для которых этот клуб ближайший.'],
    c_walk: ['Пеший маршрут по улицам OpenStreetMap (сервис Valhalla), средняя скорость пешехода около 5 км/ч.',
      'Клиент выбирает зал по удобству дороги, а не по прямой на карте.',
      'До 15 минут: та же аудитория. 15–30: частичное пересечение. Пусто: дальше 25 км или маршрут не построился, смотрите км.'],
    c_km: ['Длина пешего маршрута, а если его нет, расстояние по прямой.',
      'Вторая шкала к минутам: видно, где река или промзона удлиняют путь.',
      'Если км мало, а минут много, между клубами есть препятствие. Для клиента это разные районы.'],
    promos: ['Страницы акций на сайтах сетей и посты Telegram за 60 дней. Истёкшие по дате убраны. Акции на всю сеть отнесены ко всем её городам из нашей географии.',
      'Видно, кто и чем атакует: глубина скидок, подарки, trade-in против наших клиентов.',
      'Ищите повторяющиеся механики: если несколько сетей одновременно дают скидку на вступительный взнос, это уже норма рынка, а не акция.'],
    p_type: ['Тип определяется по ключевым словам текста (скидка, подарок, пробное, бонус, коллаборация, розыгрыш) или моделью при разборе Telegram.',
      'Позволяет сравнивать механики, а не формулировки.',
      'Автоматическая метка может ошибаться. Решение принимайте по тексту условий.'],
    p_source: ['Сайт: страница акции на официальном сайте. Telegram: пост в официальном канале сети.',
      'Часть акций живёт только в канале (например, у Encore).',
      'Акция из Telegram без срока могла уже закончиться. Смотрите дату поста.'],
    clubs: ['Все клубы 8 сетей в Москве, МО, СПб и Сочи по данным сайтов. Координаты с сайта или по адресу через OpenStreetMap.',
      'Полная карта присутствия конкурентов вокруг наших клубов.',
      'Отсортировано от ближних к дальним. «нет координат»: адрес не удалось распознать, расстояние не посчитано.'],
    cards: ['Сведения с сайтов сетей и из СМИ (РБК, Ведомости, retail.ru и др.), каждое с датой и ссылкой. Собрано моделью GPT, выборочно перепроверено.',
      'Понять, как устроен конкурент: модель продаж, условия выхода, динамика, финансовое давление.',
      '«Нет данных» означает, что надёжного источника не нашлось. Это не то же самое, что «нет».'],
    k_geo: ['Число клубов сети в каждом регионе нашей географии по текущему сбору с сайта.',
      'Масштаб присутствия рядом с нами, а не по всей России.',
      'Сравнивайте с прошлым сбором: рост в регионе означает экспансию туда.'],
    k_pressure: ['Публичные признаки финансовых трудностей: убытки, долги, суды, закрытия. Только с источником.',
      'Сеть под давлением чаще демпингует и закрывает клубы.',
      'Отсутствие записей не доказывает, что всё хорошо.'],
    reviews: ['Отзывы за 12 месяцев с Яндекс Карт и irecommend, до 80 на сеть по клубам нашей географии. Модель выделяет темы; каждая цитата проверена: она дословно есть в собранных отзывах. 2ГИС и Отзовик на момент сбора были недоступны.',
      'Слабые места конкурента подсказывают, что подчеркнуть в нашей рекламе. Его сильные стороны показывают, где нам подтянуться.',
      '«10 из 80»: тему упоминают 10 отзывов выборки. Это ориентир, а не доля всех клиентов: выборка небольшая и в основном московская. Средняя оценка относится к выборке, а не к рейтингу на карте.'],
    season: ['Месячная динамика продаж клубных карт и посещаемости по исследованиям НФС, плюс сроки налогового вычета по ФНС. Только пункты с первоисточником.',
      'Планировать кампании под реальные пики и спады, а не под общие представления.',
      'В источниках разная база сравнения (к прошлому месяцу или к прошлому году), смотрите формулировку. Месяц без данных честно помечен.'],
    sources: ['Сколько записей пришло из каждого источника при последнем сборе.',
      'Контроль полноты: если у сети вдруг 0 клубов, скорее сломался сбор, а не закрылась сеть.',
      'Сравнивайте с прошлым сбором. Резкий провал сначала проверьте на сайте сети.']
  };
  function info(k) { return HELP[k] ? ' <button type="button" class="info" data-help="' + k + '" aria-label="Пояснение">i</button>' : ''; }
  function initTips() {
    var tip = document.createElement('div'); tip.className = 'tipbox'; tip.setAttribute('role', 'tooltip'); tip.id = 'tipbox'; tip.hidden = true; document.body.appendChild(tip);
    var cur = null, pinned = false;
    function show(b) {
      var h = HELP[b.getAttribute('data-help')]; if (!h) return;
      cur = b;
      tip.innerHTML = '<p><b>Как считаем.</b> ' + h[0] + '</p><p><b>Зачем нам.</b> ' + h[1] + '</p><p><b>Как читать.</b> ' + h[2] + '</p>';
      tip.hidden = false; b.setAttribute('aria-describedby', 'tipbox');
      var r = b.getBoundingClientRect(), w = Math.min(380, window.innerWidth - 24);
      tip.style.width = w + 'px';
      tip.style.left = Math.min(Math.max(12, r.left + r.width / 2 - w / 2), window.innerWidth - w - 12) + 'px';
      var top = r.bottom + 8; tip.style.top = top + 'px';
      var th = tip.offsetHeight;
      if (top + th > window.innerHeight - 8 && r.top - th - 8 > 8) tip.style.top = (r.top - th - 8) + 'px';
    }
    function hide() { if (cur) cur.removeAttribute('aria-describedby'); tip.hidden = true; cur = null; pinned = false; }
    document.addEventListener('mouseover', function (e) { var b = e.target.closest && e.target.closest('.info'); if (b && !pinned) show(b); });
    document.addEventListener('mouseout', function (e) { var b = e.target.closest && e.target.closest('.info'); if (b && !pinned) hide(); });
    document.addEventListener('focusin', function (e) { if (e.target.classList && e.target.classList.contains('info')) show(e.target); });
    document.addEventListener('focusout', function (e) { if (e.target.classList && e.target.classList.contains('info') && !pinned) hide(); });
    document.addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('.info');
      if (b) { e.preventDefault(); if (pinned && cur === b) hide(); else { show(b); pinned = true; } }
      else if (pinned && !tip.contains(e.target)) hide();
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') hide(); });
    window.addEventListener('scroll', function () { if (!pinned) hide(); else if (cur) show(cur); }, { passive: true });
  }
  function chainName(id) { return (D.meta.chains[id] || id); }
  function regName(id) { return (D.meta.regions[id] || id); }
  function ourById(id) { for (var i = 0; i < D.ours.length; i++) if (D.ours[i].id === id) return D.ours[i]; return null; }
  function st(s) { return '<span class="st st--' + esc(s) + '">' + esc(ST[s] || s) + '</span>'; }
  function link(u, t) { return u ? '<a href="' + esc(u) + '" target="_blank" rel="noopener">' + esc(t || 'источник') + '</a>' : ''; }
  function dist(n) {
    if (!n) return '<td class="num muted">нет координат</td><td class="num"></td>';
    var w = n.walkMin != null ? n.walkMin + ' мин' : '<span class="muted">нет маршрута</span>';
    var k = (n.walkKm != null ? n.walkKm : n.km);
    return '<td class="num near">' + w + '</td><td class="num">' + String(k).replace('.', ',') + ' км</td>';
  }
  function distOrder(c) {
    if (!c.nearest) return 1e9;
    return c.nearest.walkMin != null ? c.nearest.walkMin : c.nearest.km * 12;
  }
  function passClub(c) {
    if (F.city && c.city !== F.city) return false;
    if (F.chain && c.chain !== F.chain) return false;
    if (F.our && !(c.nearest && c.nearest.our === F.our)) return false;
    return true;
  }
  function passPromo(p) {
    if (F.city && p.cities.indexOf(F.city) < 0) return false;
    if (F.chain && p.chain !== F.chain) return false;
    return true;
  }
  function ourLabel(n) {
    if (!n) return '';
    return esc(n.ourAddress);
  }
  function empty(t) { return '<div class="empty">' + t + '</div>'; }
  function tile(label, value, note, k) {
    return '<div class="tile"><div class="tile__label">' + label + info(k) + '</div><div class="tile__value">' + value + '</div><div class="tile__note">' + (note || '') + '</div></div>';
  }

  /* ---------- 1. События ---------- */
  function clubRows(list, withDate) {
    return list.map(function (c) {
      return '<tr><td>' + esc(chainName(c.chain)) + '</td><td><b>' + esc(c.name) + '</b><div class="small muted">' + esc(c.address || '') + '</div></td>' +
        '<td>' + st(c.status) + '<div class="small muted">' + esc(c.statusNote || '') + '</div></td>' +
        (withDate ? '<td class="num">' + (c.openDate ? fmtDate(c.openDate) : '<span class="muted">нет</span>') + '</td>' : '') +
        '<td>' + ourLabel(c.nearest) + '</td>' + dist(c.nearest) +
        '<td class="small">' + link(c.url, 'сайт') + '<div class="muted">' + fmtDate(c.seenAt) + '</div></td></tr>';
    }).join('');
  }
  function clubTable(list, withDate) {
    return '<div class="tbl-wrap"><table><thead><tr><th>Сеть</th><th>Клуб конкурента</th><th>Статус' + info('c_status') + '</th>' + (withDate ? '<th class="num">Дата открытия' + info('c_open') + '</th>' : '') +
      '<th>Ближайший наш клуб' + info('c_our') + '</th><th class="num">Пешком' + info('c_walk') + '</th><th class="num">Км' + info('c_km') + '</th><th>Источник</th></tr></thead><tbody>' + clubRows(list, withDate) + '</tbody></table></div>';
  }
  function renderEvents() {
    var cs = D.clubs.filter(passClub);
    var upcoming = cs.filter(function (c) { return c.status === 'announced' || c.status === 'presale'; }).sort(function (a, b) { return distOrder(a) - distOrder(b); });
    var closed = cs.filter(function (c) { return c.status === 'closed'; }).sort(function (a, b) { return distOrder(a) - distOrder(b); });
    var since = new Date(D.meta.generatedAt); since.setDate(since.getDate() - 60);
    var s60 = since.toISOString().slice(0, 10);
    var recent = cs.filter(function (c) { return c.status === 'open' && c.openDate && c.openDate >= s60 && c.openDate <= D.meta.generatedAt; }).sort(function (a, b) { return distOrder(a) - distOrder(b); });
    var near = upcoming.concat(recent)[0];
    var h = '<h2>События по клубам' + info('events') + '</h2><p class="lead">Клубы 8 сетей в анонсе, предпродаже, недавно открытые и закрытые. У каждого показан ближайший наш клуб и путь до него пешком. Список отсортирован от ближних к дальним.</p>';
    var nearest = upcoming.concat(recent).slice().sort(function (a, b) { return distOrder(a) - distOrder(b); })[0];
    h += '<div class="tiles">' +
      tile('Предпродажа', upcoming.filter(function (c) { return c.status === 'presale'; }).length, 'клубов сейчас', 't_presale') +
      tile('Анонс', upcoming.filter(function (c) { return c.status === 'announced'; }).length, 'клубов, продаж ещё нет', 't_announced') +
      tile('Открылись за 60 дней', recent.length, 'по дате на сайте или в Telegram', 't_opened') +
      tile('Закрыты', closed.length, 'по отметке на сайте', 't_closed') +
      tile('Ближе всего', nearest && nearest.nearest && nearest.nearest.walkMin != null ? nearest.nearest.walkMin + ' мин' : '—', nearest ? esc(nearest.name) : '', 't_nearest') + '</div>';
    h += '<h3>Изменения с прошлого сбора' + info('changes') + '</h3>';
    if (!D.meta.hasHistory) {
      h += empty('Это первый сбор (' + fmtDate(D.meta.generatedAt) + '). Изменения статусов (новый клуб, старт предпродаж, открытие, закрытие) появятся после следующего сбора. Ниже текущее состояние.');
    } else if (!D.changes.length) {
      h += empty('С прошлого сбора статусы клубов не менялись.');
    } else {
      h += '<div class="tbl-wrap"><table><thead><tr><th>Клуб</th><th>Что изменилось</th></tr></thead><tbody>' + D.changes.map(function (x) {
        return '<tr><td>' + esc(x.name || x.key) + '</td><td>' + (x.kind === 'new' ? 'новый в данных: ' + st(x.to) : x.kind === 'gone' ? 'пропал с сайта' : st(x.from) + ' → ' + st(x.to)) + '</td></tr>';
      }).join('') + '</tbody></table></div>';
    }
    h += '<h3>Анонсы и предпродажи</h3>' + (upcoming.length ? clubTable(upcoming, true) : empty('Нет клубов в анонсе или предпродаже по выбранным фильтрам.'));
    h += '<h3>Открылись за последние 60 дней</h3><p class="lead small">Дата открытия с сайта сети (DDX) или из поста в Telegram-канале сети. У остальных клубов дата появится, когда сбор заметит смену статуса.</p>' + (recent.length ? clubTable(recent, true) : empty('Нет данных по выбранным фильтрам.'));
    h += '<h3>Закрытые</h3>' + (closed.length ? clubTable(closed, false) : empty('Сайты сетей не отмечают закрытых клубов по выбранным фильтрам.'));
    var tg = (D.tgEvents || []).filter(function (t) { return (!F.chain || t.chain === F.chain) && (!F.city || (t.cities || []).indexOf(F.city) >= 0); });
    h += '<h3>Из Telegram-каналов сетей' + info('tg') + '</h3><p class="lead small">Посты об открытиях, предпродажах и закрытиях за 60 дней. Это сигнал, а не подтверждение: сверяйте с таблицами выше.</p>';
    h += tg.length ? '<div class="tbl-wrap"><table><thead><tr><th>Дата</th><th>Сеть</th><th>Что</th><th>Клуб</th><th>Пост</th></tr></thead><tbody>' + tg.map(function (t) {
      return '<tr><td class="num">' + fmtDate(t.date) + '</td><td>' + esc(chainName(t.chain)) + '</td><td>' + st({ opening: 'open', presale: 'presale', announced: 'announced', closing: 'closed' }[t.kind]) + ' ' + esc(t.title || '') + '</td><td>' + esc(t.club || '') + '<div class="small muted">' + esc(t.address || '') + '</div></td><td>' + link(t.post, 'пост') + '</td></tr>';
    }).join('') + '</tbody></table></div>' : empty('Нет постов по выбранным фильтрам.');
    return h;
  }

  /* ---------- 2. Акции ---------- */
  var PF = { type: '', source: '' };
  function renderPromos() {
    var ps = D.promos.filter(passPromo).filter(function (p) { return (!PF.type || p.type === PF.type) && (!PF.source || p.source === PF.source); });
    var types = {}; D.promos.forEach(function (p) { types[p.type] = 1; });
    var h = '<h2>Акции конкурентов' + info('promos') + '</h2><p class="lead">Действующие акции в Москве, МО, СПб и Сочи: с сайтов сетей и из их Telegram-каналов. Истёкшие убраны. Тип механики определён автоматически по тексту.</p>';
    h += '<div class="filters" style="padding:0 0 12px"><label>Тип механики <select id="pType"><option value="">Все</option>' + Object.keys(types).sort().map(function (t) { return '<option' + (PF.type === t ? ' selected' : '') + '>' + esc(t) + '</option>'; }).join('') + '</select></label>' + info('p_type') +
      '<label>Источник <select id="pSrc"><option value="">Все</option><option value="site"' + (PF.source === 'site' ? ' selected' : '') + '>Сайт</option><option value="telegram"' + (PF.source === 'telegram' ? ' selected' : '') + '>Telegram</option></select></label>' + info('p_source') + '<span class="muted small">Найдено: ' + ps.length + '</span></div>';
    if (!ps.length) return h + empty('Нет акций по выбранным фильтрам.');
    h += '<div class="grid">' + ps.map(function (p) {
      return '<article class="card">' + (p.image ? '<img loading="lazy" src="' + esc(p.image) + '" alt="Баннер акции: ' + esc(p.title) + '" onerror="this.remove()">' : '') +
        '<div class="small muted">' + esc(chainName(p.chain)) + (p.club ? ' · ' + esc(p.club) : '') + '</div><h3>' + esc(p.title) + '</h3>' +
        '<div class="pills"><span class="pill">' + esc(p.type) + '</span>' + p.cities.map(function (c) { return '<span class="pill">' + esc(regName(c)) + '</span>'; }).join('') +
        '<span class="pill">' + (p.validTo ? 'до ' + fmtDate(p.validTo) : 'срок не указан') + '</span></div>' +
        '<p class="small">' + esc(p.mechanic) + '</p>' +
        '<div class="small muted">' + link(p.url, p.source === 'telegram' ? 'пост в Telegram' : 'страница акции') + (p.postDate ? ' от ' + fmtDate(p.postDate) : '') + ' · увидели ' + fmtDate(p.seenAt) + (p.scopeNote ? '<br>' + esc(p.scopeNote) : '') + '</div></article>';
    }).join('') + '</div>';
    return h;
  }

  /* ---------- 3. Клубы ---------- */
  var CF = { status: '', q: '' };
  function renderClubs() {
    var cs = D.clubs.filter(passClub).filter(function (c) {
      return (!CF.status || c.status === CF.status) && (!CF.q || (c.name + ' ' + (c.address || '')).toLowerCase().indexOf(CF.q.toLowerCase()) >= 0);
    }).sort(function (a, b) { return distOrder(a) - distOrder(b); });
    var h = '<h2>Клубы конкурентов' + info('clubs') + '</h2><p class="lead">Все клубы 8 сетей в нашей географии по данным их сайтов. Фильтр «Наш клуб» оставляет конкурентов, для которых этот клуб ближайший.</p>';
    h += '<div class="filters" style="padding:0 0 12px"><label>Статус <select id="cSt"><option value="">Все</option>' + Object.keys(ST).map(function (k) { return '<option value="' + k + '"' + (CF.status === k ? ' selected' : '') + '>' + ST[k] + '</option>'; }).join('') + '</select></label>' +
      '<label>Поиск <input type="search" id="cQ" value="' + esc(CF.q) + '" placeholder="название или адрес"></label><span class="muted small">Найдено: ' + cs.length + '</span></div>';
    return h + (cs.length ? clubTable(cs, true) : empty('Нет клубов по выбранным фильтрам.'));
  }

  /* ---------- 4. Карточки ---------- */
  function revBlock(id) {
    var r = (D.reviews && D.reviews.chains && D.reviews.chains[id]) || null;
    if (!r || !r.sample) return '<h4>Отзывы' + info('reviews') + '</h4>' + empty('Отзывы не собраны: площадки не отдали данные или отзывов по нашей географии нет.');
    function themes(arr) {
      if (!arr || !arr.length) return '<p class="muted small">Нет данных</p>';
      return '<ul>' + arr.map(function (t) {
        return '<li><b>' + esc(t.theme) + '</b> <span class="muted small">' + t.count + ' из ' + r.sample + '</span>' + (t.quotes || []).map(function (q) {
          return '<span class="q">«' + esc(q.text) + '» ' + link(q.url, ({ yandex: 'Яндекс', irecommend: 'irecommend', '2gis': '2ГИС', otzovik: 'Отзовик' }[q.platform] || q.platform || '') + (q.date ? ', ' + fmtDate(q.date) : '')) + '</span>';
        }).join('') + '</li>';
      }).join('') + '</ul>';
    }
    var PN = { yandex: 'Яндекс Карты', '2gis': '2ГИС', otzovik: 'Отзовик', irecommend: 'irecommend' };
    var by = Object.keys(r.byPlatform || {}).filter(function (k) { return r.byPlatform[k]; }).map(function (k) { return (PN[k] || k) + ': ' + r.byPlatform[k]; }).join(', ');
    return '<h4>Отзывы' + info('reviews') + '</h4><p class="small muted">Выборка ' + r.sample + ' отзывов за ' + esc((r.period || '').replace('..', ' — ')) + (by ? ' (' + esc(by) + ')' : '') + (r.avgRating != null ? '. Средняя оценка в выборке ' + String(r.avgRating).replace('.', ',') : '') + '</p>' +
      '<div class="rev"><div><h4>Хвалят</h4>' + themes(r.positive) + '</div><div><h4>Ругают</h4>' + themes(r.negative) + '</div></div>';
  }
  function renderCards() {
    var cards = (D.cards || []).filter(function (c) { return !F.chain || c.id === F.chain; });
    var h = '<h2>Карточки конкурентов' + info('cards') + '</h2><p class="lead">Что за игрок, как продаёт и куда движется, плюс что о нём пишут клиенты. Каждый факт со ссылкой.</p>';
    if (!cards.length) return h + empty('Карточки ещё не собраны.');
    var geoN = { msk: 'Москва', mo: 'МО', spb: 'СПб', sochi: 'Сочи' };
    h += '<div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(520px,1fr))">' + cards.map(function (c) {
      var n = D.clubs.filter(function (x) { return x.chain === c.id; });
      var cnt = {}; n.forEach(function (x) { cnt[x.city] = (cnt[x.city] || 0) + 1; });
      var geo = Object.keys(geoN).map(function (k) { return geoN[k] + ': ' + (cnt[k] || 0); }).join(' · ');
      function row(k, v) { return v && v.length ? '<dt>' + k + '</dt><dd>' + v + '</dd>' : ''; }
      function list(a) { return (a || []).map(function (x) { return cite(typeof x === 'string' ? x : x.text); }).join('<br>'); }
      return '<article class="card"><h3>' + esc(c.name) + '</h3><div class="small muted">' + link(c.site, c.site) + (c.telegram ? ' · ' + link(c.telegram, 'Telegram') : '') + ' · проверено ' + fmtDate(c.checkedAt) + '</div>' +
        '<dl class="kv">' + row('Клубов у нас в географии' + info('k_geo'), geo + ' <span class="muted small">(по сайту, ' + fmtDate(D.meta.generatedAt) + ')</span>') + row('Всего по сети', cite(c.clubs)) + row('Сегмент', esc({ low: 'массовый', mid: 'средний', premium: 'премиум' }[c.segment] || c.segment)) + row('Модель продаж', cite(c.model)) +
        row('Заморозка', cite(c.freeze)) + row('Выход из договора', cite(c.exit)) + row('Форматы', cite(c.formats)) + row('На чём конкурирует', cite(c.competes)) + row('Динамика', cite(c.changes)) +
        row('Отчёты сети', list(c.selfReports)) + row('Признаки давления' + info('k_pressure'), list(c.pressure)) +
        row('Новости', (c.news || []).map(function (x) { return fmtDate(x.date) + ' ' + link(x.url, x.text); }).join('<br>')) + '</dl>' +
        revBlock(c.id) +
        '<details><summary>Источники (' + (c.src || []).length + ')</summary><ul class="small">' + (c.src || []).map(function (s) { return '<li>' + link(s.u, s.t) + '</li>'; }).join('') + '</ul></details></article>';
    }).join('') + '</div>';
    return h;
  }

  /* ---------- 5. Сезон ---------- */
  function renderSeason() {
    var M = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
    var now = new Date(D.meta.generatedAt).getMonth() + 1;
    var h = '<h2>Сезонный календарь' + info('season') + '</h2><p class="lead">Что происходит на рынке по месяцам. Только пункты с первоисточником (НФС, ФНС). Месяц без подтверждённых данных помечен.</p>';
    if (!D.season || !D.season.length) return h + empty('Календарь ещё не собран.');
    h += '<div class="months">' + D.season.slice().sort(function (a, b) { return a.m - b.m; }).map(function (s) {
      return '<article class="card' + (s.m === now ? ' month--now' : '') + '"><div class="small muted">' + M[s.m - 1] + (s.m === now ? ' · сейчас' : '') + '</div><h3>' + esc(s.verified ? s.title : 'Нет подтверждённых данных') + '</h3><p class="small">' + esc(s.note) + '</p>' +
        '<div class="small">' + (s.src || []).map(function (x) { return link(x.u, x.t); }).join('<br>') + '</div></article>';
    }).join('') + '</div>';
    return h;
  }

  /* ---------- 6. Источники ---------- */
  function renderAbout() {
    var h = '<h2>Источники и методика</h2>';
    h += '<h3>Что собрано (' + fmtDate(D.meta.generatedAt) + ')' + info('sources') + '</h3><div class="tbl-wrap"><table><thead><tr><th>Сеть</th><th class="num">Клубов в географии</th><th class="num">С координатами</th><th class="num">Акций с сайта</th><th class="num">Акций из Telegram</th></tr></thead><tbody>' +
      D.sources.map(function (s) { return '<tr><td>' + esc(chainName(s.chain)) + '</td><td class="num">' + s.clubs + '</td><td class="num">' + s.withCoords + '</td><td class="num">' + s.promosSite + '</td><td class="num">' + s.promosTelegram + '</td></tr>'; }).join('') + '</tbody></table></div>';
    var pl = (D.reviews && D.reviews.platforms) || [];
    h += '<h3>Площадки отзывов</h3>' + (pl.length ? '<div class="tbl-wrap"><table><thead><tr><th>Площадка</th><th>Статус</th><th>Комментарий</th></tr></thead><tbody>' + pl.map(function (p) {
      return '<tr><td>' + esc(p.name) + '</td><td>' + esc({ ok: 'собрано', partial: 'частично', blocked: 'недоступна' }[p.status] || p.status) + '</td><td class="small">' + esc(p.note) + '</td></tr>';
    }).join('') + '</tbody></table></div>' + (D.reviews.method ? '<p class="small muted">' + esc(D.reviews.method) + '</p>' : '') : empty('Отзывы ещё не собраны.'));
    h += '<h3>Методика</h3><ul class="lead">' +
      '<li>Только реальные данные: у каждой записи ссылка на источник и дата, когда её увидели. Если данных нет, блок пустой.</li>' +
      '<li>Статусы клубов берутся с сайтов сетей: «скоро открытие» и даты открытия считаются анонсом, слово «предпродажа» на странице клуба переводит его в предпродажу. У DDX анонсом считаются и клубы, скрытые в интерфейсе, но уже присутствующие в данных сайта с будущей датой.</li>' +
      '<li>' + esc(D.meta.routing) + ' Ближайший наш клуб выбирается из трёх ближайших по прямой с наименьшим пешим временем.</li>' +
      '<li>Наши клубы: ' + D.ours.length + ' адресов, координаты по OpenStreetMap. Клубы в Жуковке и Новинках определены с точностью до населённого пункта.</li>' +
      '<li>Акции: только действующие в Москве, МО, СПб, Сочи. Акции на всю сеть отнесены ко всем её городам из нашей географии. Тип механики определён по ключевым словам или моделью при разборе Telegram.</li>' +
      '<li>Отзывы: выборка с площадок, темы выделены моделью и сверены с цитатами; число у темы означает, сколько отзывов выборки её упоминают.</li></ul>';
    h += '<p><a href="v1/">Архив: версия 1 на демо-данных (31.10.2026)</a></p>';
    return h;
  }

  /* ---------- каркас ---------- */
  var R = { events: renderEvents, promos: renderPromos, clubs: renderClubs, cards: renderCards, season: renderSeason, about: renderAbout };
  function current() { var t = location.hash.replace('#', ''); return R[t] ? t : 'events'; }
  function render() {
    var t = current();
    $('tabs').innerHTML = TABS.map(function (x) { return '<li><a href="#' + x[0] + '"' + (x[0] === t ? ' aria-current="page"' : '') + '>' + x[1] + '</a></li>'; }).join('');
    $('main').innerHTML = R[t]();
    var on = function (id, fn) { var e = $(id); if (e) e.addEventListener(e.tagName === 'INPUT' ? 'input' : 'change', fn); };
    on('pType', function (e) { PF.type = e.target.value; render(); });
    on('pSrc', function (e) { PF.source = e.target.value; render(); });
    on('cSt', function (e) { CF.status = e.target.value; render(); });
    on('cQ', function (e) { CF.q = e.target.value; var pos = e.target.selectionStart; render(); var q = $('cQ'); q.focus(); q.setSelectionRange(pos, pos); });
    var q = new URLSearchParams(); ['city', 'chain', 'our'].forEach(function (k) { if (F[k]) q.set(k, F[k]); });
    history.replaceState(null, '', location.pathname + (q.toString() ? '?' + q : '') + '#' + t);
  }
  function opts(sel, list, val) { sel.innerHTML = list.map(function (o) { return '<option value="' + esc(o[0]) + '"' + (o[0] === val ? ' selected' : '') + '>' + esc(o[1]) + '</option>'; }).join(''); }
  function initFilters() {
    var p = new URLSearchParams(location.search);
    ['city', 'chain', 'our'].forEach(function (k) { F[k] = p.get(k) || ''; });
    opts($('fCity'), [['', 'Все']].concat(Object.keys(D.meta.regions).map(function (k) { return [k, D.meta.regions[k]]; })), F.city);
    opts($('fChain'), [['', 'Все 8 сетей']].concat(Object.keys(D.meta.chains).map(function (k) { return [k, D.meta.chains[k]]; })), F.chain);
    opts($('fOur'), [['', 'Все']].concat(D.ours.slice().sort(function (a, b) { return a.address > b.address ? 1 : -1; }).map(function (o) { return [o.id, o.address + ' (' + regName(o.city) + ')']; })), F.our);
    $('fCity').onchange = function (e) { F.city = e.target.value; render(); };
    $('fChain').onchange = function (e) { F.chain = e.target.value; render(); };
    $('fOur').onchange = function (e) { F.our = e.target.value; render(); };
    $('fReset').onclick = function () { F = { city: '', chain: '', our: '' }; PF = { type: '', source: '' }; CF = { status: '', q: '' }; initFilters(); render(); };
  }
  function theme() {
    var modes = ['system', 'light', 'dark'], names = { system: 'система', light: 'светлая', dark: 'тёмная' };
    var m = localStorage.getItem('theme2') || 'system';
    function apply() { if (m === 'system') document.documentElement.removeAttribute('data-theme'); else document.documentElement.setAttribute('data-theme', m); $('themeBtn').textContent = 'Тема: ' + names[m]; }
    $('themeBtn').onclick = function () { m = modes[(modes.indexOf(m) + 1) % 3]; localStorage.setItem('theme2', m); apply(); };
    apply();
  }
  theme();
  initTips();
  fetch('data/data.json', { cache: 'no-cache' }).then(function (r) { return r.json(); }).then(function (d) {
    D = d;
    $('note').innerHTML = '<b>Только реальные данные.</b> Сбор от ' + fmtDate(d.meta.generatedAt) + ': сайты 8 сетей, их Telegram-каналы, площадки отзывов, НФС и ФНС. У каждой записи есть ссылка на источник. Пустой блок означает, что данных нет.';
    $('foot').innerHTML = 'Данные: <code>data/data.json</code>, сбор ' + fmtDate(d.meta.generatedAt) + '. <a href="v1/">Архив версии 1 (демо)</a>.';
    initFilters();
    window.addEventListener('hashchange', render);
    render();
  }).catch(function (e) { $('main').innerHTML = empty('Не удалось загрузить data/data.json: ' + esc(e.message)); });
})();
