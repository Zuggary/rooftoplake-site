/* RooftopLake — "one number" lake explainer. Vanilla JS, no globals. Mounts into #lake-explainer. */
(function () {
  'use strict';

  var STORES = [
    ['Northside', 1], ['Lakeview', 0.82], ['Riverbend', 1.18], ['Hillcrest', 0.64], ['Eastgate', 0.93]
  ];

  var QUESTIONS = [
    {
      chip: 'Cars sold', q: 'How many cars did we sell last month?', base: 140, round: 1, agg: 'sum',
      unit: 'cars', ans: 'cars sold last month', word: 'Sold',
      def: 'delivered to the customer and funded by the bank', short: 'delivered and funded',
      systems: [
        ['DMS', 0.06, 'Counts deals the day they are signed, not delivered. Deals that fell apart are still in.'],
        ['CRM', 0.12, 'Counts every time a salesperson clicked “sold”. Some deals got clicked twice.'],
        ['Accounting', -0.06, 'Books the fleet sale as one line, so twelve cars count as one.'],
        ['Inventory tool', 0.03, 'Counts cars that left the lot, including trades to our other stores.']
      ],
      match: [['Deal 4471', 'deal #4471', 'DL-4471'], '1 deal'],
      trail: 'Same deal in the DMS, CRM, accounting and inventory tool matched as one'
    },
    {
      chip: 'Gross per car', q: 'What’s our gross per car?', base: 2850, round: 10, agg: 'avg', money: true,
      unit: '', ans: 'average gross per car', word: 'Gross per car',
      def: 'front plus finance and warranty, after pack, on delivered deals', short: 'front + finance + warranty, after pack',
      systems: [
        ['DMS', -0.31, 'Shows front-end gross only. Finance and warranty profit are left out.'],
        ['CRM', 0.08, 'Uses the gross typed in at the desk, before the deal was final.'],
        ['Accounting', -0.12, 'Spreads gross over every car, including wholesale units.']
      ],
      match: [['Deal 4471 front', 'Finance on 4471', 'Warranty on 4471'], '1 deal, full gross'],
      trail: 'Front, finance and warranty joined to the same deal'
    },
    {
      chip: 'Leads', q: 'How many leads did we get?', base: 620, round: 1, agg: 'sum',
      unit: 'leads', ans: 'leads last month', word: 'Lead',
      def: 'a real person asking about a car, counted once, from any source', short: 'one real person, counted once',
      systems: [
        ['Website & ads', 0.38, 'Counts every form fill and ad click, even the same shopper five times.'],
        ['CRM', -0.11, 'Counts a couple as two leads, but misses phone calls nobody typed in.'],
        ['Inventory tool', 0.07, 'Counts each car a shopper asked about, so one person can be three leads.']
      ],
      match: [['Web form', 'Ad click', 'Phone call'], '1 shopper, 1 lead'],
      trail: 'Same shopper across web, ads, phone and CRM matched as one'
    },
    {
      chip: 'Declined service', q: 'How much service work did customers decline?', base: 46800, round: 100,
      agg: 'sum', money: true, unit: '', ans: 'in declined service work last month', word: 'Declined',
      def: 'work we recommended that the customer has not had done since, at any of our stores', short: 'recommended, still not done anywhere',
      systems: [
        ['Service scheduler', 0.24, 'Counts every recommendation, even work the customer came back and paid for.'],
        ['DMS', -0.19, 'Only counts work the advisor remembered to mark as declined.'],
        ['CRM', -0.33, 'Only counts customers with an email on file.']
      ],
      match: [['Brakes declined, March', 'Brakes paid, May'], 'not declined any more'],
      trail: 'Each declined job checked against later repair orders at every store'
    }
  ];


  var LAYERS = [
    { title: 'Copy everything', sub: 'Every system, every store' },
    { title: 'Clean and match', sub: 'Same customer, car and deal' },
    { title: 'One agreed definition', sub: 'Counted one way, everywhere' }
  ];

  var NOTES = {
    today: 'Every system counts its own way. So the meeting starts with an argument.',
    lake: 'One copy you own, cleaned and counted one way. One number for your people, your apps and your AI helpers.'
  };

  // Short system names for phones, so every number keeps its label.
  var SHORT = { 'DMS': 'DMS', 'CRM': 'CRM', 'Accounting': 'Acct', 'Inventory tool': 'Inv', 'Website & ads': 'Web', 'Service scheduler': 'Sched' };

  var NUM_WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six'];

  /* ---------- helpers ---------- */
  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }
  function roundTo(v, r) { return Math.round(v / r) * r; }
  function fmt(q, v) {
    var s = Math.round(v).toLocaleString('en-US');
    return q.money ? '$' + s : s;
  }
  function withUnit(q, v) { return fmt(q, v) + (q.unit ? ' ' + q.unit : ''); }
  function storeTruth(q, i) {
    var size = STORES[i][1];
    return roundTo(q.agg === 'sum' ? q.base * size : q.base * (0.9 + 0.1 * size), q.round);
  }
  function jitter(i, k) { return ((((i * 5 + k * 3) % 5) - 2) * 0.012); }
  function systemValue(q, i, k) {
    return roundTo(storeTruth(q, i) * (1 + q.systems[k][1] + jitter(i, k)), q.round);
  }
  function combine(q, vals) {
    var t = 0;
    for (var i = 0; i < vals.length; i++) t += vals[i];
    return q.agg === 'sum' ? t : roundTo(t / vals.length, q.round);
  }
  function storeWord(n) { return n === 1 ? 'store' : 'stores'; }
  function easeOut(p) { return 1 - Math.pow(1 - p, 3); }

  // Car dealership: pylon sign, long low showroom, flat cantilevered roof, wide mullioned glass, service bay.
  var STORE_ICON = '<svg class="lx-roof" viewBox="0 0 72 44" aria-hidden="true" focusable="false">' +
    '<path d="M2 41.5 H70" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" opacity=".55"/>' +
    '<path d="M9 16 V41" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>' +
    '<rect class="lx-ic-sign" x="3" y="2.5" width="12" height="15" rx="2"/>' +
    '<path class="lx-ic-signtext" d="M6.5 7.5 H11.5 M6.5 11 H10" stroke-width="1.6" stroke-linecap="round"/>' +
    '<rect x="17" y="13" width="54" height="4.5" rx="1.2" fill="currentColor"/>' +
    '<path d="M22 17.5 V41 M67 17.5 V41" stroke="currentColor" stroke-width="2"/>' +
    '<rect class="lx-ic-glass" x="24" y="20" width="29" height="21" rx="1"/>' +
    '<path d="M31.25 20 V41 M38.5 20 V41 M45.75 20 V41" stroke="currentColor" stroke-width="1.2" opacity=".8"/>' +
    '<path d="M26.5 38.5 L28 35.5 Q29 34 31 34 H37 Q38.6 34 39.6 35.4 L41 37 Q42.5 37.3 42.5 38.5 Z" fill="currentColor" opacity=".7"/>' +
    '<rect x="56" y="24" width="8.5" height="17" rx="1" fill="none" stroke="currentColor" stroke-width="1.6"/>' +
    '<path d="M56 29 H64.5 M56 33 H64.5 M56 37 H64.5" stroke="currentColor" stroke-width="1" opacity=".6"/></svg>';
  var CHECK = '<svg viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M3.5 8.5 L6.6 11.4 L12.5 4.8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  /* ---------- component ---------- */
  function init(mount) {
    var state = { q: 0, n: 3, mode: 'today', layer: -1, pick: null, more: false };
    var mqReduce = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
    var reduced = !!(mqReduce && mqReduce.matches);

    var root = document.createElement('div');
    root.className = 'lx';
    root.setAttribute('data-mode', 'today');
    root.setAttribute('data-more', 'false');

    var chips = '';
    QUESTIONS.forEach(function (q, i) {
      chips += '<button type="button" class="lx-chip" data-q="' + i + '" aria-pressed="false">' + esc(q.chip) + '</button>';
    });
    var nums = '';
    for (var s = 1; s <= 5; s++) {
      nums += '<button type="button" class="lx-num" data-n="' + s + '" aria-pressed="false" aria-label="' + s + ' ' + storeWord(s) + '">' + s + '</button>';
    }
    var bands = '';
    LAYERS.forEach(function (L, i) {
      bands += '<button type="button" class="lx-band lx-band-' + (i + 1) + '" data-layer="' + i + '" aria-pressed="false">' +
        '<span class="lx-band-n" aria-hidden="true">' + (i + 1) + '</span>' +
        '<span class="lx-band-t"><span class="lx-band-title">' + esc(L.title) + '</span>' +
        '<span class="lx-band-swap"><span class="lx-band-sub">' + esc(L.sub) + '</span><span class="lx-band-ex"></span></span></span></button>';
    });

    root.innerHTML =
      '<div class="lx-controls">' +
        '<div class="lx-chips" role="group" aria-label="Pick a question">' + chips + '</div>' +
        '<div class="lx-stores-ctl"><span class="lx-label" id="lx-sl">Stores</span>' +
          '<div class="lx-seg lx-nums" role="group" aria-labelledby="lx-sl">' + nums + '</div></div>' +
        '<div class="lx-seg lx-switch" role="group" aria-label="Show">' +
          '<span class="lx-thumb" aria-hidden="true"></span>' +
          '<button type="button" class="lx-sw" data-mode="today" aria-pressed="true">Today</button>' +
          '<button type="button" class="lx-sw" data-mode="lake" aria-pressed="false">With the lake</button></div>' +
      '</div>' +
      '<h3 class="lx-q"></h3>' +
      '<div class="lx-scene">' +
        '<canvas class="lx-canvas" aria-hidden="true"></canvas>' +
        '<div class="lx-shore"></div>' +
        '<div class="lx-pool" role="group" aria-label="Inside the lake">' + bands + '</div>' +
        '<div class="lx-slot">' +
          '<div class="lx-verdict"><p class="lx-tally"></p><p class="lx-big">Which one is right?</p>' +
            '<p class="lx-range"></p><p class="lx-why" aria-live="polite"></p></div>' +
          '<div class="lx-ans"><p class="lx-ans-k">One answer</p><p class="lx-ans-num"><span class="lx-count"></span></p>' +
            '<p class="lx-ans-u"></p><p class="lx-badge">' + CHECK + 'Every store, same definition</p>' +
            '<button type="button" class="lx-more-btn" aria-expanded="false" aria-controls="lx-more">Where it came from</button></div>' +
          '<div class="lx-more" id="lx-more" inert></div>' +
        '</div>' +
      '</div>' +
      '<p class="lx-note"></p>' +
      '<p class="lx-caption">Illustration with made-up numbers.</p>' +
      '<div class="lx-sr" aria-live="polite" aria-atomic="true"></div>';

    mount.innerHTML = '';
    mount.appendChild(root);

    var $ = function (sel) { return root.querySelector(sel); };
    var scene = $('.lx-scene'), shore = $('.lx-shore'), pool = $('.lx-pool'), cv = $('.lx-canvas');
    var verdict = $('.lx-verdict'), ans = $('.lx-ans'), more = $('.lx-more'), moreBtn = $('.lx-more-btn');
    var whyEl = $('.lx-why'), srEl = $('.lx-sr'), countEl = $('.lx-count');
    var ctx = cv.getContext ? cv.getContext('2d') : null;

    function setPressed(sel, attr, val) {
      var list = root.querySelectorAll(sel);
      for (var i = 0; i < list.length; i++) list[i].setAttribute('aria-pressed', String(list[i].getAttribute(attr) === String(val)));
    }
    function setInert(node, on) {
      if (on) node.setAttribute('inert', ''); else node.removeAttribute('inert');
    }

    /* ----- rendering ----- */
    function renderShore() {
      var q = QUESTIONS[state.q], h = '';
      for (var i = 0; i < state.n; i++) {
        h += '<div class="lx-col"><div class="lx-tile">' + STORE_ICON + '<span class="lx-tile-name">' + esc(STORES[i][0]) + '</span></div>' +
          '<div class="lx-stack">';
        for (var k = 0; k < q.systems.length; k++) {
          var key = i + '-' + k, idx = i * q.systems.length + k;
          h += '<button type="button" class="lx-n" data-why="' + key + '" aria-pressed="' + (state.pick === key) + '" ' +
            'style="--i:' + idx + ';--dx:' + (k % 2 ? 1 : -1) + '" aria-label="' + esc(q.systems[k][0] + ' at ' + STORES[i][0] + ': ' + fmt(q, systemValue(q, i, k)) + '. Show why.') + '">' +
            '<span class="lx-n-sys" aria-hidden="true">' + esc(q.systems[k][0]) + '</span>' +
            '<span class="lx-n-ab" aria-hidden="true">' + esc(SHORT[q.systems[k][0]] || q.systems[k][0]) + '</span>' +
            '<span class="lx-n-v" aria-hidden="true">' + fmt(q, systemValue(q, i, k)) + '</span></button>';
        }
        h += '</div></div>';
      }
      shore.innerHTML = h;
      shore.style.setProperty('--rows', q.systems.length);
    }

    function totalsBySystem(q) {
      return q.systems.map(function (sys, k) {
        var v = [];
        for (var i = 0; i < state.n; i++) v.push(systemValue(q, i, k));
        return combine(q, v);
      });
    }

    function renderVerdict() {
      var q = QUESTIONS[state.q], t = totalsBySystem(q);
      var min = Math.min.apply(null, t), max = Math.max.apply(null, t);
      $('.lx-tally').textContent = (state.n * q.systems.length) + ' different answers';
      $('.lx-range').innerHTML = (q.agg === 'sum' ? 'Group total: ' : 'Group average: ') + '<b>' + fmt(q, min) + '</b> to <b>' + withUnit(q, max) + '</b>';
      renderWhy();
      return { min: min, max: max };
    }

    function renderWhy() {
      var q = QUESTIONS[state.q];
      if (!state.pick) { whyEl.innerHTML = 'Tap a number to see why.'; whyEl.classList.remove('is-on'); return; }
      var p = state.pick.split('-'), i = +p[0], k = +p[1];
      whyEl.innerHTML = '<b>' + esc(q.systems[k][0]) + ', ' + esc(STORES[i][0]) + ':</b> ' + esc(q.systems[k][2]);
      whyEl.classList.add('is-on');
    }

    function renderBands() {
      var q = QUESTIONS[state.q], n = state.n, k = q.systems.length;
      var ex = [
        n + ' ' + storeWord(n) + ' × ' + k + ' systems → ' + (n * k) + ' copies, one place you own',
        q.match[0].join(' · ') + ' → ' + q.match[1],
        '“' + q.word + '” = ' + q.short
      ];
      var b = pool.querySelectorAll('.lx-band');
      for (var i = 0; i < b.length; i++) {
        b[i].querySelector('.lx-band-ex').textContent = ex[i];
        b[i].classList.toggle('is-open', state.layer === i);
      }
      setPressed('.lx-band', 'data-layer', state.layer);
    }

    var countRaf = 0;
    function renderAnswer(animateDelay) {
      var q = QUESTIONS[state.q], n = state.n, vals = [];
      for (var i = 0; i < n; i++) vals.push(storeTruth(q, i));
      var total = combine(q, vals);
      $('.lx-ans-u').textContent = q.ans + ' · ' + (n === 1 ? 'one store' : 'all ' + NUM_WORDS[n] + ' stores');
      var per = '';
      for (var j = 0; j < n; j++) per += '<li><span>' + esc(STORES[j][0]) + '</span><b>' + fmt(q, vals[j]) + '</b></li>';
      more.innerHTML =
        '<div class="lx-more-col"><p class="lx-more-k">By store</p><ul class="lx-per">' + per + '</ul></div>' +
        '<div class="lx-more-col"><p class="lx-more-k">Where it came from</p><ol class="lx-trail">' +
          '<li>Copied from ' + (n * q.systems.length) + ' systems across ' + n + ' ' + storeWord(n) + '</li>' +
          '<li>' + esc(q.trail) + '</li>' +
          '<li>Counted as: ' + esc(q.def) + '</li>' +
          '<li class="is-end">' + withUnit(q, total) + '</li></ol></div>' +
        '<button type="button" class="lx-back">Back to the answer</button>';
      cancelAnimationFrame(countRaf);
      if (animateDelay != null && !reduced) {
        var start = performance.now() + animateDelay, from = total * 0.8;
        countEl.textContent = fmt(q, roundTo(from, q.round));
        var step = function (now) {
          var p = Math.max(0, Math.min(1, (now - start) / 900));
          countEl.textContent = fmt(q, p < 1 ? roundTo(from + (total - from) * easeOut(p), q.round) : total);
          if (p < 1) countRaf = requestAnimationFrame(step);
        };
        countRaf = requestAnimationFrame(step);
      } else {
        countEl.textContent = fmt(q, total);
      }
      return total;
    }

    function render(opts) {
      opts = opts || {};
      var q = QUESTIONS[state.q], isLake = state.mode === 'lake';
      setPressed('.lx-chip', 'data-q', state.q);
      setPressed('.lx-num', 'data-n', state.n);
      setPressed('.lx-sw', 'data-mode', state.mode);
      root.setAttribute('data-mode', state.mode);
      $('.lx-q').textContent = q.q;
      $('.lx-note').textContent = NOTES[state.mode];
      if (opts.shore !== false) renderShore();
      renderBands();
      var r = renderVerdict();
      var total = renderAnswer(opts.delay);
      setInert(shore, isLake); setInert(verdict, isLake);
      if (!isLake && state.more) toggleMore(false);
      setInert(pool, !isLake); setInert(ans, !isLake || state.more); setInert(more, !(isLake && state.more));
      srEl.textContent = isLake
        ? 'With the lake: one answer. ' + withUnit(q, total) + ', ' + q.ans + '. Every store, same definition.'
        : 'Today: ' + (state.n * q.systems.length) + ' different answers. The group is anywhere from ' + fmt(q, r.min) + ' to ' + withUnit(q, r.max) + '.';
      requestAnimationFrame(function () { measure(); loop(); });
    }

    function toggleMore(on, focus) {
      state.more = on;
      root.setAttribute('data-more', String(on));
      moreBtn.setAttribute('aria-expanded', String(on));
      var isLake = state.mode === 'lake';
      setInert(more, !(on && isLake)); setInert(ans, on || !isLake);
      if (focus) {
        var t = on ? more.querySelector('.lx-back') : moreBtn;
        if (t) t.focus({ preventScroll: true });
      }
    }

    /* ----- the switch: numbers fall into the lake, then one answer arrives ----- */
    var arriveTimer = 0;
    function setMode(m) {
      if (m === state.mode) return;
      var now = performance.now();
      if (m === 'lake' && !reduced && geo) {
        var sr = scene.getBoundingClientRect(), btns = shore.querySelectorAll('.lx-n');
        for (var i = 0; i < btns.length; i++) {
          var b = btns[i].querySelector('.lx-n-v').getBoundingClientRect();
          var col = +btns[i].getAttribute('data-why').split('-')[0];
          drops.push({ x: b.left - sr.left + b.width / 2, y: b.top - sr.top + b.height / 2, vy: -40 - Math.random() * 40,
            s: col, delay: i * 0.035, r: 5 });
        }
        flowFrom = now + 700;
        arriveAt = now + 1250;
      } else {
        flowFrom = now; arriveAt = 0;
      }
      if (m === 'today') { parts = []; drops = []; }
      clearTimeout(arriveTimer);
      root.classList.toggle('lx-arriving', m === 'lake' && !reduced);
      if (m === 'lake') arriveTimer = setTimeout(function () { root.classList.remove('lx-arriving'); }, 2300);
      state.mode = m;
      render({ delay: m === 'lake' ? 1250 : null, shore: false });
    }

    root.addEventListener('click', function (e) {
      var b = e.target.closest ? e.target.closest('button') : null;
      if (!b || !root.contains(b)) return;
      if (b.hasAttribute('data-q')) {
        var qi = +b.getAttribute('data-q');
        if (qi !== state.q) { state.q = qi; state.pick = null; render({ delay: 0 }); }
      } else if (b.hasAttribute('data-n')) {
        var n = +b.getAttribute('data-n');
        if (n !== state.n) { state.n = n; state.pick = null; render({ delay: 0 }); }
      } else if (b.classList.contains('lx-sw')) {
        setMode(b.getAttribute('data-mode'));
      } else if (b.hasAttribute('data-layer')) {
        var L = +b.getAttribute('data-layer');
        state.layer = state.layer === L ? -1 : L;
        renderBands();
        if (state.layer >= 0) pulse = { layer: state.layer, life: 1 };
      } else if (b.hasAttribute('data-why')) {
        var key = b.getAttribute('data-why');
        state.pick = state.pick === key ? null : key;
        setPressed('.lx-n', 'data-why', state.pick);
        renderWhy();
      } else if (b === moreBtn) {
        toggleMore(true, true);
      } else if (b.classList.contains('lx-back')) {
        toggleMore(false, true);
      }
    });

    root.addEventListener('keydown', function (e) {
      var k = e.key;
      if (k !== 'ArrowLeft' && k !== 'ArrowRight') return;
      var group = e.target.closest && e.target.closest('.lx-seg');
      if (!group) return;
      var btns = Array.prototype.slice.call(group.querySelectorAll('button'));
      var i = btns.indexOf(e.target);
      if (i < 0) return;
      var next = btns[Math.max(0, Math.min(btns.length - 1, i + (k === 'ArrowRight' ? 1 : -1)))];
      if (next !== e.target) { e.preventDefault(); next.focus(); next.click(); }
    });

    /* ----- canvas: streams, drops, ripples ----- */
    var C = {}, geo = null, parts = [], drops = [], rips = [], raf = 0, last = 0, inView = true;
    var phase = 0, wet = 0, flowFrom = 0, arriveAt = 0, pulse = null;

    function readColors() {
      var cs = getComputedStyle(root);
      ['teal', 'teal-2', 'on-teal', 'brass', 'bad'].forEach(function (k) {
        C[k] = cs.getPropertyValue('--' + k).trim() || '#5FD6D0';
      });
    }

    function measure() {
      if (!ctx) return;
      var r = scene.getBoundingClientRect();
      if (!r.width) { geo = null; return; }
      var dpr = Math.min(2, window.devicePixelRatio || 1);
      var W = Math.round(r.width * dpr), H = Math.round(r.height * dpr);
      if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var p = pool.getBoundingClientRect(), top = p.top - r.top, left = p.left - r.left, cx = left + p.width / 2;
      var b3 = pool.children[2].getBoundingClientRect().top - r.top;
      var a = countEl.getBoundingClientRect();
      var k = QUESTIONS[state.q].systems.length, streams = [];
      var tiles = shore.querySelectorAll('.lx-tile');
      for (var i = 0; i < tiles.length; i++) {
        var t = tiles[i].getBoundingClientRect(), x0 = t.left - r.left + t.width / 2, lanes = [];
        for (var L = 0; L < k; L++) lanes.push((L - (k - 1) / 2) * Math.min(6, t.width / 12));
        streams.push({ x0: x0, y0: t.bottom - r.top + 4, xt: cx + (x0 - cx) * 0.62, yt: top, acc: Math.random(), lanes: lanes });
      }
      geo = { w: r.width, h: r.height, top: top, left: left, pw: p.width, ph: p.height, cx: cx, b3: b3,
        ax: a.left - r.left + a.width / 2, ay: a.top - r.top + a.height / 2, aw: Math.max(a.width, 120), streams: streams };
      parts = parts.filter(function (pt) { return pt.s < streams.length; });
      if (!raf) drawStatic();
    }

    function bez(s, t, lane) {
      var mt = 1 - t, gy = s.yt - s.y0, off = (lane || 0) * Math.pow(1 - Math.min(1, t * 1.6), 2);
      var y1 = s.y0 + gy * 0.55, y2 = s.yt - gy * 0.55;
      return {
        x: off + mt * mt * mt * s.x0 + 3 * mt * mt * t * s.x0 + 3 * mt * t * t * s.xt + t * t * t * s.xt,
        y: mt * mt * mt * s.y0 + 3 * mt * mt * t * y1 + 3 * mt * t * t * y2 + t * t * t * s.yt
      };
    }

    function dot(x, y, r, col, a, halo) {
      if (halo) {
        ctx.beginPath(); ctx.arc(x, y, r * 3.2, 0, Math.PI * 2);
        ctx.fillStyle = col; ctx.globalAlpha = a * 0.14; ctx.fill();
      }
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = col; ctx.globalAlpha = a; ctx.fill();
    }

    function drawStreams(alpha) {
      if (alpha <= 0.002) return;
      ctx.lineCap = 'round';
      ctx.globalCompositeOperation = 'lighter';
      ctx.shadowColor = C.teal; ctx.shadowBlur = 10;
      ctx.strokeStyle = C.teal;
      geo.streams.forEach(function (s) {
        ctx.beginPath();
        for (var g = 6; g <= 20; g++) {
          var q0 = bez(s, g / 20, 0);
          if (g === 6) ctx.moveTo(q0.x, q0.y); else ctx.lineTo(q0.x, q0.y);
        }
        ctx.globalAlpha = alpha; ctx.lineWidth = 7; ctx.stroke();
        s.lanes.forEach(function (ln) {
          ctx.beginPath();
          for (var i = 0; i <= 16; i++) {
            var p = bez(s, i / 16, ln);
            if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
          }
          ctx.globalAlpha = alpha * 2.2; ctx.lineWidth = 1; ctx.stroke();
        });
      });
      ctx.shadowBlur = 0;
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
    }

    function drawSurface(a) {
      ctx.beginPath();
      for (var x = 0; x <= geo.pw; x += 6) {
        var y = geo.top + 1 + Math.sin(x * 0.045 + phase) * 1.5 * (0.4 + wet) + Math.sin(x * 0.017 - phase * 0.6) * 1.1;
        if (x === 0) ctx.moveTo(geo.left + x, y); else ctx.lineTo(geo.left + x, y);
      }
      ctx.strokeStyle = C['teal-2']; ctx.shadowColor = C.teal; ctx.shadowBlur = 12;
      ctx.globalAlpha = a; ctx.lineWidth = 2; ctx.stroke();
      ctx.shadowBlur = 0; ctx.globalAlpha = 1;
    }

    function drawRipple(x, y, r, a, col, ry) {
      ctx.beginPath();
      ctx.ellipse(x, y, r, r * (ry || 0.32), 0, 0, Math.PI * 2);
      ctx.strokeStyle = col || C['on-teal'];
      ctx.globalAlpha = Math.max(0, a); ctx.lineWidth = 1.3; ctx.stroke();
      ctx.globalAlpha = 1;
    }

    function drawStatic() {
      if (!ctx) return;
      ctx.clearRect(0, 0, cv.width, cv.height);
      if (!geo) return;
      var lake = state.mode === 'lake';
      wet = lake ? 1 : 0;
      drawSurface(lake ? 0.9 : 0.35);
      if (!lake) return;
      drawStreams(0.12);
      geo.streams.forEach(function (s) {
        s.lanes.forEach(function (ln, li) {
          var p = bez(s, 0.15 + li * (0.7 / Math.max(1, s.lanes.length - 1)), ln);
          ctx.globalCompositeOperation = 'lighter';
          dot(p.x, p.y, 2.3, C.teal, 0.9, true);
          ctx.globalCompositeOperation = 'source-over';
        });
        drawRipple(s.xt, s.yt + 4, 9, 0.4);
        drawRipple(s.xt, s.yt + 4, 17, 0.2);
      });
      drawRipple(geo.ax, geo.ay, geo.aw * 0.55, 0.35, C.teal, 0.3);
      ctx.globalAlpha = 1;
    }

    function tick(now) {
      raf = 0;
      if (!shouldRun()) { drawStatic(); return; }
      var dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (!geo) { raf = requestAnimationFrame(tick); return; }
      var lake = state.mode === 'lake';
      phase += dt * 1.1;
      var flowing = lake && now >= flowFrom;
      wet += ((flowing ? 1 : 0) - wet) * Math.min(1, dt * 2.2);
      ctx.clearRect(0, 0, geo.w, geo.h);
      drawStreams(0.1 * wet);

      var bottom = geo.top + geo.ph - 10;
      if (flowing) {
        geo.streams.forEach(function (s, i) {
          s.acc += dt * 1.2 * s.lanes.length;
          while (s.acc > 1 && parts.length < 480) {
            s.acc -= 1;
            parts.push({ s: i, t: 0, sp: 0.42 + Math.random() * 0.22, o: (Math.random() - 0.5) * 3,
              ln: s.lanes[(Math.random() * s.lanes.length) | 0], mode: 0, r: 1.7 + Math.random() * 1.1 });
          }
        });
      }

      // falling numbers: they drop as coral dots and land in the lake
      var keepD = [];
      drops.forEach(function (d) {
        if (d.delay > 0) { d.delay -= dt; keepD.push(d); return; }
        d.vy += 1100 * dt;
        d.y += d.vy * dt;
        var st = geo.streams[d.s];
        if (st) d.x += (st.xt - d.x) * Math.min(1, dt * 2.5);
        d.r = Math.max(2.4, d.r - dt * 5);
        if (d.y >= geo.top) {
          rips.push({ x: d.x, y: geo.top + 4, r: 3, life: 1, col: null, grow: 30 });
          parts.push({ s: d.s, t: 0, mode: 1, sx: d.x, sp: 0.3 + Math.random() * 0.15, o: Math.random() * 6, r: 2.4 });
          return;
        }
        ctx.globalCompositeOperation = 'lighter';
        dot(d.x, d.y, d.r, C.bad, 0.95, true);
        ctx.globalCompositeOperation = 'source-over';
        keepD.push(d);
      });
      drops = keepD;

      var keep = [];
      for (var j = 0; j < parts.length; j++) {
        var p = parts[j], s = geo.streams[p.s];
        if (!s) continue;
        var x, y, a;
        if (p.mode === 0) {
          p.t += dt * p.sp;
          if (p.t >= 1) {
            if (Math.random() < 0.35) rips.push({ x: s.xt + p.o * 2, y: s.yt + 4, r: 2, life: 1, col: null, grow: 22 });
            if (Math.random() < 0.55) { p.mode = 1; p.t = 0; p.sx = s.xt + p.o * 3; p.sp = 0.28 + Math.random() * 0.18; }
            else continue;
          }
        }
        if (p.mode === 0) {
          var b = bez(s, p.t, p.ln);
          x = b.x + p.o * Math.sin(p.t * Math.PI); y = b.y; a = 0.35 + 0.55 * Math.min(1, p.t * 4);
          ctx.globalCompositeOperation = 'lighter';
          dot(x, y, p.r, C.teal, a * wet, true);
          ctx.globalCompositeOperation = 'source-over';
        } else {
          p.t += dt * p.sp;
          if (p.t >= 1) continue;
          var e = p.t * p.t * (3 - 2 * p.t);
          x = p.sx + (geo.cx - p.sx) * e + Math.sin(p.t * 9 + p.o) * 2;
          y = geo.top + 6 + (bottom - geo.top - 6) * p.t;
          a = 0.75 * (1 - Math.pow(p.t, 4));
          if (y < geo.b3) dot(x, y, p.r * 0.75, C['on-teal'], a * 0.6, false);
          else {
            ctx.globalCompositeOperation = 'lighter';
            dot(x, y, p.r * 0.9, C.brass, a, true);
            ctx.globalCompositeOperation = 'source-over';
          }
        }
        keep.push(p);
      }
      parts = keep;
      ctx.globalAlpha = 1;

      drawSurface(0.35 + 0.55 * wet);

      // the one answer arrives with a ripple
      if (arriveAt && now >= arriveAt) {
        arriveAt = 0;
        [0, 0.18, 0.36].forEach(function (d, i) {
          rips.push({ x: geo.ax, y: geo.ay, r: geo.aw * 0.2, life: 1 + d, col: i === 1 ? C.brass : C.teal, grow: geo.aw * 0.55, ry: 0.3, max: 1 });
        });
      }
      rips = rips.filter(function (rp) {
        rp.life -= dt * 0.8;
        if (rp.life <= 0) return false;
        if (rp.max && rp.life > rp.max) return true;
        rp.r += dt * rp.grow;
        if (rp.col) { ctx.globalCompositeOperation = 'lighter'; drawRipple(rp.x, rp.y, rp.r, rp.life * 0.6, rp.col, rp.ry); ctx.globalCompositeOperation = 'source-over'; }
        else drawRipple(rp.x, rp.y, rp.r, rp.life * 0.5);
        return true;
      });

      if (pulse) {
        pulse.life -= dt * 0.9;
        var band = pool.children[pulse.layer];
        if (band && pulse.life > 0) {
          var sr = scene.getBoundingClientRect(), br = band.getBoundingClientRect();
          drawRipple(br.left - sr.left + br.width / 2, br.top - sr.top + br.height / 2, (1 - pulse.life) * br.width * 0.5, pulse.life * 0.7,
            pulse.layer === 2 ? C.brass : C['on-teal'], 0.18);
        } else pulse = null;
      }
      raf = requestAnimationFrame(tick);
    }

    function shouldRun() { return inView && !document.hidden && !reduced && !!ctx; }
    function loop() {
      if (shouldRun()) {
        if (!raf) { last = performance.now(); raf = requestAnimationFrame(tick); }
      } else {
        if (raf) { cancelAnimationFrame(raf); raf = 0; }
        drawStatic();
      }
    }

    readColors();
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (en) { inView = en[0].isIntersecting; loop(); }, { threshold: 0.02 }).observe(scene);
    }
    document.addEventListener('visibilitychange', loop);
    if ('ResizeObserver' in window) new ResizeObserver(function () { measure(); }).observe(scene);
    else window.addEventListener('resize', measure);
    var onReduce = function () { reduced = mqReduce.matches; root.classList.toggle('lx-still', reduced); loop(); };
    if (mqReduce) { if (mqReduce.addEventListener) mqReduce.addEventListener('change', onReduce); else if (mqReduce.addListener) mqReduce.addListener(onReduce); }
    root.classList.toggle('lx-still', reduced);

    render();
  }

  function boot() {
    var mount = document.getElementById('lake-explainer');
    if (mount) init(mount);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
