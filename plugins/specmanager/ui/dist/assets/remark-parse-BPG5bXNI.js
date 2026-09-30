import { f as fromMarkdown } from "./mdast-util-from-markdown-DeR2nhYn.js";
function remarkParse(options) {
  const self = this;
  self.parser = parser;
  function parser(doc) {
    return fromMarkdown(doc, {
      ...self.data("settings"),
      ...options,
      extensions: self.data("micromarkExtensions") || [],
      mdastExtensions: self.data("fromMarkdownExtensions") || []
    });
  }
}
export {
  remarkParse as r
};
