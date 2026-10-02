import { f as useState, e as useRef, b as useEffect, a as createVNode, d as useMemo, F as Fragment, u as useCallback, c as createRoot, R as React } from "./preact-BS8xTpBQ.js";
import { E as Editor, q as rootCtx, e as defaultValueCtx, o as remarkStringifyOptionsCtx, h as editorViewOptionsCtx, t as serializerCtx, g as editorViewCtx } from "./milkdown-core-DsBn0yRa.js";
import { c as commonmark, a as createCodeBlockCommand, b as toggleLinkCommand, w as wrapInBulletListCommand, e as wrapInHeadingCommand, t as toggleEmphasisCommand, d as toggleStrongCommand } from "./milkdown-preset-commonmark-CpU54TZM.js";
import { g as gfm, i as insertTableCommand } from "./milkdown-preset-gfm-CDmNGmtb.js";
import { a as listenerCtx, l as listener } from "./milkdown-plugin-listener-Y8gP64VA.js";
import { i as $prose, r as replaceAll, l as callCommand } from "./milkdown-utils-Dn8fge8U.js";
import { P as Plugin } from "./prosemirror-state-DvBpuTqc.js";
import "./milkdown-ctx-B6ZmVA8d.js";
import "./milkdown-exception-EEjztD1-.js";
import "./milkdown-prose-BA0s8Ct0.js";
import "./prosemirror-inputrules-DwANvdfL.js";
import "./prosemirror-transform-BUwnoLrz.js";
import "./prosemirror-model-CNXHVs9h.js";
import "./orderedmap-DFuvvHIC.js";
import "./prosemirror-tables-D3QqrMgz.js";
import "./prosemirror-view-DUWIvuYX.js";
import "./prosemirror-keymap-bzw026ae.js";
import "./w3c-keyname-UlJ7zh8K.js";
import "./milkdown-transformer-BqQ-j1sm.js";
import "./unified-CC3fFDkr.js";
import "./bail-CqJVcVEc.js";
import "./extend-Db_RHqWv.js";
import "./is-plain-obj-Bdy7oolY.js";
import "./trough-DPWmlyi3.js";
import "./vfile-D_rwXw5K.js";
import "./vfile-message-BJ-LBCb0.js";
import "./unist-util-stringify-position-DD2_lbmV.js";
import "./remark-parse-BPG5bXNI.js";
import "./mdast-util-from-markdown-DeR2nhYn.js";
import "./micromark-util-decode-numeric-character-reference-C1IxutxG.js";
import "./micromark-util-decode-string-CbClsyLO.js";
import "./decode-named-character-reference-CMFiwAr6.js";
import "./micromark-util-normalize-identifier-CuJVDrso.js";
import "./micromark-CHyl6VQY.js";
import "./micromark-util-combine-extensions-DQmaEzeT.js";
import "./micromark-util-chunked-Ch9w3CAF.js";
import "./micromark-factory-space-DyAHBL3a.js";
import "./micromark-util-character-Cbf2nU-f.js";
import "./micromark-core-commonmark-0Rt2v0aZ.js";
import "./micromark-util-classify-character-DY4nayRd.js";
import "./micromark-util-resolve-all-DOI1xbmr.js";
import "./micromark-util-subtokenize-JCn1G9Ut.js";
import "./micromark-factory-destination-CPtcqZ07.js";
import "./micromark-factory-label-DR0D0zr8.js";
import "./micromark-factory-title-BHMIE1oL.js";
import "./micromark-factory-whitespace-DS92thik.js";
import "./micromark-util-html-tag-name-Cj_XU7mS.js";
import "./mdast-util-to-string-cbiyYImb.js";
import "./remark-stringify-BPnE7XFK.js";
import "./mdast-util-to-markdown-hSJ6DG3N.js";
import "./zwitch-BEZf1ZPW.js";
import "./longest-streak-aEh9OmVY.js";
import "./unist-util-visit-D1LqXPOY.js";
import "./unist-util-visit-parents-BnA2pxhL.js";
import "./unist-util-is-BKssR1rV.js";
import "./mdast-util-phrasing-CkjekomM.js";
import "./prosemirror-commands-D6u-7607.js";
import "./prosemirror-schema-list-akAeVyxO.js";
import "./remark-inline-links-CVIvxnZD.js";
import "./mdast-util-definitions-C_4tEepR.js";
import "./prosemirror-safari-ime-span-BSv6h3JI.js";
import "./remark-gfm-BWQYWZFJ.js";
import "./micromark-extension-gfm-B7LKWBhb.js";
import "./micromark-extension-gfm-autolink-literal-CorV23_O.js";
import "./micromark-extension-gfm-footnote-CM218xcf.js";
import "./micromark-extension-gfm-strikethrough-CuNtvj8o.js";
import "./micromark-extension-gfm-table-BRWmSx-P.js";
import "./micromark-extension-gfm-task-list-item-Cq7WxnQ8.js";
import "./mdast-util-gfm-DJ2kXwGF.js";
import "./mdast-util-gfm-autolink-literal-BNMH3eqX.js";
import "./ccount-zIlfN-Ki.js";
import "./devlop-BS6z0SoE.js";
import "./mdast-util-find-and-replace-D7hUM53S.js";
import "./escape-string-regexp-BYOcZivT.js";
import "./mdast-util-gfm-footnote-CoB8gpdB.js";
import "./mdast-util-gfm-strikethrough-CdiXKM9K.js";
import "./mdast-util-gfm-table-TH_RNemS.js";
import "./markdown-table-DILHAzfb.js";
import "./mdast-util-gfm-task-list-item-DlvDfMSL.js";
import "./lodash-es-DWsF7gLD.js";
(function polyfill() {
  const relList = document.createElement("link").relList;
  if (relList && relList.supports && relList.supports("modulepreload")) {
    return;
  }
  for (const link of document.querySelectorAll('link[rel="modulepreload"]')) {
    processPreload(link);
  }
  new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type !== "childList") {
        continue;
      }
      for (const node of mutation.addedNodes) {
        if (node.tagName === "LINK" && node.rel === "modulepreload")
          processPreload(node);
      }
    }
  }).observe(document, { childList: true, subtree: true });
  function getFetchOpts(link) {
    const fetchOpts = {};
    if (link.integrity)
      fetchOpts.integrity = link.integrity;
    if (link.referrerPolicy)
      fetchOpts.referrerPolicy = link.referrerPolicy;
    if (link.crossOrigin === "use-credentials")
      fetchOpts.credentials = "include";
    else if (link.crossOrigin === "anonymous")
      fetchOpts.credentials = "omit";
    else
      fetchOpts.credentials = "same-origin";
    return fetchOpts;
  }
  function processPreload(link) {
    if (link.ep)
      return;
    link.ep = true;
    const fetchOpts = getFetchOpts(link);
    fetch(link.href, fetchOpts);
  }
})();
async function fetchBoard() {
  const res = await fetch("/api/board");
  if (!res.ok)
    throw new Error(`/api/board → ${res.status}`);
  return await res.json();
}
async function fetchDoc(id) {
  const res = await fetch(`/api/documents/${encodeURIComponent(id)}`);
  if (!res.ok)
    throw new Error(`/api/documents/${id} → ${res.status}`);
  return await res.json();
}
async function putDoc(id, body, baseVersion, title) {
  const res = await fetch(`/api/documents/${encodeURIComponent(id)}`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ body, baseVersion, title })
  });
  if (res.ok)
    return { ok: true, doc: await res.json() };
  const data = await res.json().catch(() => ({}));
  return { ok: false, status: res.status, error: data.error ?? `HTTP ${res.status}` };
}
async function postDocStatus(id, status) {
  const res = await fetch(`/api/documents/${encodeURIComponent(id)}/status`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ status })
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? `HTTP ${res.status}`);
  }
  return await res.json();
}
async function fetchTasks(featureId) {
  const res = await fetch(`/api/features/${encodeURIComponent(featureId)}/tasks`);
  if (!res.ok)
    throw new Error(`/api/features/${featureId}/tasks → ${res.status}`);
  return await res.json();
}
async function createTaskApi(featureId, title) {
  const res = await fetch(`/api/features/${encodeURIComponent(featureId)}/tasks`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ title })
  });
  if (!res.ok)
    throw new Error(`create task → ${res.status}`);
  return await res.json();
}
async function patchTask(featureId, taskId, patch) {
  const res = await fetch(`/api/features/${encodeURIComponent(featureId)}/tasks/${encodeURIComponent(taskId)}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(patch)
  });
  if (!res.ok)
    throw new Error(`patch task → ${res.status}`);
  return await res.json();
}
async function fetchGate(featureId, stage) {
  const res = await fetch(`/api/features/${encodeURIComponent(featureId)}/gate?stage=${stage}`);
  if (!res.ok)
    throw new Error(`gate check → ${res.status}`);
  return await res.json();
}
function openWebSocket(onEvent) {
  const proto = location.protocol === "https:" ? "wss:" : "ws:";
  const ws = new WebSocket(`${proto}//${location.host}/ws`);
  ws.addEventListener("message", (msg) => {
    try {
      onEvent(JSON.parse(msg.data));
    } catch {
    }
  });
  return () => ws.close();
}
const NARROW_PX = 340;
const SECONDARY = [
  { action: "bulletList", title: "Bullet list", glyph: "☰" },
  { action: "link", title: "Link", glyph: "🔗" },
  { action: "table", title: "Table", glyph: "▦" },
  { action: "codeBlock", title: "Code block", glyph: createVNode("span", { className: "mono", children: "</>" }) }
];
function MarkdownToolbar({ onAction, disabled, active }) {
  const [headingOpen, setHeadingOpen] = useState(false);
  const [overflowOpen, setOverflowOpen] = useState(false);
  const [narrow, setNarrow] = useState(false);
  const headingRef = useRef(null);
  const overflowRef = useRef(null);
  const barRef = useRef(null);
  useEffect(() => {
    const el = barRef.current;
    if (!el)
      return;
    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry)
        setNarrow(entry.contentRect.width < NARROW_PX);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  useEffect(() => {
    if (!headingOpen && !overflowOpen)
      return;
    const onDown = (e) => {
      var _a, _b;
      const t = e.target;
      if (!((_a = headingRef.current) == null ? void 0 : _a.contains(t)))
        setHeadingOpen(false);
      if (!((_b = overflowRef.current) == null ? void 0 : _b.contains(t)))
        setOverflowOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [headingOpen, overflowOpen]);
  const isActive = (a) => (active == null ? void 0 : active.has(a)) ?? false;
  const btn = (action, title, label) => createVNode("button", {
    type: "button",
    className: `tb-btn${isActive(action) ? " tb-btn--active" : ""}`,
    title,
    "aria-label": title,
    "aria-pressed": isActive(action),
    disabled,
    onMouseDown: (e) => e.preventDefault(),
    onClick: () => onAction(action),
    children: label
  });
  const pickHeading = (level) => {
    setHeadingOpen(false);
    onAction("heading", level);
  };
  return createVNode("div", { className: "md-toolbar", role: "toolbar", "aria-label": "Formatting", ref: barRef, children: [
    btn("bold", "Bold (⌘B)", createVNode("b", { children: "B" })),
    btn("italic", "Italic (⌘I)", createVNode("i", { children: "I" })),
    createVNode("div", { className: "tb-pop-wrap", ref: headingRef, children: [
      createVNode("button", {
        type: "button",
        className: `tb-btn${isActive("heading") ? " tb-btn--active" : ""}`,
        title: "Heading",
        "aria-label": "Heading",
        "aria-haspopup": "menu",
        "aria-expanded": headingOpen,
        disabled,
        onMouseDown: (e) => e.preventDefault(),
        onClick: () => setHeadingOpen((o) => !o),
        children: [
          createVNode("span", { children: "H" }),
          createVNode("span", { className: "caret", children: "▾" })
        ]
      }),
      headingOpen && createVNode("div", { className: "tb-menu", role: "menu", "aria-label": "Heading level", children: [1, 2, 3].map((level) => createVNode("button", {
        type: "button",
        role: "menuitem",
        className: "tb-menu__item",
        onMouseDown: (e) => e.preventDefault(),
        onClick: () => pickHeading(level),
        children: [
          "Heading ",
          level
        ]
      }, level)) })
    ] }),
    createVNode("span", { className: "tb-sep" }),
    narrow ? createVNode("div", { className: "tb-pop-wrap", ref: overflowRef, children: [
      createVNode("button", {
        type: "button",
        className: "tb-btn",
        title: "More formatting",
        "aria-label": "More formatting",
        "aria-haspopup": "menu",
        "aria-expanded": overflowOpen,
        disabled,
        onMouseDown: (e) => e.preventDefault(),
        onClick: () => setOverflowOpen((o) => !o),
        children: "⋯"
      }),
      overflowOpen && createVNode("div", { className: "tb-menu", role: "menu", "aria-label": "More formatting", children: SECONDARY.map(({ action, title, glyph }) => createVNode("button", {
        type: "button",
        role: "menuitem",
        className: `tb-menu__item${isActive(action) ? " tb-menu__item--active" : ""}`,
        "aria-pressed": isActive(action),
        onMouseDown: (e) => e.preventDefault(),
        onClick: () => {
          setOverflowOpen(false);
          onAction(action);
        },
        children: [
          createVNode("span", { className: "tb-menu__glyph", children: glyph }),
          " ",
          title
        ]
      }, action)) })
    ] }) : SECONDARY.map(({ action, title, glyph }) => createVNode("span", { children: btn(action, title, glyph) }, action))
  ] });
}
function activeActions(state) {
  const active = /* @__PURE__ */ new Set();
  const { schema, selection } = state;
  const { $from, from, to, empty } = selection;
  const markOn = (name) => {
    const type = schema.marks[name];
    if (!type)
      return false;
    if (empty)
      return !!type.isInSet(state.storedMarks ?? $from.marks());
    return state.doc.rangeHasMark(from, to, type);
  };
  if (markOn("strong"))
    active.add("bold");
  if (markOn("emphasis"))
    active.add("italic");
  if (markOn("link"))
    active.add("link");
  for (let d = $from.depth; d > 0; d--) {
    const name = $from.node(d).type.name;
    if (name === "heading")
      active.add("heading");
    if (name === "bullet_list")
      active.add("bulletList");
    if (name === "code_block")
      active.add("codeBlock");
    if (name === "table")
      active.add("table");
  }
  return active;
}
function runAction(editor, action, payload) {
  editor.action((ctx) => {
    switch (action) {
      case "bold":
        callCommand(toggleStrongCommand.key)(ctx);
        break;
      case "italic":
        callCommand(toggleEmphasisCommand.key)(ctx);
        break;
      case "heading":
        callCommand(wrapInHeadingCommand.key, payload ?? 1)(ctx);
        break;
      case "bulletList":
        callCommand(wrapInBulletListCommand.key)(ctx);
        break;
      case "link": {
        const href = payload ?? "";
        callCommand(toggleLinkCommand.key, { href })(ctx);
        break;
      }
      case "table":
        callCommand(insertTableCommand.key, { row: 3, col: 3 })(ctx);
        break;
      case "codeBlock":
        callCommand(createCodeBlockCommand.key)(ctx);
        break;
    }
  });
}
function MarkdownEditor({ value, readOnly, onChange }) {
  const hostRef = useRef(null);
  const editorRef = useRef(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const readOnlyRef = useRef(readOnly);
  readOnlyRef.current = readOnly;
  const settingExternal = useRef(false);
  const lastMarkdown = useRef(value);
  const [active, setActive] = useState(/* @__PURE__ */ new Set());
  const setActiveRef = useRef(setActive);
  setActiveRef.current = setActive;
  useEffect(() => {
    if (!hostRef.current)
      return;
    const host = hostRef.current;
    let editor = null;
    let destroyed = false;
    Editor.make().config((ctx) => {
      ctx.set(rootCtx, host);
      ctx.set(defaultValueCtx, value);
      ctx.set(remarkStringifyOptionsCtx, {
        bullet: "-",
        fences: true,
        listItemIndent: "one",
        rule: "-",
        ruleSpaces: false,
        emphasis: "_",
        strong: "*",
        incrementListMarker: false
      });
      ctx.update(editorViewOptionsCtx, (prev) => ({
        ...prev,
        editable: () => !readOnlyRef.current,
        attributes: { class: "prose markdown" }
      }));
      ctx.get(listenerCtx).markdownUpdated((_ctx, markdown) => {
        if (settingExternal.current)
          return;
        lastMarkdown.current = markdown;
        onChangeRef.current(markdown);
      });
    }).use(commonmark).use(gfm).use(listener).use($prose(() => new Plugin({
      view: () => ({
        update: (view) => setActiveRef.current(activeActions(view.state))
      })
    }))).create().then((made) => {
      if (destroyed) {
        made.destroy();
        return;
      }
      editor = made;
      editorRef.current = made;
    });
    return () => {
      destroyed = true;
      editor == null ? void 0 : editor.destroy();
      editorRef.current = null;
    };
  }, []);
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor)
      return;
    if (value === lastMarkdown.current)
      return;
    editor.action((ctx) => {
      const serializer = ctx.get(serializerCtx);
      const view = ctx.get(editorViewCtx);
      if (serializer(view.state.doc) === value)
        return;
      settingExternal.current = true;
      try {
        replaceAll(value)(ctx);
        lastMarkdown.current = value;
      } finally {
        settingExternal.current = false;
      }
    });
  }, [value]);
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor)
      return;
    editor.action((ctx) => {
      const view = ctx.get(editorViewCtx);
      view.dispatch(view.state.tr);
    });
  }, [readOnly]);
  const onAction = (action, payload) => {
    const editor = editorRef.current;
    if (!editor || readOnly)
      return;
    if (action === "link" && payload === void 0) {
      const href = window.prompt("Link URL");
      if (href === null)
        return;
      runAction(editor, action, href);
      return;
    }
    runAction(editor, action, payload);
  };
  return createVNode("div", { className: "md-editor", children: [
    readOnly ? createVNode("div", { className: "ro-hint", children: [
      createVNode("span", { className: "dot" }),
      " Approved — read-only. Choose ",
      createVNode("b", { children: "Edit" }),
      " to reopen as a draft and format."
    ] }) : createVNode(MarkdownToolbar, {
      onAction,
      disabled: readOnly,
      active
    }),
    createVNode("div", { ref: hostRef, className: `md-surface${readOnly ? " md-surface--ro" : ""}` })
  ] });
}
function featureTitle(featureId) {
  return featureId.replace(/^feat-/, "").split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}
