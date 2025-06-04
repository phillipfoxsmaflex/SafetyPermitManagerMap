import { Badge } from "@/components/ui/badge";

interface PermitStatusBadgeProps {
  status: string;
}

export function PermitStatusBadge({ status }: PermitStatusBadgeProps) {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'active':
        return {
          label: 'Active',
          className: 'bg-green-100 text-safety-green hover:bg-green-100',
        };
      case 'pending':
        return {
          label: 'Pending',
          className: 'bg-orange-100 text-warning-orange hover:bg-orange-100',
        };
      case 'expired':
        return {
          label: 'Expired',
          className: 'bg-red-100 text-alert-red hover:bg-red-100',
        };
      case 'completed':
        return {
          label: 'Completed',
          className: 'bg-blue-100 text-safety-blue hover:bg-blue-100',
        };
      case 'approved':
        return {
          label: 'Approved',
          className: 'bg-green-100 text-safety-green hover:bg-green-100',
        };
      case 'rejected':
        return {
          label: 'Rejected',
          className: 'bg-red-100 text-alert-red hover:bg-red-100',
        };
      default:
        return {
          label: status,
          className: 'bg-gray-100 text-gray-600 hover:bg-gray-100',
        };
    }
  };

  const config = getStatusConfig(status);

  return (
    <Badge variant="secondary" className={config.className}>
      {config.label}
    </Badge>
  );
}
