import {
  calculateTeamStats,
  formatMoney,
} from "@/lib/sales-tracker/calculations";
import type { SalesRepWithEntries } from "@/lib/sales-tracker/types";

export function TeamSalesSummary({
  repsWithEntries,
}: {
  repsWithEntries: SalesRepWithEntries[];
}) {
  const teamStats = calculateTeamStats(repsWithEntries);

  return (
    <section className="mb-4 grid gap-3 lg:grid-cols-[1.6fr_1fr]">
      <article className="rounded-2xl border-2 border-brand/70 bg-app-panel p-5 shadow-2xl shadow-black/10">
        <div className="inline-flex rounded-full border border-brand/40 bg-[#e72027]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-brand">
          Team total this week
        </div>
        <p className="mt-4 font-heading text-5xl leading-none text-white md:text-6xl">
          {formatMoney(teamStats.total)}
        </p>
        <p className="mt-3 max-w-xl text-sm text-app-muted">
          Live total from all logged sales on the selected week.
        </p>
      </article>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
        <article className="rounded-2xl border border-app-border bg-app-panel p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-app-muted">
            Goal days hit
          </p>
          <p className="mt-2 font-heading text-4xl text-white">
            {teamStats.daysHit} / {teamStats.daysLogged}
          </p>
        </article>
        <article className="rounded-2xl border border-app-border bg-app-panel p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-app-muted">
            Logged days
          </p>
          <p className="mt-2 font-heading text-4xl text-white">
            {teamStats.daysLogged}
          </p>
        </article>
      </div>
    </section>
  );
}
