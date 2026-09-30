import { d as definitions } from "./mdast-util-definitions-CC8aCBkB.js";
import { v as visit } from "./unist-util-visit-DGOjL9nv.js";
import { S as SKIP } from "./unist-util-visit-parents-BZ5PFfVf.js";
function remarkInlineLinks() {
  return function(tree) {
    const definition = definitions(tree);
    visit(tree, function(node, index, parent) {
      if (node.type === "definition" && parent !== void 0 && typeof index === "number") {
        parent.children.splice(index, 1);
        return [SKIP, index];
      }
      if (node.type === "imageReference" || node.type === "linkReference") {
        const def = definition(node.identifier);
        if (def && parent && typeof index === "number") {
          parent.children[index] = node.type === "imageReference" ? { type: "image", url: def.url, title: def.title, alt: node.alt } : {
            type: "link",
            url: def.url,
            title: def.title,
            children: node.children
          };
          return [SKIP, index];
        }
      }
    });
  };
}
export {
  remarkInlineLinks as r
};
