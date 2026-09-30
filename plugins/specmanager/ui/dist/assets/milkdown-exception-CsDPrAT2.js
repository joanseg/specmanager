var ErrorCode = /* @__PURE__ */ function(ErrorCode2) {
  ErrorCode2["docTypeError"] = "docTypeError";
  ErrorCode2["contextNotFound"] = "contextNotFound";
  ErrorCode2["timerNotFound"] = "timerNotFound";
  ErrorCode2["ctxCallOutOfScope"] = "ctxCallOutOfScope";
  ErrorCode2["createNodeInParserFail"] = "createNodeInParserFail";
  ErrorCode2["stackOverFlow"] = "stackOverFlow";
  ErrorCode2["parserMatchError"] = "parserMatchError";
  ErrorCode2["serializerMatchError"] = "serializerMatchError";
  ErrorCode2["getAtomFromSchemaFail"] = "getAtomFromSchemaFail";
  ErrorCode2["expectDomTypeError"] = "expectDomTypeError";
  ErrorCode2["callCommandBeforeEditorView"] = "callCommandBeforeEditorView";
  ErrorCode2["missingRootElement"] = "missingRootElement";
  ErrorCode2["missingNodeInSchema"] = "missingNodeInSchema";
  ErrorCode2["missingMarkInSchema"] = "missingMarkInSchema";
  ErrorCode2["ctxNotBind"] = "ctxNotBind";
  ErrorCode2["missingYjsDoc"] = "missingYjsDoc";
  ErrorCode2["aiProviderError"] = "aiProviderError";
  ErrorCode2["aiBuildContextError"] = "aiBuildContextError";
  return ErrorCode2;
}({});
var MilkdownError = class extends Error {
  constructor(code, message, options) {
    super(message, options);
    this.name = "MilkdownError";
    this.code = code;
    if ((options == null ? void 0 : options.cause) !== void 0) this.cause = options.cause;
  }
};
var functionReplacer = (_, value) => typeof value === "function" ? "[Function]" : value;
var stringify = (x) => JSON.stringify(x, functionReplacer);
function docTypeError(type) {
  return new MilkdownError(ErrorCode.docTypeError, `Doc type error, unsupported type: ${stringify(type)}`);
}
function contextNotFound(name) {
  return new MilkdownError(ErrorCode.contextNotFound, `Context "${name}" not found, do you forget to inject it?`);
}
function timerNotFound(name) {
  return new MilkdownError(ErrorCode.timerNotFound, `Timer "${name}" not found, do you forget to record it?`);
}
function ctxCallOutOfScope() {
  return new MilkdownError(ErrorCode.ctxCallOutOfScope, "Should not call a context out of the plugin.");
}
function createNodeInParserFail(nodeType, attrs, content) {
  const heading = `Cannot create node for ${"name" in nodeType ? nodeType.name : nodeType}`;
  const serialize = (x) => {
    if (x == null) return "null";
    if (Array.isArray(x)) return `[${x.map(serialize).join(", ")}]`;
    if (typeof x === "object") {
      if ("toJSON" in x && typeof x.toJSON === "function") return JSON.stringify(x.toJSON());
      if ("spec" in x) return JSON.stringify(x.spec);
      return JSON.stringify(x);
    }
    if (typeof x === "string" || typeof x === "number" || typeof x === "boolean") return JSON.stringify(x);
    if (typeof x === "function") return `[Function: ${x.name || "anonymous"}]`;
    try {
      return String(x);
    } catch {
      return "[Unserializable]";
    }
  };
  const messages = [
    ["[Description]", heading],
    ["[Attributes]", attrs],
    ["[Content]", (content ?? []).map((node) => {
      if (!node) return "null";
      if (typeof node === "object" && "type" in node) return `${node}`;
      return serialize(node);
    })]
  ].reduce((acc, [title, value]) => {
    const message = `${title}: ${serialize(value)}.`;
    return acc.concat(message);
  }, []);
  return new MilkdownError(ErrorCode.createNodeInParserFail, messages.join("\n"));
}
function stackOverFlow() {
  return new MilkdownError(ErrorCode.stackOverFlow, "Stack over flow, cannot pop on an empty stack.");
}
function parserMatchError(node) {
  return new MilkdownError(ErrorCode.parserMatchError, `Cannot match target parser for node: ${stringify(node)}.`);
}
function serializerMatchError(node) {
  return new MilkdownError(ErrorCode.serializerMatchError, `Cannot match target serializer for node: ${stringify(node)}.`);
}
function expectDomTypeError(node) {
  return new MilkdownError(ErrorCode.expectDomTypeError, `Expect to be a dom, but get: ${stringify(node)}.`);
}
function callCommandBeforeEditorView() {
  return new MilkdownError(ErrorCode.callCommandBeforeEditorView, "You're trying to call a command before editor view initialized, make sure to get commandManager from ctx after editor view has been initialized");
}
function missingNodeInSchema(name) {
  return new MilkdownError(ErrorCode.missingNodeInSchema, `Missing node in schema, milkdown cannot find "${name}" in schema.`);
}
function missingMarkInSchema(name) {
  return new MilkdownError(ErrorCode.missingMarkInSchema, `Missing mark in schema, milkdown cannot find "${name}" in schema.`);
}
export {
  contextNotFound as a,
  createNodeInParserFail as b,
  callCommandBeforeEditorView as c,
  ctxCallOutOfScope as d,
  docTypeError as e,
  expectDomTypeError as f,
  missingNodeInSchema as g,
  stackOverFlow as h,
  missingMarkInSchema as m,
  parserMatchError as p,
  serializerMatchError as s,
  timerNotFound as t
};
