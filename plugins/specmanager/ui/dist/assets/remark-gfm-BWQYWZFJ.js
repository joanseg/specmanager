import { g as gfm } from "./micromark-extension-gfm-B7LKWBhb.js";
import { g as gfmFromMarkdown, a as gfmToMarkdown } from "./mdast-util-gfm-DJ2kXwGF.js";
const emptyOptions = {};
function remarkGfm(options) {
  const self = this;
  const settings = options || emptyOptions;
  const data = self.data();
  const micromarkExtensions = data.micromarkExtensions || (data.micromarkExtensions = []);
  const fromMarkdownExtensions = data.fromMarkdownExtensions || (data.fromMarkdownExtensions = []);
  const toMarkdownExtensions = data.toMarkdownExtensions || (data.toMarkdownExtensions = []);
  micromarkExtensions.push(gfm(settings));
  fromMarkdownExtensions.push(gfmFromMarkdown());
  toMarkdownExtensions.push(gfmToMarkdown(settings));
}
export {
  remarkGfm as r
};
