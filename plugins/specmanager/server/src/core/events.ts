import { EventEmitter } from "node:events";

export type SpecEvent =
  | { type: "feature.created"; featureId: string }
  | { type: "document.created"; documentId: string; featureId: string }
  | { type: "document.updated"; documentId: string; featureId: string; version: number }
  | { type: "status.changed"; documentId: string; from: string; to: string }
  | { type: "stale.flagged"; documentId: string; cause: string }
  | { type: "stale.cleared"; documentId: string }
  | { type: "task.updated"; taskId: string; featureId: string }
  | { type: "file.changed"; filePath: string }
  | { type: "feature.shipped"; featureId: string }
  | { type: "design.synced"; path: string; mode: "init" | "refresh" };

class TypedBus {
  private bus = new EventEmitter();
  emit(event: SpecEvent): void {
    this.bus.emit("event", event);
  }
  on(listener: (event: SpecEvent) => void): () => void {
    this.bus.on("event", listener);
    return () => this.bus.off("event", listener);
  }
}

export const events = new TypedBus();
