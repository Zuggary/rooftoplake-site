/* RooftopLake living lake scene. One IIFE, no globals, no libraries.
   Mount: <div id="lake-scene" aria-hidden="true"></div> as first child of body. Pairs with css/scene.css.
   Visual language, top to bottom: braided streams of dots leave every dealership, meet the water with small
   ripple rings, and the same dots sink through three layers (copy, clean and match, one agreed definition),
   getting calmer and more ordered, down to the lake bed.
   Host hooks: --depth (0..1) and --under (0..1) on <html>, class is-under on <html>,
   optional data-strata="0.38,0.52,0.66" on the mount (page progress of the three layer tops).
   Debug: add ?lkdebug to the URL to get data-lk-ms / data-lk-tier on the mount and a readable drawing buffer. */
(function () {
  'use strict';
  var doc = document, root = doc.documentElement, mount = doc.getElementById('lake-scene');
  if (!mount) return;
  var mq = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  var still = !!mq.matches;
  var DEBUG = /[?&]lkdebug/.test(location.search);
  var H0 = 0.39, STRIP = 0.24, BANK = 0.14, BK = STRIP * BANK, NR = 14, PI = Math.PI;

  function clamp(x, a, b) { return x < a ? a : x > b ? b : x; }
  function ss(a, b, x) { x = clamp((x - a) / (b - a), 0, 1); return x * x * (3 - 2 * x); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function hh(a, b) { var x = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return x - Math.floor(x); }

  /* ---------- state ---------- */
  var vw = 1, vh = 1, range = 1, K = 2, sY = 0, s = 0, p = 0, wl = -1, yh = H0, cam = 1, bed = 0, narrow = false;
  var scrollDirty = true, lastAct = 0, cssDepth = -1, cssUnder = -1, isUnder = null;
  var strata = [0.38, 0.52, 0.66];
  (function () {
    var a = (mount.getAttribute('data-strata') || '').split(',').map(parseFloat);
    if (a.length === 3 && a.every(function (v) { return v > 0 && v < 1; })) strata = a;
  })();
  var roofs = [], lands = [];
  // deep-water variety: section anchors (px and page progress), glow pool x/y/strength, shaft strength
  var secEls = [], secA = [], secW = [], gX = 0.5, gY = 0.5, gS = 0, gF = 0;
  function poolX(i) { return narrow ? 0.5 : (i & 1 ? 0.7 : 0.34); }
  var LD = [0.19, 0.12, 0.25, 0.14, 0.205];

  /* ---------- depth gauge (DOM) ---------- */
  var gauge = null, gLinks = [], gTops = [], gMark = null, gRead = null, gH = 0, gCur = -1, gMeters = -1;
  function buildGauge() {
    var secs = doc.querySelectorAll('[data-depth-label][id]');
    if (secs.length < 2 || !doc.body) return;
    gauge = doc.createElement('nav'); gauge.className = 'lk-gauge'; gauge.setAttribute('aria-label', 'Page depth');
    var ol = doc.createElement('ol');
    for (var i = 0; i < secs.length; i++) {
      var li = doc.createElement('li'), a = doc.createElement('a'), sp = doc.createElement('span');
      var label = secs[i].getAttribute('data-depth-label');
      li.style.top = (i / (secs.length - 1) * 100) + '%';
      a.href = '#' + secs[i].id; a.setAttribute('aria-label', 'Jump to ' + label);
      sp.className = 'lk-lab'; sp.textContent = label;
      a.appendChild(sp); li.appendChild(a); ol.appendChild(li);
      gLinks.push({ a: a, el: secs[i] });
    }
    gMark = doc.createElement('div'); gMark.className = 'lk-mark'; gMark.setAttribute('aria-hidden', 'true');
    gRead = doc.createElement('div'); gRead.className = 'lk-read'; gRead.setAttribute('aria-hidden', 'true');
    gauge.appendChild(ol); gauge.appendChild(gMark); gauge.appendChild(gRead);
    doc.body.appendChild(gauge);
  }
  function updateGauge() {
    if (!gauge || !gH) return;
    var n = gTops.length, probe = sY + vh * (0.2 + 0.5 * p), cur = 0, f = 0, i;
    for (i = 0; i < n; i++) if (gTops[i] <= probe) cur = i;
    if (cur >= n - 1) f = n - 1;
    else f = cur + clamp((probe - gTops[cur]) / Math.max(1, gTops[cur + 1] - gTops[cur]), 0, 1);
    gMark.style.transform = 'translateY(' + (f / (n - 1) * gH).toFixed(1) + 'px)';
    if (cur !== gCur) {
      if (gCur >= 0) { gLinks[gCur].a.classList.remove('is-current'); gLinks[gCur].a.removeAttribute('aria-current'); }
      gLinks[cur].a.classList.add('is-current'); gLinks[cur].a.setAttribute('aria-current', 'true'); gCur = cur;
    }
    var m = Math.round(clamp(wl, 0, 1) * 2 + Math.max(0, s - 0.92) / Math.max(0.01, range / vh - 0.92) * 38);
    if (m !== gMeters) { gMeters = m; gRead.textContent = (m ? '−' : '') + m + ' m'; }
  }

  /* ---------- measuring (never in the frame loop) ---------- */
  var coarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
  function measure(force) {
    var w = window.innerWidth, h = window.innerHeight;
    // phones: ignore the small height changes from the URL bar showing and hiding
    if (!force && coarse && w === vw && Math.abs(h - vh) < 150) h = vh;
    var changed = w !== vw || h !== vh;
    vw = w; vh = h; narrow = vw / vh < 0.85;
    range = Math.max(1, root.scrollHeight - vh);
    K = Math.max(1.5, range / vh * 0.5);
    var y0 = window.pageYOffset || 0, i;
    if (gauge) {
      gH = gauge.clientHeight;
      for (i = 0; i < gLinks.length; i++) gTops[i] = gLinks[i].el.getBoundingClientRect().top + y0;
    }
    secA.length = secW.length = 0;
    for (i = 0; i < secEls.length; i++) {
      secA[i] = secEls[i].getBoundingClientRect().top + y0 + vh * 0.16;
      secW[i] = (secA[i] - vh * 0.5) / range;
    }
    scrollDirty = true;
    return changed;
  }
  function readScroll() {
    scrollDirty = false;
    sY = window.pageYOffset || 0; s = sY / vh; p = clamp(sY / range, 0, 1);
    wl = (s - 0.12) * 1.25; yh = H0 + s * 0.3; cam = 1 - 0.8 * ss(0, 0.6, s); bed = ss(0.8, 1, p);
    var d = Math.round(p * 1000) / 1000, u = Math.round(clamp(wl / 1.04, 0, 1) * 100) / 100;
    if (d !== cssDepth) { cssDepth = d; root.style.setProperty('--depth', d); }
    if (u !== cssUnder) { cssUnder = u; root.style.setProperty('--under', u); }
    var under = wl >= 0.97;
    if (under !== isUnder) { isUnder = under; root.classList.toggle('is-under', under); }
    // a glow pool swells as each section passes the centre; light shafts return between sections
    var cy = sY + vh * 0.5, bd = 9, bi = 0, sf = 0, i, dd, deep = ss(1.05, 1.6, wl) * (1 - bed);
    for (i = 1; i < secA.length; i++) {
      dd = (secA[i] - cy) / vh;
      if (Math.abs(dd) < Math.abs(bd)) { bd = dd; bi = i; }
      if (i < secA.length - 1 && cy >= secA[i] && cy < secA[i + 1]) sf = Math.sin(PI * (cy - secA[i]) / (secA[i + 1] - secA[i]));
    }
    gS = (1 - ss(0.04, 0.62, Math.abs(bd))) * deep; gY = 0.5 - bd; gX = poolX(bi);
    gF = sf * sf * deep * 0.4 * (1 - 0.5 * p);
    updateGauge();
  }

  /* ---------- dealership skyline, drawn once per size to a 2D canvas, used as a texture ---------- */
  function skyline(W, H) {
    var c = doc.createElement('canvas'); c.width = W; c.height = H;
    var g = c.getContext('2d'), U = Math.min(H * 0.9, W * (narrow ? 0.23 : 0.17)), gy = Math.round(H * (1 - BANK)), px = Math.max(1, U / 105);
    var INK = '#02080c', i;
    roofs.length = 0;
    // x centre, showroom width, height, type, side the pylon stands on, pylon height, sign colour
    var B = narrow ? [
      [0.105, 0.15, 0.34, 0, 1, 0.70, '#F6C777'], [0.305, 0.135, 0.28, 1, 1, 0.56, '#9BE9E2'], [0.52, 0.185, 0.43, 2, 1, 0.86, '#F6C777'],
      [0.725, 0.135, 0.30, 1, -1, 0.60, '#FFE2B0'], [0.905, 0.15, 0.36, 0, -1, 0.74, '#9BE9E2']
    ] : [
      [0.092, 0.128, 0.40, 0, 1, 0.68, '#F6C777'], [0.288, 0.106, 0.32, 1, 1, 0.56, '#9BE9E2'], [0.497, 0.162, 0.52, 2, 1, 0.86, '#F6C777'],
      [0.712, 0.112, 0.355, 1, -1, 0.60, '#FFE2B0'], [0.908, 0.134, 0.43, 0, -1, 0.72, '#9BE9E2']
    ];
    function car(x, y, w, a) {
      var h = w * 0.37;
      g.globalAlpha = a; g.fillStyle = INK; g.beginPath();
      g.moveTo(x, y); g.lineTo(x, y - h * 0.42);
      g.quadraticCurveTo(x + w * 0.03, y - h * 0.6, x + w * 0.2, y - h * 0.63);
      g.quadraticCurveTo(x + w * 0.31, y - h, x + w * 0.5, y - h);
      g.quadraticCurveTo(x + w * 0.69, y - h, x + w * 0.8, y - h * 0.62);
      g.quadraticCurveTo(x + w * 0.98, y - h * 0.56, x + w, y - h * 0.34);
      g.lineTo(x + w, y); g.closePath(); g.fill(); g.globalAlpha = 1;
    }
    function glass(x, y, w, h) {
      var lg = g.createLinearGradient(0, y, 0, y + h);
      lg.addColorStop(0, '#B56B2C'); lg.addColorStop(0.42, '#F2B65C'); lg.addColorStop(1, '#FFE9B8');
      g.fillStyle = lg; g.fillRect(x, y, w, h);
      g.fillStyle = 'rgba(255,246,222,.95)';
      var n = Math.max(3, Math.round(w / (U * 0.17)));
      for (i = 0; i < n; i++) g.fillRect(x + w * (i + 0.5) / n - px, y + h * 0.13, px * 2, px);
      // cars on the showroom floor, seen through the glass
      var cw = Math.min(U * 0.3, w * 0.36);
      car(x + w * 0.1, y + h, cw, 0.9);
      if (w > U * 0.95) car(x + w * 0.9 - cw, y + h, cw, 0.9);
      g.fillStyle = INK;
      for (i = 1; i < n; i++) g.fillRect(Math.round(x + w * i / n), y, px, h);
      g.globalAlpha = 0.5; g.fillRect(x, y + h * 0.36, w, px); g.globalAlpha = 1;
    }
    function glow(x, y, r, col0, col1, sy) {
      g.save(); g.translate(x, y); g.scale(1, sy || 1);
      var rg = g.createRadialGradient(0, 0, 0, 0, 0, r);
      rg.addColorStop(0, col0); rg.addColorStop(1, col1);
      g.fillStyle = rg; g.beginPath(); g.arc(0, 0, r, 0, PI * 2); g.fill(); g.restore();
    }
    // warm haze behind each store and over each lot
    B.forEach(function (b) {
      var cx = b[0] * W, bw = b[1] * W, bh = U * b[2];
      glow(cx, gy - bh * 0.3, Math.min(bw * 0.95, gy / 0.6), 'rgba(246,172,80,.40)', 'rgba(232,120,60,0)', 0.58);
      glow(cx - b[4] * (bw / 2 + U * 0.3), gy, U * 0.42, 'rgba(250,200,130,.34)', 'rgba(240,160,90,0)', 0.5);
    });
    B.forEach(function (b, bi) {
      var cx = b[0] * W, bw = b[1] * W, bh = U * b[2], t = b[3], dir = b[4];
      var x0 = cx - bw / 2, rh = Math.max(2 * px, bh * 0.12), ov = bw * 0.08, top = gy - bh, gx = x0, gw = bw;
      if (t === 0) { // showroom with a solid service wing and a lit name band
        var ww = bw * 0.24, wx = dir > 0 ? x0 : x0 + bw - ww;
        gx = dir > 0 ? x0 + ww : x0; gw = bw - ww;
        glass(gx, top + rh, gw, bh - rh);
        g.fillStyle = INK; g.fillRect(wx, top - bh * 0.14, ww, bh * 1.14);
        g.fillStyle = 'rgba(214,246,240,.92)'; g.fillRect(wx + ww * 0.2, top + bh * 0.1, ww * 0.6, Math.max(px * 1.5, bh * 0.07));
        g.fillStyle = INK; g.fillRect(dir > 0 ? gx : gx - ov * 1.6, top, gw + ov * 1.6, rh);
      } else if (t === 1) { // long glass box under one deep cantilever
        glass(gx, top + rh, gw, bh - rh);
        g.fillStyle = INK; g.fillRect(x0 - ov * (dir > 0 ? 0.6 : 2.2), top, bw + ov * 2.8, rh);
        g.fillRect(cx - bw * 0.16, top - bh * 0.13, bw * 0.32, bh * 0.14);
        g.fillStyle = 'rgba(255,226,170,.85)'; g.fillRect(cx - bw * 0.12, top - bh * 0.07, bw * 0.24, px);
      } else { // flagship: double-height glass, entrance portal and a blade
        glass(gx, top + rh, gw, bh - rh);
        g.fillStyle = INK; g.fillRect(x0 - ov * 1.5, top, bw + ov * 3, rh);
        var pw = bw * 0.2, ph = bh * 1.2;
        g.fillRect(cx - pw / 2, gy - ph, pw, ph);
        var lg = g.createLinearGradient(0, gy - ph, 0, gy);
        lg.addColorStop(0, '#F2B65C'); lg.addColorStop(1, '#FFF0CC');
        g.fillStyle = lg; g.fillRect(cx - pw * 0.3, gy - ph * 0.66, pw * 0.6, ph * 0.66);
        g.fillStyle = INK; g.fillRect(cx - px / 2, gy - ph * 0.66, px, ph * 0.66);
        g.fillStyle = 'rgba(214,246,240,.92)'; g.fillRect(cx - pw * 0.3, gy - ph * 0.9, pw * 0.6, Math.max(px * 1.5, ph * 0.06));
      }
      // soffit light under the roof, plinth
      g.fillStyle = 'rgba(255,224,168,.9)'; g.fillRect(gx, top + rh, gw, px);
      g.fillStyle = INK; g.fillRect(x0 - px, gy - px * 1.5, bw + px * 2, px * 1.5);
      // pylon sign
      var pxm = cx + dir * (bw / 2 + ov + U * 0.17), phh = U * b[5], sw = U * 0.21, sh = U * 0.17;
      g.fillStyle = INK; g.fillRect(pxm - px * 1.4, gy - phh, px * 2.8, phh);
      g.fillRect(pxm - sw / 2 - px, gy - phh - px, sw + px * 2, sh + px * 2);
      glow(pxm, gy - phh + sh / 2, sw * 1.5, b[6] === '#9BE9E2' ? 'rgba(120,225,216,.34)' : 'rgba(250,196,110,.36)', 'rgba(0,0,0,0)');
      g.fillStyle = b[6]; g.fillRect(pxm - sw / 2, gy - phh, sw, sh);
      // an abstract mark on each sign: ring, chevron, diamond, bar, ring and dot
      var my = gy - phh + sh / 2, mr = sh * 0.27, lw = Math.max(1.5, mr * 0.42);
      g.fillStyle = g.strokeStyle = 'rgba(2,8,12,.8)'; g.lineWidth = lw; g.lineJoin = 'miter'; g.beginPath();
      if (bi === 0 || bi === 4) { g.arc(pxm, my, mr, 0, PI * 2); g.stroke(); if (bi) { g.beginPath(); g.arc(pxm, my, lw * 0.6, 0, PI * 2); g.fill(); } }
      else if (bi === 1) { g.moveTo(pxm - mr * 1.25, my + mr * 0.6); g.lineTo(pxm, my - mr * 0.65); g.lineTo(pxm + mr * 1.25, my + mr * 0.6); g.stroke(); }
      else if (bi === 2) { g.moveTo(pxm, my - mr * 1.15); g.lineTo(pxm + mr * 1.15, my); g.lineTo(pxm, my + mr * 1.15); g.lineTo(pxm - mr * 1.15, my); g.fill(); }
      else g.fillRect(pxm - mr * 1.4, my - lw * 0.7, mr * 2.8, lw * 1.4);
      // the lot: a light pole and a short row of parked cars
      var lx = cx - dir * (bw / 2 + U * 0.14), lh = U * 0.36, cw = U * 0.25, nc = narrow ? 1 : 2;
      for (i = 0; i < nc; i++) car(lx - dir * (U * 0.07 + i * cw * 1.14) - (dir > 0 ? cw : 0), gy, cw, 1);
      g.fillStyle = INK; g.fillRect(lx - px / 2, gy - lh, px, lh); g.fillRect(lx - px * 3.5, gy - lh, px * 7, px);
      glow(lx, gy - lh + px, U * 0.09, 'rgba(255,236,196,.95)', 'rgba(255,200,130,0)');
      g.fillStyle = '#FFF6E0'; g.fillRect(lx - px * 2.5, gy - lh + px, px * 5, px);
      // one car pulled up in front of the glass
      car(cx + dir * bw * 0.08 - cw / 2, gy, cw, 1);
      roofs.push({ x: b[0], e: (H - top) / H * STRIP - BK });
    });
    // the shore: a strip of lot seen edge-on, a lit kerb line, then the dark bank face down to the water
    var bk = H - gy, ky = gy + Math.round(bk * 0.4), kh = Math.max(2, Math.round(px * 1.7)), sg = g.createLinearGradient(0, gy, 0, H);
    sg.addColorStop(0, '#16292C'); sg.addColorStop(0.4, '#0C1B20'); sg.addColorStop(0.46, '#030A0E'); sg.addColorStop(1, '#010609');
    g.fillStyle = sg; g.fillRect(0, gy, W, bk);
    g.save(); g.beginPath(); g.rect(0, gy, W, ky - gy); g.clip();
    B.forEach(function (b) {
      glow(b[0] * W, gy, b[1] * W * 0.62, 'rgba(252,200,126,.6)', 'rgba(250,180,110,0)', 0.2);
      glow(b[0] * W - b[4] * (b[1] * W / 2 + U * 0.3), gy, U * 0.4, 'rgba(250,206,140,.3)', 'rgba(250,180,110,0)', 0.3);
    });
    g.restore();
    g.fillStyle = 'rgba(196,230,224,.62)'; g.fillRect(0, ky, W, kh);
    B.forEach(function (b) {
      var x0 = b[0] * W - b[1] * W * 0.85, w = b[1] * W * 1.7, kg = g.createLinearGradient(x0, 0, x0 + w, 0);
      kg.addColorStop(0, 'rgba(255,224,170,0)'); kg.addColorStop(0.5, 'rgba(255,228,178,.95)'); kg.addColorStop(1, 'rgba(255,224,170,0)');
      g.fillStyle = kg; g.fillRect(x0, ky, w, kh);
    });
    lands.length = 0;
    for (i = 0; i < roofs.length; i++) lands.push({ x: 0.5 + (roofs[i].x - 0.5) * (narrow ? 0.7 : 0.66), d: LD[i] });
    return c;
  }

  /* ---------- shaders ---------- */
  var VS = 'attribute vec2 aP;void main(){gl_Position=vec4(aP,0.,1.);}';
  var PVS = 'attribute vec2 aP;attribute float aS;attribute vec4 aC;varying vec4 vC;' +
    'void main(){vC=aC;gl_Position=vec4(aP*2.-1.,0.,1.);gl_PointSize=aS;}';
  var PFS = 'precision mediump float;varying vec4 vC;' +
    'void main(){float d=length(gl_PointCoord-.5);float a=smoothstep(.5,0.,d);gl_FragColor=vec4(vC.rgb*vC.a*(a*a*.5+smoothstep(.24,.12,d)*.8),1.);}';
  function fragSrc(tier) {
    return [
      '#ifdef GL_FRAGMENT_PRECISION_HIGH', 'precision highp float;', '#else', 'precision mediump float;', '#endif',
      '#define WI ' + [4, 6, 9][tier], '#define TAPS ' + [1, 1, 3][tier], '#define NR ' + NR, '#define Q ' + tier,
      'uniform vec2 uR;uniform float uT,uS,uP,uW,uH,uK,uC,uB;uniform vec3 uSt;uniform vec4 uG;uniform vec4 uRp[NR];uniform sampler2D uTx;',
      'const vec2 SUN=vec2(.615,.006);const float STRIP=' + STRIP.toFixed(3) + ',BK=' + BK.toFixed(4) + ';',
      'float hs(vec2 p){vec3 q=fract(vec3(p.xyx)*.1031);q+=dot(q,q.yzx+33.33);return fract((q.x+q.y)*q.z);}',
      'float vn(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);',
      ' return mix(mix(hs(i),hs(i+vec2(1.,0.)),f.x),mix(hs(i+vec2(0.,1.)),hs(i+vec2(1.,1.)),f.x),f.y);}',
      'float fbm(vec2 p){float a=.5,s=0.;for(int i=0;i<3;i++){s+=a*vn(p);p=p*2.03+vec2(17.1,3.7);a*=.5;}return s;}',
      // layered directional waves with drag: returns the slope. ft = world footprint of a pixel (fades what would alias)
      'vec2 wav(vec2 p,float ft){vec2 g=vec2(0.);float f=1.5,w=1.,ph=0.,sp=.85;',
      ' for(int i=0;i<WI;i++){vec2 d=vec2(sin(ph),cos(ph));float x=dot(d,p)*f+uT*sp;',
      '  float dx=exp(sin(x)-1.)*cos(x)*w*clamp(1.6-f*ft,0.,1.);g+=d*dx;p-=d*dx*.14;ph+=2.39996;f*=1.3;sp*=1.07;w*=.84;}',
      ' return g;}',
      'vec3 sky(vec2 q,float asp){float e=max(q.y,0.);float sx=(q.x-SUN.x)*asp;float sd=length(vec2(sx,(e-SUN.y)*1.7));',
      ' vec3 c=mix(vec3(.014,.060,.100),vec3(.050,.200,.255),exp(-e*2.0));',
      ' c=mix(c,vec3(.20,.37,.38),exp(-e*5.5));',
      ' float warm=exp(-e*10.)*(.30+.70*exp(-sx*sx*1.1));',
      ' c=mix(c,vec3(.93,.45,.17),warm*.92);',
      ' c+=vec3(1.,.60,.26)*exp(-sd*6.)*.5+vec3(1.,.86,.62)*exp(-sd*26.)*.55+vec3(1.,.48,.20)*exp(-sd*2.1)*.16;',
      ' float cl=fbm(vec2(q.x*asp*1.25+uT*.004,e*10.)+3.)+.5*(fbm(vec2(q.x*asp*3.1-uT*.003,e*26.)+9.)-.5);',
      ' cl=smoothstep(.40,.66,cl)*exp(-e*2.2)*smoothstep(.0,.05,e);',
      ' c=mix(c,mix(vec3(.030,.090,.125),vec3(.98,.47,.21),exp(-sd*2.3)*.9),cl*.72);',
      ' return c;}',
      // skyline texture; q.y is the height above the shoreline (the foot of the bank), which lies BK under the horizon
      'vec4 bt(vec2 q){if(q.y>=STRIP||q.x<0.||q.x>1.)return vec4(0.);return texture2D(uTx,vec2(q.x,max(q.y,0.)/STRIP));}',
      'vec3 land(vec3 c,vec2 q,float asp,vec4 b){',
      ' float hl=.007+.019*vn(vec2(q.x*asp*2.6+5.,.5))+.006*vn(vec2(q.x*asp*13.,2.5));float sx=(q.x-SUN.x)*asp;',
      ' c=mix(c,vec3(.020,.056,.070)+vec3(.24,.105,.04)*exp(-sx*sx*3.),smoothstep(hl+.0025,hl-.0015,q.y));',
      ' return c*(1.-b.a)+b.rgb;}',
      'vec3 above(vec2 uv,float asp,float yh){float e=uv.y-yh;float xc=uv.x-.5;',
      ' if(e>=-BK){vec2 q=vec2(uv.x,e);vec3 c=sky(q,asp);',
      '  vec2 sg=vec2(uv.x*asp,e)*46.;vec2 id=floor(sg);float r=hs(id);',
      '  if(r>.955){float d=length(fract(sg)-.5-(vec2(hs(id+3.1),hs(id+7.7))-.5)*.7);',
      '   c+=vec3(.75,.88,.95)*smoothstep(.11,0.,d)*(.6+.4*sin(uT*1.3+r*90.))*smoothstep(.12,.36,e)*(r-.955)*26.;}',
      '  return land(c,q,asp,bt(vec2(q.x,e+BK)));}',
      ' float dy=-e;float z=uC/(dy+.002);vec2 P=vec2(xc*asp*z,z);',
      ' vec2 g=wav(P*1.7,z*z/uC/uR.y*1.7)*.115;float rl=0.;',
      ' for(int i=0;i<NR;i++){vec4 r=uRp[i];float age=uT-r.z;if(age>0.&&age<3.6){',
      '  vec2 dv=P-r.xy;float d=length(dv)/r.w;float x=d-age*.95;float env=exp(-x*x*11.)*exp(-age*1.05)*smoothstep(0.,.12,age);',
      '  float cw=cos(x*13.);g+=dv/(d*r.w+.001)*cw*env*.55;rl+=env*max(cw,0.)*max(cw,0.);}}',
      ' vec3 N=normalize(vec3(-g.x,1.,-g.y));vec3 V=normalize(vec3(xc*asp,-dy,1.));',
      ' vec3 R=reflect(V,N);R.y=abs(R.y);float rz=max(R.z,.1);vec2 q=vec2(.5+R.x/rz/asp,R.y/rz);',
      ' vec3 rc=sky(q,asp);q.y-=BK*.45;',
      '#if TAPS>1',
      ' float bl=.006+q.y*.12;vec4 b=(bt(q)*.5+bt(q+vec2(0.,bl))*.25+bt(vec2(q.x,max(q.y-bl,0.)))*.25);',
      '#else',
      ' vec4 b=bt(q);',
      '#endif',
      ' rc=land(rc,vec2(q.x,q.y-BK),asp,b);',
      ' float fr=1.-max(dot(-V,N),0.);fr=mix(.36,1.,fr*fr*fr);',
      ' vec3 c=mix(vec3(.010,.075,.092),rc*.94,fr);',
      ' vec3 L=normalize(vec3((SUN.x-.5)*asp,.045,1.));float sd=max(dot(R,L),0.);',
      ' c+=vec3(1.,.70,.36)*(pow(sd,260.)*1.3+pow(sd,24.)*.10);',
      ' c+=vec3(1.,.80,.52)*rl*.20;',
      ' return c;}',
      'float band(float y,float ys,float pat,float px){float dd=abs(y-ys);return exp(-dd*px*.5)*.2*pat+exp(-dd*46.)*.03;}',
      'vec3 below(vec2 uv,float asp,float D){float xc=uv.x-.5;float a=D*.45;',
      ' vec3 c=mix(vec3(.030,.235,.262),vec3(.016,.100,.128),smoothstep(0.,.8,a));',
      // far below the surface the colour follows page progress: teal mid-water, navy toward the bed, a little lighter overhead
      ' float dp=smoothstep(.7,2.8,a);c=mix(c,mix(vec3(.010,.050,.064),vec3(.005,.020,.046),smoothstep(.3,.95,uP))*(.78+.44*uv.y),dp);',
      ' c*=1.-.28*smoothstep(.2,.62,abs(xc));',
      // the three layers: pale, mid teal, deep teal, each with its own edge
      ' float wv=sin(uv.x*asp*2.4+uT*.13)*.006;float e3=uv.x*asp;',
      ' float y1=.5-(uSt.x-uP)*uK+wv,y2=.5-(uSt.y-uP)*uK-wv*.7,y3=.5-(uSt.z-uP)*uK+wv*.4,y4=y3-(y2-y3)*.9;',
      ' float aa=2./uR.y;',
      ' float b1=smoothstep(y1+aa,y1-aa,uv.y)*smoothstep(y2-aa,y2+aa,uv.y);',
      ' float b2=smoothstep(y2+aa,y2-aa,uv.y)*smoothstep(y3-aa,y3+aa,uv.y);',
      ' float b3=smoothstep(y3+aa,y3-aa,uv.y)*smoothstep(y4-.12,y4+.12,uv.y);',
      ' c=mix(c,vec3(.085,.245,.250),b1*(.34+.5*exp(-(y1-uv.y)*4.5)));c=mix(c,vec3(.034,.165,.180),b2*(.34+.5*exp(-(y2-uv.y)*4.5)));c=mix(c,vec3(.012,.100,.118),b3*(.34+.5*exp(-(y3-uv.y)*4.5)));',
      ' float ed=smoothstep(0.,.06,uv.x)*smoothstep(1.,.94,uv.x);',
      ' c+=vec3(.42,.86,.83)*ed*(band(uv.y,y1,step(.5,fract(e3*46.)),uR.y)+band(uv.y,y2,step(.3,fract(e3*15.)),uR.y)+band(uv.y,y3,1.,uR.y));',
      // light shafts from the surface, strongest near it
      ' vec2 d=vec2((uv.x-SUN.x)*asp-.2,uv.y-1.9);float an=atan(d.x,-d.y);',
      ' float ry=vn(vec2(an*24.+uT*.055,1.))*vn(vec2(an*53.-uT*.04,9.));ry=smoothstep(.1,.55,ry);',
      ' c+=vec3(.26,.74,.70)*ry*exp(-(1.-uv.y)*1.25)*min(.035+uG.w+.965*exp(-a*1.5),1.)*.26;',
      // a soft pool of light beside each section
      ' if(uG.z>0.){vec2 pd=vec2((uv.x-uG.x)*asp*.5,uv.y-uG.y);',
      '  c+=vec3(.082,.240,.235)*exp(-dot(pd,pd)*4.2)*uG.z*(.75+.45*vn(vec2(uv.x*asp*2.4+uT*.03,(uv.y-uG.y)*2.4-uT*.02)));}',
      // the surface seen from below
      ' float ych=.5+max(uS-.9,0.)*.55;float cy=uv.y-ych;',
      ' if(cy>0.){float dc=max(uW-.5,0.)*1.5+.03;float zc=dc/(cy+.006);vec2 P=vec2(xc*asp*zc,zc)*3.4;',
      '  vec2 g=wav(P,zc*zc/dc/uR.y*1.2);',
      '  float rr=length(vec2(xc*asp-.1,.5))/cy+(g.x+g.y)*1.1;float win=smoothstep(3.5,2.1,rr);',
      '  float sp=clamp(.5+g.x*1.5+g.y*.9,0.,1.4);',
      '  vec3 sk=mix(vec3(.10,.44,.47),vec3(.86,.56,.28),smoothstep(-.35,.7,xc*asp)*.6)*(.42+.72*sp*sp);',
      '  vec3 cc=mix(c*(.8+.5*sp)+vec3(.015,.075,.085)*sp,sk,win);',
      '  c=mix(c,cc,exp(-zc*.15)*exp(-max(uW-1.,0.)*1.5)*smoothstep(0.,.03,cy));}',
      '#if Q>0',
      // drifting particulate
      ' for(int i=0;i<2;i++){float sc=i==0?26.:47.;float pr=i==0?.5:.32;',
      '  vec2 gq=vec2(uv.x*asp+uT*.006,uv.y-uP*uK*pr+uT*.011)*sc;vec2 id=floor(gq);float r=hs(id+float(i)*31.);',
      '  float dd=length(fract(gq)-.5-(vec2(hs(id+5.3),hs(id+11.9))-.5)*.7);',
      '  c+=vec3(.45,.78,.76)*smoothstep(.07,0.,dd)*r*r*r*.30;}',
      '#endif',
      // the lake bed
      ' if(uB>0.){float fy=-.14+uB*.30+sin(uv.x*asp*2.+1.)*.012+vn(vec2(uv.x*asp*5.,3.))*.018;',
      '  float gl=exp(-length(vec2(xc*asp*.5,(uv.y-fy)*1.35))*3.1);',
      '  c+=vec3(.28,.78,.76)*gl*.34*uB;',
      '  float ca=fbm(vec2(uv.x*asp*6.+uT*.03,(fy-uv.y)*70./(1.+(fy-uv.y)*14.)));',
      '  vec3 st=vec3(.012,.060,.070)+vec3(.16,.50,.49)*exp(-abs(xc)*asp*2.1)*(.55+.75*ca)*uB*exp(-(fy-uv.y)*5.);',
      '  c=mix(c,st,smoothstep(fy+.004,fy-.004,uv.y));}',
      ' return c;}',
      'void main(){vec2 uv=gl_FragCoord.xy/uR;float asp=uR.x/uR.y;float yh=uH+uS*.3;',
      ' float wl=uW+sin(uv.x*asp*5.+uT*.8)*.006+sin(uv.x*asp*13.-uT*1.1)*.0025;float D=wl-uv.y;vec3 c;',
      ' if(D>0.)c=below(uv,asp,D);else c=above(uv,asp,yh);',
      ' c+=vec3(.50,.88,.86)*exp(-abs(D)*uR.y*.33)*.55;c*=1.-.3*smoothstep(.035,0.,D)*step(0.,D);',
      ' c+=(hs(gl_FragCoord.xy+fract(uT)*61.)-.5)/150.;',
      ' gl_FragColor=vec4(c,1.);}'
    ].join('\n');
  }

  /* ---------- GL ---------- */
  var canvas = null, gl = null, progs = {}, pprog = null, quad = null, pbuf = null, tex = null;
  var tier = 2, cw = 1, ch = 1, pxr = 1, lost = false, texW = 0, texH = 0;
  var MAXP = 2600, pts = new Float32Array(MAXP * 7), np = 0;
  var rp = new Float32Array(NR * 4);
  for (var ri = 0; ri < NR; ri++) rp[ri * 4 + 2] = -99, rp[ri * 4 + 3] = 1;

  function sh(type, src) {
    var o = gl.createShader(type); gl.shaderSource(o, src); gl.compileShader(o);
    if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) {
      if (window.console) console.error('[lake-scene] shader compile failed: ' + gl.getShaderInfoLog(o));
      return null;
    }
    return o;
  }
  function program(vs, fs, attrs) {
    var a = sh(gl.VERTEX_SHADER, vs), b = sh(gl.FRAGMENT_SHADER, fs);
    if (!a || !b) return null;
    var pr = gl.createProgram(); gl.attachShader(pr, a); gl.attachShader(pr, b);
    attrs.forEach(function (n, i) { gl.bindAttribLocation(pr, i, n); });
    gl.linkProgram(pr);
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) {
      if (window.console) console.error('[lake-scene] link failed: ' + gl.getProgramInfoLog(pr));
      return null;
    }
    return pr;
  }
  function mainProg() {
    if (progs[tier]) return progs[tier];
    var pr = program(VS, fragSrc(tier), ['aP']);
    if (!pr) return null;
    var u = {};
    ['uR', 'uT', 'uS', 'uP', 'uW', 'uH', 'uK', 'uC', 'uB', 'uSt', 'uG', 'uRp', 'uTx'].forEach(function (n) { u[n] = gl.getUniformLocation(pr, n === 'uRp' ? 'uRp[0]' : n); });
    return (progs[tier] = { p: pr, u: u });
  }
  function initGL() {
    var o = { alpha: false, antialias: false, depth: false, stencil: false, powerPreference: 'high-performance', preserveDrawingBuffer: DEBUG };
    try { gl = canvas.getContext('webgl', o) || canvas.getContext('experimental-webgl', o); } catch (e) { gl = null; }
    if (!gl) return false;
    progs = {};
    pprog = program(PVS, PFS, ['aP', 'aS', 'aC']);
    if (!pprog || !mainProg()) return false;
    quad = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, quad);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    pbuf = gl.createBuffer();
    tex = gl.createTexture(); texW = 0;
    return true;
  }
  function sizeCanvas() {
    var d = Math.min(window.devicePixelRatio || 1, vw > 900 ? 1.5 : 2) * [0.5, 0.72, 1][tier];
    var cap = [520000, 1050000, 2300000][tier], n = vw * vh * d * d;
    if (n > cap) d *= Math.sqrt(cap / n);
    cw = Math.max(2, Math.round(vw * d)); ch = Math.max(2, Math.round(vh * d)); pxr = cw / vw;
    if (canvas.width !== cw || canvas.height !== ch) { canvas.width = cw; canvas.height = ch; }
    // skyline texture matches the screen so the stores stay crisp
    var tw = Math.min(2048, Math.max(256, Math.round(vw * Math.min(window.devicePixelRatio || 1, 2))));
    var th = Math.min(1024, Math.max(32, Math.round(tw * STRIP * vh / vw)));
    if (gl && (tw !== texW || th !== texH)) {
      texW = tw; texH = th;
      var img = skyline(tw, th);
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1); gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, 1);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    }
  }

  /* ---------- the dots ---------- */
  var PAL = [[0.95, 0.71, 0.36], [0.95, 0.71, 0.36], [0.91, 0.46, 0.24], [1, 0.62, 0.52], [0.93, 0.96, 0.95], [0.48, 0.88, 0.65], [0.44, 0.66, 0.79], [0.37, 0.84, 0.82]];
  var AQ = [0.37, 0.84, 0.82];
  var ptx = -9, pty = -9, ptMoved = false, ptDown = false, lastRipT = -9, lastRipX = -9, lastRipY = -9, ripI = 0, storeN = [0, 0, 0, 0, 0];
  var sptx = -9, spty = -9;
  function dot(x, y, size, c, a) {
    if (np >= MAXP || a <= 0.004) return;
    var o = np * 7; pts[o] = x; pts[o + 1] = y; pts[o + 2] = size * pxr * (narrow ? 1.6 : 2.1); pts[o + 3] = c[0]; pts[o + 4] = c[1]; pts[o + 5] = c[2]; pts[o + 6] = a; np++;
  }
  function ripple(slot, x, dy, t, mult) {
    var z = cam / (dy + 0.002), o = slot * 4;
    rp[o] = (x - 0.5) * (vw / vh) * z; rp[o + 1] = z; rp[o + 2] = t; rp[o + 3] = clamp(z * 0.1, 0.12, 6) * mult;
  }
  var tmpc = [0, 0, 0];
  function buildDots(t) {
    np = 0;
    var i, j, k, nst = narrow ? 2 : 3, asp = vw / vh;
    /* surface: braided streams from each store to the water */
    if (wl < yh + 0.2 && roofs.length) {
      var amp = clamp(vw * 0.013, 7, 19) / vw, n = narrow ? 13 : 19;
      for (k = 0; k < roofs.length; k++) {
        var b = roofs[k], L = lands[k];
        // ripple rings where the stream meets the water
        if (!still) {
          var due = Math.floor((t + k * 0.37) / 1.45);
          if (due !== storeN[k]) { storeN[k] = due; if (yh - L.d > wl) ripple(k * 2 + (due & 1), L.x, L.d, t, 0.8); }
        }
        for (j = 0; j < nst; j++) for (i = 0; i < n; i++) {
          var u = (i + j / nst) / n + t * 0.085 + k * 0.13; u -= Math.floor(u);
          var v = 1 - u, b0 = v * v * v, b1 = 3 * v * v * u, b2 = 3 * v * u * u, b3 = u * u * u;
          var x = (b0 + b1) * b.x + (b2 + b3) * L.x;
          var e = b0 * b.e + b1 * (b.e + 0.032) + b2 * 0.03 - b3 * L.d;
          x += amp * Math.pow(Math.sin(PI * u), 0.6) * Math.sin(u * 11 + j * 2.094 * (nst === 3 ? 1 : 1.5) - t * 0.45);
          var y = yh + e;
          if (y < wl + 0.006) continue;
          var r = hh(i + 3.3, j * 5 + k), c = PAL[r < 0.62 ? 0 : (r * 61 | 0) % PAL.length];
          dot(x, y, 3 + 2.2 * hh(i, k + j * 9), c, ss(0, 0.05, u) * (1 - ss(0.95, 1, u)));
        }
        for (i = 0; i < 44; i++) { // a faint thread under the dots, so each stream reads as one line
          var u2 = (i + 0.5) / 44, v2 = 1 - u2, y3 = yh + v2 * v2 * v2 * b.e + 3 * v2 * v2 * u2 * (b.e + 0.032) + 3 * v2 * u2 * u2 * 0.03 - u2 * u2 * u2 * L.d;
          if (y3 > wl + 0.006) dot((v2 * v2 * v2 + 3 * v2 * v2 * u2) * b.x + (3 * v2 * u2 * u2 + u2 * u2 * u2) * L.x, y3, 2.2, PAL[0], 0.2);
        }
        if (yh - L.d > wl + 0.01) dot(L.x, yh - L.d, 30, PAL[0], 0.26 + (still ? 0 : 0.06 * Math.sin(t * 2.1 + k)));
      }
    }
    /* under water: the same streams sink through the three layers to the bed */
    if (wl > 0.01 && lands.length) {
      var sA = strata[0], sB = strata[1], sC = strata[2];
      var dW = (clamp(vh * 0.032, 20, 30) / vh) / K, sink = t * 0.011 / K;
      var wTop = p - 0.56 / K, wBot = p + 0.56 / K;
      var brA = clamp(vw * 0.021, 11, 28) / vw, gap = (narrow ? 6 : 8) / vw, scat = clamp(vw * 0.032, 16, 44) / vw;
      var fy = -0.14 + bed * 0.3, jit = 5 / vw;
      sptx += (ptx - sptx) * 0.12; spty += (pty - spty) * 0.12;
      var nS = secW.length, q, dq, gz, gq;
      for (k = 0; k < lands.length; k++) for (j = 0; j < nst; j++) {
        var off = j * 0.37 * dW + sink, i0 = Math.floor((wTop - off) / dW), i1 = Math.ceil((wBot - off) / dW), sid = k * 7 + j * 3;
        for (i = i0; i <= i1; i++) {
          var w = i * dW + off;
          var merge = ss(sA, sB, w), order = ss(sB, sC, w), fin = ss(sC, sC + 0.03, w);
          var r1 = hh(i, sid), dens = 0.5 + 0.5 * order;
          if (r1 > dens + 0.06) continue;
          var al = clamp((dens + 0.06 - r1) / 0.06, 0, 1);
          var r2 = hh(i + 0.31, sid + 1.7), r3 = hh(i + 0.77, sid + 4.1), r4 = hh(i + 0.13, sid + 9.2);
          var y0 = 0.5 - (w - p) * K;
          // near a section the strands draw together, lean toward its pool of light and brighten
          for (gz = 0, gq = 0, q = 1; q < nS; q++) { dq = Math.abs(w - secW[q]) * K; if (dq < 0.5) { gz = (1 - ss(0.03, 0.5, dq)) * merge; gq = q; } }
          var cx = lands[k].x + Math.sin(w * K * 1.1 + k * 1.7) * 0.012 * (1 - order);
          cx += (poolX(gq) - cx) * 0.07 * gz;
          var bx = brA * (1 - 0.3 * merge) * (1 - fin) * (1 - 0.45 * gz) * Math.sin(w * K * 6.2 + j * 2.094 * (nst === 3 ? 1 : 1.5) + t * 0.22 + k) +
            fin * (j - (nst - 1) / 2) * gap * (1 - 0.55 * gz);
          var jx = 0, jy = 0;
          if (merge < 1 && !still) {
            jx = (Math.sin(t * (2.3 + r2 * 3) + r3 * 60) * 0.7 + Math.sin(t * (1.2 + r3 * 2) + r4 * 40)) * jit * (1 - merge);
            jy = Math.sin(t * (0.9 + r4 * 2) + r3 * 40) * jit * asp * (1 - merge);
          }
          var c0 = PAL[(r4 * 97 | 0) % PAL.length];
          tmpc[0] = lerp(c0[0], AQ[0], order); tmpc[1] = lerp(c0[1], AQ[1], order); tmpc[2] = lerp(c0[2], AQ[2], order);
          var size = lerp(2.6 + 4.6 * r2 * r2, 3.7, order) * (1 + 0.2 * gz), alpha = (1 + 0.4 * gz) * al * lerp(0.85, 0.6, merge) * (1 + 0.2 * fin) * (narrow ? 0.8 : 1) * ss(0, 0.05, wl - y0);
          for (var tw = 0; tw < 2; tw++) {
            if (tw && merge >= 0.995) break;
            var um = (1 - merge) * (1 - merge), x2 = cx + bx + jx + (r3 - 0.5) * scat * um * (tw ? -1 : 1) + (tw ? (r2 - 0.5) * scat * 0.7 * um : 0);
            var y2 = y0 + jy + (tw ? (r4 - 0.5) : (r2 - 0.5)) * dW * K * 2.4 * (1 - order);
            if (y2 > wl - 0.008 || y2 < -0.03 || y2 > 1.03) continue;
            var a2 = alpha * (tw ? (1 - merge) * 0.8 : 1);
            if (bed > 0) {
              x2 = 0.5 + (x2 - 0.5) * (1 - 0.9 * bed * ss(0.8, fy + 0.03, y2));
              a2 *= ss(fy - 0.01, fy + 0.07, y2);
            }
            var dxp = x2 - sptx, dyp = (y2 - spty) / asp, dd = dxp * dxp + dyp * dyp;
            if (dd < 0.02) { var f = 0.022 * Math.exp(-dd * 260) / (Math.sqrt(dd) + 0.02); x2 += dxp * f; y2 += dyp * f * asp; }
            dot(x2, y2, size, tmpc, a2);
          }
        }
      }
    }
  }

  /* ---------- frame ---------- */
  var raf = 0, tAcc = still ? 14.2 : 0, lastNow = 0, skip = false;
  // quality tier: judged on steady visible frames only; steps down after two slow windows, back up after a run of fast ones
  var tierMax = 2, warm = 40, mN = 0, mSum = 0, slowW = 0, fastW = 0, upWait = 6, upTries = 0;
  function setTier(n) { tier = n; sizeCanvas(); warm = 40; mN = mSum = slowW = fastW = 0; }
  function pointerRipples(t) {
    if (still) return;
    var y = 1 - pty;
    if ((ptMoved || ptDown) && y < yh - BK - 0.004 && y > wl + 0.01) {
      var dx = ptx - lastRipX, dy = pty - lastRipY;
      if (ptDown || (t - lastRipT > 0.11 && dx * dx + dy * dy > 0.00012)) {
        ripple(10 + (ripI++ % 4), ptx, yh - y, t, ptDown ? 1.5 : 1);
        lastRipT = t; lastRipX = ptx; lastRipY = pty;
      }
    }
    ptMoved = ptDown = false;
  }
  function draw() {
    if (!gl || lost) return;
    var m = mainProg(); if (!m) return;
    var t = tAcc, u = m.u;
    pointerRipples(t);
    buildDots(t);
    gl.viewport(0, 0, cw, ch);
    gl.disable(gl.BLEND);
    gl.useProgram(m.p);
    gl.bindBuffer(gl.ARRAY_BUFFER, quad);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.uniform2f(u.uR, cw, ch); gl.uniform1f(u.uT, t); gl.uniform1f(u.uS, s); gl.uniform1f(u.uP, p);
    gl.uniform1f(u.uW, wl); gl.uniform1f(u.uH, H0); gl.uniform1f(u.uK, K); gl.uniform1f(u.uC, cam); gl.uniform1f(u.uB, bed);
    gl.uniform3f(u.uSt, strata[0], strata[1], strata[2]); gl.uniform4f(u.uG, gX, gY, gS, gF); gl.uniform4fv(u.uRp, rp);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tex); gl.uniform1i(u.uTx, 0);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    if (np) {
      gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE);
      gl.useProgram(pprog);
      gl.bindBuffer(gl.ARRAY_BUFFER, pbuf);
      gl.bufferData(gl.ARRAY_BUFFER, pts.subarray(0, np * 7), gl.DYNAMIC_DRAW);
      gl.enableVertexAttribArray(1); gl.enableVertexAttribArray(2);
      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 28, 0);
      gl.vertexAttribPointer(1, 1, gl.FLOAT, false, 28, 8);
      gl.vertexAttribPointer(2, 4, gl.FLOAT, false, 28, 12);
      gl.drawArrays(gl.POINTS, 0, np);
      gl.disableVertexAttribArray(1); gl.disableVertexAttribArray(2);
    }
  }
  function frame(now) {
    raf = 0;
    if (doc.hidden || lost) return;
    if (!still) raf = requestAnimationFrame(frame);
    var dt = lastNow ? (now - lastNow) / 1000 : 0.016;
    if (scrollDirty) readScroll();
    // under water and idle: drop to about 30fps
    var half = !still && wl > 1.05 && now - lastAct > 2500;
    if (half) { skip = !skip; if (skip) return; } else skip = false;
    lastNow = now;
    if (!still) tAcc += Math.min(dt, 0.1);
    draw();
    if (still) return;
    // skip warm-up frames, the half-rate idle mode, hitches and throttled (covered or background) panes
    if (warm > 0 || half || dt > 0.1 || (doc.hasFocus && !doc.hasFocus() && dt > 0.03)) { if (warm > 0) warm--; if (dt > 0.1) mN = mSum = 0; return; }
    mSum += dt; mN++;
    if (mN < 45) return;
    var avg = mSum / mN * 1000; mN = mSum = 0;
    if (DEBUG) { mount.setAttribute('data-lk-ms', avg.toFixed(1)); mount.setAttribute('data-lk-tier', tier); }
    if (avg > 24) {
      fastW = 0;
      if (++slowW >= 2 && tier > 0) { if (upTries) upWait *= 4; setTier(tier - 1); }
    } else {
      slowW = 0;
      if (avg < 18.5 && tier < tierMax && upTries < 3) { if (++fastW >= upWait) { upTries++; setTier(tier + 1); } } else fastW = 0;
    }
  }
  function kick() { if (!raf && !doc.hidden && !lost && gl) raf = requestAnimationFrame(frame); }

  /* ---------- wiring ---------- */
  function onScroll() { scrollDirty = true; lastAct = performance.now(); kick(); }
  function onResize() { measure(false); if (gl && !lost) sizeCanvas(); warm = 40; kick(); }
  function onPointer(e) {
    ptx = e.clientX / vw; pty = e.clientY / vh; ptMoved = true; lastAct = performance.now();
    if (e.type === 'pointerdown') ptDown = true;
    if (sptx < -1) { sptx = ptx; spty = 1 - pty; }
  }
  function start() {
    buildGauge();
    secEls = doc.querySelectorAll('[data-depth-label]');
    measure(true);
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize, { passive: true });
    window.addEventListener('load', onResize, { passive: true });
    if (window.ResizeObserver && doc.body) { // content height changes move the section marks
      var roT = 0;
      new ResizeObserver(function () { clearTimeout(roT); roT = setTimeout(function () { measure(false); if (!gl) readScroll(); else kick(); }, 120); }).observe(doc.body);
    }
    canvas = doc.createElement('canvas'); canvas.className = 'lk-canvas';
    if (coarse || vw < 760) tier = tierMax = 1;
    if (!initGL()) { // CSS gradient fallback still dives via --depth
      gl = null; mount.classList.add('lk-fallback');
      readScroll();
      window.addEventListener('scroll', function () { if (scrollDirty) requestAnimationFrame(function () { if (scrollDirty) readScroll(); }); }, { passive: true });
      return;
    }
    mount.appendChild(canvas);
    sizeCanvas();
    canvas.addEventListener('webglcontextlost', function (e) { e.preventDefault(); lost = true; }, false);
    canvas.addEventListener('webglcontextrestored', function () { lost = false; if (initGL()) { sizeCanvas(); kick(); } }, false);
    if (!still) {
      window.addEventListener('pointermove', onPointer, { passive: true });
      window.addEventListener('pointerdown', onPointer, { passive: true });
    }
    doc.addEventListener('visibilitychange', function () { lastNow = 0; warm = 40; kick(); });
    var onMq = function () { still = !!mq.matches; if (still) tAcc = 14.2; lastNow = 0; kick(); };
    if (mq.addEventListener) mq.addEventListener('change', onMq); else if (mq.addListener) mq.addListener(onMq);
    readScroll();
    if (still) for (var q = 0; q < lands.length; q++) ripple(q * 2, lands[q].x, lands[q].d, tAcc - 0.9, 0.8);
    draw();
    mount.classList.add('lk-on');
    kick();
  }
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', start); else start();
})();
