// The top-bar Blueprint button: it opens and closes the Blueprint panel beside
// Herdr's own tab bar, and each tab gets the panel back the way it left it.
import { test } from "node:test";
import assert from "node:assert/strict";
import { state } from "./herdr-stub.mjs";
import { createState, step, prune, saved, findNode, SETTLE_MS } from "../mods/blueprint-toolbar/panel-state.js";
import Toolbar from "../mods/blueprint-toolbar/main.js";

test("the first tab keeps what the layout shows; an unseen tab starts closed", () => {
  const s = createState();
  assert.equal(step(s, "a", true, 0), null);
  assert.deepEqual(saved(s), { a: true });
  assert.equal(step(s, "b", true, 10), "hide");
});

test("switching back to a tab puts its panel back", () => {
  const s = createState();
  step(s, "a", false, 0);
  step(s, "a", true, 10);                   // opened in a
  assert.equal(step(s, "b", true, 20), "hide");
  step(s, "b", false, 30);                  // the hide landed
  assert.equal(step(s, "a", false, 40), "show");
  step(s, "a", true, 50);
  assert.deepEqual(saved(s), { a: true });
});

test("the old state isn't taken as a choice until the change lands", () => {
  const s = createState({ a: true });
  step(s, "a", true, 0);
  assert.equal(step(s, "b", true, 100), "hide");
  assert.equal(step(s, "b", true, 200), null); // still showing: the hide is on its way
  assert.equal(s.open.b, undefined);
  // Nothing landed within a second: what shows now is b's.
  step(s, "b", true, 100 + SETTLE_MS);
  assert.equal(s.open.b, true);
});

test("a remembered tab overrides a first look", () => {
  const s = createState({ a: true });
  assert.equal(step(s, "a", false, 0), "show");
});

test("closed tabs are forgotten", () => {
  const s = createState({ a: true, gone: true });
  prune(s, ["a"]);
  assert.deepEqual(saved(s), { a: true });
  assert.equal(s.changed, true);
});

test("findNode finds a nested node", () => {
  const tree = { id: "root", children: [{ id: "work", children: [{ id: "blueprint-panel", hidden: true }] }] };
  assert.equal(findNode(tree, "blueprint-panel").hidden, true);
  assert.equal(findNode(tree, "missing"), null);
});

function world(tab, hidden) {
  state.spaces = [{ id: "s", active: true, tabs: [{ id: "t1", active: tab === "t1" }, { id: "t2", active: tab === "t2" }] }];
  state.layout = { id: "root", children: [{ id: "blueprint-panel", type: "column", hidden }] };
}

test("the toolbar follows tab switches and toggles its panel", () => {
  const store = {};
  globalThis.localStorage = { getItem: (k) => store[k] ?? null, setItem: (k, v) => { store[k] = v; } };
  state.runs = []; state.props = {};
  const bar = new Toolbar();
  bar.init();
  world("t1", true);
  bar.render();
  assert.deepEqual(state.runs, []);
  bar.toggle();
  assert.deepEqual(state.runs.pop(), ["layout.show", { id: "blueprint-panel" }]);
  world("t1", false);
  bar.render();
  assert.deepEqual(JSON.parse(store["blueprint-toolbar.open.v1"]), { t1: true });
  world("t2", false);
  bar.render();
  assert.deepEqual(state.runs.pop(), ["layout.hide", { id: "blueprint-panel" }]);
  world("t2", true);
  bar.render();
  world("t1", true);
  bar.render();
  assert.deepEqual(state.runs.pop(), ["layout.show", { id: "blueprint-panel" }]);
});

test("without its layout node the button says so instead of acting", () => {
  state.runs = []; state.notes = []; state.layout = { id: "root", children: [] };
  const bar = new Toolbar();
  bar.init();
  bar.toggle();
  assert.deepEqual(state.runs, []);
  assert.match(state.notes[0].body, /blueprint-panel/);
});

test("opening Blueprint closes what props.closes names; closing it leaves them alone", () => {
  const store = {};
  globalThis.localStorage = { getItem: (k) => store[k] ?? null, setItem: (k, v) => { store[k] = v; } };
  state.runs = []; state.props = { closes: "panel" };
  state.spaces = [{ id: "s", active: true, tabs: [{ id: "t1", active: true }] }];
  state.layout = { id: "root", children: [{ id: "panel", hidden: false }, { id: "blueprint-panel", hidden: true }] };
  const bar = new Toolbar();
  bar.init();
  bar.render();
  bar.toggle();
  assert.deepEqual(state.runs, [["layout.hide", { id: "panel" }], ["layout.show", { id: "blueprint-panel" }]]);
  state.runs = [];
  state.layout = { id: "root", children: [{ id: "panel", hidden: false }, { id: "blueprint-panel", hidden: false }] };
  bar.toggle();
  assert.deepEqual(state.runs, [["layout.hide", { id: "blueprint-panel" }]]);
  state.props = {};
});