const PREVIEW_STYLE = `<style>
  html, body { margin: 0; }
  html { scrollbar-width: thin; scrollbar-color: #464554 transparent; }
  ::-webkit-scrollbar { width: 10px; height: 10px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: #464554; border-radius: 999px; border: 2px solid #0e0e10; }
  ::-webkit-scrollbar-thumb:hover { background: #908fa0; }
</style>`;
const STAGE_LABEL$1 = {
  prd: "PRD",
  architecture: "Architecture",
  design: "Design",
  plan: "Plan",
  walkthrough: "Walkthrough"
};
function DocPanel({ docId, onClose, onJumpTo }) {
  const [doc, setDoc] = useState(null);
  const [body, setBody] = useState("");
  const [error, setError] = useState(null);
  const [save, setSave] = useState({ kind: "idle" });
  const [depVersions, setDepVersions] = useState({});
  useEffect(() => {
    let cancelled = false;
    setDoc(null);
    setError(null);
    setSave({ kind: "idle" });
    fetchDoc(docId).then((d) => {
      if (cancelled)
        return;
      setDoc(d);
      setBody(d.body);
    }).catch((e) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [docId]);
  useEffect(() => {
    if (!doc || doc.dependsOn.length === 0)
      return;
    let cancelled = false;
    Promise.all(doc.dependsOn.map((id) => fetchDoc(id).then((d) => [id, d.version], () => [id, -1]))).then((pairs) => {
      if (cancelled)
        return;
      setDepVersions(Object.fromEntries(pairs));
    });
    return () => {
      cancelled = true;
    };
  }, [doc == null ? void 0 : doc.id, doc == null ? void 0 : doc.dependsOn.join(",")]);
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape")
        onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  const dirty = useMemo(() => doc !== null && body !== doc.body, [doc, body]);
  const isInterview = (doc == null ? void 0 : doc.kind) === "interview";
  const readOnly = (doc == null ? void 0 : doc.status) === "approved" && !isInterview;
  const isDesign = (doc == null ? void 0 : doc.stage) === "design";
  const reload = async () => {
    const d = await fetchDoc(docId);
    setDoc(d);
    setBody(d.body);
    setSave({ kind: "idle" });
  };
  const onSave = async () => {
    if (!doc || readOnly)
      return;
    setSave({ kind: "saving" });
    const res = await putDoc(doc.id, body, doc.version);
    if (res.ok) {
      setDoc(res.doc);
      setBody(res.doc.body);
      setSave({ kind: "saved", at: Date.now() });
    } else if (res.status === 409) {
      const current = await fetchDoc(doc.id);
      setSave({ kind: "conflict", serverVersion: current.version });
    } else {
      setSave({ kind: "error", message: res.error });
    }
  };
  const onApprove = async () => {
    if (!doc)
      return;
    try {
      const updated = await postDocStatus(doc.id, "approved");
      setDoc(updated);
      setBody(updated.body);
    } catch (e) {
      setSave({ kind: "error", message: e.message });
    }
  };
  const onReopen = async () => {
    if (!doc)
      return;
    try {
      const updated = await postDocStatus(doc.id, "draft");
      setDoc(updated);
      setBody(updated.body);
    } catch (e) {
      setSave({ kind: "error", message: e.message });
    }
  };
  const onShowGate = async () => {
    if (!doc)
      return;
    const gate = await fetchGate(doc.featureId, doc.stage);
    alert(gate.ok ? "Gate is open." : `Gate closed: ${gate.reason}`);
  };
  if (error) {
    return createVNode("div", { className: "panel-backdrop", onClick: onClose, children: createVNode("aside", { className: "panel", onClick: (e) => e.stopPropagation(), children: [
      createVNode("header", { className: "panel__header", children: [
        createVNode("button", { className: "panel__close", onClick: onClose, children: "×" }),
        createVNode("h2", { children: "Could not load document" })
      ] }),
      createVNode("p", { className: "panel__error", children: error })
    ] }) });
  }
  if (!doc) {
    return createVNode("div", { className: "panel-backdrop", onClick: onClose, children: createVNode("aside", { className: "panel", onClick: (e) => e.stopPropagation(), children: createVNode("p", { style: { padding: "2rem", color: "var(--text-dim)" }, children: "Loading…" }) }) });
  }
  return createVNode("div", { className: "panel-backdrop", onClick: onClose, children: createVNode("aside", { className: "panel", onClick: (e) => e.stopPropagation(), children: [
    createVNode("header", { className: "panel__header", children: [
      createVNode("div", { className: "panel__header-main", children: [
        createVNode("nav", { className: "panel__crumb", children: [
          featureTitle(doc.featureId),
          " ",
          createVNode("span", { className: "panel__crumb-sep", children: "›" }),
          " ",
          STAGE_LABEL$1[doc.stage]
        ] }),
        createVNode("div", { className: "panel__title-row", children: [
          createVNode("h2", { className: "panel__title", children: doc.title }),
          createVNode("span", { className: "panel__meta", children: [
            STAGE_LABEL$1[doc.stage],
            " · ",
            createVNode("span", { className: "panel__version", children: [
              "v",
              doc.version
            ] })
          ] })
        ] }),
        createVNode("div", { className: "panel__badges", children: [
          isInterview ? createVNode("span", { className: "badge badge--interview", children: "interview" }) : createVNode("span", { className: `badge badge--${doc.status}`, children: doc.status }),
          doc.stale && createVNode("span", { className: "badge badge--stale", children: "⚠ stale" }),
          createVNode("span", { className: "badge badge--meta", title: doc.id, children: doc.id }),
          createVNode("span", { className: "badge badge--meta", children: doc.generatedBy })
        ] })
      ] }),
      createVNode("div", { className: "panel__header-actions", children: [
        createVNode("button", {
          className: "btn",
          disabled: !dirty || save.kind === "saving" || readOnly,
          onClick: onSave,
          children: save.kind === "saving" ? "Saving…" : dirty ? "Save" : "Saved"
        }),
        !isInterview && createVNode(Fragment, { children: [
          doc.status === "draft" ? createVNode("button", {
            className: "btn btn--primary",
            disabled: dirty,
            title: dirty ? "save your changes first" : "",
            onClick: onApprove,
            children: "Approve"
          }) : createVNode("button", {
            className: "btn",
            onClick: onReopen,
            title: "Editing an approved doc reopens it as a draft",
            children: "Edit"
          }),
          createVNode("button", { className: "btn btn--ghost", onClick: onShowGate, children: "Gate?" })
        ] }),
        createVNode("button", { className: "panel__close", onClick: onClose, children: "×" })
      ] })
    ] }),
    doc.stale && doc.dependsOn.length > 0 && createVNode("section", { className: "panel__stale", children: [
      createVNode("strong", { children: "This doc is stale." }),
      " Dependencies have changed since it was based on them.",
      createVNode("ul", { className: "stale-list", children: doc.dependsOn.map((depId) => {
        const based = doc.basedOn[depId];
        const current = depVersions[depId];
        const drift = current !== void 0 && current !== -1 && based !== void 0 && current !== based;
        return createVNode("li", { className: drift ? "stale-list__item stale-list__item--drift" : "stale-list__item", children: [
          createVNode("button", { className: "link", onClick: () => onJumpTo(depId), children: depId }),
          based !== void 0 && createVNode("span", { children: [
            " · based on v",
            based
          ] }),
          current !== void 0 && current !== -1 && createVNode("span", { children: [
            " · now v",
            current
          ] }),
          drift && createVNode("span", { className: "drift-tag", children: " drift" })
        ] }, depId);
      }) })
    ] }),
    save.kind === "conflict" && createVNode("div", { className: "banner banner--warn", children: [
      "File changed on disk (now v",
      save.serverVersion,
      "). Your edits weren't saved.",
      createVNode("button", { className: "link", onClick: reload, children: "Reload from disk" }),
      " to merge by hand."
    ] }),
    save.kind === "error" && createVNode("div", { className: "banner banner--error", children: [
      save.message,
      createVNode("button", { className: "link", onClick: () => setSave({ kind: "idle" }), children: "dismiss" })
    ] }),
    save.kind === "saved" && createVNode("div", { className: "banner banner--ok", children: [
      "Saved · now v",
      doc.version
    ] }),
    createVNode("div", { className: "panel__body panel__body--cols-1", children: isDesign ? createVNode("iframe", {
      className: "panel__preview panel__preview--iframe",
      title: "design brief preview",
      sandbox: "allow-same-origin",
      srcDoc: PREVIEW_STYLE + body
    }) : createVNode("div", { className: "panel__editor", children: createVNode(MarkdownEditor, {
      value: body,
      readOnly: !!readOnly,
      onChange: setBody
    }, doc.id) }) }),
    createVNode("footer", { className: "panel__footer", children: createVNode("span", { children: doc.filePath }) })
  ] }) });
}
const DEFAULT_PHASE$1 = "default";
const STATUS_LABEL = {
  todo: "Todo",
  in_progress: "In progress",
  done: "Done",
  blocked: "Blocked"
};
const STATUS_ORDER = ["todo", "in_progress", "done", "blocked"];
function BuildPanel({ featureId, featureTitle: featureTitle2, onClose }) {
  var _a;
  const [tasks, setTasks] = useState(null);
  const [error, setError] = useState(null);
  const [newTitle, setNewTitle] = useState("");
  const [busy, setBusy] = useState(null);
  const reload = () => {
    fetchTasks(featureId).then((t) => {
      setTasks(t);
      setError(null);
    }).catch((e) => setError(e.message));
  };
  useEffect(() => {
    reload();
    let pending = 0;
    const close = openWebSocket((event) => {
      if (event.type === "task.updated" && event.featureId === featureId) {
        window.clearTimeout(pending);
        pending = window.setTimeout(reload, 80);
      }
    });
    const onKey = (e) => {
      if (e.key === "Escape")
        onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(pending);
      close();
      window.removeEventListener("keydown", onKey);
    };
  }, [featureId]);
  const counts = useMemo(() => {
    const c = { todo: 0, in_progress: 0, done: 0, blocked: 0 };
    for (const t of tasks ?? [])
      c[t.status]++;
    return c;
  }, [tasks]);
  const total = (tasks ?? []).length;
  const donePct = total === 0 ? 0 : Math.round(counts.done / total * 100);
  const progPct = total === 0 ? 0 : Math.round(counts.in_progress / total * 100);
  const phaseGroups = useMemo(() => {
    const order = [];
    const byPhase = /* @__PURE__ */ new Map();
    for (const t of tasks ?? []) {
      const name = t.phase || DEFAULT_PHASE$1;
      if (!byPhase.has(name)) {
        byPhase.set(name, []);
        order.push(name);
      }
      byPhase.get(name).push(t);
    }
    return order.map((name) => {
      const items = byPhase.get(name);
      const c = { todo: 0, in_progress: 0, done: 0, blocked: 0 };
      for (const t of items)
        c[t.status]++;
      return { name, tasks: items, counts: c, total: items.length };
    });
  }, [tasks]);
  const multiPhase = phaseGroups.length > 1 || ((_a = phaseGroups[0]) == null ? void 0 : _a.name) && phaseGroups[0].name !== DEFAULT_PHASE$1;
  const [collapsed, setCollapsed] = useState({});
  const toggle = (name) => setCollapsed((m) => ({ ...m, [name]: !m[name] }));
  const setStatus = async (task, status) => {
    setBusy(task.id);
    try {
      await patchTask(featureId, task.id, { status });
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(null);
    }
  };
  const addArtifact = async (task, kind, value) => {
    const trimmed = value.trim();
    if (!trimmed)
      return;
    setBusy(task.id);
    try {
      const next = Array.from(/* @__PURE__ */ new Set([...task.artifacts[kind], trimmed]));
      await patchTask(featureId, task.id, { artifacts: { [kind]: next } });
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(null);
    }
  };
  const removeArtifact = async (task, kind, value) => {
    setBusy(task.id);
    try {
      const next = task.artifacts[kind].filter((v) => v !== value);
      await patchTask(featureId, task.id, { artifacts: { [kind]: next } });
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(null);
    }
  };
  const setPr = async (task, value) => {
    const trimmed = value.trim();
    setBusy(task.id);
    try {
      await patchTask(featureId, task.id, {
        artifacts: { pr: trimmed === "" ? null : trimmed }
      });
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(null);
    }
  };
  const createTask = async () => {
    if (!newTitle.trim())
      return;
    setBusy("__new");
    try {
      await createTaskApi(featureId, newTitle.trim());
      setNewTitle("");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(null);
    }
  };
  return createVNode("div", { className: "panel-backdrop", onClick: onClose, children: createVNode("aside", { className: "panel", onClick: (e) => e.stopPropagation(), children: [
    createVNode("header", { className: "panel__header", children: [
      createVNode("button", { className: "panel__close", onClick: onClose, children: "×" }),
      createVNode("div", { className: "panel__title-row", children: [
        createVNode("h2", { className: "panel__title", children: [
          featureTitle2,
          " · Build"
        ] }),
        createVNode("span", { className: "panel__meta", children: [
          counts.done,
          "/",
          total,
          " done",
          counts.in_progress > 0 && ` · ${counts.in_progress} in progress`,
          counts.blocked > 0 && ` · 🚫 ${counts.blocked} blocked`
        ] })
      ] }),
      total > 0 && createVNode("div", { className: "bar", style: { marginTop: "0.6rem" }, children: [
        createVNode("div", { className: "bar__seg bar__seg--done", style: { width: `${donePct}%` } }),
        createVNode("div", { className: "bar__seg bar__seg--prog", style: { width: `${progPct}%` } })
      ] })
    ] }),
    error && createVNode("div", { className: "banner banner--error", children: [
      error,
      createVNode("button", { className: "link", onClick: () => setError(null), children: "dismiss" })
    ] }),
    createVNode("div", { className: "panel__tasks", children: tasks === null ? createVNode("p", { style: { padding: "2rem", color: "var(--text-dim)" }, children: "Loading…" }) : tasks.length === 0 ? createVNode("p", { style: { padding: "1.5rem", color: "var(--text-dim)" }, children: [
      "No tasks yet. The planner subagent (Phase 4) emits these from ",
      createVNode("code", { children: "/specmanager-plan" }),
      ". You can also add ad-hoc tasks below."
    ] }) : multiPhase ? createVNode("div", { className: "phase-groups", children: phaseGroups.map((g) => {
      const phaseDonePct = g.total === 0 ? 0 : Math.round(g.counts.done / g.total * 100);
      const phaseProgPct = g.total === 0 ? 0 : Math.round(g.counts.in_progress / g.total * 100);
      const allDone = g.total > 0 && g.counts.done === g.total;
      const hasBlocked = g.counts.blocked > 0;
      const isCollapsed = collapsed[g.name] ?? false;
      const slash = `/specmanager-build ${featureId} ${g.name}`;
      const copySlash = (e) => {
        var _a2;
        e.stopPropagation();
        void ((_a2 = navigator.clipboard) == null ? void 0 : _a2.writeText(slash));
      };
      return createVNode("section", {
        className: `phase-group${allDone ? " phase-group--done" : ""}${hasBlocked ? " phase-group--blocked" : ""}`,
        children: [
          createVNode("header", { className: "phase-group__head", children: [
            createVNode("button", {
              type: "button",
              className: "phase-group__toggle",
              onClick: () => toggle(g.name),
              "aria-expanded": !isCollapsed,
              children: [
                createVNode("span", { className: "phase-group__caret", children: isCollapsed ? "▸" : "▾" }),
                createVNode("span", { className: "phase-group__name", children: [
                  "Phase ",
                  g.name
                ] }),
                createVNode("span", { className: "phase-group__count", children: [
                  g.counts.done,
                  "/",
                  g.total,
                  " done",
                  g.counts.in_progress > 0 && ` · ${g.counts.in_progress} in progress`,
                  g.counts.blocked > 0 && ` · 🚫 ${g.counts.blocked} blocked`
                ] })
              ]
            }),
            createVNode("button", {
              type: "button",
              className: "phase-group__cmd",
              title: "copy /specmanager-build slash command",
              onClick: copySlash,
              children: slash
            })
          ] }),
          createVNode("div", { className: "bar phase-group__bar", children: [
            createVNode("div", { className: "bar__seg bar__seg--done", style: { width: `${phaseDonePct}%` } }),
            createVNode("div", { className: "bar__seg bar__seg--prog", style: { width: `${phaseProgPct}%` } })
          ] }),
          !isCollapsed && createVNode("ul", { className: "task-list task-list--in-phase", children: g.tasks.map((t) => createVNode(TaskRow, {
            task: t,
            busy: busy === t.id,
            onStatus: (s) => setStatus(t, s),
            onAddArtifact: (kind, v) => addArtifact(t, kind, v),
            onRemoveArtifact: (kind, v) => removeArtifact(t, kind, v),
            onSetPr: (v) => setPr(t, v)
          }, t.id)) })
        ]
      }, g.name);
    }) }) : createVNode("ul", { className: "task-list", children: tasks.map((t) => createVNode(TaskRow, {
      task: t,
      busy: busy === t.id,
      onStatus: (s) => setStatus(t, s),
      onAddArtifact: (kind, v) => addArtifact(t, kind, v),
      onRemoveArtifact: (kind, v) => removeArtifact(t, kind, v),
      onSetPr: (v) => setPr(t, v)
    }, t.id)) }) }),
    createVNode("footer", { className: "panel__footer panel__footer--actions", children: [
      createVNode("input", {
        type: "text",
        placeholder: "New task title…",
        value: newTitle,
        onChange: (e) => setNewTitle(e.target.value),
        onKeyDown: (e) => {
          if (e.key === "Enter")
            void createTask();
        },
        className: "input"
      }),
      createVNode("button", {
        className: "btn btn--primary",
        disabled: !newTitle.trim() || busy === "__new",
        onClick: createTask,
        children: "Add task"
      })
    ] })
  ] }) });
}
function TaskRow({ task, busy, onStatus, onAddArtifact, onRemoveArtifact, onSetPr }) {
  const [showArtifacts, setShowArtifacts] = useState(task.artifacts.commits.length + task.artifacts.files.length > 0 || task.artifacts.pr !== null);
  const [commitInput, setCommitInput] = useState("");
  const [fileInput, setFileInput] = useState("");
  return createVNode("li", { className: `task task--${task.status}${busy ? " task--busy" : ""}`, children: [
    createVNode("div", { className: "task__head", children: [
      createVNode("span", { className: "task__id", children: task.id }),
      createVNode("span", { className: "task__title", children: task.title }),
      createVNode("div", { className: "task__status", children: STATUS_ORDER.map((s) => createVNode("button", {
        type: "button",
        className: `status-pill${task.status === s ? " status-pill--on" : ""} status-pill--${s}`,
        disabled: busy,
        onClick: () => onStatus(s),
        children: STATUS_LABEL[s]
      }, s)) })
    ] }),
    createVNode("button", {
      type: "button",
      className: "task__toggle",
      onClick: () => setShowArtifacts((v) => !v),
      children: [
        showArtifacts ? "▾" : "▸",
        " artifacts",
        (task.artifacts.commits.length > 0 || task.artifacts.files.length > 0 || task.artifacts.pr) && createVNode("span", { className: "task__artifact-count", children: [
          " ",
          "(",
          task.artifacts.commits.length + task.artifacts.files.length + (task.artifacts.pr ? 1 : 0),
          ")"
        ] })
      ]
    }),
    showArtifacts && createVNode("div", { className: "task__artifacts", children: [
      createVNode("div", { className: "task__artifact-group", children: [
        createVNode("label", { children: "Commits" }),
        createVNode("ul", { children: task.artifacts.commits.map((c) => createVNode("li", { children: [
          createVNode("code", { children: c }),
          createVNode("button", { className: "link link--small", onClick: () => onRemoveArtifact("commits", c), children: "×" })
        ] }, c)) }),
        createVNode("input", {
          className: "input input--small",
          placeholder: "abc1234 or full sha",
          value: commitInput,
          onChange: (e) => setCommitInput(e.target.value),
          onKeyDown: (e) => {
            if (e.key === "Enter") {
              onAddArtifact("commits", commitInput);
              setCommitInput("");
            }
          }
        })
      ] }),
      createVNode("div", { className: "task__artifact-group", children: [
        createVNode("label", { children: "Files" }),
        createVNode("ul", { children: task.artifacts.files.map((f) => createVNode("li", { children: [
          createVNode("code", { children: f }),
          createVNode("button", { className: "link link--small", onClick: () => onRemoveArtifact("files", f), children: "×" })
        ] }, f)) }),
        createVNode("input", {
          className: "input input--small",
          placeholder: "src/path/to/file.ts",
          value: fileInput,
          onChange: (e) => setFileInput(e.target.value),
          onKeyDown: (e) => {
            if (e.key === "Enter") {
              onAddArtifact("files", fileInput);
              setFileInput("");
            }
          }
        })
      ] }),
      createVNode("div", { className: "task__artifact-group", children: [
        createVNode("label", { children: "PR" }),
        createVNode("input", {
          className: "input input--small",
          placeholder: "https://github.com/.../pull/123",
          defaultValue: task.artifacts.pr ?? "",
          onBlur: (e) => {
            const v = e.currentTarget.value;
            if ((task.artifacts.pr ?? "") !== v)
              onSetPr(v);
          }
        })
      ] })
    ] })
  ] });
}
const STAGES = ["prd", "architecture", "design", "plan", "walkthrough"];
const DEFAULT_PHASE = "default";
const FINAL_PHASE = "final";
const STAGE_LABEL = {
  prd: "PRD",
  architecture: "Architecture",
  design: "Design",
  plan: "Plan",
  build: "Build",
  walkthrough: "Walkthroughs"
};
function findDoc(row, stage) {
  return row.documents.find((d) => d.stage === stage && d.kind !== "interview");
}
function findInterview(row) {
  return row.documents.find((d) => d.kind === "interview");
}
function priorStageApproved(row, stage) {
  var _a, _b, _c;
  if (stage === "prd")
    return true;
  if (stage === "design")
    return ((_a = findDoc(row, "prd")) == null ? void 0 : _a.status) === "approved";
  if (stage === "architecture")
    return ((_b = findDoc(row, "prd")) == null ? void 0 : _b.status) === "approved";
  if (stage === "plan") {
    if (((_c = findDoc(row, "architecture")) == null ? void 0 : _c.status) !== "approved")
      return false;
    const design = findDoc(row, "design");
    if (design && design.status !== "approved")
      return false;
    return true;
  }
  return true;
}
function DocCellView({ doc, onOpen }) {
  return createVNode("button", {
    type: "button",
    className: `card card--button${doc.stale ? " card--stale" : ""}`,
    onClick: () => onOpen(doc.id),
    title: doc.id,
    children: [
      createVNode("span", { className: "card__title", children: doc.title }),
      createVNode("span", { className: "card__badges", children: [
        createVNode("span", { className: `badge badge--${doc.status}`, children: doc.status }),
        doc.stale && createVNode("span", { className: "badge badge--stale", children: "⚠ stale" }),
        createVNode("span", { className: "badge badge--meta", children: [
          "v",
          doc.version
        ] })
      ] })
    ]
  });
}
function LockedCell({ stage }) {
  return createVNode("div", { className: "card card--locked", children: [
    createVNode("span", { className: "card__locked-label", children: [
      STAGE_LABEL[stage],
      " locked"
    ] }),
    createVNode("span", { className: "card__locked-sub", children: "prior stage not approved" })
  ] });
}
function EmptyCell({ stage, ready }) {
  const slash = `/specmanager-${stage}`;
  const onCopy = (e) => {
    var _a;
    e.stopPropagation();
    void ((_a = navigator.clipboard) == null ? void 0 : _a.writeText(slash));
  };
  return createVNode("div", { className: `card card--empty${ready ? " card--ready" : ""}`, children: [
    createVNode("span", { className: "card__empty-label", children: ready ? "Generate" : STAGE_LABEL[stage] }),
    ready ? createVNode("button", { type: "button", className: "card__empty-cmd", onClick: onCopy, title: "copy to clipboard", children: slash }) : createVNode("span", { className: "card__empty-sub", children: "—" })
  ] });
}
function OptionalDesignCell({ ready }) {
  const slash = "/specmanager-design";
  const onCopy = (e) => {
    var _a;
    e.stopPropagation();
    void ((_a = navigator.clipboard) == null ? void 0 : _a.writeText(slash));
  };
  if (!ready) {
    return createVNode("div", { className: "card card--empty card--optional", children: [
      createVNode("span", { className: "card__empty-label", children: "Design" }),
      createVNode("span", { className: "card__empty-sub", children: "optional · PRD not approved" })
    ] });
  }
  return createVNode("div", { className: "card card--empty card--optional card--optional-ready", children: [
    createVNode("span", { className: "card__empty-label", children: "Design" }),
    createVNode("span", { className: "card__optional-tag", children: "optional" }),
    createVNode("button", { type: "button", className: "card__empty-cmd", onClick: onCopy, title: "copy to clipboard", children: slash })
  ] });
}
function BuildCell({ tasks, row, onOpen }) {
  var _a, _b, _c, _d, _e;
  if (tasks.total === 0) {
    const planApproved = ((_a = findDoc(row, "plan")) == null ? void 0 : _a.status) === "approved";
    return createVNode("button", {
      type: "button",
      className: `card card--empty${planApproved ? " card--ready" : ""}`,
      onClick: () => onOpen(row.id, row.title),
      children: [
        createVNode("span", { className: "card__empty-label", children: "Build" }),
        createVNode("span", { className: "card__empty-sub", children: planApproved ? "no tasks yet · click to add" : "plan not approved" })
      ]
    });
  }
  const donePct = Math.round(tasks.done / Math.max(1, tasks.total) * 100);
  const inProgressPct = Math.round(tasks.in_progress / Math.max(1, tasks.total) * 100);
  const nextPhase = (_b = row.phases) == null ? void 0 : _b.find((p) => p.status !== "done" && p.status !== "empty");
  const slash = nextPhase ? `/specmanager-build ${row.id} next` : null;
  const onCopy = (e) => {
    var _a2;
    e.stopPropagation();
    if (slash)
      void ((_a2 = navigator.clipboard) == null ? void 0 : _a2.writeText(slash));
  };
  const multiPhase = (((_c = row.phases) == null ? void 0 : _c.length) ?? 0) > 1 || ((_e = (_d = row.phases) == null ? void 0 : _d[0]) == null ? void 0 : _e.name) && row.phases[0].name !== DEFAULT_PHASE;
  return createVNode("button", {
    type: "button",
    className: "card card--build card--button",
    onClick: () => onOpen(row.id, row.title),
    children: [
      createVNode("span", { className: "card__title", children: "Build" }),
      createVNode("div", { className: "bar", children: [
        createVNode("div", { className: "bar__seg bar__seg--done", style: { width: `${donePct}%` } }),
        createVNode("div", { className: "bar__seg bar__seg--prog", style: { width: `${inProgressPct}%` } })
      ] }),
      createVNode("span", { className: "card__build-counts", children: [
        createVNode("span", { children: [
          tasks.done,
          "/",
          tasks.total,
          " done"
        ] }),
        multiPhase && row.phases && createVNode("span", { children: [
          "· phases ",
          row.phases.filter((p) => p.status === "done").length,
          "/",
          row.phases.length
        ] }),
        tasks.in_progress > 0 && createVNode("span", { children: [
          "· ",
          tasks.in_progress,
          " in progress"
        ] }),
        tasks.blocked > 0 && createVNode("span", { className: "card__build-blocked", children: [
          "· 🚫 ",
          tasks.blocked,
          " blocked"
        ] })
      ] }),
      slash && createVNode("span", {
        className: "card__build-exec",
        onClick: onCopy,
        title: "copy /specmanager-build next slash command",
        children: [
          "▶ ",
          slash
        ]
      })
    ]
  });
}
function PhaseWalkthroughCard({ phase, row, onOpen }) {
  const doc = phase.walkthroughId ? row.documents.find((d) => d.id === phase.walkthroughId) : void 0;
  if (doc) {
    return createVNode("button", {
      type: "button",
      className: `card card--button card--sub${doc.stale ? " card--stale" : ""}`,
      onClick: () => onOpen(doc.id),
      title: doc.id,
      children: [
        createVNode("span", { className: "card__sub-label", children: [
          "Phase ",
          phase.name
        ] }),
        createVNode("span", { className: "card__badges", children: [
          createVNode("span", { className: `badge badge--${doc.status}`, children: doc.status }),
          doc.stale && createVNode("span", { className: "badge badge--stale", children: "⚠ stale" })
        ] })
      ]
    });
  }
  const ready = phase.status === "done";
  const slash = `/specmanager-walkthrough ${row.id} ${phase.name}`;
  const onCopy = (e) => {
    var _a;
    e.stopPropagation();
    void ((_a = navigator.clipboard) == null ? void 0 : _a.writeText(slash));
  };
  return createVNode("div", { className: `card card--sub card--empty${ready ? " card--ready" : " card--locked"}`, children: [
    createVNode("span", { className: "card__sub-label", children: [
      "Phase ",
      phase.name
    ] }),
    ready ? createVNode("button", { type: "button", className: "card__empty-cmd", onClick: onCopy, title: "copy to clipboard", children: slash }) : createVNode("span", { className: "card__locked-sub", children: [
      phase.doneCount,
      "/",
      phase.taskCount,
      " tasks done"
    ] })
  ] });
}
function FinalWalkthroughCard({ row, onOpen }) {
  const phases = row.phases ?? [];
  const finalDoc = row.documents.find((d) => d.stage === "walkthrough" && d.phase === FINAL_PHASE);
  if (finalDoc) {
    return createVNode("button", {
      type: "button",
      className: `card card--button card--sub card--final${finalDoc.stale ? " card--stale" : ""}`,
      onClick: () => onOpen(finalDoc.id),
      title: finalDoc.id,
      children: [
        createVNode("span", { className: "card__sub-label", children: "★ Feature roll-up" }),
        createVNode("span", { className: "card__badges", children: [
          createVNode("span", { className: `badge badge--${finalDoc.status}`, children: finalDoc.status }),
          finalDoc.stale && createVNode("span", { className: "badge badge--stale", children: "⚠ stale" })
        ] })
      ]
    });
  }
  const missing = phases.filter((p) => p.walkthroughStatus !== "approved").map((p) => p.name);
  const ready = phases.length > 0 && missing.length === 0;
  const slash = `/specmanager-walkthrough ${row.id} final`;
  const onCopy = (e) => {
    var _a;
    e.stopPropagation();
    if (ready)
      void ((_a = navigator.clipboard) == null ? void 0 : _a.writeText(slash));
  };
  const tooltip = ready ? "all phase walkthroughs approved — ready to draft" : missing.length > 0 ? `awaiting approval: ${missing.map((m) => `phase ${m}`).join(", ")}` : "no phases yet";
  return createVNode("div", {
    className: `card card--sub card--final card--empty${ready ? " card--ready" : " card--locked"}`,
    title: tooltip,
    children: [
      createVNode("span", { className: "card__sub-label", children: "★ Feature roll-up" }),
      ready ? createVNode("button", { type: "button", className: "card__empty-cmd", onClick: onCopy, title: "copy to clipboard", children: slash }) : createVNode("span", { className: "card__locked-sub", children: missing.length > 0 ? `${missing.length} phase(s) pending` : "no phases yet" })
    ]
  });
}
function WalkthroughCell({ row, onOpenDoc }) {
  const phases = row.phases ?? [];
  if (phases.length === 0) {
    if (!priorStageApproved(row, "walkthrough"))
      return createVNode(LockedCell, { stage: "walkthrough" });
    return createVNode(EmptyCell, { stage: "walkthrough", ready: false });
  }
  const showFinal = phases.length > 1;
  return createVNode("div", { className: "card card--walkthroughs", children: [
    phases.map((p) => createVNode(PhaseWalkthroughCard, { phase: p, row, onOpen: onOpenDoc }, p.name)),
    showFinal && createVNode(FinalWalkthroughCard, { row, onOpen: onOpenDoc })
  ] });
}
function Cell({ row, column, onOpenDoc, onOpenBuild }) {
  var _a;
  if (column === "build")
    return createVNode(BuildCell, { tasks: row.tasks, row, onOpen: onOpenBuild });
  if (column === "walkthrough")
    return createVNode(WalkthroughCell, { row, onOpenDoc });
  const stage = column;
  const doc = findDoc(row, stage);
  if (stage === "prd") {
    const interview = findInterview(row);
    if (interview) {
      return createVNode("div", { className: "cell-stack", children: [
        doc ? createVNode(DocCellView, { doc, onOpen: onOpenDoc }) : createVNode(EmptyCell, { stage: "prd", ready: true }),
        createVNode("button", {
          type: "button",
          className: "chip-interview",
          onClick: () => onOpenDoc(interview.id),
          title: interview.id,
          children: [
            createVNode("span", { className: "ring" }),
            "Interview ",
            createVNode("span", { className: "meta", children: [
              "· v",
              interview.version
            ] })
          ]
        })
      ] });
    }
  }
  if (doc)
    return createVNode(DocCellView, { doc, onOpen: onOpenDoc });
  if (stage === "design") {
    return createVNode(OptionalDesignCell, { ready: ((_a = findDoc(row, "prd")) == null ? void 0 : _a.status) === "approved" });
  }
  if (!priorStageApproved(row, stage))
    return createVNode(LockedCell, { stage });
  return createVNode(EmptyCell, { stage, ready: true });
}
function App() {
  const [board, setBoard] = useState(null);
  const [error, setError] = useState(null);
  const [lastEvent, setLastEvent] = useState(null);
  const [openDocId, setOpenDocId] = useState(null);
  const [openBuild, setOpenBuild] = useState(null);
  const openDoc = useCallback((id) => setOpenDocId(id), []);
  const closeDoc = useCallback(() => setOpenDocId(null), []);
  const openBuildFor = useCallback((featureId, title) => {
    setOpenBuild({ featureId, title });
  }, []);
  const closeBuild = useCallback(() => setOpenBuild(null), []);
  const reload = () => {
    fetchBoard().then((b) => {
      setBoard(b);
      setError(null);
    }).catch((err) => setError(err.message));
  };
  useEffect(() => {
    reload();
    let pending = 0;
    const close = openWebSocket((event) => {
      setLastEvent(event.type);
      window.clearTimeout(pending);
      pending = window.setTimeout(reload, 100);
    });
    return () => {
      window.clearTimeout(pending);
      close();
    };
  }, []);
  if (error) {
    return createVNode("main", { className: "state state--error", children: [
      createVNode("h1", { children: "SpecManager" }),
      createVNode("p", { children: [
        "Could not reach the board API: ",
        error
      ] })
    ] });
  }
  if (!board)
    return createVNode("main", { className: "state", children: "Loading…" });
  return createVNode("main", { className: "board", children: [
    createVNode("header", { className: "board__header", children: [
      createVNode("h1", { className: "board__title", children: "SpecManager" }),
      createVNode("div", { className: "board__meta", children: [
        createVNode("span", { className: "board__count", children: [
          board.features.length,
          " feature",
          board.features.length === 1 ? "" : "s"
        ] }),
        lastEvent && createVNode("span", { className: "board__pulse", children: [
          "· ",
          lastEvent
        ] })
      ] })
    ] }),
    board.features.length === 0 ? createVNode("section", { className: "empty", children: [
      createVNode("p", { children: "No features yet." }),
      createVNode("pre", { children: "/specmanager-prd <title>" })
    ] }) : createVNode("section", {
      className: "grid",
      style: {
        "--grid-cols": `12rem repeat(4, minmax(11rem, 1fr)) 14rem minmax(11rem, 1fr)`
      },
      children: [
        createVNode("div", { className: "grid__corner", children: "Feature" }),
        STAGES.map((c) => createVNode(Fragment, { children: [
          c === "walkthrough" && createVNode("div", { className: "grid__header grid__header--build", children: "Build" }),
          createVNode("div", { className: "grid__header", children: STAGE_LABEL[c] })
        ] }, c)),
        board.features.map((row) => createVNode("div", { className: "row", style: { display: "contents" }, children: [
          createVNode("div", { className: "row__label", children: [
            createVNode("strong", { children: row.title }),
            createVNode("small", { children: row.slug })
          ] }),
          STAGES.map((c) => createVNode(Fragment, { children: [
            c === "walkthrough" && createVNode("div", { className: "row__cell row__cell--build", children: createVNode(Cell, { row, column: "build", onOpenDoc: openDoc, onOpenBuild: openBuildFor }) }),
            createVNode("div", { className: "row__cell", children: createVNode(Cell, { row, column: c, onOpenDoc: openDoc, onOpenBuild: openBuildFor }) })
          ] }, c))
        ] }, row.id))
      ]
    }),
    openDocId && createVNode(DocPanel, { docId: openDocId, onClose: closeDoc, onJumpTo: openDoc }),
    openBuild && createVNode(BuildPanel, {
      featureId: openBuild.featureId,
      featureTitle: openBuild.title,
      onClose: closeBuild
    })
  ] });
}
const root = document.getElementById("root");
if (!root)
  throw new Error("missing #root");
createRoot(root).render(createVNode(React.StrictMode, { children: createVNode(App, {}) }));
