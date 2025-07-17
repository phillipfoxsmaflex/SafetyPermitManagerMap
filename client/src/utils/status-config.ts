// Unified status configuration for both list and map views
export const getStatusConfig = (status: string) => {
  switch (status.toLowerCase()) {
    case 'active':
      return {
        label: 'Aktiv',
        badgeClassName: 'bg-green-100 text-safety-green hover:bg-green-100',
        mapFill: '#22c55e',
        mapStroke: '#16a34a',
        mapColorClass: 'bg-green-500 border-green-600',
      };
    case 'pending':
      return {
        label: 'Ausstehend',
        badgeClassName: 'bg-orange-100 text-warning-orange hover:bg-orange-100',
        mapFill: '#f97316',
        mapStroke: '#ea580c',
        mapColorClass: 'bg-orange-500 border-orange-600',
      };

    case 'completed':
      return {
        label: 'Abgeschlossen',
        badgeClassName: 'bg-blue-100 text-safety-blue hover:bg-blue-100',
        mapFill: '#3b82f6',
        mapStroke: '#2563eb',
        mapColorClass: 'bg-blue-500 border-blue-600',
      };
    case 'approved':
      return {
        label: 'Genehmigt',
        badgeClassName: 'bg-green-100 text-safety-green hover:bg-green-100',
        mapFill: '#eab308',
        mapStroke: '#ca8a04',
        mapColorClass: 'bg-yellow-500 border-yellow-600',
      };
    case 'rejected':
      return {
        label: 'Abgelehnt',
        badgeClassName: 'bg-red-100 text-alert-red hover:bg-red-100',
        mapFill: '#ef4444',
        mapStroke: '#dc2626',
        mapColorClass: 'bg-red-500 border-red-600',
      };
    case 'draft':
      return {
        label: 'Entwurf',
        badgeClassName: 'bg-gray-100 text-gray-600 hover:bg-gray-100',
        mapFill: '#6b7280',
        mapStroke: '#4b5563',
        mapColorClass: 'bg-gray-500 border-gray-600',
      };
    default:
      return {
        label: status,
        badgeClassName: 'bg-gray-100 text-gray-600 hover:bg-gray-100',
        mapFill: '#6b7280',
        mapStroke: '#4b5563',
        mapColorClass: 'bg-gray-500 border-gray-600',
      };
  }
};