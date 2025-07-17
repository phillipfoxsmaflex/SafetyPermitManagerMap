import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Search, Download, FileText, Clock, AlertTriangle, CheckCircle, Trash2, X, Calendar, Map, List } from "lucide-react";
import { NavigationHeader } from "@/components/navigation-header";
import { EditPermitModalUnified } from "@/components/edit-permit-modal-unified";
import { PermitTable } from "@/components/permit-table-clean";
import { MapWidget } from "@/components/map-widget";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { DatePicker } from "@/components/ui/date-picker";
import { Pagination, PaginationInfo } from "@/components/ui/pagination";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import type { PermitStats } from "@/lib/types";
import type { Permit, MapBackground } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { isAfter, isBefore, isSameDay, startOfDay, endOfDay } from "date-fns";

export default function Dashboard() {
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedPermit, setSelectedPermit] = useState<Permit | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [selectedMapBackground, setSelectedMapBackground] = useState<MapBackground | null>(null);
  const [mapClickPosition, setMapClickPosition] = useState<{ x: number, y: number } | null>(null);
  const itemsPerPage = 10;
  const { toast } = useToast();
  const { user } = useAuth();
  
  const isAdmin = user?.role === 'admin';

  const { data: stats, isLoading: statsLoading } = useQuery<PermitStats>({
    queryKey: ["/api/permits/stats"],
  });

  const { data: permits = [], isLoading: permitsLoading } = useQuery<Permit[]>({
    queryKey: ["/api/permits"],
  });

  const { data: mapBackgrounds = [] } = useQuery<MapBackground[]>({
    queryKey: ["/api/map-backgrounds"],
  });

  const deletePermitMutation = useMutation({
    mutationFn: async (permitId: number) => {
      const response = await fetch(`/api/permits/${permitId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete permit');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/permits"] });
      queryClient.invalidateQueries({ queryKey: ["/api/permits/stats"] });
      toast({
        title: "Genehmigung gelöscht",
        description: "Die Genehmigung und alle zugehörigen Daten wurden erfolgreich gelöscht.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Fehler beim Löschen",
        description: error.message || "Die Genehmigung konnte nicht gelöscht werden.",
        variant: "destructive",
      });
    },
  });

  const handleMapClick = (x: number, y: number) => {
    setMapClickPosition({ x, y });
    setCreateModalOpen(true);
  };

  const handlePermitClick = (permit: Permit) => {
    setSelectedPermit(permit);
    setEditModalOpen(true);
  };

  const resetMapClick = () => {
    setMapClickPosition(null);
  };

  // Set the first available background when map backgrounds are loaded
  useEffect(() => {
    if (mapBackgrounds.length > 0 && !selectedMapBackground) {
      setSelectedMapBackground(mapBackgrounds[0]);
    }
  }, [mapBackgrounds, selectedMapBackground]);

  const filteredPermits = useMemo(() => {
    let filtered = permits;
    
    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(permit => 
        permit.permitId.toLowerCase().includes(term) ||
        permit.location.toLowerCase().includes(term) ||
        permit.requestorName.toLowerCase().includes(term) ||
        permit.department.toLowerCase().includes(term) ||
        permit.description.toLowerCase().includes(term)
      );
    }
    
    // Apply date filters
    if (dateFrom || dateTo) {
      filtered = filtered.filter(permit => {
        if (!permit.createdAt) return false;
        const permitDate = new Date(permit.createdAt);
        let includePermit = true;
        
        if (dateFrom) {
          includePermit = includePermit && (isSameDay(permitDate, dateFrom) || isAfter(permitDate, startOfDay(dateFrom)));
        }
        
        if (dateTo) {
          includePermit = includePermit && (isSameDay(permitDate, dateTo) || isBefore(permitDate, endOfDay(dateTo)));
        }
        
        return includePermit;
      });
    }
    
    return filtered;
  }, [permits, searchTerm, dateFrom, dateTo]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredPermits.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedPermits = filteredPermits.slice(startIndex, startIndex + itemsPerPage);

  // Reset to first page when filters change
  useMemo(() => {
    setCurrentPage(1);
  }, [searchTerm, dateFrom, dateTo]);

  const handleEditPermit = (permit: Permit) => {
    setSelectedPermit(permit);
    setEditModalOpen(true);
  };

  const handleDeletePermit = (permitId: number) => {
    deletePermitMutation.mutate(permitId);
  };

  const handleExportReport = () => {
    const csvContent = generateCSVReport(permits);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `arbeitserlaubnis-bericht-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({
      title: "Erfolgreich exportiert",
      description: "Der Bericht wurde als CSV-Datei heruntergeladen",
    });
  };

  const generateCSVReport = (permits: Permit[]) => {
    const headers = [
      'Genehmigungsnummer',
      'Typ',
      'Arbeitsort',
      'Antragsteller',
      'Abteilung',
      'Status',
      'Startdatum',
      'Enddatum',
      'Risikostufe',
      'Beschreibung'
    ];

    const getPermitTypeLabel = (type: string) => {
      const typeMap: Record<string, string> = {
        'confined_space': 'Enger Raum',
        'hot_work': 'Heißarbeiten',
        'electrical': 'Elektrische Arbeiten',
        'chemical': 'Chemische Arbeiten',
        'height': 'Höhenarbeiten',
        'general_permit': 'Allgemeiner Erlaubnisschein',
      };
      return typeMap[type] || type;
    };

    const rows = permits.map(permit => [
      permit.permitId,
      getPermitTypeLabel(permit.type),
      permit.location,
      permit.requestorName,
      permit.department,
      permit.status,
      permit.startDate ? new Date(permit.startDate).toLocaleDateString('de-DE') : 'Nicht angegeben',
      permit.endDate ? new Date(permit.endDate).toLocaleDateString('de-DE') : 'Nicht angegeben',
      permit.riskLevel || 'Nicht angegeben',
      permit.description.replace(/,/g, ';') // Replace commas to avoid CSV issues
    ]);

    return [headers, ...rows]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <NavigationHeader />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Dashboard Header */}
        <div className="mb-6">
          <div className="mb-4">
            <h2 className="text-xl sm:text-2xl font-bold text-industrial-gray mb-2">
              Genehmigungsverwaltung Dashboard
            </h2>
            <p className="text-secondary-gray text-sm sm:text-base">
              Überwachung und Verwaltung von Permit to work für enge Räume und chemische Umgebungen
            </p>
          </div>
          
          {/* Search and filters - Mobile-first layout */}
          <div className="space-y-3 mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary-gray w-4 h-4" />
              <Input
                placeholder="Genehmigung suchen..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full"
              />
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3">
              <DatePicker
                date={dateFrom}
                onDateChange={setDateFrom}
                placeholder="Von Datum"
                className="flex-1"
              />
              <DatePicker
                date={dateTo}
                onDateChange={setDateTo}
                placeholder="Bis Datum"
                className="flex-1"
              />
              {(dateFrom || dateTo) && (
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    setDateFrom(undefined);
                    setDateTo(undefined);
                  }}
                  className="h-10 w-10 sm:flex-shrink-0"
                  title="Filter zurücksetzen"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
          
          {/* Action buttons - Stacked on mobile */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button 
              onClick={handleExportReport}
              variant="outline"
              className="flex items-center justify-center gap-2 w-full sm:w-auto"
            >
              <Download className="w-4 h-4" />
              <span className="whitespace-nowrap">Bericht exportieren</span>
            </Button>
            <Button 
              onClick={() => setCreateModalOpen(true)}
              className="bg-safety-blue text-white hover:bg-blue-700 flex items-center justify-center gap-2 w-full sm:w-auto"
            >
              <Plus className="w-4 h-4" />
              <span className="whitespace-nowrap">Neue Genehmigung</span>
            </Button>
            
            {/* View Mode Toggle */}
            <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg">
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
                className="px-3 py-1"
              >
                <List className="w-4 h-4 mr-1" />
                Liste
              </Button>
              <Button
                variant={viewMode === 'map' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('map')}
                className="px-3 py-1"
              >
                <Map className="w-4 h-4 mr-1" />
                Karte
              </Button>
            </div>
          </div>
        </div>

        {/* Quick Stats - Mobile optimized */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6 mb-6">
          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                <div className="mb-2 sm:mb-0">
                  <p className="text-xs sm:text-sm font-medium text-secondary-gray">Aktive Genehmigungen</p>
                  <p className="text-xl sm:text-3xl font-bold text-safety-blue">
                    {statsLoading ? "..." : stats?.activePermits || 0}
                  </p>
                </div>
                <div className="bg-blue-50 p-2 sm:p-3 rounded-lg self-end sm:self-auto">
                  <FileText className="text-safety-blue text-lg sm:text-xl" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                <div className="mb-2 sm:mb-0">
                  <p className="text-xs sm:text-sm font-medium text-secondary-gray">Genehmigung ausstehend</p>
                  <p className="text-xl sm:text-3xl font-bold text-warning-orange">
                    {statsLoading ? "..." : stats?.pendingApproval || 0}
                  </p>
                </div>
                <div className="bg-orange-50 p-2 sm:p-3 rounded-lg self-end sm:self-auto">
                  <Clock className="text-warning-orange text-lg sm:text-xl" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                <div className="mb-2 sm:mb-0">
                  <p className="text-xs sm:text-sm font-medium text-secondary-gray">Abgeschlossen</p>
                  <p className="text-xl sm:text-3xl font-bold text-safety-green">
                    {statsLoading ? "..." : stats?.completed || 0}
                  </p>
                </div>
                <div className="bg-green-50 p-2 sm:p-3 rounded-lg self-end sm:self-auto">
                  <CheckCircle className="text-safety-green text-lg sm:text-xl" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        {viewMode === 'list' ? (
          <>
            {/* Permits Table */}
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-industrial-gray mb-4">
                {searchTerm ? `Suchergebnisse (${filteredPermits.length})` : 'Aktuelle Genehmigungen'}
              </h3>
            </div>
            <PermitTable 
              permits={paginatedPermits} 
              isLoading={permitsLoading} 
              onEdit={handleEditPermit} 
              onDelete={handleDeletePermit}
              isAdmin={isAdmin}
            />

            {/* Pagination Controls */}
            {filteredPermits.length > 0 && (
              <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                <PaginationInfo
                  currentPage={currentPage}
                  itemsPerPage={itemsPerPage}
                  totalItems={filteredPermits.length}
                />
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                />
              </div>
            )}
          </>
        ) : (
          /* Map View */
          <MapWidget
            onPermitClick={handlePermitClick}
            onMapClick={handleMapClick}
            showFilters={true}
            mode="create"
            selectedMapBackground={selectedMapBackground}
            onMapBackgroundChange={setSelectedMapBackground}
            resetTrigger={mapClickPosition ? 0 : Date.now()}
          />
        )}
      </main>

      {/* Mobile Floating Action Button */}
      <Button
        className="fixed bottom-6 right-6 bg-safety-blue text-white p-4 rounded-full shadow-lg md:hidden z-40"
        size="icon"
        onClick={() => setCreateModalOpen(true)}
      >
        <Plus className="h-6 w-6" />
      </Button>

      <EditPermitModalUnified
        permit={null}
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        mode="create"
        mapClickPosition={mapClickPosition}
        onMapReset={() => setMapClickPosition(null)}
      />
      
      <EditPermitModalUnified
        permit={selectedPermit}
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        mode="edit"
      />
    </div>
  );
}
