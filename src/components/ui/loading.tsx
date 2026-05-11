import type { ReactNode } from "react";

type SkeletonProps = {
  className?: string;
};

export function LoadingSpinner({ className = "h-4 w-4" }: SkeletonProps) {
  return (
    <span
      aria-hidden="true"
      className={`inline-block rounded-full border-2 border-current border-r-transparent align-[-0.125em] motion-safe:animate-spin ${className}`}
    />
  );
}

export function SkeletonBlock({ className = "" }: SkeletonProps) {
  return (
    <span
      aria-hidden="true"
      className={`skeleton-shimmer block rounded bg-app-border/70 ${className}`}
    />
  );
}

export function SkeletonCard() {
  return (
    <article className="rounded-xl border border-app-border bg-app-panel p-3">
      <div className="mb-3 flex gap-1">
        <SkeletonBlock className="h-2 w-10 rounded-full" />
        <SkeletonBlock className="h-2 w-8 rounded-full" />
      </div>
      <SkeletonBlock className="h-4 w-5/6" />
      <SkeletonBlock className="mt-2 h-4 w-2/3" />
      <div className="mt-4 flex items-center gap-2">
        <SkeletonBlock className="h-6 w-16 rounded-full" />
        <SkeletonBlock className="h-6 w-20 rounded-full" />
      </div>
      <SkeletonBlock className="mt-4 h-1.5 w-full rounded-full" />
    </article>
  );
}

export function DashboardWidgetSkeleton() {
  return (
    <article className="rounded-xl border border-app-border bg-black/60 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <SkeletonBlock className="h-3 w-24" />
          <SkeletonBlock className="mt-3 h-7 w-32" />
        </div>
        <SkeletonBlock className="h-7 w-16 rounded-full" />
      </div>
      <SkeletonBlock className="mt-5 h-3 w-full" />
      <SkeletonBlock className="mt-2 h-3 w-3/4" />
    </article>
  );
}

export function CommentsSkeleton() {
  return (
    <div className="space-y-2" aria-hidden="true">
      {[0, 1, 2].map((item) => (
        <div
          key={item}
          className="rounded border border-app-border bg-app-base px-3 py-2"
        >
          <div className="flex items-center gap-2">
            <SkeletonBlock className="h-7 w-7 rounded-full" />
            <div className="flex-1">
              <SkeletonBlock className="h-3 w-24" />
              <SkeletonBlock className="mt-2 h-3 w-full" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function TaskModalSkeleton() {
  return (
    <div className="grid flex-1 overflow-hidden md:grid-cols-[1fr_260px]">
      <div className="space-y-4 p-4">
        <section className="rounded-xl border border-app-border bg-black p-3">
          <SkeletonBlock className="h-4 w-24" />
          <SkeletonBlock className="mt-3 h-28 w-full" />
        </section>
        <section className="rounded-xl border border-app-border bg-black p-3">
          <div className="flex items-center justify-between">
            <SkeletonBlock className="h-4 w-20" />
            <SkeletonBlock className="h-3 w-10" />
          </div>
          <SkeletonBlock className="mt-3 h-2 w-full rounded-full" />
          <CommentsSkeleton />
        </section>
        <section className="rounded-xl border border-app-border bg-black p-3">
          <SkeletonBlock className="h-4 w-32" />
          <SkeletonBlock className="mt-3 h-10 w-full" />
          <SkeletonBlock className="mt-2 h-10 w-5/6" />
        </section>
      </div>
      <aside className="space-y-4 border-t border-app-border bg-app-base p-4 md:border-l md:border-t-0">
        {[0, 1, 2].map((item) => (
          <section
            key={item}
            className="rounded-xl border border-app-border bg-app-panel p-3"
          >
            <SkeletonBlock className="h-4 w-20" />
            <SkeletonBlock className="mt-3 h-9 w-full" />
            <SkeletonBlock className="mt-2 h-9 w-full" />
          </section>
        ))}
      </aside>
    </div>
  );
}

export function PageLoader({ label = "Loading dashboard" }: { label?: string }) {
  return (
    <main className="min-h-screen bg-app-base p-4 md:p-6" aria-busy="true">
      <div className="mb-4 flex items-center justify-between rounded-2xl border border-app-border bg-app-panel p-4">
        <div className="flex items-center gap-3">
          <SkeletonBlock className="h-11 w-11 rounded-xl" />
          <div>
            <SkeletonBlock className="h-3 w-20" />
            <SkeletonBlock className="mt-2 h-7 w-56" />
          </div>
        </div>
        <div className="hidden items-center gap-2 md:flex">
          <SkeletonBlock className="h-8 w-28 rounded" />
          <SkeletonBlock className="h-8 w-24 rounded" />
          <SkeletonBlock className="h-8 w-20 rounded" />
        </div>
      </div>

      <div className="mb-4 rounded-2xl border border-app-border bg-app-panel/95 p-3">
        <SkeletonBlock className="h-8 w-full" />
        <div className="mt-3 flex flex-wrap gap-2">
          {[0, 1, 2, 3, 4, 5].map((item) => (
            <SkeletonBlock key={item} className="h-7 w-24 rounded-full" />
          ))}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="rounded-2xl border border-app-border bg-app-panel p-4 lg:col-span-3">
          <div className="flex items-center gap-2 text-sm text-app-muted">
            <LoadingSpinner />
            {label}
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <DashboardWidgetSkeleton />
            <DashboardWidgetSkeleton />
            <DashboardWidgetSkeleton />
          </div>
        </section>
        {[0, 1, 2, 3, 4, 5].map((item) => (
          <SkeletonCard key={item} />
        ))}
      </div>
    </main>
  );
}

export function SectionLoadingOverlay({ label }: { label: string }) {
  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-app-panel/70 backdrop-blur-[2px]">
      <div className="flex items-center gap-2 rounded-full border border-app-border bg-app-panel px-3 py-2 text-xs font-semibold text-app-muted shadow-lg">
        <LoadingSpinner className="h-3.5 w-3.5" />
        {label}
      </div>
    </div>
  );
}

export function EmptyState({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="rounded-lg border border-dashed border-app-border bg-app-base px-3 py-4 text-sm">
      <p className="font-semibold text-white">{title}</p>
      {description ? (
        <p className="mt-1 text-xs text-app-muted">{description}</p>
      ) : null}
    </div>
  );
}

export function LoadingButton({
  isLoading,
  children,
  loadingLabel = "Working",
  className,
  disabled,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  isLoading?: boolean;
  loadingLabel?: string;
  children: ReactNode;
}) {
  return (
    <button
      {...props}
      disabled={disabled || isLoading}
      className={`${className ?? ""} inline-flex items-center justify-center gap-2 disabled:cursor-wait disabled:opacity-70`}
    >
      {isLoading ? <LoadingSpinner className="h-3.5 w-3.5" /> : null}
      <span>{isLoading ? loadingLabel : children}</span>
    </button>
  );
}
