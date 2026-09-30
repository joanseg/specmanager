import { t as toMarkdown } from "./mdast-util-to-markdown-hSJ6DG3N.js";
function remarkStringify(options) {
  const self = this;
  self.compiler = compiler;
  function compiler(tree) {
    return toMarkdown(tree, {
      ...self.data("settings"),
      ...options,
      extensions: self.data("toMarkdownExtensions") || []
    });
  }
}
export {
  remarkStringify as r
};
