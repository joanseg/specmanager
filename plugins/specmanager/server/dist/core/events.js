import { EventEmitter } from "node:events";
class TypedBus {
    bus = new EventEmitter();
    emit(event) {
        this.bus.emit("event", event);
    }
    on(listener) {
        this.bus.on("event", listener);
        return () => this.bus.off("event", listener);
    }
}
export const events = new TypedBus();
//# sourceMappingURL=events.js.map