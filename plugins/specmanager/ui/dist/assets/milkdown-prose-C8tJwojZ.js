import { P as Plugin, a as PluginKey, N as NodeSelection } from "./prosemirror-state-DSNoeGZS.js";
import { I as InputRule } from "./prosemirror-inputrules-DEUBGGnM.js";
import "./prosemirror-tables-D6-FmvFw.js";
const nav = typeof navigator != "undefined" ? navigator : null;
const doc = typeof document != "undefined" ? document : null;
const agent = nav && nav.userAgent || "";
const ie_edge = /Edge\/(\d+)/.exec(agent);
const ie_upto10 = /MSIE \d/.exec(agent);
const ie_11up = /Trident\/(?:[7-9]|\d{2,})\..*rv:(\d+)/.exec(agent);
const ie = !!(ie_upto10 || ie_11up || ie_edge);
ie_upto10 ? document.documentMode : ie_11up ? +ie_11up[1] : ie_edge ? +ie_edge[1] : 0;
const gecko = !ie && /gecko\/(\d+)/i.test(agent);
gecko && +(/Firefox\/(\d+)/.exec(agent) || [0, 0])[1];
const _chrome = !ie && /Chrome\/(\d+)/.exec(agent);
const chrome = !!_chrome;
_chrome ? +_chrome[1] : 0;
const safari = !ie && !!nav && /Apple Computer/.test(nav.vendor);
const ios = safari && (/Mobile\/\w+/.test(agent) || !!nav && nav.maxTouchPoints > 2);
ios || (nav ? /Mac/.test(nav.platform) : false);
const android = /Android \d/.test(agent);
const webkit = !!doc && "webkitFontSmoothing" in doc.documentElement.style;
webkit ? +(/\bAppleWebKit\/(\d+)/.exec(navigator.userAgent) || [0, 0])[1] : 0;
function run(view, from, to, text, rules, plugin) {
  if (view.composing) return false;
  const state = view.state;
  const $from = state.doc.resolve(from);
  if ($from.parent.type.spec.code) return false;
  const textBefore = $from.parent.textBetween(
    Math.max(0, $from.parentOffset - 500),
    $from.parentOffset,
    void 0,
    "￼"
  ) + text;
  for (let _matcher of rules) {
    const matcher = _matcher;
    const match = matcher.match.exec(textBefore);
    const tr = match && match[0] && matcher.handler(state, match, from - (match[0].length - text.length), to);
    if (!tr) continue;
    if (matcher.undoable !== false)
      tr.setMeta(plugin, { transform: tr, from, to, text });
    view.dispatch(tr);
    return true;
  }
  return false;
}
const customInputRulesKey = new PluginKey("MILKDOWN_CUSTOM_INPUTRULES");
function customInputRules({ rules }) {
  const plugin = new Plugin({
    key: customInputRulesKey,
    isInputRules: true,
    state: {
      init() {
        return null;
      },
      apply(tr, prev) {
        const stored = tr.getMeta(this);
        if (stored) return stored;
        return tr.selectionSet || tr.docChanged ? null : prev;
      }
    },
    props: {
      handleTextInput(view, from, to, text) {
        return run(view, from, to, text, rules, plugin);
      },
      handleDOMEvents: {
        compositionend: (view) => {
          setTimeout(() => {
            const { $cursor } = view.state.selection;
            if ($cursor) run(view, $cursor.pos, $cursor.pos, "", rules, plugin);
          });
          return false;
        },
        keydown: (view, event) => {
          if (!(android && chrome && event.key === "Enter"))
            return false;
          if (view.composing) return false;
          if (view.someProp(
            "handleKeyDown",
            (f) => f(view, event)
          )) {
            event.preventDefault();
            return true;
          }
          return false;
        }
      },
      handleKeyDown(view, event) {
        if (event.key !== "Enter") return false;
        const { $cursor } = view.state.selection;
        if ($cursor)
          return run(view, $cursor.pos, $cursor.pos, "\n", rules, plugin);
        return false;
      }
    }
  });
  return plugin;
}
function markRule(regexp, markType, options = {}) {
  return new InputRule(regexp, (state, match, start, end) => {
    var _a, _b, _c, _d;
    const { tr } = state;
    const matchLength = match.length;
    let group = match[matchLength - 1];
    let fullMatch = match[0];
    let initialStoredMarks = [];
    let markEnd;
    const captured = {
      group,
      fullMatch,
      start,
      end
    };
    const result = (_a = options.updateCaptured) == null ? void 0 : _a.call(options, captured);
    Object.assign(captured, result);
    ({ group, fullMatch, start, end } = captured);
    if (fullMatch === null) return null;
    if ((group == null ? void 0 : group.trim()) === "") return null;
    if (group) {
      const startSpaces = fullMatch.search(/\S/);
      const textStart = start + fullMatch.indexOf(group);
      const textEnd = textStart + group.length;
      initialStoredMarks = (_b = tr.storedMarks) != null ? _b : [];
      if (textEnd < end) tr.delete(textEnd, end);
      if (textStart > start) tr.delete(start + startSpaces, textStart);
      markEnd = start + startSpaces + group.length;
      const attrs = (_c = options.getAttr) == null ? void 0 : _c.call(options, match);
      tr.addMark(start, markEnd, markType.create(attrs));
      tr.setStoredMarks(initialStoredMarks);
      (_d = options.beforeDispatch) == null ? void 0 : _d.call(options, { match, start, end, tr });
    }
    return tr;
  });
}
function cloneTr(tr) {
  return Object.assign(Object.create(tr), tr).setTime(Date.now());
}
function equalNodeType(nodeType, node) {
  return Array.isArray(nodeType) && nodeType.includes(node.type) || node.type === nodeType;
}
function findParent(predicate) {
  return ($pos) => {
    for (let depth = $pos.depth; depth > 0; depth -= 1) {
      const node = $pos.node(depth);
      if (predicate(node)) {
        const from = $pos.before(depth);
        const to = $pos.after(depth);
        return {
          from,
          to,
          node
        };
      }
    }
    return void 0;
  };
}
function findParentNodeType($pos, nodeType) {
  return findParent((node) => node.type === nodeType)($pos);
}
function findParentNodeClosestToPos(predicate) {
  return ($pos) => {
    for (let i = $pos.depth; i > 0; i--) {
      const node = $pos.node(i);
      if (predicate(node)) {
        return {
          pos: $pos.before(i),
          start: $pos.start(i),
          depth: i,
          node
        };
      }
    }
    return void 0;
  };
}
function findSelectedNodeOfType(selection, nodeType) {
  if (!(selection instanceof NodeSelection)) return;
  const { node, $from } = selection;
  if (equalNodeType(nodeType, node))
    return {
      node,
      pos: $from.pos,
      start: $from.start($from.depth),
      depth: $from.depth
    };
  return void 0;
}
const findNodeInSelection = (state, node) => {
  const { selection, doc: doc2 } = state;
  if (selection instanceof NodeSelection) {
    return {
      hasNode: selection.node.type === node,
      pos: selection.from,
      target: selection.node
    };
  }
  const { from, to } = selection;
  let hasNode = false;
  let pos = -1;
  let target = null;
  doc2.nodesBetween(from, to, (n, p) => {
    if (target) return false;
    if (n.type === node) {
      hasNode = true;
      pos = p;
      target = n;
      return false;
    }
    return true;
  });
  return {
    hasNode,
    pos,
    target
  };
};
export {
  customInputRules as a,
  findParentNodeClosestToPos as b,
  cloneTr as c,
  findParentNodeType as d,
  findSelectedNodeOfType as e,
  findNodeInSelection as f,
  markRule as m
};
