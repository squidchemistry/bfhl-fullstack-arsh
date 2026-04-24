/**
 * Graph Processing Engine
 * =======================
 * Processes directed edge strings ("X->Y") and returns structured
 * hierarchy insights: trees, cycles, invalid/duplicate diagnostics, and summary.
 *
 * Zero external dependencies.
 */

// ─────────────────────────────────────────────
// 1. VALIDATION
// ─────────────────────────────────────────────

/**
 * Validates a single edge string.
 * Accepts only "X->Y" where X, Y ∈ {A-Z} and X ≠ Y.
 *
 * @param {string} raw - The raw edge string (already trimmed by caller).
 * @returns {{ valid: boolean, from?: string, to?: string }}
 */
function validateEdge(raw) {
  const trimmed = raw.trim();
  const match = trimmed.match(/^([A-Z])->([A-Z])$/);

  if (!match) return { valid: false };

  const [, from, to] = match;
  if (from === to) return { valid: false }; // reject self-loops

  return { valid: true, from, to };
}

// ─────────────────────────────────────────────
// 2. PARSING & DEDUPLICATION
// ─────────────────────────────────────────────

/**
 * Parses the input array — validates, deduplicates, and partitions entries.
 *
 * @param {string[]} data
 * @returns {{
 *   edges: Array<{from: string, to: string}>,
 *   invalidEntries: string[],
 *   duplicateEdges: string[]
 * }}
 */
function parseEdges(data) {
  const edges = [];
  const invalidEntries = [];
  const duplicateEdges = [];
  const seen = new Set();

  for (const raw of data) {
    const result = validateEdge(raw);

    if (!result.valid) {
      invalidEntries.push(raw.trim());
      continue;
    }

    const key = `${result.from}->${result.to}`;

    if (seen.has(key)) {
      if (!duplicateEdges.includes(key)) {
        duplicateEdges.push(key);
      }
      continue;
    }

    seen.add(key);
    edges.push({ from: result.from, to: result.to });
  }

  return { edges, invalidEntries, duplicateEdges };
}

// ─────────────────────────────────────────────
// 3. GRAPH CONSTRUCTION
// ─────────────────────────────────────────────

/**
 * Builds an adjacency list with in-degree tracking.
 * Enforces the multi-parent rule: only the first parent of each node is kept.
 *
 * @param {Array<{from: string, to: string}>} edges
 * @returns {{
 *   adjacency: Map<string, string[]>,
 *   inDegree:  Map<string, number>,
 *   nodes:     Set<string>,
 *   parentOf:  Map<string, string>
 * }}
 */
function buildGraph(edges) {
  const adjacency = new Map();
  const inDegree = new Map();
  const nodes = new Set();
  const parentOf = new Map();

  for (const { from, to } of edges) {
    nodes.add(from);
    nodes.add(to);
  }

  for (const node of nodes) {
    adjacency.set(node, []);
    inDegree.set(node, 0);
  }

  for (const { from, to } of edges) {
    if (parentOf.has(to)) continue; // multi-parent → keep first only

    parentOf.set(to, from);
    adjacency.get(from).push(to);
    inDegree.set(to, (inDegree.get(to) || 0) + 1);
  }

  // Deterministic child ordering
  for (const [, children] of adjacency) {
    children.sort();
  }

  return { adjacency, inDegree, nodes, parentOf };
}

// ─────────────────────────────────────────────
// 4. CONNECTED COMPONENTS (undirected)
// ─────────────────────────────────────────────

/**
 * Discovers connected components treating edges as undirected.
 *
 * @param {Map<string, string[]>} adjacency
 * @param {Set<string>} nodes
 * @returns {Set<string>[]}
 */
function findComponents(adjacency, nodes) {
  const visited = new Set();
  const components = [];

  // Build undirected adjacency
  const undirected = new Map();
  for (const node of nodes) undirected.set(node, new Set());
  for (const [parent, children] of adjacency) {
    for (const child of children) {
      undirected.get(parent).add(child);
      undirected.get(child).add(parent);
    }
  }

  for (const node of [...nodes].sort()) {
    if (visited.has(node)) continue;

    const component = new Set();
    const stack = [node];

    while (stack.length > 0) {
      const current = stack.pop();
      if (visited.has(current)) continue;
      visited.add(current);
      component.add(current);
      for (const nb of undirected.get(current)) {
        if (!visited.has(nb)) stack.push(nb);
      }
    }

    components.push(component);
  }

  return components;
}

// ─────────────────────────────────────────────
// 5. ROOT DETECTION
// ─────────────────────────────────────────────

/**
 * Root = in-degree 0 node inside the component.
 * Fallback (cycle): lexicographically smallest node.
 *
 * @param {Set<string>} component
 * @param {Map<string, number>} inDegree
 * @returns {string}
 */
