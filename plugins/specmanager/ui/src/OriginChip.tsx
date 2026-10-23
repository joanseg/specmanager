import { FeatureOrigin, StudySummary } from "./types";

/**
 * Research provenance pill on a Builder row label (design screen 6).
 * Keyed by the stable `S<n>` item id rather than `#rank`, since ranks can change on re-synthesis.
 * Switches to the "strategy updated · vA→vB" variant when the strategy has moved past the handoff version.
 */
export default function OriginChip({
  origin,
  study,
  onOpen,
}: {
  origin: FeatureOrigin;
  study?: StudySummary;
  onOpen: (strategyId: string) => void;
}) {
  const studyTitle = study?.title ?? origin.studyId;
  const current = study?.docs.find((d) => d.id === origin.strategyId)?.version;
  const updated = current !== undefined && current > origin.strategyVersion;
  const tooltip = [
    `From ${studyTitle}, build list item ${origin.itemId} (${origin.item})`,
    `Handed off from ${origin.strategyId} v${origin.strategyVersion}.`,
    updated
      ? `The strategy is now v${current}. The PRD is not marked stale; review the strategy and update the PRD by hand if it matters.`
      : "Its PRD reads the strategy and research docs.",
    "Click to open the strategy",
  ].join("\n");
  return (
    <button
      type="button"
      className={`chip-origin${updated ? " chip-origin--updated" : ""}`}
      onClick={() => onOpen(origin.strategyId)}
      title={tooltip}
    >
      <span className="ring" />
      <span className="chip-origin__text">{updated ? "strategy updated" : `from ${studyTitle}`}</span>
      <span className="meta">· {updated ? `v${origin.strategyVersion}→v${current}` : origin.itemId}</span>
    </button>
  );
}
