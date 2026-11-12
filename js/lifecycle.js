/* RooftopLake: agent factory lifecycle. Vanilla JS, no globals. Mounts into #factory-lifecycle. */
(function () {
  "use strict";

  var ROLES = {
    P: "Dealer principal", GM: "GM", C: "Controller", F: "Fixed-ops director", IT: "IT/ops lead", RL: "RooftopLake"
  };
  var STORES = ["Northside", "Lakeview", "Riverbend", "Hillcrest", "Eastgate"];
  var STATUS8 = ["Healthy", "Healthy", "Healthy", "Review due", "Healthy"];

  var STAGES = [
    { n: "Pick the job", line: "One job, one owner, one number to move.", gate: "An owner is named, the risk level is set, and what the agent may never do is written down." },
    { n: "Give it the data", line: "Only the data the job needs. Nothing else.", gate: "It can reach only the data on its job sheet, and only for stores it is cleared for." },
    { n: "Build it", line: "Built from a ready-made starter, set to your rules.", gate: "It runs cleanly on sample data, and the cost of each run is measured." },
    { n: "Test it", line: "Checked against last quarter's real history first.", gate: "It hits the agreed score with zero serious misses, and the kill switch is tested." },
    { n: "Shadow it", line: "Works beside your people. It only suggests.", gate: "It matches or beats your people on the job sheet number, and the pilot store GM signs." },
    { n: "Pilot store live", line: "Live at one store, with a daily spending cap.", gate: "Thirty days live, no compliance issue, spending under the cap, and the GM says keep it." },
    { n: "Roll to the group", line: "The same agent goes to every store. One click each.", gate: "Each store gets its own data pass, a two-week shadow and its GM's sign-off." },
    { n: "Watch, fix, retire", line: "Checked daily. Reviewed monthly. Retired when done.", gate: "It passes a monthly review, or it pauses itself. Any change goes back to Test." }
  ];
  /* Signers per stage: "owner" resolves to the agent's owner. */
  var SIGN = ["owner", "IT/ops lead", "RooftopLake", "owner", "Jordan Rivera", "Jordan Rivera", "Pat Morgan", "owner"];
  var SIGN_SUB = ["", "", "", "", "Northside GM", "Northside GM", "Dealer principal", "Monthly review"];

  /* Play it through: [stage, ms]. About 15 seconds, five moments; loops back to the first. */
  var STORY = [[0, 2600], [3, 3600], [5, 2700], [6, 4100], [7, 2600]];
  var SPEND = [0, 0, 9, 22, 17, 34, 41, 46];

  var ROLL_WHAT = "The same tested agent goes to Lakeview, Riverbend, Hillcrest and Eastgate. One click per store, not a rebuild. Each store gets its own data pass and its GM's sign-off.";

  var AGENTS = [
    {
      name: "Aged-inventory watcher", short: "Aged inventory", owner: "GM", ownerName: "Jordan Rivera", approve: false,
      act: "flagged 6 units past 90 days", starter: "Aged-inventory starter",
      icon: '<path d="M3 14.5v-3l2.2-4.5h9.6l2.2 4.5v3z"/><circle cx="6.5" cy="14.5" r="1.6"/><circle cx="13.5" cy="14.5" r="1.6"/>',
      what: [
        "Write down the job: flag used units past 60 and 90 days and suggest a price move or wholesale. The GM owns it. It never changes a price itself.",
        "Connect inventory, pricing, floorplan and market comparisons. No customer records. Each store sees its own lot; the GM sees the group.",
        "Start from a ready-made aged-inventory starter, then set your group's rules: your day counts, your margin floor, your wholesale cutoff.",
        "Run it against last quarter's real aged units, where you already know what your managers did, before it touches anything live.",
        "For two weeks it flags units next to your used-car manager. It only suggests. The manager compares its list with their own.",
        "Live at Northside only. It posts the aged list each morning and the used-car manager decides what to do. Spending is capped per day.",
        ROLL_WHAT,
        "Daily health and cost checks, plus a monthly review with the GM. A rule change goes back to Test. It retires when aged units stop moving."
      ],
      who: [["GM", "P"], ["IT", "C"], ["RL", "GM"], ["GM", "RL"], ["GM"], ["GM", "IT"], ["P", "GM"], ["GM", "IT", "P"]],
      job: [["Job", "Flag aged used units"], ["Owner", "GM"], ["Moves", "Units over 90 days"], ["Never", "Changes a price itself"]],
      data: [["Inventory", 1], ["Pricing history", 1], ["Market comparisons", 1], ["Customer records", 0], ["Deal jackets", 0]],
      rules: ["Flag at 60 and 90 days", "Never below the margin floor", "Wholesale cutoff: 120 days"],
      test: [47, 50, "matched your managers' call"],
      shadow: [["Aged units found", "23", "26"], ["Found by both", "21", "21"], ["Manager agreed", "n/a", "24 of 26"]],
      pilot: "Read-only. The morning list goes to the used-car manager and GM. 30 of 30 days, 0 compliance issues.",
      report: "Units over 90 days: 41 → 29 group-wide. Under the cap at every store. A new day count goes back to Test."
    },
    {
      name: "Lead-response audit", short: "Lead replies", owner: "GM", ownerName: "Jordan Rivera", approve: false,
      act: "found 3 leads with no reply in 30 minutes", starter: "Lead-audit starter",
      icon: '<circle cx="10" cy="11.5" r="5.8"/><path d="M10 11.5V8.4M8 3.2h4M15 6l1.2-1.2"/>',
      what: [
        "Write down the job: check how fast every internet and phone lead got a real reply, by store and by salesperson. It never contacts a customer or a rep.",
        "Connect leads and the activity log from your CRM, plus the sales roster and store hours. No credit applications, no deal jackets.",
        "Start from a ready-made lead-audit starter, then set your rules: what counts as a real reply, your target time, your store hours.",
        "Run it against last quarter's real leads, where your managers already know which ones went cold, before it touches anything live.",
        "For two weeks it audits next to your sales manager. It only suggests. The manager checks its list against their own.",
        "Live at Northside only. Each morning the GM gets a short list of slow and missed leads. Spending is capped per day.",
        ROLL_WHAT,
        "Daily health and cost checks, plus a monthly review with the GM. A new reply target goes back to Test. It retires when reply times hold steady."
      ],
      who: [["GM", "P"], ["IT"], ["RL", "GM"], ["GM", "RL"], ["GM"], ["GM", "IT"], ["P", "GM"], ["GM", "IT", "P"]],
      job: [["Job", "Audit lead reply times"], ["Owner", "GM"], ["Moves", "Leads unanswered in 30 min"], ["Never", "Contacts a customer"]],
      data: [["CRM leads", 1], ["Activity log", 1], ["Sales roster", 1], ["Credit applications", 0], ["Deal jackets", 0]],
      rules: ["Real reply: a person or an answer", "Target: 30 minutes", "After-hours counted apart"],
      test: [49, 50, "matched your managers' read"],
      shadow: [["Slow replies found", "31", "34"], ["Found by both", "30", "30"], ["Manager agreed", "n/a", "33 of 34"]],
      pilot: "Read-only. A short morning list of slow and missed leads goes to the GM. 30 of 30 days, 0 compliance issues.",
      report: "Leads with no reply in 30 min: 18% → 7% group-wide. Under the cap at every store. A new target goes back to Test."
    },
    {
      name: "Service follow-up drafts", short: "Service follow-ups", owner: "F", ownerName: "Dana Brooks", approve: true,
      act: "drafted 4 follow-ups, waiting for approval", starter: "Service follow-up starter",
      icon: '<path d="M14.6 3.4a3.6 3.6 0 0 0-4.3 4.7L3.8 14.6l1.6 1.6 6.5-6.5a3.6 3.6 0 0 0 4.7-4.3l-2.1 2.1-1.9-.5-.5-1.9z"/>',
      what: [
        "Write down the job: draft follow-up notes for repairs customers declined. Dana Brooks owns it. Nothing goes out without a person's OK, and never to anyone who opted out.",
        "Connect declined repair lines, customer contact details and contact consent. Contact details stay masked until a person approves a draft.",
        "Start from a ready-made service follow-up starter, then set your rules: your tone, which repairs qualify, how long to wait, your opt-out wording.",
        "Run it against last quarter's real declined work, where you already know which customers came back, before it touches anything live.",
        "For two weeks it drafts next to advisors like Sam. Nothing is sent. The service manager compares its drafts with what the team wrote.",
        "Live at Northside only. Every draft waits in a queue for a person to approve, edit or delete. Spending is capped per day.",
        ROLL_WHAT + " Each store's service manager becomes its approver.",
        "Daily health and cost checks, plus a monthly review with Dana Brooks. New wording goes back to Test. It retires when declined work stops coming back."
      ],
      who: [["F", "P"], ["IT", "F"], ["RL", "F"], ["F", "RL"], ["F", "GM"], ["GM", "F", "IT"], ["P", "GM", "F"], ["F", "IT", "P"]],
      job: [["Job", "Draft declined-work follow-ups"], ["Owner", "Dana Brooks (Fixed-ops director)"], ["Moves", "Declined work brought back"], ["Never", "Sends without approval"]],
      data: [["Declined repair lines", 1], ["Contact (masked)", 1], ["Contact consent", 1], ["Credit applications", 0], ["Deal jackets", 0]],
      rules: ["Declined in the last 90 days", "Skip anyone without consent", "Every draft waits for approval"],
      test: [46, 50, "drafts a manager would send"],
      shadow: [["Follow-ups drafted", "40", "112"], ["Sent as written", "n/a", "91 of 112"], ["Opt-out rules broken", "0", "0"]],
      pilot: "Every message is approved by a person before it reaches a customer like Maria. 30 of 30 days, 0 compliance issues.",
      report: "Declined work brought back: up at 4 of 5 stores. Every message approved by a named person. New wording goes back to Test."
    }
  ];

  function h(tag, cls, html) {
    var el = document.createElement(tag);
    if (cls) el.className = cls;
    if (html != null) el.innerHTML = html;
    return el;
  }
  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; });
  }
  function rows(arr) {
    return '<dl class="lc-rows">' + arr.map(function (r) {
      return '<div class="lc-row"><dt>' + esc(r[0]) + "</dt><dd>" + esc(r[1]) + "</dd></div>";
    }).join("") + "</dl>";
  }
  var BARS = '<div class="lc-bars" aria-hidden="true"><i></i><i></i></div>';

  // the same abstract sign marks as the hero showrooms: ring, chevron, diamond, bar, ring and dot
  var GLYPH = [
    '<circle class="lc-r-mark lc-r-line" cx="10" cy="13.5" r="3.3"/>',
    '<path class="lc-r-mark lc-r-line" d="M6 15.6L10 11.4L14 15.6"/>',
    '<path class="lc-r-mark" d="M10 9.6L13.9 13.5L10 17.4L6.1 13.5Z"/>',
    '<rect class="lc-r-mark" x="5.6" y="12.6" width="8.8" height="1.9" rx=".5"/>',
    '<circle class="lc-r-mark lc-r-line" cx="10" cy="13.5" r="3.3"/><circle class="lc-r-mark" cx="10" cy="13.5" r="1"/>'
  ];
  function roof(k) {
    var f = "lc-glow-" + k;
    return '<svg class="lc-roof-svg" viewBox="0 0 100 60" aria-hidden="true" focusable="false">' +
      '<defs><filter id="' + f + '" x="-30%" y="-60%" width="160%" height="220%"><feGaussianBlur stdDeviation="4"/></filter></defs>' +
      '<rect class="lc-r-ground" x="0" y="55" width="100" height="1.6" rx=".8"/>' +
      '<rect class="lc-r-post" x="8.5" y="20" width="3" height="35"/>' +
      '<rect class="lc-r-sign" x="4" y="5" width="12" height="17" rx="1.5"/>' +
      GLYPH[k % GLYPH.length] +
      '<rect class="lc-r-body" x="23" y="29" width="73" height="26"/>' +
      '<rect class="lc-r-halo" x="25" y="30" width="58" height="25" filter="url(#' + f + ')"/>' +
      '<rect class="lc-r-glass" x="27" y="32" width="54" height="21"/>' +
      '<path class="lc-r-car" d="M31 53v-2.6l3-3.2h9.5l3.2 3.2V53zM58 53v-2.6l3-3.2h9.5l3.2 3.2V53z"/>' +
      '<rect class="lc-r-mull" x="27" y="37" width="54" height=".9"/>' +
      '<rect class="lc-r-mull" x="40" y="32" width="1.1" height="21"/><rect class="lc-r-mull" x="53.5" y="32" width="1.1" height="21"/><rect class="lc-r-mull" x="67" y="32" width="1.1" height="21"/>' +
      '<rect class="lc-r-bay" x="84" y="36" width="9" height="19"/>' +
      '<rect class="lc-r-mull" x="84" y="41" width="9" height=".8"/><rect class="lc-r-mull" x="84" y="46" width="9" height=".8"/>' +
      '<rect class="lc-r-roof" x="17" y="24.5" width="82" height="4.5" rx="1"/>' +
      '<g class="lc-r-pause"><rect x="48" y="36" width="4" height="13" rx="1"/><rect x="56" y="36" width="4" height="13" rx="1"/></g>' +
      "</svg>";
  }

  function init(mount) {
    var mq = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)");
    function still() { return !!(mq && mq.matches); }

    var S = { agent: 0, stage: 0, rolled: 0, paused: [0, 0, 0, 0, 0], passed: [0, 0, 0, 0, 0, 0, 0, 0], playing: false, story: 0, clock: 478, more: false, log: false, tagAt: -2 };
    var T = { play: 0, roll: 0, tag: 0, raf: 0, gate: 0, adv: 0 };
    var logLines = [];

    mount.classList.add("lc");
    mount.setAttribute("role", "region");
    mount.setAttribute("aria-label", "Agent factory: the eight stages every agent goes through");
    mount.innerHTML =
      '<div class="lc-top">' +
        '<div class="lc-agents" role="group" aria-label="Pick an example agent"></div>' +
        '<button type="button" class="lc-pill lc-play" aria-pressed="false"><span class="lc-play-ico" aria-hidden="true"></span><span class="lc-play-t">Play it through</span><span class="lc-play-len" aria-hidden="true">15s</span></button>' +
      "</div>" +
      '<div class="lc-scene" data-mode="floor">' +
        '<div class="lc-track" role="tablist" aria-label="The eight stages"><div class="lc-line" aria-hidden="true"><span class="lc-line-fill"></span></div></div>' +
        '<div class="lc-panel" role="tabpanel" id="lc-panel">' +
          '<div class="lc-sky">' +
            '<div class="lc-art"></div>' +
            '<div class="lc-moment" aria-hidden="true"><p class="lc-moment-h"></p><p class="lc-moment-s"></p></div>' +
          "</div>" +
          '<div class="lc-lot"><div class="lc-road" aria-hidden="true"><span class="lc-road-fill"></span></div></div>' +
          '<div class="lc-tag" aria-hidden="true"><span class="lc-tag-in">v1.0</span></div>' +
          '<div class="lc-capt">' +
            '<div class="lc-capt-t"><p class="lc-kicker"></p><h3 class="lc-stage-title"></h3><p class="lc-line1"></p></div>' +
            '<div class="lc-nav">' +
              '<p class="lc-halt" aria-hidden="true">Stopped. Resume to continue.</p>' +
              '<div class="lc-nav-b">' +
                '<button type="button" class="lc-pill lc-round" data-act="prev" aria-label="Previous stage"><span aria-hidden="true">←</span></button>' +
                '<button type="button" class="lc-pill lc-next" data-act="next">Next stage <span aria-hidden="true">→</span></button>' +
              "</div>" +
            "</div>" +
          "</div>" +
          '<button type="button" class="lc-more" aria-expanded="false" aria-controls="lc-more-b"><span class="lc-more-ico" aria-hidden="true"></span>How this stage works</button>' +
          '<div class="lc-more-b" id="lc-more-b" hidden></div>' +
        "</div>" +
      "</div>" +
      '<div class="lc-rail" role="group" aria-label="Always on, at every stage">' +
        '<p class="lc-rail-h">Always on</p>' +
        '<div class="lc-ctl lc-ctl-kill">' +
          '<button type="button" class="lc-switch" role="switch" aria-checked="false"><span class="lc-switch-track" aria-hidden="true"><span class="lc-switch-knob"></span></span><span class="lc-switch-l">Kill switch</span></button>' +
          '<p class="lc-ctl-t lc-kill-t"></p>' +
        "</div>" +
        '<div class="lc-ctl"><p class="lc-ctl-h">Spending cap</p>' +
          '<div class="lc-meter" role="meter" aria-valuemin="0" aria-valuemax="100" aria-label="Spending against the daily cap"><span class="lc-meter-fill"></span><span class="lc-meter-warn"></span></div>' +
          '<p class="lc-ctl-t lc-spend-t"></p></div>' +
        '<div class="lc-ctl"><p class="lc-ctl-h">Human approval</p><p class="lc-ctl-t lc-approve-t"></p></div>' +
        '<div class="lc-ctl lc-ctl-log"><p class="lc-ctl-h">Record of every action</p><p class="lc-ctl-t lc-last"></p>' +
          '<button type="button" class="lc-linkbtn" aria-expanded="false" aria-controls="lc-log">See all</button>' +
          '<ol class="lc-log" id="lc-log" role="log" aria-live="off" aria-label="Record of every action" tabindex="0" hidden></ol></div>' +
      "</div>" +
      '<p class="lc-caption">Illustration. Example agents and made-up numbers.</p>' +
      '<div class="lc-sr" aria-live="polite" aria-atomic="true"></div>';

    function $(sel) { return mount.querySelector(sel); }
    var scene = $(".lc-scene"), panel = $(".lc-panel"), track = $(".lc-track"), art = $(".lc-art"), row = $(".lc-lot");
    var tag = $(".lc-tag"), tagIn = $(".lc-tag-in"), logEl = $(".lc-log"), live = $(".lc-sr"), more = $(".lc-more-b");

    var chips = AGENTS.map(function (a, i) {
      var b = h("button", "lc-pill lc-chip",
        '<svg class="lc-chip-ico" viewBox="0 0 20 20" aria-hidden="true" focusable="false">' + a.icon + "</svg>" + esc(a.short));
      b.type = "button";
      b.setAttribute("aria-label", a.name);
      b.addEventListener("click", function () { setAgent(i); });
      $(".lc-agents").appendChild(b);
      return b;
    });

    var tabs = STAGES.map(function (st, i) {
      var t = h("button", "lc-tab", '<span class="lc-tab-dot" aria-hidden="true"></span><span class="lc-tab-t">' + esc(st.n) + "</span>");
      t.type = "button";
      t.id = "lc-tab-" + (i + 1);
      t.setAttribute("role", "tab");
      t.setAttribute("aria-controls", "lc-panel");
      t.setAttribute("aria-label", "Stage " + (i + 1) + ": " + st.n);
      t.addEventListener("click", function () { if (blocked(i)) return; stop(); go(i, { anim: true }); });
      track.appendChild(t);
      return t;
    });
    track.addEventListener("keydown", function (e) {
      var k = e.key, n = S.stage;
      if (k === "ArrowRight" || k === "ArrowDown") n = Math.min(7, n + 1);
      else if (k === "ArrowLeft" || k === "ArrowUp") n = Math.max(0, n - 1);
      else if (k === "Home") n = 0;
      else if (k === "End") n = 7;
      else return;
      e.preventDefault();
      if (blocked(n)) return;
      stop();
      go(n, { anim: true, focus: true });
    });

    var stores = STORES.map(function (name, k) {
      var b = h("button", "lc-store", '<span class="lc-spill" aria-hidden="true"></span>' + roof(k) +
        '<span class="lc-store-n">' + name + '</span><span class="lc-store-s"></span>');
      b.type = "button";
      b.addEventListener("click", function () { toggleStore(k); });
      row.appendChild(b);
      return b;
    });

    mount.addEventListener("click", function (e) {
      var b = e.target.closest("[data-act]");
      if (!b || !mount.contains(b)) return;
      stop();
      var a = b.getAttribute("data-act");
      if (a === "next" && S.stage < 7 && !blocked(S.stage + 1)) next();
      if (a === "prev" && S.stage > 0) go(S.stage - 1, { anim: true });
    });
    $(".lc-play").addEventListener("click", function () { if (S.playing) stop(); else if (!allStopped()) play(); });
    $(".lc-switch").addEventListener("click", killAll);
    $(".lc-more").addEventListener("click", function () {
      S.more = !S.more;
      this.setAttribute("aria-expanded", String(S.more));
      more.hidden = !S.more;
      renderMore();
    });
    $(".lc-linkbtn").addEventListener("click", function () {
      S.log = !S.log;
      this.setAttribute("aria-expanded", String(S.log));
      this.textContent = S.log ? "Hide" : "See all";
      logEl.hidden = !S.log;
      if (S.log) logEl.scrollTop = logEl.scrollHeight;
    });

    /* ---------- state ---------- */
    function clearTimers() {
      clearTimeout(T.roll); clearTimeout(T.tag); clearTimeout(T.gate); clearTimeout(T.adv); T.adv = 0; cancelAnimationFrame(T.raf);
    }
    function allStopped() { return S.paused.every(Boolean); }
    /* While the kill switch is on, nothing moves forward. Going back is fine. */
    function blocked(n) {
      if (n <= S.stage || !allStopped()) return false;
      say("Stopped. Resume to continue.");
      return true;
    }
    /* Next: press the gate stamp on the current sheet, then move on. */
    function next() {
      var i = S.stage;
      if (T.adv) { go(i + 1, { anim: true }); return; }
      if (i < 5 && !S.passed[i] && !still()) {
        passGate(i, true);
        T.adv = setTimeout(function () { T.adv = 0; go(i + 1, { anim: true }); }, 560);
      } else go(i + 1, { anim: true });
    }
    function passGate(i, anim) {
      if (S.passed[i]) return;
      S.passed[i] = 1;
      if (i === S.stage) { renderStamp(anim && !still()); renderMore(); }
    }
    function setAgent(i) {
      if (i === S.agent) return;
      S.agent = i;
      S.paused = [0, 0, 0, 0, 0];
      for (var k = S.stage; k < 8; k++) S.passed[k] = 0;
      divider("Switched to " + AGENTS[i].name);
      logStage(S.stage);
      render({ anim: true });
      say(AGENTS[i].name + ". Stage " + (S.stage + 1) + ": " + STAGES[S.stage].n + ".");
    }

    function go(i, o) {
      o = o || {};
      clearTimers();
      var prev = S.stage;
      for (var k = prev; k < i; k++) S.passed[k] = 1;
      S.stage = i;
      var anim = o.anim && !still();
      if (i < 5) S.rolled = 0;
      else if (i === 5) S.rolled = anim && prev !== 5 ? 0 : 1;
      else if (i === 6) S.rolled = 1;
      else S.rolled = 5;
      logStage(i);
      render({ anim: anim });
      if (o.focus) tabs[i].focus();
      say("Stage " + (i + 1) + " of 8: " + STAGES[i].n + ". " + STAGES[i].line);
      /* During Play, the gate stamps once this stage's own animation has finished. */
      if (o.play && i < 5) T.gate = setTimeout(function () { passGate(i, true); }, still() ? 900 : i === 3 ? 1500 : 1100);

      if (i === 5) {
        if (S.rolled === 0) { // tag descends from the workbench into the pilot store, then it lights
          moveTag(-1, false);
          T.tag = setTimeout(function () { moveTag(0, true); }, 60);
          T.roll = setTimeout(function () { S.rolled = 1; renderStores(); renderMoment(); renderRail(); }, 820);
        } else moveTag(0, false);
      } else if (i === 6) {
        moveTag(0, false);
        if (!anim) { while (S.rolled < 5) rollOne(true); render({}); moveTag(4, false); }
        else T.roll = setTimeout(sweep, o.play ? 300 : 500);
      } else moveTag(-2, false);
    }
    function sweep() {
      if (S.stage !== 6 || S.rolled >= 5) return;
      moveTag(S.rolled, true);
      T.roll = setTimeout(function () {
        rollOne(false);
        if (S.rolled < 5) T.roll = setTimeout(sweep, 120);
      }, 720);
    }
    function rollOne(quiet) {
      var name = STORES[S.rolled];
      S.rolled++;
      log("RooftopLake", "v1.0 copied to " + name + ", not rebuilt");
      if (quiet) return;
      renderStores(); renderMoment(); renderRail();
    }

    function toggleStore(k) {
      S.paused[k] = S.paused[k] ? 0 : 1;
      log("You", (S.paused[k] ? "stopped at " : "resumed at ") + STORES[k]);
      renderStores(); renderMoment(); renderRail();
      say((S.paused[k] ? "Stopped " : "Resumed ") + AGENTS[S.agent].name + " at " + STORES[k] + ".");
    }
    function killAll() {
      var v = S.paused.every(Boolean) ? 0 : 1;
      if (v) { stop(); clearTimeout(T.adv); T.adv = 0; }
      S.paused = [v, v, v, v, v];
      log("You", v ? "kill switch: stopped at every store" : "resumed at every store, owner signed");
      renderStores(); renderMoment(); renderRail();
      say(v ? "Kill switch on. " + AGENTS[S.agent].name + " stopped at every store. Stopped. Resume to continue." : "Resumed at every store.");
    }

    function play() {
      S.playing = true;
      S.story = 0;
      S.passed = [0, 0, 0, 0, 0, 0, 0, 0];
      renderPlay();
      say("Playing. Five moments, about 15 seconds. Press Stop to pause.");
      step();
    }
    function step() {
      if (!S.playing) return;
      var f = STORY[S.story];
      if (S.story === 0) S.passed = [0, 0, 0, 0, 0, 0, 0, 0];
      go(f[0], { anim: true, play: true });
      T.play = setTimeout(function () {
        S.story = (S.story + 1) % STORY.length;
        step();
      }, f[1]);
    }
    function stop() {
      if (!S.playing) return;
      S.playing = false;
      clearTimeout(T.play);
      renderPlay();
    }

    /* ---------- version tag (travels store to store) ---------- */
    function moveTag(k, hop) {
      S.tagAt = k;
      if (k === -2) { tag.classList.remove("lc-tag-on"); return; }
      var pr = panel.getBoundingClientRect(), x, y;
      if (k === -1) { var ar = $(".lc-sky").getBoundingClientRect(); x = ar.left - pr.left + ar.width / 2; y = ar.top - pr.top + ar.height * 0.45; }
      else {
        var sv = stores[k].querySelector("svg").getBoundingClientRect();
        x = sv.left - pr.left + sv.width * 0.55; y = sv.top - pr.top - 6;
      }
      tag.classList.toggle("lc-tag-jump", !hop || still());
      tag.classList.add("lc-tag-on");
      tag.style.transform = "translate(" + Math.round(x) + "px," + Math.round(y) + "px)";
      if (hop && !still()) { tagIn.classList.remove("lc-hop"); void tagIn.offsetWidth; tagIn.classList.add("lc-hop"); }
    }
    window.addEventListener("resize", function () { if (S.tagAt > -2) moveTag(S.tagAt, false); renderMore(); });

    /* ---------- log ---------- */
    function stamp() {
      S.clock += 3 + ((S.clock * 7) % 5);
      var m = S.clock % 1440, hh = Math.floor(m / 60), mm = m % 60;
      return (hh < 10 ? "0" : "") + hh + ":" + (mm < 10 ? "0" : "") + mm;
    }
    function log(who, text) {
      var t = stamp();
      push('<span class="lc-log-t">' + t + '</span> <span class="lc-log-w">' + esc(who) + "</span> " + esc(text), false);
      $(".lc-last").innerHTML = '<span class="lc-log-t">' + t + "</span> " + esc(who) + ": " + esc(text);
    }
    function divider(text) { push('<span class="lc-log-d">' + esc(text) + "</span>", true); }
    function push(html, div) {
      var li = h("li", div ? "lc-log-div" : "", html);
      logEl.appendChild(li);
      logLines.push(li);
      while (logLines.length > 40) logEl.removeChild(logLines.shift());
      logEl.scrollTop = logEl.scrollHeight;
      $(".lc-linkbtn").setAttribute("aria-label", "See all " + logLines.length + " recorded actions");
    }
    function owner() { var a = AGENTS[S.agent]; return a.ownerName; }
    function logStage(i) {
      var a = AGENTS[S.agent];
      divider("Stage " + (i + 1) + " · " + STAGES[i].n);
      switch (i) {
        case 0: log(owner(), "job sheet drafted"); break;
        case 1: log("IT/ops lead", "data pass granted, " + a.data.filter(function (d) { return d[1]; }).length + " sources"); break;
        case 2: log("RooftopLake", "v0.1 built from " + a.starter.toLowerCase()); break;
        case 3: log("Test", "ran " + a.test[1] + " past cases, " + a.test[0] + " matched"); log("Test", "kill switch tested, works"); break;
        case 4: log("Agent", a.act + " (suggest only)"); break;
        case 5: log("Northside", a.act); break;
        case 6: log("Pat Morgan", "approved group rollout of v1.0"); break;
        default: log("System", "daily health check, all stores reporting");
      }
    }

    /* ---------- render ---------- */
    function say(t) { live.textContent = ""; setTimeout(function () { live.textContent = t; }, 40); }

    function render(o) {
      var i = S.stage;
      chips.forEach(function (c, k) { c.setAttribute("aria-pressed", String(k === S.agent)); });
      tabs.forEach(function (t, k) {
        t.setAttribute("aria-selected", String(k === i));
        t.tabIndex = k === i ? 0 : -1;
        t.classList.toggle("lc-is-active", k === i);
        t.classList.toggle("lc-is-done", k < i);
      });
      panel.setAttribute("aria-labelledby", "lc-tab-" + (i + 1));
      mount.style.setProperty("--lc-progress", (i / 7).toFixed(4));
      scene.setAttribute("data-mode", i < 5 ? "floor" : "live");
      $('[data-act="prev"]').disabled = i === 0;
      $(".lc-kicker").textContent = "Stage " + (i + 1) + " of 8";
      $(".lc-stage-title").textContent = STAGES[i].n;
      $(".lc-line1").textContent = STAGES[i].line;
      if (o.anim) { var c = $(".lc-capt-t"); c.classList.remove("lc-in"); void c.offsetWidth; c.classList.add("lc-in"); }
      if (i < 5) renderArt(o.anim);
      renderMoment(); renderStores(); renderMore(); renderRail(); renderPlay();
    }
    function renderPlay() {
      var p = $(".lc-play");
      p.setAttribute("aria-pressed", String(S.playing));
      p.classList.toggle("lc-is-on", S.playing);
      $(".lc-play-t").textContent = S.playing ? "Stop" : "Play it through";
    }

    function signer(i) {
      var a = AGENTS[S.agent];
      if (SIGN[i] === "owner") return [a.ownerName, i === 7 ? "Monthly review" : ROLES[a.owner]];
      return [SIGN[i], SIGN_SUB[i]];
    }

    function renderArt(anim) {
      var i = S.stage, a = AGENTS[S.agent], title, body, bars = false;
      if (i === 0) { title = "Job sheet"; body = rows(a.job); bars = true; }
      else if (i === 1) {
        title = "Data pass";
        body = '<ul class="lc-pass">' + a.data.map(function (d) {
          return '<li class="' + (d[1] ? "lc-is-yes" : "lc-is-no") + '"><span class="lc-pass-i" aria-hidden="true">' + (d[1] ? "✓" : "✕") + "</span>" + esc(d[0]) +
            '<span class="lc-sr">' + (d[1] ? " (allowed)" : " (blocked)") + "</span></li>";
        }).join("") + "</ul>";
      } else if (i === 2) {
        title = "Version card";
        body = '<div class="lc-ver-big"><span>v0.1</span><small>' + esc(a.starter) + "</small></div>" +
          '<ul class="lc-ticks">' + a.rules.map(function (r) { return "<li>" + esc(r) + "</li>"; }).join("") + "</ul>";
        bars = true;
      } else if (i === 3) {
        title = "Test scorecard";
        var dots = "";
        for (var d = 0; d < a.test[1]; d++) dots += '<span class="' + (d < a.test[0] ? "lc-is-hit" : "lc-is-miss") + '" style="--d:' + (d * 22) + 'ms"></span>';
        body = '<div class="lc-score"><span class="lc-score-n"><span class="lc-count">' + (anim ? 0 : a.test[0]) + "</span><small>/" + a.test[1] + "</small></span>" +
          '<p>past cases ' + esc(a.test[2]) + "</p></div>" +
          '<div class="lc-dots' + (anim ? "" : " lc-go") + '" role="img" aria-label="' + a.test[0] + " of " + a.test[1] + ' past cases matched">' + dots + "</div>";
      } else {
        title = "Shadow report · 2 weeks";
        body = '<table class="lc-table"><thead><tr><th scope="col"><span class="lc-sr">Measure</span></th><th scope="col">Team</th><th scope="col">Agent</th></tr></thead><tbody>' +
          a.shadow.map(function (r) { return '<tr><th scope="row">' + esc(r[0]) + "</th><td>" + esc(r[1]) + "</td><td>" + esc(r[2]) + "</td></tr>"; }).join("") + "</tbody></table>";
      }
      art.innerHTML = '<div class="lc-doc' + (anim ? " lc-in" : "") + '"><div class="lc-doc-h"><span>' + title + '</span><span class="lc-doc-a">' + esc(a.short) + "</span></div>" +
        '<div class="lc-doc-b">' + body + "</div>" +
        '<div class="lc-doc-f">' + (bars ? BARS : "<span></span>") + '<div class="lc-stamp"></div></div></div>';
      renderStamp(false);
      if (i === 3 && anim) {
        var dEl = art.querySelector(".lc-dots"), cEl = art.querySelector(".lc-count"), t0 = 0, dur = 1150, target = a.test[0];
        T.raf = requestAnimationFrame(function f(ts) {
          if (!t0) { t0 = ts; dEl.classList.add("lc-go"); }
          var p = Math.min(1, (ts - t0) / dur);
          cEl.textContent = Math.round(target * (1 - Math.pow(1 - p, 3)));
          if (p < 1) T.raf = requestAnimationFrame(f);
        });
      }
    }

    /* Gate stamp: "Gate: waiting" until the stage is passed, then pressed. Same box either way, so nothing moves. */
    function renderStamp(press) {
      var el = art.querySelector(".lc-stamp");
      if (!el || S.stage > 4) return;
      var ok = !!S.passed[S.stage], sg = signer(S.stage);
      el.className = "lc-stamp" + (ok ? " lc-is-passed" : " lc-is-wait") + (ok && press ? " lc-press" : "");
      el.innerHTML = ok ?
        '<span class="lc-sr">Gate passed. Signed off: </span><span class="lc-stamp-m" aria-hidden="true">Passed</span><span class="lc-stamp-s">' + esc(sg[0]) + "</span>" :
        '<span class="lc-stamp-m">Gate: waiting</span><span class="lc-stamp-s"><span aria-hidden="true">Signs: </span><span class="lc-sr">Signs off: </span>' + esc(sg[0]) + "</span>";
    }

    function renderMoment() {
      var i = S.stage, hd = "", sb = "", allP = S.paused.every(Boolean);
      if (i < 5) return;
      if (allP) { hd = "Stopped everywhere."; sb = "One switch. Every store at once."; }
      else if (i === 5) { hd = "Live at Northside."; sb = "One store · daily cap · kill switch ready"; }
      else if (i === 6) { hd = S.rolled < 5 ? "Same agent. Next store." : "Same agent. Every store."; sb = S.rolled + " of 5 live · rebuilt 0 times"; }
      else { hd = "Watched every day."; sb = "Monthly review · changes go back to Test"; }
      $(".lc-moment-h").textContent = hd;
      $(".lc-moment-s").textContent = sb;
      scene.classList.toggle("lc-stopped", allP);
    }

    function storeState(k) {
      var lit = k < S.rolled;
      if (S.paused[k]) return ["lc-is-paused", "Stopped"];
      if (!lit) return ["", S.stage === 6 ? "Waiting" : "Not live"];
      if (S.stage === 7) return [STATUS8[k] === "Healthy" ? "lc-is-live" : "lc-is-live lc-is-warn", STATUS8[k]];
      return ["lc-is-live", k === 0 && S.stage === 5 ? "Pilot" : "Live"];
    }
    function renderStores() {
      stores.forEach(function (b, k) {
        var s = storeState(k);
        b.className = "lc-store " + s[0];
        b.querySelector(".lc-store-s").textContent = s[1];
        b.setAttribute("aria-pressed", String(!!S.paused[k]));
        b.setAttribute("aria-label", STORES[k] + ": " + s[1] + ". " + (S.paused[k] ? "Press to resume the agent here." : "Press to stop the agent here."));
      });
      mount.style.setProperty("--lc-road", S.rolled <= 1 ? "0" : ((S.rolled - 1) / 4).toFixed(3));
      scene.classList.toggle("lc-stopped", S.paused.every(Boolean));
    }

    /* Reserve the tallest stage's height so the page below never jumps. */
    function renderMore() {
      if (!S.more) return;
      more.style.minHeight = "";
      var tallest = 0;
      for (var k = 0; k < 8; k++) { more.innerHTML = moreHTML(k); tallest = Math.max(tallest, more.offsetHeight); }
      more.innerHTML = moreHTML(S.stage);
      more.style.minHeight = tallest + "px";
    }
    function moreHTML(i) {
      var a = AGENTS[S.agent], sg = signer(i), extra = "";
      if (i === 5) extra = ["Go-live sign-off", a.pilot];
      else if (i === 6) extra = ["Rollout map", "Every store on v1.0. Built once, rebuilt 0 times."];
      else if (i === 7) extra = ["Monthly report", a.report];
      return '<p class="lc-more-what">' + esc(a.what[i]) + "</p>" +
        '<dl class="lc-more-dl">' +
        '<div><dt>Who</dt><dd>' + a.who[i].map(function (k) { return ROLES[k]; }).join(" · ") + "</dd></div>" +
        '<div><dt>The gate</dt><dd>' + esc(STAGES[i].gate) + ' <span class="lc-signed">' + (S.passed[i] ? "Signed: " : "Signs off: ") + esc(sg[0]) + (sg[1] ? ", " + esc(sg[1]) : "") + "</span></dd></div>" +
        (extra ? "<div><dt>" + extra[0] + "</dt><dd>" + esc(extra[1]) + "</dd></div>" : "") +
        "</dl>";
    }

    function renderRail() {
      var a = AGENTS[S.agent], i = S.stage, allP = S.paused.every(Boolean), anyP = S.paused.indexOf(1) > -1;
      var sw = $(".lc-switch");
      $('[data-act="next"]').disabled = i === 7 || allP;
      $(".lc-play").disabled = allP;
      mount.classList.toggle("lc-halted", allP);
      sw.setAttribute("aria-checked", String(allP));
      sw.classList.toggle("lc-is-on", allP);
      var stopped = STORES.filter(function (_, k) { return S.paused[k]; });
      $(".lc-kill-t").textContent = allP ? "Stopped at every store. Resuming needs the owner's OK." :
        anyP ? "Stopped at " + stopped.join(", ") + ". Tap a store again to resume." :
        "Stops this agent at every store. Tap a store to stop just one.";

      var pct = SPEND[i], t, liveN = 0;
      for (var k = 0; k < Math.max(1, S.rolled); k++) if (!S.paused[k]) liveN++;
      if (i < 2) t = "Cap set. Not running yet.";
      else if (allP || (i >= 5 && liveN === 0)) { pct = 0; t = "Stopped. Nothing spent."; }
      else if (i < 5) t = pct + "% of the test budget";
      else t = pct + "% of today's cap";
      var m = $(".lc-meter");
      m.setAttribute("aria-valuenow", String(pct));
      m.setAttribute("aria-valuetext", t);
      mount.style.setProperty("--lc-spend", (pct / 100).toFixed(2));
      $(".lc-spend-t").textContent = t;

      $(".lc-approve-t").textContent = !a.approve ? "Read-only. Nothing reaches a customer." :
        allP ? "Queue held while stopped." :
        i < 5 ? "Drafts only. Nothing sent yet." : "Each message waits for a named person.";
    }

    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (es) { es.forEach(function (e) { if (!e.isIntersecting) stop(); }); }, { threshold: 0.2 }).observe(mount);
    }
    document.addEventListener("visibilitychange", function () { if (document.hidden) stop(); });

    logStage(0);
    render({});
  }

  function boot() {
    var m = document.getElementById("factory-lifecycle");
    if (m && !m.getAttribute("data-lc-ready")) { m.setAttribute("data-lc-ready", "1"); init(m); }
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
