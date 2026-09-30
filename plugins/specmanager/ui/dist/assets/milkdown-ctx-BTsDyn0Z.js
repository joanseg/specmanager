var __typeError = (msg) => {
  throw TypeError(msg);
};
var __accessCheck = (obj, member, msg) => member.has(obj) || __typeError("Cannot " + msg);
var __privateGet = (obj, member, getter) => (__accessCheck(obj, member, "read from private field"), getter ? getter.call(obj) : member.get(obj));
var __privateAdd = (obj, member, value) => member.has(obj) ? __typeError("Cannot add the same private member more than once") : member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
var __privateSet = (obj, member, value, setter) => (__accessCheck(obj, member, "write to private field"), setter ? setter.call(obj, value) : member.set(obj, value), value);
var _watchers, _value, _emit, _a, _meta, _container, _clock, _injectedSlices, _consumedSlices, _recordedTimers, _waitTimers, _getSlice, _getTimer, _b, _container2, _clock2, _meta2, _inspector, _c, _promise, _listener, _eventUniqId, _status, _removeListener, _waitTimeout, _d;
import { a as contextNotFound, t as timerNotFound, d as ctxCallOutOfScope } from "./milkdown-exception-CsDPrAT2.js";
var Container = class {
  constructor() {
    this.sliceMap = /* @__PURE__ */ new Map();
    this.get = (slice) => {
      const context = typeof slice === "string" ? [...this.sliceMap.values()].find((x) => x.type.name === slice) : this.sliceMap.get(slice.id);
      if (!context) throw contextNotFound(typeof slice === "string" ? slice : slice.name);
      return context;
    };
    this.remove = (slice) => {
      const context = typeof slice === "string" ? [...this.sliceMap.values()].find((x) => x.type.name === slice) : this.sliceMap.get(slice.id);
      if (!context) return;
      this.sliceMap.delete(context.type.id);
    };
    this.has = (slice) => {
      if (typeof slice === "string") return [...this.sliceMap.values()].some((x) => x.type.name === slice);
      return this.sliceMap.has(slice.id);
    };
  }
};
var Slice = (_a = class {
  constructor(container, value, type) {
    __privateAdd(this, _watchers);
    __privateAdd(this, _value);
    __privateAdd(this, _emit);
    __privateSet(this, _watchers, []);
    __privateSet(this, _emit, () => {
      __privateGet(this, _watchers).forEach((watcher) => watcher(__privateGet(this, _value)));
    });
    this.set = (value2) => {
      __privateSet(this, _value, value2);
      __privateGet(this, _emit).call(this);
    };
    this.get = () => __privateGet(this, _value);
    this.update = (updater) => {
      __privateSet(this, _value, updater(__privateGet(this, _value)));
      __privateGet(this, _emit).call(this);
    };
    this.type = type;
    __privateSet(this, _value, value);
    container.set(type.id, this);
  }
  on(watcher) {
    __privateGet(this, _watchers).push(watcher);
    return () => {
      __privateSet(this, _watchers, __privateGet(this, _watchers).filter((w) => w !== watcher));
    };
  }
  once(watcher) {
    const off = this.on((value) => {
      watcher(value);
      off();
    });
    return off;
  }
  off(watcher) {
    __privateSet(this, _watchers, __privateGet(this, _watchers).filter((w) => w !== watcher));
  }
  offAll() {
    __privateSet(this, _watchers, []);
  }
}, _watchers = new WeakMap(), _value = new WeakMap(), _emit = new WeakMap(), _a);
var SliceType = class {
  constructor(value, name) {
    this.id = Symbol(`Context-${name}`);
    this.name = name;
    this._defaultValue = value;
    this._typeInfo = () => {
      throw ctxCallOutOfScope();
    };
  }
  create(container, value = this._defaultValue) {
    return new Slice(container, value, this);
  }
};
var createSlice = (value, name) => new SliceType(value, name);
var Inspector = (_b = class {
  constructor(container, clock, meta) {
    __privateAdd(this, _meta);
    __privateAdd(this, _container);
    __privateAdd(this, _clock);
    __privateAdd(this, _injectedSlices);
    __privateAdd(this, _consumedSlices);
    __privateAdd(this, _recordedTimers);
    __privateAdd(this, _waitTimers);
    __privateAdd(this, _getSlice);
    __privateAdd(this, _getTimer);
    __privateSet(this, _injectedSlices, /* @__PURE__ */ new Set());
    __privateSet(this, _consumedSlices, /* @__PURE__ */ new Set());
    __privateSet(this, _recordedTimers, /* @__PURE__ */ new Map());
    __privateSet(this, _waitTimers, /* @__PURE__ */ new Map());
    this.read = () => {
      return {
        metadata: __privateGet(this, _meta),
        injectedSlices: [...__privateGet(this, _injectedSlices)].map((slice) => ({
          name: typeof slice === "string" ? slice : slice.name,
          value: __privateGet(this, _getSlice).call(this, slice)
        })),
        consumedSlices: [...__privateGet(this, _consumedSlices)].map((slice) => ({
          name: typeof slice === "string" ? slice : slice.name,
          value: __privateGet(this, _getSlice).call(this, slice)
        })),
        recordedTimers: [...__privateGet(this, _recordedTimers)].map(([timer, { duration }]) => ({
          name: timer.name,
          duration,
          status: __privateGet(this, _getTimer).call(this, timer)
        })),
        waitTimers: [...__privateGet(this, _waitTimers)].map(([timer, { duration }]) => ({
          name: timer.name,
          duration,
          status: __privateGet(this, _getTimer).call(this, timer)
        }))
      };
    };
    this.onRecord = (timerType) => {
      __privateGet(this, _recordedTimers).set(timerType, {
        start: Date.now(),
        duration: 0
      });
    };
    this.onClear = (timerType) => {
      __privateGet(this, _recordedTimers).delete(timerType);
    };
    this.onDone = (timerType) => {
      const timer = __privateGet(this, _recordedTimers).get(timerType);
      if (!timer) return;
      timer.duration = Date.now() - timer.start;
    };
    this.onWait = (timerType, promise) => {
      const start = Date.now();
      promise.finally(() => {
        __privateGet(this, _waitTimers).set(timerType, { duration: Date.now() - start });
      }).catch(console.error);
    };
    this.onInject = (sliceType) => {
      __privateGet(this, _injectedSlices).add(sliceType);
    };
    this.onRemove = (sliceType) => {
      __privateGet(this, _injectedSlices).delete(sliceType);
    };
    this.onUse = (sliceType) => {
      __privateGet(this, _consumedSlices).add(sliceType);
    };
    __privateSet(this, _getSlice, (sliceType) => {
      return __privateGet(this, _container).get(sliceType).get();
    });
    __privateSet(this, _getTimer, (timerType) => {
      return __privateGet(this, _clock).get(timerType).status;
    });
    __privateSet(this, _container, container);
    __privateSet(this, _clock, clock);
    __privateSet(this, _meta, meta);
  }
}, _meta = new WeakMap(), _container = new WeakMap(), _clock = new WeakMap(), _injectedSlices = new WeakMap(), _consumedSlices = new WeakMap(), _recordedTimers = new WeakMap(), _waitTimers = new WeakMap(), _getSlice = new WeakMap(), _getTimer = new WeakMap(), _b);
var Ctx = (_c = class {
  constructor(container, clock, meta) {
    __privateAdd(this, _container2);
    __privateAdd(this, _clock2);
    __privateAdd(this, _meta2);
    __privateAdd(this, _inspector);
    this.produce = (meta2) => {
      if (meta2 && Object.keys(meta2).length) return new _c(__privateGet(this, _container2), __privateGet(this, _clock2), { ...meta2 });
      return this;
    };
    this.inject = (sliceType, value) => {
      var _a2;
      const slice = sliceType.create(__privateGet(this, _container2).sliceMap);
      if (value != null) slice.set(value);
      (_a2 = __privateGet(this, _inspector)) == null ? void 0 : _a2.onInject(sliceType);
      return this;
    };
    this.remove = (sliceType) => {
      var _a2;
      __privateGet(this, _container2).remove(sliceType);
      (_a2 = __privateGet(this, _inspector)) == null ? void 0 : _a2.onRemove(sliceType);
      return this;
    };
    this.record = (timerType) => {
      var _a2;
      timerType.create(__privateGet(this, _clock2).store);
      (_a2 = __privateGet(this, _inspector)) == null ? void 0 : _a2.onRecord(timerType);
      return this;
    };
    this.clearTimer = (timerType) => {
      var _a2;
      __privateGet(this, _clock2).remove(timerType);
      (_a2 = __privateGet(this, _inspector)) == null ? void 0 : _a2.onClear(timerType);
      return this;
    };
    this.isInjected = (sliceType) => __privateGet(this, _container2).has(sliceType);
    this.isRecorded = (timerType) => __privateGet(this, _clock2).has(timerType);
    this.use = (sliceType) => {
      var _a2;
      (_a2 = __privateGet(this, _inspector)) == null ? void 0 : _a2.onUse(sliceType);
      return __privateGet(this, _container2).get(sliceType);
    };
    this.get = (sliceType) => this.use(sliceType).get();
    this.set = (sliceType, value) => this.use(sliceType).set(value);
    this.update = (sliceType, updater) => this.use(sliceType).update(updater);
    this.timer = (timer) => __privateGet(this, _clock2).get(timer);
    this.done = (timer) => {
      var _a2;
      this.timer(timer).done();
      (_a2 = __privateGet(this, _inspector)) == null ? void 0 : _a2.onDone(timer);
    };
    this.wait = (timer) => {
      var _a2;
      const promise = this.timer(timer).start();
      (_a2 = __privateGet(this, _inspector)) == null ? void 0 : _a2.onWait(timer, promise);
      return promise;
    };
    this.waitTimers = async (slice) => {
      await Promise.all(this.get(slice).map((x) => this.wait(x)));
    };
    __privateSet(this, _container2, container);
    __privateSet(this, _clock2, clock);
    __privateSet(this, _meta2, meta);
    if (meta) __privateSet(this, _inspector, new Inspector(container, clock, meta));
  }
  get meta() {
    return __privateGet(this, _meta2);
  }
  get inspector() {
    return __privateGet(this, _inspector);
  }
}, _container2 = new WeakMap(), _clock2 = new WeakMap(), _meta2 = new WeakMap(), _inspector = new WeakMap(), _c);
var Clock = class {
  constructor() {
    this.store = /* @__PURE__ */ new Map();
    this.get = (timer) => {
      const meta = this.store.get(timer.id);
      if (!meta) throw timerNotFound(timer.name);
      return meta;
    };
    this.remove = (timer) => {
      this.store.delete(timer.id);
    };
    this.has = (timer) => {
      return this.store.has(timer.id);
    };
  }
};
var Timer = (_d = class {
  constructor(clock, type) {
    __privateAdd(this, _promise);
    __privateAdd(this, _listener);
    __privateAdd(this, _eventUniqId);
    __privateAdd(this, _status);
    __privateAdd(this, _removeListener);
    __privateAdd(this, _waitTimeout);
    __privateSet(this, _promise, null);
    __privateSet(this, _listener, null);
    __privateSet(this, _status, "pending");
    this.start = () => {
      __privateGet(this, _promise) ?? __privateSet(this, _promise, new Promise((resolve, reject) => {
        __privateSet(this, _listener, (e) => {
          if (!(e instanceof CustomEvent)) return;
          if (e.detail.id === __privateGet(this, _eventUniqId)) {
            __privateSet(this, _status, "resolved");
            __privateGet(this, _removeListener).call(this);
            e.stopImmediatePropagation();
            resolve();
          }
        });
        __privateGet(this, _waitTimeout).call(this, () => {
          if (__privateGet(this, _status) === "pending") __privateSet(this, _status, "rejected");
          __privateGet(this, _removeListener).call(this);
          reject(/* @__PURE__ */ new Error(`Timing ${this.type.name} timeout.`));
        });
        __privateSet(this, _status, "pending");
        addEventListener(this.type.name, __privateGet(this, _listener));
      }));
      return __privateGet(this, _promise);
    };
    this.done = () => {
      const event = new CustomEvent(this.type.name, { detail: { id: __privateGet(this, _eventUniqId) } });
      dispatchEvent(event);
    };
    __privateSet(this, _removeListener, () => {
      if (__privateGet(this, _listener)) removeEventListener(this.type.name, __privateGet(this, _listener));
    });
    __privateSet(this, _waitTimeout, (ifTimeout) => {
      setTimeout(() => {
        ifTimeout();
      }, this.type.timeout);
    });
    __privateSet(this, _eventUniqId, Symbol(type.name));
    this.type = type;
    clock.set(type.id, this);
  }
  get status() {
    return __privateGet(this, _status);
  }
}, _promise = new WeakMap(), _listener = new WeakMap(), _eventUniqId = new WeakMap(), _status = new WeakMap(), _removeListener = new WeakMap(), _waitTimeout = new WeakMap(), _d);
var TimerType = class {
  constructor(name, timeout = 3e3) {
    this.create = (clock) => {
      return new Timer(clock, this);
    };
    this.id = Symbol(`Timer-${name}`);
    this.name = name;
    this.timeout = timeout;
  }
};
var createTimer = (name, timeout = 3e3) => new TimerType(name, timeout);
export {
  Clock as C,
  Container as a,
  Ctx as b,
  createSlice as c,
  createTimer as d
};
