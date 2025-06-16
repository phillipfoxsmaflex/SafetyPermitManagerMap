import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { AiSuggestions } from "@/components/ai-suggestions";
import { PermitAttachments } from "@/components/permit-attachments";
import { TemporaryAttachments } from "@/components/temporary-attachments";
import { CreateAiSuggestions } from "@/components/create-ai-suggestions";
import { StatusIndicator } from "@/components/status-indicator";
import { StatusTimeline } from "@/components/status-timeline";
import { WorkflowVisualization } from "@/components/workflow-visualization";
import { WorkflowButtons } from "@/components/workflow-buttons";
import trbsData from "@/data/trbs_complete_hazards.json";
import { canEditPermit } from "@/lib/permissions";
import { AlertTriangle, Info, Save, Send, ArrowLeft, CheckCircle, Activity, Paperclip } from "lucide-react";
import type { Permit } from "@shared/schema";

interface CreateEditModalCompleteProps {
  permit: Permit | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode?: 'edit' | 'create';
}

const editPermitSchema = z.object({
  type: z.string().min(1, "Genehmigungstyp ist erforderlich"),
  department: z.string().min(1, "Abteilung ist erforderlich"),
  workDescription: z.string().min(1, "Arbeitsbeschreibung ist erforderlich"),
  requestedBy: z.string().min(1, "Beantragt von ist erforderlich"),
  plannedStartDate: z.string().min(1, "Geplantes Startdatum ist erforderlich"),
  plannedEndDate: z.string().min(1, "Geplantes Enddatum ist erforderlich"),
  location: z.string().optional(),
  emergencyContact: z.string().optional(),
  workLocationId: z.number().optional(),
  departmentHeadApproval: z.boolean().optional(),
  safetyOfficerApproval: z.boolean().optional(),
  maintenanceApproval: z.boolean().optional(),
  departmentHeadId: z.number().optional(),
  safetyOfficerId: z.number().optional(),
  maintenanceApproverId: z.number().optional(),
  identifiedHazards: z.string().optional(),
  selectedHazards: z.array(z.string()).optional(),
  hazardNotes: z.string().optional(),
  immediateMeasures: z.string().optional(),
  preventiveMeasures: z.string().optional(),
  completedMeasures: z.array(z.string()).optional(),
  status: z.string().optional(),
  performerName: z.string().optional(),
  performerSignature: z.string().optional(),
  workStartedAt: z.string().optional(),
  workCompletedAt: z.string().optional(),
  additionalComments: z.string().optional(),
  immediateActions: z.string().optional(),
  beforeWorkStarts: z.string().optional(),
  complianceNotes: z.string().optional(),
  overallRisk: z.string().optional(),
});

type EditPermitFormData = z.infer<typeof editPermitSchema>;

