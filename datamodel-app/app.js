const nodes = [
  ['mat', 'Ejendom / BFE', 'Matriklen · mat2', 'Samlet fast ejendom er udgangspunktet for jordstykker, ejerskab og beliggenhed. Ejerlejligheder har også egne BFE-numre.'],
  ['jord', 'Jordstykker', 'Matriklen · mat2', 'Matriklens jordstykker forbinder ejendomme med bygninger, ejerlav og geografiske temaer.'],
  ['byg', 'Bygninger', 'BBR', 'Bygninger med enheder, jordstykkehenvisninger og forbindelse til GeoDanmarks bygningsgeometri.'],
  ['enhed', 'Enheder', 'BBR', 'Bolig- og erhvervsenheder med forbindelse til bygning og DAR-adresse.'],
  ['adresse', 'Adresser', 'DAR', 'Adresser med etage og dør. Flere adresser kan høre til samme husnummer.'],
  ['hus', 'Husnumre', 'DAR', 'Forbinder adresser med vej, adressepunkt, jordstykke og administrative områder.'],
  ['vej', 'Navngivne veje', 'DAR', 'Vejobjekter, som husnumrene henviser til.'],
  ['punkt', 'Adressepunkter', 'DAR', 'Geografiske punkter til placering af adresser på kortet.'],
  ['dagi', 'Kommuner, sogne og', 'DAGI', 'Husnumre har referencer til kommuner, sogne og afstemningsområder. Regionforbindelsen går via kommunen.', false, 'afstemningsområder'],
  ['ebr', 'Ejendommens', 'EBR', 'Forbinder BFE-nummer med ejendommens beliggenhedsadresse eller husnummer.', false, 'beliggenhed'],
  ['ejf', 'Ejerskab og ejerskifte', 'Ejerfortegnelsen · EJF', 'Ejere, ejerandele og ejerskifte knyttes til ejendommen via BFE-nummer.'],
  ['cvr', 'Virksomheder', 'CVR', 'Virksomheder og produktionsenheder kan forbindes til virksomhedsejere med CVR- og P-numre.'],
  ['vur', 'Ejendomsvurderinger', 'VUR', 'Vurderinger forbindes via BFE-krydsreferencer. En ejendom kan have flere vurderinger over tid.'],
  ['emo', 'Energimærker', 'EMO', 'BFE-nummer giver en ejendomskobling. Et bestemt energimærke kræver også hensyn til bygning og gyldighed.'],
  ['geo', 'Bygningsgeometri', 'GeoDanmark', 'Bygningspolygoner kobles til BBR gennem bbruuid.'],
  ['tema', 'Planer og miljø', 'Geografisk overlap', 'Jordstykker kan overlappe lokalplaner, beskyttelsesområder og jordforurening. Dette er en rumlig relation, ikke en id-nøgle.'],
  ['ejerlej', 'Ejerlejligheder', 'Matriklen · mat2', 'Ejerlejligheder har egne BFE-numre og kan referere til den samlede faste ejendom.', true],
  ['ejerlav', 'Ejerlav', 'Matriklen · mat2', 'Jordstykker refererer til ejerlav via ejerlavlokalid.', true],
  ['post', 'Postnumre', 'DAR', 'Postnummerobjekter henviser til deres geografiske postnummerinddeling i DAGI.', true],
  ['postgeo', 'Postnummerområder', 'DAGI', 'Geografiske afgrænsninger af postnumrene.', true],
  ['region', 'Regioner', 'DAGI', 'Kommunernes regionslokalid forbinder dem med regionerne.', true],
  ['dati', 'Daginstitutioner', 'Anvisningsenheder · datireg', 'Anvisningsenhedernes dawaid henviser til DAR-adresser.', true],
].map(([id, label, schema, description, added = false, second = '']) => ({ id, label, schema, description, added, second }));

const edges = [
  ['mat', 'jord', 'Ejendoms-id'], ['mat', 'ejerlej', 'Samlet fast ejendoms lokal-id'],
  ['jord', 'ejerlav', 'Ejerlavets lokal-id'], ['jord', 'byg', 'Jordstykke-id'],
  ['byg', 'enhed', 'Bygnings-id'], ['enhed', 'adresse', 'Adresse-id'],
  ['adresse', 'hus', 'Husnummer-id'], ['hus', 'jord', 'Jordstykke-id'],
  ['hus', 'vej', 'Navngivenvejs-id'], ['hus', 'punkt', 'Adgangspunkt-id'],
  ['hus', 'post', 'Postnummer-id'], ['post', 'postgeo', 'Postnummerinddelingens id'],
  ['hus', 'dagi', 'Administrative område-id’er'], ['dagi', 'region', 'Kommunens regionslokalid'],
  ['dati', 'adresse', 'dawaid / adresse-id'], ['mat', 'ebr', 'BFE-nummer'],
  ['ebr', 'adresse', 'Adresse-id'], ['mat', 'ejf', 'BFE-nummer'],
  ['ejf', 'cvr', 'CVR- / P-nummer'], ['mat', 'vur', 'BFE-krydsreference'],
  ['mat', 'emo', 'BFE-nummer'], ['byg', 'geo', 'Bygnings-id / bbruuid'],
  ['jord', 'tema', 'Geografisk overlap', true],
].map(([a, b, label, spatial = false]) => ({ a, b, label, spatial }));

