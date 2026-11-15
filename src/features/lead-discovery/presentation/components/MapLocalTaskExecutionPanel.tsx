import { Button, Heading, InlineLoading, Layer, ProgressBar, Stack, Tag, Tile } from "@carbon/react";
import { Activity, ArrowRight, Time as Clock, Terminal } from "@carbon/icons-react";
import type { DiscoveryLog, DiscoveryRun } from "../../domain/model";

const statusLabels: Record<string, string> = {
  queued: "排队中",
  running: "执行中",
  completed: "已完成",
  partial: "部分完成",
  failed: "失败",
  cancelled: "已取消",
};
const statusTypes: Record<string, "gray" | "blue" | "green" | "red" | "warm-gray"> = {
  queued: "warm-gray",
  running: "blue",
  completed: "green",
  partial: "warm-gray",
  failed: "red",
  cancelled: "gray",
};
const logTypes: Record<DiscoveryLog["level"], "blue" | "green" | "warm-gray" | "red"> = {
  info: "blue",
  success: "green",
  warning: "warm-gray",
  error: "red",
};

export function MapLocalTaskExecutionPanel({
  run,
  logs,
  query,
  providers,
  running,
  progress,
  onOpenResults,
  onOpenTasks,
}: {
  run: DiscoveryRun | null;
  logs: DiscoveryLog[];
  query: string;
  providers: string;
  running: boolean;
  progress: number;
  onOpenResults: () => void;
  onOpenTasks: () => void;
}) {
  const active = Boolean(run);
  const clampedProgress = Math.max(0, Math.min(100, progress));
  return (
    <Tile>
      <Stack gap={5}>
        <Stack gap={2}>
          <Stack orientation="horizontal" gap={3}>
            <Activity size={20} aria-hidden="true" />
            <Heading className="cds--type-productive-heading-03">任务执行中心</Heading>
            {run ? <Tag type={statusTypes[run.status] ?? "gray"}>{statusLabels[run.status] ?? run.status}</Tag> : null}
          </Stack>
          <p className="cds--type-body-compact-01">实时显示地图与本地商家数据源查询状态。</p>
        </Stack>

        <Layer>
          <Tile>
        {active && run ? (
          <Stack gap={4}>
            <Stack gap={2}>
              <p className="cds--type-label-01">当前任务</p>
              <p className="cds--type-code-01">{run.taskCode ?? run.id}</p>
              <p className="cds--type-helper-text-01">{[query, providers].filter(Boolean).join(" · ")}</p>
            </Stack>
            <Stack gap={2}>
              <ProgressBar label="任务进度" value={clampedProgress} max={100} />
              {running ? <InlineLoading status="active" description="正在连接数据源并查询" /> : null}
              {running && clampedProgress === 0 ? <p className="cds--type-helper-text-01">首次返回结果前进度可能保持在 0%。</p> : null}
              <p className="cds--type-body-compact-01">{run.message ?? "任务已创建"}</p>
              <p className="cds--type-helper-text-01">{run.discoveredCount ?? 0} 个候选 · {run.createdLeadCount ?? 0} 条草稿</p>
            </Stack>
            <Stack orientation="horizontal" gap={3}>
              <Button kind="tertiary" size="md" renderIcon={ArrowRight} onClick={onOpenResults}>查看搜索结果</Button>
              <Button kind="ghost" size="md" onClick={onOpenTasks}>查看全部任务</Button>
            </Stack>
          </Stack>
        ) : (
          <Stack gap={3}>
            <Stack orientation="horizontal" gap={3}>
              <Clock size={20} aria-hidden="true" />
              <Heading className="cds--type-productive-heading-02">尚未启动发现任务</Heading>
            </Stack>
            <p className="cds--type-body-compact-01">配置目标国家、省州、城市和关键词后，点击开始发现潜在客户。</p>
          </Stack>
        )}
          </Tile>
        </Layer>

        <Layer>
          <Tile>
        <Stack gap={3}>
          <Stack orientation="horizontal" gap={3}>
            <Terminal size={20} aria-hidden="true" />
            <Heading className="cds--type-productive-heading-02">实时执行日志</Heading>
            <Tag type="gray">{logs.length}</Tag>
          </Stack>
          <div role="log" aria-label="任务执行日志" aria-live="polite" style={{ maxHeight: 320, overflowY: "auto", overflowX: "hidden" }}>
            {logs.length ? (
              <Stack gap={3}>
                {logs.map((log) => (
                  <Stack key={log.id} gap={2}>
                    <Stack orientation="horizontal" gap={3}>
                      <span className="cds--type-caption-01">{new Date(log.createdAt).toLocaleTimeString()}</span>
                      <Tag type={logTypes[log.level]}>{log.level}</Tag>
                    </Stack>
                    <p className="cds--type-body-compact-01">{log.message}</p>
                  </Stack>
                ))}
              </Stack>
            ) : (
              <p className="cds--type-body-compact-01">任务启动后，执行日志会显示在这里。</p>
            )}
          </div>
        </Stack>
          </Tile>
        </Layer>
      </Stack>
    </Tile>
  );
}
