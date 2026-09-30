import { k as keyName, b as base } from "./w3c-keyname-UQGyUXrT.js";
import { P as Plugin } from "./prosemirror-state-DSNoeGZS.js";
const mac = typeof navigator != "undefined" && /Mac|iP(hone|[oa]d)/.test(navigator.platform);
const windows = typeof navigator != "undefined" && /Win/.test(navigator.platform);
function normalizeKeyName(name) {
  let parts = name.split(/-(?!$)/), result = parts[parts.length - 1];
  if (result == "Space")
    result = " ";
  let alt, ctrl, shift, meta;
  for (let i = 0; i < parts.length - 1; i++) {
    let mod = parts[i];
    if (/^(cmd|meta|m)$/i.test(mod))
      meta = true;
    else if (/^a(lt)?$/i.test(mod))
      alt = true;
    else if (/^(c|ctrl|control)$/i.test(mod))
      ctrl = true;
    else if (/^s(hift)?$/i.test(mod))
      shift = true;
    else if (/^mod$/i.test(mod)) {
      if (mac)
        meta = true;
      else
        ctrl = true;
    } else
      throw new Error("Unrecognized modifier name: " + mod);
  }
  if (alt)
    result = "Alt-" + result;
  if (ctrl)
    result = "Ctrl-" + result;
  if (meta)
    result = "Meta-" + result;
  if (shift)
    result = "Shift-" + result;
  return result;
}
function normalize(map) {
  let copy = /* @__PURE__ */ Object.create(null);
  for (let prop in map)
    copy[normalizeKeyName(prop)] = map[prop];
  return copy;
}
function modifiers(name, event, shift = true) {
  if (event.altKey)
    name = "Alt-" + name;
  if (event.ctrlKey)
    name = "Ctrl-" + name;
  if (event.metaKey)
    name = "Meta-" + name;
  if (shift && event.shiftKey)
    name = "Shift-" + name;
  return name;
}
function keymap(bindings) {
  return new Plugin({ props: { handleKeyDown: keydownHandler(bindings) } });
}
function keydownHandler(bindings) {
  let map = normalize(bindings);
  return function(view, event) {
    let name = keyName(event), baseName, direct = map[modifiers(name, event)];
    if (direct && direct(view.state, view.dispatch, view))
      return true;
    if (name.length == 1 && name != " ") {
      if (event.shiftKey) {
        let noShift = map[modifiers(name, event, false)];
        if (noShift && noShift(view.state, view.dispatch, view))
          return true;
      }
      if ((event.altKey || event.metaKey || event.ctrlKey) && // Ctrl-Alt may be used for AltGr on Windows
      !(windows && event.ctrlKey && event.altKey) && (baseName = base[event.keyCode]) && baseName != name) {
        let fromCode = map[modifiers(baseName, event)];
        if (fromCode && fromCode(view.state, view.dispatch, view))
          return true;
      }
    }
    return false;
  };
}
export {
  keymap as a,
  keydownHandler as k
};
