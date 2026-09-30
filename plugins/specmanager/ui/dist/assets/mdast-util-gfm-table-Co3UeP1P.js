import { o as ok } from "./devlop-BS6z0SoE.js";
import { m as markdownTable } from "./markdown-table-CHoYPLol.js";
import { h as handle } from "./mdast-util-to-markdown-ljU3R65o.js";
function gfmTableFromMarkdown() {
  return {
    enter: {
      table: enterTable,
      tableData: enterCell,
      tableHeader: enterCell,
      tableRow: enterRow
    },
    exit: {
      codeText: exitCodeText,
      table: exitTable,
      tableData: exit,
      tableHeader: exit,
      tableRow: exit
    }
  };
}
function enterTable(token) {
  const align = token._align;
  this.enter(
    {
      type: "table",
      align: align.map(function(d) {
        return d === "none" ? null : d;
      }),
      children: []
    },
    token
  );
  this.data.inTable = true;
}
function exitTable(token) {
  this.exit(token);
  this.data.inTable = void 0;
}
function enterRow(token) {
  this.enter({ type: "tableRow", children: [] }, token);
}
function exit(token) {
  this.exit(token);
}
function enterCell(token) {
  this.enter({ type: "tableCell", children: [] }, token);
}
function exitCodeText(token) {
  let value = this.resume();
  if (this.data.inTable) {
    value = value.replace(/\\([\\|])/g, replace);
  }
  const node = this.stack[this.stack.length - 1];
  ok(node.type === "inlineCode");
  node.value = value;
  this.exit(token);
}
function replace($0, $1) {
  return $1 === "|" ? $1 : $0;
}
function gfmTableToMarkdown(options) {
  const settings = options || {};
  const padding = settings.tableCellPadding;
  const alignDelimiters = settings.tablePipeAlign;
  const stringLength = settings.stringLength;
  const around = padding ? " " : "|";
  return {
    unsafe: [
      { character: "\r", inConstruct: "tableCell" },
      { character: "\n", inConstruct: "tableCell" },
      // A pipe, when followed by a tab or space (padding), or a dash or colon
      // (unpadded delimiter row), could result in a table.
      { atBreak: true, character: "|", after: "[	 :-]" },
      // A pipe in a cell must be encoded.
      { character: "|", inConstruct: "tableCell" },
      // A colon must be followed by a dash, in which case it could start a
      // delimiter row.
      { atBreak: true, character: ":", after: "-" },
      // A delimiter row can also start with a dash, when followed by more
      // dashes, a colon, or a pipe.
      // This is a stricter version than the built in check for lists, thematic
      // breaks, and setex heading underlines though:
      // <https://github.com/syntax-tree/mdast-util-to-markdown/blob/51a2038/lib/unsafe.js#L57>
      { atBreak: true, character: "-", after: "[:|-]" }
    ],
    handlers: {
      inlineCode: inlineCodeWithTable,
      table: handleTable,
      tableCell: handleTableCell,
      tableRow: handleTableRow
    }
  };
  function handleTable(node, _, state, info) {
    return serializeData(handleTableAsData(node, state, info), node.align);
  }
  function handleTableRow(node, _, state, info) {
    const row = handleTableRowAsData(node, state, info);
    const value = serializeData([row]);
    return value.slice(0, value.indexOf("\n"));
  }
  function handleTableCell(node, _, state, info) {
    const exit2 = state.enter("tableCell");
    const subexit = state.enter("phrasing");
    const value = state.containerPhrasing(node, {
      ...info,
      before: around,
      after: around
    });
    subexit();
    exit2();
    return value;
  }
  function serializeData(matrix, align) {
    return markdownTable(matrix, {
      align,
      // @ts-expect-error: `markdown-table` types should support `null`.
      alignDelimiters,
      // @ts-expect-error: `markdown-table` types should support `null`.
      padding,
      // @ts-expect-error: `markdown-table` types should support `null`.
      stringLength
    });
  }
  function handleTableAsData(node, state, info) {
    const children = node.children;
    let index = -1;
    const result = [];
    const subexit = state.enter("table");
    while (++index < children.length) {
      result[index] = handleTableRowAsData(children[index], state, info);
    }
    subexit();
    return result;
  }
  function handleTableRowAsData(node, state, info) {
    const children = node.children;
    let index = -1;
    const result = [];
    const subexit = state.enter("tableRow");
    while (++index < children.length) {
      result[index] = handleTableCell(children[index], node, state, info);
    }
    subexit();
    return result;
  }
  function inlineCodeWithTable(node, parent, state) {
    let value = handle.inlineCode(node, parent, state);
    if (state.stack.includes("tableCell")) {
      value = value.replace(/\|/g, "\\$&");
    }
    return value;
  }
}
export {
  gfmTableToMarkdown as a,
  gfmTableFromMarkdown as g
};
