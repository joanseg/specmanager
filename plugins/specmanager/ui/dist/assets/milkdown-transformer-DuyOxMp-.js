var __typeError = (msg) => {
  throw TypeError(msg);
};
var __accessCheck = (obj, member, msg) => member.has(obj) || __typeError("Cannot " + msg);
var __privateGet = (obj, member, getter) => (__accessCheck(obj, member, "read from private field"), getter ? getter.call(obj) : member.get(obj));
var __privateAdd = (obj, member, value) => member.has(obj) ? __typeError("Cannot add the same private member more than once") : member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
var __privateSet = (obj, member, value, setter) => (__accessCheck(obj, member, "write to private field"), setter ? setter.call(obj, value) : member.set(obj, value), value);
var _marks, _hasText, _maybeMerge, _matchTarget, _runNode, _closeNodeAndPush, _addNodeAndPush, _a, _b, _marks2, _matchTarget2, _runProseNode, _runProseMark, _runNode2, _searchType, _maybeMergeChildren, _createMarkdownNode, _moveSpaces, _closeNodeAndPush2, _addNodeAndPush2, _openMark, _closeMark, _c;
import { p as parserMatchError, b as createNodeInParserFail, h as stackOverFlow, s as serializerMatchError } from "./milkdown-exception-CsDPrAT2.js";
import { M as Mark } from "./prosemirror-model-B_MoZYx6.js";
var StackElement = class {
};
var Stack = class {
  constructor() {
    this.elements = [];
    this.size = () => {
      return this.elements.length;
    };
    this.top = () => {
      return this.elements.at(-1);
    };
    this.push = (node) => {
      var _a2;
      (_a2 = this.top()) == null ? void 0 : _a2.push(node);
    };
    this.open = (node) => {
      this.elements.push(node);
    };
    this.close = () => {
      const el = this.elements.pop();
      if (!el) throw stackOverFlow();
      return el;
    };
  }
};
var ParserStackElement = class ParserStackElement2 extends StackElement {
  constructor(type, content, attrs) {
    super();
    this.type = type;
    this.content = content;
    this.attrs = attrs;
  }
  push(node, ...rest) {
    this.content.push(node, ...rest);
  }
  pop() {
    return this.content.pop();
  }
  static create(type, content, attrs) {
    return new ParserStackElement2(type, content, attrs);
  }
};
var ParserState = (_a = class extends Stack {
  constructor(schema) {
    super();
    __privateAdd(this, _marks);
    __privateAdd(this, _hasText);
    __privateAdd(this, _maybeMerge);
    __privateAdd(this, _matchTarget);
    __privateAdd(this, _runNode);
    __privateAdd(this, _closeNodeAndPush);
    __privateAdd(this, _addNodeAndPush);
    __privateSet(this, _marks, Mark.none);
    __privateSet(this, _hasText, (node) => node.isText);
    __privateSet(this, _maybeMerge, (a, b) => {
      if (__privateGet(this, _hasText).call(this, a) && __privateGet(this, _hasText).call(this, b) && Mark.sameSet(a.marks, b.marks)) return this.schema.text(a.text + b.text, a.marks);
    });
    __privateSet(this, _matchTarget, (node) => {
      const result = Object.values({
        ...this.schema.nodes,
        ...this.schema.marks
      }).find((x) => {
        return x.spec.parseMarkdown.match(node);
      });
      if (!result) throw parserMatchError(node);
      return result;
    });
    __privateSet(this, _runNode, (node) => {
      const type = __privateGet(this, _matchTarget).call(this, node);
      type.spec.parseMarkdown.runner(this, node, type);
    });
    this.injectRoot = (node, nodeType, attrs) => {
      this.openNode(nodeType, attrs);
      this.next(node.children);
      return this;
    };
    this.openNode = (nodeType, attrs) => {
      this.open(ParserStackElement.create(nodeType, [], attrs));
      return this;
    };
    __privateSet(this, _closeNodeAndPush, () => {
      __privateSet(this, _marks, Mark.none);
      const element = this.close();
      return __privateGet(this, _addNodeAndPush).call(this, element.type, element.attrs, element.content);
    });
    this.closeNode = () => {
      try {
        __privateGet(this, _closeNodeAndPush).call(this);
      } catch (e) {
        console.error(e);
      }
      return this;
    };
    __privateSet(this, _addNodeAndPush, (nodeType, attrs, content) => {
      const node = nodeType.createAndFill(attrs, content, __privateGet(this, _marks));
      if (!node) throw createNodeInParserFail(nodeType, attrs, content);
      this.push(node);
      return node;
    });
    this.addNode = (nodeType, attrs, content) => {
      try {
        __privateGet(this, _addNodeAndPush).call(this, nodeType, attrs, content);
      } catch (e) {
        console.error(e);
      }
      return this;
    };
    this.openMark = (markType, attrs) => {
      const mark = markType.create(attrs);
      __privateSet(this, _marks, mark.addToSet(__privateGet(this, _marks)));
      return this;
    };
    this.closeMark = (markType) => {
      __privateSet(this, _marks, markType.removeFromSet(__privateGet(this, _marks)));
      return this;
    };
    this.addText = (text) => {
      try {
        const topElement = this.top();
        if (!topElement) throw stackOverFlow();
        const prevNode = topElement.pop();
        const currNode = this.schema.text(text, __privateGet(this, _marks));
        if (!prevNode) {
          topElement.push(currNode);
          return this;
        }
        const merged = __privateGet(this, _maybeMerge).call(this, prevNode, currNode);
        if (merged) {
          topElement.push(merged);
          return this;
        }
        topElement.push(prevNode, currNode);
        return this;
      } catch (e) {
        console.error(e);
        return this;
      }
    };
    this.build = () => {
      let doc;
      do
        doc = __privateGet(this, _closeNodeAndPush).call(this);
      while (this.size());
      return doc;
    };
    this.next = (nodes = []) => {
      [nodes].flat().forEach((node) => __privateGet(this, _runNode).call(this, node));
      return this;
    };
    this.toDoc = () => this.build();
    this.run = (remark, markdown) => {
      const tree = remark.runSync(remark.parse(markdown), markdown);
      this.next(tree);
      return this;
    };
    this.schema = schema;
  }
}, _marks = new WeakMap(), _hasText = new WeakMap(), _maybeMerge = new WeakMap(), _matchTarget = new WeakMap(), _runNode = new WeakMap(), _closeNodeAndPush = new WeakMap(), _addNodeAndPush = new WeakMap(), _a.create = (schema, remark) => {
  const state = new _a(schema);
  return (text) => {
    state.run(remark, text);
    return state.toDoc();
  };
}, _a);
var SerializerStackElement = (_b = class extends StackElement {
  constructor(type, children, value, props = {}) {
    super();
    this.type = type;
    this.children = children;
    this.value = value;
    this.props = props;
    this.push = (node, ...rest) => {
      if (!this.children) this.children = [];
      this.children.push(node, ...rest);
    };
    this.pop = () => {
      var _a2;
      return (_a2 = this.children) == null ? void 0 : _a2.pop();
    };
  }
}, _b.create = (type, children, value, props = {}) => new _b(type, children, value, props), _b);
var isFragment = (x) => Object.prototype.hasOwnProperty.call(x, "size");
var SerializerState = (_c = class extends Stack {
  constructor(schema) {
    super();
    __privateAdd(this, _marks2);
    __privateAdd(this, _matchTarget2);
    __privateAdd(this, _runProseNode);
    __privateAdd(this, _runProseMark);
    __privateAdd(this, _runNode2);
    __privateAdd(this, _searchType);
    __privateAdd(this, _maybeMergeChildren);
    __privateAdd(this, _createMarkdownNode);
    __privateAdd(this, _moveSpaces);
    __privateAdd(this, _closeNodeAndPush2);
    __privateAdd(this, _addNodeAndPush2);
    __privateAdd(this, _openMark);
    __privateAdd(this, _closeMark);
    __privateSet(this, _marks2, Mark.none);
    __privateSet(this, _matchTarget2, (node) => {
      const result = Object.values({
        ...this.schema.nodes,
        ...this.schema.marks
      }).find((x) => {
        return x.spec.toMarkdown.match(node);
      });
      if (!result) throw serializerMatchError(node.type);
      return result;
    });
    __privateSet(this, _runProseNode, (node) => {
      return __privateGet(this, _matchTarget2).call(this, node).spec.toMarkdown.runner(this, node);
    });
    __privateSet(this, _runProseMark, (mark, node) => {
      return __privateGet(this, _matchTarget2).call(this, mark).spec.toMarkdown.runner(this, mark, node);
    });
    __privateSet(this, _runNode2, (node) => {
      const { marks } = node;
      const getPriority = (x) => x.type.spec.priority ?? 50;
      if ([...marks].sort((a, b) => getPriority(a) - getPriority(b)).every((mark) => !__privateGet(this, _runProseMark).call(this, mark, node))) __privateGet(this, _runProseNode).call(this, node);
      marks.forEach((mark) => __privateGet(this, _closeMark).call(this, mark));
    });
    __privateSet(this, _searchType, (child, type) => {
      var _a2;
      if (child.type === type) return child;
      if (((_a2 = child.children) == null ? void 0 : _a2.length) !== 1) return child;
      const searchNode = (node2) => {
        var _a3;
        if (node2.type === type) return node2.value != null ? null : node2;
        if (((_a3 = node2.children) == null ? void 0 : _a3.length) !== 1) return null;
        const [firstChild] = node2.children;
        if (!firstChild) return null;
        return searchNode(firstChild);
      };
      const target = searchNode(child);
      if (!target) return child;
      const tmp = target.children ? [...target.children] : void 0;
      const node = {
        ...child,
        children: tmp
      };
      node.children = tmp;
      target.children = [node];
      return target;
    });
    __privateSet(this, _maybeMergeChildren, (node) => {
      const { children } = node;
      if (!children) return node;
      node.children = children.reduce((nextChildren, child, index) => {
        if (index === 0) return [child];
        const last = nextChildren.at(-1);
        if (last && last.isMark && child.isMark) {
          child = __privateGet(this, _searchType).call(this, child, last.type);
          const { children: currChildren, ...currRest } = child;
          const { children: prevChildren, ...prevRest } = last;
          if (child.type === last.type && currChildren && prevChildren && JSON.stringify(currRest) === JSON.stringify(prevRest)) {
            const next = {
              ...prevRest,
              children: [...prevChildren, ...currChildren]
            };
            return nextChildren.slice(0, -1).concat(__privateGet(this, _maybeMergeChildren).call(this, next));
          }
        }
        return nextChildren.concat(child);
      }, []);
      return node;
    });
    __privateSet(this, _createMarkdownNode, (element) => {
      const node = {
        ...element.props,
        type: element.type
      };
      if (element.children) node.children = element.children;
      if (element.value) node.value = element.value;
      return node;
    });
    this.openNode = (type, value, props) => {
      this.open(SerializerStackElement.create(type, void 0, value, props));
      return this;
    };
    __privateSet(this, _moveSpaces, (element, onPush) => {
      let startSpaces = "";
      let endSpaces = "";
      const children = element.children;
      let first = -1;
      let last = -1;
      const findIndex = (node) => {
        if (!node) return;
        node.forEach((child, index) => {
          if (child.type === "text" && child.value) {
            if (first < 0) first = index;
            last = index;
          }
        });
      };
      if (children) {
        findIndex(children);
        const lastChild = children == null ? void 0 : children[last];
        const firstChild = children == null ? void 0 : children[first];
        if (lastChild && lastChild.value.endsWith(" ")) {
          const text = lastChild.value;
          const trimmed = text.trimEnd();
          endSpaces = text.slice(trimmed.length);
          lastChild.value = trimmed;
        }
        if (firstChild && firstChild.value.startsWith(" ")) {
          const text = firstChild.value;
          const trimmed = text.trimStart();
          startSpaces = text.slice(0, text.length - trimmed.length);
          firstChild.value = trimmed;
        }
      }
      if (startSpaces.length) __privateGet(this, _addNodeAndPush2).call(this, "text", void 0, startSpaces);
      const result = onPush();
      if (endSpaces.length) __privateGet(this, _addNodeAndPush2).call(this, "text", void 0, endSpaces);
      return result;
    });
    __privateSet(this, _closeNodeAndPush2, (trim = false) => {
      const element = this.close();
      const onPush = () => __privateGet(this, _addNodeAndPush2).call(this, element.type, element.children, element.value, element.props);
      if (trim) return __privateGet(this, _moveSpaces).call(this, element, onPush);
      return onPush();
    });
    this.closeNode = () => {
      __privateGet(this, _closeNodeAndPush2).call(this);
      return this;
    };
    __privateSet(this, _addNodeAndPush2, (type, children, value, props) => {
      const element = SerializerStackElement.create(type, children, value, props);
      const node = __privateGet(this, _maybeMergeChildren).call(this, __privateGet(this, _createMarkdownNode).call(this, element));
      this.push(node);
      return node;
    });
    this.addNode = (type, children, value, props) => {
      __privateGet(this, _addNodeAndPush2).call(this, type, children, value, props);
      return this;
    };
    __privateSet(this, _openMark, (mark, type, value, props) => {
      if (mark.isInSet(__privateGet(this, _marks2))) return this;
      __privateSet(this, _marks2, mark.addToSet(__privateGet(this, _marks2)));
      return this.openNode(type, value, {
        ...props,
        isMark: true
      });
    });
    __privateSet(this, _closeMark, (mark) => {
      if (!mark.isInSet(__privateGet(this, _marks2))) return;
      __privateSet(this, _marks2, mark.type.removeFromSet(__privateGet(this, _marks2)));
      __privateGet(this, _closeNodeAndPush2).call(this, true);
    });
    this.withMark = (mark, type, value, props) => {
      __privateGet(this, _openMark).call(this, mark, type, value, props);
      return this;
    };
    this.closeMark = (mark) => {
      __privateGet(this, _closeMark).call(this, mark);
      return this;
    };
    this.build = () => {
      let doc = null;
      do
        doc = __privateGet(this, _closeNodeAndPush2).call(this);
      while (this.size());
      return doc;
    };
    this.next = (nodes) => {
      if (isFragment(nodes)) {
        nodes.forEach((node) => {
          __privateGet(this, _runNode2).call(this, node);
        });
        return this;
      }
      __privateGet(this, _runNode2).call(this, nodes);
      return this;
    };
    this.toString = (remark) => remark.stringify(this.build());
    this.run = (tree) => {
      this.next(tree);
      return this;
    };
    this.schema = schema;
  }
}, _marks2 = new WeakMap(), _matchTarget2 = new WeakMap(), _runProseNode = new WeakMap(), _runProseMark = new WeakMap(), _runNode2 = new WeakMap(), _searchType = new WeakMap(), _maybeMergeChildren = new WeakMap(), _createMarkdownNode = new WeakMap(), _moveSpaces = new WeakMap(), _closeNodeAndPush2 = new WeakMap(), _addNodeAndPush2 = new WeakMap(), _openMark = new WeakMap(), _closeMark = new WeakMap(), _c.create = (schema, remark) => {
  const state = new _c(schema);
  return (content) => {
    state.run(content);
    return state.toString(remark);
  };
}, _c);
export {
  ParserState as P,
  SerializerState as S
};
