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
    <section className="mb-4 grid grid-cols-[minmax(0,1.25fr)_minmax(7rem,0.75fr)] gap-3">
      <article className="rounded-2xl border border-brand/70 bg-app-panel p-4 shadow-xl shadow-black/10">
        <div className="inline-flex rounded-full border border-brand/40 bg-[#e72027]/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-brand">
          Team total this week
        </div>
        <p className="mt-3 font-heading text-2xl leading-none text-white sm:text-4xl md:text-5xl">
          {formatMoney(teamStats.total)}
        </p>
      </article>

      <article className="flex flex-col justify-center rounded-2xl border border-app-border bg-app-panel p-4 text-left">
        <p className="text-[10px] uppercase tracking-[0.14em] text-app-muted">
          Goal days hit
        </p>
        <p className="mt-2 font-heading text-2xl text-white sm:text-3xl">
          {teamStats.daysHit} / {teamStats.daysLogged}
        </p>
      </article>
    </section>
  );
}
