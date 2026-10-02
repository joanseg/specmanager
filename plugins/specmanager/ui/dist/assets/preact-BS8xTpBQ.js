const MODE_HYDRATE = 1 << 5;
const MODE_SUSPENDED = 1 << 7;
const INSERT_VNODE = 1 << 2;
const MATCHED = 1 << 1;
const FORCE_PROPS_REVALIDATE = 1 << 0;
const REF_DETACHED = 1 << 3;
const COMPONENT_PROCESSING_EXCEPTION = 1 << 0;
const COMPONENT_PENDING_ERROR = 1 << 1;
const COMPONENT_FORCE = 1 << 2;
const COMPONENT_DIRTY = 1 << 3;
const RESET_MODE = -161;
const SVG_NAMESPACE = "http://www.w3.org/2000/svg";
const XHTML_NAMESPACE = "http://www.w3.org/1999/xhtml";
const MATH_NAMESPACE = "http://www.w3.org/1998/Math/MathML";
const NULL = null;
const UNDEFINED = void 0;
const EMPTY_OBJ = {};
const EMPTY_ARR = [];
const MATHML_TOKEN_ELEMENTS = /^m(i|n|o|s|text|space)$/;
const isArray = Array.isArray;
const slice = EMPTY_ARR.slice;
const assign$1 = Object.assign;
function removeNode(node) {
  if (node && node.parentNode)
    node.remove();
}
function _catchError(error, vnode, oldVNode, errorInfo) {
  let component, ctor, handled;
  for (; vnode = vnode._parent; ) {
    if ((component = vnode._component) && !(component._bits & COMPONENT_PROCESSING_EXCEPTION)) {
      component._bits |= COMPONENT_FORCE;
      try {
        ctor = component.constructor;
        if (ctor && ctor.getDerivedStateFromError) {
          component.setState(ctor.getDerivedStateFromError(error));
          handled = component._bits & COMPONENT_DIRTY;
        }
        if (component.componentDidCatch) {
          component.componentDidCatch(error, errorInfo || {});
          handled = component._bits & COMPONENT_DIRTY;
        }
        if (handled) {
          component._bits |= COMPONENT_PENDING_ERROR;
          return;
        }
      } catch (e) {
        error = e;
        handled = 0;
      }
    }
  }
  resetRenderCount();
  throw error;
}
const options$1 = {
  _catchError
};
let vnodeId$1 = 0;
function createVNode$1(type, props, key, ref, original) {
  const vnode = {
    type,
    props,
    key,
    ref,
    _children: NULL,
    _parent: NULL,
    _depth: 0,
    _dom: NULL,
    _component: NULL,
    constructor: UNDEFINED,
    _original: original || ++vnodeId$1,
    _index: -1,
    _flags: 0
  };
  if (!original && options$1.vnode)
    options$1.vnode(vnode);
  return vnode;
}
function Fragment(props) {
  return props.children;
}
function BaseComponent(props, context) {
  this.props = props;
  this.context = context;
  this._bits = 0;
}
BaseComponent.prototype.setState = function(update, callback) {
  let s = this._nextState;
  if (!s || s == this.state) {
    s = this._nextState = assign$1({}, this.state);
  }
  if (typeof update == "function") {
    update = update(assign$1({}, s), this.props);
  }
  if (update) {
    assign$1(s, update);
  } else {
    return;
  }
  if (this._vnode) {
    if (callback) {
      this._stateCallbacks.push(callback);
    }
    enqueueRender(this);
  }
};
BaseComponent.prototype.forceUpdate = function(callback) {
  if (this._vnode) {
    this._bits |= COMPONENT_FORCE;
    if (callback)
      this._renderCallbacks.push(callback);
    enqueueRender(this);
  }
};
BaseComponent.prototype.render = Fragment;
function getDomSibling(vnode, childIndex) {
  if (childIndex == NULL) {
    return vnode._parent ? getDomSibling(vnode._parent, vnode._index + 1) : NULL;
  }
  let sibling;
  for (; childIndex < vnode._children.length; childIndex++) {
    sibling = vnode._children[childIndex];
    if (sibling && sibling._dom) {
      return sibling._dom;
    }
  }
  return typeof vnode.type == "function" && !vnode.props._parentDom ? getDomSibling(vnode) : NULL;
}
function renderComponent(component) {
  const oldVNode = component._vnode, oldDom = oldVNode._dom, commitQueue = [], refQueue = [];
  const parentDom = component._parentDom;
  if (parentDom) {
    const newVNode = assign$1({ constructor: UNDEFINED }, oldVNode);
    newVNode._original = oldVNode._original + 1;
    if (options$1.vnode)
      options$1.vnode(newVNode);
    diff(parentDom, newVNode, oldVNode, component._globalContext, parentDom.namespaceURI, oldVNode._flags & MODE_HYDRATE ? [oldDom] : NULL, commitQueue, oldDom || getDomSibling(oldVNode), oldVNode._flags & MODE_HYDRATE, refQueue);
    newVNode._original = oldVNode._original;
    newVNode._parent._children[newVNode._index] = newVNode;
    commitRoot(commitQueue, newVNode, refQueue);
    oldVNode._parent = oldVNode._dom = NULL;
    if (newVNode._dom != oldDom) {
      updateParentDomPointers(newVNode);
    }
  }
}
function updateParentDomPointers(vnode) {
  if ((vnode = vnode._parent) && vnode._component && !vnode.props._parentDom) {
    vnode._dom = NULL;
    vnode._children.some((child) => child && (vnode._dom = child._dom));
    return updateParentDomPointers(vnode);
  }
}
const rerenderQueue = [];
let prevDebounce, rerenderCount = 0;
function resetRenderCount() {
  rerenderCount = 0;
}
function enqueueRender(c) {
  if (!(c._bits & COMPONENT_DIRTY) && (c._bits |= COMPONENT_DIRTY) && rerenderQueue.push(c) && !rerenderCount++ || prevDebounce != options$1.debounceRendering) {
    prevDebounce = options$1.debounceRendering;
    (prevDebounce || queueMicrotask)(process);
  }
}
const depthSort = (a, b) => a._vnode._depth - b._vnode._depth;
function process() {
  try {
    let c, l = 1;
    while (rerenderQueue.length) {
      if (rerenderQueue.length > l) {
        rerenderQueue.sort(depthSort);
      }
      c = rerenderQueue.shift();
      l = rerenderQueue.length;
      if (c._bits & COMPONENT_DIRTY) {
        renderComponent(c);
      }
    }
  } finally {
    rerenderQueue.length = rerenderCount = 0;
  }
}
function diffChildren(parentDom, renderResult, newParentVNode, oldParentVNode, globalContext, namespace, excessDomChildren, commitQueue, oldDom, isHydrating, refQueue) {
  let i, oldVNode, childVNode, newDom, firstChildDom;
  let oldChildren = oldParentVNode._children || EMPTY_ARR;
  let newChildrenLength = renderResult.length;
  oldDom = constructNewChildrenArray(newParentVNode, renderResult, oldChildren, oldDom, newChildrenLength);
  for (i = 0; i < newChildrenLength; i++) {
    childVNode = newParentVNode._children[i];
    if (childVNode == NULL)
      continue;
    oldVNode = ~childVNode._index && oldChildren[childVNode._index] || EMPTY_OBJ;
    childVNode._index = i;
    let result = diff(parentDom, childVNode, oldVNode, globalContext, namespace, excessDomChildren, commitQueue, oldDom, isHydrating, refQueue);
    newDom = childVNode._dom;
    if (childVNode.ref && (oldVNode.ref != childVNode.ref || oldVNode._flags & REF_DETACHED)) {
      if (oldVNode.ref != childVNode.ref && oldVNode.ref) {
        applyRef(oldVNode.ref, NULL, childVNode);
      }
      refQueue.push(childVNode.ref, childVNode._component || newDom, childVNode);
    }
    firstChildDom = firstChildDom || newDom;
    if (childVNode._flags & INSERT_VNODE) {
      oldDom = insert(childVNode, oldDom, parentDom, !oldVNode._original);
      if (oldVNode._dom) {
        oldVNode._dom = NULL;
      }
    } else if (typeof childVNode.type == "function" && result !== UNDEFINED) {
      oldDom = result;
    } else if (newDom) {
      oldDom = newDom.nextSibling;
    }
    childVNode._flags &= -7;
  }
  newParentVNode._dom = firstChildDom;
  return oldDom;
}
function constructNewChildrenArray(newParentVNode, renderResult, oldChildren, oldDom, newChildrenLength) {
  let i;
  let childVNode;
  let oldVNode;
  let oldChildrenLength = oldChildren.length, remainingOldChildren = oldChildrenLength;
  let skew = 0;
  let moved = false;
  let newChildren = newParentVNode._children = Array(newChildrenLength);
  for (i = 0; i < newChildrenLength; i++) {
    childVNode = renderResult[i];
    if (childVNode == NULL || typeof childVNode == "boolean" || typeof childVNode == "function") {
      newChildren[i] = NULL;
      continue;
    } else if (typeof childVNode != "object" || childVNode.constructor == String) {
      childVNode = newChildren[i] = createVNode$1(NULL, childVNode);
    } else if (isArray(childVNode)) {
      childVNode = newChildren[i] = createVNode$1(Fragment, {
        children: childVNode
      });
    } else if (childVNode.constructor === UNDEFINED && childVNode._depth) {
      childVNode = newChildren[i] = createVNode$1(childVNode.type, childVNode.props, childVNode.key, childVNode.ref, childVNode._original);
    } else {
      newChildren[i] = childVNode;
    }
    const skewedIndex = i + skew;
    childVNode._parent = newParentVNode;
    childVNode._depth = newParentVNode._depth + 1;
    const matchingIndex = childVNode._index = findMatchingIndex(childVNode, oldChildren, skewedIndex, remainingOldChildren);
    oldVNode = NULL;
    if (~matchingIndex) {
      oldVNode = oldChildren[matchingIndex];
      remainingOldChildren--;
      if (oldVNode) {
        oldVNode._flags |= MATCHED;
      }
    }
    if (!oldVNode || !oldVNode._original) {
      if (!~matchingIndex) {
        if (newChildrenLength > oldChildrenLength) {
          skew--;
        } else if (newChildrenLength < oldChildrenLength) {
          skew++;
        }
      }
      if (typeof childVNode.type != "function") {
        childVNode._flags |= INSERT_VNODE;
      }
    } else {
      childVNode._flags |= MATCHED;
      if (matchingIndex == skewedIndex - 1) {
        skew--;
      } else if (matchingIndex == skewedIndex + 1) {
        skew++;
      } else if (matchingIndex != skewedIndex) {
        if (matchingIndex > skewedIndex) {
          skew--;
        } else {
          skew++;
        }
        moved = true;
      }
    }
  }
  if (moved) {
    let tails = [];
    let lisLengths = [];
    for (i = 0; i < newChildrenLength; i++) {
      childVNode = newChildren[i];
      if (childVNode && childVNode._flags & MATCHED) {
        let lo = 0, hi = tails.length;
        while (lo < hi) {
          const mid = lo + hi >> 1;
          if (tails[mid] < childVNode._index) {
            lo = mid + 1;
          } else {
            hi = mid;
          }
        }
        tails[lo] = childVNode._index;
        lisLengths[i] = lo + 1;
      }
    }
    skew = tails.length;
    while (i--) {
      if (lisLengths[i]) {
        if (lisLengths[i] == skew) {
          skew--;
        } else {
          newChildren[i]._flags |= INSERT_VNODE;
        }
      }
    }
  }
  if (remainingOldChildren) {
    for (i = 0; i < oldChildrenLength; i++) {
      oldVNode = oldChildren[i];
      if (oldVNode && !(oldVNode._flags & MATCHED)) {
        if (oldVNode._dom == oldDom) {
          oldDom = getDomSibling(oldVNode);
        }
        unmount(oldVNode, oldVNode);
      }
    }
  }
  return oldDom;
}
function insert(parentVNode, oldDom, parentDom, isMounting) {
  if (typeof parentVNode.type == "function") {
    if (parentVNode.props._parentDom)
      return oldDom;
    let children = parentVNode._children;
    if (children) {
      for (let i = 0; i < children.length; i++) {
        if (children[i]) {
          children[i]._parent = parentVNode;
          oldDom = insert(children[i], oldDom, parentDom, false);
        }
      }
    }
    return oldDom;
  } else {
    if (oldDom && !oldDom.parentNode) {
      oldDom = getDomSibling(parentVNode);
      if (oldDom && !oldDom.parentNode)
        oldDom = NULL;
    }
    if (parentVNode._dom != oldDom) {
      if (!isMounting && parentDom.moveBefore && parentVNode._dom.parentNode) {
        parentDom.moveBefore(parentVNode._dom, oldDom);
      } else {
        parentDom.insertBefore(parentVNode._dom, oldDom || NULL);
      }
    }
    oldDom = parentVNode._dom;
  }
  while ((oldDom = oldDom && oldDom.nextSibling) && oldDom.nodeType == 8)
    ;
  return oldDom;
}
function toChildArray(children, out) {
  out = out || [];
  if (children != NULL && typeof children != "boolean") {
    if (isArray(children)) {
      children.some((child) => {
        toChildArray(child, out);
      });
    } else {
      out.push(children);
    }
  }
  return out;
}
function findMatchingIndex(childVNode, oldChildren, skewedIndex, remainingOldChildren) {
  const key = childVNode.key;
  const type = childVNode.type;
  let oldVNode = oldChildren[skewedIndex];
  const matched = oldVNode && !(oldVNode._flags & MATCHED);
  let shouldSearch = remainingOldChildren > (matched ? 1 : 0);
  if (oldVNode === NULL && key == NULL || matched && key == oldVNode.key && type == oldVNode.type) {
    return skewedIndex;
  } else if (shouldSearch) {
    let x = skewedIndex - 1;
    let y = skewedIndex + 1;
    while (x >= 0 || y < oldChildren.length) {
      const childIndex = x >= 0 ? x-- : y++;
      oldVNode = oldChildren[childIndex];
      if (oldVNode && !(oldVNode._flags & MATCHED) && key == oldVNode.key && type == oldVNode.type) {
        return childIndex;
      }
    }
  }
  return -1;
}
let EVENT_DISPATCHED = Symbol(), EVENT_ATTACHED = Symbol();
function setStyle(style, key, value) {
  if (value == NULL)
    value = "";
  if (key[0] == "-") {
    style.setProperty(key, value);
  } else {
    style[key] = value;
  }
}
const CAPTURE_REGEX = /(PointerCapture)$|Capture$/i;
let eventClock = 0;
function setProperty(dom, name, value, oldValue, namespace) {
  let useCapture;
  o: if (name == "style") {
    if (typeof value == "string") {
      dom.style.cssText = value;
    } else {
      if (typeof oldValue == "string") {
        dom.style.cssText = oldValue = "";
      }
      if (oldValue) {
        for (name in oldValue) {
          if (!(value && name in value)) {
            setStyle(dom.style, name, "");
          }
        }
      }
      if (value) {
        for (name in value) {
          if (!oldValue || value[name] != oldValue[name]) {
            setStyle(dom.style, name, value[name]);
          }
        }
      }
    }
  } else if (name[0] == "o" && name[1] == "n") {
    useCapture = name != (name = name.replace(CAPTURE_REGEX, "$1"));
    name = name.slice(2);
    if (name[0] < "a")
      name = name.toLowerCase();
    (dom._listeners || (dom._listeners = {}))[name + useCapture] = value;
    if (value) {
      if (!oldValue) {
        value[EVENT_ATTACHED] = eventClock;
        dom.addEventListener(name, useCapture ? eventProxyCapture : eventProxy, useCapture);
      } else {
        value[EVENT_ATTACHED] = oldValue[EVENT_ATTACHED];
      }
    } else {
      dom.removeEventListener(name, useCapture ? eventProxyCapture : eventProxy, useCapture);
    }
  } else {
    if (namespace == SVG_NAMESPACE) {
      name = name.replace(/xlink(H|:h)/, "h").replace(/sName$/, "s");
    } else if (name != "width" && name != "height" && name != "href" && name != "list" && name != "form" && name != "tabIndex" && name != "download" && name != "rowSpan" && name != "colSpan" && name != "role" && name != "popover" && name in dom) {
      try {
        dom[name] = value == NULL ? "" : value;
        break o;
      } catch (e) {
      }
    }
    if (typeof value == "function")
      ;
    else if (value != NULL && (value !== false || name[4] == "-")) {
      dom.setAttribute(name, name == "popover" && value == true ? "" : value);
    } else {
      dom.removeAttribute(name);
    }
  }
}
function createEventProxy(useCapture) {
  return function(e) {
    if (this._listeners) {
      const eventHandler = this._listeners[e.type + useCapture];
      if (e[EVENT_DISPATCHED] == NULL) {
        e[EVENT_DISPATCHED] = eventClock++;
      } else if (e[EVENT_DISPATCHED] < eventHandler[EVENT_ATTACHED]) {
        return;
      }
      return eventHandler(options$1.event ? options$1.event(e) : e);
    }
  };
}
const eventProxy = createEventProxy(false);
const eventProxyCapture = createEventProxy(true);
function diff(parentDom, newVNode, oldVNode, globalContext, namespace, excessDomChildren, commitQueue, oldDom, isHydrating, refQueue) {
  let tmp, resumed, newType = newVNode.type;
  if (newVNode.constructor !== UNDEFINED)
    return NULL;
  if (oldVNode._flags & MODE_SUSPENDED && (isHydrating = oldVNode._flags & MODE_HYDRATE, tmp = oldVNode._component._excess)) {
    newVNode._flags |= isHydrating;
    resumed = excessDomChildren = [];
    if (tmp.nodeType == 8) {
      for (let depth = 1, node = tmp.nextSibling; node; node = node.nextSibling) {
        if (node.nodeType == 8) {
          if (node.data.startsWith("$s"))
            depth++;
          else if (node.data.startsWith("/$s") && !--depth)
            break;
        }
        excessDomChildren.push(node);
      }
    } else {
      excessDomChildren.push(tmp);
    }
    oldDom = excessDomChildren[0];
  }
  if (tmp = options$1._diff)
    tmp(newVNode);
  outer: if (typeof newType == "function") {
    let oldCommitQueueLength = commitQueue.length;
    try {
      let c, oldProps, oldState, snapshot, newProps = newVNode.props;
      const isClassComponent = (tmp = newType.prototype) && tmp.render;
      tmp = newType.contextType;
      const provider = tmp && globalContext[tmp._id];
      const componentContext = tmp ? provider ? provider.props.value : tmp._defaultValue : globalContext;
      if (oldVNode._component) {
        c = newVNode._component = oldVNode._component;
        if (c._bits & COMPONENT_PENDING_ERROR) {
          c._bits |= COMPONENT_PROCESSING_EXCEPTION;
        }
      } else {
        if (isClassComponent) {
          newVNode._component = c = new newType(newProps, componentContext);
        } else {
          newVNode._component = c = new BaseComponent(newProps, componentContext);
          c.constructor = newType;
          c.render = doRender;
        }
        if (provider)
          provider.sub(c);
        if (!c.state)
          c.state = {};
        c._globalContext = globalContext;
        c._bits |= COMPONENT_DIRTY;
        c._renderCallbacks = [];
        c._stateCallbacks = [];
      }
      if (isClassComponent) {
        if (!c._nextState)
          c._nextState = c.state;
        if (newType.getDerivedStateFromProps) {
          if (c._nextState == c.state) {
            c._nextState = assign$1({}, c._nextState);
          }
          assign$1(c._nextState, newType.getDerivedStateFromProps(newProps, c._nextState));
        }
      }
      oldProps = c.props;
      oldState = c.state;
      c._vnode = newVNode;
      if (!oldVNode._component) {
        if (isClassComponent && !newType.getDerivedStateFromProps && c.componentWillMount) {
          c.componentWillMount();
        }
        if (isClassComponent && c.componentDidMount) {
          c._renderCallbacks.push(c.componentDidMount);
        }
      } else {
        if (isClassComponent && !newType.getDerivedStateFromProps && newProps !== oldProps && c.componentWillReceiveProps) {
          c.componentWillReceiveProps(newProps, componentContext);
        }
        if (newVNode._original == oldVNode._original && !(c._bits & COMPONENT_DIRTY) || !(c._bits & COMPONENT_FORCE) && c.shouldComponentUpdate && c.shouldComponentUpdate(newProps, c._nextState, componentContext) === false) {
          if (newVNode._original != oldVNode._original) {
            c.props = newProps;
            c.state = c._nextState;
            c._bits &= ~COMPONENT_DIRTY;
          }
          newVNode._dom = oldVNode._dom;
          newVNode._children = oldVNode._children;
          newVNode._children.some((vnode) => {
            if (vnode)
              vnode._parent = newVNode;
          });
          EMPTY_ARR.push.apply(c._renderCallbacks, c._stateCallbacks);
          c._stateCallbacks = [];
          if (c._renderCallbacks.length) {
            commitQueue.push(c);
          }
          oldDom = getDomSibling(oldVNode);
          break outer;
        }
        if (c.componentWillUpdate) {
          c.componentWillUpdate(newProps, c._nextState, componentContext);
        }
        if (isClassComponent && c.componentDidUpdate) {
          c._renderCallbacks.push(() => {
            c.componentDidUpdate(oldProps, oldState, snapshot);
          });
        }
      }
      c.context = componentContext;
      c.props = newProps;
      c._parentDom = parentDom;
      c._bits &= ~COMPONENT_FORCE;
      let renderHook = options$1._render, count = 0;
      if (isClassComponent) {
        c.state = c._nextState;
        c._bits &= ~COMPONENT_DIRTY;
        if (renderHook)
          renderHook(newVNode);
        tmp = c.render(c.props, c.state, c.context);
        EMPTY_ARR.push.apply(c._renderCallbacks, c._stateCallbacks);
        c._stateCallbacks = [];
      } else {
        do {
          c._bits &= ~COMPONENT_DIRTY;
          if (renderHook)
            renderHook(newVNode);
          tmp = c.render(c.props, c.state, c.context);
          c.state = c._nextState;
        } while (c._bits & COMPONENT_DIRTY && ++count < 25);
      }
      c.state = c._nextState;
      if (c.getChildContext) {
        globalContext = assign$1({}, globalContext, c.getChildContext());
      }
      if (isClassComponent && oldVNode._component && c.getSnapshotBeforeUpdate) {
        snapshot = c.getSnapshotBeforeUpdate(oldProps, oldState);
      }
      const renderResult = tmp && tmp.type === Fragment && tmp.key == NULL ? tmp.props.children : tmp;
      if (newProps._parentDom) {
        tmp = oldDom;
        parentDom = newProps._parentDom;
        namespace = parentDom.namespaceURI;
        isHydrating = excessDomChildren = NULL;
        if (oldVNode.props && oldVNode.props._parentDom != parentDom) {
          oldVNode._children.some((child) => {
            if (child)
              unmount(child, child);
          });
          oldVNode._children = NULL;
        }
        oldDom = oldVNode._children ? getDomSibling(oldVNode, 0) : NULL;
      }
      oldDom = diffChildren(parentDom, isArray(renderResult) ? renderResult : [renderResult], newVNode, oldVNode, globalContext, namespace, excessDomChildren, commitQueue, oldDom, isHydrating, refQueue);
      if (newProps._parentDom) {
        newVNode._dom = NULL;
        oldDom = tmp;
      }
      newVNode._flags &= RESET_MODE;
      if (oldVNode._flags & MODE_SUSPENDED)
        c._excess = NULL;
      if (resumed)
        resumed.some(removeNode);
      if (c._renderCallbacks.length) {
        commitQueue.push(c);
      }
      if (c._bits & COMPONENT_PROCESSING_EXCEPTION) {
        c._bits &= ~(COMPONENT_PROCESSING_EXCEPTION | COMPONENT_PENDING_ERROR);
      }
    } catch (e) {
      commitQueue.length = oldCommitQueueLength;
      newVNode._original = NULL;
      if (isHydrating || excessDomChildren) {
        if (e.then) {
          let commentMarkersToFind = 0, startMarker;
          newVNode._flags |= isHydrating ? MODE_HYDRATE | MODE_SUSPENDED : MODE_SUSPENDED;
          if (excessDomChildren) {
            for (let i = 0; i < excessDomChildren.length; i++) {
              let child = excessDomChildren[i];
              if (!child)
                continue;
              if (child.nodeType == 8) {
                excessDomChildren[i] = NULL;
                if (child.data.startsWith("$s")) {
                  if (!commentMarkersToFind++)
                    startMarker = child;
                } else if (child.data.startsWith("/$s") && !--commentMarkersToFind) {
                  oldDom = child;
                  break;
                }
              } else if (commentMarkersToFind) {
                excessDomChildren[i] = NULL;
              }
            }
          }
          if (!startMarker) {
            while (oldDom && oldDom.nodeType == 8 && oldDom.nextSibling) {
              oldDom = oldDom.nextSibling;
            }
            if (excessDomChildren) {
              excessDomChildren[excessDomChildren.indexOf(oldDom)] = NULL;
            }
            startMarker = oldDom;
          }
          if (!newVNode._component._excess) {
            newVNode._component._excess = startMarker;
          }
          newVNode._dom = oldDom;
        } else if (excessDomChildren) {
          excessDomChildren.some(removeNode);
        }
      } else {
        newVNode._dom = oldVNode._dom;
      }
      if (!newVNode._children) {
        newVNode._children = oldVNode._children || [];
      }
      if (!e.then)
        markAsForce(newVNode);
      options$1._catchError(e, newVNode, oldVNode);
    }
  } else {
    oldDom = newVNode._dom = diffElementNodes(oldVNode._dom, newVNode, oldVNode, globalContext, namespace, excessDomChildren, commitQueue, isHydrating, refQueue, parentDom);
  }
  if (tmp = options$1.diffed)
    tmp(newVNode);
  return newVNode._flags & MODE_SUSPENDED ? UNDEFINED : oldDom;
}
function markAsForce(vnode) {
  if (vnode) {
    if (vnode._component)
      vnode._component._bits |= COMPONENT_FORCE;
    if (vnode._children)
      vnode._children.some(markAsForce);
  }
}
function commitRoot(commitQueue, root, refQueue) {
  for (let i = 0; i < refQueue.length; ) {
    applyRef(refQueue[i++], refQueue[i++], refQueue[i++]);
  }
  if (options$1._commit)
    options$1._commit(root, commitQueue);
  commitQueue.some((c) => {
    try {
      commitQueue = c._renderCallbacks;
      c._renderCallbacks = [];
      commitQueue.some((cb) => {
        cb.call(c);
      });
    } catch (e) {
      options$1._catchError(e, c._vnode);
    }
  });
}
function diffElementNodes(dom, newVNode, oldVNode, globalContext, namespace, excessDomChildren, commitQueue, isHydrating, refQueue, parentDom) {
  let oldProps = oldVNode.props || EMPTY_OBJ;
  const newProps = newVNode.props;
  const nodeType = newVNode.type;
  let i;
  let newHtml;
  let oldHtml;
  let newChildren;
  let value;
  let inputValue;
  let checked;
  if (nodeType == "svg")
    namespace = SVG_NAMESPACE;
  else if (nodeType == "math")
    namespace = MATH_NAMESPACE;
  else if (!namespace)
    namespace = XHTML_NAMESPACE;
  if (excessDomChildren) {
    for (i = 0; i < excessDomChildren.length; i++) {
      value = excessDomChildren[i];
      if (value && (nodeType ? value.localName == nodeType : value.nodeType == 3)) {
        dom = value;
        excessDomChildren[i] = NULL;
        break;
      }
    }
  }
  if (!dom) {
    const doc = parentDom.ownerDocument || document;
    if (!nodeType) {
      return doc.createTextNode(newProps);
    }
    dom = doc.createElementNS(namespace, nodeType, newProps.is && newProps);
    if (isHydrating) {
      if (options$1._hydrationMismatch)
        options$1._hydrationMismatch(newVNode, excessDomChildren);
      isHydrating = false;
    }
    excessDomChildren = NULL;
  }
  if (!nodeType) {
    if (oldProps !== newProps && (!isHydrating || dom.data != newProps)) {
      dom.data = newProps;
    }
  } else {
    parentDom = nodeType == "template" ? dom.content : dom;
    excessDomChildren = nodeType == "textarea" && newProps.defaultValue != NULL ? NULL : excessDomChildren && slice.call(parentDom.childNodes);
    if (!isHydrating && excessDomChildren) {
      oldProps = {};
      for (i = 0; i < dom.attributes.length; i++) {
        value = dom.attributes[i];
        oldProps[value.name] = value.value;
      }
    }
    for (i in oldProps) {
      value = oldProps[i];
      if (i == "dangerouslySetInnerHTML") {
        oldHtml = value;
      } else if (i != "children" && !(i in newProps) && !(i == "value" && "defaultValue" in newProps) && !(i == "checked" && "defaultChecked" in newProps)) {
        setProperty(dom, i, NULL, value, namespace);
      }
    }
    const shouldRevalidateProps = oldVNode._flags & FORCE_PROPS_REVALIDATE;
    for (i in newProps) {
      value = newProps[i];
      if (i == "children") {
        newChildren = value;
      } else if (i == "dangerouslySetInnerHTML") {
        newHtml = value;
      } else if (i == "value") {
        inputValue = value;
      } else if (i == "checked") {
        checked = value;
      } else if ((!isHydrating || typeof value == "function") && (oldProps[i] !== value || shouldRevalidateProps && value != NULL)) {
        setProperty(dom, i, value, oldProps[i], namespace);
      }
    }
    if (newHtml) {
      if (!isHydrating && (!oldHtml || newHtml.__html != oldHtml.__html && newHtml.__html != dom.innerHTML)) {
        dom.innerHTML = newHtml.__html;
      }
      newVNode._children = [];
    } else {
      if (oldHtml)
        dom.textContent = "";
      if (nodeType == "foreignObject" || namespace == MATH_NAMESPACE && MATHML_TOKEN_ELEMENTS.test(nodeType)) {
        namespace = XHTML_NAMESPACE;
      }
      diffChildren(parentDom, isArray(newChildren) ? newChildren : [newChildren], newVNode, oldVNode, globalContext, namespace, excessDomChildren, commitQueue, excessDomChildren ? excessDomChildren[0] : oldVNode._children && getDomSibling(oldVNode, 0), isHydrating, refQueue);
      if (excessDomChildren)
        excessDomChildren.some(removeNode);
    }
    if (!isHydrating || nodeType == "textarea") {
      i = "value";
      if (nodeType == "progress" && inputValue == NULL) {
        dom.removeAttribute(i);
      } else if (inputValue != UNDEFINED && (inputValue !== dom[i] || nodeType == "progress" && !inputValue)) {
        setProperty(dom, i, inputValue, oldProps[i], namespace);
      }
      i = "checked";
      if (checked != UNDEFINED && checked != dom[i]) {
        setProperty(dom, i, checked, oldProps[i], namespace);
      }
    }
  }
  return dom;
}
function applyRef(ref, value, vnode) {
  try {
    if (typeof ref == "function") {
      if (typeof ref._unmount == "function") {
        ref._unmount();
      }
      if (typeof ref._unmount != "function" || value) {
        ref._unmount = ref(value);
      }
    } else
      ref.current = value;
  } catch (e) {
    options$1._catchError(e, vnode);
  }
}
function unmount(vnode, parentVNode, skipRemove) {
  let r;
  if (options$1.unmount)
    options$1.unmount(vnode);
  if ((r = vnode.ref) && (!r.current || r.current == vnode._dom)) {
    applyRef(r, NULL, parentVNode);
  }
  if (r = vnode._component) {
    if (r.componentWillUnmount) {
      try {
        r.componentWillUnmount();
      } catch (e) {
        options$1._catchError(e, parentVNode);
      }
    }
    r._parentDom = r._globalContext = NULL;
  }
  if (r = vnode._children) {
    for (let i = 0; i < r.length; i++) {
      if (r[i]) {
        unmount(r[i], parentVNode, typeof vnode.type == "function" ? skipRemove && !vnode.props._parentDom : true);
      }
    }
  }
  if (r = vnode._dom) {
    if (!skipRemove)
      removeNode(r);
    if (r._listeners)
      r._listeners = NULL;
  }
  vnode._dom = vnode._component = vnode._parent = NULL;
}
function doRender(props, state, context) {
  return this.constructor(props, context);
}
function render$1(vnode, parentDom) {
  if (options$1._root)
    options$1._root(vnode, parentDom);
  if (parentDom.nodeType == 9) {
    parentDom = parentDom.documentElement;
  }
  let isHydrating = vnode && vnode._flags & MODE_HYDRATE;
  let oldVNode = isHydrating ? NULL : parentDom._children;
  parentDom._children = createVNode$1(Fragment, { children: [vnode] });
  let commitQueue = [], refQueue = [];
  diff(parentDom, parentDom._children, oldVNode || EMPTY_OBJ, EMPTY_OBJ, parentDom.namespaceURI, oldVNode ? NULL : parentDom.firstChild ? slice.call(parentDom.childNodes) : NULL, commitQueue, oldVNode ? oldVNode._dom : parentDom.firstChild, isHydrating, refQueue);
  commitRoot(commitQueue, parentDom._children, refQueue);
  parentDom._children.props.children = NULL;
}
let vnodeId = 0;
function createVNode(type, props, key, isStaticChildren, __source, __self) {
  if (!props)
    props = {};
  let normalizedProps = props, ref, i;
  if ("ref" in normalizedProps && typeof type != "function") {
    normalizedProps = {};
    for (i in props) {
      if (i == "ref") {
        ref = props[i];
      } else {
        normalizedProps[i] = props[i];
      }
    }
  }
  const vnode = {
    type,
    props: normalizedProps,
    key,
    ref,
    _children: null,
    _parent: null,
    _depth: 0,
    _dom: null,
    _component: null,
    constructor: void 0,
    _original: --vnodeId,
    _index: -1,
    _flags: 0
  };
  if (options$1.vnode)
    options$1.vnode(vnode);
  return vnode;
}
const ObjectIs = Object.is;
let currentIndex;
let currentComponent;
let previousComponent;
let currentHook = 0;
let afterPaintEffects = [];
let unmountCleanups = [];
const options = options$1;
let oldBeforeDiff = options._diff;
let oldBeforeRender = options._render;
let oldAfterDiff = options.diffed;
let oldCommit = options._commit;
let oldBeforeUnmount = options.unmount;
let oldRoot = options._root;
const RAF_TIMEOUT = 35;
let prevRaf;
options._diff = (vnode) => {
  currentComponent = null;
  if (oldBeforeDiff)
    oldBeforeDiff(vnode);
};
options._root = (vnode, parentDom) => {
  if (vnode && parentDom._children && parentDom._children._mask) {
    vnode._mask = parentDom._children._mask;
  }
  if (oldRoot)
    oldRoot(vnode, parentDom);
};
options._render = (vnode) => {
  if (oldBeforeRender)
    oldBeforeRender(vnode);
  currentComponent = vnode._component;
  currentIndex = 0;
  const hooks = currentComponent.__hooks;
  if (hooks) {
    if (previousComponent == currentComponent) {
      currentComponent._renderCallbacks = [];
    } else {
      hooks._pendingEffects.some(invokeCleanup);
      hooks._pendingEffects.some(invokeEffect);
      currentIndex = 0;
    }
    hooks._pendingEffects = [];
    hooks._list.some((hookItem) => {
      if (hookItem._nextValue) {
        hookItem._value = hookItem._nextValue;
      }
      hookItem._pendingArgs = hookItem._nextValue = void 0;
    });
  }
  previousComponent = currentComponent;
};
options.diffed = (vnode) => {
  if (oldAfterDiff)
    oldAfterDiff(vnode);
  const c = vnode._component;
  if (c && c.__hooks) {
    if (c.__hooks._pendingEffects.length)
      afterPaint(afterPaintEffects.push(c));
    c.__hooks._list.some((hookItem) => {
      if (hookItem._pendingArgs)
        hookItem._args = hookItem._pendingArgs;
    });
  }
  previousComponent = currentComponent = null;
};
options._commit = (vnode, commitQueue) => {
  commitQueue.some((component) => {
    try {
      component._renderCallbacks.some(invokeCleanup);
      component._renderCallbacks = component._renderCallbacks.filter((cb) => cb._value ? invokeEffect(cb) : true);
    } catch (e) {
      commitQueue.some((c) => {
        if (c._renderCallbacks)
          c._renderCallbacks = [];
      });
      commitQueue = [];
      options._catchError(e, component._vnode);
    }
  });
  if (oldCommit)
    oldCommit(vnode, commitQueue);
};
options.unmount = (vnode) => {
  if (oldBeforeUnmount)
    oldBeforeUnmount(vnode);
  const c = vnode._component;
  if (c && c.__hooks) {
    let hasErrored, errorParent;
    c.__hooks._list.some((s) => {
      try {
        if (s._passive && s._cleanup) {
          if (errorParent === void 0) {
            errorParent = vnode._parent;
            while (errorParent && !(errorParent._component && errorParent._component._parentDom)) {
              errorParent = errorParent._parent;
            }
            errorParent = errorParent && errorParent._component;
          }
          s._passive = errorParent;
          afterPaint(unmountCleanups.push(s));
        } else {
          invokeCleanup(s);
        }
      } catch (e) {
        hasErrored = e;
      }
    });
    c.__hooks = void 0;
    if (hasErrored)
      options._catchError(hasErrored, c._vnode);
  }
};
function getHookState(index, type) {
  if (options._hook) {
    options._hook(currentComponent, index, currentHook || type);
  }
  currentHook = 0;
  const hooks = currentComponent.__hooks || (currentComponent.__hooks = {
    _list: [],
    _pendingEffects: []
  });
  if (index >= hooks._list.length) {
    hooks._list.push({});
  }
  return hooks._list[index];
}
function useState(initialState) {
  currentHook = 1;
  return useReducer(invokeOrReturn, initialState);
}
function useReducer(reducer, initialState, init) {
  const hookState = getHookState(currentIndex++, 2);
  hookState._reducer = reducer;
  if (!hookState._component) {
    hookState._value = [
      !init ? invokeOrReturn(void 0, initialState) : init(initialState),
      (action) => {
        const currentValue = hookState._nextValue ? hookState._nextValue[0] : hookState._value[0];
        const nextValue = hookState._reducer(currentValue, action);
        if (!ObjectIs(currentValue, nextValue)) {
          hookState._nextValue = [nextValue, hookState._value[1]];
          hookState._component.setState({});
        }
      }
    ];
    hookState._component = currentComponent;
    if (!currentComponent._hasScuFromHooks) {
      currentComponent._hasScuFromHooks = true;
      const prevScu = currentComponent.shouldComponentUpdate;
      currentComponent.shouldComponentUpdate = function(p, s, c) {
        const hooks = this.__hooks;
        if (!hooks)
          return true;
        let updatedHook = false;
        let shouldUpdate = this.props != p;
        hooks._list.some((hookItem) => {
          if (hookItem._nextValue) {
            updatedHook = true;
            if (!ObjectIs(hookItem._value[0], hookItem._nextValue[0])) {
              shouldUpdate = true;
            }
          }
        });
        if (prevScu) {
          const result = prevScu.call(this, p, s, c);
          return updatedHook ? result || shouldUpdate : result;
        }
        return !updatedHook || shouldUpdate;
      };
    }
  }
  return hookState._value;
}
function useEffect(callback, args) {
  const state = getHookState(currentIndex++, 3);
  if (!options._skipEffects && argsChanged(state._args, args)) {
    state._passive = true;
    state._value = callback;
    state._pendingArgs = args;
    currentComponent.__hooks._pendingEffects.push(state);
  }
}
function useRef(initialValue) {
  currentHook = 5;
  return useMemo(() => ({ current: initialValue }), []);
}
function useMemo(factory, args) {
  const state = getHookState(currentIndex++, 7);
  if (argsChanged(state._args, args)) {
    state._value = factory();
    state._args = args;
  }
  return state._value;
}
function useCallback(callback, args) {
  currentHook = 8;
  return useMemo(() => callback, args);
}
function flushAfterPaintEffects() {
  let component;
  do {
    while (component = unmountCleanups.shift()) {
      try {
        invokeCleanup(component);
      } catch (e) {
        component = component._passive;
        options._catchError(e, { _parent: component && component._vnode });
      }
    }
    while (component = afterPaintEffects.shift()) {
      const hooks = component.__hooks;
      if (!component._parentDom || !hooks)
        continue;
      try {
        hooks._pendingEffects.some(invokeCleanup);
        hooks._pendingEffects.some(invokeEffect);
        hooks._pendingEffects = [];
      } catch (e) {
        hooks._pendingEffects = [];
        options._catchError(e, component._vnode);
      }
    }
  } while (unmountCleanups.length);
}
let HAS_RAF = typeof requestAnimationFrame == "function";
function afterNextFrame(callback) {
  const done = () => {
    clearTimeout(timeout);
    if (HAS_RAF)
      cancelAnimationFrame(raf);
    setTimeout(callback);
  };
  const timeout = setTimeout(done, RAF_TIMEOUT);
  let raf;
  if (HAS_RAF) {
    raf = requestAnimationFrame(done);
  }
}
function afterPaint(newQueueLength) {
  if (newQueueLength == 1 || prevRaf != options.requestAnimationFrame) {
    prevRaf = options.requestAnimationFrame;
    (prevRaf || afterNextFrame)(flushAfterPaintEffects);
  }
}
function invokeCleanup(hook) {
  const comp = currentComponent;
  let cleanup = hook._cleanup;
  if (typeof cleanup == "function") {
    hook._cleanup = void 0;
    cleanup();
  }
  currentComponent = comp;
}
function invokeEffect(hook) {
  const comp = currentComponent;
  hook._cleanup = hook._value();
  currentComponent = comp;
}
function argsChanged(oldArgs, newArgs) {
  return !oldArgs || oldArgs.length != newArgs.length || newArgs.some((arg, index) => !ObjectIs(arg, oldArgs[index]));
}
function invokeOrReturn(arg, f) {
  return typeof f == "function" ? f(arg) : f;
}
const assign = Object.assign;
const IS_NON_DIMENSIONAL = /^(-|f[lo].*[^se]$|g.{5,}[^ps]$|z|o[pr]|(W.{5})?[lL]i.*(t|mp)$|an|(bo|s).{4}Im|sca|m.{6}[ds]|ta|c.*[st]$|wido|ini)/;
const REACT_ELEMENT_TYPE = Symbol.for("react.element");
const CAMEL_PROPS = /^(?:accent|alignment|arabic|baseline|cap|clip(?!PathU)|color|dominant|fill|flood|font|glyph(?!R)|horiz|image(?!S)|letter|lighting|marker(?!H|W|U)|overline|paint|pointer|shape|stop|strikethrough|stroke|text(?!L)|transform|underline|unicode|units|v|vector|vert|word|writing|x(?!C))[A-Z]/;
const CAMEL_REPLACE = /[A-Z0-9]/g;
const IS_DOM = typeof document < "u";
const onChangeInputType = (type) => /fil|che|rad/.test(type);
BaseComponent.prototype.isReactComponent = true;
[
  "componentWillMount",
  "componentWillReceiveProps",
  "componentWillUpdate"
].forEach((key) => {
  Object.defineProperty(BaseComponent.prototype, key, {
    configurable: true,
    get() {
      return this["UNSAFE_" + key];
    },
    set(v) {
      Object.defineProperty(this, key, {
        configurable: true,
        writable: true,
        value: v
      });
    }
  });
});
function render(vnode, parent, callback) {
  if (parent._children == null) {
    parent.textContent = "";
  }
  render$1(vnode, parent);
  if (typeof callback == "function")
    callback();
  return vnode ? vnode._component : null;
}
let oldEventHook = options$1.event;
options$1.event = (e) => {
  if (oldEventHook)
    e = oldEventHook(e);
  e.persist = () => {
  };
  e.isPropagationStopped = function isPropagationStopped() {
    return this.cancelBubble;
  };
  e.isDefaultPrevented = function isDefaultPrevented() {
    return this.defaultPrevented;
  };
  return e.nativeEvent = e;
};
const classNameDescriptorNonEnumberable = {
  configurable: true,
  get() {
    return this.class;
  }
};
function handleDomVNode(vnode) {
  let props = vnode.props, type = vnode.type, normalizedProps = {}, isNonDashedType = type.indexOf("-") == -1;
  for (let i in props) {
    let value = props[i];
    if (i == "value" && "defaultValue" in props && value == null || IS_DOM && i == "children" && type == "noscript" || i == "class" || i == "className") {
      continue;
    }
    if (i == "style" && typeof value == "object") {
      let cloned;
      for (let key in value) {
        if (typeof value[key] == "number" && !IS_NON_DIMENSIONAL.test(key)) {
          if (!cloned) {
            cloned = value = assign({}, value);
          }
          value[key] += "px";
        }
      }
    } else if (i == "defaultValue" && "value" in props && props.value == null) {
      i = "value";
    } else if (i == "download" && value === true) {
      value = "";
    } else if (i == "translate" && value === "no") {
      value = false;
    } else if (i[0] == "o" && i[1] == "n") {
      let lowerCased = i.toLowerCase();
      if (lowerCased == "ondoubleclick") {
        i = "ondblclick";
      } else if (lowerCased == "onchange" && (type == "input" || type == "textarea") && !onChangeInputType(props.type)) {
        lowerCased = i = "oninput";
      } else if (lowerCased == "onfocus") {
        i = "onfocusin";
      } else if (lowerCased == "onblur") {
        i = "onfocusout";
      }
      if (lowerCased == "oninput") {
        i = lowerCased;
        if (normalizedProps[i]) {
          i = "oninputCapture";
        }
      }
    } else if (isNonDashedType && CAMEL_PROPS.test(i)) {
      i = i.replace(CAMEL_REPLACE, "-$&").toLowerCase();
    } else if (value === null) {
      value = void 0;
    }
    normalizedProps[i] = value;
  }
  if (type == "select") {
    if (normalizedProps.multiple && Array.isArray(normalizedProps.value)) {
      normalizedProps.value = toChildArray(props.children).forEach((child) => {
        child.props.selected = normalizedProps.value.indexOf(child.props.value) != -1;
      });
    }
    if (normalizedProps.defaultValue != null) {
      normalizedProps.value = toChildArray(props.children).forEach((child) => {
        if (normalizedProps.multiple) {
          child.props.selected = normalizedProps.defaultValue.indexOf(child.props.value) != -1;
        } else {
          child.props.selected = normalizedProps.defaultValue == child.props.value;
        }
      });
    }
  }
  if (props.class && !props.className) {
    normalizedProps.class = props.class;
    Object.defineProperty(normalizedProps, "className", classNameDescriptorNonEnumberable);
  } else if (props.className) {
    normalizedProps.class = normalizedProps.className = props.className;
  }
  vnode.props = normalizedProps;
}
let oldVNodeHook = options$1.vnode;
options$1.vnode = (vnode) => {
  if (typeof vnode.type == "string") {
    handleDomVNode(vnode);
  } else if (typeof vnode.type == "function") {
    const shouldApplyRef = "prototype" in vnode.type && vnode.type.prototype.render;
    if ("ref" in vnode.props && shouldApplyRef) {
      vnode.ref = vnode.props.ref;
      delete vnode.props.ref;
    }
    if (vnode.type.defaultProps) {
      let normalizedProps = assign({}, vnode.props);
      for (let i in vnode.type.defaultProps) {
        if (normalizedProps[i] === void 0) {
          normalizedProps[i] = vnode.type.defaultProps[i];
        }
      }
      vnode.props = normalizedProps;
    }
  }
  if (vnode.ref && !("ref" in vnode.props)) {
    Object.defineProperty(vnode.props, "ref", {
      value: vnode.ref,
      configurable: true,
      writable: true
    });
  }
  vnode.$$typeof = REACT_ELEMENT_TYPE;
  if (oldVNodeHook)
    oldVNodeHook(vnode);
};
function unmountComponentAtNode(container) {
  if (container._children) {
    render$1(null, container);
    return true;
  }
  return false;
}
const React = {
  StrictMode: Fragment
};
function createRoot(container) {
  return {
    render: function(children) {
      render(children, container);
    },
    unmount: function() {
      unmountComponentAtNode(container);
    }
  };
}
export {
  Fragment as F,
  React as R,
  createVNode as a,
  useEffect as b,
  createRoot as c,
  useMemo as d,
  useRef as e,
  useState as f,
  useCallback as u
};
