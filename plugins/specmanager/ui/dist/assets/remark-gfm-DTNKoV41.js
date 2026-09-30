import { g as gfm } from "./micromark-extension-gfm-B7WFyr-E.js";
import { g as gfmFromMarkdown, a as gfmToMarkdown } from "./mdast-util-gfm-P8J2K8a9.js";
const emptyOptions = {};
function remarkGfm(options) {
  const self = (
    /** @type {Processor<Root>} */
    this
  );
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
