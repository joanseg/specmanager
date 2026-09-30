import { o as ok } from "./devlop-BS6z0SoE.js";
import { n as normalizeIdentifier } from "./micromark-util-normalize-identifier-CuJVDrso.js";
footnoteReference.peek = footnoteReferencePeek;
function enterFootnoteCallString() {
  this.buffer();
}
function enterFootnoteCall(token) {
  this.enter({ type: "footnoteReference", identifier: "", label: "" }, token);
}
function enterFootnoteDefinitionLabelString() {
  this.buffer();
}
function enterFootnoteDefinition(token) {
  this.enter(
    { type: "footnoteDefinition", identifier: "", label: "", children: [] },
    token
  );
}
function exitFootnoteCallString(token) {
  const label = this.resume();
  const node = this.stack[this.stack.length - 1];
  ok(node.type === "footnoteReference");
  node.identifier = normalizeIdentifier(
    this.sliceSerialize(token)
  ).toLowerCase();
  node.label = label;
}
function exitFootnoteCall(token) {
  this.exit(token);
}
function exitFootnoteDefinitionLabelString(token) {
  const label = this.resume();
  const node = this.stack[this.stack.length - 1];
  ok(node.type === "footnoteDefinition");
  node.identifier = normalizeIdentifier(
    this.sliceSerialize(token)
  ).toLowerCase();
  node.label = label;
}
function exitFootnoteDefinition(token) {
  this.exit(token);
}
function footnoteReferencePeek() {
  return "[";
}
function footnoteReference(node, _, state, info) {
  const tracker = state.createTracker(info);
  let value = tracker.move("[^");
  const exit = state.enter("footnoteReference");
  const subexit = state.enter("reference");
  value += tracker.move(
    state.safe(state.associationId(node), { after: "]", before: value })
  );
  subexit();
  exit();
  value += tracker.move("]");
  return value;
}
function gfmFootnoteFromMarkdown() {
  return {
    enter: {
      gfmFootnoteCallString: enterFootnoteCallString,
      gfmFootnoteCall: enterFootnoteCall,
      gfmFootnoteDefinitionLabelString: enterFootnoteDefinitionLabelString,
      gfmFootnoteDefinition: enterFootnoteDefinition
    },
    exit: {
      gfmFootnoteCallString: exitFootnoteCallString,
      gfmFootnoteCall: exitFootnoteCall,
      gfmFootnoteDefinitionLabelString: exitFootnoteDefinitionLabelString,
      gfmFootnoteDefinition: exitFootnoteDefinition
    }
  };
}
function gfmFootnoteToMarkdown(options) {
  let firstLineBlank = false;
  if (options && options.firstLineBlank) {
    firstLineBlank = true;
  }
  return {
    handlers: { footnoteDefinition, footnoteReference },
    // This is on by default already.
    unsafe: [{ character: "[", inConstruct: ["label", "phrasing", "reference"] }]
  };
  function footnoteDefinition(node, _, state, info) {
    const tracker = state.createTracker(info);
    let value = tracker.move("[^");
    const exit = state.enter("footnoteDefinition");
    const subexit = state.enter("label");
    value += tracker.move(
      state.safe(state.associationId(node), { before: value, after: "]" })
    );
    subexit();
    value += tracker.move("]:");
    if (node.children && node.children.length > 0) {
      tracker.shift(4);
      value += tracker.move(
        (firstLineBlank ? "\n" : " ") + state.indentLines(
          state.containerFlow(node, tracker.current()),
          firstLineBlank ? mapAll : mapExceptFirst
        )
      );
    }
    exit();
    return value;
  }
}
function mapExceptFirst(line, index, blank) {
  return index === 0 ? line : mapAll(line, index, blank);
}
function mapAll(line, index, blank) {
  return (blank ? "" : "    ") + line;
}
export {
  gfmFootnoteToMarkdown as a,
  gfmFootnoteFromMarkdown as g
};
