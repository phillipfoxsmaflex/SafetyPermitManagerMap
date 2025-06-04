import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { NavigationHeader } from "@/components/navigation-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { 
  FileText, 
  Edit, 
  Trash2, 
  Plus, 
  Download, 
  Copy,
  Calendar,
  User,
  Building
} from "lucide-react";

interface SavedReport {
  id: number;
  name: string;
  description: string;
  type: string;
  filters: any;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

interface Template {
  id: number;
  name: string;
  description: string;
  type: string;
  defaultFilters: any;
  createdAt: string;
  createdBy: string;
}

export default function SavedReports() {
  const [activeTab, setActiveTab] = useState("reports");
  const [createReportOpen, setCreateReportOpen] = useState(false);
  const [createTemplateOpen, setCreateTemplateOpen] = useState(false);
  const [editingReport, setEditingReport] = useState<SavedReport | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const { toast } = useToast();

  // Mock data for demonstration - in real app this would come from API
  const { data: savedReports = [] } = useQuery({
    queryKey: ["/api/saved-reports"],
    queryFn: () => [
      {
        id: 1,
        name: "Monatlicher Sicherheitsbericht",
        description: "Zusammenfassung aller Arbeitserlaubnisse des aktuellen Monats",
        type: "monthly",
        filters: { department: "all", status: "all" },
        createdAt: "2024-12-01T10:00:00Z",
        updatedAt: "2024-12-01T10:00:00Z",
        createdBy: "Hans Müller"
      },
      {
        id: 2,
        name: "Ausstehende Genehmigungen",
        description: "Alle Arbeitserlaubnisse die noch Genehmigungen benötigen",
        type: "pending",
        filters: { status: "pending" },
        createdAt: "2024-11-28T14:30:00Z",
        updatedAt: "2024-12-02T09:15:00Z",
        createdBy: "Sarah Weber"
      }
    ]
  });

  const { data: templates = [] } = useQuery({
    queryKey: ["/api/report-templates"],
    queryFn: () => [
      {
        id: 1,
        name: "Standard Monatsbericht",
        description: "Vorlage für monatliche Arbeitserlaubnis-Berichte",
        type: "monthly",
        defaultFilters: { department: "all", status: "completed" },
        createdAt: "2024-11-01T10:00:00Z",
        createdBy: "Administrator"
      },
      {
        id: 2,
        name: "Sicherheitsaudit Vorlage",
        description: "Vorlage für Sicherheitsaudit-Berichte",
        type: "safety",
        defaultFilters: { riskLevel: "high" },
        createdAt: "2024-10-15T16:20:00Z",
        createdBy: "Dr. Sarah Weber"
      }
    ]
  });

  const deleteReportMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(`/api/saved-reports/${id}`, "DELETE");
    },
    onSuccess: () => {
      toast({
        title: "Bericht gelöscht",
        description: "Der gespeicherte Bericht wurde erfolgreich gelöscht.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/saved-reports"] });
    },
    onError: () => {
      toast({
        title: "Fehler",
        description: "Bericht konnte nicht gelöscht werden.",
        variant: "destructive",
      });
    },
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(`/api/report-templates/${id}`, "DELETE");
    },
    onSuccess: () => {
      toast({
        title: "Vorlage gelöscht",
        description: "Die Berichtsvorlage wurde erfolgreich gelöscht.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/report-templates"] });
    },
    onError: () => {
      toast({
        title: "Fehler",
        description: "Vorlage konnte nicht gelöscht werden.",
        variant: "destructive",
      });
    },
  });

  const generateReport = (report: SavedReport) => {
    toast({
      title: "Bericht wird generiert",
      description: `Der Bericht "${report.name}" wird erstellt...`,
    });
    // Report generation logic would go here
  };

  const duplicateReport = (report: SavedReport) => {
    toast({
      title: "Bericht dupliziert",
      description: `Eine Kopie von "${report.name}" wurde erstellt.`,
    });
    // Duplication logic would go here
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTypeLabel = (type: string) => {
    const typeMap: Record<string, string> = {
      'monthly': 'Monatlich',
      'weekly': 'Wöchentlich',
      'safety': 'Sicherheit',
      'compliance': 'Compliance',
      'pending': 'Ausstehend',
      'custom': 'Benutzerdefiniert'
    };
    return typeMap[type] || type;
  };

  const CreateReportDialog = () => (
    <Dialog open={createReportOpen} onOpenChange={setCreateReportOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Neuen Bericht erstellen</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="report-name">Name</Label>
            <Input id="report-name" placeholder="Berichtsname eingeben" />
          </div>
          <div>
            <Label htmlFor="report-description">Beschreibung</Label>
            <Textarea id="report-description" placeholder="Beschreibung eingeben" />
          </div>
          <div>
            <Label htmlFor="report-type">Berichtstyp</Label>
            <Select>
              <SelectTrigger>
                <SelectValue placeholder="Typ auswählen" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">Monatlich</SelectItem>
                <SelectItem value="weekly">Wöchentlich</SelectItem>
                <SelectItem value="safety">Sicherheit</SelectItem>
                <SelectItem value="compliance">Compliance</SelectItem>
                <SelectItem value="custom">Benutzerdefiniert</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2 pt-4">
            <Button 
              onClick={() => setCreateReportOpen(false)}
              variant="outline" 
              className="flex-1"
            >
              Abbrechen
            </Button>
            <Button 
              onClick={() => {
                toast({
                  title: "Bericht erstellt",
                  description: "Der neue Bericht wurde gespeichert.",
                });
                setCreateReportOpen(false);
              }}
              className="flex-1 bg-safety-blue text-white hover:bg-blue-700"
            >
              Erstellen
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );

  const CreateTemplateDialog = () => (
    <Dialog open={createTemplateOpen} onOpenChange={setCreateTemplateOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Neue Vorlage erstellen</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="template-name">Name</Label>
            <Input id="template-name" placeholder="Vorlagenname eingeben" />
          </div>
          <div>
            <Label htmlFor="template-description">Beschreibung</Label>
            <Textarea id="template-description" placeholder="Beschreibung eingeben" />
          </div>
          <div>
            <Label htmlFor="template-type">Vorlagentyp</Label>
            <Select>
              <SelectTrigger>
                <SelectValue placeholder="Typ auswählen" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">Monatlich</SelectItem>
                <SelectItem value="weekly">Wöchentlich</SelectItem>
                <SelectItem value="safety">Sicherheit</SelectItem>
                <SelectItem value="compliance">Compliance</SelectItem>
                <SelectItem value="custom">Benutzerdefiniert</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2 pt-4">
            <Button 
              onClick={() => setCreateTemplateOpen(false)}
              variant="outline" 
              className="flex-1"
            >
              Abbrechen
            </Button>
            <Button 
              onClick={() => {
                toast({
                  title: "Vorlage erstellt",
                  description: "Die neue Berichtsvorlage wurde gespeichert.",
                });
                setCreateTemplateOpen(false);
              }}
              className="flex-1 bg-safety-blue text-white hover:bg-blue-700"
            >
              Erstellen
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <NavigationHeader />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-industrial-gray mb-2">
            Gespeicherte Berichte & Vorlagen
          </h2>
          <p className="text-secondary-gray">
            Verwalten Sie Ihre gespeicherten Berichte und Berichtsvorlagen
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="reports" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Gespeicherte Berichte ({savedReports.length})
            </TabsTrigger>
            <TabsTrigger value="templates" className="flex items-center gap-2">
              <Copy className="h-4 w-4" />
              Vorlagen ({templates.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="reports">
            <div className="mb-6">
              <Button 
                onClick={() => setCreateReportOpen(true)}
                className="bg-safety-blue text-white hover:bg-blue-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Neuen Bericht erstellen
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {savedReports.map((report) => (
                <Card key={report.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-lg text-industrial-gray">
                        {report.name}
                      </CardTitle>
                      <Badge variant="secondary">
                        {getTypeLabel(report.type)}
                      </Badge>
                    </div>
                    <p className="text-sm text-secondary-gray">
                      {report.description}
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="text-xs text-secondary-gray space-y-1">
                      <div className="flex items-center gap-2">
                        <User className="h-3 w-3" />
                        <span>Erstellt von: {report.createdBy}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-3 w-3" />
                        <span>Erstellt: {formatDate(report.createdAt)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-3 w-3" />
                        <span>Aktualisiert: {formatDate(report.updatedAt)}</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        onClick={() => generateReport(report)}
                        className="flex-1 bg-safety-blue text-white hover:bg-blue-700"
                      >
                        <Download className="w-3 h-3 mr-1" />
                        Generieren
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => setEditingReport(report)}
                      >
                        <Edit className="w-3 h-3" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => duplicateReport(report)}
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="destructive"
                        onClick={() => deleteReportMutation.mutate(report.id)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {savedReports.length === 0 && (
              <Card>
                <CardContent className="text-center py-8">
                  <FileText className="h-12 w-12 text-secondary-gray mx-auto mb-4" />
                  <p className="text-industrial-gray">Keine gespeicherten Berichte</p>
                  <p className="text-secondary-gray text-sm">
                    Erstellen Sie Ihren ersten Bericht, um loszulegen.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="templates">
            <div className="mb-6">
              <Button 
                onClick={() => setCreateTemplateOpen(true)}
                className="bg-safety-blue text-white hover:bg-blue-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Neue Vorlage erstellen
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {templates.map((template) => (
                <Card key={template.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-lg text-industrial-gray">
                        {template.name}
                      </CardTitle>
                      <Badge variant="outline">
                        {getTypeLabel(template.type)}
                      </Badge>
                    </div>
                    <p className="text-sm text-secondary-gray">
                      {template.description}
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="text-xs text-secondary-gray space-y-1">
                      <div className="flex items-center gap-2">
                        <User className="h-3 w-3" />
                        <span>Erstellt von: {template.createdBy}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-3 w-3" />
                        <span>Erstellt: {formatDate(template.createdAt)}</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        onClick={() => {
                          toast({
                            title: "Bericht aus Vorlage erstellt",
                            description: `Neuer Bericht basierend auf "${template.name}" wurde erstellt.`,
                          });
                        }}
                        className="flex-1 bg-safety-blue text-white hover:bg-blue-700"
                      >
                        Verwenden
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => setEditingTemplate(template)}
                      >
                        <Edit className="w-3 h-3" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="destructive"
                        onClick={() => deleteTemplateMutation.mutate(template.id)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {templates.length === 0 && (
              <Card>
                <CardContent className="text-center py-8">
                  <Copy className="h-12 w-12 text-secondary-gray mx-auto mb-4" />
                  <p className="text-industrial-gray">Keine Berichtsvorlagen</p>
                  <p className="text-secondary-gray text-sm">
                    Erstellen Sie Ihre erste Vorlage für wiederverwendbare Berichte.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        <CreateReportDialog />
        <CreateTemplateDialog />
      </main>
    </div>
  );
}