import { f as factorySpace } from "./micromark-factory-space-BDeXk8zC.js";
import { m as markdownLineEnding, i as markdownSpace, h as markdownLineEndingOrSpace } from "./micromark-util-character-FzoMTwYT.js";
class EditMap {
  /**
   * Create a new edit map.
   */
  constructor() {
    this.map = [];
  }
  /**
   * Create an edit: a remove and/or add at a certain place.
   *
   * @param {number} index
   * @param {number} remove
   * @param {Array<Event>} add
   * @returns {undefined}
   */
  add(index, remove, add) {
    addImplementation(this, index, remove, add);
  }
  // To do: add this when moving to `micromark`.
  // /**
  //  * Create an edit: but insert `add` before existing additions.
  //  *
  //  * @param {number} index
  //  * @param {number} remove
  //  * @param {Array<Event>} add
  //  * @returns {undefined}
  //  */
  // addBefore(index, remove, add) {
  //   addImplementation(this, index, remove, add, true)
  // }
  /**
   * Done, change the events.
   *
   * @param {Array<Event>} events
   * @returns {undefined}
   */
  consume(events) {
    this.map.sort(function(a, b) {
      return a[0] - b[0];
    });
    if (this.map.length === 0) {
      return;
    }
    let index = this.map.length;
    const vecs = [];
    while (index > 0) {
      index -= 1;
      vecs.push(events.slice(this.map[index][0] + this.map[index][1]), this.map[index][2]);
      events.length = this.map[index][0];
    }
    vecs.push(events.slice());
    events.length = 0;
    let slice = vecs.pop();
    while (slice) {
      for (const element of slice) {
        events.push(element);
      }
      slice = vecs.pop();
    }
    this.map.length = 0;
  }
}
function addImplementation(editMap, at, remove, add) {
  let index = 0;
  if (remove === 0 && add.length === 0) {
    return;
  }
  while (index < editMap.map.length) {
    if (editMap.map[index][0] === at) {
      editMap.map[index][1] += remove;
      editMap.map[index][2].push(...add);
      return;
    }
    index += 1;
  }
  editMap.map.push([at, remove, add]);
}
function gfmTableAlign(events, index) {
  let inDelimiterRow = false;
  const align = [];
  while (index < events.length) {
    const event = events[index];
    if (inDelimiterRow) {
      if (event[0] === "enter") {
        if (event[1].type === "tableContent") {
          align.push(events[index + 1][1].type === "tableDelimiterMarker" ? "left" : "none");
        }
      } else if (event[1].type === "tableContent") {
        if (events[index - 1][1].type === "tableDelimiterMarker") {
          const alignIndex = align.length - 1;
          align[alignIndex] = align[alignIndex] === "left" ? "center" : "right";
        }
      } else if (event[1].type === "tableDelimiterRow") {
        break;
      }
    } else if (event[0] === "enter" && event[1].type === "tableDelimiterRow") {
      inDelimiterRow = true;
    }
    index += 1;
  }
  return align;
}
function gfmTable() {
  return {
    flow: {
      null: {
        name: "table",
        tokenize: tokenizeTable,
        resolveAll: resolveTable
      }
    }
  };
}
function tokenizeTable(effects, ok, nok) {
  const self = this;
  let size = 0;
  let sizeB = 0;
  let seen;
  return start;
  function start(code) {
    let index = self.events.length - 1;
    while (index > -1) {
      const type = self.events[index][1].type;
      if (type === "lineEnding" || // Note: markdown-rs uses `whitespace` instead of `linePrefix`
      type === "linePrefix") index--;
      else break;
    }
    const tail = index > -1 ? self.events[index][1].type : null;
    const next = tail === "tableHead" || tail === "tableRow" ? bodyRowStart : headRowBefore;
    if (next === bodyRowStart && self.parser.lazy[self.now().line]) {
      return nok(code);
    }
    return next(code);
  }
  function headRowBefore(code) {
    effects.enter("tableHead");
    effects.enter("tableRow");
    return headRowStart(code);
  }
  function headRowStart(code) {
    if (code === 124) {
      return headRowBreak(code);
    }
    seen = true;
    sizeB += 1;
    return headRowBreak(code);
  }
  function headRowBreak(code) {
    if (code === null) {
      return nok(code);
    }
    if (markdownLineEnding(code)) {
      if (sizeB > 1) {
        sizeB = 0;
        self.interrupt = true;
        effects.exit("tableRow");
        effects.enter("lineEnding");
        effects.consume(code);
        effects.exit("lineEnding");
        return headDelimiterStart;
      }
      return nok(code);
    }
    if (markdownSpace(code)) {
      return factorySpace(effects, headRowBreak, "whitespace")(code);
    }
    sizeB += 1;
    if (seen) {
      seen = false;
      size += 1;
    }
    if (code === 124) {
      effects.enter("tableCellDivider");
      effects.consume(code);
      effects.exit("tableCellDivider");
      seen = true;
      return headRowBreak;
    }
    effects.enter("data");
    return headRowData(code);
  }
  function headRowData(code) {
    if (code === null || code === 124 || markdownLineEndingOrSpace(code)) {
      effects.exit("data");
      return headRowBreak(code);
    }
    effects.consume(code);
    return code === 92 ? headRowEscape : headRowData;
  }
  function headRowEscape(code) {
    if (code === 92 || code === 124) {
      effects.consume(code);
      return headRowData;
    }
    return headRowData(code);
  }
  function headDelimiterStart(code) {
    self.interrupt = false;
    if (self.parser.lazy[self.now().line]) {
      return nok(code);
    }
    effects.enter("tableDelimiterRow");
    seen = false;
    if (markdownSpace(code)) {
      return factorySpace(effects, headDelimiterBefore, "linePrefix", self.parser.constructs.disable.null.includes("codeIndented") ? void 0 : 4)(code);
    }
    return headDelimiterBefore(code);
  }
  function headDelimiterBefore(code) {
    if (code === 45 || code === 58) {
      return headDelimiterValueBefore(code);
    }
    if (code === 124) {
      seen = true;
      effects.enter("tableCellDivider");
      effects.consume(code);
      effects.exit("tableCellDivider");
      return headDelimiterCellBefore;
    }
    return headDelimiterNok(code);
  }
  function headDelimiterCellBefore(code) {
    if (markdownSpace(code)) {
      return factorySpace(effects, headDelimiterValueBefore, "whitespace")(code);
    }
    return headDelimiterValueBefore(code);
  }
  function headDelimiterValueBefore(code) {
    if (code === 58) {
      sizeB += 1;
      seen = true;
      effects.enter("tableDelimiterMarker");
      effects.consume(code);
      effects.exit("tableDelimiterMarker");
      return headDelimiterLeftAlignmentAfter;
    }
    if (code === 45) {
      sizeB += 1;
      return headDelimiterLeftAlignmentAfter(code);
    }
    if (code === null || markdownLineEnding(code)) {
      return headDelimiterCellAfter(code);
    }
    return headDelimiterNok(code);
  }
  function headDelimiterLeftAlignmentAfter(code) {
    if (code === 45) {
      effects.enter("tableDelimiterFiller");
      return headDelimiterFiller(code);
    }
    return headDelimiterNok(code);
  }
  function headDelimiterFiller(code) {
    if (code === 45) {
      effects.consume(code);
      return headDelimiterFiller;
    }
    if (code === 58) {
      seen = true;
      effects.exit("tableDelimiterFiller");
      effects.enter("tableDelimiterMarker");
      effects.consume(code);
      effects.exit("tableDelimiterMarker");
      return headDelimiterRightAlignmentAfter;
    }
    effects.exit("tableDelimiterFiller");
    return headDelimiterRightAlignmentAfter(code);
  }
  function headDelimiterRightAlignmentAfter(code) {
    if (markdownSpace(code)) {
      return factorySpace(effects, headDelimiterCellAfter, "whitespace")(code);
    }
    return headDelimiterCellAfter(code);
  }
  function headDelimiterCellAfter(code) {
    if (code === 124) {
      return headDelimiterBefore(code);
    }
    if (code === null || markdownLineEnding(code)) {
      if (!seen || size !== sizeB) {
        return headDelimiterNok(code);
      }
      effects.exit("tableDelimiterRow");
      effects.exit("tableHead");
      return ok(code);
    }
    return headDelimiterNok(code);
  }
  function headDelimiterNok(code) {
    return nok(code);
  }
  function bodyRowStart(code) {
    effects.enter("tableRow");
    return bodyRowBreak(code);
  }
  function bodyRowBreak(code) {
    if (code === 124) {
      effects.enter("tableCellDivider");
      effects.consume(code);
      effects.exit("tableCellDivider");
      return bodyRowBreak;
    }
    if (code === null || markdownLineEnding(code)) {
      effects.exit("tableRow");
      return ok(code);
    }
    if (markdownSpace(code)) {
      return factorySpace(effects, bodyRowBreak, "whitespace")(code);
    }
    effects.enter("data");
    return bodyRowData(code);
  }
  function bodyRowData(code) {
    if (code === null || code === 124 || markdownLineEndingOrSpace(code)) {
      effects.exit("data");
      return bodyRowBreak(code);
    }
    effects.consume(code);
    return code === 92 ? bodyRowEscape : bodyRowData;
  }
  function bodyRowEscape(code) {
    if (code === 92 || code === 124) {
      effects.consume(code);
      return bodyRowData;
    }
    return bodyRowData(code);
  }
}
function resolveTable(events, context) {
  let index = -1;
  let inFirstCellAwaitingPipe = true;
  let rowKind = 0;
  let lastCell = [0, 0, 0, 0];
  let cell = [0, 0, 0, 0];
  let afterHeadAwaitingFirstBodyRow = false;
  let lastTableEnd = 0;
  let currentTable;
  let currentBody;
  let currentCell;
  const map = new EditMap();
  while (++index < events.length) {
    const event = events[index];
    const token = event[1];
    if (event[0] === "enter") {
      if (token.type === "tableHead") {
        afterHeadAwaitingFirstBodyRow = false;
        if (lastTableEnd !== 0) {
          flushTableEnd(map, context, lastTableEnd, currentTable, currentBody);
          currentBody = void 0;
          lastTableEnd = 0;
        }
        currentTable = {
          type: "table",
          start: Object.assign({}, token.start),
          // Note: correct end is set later.
          end: Object.assign({}, token.end)
        };
        map.add(index, 0, [["enter", currentTable, context]]);
      } else if (token.type === "tableRow" || token.type === "tableDelimiterRow") {
        inFirstCellAwaitingPipe = true;
        currentCell = void 0;
        lastCell = [0, 0, 0, 0];
        cell = [0, index + 1, 0, 0];
        if (afterHeadAwaitingFirstBodyRow) {
          afterHeadAwaitingFirstBodyRow = false;
          currentBody = {
            type: "tableBody",
            start: Object.assign({}, token.start),
            // Note: correct end is set later.
            end: Object.assign({}, token.end)
          };
          map.add(index, 0, [["enter", currentBody, context]]);
        }
        rowKind = token.type === "tableDelimiterRow" ? 2 : currentBody ? 3 : 1;
      } else if (rowKind && (token.type === "data" || token.type === "tableDelimiterMarker" || token.type === "tableDelimiterFiller")) {
        inFirstCellAwaitingPipe = false;
        if (cell[2] === 0) {
          if (lastCell[1] !== 0) {
            cell[0] = cell[1];
            currentCell = flushCell(map, context, lastCell, rowKind, void 0, currentCell);
            lastCell = [0, 0, 0, 0];
          }
          cell[2] = index;
        }
      } else if (token.type === "tableCellDivider") {
        if (inFirstCellAwaitingPipe) {
          inFirstCellAwaitingPipe = false;
        } else {
          if (lastCell[1] !== 0) {
            cell[0] = cell[1];
            currentCell = flushCell(map, context, lastCell, rowKind, void 0, currentCell);
          }
          lastCell = cell;
          cell = [lastCell[1], index, 0, 0];
        }
      }
    } else if (token.type === "tableHead") {
      afterHeadAwaitingFirstBodyRow = true;
      lastTableEnd = index;
    } else if (token.type === "tableRow" || token.type === "tableDelimiterRow") {
      lastTableEnd = index;
      if (lastCell[1] !== 0) {
        cell[0] = cell[1];
        currentCell = flushCell(map, context, lastCell, rowKind, index, currentCell);
      } else if (cell[1] !== 0) {
        currentCell = flushCell(map, context, cell, rowKind, index, currentCell);
      }
      rowKind = 0;
    } else if (rowKind && (token.type === "data" || token.type === "tableDelimiterMarker" || token.type === "tableDelimiterFiller")) {
      cell[3] = index;
    }
  }
  if (lastTableEnd !== 0) {
    flushTableEnd(map, context, lastTableEnd, currentTable, currentBody);
  }
  map.consume(context.events);
  index = -1;
  while (++index < context.events.length) {
    const event = context.events[index];
    if (event[0] === "enter" && event[1].type === "table") {
      event[1]._align = gfmTableAlign(context.events, index);
    }
  }
  return events;
}
function flushCell(map, context, range, rowKind, rowEnd, previousCell) {
  const groupName = rowKind === 1 ? "tableHeader" : rowKind === 2 ? "tableDelimiter" : "tableData";
  const valueName = "tableContent";
  if (range[0] !== 0) {
    previousCell.end = Object.assign({}, getPoint(context.events, range[0]));
    map.add(range[0], 0, [["exit", previousCell, context]]);
  }
  const now = getPoint(context.events, range[1]);
  previousCell = {
    type: groupName,
    start: Object.assign({}, now),
    // Note: correct end is set later.
    end: Object.assign({}, now)
  };
  map.add(range[1], 0, [["enter", previousCell, context]]);
  if (range[2] !== 0) {
    const relatedStart = getPoint(context.events, range[2]);
    const relatedEnd = getPoint(context.events, range[3]);
    const valueToken = {
      type: valueName,
      start: Object.assign({}, relatedStart),
      end: Object.assign({}, relatedEnd)
    };
    map.add(range[2], 0, [["enter", valueToken, context]]);
    if (rowKind !== 2) {
      const start = context.events[range[2]];
      const end = context.events[range[3]];
      start[1].end = Object.assign({}, end[1].end);
      start[1].type = "chunkText";
      start[1].contentType = "text";
      if (range[3] > range[2] + 1) {
        const a = range[2] + 1;
        const b = range[3] - range[2] - 1;
        map.add(a, b, []);
      }
    }
    map.add(range[3] + 1, 0, [["exit", valueToken, context]]);
  }
  if (rowEnd !== void 0) {
    previousCell.end = Object.assign({}, getPoint(context.events, rowEnd));
    map.add(rowEnd, 0, [["exit", previousCell, context]]);
    previousCell = void 0;
  }
  return previousCell;
}
function flushTableEnd(map, context, index, table, tableBody) {
  const exits = [];
  const related = getPoint(context.events, index);
  if (tableBody) {
    tableBody.end = Object.assign({}, related);
    exits.push(["exit", tableBody, context]);
  }
  table.end = Object.assign({}, related);
  exits.push(["exit", table, context]);
  map.add(index + 1, 0, exits);
}
function getPoint(events, index) {
  const event = events[index];
  const side = event[0] === "enter" ? "start" : "end";
  return event[1][side];
}
export {
  gfmTable as g
};
