import { format } from "date-fns";
import { de } from "date-fns/locale";
import { Clock, User } from "lucide-react";
import { WORKFLOW_CONFIG } from "@/lib/workflow-config";

interface StatusHistoryEntry {
  status: string;
  timestamp: string;
  userId?: number;
  userName?: string;
  comment?: string;
}

interface StatusTimelineProps {
  statusHistory: StatusHistoryEntry[];
  currentStatus: string;
  className?: string;
}

export function StatusTimeline({ statusHistory, currentStatus, className }: StatusTimelineProps) {
  // Parse status history if it's a JSON string
  const parsedHistory = typeof statusHistory === 'string' 
    ? JSON.parse(statusHistory || '[]') 
    : statusHistory || [];

  // Add current status if not in history
  const allEntries = [...parsedHistory];
  if (allEntries.length === 0 || allEntries[allEntries.length - 1].status !== currentStatus) {
    allEntries.push({
      status: currentStatus,
      timestamp: new Date().toISOString(),
      comment: 'Aktueller Status'
    });
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <h4 className="font-medium text-gray-900 flex items-center gap-2">
        <Clock className="h-4 w-4" />
        Status-Verlauf
      </h4>
      
      <div className="space-y-3">
        {allEntries.map((entry, index) => {
          const config = WORKFLOW_CONFIG[entry.status];
          const isLatest = index === allEntries.length - 1;
          
          return (
            <div key={index} className="flex items-start gap-3">
              {/* Timeline indicator */}
              <div className="flex flex-col items-center">
                <div className={`w-3 h-3 rounded-full ${config?.bgColor || 'bg-gray-100'} border-2 border-white shadow-sm`} />
                {!isLatest && (
                  <div className="w-px h-6 bg-gray-200 mt-1" />
                )}
              </div>
              
              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-sm font-medium ${config?.textColor || 'text-gray-800'}`}>
                    {config?.label || entry.status}
                  </span>
                  {isLatest && (
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                      Aktuell
                    </span>
                  )}
                </div>
                
                <div className="text-xs text-gray-500 mb-1">
                  {format(new Date(entry.timestamp), 'dd.MM.yyyy HH:mm', { locale: de })}
                </div>
                
                {entry.userName && (
                  <div className="flex items-center gap-1 text-xs text-gray-600 mb-1">
                    <User className="h-3 w-3" />
                    {entry.userName}
                  </div>
                )}
                
                {entry.comment && (
                  <div className="text-xs text-gray-600 italic">
                    {entry.comment}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}