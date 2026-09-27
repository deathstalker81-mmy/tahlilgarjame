import type { LucideIcon } from "lucide-react";

export function ComingSoon({
  icon: Icon,
  title,
  desc,
  phase,
}: {
  icon: LucideIcon;
  title: string;
  desc: string;
  phase?: string;
}) {
  return (
    <div className="card relative flex items-center gap-4 overflow-hidden p-6">
      <div className="absolute -left-6 -top-6 h-24 w-24 rounded-full bg-brand-soft blur-2xl" />
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-soft text-brand">
        <Icon className="h-6 w-6" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-bold sm:text-base">{title}</h3>
          {phase && (
            <span className="rounded-md bg-gold/15 px-1.5 py-0.5 text-[10px] font-semibold text-gold">{phase}</span>
          )}
        </div>
        <p className="mt-1 text-xs leading-5 text-muted sm:text-sm">{desc}</p>
      </div>
    </div>
  );
}
