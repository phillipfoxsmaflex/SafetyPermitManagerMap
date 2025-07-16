import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { 
  MapPin, 
  Search, 
  Plus, 
  Eye, 
  Edit, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Filter,
  X,
  Layers
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Permit, MapBackground, WorkLocation } from '@shared/schema';

interface MapWidgetProps {
  onPermitClick?: (permit: Permit) => void;
  onMapClick?: (x: number, y: number) => void;
  showFilters?: boolean;
  mode?: 'view' | 'create';
  selectedMapBackground?: MapBackground | null;
  onMapBackgroundChange?: (background: MapBackground) => void;
}

export function MapWidget({ 
  onPermitClick, 
  onMapClick, 
  showFilters = true,
  mode = 'view',
  selectedMapBackground,
  onMapBackgroundChange
}: MapWidgetProps) {
  const [selectedPermit, setSelectedPermit] = useState<Permit | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [showingCreateMode, setShowingCreateMode] = useState(false);
  const [newPermitPosition, setNewPermitPosition] = useState<{ x: number, y: number } | null>(null);
  const { toast } = useToast();

  const { data: permits = [], isLoading: permitsLoading } = useQuery<Permit[]>({
    queryKey: ["/api/permits/map"],
  });

  const { data: mapBackgrounds = [], isLoading: backgroundsLoading } = useQuery<MapBackground[]>({
    queryKey: ["/api/map-backgrounds"],
  });

  const { data: workLocations = [] } = useQuery<WorkLocation[]>({
    queryKey: ["/api/work-locations/active"],
  });

  // Default background if none selected
  const currentBackground = selectedMapBackground || mapBackgrounds[0];

  // Debug logging
  useEffect(() => {
    console.log('MapWidget - mapBackgrounds:', mapBackgrounds);
    console.log('MapWidget - selectedMapBackground:', selectedMapBackground);
    console.log('MapWidget - currentBackground:', currentBackground);
  }, [mapBackgrounds, selectedMapBackground, currentBackground]);

  const getStatusColor = (status: string) => {
    switch(status.toLowerCase()) {
      case 'active': return 'bg-green-500 border-green-600';
      case 'pending': return 'bg-yellow-500 border-yellow-600';
      case 'approved': return 'bg-blue-500 border-blue-600';
      case 'expired': return 'bg-red-500 border-red-600';
      case 'completed': return 'bg-gray-500 border-gray-600';
      default: return 'bg-gray-500 border-gray-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch(status.toLowerCase()) {
      case 'active': return <CheckCircle className="w-4 h-4" />;
      case 'pending': return <Clock className="w-4 h-4" />;
      case 'approved': return <CheckCircle className="w-4 h-4" />;
      case 'expired': return <AlertTriangle className="w-4 h-4" />;
      case 'completed': return <CheckCircle className="w-4 h-4" />;
      default: return <MapPin className="w-4 h-4" />;
    }
  };

  const getStatusText = (status: string) => {
    switch(status.toLowerCase()) {
      case 'active': return 'Aktiv';
      case 'pending': return 'Ausstehend';
      case 'approved': return 'Genehmigt';
      case 'expired': return 'Abgelaufen';
      case 'completed': return 'Abgeschlossen';
      default: return status;
    }
  };

  const getPermitTypeLabel = (type: string) => {
    const typeLabels: Record<string, string> = {
      'hot_work': 'Heißarbeiten',
      'confined_space': 'Enger Raum',
      'electrical': 'Elektrische Arbeiten',
      'chemical': 'Chemische Arbeiten',
      'maintenance': 'Wartungsarbeiten',
      'general': 'Allgemeine Genehmigung'
    };
    return typeLabels[type] || type;
  };

  const filteredPermits = permits.filter(permit => {
    const matchesSearch = permit.permitId.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         permit.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         permit.location.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || permit.status === statusFilter;
    const matchesType = typeFilter === 'all' || permit.type === typeFilter;
    
    return matchesSearch && matchesStatus && matchesType;
  });

  const handleMapClick = (event: React.MouseEvent<SVGElement>) => {
    if (mode === 'create' || showingCreateMode) {
      const rect = event.currentTarget.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      
      // Convert to SVG coordinates
      const svgX = (x / rect.width) * 800;
      const svgY = (y / rect.height) * 600;
      
      setNewPermitPosition({ x: svgX, y: svgY });
      
      if (onMapClick) {
        onMapClick(svgX, svgY);
      }
    }
  };

  const handlePermitClick = (permit: Permit) => {
    setSelectedPermit(permit);
    if (onPermitClick) {
      onPermitClick(permit);
    }
  };

  const resetCreateMode = () => {
    setShowingCreateMode(false);
    setNewPermitPosition(null);
  };

  if (permitsLoading || backgroundsLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Kartenansicht
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-secondary-gray">Lade Kartenansicht...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-2">
          <MapPin className="w-5 h-5" />
          <h2 className="text-xl font-semibold">Kartenansicht</h2>
        </div>
        
        <div className="flex items-center gap-2">
          {mapBackgrounds.length > 1 && (
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4" />
              <Select
                value={currentBackground?.id.toString() || ''}
                onValueChange={(value) => {
                  const background = mapBackgrounds.find(bg => bg.id === parseInt(value));
                  if (background && onMapBackgroundChange) {
                    onMapBackgroundChange(background);
                  }
                }}
              >
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Kartenansicht wählen" />
                </SelectTrigger>
                <SelectContent>
                  {mapBackgrounds.map((bg) => (
                    <SelectItem key={bg.id} value={bg.id.toString()}>
                      {bg.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          
          {mode === 'view' && (
            <Button
              variant={showingCreateMode ? "destructive" : "default"}
              onClick={() => setShowingCreateMode(!showingCreateMode)}
            >
              {showingCreateMode ? (
                <>
                  <X className="w-4 h-4 mr-2" />
                  Abbrechen
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Neue Genehmigung
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="w-4 h-4" />
              Filter
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="search">Suche</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="search"
                    placeholder="Permit-ID, Beschreibung oder Ort..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="status">Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle Status</SelectItem>
                    <SelectItem value="active">Aktiv</SelectItem>
                    <SelectItem value="pending">Ausstehend</SelectItem>
                    <SelectItem value="approved">Genehmigt</SelectItem>
                    <SelectItem value="expired">Abgelaufen</SelectItem>
                    <SelectItem value="completed">Abgeschlossen</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="type">Typ</Label>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle Typen</SelectItem>
                    <SelectItem value="hot_work">Heißarbeiten</SelectItem>
                    <SelectItem value="confined_space">Enger Raum</SelectItem>
                    <SelectItem value="electrical">Elektrische Arbeiten</SelectItem>
                    <SelectItem value="chemical">Chemische Arbeiten</SelectItem>
                    <SelectItem value="maintenance">Wartungsarbeiten</SelectItem>
                    <SelectItem value="general">Allgemeine Genehmigung</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Map Container */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Map */}
        <div className="lg:col-span-2">
          <Card>
            <CardContent className="p-4">
              {(showingCreateMode || mode === 'create') && (
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <Plus className="w-4 h-4 inline mr-1" />
                    Klicken Sie auf die Karte, um eine neue Genehmigung an dieser Position zu erstellen
                  </p>
                </div>
              )}
              
              <div className="bg-gray-50 rounded-lg border-2 border-gray-200 relative overflow-hidden">
                {currentBackground ? (
                  <svg
                    width="100%"
                    height="600"
                    viewBox="0 0 800 600"
                    className="cursor-pointer"
                    onClick={handleMapClick}
                  >
                    {/* Background Image */}
                    <image
                      href={currentBackground.imagePath}
                      width="800"
                      height="600"
                      preserveAspectRatio="xMidYMid slice"
                      onError={(e) => {
                        console.error('Failed to load map background image:', currentBackground.imagePath);
                        console.error('Error event:', e);
                      }}
                      onLoad={() => {
                        console.log('Successfully loaded map background image:', currentBackground.imagePath);
                      }}
                    />
                    
                    {/* Permit Markers */}
                    {filteredPermits.map((permit) => (
                      <g key={permit.id}>
                        <circle
                          cx={permit.mapPositionX || 100}
                          cy={permit.mapPositionY || 100}
                          r="12"
                          className={`${getStatusColor(permit.status)} cursor-pointer stroke-2 hover:scale-110 transition-transform`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePermitClick(permit);
                          }}
                        />
                        <text
                          x={permit.mapPositionX || 100}
                          y={(permit.mapPositionY || 100) + 4}
                          textAnchor="middle"
                          className="text-white text-xs font-bold pointer-events-none"
                        >
                          {permit.id}
                        </text>
                      </g>
                    ))}
                    
                    {/* Work Location Markers */}
                    {workLocations.map((location) => (
                      location.mapPositionX && location.mapPositionY && (
                        <g key={location.id}>
                          <rect
                            x={location.mapPositionX - 8}
                            y={location.mapPositionY - 8}
                            width="16"
                            height="16"
                            className="fill-gray-400 stroke-gray-600 stroke-1 opacity-70"
                          />
                          <text
                            x={location.mapPositionX}
                            y={location.mapPositionY + 20}
                            textAnchor="middle"
                            className="text-xs font-medium fill-gray-700"
                          >
                            {location.name}
                          </text>
                        </g>
                      )
                    ))}
                    
                    {/* New Permit Position Preview */}
                    {newPermitPosition && (
                      <circle
                        cx={newPermitPosition.x}
                        cy={newPermitPosition.y}
                        r="12"
                        className="fill-blue-300 stroke-blue-500 stroke-2 opacity-70 animate-pulse"
                      />
                    )}
                  </svg>
                ) : (
                  <div className="h-96 flex items-center justify-center bg-gray-100 rounded-lg">
                    <div className="text-center">
                      <MapPin className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                      <p className="text-gray-600">Kein Kartenhintergrund verfügbar</p>
                      <p className="text-sm text-gray-500 mt-2">
                        Laden Sie einen Kartenhintergrund in den Einstellungen hoch
                      </p>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Legend */}
              <div className="mt-4 flex flex-wrap gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-green-500 rounded-full"></div>
                  <span className="text-sm">Aktiv</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-yellow-500 rounded-full"></div>
                  <span className="text-sm">Ausstehend</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
                  <span className="text-sm">Genehmigt</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-red-500 rounded-full"></div>
                  <span className="text-sm">Abgelaufen</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-gray-500 rounded-full"></div>
                  <span className="text-sm">Abgeschlossen</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Genehmigungen ({filteredPermits.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {filteredPermits.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <MapPin className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>Keine Genehmigungen gefunden</p>
                  </div>
                ) : (
                  filteredPermits.map((permit) => (
                    <div
                      key={permit.id}
                      className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                        selectedPermit?.id === permit.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => handlePermitClick(permit)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className={getStatusColor(permit.status)}>
                              {getStatusText(permit.status)}
                            </Badge>
                            <span className="font-medium text-sm">{permit.permitId}</span>
                          </div>
                          <p className="text-xs text-gray-600 mb-1">{permit.description}</p>
                          <p className="text-xs text-gray-500">{permit.location}</p>
                          <p className="text-xs text-gray-500">{getPermitTypeLabel(permit.type)}</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-xs bg-gray-100 px-2 py-1 rounded">#{permit.id}</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Selected Permit Details */}
          {selectedPermit && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Status:</span>
                    <Badge variant="outline" className={getStatusColor(selectedPermit.status)}>
                      {getStatusIcon(selectedPermit.status)}
                      <span className="ml-1">{getStatusText(selectedPermit.status)}</span>
                    </Badge>
                  </div>
                  
                  <Separator />
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Typ:</span>
                      <span>{getPermitTypeLabel(selectedPermit.type)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Antragsteller:</span>
                      <span>{selectedPermit.requestorName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Abteilung:</span>
                      <span>{selectedPermit.department}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Ort:</span>
                      <span>{selectedPermit.location}</span>
                    </div>
                    {selectedPermit.startDate && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Startdatum:</span>
                        <span>{new Date(selectedPermit.startDate).toLocaleDateString('de-DE')}</span>
                      </div>
                    )}
                    {selectedPermit.endDate && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Enddatum:</span>
                        <span>{new Date(selectedPermit.endDate).toLocaleDateString('de-DE')}</span>
                      </div>
                    )}
                  </div>
                  
                  <Separator />
                  
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="flex-1">
                      <Eye className="w-3 h-3 mr-1" />
                      Anzeigen
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1">
                      <Edit className="w-3 h-3 mr-1" />
                      Bearbeiten
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}