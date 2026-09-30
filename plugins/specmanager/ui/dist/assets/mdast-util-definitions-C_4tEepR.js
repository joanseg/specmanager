import { v as visit } from "./unist-util-visit-D1LqXPOY.js";
function definitions(tree) {
  const cache = /* @__PURE__ */ new Map();
  if (!tree || !tree.type) {
    throw new Error("mdast-util-definitions expected node");
  }
  visit(tree, "definition", function(definition2) {
    const id = clean(definition2.identifier);
    if (id && !cache.get(id)) {
      cache.set(id, definition2);
    }
  });
  return definition;
  function definition(identifier) {
    const id = clean(identifier);
    return cache.get(id);
  }
}
function clean(value) {
  return String(value || "").toUpperCase();
}
export {
  definitions as d
};
