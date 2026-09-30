(() => {
  'use strict';
  function buildSchemaGraph(data, elementNodes = [], elementEdges = [], tableMapping = {}) {
    if (!data || !Array.isArray(data.schemas) || !Array.isArray(data.nodes) || !Array.isArray(data.edges)) {
      throw new Error('Schema graph requires the universe data export');
    }
    const counts = new Map(data.schemas.map(schema => [schema.name, 0]));
    const names = new Set();
    const scaled = new Map();
    data.nodes.forEach(node => {
      if (!counts.has(node.s)) throw new Error(`Unknown schema: ${node.s}`);
      counts.set(node.s, counts.get(node.s) + 1);
      names.add(`${node.s}.${node.n}`);
      const match = node.n.match(/^(.*)_(?:10m|500m|2000m)$/);
      if (match) {
        const family = scaled.get(match[1]) || new Set();
        family.add(node.s);
        scaled.set(match[1], family);
      }
    });
    const relations = new Map();
    function add(sourceSchema, targetSchema, example) {
      if (sourceSchema === targetSchema || !counts.has(sourceSchema) || !counts.has(targetSchema)) return;
      const pair = [sourceSchema, targetSchema].sort();
      const key = pair.join(':');
      const relation = relations.get(key) || { a: pair[0], b: pair[1], examples: new Set() };
      relation.examples.add(example);
      relations.set(key, relation);
    }
    data.edges.forEach(([a, b, kind, column]) => {
      if (kind !== 4) return;
      const source = data.nodes[a], target = data.nodes[b];
      if (!source || !target || typeof column !== 'string') throw new Error('Invalid column reference in universe data');
      add(source.s, target.s, `Feltnavn: ${source.s}.${source.n}.${column} → ${target.s}.${target.n}`);
    });
    data.nodes.forEach(source => {
      for (const [column] of source.c || []) {
        if (names.has(`${source.s}.${column}`)) continue;
        const family = scaled.get(column);
        if (!family || family.has(source.s)) continue;
        const targets = [...family].filter(schema => schema !== source.s);
        if (targets.length === 1) add(source.s, targets[0], `Feltnavn: ${source.s}.${source.n}.${column} → ${targets[0]}.${column}_*`);
      }
    });
    const elementById = new Map(elementNodes.map(node => [node.id, node]));
    elementEdges.forEach(edge => {
      const source = elementById.get(edge.a), target = elementById.get(edge.b);
      if (!source || !target || !tableMapping[edge.a] || !tableMapping[edge.b]) {
        throw new Error('Element relation is missing a mapped dataset');
      }
      const sourceSchemas = new Set(tableMapping[edge.a].map(item => item.table.split('.')[0]));
      const targetSchemas = new Set(tableMapping[edge.b].map(item => item.table.split('.')[0]));
      for (const a of sourceSchemas) for (const b of targetSchemas) {
        add(a, b, `Elementkort: ${source.label} ↔ ${target.label} (${edge.label})`);
      }
    });
    return {
      nodes: data.schemas.map(schema => ({
        id: schema.name, label: schema.name, second: `${counts.get(schema.name)} datas\u00e6t`,
        description: `${counts.get(schema.name)} datas\u00e6t i databaseskemaet${schema.size ? ` \u00b7 ca. ${schema.size}` : ''}.`,
        count: counts.get(schema.name), size: schema.size,
      })),
      edges: [...relations.values()].map(relation => ({
        ...relation, examples: [...relation.examples].sort(),
        label: `${relation.examples.size} ${relation.examples.size === 1 ? 'mulig forbindelse' : 'mulige forbindelser'}`,
      })),
    };
  }
  window.buildSchemaGraph = buildSchemaGraph;
})();
