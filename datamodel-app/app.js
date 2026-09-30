const elementNodes = [
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

const elementEdges = [
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

const schemaDetails = {
  mat: [{ table: 'mat2.samletfastejendom', fields: ['bfenummer', 'id_lokalid'] }],
  jord: [{ table: 'mat2.jordstykke', fields: ['matrikelnummer', 'ejerlavlokalid', 'samletfastejendomlokalid'] }],
  byg: [{ table: 'bbr.bygning', fields: ['id_lokalid', 'byg007bygningsnummer', 'byg021bygningensanvendelse', 'jordstykke'] }],
  enhed: [{ table: 'bbr.enhed', fields: ['id_lokalid', 'enh020enhedensanvendelse', 'enh026enhedenssamledeareal', 'bygning'] }],
  adresse: [{ table: 'dar.adresse', fields: ['id_lokalid', 'adressebetegnelse', 'etagebetegnelse', 'doerbetegnelse', 'husnummer'] }],
  hus: [{ table: 'dar.husnummer', fields: ['id_lokalid', 'husnummertekst', 'adgangspunkt', 'jordstykke', 'postnummer'] }],
  vej: [{ table: 'dar.navngivenvej', fields: ['id_lokalid', 'vejnavn', 'vejadresseringsnavn'] }],
  punkt: [{ table: 'dar.adressepunkt', fields: ['id_lokalid', 'position', 'oprindelse_kilde'] }],
  dagi: [
    { table: 'dagi.kommuneinddeling_10m', fields: ['id_lokalid', 'navn', 'kommunekode', 'regionslokalid'] },
    { table: 'dagi.sogneinddeling_10m', fields: ['id_lokalid', 'navn', 'sognekode'] },
    { table: 'dagi.afstemningsomraade_10m', fields: ['id_lokalid', 'navn', 'afstemningsomraadenummer'] },
  ],
  ebr: [{ table: 'ebr.ejendomsbeliggenhed', fields: ['id_lokalid', 'bestemtfastejendombfenr', 'adresselokalid', 'husnummerlokalid'] }],
  ejf: [{ table: 'ejf.ejerskab', fields: ['id_lokalid', 'ejerforholdskode', 'faktiskejerandel_taeller', 'bestemtfastejendombfenr'] }],
  cvr: [
    { table: 'cvrjson.virksomhed', fields: ['cvr_nummer', 'navne', 'hovedbranche'] },
    { table: 'cvrjson.produktionsenhed', fields: ['p_nummer', 'navne', 'hovedbranche'] },
  ],
  vur: [{ table: 'vur_sr2.ejendomsvurdering', fields: ['id', 'ejendomvaerdibeloeb', 'grundvaerdibeloeb', 'aar'] }],
  emo: [{ table: 'emoweb.energy_labels', fields: ['bfe_number', 'energy_label_classification', 'valid_from', 'valid_to'] }],
  geo: [{ table: 'geodanmark_aktuel.bygning', fields: ['id_lokalid', 'bbruuid', 'bygningstype', 'geometri'] }],
  tema: [
    { table: 'plandata.lokalplan_vedtaget', fields: ['planid', 'plannavn', 'datoikraft'] },
    { table: 'dmp.jordforurening_v1', fields: ['objektid', 'jordforure', 'geometri'] },
  ],
  ejerlej: [{ table: 'mat2.ejerlejlighed', fields: ['id_lokalid', 'bfenummer', 'ejerlejlighedsnummer', 'samletfastejendomlokalid'] }],
  ejerlav: [{ table: 'mat2.ejerlav', fields: ['id_lokalid', 'ejerlavskode', 'ejerlavsnavn'] }],
  post: [{ table: 'dar.postnummer', fields: ['id_lokalid', 'postnr', 'navn', 'postnummerinddeling'] }],
  postgeo: [{ table: 'dagi.postnummerinddeling_10m', fields: ['id_lokalid', 'postnummer', 'navn', 'geometri'] }],
  region: [{ table: 'dagi.regionsinddeling_10m', fields: ['id_lokalid', 'regionskode', 'navn', 'geometri'] }],
  dati: [{ table: 'datireg.anvisningsenhed', fields: ['anvisningsenhedsnummer', 'anvisningsenhedsnavn', 'dawaid', 'daginstitutionsnummer'] }],
};

const schemaGraph = window.buildSchemaGraph(window.UNIVERSE_DATA, elementNodes, elementEdges, schemaDetails);
let nodes = elementNodes;
let edges = elementEdges;
let mode = 'elements';
const svg = document.querySelector('svg');
const viewport = document.querySelector('#viewport');
const chooser = document.querySelector('#choose');
const ns = 'http://www.w3.org/2000/svg';
let byId = new Map();
let positions = new Map();
let nodeElements = new Map();
let lines = [];
let selected = 'mat';
let width = 1, height = 1, zoom = 1, panX = 0, panY = 0;
let animation = 0;
let targets;
let drag = null;
let suppressClick = false;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');


function element(tag, attrs, parent) {
  const el = document.createElementNS(ns, tag);
  Object.entries(attrs).forEach(([key, value]) => el.setAttribute(key, value));
  parent.append(el);
  return el;
}

function renderView(nextMode) {
  if (nextMode !== 'elements' && nextMode !== 'schemas') throw new Error(`Unknown map view: ${nextMode}`);
  mode = nextMode;
  document.querySelector('#view-mode').value = mode;
  const url = new URL(location.href);
  if (mode === 'schemas') url.searchParams.set('view', 'schemas');
  else url.searchParams.delete('view');
  history.replaceState(null, '', url);
  nodes = mode === 'schemas' ? schemaGraph.nodes : elementNodes;
  edges = mode === 'schemas' ? schemaGraph.edges : elementEdges;
  byId = new Map(nodes.map(node => [node.id, node]));
  positions = new Map(nodes.map(node => [node.id, { x: 0, y: 0 }]));
  nodeElements = new Map();
  chooser.replaceChildren();
  const edgesGroup = document.querySelector('#edges');
  const nodesGroup = document.querySelector('#nodes');
  edgesGroup.replaceChildren();
  nodesGroup.replaceChildren();
  lines = edges.map(edge => {
    const line = element('path', { class: `edge${edge.spatial ? ' spatial' : ''}` }, edgesGroup);
    element('title', {}, line).textContent = edge.label;
    return line;
  });
  nodes.forEach(node => {
    const group = element('g', {
      class: 'node', role: 'button', tabindex: '0',
      'aria-label': `${node.label} ${node.second} (${mode === 'schemas' ? 'skema' : node.schema}). Sæt i centrum.`,
      'data-id': node.id,
    }, nodesGroup);
    element('rect', { x: -102, y: -36, width: 204, height: 72, rx: 12 }, group);
    element('text', { y: node.second && mode === 'elements' ? -12 : -3 }, group).textContent = node.label;
    if (node.second && mode === 'elements') element('text', { y: 5 }, group).textContent = node.second;
    element('text', { y: 23, class: 'sub' }, group).textContent = mode === 'schemas' ? node.second : node.schema;
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
    option.textContent = mode === 'schemas' ? `${node.label} · ${node.second}` : `${node.label} ${node.second} · ${node.schema}`;
    chooser.append(option);
  });
  document.title = mode === 'schemas' ? 'Datakort · Databaseskemaer' : 'Datakort · Ejendomme og adresser';
  document.querySelector('#map-subtitle').textContent = mode === 'schemas' ? 'Databaseskemaer og deres mulige relationer' : 'Fagligt overblik over ejendomme, adresser og relaterede data';
  document.querySelector('#choose-label').textContent = mode === 'schemas' ? 'Gå til skema' : 'Gå til begreb';
  document.querySelector('#relations-heading').textContent = mode === 'schemas' ? 'Mulige skemarelationer' : 'Direkte forbindelser';
  document.querySelector('.badge').textContent = mode === 'schemas'
    ? `${nodes.length} skemaer · ${edges.length} mulige relationer`
    : `${nodes.length} begreber · Klik for at udforske`;
  document.querySelector('#element-metadata').hidden = mode === 'schemas';
  document.querySelector('#schema-metadata').hidden = mode !== 'schemas';
  document.querySelector('#map-note').textContent = mode === 'schemas'
    ? 'Stregerne viser mulige forbindelser ud fra feltnavne og elementkortets overordnede relationer. De er ikke verificerede fremmednøgler. Ingen streg betyder ikke, at der ingen relation er.'
    : 'Valgt element er blåt. Linjer viser overordnede sammenhænge, ikke nødvendigvis fremmednøgler eller én-til-én-forhold. Stiplet linje viser geografisk overlap. Træk for at flytte kortet, og zoom med musehjulet eller knapperne. Ingen liveforbindelse eller persondata.';
  selected = mode === 'schemas' ? 'dar' : 'mat';
  zoom = 1;
  panX = panY = 0;
  const rect = svg.getBoundingClientRect();
  width = rect.width;
  height = rect.height;
  selectNode(selected, true);
}

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
  const unconnected = nodes.filter(node => !distances.has(node.id));
  if (unconnected.length) {
    radius = Math.max(radius + 255, unconnected.length > 1 ? 245 / (2 * Math.sin(Math.PI / unconnected.length)) : 255);
    unconnected.forEach((node, index) => {
      const angle = index / unconnected.length * Math.PI * 2 - Math.PI / 2;
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

function renderMetadata(id) {
  const container = document.querySelector('#metadata-fields');
  container.replaceChildren();
  const mapped = schemaDetails[id];
  const snapshot = window.DATAMAP_METADATA;
  const formatCount = new Intl.NumberFormat('da-DK');
  const retrievedAt = snapshot && new Intl.DateTimeFormat('da-DK', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' }).format(new Date(snapshot.retrievedAt));
  const intervals = { '1 day': 'Dagligt', '7 days': 'Hver 7. dag', '6 mons': 'Hver 6. måned' };

  mapped.forEach((item, index) => {
    const section = document.createElement('details');
    section.className = 'metadata-table-detail';
    section.open = index === 0;
    const summary = document.createElement('summary');
    const name = document.createElement('code');
    name.textContent = item.table;
    summary.append(name);
    section.append(summary);

    const body = document.createElement('div');
    body.className = 'metadata-table-body';
    const info = snapshot?.tables[item.table];
    if (info) {
      const facts = document.createElement('dl');
      const addFact = (label, value) => {
        if (value === null || value === undefined || value === '') return;
        const term = document.createElement('dt');
        term.textContent = label;
        const definition = document.createElement('dd');
        definition.textContent = value;
        facts.append(term, definition);
      };
      addFact('Kilde', info.source);
      addFact('Beskrivelse', info.description);
      addFact('Interval', intervals[info.updateInterval] || info.updateInterval);
      addFact('Metode', info.updateDescription);
      addFact('Ca. rækker', info.approxRows == null ? null : formatCount.format(info.approxRows));
      addFact('Ca. størrelse', info.approxSize);
      if (info.rightsUrl) {
        const term = document.createElement('dt');
        term.textContent = 'Rettigheder';
        const definition = document.createElement('dd');
        const link = document.createElement('a');
        link.href = info.rightsUrl;
        link.textContent = 'Se vilkår';
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        definition.append(link);
        facts.append(term, definition);
      }
      body.append(facts);
    } else {
      const unavailable = document.createElement('p');
      unavailable.className = 'metadata-unavailable';
      unavailable.textContent = 'Dashboardmetadata er ikke tilgængelige for denne tabel.';
      body.append(unavailable);
    }

    const label = document.createElement('p');
    label.className = 'metadata-label';
    label.textContent = 'Udvalgte felter';
    body.append(label);
    const fields = document.createElement('div');
    fields.className = 'metadata-fields';
    item.fields.forEach(fieldName => {
      const field = document.createElement('code');
      field.className = 'metadata-field';
      field.textContent = fieldName;
      fields.append(field);
    });
    body.append(fields);
    section.append(body);
    container.append(section);
  });
  document.querySelector('#metadata-note').textContent = snapshot
    ? `Dashboardmetadata hentet ${retrievedAt} UTC. Rækkeantal og størrelse er omtrentlige øjebliksbilleder. Feltnavne stammer fra det lokale databaseskema; kortet viser ikke registerværdier.`
    : 'Dashboardmetadata kunne ikke indlæses. Kun feltnavne fra det lokale databaseskema vises.';
}

function renderSchemaMetadata(id) {
  const list = document.querySelector('#schema-datasets');
  list.replaceChildren();
  const datasets = window.UNIVERSE_DATA.nodes.filter(node => node.s === id);
  document.querySelector('#schema-datasets-count').textContent = `${datasets.length} datasæt i ${id}`;
  datasets.forEach(dataset => {
    const item = document.createElement('li');
    item.textContent = dataset.n;
    list.append(item);
  });
  document.querySelector('#schema-datasets-details').open = false;
}

function selectNode(id, immediate = false) {
  if (!byId.has(id)) throw new Error(`Unknown ${mode} node: ${id}`);
  cancelAnimationFrame(animation);
  selected = id;
  targets = layout(id);
  chooser.value = id;
  const node = byId.get(id);
  document.querySelector('#title').textContent = mode === 'schemas' ? node.label : `${node.label} ${node.second}`;
  document.querySelector('#description').textContent = node.description;
  if (mode === 'schemas') renderSchemaMetadata(id);
  else renderMetadata(id);
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
    button.textContent = mode === 'schemas' ? other.label : `${other.label} ${other.second}`;
    const small = document.createElement('small');
    small.textContent = edge.label;
    button.append(small);
    button.addEventListener('click', () => selectNode(other.id));
    neighbors.append(button);
    if (mode === 'schemas') {
      const detail = document.createElement('details');
      detail.className = 'relation-evidence';
      const summary = document.createElement('summary');
      summary.textContent = `Vis ${edge.examples.length} ${edge.examples.length === 1 ? 'forbindelse' : 'forbindelser'}`;
      detail.append(summary);
      const list = document.createElement('ul');
      edge.examples.forEach(example => {
        const item = document.createElement('li');
        item.textContent = example;
        list.append(item);
      });
      detail.append(list);
      neighbors.append(detail);
    }
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
document.querySelector('#view-mode').addEventListener('change', event => renderView(event.target.value));
document.querySelector('#zoom-in').addEventListener('click', () => changeZoom(1.25));
document.querySelector('#zoom-out').addEventListener('click', () => changeZoom(.8));
document.querySelector('#reset').addEventListener('click', () => selectNode(mode === 'schemas' ? 'dar' : 'mat'));
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
renderView(new URL(location.href).searchParams.get('view') === 'schemas' ? 'schemas' : 'elements');
