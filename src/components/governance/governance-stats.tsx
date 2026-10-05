import { Stat } from "@/components/ui/stat";
import type { GovernanceStats as Stats } from "@/lib/governance/types";
import { formatCount } from "@/utils/format";

export function GovernanceStats({ stats }: { stats: Stats }) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      <Stat label="Active proposals" value={formatCount(stats.active)} hint="Voting open now" />
      <Stat
        label="Total proposals"
        value={formatCount(stats.total)}
        hint={`${formatCount(stats.community)} community · ${formatCount(stats.council)} council`}
      />
      <Stat label="Passed" value={formatCount(stats.passed)} hint="Succeeded, executing or completed" />
      <Stat
        label="Defeated or vetoed"
        value={formatCount(stats.defeated)}
        hint={`${formatCount(stats.cancelled)} cancelled`}
      />
    </div>
  );
}
