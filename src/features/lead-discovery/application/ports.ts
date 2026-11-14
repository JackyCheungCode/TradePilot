import type { DiscoveryRun, DiscoveryRunInput, DiscoveryLog } from "../domain/model";
export interface DiscoveryGateway { start(input: DiscoveryRunInput): Promise<DiscoveryRun>; getRun(id: string): Promise<DiscoveryRun & { logs: DiscoveryLog[] }>; }
