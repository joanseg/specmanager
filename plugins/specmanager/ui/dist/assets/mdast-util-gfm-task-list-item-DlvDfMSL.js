import { o as ok } from "./devlop-BS6z0SoE.js";
import { h as handle } from "./mdast-util-to-markdown-hSJ6DG3N.js";
function gfmTaskListItemFromMarkdown() {
  return {
    exit: {
      taskListCheckValueChecked: exitCheck,
      taskListCheckValueUnchecked: exitCheck,
      paragraph: exitParagraphWithTaskListItem
    }
  };
}
function gfmTaskListItemToMarkdown() {
  return {
    unsafe: [{ atBreak: true, character: "-", after: "[:|-]" }],
    handlers: { listItem: listItemWithTaskListItem }
  };
}
function exitCheck(token) {
  const node = this.stack[this.stack.length - 2];
  ok(node.type === "listItem");
  node.checked = token.type === "taskListCheckValueChecked";
}
function exitParagraphWithTaskListItem(token) {
  const parent = this.stack[this.stack.length - 2];
  if (parent && parent.type === "listItem" && typeof parent.checked === "boolean") {
    const node = this.stack[this.stack.length - 1];
    ok(node.type === "paragraph");
    const head = node.children[0];
    if (head && head.type === "text") {
      const siblings = parent.children;
      let index = -1;
      let firstParaghraph;
      while (++index < siblings.length) {
        const sibling = siblings[index];
        if (sibling.type === "paragraph") {
          firstParaghraph = sibling;
          break;
        }
      }
      if (firstParaghraph === node) {
        head.value = head.value.slice(1);
        if (head.value.length === 0) {
          node.children.shift();
        } else if (node.position && head.position && typeof head.position.start.offset === "number") {
          head.position.start.column++;
          head.position.start.offset++;
          node.position.start = Object.assign({}, head.position.start);
        }
      }
    }
  }
  this.exit(token);
}
function listItemWithTaskListItem(node, parent, state, info) {
  const head = node.children[0];
  const checkable = typeof node.checked === "boolean" && head && head.type === "paragraph";
  const checkbox = "[" + (node.checked ? "x" : " ") + "] ";
  const tracker = state.createTracker(info);
  if (checkable) {
    tracker.move(checkbox);
  }
  let value = handle.listItem(node, parent, state, {
    ...info,
    ...tracker.current()
  });
  if (checkable) {
    value = value.replace(/^(?:[*+-]|\d+\.)([\r\n]| {1,3})/, check);
  }
  return value;
  function check($0) {
    return $0 + checkbox;
  }
}
export {
  gfmTaskListItemToMarkdown as a,
  gfmTaskListItemFromMarkdown as g
};
