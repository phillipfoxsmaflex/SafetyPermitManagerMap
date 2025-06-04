import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { NavigationHeader } from "@/components/navigation-header";
import { EditPermitModalEnhanced } from "@/components/edit-permit-modal-enhanced";
import { CreatePermitModal } from "@/components/create-permit-modal";
import { 
  FileText, 
  Edit3, 
  Trash2, 
  Save, 
  Plus, 
  Copy, 
  FileStack,
  Search,
  Filter
} from "lucide-react";
import type { Permit } from "@shared/schema";

export default function Drafts() {
  const { toast } = useToast();
  
  const [selectedPermit, setSelectedPermit] = useState<Permit | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [selectedDraft, setSelectedDraft] = useState<Permit | null>(null);
  const [templateName, setTemplateName] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");

  const { data: permits = [], isLoading } = useQuery<Permit[]>({
    queryKey: ["/api/permits"],
  });

  const { data: templates = [] } = useQuery<any[]>({
    queryKey: ["/api/templates"],
  });

  const draftPermits = permits.filter((permit: Permit) => permit.status === 'draft');

  const filteredDrafts = draftPermits.filter((permit: Permit) => {
    const matchesSearch = permit.permitId.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         permit.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         permit.location.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === "all" || permit.type === filterType;
    return matchesSearch && matchesType;
  });

  const handleEdit = (permit: Permit) => {
    setSelectedPermit(permit);
    setEditModalOpen(true);
  };

  const deletePermitMutation = useMutation({
    mutationFn: async (permitId: number) => {
      const response = await fetch(`/api/permits/${permitId}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error('Failed to delete permit');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/permits"] });
      toast({
        title: "Entwurf gelöscht",
        description: "Der Entwurf wurde erfolgreich gelöscht.",
      });
    },
    onError: () => {
      toast({
        title: "Fehler",
        description: "Der Entwurf konnte nicht gelöscht werden.",
        variant: "destructive",
      });
    },
  });

  const handleDelete = (permit: Permit) => {
    if (confirm(`Möchten Sie den Entwurf "${permit.permitId}" wirklich löschen?`)) {
      deletePermitMutation.mutate(permit.id);
    }
  };

  const createTemplateMutation = useMutation({
    mutationFn: async (data: { name: string; template: any }) => {
      return apiRequest("/api/templates", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/templates"] });
      setTemplateModalOpen(false);
      setTemplateName("");
      setSelectedDraft(null);
      toast({
        title: "Vorlage erstellt",
        description: "Die Vorlage wurde erfolgreich erstellt.",
      });
    },
    onError: () => {
      toast({
        title: "Fehler",
        description: "Die Vorlage konnte nicht erstellt werden.",
        variant: "destructive",
      });
    },
  });

  const handleCreateTemplate = (permit: Permit) => {
    setSelectedDraft(permit);
    setTemplateModalOpen(true);
  };

  const handleSaveTemplate = () => {
    if (!selectedDraft || !templateName.trim()) return;
    
    createTemplateMutation.mutate({
      name: templateName,
      template: selectedDraft,
    });
  };

  const handleUseTemplate = (template: any) => {
    // This will be handled by the CreatePermitModal component
    setCreateModalOpen(true);
  };

  const getPermitTypeLabel = (type: string) => {
    const typeMap: Record<string, string> = {
      'confined_space': 'Enger Raum Zutritt',
      'hot_work': 'Heißarbeiten',
      'electrical': 'Elektrische Arbeiten',
      'chemical': 'Chemische Arbeiten',
      'height': 'Höhenarbeiten',
    };
    return typeMap[type] || type;
  };

  const DraftCard = ({ permit }: { permit: Permit }) => (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg text-industrial-gray">{permit.permitId}</CardTitle>
            <p className="text-sm text-secondary-gray mt-1">
              {getPermitTypeLabel(permit.type)} • {permit.location}
            </p>
          </div>
          <Badge variant="outline">Entwurf</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 text-sm mb-4">
          <div>
            <span className="font-medium">Antragsteller:</span> {permit.requestorName}
          </div>
          <div>
            <span className="font-medium">Abteilung:</span> {permit.department}
          </div>
          <div>
            <span className="font-medium">Erstellt:</span> {format(new Date(permit.createdAt!), "dd.MM.yyyy", { locale: de })}
          </div>
        </div>
        
        <p className="text-sm text-secondary-gray mb-4 line-clamp-2">
          {permit.description}
        </p>
        
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleEdit(permit)}
          >
            <Edit3 className="w-4 h-4 mr-1" />
            Bearbeiten
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleCreateTemplate(permit)}
          >
            <Copy className="w-4 h-4 mr-1" />
            Als Vorlage
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleDelete(permit)}
            className="text-red-600 hover:text-red-700"
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
      <div className="container mx-auto p-6">
        <NavigationHeader />
        <div className="text-center py-12">
          <p className="text-industrial-gray">Lade Entwürfe...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <NavigationHeader />
      
      <div className="container mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-industrial-gray">Entwürfe</h1>
            <p className="text-secondary-gray mt-2">
              Verwalten Sie Ihre gespeicherten Arbeitserlaubnis-Entwürfe und Vorlagen
            </p>
          </div>
          <Button 
            onClick={() => setCreateModalOpen(true)}
            className="bg-safety-blue text-white hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Neue Genehmigung erstellen
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Filters */}
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <div className="flex gap-4 items-center">
                <div className="flex-1">
                  <Input
                    placeholder="Suchen nach Genehmigungsnummer, Beschreibung oder Ort..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full"
                    icon={<Search className="w-4 h-4" />}
                  />
                </div>
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="w-48">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle Typen</SelectItem>
                    <SelectItem value="hot_work">Heißarbeiten</SelectItem>
                    <SelectItem value="confined_space">Enger Raum</SelectItem>
                    <SelectItem value="electrical">Elektrische Arbeiten</SelectItem>
                    <SelectItem value="height_work">Höhenarbeiten</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Drafts List */}
            <div className="space-y-4">
              {filteredDrafts.length === 0 ? (
                <Card>
                  <CardContent className="text-center py-12">
                    <FileText className="h-16 w-16 text-secondary-gray mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-industrial-gray mb-2">Keine Entwürfe vorhanden</h3>
                    <p className="text-secondary-gray mb-4">
                      Erstellen Sie Ihre erste Arbeitserlaubnis als Entwurf.
                    </p>
                    <Button 
                      onClick={() => setCreateModalOpen(true)}
                      className="bg-safety-blue text-white hover:bg-blue-700"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Neue Genehmigung erstellen
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                filteredDrafts.map((permit: Permit) => (
                  <DraftCard key={permit.id} permit={permit} />
                ))
              )}
            </div>
          </div>

          {/* Right Column - Templates */}
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-industrial-gray mb-4">Vorlagen</h2>
              
              {templates.length === 0 ? (
                <Card>
                  <CardContent className="text-center py-8">
                    <FileStack className="h-12 w-12 text-secondary-gray mx-auto mb-4" />
                    <p className="text-industrial-gray">Keine Vorlagen vorhanden</p>
                    <p className="text-secondary-gray text-sm">
                      Erstellen Sie Vorlagen aus bestehenden Entwürfen für die Wiederverwendung.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {templates.map((template: any) => (
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
                        <div className="space-y-2 text-sm mb-4">
                          <div>
                            <span className="font-medium">Arbeitsort:</span> {template.template.location}
                          </div>
                          <div>
                            <span className="font-medium">Abteilung:</span> {template.template.department}
                          </div>
                        </div>
                        
                        <Button
                          size="sm"
                          onClick={() => handleUseTemplate(template)}
                          className="w-full bg-safety-blue text-white hover:bg-blue-700"
                        >
                          <Copy className="w-4 h-4 mr-2" />
                          Vorlage verwenden
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Edit Modal */}
        <EditPermitModalEnhanced
          permit={selectedPermit}
          open={editModalOpen}
          onOpenChange={setEditModalOpen}
        />

        {/* Create Modal */}
        <CreatePermitModal 
          open={createModalOpen} 
          onOpenChange={setCreateModalOpen} 
        />

        {/* Template Creation Modal */}
        {templateModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold mb-4">Vorlage erstellen</h3>
              <div className="space-y-4">
                <div>
                  <Label>Vorlagenname</Label>
                  <Input
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
            </div>
          </div>
        )}
      </div>
    </div>
  );
}