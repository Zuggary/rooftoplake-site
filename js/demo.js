/* RooftopLake "see it work" demo. Vanilla JS, no globals, no network. All data is invented.
   Story: a question leaves the assistant, passes through the door (checked), data is fetched and logged
   behind the door, and the answer travels back through the door. */
(function () {
  'use strict';

  var mq = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  function reduced() { return !!(mq && mq.matches); }
  var NS = 'http://www.w3.org/2000/svg';

  function h(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function sv(tag, attrs) {
    var n = document.createElementNS(NS, tag);
    Object.keys(attrs || {}).forEach(function (k) { n.setAttribute(k, attrs[k]); });
    return n;
  }
  function btn(cls, text) { var b = h('button', cls, text); b.type = 'button'; return b; }
  function tx(text) { return h('span', 'dm-tx', text); }
  function money(n) { return '$' + n.toLocaleString('en-US'); }

  /* ---------- invented data ---------- */
  var STORES = ['Northside', 'Lakeview', 'Riverbend', 'Hillcrest', 'Eastgate'];
  var PEOPLE = {
    principal: { id: 'principal', name: 'Pat Morgan', first: 'Pat', label: 'Dealer principal', handle: 'pat.morgan', role: 'dealer_principal', initials: 'PM' },
    gm: { id: 'gm', name: 'Jordan Rivera', first: 'Jordan', label: 'Store GM, Northside', handle: 'jordan.rivera', role: 'store_gm', initials: 'JR' }
  };
  function all(p) { return p.id === 'principal'; }
  function sees(p, i) { return all(p) || i === 0; }
  function scope(p) { return all(p) ? 'all' : 'northside'; }
  function sumVisible(q, p) { return q.values.reduce(function (a, v, i) { return a + (sees(p, i) ? v : 0); }, 0); }

  var DRAFTS = {
    principal: [['Maria G.', 'Lakeview', 'Front brake pads', 340], ['Devon T.', 'Riverbend', 'Rear tires near the limit', 620], ['Alicia R.', 'Northside', 'Coolant leak', 485]],
    gm: [['Alicia R.', 'Northside', 'Coolant leak', 485], ['Ben K.', 'Northside', 'Brake pads and rotors', 560], ['Priya S.', 'Northside', 'Weak battery', 210]]
  };

  var Q = [
    {
      short: 'Cars over 60 days', agent: 'Aged-inventory watcher',
      q: 'Which stores have cars sitting over 60 days, and what’s it costing us?',
      values: [14, 9, 21, 6, 11], unit: 'cars over 60 days',
      sub: function (n, p) { return 'About ' + money(n * 38) + ' a day to carry' + (all(p) ? ', across all 5 stores.' : ', at Northside.'); },
      fetch: function (p) { return { call: 'inventory.aged_units', args: '(min_days=60, stores=' + scope(p) + ')', rows: (all(p) ? 61 : 14) + ' rows', ms: all(p) ? 42 : 23 }; },
      def: 'age = days on the lot; cost = $38 a car a day',
      gloss: 'Cars on the lot 60+ days, and what each costs.'
    },
    {
      short: 'Slow lead replies', agent: 'Lead-response audit',
      q: 'Who waited more than 15 minutes for a first reply to their lead yesterday?',
      values: [5, 7, 3, 11, 5], unit: 'leads waited 15+ min',
      sub: function (n, p) { return 'Out of ' + (all(p) ? '212' : '48') + ' leads yesterday' + (all(p) ? '. Hillcrest had the most.' : ', at Northside.'); },
      fetch: function (p) { return { call: 'leads.first_replies', args: '(date=yesterday, stores=' + scope(p) + ')', rows: (all(p) ? 212 : 48) + ' rows', ms: all(p) ? 57 : 21 }; },
      def: 'first reply = first call, text or email from a person',
      gloss: 'Yesterday’s leads and when a person first replied.'
    },
    {
      short: 'Morning report', agent: 'Daily group report', via: 'agent',
      q: 'Give me this morning’s group report.',
      values: [6, 4, 8, 3, 6], unit: 'cars sold yesterday',
      sub: function (n, p) { return all(p) ? 'On pace for 723 of 760 this month (95%).' : 'Northside is on pace for 162 of 165 this month (98%).'; },
      fetch: function (p) { return { call: 'sales.deliveries', args: '(date=yesterday, stores=' + scope(p) + ')', rows: (all(p) ? 27 : 6) + ' rows', ms: all(p) ? 38 : 17 }; },
      def: 'sold = delivered and funded',
      gloss: 'Yesterday’s sales and the month so far.'
    },
    {
      short: 'Service follow-ups', agent: 'Service follow-up drafts', write: true,
      q: 'Draft follow-ups for service work customers declined last week.',
      unit: 'drafts held at the door',
      sub: function () { return '3 drafts waiting for Dana (Service Director) to approve. Nothing has been sent.'; },
      fetch: function (p) { return { call: 'service.declined_work', args: '(since=last_week, stores=' + scope(p) + ')', rows: (all(p) ? 23 : 6) + ' rows', ms: all(p) ? 48 : 19 }; },
      def: 'customers who opted out are never drafted',
      gloss: 'Declined work, minus customers who opted out.'
    }
  ];

  /* ---------- small drawings ---------- */
  function lockSvg() {
    var s = sv('svg', { viewBox: '0 0 24 24', 'aria-hidden': 'true', focusable: 'false' });
    s.appendChild(sv('path', { class: 'dm-shackle', d: 'M8 11V8a4 4 0 0 1 8 0v3', fill: 'none', stroke: 'currentColor', 'stroke-width': 1.7, 'stroke-linecap': 'round' }));
    s.appendChild(sv('rect', { x: 5, y: 11, width: 14, height: 10, rx: 2.2, fill: 'none', stroke: 'currentColor', 'stroke-width': 1.7 }));
    s.appendChild(sv('circle', { cx: 12, cy: 16, r: 1.5, fill: 'currentColor' }));
    return s;
  }
  // A store: long, low showroom with a flat roof, a glass front and a pylon sign.
  function showroomSvg() {
    var s = sv('svg', { viewBox: '0 0 34 18', 'aria-hidden': 'true', focusable: 'false' });
    s.appendChild(sv('rect', { x: 0.5, y: 1, width: 5, height: 4.5, rx: 0.8, fill: 'currentColor' }));
    s.appendChild(sv('rect', { x: 2.4, y: 5.5, width: 1.2, height: 12.5, fill: 'currentColor' }));
    s.appendChild(sv('rect', { x: 7, y: 5.5, width: 27, height: 2, rx: 0.5, fill: 'currentColor' }));
    s.appendChild(sv('rect', { x: 8, y: 7.5, width: 25, height: 10.5, fill: 'currentColor', opacity: 0.22 }));
    s.appendChild(sv('path', { d: 'M12.5 8v10M17 8v10M21.5 8v10M26 8v10M30.5 8v10', stroke: 'currentColor', 'stroke-width': 0.9 }));
    return s;
  }
  function markSvg() {
    var s = sv('svg', { viewBox: '0 0 22 22', 'aria-hidden': 'true', focusable: 'false' });
    s.appendChild(sv('circle', { class: 'dm-ring', cx: 11, cy: 11, r: 9.5 }));
    s.appendChild(sv('path', { class: 'dm-tick', d: 'M6.5 11.5l3 3 6-6.5' }));
    s.appendChild(sv('path', { class: 'dm-pause', d: 'M9 7.5v7M13 7.5v7' }));
    return s;
  }

  /* ---------- component ---------- */
  var UID = 0;
  // measure = true builds a hidden copy used only to find the tallest state, so the real one never changes height.
  function mount(root, measure) {
    var S = { role: 'principal', q: 0, token: 0, instant: !!measure, speed: 1, started: false, measure: !!measure };
    var A = null; // the answer currently on screen
    var pend = [], anims = [];
    var uid = ++UID;

    root.classList.add('dm-root');
    root.textContent = '';
    if (!measure) {
      // The page's own section heading names this; the region gets a label, not a second heading.
      root.setAttribute('role', 'region');
      root.setAttribute('aria-label', 'See it work: one secure door to your group’s own data');
    }

    /* controls */
    var bar = h('div', 'dm-bar');
    var whoBox = h('div', 'dm-who');
    var whoL = h('span', 'dm-cap', 'Asking as'); whoL.id = 'dm-who-l' + uid;
    whoBox.appendChild(whoL);
    var seg = h('div', 'dm-seg');
    seg.setAttribute('role', 'group'); seg.setAttribute('aria-labelledby', whoL.id);
    var roleBtns = {};
    [['principal', 'Dealer principal'], ['gm', 'Store GM, Northside']].forEach(function (r) {
      var b = btn('dm-seg-btn', r[1]);
      b.addEventListener('click', function () {
        if (S.role === r[0]) return;
        S.role = r[0];
        run(false);
      });
      roleBtns[r[0]] = b;
      seg.appendChild(b);
    });
    whoBox.appendChild(seg);
    bar.appendChild(whoBox);

    var askBox = h('div', 'dm-askbox');
    var askL = h('span', 'dm-cap', 'Ask'); askL.id = 'dm-ask-l' + uid;
    askBox.appendChild(askL);
    var chips = h('div', 'dm-chips');
    chips.setAttribute('role', 'group'); chips.setAttribute('aria-labelledby', askL.id);
    var chipBtns = Q.map(function (q, i) {
      var b = btn('dm-chip');
      b.textContent = q.short;
      b.setAttribute('aria-label', q.short + ' (' + q.agent + ')');
      b.addEventListener('click', function () { S.q = i; run(false); });
      chips.appendChild(b);
      return b;
    });
    askBox.appendChild(chips);
    bar.appendChild(askBox);
    root.appendChild(bar);

    /* stage: assistant | door | behind the door */
    var stage = h('div', 'dm-stage');

    var qA = h('div', 'dm-q');
    var qHead = h('div', 'dm-head');
    var qLabel = h('span', 'dm-cap dm-cap--flat', 'Your assistant');
    qHead.appendChild(qLabel);
    var skip = btn('dm-skip', 'Skip');
    skip.setAttribute('aria-label', 'Skip the animation');
    skip.hidden = true;
    qHead.appendChild(skip);
    qA.appendChild(qHead);
    var bubble = h('div', 'dm-bubble dm-hide');
    var asker = h('p', 'dm-asker');
    var avatar = h('span', 'dm-avatar'); avatar.setAttribute('aria-hidden', 'true');
    var askerName = h('span', 'dm-asker-name');
    asker.appendChild(avatar); asker.appendChild(askerName);
    var qText = h('p', 'dm-qtext');
    bubble.appendChild(asker); bubble.appendChild(qText);
    qA.appendChild(bubble);
    stage.appendChild(qA);

    var aA = h('div', 'dm-a');
    aA.setAttribute('aria-live', 'polite');
    aA.setAttribute('aria-busy', 'false');
    aA.tabIndex = -1;
    stage.appendChild(aA);

    var door = h('div', 'dm-door');
    door.setAttribute('data-state', 'idle');
    var doorTop = h('div', 'dm-door-top');
    doorTop.appendChild(h('span', 'dm-door-label', 'The door'));
    var gate = h('span', 'dm-gate');
    gate.appendChild(lockSvg());
    doorTop.appendChild(gate);
    var gateState = h('span', 'dm-gate-state', 'Closed');
    gateState.setAttribute('aria-live', 'off');
    doorTop.appendChild(gateState);
    door.appendChild(doorTop);
    var slots = h('ul', 'dm-slots');
    slots.setAttribute('aria-label', 'Stores behind the door');
    var slotEls = STORES.map(function (n) {
      var li = h('li', 'dm-slot');
      li.appendChild(showroomSvg());
      li.appendChild(h('span', 'dm-slot-name', n));
      var st = h('span', 'dm-sr', '');
      li.appendChild(st);
      li._sr = st;
      slots.appendChild(li);
      return li;
    });
    door.appendChild(slots);
    stage.appendChild(door);

    var trace = h('div', 'dm-trace');
    trace.setAttribute('role', 'region');
    trace.setAttribute('aria-label', 'Behind the door');
    var tHead = h('div', 'dm-head');
    tHead.appendChild(h('span', 'dm-cap dm-cap--flat dm-cap--term', 'Behind the door'));
    var status = h('span', 'dm-status', 'Waiting');
    tHead.appendChild(status);
    trace.appendChild(tHead);
    var stList = h('ol', 'dm-stages');
    var stages = ['Checked', 'Fetched', 'Approval', 'Logged'].map(function (label) {
      var li = h('li', 'dm-st');
      li.setAttribute('data-state', 'idle');
      var mark = h('span', 'dm-st-mark');
      mark.appendChild(markSvg());
      li.appendChild(mark);
      var body = h('div', 'dm-st-body dm-pending');
      body.appendChild(h('span', 'dm-st-label', label));
      var code = h('code', 'dm-st-code');
      var gl = h('p', 'dm-st-gloss');
      body.appendChild(gl); body.appendChild(code);
      li.appendChild(body);
      stList.appendChild(li);
      return { li: li, mark: mark, body: body, code: code, gl: gl };
    });
    trace.appendChild(stList);
    stage.appendChild(trace);

    var pulseEl = h('span', 'dm-pulse');
    pulseEl.setAttribute('aria-hidden', 'true');
    stage.appendChild(pulseEl);
    root.appendChild(stage);

    var works = h('div', 'dm-works');
    works.appendChild(h('p', 'dm-works-text', 'One secure door any AI assistant can use. You choose the assistant.'));
    var wl = h('ul', 'dm-works-list');
    ['Your chat assistant', 'Your spreadsheet', 'Your own apps', 'Starter agents'].forEach(function (t) { wl.appendChild(h('li', 'dm-works-chip', t)); });
    works.appendChild(wl);
    root.appendChild(works);
    root.appendChild(h('p', 'dm-caption', 'Illustration. Made-up stores, people and numbers. No real system is being queried.'));

    /* ---------- timing ---------- */
    function flush() {
      pend.forEach(function (x) { clearTimeout(x.t); x.res(); });
      pend = [];
      anims.forEach(function (a) { try { a.cancel(); } catch (e) { /* ignore */ } });
      anims = [];
    }
    function wait(ms) {
      if (S.instant || ms <= 0) return Promise.resolve();
      return new Promise(function (res) {
        var item = { res: res };
        item.t = setTimeout(function () { pend = pend.filter(function (x) { return x !== item; }); res(); }, ms);
        pend.push(item);
      });
    }
    function T(ms) { return wait(ms * S.speed); }

    function pulse(fromEl, toEl, dur, tone) {
      if (S.instant || !pulseEl.animate) return Promise.resolve();
      var sr = stage.getBoundingClientRect();
      var g = gate.getBoundingClientRect();
      var gc = { x: g.left + g.width / 2 - sr.left, y: g.top + g.height / 2 - sr.top };
      function pt(el) {
        var r = el.getBoundingClientRect();
        var inset = Math.min(8, r.width / 2, r.height / 2);
        var L = r.left - sr.left + inset, R = r.right - sr.left - inset, Tp = r.top - sr.top + inset, B = r.bottom - sr.top - inset;
        return { x: Math.min(Math.max(gc.x, L), R), y: Math.min(Math.max(gc.y, Tp), B) };
      }
      var a = pt(fromEl), b = pt(toEl);
      function tf(p, s) { return 'translate(' + (p.x - 6).toFixed(1) + 'px,' + (p.y - 6).toFixed(1) + 'px) scale(' + s + ')'; }
      if (pulseEl.getAnimations) pulseEl.getAnimations().forEach(function (x) { x.cancel(); });
      pulseEl.className = 'dm-pulse' + (tone ? ' dm-pulse--' + tone : '');
      var an = pulseEl.animate([
        { transform: tf(a, 0.3), opacity: 0 },
        { transform: tf(a, 1), opacity: 1, offset: 0.1 },
        { transform: tf(gc, 1.6), opacity: 1, offset: 0.5 },
        { transform: tf(b, 1), opacity: 1, offset: 0.9 },
        { transform: tf(b, 0.3), opacity: 0 }
      ], { duration: dur, easing: 'cubic-bezier(.45,.05,.35,1)', fill: 'forwards' });
      anims.push(an);
      wait(dur * 0.38).then(function () {
        door.classList.add('dm-door--flare');
        return wait(dur * 0.3);
      }).then(function () { door.classList.remove('dm-door--flare'); });
      return wait(dur);
    }

    function countTo(el, holder, from, to, dur, tok) {
      holder.style.minWidth = Math.max(String(from).length, String(to).length) + 'ch';
      if (S.instant || from === to) { el.textContent = String(to); return; }
      var t0 = null;
      function step(t) {
        if (tok !== S.token) return;
        if (t0 === null) t0 = t;
        var k = Math.min(1, (t - t0) / dur);
        if (S.instant) k = 1;
        var e = 1 - Math.pow(1 - k, 3);
        el.textContent = String(Math.round(from + (to - from) * e));
        if (k < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
      setTimeout(function () { if (tok === S.token) el.textContent = String(to); }, dur + 400);
    }

    // Streamed text: the full line sits in the layout as invisible "ghost" text, and the visible part grows over it,
    // so typing never reflows anything.
    function setGhost(el, text) {
      el.textContent = '';
      el._t = text;
      el._a = el.appendChild(h('span', 'dm-typed'));
      el._b = el.appendChild(h('span', 'dm-ghost', text));
    }
    function typeIn(el, maxMs) {
      var text = el._t || '', a = el._a, b = el._b, tok = S.token;
      if (!a) return;
      function at(k) { a.textContent = text.slice(0, k); b.textContent = text.slice(k); }
      if (S.instant || !text) { at(text.length); return; }
      var dur = Math.min(maxMs, text.length * 15) * S.speed, t0 = null;
      at(0);
      function step(t) {
        if (tok !== S.token || el._a !== a) return;
        if (t0 === null) t0 = t;
        var k = S.instant ? 1 : Math.min(1, (t - t0) / dur);
        at(Math.round(text.length * k));
        if (k < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
      setTimeout(function () { if (tok === S.token && el._a === a) at(text.length); }, dur + 400);
    }

    function swapText(el, text) {
      if (el.textContent === text) return Promise.resolve();
      if (S.instant) { el.textContent = text; return Promise.resolve(); }
      el.classList.add('dm-swap');
      return wait(220).then(function () { el.textContent = text; el.classList.remove('dm-swap'); });
    }

    /* ---------- trace ---------- */
    function line() {
      var ln = h('span', 'dm-line');
      var t = h('span', 'dm-tx');
      Array.prototype.slice.call(arguments).forEach(function (sg) {
        if (!sg[1]) return;
        t.appendChild(sg[0] ? h('span', 'dm-c-' + sg[0], sg[1]) : document.createTextNode(sg[1]));
      });
      ln.appendChild(t);
      return ln;
    }
    function setStage(i, lines, gloss) {
      var st = stages[i];
      st.body.classList.add('dm-pending');
      st.code.textContent = '';
      lines.forEach(function (l) { st.code.appendChild(l); });
      setGhost(st.gl, gloss);
    }
    function reveal(i) { stages[i].body.classList.remove('dm-pending'); typeIn(stages[i].gl, 650); }
    function stState(i, s) { stages[i].li.setAttribute('data-state', s); }

    function fillTrace(q, p, qi) {
      var agent = q.via === 'agent';
      setStage(0, [
        line(['k', 'who '], ['', agent ? 'agent:daily_report for ' + p.handle : p.handle + ' · ' + p.role]),
        line(['k', 'scope '], ['', all(p) ? 'all 5 stores' : 'Northside only'], ['m', all(p) ? '' : '  · 4 shut'])
      ], agent ? 'The agent gets ' + p.first + '’s access, no more.' : (all(p) ? 'Pat may see every store.' : 'Jordan sees Northside. Four stores stay shut.'));
      var f = q.fetch(p);
      setStage(1, [
        line(['f', f.call], ['', f.args], ['m', '  → ' + f.rows + ' · ' + f.ms + ' ms']),
        line(['k', 'def '], ['', q.def])
      ], q.gloss);
      if (q.write) {
        setStage(2, [line(['b', 'held '], ['', 'contact_customer → dana.brooks']), line(['k', 'sent '], ['', '0'])], 'Waits for Dana (Service Director).');
      } else {
        setStage(2, [line(['k', 'changes '], ['', 'none · read-only'])], 'Nothing to approve.');
      }
      setStage(3, [line(['k', 'audit '], ['', 'A-' + (20419 + qi + (all(p) ? 0 : 14)) + ' · ' + p.handle])],
        q.write ? 'Who asked, what was drafted, when.' : 'Who asked, what was read, when.');
      stages.forEach(function (st, i) { stState(i, 'idle'); });
    }

    function setSlots(p) {
      var step = 120 * S.speed;
      slotEls.forEach(function (li, i) {
        var ok = sees(p, i);
        li.style.transitionDelay = S.instant ? '0ms' : Math.round(i * step) + 'ms';
        li.classList.toggle('dm-slot--lit', ok);
        li.classList.toggle('dm-slot--shut', !ok);
        li._sr.textContent = ok ? ', open' : ', shut';
      });
      return wait(step * 5 + 450);
    }
    function setGate(state, text) { door.setAttribute('data-state', state); gateState.textContent = text; }

    /* ---------- answer ---------- */
    function buildChart(q) {
      var fig = h('figure', 'dm-chart');
      fig.appendChild(h('figcaption', 'dm-cap', 'By store'));
      var ul = h('ul', 'dm-rows');
      ul.setAttribute('role', 'list');
      var max = Math.max.apply(null, q.values);
      var rows = q.values.map(function (v, i) {
        var li = h('li', 'dm-row');
        li.setAttribute('role', 'listitem');
        var lab = h('span', 'dm-row-label', STORES[i]);
        var track = h('span', 'dm-track');
        var fill = h('span', 'dm-fill');
        track.appendChild(fill);
        var val = h('span', 'dm-row-val', '');
        li.appendChild(lab); li.appendChild(track); li.appendChild(val);
        ul.appendChild(li);
        return { li: li, fill: fill, val: val, v: v, f: v / max };
      });
      fig.appendChild(ul);
      return {
        el: fig,
        setRole: function (p) {
          rows.forEach(function (r, i) {
            var ok = sees(p, i);
            r.li.classList.toggle('dm-row--shut', !ok);
            r.fill.style.transitionDelay = S.instant ? '0ms' : (i * 70) + 'ms';
            r.fill.style.transform = 'scaleX(' + (ok ? r.f.toFixed(3) : 0) + ')';
            r.val.textContent = ok ? String(r.v) : 'no access';
          });
        }
      };
    }

    function buildDrafts(p) {
      var ul = h('ul', 'dm-drafts');
      var badges = [], msgs = [];
      DRAFTS[p.id].forEach(function (d, i) {
        var li = h('li', 'dm-draft');
        li.style.transitionDelay = (i * 90) + 'ms';
        var who = h('p', 'dm-draft-who');
        var wt = tx('');
        wt.appendChild(h('strong', null, d[0]));
        wt.appendChild(document.createTextNode(' · ' + d[1]));
        who.appendChild(wt);
        var badge = h('span', 'dm-badge', 'Held');
        var item = h('p', 'dm-draft-item');
        item.appendChild(tx(d[2] + ' · est. ' + money(d[3])));
        var first = d[0].split(' ')[0];
        var msg = h('p', 'dm-draft-msg');
        msg.appendChild(tx('Hi ' + first + ', when you were in last week our technician flagged: ' + d[2].toLowerCase() +
          '. Want us to take care of it? Reply here or call to pick a time. – ' + d[1] + ' service team'));
        msg.setAttribute('aria-label', 'Draft message to ' + d[0]);
        li.appendChild(who); li.appendChild(badge); li.appendChild(item); li.appendChild(msg);
        ul.appendChild(li);
        badges.push(badge); msgs.push(msg);
      });
      return { el: ul, badges: badges, msgs: msgs };
    }

    function buildAnswer(q, p, qi) {
      aA.textContent = '';
      // Waiting state: real words (unit, store names, customers) are visible; the number and the line stream in on landing.
      var ans = h('div', 'dm-ans dm-await');
      var hero = h('div', 'dm-hero');
      var n = q.write ? 3 : sumVisible(q, p);
      var num = h('span', 'dm-hero-num');
      var numTx = tx('0');
      num.style.minWidth = String(n).length + 'ch';
      num.appendChild(numTx);
      var unit = h('span', 'dm-hero-unit');
      var unitTx = tx(q.unit);
      unit.appendChild(unitTx);
      hero.appendChild(num); hero.appendChild(unit);
      ans.appendChild(hero);
      var sub = h('p', 'dm-hero-sub');
      setGhost(sub, q.sub(n, p));
      ans.appendChild(sub);
      var detail = q.write ? buildDrafts(p) : buildChart(q);
      ans.appendChild(detail.el);
      A = { q: qi, role: p.id, ans: ans, hero: hero, unitTx: unitTx, num: num, numTx: numTx, subTx: sub, detail: detail, n: 0, landed: false };
      if (q.write) buildActions(ans);
      aA.appendChild(ans);
    }

    function land(q, p, morph, tok) {
      var n = q.write ? 3 : sumVisible(q, p);
      if (morph) {
        A.ans.classList.remove('dm-ans--stale');
        setGhost(A.subTx, q.sub(n, p));
      } else {
        A.ans.classList.remove('dm-await');
      }
      typeIn(A.subTx, 800);
      countTo(A.numTx, A.num, morph ? A.n : 0, n, 900, tok);
      if (!q.write) A.detail.setRole(p);
      A.n = n; A.role = p.id; A.landed = true;
    }

    /* approval moment */
    function buildActions(ans) {
      var actions = h('div', 'dm-actions');
      var approve = btn('dm-btn dm-btn--primary', 'Approve');
      var edit = btn('dm-btn', 'Edit');
      var discard = btn('dm-btn dm-btn--quiet', 'Discard');
      edit.setAttribute('aria-pressed', 'false');
      actions.appendChild(approve); actions.appendChild(edit); actions.appendChild(discard);
      var note = h('p', 'dm-note');
      note.setAttribute('role', 'status');
      ans.appendChild(actions);
      ans.appendChild(note);
      var cur = A;
      var editing = false;

      function setEditing(on) {
        editing = on;
        edit.textContent = on ? 'Done editing' : 'Edit';
        edit.setAttribute('aria-pressed', String(on));
        cur.detail.el.classList.toggle('dm-drafts--edit', on);
        cur.detail.msgs.forEach(function (m) {
          if (on) { m.setAttribute('contenteditable', 'true'); m.setAttribute('role', 'textbox'); m.setAttribute('aria-multiline', 'true'); }
          else { m.removeAttribute('contenteditable'); m.removeAttribute('role'); m.removeAttribute('aria-multiline'); }
        });
      }
      function badges(text, cls) { cur.detail.badges.forEach(function (b) { b.textContent = text; b.className = 'dm-badge ' + cls; }); }
      function done(text) {
        setEditing(false);
        actions.textContent = '';
        var again = btn('dm-btn', 'Run it again');
        again.addEventListener('click', function () { run(false); });
        actions.appendChild(again);
        note.textContent = text;
        if (!S.measure) again.focus({ preventScroll: true });
      }
      function decide(kind) {
        var tok = S.token;
        S.instant = S.measure || reduced();
        void root.offsetWidth; root.classList.toggle('dm-instant', S.instant);
        S.speed = 0.8;
        [approve, edit, discard].forEach(function (b) { b.disabled = true; });
        setEditing(false);
        var p0 = kind === 'approve'
          ? pulse(actions, stages[2].mark, 1100, 'brass')
          : Promise.resolve();
        if (kind === 'approve') badges('Approved', 'dm-badge--ok');
        else { badges('Discarded', 'dm-badge--off'); cur.detail.el.classList.add('dm-drafts--off'); }
        return p0.then(function () {
          if (tok !== S.token) return;
          swapText(cur.unitTx, kind === 'approve' ? 'drafts approved' : 'drafts discarded');
          swapText(cur.subTx, kind === 'approve' ? 'Approved by Dana. In the real product these would now send.' : 'Discarded. Nothing was sent.');
          if (kind === 'approve') {
            setGate('approved', 'Approved');
            setStage(2, [line(['ok', 'approved '], ['', 'by dana.brooks']), line(['k', 'send '], ['', 'would send 3 · illustration'])], 'Nothing was sent. This is an illustration.');
          } else {
            setGate('discarded', 'Closed');
            setStage(2, [line(['k', 'discarded '], ['', 'by dana.brooks']), line(['k', 'sent '], ['', '0'])], 'No customer was contacted.');
          }
          stState(2, 'done');
          return wait(40).then(function () {
            reveal(2);
            done(kind === 'approve'
              ? 'In the real product this would send. This is an illustration.'
              : 'Discarded. Nothing was sent. This is an illustration.');
          });
        });
      }
      cur.decide = decide;
      approve.addEventListener('click', function () { decide('approve'); });
      discard.addEventListener('click', function () { decide('discard'); });
      edit.addEventListener('click', function () {
        if (!editing) {
          setEditing(true);
          note.textContent = 'Editing. Nothing is sent until Dana approves.';
          var m = cur.detail.msgs[0];
          if (m) m.focus({ preventScroll: true });
        } else {
          setEditing(false);
          note.textContent = 'Edits saved. Still held at the door. Nothing has been sent.';
        }
      });
    }

    /* ---------- run ---------- */
    function syncPressed() {
      chipBtns.forEach(function (b, i) { b.setAttribute('aria-pressed', String(i === S.q)); });
      Object.keys(roleBtns).forEach(function (k) { roleBtns[k].setAttribute('aria-pressed', String(k === S.role)); });
    }
    function setLabel(q) { qLabel.textContent = 'Your assistant · ' + q.agent; }
    function setAsker(p) { avatar.textContent = p.initials; return swapText(askerName, p.name + ' · ' + p.label); }

    skip.addEventListener('click', function () {
      S.instant = true;
      root.classList.add('dm-instant');
      flush();
      aA.focus({ preventScroll: true });
    });

    function run(auto) {
      var tok = ++S.token;
      flush();
      S.instant = reduced();
      void root.offsetWidth; root.classList.toggle('dm-instant', S.instant);
      var story = auto && !S.started;
      S.started = true;
      S.speed = story ? 1.5 : 0.7;
      var p = PEOPLE[S.role], qi = S.q, q = Q[qi];
      var morph = !!(A && !q.write && A.q === qi && A.landed);
      var gone = function () { return tok !== S.token; };
      syncPressed();
      aA.setAttribute('aria-busy', 'true');
      skip.hidden = S.instant;
      status.textContent = 'Working';
      status.setAttribute('data-s', 'run');
      setGate('idle', 'Closed');
      setLabel(q);
      fillTrace(q, p, qi);

      var pre = Promise.resolve();
      if (bubble.classList.contains('dm-hide')) {
        setAsker(p); qText.textContent = q.q;
        pre = T(400).then(function () { bubble.classList.remove('dm-hide'); return T(500); });
      } else {
        pre = Promise.all([setAsker(p), swapText(qText, q.q)]);
      }
      if (morph) {
        A.ans.classList.add('dm-ans--stale');
      } else if (A && (A.landed || A.q !== qi || A.role !== p.id)) {
        var old = A.ans;
        old.classList.add('dm-ans--leaving');
        pre = Promise.all([pre, wait(S.instant ? 0 : 260)]).then(function () { if (!gone()) buildAnswer(q, p, qi); });
      }

      pre.then(function () {
        if (gone()) throw 0;
        setGate('checking', 'Checking');
        return pulse(qText, gate, 1000 * S.speed);
      }).then(function () {
        if (gone()) throw 0;
        stState(0, 'active');
        reveal(0);
        return setSlots(p);
      }).then(function () {
        if (gone()) throw 0;
        return T(200);
      }).then(function () {
        if (gone()) throw 0;
        stState(0, 'done');
        setGate('open', all(p) ? 'Open' : 'Northside');
        return pulse(gate, stages[1].mark, 700 * S.speed);
      }).then(function () {
        if (gone()) throw 0;
        stState(1, 'active');
        reveal(1);
        return T(900);
      }).then(function () {
        if (gone()) throw 0;
        stState(1, 'done');
        stState(2, 'active');
        reveal(2);
        return T(450);
      }).then(function () {
        if (gone()) throw 0;
        if (q.write) { stState(2, 'held'); setGate('held', '3 held'); }
        else stState(2, 'done');
        return T(450);
      }).then(function () {
        if (gone()) throw 0;
        stState(3, 'active');
        reveal(3);
        return T(380);
      }).then(function () {
        if (gone()) throw 0;
        stState(3, 'done');
        return pulse(stages[3].mark, A.hero, 1100 * S.speed, q.write ? 'brass' : '');
      }).then(function () {
        if (gone()) throw 0;
        land(q, p, morph, tok);
        return T(700);
      }).then(function () {
        if (gone()) throw 0;
        aA.setAttribute('aria-busy', 'false');
        if (document.activeElement === skip) aA.focus({ preventScroll: true });
        skip.hidden = true;
        status.textContent = 'Done';
        status.setAttribute('data-s', 'done');
      }).catch(function (e) { if (e !== 0) throw e; });
    }

    // Initial, still frame: the first question waiting, the answer and trace in their waiting state.
    syncPressed();
    setAsker(PEOPLE.principal);
    setLabel(Q[0]);
    qText.textContent = Q[0].q;
    buildAnswer(Q[0], PEOPLE.principal, 0);
    fillTrace(Q[0], PEOPLE.principal, 0);

    var parts = { q: qA, a: aA, trace: trace };
    if (measure) {
      // Draw one final state instantly (used only by the hidden measuring copy).
      return {
        parts: parts,
        render: function (qi, roleId, variant) {
          S.instant = true; S.token++;
          var p = PEOPLE[roleId], q = Q[qi];
          bubble.classList.remove('dm-hide');
          avatar.textContent = p.initials;
          askerName.textContent = p.name + ' · ' + p.label;
          qText.textContent = q.q;
          setLabel(q);
          skip.hidden = false;
          buildAnswer(q, p, qi);
          land(q, p, false, S.token);
          fillTrace(q, p, qi);
          stages.forEach(function (st, i) { reveal(i); stState(i, 'done'); });
          return variant && A.decide ? A.decide(variant) : Promise.resolve();
        }
      };
    }

    // Reserve the tallest state of each part (every question, both roles, approve and discard)
    // so nothing below the demo moves between questions or roles.
    var M = null, host = null, lastW = -1, mToken = 0;
    function remeasure() {
      var w = root.clientWidth;
      if (!w || w === lastW) return;
      lastW = w;
      if (!M) {
        host = h('div');
        host.setAttribute('aria-hidden', 'true');
        host.inert = true;
        host.style.cssText = 'position:absolute;left:-10000px;top:0;visibility:hidden;pointer-events:none;overflow:hidden';
        var mr = h('div', 'dm-measure');
        host.appendChild(mr);
        document.body.appendChild(host);
        M = mount(mr, true);
      }
      host.style.width = w + 'px';
      var my = ++mToken, max = { q: 0, a: 0, trace: 0 }, chain = Promise.resolve();
      Q.forEach(function (q, qi) {
        ['principal', 'gm'].forEach(function (r) {
          (q.write ? ['', 'approve', 'discard'] : ['']).forEach(function (v) {
            chain = chain.then(function () { return M.render(qi, r, v); }).then(function () {
              Object.keys(max).forEach(function (k) { max[k] = Math.max(max[k], Math.ceil(M.parts[k].getBoundingClientRect().height)); });
            });
          });
        });
      });
      chain.then(function () {
        if (my !== mToken) return;
        Object.keys(max).forEach(function (k) { parts[k].style.minHeight = max[k] + 'px'; });
      });
    }
    remeasure();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { lastW = -1; remeasure(); });
    var rz = 0;
    window.addEventListener('resize', function () { cancelAnimationFrame(rz); rz = requestAnimationFrame(remeasure); });

    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) { io.disconnect(); if (!S.started) run(true); }
        });
      }, { threshold: 0.25 });
      io.observe(stage);
    } else {
      run(true);
    }
  }

  function init() {
    var el = document.getElementById('agent-demo');
    if (el) mount(el);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
