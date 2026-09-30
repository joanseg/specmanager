const constructsWithoutStrikethrough = [
  "autolink",
  "destinationLiteral",
  "destinationRaw",
  "reference",
  "titleQuote",
  "titleApostrophe"
];
handleDelete.peek = peekDelete;
function gfmStrikethroughFromMarkdown() {
  return {
    canContainEols: ["delete"],
    enter: { strikethrough: enterStrikethrough },
    exit: { strikethrough: exitStrikethrough }
  };
}
function gfmStrikethroughToMarkdown() {
  return {
    unsafe: [
      {
        character: "~",
        inConstruct: "phrasing",
        notInConstruct: constructsWithoutStrikethrough
      }
    ],
    handlers: { delete: handleDelete }
  };
}
function enterStrikethrough(token) {
  this.enter({ type: "delete", children: [] }, token);
}
function exitStrikethrough(token) {
  this.exit(token);
}
function handleDelete(node, _, state, info) {
  const tracker = state.createTracker(info);
  const exit = state.enter("strikethrough");
  let value = tracker.move("~~");
  value += state.containerPhrasing(node, {
    ...tracker.current(),
    before: value,
    after: "~"
  });
  value += tracker.move("~~");
  exit();
  return value;
}
function peekDelete() {
  return "~";
}
export {
  gfmStrikethroughToMarkdown as a,
  gfmStrikethroughFromMarkdown as g
};
