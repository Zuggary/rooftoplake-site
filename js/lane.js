/* RooftopLake — "Agents do the work. People decide." One service-lane scene, two ways.
   Vanilla JS, no globals, no requests. Mounts into #lane-story. Illustration only; made-up people. */
(function () {
  'use strict';

  var FLOOR = 372, LANE = 430, CAR_PARK = 200, DOOR = 380;
  var LAKE = { x: 990, y: 92 };
  var MON = { x: 942, y: 288 };
  var STEP_MS = 3000;
  var VB_WIDE = '0 0 1120 460';
  /* Phone: its own, tighter frame (630 x 480 units), about 261px tall at 375px wide. */
  var PH = { vb: '370 -20 630 480', left: 378, right: 992, lakeX: 936 };

  var STEPS = [['0:00', 'Arrives'], ['0:30', 'Ready'], ['1:00', 'Greeting'], ['2:30', 'Add-ons'], ['4:30', 'Sign-off']];
  var N = STEPS.length;
  var MODE_NAME = { today: 'Today', idea: 'The idea' };

  var STORY = {
    today: [
      ['Maria pulls in.', 'Sam is still typing the last order.'],
      ['She waits.', 'Sam searches her name, the car, the history.'],
      ['Hello, to his back.', 'He types while she talks.'],
      ['Anything else?', 'Recalls in one tool, the order in another.'],
      ['Sign and go.', 'Most of the visit went to the screen.']
    ],
    idea: [
      ['Maria pulls in.', 'Lane check-in confirms her 8:15 booking.'],
      ['Ready before she’s out.', 'Agents prepared her visit from the lake.'],
      ['“Morning, Maria.”', 'Sam confirms it’s her, then why she’s here.'],
      ['Anything else?', 'She says yes to the pads. Sam tells the agent.'],
      ['Sam approves. Maria signs.', 'The agent typed. The people decided.']
    ]
  };

  /* Illustrative numbers for one made-up visit (running totals). */
  var EYES = { today: [70, 80, 76, 80, 78], idea: [20, 15, 8, 9, 10] };
  var TYPED = { today: [0, 14, 22, 37, 46], idea: [0, 0, 0, 0, 0] };
  var DECIDED = { today: [0, 0, 2, 4, 7], idea: [0, 0, 2, 4, 7] };

  var LEDGER_AGENT = ['Prepared the visit from her 8:15 booking', 'Pulled her history and the open recall',
    'Found the brake pads she declined last time', 'Drafted the repair order for Sam to review',
    'Held a loaner', 'Updated the draft when Sam told it the change'];
  var LEDGER_TYPED = ['Searched for her booking by name', 'Re-keyed the car and the mileage',
    'Looked up the recall in another tool', 'Dug the declined pads out of old notes', 'Typed the repair order line by line'];
  var LEDGER_PEOPLE = ['Sam confirmed it was Maria and her car', 'Sam recommended the recall and the pads',
    'Maria authorized the added work', 'Sam reviewed and approved the repair order', 'Maria signed'];

  /* Cards on Sam's tablet: [label, appears at step, turns to a person's decision at step] */
  var CARDS = [['Maria · 8:15', 0, 2], ['History', 1, 99], ['Open recall', 1, 3],
    ['Declined', 1, 3], ['Draft order', 1, 4], ['Loaner', 1, 4]];
  /* Today's windows piling up around the monitor: [cx, cy, rotate] */
  var WINS = [[950, 226, -4], [1012, 262, 5], [902, 192, 3], [1060, 208, -6], [975, 160, -2],
    [866, 146, 6], [1046, 132, 4], [930, 116, -5], [1052, 300, 7]];

  function scene(mode, s) {
    if (mode === 'today') {
      return {
        samX: 820, samFace: 1,
        maria: [null, 690, 690, 690, 'exit'][s],
        samB: ['typing', 'typing', 'typing', 'One sec…', 'Sign here.'][s],
        mariaB: [null, null, 'Hi, I have an 8:15?', null, null][s],
        wins: [1, 4, 6, 9, 9][s], car: s < 4 ? 'park' : 'out',
        idea: false, scan: false, gaze: 'screen', meet: false
      };
    }
    return {
      samX: 640, samFace: -1,
      maria: [null, 560, 560, 560, 'exit'][s],
      samB: [null, null, 'Morning, Maria!', null, 'All set.'][s],
      mariaB: [null, null, 'That’s me.', 'Yes, do the pads.', null][s],
      wins: 0, car: s < 4 ? 'park' : 'out',
      idea: true, scan: s === 0, gaze: s < 2 ? 'tablet' : 'maria', meet: s === 2 || s === 3
    };
  }

  /* ---------- helpers ---------- */
  function h(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function ease(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }

  var ICON = {
    back: '<svg viewBox="0 0 20 20" aria-hidden="true" focusable="false"><path d="M12.5 4.5 7 10l5.5 5.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    next: '<svg viewBox="0 0 20 20" aria-hidden="true" focusable="false"><path d="M7.5 4.5 13 10l-5.5 5.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    play: '<svg viewBox="0 0 20 20" aria-hidden="true" focusable="false"><path d="M6.5 4.2v11.6L15.5 10z" fill="currentColor"/></svg>',
    pause: '<svg viewBox="0 0 20 20" aria-hidden="true" focusable="false"><rect x="5.5" y="4.5" width="3" height="11" rx="1" fill="currentColor"/><rect x="11.5" y="4.5" width="3" height="11" rx="1" fill="currentColor"/></svg>'
  };

  /* ---------- SVG ---------- */
  function person(cls, name, extra) {
    return '<g class="ln-p ' + cls + '"><g class="ln-flip">' +
      '<rect class="ln-leg ln-leg-a" x="-11" y="-42" width="10" height="42" rx="4"/>' +
      '<rect class="ln-leg ln-leg-b" x="1" y="-42" width="10" height="42" rx="4"/>' +
      '<path class="ln-torso" d="M-20 -38V-72Q-20 -90 0 -90Q20 -90 20 -72V-38Z"/>' +
      '<rect class="ln-arm" x="6" y="-84" width="9" height="34" rx="4.5" transform="rotate(-50 10 -82)"/>' +
      '<circle class="ln-head" cx="0" cy="-105" r="15"/>' +
      '<path class="ln-hair" d="M4 -119.5A15 15 0 0 0 -14.5 -100Q-8 -112 4 -113Z"/>' +
      '<path class="ln-nose" d="M14 -107l5 4-5 1.5Z"/>' + (extra || '') +
      '</g><text class="ln-name" x="0" y="28" text-anchor="middle">' + name + '</text></g>';
  }

  function sceneSVG(uid) {
    var i, out = [];
    var slats = '', lamps = '', arrows = '', mull = '', stars = '', wins = '', cards = '';
    for (i = 0; i < 5; i++) slats += '<rect class="ln-s-slat" x="48" y="' + (210 + i * 6) + '" width="544" height="4"/>';
    [130, 320, 510].forEach(function (x) {
      lamps += '<polygon class="ln-s-cone" points="' + (x - 26) + ',246 ' + (x + 26) + ',246 ' + (x + 90) + ',372 ' + (x - 90) + ',372"/>' +
        '<rect class="ln-s-lamp" x="' + (x - 28) + '" y="242" width="56" height="5" rx="2.5"/>';
    });
    [40, 640, 1010].forEach(function (x) { arrows += '<path class="ln-s-arrow" d="M' + x + ' 452h34l-8-7M' + (x + 34) + ' 452l-8 7"/>'; });
    for (i = 0; i < 4; i++) mull += '<path class="ln-s-mull" d="M' + (690 + i * 70) + ' 220V372"/>';
    [[60, 40], [180, 92], [420, 30], [640, 70], [760, 22], [860, 120], [1090, 40], [1100, 170], [520, 120]].forEach(function (p) {
      stars += '<circle class="ln-s-star" cx="' + p[0] + '" cy="' + p[1] + '" r="1.4"/>';
    });
    WINS.forEach(function (w, j) {
      wins += '<g class="ln-win" data-i="' + j + '"><rect class="ln-win-b" x="-56" y="-35" width="112" height="70" rx="6"/>' +
        '<rect class="ln-win-t" x="-56" y="-35" width="112" height="14" rx="6"/><circle cx="-46" cy="-28" r="2.6"/>' +
        '<rect class="ln-bar" x="-46" y="-12" width="' + (60 + (j * 13) % 30) + '" height="6" rx="3"/>' +
        '<rect class="ln-bar" x="-46" y="0" width="' + (40 + (j * 17) % 40) + '" height="6" rx="3"/>' +
        '<rect class="ln-bar" x="-46" y="12" width="' + (30 + (j * 7) % 30) + '" height="6" rx="3"/></g>';
    });
    CARDS.forEach(function (c, j) {
      cards += '<g class="ln-card" data-i="' + j + '" transform="translate(' + LAKE.x + ' ' + LAKE.y + ')">' +
        '<rect class="ln-card-b" x="0" y="0" width="128" height="40" rx="8"/><rect class="ln-card-a" x="0" y="0" width="4" height="40" rx="2"/>' +
        '<text class="ln-card-t" x="14" y="17">' + c[0] + '</text>' +
        '<rect class="ln-bar" x="14" y="25" width="' + (50 + j * 8) + '" height="5" rx="2.5"/>' +
        '<circle class="ln-card-d" cx="116" cy="13" r="4.5"/></g>';
    });

    out.push('<svg class="ln-svg" viewBox="' + VB_WIDE + '" preserveAspectRatio="xMidYMid slice" role="img" aria-labelledby="' + uid + '-st ' + uid + '-sd">',
      '<title id="' + uid + '-st">A dealership service drive at dusk</title><desc id="' + uid + '-sd"></desc>',
      '<defs>',
      '<linearGradient id="' + uid + '-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" class="ln-g-sky1"/><stop offset="1" class="ln-g-sky2"/></linearGradient>',
      '<linearGradient id="' + uid + '-in" x1="0" y1="0" x2="0" y2="1"><stop offset="0" class="ln-g-in1"/><stop offset="1" class="ln-g-in2"/></linearGradient>',
      '<linearGradient id="' + uid + '-fl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" class="ln-g-fl1"/><stop offset="1" class="ln-g-fl2"/></linearGradient>',
      '<radialGradient id="' + uid + '-lk"><stop offset="0" class="ln-g-lk1"/><stop offset="1" class="ln-g-lk2"/></radialGradient>',
      '</defs>',
      '<rect x="-400" y="-400" width="1920" height="860" fill="url(#' + uid + '-sky)"/>', stars,
      /* the lake */
      '<g class="ln-lake"><ellipse class="ln-lake-glow" cx="' + LAKE.x + '" cy="' + (LAKE.y + 6) + '" rx="120" ry="44" fill="url(#' + uid + '-lk)"/>',
      '<ellipse class="ln-lake-w" cx="' + LAKE.x + '" cy="' + LAKE.y + '" rx="78" ry="22"/>',
      '<path class="ln-lake-r" d="M940 90q8-6 16 0t16 0 16 0 16 0 16 0 16 0M956 100q8-6 16 0t16 0 16 0 16 0"/>',
      '<text class="ln-lake-t" x="' + LAKE.x + '" y="' + (LAKE.y + 48) + '" text-anchor="middle">The lake</text></g>',
      /* building: long, low, flat roof */
      '<rect class="ln-s-wall" x="0" y="150" width="1000" height="222"/>',
      '<rect x="40" y="206" width="560" height="166" fill="url(#' + uid + '-in)"/>',
      '<rect class="ln-s-back" x="40" y="300" width="560" height="72"/>', lamps, slats,
      '<rect class="ln-s-track" x="40" y="206" width="8" height="166"/><rect class="ln-s-track" x="592" y="206" width="8" height="166"/>',
      '<rect class="ln-s-glass" x="620" y="220" width="370" height="152"/>', mull,
      '<rect class="ln-s-roof" x="0" y="150" width="1000" height="56"/>',
      '<rect class="ln-s-parapet" x="0" y="146" width="1000" height="6"/>',
      '<text class="ln-s-sign" x="500" y="185" text-anchor="middle">SERVICE DRIVE</text>',
      '<rect class="ln-s-trim" x="0" y="204" width="1000" height="3"/>',
      /* ground */
      '<rect x="-400" y="372" width="1920" height="88" fill="url(#' + uid + '-fl)"/>',
      '<rect class="ln-s-curb" x="-400" y="372" width="1920" height="10"/>', arrows,
      '<path class="ln-s-lane" d="M-400 440H1520"/>',
      /* camera on the fascia */
      '<g class="ln-cam"><rect class="ln-cam-m" x="556" y="206" width="4" height="10"/>',
      '<rect class="ln-cam-b" x="538" y="214" width="34" height="16" rx="4" transform="rotate(-24 555 222)"/>',
      '<circle class="ln-cam-l" cx="542" cy="229" r="3.5"/>',
      '<text class="ln-cam-t" x="586" y="234">lane check-in</text></g>',
      '<polygon class="ln-beam" points="540,232 480,384 512,384"/>',
      /* desk + monitor */
      '<rect class="ln-desk" x="862" y="320" width="130" height="52" rx="3"/>',
      '<rect class="ln-desk-top" x="856" y="316" width="142" height="6" rx="3"/>',
      '<rect class="ln-mon-s" x="938" y="308" width="8" height="10"/>',
      '<rect class="ln-mon" x="902" y="262" width="80" height="48" rx="4"/>',
      '<path class="ln-mon-l" d="M912 276h46M912 286h58M912 296h30"/>',
      '<g class="ln-wins">' + wins + '</g>',
      '<ellipse class="ln-meet" cx="600" cy="262" rx="70" ry="34"/>',
      person('ln-sam', 'Sam',
        '<rect class="ln-tag" x="4" y="-74" width="10" height="6" rx="1"/>' +
        '<g class="ln-tablet"><rect x="18" y="-86" width="26" height="34" rx="4"/><rect class="ln-tablet-s" x="21" y="-83" width="20" height="26" rx="2"/></g>'),
      person('ln-maria', 'Maria',
        '<ellipse class="ln-hair" cx="-15" cy="-96" rx="6" ry="11"/>' +
        '<g class="ln-key"><circle cx="24" cy="-48" r="5"/><rect x="27" y="-50" width="10" height="3.5" rx="1"/></g>'),
      '<line class="ln-gaze" x1="0" y1="0" x2="0" y2="0"/><circle class="ln-gaze-d" cx="0" cy="0" r="4"/>',
      /* car, in the front lane */
      '<g class="ln-car"><ellipse class="ln-car-sh" cx="150" cy="2" rx="160" ry="8"/>',
      '<path class="ln-car-body" d="M0 -14V-50Q2 -64 18 -66L58 -96Q64 -101 74 -101H174Q184 -101 190 -95L222 -66L262 -60Q300 -56 302 -42V-14Z"/>',
      '<path class="ln-car-win" d="M42 -66L74 -90H124V-66ZM134 -90H176L206 -66H134Z"/>',
      '<rect class="ln-car-light" x="292" y="-56" width="10" height="7" rx="2"/>',
      '<rect class="ln-plate" x="282" y="-40" width="22" height="13" rx="2.5"/>',
      '<rect class="ln-scan" x="280" y="-42" width="26" height="2.5" rx="1"/>',
      '<g class="ln-wheel" transform="translate(62 -14)"><circle r="21"/><g class="ln-spin"><circle class="ln-hub" r="8"/><path class="ln-spoke" d="M0 -8V8M-8 0H8"/></g></g>',
      '<g class="ln-wheel" transform="translate(240 -14)"><circle r="21"/><g class="ln-spin"><circle class="ln-hub" r="8"/><path class="ln-spoke" d="M0 -8V8M-8 0H8"/></g></g>',
      '</g>',
      '<g class="ln-callout"><rect x="372" y="290" width="150" height="32" rx="16"/><circle cx="392" cy="306" r="6"/>',
      '<text x="406" y="311">Checked in</text></g>',
      '<g class="ln-cards">' + cards + '</g>',
      '<g class="ln-bubble ln-bubble-m"><rect x="0" y="0" width="10" height="40" rx="20"/><path d=""/><text x="0" y="0" text-anchor="middle"></text></g>',
      '<g class="ln-bubble ln-bubble-s"><rect x="0" y="0" width="10" height="40" rx="20"/><path d=""/><text x="0" y="0" text-anchor="middle"></text>',
      '<g class="ln-dots"><circle r="3"/><circle r="3"/><circle r="3"/></g></g>',
      '</svg>');
    return out.join('');
  }

  /* ---------- build ---------- */
  var uidCount = 0;

  function init(mount) {
    var uid = 'ln' + (++uidCount);
    var reduce = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
    var phone = window.matchMedia ? window.matchMedia('(max-width: 600px)') : null;
    function still() { return !!(reduce && reduce.matches); }

    var st = { mode: 'today', step: 0, playing: false, visible: false, started: false, ledger: { today: false, idea: false }, userStopped: false };
    var prevScene = null;
    var timer = null, timers = [], frames = {};

    mount.innerHTML = '';
    var root = h('div', 'ln');
    root.setAttribute('data-mode', 'today');

    root.appendChild(h('div', 'ln-head',
      '<div><p class="ln-kicker">One booked visit, two ways</p>' +
      '<h3 class="ln-title">Agents do the work. <em>People decide.</em></h3></div>' +
      '<div class="ln-switch" role="group" aria-label="Show the visit">' +
      '<span class="ln-switch-thumb" aria-hidden="true"></span>' +
      '<button type="button" class="ln-switch-b" data-mode="today" aria-pressed="true">Today</button>' +
      '<button type="button" class="ln-switch-b" data-mode="idea" aria-pressed="false">The idea</button></div>'));

    var scn = h('div', 'ln-scene');
    scn.innerHTML = sceneSVG(uid) +
      '<div class="ln-cap"><p class="ln-cap-k"></p><p class="ln-cap-h"></p><p class="ln-cap-p"></p></div>';
    root.appendChild(scn);

    var bar = h('div', 'ln-bar');
    var stepsHtml = STEPS.map(function (sp, i) {
      return '<li><button type="button" class="ln-step" data-step="' + i + '" aria-label="Moment ' + (i + 1) + ' of ' + N + ': ' + sp[0] + ', ' + sp[1] + '">' +
        '<span class="ln-step-dot" aria-hidden="true"></span><span class="ln-step-l">' + sp[1] + '</span></button></li>';
    }).join('');
    bar.innerHTML =
      '<button type="button" class="ln-btn ln-play" data-act="play" aria-pressed="false"></button>' +
      '<div class="ln-steps-w"><div class="ln-track" aria-hidden="true"><span class="ln-track-f"></span></div>' +
      '<ol class="ln-steps" aria-label="Moments in the visit">' + stepsHtml + '</ol></div>' +
      '<div class="ln-nav"><button type="button" class="ln-btn ln-icon" data-act="prev" aria-label="Previous moment">' + ICON.back + '</button>' +
      '<button type="button" class="ln-btn ln-icon" data-act="next" aria-label="Next moment">' + ICON.next + '</button></div>';
    root.appendChild(bar);

    root.appendChild(h('div', 'ln-read',
      '<div class="ln-eyes"><p class="ln-eyes-h">Sam’s eyes on</p>' +
      '<div class="ln-eyes-n"><span class="ln-eyes-a"><b class="ln-v-a">0%</b> the screen</span>' +
      '<span class="ln-eyes-b"><b class="ln-v-b">0%</b> Maria</span></div>' +
      '<div class="ln-split" role="img"><span class="ln-split-a"></span><span class="ln-split-b"></span></div></div>' +
      '<p class="ln-quiet">Typed by a person <b class="ln-v-t">0</b><span aria-hidden="true"> · </span>Decided by people <b class="ln-v-d">0</b>' +
      '<br><span class="ln-quiet-n">Illustrative numbers, one made-up visit.</span></p>'));

    root.appendChild(h('div', 'ln-honest',
      '<p><b>A picture of where this is going.</b> Not a shipped product. Illustration with a made-up customer.</p>' +
      '<p class="ln-consent">A plate reader is used only where the store has posted notice and the customer has agreed.</p>'));

    function list(items, off) { return '<ul>' + items.map(function (t, i) { return '<li style="--i:' + (i + off) + '">' + t + '</li>'; }).join('') + '</ul>'; }
    function cols(mode, head, items) {
      return '<div class="ln-cols ln-cols-' + mode + '"><div class="ln-col ln-col-a"><p class="ln-col-h">' + head + '</p>' + list(items, 0) + '</div>' +
        '<div class="ln-col ln-col-p"><p class="ln-col-h">People decided</p>' + list(LEDGER_PEOPLE, 2) + '</div></div>';
    }
    /* Both versions share one grid cell, so the space is reserved from the start and nothing below moves. */
    var ledger = h('section', 'ln-ledger');
    ledger.setAttribute('aria-labelledby', uid + '-lh');
    ledger.innerHTML = '<div class="ln-ledger-top"><h4 id="' + uid + '-lh" class="ln-ledger-h">Who did what</h4>' +
      '<p class="ln-ledger-hint">Fills in at sign-off.</p></div>' +
      '<div class="ln-ledger-stack">' + cols('today', 'A person typed', LEDGER_TYPED) + cols('idea', 'Agent did', LEDGER_AGENT) + '</div>';
    root.appendChild(ledger);

    var live = h('p', 'ln-sr');
    live.setAttribute('aria-live', 'polite');
    live.setAttribute('aria-atomic', 'true');
    root.appendChild(live);

    mount.appendChild(root);

    /* ---------- refs ---------- */
    function q(sel, el) { return (el || root).querySelector(sel); }
    function qa(sel, el) { return Array.prototype.slice.call((el || root).querySelectorAll(sel)); }
    var svg = q('.ln-svg');
    var R = {
      desc: q('desc', svg), car: q('.ln-car', svg), sam: q('.ln-sam', svg), maria: q('.ln-maria', svg),
      gaze: q('.ln-gaze', svg), gazeD: q('.ln-gaze-d', svg), wins: qa('.ln-win', svg), cards: qa('.ln-card', svg),
      bubS: q('.ln-bubble-s', svg), bubM: q('.ln-bubble-m', svg),
      capK: q('.ln-cap-k'), capH: q('.ln-cap-h'), capP: q('.ln-cap-p'), cap: q('.ln-cap'),
      vA: q('.ln-v-a'), vB: q('.ln-v-b'), sA: q('.ln-split-a'), sB: q('.ln-split-b'), split: q('.ln-split'),
      vT: q('.ln-v-t'), vD: q('.ln-v-d'),
      callout: q('.ln-callout', svg), lakeT: q('.ln-lake-t', svg), lcols: { today: q('.ln-cols-today'), idea: q('.ln-cols-idea') },
      steps: qa('.ln-step'), modes: qa('.ln-switch-b'),
      play: q('[data-act="play"]'), prev: q('[data-act="prev"]'), next: q('[data-act="next"]')
    };
    var P = {
      sam: { el: R.sam, flip: q('.ln-flip', R.sam), x: 820, face: 1, shown: true },
      maria: { el: R.maria, flip: q('.ln-flip', R.maria), x: DOOR, face: 1, shown: false }
    };
    var car = { x: -600 };
    var cardOn = CARDS.map(function () { return false; });
    var winOn = WINS.map(function () { return false; });

    function later(fn, ms) { timers.push(setTimeout(fn, ms)); }
    function clearLater() { timers.forEach(clearTimeout); timers = []; }

    /* ---------- people ---------- */
    function placeP(p, instant, dur, delay) {
      p.el.style.transition = instant ? 'none' :
        'transform ' + dur + 's cubic-bezier(.45,.05,.55,.95) ' + delay + 's, opacity .45s linear ' + delay + 's';
      p.el.style.transform = 'translate(' + p.x + 'px,' + FLOOR + 'px)';
      p.el.style.opacity = p.shown ? '1' : '0';
      p.flip.style.transform = 'scaleX(' + p.face + ')';
    }
    /* walk to x; returns the time (s) the walk ends */
    function walk(p, x, delay, endFace, fixedDur) {
      var dist = Math.abs(x - p.x);
      if (dist < 1 || still()) {
        p.x = x; if (endFace) p.face = endFace; placeP(p, true); return delay;
      }
      var dur = fixedDur || clamp(dist / 240, 0.6, 2.2);
      p.face = x < p.x ? -1 : 1;
      p.x = x;
      placeP(p, false, dur, delay);
      later(function () { p.el.classList.add('ln-walk'); }, delay * 1000);
      later(function () {
        p.el.classList.remove('ln-walk');
        if (endFace && endFace !== p.face) { p.face = endFace; p.flip.style.transform = 'scaleX(' + p.face + ')'; }
      }, (delay + dur) * 1000);
      return delay + dur;
    }

    /* ---------- car ---------- */
    function placeCar(x, instant, dur, delay, curve) {
      R.car.style.transition = instant ? 'none' : 'transform ' + dur + 's ' + curve + ' ' + delay + 's';
      R.car.style.transform = 'translate(' + x + 'px,' + LANE + 'px)';
      car.x = x;
      if (!instant) {
        later(function () { R.car.classList.add('ln-drive'); }, delay * 1000);
        later(function () { R.car.classList.remove('ln-drive'); }, (delay + dur) * 1000);
      }
    }
    function carTo(target) {
      if (target === 'park' && car.x !== CAR_PARK) {
        if (still() || !st.visible) { placeCar(CAR_PARK, true); return 0; }
        placeCar(-600, true);
        void R.car.getBoundingClientRect();
        placeCar(CAR_PARK, false, 1.6, 0, 'cubic-bezier(.2,.65,.3,1)');
        return 1.6;
      }
      if (target === 'out' && car.x === CAR_PARK) {
        if (still()) { placeCar(1400, true); return 0; }
        placeCar(1400, false, 1.4, 1.3, 'cubic-bezier(.55,0,.8,.45)');
      }
      return 0;
    }

    /* ---------- cards: glide on a curve from the lake ---------- */
    function onPhone() { return !!(phone && phone.matches); }
    function slot(i) {
      if (onPhone()) return { x: 700 + (i % 2) * 140, y: 244 + Math.floor(i / 2) * 44 };
      return { x: 690 + (i % 3) * 136, y: 254 + Math.floor(i / 3) * 48 };
    }
    function setCard(el, x, y, s, o) {
      el.setAttribute('transform', 'translate(' + x.toFixed(1) + ' ' + y.toFixed(1) + ') scale(' + s.toFixed(3) + ')');
      el.style.opacity = o.toFixed(3);
    }
    function glide(i, inbound, delay) {
      var el = R.cards[i], b = slot(i), a = { x: LAKE.x - 30, y: LAKE.y - 8 };
      var p0 = inbound ? a : b, p2 = inbound ? b : a;
      var c = { x: (a.x + b.x) / 2 + 60, y: Math.min(a.y, b.y) - 70 };
      cancelAnimationFrame(frames[i]);
      if (still()) { setCard(el, b.x, b.y, 1, inbound ? 1 : 0); if (!inbound) setCard(el, a.x, a.y, 0.3, 0); return; }
      var dur = 1000, t0 = null;
      function f(ts) {
        if (t0 == null) t0 = ts + delay * 1000;
        var raw = clamp((ts - t0) / dur, 0, 1), t = ease(raw), u = 1 - t;
        var x = u * u * p0.x + 2 * u * t * c.x + t * t * p2.x;
        var y = u * u * p0.y + 2 * u * t * c.y + t * t * p2.y;
        var s = inbound ? 0.3 + 0.7 * t : 1 - 0.7 * t;
        var o = inbound ? clamp(raw * 5, 0, 1) * (ts < t0 ? 0 : 1) : 1 - clamp((raw - 0.6) / 0.4, 0, 1);
        setCard(el, x, y, s, o);
        if (raw < 1) frames[i] = requestAnimationFrame(f);
      }
      if (inbound) setCard(el, a.x, a.y, 0.3, 0);
      frames[i] = requestAnimationFrame(f);
    }

    /* ---------- bubbles ---------- */
    function bubble(g, text, anchor, dir, maxRight, raise) {
      if (!text) { g.classList.remove('ln-on'); return; }
      var typing = text === 'typing';
      var t = q('text', g), r = q('rect', g), p = q('path', g);
      t.textContent = typing ? 'typing' : text;
      var fs = 19;
      try { fs = parseFloat(getComputedStyle(t).fontSize) || 19; } catch (e) { fs = 19; }
      var hg = Math.round(fs * 2.1), y = 236 - hg - (raise ? hg + 10 : 0), pad = fs * 2.1;
      var lo = onPhone() ? PH.left : 8, hi = onPhone() ? PH.right : 1112;
      var w = 0;
      try { w = t.getComputedTextLength(); } catch (e2) { w = 0; }
      if (!w) w = t.textContent.length * fs * 0.55;
      w = Math.round(w + (typing ? pad + fs * 1.6 : pad));
      var x1 = dir === 'left' ? anchor + 24 - w : anchor - 24;
      x1 = clamp(x1, lo, hi - w);
      if (maxRight != null) x1 = Math.max(lo, Math.min(x1, maxRight - w));
      var tail = clamp(anchor, x1 + 20, x1 + w - 20);
      r.setAttribute('x', x1); r.setAttribute('y', y); r.setAttribute('width', w);
      r.setAttribute('height', hg); r.setAttribute('rx', hg / 2);
      p.setAttribute('d', 'M' + (tail - 8) + ' ' + (y + hg - 2) + 'L' + tail + ' ' + (y + hg + 11) + 'L' + (tail + 8) + ' ' + (y + hg - 2) + 'Z');
      t.setAttribute('x', typing ? x1 + (w - fs * 1.6) / 2 : x1 + w / 2);
      t.setAttribute('y', y + hg / 2 + fs * 0.36);
      var dots = q('.ln-dots', g);
      if (dots) {
        dots.style.display = typing ? '' : 'none';
        qa('circle', dots).forEach(function (c, i) {
          c.setAttribute('cx', x1 + w - fs * 2 + i * fs * 0.5); c.setAttribute('cy', y + hg / 2); c.setAttribute('r', fs * 0.16);
        });
      }
      g.classList.add('ln-on');
      return x1;
    }

    function setGaze(sc) {
      var sam = P.sam, sx = sam.x + 16 * sam.face, sy = FLOOR - 107, tx, ty;
      if (sc.gaze === 'screen') { tx = 922; ty = 284; }
      else if (sc.gaze === 'tablet') { tx = sam.x + 31 * sam.face; ty = FLOOR - 70; }
      else { tx = P.maria.x + 16; ty = FLOOR - 107; }
      R.gaze.setAttribute('x1', sx); R.gaze.setAttribute('y1', sy);
      R.gaze.setAttribute('x2', tx); R.gaze.setAttribute('y2', ty);
      R.gazeD.setAttribute('cx', tx); R.gazeD.setAttribute('cy', ty);
    }

    /* ---------- scene ---------- */
    function renderScene() {
      var sc = scene(st.mode, st.step), pc = prevScene;
      var first = !pc;
      clearLater();
      root.classList.toggle('ln-scan-on', sc.scan);
      root.classList.toggle('ln-meet-on', false);
      root.classList.add('ln-gaze-off');
      R.bubS.classList.remove('ln-on'); R.bubM.classList.remove('ln-on');

      var settle = 0;
      var carEnd = carTo(sc.car);

      /* Sam */
      settle = Math.max(settle, walk(P.sam, sc.samX, first ? 0 : 0.15, sc.samFace));
      if (first || still()) { P.sam.face = sc.samFace; placeP(P.sam, true); }

      /* Maria */
      var m = P.maria;
      if (sc.maria == null) {
        m.shown = false; m.x = DOOR; m.face = 1; placeP(m, true);
      } else if (sc.maria === 'exit') {
        if (m.shown) { walk(m, -120, still() ? 0 : 0.6, null, 1.6); }
      } else {
        var d = sc.idea && st.step === 1 ? 1.5 : (carEnd ? carEnd : 0.2);
        if (!m.shown) {
          m.x = DOOR; m.face = 1; m.shown = false; placeP(m, true);
          void m.el.getBoundingClientRect();
          m.shown = true;
          settle = Math.max(settle, walk(m, sc.maria, d, 1));
          if (still()) placeP(m, true);
        } else {
          settle = Math.max(settle, walk(m, sc.maria, 0.15, 1));
        }
      }

      /* windows */
      var k = 0;
      R.wins.forEach(function (el, i) {
        var on = i < sc.wins, w = WINS[i];
        el.style.transitionDelay = (on && !winOn[i] ? (k++) * 0.16 : 0) + 's';
        el.style.transform = on ? 'translate(' + w[0] + 'px,' + w[1] + 'px) rotate(' + w[2] + 'deg)' :
          'translate(' + MON.x + 'px,' + MON.y + 'px) scale(.12)';
        el.style.opacity = on ? '1' : '0';
        el.classList.toggle('ln-top', on && i === sc.wins - 1 && sc.samB === 'typing');
        winOn[i] = on;
      });

      /* cards */
      var kIn = 0, kOut = 0;
      CARDS.forEach(function (c, i) {
        var on = sc.idea && st.step >= c[1];
        var el = R.cards[i];
        el.classList.toggle('ln-decided', sc.idea && st.step >= c[2]);
        el.classList.toggle('ln-pulse', sc.idea && st.step === c[2] && !first);
        if (on && !cardOn[i]) {
          var base = st.step === 0 ? 1.3 : 0.2;
          glide(i, true, base + (kIn++) * 0.16);
        } else if (!on && cardOn[i]) {
          glide(i, false, (kOut++) * 0.08);
        } else if (!on && first) {
          setCard(el, LAKE.x - 30, LAKE.y - 8, 0.3, 0);
        }
        cardOn[i] = on;
      });

      /* bubbles, gaze and meeting glow after people settle */
      var wait = still() ? 0 : Math.max(settle, sc.car === 'park' && carEnd ? carEnd : 0) * 1000 + 120;
      later(function () {
        setGaze(sc);
        root.classList.remove('ln-gaze-off');
        root.classList.toggle('ln-meet-on', sc.meet);
        if (sc.idea) {
          bubble(R.bubS, sc.samB, P.sam.x, 'right');
          bubble(R.bubM, sc.mariaB, P.maria.x, 'left');
        } else {
          var sx = bubble(R.bubS, sc.samB, P.sam.x, 'left');
          /* phone frame is narrow: if her bubble would overlap his, lift hers above */
          var mw = sc.mariaB ? bubble(R.bubM, sc.mariaB, P.maria.x, 'left', sc.samB ? sx - 10 : null) : null;
          if (mw != null && sc.samB && onPhone() && +q('rect', R.bubM).getAttribute('x') + +q('rect', R.bubM).getAttribute('width') > sx - 4) {
            bubble(R.bubM, sc.mariaB, P.maria.x, 'left', null, true);
          }
        }
      }, wait);
      prevScene = sc;
    }

    /* ---------- text + meters ---------- */
    var tweenF = {};
    function tween(el, key, to, suffix) {
      var from = parseFloat(el.getAttribute('data-v') || '0');
      el.setAttribute('data-v', to);
      cancelAnimationFrame(tweenF[key]);
      if (still() || from === to) { el.textContent = to + suffix; return; }
      var t0 = null;
      function f(ts) {
        if (t0 == null) t0 = ts;
        var p = Math.min(1, (ts - t0) / 700);
        el.textContent = Math.round(from + (to - from) * ease(p)) + suffix;
        if (p < 1) tweenF[key] = requestAnimationFrame(f);
      }
      tweenF[key] = requestAnimationFrame(f);
    }

    function render(announce) {
      var s = st.step, story = STORY[st.mode][s];
      root.setAttribute('data-mode', st.mode);
      root.setAttribute('data-step', s);
      root.style.setProperty('--ln-p', s / (N - 1));
      R.modes.forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-mode') === st.mode ? 'true' : 'false'); });
      R.steps.forEach(function (b, i) {
        if (i === s) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current');
        b.classList.toggle('ln-done', i < s);
      });

      R.capK.textContent = MODE_NAME[st.mode] + ' · ' + STEPS[s][0];
      R.capH.textContent = story[0];
      R.capP.textContent = story[1];
      R.desc.textContent = MODE_NAME[st.mode] + ': ' + story[0] + ' ' + story[1];
      R.cap.classList.remove('ln-in'); void R.cap.offsetWidth; R.cap.classList.add('ln-in');

      var a = EYES[st.mode][s];
      R.sA.style.width = a + '%'; R.sB.style.width = (100 - a) + '%';
      tween(R.vA, 'a', a, '%'); tween(R.vB, 'b', 100 - a, '%');
      R.split.setAttribute('aria-label', 'Eyes on the screen ' + a + ' percent, on Maria ' + (100 - a) + ' percent');
      tween(R.vT, 't', TYPED[st.mode][s], ''); tween(R.vD, 'd', DECIDED[st.mode][s], '');

      if (s === N - 1 && !st.ledger[st.mode]) {
        st.ledger[st.mode] = true;
        R.lcols[st.mode].classList.add('ln-shown', 'ln-in');
      }
      ledger.classList.toggle('ln-ready', st.ledger[st.mode]);
      R.lcols.today.setAttribute('aria-hidden', st.mode === 'today' && st.ledger.today ? 'false' : 'true');
      R.lcols.idea.setAttribute('aria-hidden', st.mode === 'idea' && st.ledger.idea ? 'false' : 'true');

      renderScene();

      if (announce) {
        live.textContent = MODE_NAME[st.mode] + '. Moment ' + (s + 1) + ' of ' + N + ', ' + STEPS[s][1] + '. ' +
          story[0] + ' ' + story[1] + ' Eyes on the screen ' + a + ' percent.';
      }
    }

    /* ---------- control ---------- */
    function go(mode, step, announce) {
      st.mode = mode; st.step = clamp(step, 0, N - 1);
      render(announce);
    }
    function next(announce) {
      if (st.step < N - 1) go(st.mode, st.step + 1, announce);
      else go(st.mode === 'today' ? 'idea' : 'today', 0, announce);
    }
    function back() {
      if (st.step > 0) go(st.mode, st.step - 1, true);
      else go(st.mode === 'today' ? 'idea' : 'today', N - 1, true);
    }
    function setPlay(on) {
      st.playing = on;
      clearInterval(timer); timer = null;
      R.play.setAttribute('aria-pressed', on ? 'true' : 'false');
      R.play.setAttribute('aria-label', on ? 'Pause the story' : 'Play the story');
      R.play.innerHTML = (on ? ICON.pause : ICON.play) + '<span>' + (on ? 'Pause' : 'Play') + '</span>';
      if (on && st.visible && !document.hidden) timer = setInterval(function () { next(false); }, STEP_MS);
    }
    function stopByUser() { st.userStopped = true; setPlay(false); }

    R.play.addEventListener('click', function () {
      if (st.playing) { stopByUser(); return; }
      st.userStopped = false;
      setPlay(true);
      next(false);
    });
    R.next.addEventListener('click', function () { stopByUser(); next(true); });
    R.prev.addEventListener('click', function () { stopByUser(); back(); });
    R.steps.forEach(function (b) {
      b.addEventListener('click', function () { stopByUser(); go(st.mode, +b.getAttribute('data-step'), true); });
    });
    R.modes.forEach(function (b) {
      b.addEventListener('click', function () {
        stopByUser();
        var m = b.getAttribute('data-mode');
        if (m !== st.mode) go(m, st.step, true);
      });
    });
    root.addEventListener('keydown', function (e) {
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      var k = e.key, t = e.target;
      if (k !== 'ArrowRight' && k !== 'ArrowLeft' && k !== 'Home' && k !== 'End') return;
      e.preventDefault();
      stopByUser();
      if (k === 'ArrowRight') next(true);
      else if (k === 'ArrowLeft') back();
      else go(st.mode, k === 'Home' ? 0 : N - 1, true);
      if (t && t.classList && t.classList.contains('ln-step')) R.steps[st.step].focus();
    });

    /* phone gets its own framing of the same scene */
    function frame() {
      svg.setAttribute('viewBox', onPhone() ? PH.vb : VB_WIDE);
      /* keep the "Checked in" chip inside the phone frame */
      if (onPhone()) R.callout.setAttribute('transform', 'translate(14 0)'); else R.callout.removeAttribute('transform');
      R.lakeT.setAttribute('x', onPhone() ? PH.lakeX : LAKE.x);
    }
    frame();
    if (phone && phone.addEventListener) phone.addEventListener('change', function () {
      frame();
      cardOn = CARDS.map(function () { return false; });
      prevScene = null;
      render(false);
    });

    /* auto-play when on screen; stop off-screen, when hidden, or when the visitor takes over */
    function onVisible(v) {
      var was = st.visible;
      st.visible = v;
      if (v && !st.started) {
        st.started = true;
        if (st.userStopped) return;
        prevScene = null;
        placeCar(-600, true);
        render(false);
        if (!still()) setPlay(true);
        return;
      }
      if (!v) { clearInterval(timer); timer = null; }
      else if (!was && st.playing) setPlay(true);
    }
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (en) { onVisible(en[0].isIntersecting); }, { threshold: 0.35 }).observe(scn);
    } else { onVisible(true); }
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) { clearInterval(timer); timer = null; }
      else if (st.visible && st.playing) setPlay(true);
    });
    if (reduce && reduce.addEventListener) reduce.addEventListener('change', function () { if (still()) stopByUser(); });

    setPlay(false);
    placeCar(-600, true);
    render(false);
  }

  function boot() {
    var m = document.getElementById('lane-story');
    if (m) init(m);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
