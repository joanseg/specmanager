import { c as commandsCtx } from "./milkdown-core-DsBn0yRa.js";
import { m as markRule, d as findParentNodeType, c as cloneTr, b as findParentNodeClosestToPos } from "./milkdown-prose-BA0s8Ct0.js";
import { b as $inputRule, h as $pasteRule, $ as $command, g as $nodeSchema, c as $markAttr, d as $markSchema, k as $useKeymap, i as $prose, j as $remark } from "./milkdown-utils-Dn8fge8U.js";
import { l as listItemSchema, p as paragraphSchema } from "./milkdown-preset-commonmark-CpU54TZM.js";
import { f as expectDomTypeError } from "./milkdown-exception-EEjztD1-.js";
import { i as imeSpan } from "./prosemirror-safari-ime-span-BSv6h3JI.js";
import { P as Plugin, a as PluginKey, S as Selection, T as TextSelection } from "./prosemirror-state-DvBpuTqc.js";
import { t as tableEditing, l as tableNodes, h as goToNextCell, i as isInTable, j as moveTableRow, m as moveTableColumn, C as CellSelection, f as deleteTable, d as deleteColumn, e as deleteRow, b as addColumnBefore, a as addColumnAfter, s as selectedRect, k as setCellAttr, c as columnResizing, T as TableMap, g as findTable } from "./prosemirror-tables-D3QqrMgz.js";
import { t as toggleMark } from "./prosemirror-commands-D6u-7607.js";
import { I as InputRule } from "./prosemirror-inputrules-DwANvdfL.js";
import { d as Slice, F as Fragment } from "./prosemirror-model-CNXHVs9h.js";
import { r as remarkGfm } from "./remark-gfm-BWQYWZFJ.js";
function withMeta(plugin, meta) {
  Object.assign(plugin, { meta: {
    package: "@milkdown/preset-gfm",
    ...meta
  } });
  return plugin;
}
var strikethroughAttr = $markAttr("strike_through");
withMeta(strikethroughAttr, {
  displayName: "Attr<strikethrough>",
  group: "Strikethrough"
});
var strikethroughSchema = $markSchema("strike_through", (ctx) => ({
  parseDOM: [{ tag: "del" }, {
    style: "text-decoration",
    getAttrs: (value) => value === "line-through"
  }],
  toDOM: (mark) => ["del", ctx.get(strikethroughAttr.key)(mark)],
  parseMarkdown: {
    match: (node) => node.type === "delete",
    runner: (state, node, markType) => {
      state.openMark(markType);
      state.next(node.children);
      state.closeMark(markType);
    }
  },
  toMarkdown: {
    match: (mark) => mark.type.name === "strike_through",
    runner: (state, mark) => {
      state.withMark(mark, "delete");
    }
  }
}));
withMeta(strikethroughSchema.mark, {
  displayName: "MarkSchema<strikethrough>",
  group: "Strikethrough"
});
withMeta(strikethroughSchema.ctx, {
  displayName: "MarkSchemaCtx<strikethrough>",
  group: "Strikethrough"
});
var toggleStrikethroughCommand = $command("ToggleStrikeThrough", (ctx) => () => {
  return toggleMark(strikethroughSchema.type(ctx));
});
withMeta(toggleStrikethroughCommand, {
  displayName: "Command<ToggleStrikethrough>",
  group: "Strikethrough"
});
var strikethroughInputRule = $inputRule((ctx) => {
  return markRule(new RegExp("(?<![\\w:/])(~{1,2})(.+?)\\1(?!\\w|\\/)"), strikethroughSchema.type(ctx));
});
withMeta(strikethroughInputRule, {
  displayName: "InputRule<strikethrough>",
  group: "Strikethrough"
});
var strikethroughKeymap = $useKeymap("strikeThroughKeymap", { ToggleStrikethrough: {
  shortcuts: "Mod-Alt-x",
  command: (ctx) => {
    const commands2 = ctx.get(commandsCtx);
    return () => commands2.call(toggleStrikethroughCommand.key);
  }
} });
withMeta(strikethroughKeymap.ctx, {
  displayName: "KeymapCtx<strikethrough>",
  group: "Strikethrough"
});
withMeta(strikethroughKeymap.shortcuts, {
  displayName: "Keymap<strikethrough>",
  group: "Strikethrough"
});
var originalSchema = tableNodes({
  tableGroup: "block",
  cellContent: "paragraph",
  cellAttributes: { alignment: {
    default: "left",
    getFromDOM: (dom) => dom.style.textAlign || "left",
    setDOMAttr: (value, attrs) => {
      attrs.style = `text-align: ${value || "left"}`;
    }
  } }
});
var tableSchema = $nodeSchema("table", () => ({
  ...originalSchema.table,
  content: "table_header_row table_row+",
  disableDropCursor: true,
  parseMarkdown: {
    match: (node) => node.type === "table",
    runner: (state, node, type) => {
      const align = node.align;
      const children = node.children.map((x, i) => ({
        ...x,
        align,
        isHeader: i === 0
      }));
      state.openNode(type);
      state.next(children);
      state.closeNode();
    }
  },
  toMarkdown: {
    match: (node) => node.type.name === "table",
    runner: (state, node) => {
      var _a;
      const firstLine = (_a = node.content.firstChild) == null ? void 0 : _a.content;
      if (!firstLine)
        return;
      const align = [];
      firstLine.forEach((cell) => {
        align.push(cell.attrs.alignment);
      });
      state.openNode("table", void 0, { align });
      state.next(node.content);
      state.closeNode();
    }
  }
}));
withMeta(tableSchema.node, {
  displayName: "NodeSchema<table>",
  group: "Table"
});
withMeta(tableSchema.ctx, {
  displayName: "NodeSchemaCtx<table>",
  group: "Table"
});
var tableHeaderRowSchema = $nodeSchema("table_header_row", () => ({
  ...originalSchema.table_row,
  disableDropCursor: true,
  content: "(table_header)*",
  parseDOM: [{ tag: "tr[data-is-header]" }, {
    tag: "tr",
    getAttrs: (dom) => {
      if (dom instanceof HTMLElement)
        return dom.querySelector("th") ? {} : false;
      return false;
    }
  }],
  toDOM() {
    return [
      "tr",
      { "data-is-header": true },
      0
    ];
  },
  parseMarkdown: {
    match: (node) => Boolean(node.type === "tableRow" && node.isHeader),
    runner: (state, node, type) => {
      const align = node.align;
      const children = node.children.map((x, i) => ({
        ...x,
        align: align[i],
        isHeader: node.isHeader
      }));
      state.openNode(type);
      state.next(children);
      state.closeNode();
    }
  },
  toMarkdown: {
    match: (node) => node.type.name === "table_header_row",
    runner: (state, node) => {
      if (node.content.size === 0)
        return;
      state.openNode("tableRow", void 0, { isHeader: true });
      state.next(node.content);
      state.closeNode();
    }
  }
}));
withMeta(tableHeaderRowSchema.node, {
  displayName: "NodeSchema<tableHeaderRow>",
  group: "Table"
});
withMeta(tableHeaderRowSchema.ctx, {
  displayName: "NodeSchemaCtx<tableHeaderRow>",
  group: "Table"
});
var tableRowSchema = $nodeSchema("table_row", () => ({
  ...originalSchema.table_row,
  disableDropCursor: true,
  content: "(table_cell)*",
  parseMarkdown: {
    match: (node) => node.type === "tableRow",
    runner: (state, node, type) => {
      const align = node.align;
      const children = node.children.map((x, i) => ({
        ...x,
        align: align[i]
      }));
      state.openNode(type);
      state.next(children);
      state.closeNode();
    }
  },
  toMarkdown: {
    match: (node) => node.type.name === "table_row",
    runner: (state, node) => {
      if (node.content.size === 0)
        return;
      state.openNode("tableRow");
      state.next(node.content);
      state.closeNode();
    }
  }
}));
withMeta(tableRowSchema.node, {
  displayName: "NodeSchema<tableRow>",
  group: "Table"
});
withMeta(tableRowSchema.ctx, {
  displayName: "NodeSchemaCtx<tableRow>",
  group: "Table"
});
var tableCellSchema = $nodeSchema("table_cell", () => ({
  ...originalSchema.table_cell,
  disableDropCursor: true,
  parseMarkdown: {
    match: (node) => node.type === "tableCell" && !node.isHeader,
    runner: (state, node, type) => {
      const align = node.align;
      state.openNode(type, { alignment: align }).openNode(state.schema.nodes.paragraph).next(node.children).closeNode().closeNode();
    }
  },
  toMarkdown: {
    match: (node) => node.type.name === "table_cell",
    runner: (state, node) => {
      state.openNode("tableCell").next(node.content).closeNode();
    }
  }
}));
withMeta(tableCellSchema.node, {
  displayName: "NodeSchema<tableCell>",
  group: "Table"
});
withMeta(tableCellSchema.ctx, {
  displayName: "NodeSchemaCtx<tableCell>",
  group: "Table"
});
var tableHeaderSchema = $nodeSchema("table_header", () => ({
  ...originalSchema.table_header,
  disableDropCursor: true,
  parseMarkdown: {
    match: (node) => node.type === "tableCell" && !!node.isHeader,
    runner: (state, node, type) => {
      const align = node.align;
      state.openNode(type, { alignment: align });
      state.openNode(state.schema.nodes.paragraph);
      state.next(node.children);
      state.closeNode();
      state.closeNode();
    }
  },
  toMarkdown: {
    match: (node) => node.type.name === "table_header",
    runner: (state, node) => {
      state.openNode("tableCell");
      state.next(node.content);
      state.closeNode();
    }
  }
}));
withMeta(tableHeaderSchema.node, {
  displayName: "NodeSchema<tableHeader>",
  group: "Table"
});
withMeta(tableHeaderSchema.ctx, {
  displayName: "NodeSchemaCtx<tableHeader>",
  group: "Table"
});
function createTable(ctx, rowsCount = 3, colsCount = 3) {
  const cells = Array(colsCount).fill(0).map(() => tableCellSchema.type(ctx).createAndFill());
  const headerCells = Array(colsCount).fill(0).map(() => tableHeaderSchema.type(ctx).createAndFill());
  const rows = Array(rowsCount).fill(0).map((_, i) => i === 0 ? tableHeaderRowSchema.type(ctx).create(null, headerCells) : tableRowSchema.type(ctx).create(null, cells));
  return tableSchema.type(ctx).create(null, rows);
}
function selectLine(type) {
  return (index, pos) => (tr) => {
    pos = pos ?? tr.selection.from;
    const $pos = tr.doc.resolve(pos);
    const $node = findParentNodeClosestToPos((node) => node.type.name === "table")($pos);
    const table = $node ? {
      node: $node.node,
      from: $node.start
    } : void 0;
    const isRowSelection = type === "row";
    if (table) {
      const map = TableMap.get(table.node);
      if (index >= 0 && index < (isRowSelection ? map.height : map.width)) {
        const lastCell = map.positionAt(isRowSelection ? index : map.height - 1, isRowSelection ? map.width - 1 : index, table.node);
        const $lastCell = tr.doc.resolve(table.from + lastCell);
        const createCellSelection = isRowSelection ? CellSelection.rowSelection : CellSelection.colSelection;
        const firstCell = map.positionAt(isRowSelection ? index : 0, isRowSelection ? 0 : index, table.node);
        const $firstCell = tr.doc.resolve(table.from + firstCell);
        return cloneTr(tr.setSelection(createCellSelection($lastCell, $firstCell)));
      }
    }
    return tr;
  };
}
var selectRow = selectLine("row");
var selectCol = selectLine("col");
function addRowWithAlignment(ctx, tr, { map, tableStart, table }, row) {
  const rowPos = Array(row).fill(0).reduce((acc, _, i) => {
    return acc + table.child(i).nodeSize;
  }, tableStart);
  const cells = Array(map.width).fill(0).map((_, col) => {
    const headerCol = table.nodeAt(map.map[col]);
    return tableCellSchema.type(ctx).createAndFill({ alignment: headerCol == null ? void 0 : headerCol.attrs.alignment });
  });
  tr.insert(rowPos, tableRowSchema.type(ctx).create(null, cells));
  return tr;
}
function getAllCellsInTable(selection) {
  const table = findTable(selection.$from);
  if (!table)
    return;
  const map = TableMap.get(table.node);
  return map.cellsInRect({
    left: 0,
    right: map.width,
    top: 0,
    bottom: map.height
  }).map((nodePos) => {
    const node = table.node.nodeAt(nodePos);
    const pos = nodePos + table.start;
    return {
      pos,
      start: pos + 1,
      node
    };
  });
}
function selectTable(tr) {
  const cells = getAllCellsInTable(tr.selection);
  if (cells && cells[0]) {
    const $firstCell = tr.doc.resolve(cells[0].pos);
    const last = cells[cells.length - 1];
    if (last) {
      const $lastCell = tr.doc.resolve(last.pos);
      return cloneTr(tr.setSelection(new CellSelection($lastCell, $firstCell)));
    }
  }
  return tr;
}
var goToPrevTableCellCommand = $command("GoToPrevTableCell", () => () => goToNextCell(-1));
withMeta(goToPrevTableCellCommand, {
  displayName: "Command<goToPrevTableCellCommand>",
  group: "Table"
});
var goToNextTableCellCommand = $command("GoToNextTableCell", () => () => goToNextCell(1));
withMeta(goToNextTableCellCommand, {
  displayName: "Command<goToNextTableCellCommand>",
  group: "Table"
});
var exitTable = $command("ExitTable", (ctx) => () => (state, dispatch) => {
  if (!isInTable(state))
    return false;
  const { $head } = state.selection;
  const table = findParentNodeType($head, tableSchema.type(ctx));
  if (!table)
    return false;
  const { to } = table;
  const tr = state.tr.replaceWith(to, to, paragraphSchema.type(ctx).createAndFill());
  tr.setSelection(Selection.near(tr.doc.resolve(to), 1)).scrollIntoView();
  dispatch == null ? void 0 : dispatch(tr);
  return true;
});
withMeta(exitTable, {
  displayName: "Command<breakTableCommand>",
  group: "Table"
});
var insertTableCommand = $command("InsertTable", (ctx) => ({ row, col } = {}) => (state, dispatch) => {
  const { selection, tr } = state;
  const { from } = selection;
  const table = createTable(ctx, row, col);
  const _tr = tr.replaceSelectionWith(table);
  const sel = Selection.findFrom(_tr.doc.resolve(from), 1, true);
  if (sel)
    _tr.setSelection(sel);
  dispatch == null ? void 0 : dispatch(_tr);
  return true;
});
withMeta(insertTableCommand, {
  displayName: "Command<insertTableCommand>",
  group: "Table"
});
var moveRowCommand = $command("MoveRow", () => ({ from, to, pos } = {}) => moveTableRow({
  from: from ?? 0,
  to: to ?? 0,
  pos
}));
withMeta(moveRowCommand, {
  displayName: "Command<moveRowCommand>",
  group: "Table"
});
var moveColCommand = $command("MoveCol", () => ({ from, to, pos } = {}) => moveTableColumn({
  from: from ?? 0,
  to: to ?? 0,
  pos
}));
withMeta(moveColCommand, {
  displayName: "Command<moveColCommand>",
  group: "Table"
});
var selectRowCommand = $command("SelectRow", () => (payload = { index: 0 }) => (state, dispatch) => {
  const { tr } = state;
  const result = dispatch == null ? void 0 : dispatch(selectRow(payload.index, payload.pos)(tr));
  return Boolean(result);
});
withMeta(selectRowCommand, {
  displayName: "Command<selectRowCommand>",
  group: "Table"
});
var selectColCommand = $command("SelectCol", () => (payload = { index: 0 }) => (state, dispatch) => {
  const { tr } = state;
  const result = dispatch == null ? void 0 : dispatch(selectCol(payload.index, payload.pos)(tr));
  return Boolean(result);
});
withMeta(selectColCommand, {
  displayName: "Command<selectColCommand>",
  group: "Table"
});
var selectTableCommand = $command("SelectTable", () => () => (state, dispatch) => {
  const { tr } = state;
  const result = dispatch == null ? void 0 : dispatch(selectTable(tr));
  return Boolean(result);
});
withMeta(selectTableCommand, {
  displayName: "Command<selectTableCommand>",
  group: "Table"
});
var deleteSelectedCellsCommand = $command("DeleteSelectedCells", () => () => (state, dispatch) => {
  const { selection } = state;
  if (!(selection instanceof CellSelection))
    return false;
  const isRow = selection.isRowSelection();
  const isCol = selection.isColSelection();
  if (isRow && isCol)
    return deleteTable(state, dispatch);
  if (isCol)
    return deleteColumn(state, dispatch);
  else
    return deleteRow(state, dispatch);
});
withMeta(deleteSelectedCellsCommand, {
  displayName: "Command<deleteSelectedCellsCommand>",
  group: "Table"
});
var addColBeforeCommand = $command("AddColBefore", () => () => addColumnBefore);
withMeta(addColBeforeCommand, {
  displayName: "Command<addColBeforeCommand>",
  group: "Table"
});
var addColAfterCommand = $command("AddColAfter", () => () => addColumnAfter);
withMeta(addColAfterCommand, {
  displayName: "Command<addColAfterCommand>",
  group: "Table"
});
var addRowBeforeCommand = $command("AddRowBefore", (ctx) => () => (state, dispatch) => {
  if (!isInTable(state))
    return false;
  if (dispatch) {
    const rect = selectedRect(state);
    dispatch(addRowWithAlignment(ctx, state.tr, rect, rect.top));
  }
  return true;
});
withMeta(addRowBeforeCommand, {
  displayName: "Command<addRowBeforeCommand>",
  group: "Table"
});
var addRowAfterCommand = $command("AddRowAfter", (ctx) => () => (state, dispatch) => {
  if (!isInTable(state))
    return false;
  if (dispatch) {
    const rect = selectedRect(state);
    dispatch(addRowWithAlignment(ctx, state.tr, rect, rect.bottom));
  }
  return true;
});
withMeta(addRowAfterCommand, {
  displayName: "Command<addRowAfterCommand>",
  group: "Table"
});
var setAlignCommand = $command("SetAlign", () => (alignment = "left") => setCellAttr("alignment", alignment));
withMeta(setAlignCommand, {
  displayName: "Command<setAlignCommand>",
  group: "Table"
});
var insertTableInputRule = $inputRule((ctx) => new InputRule(/^\|(?<col>\d+)[xX](?<row>\d+)\|\s$/, (state, match, start, end) => {
  var _a, _b;
  const $start = state.doc.resolve(start);
  if (!$start.node(-1).canReplaceWith($start.index(-1), $start.indexAfter(-1), tableSchema.type(ctx)))
    return null;
  const tableNode = createTable(ctx, Math.max(Number(((_a = match.groups) == null ? void 0 : _a.row) ?? 0), 2), Number((_b = match.groups) == null ? void 0 : _b.col));
  const tr = state.tr.replaceRangeWith(start, end, tableNode);
  return tr.setSelection(TextSelection.create(tr.doc, start + 3)).scrollIntoView();
}));
withMeta(insertTableInputRule, {
  displayName: "InputRule<insertTableInputRule>",
  group: "Table"
});
var tablePasteRule = $pasteRule((ctx) => ({ run: (slice, _view, isPlainText) => {
  if (isPlainText)
    return slice;
  function fixTable(node) {
    var _a;
    const rowsCount = node.childCount;
    const colsCount = ((_a = node.lastChild) == null ? void 0 : _a.childCount) ?? 0;
    if (rowsCount === 0 || colsCount === 0)
      return paragraphSchema.type(ctx).create();
    const headerRow = node.firstChild;
    if (!(colsCount > 0 && headerRow && headerRow.childCount === 0))
      return node;
    if (rowsCount >= 3) {
      const firstDataRow = node.child(1);
      const headerCells2 = [];
      for (let i = 0; i < firstDataRow.childCount; i++) {
        const cell = firstDataRow.child(i);
        headerCells2.push(tableHeaderSchema.type(ctx).create(cell.attrs, cell.content, cell.marks));
      }
      const newHeaderRow2 = headerRow.type.create(headerRow.attrs, headerCells2);
      const remainingRows = [];
      for (let i = 2; i < rowsCount; i++)
        remainingRows.push(node.child(i));
      return node.type.create(node.attrs, [newHeaderRow2, ...remainingRows]);
    }
    const headerCells = Array(colsCount).fill(0).map(() => tableHeaderSchema.type(ctx).createAndFill());
    const tableCells = new Slice(Fragment.from(headerCells), 0, 0);
    const newHeaderRow = headerRow.replace(0, 0, tableCells);
    return node.replace(0, headerRow.nodeSize, new Slice(Fragment.from(newHeaderRow), 0, 0));
  }
  function wrapOrphanedRows(fragment2) {
    const rowType = tableRowSchema.type(ctx);
    const nodes = [];
    let pendingRows = [];
    let hasOrphans = false;
    function flushPendingRows() {
      if (pendingRows.length === 0)
        return;
      const emptyHeaderRow = tableHeaderRowSchema.type(ctx).createAndFill();
      const table = tableSchema.type(ctx).create(null, [emptyHeaderRow, ...pendingRows]);
      nodes.push(fixTable(table));
      pendingRows = [];
    }
    fragment2.forEach((node) => {
      if (node.type === rowType) {
        hasOrphans = true;
        pendingRows.push(node);
      } else {
        flushPendingRows();
        nodes.push(node);
      }
    });
    flushPendingRows();
    return hasOrphans ? Fragment.from(nodes) : fragment2;
  }
  function fixFragment(fragment2) {
    let result = wrapOrphanedRows(fragment2);
    let changed = result !== fragment2;
    const fixed = [];
    result.forEach((node) => {
      if (node.type === tableSchema.type(ctx)) {
        const fixedNode = fixTable(node);
        if (fixedNode !== node)
          changed = true;
        fixed.push(fixedNode);
      } else if (node.childCount > 0) {
        const fixedContent = fixFragment(node.content);
        if (fixedContent !== node.content) {
          changed = true;
          fixed.push(node.copy(fixedContent));
        } else
          fixed.push(node);
      } else
        fixed.push(node);
    });
    return changed ? Fragment.from(fixed) : fragment2;
  }
  function cleanEmptyParagraphs(fragment2) {
    const nodes = [];
    const allNodes = [];
    fragment2.forEach((node) => allNodes.push(node));
    for (let i = 0; i < allNodes.length; i++) {
      const node = allNodes[i];
      const next = allNodes[i + 1];
      if (node.type === paragraphSchema.type(ctx) && node.content.size === 0 && next && next.type === tableSchema.type(ctx))
        continue;
      nodes.push(node);
    }
    return nodes.length < allNodes.length ? Fragment.from(nodes) : fragment2;
  }
  let fragment = fixFragment(slice.content);
  fragment = cleanEmptyParagraphs(fragment);
  return new Slice(Fragment.from(fragment), slice.openStart, slice.openEnd);
} }));
withMeta(tablePasteRule, {
  displayName: "PasteRule<table>",
  group: "Table"
});
var tableKeymap = $useKeymap("tableKeymap", {
  NextCell: {
    priority: 100,
    shortcuts: ["Mod-]", "Tab"],
    command: (ctx) => {
      const commands2 = ctx.get(commandsCtx);
      return () => commands2.call(goToNextTableCellCommand.key);
    }
  },
  PrevCell: {
    shortcuts: ["Mod-[", "Shift-Tab"],
    command: (ctx) => {
      const commands2 = ctx.get(commandsCtx);
      return () => commands2.call(goToPrevTableCellCommand.key);
    }
  },
  ExitTable: {
    shortcuts: ["Mod-Enter", "Enter"],
    command: (ctx) => {
      const commands2 = ctx.get(commandsCtx);
      return () => commands2.call(exitTable.key);
    }
  }
});
withMeta(tableKeymap.ctx, {
  displayName: "KeymapCtx<table>",
  group: "Table"
});
withMeta(tableKeymap.shortcuts, {
  displayName: "Keymap<table>",
  group: "Table"
});
var id$1 = "footnote_definition";
var markdownId = "footnoteDefinition";
var footnoteDefinitionSchema = $nodeSchema("footnote_definition", () => ({
  group: "block",
  content: "block+",
  defining: true,
  attrs: { label: {
    default: "",
    validate: "string"
  } },
  parseDOM: [{
    tag: `dl[data-type="${id$1}"]`,
    getAttrs: (dom) => {
      if (!(dom instanceof HTMLElement))
        throw expectDomTypeError(dom);
      return { label: dom.dataset.label };
    },
    contentElement: "dd"
  }],
  toDOM: (node) => {
    const label = node.attrs.label;
    return [
      "dl",
      {
        "data-label": label,
        "data-type": id$1
      },
      ["dt", label],
      ["dd", 0]
    ];
  },
  parseMarkdown: {
    match: ({ type }) => type === markdownId,
    runner: (state, node, type) => {
      state.openNode(type, { label: node.label }).next(node.children).closeNode();
    }
  },
  toMarkdown: {
    match: (node) => node.type.name === id$1,
    runner: (state, node) => {
      state.openNode(markdownId, void 0, {
        label: node.attrs.label,
        identifier: node.attrs.label
      }).next(node.content).closeNode();
    }
  }
}));
withMeta(footnoteDefinitionSchema.ctx, {
  displayName: "NodeSchemaCtx<footnodeDef>",
  group: "footnote"
});
withMeta(footnoteDefinitionSchema.node, {
  displayName: "NodeSchema<footnodeDef>",
  group: "footnote"
});
var id = "footnote_reference";
var footnoteReferenceSchema = $nodeSchema("footnote_reference", () => ({
  group: "inline",
  inline: true,
  atom: true,
  attrs: { label: {
    default: "",
    validate: "string"
  } },
  parseDOM: [{
    tag: `sup[data-type="${id}"]`,
    getAttrs: (dom) => {
      if (!(dom instanceof HTMLElement))
        throw expectDomTypeError(dom);
      return { label: dom.dataset.label };
    }
  }],
  toDOM: (node) => {
    const label = node.attrs.label;
    return [
      "sup",
      {
        "data-label": label,
        "data-type": id
      },
      label
    ];
  },
  parseMarkdown: {
    match: ({ type }) => type === "footnoteReference",
    runner: (state, node, type) => {
      state.addNode(type, { label: node.label });
    }
  },
  toMarkdown: {
    match: (node) => node.type.name === id,
    runner: (state, node) => {
      state.addNode("footnoteReference", void 0, void 0, {
        label: node.attrs.label,
        identifier: node.attrs.label
      });
    }
  }
}));
withMeta(footnoteReferenceSchema.ctx, {
  displayName: "NodeSchemaCtx<footnodeRef>",
  group: "footnote"
});
withMeta(footnoteReferenceSchema.node, {
  displayName: "NodeSchema<footnodeRef>",
  group: "footnote"
});
var extendListItemSchemaForTask = listItemSchema.extendSchema((prev) => {
  return (ctx) => {
    const baseSchema = prev(ctx);
    return {
      ...baseSchema,
      attrs: {
        ...baseSchema.attrs,
        checked: {
          default: null,
          validate: "boolean|null"
        }
      },
      parseDOM: [{
        tag: 'li[data-item-type="task"]',
        getAttrs: (dom) => {
          if (!(dom instanceof HTMLElement))
            throw expectDomTypeError(dom);
          return {
            label: dom.dataset.label,
            listType: dom.dataset.listType,
            spread: dom.dataset.spread,
            checked: dom.dataset.checked ? dom.dataset.checked === "true" : null
          };
        }
      }, ...(baseSchema == null ? void 0 : baseSchema.parseDOM) || []],
      toDOM: (node) => {
        if (baseSchema.toDOM && node.attrs.checked == null)
          return baseSchema.toDOM(node);
        return [
          "li",
          {
            "data-item-type": "task",
            "data-label": node.attrs.label,
            "data-list-type": node.attrs.listType,
            "data-spread": node.attrs.spread,
            "data-checked": node.attrs.checked
          },
          0
        ];
      },
      parseMarkdown: {
        match: ({ type }) => type === "listItem",
        runner: (state, node, type) => {
          if (node.checked == null) {
            baseSchema.parseMarkdown.runner(state, node, type);
            return;
          }
          const label = node.label != null ? `${node.label}.` : "•";
          const checked = node.checked != null ? Boolean(node.checked) : null;
          const listType = node.label != null ? "ordered" : "bullet";
          const spread = node.spread != null ? `${node.spread}` : "true";
          state.openNode(type, {
            label,
            listType,
            spread,
            checked
          });
          state.next(node.children);
          state.closeNode();
        }
      },
      toMarkdown: {
        match: (node) => node.type.name === "list_item",
        runner: (state, node) => {
          if (node.attrs.checked == null) {
            baseSchema.toMarkdown.runner(state, node);
            return;
          }
          const label = node.attrs.label;
          const listType = node.attrs.listType;
          const spread = node.attrs.spread === "true";
          const checked = node.attrs.checked;
          state.openNode("listItem", void 0, {
            label,
            listType,
            spread,
            checked
          });
          state.next(node.content);
          state.closeNode();
        }
      }
    };
  };
});
withMeta(extendListItemSchemaForTask.node, {
  displayName: "NodeSchema<taskListItem>",
  group: "ListItem"
});
withMeta(extendListItemSchemaForTask.ctx, {
  displayName: "NodeSchemaCtx<taskListItem>",
  group: "ListItem"
});
var wrapInTaskListInputRule = $inputRule(() => {
  return new InputRule(/^\[(?<checked>\s|x)\]\s$/, (state, match, start, end) => {
    var _a;
    const pos = state.doc.resolve(start);
    let depth = 0;
    let node = pos.node(depth);
    while (node && node.type.name !== "list_item") {
      depth--;
      node = pos.node(depth);
    }
    if (!node || node.attrs.checked != null)
      return null;
    const checked = Boolean(((_a = match.groups) == null ? void 0 : _a.checked) === "x");
    const finPos = pos.before(depth);
    const tr = state.tr;
    tr.deleteRange(start, end).setNodeMarkup(finPos, void 0, {
      ...node.attrs,
      checked
    });
    return tr;
  });
});
withMeta(wrapInTaskListInputRule, {
  displayName: "InputRule<wrapInTaskListInputRule>",
  group: "ListItem"
});
var keymap = [strikethroughKeymap, tableKeymap].flat();
var inputRules = [insertTableInputRule, wrapInTaskListInputRule];
var markInputRules = [strikethroughInputRule];
var pasteRules = [tablePasteRule];
var autoInsertSpanPlugin = $prose(() => imeSpan);
withMeta(autoInsertSpanPlugin, {
  displayName: "Prose<autoInsertSpanPlugin>",
  group: "Prose"
});
var columnResizingPlugin = $prose(() => columnResizing({}));
withMeta(columnResizingPlugin, {
  displayName: "Prose<columnResizingPlugin>",
  group: "Prose"
});
var tableEditingPlugin = $prose(() => tableEditing({ allowTableNodeSelection: true }));
withMeta(tableEditingPlugin, {
  displayName: "Prose<tableEditingPlugin>",
  group: "Prose"
});
var remarkGFMPlugin = $remark("remarkGFM", () => remarkGfm);
withMeta(remarkGFMPlugin.plugin, {
  displayName: "Remark<remarkGFMPlugin>",
  group: "Remark"
});
withMeta(remarkGFMPlugin.options, {
  displayName: "RemarkConfig<remarkGFMPlugin>",
  group: "Remark"
});
var pluginKey = new PluginKey("MILKDOWN_KEEP_TABLE_ALIGN_PLUGIN");
function getChildIndex(node, parent) {
  let index = 0;
  parent.forEach((child, _offset, i) => {
    if (child === node)
      index = i;
  });
  return index;
}
var keepTableAlignPlugin = $prose(() => {
  return new Plugin({
    key: pluginKey,
    appendTransaction: (_tr, oldState, state) => {
      let tr;
      const check = (node, pos) => {
        if (!tr)
          tr = state.tr;
        if (node.type.name !== "table_cell")
          return;
        const $pos = state.doc.resolve(pos);
        const tableRow = $pos.node($pos.depth);
        const tableHeaderRow = $pos.node($pos.depth - 1).firstChild;
        if (!tableHeaderRow)
          return;
        const index = getChildIndex(node, tableRow);
        const headerCell = tableHeaderRow.maybeChild(index);
        if (!headerCell)
          return;
        const align = headerCell.attrs.alignment;
        if (align === node.attrs.alignment)
          return;
        tr.setNodeMarkup(pos, void 0, {
          ...node.attrs,
          alignment: align
        });
      };
      if (oldState.doc !== state.doc)
        state.doc.descendants(check);
      return tr;
    }
  });
});
withMeta(keepTableAlignPlugin, {
  displayName: "Prose<keepTableAlignPlugin>",
  group: "Prose"
});
var plugins = [
  keepTableAlignPlugin,
  autoInsertSpanPlugin,
  remarkGFMPlugin,
  tableEditingPlugin
].flat();
var schema = [
  extendListItemSchemaForTask,
  tableSchema,
  tableHeaderRowSchema,
  tableRowSchema,
  tableHeaderSchema,
  tableCellSchema,
  footnoteDefinitionSchema,
  footnoteReferenceSchema,
  strikethroughAttr,
  strikethroughSchema
].flat();
var commands = [
  goToNextTableCellCommand,
  goToPrevTableCellCommand,
  exitTable,
  insertTableCommand,
  moveRowCommand,
  moveColCommand,
  selectRowCommand,
  selectColCommand,
  selectTableCommand,
  deleteSelectedCellsCommand,
  addRowBeforeCommand,
  addRowAfterCommand,
  addColBeforeCommand,
  addColAfterCommand,
  setAlignCommand,
  toggleStrikethroughCommand
];
var gfm = [
  schema,
  inputRules,
  pasteRules,
  markInputRules,
  keymap,
  commands,
  plugins
].flat();
export {
  gfm as g,
  insertTableCommand as i
};
