import { FormEvent, useState } from "react";
import { createStudyApi } from "./api";

const STEPS = ["market", "docs", "plan", "marketing", "findings", "strategy", "handoff"];
const CLI_CMD = '/specmanager-research "<idea>" new';

/** Display-only mirror of the server's `slugify`; the server's `uniqueSlug` wins. */
function slugify(input: string): string {
  return (
    input
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "feature"
  );
}

function copy(text: string): void {
  void navigator.clipboard?.writeText(text);
}

function StartStudyForm() {
  const [title, setTitle] = useState("");
  const [idea, setIdea] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const slug = slugify(title);
  const ready = title.trim() !== "" && idea.trim() !== "";

  const submit = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await createStudyApi(title.trim(), idea.trim());
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="empty-research__form" onSubmit={submit}>
      <h3>Or start one here</h3>
      <div className="field">
        <label htmlFor="study-title">Study name</label>
        <input id="study-title" className="input" value={title} onInput={(e) => setTitle(e.currentTarget.value)} />
        <div className="hint">slug: {title.trim() ? slug : "…"}</div>
      </div>
      <div className="field">
        <label htmlFor="study-idea">Idea or market</label>
        <textarea
          id="study-idea"
          className="input input--area"
          value={idea}
          onInput={(e) => setIdea(e.currentTarget.value)}
        />
        <div className="hint">one line · the researcher uses this as its brief</div>
      </div>
      <div className="empty-research__actions">
        <button type="submit" className="btn btn--primary" disabled={!ready || busy}>Start study</button>
        <span>
          then run <span className="mono">/specmanager-research {title.trim() ? slug : "<slug>"} market</span>
        </span>
      </div>
      {error && <div className="empty-research__error" role="alert">{error}</div>}
    </form>
  );
}

/** Researcher empty state: explains the mode, shows the starting rail, and offers the start form. */
export default function EmptyResearch() {
  return (
    <section className="empty-research">
      <div className="empty-research__intro">
        <h2>No studies yet</h2>
        <p>
          A study takes one product idea or market from desk research to an ordered build list. Claude drafts each
          doc in your session. You run the interviews and drop the notes in. Each study is independent, so you can
          run several at once.
        </p>
        <ol className="steps">
          {STEPS.map((s) => (
            <li key={s}><i />{s}</li>
          ))}
        </ol>
        <div className="empty-research__lead">Start from Claude Code:</div>
        <button type="button" className="cmd" onClick={() => copy(CLI_CMD)} title="copy to clipboard">
          {CLI_CMD}
        </button>
      </div>
      <StartStudyForm />
    </section>
  );
}
