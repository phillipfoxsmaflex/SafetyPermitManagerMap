import { Badge } from "@/components/ui/badge";
import { getStatusConfig } from '@/utils/status-config';

interface PermitStatusBadgeProps {
  status: string;
}

export function PermitStatusBadge({ status }: PermitStatusBadgeProps) {
  const config = getStatusConfig(status);

  return (
    <Badge variant="secondary" className={config.badgeClassName}>
      {config.label}
    </Badge>
  );
}
