// Which tabs have the Blueprint panel open. The panel is one layout node beside
// the tab; this remembers, per tab, whether it was showing, and on a tab switch
// says what to do so each tab gets back what it had. A tab never seen starts
// closed, except the very first one, which keeps whatever the layout shows.
//
// The layout answers a show or hide a moment later, so after one is asked for,
// the old state isn't taken as a choice until it lands (or a second passes and
// something else won).

export const SETTLE_MS = 1000;

export function createState(open = {}) {
  return { tab: undefined, open: { ...open }, pending: null, changed: false };
}

// One look at the window: `tab` is the shown tab's id, `shown` whether the
// panel is visible. Returns "show", "hide" or null (nothing to do).
export function step(s, tab, shown, now = Date.now()) {
  if (!tab) return null;
  if (tab !== s.tab) {
    const first = s.tab === undefined;
    s.tab = tab;
    s.pending = null;
    if (!(first && !(tab in s.open))) {
      const want = s.open[tab] === true;
      if (want !== shown) {
        s.pending = { want, until: now + SETTLE_MS };
        return want ? "show" : "hide";
      }
    }
  }
  if (s.pending) {
    if (s.pending.want !== shown && now < s.pending.until) return null;
    s.pending = null;
  }
  if (s.open[tab] !== shown) {
    s.open[tab] = shown;
    s.changed = true;
  }
  return null;
}

// Forget tabs that are gone, so the record doesn't grow forever.
export function prune(s, liveTabs) {
  const live = new Set(liveTabs);
  for (const id of Object.keys(s.open)) {
    if (!live.has(id)) { delete s.open[id]; s.changed = true; }
  }
}

// What's worth saving: only open tabs (absent means closed).
export function saved(s) {
  return Object.fromEntries(Object.entries(s.open).filter(([, v]) => v));
}

// A layout node by id, anywhere in the tree.
export function findNode(node, id) {
  if (!node || typeof node !== "object") return null;
  if (node.id === id) return node;
  for (const child of node.children ?? []) {
    const found = findNode(child, id);
    if (found) return found;
  }
  return null;
}
