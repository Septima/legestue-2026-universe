const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const context = vm.createContext({ window: {} });
const root = path.join(__dirname, '..');
for (const file of ['data.js', 'datamodel-app/schema-graph.js']) {
  vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context, { filename: file });
}
const data = context.window.UNIVERSE_DATA;
const app = fs.readFileSync(path.join(__dirname, 'app.js'), 'utf8');
vm.runInContext(app.slice(0, app.indexOf('let nodes = elementNodes;')), context);
const graph = vm.runInContext('schemaGraph', context);
assert.equal(graph.nodes.length, data.schemas.length);
assert.equal(graph.nodes.length, 31);
assert.deepEqual([...graph.nodes.map(node => node.id)].sort(), [...data.schemas.map(schema => schema.name)].sort());
assert.equal(graph.nodes.reduce((sum, node) => sum + node.count, 0), data.nodes.length);
assert.ok(graph.edges.length >= 15, `Only ${graph.edges.length} schema relations`);
assert.equal(new Set(graph.edges.map(edge => `${edge.a}:${edge.b}`)).size, graph.edges.length);
const darDagi = graph.edges.find(edge => edge.a === 'dagi' && edge.b === 'dar');
assert.ok(darDagi);
for (const column of ['kommuneinddeling', 'sogneinddeling', 'afstemningsomraade', 'postnummerinddeling']) {
  assert.ok(darDagi.examples.some(example => example.includes(column)), `Missing DAR-DAGI ${column}`);
}
assert.ok(graph.edges.some(edge => edge.a === 'bbr' && edge.b === 'mat2' && edge.examples.some(example => example.startsWith('Elementkort:'))));
assert.ok(!graph.edges.some(edge => edge.a === 'mat' && edge.b === 'mat2'), 'Same-named datasets alone are not references');
assert.ok(graph.edges.every(edge => edge.examples.length > 0 && edge.a !== edge.b));

const fixture = {
  schemas: [{ name: 'source', size: '1 MB' }, { name: 'target', size: '2 MB' }, { name: 'other', size: '3 MB' }],
  nodes: [
    { s: 'source', n: 'item', c: [['region'], ['address'], ['place']] },
    { s: 'target', n: 'region_10m', c: [] },
    { s: 'target', n: 'region_500m', c: [] },
    { s: 'target', n: 'address', c: [] },
    { s: 'target', n: 'place', c: [] },
    { s: 'other', n: 'place', c: [] },
  ],
  edges: [[0, 3, 4, 'address'], [0, 4, 2, 'same name']],
};
const sample = context.window.buildSchemaGraph(fixture);
assert.equal(sample.edges.length, 1);
assert.equal(sample.edges[0].examples.length, 2);
const references = sample.edges.flatMap(edge => edge.examples);
assert.ok(references.some(example => example.includes('region_*')));
assert.ok(references.some(example => example.includes('source.item.address')));
assert.ok(!references.some(example => example.includes('place')));
console.log('Schema graph: all checks passed');
