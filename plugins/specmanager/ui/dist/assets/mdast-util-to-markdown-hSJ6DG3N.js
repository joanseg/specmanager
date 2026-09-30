import { z as zwitch } from "./zwitch-BEZf1ZPW.js";
import { l as longestStreak } from "./longest-streak-aEh9OmVY.js";
import { c as classifyCharacter } from "./micromark-util-classify-character-DY4nayRd.js";
import { v as visit } from "./unist-util-visit-D1LqXPOY.js";
import { t as toString } from "./mdast-util-to-string-cbiyYImb.js";
import { E as EXIT } from "./unist-util-visit-parents-BnA2pxhL.js";
import { p as phrasing } from "./mdast-util-phrasing-CkjekomM.js";
import { d as decodeString } from "./micromark-util-decode-string-CbClsyLO.js";
const own = {}.hasOwnProperty;
function configure(base, extension) {
  let index = -1;
  let key;
  if (extension.extensions) {
    while (++index < extension.extensions.length) {
      configure(base, extension.extensions[index]);
    }
  }
  for (key in extension) {
    if (own.call(extension, key)) {
      switch (key) {
        case "extensions": {
          break;
        }
        case "unsafe": {
          list$1(base[key], extension[key]);
          break;
        }
        case "join": {
          list$1(base[key], extension[key]);
          break;
        }
        case "handlers": {
          map$2(base[key], extension[key]);
          break;
        }
        default: {
          base.options[key] = extension[key];
        }
      }
    }
  }
  return base;
}
function list$1(left, right) {
  if (right) {
    left.push(...right);
  }
}
function map$2(left, right) {
  if (right) {
    Object.assign(left, right);
  }
}
function blockquote(node, _, state, info) {
  const exit = state.enter("blockquote");
  const tracker = state.createTracker(info);
  tracker.move("> ");
  tracker.shift(2);
  const value = state.indentLines(state.containerFlow(node, tracker.current()), map$1);
  exit();
  return value;
}
function map$1(line, _, blank) {
  return ">" + (blank ? "" : " ") + line;
}
function patternInScope(stack, pattern) {
  return listInScope(stack, pattern.inConstruct, true) && !listInScope(stack, pattern.notInConstruct, false);
}
function listInScope(stack, list2, none) {
  if (typeof list2 === "string") {
    list2 = [list2];
  }
  if (!list2 || list2.length === 0) {
    return none;
  }
  let index = -1;
  while (++index < list2.length) {
    if (stack.includes(list2[index])) {
      return true;
    }
  }
  return false;
}
function hardBreak(_, _1, state, info) {
  let index = -1;
  while (++index < state.unsafe.length) {
    if (state.unsafe[index].character === "\n" && patternInScope(state.stack, state.unsafe[index])) {
      return /[ \t]/.test(info.before) ? "" : " ";
    }
  }
  return "\\\n";
}
function formatCodeAsIndented(node, state) {
  return Boolean(state.options.fences === false && node.value && !node.lang && /[^ \r\n]/.test(node.value) && !/^[\t ]*(?:[\r\n]|$)|(?:^|[\r\n])[\t ]*$/.test(node.value));
}
function checkFence(state) {
  const marker = state.options.fence || "`";
  if (marker !== "`" && marker !== "~") {
    throw new Error("Cannot serialize code with `" + marker + "` for `options.fence`, expected `` ` `` or `~`");
  }
  return marker;
}
function code(node, _, state, info) {
  const marker = checkFence(state);
  const raw = node.value || "";
  const suffix = marker === "`" ? "GraveAccent" : "Tilde";
  if (formatCodeAsIndented(node, state)) {
    const exit2 = state.enter("codeIndented");
    const value2 = state.indentLines(raw, map);
    exit2();
    return value2;
  }
  const tracker = state.createTracker(info);
  const sequence = marker.repeat(Math.max(longestStreak(raw, marker) + 1, 3));
  const exit = state.enter("codeFenced");
  let value = tracker.move(sequence);
  if (node.lang) {
    const subexit = state.enter(`codeFencedLang${suffix}`);
    value += tracker.move(state.safe(node.lang, {
      before: value,
      after: " ",
      encode: ["`"],
      ...tracker.current()
    }));
    subexit();
  }
  if (node.lang && node.meta) {
    const subexit = state.enter(`codeFencedMeta${suffix}`);
    value += tracker.move(" ");
    value += tracker.move(state.safe(node.meta, {
      before: value,
      after: "\n",
      encode: ["`"],
      ...tracker.current()
    }));
    subexit();
  }
  value += tracker.move("\n");
  if (raw) {
    value += tracker.move(raw + "\n");
  }
  value += tracker.move(sequence);
  exit();
  return value;
}
function map(line, _, blank) {
  return (blank ? "" : "    ") + line;
}
function checkQuote(state) {
  const marker = state.options.quote || '"';
  if (marker !== '"' && marker !== "'") {
    throw new Error("Cannot serialize title with `" + marker + "` for `options.quote`, expected `\"`, or `'`");
  }
  return marker;
}
function definition(node, _, state, info) {
  const quote = checkQuote(state);
  const suffix = quote === '"' ? "Quote" : "Apostrophe";
  const exit = state.enter("definition");
  let subexit = state.enter("label");
  const tracker = state.createTracker(info);
  let value = tracker.move("[");
  value += tracker.move(state.safe(state.associationId(node), {
    before: value,
    after: "]",
    ...tracker.current()
  }));
  value += tracker.move("]: ");
  subexit();
  if (!node.url || /[\0- \u007F]/.test(node.url)) {
    subexit = state.enter("destinationLiteral");
    value += tracker.move("<");
    value += tracker.move(state.safe(node.url, { before: value, after: ">", ...tracker.current() }));
    value += tracker.move(">");
  } else {
    subexit = state.enter("destinationRaw");
    value += tracker.move(state.safe(node.url, {
      before: value,
      after: node.title ? " " : "\n",
      ...tracker.current()
    }));
  }
  subexit();
  if (node.title) {
    subexit = state.enter(`title${suffix}`);
    value += tracker.move(" " + quote);
    value += tracker.move(state.safe(node.title, {
      before: value,
      after: quote,
      ...tracker.current()
    }));
    value += tracker.move(quote);
    subexit();
  }
  exit();
  return value;
}
function checkEmphasis(state) {
  const marker = state.options.emphasis || "*";
  if (marker !== "*" && marker !== "_") {
    throw new Error("Cannot serialize emphasis with `" + marker + "` for `options.emphasis`, expected `*`, or `_`");
  }
  return marker;
}
function encodeCharacterReference(code2) {
  return "&#x" + code2.toString(16).toUpperCase() + ";";
}
function encodeInfo(outside, inside, marker) {
  const outsideKind = classifyCharacter(outside);
  const insideKind = classifyCharacter(inside);
  if (outsideKind === void 0) {
    return insideKind === void 0 ? marker === "_" ? { inside: true, outside: true } : { inside: false, outside: false } : insideKind === 1 ? { inside: true, outside: true } : { inside: false, outside: true };
  }
  if (outsideKind === 1) {
    return insideKind === void 0 ? { inside: false, outside: false } : insideKind === 1 ? { inside: true, outside: true } : { inside: false, outside: false };
  }
  return insideKind === void 0 ? { inside: false, outside: false } : insideKind === 1 ? { inside: true, outside: false } : { inside: false, outside: false };
}
emphasis.peek = emphasisPeek;
function emphasis(node, _, state, info) {
  const marker = checkEmphasis(state);
  const exit = state.enter("emphasis");
  const tracker = state.createTracker(info);
  const before = tracker.move(marker);
  let between2 = tracker.move(state.containerPhrasing(node, {
    after: marker,
    before,
    ...tracker.current()
  }));
  const betweenHead = between2.charCodeAt(0);
  const open = encodeInfo(info.before.charCodeAt(info.before.length - 1), betweenHead, marker);
  if (open.inside) {
    between2 = encodeCharacterReference(betweenHead) + between2.slice(1);
  }
  const betweenTail = between2.charCodeAt(between2.length - 1);
  const close = encodeInfo(info.after.charCodeAt(0), betweenTail, marker);
  if (close.inside) {
    between2 = between2.slice(0, -1) + encodeCharacterReference(betweenTail);
  }
  const after = tracker.move(marker);
  exit();
  state.attentionEncodeSurroundingInfo = {
    after: close.outside,
    before: open.outside
  };
  return before + between2 + after;
}
function emphasisPeek(_, _1, state) {
  return state.options.emphasis || "*";
}
function formatHeadingAsSetext(node, state) {
  let literalWithBreak = false;
  visit(node, function(node2) {
    if ("value" in node2 && /\r?\n|\r/.test(node2.value) || node2.type === "break") {
      literalWithBreak = true;
      return EXIT;
    }
  });
  return Boolean((!node.depth || node.depth < 3) && toString(node) && (state.options.setext || literalWithBreak));
}
function heading(node, _, state, info) {
  const rank = Math.max(Math.min(6, node.depth || 1), 1);
  const tracker = state.createTracker(info);
  if (formatHeadingAsSetext(node, state)) {
    const exit2 = state.enter("headingSetext");
    const subexit2 = state.enter("phrasing");
    const value2 = state.containerPhrasing(node, {
      ...tracker.current(),
      before: "\n",
      after: "\n"
    });
    subexit2();
    exit2();
    return value2 + "\n" + (rank === 1 ? "=" : "-").repeat(value2.length - (Math.max(value2.lastIndexOf("\r"), value2.lastIndexOf("\n")) + 1));
  }
  const sequence = "#".repeat(rank);
  const exit = state.enter("headingAtx");
  const subexit = state.enter("phrasing");
  tracker.move(sequence + " ");
  let value = state.containerPhrasing(node, {
    before: "# ",
    after: "\n",
    ...tracker.current()
  });
  if (/^[\t ]/.test(value)) {
    value = encodeCharacterReference(value.charCodeAt(0)) + value.slice(1);
  }
  value = value ? sequence + " " + value : sequence;
  if (state.options.closeAtx) {
    value += " " + sequence;
  }
  subexit();
  exit();
  return value;
}
html.peek = htmlPeek;
function html(node) {
  return node.value || "";
}
function htmlPeek() {
  return "<";
}
image.peek = imagePeek;
function image(node, _, state, info) {
  const quote = checkQuote(state);
  const suffix = quote === '"' ? "Quote" : "Apostrophe";
  const exit = state.enter("image");
  let subexit = state.enter("label");
  const tracker = state.createTracker(info);
  let value = tracker.move("![");
  value += tracker.move(state.safe(node.alt, { before: value, after: "]", ...tracker.current() }));
  value += tracker.move("](");
  subexit();
  if (!node.url && node.title || /[\0- \u007F]/.test(node.url)) {
    subexit = state.enter("destinationLiteral");
    value += tracker.move("<");
    value += tracker.move(state.safe(node.url, { before: value, after: ">", ...tracker.current() }));
    value += tracker.move(">");
  } else {
    subexit = state.enter("destinationRaw");
    value += tracker.move(state.safe(node.url, {
      before: value,
      after: node.title ? " " : ")",
      ...tracker.current()
    }));
  }
  subexit();
  if (node.title) {
    subexit = state.enter(`title${suffix}`);
    value += tracker.move(" " + quote);
    value += tracker.move(state.safe(node.title, {
      before: value,
      after: quote,
      ...tracker.current()
    }));
    value += tracker.move(quote);
    subexit();
  }
  value += tracker.move(")");
  exit();
  return value;
}
function imagePeek() {
  return "!";
}
imageReference.peek = imageReferencePeek;
function imageReference(node, _, state, info) {
  const type = node.referenceType;
  const exit = state.enter("imageReference");
  let subexit = state.enter("label");
  const tracker = state.createTracker(info);
  let value = tracker.move("![");
  const alt = state.safe(node.alt, {
    before: value,
    after: "]",
    ...tracker.current()
  });
  value += tracker.move(alt + "][");
  subexit();
  const stack = state.stack;
  state.stack = [];
  subexit = state.enter("reference");
  const reference = state.safe(state.associationId(node), {
    before: value,
    after: "]",
    ...tracker.current()
  });
  subexit();
  state.stack = stack;
  exit();
  if (type === "full" || !alt || alt !== reference) {
    value += tracker.move(reference + "]");
  } else if (type === "shortcut") {
    value = value.slice(0, -1);
  } else {
    value += tracker.move("]");
  }
  return value;
}
function imageReferencePeek() {
  return "!";
}
inlineCode.peek = inlineCodePeek;
function inlineCode(node, _, state) {
  let value = node.value || "";
  let sequence = "`";
  let index = -1;
  while (new RegExp("(^|[^`])" + sequence + "([^`]|$)").test(value)) {
    sequence += "`";
  }
  if (/[^ \r\n]/.test(value) && (/^[ \r\n]/.test(value) && /[ \r\n]$/.test(value) || /^`|`$/.test(value))) {
    value = " " + value + " ";
  }
  while (++index < state.unsafe.length) {
    const pattern = state.unsafe[index];
    const expression = state.compilePattern(pattern);
    let match;
    if (!pattern.atBreak)
      continue;
    while (match = expression.exec(value)) {
      let position = match.index;
      if (value.charCodeAt(position) === 10 && value.charCodeAt(position - 1) === 13) {
        position--;
      }
      value = value.slice(0, position) + " " + value.slice(match.index + 1);
    }
  }
  return sequence + value + sequence;
}
function inlineCodePeek() {
  return "`";
}
function formatLinkAsAutolink(node, state) {
  const raw = toString(node);
  return Boolean(!state.options.resourceLink && node.url && !node.title && node.children && node.children.length === 1 && node.children[0].type === "text" && (raw === node.url || "mailto:" + raw === node.url) && /^[a-z][a-z+.-]+:/i.test(node.url) && !/[\0- <>\u007F]/.test(node.url));
}
link.peek = linkPeek;
function link(node, _, state, info) {
  const quote = checkQuote(state);
  const suffix = quote === '"' ? "Quote" : "Apostrophe";
  const tracker = state.createTracker(info);
  let exit;
  let subexit;
  if (formatLinkAsAutolink(node, state)) {
    const stack = state.stack;
    state.stack = [];
    exit = state.enter("autolink");
    let value2 = tracker.move("<");
    value2 += tracker.move(state.containerPhrasing(node, {
      before: value2,
      after: ">",
      ...tracker.current()
    }));
    value2 += tracker.move(">");
    exit();
    state.stack = stack;
    return value2;
  }
  exit = state.enter("link");
  subexit = state.enter("label");
  let value = tracker.move("[");
  value += tracker.move(state.containerPhrasing(node, {
    before: value,
    after: "](",
    ...tracker.current()
  }));
  value += tracker.move("](");
  subexit();
  if (!node.url && node.title || /[\0- \u007F]/.test(node.url)) {
    subexit = state.enter("destinationLiteral");
    value += tracker.move("<");
    value += tracker.move(state.safe(node.url, { before: value, after: ">", ...tracker.current() }));
    value += tracker.move(">");
  } else {
    subexit = state.enter("destinationRaw");
    value += tracker.move(state.safe(node.url, {
      before: value,
      after: node.title ? " " : ")",
      ...tracker.current()
    }));
  }
  subexit();
  if (node.title) {
    subexit = state.enter(`title${suffix}`);
    value += tracker.move(" " + quote);
    value += tracker.move(state.safe(node.title, {
      before: value,
      after: quote,
      ...tracker.current()
    }));
    value += tracker.move(quote);
    subexit();
  }
  value += tracker.move(")");
  exit();
  return value;
}
function linkPeek(node, _, state) {
  return formatLinkAsAutolink(node, state) ? "<" : "[";
}
linkReference.peek = linkReferencePeek;
function linkReference(node, _, state, info) {
  const type = node.referenceType;
  const exit = state.enter("linkReference");
  let subexit = state.enter("label");
  const tracker = state.createTracker(info);
  let value = tracker.move("[");
  const text2 = state.containerPhrasing(node, {
    before: value,
    after: "]",
    ...tracker.current()
  });
  value += tracker.move(text2 + "][");
  subexit();
  const stack = state.stack;
  state.stack = [];
  subexit = state.enter("reference");
  const reference = state.safe(state.associationId(node), {
    before: value,
    after: "]",
    ...tracker.current()
  });
  subexit();
  state.stack = stack;
  exit();
  if (type === "full" || !text2 || text2 !== reference) {
    value += tracker.move(reference + "]");
  } else if (type === "shortcut") {
    value = value.slice(0, -1);
  } else {
    value += tracker.move("]");
  }
  return value;
}
function linkReferencePeek() {
  return "[";
}
function checkBullet(state) {
  const marker = state.options.bullet || "*";
  if (marker !== "*" && marker !== "+" && marker !== "-") {
    throw new Error("Cannot serialize items with `" + marker + "` for `options.bullet`, expected `*`, `+`, or `-`");
  }
  return marker;
}
function checkBulletOther(state) {
  const bullet = checkBullet(state);
  const bulletOther = state.options.bulletOther;
  if (!bulletOther) {
    return bullet === "*" ? "-" : "*";
  }
  if (bulletOther !== "*" && bulletOther !== "+" && bulletOther !== "-") {
    throw new Error("Cannot serialize items with `" + bulletOther + "` for `options.bulletOther`, expected `*`, `+`, or `-`");
  }
  if (bulletOther === bullet) {
    throw new Error("Expected `bullet` (`" + bullet + "`) and `bulletOther` (`" + bulletOther + "`) to be different");
  }
  return bulletOther;
}
function checkBulletOrdered(state) {
  const marker = state.options.bulletOrdered || ".";
  if (marker !== "." && marker !== ")") {
    throw new Error("Cannot serialize items with `" + marker + "` for `options.bulletOrdered`, expected `.` or `)`");
  }
  return marker;
}
function checkRule(state) {
  const marker = state.options.rule || "*";
  if (marker !== "*" && marker !== "-" && marker !== "_") {
    throw new Error("Cannot serialize rules with `" + marker + "` for `options.rule`, expected `*`, `-`, or `_`");
  }
  return marker;
}
function list(node, parent, state, info) {
  const exit = state.enter("list");
  const bulletCurrent = state.bulletCurrent;
  let bullet = node.ordered ? checkBulletOrdered(state) : checkBullet(state);
  const bulletOther = node.ordered ? bullet === "." ? ")" : "." : checkBulletOther(state);
  let useDifferentMarker = parent && state.bulletLastUsed ? bullet === state.bulletLastUsed : false;
  if (!node.ordered) {
    const firstListItem = node.children ? node.children[0] : void 0;
    if ((bullet === "*" || bullet === "-") && firstListItem && (!firstListItem.children || !firstListItem.children[0]) && state.stack[state.stack.length - 1] === "list" && state.stack[state.stack.length - 2] === "listItem" && state.stack[state.stack.length - 3] === "list" && state.stack[state.stack.length - 4] === "listItem" && state.indexStack[state.indexStack.length - 1] === 0 && state.indexStack[state.indexStack.length - 2] === 0 && state.indexStack[state.indexStack.length - 3] === 0) {
      useDifferentMarker = true;
    }
    if (checkRule(state) === bullet && firstListItem) {
      let index = -1;
      while (++index < node.children.length) {
        const item = node.children[index];
        if (item && item.type === "listItem" && item.children && item.children[0] && item.children[0].type === "thematicBreak") {
          useDifferentMarker = true;
          break;
        }
      }
    }
  }
  if (useDifferentMarker) {
    bullet = bulletOther;
  }
  state.bulletCurrent = bullet;
  const value = state.containerFlow(node, info);
  state.bulletLastUsed = bullet;
  state.bulletCurrent = bulletCurrent;
  exit();
  return value;
}
function checkListItemIndent(state) {
  const style = state.options.listItemIndent || "one";
  if (style !== "tab" && style !== "one" && style !== "mixed") {
    throw new Error("Cannot serialize items with `" + style + "` for `options.listItemIndent`, expected `tab`, `one`, or `mixed`");
  }
  return style;
}
function listItem(node, parent, state, info) {
  const listItemIndent = checkListItemIndent(state);
  let bullet = state.bulletCurrent || checkBullet(state);
  if (parent && parent.type === "list" && parent.ordered) {
    bullet = (typeof parent.start === "number" && parent.start > -1 ? parent.start : 1) + (state.options.incrementListMarker === false ? 0 : parent.children.indexOf(node)) + bullet;
  }
  let size = bullet.length + 1;
  if (listItemIndent === "tab" || listItemIndent === "mixed" && (parent && parent.type === "list" && parent.spread || node.spread)) {
    size = Math.ceil(size / 4) * 4;
  }
  const tracker = state.createTracker(info);
  tracker.move(bullet + " ".repeat(size - bullet.length));
  tracker.shift(size);
  const exit = state.enter("listItem");
  const value = state.indentLines(state.containerFlow(node, tracker.current()), map2);
  exit();
  return value;
  function map2(line, index, blank) {
    if (index) {
      return (blank ? "" : " ".repeat(size)) + line;
    }
    return (blank ? bullet : bullet + " ".repeat(size - bullet.length)) + line;
  }
}
function paragraph(node, _, state, info) {
  const exit = state.enter("paragraph");
  const subexit = state.enter("phrasing");
  const value = state.containerPhrasing(node, info);
  subexit();
  exit();
  return value;
}
function root(node, _, state, info) {
  const hasPhrasing = node.children.some(function(d) {
    return phrasing(d);
  });
  const container = hasPhrasing ? state.containerPhrasing : state.containerFlow;
  return container.call(state, node, info);
}
function checkStrong(state) {
  const marker = state.options.strong || "*";
  if (marker !== "*" && marker !== "_") {
    throw new Error("Cannot serialize strong with `" + marker + "` for `options.strong`, expected `*`, or `_`");
  }
  return marker;
}
strong.peek = strongPeek;
function strong(node, _, state, info) {
  const marker = checkStrong(state);
  const exit = state.enter("strong");
  const tracker = state.createTracker(info);
  const before = tracker.move(marker + marker);
  let between2 = tracker.move(state.containerPhrasing(node, {
    after: marker,
    before,
    ...tracker.current()
  }));
  const betweenHead = between2.charCodeAt(0);
  const open = encodeInfo(info.before.charCodeAt(info.before.length - 1), betweenHead, marker);
  if (open.inside) {
    between2 = encodeCharacterReference(betweenHead) + between2.slice(1);
  }
  const betweenTail = between2.charCodeAt(between2.length - 1);
  const close = encodeInfo(info.after.charCodeAt(0), betweenTail, marker);
  if (close.inside) {
    between2 = between2.slice(0, -1) + encodeCharacterReference(betweenTail);
  }
  const after = tracker.move(marker + marker);
  exit();
  state.attentionEncodeSurroundingInfo = {
    after: close.outside,
    before: open.outside
  };
  return before + between2 + after;
}
function strongPeek(_, _1, state) {
  return state.options.strong || "*";
}
function text(node, _, state, info) {
  return state.safe(node.value, info);
}
function checkRuleRepetition(state) {
  const repetition = state.options.ruleRepetition || 3;
  if (repetition < 3) {
    throw new Error("Cannot serialize rules with repetition `" + repetition + "` for `options.ruleRepetition`, expected `3` or more");
  }
  return repetition;
}
function thematicBreak(_, _1, state) {
  const value = (checkRule(state) + (state.options.ruleSpaces ? " " : "")).repeat(checkRuleRepetition(state));
  return state.options.ruleSpaces ? value.slice(0, -1) : value;
}
const handle = {
  blockquote,
  break: hardBreak,
  code,
  definition,
  emphasis,
  hardBreak,
  heading,
  html,
  image,
  imageReference,
  inlineCode,
  link,
  linkReference,
  list,
  listItem,
  paragraph,
  root,
  strong,
  text,
  thematicBreak
};
const join = [joinDefaults];
function joinDefaults(left, right, parent, state) {
  if (right.type === "code" && formatCodeAsIndented(right, state) && (left.type === "list" || left.type === right.type && formatCodeAsIndented(left, state))) {
    return false;
  }
  if ("spread" in parent && typeof parent.spread === "boolean") {
    if (left.type === "paragraph" && (left.type === right.type || right.type === "definition" || right.type === "heading" && formatHeadingAsSetext(right, state))) {
      return;
    }
    return parent.spread ? 1 : 0;
  }
}
const fullPhrasingSpans = [
  "autolink",
  "destinationLiteral",
  "destinationRaw",
  "reference",
  "titleQuote",
  "titleApostrophe"
];
const unsafe = [
  { character: "	", after: "[\\r\\n]", inConstruct: "phrasing" },
  { character: "	", before: "[\\r\\n]", inConstruct: "phrasing" },
  {
    character: "	",
    inConstruct: ["codeFencedLangGraveAccent", "codeFencedLangTilde"]
  },
  {
    character: "\r",
    inConstruct: [
      "codeFencedLangGraveAccent",
      "codeFencedLangTilde",
      "codeFencedMetaGraveAccent",
      "codeFencedMetaTilde",
      "destinationLiteral",
      "headingAtx"
    ]
  },
  {
    character: "\n",
    inConstruct: [
      "codeFencedLangGraveAccent",
      "codeFencedLangTilde",
      "codeFencedMetaGraveAccent",
      "codeFencedMetaTilde",
      "destinationLiteral",
      "headingAtx"
    ]
  },
  { character: " ", after: "[\\r\\n]", inConstruct: "phrasing" },
  { character: " ", before: "[\\r\\n]", inConstruct: "phrasing" },
  {
    character: " ",
    inConstruct: ["codeFencedLangGraveAccent", "codeFencedLangTilde"]
  },
  {
    character: "!",
    after: "\\[",
    inConstruct: "phrasing",
    notInConstruct: fullPhrasingSpans
  },
  { character: '"', inConstruct: "titleQuote" },
  { atBreak: true, character: "#" },
  { character: "#", inConstruct: "headingAtx", after: "(?:[\r\n]|$)" },
  { character: "&", after: "[#A-Za-z]", inConstruct: "phrasing" },
  { character: "'", inConstruct: "titleApostrophe" },
  { character: "(", inConstruct: "destinationRaw" },
  {
    before: "\\]",
    character: "(",
    inConstruct: "phrasing",
    notInConstruct: fullPhrasingSpans
  },
  { atBreak: true, before: "\\d+", character: ")" },
  { character: ")", inConstruct: "destinationRaw" },
  { atBreak: true, character: "*", after: "(?:[ 	\r\n*])" },
  { character: "*", inConstruct: "phrasing", notInConstruct: fullPhrasingSpans },
  { atBreak: true, character: "+", after: "(?:[ 	\r\n])" },
  { atBreak: true, character: "-", after: "(?:[ 	\r\n-])" },
  { atBreak: true, before: "\\d+", character: ".", after: "(?:[ 	\r\n]|$)" },
  { atBreak: true, character: "<", after: "[!/?A-Za-z]" },
  {
    character: "<",
    after: "[!/?A-Za-z]",
    inConstruct: "phrasing",
    notInConstruct: fullPhrasingSpans
  },
  { character: "<", inConstruct: "destinationLiteral" },
  { atBreak: true, character: "=" },
  { atBreak: true, character: ">" },
  { character: ">", inConstruct: "destinationLiteral" },
  { atBreak: true, character: "[" },
  { character: "[", inConstruct: "phrasing", notInConstruct: fullPhrasingSpans },
  { character: "[", inConstruct: ["label", "reference"] },
  { character: "\\", after: "[\\r\\n]", inConstruct: "phrasing" },
  { character: "]", inConstruct: ["label", "reference"] },
  { atBreak: true, character: "_" },
  { character: "_", inConstruct: "phrasing", notInConstruct: fullPhrasingSpans },
  { atBreak: true, character: "`" },
  {
    character: "`",
    inConstruct: ["codeFencedLangGraveAccent", "codeFencedMetaGraveAccent"]
  },
  { character: "`", inConstruct: "phrasing", notInConstruct: fullPhrasingSpans },
  { atBreak: true, character: "~" }
];
function association(node) {
  if (node.label || !node.identifier) {
    return node.label || "";
  }
  return decodeString(node.identifier);
}
function compilePattern(pattern) {
  if (!pattern._compiled) {
    const before = (pattern.atBreak ? "[\\r\\n][\\t ]*" : "") + (pattern.before ? "(?:" + pattern.before + ")" : "");
    pattern._compiled = new RegExp((before ? "(" + before + ")" : "") + (/[|\\{}()[\]^$+*?.-]/.test(pattern.character) ? "\\" : "") + pattern.character + (pattern.after ? "(?:" + pattern.after + ")" : ""), "g");
  }
  return pattern._compiled;
}
function containerPhrasing(parent, state, info) {
  const indexStack = state.indexStack;
  const children = parent.children || [];
  const results = [];
  let index = -1;
  let before = info.before;
  let encodeAfter;
  indexStack.push(-1);
  let tracker = state.createTracker(info);
  while (++index < children.length) {
    const child = children[index];
    let after;
    indexStack[indexStack.length - 1] = index;
    if (index + 1 < children.length) {
      let handle2 = state.handle.handlers[children[index + 1].type];
      if (handle2 && handle2.peek)
        handle2 = handle2.peek;
      after = handle2 ? handle2(children[index + 1], parent, state, {
        before: "",
        after: "",
        ...tracker.current()
      }).charAt(0) : "";
    } else {
      after = info.after;
    }
    if (results.length > 0 && (before === "\r" || before === "\n") && child.type === "html") {
      results[results.length - 1] = results[results.length - 1].replace(/(\r?\n|\r)$/, " ");
      before = " ";
      tracker = state.createTracker(info);
      tracker.move(results.join(""));
    }
    let value = state.handle(child, parent, state, {
      ...tracker.current(),
      after,
      before
    });
    if (encodeAfter && encodeAfter === value.slice(0, 1)) {
      value = encodeCharacterReference(encodeAfter.charCodeAt(0)) + value.slice(1);
    }
    const encodingInfo = state.attentionEncodeSurroundingInfo;
    state.attentionEncodeSurroundingInfo = void 0;
    encodeAfter = void 0;
    if (encodingInfo) {
      if (results.length > 0 && encodingInfo.before && before === results[results.length - 1].slice(-1)) {
        results[results.length - 1] = results[results.length - 1].slice(0, -1) + encodeCharacterReference(before.charCodeAt(0));
      }
      if (encodingInfo.after)
        encodeAfter = after;
    }
    tracker.move(value);
    results.push(value);
    before = value.slice(-1);
  }
  indexStack.pop();
  return results.join("");
}
function containerFlow(parent, state, info) {
  const indexStack = state.indexStack;
  const children = parent.children || [];
  const tracker = state.createTracker(info);
  const results = [];
  let index = -1;
  indexStack.push(-1);
  while (++index < children.length) {
    const child = children[index];
    indexStack[indexStack.length - 1] = index;
    results.push(tracker.move(state.handle(child, parent, state, {
      before: "\n",
      after: "\n",
      ...tracker.current()
    })));
    if (child.type !== "list") {
      state.bulletLastUsed = void 0;
    }
    if (index < children.length - 1) {
      results.push(tracker.move(between(child, children[index + 1], parent, state)));
    }
  }
  indexStack.pop();
  return results.join("");
}
function between(left, right, parent, state) {
  let index = state.join.length;
  while (index--) {
    const result = state.join[index](left, right, parent, state);
    if (result === true || result === 1) {
      break;
    }
    if (typeof result === "number") {
      return "\n".repeat(1 + result);
    }
    if (result === false) {
      return "\n\n<!---->\n\n";
    }
  }
  return "\n\n";
}
const eol = /\r?\n|\r/g;
function indentLines(value, map2) {
  const result = [];
  let start = 0;
  let line = 0;
  let match;
  while (match = eol.exec(value)) {
    one(value.slice(start, match.index));
    result.push(match[0]);
    start = match.index + match[0].length;
    line++;
  }
  one(value.slice(start));
  return result.join("");
  function one(value2) {
    result.push(map2(value2, line, !value2));
  }
}
function safe(state, input, config) {
  const value = (config.before || "") + (input || "") + (config.after || "");
  const positions = [];
  const result = [];
  const infos = {};
  let index = -1;
  while (++index < state.unsafe.length) {
    const pattern = state.unsafe[index];
    if (!patternInScope(state.stack, pattern)) {
      continue;
    }
    const expression = state.compilePattern(pattern);
    let match;
    while (match = expression.exec(value)) {
      const before = "before" in pattern || Boolean(pattern.atBreak);
      const after = "after" in pattern;
      const position = match.index + (before ? match[1].length : 0);
      if (positions.includes(position)) {
        if (infos[position].before && !before) {
          infos[position].before = false;
        }
        if (infos[position].after && !after) {
          infos[position].after = false;
        }
      } else {
        positions.push(position);
        infos[position] = { before, after };
      }
    }
  }
  positions.sort(numerical);
  let start = config.before ? config.before.length : 0;
  const end = value.length - (config.after ? config.after.length : 0);
  index = -1;
  while (++index < positions.length) {
    const position = positions[index];
    if (position < start || position >= end) {
      continue;
    }
    if (position + 1 < end && positions[index + 1] === position + 1 && infos[position].after && !infos[position + 1].before && !infos[position + 1].after || positions[index - 1] === position - 1 && infos[position].before && !infos[position - 1].before && !infos[position - 1].after) {
      continue;
    }
    if (start !== position) {
      result.push(escapeBackslashes(value.slice(start, position), "\\"));
    }
    start = position;
    if (/[!-/:-@[-`{-~]/.test(value.charAt(position)) && (!config.encode || !config.encode.includes(value.charAt(position)))) {
      result.push("\\");
    } else {
      result.push(encodeCharacterReference(value.charCodeAt(position)));
      start++;
    }
  }
  result.push(escapeBackslashes(value.slice(start, end), config.after));
  return result.join("");
}
function numerical(a, b) {
  return a - b;
}
function escapeBackslashes(value, after) {
  const expression = /\\(?=[!-/:-@[-`{-~])/g;
  const positions = [];
  const results = [];
  const whole = value + after;
  let index = -1;
  let start = 0;
  let match;
  while (match = expression.exec(whole)) {
    positions.push(match.index);
  }
  while (++index < positions.length) {
    if (start !== positions[index]) {
      results.push(value.slice(start, positions[index]));
    }
    results.push("\\");
    start = positions[index];
  }
  results.push(value.slice(start));
  return results.join("");
}
function track(config) {
  const options = config || {};
  const now = options.now || {};
  let lineShift = options.lineShift || 0;
  let line = now.line || 1;
  let column = now.column || 1;
  return { move, current, shift };
  function current() {
    return { now: { line, column }, lineShift };
  }
  function shift(value) {
    lineShift += value;
  }
  function move(input) {
    const value = input || "";
    const chunks = value.split(/\r?\n|\r/g);
    const tail = chunks[chunks.length - 1];
    line += chunks.length - 1;
    column = chunks.length === 1 ? column + tail.length : 1 + tail.length + lineShift;
    return value;
  }
}
function toMarkdown(tree, options) {
  const settings = options || {};
  const state = {
    associationId: association,
    containerPhrasing: containerPhrasingBound,
    containerFlow: containerFlowBound,
    createTracker: track,
    compilePattern,
    enter,
    handlers: { ...handle },
    handle: void 0,
    indentLines,
    indexStack: [],
    join: [...join],
    options: {},
    safe: safeBound,
    stack: [],
    unsafe: [...unsafe]
  };
  configure(state, settings);
  if (state.options.tightDefinitions) {
    state.join.push(joinDefinition);
  }
  state.handle = zwitch("type", {
    invalid,
    unknown,
    handlers: state.handlers
  });
  let result = state.handle(tree, void 0, state, {
    before: "\n",
    after: "\n",
    now: { line: 1, column: 1 },
    lineShift: 0
  });
  if (result && result.charCodeAt(result.length - 1) !== 10 && result.charCodeAt(result.length - 1) !== 13) {
    result += "\n";
  }
  return result;
  function enter(name) {
    state.stack.push(name);
    return exit;
    function exit() {
      state.stack.pop();
    }
  }
}
function invalid(value) {
  throw new Error("Cannot handle value `" + value + "`, expected node");
}
function unknown(value) {
  const node = value;
  throw new Error("Cannot handle unknown node `" + node.type + "`");
}
function joinDefinition(left, right) {
  if (left.type === "definition" && left.type === right.type) {
    return 0;
  }
}
function containerPhrasingBound(parent, info) {
  return containerPhrasing(parent, this, info);
}
function containerFlowBound(parent, info) {
  return containerFlow(parent, this, info);
}
function safeBound(value, config) {
  return safe(this, value, config);
}
export {
  handle as h,
  toMarkdown as t
};
