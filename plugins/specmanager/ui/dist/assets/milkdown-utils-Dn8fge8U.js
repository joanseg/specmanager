import { g as editorViewCtx, p as parserCtx, s as schemaCtx, f as editorStateOptionsCtx, l as prosePluginsCtx, S as SchemaReady, c as commandsCtx, i as inputRulesCtx, C as CommandsReady, j as pasteRulesCtx, n as nodesCtx, d as createCmdKey, I as InitReady, r as remarkPluginsCtx, m as marksCtx, K as KeymapReady, k as keymapCtx } from "./milkdown-core-DsBn0yRa.js";
import { c as createSlice } from "./milkdown-ctx-B6ZmVA8d.js";
import { g as missingNodeInSchema, m as missingMarkInSchema } from "./milkdown-exception-EEjztD1-.js";
import { d as Slice } from "./prosemirror-model-CNXHVs9h.js";
import { E as EditorState } from "./prosemirror-state-DvBpuTqc.js";
function $command(key, cmd) {
  const cmdKey = createCmdKey(key);
  const plugin = (ctx) => async () => {
    plugin.key = cmdKey;
    await ctx.wait(CommandsReady);
    const command = cmd(ctx);
    ctx.get(commandsCtx).create(cmdKey, command);
    plugin.run = (payload) => ctx.get(commandsCtx).call(key, payload);
    return () => {
      ctx.get(commandsCtx).remove(cmdKey);
    };
  };
  return plugin;
}
function $inputRule(inputRule) {
  const plugin = (ctx) => async () => {
    await ctx.wait(SchemaReady);
    const ir = inputRule(ctx);
    ctx.update(inputRulesCtx, (irs) => [...irs, ir]);
    plugin.inputRule = ir;
    return () => {
      ctx.update(inputRulesCtx, (irs) => irs.filter((x) => x !== ir));
    };
  };
  return plugin;
}
function $pasteRule(pasteRule) {
  const plugin = (ctx) => async () => {
    await ctx.wait(SchemaReady);
    const pr = pasteRule(ctx);
    ctx.update(pasteRulesCtx, (prs) => [...prs, pr]);
    plugin.pasteRule = pr;
    return () => {
      ctx.update(pasteRulesCtx, (prs) => prs.filter((x) => x !== pr));
    };
  };
  return plugin;
}
function $mark(id, schema) {
  const plugin = (ctx) => async () => {
    const markSchema = schema(ctx);
    ctx.update(marksCtx, (ns) => [...ns.filter((n) => n[0] !== id), [id, markSchema]]);
    plugin.id = id;
    plugin.schema = markSchema;
    return () => {
      ctx.update(marksCtx, (ns) => ns.filter(([x]) => x !== id));
    };
  };
  plugin.type = (ctx) => {
    const markType = ctx.get(schemaCtx).marks[id];
    if (!markType)
      throw missingMarkInSchema(id);
    return markType;
  };
  return plugin;
}
function $node(id, schema) {
  const plugin = (ctx) => async () => {
    const nodeSchema = schema(ctx);
    ctx.update(nodesCtx, (ns) => [...ns.filter((n) => n[0] !== id), [id, nodeSchema]]);
    plugin.id = id;
    plugin.schema = nodeSchema;
    return () => {
      ctx.update(nodesCtx, (ns) => ns.filter(([x]) => x !== id));
    };
  };
  plugin.type = (ctx) => {
    const nodeType = ctx.get(schemaCtx).nodes[id];
    if (!nodeType)
      throw missingNodeInSchema(id);
    return nodeType;
  };
  return plugin;
}
function $prose(prose) {
  let prosePlugin;
  const plugin = (ctx) => async () => {
    await ctx.wait(SchemaReady);
    prosePlugin = prose(ctx);
    ctx.update(prosePluginsCtx, (ps) => [...ps, prosePlugin]);
    return () => {
      ctx.update(prosePluginsCtx, (ps) => ps.filter((x) => x !== prosePlugin));
    };
  };
  plugin.plugin = () => prosePlugin;
  plugin.key = () => prosePlugin.spec.key;
  return plugin;
}
function $shortcut(shortcut) {
  const plugin = (ctx) => async () => {
    await ctx.wait(KeymapReady);
    const km = ctx.get(keymapCtx);
    const keymap = shortcut(ctx);
    const dispose = km.addObjectKeymap(keymap);
    plugin.keymap = keymap;
    return () => {
      dispose();
    };
  };
  return plugin;
}
function $ctx(value, name) {
  const slice = createSlice(value, name);
  const plugin = (ctx) => {
    ctx.inject(slice);
    return () => {
      return () => {
        ctx.remove(slice);
      };
    };
  };
  plugin.key = slice;
  return plugin;
}
function $nodeSchema(id, schema) {
  const schemaCtx2 = $ctx(schema, id);
  const nodeSchema = $node(id, (ctx) => {
    return ctx.get(schemaCtx2.key)(ctx);
  });
  const result = [schemaCtx2, nodeSchema];
  result.id = nodeSchema.id;
  result.node = nodeSchema;
  result.type = (ctx) => nodeSchema.type(ctx);
  result.ctx = schemaCtx2;
  result.key = schemaCtx2.key;
  result.extendSchema = (handler) => {
    return $nodeSchema(id, handler(schema));
  };
  return result;
}
function $markSchema(id, schema) {
  const schemaCtx2 = $ctx(schema, id);
  const markSchema = $mark(id, (ctx) => {
    return ctx.get(schemaCtx2.key)(ctx);
  });
  const result = [schemaCtx2, markSchema];
  result.id = markSchema.id;
  result.mark = markSchema;
  result.type = (ctx) => markSchema.type(ctx);
  result.ctx = schemaCtx2;
  result.key = schemaCtx2.key;
  result.extendSchema = (handler) => {
    return $markSchema(id, handler(schema));
  };
  return result;
}
function $useKeymap(name, userKeymap) {
  const keymapDef = $ctx(Object.fromEntries(Object.entries(userKeymap).map(([key, { shortcuts: shortcuts2, priority }]) => {
    return [key, {
      shortcuts: shortcuts2,
      priority
    }];
  })), `${name}Keymap`);
  const shortcuts = $shortcut((ctx) => {
    const keys = ctx.get(keymapDef.key);
    const keymapTuple = Object.entries(userKeymap).flatMap(([key, { command }]) => {
      const target = keys[key];
      const targetKeys = [target.shortcuts].flat();
      const priority = target.priority;
      return targetKeys.map((targetKey) => [targetKey, {
        key: targetKey,
        onRun: command,
        priority
      }]);
    });
    return Object.fromEntries(keymapTuple);
  });
  const result = [keymapDef, shortcuts];
  result.ctx = keymapDef;
  result.shortcuts = shortcuts;
  result.key = keymapDef.key;
  result.keymap = shortcuts.keymap;
  return result;
}
var $nodeAttr = (name, value = () => ({})) => $ctx(value, `${name}Attr`);
var $markAttr = (name, value = () => ({})) => $ctx(value, `${name}Attr`);
function $remark(id, remark, initialOptions) {
  const options = $ctx({}, id);
  const plugin = (ctx) => async () => {
    await ctx.wait(InitReady);
    const remarkPlugin = {
      plugin: remark(ctx),
      options: ctx.get(options.key)
    };
    ctx.update(remarkPluginsCtx, (rp) => [...rp, remarkPlugin]);
    return () => {
      ctx.update(remarkPluginsCtx, (rp) => rp.filter((x) => x !== remarkPlugin));
    };
  };
  const result = [options, plugin];
  result.id = id;
  result.plugin = plugin;
  result.options = options;
  return result;
}
function callCommand(slice, payload) {
  return (ctx) => {
    return ctx.get(commandsCtx).call(slice, payload);
  };
}
function replaceAll(markdown, flush = false) {
  return (ctx) => {
    const view = ctx.get(editorViewCtx);
    const doc = ctx.get(parserCtx)(markdown);
    if (!doc)
      return;
    if (!flush) {
      const { state: state2 } = view;
      return view.dispatch(state2.tr.replace(0, state2.doc.content.size, new Slice(doc.content, 0, 0)));
    }
    const schema = ctx.get(schemaCtx);
    const newOptions = ctx.get(editorStateOptionsCtx)({
      schema,
      doc,
      plugins: ctx.get(prosePluginsCtx)
    });
    const state = EditorState.create(newOptions);
    view.updateState(state);
  };
}
export {
  $command as $,
  $ctx as a,
  $inputRule as b,
  $markAttr as c,
  $markSchema as d,
  $node as e,
  $nodeAttr as f,
  $nodeSchema as g,
  $pasteRule as h,
  $prose as i,
  $remark as j,
  $useKeymap as k,
  callCommand as l,
  replaceAll as r
};
