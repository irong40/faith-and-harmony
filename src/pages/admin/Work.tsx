import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Work() {
  return (
    <main className="mx-auto w-full max-w-[1600px] p-4 md:p-6 lg:p-8">
      <section className="mb-8 flex flex-col gap-5 border-b border-border/70 pb-7 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Operational authority
          </p>
          <h1 className="text-3xl font-bold tracking-[-0.035em] text-foreground md:text-4xl">
            Company work
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground md:text-base">
            Plan, assign, approve, and close work across every department.
          </p>
        </div>
        <Button className="gap-2 self-start sm:self-auto">
          <Plus className="size-4" />
          New work
        </Button>
      </section>
    </main>
  );
}
