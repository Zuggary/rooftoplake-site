/* RooftopLake page shell: reveal, nav, starter filter, hero ripples. */
(function(){
  'use strict';
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Reveal on scroll
  var rv = [].slice.call(document.querySelectorAll('.rv'));
  if ('IntersectionObserver' in window && !reduce) {
    var io = new IntersectionObserver(function(es){
      es.forEach(function(e){ if (e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target); } });
    }, {rootMargin:'0px 0px -8% 0px', threshold:0.05});
    rv.forEach(function(el){ io.observe(el); });
    // Safety net: never leave content hidden.
    setTimeout(function(){ rv.forEach(function(el){ var r = el.getBoundingClientRect(); if (r.top < innerHeight) el.classList.add('in'); }); }, 1200);
  } else { rv.forEach(function(el){ el.classList.add('in'); }); }

  // Nav border, progress bar, active link
  var nav = document.getElementById('nav'), bar = document.getElementById('progress');
  var links = [].slice.call(document.querySelectorAll('.nav nav a'));
  var targets = links.map(function(a){ return document.querySelector(a.getAttribute('href')); });
  var ticking = false;
  function onScroll(){
    if (ticking) return; ticking = true;
    requestAnimationFrame(function(){
      var y = window.scrollY, h = document.documentElement.scrollHeight - innerHeight;
      nav.classList.toggle('scrolled', y > 8);
      if (bar) bar.style.transform = 'scaleX(' + (h > 0 ? Math.min(1, y / h) : 0) + ')';
      var cur = -1;
      targets.forEach(function(t, i){ if (t && t.getBoundingClientRect().top < innerHeight * 0.4) cur = i; });
      links.forEach(function(a, i){ a.classList.toggle('on', i === cur); });
      ticking = false;
    });
  }
  addEventListener('scroll', onScroll, {passive:true}); onScroll();

  // Starter filter
  var chips = [].slice.call(document.querySelectorAll('.chips .chip[data-f]'));
  var cards = [].slice.call(document.querySelectorAll('#starterGrid .starter'));
  chips.forEach(function(c){
    c.addEventListener('click', function(){
      var f = c.getAttribute('data-f');
      chips.forEach(function(o){ o.setAttribute('aria-pressed', o === c ? 'true' : 'false'); });
      cards.forEach(function(card){ card.hidden = !(f === 'all' || card.getAttribute('data-d') === f); if (!card.hidden) card.classList.add('in'); });
    });
  });


  // Desk tabs
  var tabs = [].slice.call(document.querySelectorAll('#deskTabs [role="tab"]'));
  function pick(t, focus){
    tabs.forEach(function(o){
      var on = o === t; o.setAttribute('aria-selected', on ? 'true' : 'false'); o.tabIndex = on ? 0 : -1;
      var p = document.getElementById(o.getAttribute('aria-controls')); if (p) p.hidden = !on;
    });
    if (focus) t.focus();
  }
  tabs.forEach(function(t, i){
    t.addEventListener('click', function(){ pick(t, false); });
    t.addEventListener('keydown', function(e){
      var n = e.key === 'ArrowRight' ? i + 1 : e.key === 'ArrowLeft' ? i - 1 : e.key === 'Home' ? 0 : e.key === 'End' ? tabs.length - 1 : -99;
      if (n === -99) return; e.preventDefault(); pick(tabs[(n + tabs.length) % tabs.length], true);
    });
  });


  // Feed board
  var feedList = document.getElementById('feedList'), feedSum = document.getElementById('feedSummary');
  if (feedList) {
    var boxes = [].slice.call(feedList.querySelectorAll('input'));
    boxes.forEach(function(b){
      var st = b.closest('li').querySelector('.fs'); st.setAttribute('data-on', st.textContent);
      b.addEventListener('change', function(){
        st.textContent = b.checked ? st.getAttribute('data-on') : 'Off · switched off by you';
        b.closest('li').classList.toggle('off', !b.checked);
        var on = boxes.filter(function(x){ return x.checked; }).length;
        feedSum.textContent = on + ' of ' + boxes.length + ' feeds on' + (on === boxes.length ? ' · all fresh' : ' · ' + (boxes.length - on) + ' switched off by you');
      });
    });
  }

  // Who sees what
  var ROWS = ['Store results','Financial statement','Customer contact details','Deal gross and cost','Credit applications and SSNs','Service history','Payroll and HR'];
  var S = {all:['All stores','ok'],store:['Own store only','ok'],dept:['Own department','ok'],mask:['Masked','mid'],phase:['Not in the first phase','no'],tot:['Totals only','mid'],lim:['Appointments only','mid'],ask:['Only with your approval','mid'],own:['Same as its owner, or less','mid'],veh:['Vehicle history only','mid'],no:['No','no']};
  var ROLES = [
    ['Dealer principal','Sees the whole group. Sensitive details stay masked until needed, and every unmasking is logged.',['all','all','all','all','phase','all','all']],
    ['Controller','Sees the money across the group. Unmasking any sensitive detail is logged.',['all','all','all','all','phase','all','all']],
    ['Store GM','Sees one store, top to bottom.',['store','store','store','store','no','store','tot']],
    ['Sales manager','Sees the sales side of one store.',['dept','no','store','store','no','store','no']],
    ['Service advisor','Sees the customers and cars in their own lane.',['dept','no','store','no','no','store','no']],
    ['BDC rep','Sees who to contact and when. Never sees gross or credit.',['dept','no','store','no','no','lim','no']],
    ['Technician','Sees the car, not the customer.',['dept','no','no','no','no','veh','no']],
    ['An agent','Never more than the person who owns it. It drafts; a named person approves.',['own','own','own','own','no','own','no']],
    ['RooftopLake support','No standing access to your customer data. Emergency access needs your approval, ends after a few hours, and is logged.',['ask','ask','ask','ask','no','ask','no']]
  ];
  var rc = document.getElementById('roleChips'), al = document.getElementById('accessList');
  if (rc && al) {
    var rn = document.getElementById('roleName'), rnote = document.getElementById('roleNote'), btns = [];
    function show(i){
      btns.forEach(function(b, k){ b.setAttribute('aria-pressed', k === i ? 'true' : 'false'); });
      rn.textContent = ROLES[i][0]; rnote.textContent = ROLES[i][1];
      al.innerHTML = '';
      ROWS.forEach(function(r, k){
        var st = S[ROLES[i][2][k]], li = document.createElement('li'), a = document.createElement('span'), b = document.createElement('span');
        a.textContent = r; b.textContent = st[0]; b.className = 'av ' + st[1]; li.appendChild(a); li.appendChild(b); al.appendChild(li);
      });
    }
    ROLES.forEach(function(r, i){
      var b = document.createElement('button'); b.type = 'button'; b.className = 'chip'; b.textContent = r[0];
      b.addEventListener('click', function(){ show(i); }); rc.appendChild(b); btns.push(b);
    });
    show(2);
  }

  // Hero: touch the water
  var scene = document.getElementById('scene');
  if (scene && !reduce) {
    var svg = scene.querySelector('svg'), layer = document.getElementById('userRipples');
    var NS = 'http://www.w3.org/2000/svg', last = 0;
    function ripple(evt){
      var now = Date.now(); if (now - last < 120) return; last = now;
      var pt = svg.createSVGPoint(); pt.x = evt.clientX; pt.y = evt.clientY;
      var m = svg.getScreenCTM(); if (!m) return;
      var p = pt.matrixTransform(m.inverse());
      if (p.y < 256) return;
      var depth = Math.min(1, (p.y - 250) / 190);
      [0, 260].forEach(function(delay, i){
        var e = document.createElementNS(NS, 'ellipse');
        e.setAttribute('class', 'sk-rip sk-user');
        e.setAttribute('cx', p.x.toFixed(1)); e.setAttribute('cy', p.y.toFixed(1));
        e.setAttribute('rx', (70 + depth * 90 + i * 30).toFixed(0)); e.setAttribute('ry', (9 + depth * 14 + i * 4).toFixed(0));
        e.style.animationDelay = delay + 'ms'; e.style.opacity = 0;
        layer.appendChild(e);
        setTimeout(function(){ if (e.parentNode) e.parentNode.removeChild(e); }, 2600 + delay);
      });
    }
    scene.addEventListener('pointerdown', ripple);
    scene.addEventListener('pointermove', function(e){ if (e.pointerType === 'mouse') ripple(e); });
  }
})();
