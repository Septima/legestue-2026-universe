(() => {
  'use strict';
  const { nodes, edges } = window.UNIVERSE_DATA;
  const canvas = document.getElementById('universe');
  const ctx = canvas.getContext('2d');
  const search = document.getElementById('search');
  const results = document.getElementById('search-results');
  const schemasEl = document.getElementById('schemas');
  const mobileSchema = document.getElementById('mobile-schema');
  const inspector = document.getElementById('inspector');
  const inspectorBody = document.getElementById('inspector-body');
  const tooltip = document.getElementById('tooltip');
  const caption = document.getElementById('caption');
  const motionButton = document.getElementById('motion');
  const kindNames = ['Column match', 'View of', 'Variant', 'Same name'];
  const kindColors = ['#7bded0', '#a79cf3', '#7799af', '#e8bc7c'];
  const colors = ['#8fe2d2','#edb989','#b6a9f0','#88c7ed','#e29fb2','#b0d58f','#e6d18e','#82d1ce','#c2b6f4','#e5a77e','#a1c5eb','#c6da9c','#edaaa9','#8acabb','#d3b4e7','#c8d589','#e8c191','#9db6df','#d2a8ac','#9bd9a8','#d9c2ee','#84b9d3','#e1bb9a'];
  const schemaNames = [...new Set(nodes.map(n => n.s))].sort((a, b) => nodes.filter(n => n.s === b).length - nodes.filter(n => n.s === a).length);
  const groups = new Map(schemaNames.map((s, i) => [s, { name: s, color: colors[i % colors.length], ids: [], x: 0, y: 0, z: 0 }]));
  nodes.forEach((n, i) => { n.id = i; n.neighbors = []; groups.get(n.s).ids.push(i); });
  edges.forEach(([a, b, kind, label]) => {
    nodes[a].neighbors.push({ id: b, kind, label });
    nodes[b].neighbors.push({ id: a, kind, label });
  });
  document.getElementById('table-count').textContent = nodes.length;
  document.getElementById('schema-count').textContent = groups.size;
  document.getElementById('link-count').textContent = edges.length;
  document.getElementById('schema-list-count').textContent = 'ALL ' + groups.size;

  let seed = 374831;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) | 0; return (seed >>> 0) / 4294967296; };
  // Spherical constellation centers. Local spring layout keeps related tables close.
  schemaNames.forEach((s, i) => {
    const g = groups.get(s);
    const y = 1 - (i + .5) / schemaNames.length * 2;
    const angle = i * Math.PI * (3 - Math.sqrt(5));
    const radius = Math.sqrt(1 - y * y) * 315;
    g.x = Math.cos(angle) * radius; g.y = y * 315; g.z = Math.sin(angle) * radius;
    const spread = 24 + Math.sqrt(g.ids.length) * 9;
    for (const id of g.ids) {
      const n = nodes[id];
      n.x = g.x + (random() - .5) * spread * 2;
      n.y = g.y + (random() - .5) * spread * 2;
      n.z = g.z + (random() - .5) * spread * 2;
    }
  });
  for (let step = 0; step < 85; step++) {
    for (const g of groups.values()) {
      for (let i = 0; i < g.ids.length; i++) {
        const a = nodes[g.ids[i]];
        a.x += (g.x - a.x) * .008;
        a.y += (g.y - a.y) * .008;
        a.z += (g.z - a.z) * .008;
        for (let j = i + 1; j < g.ids.length; j++) {
          const b = nodes[g.ids[j]];
          const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z;
          const d = Math.hypot(dx, dy, dz) || 1;
          if (d < 20) {
            const force = (20 - d) / d * .08;
            a.x -= dx * force; a.y -= dy * force; a.z -= dz * force;
            b.x += dx * force; b.y += dy * force; b.z += dz * force;
          }
        }
      }
    }
    for (const [ai, bi] of edges) {
      const a = nodes[ai], b = nodes[bi];
      if (a.s !== b.s) continue;
      const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z;
      const d = Math.hypot(dx, dy, dz) || 1;
      if (d > 34) {
        const force = (d - 34) / d * .018;
        a.x += dx * force; a.y += dy * force; a.z += dz * force;
        b.x -= dx * force; b.y -= dy * force; b.z -= dz * force;
      }
    }
  }
  const stars = Array.from({ length: 160 }, () => ({ x: random(), y: random(), size: .3 + random() * 1.2, alpha: .08 + random() * .32 }));
  let width = 0, height = 0, dpr = 1;
  function resize() {
    width = innerWidth; height = innerHeight; dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  addEventListener('resize', resize); resize();
  let yaw = -.35, pitch = -.19, zoom = 1, targetYaw = null, targetPitch = null;
  let rotating = true, selected = null, hovered = null, activeSchema = null, query = '';
  let dragging = false, moved = false, lastX = 0, lastY = 0, downX = 0, downY = 0;
  const projected = new Array(nodes.length);
  const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
  function project(x, y, z) {
    const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
    const xx = x * cy - z * sy, zz = x * sy + z * cy;
    const yy = y * cp - zz * sp, depth = y * sp + zz * cp;
    const camera = 1100;
    const scale = 850 * zoom / (camera - depth);
    const fit = Math.min(1, width / 1150, height / 780);
    return { x: width * .5 + xx * scale * fit, y: height * (width < 650 ? .54 : .51) - yy * scale * fit, z: depth, scale: scale * fit };
  }
  function isVisible(n) { return !activeSchema || n.s === activeSchema; }
  function isMatch(n) { return !query || (n.s + '.' + n.n).toLowerCase().includes(query) || n.c.some(c => c.toLowerCase().includes(query)); }
  function alphaFor(n) {
    if (!isVisible(n)) return 0;
    if (selected !== null) return n.id === selected ? 1 : nodes[selected].neighbors.some(r => r.id === n.id) ? .95 : .20;
    return isMatch(n) ? 1 : .12;
  }
  function line(a, b, color, opacity, thickness = 1) {
    ctx.strokeStyle = color; ctx.globalAlpha = opacity; ctx.lineWidth = thickness;
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
  }
  function draw(time) {
    requestAnimationFrame(draw);
    if (!dragging && targetYaw !== null) {
      let diff = ((targetYaw - yaw + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
      yaw += diff * .07; pitch += (targetPitch - pitch) * .07;
      if (Math.abs(diff) < .002 && Math.abs(targetPitch - pitch) < .002) targetYaw = null;
    } else if (!dragging && rotating) yaw += .00045;
    ctx.clearRect(0, 0, width, height);
    for (const star of stars) {
      ctx.globalAlpha = star.alpha * (.8 + .2 * Math.sin(time * .0007 + star.x * 20));
      ctx.fillStyle = '#b9d9e6'; ctx.beginPath(); ctx.arc(star.x * width, star.y * height, star.size, 0, Math.PI * 2); ctx.fill();
    }
    const groupProjections = new Map();
    for (const g of groups.values()) groupProjections.set(g.name, project(g.x, g.y, g.z));
    for (const g of groups.values()) {
      if (activeSchema && activeSchema !== g.name) continue;
      const p = groupProjections.get(g.name);
      const rad = clamp((25 + Math.sqrt(g.ids.length) * 8) * p.scale, 18, 100);
      const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, rad);
      gradient.addColorStop(0, g.color + '1e'); gradient.addColorStop(1, g.color + '00');
      ctx.globalAlpha = activeSchema ? 1 : .65;
      ctx.fillStyle = gradient; ctx.beginPath(); ctx.arc(p.x, p.y, rad, 0, Math.PI * 2); ctx.fill();
    }
    nodes.forEach((n, i) => { projected[i] = project(n.x, n.y, n.z); });
    for (const [a, b, kind] of edges) {
      const na = nodes[a], nb = nodes[b];
      if (!isVisible(na) || !isVisible(nb)) continue;
      const highlighted = selected !== null && (selected === a || selected === b);
      const fade = selected !== null ? (highlighted ? 1 : .13) : (isMatch(na) || isMatch(nb) ? 1 : .15);
      const depth = clamp((projected[a].z + projected[b].z + 850) / 1400, .25, 1);
      if (kind === 3) ctx.setLineDash([3, 5]);
      line(projected[a], projected[b], kindColors[kind], (highlighted ? .8 : kind === 0 ? .3 : .2) * fade * depth, highlighted ? 1.5 : .8);
      if (kind === 3) ctx.setLineDash([]);
    }
    // Paint back to front, so nearer points cover distant ones.
    const order = nodes.map((_, i) => i).sort((a, b) => projected[a].z - projected[b].z);
    for (const id of order) {
      const n = nodes[id], p = projected[id], alpha = alphaFor(n);
      if (!alpha || p.x < -15 || p.x > width + 15 || p.y < -15 || p.y > height + 15) continue;
      const g = groups.get(n.s);
      const important = id === hovered || id === selected;
      const radius = (n.t ? 2.2 : 2.9) * clamp(p.scale, .65, 1.5) + (n.neighbors.length > 3 ? .7 : 0);
      const depthAlpha = clamp((p.z + 470) / 880, .38, 1);
      ctx.globalAlpha = alpha * depthAlpha;
      if (important || n.neighbors.length > 5) {
        ctx.fillStyle = g.color;
        ctx.globalAlpha = alpha * .13;
        ctx.beginPath(); ctx.arc(p.x, p.y, important ? 16 : 10, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = alpha;
      }
      if (important) {
        ctx.strokeStyle = g.color; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(p.x, p.y, 9, 0, Math.PI * 2); ctx.stroke();
      }
      ctx.fillStyle = g.color; ctx.beginPath(); ctx.arc(p.x, p.y, important ? 4.6 : radius, 0, Math.PI * 2); ctx.fill();
      if (!n.t && alpha > .8) {
        ctx.globalAlpha = alpha * .55; ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(.8, radius * .32), 0, Math.PI * 2); ctx.fill();
      }
    }
    // Schema labels are location markers, not additional nodes.
    ctx.textBaseline = 'middle'; ctx.font = '600 10px ui-sans-serif, system-ui, sans-serif';
    for (const g of groups.values()) {
      if (activeSchema && activeSchema !== g.name) continue;
      if (width < 650 && !activeSchema) continue;
      const p = groupProjections.get(g.name);
      if (p.z < 10 && !activeSchema) continue;
      if (p.y < 123 || p.y > height - 105) continue;
      if ((p.x < 305 || p.x > width - 305) && width > 850) continue;
      const label = g.name.toUpperCase() + '  /  ' + g.ids.length;
      const tw = ctx.measureText(label).width;
      const x = p.x - tw / 2 - 10, y = p.y + 19;
      ctx.globalAlpha = activeSchema ? .95 : clamp((p.z + 200) / 470, .25, .8);
      ctx.fillStyle = '#0c1c2bd9'; ctx.fillRect(x, y, tw + 20, 22);
      ctx.fillStyle = g.color; ctx.fillRect(x, y, 2, 22);
      ctx.fillStyle = '#d3e8e9'; ctx.fillText(label, x + 10, y + 11);
    }
    if (selected !== null && isVisible(nodes[selected])) {
      const p = projected[selected], n = nodes[selected];
      const label = n.n;
      ctx.font = '600 12px ui-sans-serif, system-ui, sans-serif';
      const tw = ctx.measureText(label).width;
      let x = clamp(p.x + 15, 8, width - tw - 24), y = clamp(p.y - 28, 8, height - 24);
      ctx.globalAlpha = 1; ctx.fillStyle = '#0c2530'; ctx.fillRect(x, y, tw + 16, 23);
      ctx.strokeStyle = groups.get(n.s).color; ctx.lineWidth = 1; ctx.strokeRect(x, y, tw + 16, 23);
      ctx.fillStyle = '#edfbf8'; ctx.fillText(label, x + 8, y + 12);
    }
    ctx.globalAlpha = 1;
  }
  requestAnimationFrame(draw);

  function setMotion(value) {
    rotating = value; motionButton.textContent = value ? 'Ⅱ' : '▶';
    motionButton.title = value ? 'Pause rotation' : 'Resume rotation'; motionButton.setAttribute('aria-label', motionButton.title);
  }
  motionButton.addEventListener('click', () => { targetYaw = null; setMotion(!rotating); });
  document.getElementById('reset').addEventListener('click', () => {
    activeSchema = null; query = ''; search.value = ''; zoom = 1; yaw = -.35; pitch = -.19;
    selected = null; hovered = null; targetYaw = null; setMotion(true); tooltip.hidden = true;
    updateSchemaControls(); updateResults(); updateInspector();
  });
  function updateSchemaControls() {
    schemasEl.replaceChildren(); mobileSchema.replaceChildren();
    const all = [{ name: null, ids: nodes.map((_, i) => i), color: '#91dccc' }, ...schemaNames.map(s => groups.get(s))];
    for (const g of all) {
      const row = document.createElement('button'); row.type = 'button';
      row.className = 'schema-row' + (activeSchema === g.name ? ' active' : '');
      row.style.setProperty('--swatch', g.color);
      const dot = document.createElement('span'); dot.className = 'swatch';
      const label = document.createElement('span'); label.className = 'schema-name'; label.textContent = g.name || 'All schemas';
      const count = document.createElement('span'); count.className = 'schema-count'; count.textContent = g.ids.length;
      row.append(dot, label, count);
      row.addEventListener('click', () => chooseSchema(g.name)); schemasEl.append(row);
      const option = document.createElement('option'); option.value = g.name || ''; option.textContent = (g.name || 'All schemas') + ' (' + g.ids.length + ')'; mobileSchema.append(option);
    }
    mobileSchema.value = activeSchema || '';
    caption.textContent = activeSchema ? activeSchema.toUpperCase() + ' · SCHEMA CONSTELLATION' : 'ALL SCHEMAS · 3D OVERVIEW';
  }
  function chooseSchema(s) {
    activeSchema = s; selected = null; hovered = null; tooltip.hidden = true;
    updateSchemaControls(); updateInspector(); updateResults();
    if (s) focusPoint(groups.get(s));
  }
  mobileSchema.addEventListener('change', () => chooseSchema(mobileSchema.value || null));
  function focusPoint(point) {
    targetYaw = Math.atan2(point.x, point.z);
    targetPitch = Math.atan2(point.y, Math.hypot(point.x, point.z));
    setMotion(false);
  }
  function chooseNode(id) {
    if (activeSchema && nodes[id].s !== activeSchema) { activeSchema = null; updateSchemaControls(); }
    selected = id; hovered = null; tooltip.hidden = true;
    focusPoint(nodes[id]); updateInspector();
  }
  function updateResults() {
    query = search.value.trim().toLowerCase();
    if (!query) { results.hidden = true; results.replaceChildren(); return; }
    results.hidden = false; results.replaceChildren();
    const rank = n => n.n.toLowerCase() === query ? 0 : n.n.toLowerCase().startsWith(query) ? 1 : n.n.toLowerCase().includes(query) ? 2 : n.s.toLowerCase().includes(query) ? 3 : 4;
    const matches = nodes.filter(isMatch).sort((a, b) => rank(a) - rank(b) || a.n.localeCompare(b.n)).slice(0, 12);
    if (!matches.length) { const empty = document.createElement('div'); empty.className = 'no-results'; empty.textContent = 'No matching tables or columns'; results.append(empty); return; }
    for (const n of matches) {
      const row = document.createElement('button'); row.className = 'search-result'; row.type = 'button';
      row.textContent = n.n;
      const meta = document.createElement('small'); meta.textContent = n.s + ' · ' + n.c.length + ' columns'; row.append(meta);
      row.addEventListener('click', () => { chooseNode(n.id); results.hidden = true; search.blur(); }); results.append(row);
    }
  }
  search.addEventListener('input', updateResults);
  document.addEventListener('keydown', e => {
    if (e.key === '/' && document.activeElement !== search) { e.preventDefault(); search.focus(); }
    if (e.key === 'Escape') { search.blur(); results.hidden = true; tooltip.hidden = true; }
  });
  function heading(text, number) {
    const h = document.createElement('h3'); h.className = 'detail-heading'; h.textContent = text;
    const num = document.createElement('span'); num.textContent = number; h.append(num); return h;
  }
  function updateInspector() {
    inspector.classList.toggle('has-selection', selected !== null);
    if (selected === null) {
      inspectorBody.innerHTML = '<div class="empty-visual"><div class="orbit orbit-one"></div><div class="orbit orbit-two"></div><span>✳</span></div><p class="empty-kicker">AWAITING SELECTION</p><h2>Every point<br>has a story.</h2><p class="empty-copy">Click a star or search for a table to see its columns and connected neighbors.</p>';
      return;
    }
    const n = nodes[selected], g = groups.get(n.s);
    inspectorBody.replaceChildren(); inspectorBody.style.setProperty('--accent', g.color);
    const schema = document.createElement('p'); schema.className = 'detail-schema'; schema.textContent = '✳  ' + n.s;
    const title = document.createElement('h2'); title.className = 'detail-title'; title.textContent = n.n;
    const badges = document.createElement('div'); badges.className = 'detail-badges';
    for (const text of [n.t ? 'VIEW' : 'BASE TABLE', n.c.length + ' COLUMNS', n.neighbors.length + ' LINKS']) {
      const badge = document.createElement('span'); badge.className = 'detail-badge' + (text === 'VIEW' || text === 'BASE TABLE' ? ' kind' : ''); badge.textContent = text; badges.append(badge);
    }
    inspectorBody.append(schema, title, badges, heading('CONNECTED TABLES', String(n.neighbors.length).padStart(2, '0')));
    if (!n.neighbors.length) {
      const empty = document.createElement('p'); empty.className = 'relation-none'; empty.textContent = 'No name-based relationship detected for this table.'; inspectorBody.append(empty);
    }
    const relations = [...n.neighbors].sort((a, b) => a.kind - b.kind);
    const relationRows = relations.map(rel => {
      const other = nodes[rel.id];
      const row = document.createElement('button'); row.type = 'button'; row.className = 'relation-row'; row.textContent = other.s + '.' + other.n;
      const small = document.createElement('small'); small.style.setProperty('--rel-color', kindColors[rel.kind]);
      const dot = document.createElement('i'); small.append(dot, document.createTextNode(kindNames[rel.kind] + (rel.kind === 0 ? ' · ' + rel.label : '')));
      row.append(small); row.addEventListener('click', () => chooseNode(rel.id)); return row;
    });
    relationRows.slice(0, 5).forEach(row => inspectorBody.append(row));
    if (relations.length > 5) {
      const more = document.createElement('button'); more.className = 'show-more'; more.textContent = 'SHOW ALL ' + relations.length + ' CONNECTIONS ↓';
      more.addEventListener('click', () => { more.replaceWith(...relationRows.slice(5)); }); inspectorBody.append(more);
    }
    inspectorBody.append(heading('COLUMNS', String(n.c.length).padStart(2, '0')));
    const columns = document.createElement('ul'); columns.className = 'column-list';
    n.c.forEach((c, i) => { const item = document.createElement('li'); item.textContent = c; if (i >= 8) item.hidden = true; columns.append(item); });
    inspectorBody.append(columns);
    if (n.c.length > 8) {
      const more = document.createElement('button'); more.className = 'show-more'; more.textContent = 'SHOW ALL ' + n.c.length + ' COLUMNS ↓';
      more.addEventListener('click', () => { columns.querySelectorAll('[hidden]').forEach(item => item.hidden = false); more.remove(); }); inspectorBody.append(more);
    }
    inspectorBody.scrollTop = 0;
  }
  function hitTest(x, y) {
    let best = null, distance = 13;
    for (let i = 0; i < nodes.length; i++) {
      if (!isVisible(nodes[i]) || !projected[i]) continue;
      const p = projected[i], d = Math.hypot(x - p.x, y - p.y);
      if (d < distance) { best = i; distance = d; }
    }
    return best;
  }
  canvas.addEventListener('pointerdown', e => {
    dragging = true; moved = false; lastX = downX = e.clientX; lastY = downY = e.clientY;
    canvas.setPointerCapture(e.pointerId); canvas.classList.add('dragging');
  });
  canvas.addEventListener('pointermove', e => {
    if (dragging) {
      if (Math.hypot(e.clientX - downX, e.clientY - downY) > 4) moved = true;
      if (moved) { targetYaw = null; yaw += (e.clientX - lastX) * .006; pitch = clamp(pitch + (e.clientY - lastY) * .006, -1.48, 1.48); setMotion(false); }
      lastX = e.clientX; lastY = e.clientY; return;
    }
    hovered = hitTest(e.clientX, e.clientY);
    if (hovered !== null) {
      const n = nodes[hovered];
      tooltip.replaceChildren(document.createTextNode(n.n));
      const meta = document.createElement('small'); meta.textContent = n.s + ' · ' + (n.t ? 'VIEW' : 'TABLE'); tooltip.append(meta);
      tooltip.style.left = clamp(e.clientX + 15, 8, width - 260) + 'px';
      tooltip.style.top = clamp(e.clientY + 15, 8, height - 65) + 'px'; tooltip.hidden = false;
    } else tooltip.hidden = true;
    canvas.style.cursor = hovered !== null ? 'pointer' : 'grab';
  });
  function endDrag(e) {
    if (!dragging) return;
    dragging = false; canvas.classList.remove('dragging');
    if (!moved && e.type === 'pointerup') { const id = hitTest(e.clientX, e.clientY); if (id !== null) chooseNode(id); }
  }
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);
  canvas.addEventListener('pointerleave', () => { if (!dragging) { hovered = null; tooltip.hidden = true; } });
  canvas.addEventListener('wheel', e => { e.preventDefault(); zoom = clamp(zoom * Math.exp(-e.deltaY * .001), .55, 2.6); }, { passive: false });
  updateSchemaControls();
})();
