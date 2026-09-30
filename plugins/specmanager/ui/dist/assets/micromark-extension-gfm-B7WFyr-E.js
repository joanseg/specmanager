import { c as combineExtensions } from "./micromark-util-combine-extensions-DLIiphuE.js";
import { g as gfmAutolinkLiteral } from "./micromark-extension-gfm-autolink-literal-yylzR1vU.js";
import { g as gfmFootnote } from "./micromark-extension-gfm-footnote-Cuj6I7Wa.js";
import { g as gfmStrikethrough } from "./micromark-extension-gfm-strikethrough-D8ZUn0WY.js";
import { g as gfmTable } from "./micromark-extension-gfm-table-OVGsOoOt.js";
import { g as gfmTaskListItem } from "./micromark-extension-gfm-task-list-item-DZD46Bbx.js";
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