const svg = document.querySelector('svg');
const viewport = document.querySelector('#viewport');
const chooser = document.querySelector('#choose');
const ns = 'http://www.w3.org/2000/svg';
const byId = new Map(nodes.map(node => [node.id, node]));
const positions = new Map(nodes.map(node => [node.id, { x: 0, y: 0 }]));
const nodeElements = new Map();
let selected = 'mat';
let width = 1, height = 1, zoom = 1, panX = 0, panY = 0;
let animation = 0;
let targets;
let drag = null;
let suppressClick = false;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

document.querySelector('.badge').textContent = `${nodes.length} elementer · Klik for at udforske`;

function element(tag, attrs, parent) {
  const el = document.createElementNS(ns, tag);
  Object.entries(attrs).forEach(([key, value]) => el.setAttribute(key, value));
  parent.append(el);
  return el;
}

const lines = edges.map(edge => {
  const line = element('path', { class: `edge${edge.spatial ? ' spatial' : ''}` }, document.querySelector('#edges'));
  element('title', {}, line).textContent = edge.label;
  return line;
});

nodes.forEach(node => {
  const group = element('g', {
    class: `node${node.added ? ' added' : ''}`, role: 'button', tabindex: '0',
    'aria-label': `${node.label} ${node.second} (${node.schema}). Sæt i centrum.`,
    'data-id': node.id,
  }, document.querySelector('#nodes'));
  element('rect', { x: -102, y: -36, width: 204, height: 72, rx: 12 }, group);
  element('text', { y: node.second ? -12 : -3 }, group).textContent = node.label;
  if (node.second) element('text', { y: 5 }, group).textContent = node.second;
  element('text', { y: 23, class: 'sub' }, group).textContent = node.schema;
  group.addEventListener('click', () => { if (!suppressClick) selectNode(node.id); });
  group.addEventListener('keydown', event => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      selectNode(node.id);
    }
  });
  nodeElements.set(node.id, group);
  const option = document.createElement('option');
  option.value = node.id;
  option.textContent = `${node.label} ${node.second} · ${node.schema}`;
  chooser.append(option);
});

// Breadth-first rings put direct neighbors nearest the selected object.
function layout(id) {
  const distances = new Map([[id, 0]]);
  const queue = [id];
  for (const current of queue) {
    for (const edge of edges) {
      const other = edge.a === current ? edge.b : edge.b === current ? edge.a : null;
      if (other && !distances.has(other)) {
        distances.set(other, distances.get(current) + 1);
        queue.push(other);
      }
    }
  }
  const result = new Map([[id, { x: 0, y: 0 }]]);
  const max = Math.max(...distances.values());
  let radius = 0;
  for (let level = 1; level <= max; level++) {
    const ring = nodes.filter(node => distances.get(node.id) === level);
    // Keep centers farther apart than a node's diagonal, including across rings.
    radius = Math.max(radius + 255, ring.length > 1 ? 245 / (2 * Math.sin(Math.PI / ring.length)) : 255);
    ring.forEach((node, index) => {
      const angle = (index / ring.length) * Math.PI * 2 - Math.PI / 2 + level * .17;
      result.set(node.id, { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius });
    });
  }
  return result;
}

function transform() {
  viewport.setAttribute('transform', `translate(${width / 2 + panX},${height / 2 + panY}) scale(${zoom})`);
}

function boundary(from, to) {
  const dx = to.x - from.x, dy = to.y - from.y;
  const factor = Math.min(102 / (Math.abs(dx) || 1e-9), 36 / (Math.abs(dy) || 1e-9), .5);
  return { x: from.x + dx * factor, y: from.y + dy * factor };
}

function draw() {
  nodes.forEach(node => {
    const p = positions.get(node.id);
    nodeElements.get(node.id).setAttribute('transform', `translate(${p.x},${p.y})`);
  });
  edges.forEach((edge, index) => {
    const a = positions.get(edge.a), b = positions.get(edge.b);
    const start = boundary(a, b), end = boundary(b, a);
    lines[index].setAttribute('d', `M${start.x},${start.y} L${end.x},${end.y}`);
  });
  transform();
}

function fitScale(points) {
  const values = [...points.values()];
  const extentX = Math.max(...values.map(p => Math.abs(p.x))) + 120;
  const extentY = Math.max(...values.map(p => Math.abs(p.y))) + 60;
  return Math.min(1.2, Math.max(.04, Math.min((width - 40) / (extentX * 2), (height - 120) / (extentY * 2))));
}

