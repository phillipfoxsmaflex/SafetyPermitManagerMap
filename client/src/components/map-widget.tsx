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
  Layers,
  Wrench
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
  resetTrigger?: number;
}

export function MapWidget({ 
  onPermitClick, 
  onMapClick, 
  showFilters = true,
  mode = 'view',
  selectedMapBackground,
  onMapBackgroundChange,
  resetTrigger
}: MapWidgetProps) {
  const [selectedPermit, setSelectedPermit] = useState<Permit | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [showingCreateMode, setShowingCreateMode] = useState(false);
  const [newPermitPosition, setNewPermitPosition] = useState<{ x: number, y: number } | null>(null);
  const [hoveredPermit, setHoveredPermit] = useState<Permit | null>(null);
  const [mousePosition, setMousePosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
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
      case 'active': return { fill: '#22c55e', stroke: '#16a34a' }; // Grün - In Bearbeitung
      case 'pending': return { fill: '#3b82f6', stroke: '#2563eb' }; // Blau - Geplant
      case 'approved': return { fill: '#eab308', stroke: '#ca8a04' }; // Gelb - Genehmigt/Wartend
      case 'expired': return { fill: '#ef4444', stroke: '#dc2626' }; // Rot - Dringend/Abgelaufen
      case 'completed': return { fill: '#10b981', stroke: '#059669' }; // Grün - Abgeschlossen
      default: return { fill: '#6b7280', stroke: '#4b5563' }; // Grau - Unbekannt
    }
  };

  const getStatusColorClass = (status: string) => {
    switch(status.toLowerCase()) {
      case 'active': return 'bg-green-500 border-green-600';
      case 'pending': return 'bg-blue-500 border-blue-600';
      case 'approved': return 'bg-yellow-500 border-yellow-600';
      case 'expired': return 'bg-red-500 border-red-600';
      case 'completed': return 'bg-emerald-500 border-emerald-600';
      default: return 'bg-gray-500 border-gray-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch(status.toLowerCase()) {
      case 'active': return <Wrench className="w-4 h-4" />; // In Bearbeitung
      case 'pending': return <Clock className="w-4 h-4" />; // Geplant
      case 'approved': return <AlertTriangle className="w-4 h-4" />; // Genehmigt/Wartend
      case 'expired': return <AlertTriangle className="w-4 h-4" />; // Dringend
      case 'completed': return <CheckCircle className="w-4 h-4" />; // Abgeschlossen
      default: return <MapPin className="w-4 h-4" />;
    }
  };

  const getStatusText = (status: string) => {
    switch(status.toLowerCase()) {
      case 'active': return 'In Bearbeitung';
      case 'pending': return 'Geplant';
      case 'approved': return 'Genehmigt';
      case 'expired': return 'Dringend';
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
      
      // Convert to SVG coordinates more accurately
      const svgX = (x / rect.width) * 800;
      const svgY = (y / rect.height) * 600;
      
      console.log('Map click coordinates:', { x, y, svgX, svgY, rect });
      
      setNewPermitPosition({ x: svgX, y: svgY });
      
      if (onMapClick) {
        onMapClick(svgX, svgY);
      }
    }
  };

  const handleMouseMove = (event: React.MouseEvent<SVGElement>) => {
    setMousePosition({ x: event.clientX, y: event.clientY });
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

  // Reset position when resetTrigger changes
  useEffect(() => {
    if (resetTrigger !== undefined) {
      setNewPermitPosition(null);
    }
  }, [resetTrigger]);

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
                    onMouseMove={handleMouseMove}
                    onMouseLeave={() => setHoveredPermit(null)}
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
                    {filteredPermits.map((permit) => {
                      const statusColor = getStatusColor(permit.status);
                      const x = permit.mapPositionX || (100 + Math.random() * 600);
                      const y = permit.mapPositionY || (100 + Math.random() * 400);
                      const isSelected = selectedPermit?.id === permit.id;
                      const isHovered = hoveredPermit?.id === permit.id;
                      
                      return (
                        <g key={permit.id}>
                          {/* Selection ring */}
                          {isSelected && (
                            <circle
                              cx={x}
                              cy={y}
                              r="18"
                              fill="none"
                              stroke="#3b82f6"
                              strokeWidth="3"
                              className="animate-pulse"
                            />
                          )}
                          
                          {/* Main marker */}
                          <circle
                            cx={x}
                            cy={y}
                            r={isHovered ? "15" : isSelected ? "14" : "12"}
                            fill={statusColor.fill}
                            stroke={isSelected ? "#3b82f6" : statusColor.stroke}
                            strokeWidth={isSelected ? "3" : "2"}
                            className="cursor-pointer transition-all duration-200"
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePermitClick(permit);
                            }}
                            onMouseEnter={() => setHoveredPermit(permit)}
                            onMouseLeave={() => setHoveredPermit(null)}
                          />
                          
                          {/* Permit Number text above the marker */}
                          <text
                            x={x}
                            y={y - 20}
                            textAnchor="middle"
                            fill="black"
                            fontSize="11"
                            fontWeight="bold"
                            className="pointer-events-none"
                          >
                            {permit.permitId}
                          </text>
                        </g>
                      );
                    })}
                    
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
                  <span className="text-sm">In Bearbeitung</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
                  <span className="text-sm">Geplant</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-yellow-500 rounded-full"></div>
                  <span className="text-sm">Genehmigt</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-red-500 rounded-full"></div>
                  <span className="text-sm">Dringend</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-emerald-500 rounded-full"></div>
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
                {filteredPermits.map((permit) => (
                  <div
                    key={permit.id}
                    className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                      selectedPermit?.id === permit.id 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'hover:bg-gray-50'
                    }`}
                    onClick={() => handlePermitClick(permit)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${getStatusColorClass(permit.status)}`}></div>
                          <span className="font-medium text-sm">{permit.permitId}</span>
                        </div>
                        <div className="text-xs text-gray-600 mt-1">
                          {getPermitTypeLabel(permit.type)}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {permit.location}
                        </div>
                      </div>
                      <div className="flex flex-col items-end">
                        <Badge variant="outline" className={`${getStatusColorClass(permit.status)} text-white border-white text-xs`}>
                          {getStatusText(permit.status)}
                        </Badge>
                        <div className="text-xs text-gray-400 mt-1">
                          {getStatusIcon(permit.status)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {filteredPermits.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <MapPin className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Keine Genehmigungen gefunden</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Statistiken</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span>Gesamt:</span>
                  <span className="font-medium">{filteredPermits.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>In Bearbeitung:</span>
                  <span className="font-medium text-green-600">
                    {filteredPermits.filter(p => p.status === 'active').length}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Geplant:</span>
                  <span className="font-medium text-blue-600">
                    {filteredPermits.filter(p => p.status === 'pending').length}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Genehmigt:</span>
                  <span className="font-medium text-yellow-600">
                    {filteredPermits.filter(p => p.status === 'approved').length}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Dringend:</span>
                  <span className="font-medium text-red-600">
                    {filteredPermits.filter(p => p.status === 'expired').length}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Abgeschlossen:</span>
                  <span className="font-medium text-emerald-600">
                    {filteredPermits.filter(p => p.status === 'completed').length}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}