function findRoot(component, inDegree) {
  const roots = [...component].filter(n => (inDegree.get(n) || 0) === 0).sort();
  return roots.length > 0 ? roots[0] : [...component].sort()[0];
}

// ─────────────────────────────────────────────
// 6. CYCLE DETECTION (3-colour DFS)
// ─────────────────────────────────────────────

/**
 * @param {string} _root   (unused — we scan all nodes)
 * @param {Map<string, string[]>} adjacency
 * @param {Set<string>} component
 * @returns {boolean}
 */
function hasCycle(_root, adjacency, component) {
  const WHITE = 0, GRAY = 1, BLACK = 2;
  const color = new Map();
  for (const n of component) color.set(n, WHITE);

  function dfs(node) {
    color.set(node, GRAY);
    for (const child of adjacency.get(node) || []) {
      if (!component.has(child)) continue;
      if (color.get(child) === GRAY) return true;
      if (color.get(child) === WHITE && dfs(child)) return true;
    }
    color.set(node, BLACK);
    return false;
  }

  for (const n of [...component].sort()) {
    if (color.get(n) === WHITE && dfs(n)) return true;
  }
  return false;
}

// ─────────────────────────────────────────────
// 7. TREE CONSTRUCTION
// ─────────────────────────────────────────────

/**
 * Builds nested JSON: { "A": { "B": { "D": {} }, "C": {} } }
 *
 * @param {string} root
 * @param {Map<string, string[]>} adjacency
 * @returns {object}
 */
function buildTree(root, adjacency) {
  const visited = new Set();

  function construct(node) {
    visited.add(node);
    const subtree = {};
    for (const child of adjacency.get(node) || []) {
      if (!visited.has(child)) subtree[child] = construct(child);
    }
    return subtree;
  }

  return { [root]: construct(root) };
}

// ─────────────────────────────────────────────
// 8. DEPTH CALCULATION
// ─────────────────────────────────────────────

/**
 * Longest root-to-leaf path measured in nodes.
 *
 * @param {string} root
 * @param {Map<string, string[]>} adjacency
 * @returns {number}
 */
function calculateDepth(root, adjacency) {
  const visited = new Set();

  function dfs(node) {
    visited.add(node);
    const children = (adjacency.get(node) || []).filter(c => !visited.has(c));
    if (children.length === 0) return 1;
    let max = 0;
    for (const child of children) max = Math.max(max, dfs(child));
    return 1 + max;
  }

  return dfs(root);
}

// ─────────────────────────────────────────────
// 9. PER-COMPONENT PROCESSOR
// ─────────────────────────────────────────────

function processComponent(component, adjacency, inDegree) {
  const root = findRoot(component, inDegree);
  const cycleDetected = hasCycle(root, adjacency, component);

  if (cycleDetected) {
    return { root, tree: {}, has_cycle: true, depth: 0 };
  }

  return {
    root,
    tree: buildTree(root, adjacency),
    has_cycle: false,
    depth: calculateDepth(root, adjacency),
  };
}

// ─────────────────────────────────────────────
// 10. MAIN ENTRY POINT
// ─────────────────────────────────────────────

/**
 * processGraph(data: string[]) → full result object.
 *
 * @param {string[]} data
 * @returns {{
 *   hierarchies: object[],
 *   invalid_entries: string[],
 *   duplicate_edges: string[],
 *   summary: { total_trees: number, total_cycles: number, largest_tree_root: string|null }
 * }}
 */
function processGraph(data) {
  const { edges, invalidEntries, duplicateEdges } = parseEdges(data);
  const { adjacency, inDegree, nodes } = buildGraph(edges);
  const components = findComponents(adjacency, nodes);

  const hierarchies = components
    .map(c => processComponent(c, adjacency, inDegree))
    .sort((a, b) => a.root.localeCompare(b.root));

  // Summary
  const trees = hierarchies.filter(h => !h.has_cycle);
  const cycles = hierarchies.filter(h => h.has_cycle);

  let largestTreeRoot = null;
  let maxDepth = 0;
  for (const h of trees) {
    if (
      h.depth > maxDepth ||
      (h.depth === maxDepth && (largestTreeRoot === null || h.root < largestTreeRoot))
    ) {
      maxDepth = h.depth;
      largestTreeRoot = h.root;
    }
  }

  return {
    hierarchies,
    invalid_entries: invalidEntries,
    duplicate_edges: duplicateEdges,
    summary: {
      total_trees: trees.length,
      total_cycles: cycles.length,
      largest_tree_root: largestTreeRoot,
    },
  };
}

module.exports = { processGraph };
