import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { NavigationHeader } from "@/components/navigation-header";
import { EditPermitModalSimple } from "@/components/edit-permit-modal-simple";
import { 
  FileText, 
  Edit3, 
  Trash2, 
  Save, 
  Send, 
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

  // Create Draft Form State
  const [formData, setFormData] = useState({
    type: "",
    location: "",
    description: "",
    requestorName: "",
    department: "",
    contactNumber: "",
    emergencyContact: "",
    startDate: "",
    endDate: "",
    riskLevel: "",
    identifiedHazards: "",
    additionalComments: "",
    departmentHead: "",
    maintenanceApprover: ""
  });

  const { data: permits = [] } = useQuery<Permit[]>({
    queryKey: ["/api/permits"],
  });

  const { data: templates = [] } = useQuery<any[]>({
    queryKey: ["/api/templates"],
  });

  const draftPermits = permits.filter((permit: Permit) => permit.status === 'draft');

  const filteredDrafts = draftPermits.filter((permit: Permit) => {
    const matchesSearch = searchTerm === "" || 
      permit.permitId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      permit.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      permit.location.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = filterType === "all" || permit.type === filterType;
    
    return matchesSearch && matchesType;
  });

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const resetForm = () => {
    setFormData({
      type: "",
      location: "",
      description: "",
      requestorName: "",
      department: "",
      contactNumber: "",
      emergencyContact: "",
      startDate: "",
      endDate: "",
      riskLevel: "",
      identifiedHazards: "",
      additionalComments: "",
      departmentHead: "",
      maintenanceApprover: ""
    });
  };

  const createDraftMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch("/api/permits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, status: "draft" })
      });
      if (!response.ok) throw new Error("Failed to create draft");
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Erfolg", description: "Entwurf erstellt und gespeichert." });
      queryClient.invalidateQueries({ queryKey: ["/api/permits"] });
      setCreateModalOpen(false);
      resetForm();
    },
    onError: (error) => {
      console.error("Draft creation error:", error);
      toast({ title: "Fehler", description: "Entwurf konnte nicht erstellt werden.", variant: "destructive" });
    }
  });

  const submitForApprovalMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch("/api/permits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, status: "pending" })
      });
      if (!response.ok) throw new Error("Failed to submit for approval");
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Erfolg", description: "Genehmigung zur Prüfung eingereicht." });
      queryClient.invalidateQueries({ queryKey: ["/api/permits"] });
      setCreateModalOpen(false);
      resetForm();
    },
    onError: (error) => {
      console.error("Submit for approval error:", error);
      toast({ title: "Fehler", description: "Genehmigung konnte nicht eingereicht werden.", variant: "destructive" });
    }
  });

  const deleteDraftMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/permits/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Failed to delete draft");
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Erfolg", description: "Entwurf gelöscht." });
      queryClient.invalidateQueries({ queryKey: ["/api/permits"] });
    },
    onError: (error) => {
      console.error("Delete draft error:", error);
      toast({ title: "Fehler", description: "Entwurf konnte nicht gelöscht werden.", variant: "destructive" });
    }
  });

  const createTemplateMutation = useMutation({
    mutationFn: async ({ name, permitData }: { name: string; permitData: any }) => {
      const response = await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, template: permitData })
      });
      if (!response.ok) throw new Error("Failed to create template");
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Erfolg", description: "Vorlage erstellt." });
      queryClient.invalidateQueries({ queryKey: ["/api/templates"] });
      setTemplateModalOpen(false);
      setTemplateName("");
      setSelectedDraft(null);
    },
    onError: (error) => {
      console.error("Create template error:", error);
      toast({ title: "Fehler", description: "Vorlage konnte nicht erstellt werden.", variant: "destructive" });
    }
  });

  const handleEdit = (permit: Permit) => {
    setSelectedPermit(permit);
    setEditModalOpen(true);
  };

  const handleDelete = (permit: Permit) => {
    if (window.confirm(`Möchten Sie den Entwurf ${permit.permitId} wirklich löschen?`)) {
      deleteDraftMutation.mutate(permit.id);
    }
  };

  const handleCreateTemplate = (permit: Permit) => {
    setSelectedDraft(permit);
    setTemplateModalOpen(true);
  };

  const handleSaveTemplate = () => {
    if (selectedDraft && templateName.trim()) {
      createTemplateMutation.mutate({
        name: templateName.trim(),
        permitData: selectedDraft
      });
    }
  };

  const handleCreateDraft = () => {
    createDraftMutation.mutate(formData);
  };

  const handleSubmitForApproval = () => {
    submitForApprovalMutation.mutate(formData);
  };

  const handleUseTemplate = (template: any) => {
    const templateData = template.template;
    setFormData({
      type: templateData.type || "",
      location: templateData.location || "",
      description: templateData.description || "",
      requestorName: templateData.requestorName || "",
      department: templateData.department || "",
      contactNumber: templateData.contactNumber || "",
      emergencyContact: templateData.emergencyContact || "",
      startDate: "",
      endDate: "",
      riskLevel: templateData.riskLevel || "",
      identifiedHazards: templateData.identifiedHazards || "",
      additionalComments: templateData.additionalComments || "",
      departmentHead: templateData.departmentHead || "",
      maintenanceApprover: templateData.maintenanceApprover || ""
    });
    setCreateModalOpen(true);
  };

  const getPermitTypeLabel = (type: string) => {
    const types: { [key: string]: string } = {
      hot_work: "Heißarbeiten",
      confined_space: "Enger Raum", 
      electrical: "Elektrische Arbeiten",
      height_work: "Höhenarbeiten"
    };
    return types[type] || type;
  };

  const DraftCard = ({ permit }: { permit: Permit }) => (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg text-industrial-gray">{permit.permitId}</CardTitle>
            <p className="text-sm text-secondary-gray mt-1">
              {getPermitTypeLabel(permit.type)}
            </p>
          </div>
          <Badge variant="secondary">Entwurf</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mb-4">
          <div>
            <span className="font-medium">Arbeitsort:</span> {permit.location}
          </div>
          <div>
            <span className="font-medium">Antragsteller:</span> {permit.requestorName}
          </div>
          <div>
            <span className="font-medium">Abteilung:</span> {permit.department}
          </div>
          <div>
            <span className="font-medium">Erstellt:</span> {permit.createdAt ? format(new Date(permit.createdAt.toString()), "dd.MM.yyyy", { locale: de }) : "N/A"}
          </div>
        </div>
        
        <div className="border-t pt-3">
          <p className="text-sm text-secondary-gray mb-2">Beschreibung:</p>
          <p className="text-sm">{permit.description}</p>
        </div>
        
        <div className="flex gap-2 mt-4">
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleEdit(permit)}
            className="flex-1"
          >
            <Edit3 className="w-4 h-4 mr-2" />
            Bearbeiten
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleCreateTemplate(permit)}
          >
            <Copy className="w-4 h-4 mr-2" />
            Als Vorlage
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleDelete(permit)}
            className="text-red-600 hover:text-red-700"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-industrial-light">
      <NavigationHeader />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-industrial-gray">Entwürfe & Vorlagen</h1>
          <p className="text-secondary-gray mt-2">
            Verwalten Sie Ihre Genehmigungsentwürfe und erstellen Sie Vorlagen für die Wiederverwendung.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Drafts */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <Button 
                onClick={() => setCreateModalOpen(true)}
                className="bg-safety-blue text-white hover:bg-blue-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Neue Genehmigung erstellen
              </Button>
              
              <div className="flex gap-2 flex-1">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary-gray w-4 h-4" />
                  <Input
                    placeholder="Entwürfe durchsuchen..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
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
        <EditPermitModalSimple
          permit={selectedPermit}
          open={editModalOpen}
          onOpenChange={setEditModalOpen}
        />

        {/* Create Modal */}
        <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Neue Arbeitserlaubnis erstellen</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Genehmigungstyp *</Label>
                  <Select value={formData.type} onValueChange={(value) => updateField("type", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Typ auswählen" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hot_work">Heißarbeiten</SelectItem>
                      <SelectItem value="confined_space">Enger Raum</SelectItem>
                      <SelectItem value="electrical">Elektrische Arbeiten</SelectItem>
                      <SelectItem value="height_work">Höhenarbeiten</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Arbeitsort *</Label>
                  <Input value={formData.location} onChange={(e) => updateField("location", e.target.value)} />
                </div>
              </div>

              <div>
                <Label>Beschreibung der Arbeiten *</Label>
                <Textarea value={formData.description} onChange={(e) => updateField("description", e.target.value)} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Antragsteller *</Label>
                  <Input value={formData.requestorName} onChange={(e) => updateField("requestorName", e.target.value)} />
                </div>
                <div>
                  <Label>Abteilung *</Label>
                  <Input value={formData.department} onChange={(e) => updateField("department", e.target.value)} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Kontaktnummer</Label>
                  <Input value={formData.contactNumber} onChange={(e) => updateField("contactNumber", e.target.value)} />
                </div>
                <div>
                  <Label>Notfallkontakt</Label>
                  <Input value={formData.emergencyContact} onChange={(e) => updateField("emergencyContact", e.target.value)} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Startdatum</Label>
                  <Input type="datetime-local" value={formData.startDate} onChange={(e) => updateField("startDate", e.target.value)} />
                </div>
                <div>
                  <Label>Enddatum</Label>
                  <Input type="datetime-local" value={formData.endDate} onChange={(e) => updateField("endDate", e.target.value)} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Abteilungsleiter *</Label>
                  <Input value={formData.departmentHead} onChange={(e) => updateField("departmentHead", e.target.value)} />
                </div>
                <div>
                  <Label>Instandhaltung/Technik *</Label>
                  <Input value={formData.maintenanceApprover} onChange={(e) => updateField("maintenanceApprover", e.target.value)} />
                </div>
              </div>

              <div>
                <Label>Risikostufe</Label>
                <Select value={formData.riskLevel} onValueChange={(value) => updateField("riskLevel", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Risikostufe auswählen" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Niedrig</SelectItem>
                    <SelectItem value="medium">Mittel</SelectItem>
                    <SelectItem value="high">Hoch</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Identifizierte Gefahren</Label>
                <Textarea value={formData.identifiedHazards} onChange={(e) => updateField("identifiedHazards", e.target.value)} />
              </div>

              <div>
                <Label>Zusätzliche Kommentare</Label>
                <Textarea value={formData.additionalComments} onChange={(e) => updateField("additionalComments", e.target.value)} />
              </div>
            </div>

            <div className="flex justify-between pt-6 border-t">
              <Button variant="outline" onClick={() => setCreateModalOpen(false)}>
                Abbrechen
              </Button>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={handleCreateDraft}
                  disabled={createDraftMutation.isPending}
                >
                  <Save className="w-4 h-4 mr-2" />
                  Als Entwurf speichern
                </Button>
                <Button 
                  onClick={handleSubmitForApproval}
                  disabled={submitForApprovalMutation.isPending}
                  className="bg-safety-blue text-white hover:bg-blue-700"
                >
                  <Send className="w-4 h-4 mr-2" />
                  Zur Genehmigung senden
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Template Creation Modal */}
        <Dialog open={templateModalOpen} onOpenChange={setTemplateModalOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Vorlage erstellen</DialogTitle>
            </DialogHeader>
            
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
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}