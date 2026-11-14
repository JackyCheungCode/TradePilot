import type { ReactNode } from "react";
import { Activity, ArrowRight, Clock3, LoaderCircle } from "lucide-react";
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Progress } from "@/shared/ui/primitives";
import { StatusBadge } from "@/shared/ui/data-views";

const statusLabels: Record<string, string> = {
  queued: "排队中",
  running: "执行中",
  completed: "已完成",
  partial: "部分完成",
  failed: "失败",
  cancelled: "已取消",
};

export function TaskExecutionPanel({
  title = "任务执行中心",
  description,
  status,
  taskCode,
  taskHref,
  query,
  providers,
  progress = 0,
  message,
  count,
  countLabel = "个发现对象",
  summary,
  progressNote,
  isRunning = false,
  emptyTitle,
  emptyDescription,
  resultsHref,
  tasksHref = "/lead-discovery/tasks",
  children,
}: {
  title?: string;
  description: string;
  status?: string;
  taskCode?: string;
  taskHref?: string;
  query?: string;
  providers?: string;
  progress?: number;
  message?: string;
  count?: number;
  countLabel?: string;
  summary?: ReactNode;
  progressNote?: string;
  isRunning?: boolean;
  emptyTitle: string;
  emptyDescription: string;
  resultsHref?: string;
  tasksHref?: string;
  children: ReactNode;
}) {
  const active = Boolean(status);
  const clampedProgress = Math.max(0, Math.min(100, progress));
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Activity aria-hidden="true" className="h-5 w-5" />
              <CardTitle>{title}</CardTitle>
            </div>
            <CardDescription>{description}</CardDescription>
          </div>
          {status ? <StatusBadge status={status} label={statusLabels[status] ?? status} /> : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {active ? (
          <>
            <div className="flex items-end justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium">当前任务</p>
                {taskHref ? <a href={taskHref} className="mt-1 inline-flex items-center gap-1 font-mono text-xs text-primary hover:underline">{taskCode ?? "打开任务"}<ArrowRight aria-hidden="true" className="h-3 w-3" /></a> : <p className="mt-1 font-mono text-xs">{taskCode ?? "—"}</p>}
                {query || providers ? <p className="mt-1 break-words text-xs text-muted-foreground">{[query, providers].filter(Boolean).join(" · ")}</p> : null}
              </div>
              <p className="text-xl font-semibold tabular-nums sm:text-2xl">{clampedProgress}%</p>
            </div>
            <div className="flex items-center gap-2">
              {isRunning ? <LoaderCircle aria-label="任务执行中" className="h-4 w-4 shrink-0 animate-spin text-primary" /> : null}
              <Progress value={clampedProgress} className="h-2.5 flex-1" />
            </div>
            {isRunning && clampedProgress === 0 && progressNote ? <p className="text-xs text-muted-foreground">{progressNote}</p> : null}
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
              <span>{message ?? "任务已创建"}</span>
              {summary ?? (count !== undefined ? <span className="tabular-nums">{count} {countLabel}</span> : null)}
            </div>
            <div className="flex flex-wrap gap-2">
              {resultsHref ? <Button size="sm" variant="outline" onClick={() => { window.location.href = resultsHref; }}>查看搜索结果<ArrowRight className="h-4 w-4" /></Button> : null}
              {tasksHref ? <Button size="sm" variant="ghost" onClick={() => { window.location.href = tasksHref; }}>查看全部任务</Button> : null}
            </div>
          </>
        ) : (
          <div className="rounded-lg bg-muted/30 p-6 text-center sm:p-8">
            <Clock3 aria-hidden="true" className="mx-auto mb-2 h-5 w-5 text-muted-foreground" />
            <p className="text-sm font-medium">{emptyTitle}</p>
            <p className="mt-1 text-xs text-muted-foreground">{emptyDescription}</p>
          </div>
        )}
        <div className="h-px w-full bg-border" />
        {children}
      </CardContent>
    </Card>
  );
}
