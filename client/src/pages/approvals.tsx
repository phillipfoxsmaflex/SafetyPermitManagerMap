import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { NavigationHeader } from "@/components/navigation-header";
import { 
  CheckCircle, 
  Clock, 
  FileText, 
  AlertTriangle,
  User,
  Calendar,
  Circle,
  MapPin,
  Building,
  Phone,
  Shield,
  Eye,
  ArrowLeft,
  Home
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import type { Permit } from "@shared/schema";

export default function Approvals() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("pending");
  const [viewingPermit, setViewingPermit] = useState<Permit | null>(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);

  const { data: permits = [], isLoading } = useQuery<Permit[]>({
    queryKey: ["/api/permits"],
  });

  const { data: currentUser } = useQuery<{ role: string }>({
    queryKey: ["/api/auth/user"],
  });

  const approvePermitMutation = useMutation({
    mutationFn: async ({ permitId, approvalType }: { permitId: number; approvalType: 'department_head' | 'maintenance' }) => {
      const response = await fetch(`/api/permits/${permitId}/approve`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ approvalType }),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/permits"] });
      toast({
        title: "Genehmigung erteilt",
        description: "Die Arbeitserlaubnis wurde erfolgreich genehmigt.",
      });
    },
    onError: (error) => {
      toast({
        title: "Fehler",
        description: "Die Genehmigung konnte nicht erteilt werden.",
        variant: "destructive",
      });
    },
  });

  const rejectPermitMutation = useMutation({
    mutationFn: async ({ permitId, reason }: { permitId: number; reason: string }) => {
      const response = await fetch(`/api/permits/${permitId}/reject`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ reason }),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/permits"] });
      toast({
        title: "Genehmigung abgelehnt",
        description: "Die Arbeitserlaubnis wurde abgelehnt.",
      });
    },
    onError: (error) => {
      toast({
        title: "Fehler",
        description: "Die Ablehnung konnte nicht verarbeitet werden.",
        variant: "destructive",
      });
    },
  });

  // Filter permits based on user role and approval requirements
  const getPendingPermits = () => {
    if (!currentUser) return [];
    
    return permits.filter((permit: Permit) => {
      // Department head approvals
      if (currentUser.role === 'supervisor' || currentUser.role === 'admin') {
        return permit.status === 'pending' && !permit.departmentHeadApproval;
      }
      
      // Maintenance/Engineering approvals
      if (currentUser.role === 'maintenance' || currentUser.role === 'admin') {
        return permit.status === 'pending' && !permit.maintenanceApproval;
      }
      
      return false;
    });
  };

  const getApprovedPermits = () => {
    return permits.filter((permit: Permit) => permit.status === 'approved');
  };

  const getMyApprovals = () => {
    if (!currentUser) return [];
    
    return permits.filter((permit: Permit) => {
      if (currentUser.role === 'supervisor' || currentUser.role === 'admin') {
        return permit.departmentHeadApproval;
      }
      if (currentUser.role === 'maintenance' || currentUser.role === 'admin') {
        return permit.maintenanceApproval;
      }
      return false;
    });
  };

  const handleView = (permit: Permit) => {
    setViewingPermit(permit);
    setViewModalOpen(true);
  };

  const handleApprove = (permit: Permit) => {
    let approvalType: 'department_head' | 'maintenance';
    
    if (currentUser?.role === 'supervisor' || currentUser?.role === 'admin') {
      approvalType = 'department_head';
    } else if (currentUser?.role === 'maintenance') {
      approvalType = 'maintenance';
    } else {
      return;
    }
    
    approvePermitMutation.mutate({ permitId: permit.id, approvalType });
  };

  const handleReject = (permit: Permit) => {
    const reason = prompt("Grund für die Ablehnung:");
    if (reason) {
      rejectPermitMutation.mutate({ permitId: permit.id, reason });
    }
  };

  const PermitCard = ({ permit }: { permit: Permit }) => (
    <Card className="mb-4">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg text-industrial-gray">{permit.permitId}</CardTitle>
            <p className="text-sm text-secondary-gray mt-1">{permit.type}</p>
          </div>
          <div className="flex gap-2">
            <Badge variant={permit.status === 'pending' ? 'destructive' : 'default'}>
              {permit.status === 'pending' ? 'Ausstehend' : 'Genehmigt'}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-secondary-gray" />
            <span>{permit.location}</span>
          </div>
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-secondary-gray" />
            <span>{permit.requestorName}</span>
          </div>
          <div className="flex items-center gap-2">
            <Building className="h-4 w-4 text-secondary-gray" />
            <span>{permit.department}</span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-secondary-gray" />
            <span>
              {permit.startDate ? format(new Date(permit.startDate), "dd.MM.yyyy", { locale: de }) : 'N/A'} - 
              {permit.endDate ? format(new Date(permit.endDate), "dd.MM.yyyy", { locale: de }) : 'N/A'}
            </span>
          </div>
        </div>

        <Separator />

        <div className="text-sm">
          <p className="font-medium text-industrial-gray mb-2">Beschreibung:</p>
          <p className="text-secondary-gray">{permit.description}</p>
        </div>

        {permit.riskLevel && (
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-warning-orange" />
            <span className="text-sm">Risikostufe: {permit.riskLevel}</span>
          </div>
        )}

        <Separator />

        <div className="space-y-2">
          <p className="font-medium text-industrial-gray text-sm">Genehmigungs-Status:</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div className={`flex items-center gap-2 p-2 rounded ${permit.departmentHeadApproval ? 'bg-green-50' : 'bg-orange-50'}`}>
              {permit.departmentHeadApproval ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <Clock className="h-4 w-4 text-orange-600" />
              )}
              <span className="text-sm">
                Abteilungsleiter: {permit.departmentHeadApproval ? 'Genehmigt' : 'Ausstehend'}
              </span>
            </div>
            <div className={`flex items-center gap-2 p-2 rounded ${permit.maintenanceApproval ? 'bg-green-50' : 'bg-orange-50'}`}>
              {permit.maintenanceApproval ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <Clock className="h-4 w-4 text-orange-600" />
              )}
              <span className="text-sm">
                Instandhaltung/Engineering: {permit.maintenanceApproval ? 'Genehmigt' : 'Ausstehend'}
              </span>
            </div>
          </div>
        </div>

        {permit.status === 'pending' && (
          <div className="flex gap-2 pt-2">
            <Button 
              onClick={() => handleApprove(permit)}
              className="bg-green-600 hover:bg-green-700 text-white"
              disabled={approvePermitMutation.isPending}
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Genehmigen
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => handleReject(permit)}
              disabled={rejectPermitMutation.isPending}
            >
              Ablehnen
            </Button>
          </div>
        )}
        <div className="flex gap-2 pt-2">
          <Button 
            size="sm" 
            variant="outline"
            onClick={() => handleView(permit)}
          >
            <Eye className="w-4 h-4 mr-1" />
            Ansehen
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-safety-blue mx-auto"></div>
            <p className="mt-2 text-secondary-gray">Lade Genehmigungen...</p>
          </div>
        </div>
      </div>
    );
  }

  const pendingPermits = getPendingPermits();
  const approvedPermits = getApprovedPermits();
  const myApprovals = getMyApprovals();

  return (
    <div className="min-h-screen bg-gray-50">
      <NavigationHeader />
      
      <div className="container mx-auto p-6">
        {/* Breadcrumb Navigation */}
        <div className="flex items-center gap-2 mb-6">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm" className="text-secondary-gray hover:text-industrial-gray">
              <Home className="w-4 h-4 mr-2" />
              Dashboard
            </Button>
          </Link>
          <span className="text-secondary-gray">/</span>
          <span className="text-industrial-gray font-medium">Genehmigungen</span>
        </div>

        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-industrial-gray">Genehmigungen</h1>
            <p className="text-secondary-gray mt-2">
              Verwalten Sie Arbeitserlaubnis-Genehmigungen
            </p>
          </div>
          <Link href="/dashboard">
            <Button variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Zurück zum Dashboard
            </Button>
          </Link>
        </div>

      <Alert className="mb-6 border-blue-200 bg-blue-50">
        <Shield className="h-4 w-4 text-safety-blue" />
        <AlertDescription className="text-industrial-gray">
          <strong>Genehmigungsverfahren:</strong> Jede Arbeitserlaubnis benötigt mindestens die Genehmigung eines Abteilungsleiters und der Instandhaltung/Engineering.
        </AlertDescription>
      </Alert>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="pending" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Ausstehend ({pendingPermits.length})
          </TabsTrigger>
          <TabsTrigger value="approved" className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            Genehmigt ({approvedPermits.length})
          </TabsTrigger>
          <TabsTrigger value="my-approvals" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Meine Genehmigungen ({myApprovals.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          <div className="space-y-4">
            {pendingPermits.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <Clock className="h-12 w-12 text-secondary-gray mx-auto mb-4" />
                  <p className="text-industrial-gray">Keine ausstehenden Genehmigungen</p>
                  <p className="text-secondary-gray text-sm">
                    Alle Arbeitserlaubnisse wurden bearbeitet oder Sie haben keine Genehmigungsrechte.
                  </p>
                </CardContent>
              </Card>
            ) : (
              pendingPermits.map((permit: Permit) => (
                <PermitCard key={permit.id} permit={permit} />
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="approved">
          <div className="space-y-4">
            {approvedPermits.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <CheckCircle className="h-12 w-12 text-secondary-gray mx-auto mb-4" />
                  <p className="text-industrial-gray">Keine genehmigten Arbeitserlaubnisse</p>
                  <p className="text-secondary-gray text-sm">
                    Es wurden noch keine Arbeitserlaubnisse vollständig genehmigt.
                  </p>
                </CardContent>
              </Card>
            ) : (
              approvedPermits.map((permit: Permit) => (
                <PermitCard key={permit.id} permit={permit} />
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="my-approvals">
          <div className="space-y-4">
            {myApprovals.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <User className="h-12 w-12 text-secondary-gray mx-auto mb-4" />
                  <p className="text-industrial-gray">Keine Genehmigungen erteilt</p>
                  <p className="text-secondary-gray text-sm">
                    Sie haben noch keine Arbeitserlaubnisse genehmigt.
                  </p>
                </CardContent>
              </Card>
            ) : (
              myApprovals.map((permit: Permit) => (
                <PermitCard key={permit.id} permit={permit} />
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
      </div>

      {/* Permit Viewing Dialog */}
      <Dialog open={viewModalOpen} onOpenChange={setViewModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-industrial-gray">
              Arbeitserlaubnis Details - {viewingPermit?.permitId}
            </DialogTitle>
          </DialogHeader>
          
          {viewingPermit && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-industrial-gray">Typ</p>
                  <p className="text-secondary-gray">{viewingPermit.type}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-industrial-gray">Arbeitsort</p>
                  <p className="text-secondary-gray">{viewingPermit.location}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-industrial-gray">Antragsteller</p>
                  <p className="text-secondary-gray">{viewingPermit.requestorName}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-industrial-gray">Abteilung</p>
                  <p className="text-secondary-gray">{viewingPermit.department}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-industrial-gray">Startdatum</p>
                  <p className="text-secondary-gray">
                    {viewingPermit.startDate ? format(new Date(viewingPermit.startDate), "dd.MM.yyyy", { locale: de }) : 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-industrial-gray">Enddatum</p>
                  <p className="text-secondary-gray">
                    {viewingPermit.endDate ? format(new Date(viewingPermit.endDate), "dd.MM.yyyy", { locale: de }) : 'N/A'}
                  </p>
                </div>
              </div>
              
              <div>
                <p className="text-sm font-medium text-industrial-gray mb-2">Beschreibung</p>
                <p className="text-secondary-gray">{viewingPermit.description}</p>
              </div>
              
              {viewingPermit.identifiedHazards && (
                <div>
                  <p className="text-sm font-medium text-industrial-gray mb-2">Identifizierte Gefahren</p>
                  <p className="text-secondary-gray">{viewingPermit.identifiedHazards}</p>
                </div>
              )}

              {/* Sicherheitsbetrachtung */}
              <div className="border-t pt-4">
                <h3 className="text-lg font-semibold text-industrial-gray mb-4">Sicherheitsbetrachtung</h3>
                
                {/* Risikostufe */}
                {viewingPermit.riskLevel && (
                  <div className="mb-4">
                    <p className="text-sm font-medium text-industrial-gray mb-2">Risikostufe</p>
                    <Badge variant={viewingPermit.riskLevel === 'high' ? 'destructive' : viewingPermit.riskLevel === 'medium' ? 'secondary' : 'default'}>
                      {viewingPermit.riskLevel === 'high' ? 'Hoch' : viewingPermit.riskLevel === 'medium' ? 'Mittel' : 'Niedrig'}
                    </Badge>
                  </div>
                )}

                {/* TRBS Gefährdungsbeurteilung */}
                {viewingPermit.selectedHazards && viewingPermit.selectedHazards.length > 0 && (
                  <div className="mb-4">
                    <p className="text-sm font-medium text-industrial-gray mb-3">TRBS Gefährdungsbeurteilung</p>
                    <div className="space-y-3">
                      {viewingPermit.selectedHazards.map((hazardId: string) => {
                        const categories = [
                          { id: 1, category: "Mechanische Gefährdungen", hazards: ["Quetschung durch bewegte Teile", "Schneiden an scharfen Kanten", "Stoß durch herunterfallende Gegenstände", "Sturz durch ungesicherte Öffnungen"] },
                          { id: 2, category: "Elektrische Gefährdungen", hazards: ["Stromschlag durch defekte Geräte", "Lichtbogen bei Schalthandlungen", "Statische Entladung", "Induktive Kopplung"] },
                          { id: 3, category: "Gefahrstoffe", hazards: ["Hautkontakt mit Gefahrstoffen", "Einatmen von Gefahrstoffen", "Verschlucken von Gefahrstoffen", "Hautkontakt mit unter Druck stehenden Flüssigkeiten"] },
                          { id: 4, category: "Biologische Arbeitsstoffe", hazards: ["Infektionsgefährdung", "sensibilisierende Wirkung", "toxische Wirkung"] },
                          { id: 5, category: "Brand- und Explosionsgefährdungen", hazards: ["brennbare Feststoffe, Flüssigkeiten, Gase", "explosionsfähige Atmosphäre", "Explosivstoffe"] },
                          { id: 6, category: "Thermische Gefährdungen", hazards: ["heiße Medien/Oberflächen", "kalte Medien/Oberflächen", "Brand, Explosion"] },
                          { id: 7, category: "Gefährdungen durch spezielle physikalische Einwirkungen", hazards: ["Lärm", "Ultraschall, Infraschall", "Ganzkörpervibrationen", "Hand-Arm-Vibrationen", "optische Strahlung", "ionisierende Strahlung", "elektromagnetische Felder", "Unter- oder Überdruck"] },
                          { id: 8, category: "Gefährdungen durch Arbeitsumgebungsbedingungen", hazards: ["Klima (Hitze, Kälte)", "unzureichende Beleuchtung", "Lärm", "unzureichende Verkehrswege", "Sturz, Ausgleiten", "unzureichende Flucht- und Rettungswege"] },
                          { id: 9, category: "Physische Belastung/Arbeitsschwere", hazards: ["schwere dynamische Arbeit", "einseitige dynamische Arbeit", "Haltungsarbeit/Zwangshaltungen", "Fortbewegung/ungünstige Körperhaltung", "Kombination körperlicher Belastungsfaktoren"] },
                          { id: 10, category: "Psychische Faktoren", hazards: ["unzureichend gestaltete Arbeitsaufgabe", "unzureichend gestaltete Arbeitsorganisation", "unzureichend gestaltete soziale Bedingungen", "unzureichend gestaltete Arbeitsplatz- und Arbeitsumgebungsfaktoren"] },
                          { id: 11, category: "Sonstige Gefährdungen", hazards: ["durch Menschen (körperliche Gewalt)", "durch Tiere", "durch Pflanzen und pflanzliche Produkte", "Absturz in/durch Behälter, Becken, Gruben"] }
                        ];
                        
                        const [categoryId, hazardIndex] = hazardId.split('-').map(Number);
                        const category = categories.find(c => c.id === categoryId);
                        const hazard = category?.hazards[hazardIndex];
                        
                        if (!category || !hazard) return null;
                        
                        return (
                          <div key={hazardId} className="border rounded-lg p-3 bg-blue-50">
                            <div className="flex items-start gap-3">
                              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                              <div className="flex-1">
                                <div className="font-medium text-sm text-industrial-gray">
                                  {category.category}
                                </div>
                                <div className="text-sm text-gray-600 mt-1">
                                  {hazard}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    
                    {viewingPermit.hazardNotes && viewingPermit.hazardNotes !== '{}' && (
                      <div className="mt-4 p-3 bg-yellow-50 rounded-lg">
                        <h4 className="font-medium text-sm text-industrial-gray mb-2">Zusätzliche Notizen zu Gefahren:</h4>
                        {Object.entries(JSON.parse(viewingPermit.hazardNotes)).map(([hazardId, note]) => {
                          if (!note) return null;
                          
                          const [categoryId, hazardIndex] = hazardId.split('-').map(Number);
                          const categories = [
                            { id: 1, category: "Mechanische Gefährdungen", hazards: ["Quetschung durch bewegte Teile", "Schneiden an scharfen Kanten", "Stoß durch herunterfallende Gegenstände", "Sturz durch ungesicherte Öffnungen"] },
                            { id: 2, category: "Elektrische Gefährdungen", hazards: ["Stromschlag durch defekte Geräte", "Lichtbogen bei Schalthandlungen", "Statische Entladung", "Induktive Kopplung"] },
                            { id: 3, category: "Gefahrstoffe", hazards: ["Hautkontakt mit Gefahrstoffen", "Einatmen von Gefahrstoffen", "Verschlucken von Gefahrstoffen", "Hautkontakt mit unter Druck stehenden Flüssigkeiten"] },
                            { id: 4, category: "Biologische Arbeitsstoffe", hazards: ["Infektionsgefährdung", "sensibilisierende Wirkung", "toxische Wirkung"] },
                            { id: 5, category: "Brand- und Explosionsgefährdungen", hazards: ["brennbare Feststoffe, Flüssigkeiten, Gase", "explosionsfähige Atmosphäre", "Explosivstoffe"] },
                            { id: 6, category: "Thermische Gefährdungen", hazards: ["heiße Medien/Oberflächen", "kalte Medien/Oberflächen", "Brand, Explosion"] },
                            { id: 7, category: "Gefährdungen durch spezielle physikalische Einwirkungen", hazards: ["Lärm", "Ultraschall, Infraschall", "Ganzkörpervibrationen", "Hand-Arm-Vibrationen", "optische Strahlung", "ionisierende Strahlung", "elektromagnetische Felder", "Unter- oder Überdruck"] },
                            { id: 8, category: "Gefährdungen durch Arbeitsumgebungsbedingungen", hazards: ["Klima (Hitze, Kälte)", "unzureichende Beleuchtung", "Lärm", "unzureichende Verkehrswege", "Sturz, Ausgleiten", "unzureichende Flucht- und Rettungswege"] },
                            { id: 9, category: "Physische Belastung/Arbeitsschwere", hazards: ["schwere dynamische Arbeit", "einseitige dynamische Arbeit", "Haltungsarbeit/Zwangshaltungen", "Fortbewegung/ungünstige Körperhaltung", "Kombination körperlicher Belastungsfaktoren"] },
                            { id: 10, category: "Psychische Faktoren", hazards: ["unzureichend gestaltete Arbeitsaufgabe", "unzureichend gestaltete Arbeitsorganisation", "unzureichend gestaltete soziale Bedingungen", "unzureichend gestaltete Arbeitsplatz- und Arbeitsumgebungsfaktoren"] },
                            { id: 11, category: "Sonstige Gefährdungen", hazards: ["durch Menschen (körperliche Gewalt)", "durch Tiere", "durch Pflanzen und pflanzliche Produkte", "Absturz in/durch Behälter, Becken, Gruben"] }
                          ];
                          const category = categories.find(c => c.id === categoryId);
                          const hazard = category?.hazards[hazardIndex];
                          
                          return (
                            <div key={hazardId} className="text-sm mb-2">
                              <span className="font-medium text-blue-700">{hazard}:</span>
                              <span className="text-gray-600 ml-2">{note}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Sicherheitsbeauftragter */}
                {viewingPermit.safetyOfficer && (
                  <div className="mb-4">
                    <p className="text-sm font-medium text-industrial-gray mb-2">Zugewiesener Sicherheitsbeauftragter</p>
                    <p className="text-secondary-gray">{viewingPermit.safetyOfficer}</p>
                  </div>
                )}

                {/* Zusätzliche Kommentare */}
                {viewingPermit.additionalComments && (
                  <div className="mb-4">
                    <p className="text-sm font-medium text-industrial-gray mb-2">Zusätzliche Kommentare</p>
                    <p className="text-secondary-gray">{viewingPermit.additionalComments}</p>
                  </div>
                )}
              </div>

              {/* Genehmiger und Status */}
              <div className="border-t pt-4">
                <h3 className="text-lg font-semibold text-industrial-gray mb-4">Genehmigung & Freigabe</h3>
                
                {/* Ausgewählte Genehmiger */}
                <div className="mb-4">
                  <p className="text-sm font-medium text-industrial-gray mb-3">Ausgewählte Genehmiger</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-gray-50 p-3 rounded">
                      <p className="text-xs text-gray-600 font-medium">Abteilungsleiter</p>
                      <p className="text-sm font-semibold text-industrial-gray">
                        {viewingPermit.departmentHead || 'Nicht zugewiesen'}
                      </p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded">
                      <p className="text-xs text-gray-600 font-medium">Instandhaltung/Engineering</p>
                      <p className="text-sm font-semibold text-industrial-gray">
                        {viewingPermit.maintenanceApprover || 'Nicht zugewiesen'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Genehmigungsstatus */}
                <div className="space-y-2">
                  <p className="font-medium text-industrial-gray text-sm">Genehmigungsstatus:</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <div className={`flex items-center gap-2 p-3 rounded ${viewingPermit.departmentHeadApproval ? 'bg-green-50' : 'bg-orange-50'}`}>
                      {viewingPermit.departmentHeadApproval ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <Clock className="h-4 w-4 text-orange-600" />
                      )}
                      <div>
                        <span className="text-sm font-medium">
                          Abteilungsleiter: {viewingPermit.departmentHeadApproval ? 'Genehmigt' : 'Ausstehend'}
                        </span>
                        {viewingPermit.departmentHeadApprovalDate && (
                          <p className="text-xs text-gray-600">
                            {format(new Date(viewingPermit.departmentHeadApprovalDate), "dd.MM.yyyy HH:mm", { locale: de })}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className={`flex items-center gap-2 p-3 rounded ${viewingPermit.maintenanceApproval ? 'bg-green-50' : 'bg-orange-50'}`}>
                      {viewingPermit.maintenanceApproval ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <Clock className="h-4 w-4 text-orange-600" />
                      )}
                      <div>
                        <span className="text-sm font-medium">
                          Instandhaltung/Engineering: {viewingPermit.maintenanceApproval ? 'Genehmigt' : 'Ausstehend'}
                        </span>
                        {viewingPermit.maintenanceApprovalDate && (
                          <p className="text-xs text-gray-600">
                            {format(new Date(viewingPermit.maintenanceApprovalDate), "dd.MM.yyyy HH:mm", { locale: de })}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}