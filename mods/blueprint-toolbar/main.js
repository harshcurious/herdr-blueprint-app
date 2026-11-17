// A Blueprint button for the window's top bar, beside Herdr's own tab bar
// instead of inside a clone of it. It opens and closes the layout node that
// holds the Blueprint panel (props.panel, default "blueprint-panel") and
// remembers per tab whether it was open: Herdr redraws this block whenever the
// shown tab changes, so each render reads the tab and puts the panel back the
// way that tab had it. Herdr's `tabs` mod stays unmodified and keeps updating.
//
//   { "id": "blueprint-toolbar-button", "type": "block", "size": { "px": 104 },
//     "content": { "mod": "blueprint-toolbar", "props": { "panel": "blueprint-panel", "closes": "panel" } } }
//
// props.closes (optional): a node, or a list, hidden whenever this opens the
// Blueprint panel, so it takes the place of Files/Changes as it did when it
// shared their slot instead of squeezing the terminal beside them.

import { View, svg } from "gpui-kit";
import { h_flex } from "gpui-base";
import { spaces, focused, layout, theme, run, props, checking, notify } from "herdr";
import { createState, step, prune, saved, findNode } from "./panel-state.js";

const KEY = "blueprint-toolbar.open.v1";

function load() {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? "{}");
    return v && typeof v === "object" && !Array.isArray(v) ? v : {};
  } catch { return {}; }
}

function shownTab() {
  return spaces().find((s) => s.active)?.tabs?.find((t) => t.active)?.id ?? focused()?.tab ?? null;
}

export default class BlueprintToolbar extends View {
  init() {
    this.state = createState(load());
  }

  panelId() {
    return props()?.panel || "blueprint-panel";
  }

  // Shows or hides the Blueprint panel; showing it hides what props.closes names.
  set(id, show) {
    if (show) {
      const closes = [props()?.closes ?? []].flat().filter((c) => typeof c === "string" && c !== id);
      for (const other of closes) { const n = findNode(layout(), other); if (n && !n.hidden) run("layout.hide", { id: other }); }
    }
    run(show ? "layout.show" : "layout.hide", { id });
  }

  // Run on every render: Herdr renders this block again after any tab, space
  // or layout change, which is exactly when the panel may need to follow.
  follow(node) {
    if (!node || checking()) return;
    const action = step(this.state, shownTab(), !node.hidden);
    if (action) this.set(node.id, action === "show");
    prune(this.state, spaces().flatMap((s) => (s.tabs ?? []).map((t) => t.id)));
    if (this.state.changed) {
      this.state.changed = false;
      localStorage.setItem(KEY, JSON.stringify(saved(this.state)));
    }
  }

  toggle() {
    const id = this.panelId(), node = findNode(layout(), id);
    if (!node) {
      notify({ title: "Blueprint", body: `This layout has no "${id}" node for the Blueprint panel.`, level: "warning" });
      return;
    }
    this.set(id, Boolean(node.hidden));
  }

  render() {
    const t = theme();
    const node = findNode(layout(), this.panelId());
    this.follow(node);
    const on = Boolean(node && !node.hidden);
    return h_flex().size_full().pr(10).items_center().bg(t.chrome).border_b(1).border_color(t.border)
      .child(h_flex().id("blueprint-toolbar-open").h(26).px(8).gap(5).flex_none()
        .items_center().rounded(6).text_size(12)
        .bg(on ? t.selected : t.chrome).text_color(on ? t.foreground : t.muted)
        .hover((style) => style.bg(t.hover).text_color(t.foreground))
        .on_mouse_down("left", (_event, cx) => cx.stop_propagation())
        .on_click(() => this.toggle())
        .child(svg("mods/blueprint/icon.svg").size(14))
        .child("Blueprint"));
  }
}
