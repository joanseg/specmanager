import { f as findWrapping, c as canJoin } from "./prosemirror-transform-BUwnoLrz.js";
class InputRule {
  constructor(match, handler, options = {}) {
    this.match = match;
    this.match = match;
    this.handler = typeof handler == "string" ? stringHandler(handler) : handler;
    this.undoable = options.undoable !== false;
    this.inCode = options.inCode || false;
    this.inCodeMark = options.inCodeMark !== false;
  }
}
function stringHandler(string) {
  return function(state, match, start, end) {
    let insert = string;
    if (match[1]) {
      let offset = match[0].lastIndexOf(match[1]);
      insert += match[0].slice(offset + match[1].length);
      start += offset;
      let cutOff = start - end;
      if (cutOff > 0) {
        insert = match[0].slice(offset - cutOff, offset) + insert;
        start = end;
      }
    }
    return state.tr.insertText(insert, start, end);
  };
}
const undoInputRule = (state, dispatch) => {
  let plugins = state.plugins;
  for (let i = 0; i < plugins.length; i++) {
    let plugin = plugins[i], undoable;
    if (plugin.spec.isInputRules && (undoable = plugin.getState(state))) {
      if (dispatch) {
        let tr = state.tr, toUndo = undoable.transform;
        for (let j = toUndo.steps.length - 1; j >= 0; j--)
          tr.step(toUndo.steps[j].invert(toUndo.docs[j]));
        if (undoable.text) {
          let marks = tr.doc.resolve(undoable.from).marks();
          tr.replaceWith(undoable.from, undoable.to, state.schema.text(undoable.text, marks));
        } else {
          tr.delete(undoable.from, undoable.to);
        }
        dispatch(tr);
      }
      return true;
    }
  }
  return false;
};
new InputRule(/--$/, "—", { inCodeMark: false });
new InputRule(/\.\.\.$/, "…", { inCodeMark: false });
new InputRule(/(?:^|[\s\{\[\(\<'"\u2018\u201C])(")$/, "“", { inCodeMark: false });
new InputRule(/"$/, "”", { inCodeMark: false });
new InputRule(/(?:^|[\s\{\[\(\<'"\u2018\u201C])(')$/, "‘", { inCodeMark: false });
new InputRule(/'$/, "’", { inCodeMark: false });
function wrappingInputRule(regexp, nodeType, getAttrs = null, joinPredicate) {
  return new InputRule(regexp, (state, match, start, end) => {
    let attrs = getAttrs instanceof Function ? getAttrs(match) : getAttrs;
    let tr = state.tr.delete(start, end);
    let $start = tr.doc.resolve(start), range = $start.blockRange(), wrapping = range && findWrapping(range, nodeType, attrs);
    if (!wrapping)
      return null;
    tr.wrap(range, wrapping);
    let before = tr.doc.resolve(start - 1).nodeBefore;
    if (before && before.type == nodeType && canJoin(tr.doc, start - 1) && (!joinPredicate || joinPredicate(match, before)))
      tr.join(start - 1);
    return tr;
  });
}
function textblockTypeInputRule(regexp, nodeType, getAttrs = null) {
  return new InputRule(regexp, (state, match, start, end) => {
    let $start = state.doc.resolve(start);
    let attrs = getAttrs instanceof Function ? getAttrs(match) : getAttrs;
    if (!$start.node(-1).canReplaceWith($start.index(-1), $start.indexAfter(-1), nodeType))
      return null;
    return state.tr.delete(start, end).setBlockType(start, start, nodeType, attrs);
  });
}
export {
  InputRule as I,
  textblockTypeInputRule as t,
  undoInputRule as u,
  wrappingInputRule as w
};
