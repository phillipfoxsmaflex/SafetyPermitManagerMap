import { WORKFLOW_CONFIG } from "@/lib/workflow-config";
import { Badge } from "@/components/ui/badge";

interface StatusIndicatorProps {
  status: string;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function StatusIndicator({ status, showLabel = true, size = 'md', className }: StatusIndicatorProps) {
  const config = WORKFLOW_CONFIG[status];
  
  if (!config) {
    return (
      <Badge variant="secondary" className={className}>
        {status}
      </Badge>
    );
  }

  const sizeClasses = {
    sm: 'w-2 h-2 text-xs',
    md: 'w-3 h-3 text-sm',
    lg: 'w-4 h-4 text-base'
  };

  if (!showLabel) {
    return (
      <div 
        className={`${sizeClasses[size].split(' ').slice(0, 2).join(' ')} rounded-full ${config.bgColor.replace('bg-', 'bg-').replace('-100', '-500')} ${className}`}
        title={config.label}
      />
    );
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className={`${sizeClasses[size].split(' ').slice(0, 2).join(' ')} rounded-full ${config.bgColor.replace('bg-', 'bg-').replace('-100', '-500')}`} />
      <span className={`${sizeClasses[size].split(' ')[2]} font-medium ${config.textColor}`}>
        {config.label}
      </span>
    </div>
  );
}