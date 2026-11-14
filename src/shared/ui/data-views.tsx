import type { ReactNode } from "react";
import { Search, X } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { Button, Input } from "@/shared/ui/primitives";

export function SearchControlPanel({
  search,
  onSearchChange,
  searchPlaceholder = "搜索…",
  filters,
  actions,
  activeFilters = false,
  onClear,
  resultCount,
  className,
}: {
  search?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  filters?: ReactNode;
  actions?: ReactNode;
  activeFilters?: boolean;
  onClear?: () => void;
  resultCount?: ReactNode;
  className?: string;
}) {
  return (
    <section aria-label="搜索与筛选" className={cn("tp-search-control-panel flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between", className)}>
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
        {onSearchChange ? (
          <div className="relative min-w-[180px] flex-1 sm:max-w-[320px]">
            <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={search ?? ""} onChange={(event) => onSearchChange(event.target.value)} placeholder={searchPlaceholder} aria-label={searchPlaceholder} className="h-9 pl-9" />
          </div>
        ) : null}
        {filters}
        {activeFilters && onClear ? (
          <Button type="button" variant="ghost" size="sm" onClick={onClear} className="h-9">
            <X aria-hidden="true" className="h-3.5 w-3.5" />清除筛选
          </Button>
        ) : null}
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        {resultCount ? <span className="text-xs tabular-nums text-muted-foreground">{resultCount}</span> : null}
        {actions}
      </div>
    </section>
  );
}

export function ListViewShell({ children, footer, className }: { children: ReactNode; footer?: ReactNode; className?: string }) {
  return (
    <section className={cn("tp-list-view min-w-0", className)}>
      <div className="min-w-0">{children}</div>
      {footer ? <footer className="mt-3 flex flex-wrap items-center justify-between gap-3 bg-muted/25 px-3 py-2.5">{footer}</footer> : null}
    </section>
  );
}

export function FormLayout({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("tp-form-layout space-y-5", className)}>{children}</div>;
}

export function FormSection({ title, description, children, className }: { title: string; description?: string; children: ReactNode; className?: string }) {
  return (
    <section className={cn("tp-form-section space-y-3", className)}>
      <div className="space-y-1">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {description ? <p className="text-xs leading-5 text-muted-foreground">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}

export function FormField({ label, required = false, description, error, children, className }: {
  label: string;
  required?: boolean;
  description?: string;
  error?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0 space-y-1.5", className)}>
      <div className="flex flex-col items-start gap-1.5">
        <span className="flex items-center gap-1 text-[13px] font-medium text-foreground">
          {label}
          {required ? <span aria-label="必填" className="text-destructive">*</span> : null}
        </span>
        {children}
      </div>
      {description ? <p className="text-xs leading-5 text-muted-foreground">{description}</p> : null}
      {error ? <p role="alert" className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

const statusTone: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  planned: "bg-muted text-muted-foreground",
  queued: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
  running: "bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-200",
  partial: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
  succeeded: "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200",
  awaiting_approval: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
  approved: "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200",
  rejected: "bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-200",
  expired: "bg-muted text-muted-foreground",
  pending: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
  review: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
  active: "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200",
  completed: "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200",
  issued: "bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-200",
  cancelled: "bg-muted text-muted-foreground",
  void: "bg-muted text-muted-foreground",
  archived: "bg-muted text-muted-foreground",
  failed: "bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-200",
};

export function StatusBadge({ status, label, className }: { status: string; label: string; className?: string }) {
  return <span data-status={status} className={cn("inline-flex items-center rounded-[4px] px-2 py-0.5 text-[11px] font-medium", statusTone[status] ?? "bg-muted text-muted-foreground", className)}>{label}</span>;
}
