/* =========================================================
 * pixel/tree.js — opérations immuables sur l'arbre de calques
 * Toutes les fonctions sont pures (root → nouveau root).
 * ======================================================= */

function walkNodes(list, parent, acc) {
  (list || []).forEach((n) => {
    acc.push({ node: n, parent: parent || null });
    if (n.children) walkNodes(n.children, n, acc);
  });
  return acc;
}
const findNode = (root, id) => walkNodes(root, null, []).find((e) => e.node.id === id) || null;
const firstLayer = (root) => {
  const e = walkNodes(root, null, []).find((x) => x.node.type === "layer");
  return e ? e.node : null;
};
const listGroups = (root) => walkNodes(root, null, []).filter((e) => e.node.type === "group").map((e) => e.node);
const descendantIds = (node) => {
  const out = [];
  const walk = (n) => { out.push(n.id); (n.children || []).forEach(walk); };
  walk(node);
  return out;
};
const countLayers = (root) => walkNodes(root, null, []).filter((x) => x.node.type === "layer").length;

function removeNode(root, id) {
  return (root || []).filter((n) => n.id !== id).map((n) => (n.children ? { ...n, children: removeNode(n.children, id) } : n));
}
function insertNode(root, parentId, node, index) {
  if (parentId == null) {
    const c = (root || []).slice();
    c.splice(Math.min(index, c.length), 0, node);
    return c;
  }
  return (root || []).map((n) => {
    if (n.id === parentId && n.children) {
      const c = n.children.slice();
      c.splice(Math.min(index, c.length), 0, node);
      return { ...n, children: c };
    }
    return n.children ? { ...n, children: insertNode(n.children, parentId, node, index) } : n;
  });
}
function moveNode(root, id, dir) {
  const mutate = (list) => {
    const i = list.findIndex((n) => n.id === id);
    if (i !== -1) {
      const j = i + dir;
      if (j < 0 || j >= list.length) return list;
      const c = list.slice();
      const n = c.splice(i, 1)[0];
      c.splice(j, 0, n);
      return c;
    }
    let changed = false;
    const out = list.map((n) => {
      if (!n.children) return n;
      const ch = mutate(n.children);
      if (ch !== n.children) { changed = true; return { ...n, children: ch }; }
      return n;
    });
    return changed ? out : list;
  };
  return mutate(root || []);
}
function updateNode(root, id, fn) {
  return (root || []).map((n) => (n.id === id ? fn(n) : (n.children ? { ...n, children: updateNode(n.children, id, fn) } : n)));
}
function updateLayerRows(root, id, fn) {
  return updateNode(root, id, (n) => ({ ...n, rows: fn(n.rows) }));
}

/* déplace un nœud sous un autre parent ("root" = racine).
   comparaisons par String() : les ids viennent parfois du DOM (select) */
function reparentNode(root, id, targetId) {
  const entry = findNode(root, id);
  if (!entry) return root;
  const node = entry.node;
  if (targetId !== "root" && String(id) === String(targetId)) return root;
  const groups = listGroups(root).filter(
    (g) => String(g.id) !== String(id) && descendantIds(node).indexOf(g.id) === -1
  );
  const target = targetId === "root" ? null : groups.find((g) => String(g.id) === String(targetId)) || null;
  if (!target && targetId !== "root") return root;
  const removed = removeNode(root, id);
  return insertNode(removed, target ? target.id : null, node, 0);
}

/* options de reparentage valides pour un nœud (utilisé par l'UI) */
function groupOptionsFor(root, node) {
  const opts = [{ id: "root", name: "⬅ racine" }];
  listGroups(root)
    .filter((g) => String(g.id) !== String(node.id) && descendantIds(node).indexOf(g.id) === -1)
    .forEach((g) => opts.push({ id: String(g.id), name: "📁 " + g.name }));
  return opts;
}
function parentValueOf(entries, id) {
  const entry = entries.find((x) => x.node.id === id);
  return entry && entry.parent ? String(entry.parent.id) : "root";
}
