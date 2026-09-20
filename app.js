/* Aurora 배포 페이지 — 동작.
   테마 적용, 화면 이동(레일·사이드바·탭), 재현 화면의 그래프·플로우 생성,
   내려받기 버튼의 OS 판별을 담당한다. 외부 라이브러리를 쓰지 않는다. */

(function () {
  'use strict';

  var themes = window.AURORA_THEMES || [];
  var root = document.documentElement;
  var STORE_KEY = 'aurora-site-theme';

  /* ── 테마 ───────────────────────────────────────────── */

  function readStored() {
    try { return localStorage.getItem(STORE_KEY); } catch (e) { return null; }
  }
  function writeStored(id) {
    try { localStorage.setItem(STORE_KEY, id); } catch (e) { /* 사생활 보호 모드 등 */ }
  }

  function relLuminance(hex) {
    var v = hex.replace('#', '');
    if (v.length === 3) v = v[0] + v[0] + v[1] + v[1] + v[2] + v[2];
    var ch = [0, 2, 4].map(function (o) {
      var c = parseInt(v.slice(o, o + 2), 16) / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return ch[0] * 0.2126 + ch[1] * 0.7152 + ch[2] * 0.0722;
  }
  function contrast(a, b) {
    var x = relLuminance(a);
    var y = relLuminance(b);
    return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
  }

  /* 액센트를 배경으로 쓰는 버튼의 글자색.
     앱은 흰색 고정이지만, 밝은 액센트 테마에서는 흰 글자가 2.7:1 까지 떨어진다.
     테마가 주는 글자색·배경색 중 액센트와 대비가 큰 쪽을 고른다. */
  function onAccent(colors) {
    var accent = colors['--accent'];
    var options = [colors['--text-primary'], colors['--bg-primary']];
    var best = options[0];
    var bestRatio = 0;
    options.forEach(function (c) {
      var r = contrast(accent, c);
      if (r > bestRatio) { bestRatio = r; best = c; }
    });
    return best;
  }

  function applyTheme(theme) {
    if (!theme) return;
    Object.keys(theme.colors).forEach(function (token) {
      root.style.setProperty(token, theme.colors[token]);
    });
    root.style.setProperty('--on-accent', onAccent(theme.colors));
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', theme.colors['--bg-secondary']);
    root.setAttribute('data-theme', theme.id);
    root.setAttribute('data-dark', String(!!theme.dark));

    var foot = document.getElementById('footTheme');
    if (foot) foot.textContent = theme.name;

    document.querySelectorAll('[data-theme-id]').forEach(function (el) {
      el.setAttribute('aria-pressed', String(el.getAttribute('data-theme-id') === theme.id));
    });
    writeStored(theme.id);
  }

  function themeById(id) {
    for (var i = 0; i < themes.length; i += 1) if (themes[i].id === id) return themes[i];
    return null;
  }

  function swatchColors(theme) {
    return theme.palette || [
      theme.colors['--bg-primary'], theme.colors['--bg-secondary'],
      theme.colors['--accent'], theme.colors['--text-primary'], theme.colors['--highlight'],
    ];
  }

  function buildThemeUI() {
    var grid = document.getElementById('themeGrid');
    var list = document.getElementById('themeList');
    var count = document.getElementById('themeCount');
    var inline = document.getElementById('themesInlineCount');
    if (count) count.textContent = String(themes.length);
    if (inline) inline.textContent = String(themes.length);

    themes.forEach(function (theme) {
      var colors = swatchColors(theme);

      if (grid) {
        var card = document.createElement('button');
        card.type = 'button';
        card.className = 'theme';
        card.setAttribute('data-theme-id', theme.id);
        card.setAttribute('aria-pressed', 'false');
        var strip = document.createElement('span');
        strip.className = 'theme-strip';
        colors.forEach(function (c) {
          var i = document.createElement('i');
          i.style.background = c;
          strip.appendChild(i);
        });
        var name = document.createElement('span');
        name.className = 'theme-name';
        name.textContent = theme.name;
        card.appendChild(strip);
        card.appendChild(name);
        card.addEventListener('click', function () { applyTheme(theme); });
        grid.appendChild(card);
      }

      if (list) {
        var row = document.createElement('button');
        row.type = 'button';
        row.className = 'pop-item';
        row.setAttribute('data-theme-id', theme.id);
        row.setAttribute('aria-pressed', 'false');
        var sw = document.createElement('span');
        sw.className = 'swatch';
        colors.forEach(function (c) {
          var i = document.createElement('i');
          i.style.background = c;
          sw.appendChild(i);
        });
        var label = document.createElement('span');
        label.textContent = theme.name;
        row.appendChild(sw);
        row.appendChild(label);
        row.addEventListener('click', function () { applyTheme(theme); });
        list.appendChild(row);
      }
    });
  }

  /* ── 테마 팝오버 ─────────────────────────────────────── */

  function setupThemePopover() {
    var btn = document.getElementById('themeBtn');
    var pop = document.getElementById('themePop');
    if (!btn || !pop) return;

    function close() {
      pop.hidden = true;
      btn.setAttribute('aria-expanded', 'false');
    }
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      var open = pop.hidden;
      pop.hidden = !open;
      btn.setAttribute('aria-expanded', String(open));
      if (open) {
        var active = pop.querySelector('[aria-pressed="true"]');
        if (active) active.scrollIntoView({ block: 'nearest' });
      }
    });
    document.addEventListener('click', function (e) {
      if (!pop.hidden && !pop.contains(e.target) && e.target !== btn) close();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !pop.hidden) { close(); btn.focus(); }
    });
  }

  /* ── 화면 이동과 활성 표시 ───────────────────────────── */

  var SECTIONS = ['intro', 'local', 'editor', 'graph', 'chat', 'flow', 'sheet', 'themes', 'install', 'faq'];
  var TITLES = {
    intro: 'Aurora 소개', local: '내 파일, 내 컴퓨터', editor: '에디터', graph: '그래프',
    chat: 'AI 채팅', flow: '플로우', sheet: '시트 · 드로잉', themes: '테마',
    install: '설치 안내', faq: '자주 묻는 질문',
  };
  var INSTALL_TAB = ['install', 'faq'];

  function prefersReducedMotion() {
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function gotoSection(id) {
    var el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });
    /* 키보드·스크린리더 사용자에게는 스크롤만으로 아무 일도 일어나지 않는다.
       도착한 섹션으로 포커스를 옮겨 읽는 위치를 맞춘다. */
    el.setAttribute('tabindex', '-1');
    el.focus({ preventScroll: true });
    closeSidebar();
  }

  function markActive(id) {
    document.querySelectorAll('[data-goto]').forEach(function (el) {
      el.setAttribute('aria-current', String(el.getAttribute('data-goto') === id));
    });
    var tab = INSTALL_TAB.indexOf(id) >= 0 ? 'install' : 'intro';
    document.querySelectorAll('[data-tab]').forEach(function (el) {
      el.setAttribute('aria-current', String(el.getAttribute('data-tab') === tab));
    });
    var title = document.getElementById('docTitle');
    if (title) title.textContent = TITLES[id] || 'Aurora 소개';
  }

  function setupNav() {
    document.querySelectorAll('[data-goto]').forEach(function (el) {
      el.addEventListener('click', function () { gotoSection(el.getAttribute('data-goto')); });
    });
    document.querySelectorAll('[data-tab]').forEach(function (el) {
      el.addEventListener('click', function () { gotoSection(el.getAttribute('data-tab')); });
    });

    var ticking = false;
    function update() {
      ticking = false;
      var line = window.innerHeight * 0.28;
      var current = SECTIONS[0];
      for (var i = 0; i < SECTIONS.length; i += 1) {
        var el = document.getElementById(SECTIONS[i]);
        if (el && el.getBoundingClientRect().top <= line) current = SECTIONS[i];
      }
      markActive(current);
    }
    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    }
    var pane = document.getElementById('pane');
    if (pane) pane.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    update();
  }

  /* ── 좁은 화면의 사이드바 ────────────────────────────── */

  var side = document.getElementById('side');
  var scrim = document.getElementById('scrim');

  function openSidebar() {
    if (!side) return;
    side.classList.add('open');
    if (scrim) scrim.hidden = false;
  }
  function closeSidebar() {
    if (!side) return;
    side.classList.remove('open');
    if (scrim) scrim.hidden = true;
  }
  function setupSidebar() {
    var open = document.getElementById('sideOpen');
    var close = document.getElementById('sideClose');
    if (open) open.addEventListener('click', openSidebar);
    if (close) close.addEventListener('click', closeSidebar);
    if (scrim) scrim.addEventListener('click', closeSidebar);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeSidebar();
    });
  }

  /* ── 메모 화면 / 실제 파일 토글 ──────────────────────── */

  function setupRawToggle() {
    var a = document.getElementById('viewRendered');
    var b = document.getElementById('viewRaw');
    var rendered = document.getElementById('renderedView');
    var raw = document.getElementById('rawView');
    if (!a || !b || !rendered || !raw) return;

    function show(isRaw) {
      rendered.hidden = isRaw;
      raw.hidden = !isRaw;
      a.setAttribute('aria-pressed', String(!isRaw));
      b.setAttribute('aria-pressed', String(isRaw));
    }
    a.addEventListener('click', function () { show(false); });
    b.addEventListener('click', function () { show(true); });
  }

  /* ── 그래프 재현 ─────────────────────────────────────── */

  var GRAPH_NODES = [
    { id: 'idea', label: '제품 아이디어', x: 350, y: 140, r: 22, z: 0 },
    { id: 'meet', label: '회의록', x: 168, y: 74, r: 15, z: 0.6 },
    { id: 'itv', label: '인터뷰 정리', x: 140, y: 212, r: 15, z: -0.5 },
    { id: 'road', label: '로드맵', x: 540, y: 88, r: 15, z: 0.35 },
    { id: 'week', label: '주간 보고', x: 566, y: 218, r: 15, z: -0.6 },
    { id: 'tag', label: '#제품', x: 330, y: 40, r: 11, z: 0.8 },
    { id: 'res', label: '리서치', x: 416, y: 254, r: 15, z: -0.3 },
    { id: 'word', label: '용어 사전', x: 58, y: 140, r: 11, z: 0.2 },
  ];
  var GRAPH_EDGES = [
    ['idea', 'meet'], ['idea', 'itv'], ['idea', 'road'], ['idea', 'tag'],
    ['meet', 'tag'], ['road', 'week'], ['idea', 'res'], ['itv', 'word'],
    ['meet', 'word'], ['road', 'res'],
  ];
  var NS = 'http://www.w3.org/2000/svg';

  function el(name, attrs) {
    var node = document.createElementNS(NS, name);
    Object.keys(attrs || {}).forEach(function (k) { node.setAttribute(k, attrs[k]); });
    return node;
  }

  /* 3D 는 같은 그래프를 원근으로 눕혀 본 것이다. 앱의 3D 뷰가 하는 일과 같은 성격이라
     버튼을 장식으로 두지 않고 실제로 배치를 바꾼다. */
  function project(n, mode) {
    if (mode !== '3d') return { x: n.x, y: n.y, r: n.r, far: 0 };
    var z = n.z || 0;
    return {
      x: 350 + (n.x - 350) * 0.92 + z * 60,
      y: 150 + (n.y - 150) * 0.78 - z * 34,
      r: n.r * (1 + z * 0.2),
      far: z < -0.2 ? 1 : 0,
    };
  }

  function buildGraph() {
    var edgeLayer = document.getElementById('graphEdges');
    var nodeLayer = document.getElementById('graphNodes');
    if (!edgeLayer || !nodeLayer) return;

    var byId = {};
    GRAPH_NODES.forEach(function (n) { byId[n.id] = n; });
    var mode = '2d';

    GRAPH_EDGES.forEach(function (pair, i) {
      var a = byId[pair[0]];
      var b = byId[pair[1]];
      var line = el('line', {
        x1: a.x, y1: a.y, x2: b.x, y2: b.y,
        class: 'edge draw', 'data-a': pair[0], 'data-b': pair[1],
      });
      var len = Math.round(Math.hypot(b.x - a.x, b.y - a.y));
      line.style.setProperty('--len', len);
      line.style.animationDelay = (i * 40) + 'ms';
      edgeLayer.appendChild(line);
    });

    GRAPH_NODES.forEach(function (n, i) {
      var g = el('g', { class: 'node', 'data-id': n.id, tabindex: '0', role: 'button' });
      g.setAttribute('aria-label', n.label + ' 메모');
      var c = el('circle', { cx: n.x, cy: n.y, r: n.r });
      c.style.setProperty('--i', i);
      var t = el('text', { x: n.x, y: n.y + n.r + 14 });
      t.textContent = n.label;
      g.appendChild(c);
      g.appendChild(t);

      function toggle() {
        var on = g.classList.contains('on');
        nodeLayer.querySelectorAll('.node').forEach(function (x) { x.classList.remove('on'); });
        edgeLayer.querySelectorAll('.edge').forEach(function (x) { x.classList.remove('on', 'off'); });
        if (on) return;
        g.classList.add('on');
        edgeLayer.querySelectorAll('.edge').forEach(function (line) {
          var touches = line.getAttribute('data-a') === n.id || line.getAttribute('data-b') === n.id;
          line.classList.add(touches ? 'on' : 'off');
          if (touches) {
            var other = line.getAttribute('data-a') === n.id ? line.getAttribute('data-b') : line.getAttribute('data-a');
            var target = nodeLayer.querySelector('.node[data-id="' + other + '"]');
            if (target) target.classList.add('on');
          }
        });
      }
      g.addEventListener('click', toggle);
      g.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
      });
      nodeLayer.appendChild(g);
    });

    function relayout() {
      var pos = {};
      GRAPH_NODES.forEach(function (n) { pos[n.id] = project(n, mode); });
      nodeLayer.querySelectorAll('.node').forEach(function (g) {
        var n = byId[g.getAttribute('data-id')];
        var p = pos[n.id];
        var c = g.querySelector('circle');
        var t = g.querySelector('text');
        c.setAttribute('cx', p.x);
        c.setAttribute('cy', p.y);
        c.setAttribute('r', p.r.toFixed(1));
        t.setAttribute('x', p.x);
        t.setAttribute('y', (p.y + p.r + 14).toFixed(1));
        g.style.opacity = p.far ? '0.72' : '1';
      });
      edgeLayer.querySelectorAll('.edge').forEach(function (line) {
        var a = pos[line.getAttribute('data-a')];
        var b = pos[line.getAttribute('data-b')];
        line.setAttribute('x1', a.x); line.setAttribute('y1', a.y);
        line.setAttribute('x2', b.x); line.setAttribute('y2', b.y);
      });
    }

    document.querySelectorAll('[data-graph-mode]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        mode = btn.getAttribute('data-graph-mode');
        document.querySelectorAll('[data-graph-mode]').forEach(function (b) {
          b.setAttribute('aria-pressed', String(b === btn));
        });
        relayout();
      });
    });
  }

  /* ── 플로우 캔버스 재현 ──────────────────────────────── */

  var FLOW_NODES = [
    { x: 6, y: 16, glyph: '⏰', title: '예약 실행', sub: '매일 08:00' },
    { x: 248, y: 16, glyph: '📁', title: '폴더', sub: '회의록/' },
    { x: 490, y: 16, glyph: '📝', title: 'AI 요약', sub: 'llama3.1:8b' },
    { x: 127, y: 142, glyph: '🏷', title: 'AI 태그 분류', sub: '#회의 #미완료' },
    { x: 369, y: 142, glyph: '🆕', title: '파일 생성', sub: '검토 후 저장', on: true },
  ];
  var FLOW_EDGES = [
    'M210,45 H248',
    'M452,45 H490',
    'M592,74 C592,116 400,90 229,142',
    'M331,171 H369',
  ];
  var NODE_W = 204;
  var NODE_H = 58;

  function buildFlow() {
    var edgeLayer = document.getElementById('flowEdges');
    var nodeLayer = document.getElementById('flowNodes');
    if (!edgeLayer || !nodeLayer) return;

    FLOW_EDGES.forEach(function (d, i) {
      var p = el('path', { d: d, class: 'fedge draw' });
      edgeLayer.appendChild(p);
      var len = Math.ceil(p.getTotalLength ? p.getTotalLength() : 400);
      p.style.setProperty('--len', len);
      p.style.animationDelay = (120 + i * 120) + 'ms';
    });

    FLOW_NODES.forEach(function (n, i) {
      var g = el('g', { class: 'fnode' + (n.on ? ' on' : '') });
      g.style.setProperty('--i', i);
      g.style.animationDelay = (i * 80) + 'ms';
      g.appendChild(el('rect', {
        x: n.x, y: n.y, width: NODE_W, height: NODE_H, rx: 8, class: 'fnode-box',
      }));
      var glyph = el('text', { x: n.x + 14, y: n.y + 35, class: 'fglyph' });
      glyph.textContent = n.glyph;
      var title = el('text', { x: n.x + 38, y: n.y + 26, class: 'fnode-title' });
      title.textContent = n.title;
      var sub = el('text', { x: n.x + 38, y: n.y + 42, class: 'fnode-sub' });
      sub.textContent = n.sub;
      g.appendChild(glyph);
      g.appendChild(title);
      g.appendChild(sub);
      g.appendChild(el('circle', { cx: n.x, cy: n.y + NODE_H / 2, r: 4, class: 'fport' }));
      g.appendChild(el('circle', { cx: n.x + NODE_W, cy: n.y + NODE_H / 2, r: 4, class: 'fport' }));
      nodeLayer.appendChild(g);
    });
  }

  /* ── 등장 모션 ───────────────────────────────────────── */

  function setupReveal() {
    var targets = document.querySelectorAll('.reveal');
    if (!('IntersectionObserver' in window)) {
      targets.forEach(function (t) { t.classList.add('seen'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('seen');
        io.unobserve(entry.target);
      });
    }, { threshold: 0.25 });
    targets.forEach(function (t) { io.observe(t); });
  }

  /* ── 내려받기 버튼 ───────────────────────────────────── */

  function detectOS() {
    var ua = navigator.userAgent || '';
    var platform = (navigator.userAgentData && navigator.userAgentData.platform) || navigator.platform || '';
    if (/Mac|iPhone|iPad|iPod/i.test(platform + ua)) return 'mac';
    if (/Win/i.test(platform + ua)) return 'win';
    if (/Linux|Android/i.test(platform + ua)) return 'linux';
    return 'win';
  }

  function setupDownloads() {
    var os = detectOS();
    var win = document.getElementById('dlWin');
    var mac = document.getElementById('dlMac');
    var top = document.getElementById('topDownload');
    var topLabel = document.getElementById('topDownloadLabel');

    var primary = os === 'mac' ? mac : win;
    if (primary) primary.classList.add('is-primary');
    if (os === 'mac' && win && mac && mac.parentNode) mac.parentNode.insertBefore(mac, win);

    if (top && primary) {
      top.setAttribute('href', primary.getAttribute('href'));
      top.setAttribute('download', '');
      if (topLabel) topLabel.textContent = os === 'mac' ? 'macOS용 받기' : 'Windows용 받기';
    }

    /* 설치 파일이 아직 downloads/ 에 없으면 버튼만 멀쩡해 보이는 상태가 된다.
       두 곳(맨 위·맨 아래)의 버튼 묶음 모두에 안내를 붙인다. */
    function notice(text, danger) {
      document.querySelectorAll('.dl').forEach(function (group) {
        var next = group.nextElementSibling;
        if (next && next.classList.contains('dl-missing')) return;
        var p = document.createElement('p');
        p.className = 'dl-note dl-missing';
        if (danger) p.style.color = 'var(--danger)';
        p.textContent = text;
        group.parentNode.insertBefore(p, group.nextSibling);
      });
    }

    /* file:// 로 열면 존재 확인 자체가 불가능하다. 확인을 건너뛰되 침묵하지는 않는다. */
    if (!/^https?:$/.test(location.protocol)) {
      notice('로컬 파일로 열어 본 상태입니다. 설치 파일을 downloads/ 폴더에 넣어야 버튼이 동작합니다.', false);
      return;
    }

    /* 외부 호스트(GitHub Releases 등)에 올린 파일은 CORS 때문에 HEAD 확인이
       항상 실패한다. 파일이 있어도 “없음” 으로 잡히므로 확인 대상에서 뺀다. */
    var local = [];
    document.querySelectorAll('.dl-btn').forEach(function (btn) {
      try {
        if (new URL(btn.getAttribute('href'), location.href).origin === location.origin) local.push(btn);
      } catch (e) { /* 이상한 href 는 건드리지 않는다 */ }
    });
    if (!local.length) return;

    var missing = 0;
    var pending = local.length;
    local.forEach(function (btn) {
      fetch(btn.getAttribute('href'), { method: 'HEAD' })
        .then(function (res) { if (!res.ok) missing += 1; })
        .catch(function () { missing += 1; })
        .then(function () {
          pending -= 1;
          if (pending === 0 && missing) {
            notice('설치 파일이 아직 downloads/ 폴더에 없습니다. 빌드한 설치 파일을 그 폴더에 넣으면 버튼이 동작합니다.', true);
          }
        });
    });
  }

  /* ── 시작 ────────────────────────────────────────────── */

  /* 화면을 먼저 보이게 하고, 그 다음에 기능을 붙인다.
     아래에서 하나가 실패하더라도 페이지 내용은 그대로 읽을 수 있어야 한다. */
  requestAnimationFrame(function () { document.body.classList.add('booted'); });

  [buildThemeUI, setupThemePopover, setupNav, setupSidebar, setupRawToggle,
    buildGraph, buildFlow, setupReveal, setupDownloads].forEach(function (step) {
    try { step(); } catch (e) { if (window.console) console.error(e); }
  });

  var stored = readStored();
  applyTheme(themeById(stored) || themes[0]);
}());
