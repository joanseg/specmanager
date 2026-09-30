import { r as reactExports, j as jsxRuntimeExports, R as React } from "./react-pw8zK_a6.js";
import { c as createRoot } from "./react-dom-3WAF5SeA.js";
import { E as Editor, q as rootCtx, e as defaultValueCtx, o as remarkStringifyOptionsCtx, h as editorViewOptionsCtx, t as serializerCtx, g as editorViewCtx } from "./milkdown-core-C6dPpLAB.js";
import { c as commonmark, a as createCodeBlockCommand, b as toggleLinkCommand, w as wrapInBulletListCommand, e as wrapInHeadingCommand, t as toggleEmphasisCommand, d as toggleStrongCommand } from "./milkdown-preset-commonmark-DQ8RCjbp.js";
import { g as gfm, i as insertTableCommand } from "./milkdown-preset-gfm-C6mwoX0b.js";
import { a as listenerCtx, l as listener } from "./milkdown-plugin-listener-JXxSKaSL.js";
import { i as $prose, r as replaceAll, l as callCommand } from "./milkdown-utils-RRPDCNwv.js";
import { P as Plugin } from "./prosemirror-state-DSNoeGZS.js";
import "./scheduler-K__oi9SH.js";
import "./milkdown-ctx-BTsDyn0Z.js";
import "./milkdown-exception-CsDPrAT2.js";
import "./milkdown-prose-C8tJwojZ.js";
import "./prosemirror-inputrules-DEUBGGnM.js";
import "./prosemirror-transform-BJ7jPk9e.js";
import "./prosemirror-model-B_MoZYx6.js";
import "./orderedmap-2iOkoZb1.js";
import "./prosemirror-tables-D6-FmvFw.js";
import "./prosemirror-view-R3B9ydcM.js";
import "./prosemirror-keymap-BFzXiUTi.js";
import "./w3c-keyname-UQGyUXrT.js";
import "./milkdown-transformer-DuyOxMp-.js";
import "./unified-BfKWPeLf.js";
import "./bail-CqJVcVEc.js";
import "./extend-DDwAXSMw.js";
import "./is-plain-obj-Bdy7oolY.js";
import "./trough-DON0ttGR.js";
import "./vfile-E5L3gaql.js";
import "./vfile-message-B9QcFaNL.js";
import "./unist-util-stringify-position-DD2_lbmV.js";
import "./remark-parse-DCcdV46U.js";
import "./mdast-util-from-markdown-jNdyy-ZE.js";
import "./micromark-util-decode-numeric-character-reference-CsVBVMCu.js";
import "./micromark-util-decode-string-3iu-ylSn.js";
import "./decode-named-character-reference-CMFiwAr6.js";
import "./micromark-util-normalize-identifier-CuJVDrso.js";
import "./micromark-CbKbBuV4.js";
import "./micromark-util-combine-extensions-DLIiphuE.js";
import "./micromark-util-chunked-C1m2KFE6.js";
import "./micromark-factory-space-BDeXk8zC.js";
import "./micromark-util-character-FzoMTwYT.js";
import "./micromark-core-commonmark-DGYyVo_Q.js";
import "./micromark-util-classify-character-9t0V3Y6t.js";
import "./micromark-util-resolve-all-DOI1xbmr.js";
import "./micromark-util-subtokenize-C5f1MBmj.js";
import "./micromark-factory-destination-D7aQCVb0.js";
import "./micromark-factory-label-KKsTErkT.js";
import "./micromark-factory-title-C3jqZ43K.js";
import "./micromark-factory-whitespace-B6cYvoCB.js";
import "./micromark-util-html-tag-name-Cj_XU7mS.js";
import "./mdast-util-to-string-cbiyYImb.js";
import "./remark-stringify-2Q9ScM9k.js";
import "./mdast-util-to-markdown-ljU3R65o.js";
import "./zwitch-BEZf1ZPW.js";
import "./longest-streak-aEh9OmVY.js";
import "./unist-util-visit-DGOjL9nv.js";
import "./unist-util-visit-parents-BZ5PFfVf.js";
import "./unist-util-is-DibYb9RW.js";
import "./mdast-util-phrasing-CIgj490S.js";
import "./prosemirror-commands-Bk7nFUou.js";
import "./prosemirror-schema-list-D9dQF2wJ.js";
import "./remark-inline-links-CcNr05c7.js";
import "./mdast-util-definitions-CC8aCBkB.js";
import "./prosemirror-safari-ime-span-YzsBDNLt.js";
import "./remark-gfm-DTNKoV41.js";
import "./micromark-extension-gfm-B7WFyr-E.js";
import "./micromark-extension-gfm-autolink-literal-yylzR1vU.js";
import "./micromark-extension-gfm-footnote-Cuj6I7Wa.js";
import "./micromark-extension-gfm-strikethrough-D8ZUn0WY.js";
import "./micromark-extension-gfm-table-OVGsOoOt.js";
import "./micromark-extension-gfm-task-list-item-DZD46Bbx.js";
import "./mdast-util-gfm-P8J2K8a9.js";
import "./mdast-util-gfm-autolink-literal-D0EtMgGM.js";
import "./ccount-zIlfN-Ki.js";
import "./devlop-BS6z0SoE.js";
import "./mdast-util-find-and-replace-GwHo1Dyf.js";
import "./escape-string-regexp-BYOcZivT.js";
import "./mdast-util-gfm-footnote-BEL_A1XM.js";
import "./mdast-util-gfm-strikethrough-CdiXKM9K.js";
import "./mdast-util-gfm-table-Co3UeP1P.js";
import "./markdown-table-CHoYPLol.js";
import "./mdast-util-gfm-task-list-item-DrEKshoV.js";
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
    if (link.integrity) fetchOpts.integrity = link.integrity;
    if (link.referrerPolicy) fetchOpts.referrerPolicy = link.referrerPolicy;
    if (link.crossOrigin === "use-credentials")
      fetchOpts.credentials = "include";
    else if (link.crossOrigin === "anonymous") fetchOpts.credentials = "omit";
    else fetchOpts.credentials = "same-origin";
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
  if (!res.ok) throw new Error(`/api/board → ${res.status}`);
  return await res.json();
}
async function fetchDoc(id) {
  const res = await fetch(`/api/documents/${encodeURIComponent(id)}`);
  if (!res.ok) throw new Error(`/api/documents/${id} → ${res.status}`);
  return await res.json();
}
async function putDoc(id, body, baseVersion, title) {
  const res = await fetch(`/api/documents/${encodeURIComponent(id)}`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ body, baseVersion, title })
  });
  if (res.ok) return { ok: true, doc: await res.json() };
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
  if (!res.ok) throw new Error(`/api/features/${featureId}/tasks → ${res.status}`);
  return await res.json();
}
async function createTaskApi(featureId, title) {
  const res = await fetch(`/api/features/${encodeURIComponent(featureId)}/tasks`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ title })
  });
  if (!res.ok) throw new Error(`create task → ${res.status}`);
  return await res.json();
}
async function patchTask(featureId, taskId, patch) {
  const res = await fetch(
    `/api/features/${encodeURIComponent(featureId)}/tasks/${encodeURIComponent(taskId)}`,
    {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(patch)
    }
  );
  if (!res.ok) throw new Error(`patch task → ${res.status}`);
  return await res.json();
}
async function fetchChatStatus() {
  const res = await fetch("/api/chat/status");
  if (!res.ok) throw new Error(`/api/chat/status → ${res.status}`);
  return await res.json();
}
function openChatSocket(docId, onEvent) {
  const proto = location.protocol === "https:" ? "wss:" : "ws:";
  const ws = new WebSocket(`${proto}//${location.host}/ws`);
  ws.addEventListener("message", (msg) => {
    try {
      const event = JSON.parse(msg.data);
      if ("docId" in event && event.docId !== docId) return;
      onEvent(event);
    } catch {
    }
  });
  return {
    send: (message, mode) => {
      if (ws.readyState === ws.OPEN) {
        ws.send(JSON.stringify({ type: "chat.send", docId, message, mode }));
      }
    },
    cancel: () => {
      if (ws.readyState === ws.OPEN) {
        ws.send(JSON.stringify({ type: "chat.cancel", docId }));
      }
    },
    close: () => ws.close()
  };
}
async function fetchGate(featureId, stage) {
  const res = await fetch(
    `/api/features/${encodeURIComponent(featureId)}/gate?stage=${stage}`
  );
  if (!res.ok) throw new Error(`gate check → ${res.status}`);
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
  { action: "codeBlock", title: "Code block", glyph: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "mono", children: "</>" }) }
];
function MarkdownToolbar({ onAction, disabled, active, chatOn, onToggleChat }) {
  const [headingOpen, setHeadingOpen] = reactExports.useState(false);
  const [overflowOpen, setOverflowOpen] = reactExports.useState(false);
  const [narrow, setNarrow] = reactExports.useState(false);
  const headingRef = reactExports.useRef(null);
  const overflowRef = reactExports.useRef(null);
  const barRef = reactExports.useRef(null);
  reactExports.useEffect(() => {
    const el = barRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) setNarrow(entry.contentRect.width < NARROW_PX);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  reactExports.useEffect(() => {
    if (!headingOpen && !overflowOpen) return;
    const onDown = (e) => {
      var _a, _b;
      const t = e.target;
      if (!((_a = headingRef.current) == null ? void 0 : _a.contains(t))) setHeadingOpen(false);
      if (!((_b = overflowRef.current) == null ? void 0 : _b.contains(t))) setOverflowOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [headingOpen, overflowOpen]);
  const isActive = (a) => (active == null ? void 0 : active.has(a)) ?? false;
  const btn = (action, title, label) => /* @__PURE__ */ jsxRuntimeExports.jsx(
    "button",
    {
      type: "button",
      className: `tb-btn${isActive(action) ? " tb-btn--active" : ""}`,
      title,
      "aria-label": title,
      "aria-pressed": isActive(action),
      disabled,
      onMouseDown: (e) => e.preventDefault(),
      onClick: () => onAction(action),
      children: label
    }
  );
  const pickHeading = (level) => {
    setHeadingOpen(false);
    onAction("heading", level);
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "md-toolbar", role: "toolbar", "aria-label": "Formatting", ref: barRef, children: [
    btn("bold", "Bold (⌘B)", /* @__PURE__ */ jsxRuntimeExports.jsx("b", { children: "B" })),
    btn("italic", "Italic (⌘I)", /* @__PURE__ */ jsxRuntimeExports.jsx("i", { children: "I" })),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "tb-pop-wrap", ref: headingRef, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "button",
        {
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
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "H" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "caret", children: "▾" })
          ]
        }
      ),
      headingOpen && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "tb-menu", role: "menu", "aria-label": "Heading level", children: [1, 2, 3].map((level) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "button",
        {
          type: "button",
          role: "menuitem",
          className: "tb-menu__item",
          onMouseDown: (e) => e.preventDefault(),
          onClick: () => pickHeading(level),
          children: [
            "Heading ",
            level
          ]
        },
        level
      )) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "tb-sep" }),
    narrow ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "tb-pop-wrap", ref: overflowRef, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
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
        }
      ),
      overflowOpen && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "tb-menu", role: "menu", "aria-label": "More formatting", children: SECONDARY.map(({ action, title, glyph }) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "button",
        {
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
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "tb-menu__glyph", children: glyph }),
            " ",
            title
          ]
        },
        action
      )) })
    ] }) : SECONDARY.map(({ action, title, glyph }) => /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: btn(action, title, glyph) }, action)),
    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "tb-spacer" }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "tb-toggle", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "input",
        {
          type: "checkbox",
          checked: chatOn,
          onChange: (e) => onToggleChat(e.target.checked)
        }
      ),
      "Chat"
    ] })
  ] });
}
function activeActions(state) {
  const active = /* @__PURE__ */ new Set();
  const { schema, selection } = state;
  const { $from, from, to, empty } = selection;
  const markOn = (name) => {
    const type = schema.marks[name];
    if (!type) return false;
    if (empty) return !!type.isInSet(state.storedMarks ?? $from.marks());
    return state.doc.rangeHasMark(from, to, type);
  };
  if (markOn("strong")) active.add("bold");
  if (markOn("emphasis")) active.add("italic");
  if (markOn("link")) active.add("link");
  for (let d = $from.depth; d > 0; d--) {
    const name = $from.node(d).type.name;
    if (name === "heading") active.add("heading");
    if (name === "bullet_list") active.add("bulletList");
    if (name === "code_block") active.add("codeBlock");
    if (name === "table") active.add("table");
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
function MarkdownEditor({ value, readOnly, onChange, showChat, onToggleChat }) {
  const hostRef = reactExports.useRef(null);
  const editorRef = reactExports.useRef(null);
  const onChangeRef = reactExports.useRef(onChange);
  onChangeRef.current = onChange;
  const readOnlyRef = reactExports.useRef(readOnly);
  readOnlyRef.current = readOnly;
  const settingExternal = reactExports.useRef(false);
  const lastMarkdown = reactExports.useRef(value);
  const [active, setActive] = reactExports.useState(/* @__PURE__ */ new Set());
  const setActiveRef = reactExports.useRef(setActive);
  setActiveRef.current = setActive;
  reactExports.useEffect(() => {
    if (!hostRef.current) return;
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
        // The ProseMirror editor root carries the reading-column + markdown
        // classes so editing and reading share one set of `.prose`/`.markdown`
        // rules (design Screen 1/5 — "editing == reading").
        attributes: { class: "prose markdown" }
      }));
      ctx.get(listenerCtx).markdownUpdated((_ctx, markdown) => {
        if (settingExternal.current) return;
        lastMarkdown.current = markdown;
        onChangeRef.current(markdown);
      });
    }).use(commonmark).use(gfm).use(listener).use(
      $prose(
        () => new Plugin({
          view: () => ({
            update: (view) => setActiveRef.current(activeActions(view.state))
          })
        })
      )
    ).create().then((made) => {
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
  reactExports.useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    if (value === lastMarkdown.current) return;
    editor.action((ctx) => {
      const serializer = ctx.get(serializerCtx);
      const view = ctx.get(editorViewCtx);
      if (serializer(view.state.doc) === value) return;
      settingExternal.current = true;
      try {
        replaceAll(value)(ctx);
        lastMarkdown.current = value;
      } finally {
        settingExternal.current = false;
      }
    });
  }, [value]);
  reactExports.useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    editor.action((ctx) => {
      const view = ctx.get(editorViewCtx);
      view.dispatch(view.state.tr);
    });
  }, [readOnly]);
  const onAction = (action, payload) => {
    const editor = editorRef.current;
    if (!editor || readOnly) return;
    if (action === "link" && payload === void 0) {
      const href = window.prompt("Link URL");
      if (href === null) return;
      runAction(editor, action, href);
      return;
    }
    runAction(editor, action, payload);
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "md-editor", children: [
    readOnly ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "ro-hint", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "dot" }),
      " Approved — read-only. Choose ",
      /* @__PURE__ */ jsxRuntimeExports.jsx("b", { children: "Edit" }),
      " to reopen as a draft and format.",
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "tb-spacer" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "tb-toggle", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "input",
          {
            type: "checkbox",
            checked: showChat,
            onChange: (e) => onToggleChat(e.target.checked)
          }
        ),
        "Chat"
      ] })
    ] }) : /* @__PURE__ */ jsxRuntimeExports.jsx(
      MarkdownToolbar,
      {
        onAction,
        disabled: readOnly,
        active,
        chatOn: showChat,
        onToggleChat
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { ref: hostRef, className: `md-surface${readOnly ? " md-surface--ro" : ""}` })
  ] });
}
let counter = 0;
const nextId = () => ++counter;
function ChatPanel({ docId, docStatus, onDocChanged }) {
  const [status, setStatus] = reactExports.useState(null);
  const [messages, setMessages] = reactExports.useState([]);
  const [input, setInput] = reactExports.useState("");
  const [inFlight, setInFlight] = reactExports.useState(false);
  const [mode, setMode] = reactExports.useState(void 0);
  const socketRef = reactExports.useRef(null);
  const scrollerRef = reactExports.useRef(null);
  reactExports.useEffect(() => {
    let alive = true;
    fetchChatStatus().then((s) => alive && setStatus(s)).catch(() => {
      if (alive) setStatus({ available: false, reason: "could not reach /api/chat/status" });
    });
    return () => {
      alive = false;
    };
  }, []);
  reactExports.useEffect(() => {
    if (!(status == null ? void 0 : status.available)) return;
    const sock = openChatSocket(docId, (event) => handleEvent(event));
    socketRef.current = sock;
    return () => {
      sock.close();
      socketRef.current = null;
    };
  }, [docId, status == null ? void 0 : status.available]);
  reactExports.useEffect(() => {
    const el = scrollerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);
  const appendAssistantDelta = (text) => {
    setMessages((prev) => {
      const last = prev[prev.length - 1];
      if (last && last.kind === "assistant" && last.streaming) {
        const updated = { ...last, text: last.text + text };
        return [...prev.slice(0, -1), updated];
      }
      return [...prev, { kind: "assistant", text, streaming: true, id: nextId() }];
    });
  };
  const finishAssistant = (final) => {
    setMessages((prev) => {
      const last = prev[prev.length - 1];
      if (last && last.kind === "assistant" && last.streaming) {
        const updated = {
          ...last,
          streaming: false,
          text: final && final.length > last.text.length ? final : last.text
        };
        return [...prev.slice(0, -1), updated];
      }
      if (final) return [...prev, { kind: "assistant", text: final, streaming: false, id: nextId() }];
      return prev;
    });
  };
  const handleEvent = (event) => {
    switch (event.type) {
      case "chat.started":
        setInFlight(true);
        break;
      case "chat.info":
        if (event.reason) {
          setMessages((prev) => [...prev, { kind: "info", text: event.reason, id: nextId() }]);
          if (event.reason.startsWith("mode: ")) {
            setMode(event.reason.slice(6));
          }
        }
        break;
      case "chat.delta":
        if (event.text) appendAssistantDelta(event.text);
        break;
      case "chat.tool": {
        const t = event.tool;
        if (!t) break;
        const label = t.name === "mcp__specmanager__write_document" ? `tool: write_document` : t.name === "mcp__specmanager__read_document" ? `tool: read_document` : `tool: ${t.name}`;
        setMessages((prev) => [...prev, { kind: "tool", text: label, id: nextId() }]);
        if (t.name === "mcp__specmanager__write_document") onDocChanged();
        break;
      }
      case "chat.done":
        finishAssistant(event.text);
        setInFlight(false);
        break;
      case "chat.error":
        finishAssistant();
        setMessages((prev) => [
          ...prev,
          { kind: "error", text: event.reason ?? "unknown error", id: nextId() }
        ]);
        setInFlight(false);
        break;
      case "chat.cancelled":
        finishAssistant();
        setInFlight(false);
        break;
    }
  };
  const send = () => {
    const text = input.trim();
    if (!text || inFlight || !socketRef.current || !(status == null ? void 0 : status.available)) return;
    setMessages((prev) => [...prev, { kind: "user", text, id: nextId() }]);
    setInput("");
    socketRef.current.send(text, mode);
  };
  const cancel = () => {
    var _a;
    (_a = socketRef.current) == null ? void 0 : _a.cancel();
  };
  if (!status) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "chat chat--loading", children: "Checking chat backend…" });
  }
  if (!status.available) {
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "chat chat--unavailable", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "Chat unavailable." }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { children: status.reason ?? "no API credential found" })
    ] });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "chat", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("header", { className: "chat__header", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "Chat" }),
      mode && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: `badge badge--meta`, children: mode }),
      docStatus === "approved" && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "badge badge--stale", title: "approved docs are read-only", children: "read-only" })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "chat__messages", ref: scrollerRef, children: [
      messages.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "chat__empty", children: docStatus === "approved" ? "Reopen the doc to chat about edits, or ask questions about its current state." : "Ask anything — the agent can read this doc, browse the repo, and persist edits via write_document." }),
      messages.map((m) => /* @__PURE__ */ jsxRuntimeExports.jsx(MessageView, { message: m }, m.id))
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "chat__composer", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "textarea",
        {
          rows: 2,
          placeholder: docStatus === "approved" ? "Read-only — reopen to edit." : "Message the agent…",
          value: input,
          onChange: (e) => setInput(e.target.value),
          onKeyDown: (e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }
        }
      ),
      inFlight ? /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "btn", onClick: cancel, children: "Cancel" }) : /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "btn btn--primary", onClick: send, disabled: !input.trim(), children: "Send" })
    ] })
  ] });
}
function MessageView({ message }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: `msg msg--${message.kind}`, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "msg__label", children: labelFor(message.kind) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "msg__body", children: message.text }),
    message.kind === "assistant" && message.streaming && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "msg__caret", "aria-hidden": true, children: "▋" })
  ] });
}
function labelFor(kind) {
  switch (kind) {
    case "user":
      return "You";
    case "assistant":
      return "Agent";
    case "info":
      return "info";
    case "tool":
      return "tool";
    case "error":
      return "error";
  }
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
  const [doc, setDoc] = reactExports.useState(null);
  const [body, setBody] = reactExports.useState("");
  const [error, setError] = reactExports.useState(null);
  const [save, setSave] = reactExports.useState({ kind: "idle" });
  const [showChat, setShowChat] = reactExports.useState(false);
  const [depVersions, setDepVersions] = reactExports.useState({});
  reactExports.useEffect(() => {
    let cancelled = false;
    setDoc(null);
    setError(null);
    setSave({ kind: "idle" });
    fetchDoc(docId).then((d) => {
      if (cancelled) return;
      setDoc(d);
      setBody(d.body);
    }).catch((e) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [docId]);
  reactExports.useEffect(() => {
    if (!doc || doc.dependsOn.length === 0) return;
    let cancelled = false;
    Promise.all(
      doc.dependsOn.map(
        (id) => fetchDoc(id).then(
          (d) => [id, d.version],
          () => [id, -1]
        )
      )
    ).then((pairs) => {
      if (cancelled) return;
      setDepVersions(Object.fromEntries(pairs));
    });
    return () => {
      cancelled = true;
    };
  }, [doc == null ? void 0 : doc.id, doc == null ? void 0 : doc.dependsOn.join(",")]);
  reactExports.useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  const dirty = reactExports.useMemo(() => doc !== null && body !== doc.body, [doc, body]);
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
    if (!doc || readOnly) return;
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
    if (!doc) return;
    try {
      const updated = await postDocStatus(doc.id, "approved");
      setDoc(updated);
      setBody(updated.body);
    } catch (e) {
      setSave({ kind: "error", message: e.message });
    }
  };
  const onReopen = async () => {
    if (!doc) return;
    try {
      const updated = await postDocStatus(doc.id, "draft");
      setDoc(updated);
      setBody(updated.body);
    } catch (e) {
      setSave({ kind: "error", message: e.message });
    }
  };
  const onShowGate = async () => {
    if (!doc) return;
    const gate = await fetchGate(doc.featureId, doc.stage);
    alert(gate.ok ? "Gate is open." : `Gate closed: ${gate.reason}`);
  };
  if (error) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "panel-backdrop", onClick: onClose, children: /* @__PURE__ */ jsxRuntimeExports.jsxs("aside", { className: "panel", onClick: (e) => e.stopPropagation(), children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("header", { className: "panel__header", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "panel__close", onClick: onClose, children: "×" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { children: "Could not load document" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "panel__error", children: error })
    ] }) });
  }
  if (!doc) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "panel-backdrop", onClick: onClose, children: /* @__PURE__ */ jsxRuntimeExports.jsx("aside", { className: "panel", onClick: (e) => e.stopPropagation(), children: /* @__PURE__ */ jsxRuntimeExports.jsx("p", { style: { padding: "2rem", color: "var(--text-dim)" }, children: "Loading…" }) }) });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "panel-backdrop", onClick: onClose, children: /* @__PURE__ */ jsxRuntimeExports.jsxs("aside", { className: "panel", onClick: (e) => e.stopPropagation(), children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("header", { className: "panel__header", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "panel__header-main", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("nav", { className: "panel__crumb", children: [
          featureTitle(doc.featureId),
          " ",
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "panel__crumb-sep", children: "›" }),
          " ",
          STAGE_LABEL$1[doc.stage]
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "panel__title-row", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "panel__title", children: doc.title }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "panel__meta", children: [
            STAGE_LABEL$1[doc.stage],
            " · ",
            /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "panel__version", children: [
              "v",
              doc.version
            ] })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "panel__badges", children: [
          isInterview ? /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "badge badge--interview", children: "interview" }) : /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: `badge badge--${doc.status}`, children: doc.status }),
          doc.stale && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "badge badge--stale", children: "⚠ stale" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "badge badge--meta", title: doc.id, children: doc.id }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "badge badge--meta", children: doc.generatedBy })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "panel__header-actions", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            className: "btn",
            disabled: !dirty || save.kind === "saving" || readOnly,
            onClick: onSave,
            children: save.kind === "saving" ? "Saving…" : dirty ? "Save" : "Saved"
          }
        ),
        !isInterview && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
          doc.status === "draft" ? /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              className: "btn btn--primary",
              disabled: dirty,
              title: dirty ? "save your changes first" : "",
              onClick: onApprove,
              children: "Approve"
            }
          ) : /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              className: "btn",
              onClick: onReopen,
              title: "Editing an approved doc reopens it as a draft",
              children: "Edit"
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "btn btn--ghost", onClick: onShowGate, children: "Gate?" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "panel__close", onClick: onClose, children: "×" })
      ] })
    ] }),
    doc.stale && doc.dependsOn.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "panel__stale", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "This doc is stale." }),
      " Dependencies have changed since it was based on them.",
      /* @__PURE__ */ jsxRuntimeExports.jsx("ul", { className: "stale-list", children: doc.dependsOn.map((depId) => {
        const based = doc.basedOn[depId];
        const current = depVersions[depId];
        const drift = current !== void 0 && current !== -1 && based !== void 0 && current !== based;
        return /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { className: drift ? "stale-list__item stale-list__item--drift" : "stale-list__item", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "link", onClick: () => onJumpTo(depId), children: depId }),
          based !== void 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
            " · based on v",
            based
          ] }),
          current !== void 0 && current !== -1 && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
            " · now v",
            current
          ] }),
          drift && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "drift-tag", children: " drift" })
        ] }, depId);
      }) })
    ] }),
    isDesign && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "panel__toolbar", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "panel__toolbar-spacer" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "panel__toggle", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "input",
          {
            type: "checkbox",
            checked: showChat,
            onChange: (e) => setShowChat(e.target.checked)
          }
        ),
        "Chat"
      ] })
    ] }),
    save.kind === "conflict" && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "banner banner--warn", children: [
      "File changed on disk (now v",
      save.serverVersion,
      "). Your edits weren't saved.",
      /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "link", onClick: reload, children: "Reload from disk" }),
      " to merge by hand."
    ] }),
    save.kind === "error" && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "banner banner--error", children: [
      save.message,
      /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "link", onClick: () => setSave({ kind: "idle" }), children: "dismiss" })
    ] }),
    save.kind === "saved" && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "banner banner--ok", children: [
      "Saved · now v",
      doc.version
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "div",
      {
        className: `panel__body panel__body--cols-${1 + (showChat ? 1 : 0)}`,
        children: [
          isDesign ? /* @__PURE__ */ jsxRuntimeExports.jsx(
            "iframe",
            {
              className: "panel__preview panel__preview--iframe",
              title: "design brief preview",
              sandbox: "allow-same-origin",
              srcDoc: PREVIEW_STYLE + body
            }
          ) : /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "panel__editor", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            MarkdownEditor,
            {
              value: body,
              readOnly: !!readOnly,
              onChange: setBody,
              showChat,
              onToggleChat: setShowChat
            },
            doc.id
          ) }),
          showChat && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "panel__chat", children: /* @__PURE__ */ jsxRuntimeExports.jsx(ChatPanel, { docId: doc.id, docStatus: doc.status, onDocChanged: reload }) })
        ]
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx("footer", { className: "panel__footer", children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: doc.filePath }) })
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
  const [tasks, setTasks] = reactExports.useState(null);
  const [error, setError] = reactExports.useState(null);
  const [newTitle, setNewTitle] = reactExports.useState("");
  const [busy, setBusy] = reactExports.useState(null);
  const reload = () => {
    fetchTasks(featureId).then((t) => {
      setTasks(t);
      setError(null);
    }).catch((e) => setError(e.message));
  };
  reactExports.useEffect(() => {
    reload();
    let pending = 0;
    const close = openWebSocket((event) => {
      if (event.type === "task.updated" && event.featureId === featureId) {
        window.clearTimeout(pending);
        pending = window.setTimeout(reload, 80);
      }
    });
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(pending);
      close();
      window.removeEventListener("keydown", onKey);
    };
  }, [featureId]);
  const counts = reactExports.useMemo(() => {
    const c = { todo: 0, in_progress: 0, done: 0, blocked: 0 };
    for (const t of tasks ?? []) c[t.status]++;
    return c;
  }, [tasks]);
  const total = (tasks ?? []).length;
  const donePct = total === 0 ? 0 : Math.round(counts.done / total * 100);
  const progPct = total === 0 ? 0 : Math.round(counts.in_progress / total * 100);
  const phaseGroups = reactExports.useMemo(() => {
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
      for (const t of items) c[t.status]++;
      return { name, tasks: items, counts: c, total: items.length };
    });
  }, [tasks]);
  const multiPhase = phaseGroups.length > 1 || ((_a = phaseGroups[0]) == null ? void 0 : _a.name) && phaseGroups[0].name !== DEFAULT_PHASE$1;
  const [collapsed, setCollapsed] = reactExports.useState({});
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
    if (!trimmed) return;
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
    if (!newTitle.trim()) return;
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
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "panel-backdrop", onClick: onClose, children: /* @__PURE__ */ jsxRuntimeExports.jsxs("aside", { className: "panel", onClick: (e) => e.stopPropagation(), children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("header", { className: "panel__header", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "panel__close", onClick: onClose, children: "×" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "panel__title-row", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("h2", { className: "panel__title", children: [
          featureTitle2,
          " · Build"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "panel__meta", children: [
          counts.done,
          "/",
          total,
          " done",
          counts.in_progress > 0 && ` · ${counts.in_progress} in progress`,
          counts.blocked > 0 && ` · 🚫 ${counts.blocked} blocked`
        ] })
      ] }),
      total > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bar", style: { marginTop: "0.6rem" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "bar__seg bar__seg--done", style: { width: `${donePct}%` } }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "bar__seg bar__seg--prog", style: { width: `${progPct}%` } })
      ] })
    ] }),
    error && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "banner banner--error", children: [
      error,
      /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "link", onClick: () => setError(null), children: "dismiss" })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "panel__tasks", children: tasks === null ? /* @__PURE__ */ jsxRuntimeExports.jsx("p", { style: { padding: "2rem", color: "var(--text-dim)" }, children: "Loading…" }) : tasks.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { style: { padding: "1.5rem", color: "var(--text-dim)" }, children: [
      "No tasks yet. The planner subagent (Phase 4) emits these from ",
      /* @__PURE__ */ jsxRuntimeExports.jsx("code", { children: "/specmanager-plan" }),
      ". You can also add ad-hoc tasks below."
    ] }) : multiPhase ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "phase-groups", children: phaseGroups.map((g) => {
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
      return /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "section",
        {
          className: `phase-group${allDone ? " phase-group--done" : ""}${hasBlocked ? " phase-group--blocked" : ""}`,
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("header", { className: "phase-group__head", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs(
                "button",
                {
                  type: "button",
                  className: "phase-group__toggle",
                  onClick: () => toggle(g.name),
                  "aria-expanded": !isCollapsed,
                  children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "phase-group__caret", children: isCollapsed ? "▸" : "▾" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "phase-group__name", children: [
                      "Phase ",
                      g.name
                    ] }),
                    /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "phase-group__count", children: [
                      g.counts.done,
                      "/",
                      g.total,
                      " done",
                      g.counts.in_progress > 0 && ` · ${g.counts.in_progress} in progress`,
                      g.counts.blocked > 0 && ` · 🚫 ${g.counts.blocked} blocked`
                    ] })
                  ]
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "button",
                {
                  type: "button",
                  className: "phase-group__cmd",
                  title: "copy /specmanager-build slash command",
                  onClick: copySlash,
                  children: slash
                }
              )
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bar phase-group__bar", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "bar__seg bar__seg--done", style: { width: `${phaseDonePct}%` } }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "bar__seg bar__seg--prog", style: { width: `${phaseProgPct}%` } })
            ] }),
            !isCollapsed && /* @__PURE__ */ jsxRuntimeExports.jsx("ul", { className: "task-list task-list--in-phase", children: g.tasks.map((t) => /* @__PURE__ */ jsxRuntimeExports.jsx(
              TaskRow,
              {
                task: t,
                busy: busy === t.id,
                onStatus: (s) => setStatus(t, s),
                onAddArtifact: (kind, v) => addArtifact(t, kind, v),
                onRemoveArtifact: (kind, v) => removeArtifact(t, kind, v),
                onSetPr: (v) => setPr(t, v)
              },
              t.id
            )) })
          ]
        },
        g.name
      );
    }) }) : /* @__PURE__ */ jsxRuntimeExports.jsx("ul", { className: "task-list", children: tasks.map((t) => /* @__PURE__ */ jsxRuntimeExports.jsx(
      TaskRow,
      {
        task: t,
        busy: busy === t.id,
        onStatus: (s) => setStatus(t, s),
        onAddArtifact: (kind, v) => addArtifact(t, kind, v),
        onRemoveArtifact: (kind, v) => removeArtifact(t, kind, v),
        onSetPr: (v) => setPr(t, v)
      },
      t.id
    )) }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("footer", { className: "panel__footer panel__footer--actions", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "input",
        {
          type: "text",
          placeholder: "New task title…",
          value: newTitle,
          onChange: (e) => setNewTitle(e.target.value),
          onKeyDown: (e) => {
            if (e.key === "Enter") void createTask();
          },
          className: "input"
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          className: "btn btn--primary",
          disabled: !newTitle.trim() || busy === "__new",
          onClick: createTask,
          children: "Add task"
        }
      )
    ] })
  ] }) });
}
function TaskRow({
  task,
  busy,
  onStatus,
  onAddArtifact,
  onRemoveArtifact,
  onSetPr
}) {
  const [showArtifacts, setShowArtifacts] = reactExports.useState(
    task.artifacts.commits.length + task.artifacts.files.length > 0 || task.artifacts.pr !== null
  );
  const [commitInput, setCommitInput] = reactExports.useState("");
  const [fileInput, setFileInput] = reactExports.useState("");
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { className: `task task--${task.status}${busy ? " task--busy" : ""}`, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "task__head", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "task__id", children: task.id }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "task__title", children: task.title }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "task__status", children: STATUS_ORDER.map((s) => /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          type: "button",
          className: `status-pill${task.status === s ? " status-pill--on" : ""} status-pill--${s}`,
          disabled: busy,
          onClick: () => onStatus(s),
          children: STATUS_LABEL[s]
        },
        s
      )) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "button",
      {
        type: "button",
        className: "task__toggle",
        onClick: () => setShowArtifacts((v) => !v),
        children: [
          showArtifacts ? "▾" : "▸",
          " artifacts",
          (task.artifacts.commits.length > 0 || task.artifacts.files.length > 0 || task.artifacts.pr) && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "task__artifact-count", children: [
            " ",
            "(",
            task.artifacts.commits.length + task.artifacts.files.length + (task.artifacts.pr ? 1 : 0),
            ")"
          ] })
        ]
      }
    ),
    showArtifacts && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "task__artifacts", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "task__artifact-group", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("label", { children: "Commits" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("ul", { children: task.artifacts.commits.map((c) => /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("code", { children: c }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "link link--small", onClick: () => onRemoveArtifact("commits", c), children: "×" })
        ] }, c)) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "input",
          {
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
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "task__artifact-group", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("label", { children: "Files" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("ul", { children: task.artifacts.files.map((f) => /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("code", { children: f }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "link link--small", onClick: () => onRemoveArtifact("files", f), children: "×" })
        ] }, f)) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "input",
          {
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
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "task__artifact-group", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("label", { children: "PR" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "input",
          {
            className: "input input--small",
            placeholder: "https://github.com/.../pull/123",
            defaultValue: task.artifacts.pr ?? "",
            onBlur: (e) => {
              const v = e.currentTarget.value;
              if ((task.artifacts.pr ?? "") !== v) onSetPr(v);
            }
          }
        )
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
  if (stage === "prd") return true;
  if (stage === "design") return ((_a = findDoc(row, "prd")) == null ? void 0 : _a.status) === "approved";
  if (stage === "architecture") return ((_b = findDoc(row, "prd")) == null ? void 0 : _b.status) === "approved";
  if (stage === "plan") {
    if (((_c = findDoc(row, "architecture")) == null ? void 0 : _c.status) !== "approved") return false;
    const design = findDoc(row, "design");
    if (design && design.status !== "approved") return false;
    return true;
  }
  return true;
}
function DocCellView({ doc, onOpen }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "button",
    {
      type: "button",
      className: `card card--button${doc.stale ? " card--stale" : ""}`,
      onClick: () => onOpen(doc.id),
      title: doc.id,
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "card__title", children: doc.title }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "card__badges", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: `badge badge--${doc.status}`, children: doc.status }),
          doc.stale && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "badge badge--stale", children: "⚠ stale" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "badge badge--meta", children: [
            "v",
            doc.version
          ] })
        ] })
      ]
    }
  );
}
function LockedCell({ stage }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "card card--locked", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "card__locked-label", children: [
      STAGE_LABEL[stage],
      " locked"
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "card__locked-sub", children: "prior stage not approved" })
  ] });
}
function EmptyCell({ stage, ready }) {
  const slash = `/specmanager-${stage}`;
  const onCopy = (e) => {
    var _a;
    e.stopPropagation();
    void ((_a = navigator.clipboard) == null ? void 0 : _a.writeText(slash));
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: `card card--empty${ready ? " card--ready" : ""}`, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "card__empty-label", children: ready ? "Generate" : STAGE_LABEL[stage] }),
    ready ? /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", className: "card__empty-cmd", onClick: onCopy, title: "copy to clipboard", children: slash }) : /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "card__empty-sub", children: "—" })
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
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "card card--empty card--optional", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "card__empty-label", children: "Design" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "card__empty-sub", children: "optional · PRD not approved" })
    ] });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "card card--empty card--optional card--optional-ready", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "card__empty-label", children: "Design" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "card__optional-tag", children: "optional" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", className: "card__empty-cmd", onClick: onCopy, title: "copy to clipboard", children: slash })
  ] });
}
function BuildCell({
  tasks,
  row,
  onOpen
}) {
  var _a, _b, _c, _d, _e;
  if (tasks.total === 0) {
    const planApproved = ((_a = findDoc(row, "plan")) == null ? void 0 : _a.status) === "approved";
    return /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "button",
      {
        type: "button",
        className: `card card--empty${planApproved ? " card--ready" : ""}`,
        onClick: () => onOpen(row.id, row.title),
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "card__empty-label", children: "Build" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "card__empty-sub", children: planApproved ? "no tasks yet · click to add" : "plan not approved" })
        ]
      }
    );
  }
  const donePct = Math.round(tasks.done / Math.max(1, tasks.total) * 100);
  const inProgressPct = Math.round(tasks.in_progress / Math.max(1, tasks.total) * 100);
  const nextPhase = (_b = row.phases) == null ? void 0 : _b.find(
    (p) => p.status !== "done" && p.status !== "empty"
  );
  const slash = nextPhase ? `/specmanager-build ${row.id} next` : null;
  const onCopy = (e) => {
    var _a2;
    e.stopPropagation();
    if (slash) void ((_a2 = navigator.clipboard) == null ? void 0 : _a2.writeText(slash));
  };
  const multiPhase = (((_c = row.phases) == null ? void 0 : _c.length) ?? 0) > 1 || ((_e = (_d = row.phases) == null ? void 0 : _d[0]) == null ? void 0 : _e.name) && row.phases[0].name !== DEFAULT_PHASE;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "button",
    {
      type: "button",
      className: "card card--build card--button",
      onClick: () => onOpen(row.id, row.title),
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "card__title", children: "Build" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bar", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "bar__seg bar__seg--done", style: { width: `${donePct}%` } }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "bar__seg bar__seg--prog", style: { width: `${inProgressPct}%` } })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "card__build-counts", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
            tasks.done,
            "/",
            tasks.total,
            " done"
          ] }),
          multiPhase && row.phases && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
            "· phases ",
            row.phases.filter((p) => p.status === "done").length,
            "/",
            row.phases.length
          ] }),
          tasks.in_progress > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
            "· ",
            tasks.in_progress,
            " in progress"
          ] }),
          tasks.blocked > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "card__build-blocked", children: [
            "· 🚫 ",
            tasks.blocked,
            " blocked"
          ] })
        ] }),
        slash && /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "span",
          {
            className: "card__build-exec",
            onClick: onCopy,
            title: "copy /specmanager-build next slash command",
            children: [
              "▶ ",
              slash
            ]
          }
        )
      ]
    }
  );
}
function PhaseWalkthroughCard({
  phase,
  row,
  onOpen
}) {
  const doc = phase.walkthroughId ? row.documents.find((d) => d.id === phase.walkthroughId) : void 0;
  if (doc) {
    return /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "button",
      {
        type: "button",
        className: `card card--button card--sub${doc.stale ? " card--stale" : ""}`,
        onClick: () => onOpen(doc.id),
        title: doc.id,
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "card__sub-label", children: [
            "Phase ",
            phase.name
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "card__badges", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: `badge badge--${doc.status}`, children: doc.status }),
            doc.stale && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "badge badge--stale", children: "⚠ stale" })
          ] })
        ]
      }
    );
  }
  const ready = phase.status === "done";
  const slash = `/specmanager-walkthrough ${row.id} ${phase.name}`;
  const onCopy = (e) => {
    var _a;
    e.stopPropagation();
    void ((_a = navigator.clipboard) == null ? void 0 : _a.writeText(slash));
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: `card card--sub card--empty${ready ? " card--ready" : " card--locked"}`, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "card__sub-label", children: [
      "Phase ",
      phase.name
    ] }),
    ready ? /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", className: "card__empty-cmd", onClick: onCopy, title: "copy to clipboard", children: slash }) : /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "card__locked-sub", children: [
      phase.doneCount,
      "/",
      phase.taskCount,
      " tasks done"
    ] })
  ] });
}
function FinalWalkthroughCard({
  row,
  onOpen
}) {
  const phases = row.phases ?? [];
  const finalDoc = row.documents.find(
    (d) => d.stage === "walkthrough" && d.phase === FINAL_PHASE
  );
  if (finalDoc) {
    return /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "button",
      {
        type: "button",
        className: `card card--button card--sub card--final${finalDoc.stale ? " card--stale" : ""}`,
        onClick: () => onOpen(finalDoc.id),
        title: finalDoc.id,
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "card__sub-label", children: "★ Feature roll-up" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "card__badges", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: `badge badge--${finalDoc.status}`, children: finalDoc.status }),
            finalDoc.stale && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "badge badge--stale", children: "⚠ stale" })
          ] })
        ]
      }
    );
  }
  const missing = phases.filter((p) => p.walkthroughStatus !== "approved").map((p) => p.name);
  const ready = phases.length > 0 && missing.length === 0;
  const slash = `/specmanager-walkthrough ${row.id} final`;
  const onCopy = (e) => {
    var _a;
    e.stopPropagation();
    if (ready) void ((_a = navigator.clipboard) == null ? void 0 : _a.writeText(slash));
  };
  const tooltip = ready ? "all phase walkthroughs approved — ready to draft" : missing.length > 0 ? `awaiting approval: ${missing.map((m) => `phase ${m}`).join(", ")}` : "no phases yet";
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "div",
    {
      className: `card card--sub card--final card--empty${ready ? " card--ready" : " card--locked"}`,
      title: tooltip,
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "card__sub-label", children: "★ Feature roll-up" }),
        ready ? /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", className: "card__empty-cmd", onClick: onCopy, title: "copy to clipboard", children: slash }) : /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "card__locked-sub", children: missing.length > 0 ? `${missing.length} phase(s) pending` : "no phases yet" })
      ]
    }
  );
}
function WalkthroughCell({
  row,
  onOpenDoc
}) {
  const phases = row.phases ?? [];
  if (phases.length === 0) {
    if (!priorStageApproved(row, "walkthrough")) return /* @__PURE__ */ jsxRuntimeExports.jsx(LockedCell, { stage: "walkthrough" });
    return /* @__PURE__ */ jsxRuntimeExports.jsx(EmptyCell, { stage: "walkthrough", ready: false });
  }
  const showFinal = phases.length > 1;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "card card--walkthroughs", children: [
    phases.map((p) => /* @__PURE__ */ jsxRuntimeExports.jsx(PhaseWalkthroughCard, { phase: p, row, onOpen: onOpenDoc }, p.name)),
    showFinal && /* @__PURE__ */ jsxRuntimeExports.jsx(FinalWalkthroughCard, { row, onOpen: onOpenDoc })
  ] });
}
function Cell({
  row,
  column,
  onOpenDoc,
  onOpenBuild
}) {
  var _a;
  if (column === "build") return /* @__PURE__ */ jsxRuntimeExports.jsx(BuildCell, { tasks: row.tasks, row, onOpen: onOpenBuild });
  if (column === "walkthrough") return /* @__PURE__ */ jsxRuntimeExports.jsx(WalkthroughCell, { row, onOpenDoc });
  const stage = column;
  const doc = findDoc(row, stage);
  if (stage === "prd") {
    const interview = findInterview(row);
    if (interview) {
      return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "cell-stack", children: [
        doc ? /* @__PURE__ */ jsxRuntimeExports.jsx(DocCellView, { doc, onOpen: onOpenDoc }) : /* @__PURE__ */ jsxRuntimeExports.jsx(EmptyCell, { stage: "prd", ready: true }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "button",
          {
            type: "button",
            className: "chip-interview",
            onClick: () => onOpenDoc(interview.id),
            title: interview.id,
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "ring" }),
              "Interview ",
              /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "meta", children: [
                "· v",
                interview.version
              ] })
            ]
          }
        )
      ] });
    }
  }
  if (doc) return /* @__PURE__ */ jsxRuntimeExports.jsx(DocCellView, { doc, onOpen: onOpenDoc });
  if (stage === "design") {
    return /* @__PURE__ */ jsxRuntimeExports.jsx(OptionalDesignCell, { ready: ((_a = findDoc(row, "prd")) == null ? void 0 : _a.status) === "approved" });
  }
  if (!priorStageApproved(row, stage)) return /* @__PURE__ */ jsxRuntimeExports.jsx(LockedCell, { stage });
  return /* @__PURE__ */ jsxRuntimeExports.jsx(EmptyCell, { stage, ready: true });
}
function App() {
  const [board, setBoard] = reactExports.useState(null);
  const [error, setError] = reactExports.useState(null);
  const [lastEvent, setLastEvent] = reactExports.useState(null);
  const [openDocId, setOpenDocId] = reactExports.useState(null);
  const [openBuild, setOpenBuild] = reactExports.useState(null);
  const openDoc = reactExports.useCallback((id) => setOpenDocId(id), []);
  const closeDoc = reactExports.useCallback(() => setOpenDocId(null), []);
  const openBuildFor = reactExports.useCallback((featureId, title) => {
    setOpenBuild({ featureId, title });
  }, []);
  const closeBuild = reactExports.useCallback(() => setOpenBuild(null), []);
  const reload = () => {
    fetchBoard().then((b) => {
      setBoard(b);
      setError(null);
    }).catch((err) => setError(err.message));
  };
  reactExports.useEffect(() => {
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
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("main", { className: "state state--error", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { children: "SpecManager" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { children: [
        "Could not reach the board API: ",
        error
      ] })
    ] });
  }
  if (!board) return /* @__PURE__ */ jsxRuntimeExports.jsx("main", { className: "state", children: "Loading…" });
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("main", { className: "board", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("header", { className: "board__header", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "board__title", children: "SpecManager" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "board__meta", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "board__count", children: [
          board.features.length,
          " feature",
          board.features.length === 1 ? "" : "s"
        ] }),
        lastEvent && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "board__pulse", children: [
          "· ",
          lastEvent
        ] })
      ] })
    ] }),
    board.features.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "empty", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { children: "No features yet." }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("pre", { children: "/specmanager-prd <title>" })
    ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "section",
      {
        className: "grid",
        style: {
          "--grid-cols": `12rem repeat(4, minmax(11rem, 1fr)) 14rem minmax(11rem, 1fr)`
        },
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid__corner", children: "Feature" }),
          STAGES.map((c) => /* @__PURE__ */ jsxRuntimeExports.jsxs(reactExports.Fragment, { children: [
            c === "walkthrough" && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid__header grid__header--build", children: "Build" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid__header", children: STAGE_LABEL[c] })
          ] }, c)),
          board.features.map((row) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "row", style: { display: "contents" }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "row__label", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: row.title }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("small", { children: row.slug })
            ] }),
            STAGES.map((c) => /* @__PURE__ */ jsxRuntimeExports.jsxs(reactExports.Fragment, { children: [
              c === "walkthrough" && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "row__cell row__cell--build", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Cell, { row, column: "build", onOpenDoc: openDoc, onOpenBuild: openBuildFor }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "row__cell", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Cell, { row, column: c, onOpenDoc: openDoc, onOpenBuild: openBuildFor }) })
            ] }, c))
          ] }, row.id))
        ]
      }
    ),
    openDocId && /* @__PURE__ */ jsxRuntimeExports.jsx(DocPanel, { docId: openDocId, onClose: closeDoc, onJumpTo: openDoc }),
    openBuild && /* @__PURE__ */ jsxRuntimeExports.jsx(
      BuildPanel,
      {
        featureId: openBuild.featureId,
        featureTitle: openBuild.title,
        onClose: closeBuild
      }
    )
  ] });
}
const root = document.getElementById("root");
if (!root) throw new Error("missing #root");
createRoot(root).render(
  /* @__PURE__ */ jsxRuntimeExports.jsx(React.StrictMode, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(App, {}) })
);