function selectNode(id, immediate = false) {
  cancelAnimationFrame(animation);
  selected = id;
  targets = layout(id);
  chooser.value = id;
  const node = byId.get(id);
  document.querySelector('#title').textContent = `${node.label} ${node.second}`;
  document.querySelector('#description').textContent = node.description;
  const neighbors = document.querySelector('#neighbors');
  neighbors.replaceChildren();
  nodes.forEach(n => {
    const group = nodeElements.get(n.id);
    group.classList.toggle('selected', n.id === id);
    group.setAttribute('aria-pressed', String(n.id === id));
  });
  edges.forEach((edge, index) => {
    const active = edge.a === id || edge.b === id;
    lines[index].classList.toggle('active', active);
    if (!active) return;
    const other = byId.get(edge.a === id ? edge.b : edge.a);
    const button = document.createElement('button');
    button.textContent = `${other.label} ${other.second}`;
    const small = document.createElement('small');
    small.textContent = edge.label;
    button.append(small);
    button.addEventListener('click', () => selectNode(other.id));
    neighbors.append(button);
  });
  const initial = new Map([...positions].map(([key, value]) => [key, { ...value }]));
  const startZoom = zoom, startX = panX, startY = panY;
  const endZoom = Math.max(.85, fitScale(targets));
  const start = performance.now();
  const duration = immediate || reducedMotion.matches ? 0 : 750;
  function tick(now) {
    const progress = duration ? Math.min(1, (now - start) / duration) : 1;
    const eased = 1 - Math.pow(1 - progress, 3);
    targets.forEach((end, key) => {
      const begin = initial.get(key);
      positions.set(key, { x: begin.x + (end.x - begin.x) * eased, y: begin.y + (end.y - begin.y) * eased });
    });
    zoom = startZoom + (endZoom - startZoom) * eased;
    panX = startX * (1 - eased);
    panY = startY * (1 - eased);
    draw();
    if (progress < 1) animation = requestAnimationFrame(tick);
    else animation = 0;
  }
  animation = requestAnimationFrame(tick);
}

function finishAnimation() {
  if (!animation) return;
  cancelAnimationFrame(animation);
  animation = 0;
  targets.forEach((point, id) => positions.set(id, { ...point }));
  panX = panY = 0;
  draw();
}

function changeZoom(factor, x = width / 2, y = height / 2) {
  finishAnimation();
  const next = Math.max(.04, Math.min(3, zoom * factor));
  panX = x - width / 2 - (x - width / 2 - panX) * next / zoom;
  panY = y - height / 2 - (y - height / 2 - panY) * next / zoom;
  zoom = next;
  transform();
}

chooser.addEventListener('change', () => selectNode(chooser.value));
document.querySelector('#zoom-in').addEventListener('click', () => changeZoom(1.25));
document.querySelector('#zoom-out').addEventListener('click', () => changeZoom(.8));
document.querySelector('#reset').addEventListener('click', () => selectNode('mat'));
document.querySelector('#fit').addEventListener('click', () => {
  finishAnimation();
  zoom = fitScale(positions);
  panX = panY = 0;
  transform();
});
svg.addEventListener('wheel', event => {
  event.preventDefault();
  const rect = svg.getBoundingClientRect();
  changeZoom(Math.exp(-Math.max(-100, Math.min(100, event.deltaY)) * .002), event.clientX - rect.left, event.clientY - rect.top);
}, { passive: false });
svg.addEventListener('pointerdown', event => {
  if (event.button !== 0 || event.target.closest('.node') || drag) return;
  finishAnimation();
  suppressClick = false;
  drag = { id: event.pointerId, x: event.clientX, y: event.clientY, px: panX, py: panY };
  svg.setPointerCapture(event.pointerId);
});
svg.addEventListener('pointermove', event => {
  if (!drag || drag.id !== event.pointerId) return;
  const dx = event.clientX - drag.x, dy = event.clientY - drag.y;
  if (Math.hypot(dx, dy) > 4) suppressClick = true;
  panX = drag.px + dx;
  panY = drag.py + dy;
  svg.classList.add('dragging');
  transform();
});
function endDrag(event) {
  if (!drag || drag.id !== event.pointerId) return;
  drag = null;
  svg.classList.remove('dragging');
  if (svg.hasPointerCapture(event.pointerId)) svg.releasePointerCapture(event.pointerId);
  setTimeout(() => { suppressClick = false; }, 0);
}
svg.addEventListener('pointerup', endDrag);
svg.addEventListener('pointercancel', endDrag);
svg.addEventListener('lostpointercapture', endDrag);
new ResizeObserver(() => {
  const rect = svg.getBoundingClientRect();
  width = rect.width;
  height = rect.height;
  selectNode(selected, true);
}).observe(svg);
