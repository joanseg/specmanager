var __typeError = (msg) => {
  throw TypeError(msg);
};
var __accessCheck = (obj, member, msg) => member.has(obj) || __typeError("Cannot " + msg);
var __privateGet = (obj, member, getter) => (__accessCheck(obj, member, "read from private field"), getter ? getter.call(obj) : member.get(obj));
var __privateAdd = (obj, member, value) => member.has(obj) ? __typeError("Cannot add the same private member more than once") : member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
var __privateSet = (obj, member, value, setter) => (__accessCheck(obj, member, "write to private field"), setter ? setter.call(obj, value) : member.set(obj, value), value);
var _container, _ctx, _a, _ctx2, _keymap, _b, _enableInspector, _status, _configureList, _onStatusChange, _container2, _clock, _usrPluginStore, _sysPluginStore, _ctx3, _loadInternal, _prepare, _cleanup, _cleanupInternal, _setStatus, _loadPluginInStore, _c;
import { a as Container, C as Clock, b as Ctx, c as createSlice, d as createTimer } from "./milkdown-ctx-B6ZmVA8d.js";
import { d as ctxCallOutOfScope, c as callCommandBeforeEditorView, e as docTypeError } from "./milkdown-exception-EEjztD1-.js";
import { a as customInputRules } from "./milkdown-prose-BA0s8Ct0.js";
import { P as ParserState, S as SerializerState } from "./milkdown-transformer-BqQ-j1sm.js";
import { S as Schema, D as DOMParser, N as Node } from "./prosemirror-model-CNXHVs9h.js";
import { P as Plugin, a as PluginKey, E as EditorState } from "./prosemirror-state-DvBpuTqc.js";
import { a as keymap$1 } from "./prosemirror-keymap-bzw026ae.js";
import { E as EditorView } from "./prosemirror-view-DUWIvuYX.js";
import { u as unified } from "./unified-CC3fFDkr.js";
import { r as remarkParse } from "./remark-parse-BPG5bXNI.js";
import { r as remarkStringify } from "./remark-stringify-BPnE7XFK.js";
import { c as chainCommands, b as baseKeymap, s as selectNodeBackward, a as joinTextblockBackward, d as deleteSelection } from "./prosemirror-commands-D6u-7607.js";
import { u as undoInputRule } from "./prosemirror-inputrules-DwANvdfL.js";
function withMeta(plugin, meta) {
  plugin.meta = {
    package: "@milkdown/core",
    group: "System",
    ...meta
  };
  return plugin;
}
var remarkHandlers = {
  text: (node, _, state, info) => {
    const value = node.value;
    if (/^[^*_\\]*\s+$/.test(value))
      return value;
    return state.safe(value, {
      ...info,
      encode: []
    });
  },
  strong: (node, _, state, info) => {
    const marker = node.marker || state.options.strong || "*";
    const exit = state.enter("strong");
    const tracker = state.createTracker(info);
    let value = tracker.move(marker + marker);
    value += tracker.move(state.containerPhrasing(node, {
      before: value,
      after: marker,
      ...tracker.current()
    }));
    value += tracker.move(marker + marker);
    exit();
    return value;
  },
  emphasis: (node, _, state, info) => {
    const marker = node.marker || state.options.emphasis || "*";
    const exit = state.enter("emphasis");
    const tracker = state.createTracker(info);
    let value = tracker.move(marker);
    value += tracker.move(state.containerPhrasing(node, {
      before: value,
      after: marker,
      ...tracker.current()
    }));
    value += tracker.move(marker);
    exit();
    return value;
  }
};
var editorViewCtx = createSlice({}, "editorView");
var editorStateCtx = createSlice({}, "editorState");
var initTimerCtx = createSlice([], "initTimer");
var editorCtx = createSlice({}, "editor");
var inputRulesCtx = createSlice([], "inputRules");
var prosePluginsCtx = createSlice([], "prosePlugins");
var remarkPluginsCtx = createSlice([], "remarkPlugins");
var nodeViewCtx = createSlice([], "nodeView");
var markViewCtx = createSlice([], "markView");
var remarkCtx = createSlice(unified().use(remarkParse).use(remarkStringify), "remark");
var remarkStringifyOptionsCtx = createSlice({
  handlers: remarkHandlers,
  encode: []
}, "remarkStringifyOptions");
var ConfigReady = createTimer("ConfigReady");
function config(configure) {
  const plugin = (ctx) => {
    ctx.record(ConfigReady);
    return async () => {
      await configure(ctx);
      ctx.done(ConfigReady);
      return () => {
        ctx.clearTimer(ConfigReady);
      };
    };
  };
  withMeta(plugin, { displayName: "Config" });
  return plugin;
}
var InitReady = createTimer("InitReady");
function init(editor) {
  const plugin = (ctx) => {
    ctx.inject(editorCtx, editor).inject(prosePluginsCtx, []).inject(remarkPluginsCtx, []).inject(inputRulesCtx, []).inject(nodeViewCtx, []).inject(markViewCtx, []).inject(remarkStringifyOptionsCtx, {
      handlers: remarkHandlers,
      encode: []
    }).inject(remarkCtx, unified().use(remarkParse).use(remarkStringify)).inject(initTimerCtx, [ConfigReady]).record(InitReady);
    return async () => {
      await ctx.waitTimers(initTimerCtx);
      const options = ctx.get(remarkStringifyOptionsCtx);
      ctx.set(remarkCtx, unified().use(remarkParse).use(remarkStringify, options));
      ctx.done(InitReady);
      return () => {
        ctx.remove(editorCtx).remove(prosePluginsCtx).remove(remarkPluginsCtx).remove(inputRulesCtx).remove(nodeViewCtx).remove(markViewCtx).remove(remarkStringifyOptionsCtx).remove(remarkCtx).remove(initTimerCtx).clearTimer(InitReady);
      };
    };
  };
  withMeta(plugin, { displayName: "Init" });
  return plugin;
}
var SchemaReady = createTimer("SchemaReady");
var schemaTimerCtx = createSlice([], "schemaTimer");
var schemaCtx = createSlice({}, "schema");
var nodesCtx = createSlice([], "nodes");
var marksCtx = createSlice([], "marks");
function extendPriority(x) {
  var _a2;
  return {
    ...x,
    parseDOM: (_a2 = x.parseDOM) == null ? void 0 : _a2.map((rule) => ({
      priority: x.priority,
      ...rule
    }))
  };
}
var schema = (ctx) => {
  ctx.inject(schemaCtx, {}).inject(nodesCtx, []).inject(marksCtx, []).inject(schemaTimerCtx, [InitReady]).record(SchemaReady);
  return async () => {
    await ctx.waitTimers(schemaTimerCtx);
    const remark = ctx.get(remarkCtx);
    const processor = ctx.get(remarkPluginsCtx).reduce((acc, plug) => acc.use(plug.plugin, plug.options), remark);
    ctx.set(remarkCtx, processor);
    const schema2 = new Schema({
      nodes: Object.fromEntries(ctx.get(nodesCtx).map(([key2, x]) => [key2, extendPriority(x)])),
      marks: Object.fromEntries(ctx.get(marksCtx).map(([key2, x]) => [key2, extendPriority(x)]))
    });
    ctx.set(schemaCtx, schema2);
    ctx.done(SchemaReady);
    return () => {
      ctx.remove(schemaCtx).remove(nodesCtx).remove(marksCtx).remove(schemaTimerCtx).clearTimer(SchemaReady);
    };
  };
};
withMeta(schema, { displayName: "Schema" });
var CommandManager = (_a = class {
  constructor() {
    __privateAdd(this, _container);
    __privateAdd(this, _ctx);
    __privateSet(this, _container, new Container());
    __privateSet(this, _ctx, null);
    this.setCtx = (ctx) => {
      __privateSet(this, _ctx, ctx);
    };
    this.chain = () => {
      if (__privateGet(this, _ctx) == null)
        throw callCommandBeforeEditorView();
      const ctx = __privateGet(this, _ctx);
      const commands2 = [];
      const get = this.get.bind(this);
      const chains = {
        run: () => {
          const chained = chainCommands(...commands2);
          const view = ctx.get(editorViewCtx);
          return chained(view.state, view.dispatch, view);
        },
        inline: (command) => {
          commands2.push(command);
          return chains;
        },
        pipe: pipe.bind(this)
      };
      function pipe(slice, payload) {
        const cmd = get(slice);
        commands2.push(cmd(payload));
        return chains;
      }
      return chains;
    };
  }
  get ctx() {
    return __privateGet(this, _ctx);
  }
  create(meta, value) {
    const slice = meta.create(__privateGet(this, _container).sliceMap);
    slice.set(value);
    return slice;
  }
  get(slice) {
    return __privateGet(this, _container).get(slice).get();
  }
  remove(slice) {
    return __privateGet(this, _container).remove(slice);
  }
  call(slice, payload) {
    if (__privateGet(this, _ctx) == null)
      throw callCommandBeforeEditorView();
    const command = this.get(slice)(payload);
    const view = __privateGet(this, _ctx).get(editorViewCtx);
    return command(view.state, view.dispatch, view);
  }
  inline(command) {
    if (__privateGet(this, _ctx) == null)
      throw callCommandBeforeEditorView();
    const view = __privateGet(this, _ctx).get(editorViewCtx);
    return command(view.state, view.dispatch, view);
  }
}, _container = new WeakMap(), _ctx = new WeakMap(), _a);
function createCmdKey(key2 = "cmdKey") {
  return createSlice(() => () => false, key2);
}
var commandsCtx = createSlice(new CommandManager(), "commands");
var commandsTimerCtx = createSlice([SchemaReady], "commandsTimer");
var CommandsReady = createTimer("CommandsReady");
var commands = (ctx) => {
  const cmd = new CommandManager();
  cmd.setCtx(ctx);
  ctx.inject(commandsCtx, cmd).inject(commandsTimerCtx, [SchemaReady]).record(CommandsReady);
  return async () => {
    await ctx.waitTimers(commandsTimerCtx);
    ctx.done(CommandsReady);
    return () => {
      ctx.remove(commandsCtx).remove(commandsTimerCtx).clearTimer(CommandsReady);
    };
  };
};
withMeta(commands, { displayName: "Commands" });
function overrideBaseKeymap(keymap2) {
  keymap2.Backspace = chainCommands(undoInputRule, deleteSelection, joinTextblockBackward, selectNodeBackward);
  return keymap2;
}
var KeymapManager = (_b = class {
  constructor() {
    __privateAdd(this, _ctx2);
    __privateAdd(this, _keymap);
    __privateSet(this, _ctx2, null);
    __privateSet(this, _keymap, []);
    this.setCtx = (ctx) => {
      __privateSet(this, _ctx2, ctx);
    };
    this.add = (keymap2) => {
      __privateGet(this, _keymap).push(keymap2);
      return () => {
        __privateSet(this, _keymap, __privateGet(this, _keymap).filter((item) => item !== keymap2));
      };
    };
    this.addObjectKeymap = (keymaps) => {
      const remove = [];
      Object.entries(keymaps).forEach(([key2, command]) => {
        if (typeof command === "function") {
          const keymapItem = {
            key: key2,
            onRun: () => command
          };
          __privateGet(this, _keymap).push(keymapItem);
          remove.push(() => {
            __privateSet(this, _keymap, __privateGet(this, _keymap).filter((item) => item !== keymapItem));
          });
        } else {
          __privateGet(this, _keymap).push(command);
          remove.push(() => {
            __privateSet(this, _keymap, __privateGet(this, _keymap).filter((item) => item !== command));
          });
        }
      });
      return () => {
        remove.forEach((fn) => fn());
      };
    };
    this.addBaseKeymap = () => {
      const base = overrideBaseKeymap(baseKeymap);
      return this.addObjectKeymap(base);
    };
    this.build = () => {
      const keymap2 = {};
      __privateGet(this, _keymap).forEach((item) => {
        keymap2[item.key] = [...keymap2[item.key] || [], item];
      });
      return Object.fromEntries(Object.entries(keymap2).map(([key2, items]) => {
        const sortedItems = items.sort((a, b) => (b.priority ?? 50) - (a.priority ?? 50));
        const command = (state, dispatch, view) => {
          const ctx = __privateGet(this, _ctx2);
          if (ctx == null)
            throw ctxCallOutOfScope();
          return chainCommands(...sortedItems.map((item) => item.onRun(ctx)))(state, dispatch, view);
        };
        return [key2, command];
      }));
    };
  }
  get ctx() {
    return __privateGet(this, _ctx2);
  }
}, _ctx2 = new WeakMap(), _keymap = new WeakMap(), _b);
var keymapCtx = createSlice(new KeymapManager(), "keymap");
var keymapTimerCtx = createSlice([SchemaReady], "keymapTimer");
var KeymapReady = createTimer("KeymapReady");
var keymap = (ctx) => {
  const km = new KeymapManager();
  km.setCtx(ctx);
  ctx.inject(keymapCtx, km).inject(keymapTimerCtx, [SchemaReady]).record(KeymapReady);
  return async () => {
    await ctx.waitTimers(keymapTimerCtx);
    ctx.done(KeymapReady);
    return () => {
      ctx.remove(keymapCtx).remove(keymapTimerCtx).clearTimer(KeymapReady);
    };
  };
};
var ParserReady = createTimer("ParserReady");
var outOfScope$1 = () => {
  throw ctxCallOutOfScope();
};
var parserCtx = createSlice(outOfScope$1, "parser");
var parserTimerCtx = createSlice([], "parserTimer");
var parser = (ctx) => {
  ctx.inject(parserCtx, outOfScope$1).inject(parserTimerCtx, [SchemaReady]).record(ParserReady);
  return async () => {
    await ctx.waitTimers(parserTimerCtx);
    const remark = ctx.get(remarkCtx);
    const schema2 = ctx.get(schemaCtx);
    ctx.set(parserCtx, ParserState.create(schema2, remark));
    ctx.done(ParserReady);
    return () => {
      ctx.remove(parserCtx).remove(parserTimerCtx).clearTimer(ParserReady);
    };
  };
};
withMeta(parser, { displayName: "Parser" });
var SerializerReady = createTimer("SerializerReady");
var serializerTimerCtx = createSlice([], "serializerTimer");
var outOfScope = () => {
  throw ctxCallOutOfScope();
};
var serializerCtx = createSlice(outOfScope, "serializer");
var serializer = (ctx) => {
  ctx.inject(serializerCtx, outOfScope).inject(serializerTimerCtx, [SchemaReady]).record(SerializerReady);
  return async () => {
    await ctx.waitTimers(serializerTimerCtx);
    const remark = ctx.get(remarkCtx);
    const schema2 = ctx.get(schemaCtx);
    ctx.set(serializerCtx, SerializerState.create(schema2, remark));
    ctx.done(SerializerReady);
    return () => {
      ctx.remove(serializerCtx).remove(serializerTimerCtx).clearTimer(SerializerReady);
    };
  };
};
withMeta(serializer, { displayName: "Serializer" });
var defaultValueCtx = createSlice("", "defaultValue");
var editorStateOptionsCtx = createSlice((x) => x, "stateOptions");
var editorStateTimerCtx = createSlice([], "editorStateTimer");
var EditorStateReady = createTimer("EditorStateReady");
function getDoc(defaultValue, parser2, schema2) {
  if (typeof defaultValue === "string")
    return parser2(defaultValue);
  if (defaultValue.type === "html")
    return DOMParser.fromSchema(schema2).parse(defaultValue.dom);
  if (defaultValue.type === "json")
    return Node.fromJSON(schema2, defaultValue.value);
  throw docTypeError(defaultValue);
}
var key$1 = new PluginKey("MILKDOWN_STATE_TRACKER");
var editorState = (ctx) => {
  ctx.inject(defaultValueCtx, "").inject(editorStateCtx, {}).inject(editorStateOptionsCtx, (x) => x).inject(editorStateTimerCtx, [
    ParserReady,
    SerializerReady,
    CommandsReady,
    KeymapReady
  ]).record(EditorStateReady);
  return async () => {
    await ctx.waitTimers(editorStateTimerCtx);
    const schema2 = ctx.get(schemaCtx);
    const parser2 = ctx.get(parserCtx);
    const rules = ctx.get(inputRulesCtx);
    const optionsOverride = ctx.get(editorStateOptionsCtx);
    const prosePlugins = ctx.get(prosePluginsCtx);
    const doc = getDoc(ctx.get(defaultValueCtx), parser2, schema2);
    const km = ctx.get(keymapCtx);
    const disposeBaseKeymap = km.addBaseKeymap();
    const plugins = [
      ...prosePlugins,
      new Plugin({
        key: key$1,
        state: {
          init: () => {
          },
          apply: (_tr, _value, _oldState, newState) => {
            ctx.set(editorStateCtx, newState);
          }
        }
      }),
      customInputRules({ rules }),
      keymap$1(km.build())
    ];
    ctx.set(prosePluginsCtx, plugins);
    const options = optionsOverride({
      schema: schema2,
      doc,
      plugins
    });
    const state = EditorState.create(options);
    ctx.set(editorStateCtx, state);
    ctx.done(EditorStateReady);
    return () => {
      disposeBaseKeymap();
      ctx.remove(defaultValueCtx).remove(editorStateCtx).remove(editorStateOptionsCtx).remove(editorStateTimerCtx).clearTimer(EditorStateReady);
    };
  };
};
withMeta(editorState, { displayName: "EditorState" });
var pasteRulesCtx = createSlice([], "pasteRule");
var pasteRulesTimerCtx = createSlice([SchemaReady], "pasteRuleTimer");
var PasteRulesReady = createTimer("PasteRuleReady");
var pasteRule = (ctx) => {
  ctx.inject(pasteRulesCtx, []).inject(pasteRulesTimerCtx, [SchemaReady]).record(PasteRulesReady);
  return async () => {
    await ctx.waitTimers(pasteRulesTimerCtx);
    ctx.done(PasteRulesReady);
    return () => {
      ctx.remove(pasteRulesCtx).remove(pasteRulesTimerCtx).clearTimer(PasteRulesReady);
    };
  };
};
withMeta(pasteRule, { displayName: "PasteRule" });
var EditorViewReady = createTimer("EditorViewReady");
var editorViewTimerCtx = createSlice([], "editorViewTimer");
var editorViewOptionsCtx = createSlice({}, "editorViewOptions");
var rootCtx = createSlice(null, "root");
var rootDOMCtx = createSlice(null, "rootDOM");
var rootAttrsCtx = createSlice({}, "rootAttrs");
function createViewContainer(root, ctx) {
  const container = document.createElement("div");
  container.className = "milkdown";
  root.appendChild(container);
  ctx.set(rootDOMCtx, container);
  const attrs = ctx.get(rootAttrsCtx);
  Object.entries(attrs).forEach(([key2, value]) => container.setAttribute(key2, value));
  return container;
}
function prepareViewDom(dom) {
  dom.classList.add("editor");
  dom.setAttribute("role", "textbox");
}
var key = new PluginKey("MILKDOWN_VIEW_CLEAR");
var editorView = (ctx) => {
  ctx.inject(rootCtx, document.body).inject(editorViewCtx, {}).inject(editorViewOptionsCtx, {}).inject(rootDOMCtx, null).inject(rootAttrsCtx, {}).inject(editorViewTimerCtx, [EditorStateReady, PasteRulesReady]).record(EditorViewReady);
  return async () => {
    await ctx.wait(InitReady);
    const root = ctx.get(rootCtx) || document.body;
    const el = typeof root === "string" ? document.querySelector(root) : root;
    ctx.update(prosePluginsCtx, (xs) => [new Plugin({
      key,
      view: (editorView2) => {
        const container = el ? createViewContainer(el, ctx) : void 0;
        const handleDOM = () => {
          if (container && el) {
            const editor = editorView2.dom;
            el.replaceChild(container, editor);
            container.appendChild(editor);
          }
        };
        handleDOM();
        return { destroy: () => {
          if (container == null ? void 0 : container.parentNode)
            container == null ? void 0 : container.parentNode.replaceChild(editorView2.dom, container);
          container == null ? void 0 : container.remove();
        } };
      }
    }), ...xs]);
    await ctx.waitTimers(editorViewTimerCtx);
    const state = ctx.get(editorStateCtx);
    const options = ctx.get(editorViewOptionsCtx);
    const view = new EditorView(el, {
      state,
      nodeViews: Object.fromEntries(ctx.get(nodeViewCtx)),
      markViews: Object.fromEntries(ctx.get(markViewCtx)),
      transformPasted: (slice, view2, isPlainText) => {
        ctx.get(pasteRulesCtx).sort((a, b) => (b.priority ?? 50) - (a.priority ?? 50)).map((rule) => rule.run).forEach((runner) => {
          slice = runner(slice, view2, isPlainText);
        });
        return slice;
      },
      ...options
    });
    prepareViewDom(view.dom);
    ctx.set(editorViewCtx, view);
    ctx.done(EditorViewReady);
    return () => {
      view == null ? void 0 : view.destroy();
      ctx.remove(rootCtx).remove(editorViewCtx).remove(editorViewOptionsCtx).remove(rootDOMCtx).remove(rootAttrsCtx).remove(editorViewTimerCtx).clearTimer(EditorViewReady);
    };
  };
};
withMeta(editorView, { displayName: "EditorView" });
var EditorStatus = function(EditorStatus2) {
  EditorStatus2["Idle"] = "Idle";
  EditorStatus2["OnCreate"] = "OnCreate";
  EditorStatus2["Created"] = "Created";
  EditorStatus2["OnDestroy"] = "OnDestroy";
  EditorStatus2["Destroyed"] = "Destroyed";
  return EditorStatus2;
}({});
var Editor = (_c = class {
  constructor() {
    __privateAdd(this, _enableInspector);
    __privateAdd(this, _status);
    __privateAdd(this, _configureList);
    __privateAdd(this, _onStatusChange);
    __privateAdd(this, _container2);
    __privateAdd(this, _clock);
    __privateAdd(this, _usrPluginStore);
    __privateAdd(this, _sysPluginStore);
    __privateAdd(this, _ctx3);
    __privateAdd(this, _loadInternal);
    __privateAdd(this, _prepare);
    __privateAdd(this, _cleanup);
    __privateAdd(this, _cleanupInternal);
    __privateAdd(this, _setStatus);
    __privateAdd(this, _loadPluginInStore);
    __privateSet(this, _enableInspector, false);
    __privateSet(this, _status, EditorStatus.Idle);
    __privateSet(this, _configureList, []);
    __privateSet(this, _onStatusChange, () => void 0);
    __privateSet(this, _container2, new Container());
    __privateSet(this, _clock, new Clock());
    __privateSet(this, _usrPluginStore, /* @__PURE__ */ new Map());
    __privateSet(this, _sysPluginStore, /* @__PURE__ */ new Map());
    __privateSet(this, _ctx3, new Ctx(__privateGet(this, _container2), __privateGet(this, _clock)));
    __privateSet(this, _loadInternal, () => {
      const configPlugin = config(async (ctx) => {
        await Promise.all(__privateGet(this, _configureList).map((fn) => Promise.resolve(fn(ctx))));
      });
      const internalPlugins = [
        schema,
        parser,
        serializer,
        commands,
        keymap,
        pasteRule,
        editorState,
        editorView,
        init(this),
        configPlugin
      ];
      __privateGet(this, _prepare).call(this, internalPlugins, __privateGet(this, _sysPluginStore));
    });
    __privateSet(this, _prepare, (plugins, store) => {
      plugins.forEach((plugin) => {
        const ctx = __privateGet(this, _ctx3).produce(__privateGet(this, _enableInspector) ? plugin.meta : void 0);
        const handler = plugin(ctx);
        store.set(plugin, {
          ctx,
          handler,
          cleanup: void 0
        });
      });
    });
    __privateSet(this, _cleanup, (plugins, remove = false) => {
      return Promise.all([plugins].flat().map(async (plugin) => {
        var _a2;
        const cleanup = (_a2 = __privateGet(this, _usrPluginStore).get(plugin)) == null ? void 0 : _a2.cleanup;
        if (remove)
          __privateGet(this, _usrPluginStore).delete(plugin);
        else
          __privateGet(this, _usrPluginStore).set(plugin, {
            ctx: void 0,
            handler: void 0,
            cleanup: void 0
          });
        if (typeof cleanup === "function")
          return cleanup();
        return cleanup;
      }));
    });
    __privateSet(this, _cleanupInternal, async () => {
      await Promise.all([...__privateGet(this, _sysPluginStore).entries()].map(async ([_, { cleanup }]) => {
        if (typeof cleanup === "function")
          return cleanup();
        return cleanup;
      }));
      __privateGet(this, _sysPluginStore).clear();
    });
    __privateSet(this, _setStatus, (status) => {
      __privateSet(this, _status, status);
      __privateGet(this, _onStatusChange).call(this, status);
    });
    __privateSet(this, _loadPluginInStore, (store) => {
      return [...store.entries()].map(async ([key2, loader]) => {
        const { ctx, handler } = loader;
        if (!handler)
          return;
        const cleanup = await handler();
        store.set(key2, {
          ctx,
          handler,
          cleanup
        });
      });
    });
    this.enableInspector = (enable = true) => {
      __privateSet(this, _enableInspector, enable);
      return this;
    };
    this.onStatusChange = (onChange) => {
      __privateSet(this, _onStatusChange, onChange);
      return this;
    };
    this.config = (configure) => {
      __privateGet(this, _configureList).push(configure);
      return this;
    };
    this.removeConfig = (configure) => {
      __privateSet(this, _configureList, __privateGet(this, _configureList).filter((x) => x !== configure));
      return this;
    };
    this.use = (plugins) => {
      const _plugins = [plugins].flat();
      _plugins.flat().forEach((plugin) => {
        __privateGet(this, _usrPluginStore).set(plugin, {
          ctx: void 0,
          handler: void 0,
          cleanup: void 0
        });
      });
      if (__privateGet(this, _status) === EditorStatus.Created)
        __privateGet(this, _prepare).call(this, _plugins, __privateGet(this, _usrPluginStore));
      return this;
    };
    this.remove = async (plugins) => {
      if (__privateGet(this, _status) === EditorStatus.OnCreate) {
        console.warn("[Milkdown]: You are trying to remove plugins when the editor is creating, this is not recommended, please check your code.");
        return new Promise((resolve) => {
          setTimeout(() => {
            resolve(this.remove(plugins));
          }, 50);
        });
      }
      await __privateGet(this, _cleanup).call(this, [plugins].flat(), true);
      return this;
    };
    this.create = async () => {
      if (__privateGet(this, _status) === EditorStatus.OnCreate)
        return this;
      if (__privateGet(this, _status) === EditorStatus.Created)
        await this.destroy();
      __privateGet(this, _setStatus).call(this, EditorStatus.OnCreate);
      __privateGet(this, _loadInternal).call(this);
      __privateGet(this, _prepare).call(this, [...__privateGet(this, _usrPluginStore).keys()], __privateGet(this, _usrPluginStore));
      await Promise.all([__privateGet(this, _loadPluginInStore).call(this, __privateGet(this, _sysPluginStore)), __privateGet(this, _loadPluginInStore).call(this, __privateGet(this, _usrPluginStore))].flat());
      __privateGet(this, _setStatus).call(this, EditorStatus.Created);
      return this;
    };
    this.destroy = async (clearPlugins = false) => {
      if (__privateGet(this, _status) === EditorStatus.Destroyed || __privateGet(this, _status) === EditorStatus.OnDestroy)
        return this;
      if (__privateGet(this, _status) === EditorStatus.OnCreate)
        return new Promise((resolve) => {
          setTimeout(() => {
            resolve(this.destroy(clearPlugins));
          }, 50);
        });
      if (clearPlugins)
        __privateSet(this, _configureList, []);
      __privateGet(this, _setStatus).call(this, EditorStatus.OnDestroy);
      await __privateGet(this, _cleanup).call(this, [...__privateGet(this, _usrPluginStore).keys()], clearPlugins);
      await __privateGet(this, _cleanupInternal).call(this);
      __privateGet(this, _setStatus).call(this, EditorStatus.Destroyed);
      return this;
    };
    this.action = (action) => action(__privateGet(this, _ctx3));
    this.inspect = () => {
      if (!__privateGet(this, _enableInspector)) {
        console.warn("[Milkdown]: You are trying to collect inspection when inspector is disabled, please enable inspector by `editor.enableInspector()` first.");
        return [];
      }
      return [...__privateGet(this, _sysPluginStore).values(), ...__privateGet(this, _usrPluginStore).values()].map(({ ctx }) => {
        var _a2;
        return (_a2 = ctx == null ? void 0 : ctx.inspector) == null ? void 0 : _a2.read();
      }).filter((x) => Boolean(x));
    };
  }
  static make() {
    return new _c();
  }
  get ctx() {
    return __privateGet(this, _ctx3);
  }
  get status() {
    return __privateGet(this, _status);
  }
}, _enableInspector = new WeakMap(), _status = new WeakMap(), _configureList = new WeakMap(), _onStatusChange = new WeakMap(), _container2 = new WeakMap(), _clock = new WeakMap(), _usrPluginStore = new WeakMap(), _sysPluginStore = new WeakMap(), _ctx3 = new WeakMap(), _loadInternal = new WeakMap(), _prepare = new WeakMap(), _cleanup = new WeakMap(), _cleanupInternal = new WeakMap(), _setStatus = new WeakMap(), _loadPluginInStore = new WeakMap(), _c);
export {
  CommandsReady as C,
  Editor as E,
  InitReady as I,
  KeymapReady as K,
  SchemaReady as S,
  EditorViewReady as a,
  SerializerReady as b,
  commandsCtx as c,
  createCmdKey as d,
  defaultValueCtx as e,
  editorStateOptionsCtx as f,
  editorViewCtx as g,
  editorViewOptionsCtx as h,
  inputRulesCtx as i,
  pasteRulesCtx as j,
  keymapCtx as k,
  prosePluginsCtx as l,
  marksCtx as m,
  nodesCtx as n,
  remarkStringifyOptionsCtx as o,
  parserCtx as p,
  rootCtx as q,
  remarkPluginsCtx as r,
  schemaCtx as s,
  serializerCtx as t
};
