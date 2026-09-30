import { t as toMarkdown } from "./mdast-util-to-markdown-ljU3R65o.js";
function remarkStringify(options) {
  const self = this;
  self.compiler = compiler;
  function compiler(tree) {
    return toMarkdown(tree, {
      ...self.data("settings"),
      ...options,
      // Note: this option is not in the readme.
      // The goal is for it to be set by plugins on `data` instead of being
      // passed by users.
      extensions: self.data("toMarkdownExtensions") || []
    });
  }
}
export {
  remarkStringify as r
};
