import { g as gfmAutolinkLiteralFromMarkdown, a as gfmAutolinkLiteralToMarkdown } from "./mdast-util-gfm-autolink-literal-BNMH3eqX.js";
import { g as gfmFootnoteFromMarkdown, a as gfmFootnoteToMarkdown } from "./mdast-util-gfm-footnote-CoB8gpdB.js";
import { g as gfmStrikethroughFromMarkdown, a as gfmStrikethroughToMarkdown } from "./mdast-util-gfm-strikethrough-CdiXKM9K.js";
import { g as gfmTableFromMarkdown, a as gfmTableToMarkdown } from "./mdast-util-gfm-table-TH_RNemS.js";
import { g as gfmTaskListItemFromMarkdown, a as gfmTaskListItemToMarkdown } from "./mdast-util-gfm-task-list-item-DlvDfMSL.js";
function gfmFromMarkdown() {
  return [
    gfmAutolinkLiteralFromMarkdown(),
    gfmFootnoteFromMarkdown(),
    gfmStrikethroughFromMarkdown(),
    gfmTableFromMarkdown(),
    gfmTaskListItemFromMarkdown()
  ];
}
function gfmToMarkdown(options) {
  return {
    extensions: [
      gfmAutolinkLiteralToMarkdown(),
      gfmFootnoteToMarkdown(options),
      gfmStrikethroughToMarkdown(),
      gfmTableToMarkdown(options),
      gfmTaskListItemToMarkdown()
    ]
  };
}
export {
  gfmToMarkdown as a,
  gfmFromMarkdown as g
};
