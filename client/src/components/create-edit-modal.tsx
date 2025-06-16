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
import { StatusIndicator } from "@/components/status-indicator";
import { StatusTimeline } from "@/components/status-timeline";
import { WorkflowVisualization } from "@/components/workflow-visualization";
import { WorkflowButtons } from "@/components/workflow-buttons";
import trbsData from "@/data/trbs_complete_hazards.json";
import { canEditPermit } from "@/lib/permissions";
import { AlertTriangle, Info, Save, Send, ArrowLeft, CheckCircle, Activity } from "lucide-react";
import type { Permit } from "@shared/schema";

interface CreateEditModalProps {
  permit: Permit | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode?: 'edit' | 'create';
}

const permitSchema = z.object({
  type: z.string().min(1, "Genehmigungstyp ist erforderlich"),
  workDescription: z.string().min(1, "Arbeitsbeschreibung ist erforderlich"),
  location: z.string().optional(),
  workLocationId: z.number().optional(),
  requestedBy: z.string().min(1, "Beantragt von ist erforderlich"),
  department: z.string().min(1, "Abteilung ist erforderlich"),
  plannedStartDate: z.string().min(1, "Geplantes Startdatum ist erforderlich"),
  plannedEndDate: z.string().min(1, "Geplantes Enddatum ist erforderlich"),
  emergencyContact: z.string().optional(),
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

type PermitFormData = z.infer<typeof permitSchema>;

export function CreateEditModal({ permit, open, onOpenChange, mode = 'edit' }: CreateEditModalProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
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
  const { data: currentPermit } = useQuery<Permit>({
    queryKey: [`/api/permits/${permit?.id}`],
    enabled: mode === 'edit' && !!permit?.id,
  });

  const form = useForm<PermitFormData>({
    resolver: zodResolver(permitSchema),
    defaultValues: {
      type: "",
      workDescription: "",
      location: "",
      workLocationId: undefined,
      requestedBy: "",
      department: "",
      plannedStartDate: "",
      plannedEndDate: "",
      emergencyContact: "",
      departmentHeadApproval: false,
      safetyOfficerApproval: false,
      maintenanceApproval: false,
      departmentHeadId: undefined,
      safetyOfficerId: undefined,
      maintenanceApproverId: undefined,
      identifiedHazards: "",
      selectedHazards: [],
      hazardNotes: "",
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

  // Update form with permit data in edit mode
  useEffect(() => {
    if (mode === 'edit' && open && (currentPermit || permit)) {
      const permitData = currentPermit || permit;
      if (!permitData) return;
      
      const formatDate = (date: string | Date | null): string => {
        if (!date) return "";
        const d = typeof date === 'string' ? new Date(date) : date;
        return d.toISOString().slice(0, 16);
      };

      // Find work location ID by name
      const findWorkLocationId = (locationName: string | null): number | undefined => {
        if (!locationName || !workLocations.length) return undefined;
        const location = workLocations.find(loc => loc.name === locationName);
        return location?.id;
      };
      
      // Find user ID by full name
      const findUserIdByName = (userName: string | null, userList: any[]): number | undefined => {
        if (!userName || !userList.length) return undefined;
        const user = userList.find(u => u.fullName === userName || u.username === userName);
        return user?.id;
      };

      form.reset({
        type: permitData.type || "",
        workDescription: permitData.description || "",
        location: permitData.location || "",
        workLocationId: findWorkLocationId(permitData.location),
        requestedBy: permitData.requestorName || "",
        department: permitData.department || "",
        plannedStartDate: formatDate(permitData.startDate),
        plannedEndDate: formatDate(permitData.endDate),
        emergencyContact: permitData.emergencyContact || "",
        departmentHeadApproval: permitData.departmentHeadApproval || false,
        safetyOfficerApproval: permitData.safetyOfficerApproval || false,
        maintenanceApproval: permitData.maintenanceApproval || false,
        departmentHeadId: findUserIdByName(permitData.departmentHead, departmentHeads),
        safetyOfficerId: findUserIdByName(permitData.safetyOfficer, safetyOfficers),
        maintenanceApproverId: findUserIdByName(permitData.maintenanceApprover, maintenanceApprovers),
        identifiedHazards: permitData.identifiedHazards || "",
        selectedHazards: permitData.selectedHazards || [],
        hazardNotes: permitData.hazardNotes || "",
        completedMeasures: permitData.completedMeasures || [],
        status: permitData.status || "draft",
        performerName: permitData.performerName || "",
        additionalComments: permitData.additionalComments || "",
        immediateActions: permitData.immediateActions || "",
        beforeWorkStarts: permitData.beforeWorkStarts || "",
        complianceNotes: permitData.complianceNotes || "",
        overallRisk: permitData.overallRisk || "",
      });

      // Parse hazard notes if they exist
      if (permitData.hazardNotes) {
        try {
          const notes = typeof permitData.hazardNotes === 'string' 
            ? JSON.parse(permitData.hazardNotes) 
            : permitData.hazardNotes;
          setHazardNotes(notes);
        } catch {
          setHazardNotes({});
        }
      }
    } else if (mode === 'create' && open) {
      form.reset();
      setHazardNotes({});
    }
  }, [currentPermit, permit, open, mode, form, workLocations, departmentHeads, safetyOfficers, maintenanceApprovers]);

  // Submit mutation
  const submitMutation = useMutation({
    mutationFn: async (data: PermitFormData) => {
      if (mode === 'create') {
        const createData = {
          type: data.type,
          description: data.workDescription,
          location: data.location,
          requestorName: data.requestedBy,
          department: data.department,
          startDate: data.plannedStartDate,
          endDate: data.plannedEndDate,
          emergencyContact: data.emergencyContact,
          identifiedHazards: data.identifiedHazards,
          selectedHazards: data.selectedHazards || [],
          hazardNotes: JSON.stringify(hazardNotes),
          completedMeasures: data.completedMeasures || [],
          performerName: data.performerName,
          status: "draft",
          additionalComments: data.additionalComments,
          immediateActions: data.immediateActions,
          beforeWorkStarts: data.beforeWorkStarts,
          complianceNotes: data.complianceNotes,
          overallRisk: data.overallRisk,
        };
        return apiRequest("/api/permits", "POST", createData);
      } else {
        if (!permit?.id) throw new Error("Permit ID fehlt");
        return apiRequest(`/api/permits/${permit.id}`, "PATCH", data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/permits"] });
      if (mode === 'edit' && permit?.id) {
        queryClient.invalidateQueries({ queryKey: [`/api/permits/${permit.id}`] });
      }
      toast({
        title: "Erfolg",
        description: mode === 'create' 
          ? "Arbeitserlaubnis wurde erfolgreich erstellt." 
          : "Arbeitserlaubnis wurde erfolgreich aktualisiert.",
      });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      const errorMessage = error.message || (mode === 'create' 
        ? "Fehler beim Erstellen der Arbeitserlaubnis."
        : "Fehler beim Aktualisieren der Arbeitserlaubnis.");
      toast({
        title: "Fehler",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: PermitFormData) => {
    submitMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
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

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid w-full grid-cols-6">
                <TabsTrigger value="basic">Grunddaten</TabsTrigger>
                <TabsTrigger value="hazards">Gefährdungen</TabsTrigger>
                <TabsTrigger value="measures">Maßnahmen</TabsTrigger>
                <TabsTrigger value="approvals">Genehmigungen</TabsTrigger>
                <TabsTrigger value="execution">Durchführung</TabsTrigger>
                {mode === 'edit' && <TabsTrigger value="workflow">Workflow</TabsTrigger>}
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
                                <SelectItem value="confined_space">Arbeiten in engen Räumen</SelectItem>
                                <SelectItem value="hot_work">Heiße Arbeiten</SelectItem>
                                <SelectItem value="height_work">Arbeiten in der Höhe</SelectItem>
                                <SelectItem value="chemical_handling">Chemikalienumgang</SelectItem>
                                <SelectItem value="electrical_work">Elektrische Arbeiten</SelectItem>
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
                            <FormControl>
                              <Input placeholder="Name des Antragstellers" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="location"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Arbeitsort</FormLabel>
                            <FormControl>
                              <Input placeholder="Spezifischer Arbeitsort" {...field} />
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

                    <FormField
                      control={form.control}
                      name="emergencyContact"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Notfallkontakt</FormLabel>
                          <FormControl>
                            <Input placeholder="Name und Telefonnummer für Notfälle" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
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
                                              onChange={(e) => {
                                                const newNotes = {
                                                  ...hazardNotes,
                                                  [hazardId]: e.target.value
                                                };
                                                setHazardNotes(newNotes);
                                                form.setValue("hazardNotes", JSON.stringify(newNotes));
                                              }}
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

                    <FormField
                      control={form.control}
                      name="identifiedHazards"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Zusätzliche identifizierte Gefährdungen</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Weitere Gefährdungen, die nicht in der TRBS-Liste enthalten sind"
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

              <TabsContent value="measures" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Sicherheitsmaßnahmen</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="immediateActions"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Sofortmaßnahmen</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Unmittelbar zu treffende Sicherheitsmaßnahmen"
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
                          <FormLabel>Vorsorgemaßnahmen</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Maßnahmen, die vor Arbeitsbeginn durchgeführt werden müssen"
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
                      name="overallRisk"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Gesamtrisikobewertung</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Risikostufe wählen" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="low">Niedrig</SelectItem>
                              <SelectItem value="medium">Mittel</SelectItem>
                              <SelectItem value="high">Hoch</SelectItem>
                              <SelectItem value="critical">Kritisch</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="complianceNotes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>TRBS-Compliance-Hinweise</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Hinweise zur Einhaltung der TRBS-Vorschriften"
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

                    <FormField
                      control={form.control}
                      name="additionalComments"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Zusätzliche Kommentare</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Weitere Anmerkungen oder spezielle Anforderungen"
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
                          Die Arbeitsdurchführung ist nur verfügbar, wenn die Genehmigung den Status "Aktiv" hat.
                        </AlertDescription>
                      </Alert>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {mode === 'edit' && permit && (
                <TabsContent value="workflow" className="space-y-4">
                  <AiSuggestions permitId={permit.id} />
                </TabsContent>
              )}
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
      </DialogContent>
    </Dialog>
  );
}