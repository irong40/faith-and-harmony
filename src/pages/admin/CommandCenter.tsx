import { ArrowUpRight, Clock3 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function CommandCenter() {
  return (
    <main className="mx-auto w-full max-w-[1600px] p-4 md:p-6 lg:p-8">
      <section className="mb-8 flex flex-col gap-5 border-b border-border/70 pb-7 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-3xl">
          <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            <span className="size-2 rounded-full bg-emerald-500 shadow-[0_0_0_4px_hsl(142_71%_45%/0.12)]" />
            Operating picture
          </div>
          <h1 className="text-3xl font-bold tracking-[-0.035em] text-foreground md:text-4xl">
            Company command center
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground md:text-base">
            See what needs your decision, where work is moving, and which part of the company needs attention.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Clock3 className="size-4" />
          Live company status
        </div>
      </section>

      <section className="rounded-2xl border border-dashed border-border bg-card/60 px-6 py-12 text-center shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Command center online
        </p>
        <h2 className="mt-3 text-xl font-semibold">Your operating picture is being assembled</h2>
        <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
          Owner actions, department health, company work, business pulse, and recent activity will load independently here.
        </p>
        <Button variant="outline" className="mt-6 gap-2" asChild>
          <a href="/admin/work">
            Open company work
            <ArrowUpRight className="size-4" />
          </a>
        </Button>
      </section>
    </main>
  );
}
