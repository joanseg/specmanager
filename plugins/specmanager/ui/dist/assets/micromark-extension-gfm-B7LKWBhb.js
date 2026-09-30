import { c as combineExtensions } from "./micromark-util-combine-extensions-DQmaEzeT.js";
import { g as gfmAutolinkLiteral } from "./micromark-extension-gfm-autolink-literal-CorV23_O.js";
import { g as gfmFootnote } from "./micromark-extension-gfm-footnote-CM218xcf.js";
import { g as gfmStrikethrough } from "./micromark-extension-gfm-strikethrough-CuNtvj8o.js";
import { g as gfmTable } from "./micromark-extension-gfm-table-BRWmSx-P.js";
import { g as gfmTaskListItem } from "./micromark-extension-gfm-task-list-item-Cq7WxnQ8.js";
function gfm(options) {
  return combineExtensions([
    gfmAutolinkLiteral(),
    gfmFootnote(),
    gfmStrikethrough(options),
    gfmTable(),
    gfmTaskListItem()
  ]);
}
export {
  gfm as g
};
