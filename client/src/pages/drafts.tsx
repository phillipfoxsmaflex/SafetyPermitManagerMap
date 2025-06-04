import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { NavigationHeader } from "@/components/navigation-header";
import { EditPermitModalEnhanced } from "@/components/edit-permit-modal-enhanced";
import { 
  FileText, 
  Edit3, 
  Trash2, 
  Plus, 
  Save, 
  Template,
  Clock,
  Search,
  Filter
} from "lucide-react";
import type { Permit } from "@shared/schema";
import { format } from "date-fns";
import { de } from "date-fns/locale";

export default function Drafts() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [selectedDraft, setSelectedDraft] = useState<Permit | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");

  // Fetch draft permits
  const { data: permits = [], isLoading } = useQuery({
    queryKey: ["/api/permits"],
  });

  // Fetch templates
  const { data: templates = [] } = useQuery({
    queryKey: ["/api/templates"],
  });

  // Delete draft mutation
  const deleteDraftMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest(`/api/permits/${id}`, "DELETE");
    },
    onSuccess: () => {
      toast({
        title: "Entwurf gelöscht",
        description: "Der Entwurf wurde erfolgreich gelöscht.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/permits"] });
    },
    onError: () => {
      toast({
        title: "Fehler",
        description: "Entwurf konnte nicht gelöscht werden.",
        variant: "destructive",
      });
    },
  });

  // Create template mutation
  const createTemplateMutation = useMutation({
    mutationFn: async (data: { name: string; template: any }) => {
      return await apiRequest("/api/templates", "POST", data);
    },
    onSuccess: () => {
      toast({
        title: "Vorlage erstellt",
        description: "Die Vorlage wurde erfolgreich gespeichert.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/templates"] });
      setTemplateModalOpen(false);
      setTemplateName("");
    },
    onError: () => {
      toast({
        title: "Fehler",
        description: "Vorlage konnte nicht erstellt werden.",
        variant: "destructive",
      });
    },
  });

  // Apply template mutation
  const applyTemplateMutation = useMutation({
    mutationFn: async (templateId: string) => {
      return await apiRequest(`/api/templates/${templateId}/apply`, "POST");
    },
    onSuccess: () => {
      toast({
        title: "Vorlage angewendet",
        description: "Ein neuer Entwurf wurde aus der Vorlage erstellt.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/permits"] });
    },
    onError: () => {
      toast({
        title: "Fehler",
        description: "Vorlage konnte nicht angewendet werden.",
        variant: "destructive",
      });
    },
  });

  const draftPermits = permits.filter((permit: Permit) => permit.status === 'draft');

  const filteredDrafts = draftPermits.filter((permit: Permit) => {
    const matchesSearch = searchQuery === "" || 
      permit.permitId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      permit.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      permit.location.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesType = typeFilter === "all" || permit.type === typeFilter;
    
    return matchesSearch && matchesType;
  });

  const getPermitTypeLabel = (type: string) => {
    const typeMap: Record<string, string> = {
      'confined_space': 'Enger Raum',
      'hot_work': 'Heißarbeiten',
      'electrical': 'Elektrische Arbeiten',
      'chemical': 'Chemische Arbeiten',
      'height': 'Höhenarbeiten',
    };
    return typeMap[type] || type;
  };

  const handleEdit = (permit: Permit) => {
    setSelectedDraft(permit);
    setEditModalOpen(true);
  };

  const handleDelete = (permit: Permit) => {
    if (confirm(`Möchten Sie den Entwurf "${permit.permitId}" wirklich löschen?`)) {
      deleteDraftMutation.mutate(permit.id);
    }
  };

  const handleCreateTemplate = (permit: Permit) => {
    setSelectedDraft(permit);
    setTemplateModalOpen(true);
  };

  const handleSaveTemplate = () => {
    if (!selectedDraft || !templateName.trim()) return;
    
    const templateData = {
      type: selectedDraft.type,
      location: selectedDraft.location,
      description: selectedDraft.description,
      department: selectedDraft.department,
      riskLevel: selectedDraft.riskLevel,
      identifiedHazards: selectedDraft.identifiedHazards,
      additionalComments: selectedDraft.additionalComments,
      atmosphereTest: selectedDraft.atmosphereTest,
      ventilation: selectedDraft.ventilation,
      ppe: selectedDraft.ppe,
      emergencyProcedures: selectedDraft.emergencyProcedures,
      fireWatch: selectedDraft.fireWatch,
      isolationLockout: selectedDraft.isolationLockout,
    };

    createTemplateMutation.mutate({
      name: templateName,
      template: templateData
    });
  };

  const handleApplyTemplate = () => {
    if (!selectedTemplate) return;
    applyTemplateMutation.mutate(selectedTemplate);
  };

  const DraftCard = ({ permit }: { permit: Permit }) => (
    <Card className="mb-4 hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg text-industrial-gray">{permit.permitId}</CardTitle>
            <p className="text-sm text-secondary-gray mt-1">{getPermitTypeLabel(permit.type)}</p>
          </div>
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
            <Clock className="w-3 h-3 mr-1" />
            Entwurf
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium">Arbeitsort:</span> {permit.location}
          </div>
          <div>
            <span className="font-medium">Abteilung:</span> {permit.department}
          </div>
          <div>
            <span className="font-medium">Erstellt:</span> {format(new Date(permit.createdAt!), "dd.MM.yyyy", { locale: de })}
          </div>
          <div>
            <span className="font-medium">Zuletzt bearbeitet:</span> {format(new Date(permit.updatedAt!), "dd.MM.yyyy", { locale: de })}
          </div>
        </div>
        
        <div className="border-t pt-3">
          <p className="text-sm text-secondary-gray mb-3">Beschreibung:</p>
          <p className="text-sm">{permit.description}</p>
        </div>

        <div className="flex gap-2 pt-2">
          <Button 
            size="sm" 
            onClick={() => handleEdit(permit)}
            className="bg-safety-blue text-white hover:bg-blue-700"
          >
            <Edit3 className="w-4 h-4 mr-1" />
            Bearbeiten
          </Button>
          <Button 
            size="sm" 
            variant="outline"
            onClick={() => handleCreateTemplate(permit)}
          >
            <Template className="w-4 h-4 mr-1" />
            Als Vorlage
          </Button>
          <Button 
            size="sm" 
            variant="destructive"
            onClick={() => handleDelete(permit)}
            disabled={deleteDraftMutation.isPending}
          >
            <Trash2 className="w-4 h-4 mr-1" />
            Löschen
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-light-gray">
        <NavigationHeader />
        <div className="container mx-auto p-6">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-safety-blue mx-auto"></div>
              <p className="mt-2 text-secondary-gray">Lade Entwürfe...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-light-gray">
      <NavigationHeader />
      
      <div className="container mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-industrial-gray">Entwürfe & Vorlagen</h1>
            <p className="text-secondary-gray mt-2">
              Verwalten Sie gespeicherte Entwürfe und erstellen Sie wiederverwendbare Vorlagen
            </p>
          </div>
        </div>

        <Tabs defaultValue="drafts" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="drafts" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Entwürfe ({filteredDrafts.length})
            </TabsTrigger>
            <TabsTrigger value="templates" className="flex items-center gap-2">
              <Template className="h-4 w-4" />
              Vorlagen ({templates.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="drafts">
            <div className="space-y-6">
              {/* Search and Filter Bar */}
              <div className="bg-white p-4 rounded-lg shadow-sm border">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1">
                    <Label htmlFor="search" className="sr-only">Suchen</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary-gray w-4 h-4" />
                      <Input
                        id="search"
                        placeholder="Entwürfe durchsuchen..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <div className="md:w-48">
                    <Select value={typeFilter} onValueChange={setTypeFilter}>
                      <SelectTrigger>
                        <Filter className="w-4 h-4 mr-2" />
                        <SelectValue placeholder="Typ filtern" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Alle Typen</SelectItem>
                        <SelectItem value="confined_space">Enger Raum</SelectItem>
                        <SelectItem value="hot_work">Heißarbeiten</SelectItem>
                        <SelectItem value="electrical">Elektrische Arbeiten</SelectItem>
                        <SelectItem value="chemical">Chemische Arbeiten</SelectItem>
                        <SelectItem value="height">Höhenarbeiten</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Results Summary */}
                <div className="mt-4 text-sm text-secondary-gray">
                  Zeige {filteredDrafts.length} von {draftPermits.length} Entwürfen
                  {searchQuery && ` mit "${searchQuery}"`}
                  {typeFilter !== "all" && ` vom Typ "${getPermitTypeLabel(typeFilter)}"`}
                </div>
              </div>

              {/* Drafts List */}
              <div className="space-y-4">
                {filteredDrafts.length === 0 ? (
                  <Card>
                    <CardContent className="text-center py-8">
                      <FileText className="h-12 w-12 text-secondary-gray mx-auto mb-4" />
                      <p className="text-industrial-gray">Keine Entwürfe gefunden</p>
                      <p className="text-secondary-gray text-sm">
                        {searchQuery || typeFilter !== "all" 
                          ? "Versuchen Sie, Ihre Suchkriterien zu ändern."
                          : "Erstellen Sie einen neuen Antrag und speichern Sie ihn als Entwurf."}
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  filteredDrafts.map((permit: Permit) => (
                    <DraftCard key={permit.id} permit={permit} />
                  ))
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="templates">
            <div className="space-y-6">
              <Alert className="border-blue-200 bg-blue-50">
                <Template className="h-4 w-4 text-safety-blue" />
                <AlertDescription className="text-industrial-gray">
                  <strong>Vorlagen:</strong> Erstellen Sie wiederverwendbare Vorlagen aus bestehenden Entwürfen oder verwenden Sie gespeicherte Vorlagen für neue Anträge.
                </AlertDescription>
              </Alert>

              {/* Apply Template Section */}
              {templates.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg text-industrial-gray">Vorlage anwenden</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-4 items-end">
                      <div className="flex-1">
                        <Label htmlFor="template-select">Vorlage auswählen</Label>
                        <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                          <SelectTrigger id="template-select">
                            <SelectValue placeholder="Vorlage auswählen..." />
                          </SelectTrigger>
                          <SelectContent>
                            {templates.map((template: any) => (
                              <SelectItem key={template.id} value={template.id.toString()}>
                                {template.name} ({getPermitTypeLabel(template.template.type)})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <Button 
                        onClick={handleApplyTemplate}
                        disabled={!selectedTemplate || applyTemplateMutation.isPending}
                        className="bg-safety-blue text-white hover:bg-blue-700"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Neuen Entwurf erstellen
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Templates List */}
              <div className="space-y-4">
                {templates.length === 0 ? (
                  <Card>
                    <CardContent className="text-center py-8">
                      <Template className="h-12 w-12 text-secondary-gray mx-auto mb-4" />
                      <p className="text-industrial-gray">Keine Vorlagen vorhanden</p>
                      <p className="text-secondary-gray text-sm">
                        Erstellen Sie Vorlagen aus bestehenden Entwürfen für die Wiederverwendung.
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  templates.map((template: any) => (
                    <Card key={template.id} className="hover:shadow-md transition-shadow">
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle className="text-lg text-industrial-gray">{template.name}</CardTitle>
                            <p className="text-sm text-secondary-gray mt-1">
                              {getPermitTypeLabel(template.template.type)}
                            </p>
                          </div>
                          <Badge variant="outline">Vorlage</Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mb-4">
                          <div>
                            <span className="font-medium">Arbeitsort:</span> {template.template.location}
                          </div>
                          <div>
                            <span className="font-medium">Abteilung:</span> {template.template.department}
                          </div>
                          <div>
                            <span className="font-medium">Risikostufe:</span> {template.template.riskLevel}
                          </div>
                          <div>
                            <span className="font-medium">Erstellt:</span> {format(new Date(template.createdAt), "dd.MM.yyyy", { locale: de })}
                          </div>
                        </div>
                        
                        <div className="border-t pt-3">
                          <p className="text-sm text-secondary-gray mb-2">Beschreibung:</p>
                          <p className="text-sm">{template.template.description}</p>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Edit Modal */}
        <EditPermitModalEnhanced
          permit={selectedDraft}
          open={editModalOpen}
          onOpenChange={setEditModalOpen}
        />

        {/* Template Creation Modal */}
        <Dialog open={templateModalOpen} onOpenChange={setTemplateModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Vorlage erstellen</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="template-name">Name der Vorlage</Label>
                <Input
                  id="template-name"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="z.B. Standard Enger Raum Inspektion"
                />
              </div>
              
              {selectedDraft && (
                <div className="bg-gray-50 p-3 rounded">
                  <p className="text-sm font-medium mb-2">Basierend auf Entwurf:</p>
                  <p className="text-sm">{selectedDraft.permitId} - {selectedDraft.description}</p>
                </div>
              )}

              <div className="flex gap-2 pt-4">
                <Button 
                  onClick={handleSaveTemplate}
                  disabled={!templateName.trim() || createTemplateMutation.isPending}
                  className="bg-safety-blue text-white hover:bg-blue-700"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Vorlage speichern
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setTemplateModalOpen(false)}
                >
                  Abbrechen
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}