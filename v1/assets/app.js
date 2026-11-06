'use strict';
/*
 * Дашборд «Конкуренты и рынок».
 * Все данные берутся из data/data.json. Чтобы обновить дашборд, достаточно заменить этот файл.
 * Устройство: state (фильтры и вкладка) -> render<Вкладка>() собирает HTML -> drawCharts() рисует графики
 * под фактическую ширину контейнера.
 */
(function () {
  const TABS = [
    { id: 'week', n: '1', name: 'Неделя', short: 'каждый понедельник',
      q: 'Что изменилось у конкурентов рядом с нашими клубами и что я делаю на этой неделе?',
      when: 'Каждый понедельник, 10 минут' },
    { id: 'prices', n: '2', name: 'Цены и акции', short: 'неделя и квартал',
      q: 'Где мы по цене и кто атакует акциями?',
      when: 'Изменения: каждую неделю. Полная сводка: раз в квартал' },
    { id: 'zones', n: '3', name: 'Зоны клубов', short: 'неделя и квартал',
      q: 'Кто вокруг каждого нашего клуба и кто собирается туда прийти?',
      when: 'События: каждую неделю. Плотность: раз в квартал' },
    { id: 'chains', n: '4', name: 'Карточки конкурентов', short: 'раз в месяц',
      q: 'Что за игрок каждый конкурент и куда он движется?',
      when: 'Раз в месяц и перед сезоном' },
    { id: 'market', n: '5', name: 'Мы и рынок', short: 'раз в месяц',
      q: 'Просели мы или весь рынок? Сработала ли наша защита?',
      when: 'Раз в месяц, к отчёту руководителю' },
    { id: 'season', n: '6', name: 'Сезон и правила', short: 'перед сезоном',
      q: 'К чему готовиться в ближайшие три месяца?',
      when: 'Раз в месяц и перед каждым сезоном' },
    { id: 'help', n: '?', name: 'Справка', short: 'как читать',
      q: 'Где что лежит, как читать цифры и метки.',
      when: 'При первом знакомстве и когда что-то непонятно' }
  ];
  const LEVEL = { critical: 'Критично', serious: 'Важно', info: 'К сведению' };
  const LEVEL_RANK = { critical: 0, serious: 1, info: 2 };
  const SIGNAL = { 'слух': 1, 'подтверждается': 2, 'подтверждено': 3 };
  const DEFAULTS = { city: 'all', segment: 'all', club: 'all', week: null };

  let D = null;
  let state = Object.assign({}, DEFAULTS, { tab: 'week' });
  let charts = {};
  const ui = { onlyChanged: true, showAllFeed: false };

  /* ---------- Утилиты ---------- */
  const $ = (s) => document.querySelector(s);
  const esc = (s) => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const rub = (n) => (n == null ? 'н/д' : n.toLocaleString('ru-RU') + ' ₽');
  const num = (n) => n.toLocaleString('ru-RU');
  const pct = (v, digits) => {
    if (v == null) return 'н/д';
    const s = Math.abs(v).toFixed(digits == null ? (Number.isInteger(v) ? 0 : 1) : digits).replace('.', ',');
    return (v > 0 ? '+' : v < 0 ? '−' : '') + s + '%';
  };
  const ddmm = (iso) => (iso ? iso.slice(8, 10) + '.' + iso.slice(5, 7) : '');
  const ddmmyyyy = (iso) => (iso ? ddmm(iso) + '.' + iso.slice(0, 4) : 'без даты');
  const median = (a) => {
    const s = a.slice().sort((x, y) => x - y);
    const m = Math.floor(s.length / 2);
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
  };
  const tip = (html) => ` data-tip="${esc(html)}" tabindex="0"`;
  const chain = (id) => (id === 'own'
    ? { id: 'own', name: D.meta.network, segment: D.meta.networkSegment }
    : D.chains.find((c) => c.id === id) || { id, name: id, segment: '' });
  const cityName = (id) => (id === 'all' ? 'все города' : (D.cities.find((c) => c.id === id) || {}).name || id);
  const club = (id) => D.ownClubs.find((c) => c.id === id);
  const segName = (id) => (D.segments.find((s) => s.id === id) || {}).name || '';
  const weekLabel = (id) => (D.weeks.find((w) => w.id === id) || {}).label || id;

  function badge(rec) {
    if (!rec) return '';
    if (rec.demo) return `<span class="badge badge--demo"${tip('<b>ДЕМО</b><br>Вымышлено, показывает формат.')}>ДЕМО</span>`;
    const src = rec.src ? (Array.isArray(rec.src) ? rec.src.map((s) => s.t || s).join('; ') : rec.src) : 'Ресерч 31.10.2026';
    return `<span class="badge badge--fact"${tip('<b>ФАКТ</b><br>' + esc(src))}>ФАКТ</span>`;
  }
  const lvl = (l) => `<span class="lvl lvl--${l}">${LEVEL[l]}</span>`;
  function signal(s) {
    const k = SIGNAL[s] || 0;
    return `<span class="pill"${tip('<b>Сигнал: ' + esc(s) + '</b><br>Слух: один тип данных. Подтверждается: совпали два независимых типа. Подтверждено: официально или уже произошло.')}><span class="sig">${[1, 2, 3].map((i) => `<i class="${i <= k ? 'on' : ''}"></i>`).join('')}</span>${esc(s)}</span>`;
  }
  const help = (text) => `<button class="help" type="button" aria-label="Пояснение"${tip(text).replace(' tabindex="0"', '')}>?</button>`;

  function card(o) {
    const tools = (o.toggle ? `<button class="btn btn--small" type="button" data-toggle="${o.toggle}" aria-pressed="false">Таблица</button>` : '') +
      (o.tools || '') + (o.help ? help(o.help) : '');
    return `<section class="card span-${o.span || 12}"${o.id ? ` id="${o.id}"` : ''}>
      <div class="card__head"><div>
        <h3>${o.step ? `<span class="step" aria-label="Шаг ${o.step}">${o.step}</span>` : ''}${o.title}${o.prio ? ` <span class="prio"${tip(o.prio === 'P2' ? '<b>P2</b>: показатель второй очереди. Появится, когда будут данные.' : '<b>P1</b>: показатель первой очереди.')}>${o.prio}</span>` : ''}${o.badge || ''}</h3>
        ${o.why ? `<p class="card__why">${o.why}</p>` : ''}
      </div><div class="card__tools">${tools}</div></div>
      ${o.body}
    </section>`;
  }
  /* Блок с переключателем «график / таблица»: у каждого графика есть табличный двойник. */
  function switchable(id, chartHtml, tableHtml) {
    return `<div data-view-of="${id}" data-view="chart">${chartHtml}</div><div data-view-of="${id}" data-view="table" hidden>${tableHtml}</div>`;
  }
  function table(head, rows, opts) {
    opts = opts || {};
    return `<div class="tbl-wrap"><table><thead><tr>${head.map((h) => `<th${h.num ? ' class="num"' : ''}>${h.t}</th>`).join('')}</tr></thead><tbody>${
      rows.map((r) => `<tr${r.cls ? ` class="${r.cls}"` : ''}>${r.cells.map((c, i) => `<td${head[i] && head[i].num ? ' class="num"' : ''}>${c}</td>`).join('')}</tr>`).join('') ||
      `<tr><td colspan="${head.length}">${opts.empty || 'Нет записей под выбранные фильтры.'}</td></tr>`
    }</tbody></table></div>`;
  }
  function chartSlot(key, fn) {
    charts[key] = fn;
    return `<div class="chart" data-chart="${key}"></div>`;
  }
  function drawCharts() {
    document.querySelectorAll('[data-chart]').forEach((el) => {
      const fn = charts[el.dataset.chart];
      if (!fn || el.offsetParent === null) return;
      el.innerHTML = fn(Math.max(280, Math.floor(el.clientWidth)));
    });
  }

  /* ---------- Фильтры ---------- */
  const cityOk = (c) => state.city === 'all' || c === 'all' || c === state.city;
  const segOk = (chainId) => state.segment === 'all' || chainId === 'own' || chain(chainId).segment === state.segment;
  function clubOk(e) {
    if (state.club === 'all') return true;
    if (e.club) return e.club === state.club;
    const c = club(state.club);
    return e.city === 'all' || e.city === c.city;
  }
  const scopeCities = () => (state.city === 'all' ? D.cities.map((c) => c.id) : [state.city]);
  const scopeClubs = () => D.ownClubs.filter((c) => (state.club === 'all' ? cityOk(c.city) : c.id === state.club));
  /* Событие «во всех городах» показываем в городе, только если сеть там присутствует. */
  const presentIn = (chainId, city) => city === 'all' || /^да/.test((chain(chainId).geo || {})[city] || '');
  const eventOk = (e) => cityOk(e.city) && clubOk(e) && segOk(e.chain) &&
    (e.city !== 'all' || presentIn(e.chain, state.club !== 'all' ? club(state.club).city : state.city));

  function fillFilters() {
    $('#fCity').innerHTML = `<option value="all">Все города</option>` + D.cities.map((c) => `<option value="${c.id}">${c.name}</option>`).join('');
    $('#fSegment').innerHTML = `<option value="all">Все сегменты</option>` + D.segments.map((s) => `<option value="${s.id}">${s.name}</option>`).join('');
    $('#fWeek').innerHTML = D.weeks.slice().reverse().map((w) => `<option value="${w.id}">${w.label}${w.id === D.meta.currentWeek ? ' (текущая)' : ''}</option>`).join('');
    fillClubs();
  }
  function fillClubs() {
    const list = D.ownClubs.filter((c) => state.city === 'all' || c.city === state.city);
    $('#fClub').innerHTML = `<option value="all">Все наши клубы</option>` + list.map((c) => `<option value="${c.id}">${c.name}</option>`).join('');
    if (state.club !== 'all' && !list.some((c) => c.id === state.club)) state.club = 'all';
  }
  function syncFilters() {
    $('#fCity').value = state.city;
    $('#fSegment').value = state.segment;
    fillClubs();
    $('#fClub').value = state.club;
    $('#fWeek').value = state.week;
    const changed = ['city', 'segment', 'club'].some((k) => state[k] !== 'all') || state.week !== D.meta.currentWeek;
    $('#fReset').disabled = !changed;
    $('#filterHint').textContent = 'Город, сегмент и клуб действуют на все вкладки. «Неделя событий» влияет только на тревоги и ленту. ' +
      'Цены показаны на последнюю дату фиксации: ' + ddmmyyyy(D.prices.fixed) + '.';
  }
  function save() {
    try { localStorage.setItem('fd-state', JSON.stringify({ city: state.city, segment: state.segment, club: state.club })); } catch (e) { /* без сохранения */ }
  }

  /* ---------- Графики (SVG) ---------- */
  function niceTicks(min, max, count) {
    const span = max - min || 1;
    const raw = span / (count || 4);
    const p = Math.pow(10, Math.floor(Math.log10(raw)));
    const step = [1, 2, 2.5, 5, 10].map((k) => k * p).find((s) => s >= raw) || raw;
    const lo = Math.floor(min / step) * step;
    const hi = Math.ceil(max / step) * step;
    const out = [];
    for (let v = lo; v <= hi + step / 2; v += step) out.push(Math.round(v * 100) / 100);
    return out;
  }
  /* Линии: одна ось, линии 2 px, подписи у концов линий, подсказка по колонке. */
  function lineChart(w, o) {
    const h = o.height || 220;
    const m = { l: 40, r: 128, t: 14, b: 28 };
    const iw = w - m.l - m.r;
    const ih = h - m.t - m.b;
    const all = o.series.flatMap((s) => s.values).filter((v) => v != null).concat(o.ref != null ? [o.ref] : []);
    const ticks = niceTicks(Math.min.apply(null, all), Math.max.apply(null, all), 4);
    const y0 = ticks[0];
    const y1 = ticks[ticks.length - 1];
    const n = o.labels.length;
    const x = (i) => m.l + (n === 1 ? iw / 2 : (i * iw) / (n - 1));
    const y = (v) => m.t + ih - ((v - y0) / (y1 - y0)) * ih;
    let s = `<svg viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(o.aria || 'Линейный график')}">`;
    ticks.forEach((t) => {
      s += `<line class="gridline" x1="${m.l}" x2="${m.l + iw}" y1="${y(t)}" y2="${y(t)}"/><text class="ax" x="${m.l - 6}" y="${y(t) + 4}" text-anchor="end">${num(t)}</text>`;
    });
    if (o.ref != null) {
      s += `<line class="refline" x1="${m.l}" x2="${m.l + iw}" y1="${y(o.ref)}" y2="${y(o.ref)}"/>`;
    }
    const step = Math.max(1, Math.ceil((n * 46) / iw));
    o.labels.forEach((l, i) => {
      if (i % step === 0 || i === n - 1) s += `<text class="ax" x="${x(i)}" y="${h - 8}" text-anchor="middle">${esc(l)}</text>`;
    });
    const ends = [];
    o.series.forEach((se) => {
      let d = '';
      let pen = false;
      se.values.forEach((v, i) => {
        if (v == null) { pen = false; return; }
        d += (pen ? 'L' : 'M') + x(i).toFixed(1) + ',' + y(v).toFixed(1);
        pen = true;
      });
      s += `<path d="${d}" fill="none" stroke="${se.color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>`;
      let li = se.values.length - 1;
      while (li >= 0 && se.values[li] == null) li--;
      if (li >= 0) {
        s += `<circle cx="${x(li)}" cy="${y(se.values[li])}" r="4" fill="${se.color}" stroke="var(--surface)" stroke-width="2"/>`;
        ends.push({ y: y(se.values[li]), x: x(li), text: se.name + ': ' + (o.fmt ? o.fmt(se.values[li]) : se.values[li]) });
      }
    });
    if (o.ref != null && o.refLabel) ends.push({ y: y(o.ref), x: m.l + iw, text: o.refLabel, cls: 'ax' });
    ends.sort((a, b) => a.y - b.y);
    for (let i = 1; i < ends.length; i++) if (ends[i].y - ends[i - 1].y < 15) ends[i].y = ends[i - 1].y + 15;
    ends.forEach((e) => { s += `<text class="${e.cls || 'lbl-strong'}" x="${e.x + 9}" y="${e.y + 4}">${esc(e.text)}</text>`; });
    const cw = n === 1 ? iw : iw / (n - 1);
    o.labels.forEach((l, i) => {
      const t = `<b>${esc(o.tipLabel ? o.tipLabel(l) : l)}</b><br>` + o.series.map((se) => `${esc(se.name)}: ${se.values[i] == null ? 'нет данных' : esc(o.fmt ? o.fmt(se.values[i]) : se.values[i])}`).join('<br>');
      s += `<rect class="hit" x="${x(i) - cw / 2}" y="${m.t}" width="${cw}" height="${ih}"${tip(t)}/>`;
    });
    return s + '</svg>';
  }
  /* Горизонтальные столбцы: один цвет, наша строка выделена, опорная линия медианы. */
  function hBars(w, o) {
    const rowH = 30;
    const labelW = Math.min(170, Math.round(w * 0.34));
    const valW = 96;
    const h = o.rows.length * rowH + 26;
    const iw = w - labelW - valW;
    const max = o.max || Math.max.apply(null, o.rows.map((r) => r.value || 0)) * 1.05;
    const x = (v) => labelW + (v / max) * iw;
    let s = `<svg viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(o.aria || 'Столбчатый график')}">`;
    s += `<line class="baseline" x1="${labelW}" x2="${labelW}" y1="16" y2="${h - 6}"/>`;
    o.rows.forEach((r, i) => {
      const cy = 18 + i * rowH + rowH / 2;
      s += `<text class="${r.strong ? 'lbl-strong' : 'lbl'}" x="${labelW - 8}" y="${cy + 4}" text-anchor="end">${esc(r.label)}</text>`;
      if (r.value != null) {
        s += `<rect x="${labelW}" y="${cy - 7}" width="${Math.max(2, x(r.value) - labelW)}" height="14" rx="3" fill="${r.color}"/>`;
        s += `<text class="${r.strong ? 'lbl-strong' : 'lbl'}" x="${x(r.value) + 6}" y="${cy + 4}">${esc(o.fmt(r.value))}${r.note ? ' · ' + esc(r.note) : ''}</text>`;
      } else {
        s += `<text class="ax" x="${labelW + 6}" y="${cy + 4}">нет данных</text>`;
      }
      s += `<rect class="hit" x="0" y="${cy - rowH / 2}" width="${w}" height="${rowH}"${tip(r.tip || ('<b>' + esc(r.label) + '</b><br>' + esc(o.fmt(r.value))))}/>`;
    });
    if (o.ref) {
      s += `<line class="refline" x1="${x(o.ref.value)}" x2="${x(o.ref.value)}" y1="12" y2="${h - 6}"/><text class="ax" x="${x(o.ref.value)}" y="10" text-anchor="middle">${esc(o.ref.label)}</text>`;
    }
    return s + '</svg>';
  }
  /* Наши продажи (столбцы) и рынок (точки) на одной оси «% к прошлому году». */
  function barsDots(w, o) {
    const h = 240;
    const m = { l: 44, r: 12, t: 14, b: 28 };
    const iw = w - m.l - m.r;
    const ih = h - m.t - m.b;
    const vals = o.bars.concat(o.dots).filter((v) => v != null).concat([0]);
    const ticks = niceTicks(Math.min.apply(null, vals), Math.max.apply(null, vals), 4);
    const y0 = ticks[0];
    const y1 = ticks[ticks.length - 1];
    const n = o.labels.length;
    const bw = iw / n;
    const y = (v) => m.t + ih - ((v - y0) / (y1 - y0)) * ih;
    let s = `<svg viewBox="0 0 ${w} ${h}" role="img" aria-label="Наши продажи против рынка">`;
    ticks.forEach((t) => { s += `<line class="${t === 0 ? 'baseline' : 'gridline'}" x1="${m.l}" x2="${m.l + iw}" y1="${y(t)}" y2="${y(t)}"/><text class="ax" x="${m.l - 6}" y="${y(t) + 4}" text-anchor="end">${t > 0 ? '+' : ''}${num(t)}%</text>`; });
    o.labels.forEach((l, i) => {
      const cx = m.l + bw * i + bw / 2;
      const v = o.bars[i];
      const barW = Math.min(26, bw * 0.5);
      if (v != null) {
        const top = Math.min(y(v), y(0));
        s += `<rect x="${cx - barW / 2}" y="${top}" width="${barW}" height="${Math.max(1, Math.abs(y(v) - y(0)))}" rx="3" fill="var(--s1)"/>`;
      }
      const dv = o.dots[i];
      if (dv != null) {
        s += `<circle cx="${cx}" cy="${y(dv)}" r="5.5" fill="var(--s2)" stroke="var(--surface)" stroke-width="2"/>`;
        s += `<text class="lbl-strong" x="${cx + 9}" y="${y(dv) + 4}">${esc(pct(dv))}</text>`;
      }
      s += `<text class="ax" x="${cx}" y="${h - 8}" text-anchor="middle">${esc(l)}</text>`;
      const t = `<b>${esc(l)} 2026</b><br>Мы: ${esc(pct(v))}<br>Рынок: ${dv == null ? 'не публиковался' : esc(pct(dv))}`;
      s += `<rect class="hit" x="${m.l + bw * i}" y="${m.t}" width="${bw}" height="${ih}"${tip(t)}/>`;
    });
    return s + '</svg>';
  }
  /* Полоса «минуты доезда»: наш клуб в нуле, конкуренты точками. */
  function dotStrip(w, z) {
    const h = 108;
    const m = { l: 16, r: 24 };
    const iw = w - m.l - m.r;
    const max = 20;
    const x = (v) => m.l + (v / max) * iw;
    const cy = 48;
    let s = `<svg viewBox="0 0 ${w} ${h}" role="img" aria-label="Конкуренты по времени доезда">`;
    s += `<line class="baseline" x1="${m.l}" x2="${m.l + iw}" y1="${cy}" y2="${cy}"/>`;
    [0, 5, 10, 15, 20].forEach((t) => { s += `<line class="gridline" x1="${x(t)}" x2="${x(t)}" y1="${h - 26}" y2="${h - 18}"/><text class="ax" x="${x(t)}" y="${h - 4}" text-anchor="middle">${t} мин</text>`; });
    s += `<line class="gridline" x1="${m.l}" x2="${m.l + iw}" y1="${h - 22}" y2="${h - 22}"/>`;
    s += `<rect x="${x(0) - 6}" y="${cy - 6}" width="12" height="12" rx="2" fill="var(--ink)"${tip('<b>' + esc(club(z.club).name) + '</b><br>Наш клуб')}/>`;
    const items = z.items.slice().sort((a, b) => a.minutes - b.minutes);
    items.forEach((it, i) => {
      const open = it.status === 'работает';
      const col = it.isNew ? 'var(--s1)' : 'var(--other)';
      const fill = open ? col : 'var(--surface)';
      const ly = i % 2 ? cy + 24 : cy - 14;
      s += `<circle cx="${x(it.minutes)}" cy="${cy}" r="6" fill="${fill}" stroke="${open ? 'var(--surface)' : col}" stroke-width="${open ? 2 : 2.5}"/>`;
      s += `<text class="${it.isNew ? 'lbl-strong' : 'lbl'}" x="${x(it.minutes)}" y="${ly}" text-anchor="middle">${esc(chain(it.chain).name)}</text>`;
      s += `<rect class="hit" x="${x(it.minutes) - 14}" y="${cy - 30}" width="28" height="60"${tip('<b>' + esc(chain(it.chain).name) + '</b><br>' + it.minutes + ' мин доезда<br>Статус: ' + esc(it.status) + (it.isNew ? '<br>Новый за квартал' : ''))}/>`;
    });
    return s + '</svg>';
  }

  /* ---------- Расчёты ---------- */
  function priceIndex(city) {
    const seg = D.meta.networkSegment;
    const own = D.prices.rows.find((r) => r.chain === 'own' && r.city === city);
    const comp = D.prices.rows.filter((r) => r.city === city && r.chain !== 'own' && chain(r.chain).segment === seg);
    if (!own) return null;
    const cur = comp.map((r) => r.m12);
    const prevRows = comp.filter((r) => r.prevM12 != null);
    const res = { city, own, comp, n: cur.length, idx: null, prevIdx: null, med: null };
    if (cur.length >= 2) { res.med = median(cur); res.idx = Math.round((own.m12 / res.med) * 100); }
    if (prevRows.length >= 2 && own.prevM12 != null) res.prevIdx = Math.round((own.prevM12 / median(prevRows.map((r) => r.prevM12))) * 100);
    return res;
  }
  function weekEvents() {
    return D.events.filter((e) => e.week === state.week && eventOk(e));
  }
  const byLevel = (a, b) => LEVEL_RANK[a.level] - LEVEL_RANK[b.level] || (b.date > a.date ? 1 : b.date < a.date ? -1 : 0);
  const daysTo = (iso) => Math.round((new Date(iso + 'T00:00:00') - new Date(D.meta.today + 'T00:00:00')) / 86400000);
  const mainChains = (city) => {
    const set = new Set();
    D.ownClubs.filter((c) => c.city === city && (state.club === 'all' || c.id === state.club)).forEach((c) => c.main.forEach((m) => set.add(m)));
    return set;
  };

  /* ---------- Вкладка 1. Неделя ---------- */
  function alertCard(e) {
    const c = e.club ? club(e.club) : null;
    const rule = e.alert ? D.alertRules.find((r) => r.n === e.alert) : null;
    return `<article class="alert alert--${e.level}">
      <div class="alert__meta">${lvl(e.level)}<b>${esc(chain(e.chain).name)}</b><span>${esc(cityName(e.city))}${c ? ' · ' + esc(c.name) : ''}</span>
        ${e.minutes ? `<span class="pill">${e.minutes} мин до нашего клуба</span>` : ''}<span class="pill">${esc(e.type)}</span>${signal(e.signal)}<span>${ddmm(e.date)}</span>${badge(e)}</div>
      <dl class="alert__body"><dt>Что случилось</dt><dd>${esc(e.what)}</dd><dt>Что это значит</dt><dd>${esc(e.means)}</dd><dt>Что делаем</dt><dd><b>${esc(e.action)}</b></dd></dl>
      <div class="alert__side">
        ${e.cardsExpiring ? `<div><span class="big">${num(e.cardsExpiring)}</span>карт базы клуба заканчиваются в ближайшие 90 дней <span class="badge badge--demo"${tip('Наши внутренние данные: в макете вымышлены')}>ДЕМО</span></div>` : ''}
        <div>Ответственный: <b>${esc(e.owner)}</b></div>
        ${rule ? `<div>Алерт №${rule.n}: ${esc(rule.title)}</div>` : ''}
      </div></article>`;
  }
  function feedItem(e) {
    return `<li><div class="who">${esc(chain(e.chain).name)}<small>${esc(cityName(e.city))} · ${ddmm(e.date)}</small></div>
      <div><div class="txt">${lvl(e.level)} ${esc(e.what)} ${badge(e)}</div><div class="act"><b>Что делаем:</b> ${esc(e.action)}</div></div></li>`;
  }
  function renderWeek() {
    const evs = weekEvents();
    const alerts = evs.filter((e) => e.alert && e.level !== 'info').sort(byLevel);
    const rest = evs.filter((e) => alerts.indexOf(e) < 0).sort(byLevel);
    const feed = ui.showAllFeed ? rest : rest.slice(0, 5);
    const hidden = localStorage.getItem('fd-howto') === 'hidden';
    const howto = hidden ? `<div class="howto-bar"><span></span><button class="btn btn--small" type="button" id="howtoShow">Как читать этот экран</button></div>` :
      `<div class="howto-bar"><span>Как читать этот экран за 10 минут</span><button class="btn btn--small" type="button" id="howtoHide">Скрыть</button></div>
      <div class="howto">
        <div><span class="step">1</span><p><b>0–3 мин: тревоги</b>Есть ли пожар у наших клубов. Пусто значит «без тревог».</p></div>
        <div><span class="step">2</span><p><b>3–5 мин: лента</b>Что ещё произошло. У каждого события есть «что делаем».</p></div>
        <div><span class="step">3</span><p><b>5–7 мин: цены</b>Индекс и таблица «мы против главных», только изменения.</p></div>
        <div><span class="step">4</span><p><b>7–10 мин: клуб под защитой</b>Сработала ли защита. Дальше 2–3 строки руководителю.</p></div>
      </div>`;

    const alertsBody = alerts.length ? `<div class="alerts">${alerts.map(alertCard).join('')}</div>` :
      `<div class="empty"><b>Без тревог на неделе ${esc(weekLabel(state.week))}.</b> Рядом с нашими клубами ничего не открылось, новых trade-in и базовых цен нет. В этом месяце стоит посмотреть: ${monthReminders()}.</div>`;
    const feedBody = feed.length ? `<ul class="feed">${feed.map(feedItem).join('')}</ul>` +
      (rest.length > 5 ? `<p class="more">${ui.showAllFeed ? '' : `Показаны 5 из ${rest.length}. `}<button class="btn btn--small" type="button" id="feedAll">${ui.showAllFeed ? 'Свернуть до 5' : 'Показать все'}</button></p>` : '') :
      `<div class="empty">Других событий за неделю нет.</div>`;

    const cities = scopeCities();
    const tiles = cities.map((c) => indexTile(priceIndex(c))).join('');

    const prot = D.protected;
    const pc = club(prot.club);
    const protVisible = cityOk(pc.city) && (state.club === 'all' || state.club === prot.club);
    const protBody = protVisible ? `<p class="card__why" style="margin-bottom:6px">${esc(pc.name)}: ${esc(prot.reason)}. Продажи клуба и контрольных клубов, неделя открытия = 100.</p>` +
      switchable('prot', `<div class="legend"><span><i style="background:var(--s1)"></i>${esc(pc.name)}</span><span><i style="background:var(--s2)"></i>Контрольные клубы (без нового соседа)</span></div>` + chartSlot('prot', protChart),
        table([{ t: 'Неделя' }, { t: pc.name, num: true }, { t: 'Контрольные', num: true }], prot.weeks.map((wk, i) => ({ cells: [wk, prot.own[i], prot.control[i]] })))) +
      `<p style="margin-top:8px;font-size:.88rem"><b>Вывод:</b> ${esc(prot.verdict)}</p>` :
      `<div class="empty">Под выбранные фильтры клубов под защитой нет.</div>`;

    return `${howto}<div class="grid">
      ${card({ step: 1, title: 'Тревоги', why: 'Срочные события у наших клубов. Тревогу вызывают 5 типов событий, полный список в «Справке».', help: 'Тревога = открытие или закрытие в зоне клуба, trade-in, новая базовая цена или взнос, волна жалоб на свой клуб, новая норма, которая задевает идущую кампанию. Обычные акции сюда не попадают.', body: alertsBody })}
      ${card({ step: 2, span: 7, title: 'Лента недели', why: 'До 5 событий: сначала важные, затем свежие.', help: 'Сортировка по важности, а не по времени: хронологическая лента прячет главное.', body: feedBody })}
      ${card({ step: 3, span: 5, title: 'Индекс цены, наш сегмент', why: 'Насколько мы дороже или дешевле похожих конкурентов.', help: 'Сравнивается полная сумма за 12 месяцев со вступительным взносом. Сегмент: ' + esc(segName(D.meta.networkSegment)) + '. Если в городе меньше 2 предложений в сегменте, индекс не считается.', badge: ' ' + badge(D.prices),
        body: `<div class="tiles">${tiles}</div><p class="formula">Индекс = наша полная сумма за 12 мес. со взносом / медиана той же суммы у сетей нашего сегмента в городе × 100. <b>Больше 100: мы дороже.</b></p>` })}
      ${card({ step: 3, title: 'Мы против главных конкурентов', why: 'Главные для наших клубов сети. По умолчанию только строки, где что-то изменилось за неделю.', badge: ' ' + badge(D.prices),
        tools: `<button class="btn btn--small" type="button" id="onlyChanged" aria-pressed="${ui.onlyChanged}">Только изменения</button>`, body: versusTable() })}
      ${card({ step: 4, span: 7, title: 'Клуб под защитой', why: 'Как новый сосед повлиял на продажи. Решение принимать по 2–3 месяцам, а не по первой неделе.', toggle: 'prot', badge: ' ' + badge(prot), body: protBody })}
      ${card({ span: 5, title: 'Что посмотреть в этом месяце', why: 'Ближайшие даты из вкладки «Сезон и правила».', body: milestonesList() })}
      <div class="span-12 marketline"><b>Рынок</b><span>${esc(D.marketLine.text)}</span><span>${esc(D.marketLine.scope)}</span><span>${esc(D.marketLine.source)}</span><span>данные за ${esc(D.marketLine.period)}</span><span class="pill">${esc(D.marketLine.type)}</span><a href="#market">Подробнее во вкладке «Мы и рынок»</a></div>
    </div>`;
  }
  function indexTile(r) {
    if (!r) return '';
    const name = cityName(r.city);
    if (r.idx == null) {
      return `<div class="tile"><div class="tile__label">${esc(name)}</div><div class="tile__value na">н/д</div>
        <div class="tile__note">В сегменте ${r.n} предложение (${r.comp.map((c) => esc(chain(c.chain).name)).join(', ') || 'нет'}). Нужно минимум 2.</div></div>`;
    }
    const diff = r.idx - 100;
    const word = diff > 0 ? `Мы дороже медианы на ${diff}%` : diff < 0 ? `Мы дешевле медианы на ${-diff}%` : 'На уровне медианы';
    let delta = '<span class="flat">нет прошлой недели</span>';
    if (r.prevIdx != null) {
      const d = r.idx - r.prevIdx;
      delta = d === 0 ? '<span class="flat">= без изменений за неделю</span>' : `<span class="flat">${d > 0 ? '▲' : '▼'} ${Math.abs(d)} за неделю (было ${r.prevIdx})</span>`;
    }
    const promo = r.comp.filter((c) => c.status === 'акция').map((c) => chain(c.chain).name);
    return `<div class="tile"${tip('<b>' + esc(name) + '</b><br>Наша сумма: ' + esc(rub(r.own.m12)) + '<br>Медиана сегмента: ' + esc(rub(Math.round(r.med))) + '<br>Предложений: ' + r.n)}>
      <div class="tile__label">${esc(name)}</div><div class="tile__value">${r.idx}</div>
      <div class="tile__delta">${delta}</div><div class="tile__note">${word}. В медиане ${r.n} предложения${promo.length ? '; у ' + promo.map(esc).join(', ') + ' сейчас акция, не база' : ''}.</div></div>`;
  }
  function versusTable() {
    const rows = [];
    scopeCities().forEach((city) => {
      const mains = mainChains(city);
      D.prices.rows.filter((r) => r.city === city && (r.chain === 'own' || (mains.has(r.chain) && segOk(r.chain)))).forEach((r) => {
        const changed = r.prevM12 == null || r.prevM12 !== r.m12;
        if (ui.onlyChanged && r.chain !== 'own' && !changed) return;
        const d = r.prevM12 == null ? 'новый в городе' : r.m12 === r.prevM12 ? '=' : pct(Math.round(((r.m12 - r.prevM12) / r.prevM12) * 1000) / 10);
        rows.push({ cls: r.chain === 'own' ? 'own' : '', cells: [esc(cityName(city)), esc(chain(r.chain).name), rub(r.m1), rub(r.m12), rub(r.fee),
          r.status === 'акция' ? '<span class="pill">акция</span>' : 'база', r.chain === 'own' ? '' : `<span class="${changed ? 'changed' : ''}">${d}</span>`] });
      });
    });
    const compRows = rows.filter((r) => r.cls !== 'own').length;
    return table([{ t: 'Город' }, { t: 'Сеть' }, { t: 'Первый платёж', num: true }, { t: '12 мес. со взносом', num: true }, { t: 'Взнос', num: true }, { t: 'Цена' }, { t: 'За неделю', num: true }], rows) +
      (ui.onlyChanged && compRows === 0 ? '<p class="more">У главных конкурентов цены за неделю не менялись. Наша строка оставлена для сравнения.</p>' : '');
  }
  function protChart(w) {
    const p = D.protected;
    return lineChart(w, { labels: p.weeks, ref: 100, refLabel: '100 = старт', aria: 'Продажи клуба под защитой против контрольных',
      series: [{ name: club(p.club).name.replace('Наш клуб ', ''), values: p.own, color: 'var(--s1)' }, { name: 'Контрольные', values: p.control, color: 'var(--s2)' }] });
  }
  function monthReminders() {
    return D.milestones.filter((m) => daysTo(m.date) >= 0 && daysTo(m.date) <= 45).map((m) => `${esc(m.title)} (через ${daysTo(m.date)} дн.)`).join(', ') || 'календарь сезона';
  }
  function milestonesList() {
    const items = D.milestones.filter((m) => daysTo(m.date) >= 0).slice(0, 3);
    return `<ul class="feed">${items.map((m) => `<li><div class="who">${ddmmyyyy(m.date)}<small>через ${daysTo(m.date)} дн.</small></div><div class="txt">${esc(m.title)}</div></li>`).join('')}</ul>`;
  }

  /* ---------- Вкладка 2. Цены и акции ---------- */
  function renderPrices() {
    const cities = scopeCities();
    const charts12 = cities.map((city) => {
      const r = priceIndex(city);
      const key = 'bars-' + city;
      const rows = D.prices.rows.filter((p) => p.city === city && segOk(p.chain)).sort((a, b) => a.m12 - b.m12).map((p) => ({
        label: chain(p.chain).name, value: p.m12, strong: p.chain === 'own', color: p.chain === 'own' ? 'var(--s1)' : 'var(--other)',
        note: p.status === 'акция' ? 'акция' : '', tip: `<b>${esc(chain(p.chain).name)}</b><br>12 мес. со взносом: ${esc(rub(p.m12))}<br>Взнос: ${esc(rub(p.fee))}<br>Цена: ${esc(p.status)}`
      }));
      const max = Math.max.apply(null, D.prices.rows.map((p) => p.m12)) * 1.05;
      charts[key] = (w) => hBars(w, { rows, max, fmt: rub, ref: r && r.med ? { value: r.med, label: 'медиана сегмента' } : null, aria: 'Полная сумма за 12 месяцев, ' + cityName(city) });
      return `<div><h4 style="font-size:.92rem;margin-bottom:4px">${esc(cityName(city))}</h4><div class="chart" data-chart="${key}"></div></div>`;
    }).join('');

    const tblRows = [];
    cities.forEach((city) => D.prices.rows.filter((p) => p.city === city && segOk(p.chain)).forEach((p) => tblRows.push({ cls: p.chain === 'own' ? 'own' : '',
      cells: [esc(cityName(city)), esc(chain(p.chain).name), esc(segName(chain(p.chain).segment)), rub(p.m1), rub(p.m3), rub(p.m12), rub(p.fee), esc(p.status),
        p.prevM12 == null ? 'новый' : p.prevM12 === p.m12 ? '=' : pct(Math.round(((p.m12 - p.prevM12) / p.prevM12) * 1000) / 10)] })));
    D.prices.noData.filter((n) => segOk(n.chain)).forEach((n) => tblRows.push({ cls: 'nodata', cells: ['все', esc(chain(n.chain).name), esc(segName(chain(n.chain).segment)), 'нет данных', '', '', '', esc(n.reason), 'проверено ' + esc(n.checked) + ' ' + badge({ demo: false, src: 'Ресерч D, 31.10.2026' })] }));
    const priceTable = table([{ t: 'Город' }, { t: 'Сеть' }, { t: 'Сегмент' }, { t: '1 мес. со взносом', num: true }, { t: '3 мес.', num: true }, { t: '12 мес.', num: true }, { t: 'Взнос', num: true }, { t: 'Цена' }, { t: 'За неделю', num: true }], tblRows);

    const ih = D.indexHistory;
    const curIdx = { msk: priceIndex('msk'), spb: priceIndex('spb') };
    const idxSeries = ['msk', 'spb'].filter((c) => scopeCities().indexOf(c) >= 0).map((c, i) => ({ name: cityName(c) === 'Санкт-Петербург' ? 'СПб' : cityName(c), values: ih[c].concat([curIdx[c].idx]), color: i === 0 ? 'var(--s1)' : 'var(--s2)' }));
    const idxLabels = ih.weeks.concat([D.meta.currentWeek]);
    const idxBody = idxSeries.length ? switchable('idx', `<div class="legend">${idxSeries.map((s) => `<span><i style="background:${s.color}"></i>${esc(s.name)}</span>`).join('')}</div>` +
      chartSlot('idx', (w) => lineChart(w, { labels: idxLabels, series: idxSeries, ref: 100, refLabel: '100 = медиана', aria: 'Индекс цены по неделям' })),
    table([{ t: 'Неделя' }].concat(idxSeries.map((s) => ({ t: s.name, num: true }))), idxLabels.map((l, i) => ({ cells: [l].concat(idxSeries.map((s) => s.values[i])) })))) +
      '<p class="card__why" style="margin-top:6px">Сочи: индекс не считается, в сегменте одно предложение (DDX).</p>' :
      '<div class="empty">Для выбранного города индекс не считается: в сегменте меньше двух предложений.</div>';

    const promos = D.promos.filter((p) => cityOk(p.city) && segOk(p.chain));
    const promoRows = promos.map((p) => ({ cells: [esc(chain(p.chain).name), esc(p.title) + (p.tradein ? ' <span class="pill">trade-in</span>' : ''), esc(cityName(p.city)), esc(p.scope), esc(p.depth),
      p.weeks == null ? '<span class="flat">нет истории: наблюдаем с 31.10</span>' : p.weeks + ' нед.',
      esc(p.after), p.weeks != null && p.weeks >= 8 ? `<span class="lvl lvl--serious">Держится ${p.weeks} нед.: считать новой базовой ценой</span>` : '', badge(p)] }));
    const trade = D.promos.filter((p) => p.tradein && cityOk(p.city) && segOk(p.chain));

    const modelRows = D.chains.filter((c) => segOk(c.id)).map((c) => ({ cells: ['<b>' + esc(c.name) + '</b>', esc(segName(c.segment)), esc(c.model), esc(c.freeze), esc(c.exit), badge({ demo: false, src: c.src })] }));

    return `<div class="grid">
      ${card({ title: 'Полная сумма за 12 месяцев со взносом', why: 'Сравниваем то, что клиент реально заплатит за год. Наша сеть выделена, линия показывает медиану нашего сегмента.', toggle: 'p12', badge: ' ' + badge(D.prices),
        help: 'Сравниваем полные суммы за одинаковый срок (1, 3 и 12 месяцев) с вступительным взносом. Годовую оплату, делённую на 12, не называем месячной ценой.',
        body: switchable('p12', `<div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(300px,1fr))">${charts12}</div>`, priceTable) })}
      ${card({ span: 7, title: 'Индекс цены по неделям', why: 'Выше 100: мы дороже медианы сегмента. Падение индекса значит, что конкуренты подняли цены или мы снизили свои.', toggle: 'idx', badge: ' ' + badge(ih), body: idxBody })}
      ${card({ span: 5, title: 'Trade-in: переманивание нашей базы', why: 'Предложения обменять абонемент другого клуба. Самая прямая атака на клиентов с заканчивающимися картами.',
        body: trade.length ? `<ul class="feed">${trade.map((p) => `<li><div class="who">${esc(chain(p.chain).name)}<small>${esc(cityName(p.city))}</small></div><div><div class="txt">${esc(p.title)} ${badge(p)}</div><div class="act"><b>Что делаем:</b> предложение на продление тем, у кого карта заканчивается в ближайшие 60–90 дней.</div></div></li>`).join('')}</ul>` : '<div class="empty">Trade-in под выбранные фильтры нет.</div>' })}
      ${card({ title: 'Акции конкурентов', why: 'Механика, охват, срок и возраст. Акция, которая держится 8+ недель во всей сети, считается новой базовой ценой.',
        help: 'Возраст акции нужен, чтобы не «отвечать» месяцами на то, что давно стало прайсом. Для акций, замеченных 31.10, истории пока нет.',
        body: table([{ t: 'Сеть' }, { t: 'Акция' }, { t: 'Где' }, { t: 'Охват' }, { t: 'Глубина' }, { t: 'Возраст' }, { t: 'Что после' }, { t: 'Флаг' }, { t: '' }], promoRows) })}
      ${card({ title: 'Модель оплаты и условия выхода', why: 'Подписка или карта, заморозка, как уйти. Тяжёлый выход у конкурента значит, что trade-in стоит нацелить на конец срока его карт.',
        body: table([{ t: 'Сеть' }, { t: 'Сегмент' }, { t: 'Модель оплаты' }, { t: 'Заморозка' }, { t: 'Выход из договора' }, { t: '' }], modelRows) })}
    </div>`;
  }

  /* ---------- Вкладка 3. Зоны клубов ---------- */
  function renderZones() {
    const clubs = scopeClubs();
    const zoneCards = clubs.map((c) => {
      const z = D.zones.clubs.find((x) => x.club === c.id);
      if (!z) return '';
      const items = z.items.filter((it) => segOk(it.chain));
      const zz = Object.assign({}, z, { items });
      const nNew = items.filter((i) => i.isNew).length;
      const key = 'zone-' + c.id;
      charts[key] = (w) => dotStrip(w, zz);
      const tbl = table([{ t: 'Сеть' }, { t: 'Мин. доезда', num: true }, { t: 'Статус' }, { t: 'Новый за квартал' }],
        items.slice().sort((a, b) => a.minutes - b.minutes).map((i) => ({ cells: [esc(chain(i.chain).name), i.minutes, esc(i.status), i.isNew ? 'да' : ''] })));
      return card({ span: 6, title: esc(c.name), why: `${esc(cityName(c.city))}. В зоне до 20 мин: <b>${items.length}</b> конкурентов, квартал назад было ${z.quarterAgo}.${nNew ? ` Новых или готовящихся: ${nNew}.` : ''}`, toggle: key, badge: ' ' + badge(D.zones),
        body: switchable(key, `<div class="legend"><span><i class="dot" style="background:var(--ink)"></i>наш клуб</span><span><i class="dot" style="background:var(--other)"></i>работает</span><span><i class="ring"></i>анонс, предпродажа, сигнал</span><span><i class="dot" style="background:var(--s1)"></i>новый за квартал</span></div>` +
          `<div class="chart" data-chart="${key}"></div>`, tbl) });
    }).join('');
    const sigTypes = ['Предпродажа клуба', 'Открытие клуба', 'Закрытие клуба', 'Ранний сигнал'];
    const sig = D.events.filter((e) => sigTypes.indexOf(e.type) >= 0 && eventOk(e)).sort((a, b) => (b.date > a.date ? 1 : -1));
    const sigRows = sig.map((e) => ({ cells: [ddmm(e.date), esc(chain(e.chain).name), e.club ? esc(club(e.club).name) : esc(cityName(e.city)), e.minutes || '', esc(e.type), signal(e.signal), esc(e.what), '<b>' + esc(e.action) + '</b>', badge(e)] }));
    const densRows = clubs.map((c) => {
      const z = D.zones.clubs.find((x) => x.club === c.id);
      if (!z) return null;
      const items = z.items.filter((it) => segOk(it.chain));
      return { cells: [esc(c.name), esc(cityName(c.city)), items.length, items.filter((i) => i.isNew).length, z.quarterAgo, c.main.map((m) => esc(chain(m).name)).join(', ')] };
    }).filter(Boolean);
    return `<div class="grid">
      ${card({ title: 'Плотность конкурентов вокруг наших клубов', why: 'Сколько конкурентов в зоне каждого клуба сейчас и квартал назад. Это первое, что спросит руководитель.', badge: ' ' + badge(D.zones), help: esc(D.zones.note),
        body: table([{ t: 'Наш клуб' }, { t: 'Город' }, { t: 'В зоне', num: true }, { t: 'Новые за квартал', num: true }, { t: 'Квартал назад', num: true }, { t: 'Главные конкуренты' }], densRows) })}
      ${zoneCards || card({ title: 'Клубы', body: '<div class="empty">Под выбранные фильтры наших клубов нет.</div>' })}
      ${card({ title: 'Сигналы открытий и закрытий в зонах', why: 'Все недели, от слуха до факта. Сигнал подтверждён, когда совпали два независимых типа данных: аренда и вакансии весят больше анонса, анонс больше интервью.',
        body: table([{ t: 'Дата' }, { t: 'Сеть' }, { t: 'Где' }, { t: 'Мин.', num: true }, { t: 'Тип' }, { t: 'Сигнал' }, { t: 'Что случилось' }, { t: 'Что делаем' }, { t: '' }], sigRows) })}
    </div>`;
  }

  /* ---------- Вкладка 4. Карточки конкурентов ---------- */
  function renderChains() {
    let list = D.chains.filter((c) => segOk(c.id));
    let hiddenNote = '';
    if (state.city !== 'all') {
      const present = list.filter((c) => /^да/.test(c.geo[state.city]));
      const hidden = list.length - present.length;
      if (hidden) hiddenNote = `<p class="filters__hint" style="margin-bottom:10px">Скрыто сетей без подтверждённого присутствия в городе «${esc(cityName(state.city))}»: ${hidden}. Уберите фильтр города, чтобы увидеть все.</p>`;
      list = present;
    }
    const geo = (c) => D.cities.map((ct) => { const v = c.geo[ct.id] || 'нет данных'; const yes = /^да/.test(v); return `<span class="${yes ? 'yes' : 'no'}"${tip('<b>' + esc(ct.name) + '</b><br>' + esc(v))}>${ct.id === 'msk' ? 'Мск' : ct.id === 'spb' ? 'СПб' : 'Сочи'}: ${yes ? 'да' : 'н/д'}</span>`; }).join('');
    const cards = list.map((c) => {
      const evs = D.events.filter((e) => e.chain === c.id).sort((a, b) => (b.date > a.date ? 1 : -1)).slice(0, 4);
      return `<article class="card chain">
        <div class="card__head"><div><h3>${esc(c.name)} ${badge({ demo: false, src: c.src })}</h3><p class="card__why">${esc(segName(c.segment))}</p></div></div>
        <div class="geo">${geo(c)}</div>
        <dl>
          <dt>Модель оплаты</dt><dd>${esc(c.model)}</dd>
          <dt>Форматы</dt><dd>${esc(c.formats)}</dd>
          <dt>На чём конкурирует</dt><dd>${esc(c.competes)}</dd>
          <dt>Что изменилось</dt><dd>${esc(c.changes)}</dd>
          <dt>Клубов</dt><dd>${esc(c.clubs)}</dd>
          ${c.selfReports.length ? `<dt>Самоотчёты</dt><dd>${c.selfReports.map(esc).join('<br>')} <span class="pill"${tip('Данные компании без раскрытой методики. Не сравнивать с другими сетями.')}>самоотчёт</span></dd>` : ''}
          <dt>Темы жалоб</dt><dd>${c.complaints.items.length ? c.complaints.items.map(esc).join('; ') + ' ' + badge(c.complaints) : '<span class="flat">нет данных</span>'}</dd>
          <dt>Последние ходы</dt><dd>${evs.length ? `<ul class="timeline">${evs.map((e) => `<li><time>${ddmm(e.date)}</time>${esc(e.type)}: ${esc(e.what)} ${badge(e)}</li>`).join('')}</ul>` : '<span class="flat">событий нет</span>'}</dd>
        </dl>
        <p class="src">Источники: ${c.src.map((s) => `<a href="${esc(s.u)}" target="_blank" rel="noopener">${esc(s.t)}</a>`).join(' · ')}</p>
      </article>`;
    }).join('');
    return hiddenNote + `<div class="chains">${cards || '<div class="empty">Под выбранные фильтры сетей нет.</div>'}</div>`;
  }

  /* ---------- Вкладка 5. Мы и рынок ---------- */
  function renderMarket() {
    const ovm = D.ownVsMarket;
    const ovmTable = table([{ t: 'Месяц 2026' }, { t: 'Мы', num: true }, { t: 'Рынок', num: true }], ovm.months.map((m, i) => ({ cells: [m, pct(ovm.own.values[i]), ovm.market.values[i] == null ? 'не публиковался' : pct(ovm.market.values[i])] })));
    const facts = D.marketFacts.map((f) => ({ cells: [esc(f.period), esc(f.metric), '<b>' + esc(f.value) + '</b>', esc(f.extra), `<a href="${esc(f.u)}" target="_blank" rel="noopener">${esc(f.source)}</a>`, `<span class="pill">${esc(f.type)}</span>`] }));
    const ch = D.churnToCompetitor;
    const prot = D.protected;
    const resp = D.responses;
    const respRows = resp.rows.map((r) => ({ cells: [ddmmyyyy(r.date), esc(r.event), esc(r.response), esc(r.result), `<span class="pill">${esc(r.status)}</span>`] }));
    return `<div class="grid">
      ${card({ title: 'Наши продажи карт против рынка', why: esc(ovm.measure), toggle: 'ovm', badge: ' ' + badge(ovm.own) + ' ' + badge({ demo: false, src: ovm.market.src.join('; ') }),
        help: 'Рынок показан только за месяцы, по которым есть публикация НФС. Ряд НФС в прессе местами противоречив, поэтому каждая точка подписана источником.',
        body: switchable('ovm', `<div class="legend"><span><i class="box" style="background:var(--s1)"></i>Мы (только клубы, которые работали и год назад)</span><span><i class="dot" style="background:var(--s2)"></i>Рынок РФ, НФС</span></div>` +
          chartSlot('ovm', (w) => barsDots(w, { labels: ovm.months, bars: ovm.own.values, dots: ovm.market.values })), ovmTable) +
          `<p class="card__why" style="margin-top:6px">Источники рынка: ${ovm.market.src.map(esc).join('; ')}.</p>` })}
      ${card({ span: 5, title: 'Рынок растёт в деньгах, а не в людях', why: '2025 год, РБК Исследования рынков. Рост в основном дают цены.', badge: ' ' + badge({ demo: false, src: 'РБК, 08.06.2026; ресерч A, D, GPT' }),
        body: `<div class="tiles"><div class="tile"><div class="tile__label">В деньгах</div><div class="tile__value">+13,4%</div><div class="tile__note">в текущих ценах</div></div><div class="tile"><div class="tile__label">В сопоставимых ценах</div><div class="tile__value">+4,1%</div><div class="tile__note">за вычетом роста цен</div></div></div>
          <p class="formula">Оценки объёма рынка расходятся в 2,4 раза (132–316,5 млрд ₽), поэтому объём на дашборд не выносится. Все четыре оценки есть в «Справке».</p>` })}
      ${card({ span: 7, title: 'Что публиковалось о рынке', why: 'Каждая цифра с источником и типом. «1 источник» значит, что второго подтверждения нет.',
        body: table([{ t: 'Период' }, { t: 'Показатель' }, { t: 'Значение' }, { t: 'Ещё' }, { t: 'Источник' }, { t: 'Надёжность' }], facts) })}
      ${card({ span: 7, title: 'Эффект открытия рядом', why: esc(club(prot.club).name) + ': ' + esc(prot.reason) + '. Сравнение с клубами без нового соседа.', toggle: 'prot2', badge: ' ' + badge(prot),
        body: switchable('prot2', `<div class="legend"><span><i style="background:var(--s1)"></i>${esc(club(prot.club).name)}</span><span><i style="background:var(--s2)"></i>Контрольные клубы</span></div>` + chartSlot('prot2', protChart),
          table([{ t: 'Неделя' }, { t: 'Клуб', num: true }, { t: 'Контрольные', num: true }], prot.weeks.map((wk, i) => ({ cells: [wk, prot.own[i], prot.control[i]] })))) + `<p style="margin-top:8px;font-size:.88rem"><b>Вывод:</b> ${esc(prot.verdict)}</p>` })}
      ${card({ span: 5, title: 'Куда уходят наши клиенты', prio: 'P2', why: esc(ch.period) + '. Нужен опрос уходящих; если его нет, блок появится позже.', toggle: 'churn', badge: ' ' + badge(ch),
        body: switchable('churn', chartSlot('churn', (w) => hBars(w, { rows: ch.rows.map((r) => ({ label: r.name, value: r.share, color: 'var(--s1)' })), max: 50, fmt: (v) => v + '%', aria: 'Куда уходят клиенты' })),
          table([{ t: 'Куда' }, { t: 'Доля ушедших', num: true }], ch.rows.map((r) => ({ cells: [esc(r.name), r.share + '%'] })))) })}
      ${card({ title: 'Журнал наших ответов', why: 'Что сделали на ход конкурента и что вышло через 2–3 месяца. Без журнала через полгода никто не вспомнит, помогала ли защита.', badge: ' ' + badge(resp),
        tools: `<span class="pill">за квартал: сигналов ${resp.signalsQuarter}, действий ${resp.actionsQuarter}</span>`,
        body: table([{ t: 'Дата' }, { t: 'Событие' }, { t: 'Наш ответ' }, { t: 'Результат' }, { t: 'Статус' }], respRows) })}
    </div>`;
  }

  /* ---------- Вкладка 6. Сезон и правила ---------- */
  function renderSeason() {
    const nowM = Number(D.meta.today.slice(5, 7));
    const kinds = { peak: 'пик привлечения', retain: 'удержание', prep: 'подготовка и вычет', normal: '' };
    const months = D.season.map((s) => `<div class="month month--${s.kind}${s.m === nowM ? ' month--now' : ''}"${tip('<b>' + esc(s.title) + '</b>' + (s.note ? '<br>' + esc(s.note) : ''))}>
      ${s.m === nowM ? '<span class="now">сейчас</span>' : ''}<b>${['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'][s.m - 1]}</b>${esc(kinds[s.kind])}</div>`).join('');
    const seasonTable = table([{ t: 'Месяц' }, { t: 'Что' }, { t: 'Основание' }], D.season.map((s) => ({ cells: [s.m, esc(s.title), esc(s.note)] })));
    const countdown = D.milestones.filter((m) => daysTo(m.date) >= 0).map((m) => `<div class="tile"><div class="tile__label">${esc(m.title)}</div><div class="tile__value">${daysTo(m.date)}</div><div class="tile__note">дней, ${ddmmyyyy(m.date)}</div></div>`).join('');
    const reg = D.regulation.slice().sort((a, b) => ((a.date || '9') > (b.date || '9') ? 1 : -1)).map((r) => ({ cells: [ddmmyyyy(r.date), '<b>' + esc(r.title) + '</b>', esc(r.what), esc(r.impact),
      `<span class="pill">${esc(r.status)}</span>`, `<a href="${esc(r.u)}" target="_blank" rel="noopener">источник</a>`] }));
    return `<div class="grid">
      ${card({ title: 'Сезонный календарь', why: 'Когда привлекать, когда удерживать. Наведите на месяц, чтобы увидеть основание.', toggle: 'season', badge: ' ' + badge({ demo: false, src: 'НФС; ресерч A, D' }),
        body: switchable('season', `<div class="legend"><span><i class="box" style="background:var(--s2)"></i>пик привлечения</span><span><i class="box" style="background:var(--s1)"></i>удержание</span><span><i class="box" style="background:var(--s3)"></i>подготовка и вычет</span></div><div class="months">${months}</div>`, seasonTable) +
          '<p class="card__why" style="margin-top:8px">Сочи живёт по туристическому сезону, данных о его влиянии на фитнес нет ни в одном источнике.</p>' })}
      ${card({ span: 5, title: 'Обратный отсчёт', why: 'Ближайшие даты, к которым нужно готовить кампании.', body: `<div class="tiles" style="grid-template-columns:repeat(2,1fr)">${countdown}</div>` })}
      ${card({ span: 7, title: 'Что конкуренты делали в этот месяц год назад', why: 'Помогает выбрать время кампании и понять, где ждать атак.',
        body: '<div class="empty"><b>История пока копится.</b> Наблюдение за конкурентами началось 31.10.2026, поэтому первое сравнение с прошлым годом появится в октябре 2027. До этого месяца здесь будет пусто.</div>' })}
      ${card({ title: 'Регуляторный календарь', why: 'Нормы, которые меняют рекламу, договоры и цены. Тревога появляется, если норма задевает кампанию, которая идёт прямо сейчас.', badge: ' ' + badge({ demo: false, src: 'ФАС, ГАРАНТ, Роспотребнадзор, Минспорт; ресерч A, B, D, GPT' }),
        body: table([{ t: 'С какой даты' }, { t: 'Норма' }, { t: 'Что' }, { t: 'Что это значит для нас' }, { t: 'Статус' }, { t: '' }], reg) })}
    </div>`;
  }

  /* ---------- Справка ---------- */
  function renderHelp() {
    const where = [
      ['1. Неделя', 'Тревоги, лента недели, индекс цены, «мы против главных», клуб под защитой, строка рынка', 'каждый понедельник'],
      ['2. Цены и акции', 'Полная сумма за 12 месяцев, индекс по неделям, trade-in, акции с возрастом, модель оплаты и условия выхода', 'неделя и квартал'],
      ['3. Зоны клубов', 'Плотность конкурентов у каждого клуба, полоса «минуты доезда», сигналы открытий и закрытий', 'неделя и квартал'],
      ['4. Карточки конкурентов', 'По карточке на сеть: модель, форматы, гео, что изменилось, жалобы, последние ходы, источники', 'раз в месяц'],
      ['5. Мы и рынок', 'Наши продажи против рынка, рынок в деньгах и в людях, публикации о рынке, эффект открытия рядом, куда уходят клиенты, журнал ответов', 'раз в месяц'],
      ['6. Сезон и правила', 'Сезонный календарь, обратный отсчёт, «год назад», регуляторный календарь', 'перед сезоном']
    ].map((r) => ({ cells: ['<b>' + r[0] + '</b>', r[1], r[2]] }));
    const r = priceIndex('msk');
    const vol = D.volumeEstimates.map((v) => ({ cells: [esc(v.who), '<b>' + esc(v.value) + '</b>', esc(v.growth), esc(v.note)] }));
    return `<div class="grid">
      ${card({ title: 'Где что лежит', body: table([{ t: 'Вкладка' }, { t: 'Что внутри' }, { t: 'Когда открывать' }], where) })}
      ${card({ span: 6, title: 'Понедельник за 10 минут', body: `<ol class="prose">
        <li><b>0–3 мин.</b> «Неделя» → Тревоги. Пусто: выдохнуть. Есть: прочитать «что делаем» и поставить себе задачу.</li>
        <li><b>3–7 мин.</b> Лента и таблица «мы против главных» (только изменения). По каждой акции одно из трёх: отвечаем, ждём неделю, отмечаем.</li>
        <li><b>7–10 мин.</b> Клуб под защитой. Затем 2–3 строки руководителю: что сделали конкуренты, что делаем мы. «Без изменений» тоже результат.</li>
        <li>Раз в месяц: «Мы и рынок», «Карточки», «Сезон и правила». Раз в квартал: полная ценовая сводка и плотность в зонах.</li></ol>` })}
      ${card({ span: 6, title: 'Метки и статусы', body: `<dl class="kv">
        <dt><span class="badge badge--demo">ДЕМО</span></dt><dd>Вымышлено, показывает формат. После подключения данных метка исчезнет.</dd>
        <dt><span class="badge badge--fact">ФАКТ</span></dt><dd>Из ресерча 31.10.2026. Источник появляется при наведении.</dd>
        <dt>${lvl('critical')} ${lvl('serious')}</dt><dd>Тревога: нужно действие на этой неделе. «К сведению»: отметить.</dd>
        <dt>${signal('слух')}</dt><dd>Один тип данных, например только вакансии.</dd>
        <dt>${signal('подтверждается')}</dt><dd>Совпали два независимых типа: аренда и вакансии.</dd>
        <dt>${signal('подтверждено')}</dt><dd>Официально объявлено или уже произошло.</dd>
        <dt>«проверено», «1 источник»</dt><dd>Надёжность рыночной цифры: сверено с первоисточником или есть только одна публикация.</dd>
        <dt><span class="prio">P2</span></dt><dd>Показатель второй очереди: появится, когда будут данные.</dd></dl>` })}
      ${card({ span: 6, title: 'Как считается индекс цены', body: `<div class="prose"><p><b>Индекс = наша полная сумма за 12 месяцев со взносом / медиана той же суммы у сетей нашего сегмента в городе × 100.</b></p>
        <p>Больше 100: мы дороже. Меньше 100: дешевле. Медиана: середина ряда, на неё меньше влияет одна выбивающаяся цена.</p>
        <p>Пример, Москва: наши ${esc(rub(r.own.m12))}, медиана ${esc(rub(Math.round(r.med)))} (${r.comp.map((c) => esc(chain(c.chain).name)).join(', ')}) → индекс ${r.idx}.</p>
        <p>Правила: сети без публичных цен в индекс не входят; если в сегменте меньше 2 предложений, индекс не считается; у акционной цены стоит метка «акция».</p></div>` })}
      ${card({ span: 6, title: 'Словарь простыми словами', body: `<dl class="kv">
        <dt>Полная сумма</dt><dd>Сколько клиент заплатит за срок (1, 3, 12 мес.) вместе со вступительным взносом.</dd>
        <dt>Trade-in</dt><dd>«Принеси абонемент другого клуба и получи наш почти даром». Переманивание чужой базы.</dd>
        <dt>Зона клуба</dt><dd>Конкуренты в пределах 20 минут доезда (пока условно, см. открытые вопросы).</dd>
        <dt>Контрольные клубы</dt><dd>Наши клубы без нового соседа. С ними сравниваем, чтобы отделить эффект конкурента от сезона.</dd>
        <dt>г/г</dt><dd>К тому же месяцу прошлого года.</dd>
        <dt>«В сопоставимых ценах»</dt><dd>Рост за вычетом подорожания: сколько стало больше в людях и покупках, а не в рублях.</dd>
        <dt>Самоотчёт</dt><dd>Цифры, которые компания сообщила о себе без раскрытой методики.</dd></dl>` })}
      ${card({ span: 6, title: 'Алерты', body: `<div class="prose"><p><b>Сразу (5):</b></p><ol>${D.alertRules.map((a) => `<li>${esc(a.title)}. <span class="flat">Действие: ${esc(a.action)}.</span></li>`).join('')}</ol>
        <p><b>В недельной ленте:</b> новые акции без trade-in, окончание акций, условия договора, новые форматы, месседжи, отзывы конкурентов, ранние сигналы, партнёрства.</p>
        <p><b>Не алертим:</b> всплески упоминаний, долю поиска, подписчиков. Если алерт за квартал ни разу не привёл к действию, его пересматриваем или удаляем.</p>
        <p class="flat">Числовые пороги пока не заданы: их калибруют по истории первых 2–3 месяцев.</p></div>` })}
      ${card({ span: 6, title: 'Годовая справка: объём рынка 2025', why: 'Не для дашборда, а для защиты бюджета. Оценки нельзя складывать и сравнивать: методики разные.', badge: ' ' + badge({ demo: false, src: 'Ресерч A, B, D, GPT' }),
        body: table([{ t: 'Кто оценивал' }, { t: 'Объём' }, { t: 'Рост' }, { t: 'Примечание' }], vol) + '<p class="formula">Для отчёта: «рынок вырос на 13–20% в деньгах, около 4% в сопоставимых ценах (РБК)». Источник называть всегда.</p>' })}
      ${card({ title: 'Открытые вопросы к маркетологу', why: 'От ответов зависят зоны, индекс и состав вкладок.', body: `<ol class="prose">${D.openQuestions.map((q) => `<li>${esc(q)}</li>`).join('')}</ol>` })}
      ${card({ title: 'Откуда данные', body: `<div class="prose"><p>Всё, что видно на экране, лежит в одном файле <code>data/data.json</code>. Чтобы обновить дашборд, достаточно заменить этот файл: скрипт сбора будет перезаписывать его после каждого прогона.</p>
        <p>Разделы файла: <code>events</code> (события), <code>promos</code> (акции), <code>prices</code> (цены), <code>zones</code> (конкуренты у клубов), <code>chains</code> (карточки), <code>marketFacts</code> (рынок), <code>regulation</code> (нормы), <code>season</code> (сезон). У каждой записи есть признак <code>demo</code>: по нему ставится метка ДЕМО или ФАКТ.</p>
        <p>Данные на ${esc(D.meta.researchDate)}. Основа: спецификация spec.md по итогам мультиагентного ресерча.</p></div>` })}
    </div>`;
  }

  /* ---------- Рендер и события ---------- */
  const RENDER = { week: renderWeek, prices: renderPrices, zones: renderZones, chains: renderChains, market: renderMarket, season: renderSeason, help: renderHelp };

  function renderTabs() {
    $('#tabs').innerHTML = TABS.map((t) => `<li><a href="#${t.id}"${t.id === state.tab ? ' aria-current="page"' : ''}><span class="num">${t.n}</span>${t.name}<small>${t.short}</small></a></li>`).join('');
  }
  function render() {
    charts = {};
    const t = TABS.find((x) => x.id === state.tab) || TABS[0];
    renderTabs();
    syncFilters();
    $('#topSub').textContent = `Москва · Санкт-Петербург · Сочи. Неделя ${weekLabel(D.meta.currentWeek)}, данные на ${D.meta.researchDate}`;
    document.title = t.name + ' · Конкуренты и рынок';
    $('#main').innerHTML = `<div class="page-head"><h2>${t.name}</h2><p class="q">${t.q}</p><div class="when">Когда открывать<b>${t.when}</b></div></div>` + RENDER[t.id]();
    drawCharts();
  }

  function bind() {
    window.addEventListener('hashchange', () => {
      const id = location.hash.slice(1);
      if (TABS.some((t) => t.id === id)) { state.tab = id; render(); window.scrollTo(0, 0); }
    });
    $('#fCity').addEventListener('change', (e) => { state.city = e.target.value; state.club = 'all'; save(); render(); });
    $('#fSegment').addEventListener('change', (e) => { state.segment = e.target.value; save(); render(); });
    $('#fClub').addEventListener('change', (e) => {
      state.club = e.target.value;
      if (state.club !== 'all') state.city = club(state.club).city;
      save(); render();
    });
    $('#fWeek').addEventListener('change', (e) => { state.week = e.target.value; render(); });
    $('#fReset').addEventListener('click', () => { Object.assign(state, DEFAULTS, { week: D.meta.currentWeek }); save(); render(); });

    document.addEventListener('click', (e) => {
      const tg = e.target.closest('[data-toggle]');
      if (tg) {
        const id = tg.dataset.toggle;
        const on = tg.getAttribute('aria-pressed') !== 'true';
        tg.setAttribute('aria-pressed', String(on));
        tg.textContent = on ? 'График' : 'Таблица';
        document.querySelectorAll(`[data-view-of="${id}"]`).forEach((el) => { el.hidden = (el.dataset.view === 'table') !== on; });
        drawCharts();
        return;
      }
      if (e.target.id === 'onlyChanged') { ui.onlyChanged = !ui.onlyChanged; render(); return; }
      if (e.target.id === 'feedAll') { ui.showAllFeed = !ui.showAllFeed; render(); return; }
      if (e.target.id === 'howtoHide') { localStorage.setItem('fd-howto', 'hidden'); render(); return; }
      if (e.target.id === 'howtoShow') { localStorage.removeItem('fd-howto'); render(); }
    });

    const tipEl = $('#tip');
    const show = (el, x, y) => {
      tipEl.innerHTML = el.getAttribute('data-tip');
      tipEl.hidden = false;
      const r = tipEl.getBoundingClientRect();
      let left = x + 14;
      let top = y + 14;
      if (left + r.width > window.innerWidth - 8) left = x - r.width - 14;
      if (top + r.height > window.innerHeight - 8) top = y - r.height - 14;
      tipEl.style.left = Math.max(8, left) + 'px';
      tipEl.style.top = Math.max(8, top) + 'px';
    };
    document.addEventListener('mousemove', (e) => {
      const el = e.target.closest && e.target.closest('[data-tip]');
      if (el) show(el, e.clientX, e.clientY); else tipEl.hidden = true;
    });
    document.addEventListener('focusin', (e) => {
      const el = e.target.closest && e.target.closest('[data-tip]');
      if (el) { const r = el.getBoundingClientRect(); show(el, r.left + r.width / 2, r.bottom); } else tipEl.hidden = true;
    });
    document.addEventListener('focusout', () => { tipEl.hidden = true; });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') tipEl.hidden = true; });

    let rt = null;
    window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(drawCharts, 120); });

    const themes = ['system', 'light', 'dark'];
    const names = { system: 'система', light: 'светлая', dark: 'тёмная' };
    let theme = localStorage.getItem('fd-theme') || 'system';
    const applyTheme = () => {
      if (theme === 'system') delete document.documentElement.dataset.theme; else document.documentElement.dataset.theme = theme;
      $('#themeBtn').textContent = 'Тема: ' + names[theme];
    };
    applyTheme();
    $('#themeBtn').addEventListener('click', () => {
      theme = themes[(themes.indexOf(theme) + 1) % themes.length];
      localStorage.setItem('fd-theme', theme);
      applyTheme();
    });
  }

  fetch('data/data.json', { cache: 'no-cache' })
    .then((r) => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
    .then((data) => {
      D = data;
      state.week = D.meta.currentWeek;
      try {
        const saved = JSON.parse(localStorage.getItem('fd-state') || '{}');
        ['city', 'segment', 'club'].forEach((k) => { if (saved[k]) state[k] = saved[k]; });
      } catch (e) { /* без сохранённых фильтров */ }
      const qp = new URLSearchParams(location.search);
      if (D.cities.some((c) => c.id === qp.get('city'))) state.city = qp.get('city');
      if (D.segments.some((c) => c.id === qp.get('segment'))) state.segment = qp.get('segment');
      if (club(qp.get('club'))) { state.club = qp.get('club'); state.city = club(state.club).city; }
      const id = location.hash.slice(1);
      if (TABS.some((t) => t.id === id)) state.tab = id;
      fillFilters();
      bind();
      render();
    })
    .catch((err) => {
      $('#main').innerHTML = `<div class="empty"><b>Не удалось загрузить данные.</b> ${esc(err.message)}. Если файл открыт с диска, запустите локальный сервер: <code>python3 -m http.server</code>.</div>`;
    });
})();