export function CreateEditModalComplete({ permit, open, onOpenChange, mode = 'edit' }: CreateEditModalCompleteProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [temporaryAttachments, setTemporaryAttachments] = useState<any[]>([]);
  const [analyzeLoading, setAnalyzeLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [hazardNotes, setHazardNotes] = useState<{ [key: string]: string }>({});

  // Fetch dropdown data
  const { data: workLocations = [] } = useQuery<any[]>({
    queryKey: ["/api/work-locations/active"],
  });

  const { data: departmentHeads = [] } = useQuery<any[]>({
    queryKey: ["/api/users/department-heads"],
  });

  const { data: safetyOfficers = [] } = useQuery<any[]>({
    queryKey: ["/api/users/safety-officers"],
  });

  const { data: maintenanceApprovers = [] } = useQuery<any[]>({
    queryKey: ["/api/users/maintenance-approvers"],
  });

  const { data: allUsers = [] } = useQuery<any[]>({
    queryKey: ["/api/users"],
  });

  // Get current permit data for edit mode
  const { data: currentPermit, isLoading: isLoadingPermit } = useQuery<Permit>({
    queryKey: [`/api/permits/${permit?.id}`],
    enabled: mode === 'edit' && !!permit?.id,
    staleTime: 0, // Always refetch to ensure latest data
  });

  console.log("Current permit from query:", currentPermit);

  const form = useForm<EditPermitFormData>({
    resolver: zodResolver(editPermitSchema),
    defaultValues: {
      type: "",
      department: "",
      workDescription: "",
      requestedBy: "",
      plannedStartDate: "",
      plannedEndDate: "",
      location: "",
      emergencyContact: "",
      workLocationId: undefined,
      departmentHeadApproval: false,
      safetyOfficerApproval: false,
      maintenanceApproval: false,
      departmentHeadId: undefined,
      safetyOfficerId: undefined,
      maintenanceApproverId: undefined,
      identifiedHazards: "",
      selectedHazards: [],
      hazardNotes: "",
      immediateMeasures: "",
      preventiveMeasures: "",
      completedMeasures: [],
      status: "draft",
      performerName: "",
      performerSignature: "",
      workStartedAt: "",
      workCompletedAt: "",
      additionalComments: "",
      immediateActions: "",
      beforeWorkStarts: "",
      complianceNotes: "",
      overallRisk: "",
    },
  });

  // Sync form with latest permit data whenever currentPermit changes (only in edit mode)
  useEffect(() => {
    if (mode === 'edit' && open && (currentPermit || permit)) {
      // Use currentPermit if available, otherwise fall back to permit prop
      const permitData = currentPermit || permit;
      console.log("Syncing form with permit data:", permitData.id);
      console.log("Permit workLocationId:", permitData.workLocationId);
      console.log("Full permit data:", permitData);
      
      // Format dates properly for datetime-local input
      const formatDate = (date: string | Date | null): string => {
        if (!date) return "";
        const d = typeof date === 'string' ? new Date(date) : date;
        return d.toISOString().slice(0, 16);
      };

      form.reset({
        type: permitData.type || "",
        department: permitData.department || "",
        workDescription: permitData.description || "",
        requestedBy: permitData.requestorName || "",
        plannedStartDate: formatDate(permitData.startDate),
        plannedEndDate: formatDate(permitData.endDate),
        location: permitData.location || "",
        emergencyContact: permitData.emergencyContact || "",
        workLocationId: permitData.workLocationId || undefined,
        departmentHeadApproval: permitData.departmentHeadApproval || false,
        safetyOfficerApproval: permitData.safetyOfficerApproval || false,
        maintenanceApproval: permitData.maintenanceApproval || false,
        departmentHeadId: undefined, // Not using individual IDs anymore
        safetyOfficerId: undefined, // Not using individual IDs anymore  
        maintenanceApproverId: undefined, // Not using individual IDs anymore
        identifiedHazards: permitData.identifiedHazards || "",
        selectedHazards: permitData.selectedHazards || [],
        hazardNotes: permitData.hazardNotes || "",
        immediateMeasures: "",
        preventiveMeasures: "",
        completedMeasures: permitData.completedMeasures || [],
        status: permitData.status || "draft",
        performerName: permitData.performerName || "",
        performerSignature: permitData.performerSignature || "",
        workStartedAt: formatDate(permitData.workStartedAt),
        workCompletedAt: formatDate(permitData.workCompletedAt),
        additionalComments: permitData.additionalComments || "",
        immediateActions: permitData.immediateActions || "",
        beforeWorkStarts: permitData.beforeWorkStarts || "",
        complianceNotes: permitData.complianceNotes || "",
        overallRisk: permitData.overallRisk || "",
      });

      // Parse hazard notes if they exist
      if (permitData.hazardNotes) {
        try {
          setHazardNotes(JSON.parse(permitData.hazardNotes));
        } catch {
          setHazardNotes({});
        }
      }
    } else if (mode === 'create' && open) {
      // Reset form for create mode
      form.reset();
      setHazardNotes({});
    }
  }, [currentPermit, open, mode, form]);

  // Submit mutation
  const submitMutation = useMutation({
    mutationFn: async (data: EditPermitFormData) => {
      if (mode === 'create') {
        const createData = {
          type: data.type,
          department: data.department,
          description: data.workDescription,
          requestorName: data.requestedBy,
          startDate: data.plannedStartDate,
          endDate: data.plannedEndDate,
          location: data.location,
          emergencyContact: data.emergencyContact,
          workLocationId: data.workLocationId,
          departmentHeadApproval: data.departmentHeadApproval,
          safetyOfficerApproval: data.safetyOfficerApproval,
          maintenanceApproval: data.maintenanceApproval,
          departmentHeadId: data.departmentHeadId,
          safetyOfficerId: data.safetyOfficerId,
          maintenanceApproverId: data.maintenanceApproverId,
          identifiedHazards: data.identifiedHazards,
          selectedHazards: data.selectedHazards || [],
          hazardNotes: JSON.stringify(hazardNotes),
          immediateMeasures: data.immediateMeasures,
          preventiveMeasures: data.preventiveMeasures,
          completedMeasures: data.completedMeasures || [],
          performerName: data.performerName,
          additionalComments: data.additionalComments,
          immediateActions: data.immediateActions,
          beforeWorkStarts: data.beforeWorkStarts,
          complianceNotes: data.complianceNotes,
          overallRisk: data.overallRisk,
          departmentHead: departmentHeads.find(head => head.id === data.departmentHeadId)?.fullName || "",
          safetyOfficer: safetyOfficers.find(officer => officer.id === data.safetyOfficerId)?.fullName || "",
          maintenanceApprover: maintenanceApprovers.find(approver => approver.id === data.maintenanceApproverId)?.fullName || "",
          status: "draft",
        };
        return apiRequest("/api/permits", "POST", createData);
      } else {
        if (!permit?.id) throw new Error("Permit ID fehlt");
        const updateData = {
          ...data,
          workLocationId: data.workLocationId,
          hazardNotes: JSON.stringify(hazardNotes),
          selectedHazards: data.selectedHazards || [],
          completedMeasures: data.completedMeasures || [],
        };
        return apiRequest(`/api/permits/${permit.id}`, "PATCH", updateData);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/permits"] });
      queryClient.invalidateQueries({ queryKey: ["/api/permits/stats"] });
      if (mode === 'edit' && permit?.id) {
        queryClient.invalidateQueries({ queryKey: [`/api/permits/${permit.id}`] });
        // Force refetch of current permit data
        queryClient.refetchQueries({ queryKey: [`/api/permits/${permit.id}`] });
      }
      toast({
        title: "Erfolg",
        description: mode === 'create' 
          ? "Arbeitserlaubnis wurde erfolgreich erstellt." 
          : "Arbeitserlaubnis wurde erfolgreich aktualisiert.",
      });
      onOpenChange(false);
      if (mode === 'create') {
        form.reset();
        setHazardNotes({});
      }
    },
    onError: (error: Error) => {
      const errorMessage = error.message || (mode === 'create' 
        ? "Unbekannter Fehler beim Erstellen der Arbeitserlaubnis."
        : "Unbekannter Fehler beim Aktualisieren der Arbeitserlaubnis.");
      toast({
        title: "Fehler",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  // Workflow mutation
  const workflowMutation = useMutation({
    mutationFn: async ({ permitId, action, nextStatus }: { permitId: number; action: string; nextStatus: string }) => {
      return apiRequest(`/api/permits/${permitId}/workflow`, "POST", { action, nextStatus });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/permits"] });
      if (permit?.id) {
        queryClient.invalidateQueries({ queryKey: [`/api/permits/${permit.id}`] });
      }
      toast({
        title: "Status aktualisiert",
        description: "Der Genehmigungsstatus wurde erfolgreich aktualisiert.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Fehler",
        description: error.message || "Fehler beim Aktualisieren des Status.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: EditPermitFormData) => {
    submitMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="text-industrial-gray flex items-center gap-2">
            <Activity className="h-5 w-5" />
            {mode === 'create' ? 'Neue Arbeitserlaubnis erstellen' : `Arbeitserlaubnis bearbeiten - ${permit?.permitId}`}
          </DialogTitle>
          <DialogDescription>
            {mode === 'create' 
              ? 'Erstellen Sie eine neue Arbeitserlaubnis mit vollständiger TRBS-Gefährdungsbeurteilung.'
              : 'Bearbeiten Sie die Arbeitserlaubnis mit vollständiger TRBS-Gefährdungsbeurteilung und Status-Management.'
            }
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[75vh] overflow-y-auto pr-2">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid w-full grid-cols-6">
                <TabsTrigger value="basic">Grunddaten</TabsTrigger>
                <TabsTrigger value="hazards">Gefährdungen</TabsTrigger>
                <TabsTrigger value="approvals">Genehmigungen</TabsTrigger>
                <TabsTrigger value="execution">Durchführung</TabsTrigger>
                <TabsTrigger value="attachments">Anhänge</TabsTrigger>
                <TabsTrigger value="workflow">KI-Vorschläge</TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Grundlegende Informationen</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="type"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Genehmigungstyp</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Typ auswählen" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="general">Allgemeiner Erlaubnisschein</SelectItem>
                                <SelectItem value="hot_work">Heißarbeiten (Schweißen, Schneiden, Löten)</SelectItem>
                                <SelectItem value="height_work">Arbeiten in der Höhe (&gt;2m Absturzgefahr)</SelectItem>
                                <SelectItem value="confined_space">Arbeiten in engen Räumen/Behältern</SelectItem>
                                <SelectItem value="electrical_work">Elektrische Arbeiten (Schaltanlagen, Kabel)</SelectItem>
                                <SelectItem value="chemical_work">Arbeiten mit Gefahrstoffen</SelectItem>
                                <SelectItem value="machinery_work">Arbeiten an Maschinen/Anlagen</SelectItem>
                                <SelectItem value="excavation">Erdarbeiten/Grabungen</SelectItem>
                                <SelectItem value="maintenance">Instandhaltungsarbeiten</SelectItem>
                                <SelectItem value="cleaning">Reinigungs-/Wartungsarbeiten</SelectItem>
                                <SelectItem value="other">Sonstige Arbeiten</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="department"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Abteilung</FormLabel>
                            <FormControl>
                              <Input placeholder="Zuständige Abteilung" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="workDescription"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Arbeitsbeschreibung</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Detaillierte Beschreibung der durchzuführenden Arbeiten"
                              className="min-h-[100px]"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="requestedBy"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Beantragt von</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Antragsteller auswählen..." />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {allUsers.map((user) => (
                                  <SelectItem key={user.id} value={user.fullName}>
                                    {user.fullName} ({user.department})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="emergencyContact"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Notfallkontakt</FormLabel>
                            <FormControl>
                              <Input placeholder="Notfallkontakt (optional)" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="workLocationId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Arbeitsort</FormLabel>
                            <Select 
                              onValueChange={(value) => field.onChange(value ? Number(value) : undefined)} 
                              value={field.value ? field.value.toString() : ""}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Arbeitsort auswählen..." />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {workLocations.map((location) => (
                                  <SelectItem key={location.id} value={location.id.toString()}>
                                    {location.name} - {location.description}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="location"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Spezifischer Ort (optional)</FormLabel>
                            <FormControl>
                              <Input placeholder="Detaillierte Ortsangabe..." {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="plannedStartDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Geplanter Beginn</FormLabel>
                            <FormControl>
                              <Input type="datetime-local" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="plannedEndDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Geplantes Ende</FormLabel>
                            <FormControl>
                              <Input type="datetime-local" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>


                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="hazards" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>TRBS-Gefährdungsbeurteilung</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <Label htmlFor="search">Gefährdungen suchen</Label>
                        <Input
                          id="search"
                          placeholder="Suchbegriff eingeben..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="category">Kategorie filtern</Label>
                        <Select onValueChange={(value) => setSelectedCategory(value === "all" ? null : Number(value))}>
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder="Alle Kategorien" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Alle Kategorien</SelectItem>
                            {trbsData.categories.map((category, index) => (
                              <SelectItem key={category.id} value={index.toString()}>
                                {category.category}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-4">
                      {trbsData.categories
                        .filter((category, index) => {
                          if (selectedCategory !== null && index !== selectedCategory) return false;
                          if (!searchQuery) return true;
                          return category.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                 category.hazards.some(h => h.hazard.toLowerCase().includes(searchQuery.toLowerCase()));
                        })
                        .map((category, categoryIndex) => (
                          <Card key={category.id}>
                            <CardHeader className="pb-3">
                              <CardTitle className="text-lg">{category.category}</CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="space-y-3">
                                {category.hazards
                                  .filter(hazard => !searchQuery || 
                                    hazard.hazard.toLowerCase().includes(searchQuery.toLowerCase()))
                                  .map((hazard, hazardIndex) => {
                                    const hazardId = `${category.id}-${hazardIndex}`;
                                    return (
                                      <div key={hazardId} className="space-y-2">
                                        <FormField
                                          control={form.control}
                                          name="selectedHazards"
                                          render={({ field }) => (
                                            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                              <FormControl>
                                                <Checkbox
                                                  checked={field.value?.includes(hazardId) || false}
                                                  onCheckedChange={(checked) => {
                                                    const currentValue = field.value || [];
                                                    if (checked) {
                                                      field.onChange([...currentValue, hazardId]);
                                                    } else {
                                                      field.onChange(currentValue.filter((id: string) => id !== hazardId));
                                                    }
                                                  }}
                                                />
                                              </FormControl>
                                              <div className="flex-1 space-y-1">
                                                <FormLabel className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                                  {hazard.hazard}
                                                </FormLabel>
                                              </div>
                                            </FormItem>
                                          )}
                                        />
                                        
                                        {form.watch("selectedHazards")?.includes(hazardId) && (
                                          <div className="ml-6">
                                            <Label htmlFor={`hazard-note-${hazardId}`}>Anmerkungen zu dieser Gefährdung</Label>
                                            <Textarea
                                              id={`hazard-note-${hazardId}`}
                                              placeholder="Spezifische Anmerkungen oder Maßnahmen für diese Gefährdung..."
                                              className="mt-1"
                                              value={hazardNotes[hazardId] || ""}
                                              onChange={(e) => setHazardNotes(prev => ({
                                                ...prev,
                                                [hazardId]: e.target.value
                                              }))}
                                            />
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                    </div>

                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Allgemeine Sicherheitsmaßnahmen</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="immediateActions"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Allgemeine Maßnahmen</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="PSAgA-Ausrüstung prüfen, Wetterbedingungen bewerten, Absperrung errichten, Notfallplan aktivieren, Kommunikation etablieren"
                              className="min-h-[100px]"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="beforeWorkStarts"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Maßnahmen vor Arbeitsbeginn</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="• Behälter ordnungsgemäß entleeren und reinigen
• Betriebsmittel installieren und Funktionsprüfung durchführen
• Kommunikationsverbindung nach außen etablieren
• Rettungsmannschaft in Bereitschaft versetzen"
                              className="min-h-[100px]"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Risikobewertung und zusätzliche Informationen</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="overallRisk"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Risikokategorie</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Risikokategorie auswählen..." />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="niedrig">Niedrig - Routine-Arbeiten mit geringem Gefährdungspotential</SelectItem>
                              <SelectItem value="mittel">Mittel - Arbeiten mit moderatem Risiko, erhöhte Aufmerksamkeit erforderlich</SelectItem>
                              <SelectItem value="hoch">Hoch - Arbeiten mit erheblichem Risiko, besondere Schutzmaßnahmen erforderlich</SelectItem>
                              <SelectItem value="kritisch">Kritisch - Arbeiten mit sehr hohem Risiko, umfassende Sicherheitsvorkehrungen</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="identifiedHazards"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Zusätzliche Gefahren und Kommentare</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Absturzgefahr, rutschige Oberflächen, Witterungseinflüsse"
                              className="min-h-[100px]"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="complianceNotes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Weitere Anmerkungen</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Auffanggurt und Sicherungsseil erforderlich. Nur bei trockener Witterung arbeiten."
                              className="min-h-[100px]"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>
              </TabsContent>



              <TabsContent value="approvals" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Genehmigungen und Freigaben</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <FormField
                        control={form.control}
                        name="departmentHeadId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Abteilungsleiter</FormLabel>
                            <Select onValueChange={(value) => field.onChange(Number(value))} value={field.value?.toString()}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Abteilungsleiter auswählen" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {departmentHeads.map((head) => (
                                  <SelectItem key={head.id} value={head.id.toString()}>
                                    {head.fullName}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="safetyOfficerId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Sicherheitsbeauftragte</FormLabel>
                            <Select onValueChange={(value) => field.onChange(Number(value))} value={field.value?.toString()}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Sicherheitsbeauftragte auswählen" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {safetyOfficers.map((officer) => (
                                  <SelectItem key={officer.id} value={officer.id.toString()}>
                                    {officer.fullName}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="maintenanceApproverId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Wartungsgenehmiger</FormLabel>
                            <Select onValueChange={(value) => field.onChange(Number(value))} value={field.value?.toString()}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Wartungsgenehmiger auswählen" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {maintenanceApprovers.map((approver) => (
                                  <SelectItem key={approver.id} value={approver.id.toString()}>
                                    {approver.fullName}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="execution" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Arbeitsdurchführung</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {mode === 'edit' && permit?.status === "active" ? (
                      <>
                        <FormField
                          control={form.control}
                          name="performerName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Name des Durchführers</FormLabel>
                              <FormControl>
                                <Input placeholder="Vollständiger Name der Person, die die Arbeit durchführt" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="workStartedAt"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Arbeitsbeginn</FormLabel>
                                <FormControl>
                                  <Input type="datetime-local" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="workCompletedAt"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Arbeitsende</FormLabel>
                                <FormControl>
                                  <Input type="datetime-local" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <FormField
                          control={form.control}
                          name="performerSignature"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Digitale Unterschrift des Durchführers</FormLabel>
                              <FormControl>
                                <Input placeholder="Unterschrift oder Bestätigung" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </>
                    ) : (
                      <Alert className="mb-4">
                        <Info className="h-4 w-4" />
                        <AlertDescription>
                          {mode === 'create' 
                            ? "Die Arbeitsdurchführung wird verfügbar, sobald die Genehmigung aktiviert wurde."
                            : "Die Arbeitsdurchführung ist nur verfügbar, wenn die Genehmigung den Status 'Aktiv' hat."
                          }
                        </AlertDescription>
                      </Alert>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="attachments" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Activity className="h-5 w-5" />
                      Anhänge
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {permit ? (
                      <PermitAttachments permitId={permit.id} readonly={false} />
                    ) : (
                      <TemporaryAttachments 
                        attachments={temporaryAttachments}
                        onAttachmentsChange={setTemporaryAttachments}
                        readonly={false}
                      />
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="workflow" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5" />
                      KI-Verbesserungsvorschläge
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {permit ? (
                      <AiSuggestions permitId={permit.id} />
                    ) : (
                      <CreateAiSuggestions 
                        onAnalysisStart={async () => {
                          const formData = form.getValues();
                          const tempPermitData = {
                            type: formData.type,
                            department: formData.department,
                            description: formData.workDescription || "Temporäre Analyse-Genehmigung",
                            requestorName: formData.requestedBy || "Temporär",
                            startDate: formData.plannedStartDate || new Date().toISOString(),
                            endDate: formData.plannedEndDate || new Date().toISOString(),
                            location: formData.location || "Temporär",
                            emergencyContact: formData.emergencyContact || "+49 123 456789",
                            contactNumber: formData.emergencyContact || "+49 123 456789",
                            selectedHazards: formData.selectedHazards || [],
                            hazardNotes: JSON.stringify(hazardNotes),
                            identifiedHazards: formData.identifiedHazards || "Temporäre Analyse",
                            additionalComments: "Temporäre Genehmigung für KI-Analyse",
                            immediateActions: formData.immediateActions || "",
                            beforeWorkStarts: formData.beforeWorkStarts || "",
                            complianceNotes: formData.complianceNotes || "",
                            overallRisk: formData.overallRisk || "medium",
                            completedMeasures: formData.completedMeasures || [],
                            status: "draft"
                          };

                          const createResponse = await fetch("/api/permits", {
                            method: "POST",
                            headers: {
                              "Content-Type": "application/json",
                            },
                            body: JSON.stringify(tempPermitData)
                          });
                          const newPermit = await createResponse.json();
                          
                          if (!newPermit || !newPermit.id) {
                            throw new Error("Fehler beim Erstellen der temporären Genehmigung");
                          }
                          
                          queryClient.invalidateQueries({ queryKey: ["/api/permits"] });
                          return newPermit.id;
                        }}
                      />
                    )}
                  </CardContent>
                </Card>
                
                {mode === 'edit' && permit && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Activity className="h-5 w-5" />
                        Status und Workflow
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <WorkflowVisualization currentStatus={permit.status} />
                      
                      <StatusTimeline permitId={permit.id} />
                      
                      <WorkflowButtons 
                        permit={permit}
                        user={user!}
                        onWorkflowAction={(action, nextStatus) => {
                          workflowMutation.mutate({ 
                            permitId: permit.id, 
                            action, 
                            nextStatus 
                          });
                        }}
                      />
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </Tabs>

            <div className="flex justify-end space-x-2 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Abbrechen
              </Button>
              <Button 
                type="submit" 
                disabled={submitMutation.isPending}
                className="bg-safety-blue hover:bg-safety-blue/90"
              >
                {submitMutation.isPending ? "Wird gespeichert..." : (mode === 'create' ? "Erstellen" : "Speichern")}
              </Button>
            </div>
          </form>
        </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}