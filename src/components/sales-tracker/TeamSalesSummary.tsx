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
    <section className="mb-4 grid grid-cols-[minmax(0,1.1fr)_minmax(6.25rem,0.7fr)_minmax(6.25rem,0.7fr)] gap-2 md:gap-3">
      <article className="rounded-xl border border-brand/70 bg-app-panel p-3 shadow-lg shadow-black/10 md:p-4">
        <div className="inline-flex py-0.5 text-[7.5px] font-semibold uppercase tracking-[0.1em] text-brand sm:text-[10px] sm:tracking-[0.14em]">
          Team total this week
        </div>
        <p className="mt-2 font-heading text-xl leading-none text-white sm:text-3xl md:text-4xl">
          {formatMoney(teamStats.total)}
        </p>
      </article>

      <article className="flex flex-col justify-center rounded-xl border border-app-border bg-app-panel p-3 text-left md:p-4">
        <p className="text-[7.5px] uppercase tracking-[0.1em] text-app-muted sm:text-[10px] sm:tracking-[0.14em]">
          Goal days hit
        </p>
        <p className="mt-1 font-heading text-lg text-white sm:text-2xl md:text-3xl">
          {teamStats.daysHit} / {teamStats.daysLogged}
        </p>
      </article>

      <article className="flex flex-col justify-center rounded-xl border border-app-border bg-app-panel p-3 text-left md:p-4">
        <p className="text-[7.5px] uppercase tracking-[0.1em] text-app-muted sm:text-[10px] sm:tracking-[0.14em]">
          Partners
        </p>
        <p className="mt-1 font-heading text-lg text-white sm:text-2xl md:text-3xl">
          {teamStats.referralPartnersAdded}
        </p>
      </article>
    </section>
  );
}
