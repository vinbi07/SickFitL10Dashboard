import type { NotesSlideData } from "@/lib/member-kpi/presentationTypes";

interface Props {
  data: NotesSlideData;
  onPresentationNoteChange: (note: string) => void;
}

function NoteSection({
  title,
  items,
  accentClass,
  emptyText,
}: {
  title: string;
  items: string[];
  accentClass: string;
  emptyText: string;
}) {
  return (
    <div className="rounded-xl border border-app-border bg-app-base p-4">
      <h3 className={`mb-3 text-xs font-semibold uppercase tracking-[0.12em] ${accentClass}`}>
        {title}
      </h3>
      {items.length === 0 ? (
        <p className="text-xs text-app-muted italic">{emptyText}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((item, idx) => (
            <li key={idx} className="flex items-start gap-2 text-sm text-white">
              <span className={`mt-0.5 shrink-0 text-xs ${accentClass}`}>•</span>
              <span className="leading-snug">{item}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function MemberNotesSlide({ data, onPresentationNoteChange }: Props) {
  const hasContent =
    data.wins.length > 0 ||
    data.blockers.length > 0 ||
    data.notes.length > 0 ||
    data.presentationNote.trim();

  return (
    <div className="flex min-h-[420px] flex-col">
      <div className="mb-4">
        <h2 className="font-heading text-2xl text-white">Wins, Blockers &amp; Notes</h2>
        <p className="mt-1 text-sm text-app-muted">Key context for this review</p>
      </div>

      {!hasContent && (
        <div className="mb-4 rounded-xl border border-app-border bg-app-base px-4 py-3 text-xs text-app-muted">
          No wins, blockers, or notes recorded yet. Add a presentation note below.
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <NoteSection
          title="✓ Wins"
          items={data.wins}
          accentClass="text-emerald-500"
          emptyText="No wins recorded."
        />
        <NoteSection
          title="⚠ Blockers"
          items={data.blockers}
          accentClass="text-amber-500"
          emptyText="No blockers recorded."
        />
        <NoteSection
          title="📋 Notes"
          items={data.notes}
          accentClass="text-blue-400"
          emptyText="No additional notes."
        />
      </div>

      {/* Presentation note textarea */}
      <div className="mt-4">
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-app-muted">
          Meeting Callout (Presentation Note)
        </label>
        <textarea
          value={data.presentationNote}
          onChange={(e) => onPresentationNoteChange(e.target.value)}
          placeholder="Add a note or callout for this meeting presentation..."
          rows={3}
          className="w-full rounded-lg border border-app-border bg-app-panel px-3 py-2 text-sm text-white placeholder:text-app-muted focus:outline-none focus:ring-1 focus:ring-brand resize-none"
        />
      </div>
    </div>
  );
}
