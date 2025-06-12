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
    if (mode === 'edit' && currentPermit && open) {
      const formatDate = (date: string | Date | null): string => {
        if (!date) return "";
        const d = typeof date === 'string' ? new Date(date) : date;
        return d.toISOString().slice(0, 16);
      };

      form.reset({
        type: currentPermit.type || "",
        workDescription: currentPermit.description || "",
        location: currentPermit.location || "",
        requestedBy: currentPermit.requestorName || "",
        department: currentPermit.department || "",
        plannedStartDate: formatDate(currentPermit.startDate),
        plannedEndDate: formatDate(currentPermit.endDate),
        emergencyContact: currentPermit.emergencyContact || "",
        identifiedHazards: currentPermit.identifiedHazards || "",
        selectedHazards: currentPermit.selectedHazards || [],
        hazardNotes: currentPermit.hazardNotes || "",
        completedMeasures: currentPermit.completedMeasures || [],
        status: currentPermit.status || "draft",
        performerName: currentPermit.performerName || "",
        additionalComments: currentPermit.additionalComments || "",
        immediateActions: currentPermit.immediateActions || "",
        beforeWorkStarts: currentPermit.beforeWorkStarts || "",
        complianceNotes: currentPermit.complianceNotes || "",
        overallRisk: currentPermit.overallRisk || "",
      });

      // Parse hazard notes if they exist
      if (currentPermit.hazardNotes) {
        try {
          setHazardNotes(JSON.parse(currentPermit.hazardNotes));
        } catch {
          setHazardNotes({});
        }
      }
    } else if (mode === 'create' && open) {
      form.reset();
      setHazardNotes({});
    }
  }, [currentPermit, open, mode, form]);

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
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="basic">Grunddaten</TabsTrigger>
                <TabsTrigger value="hazards">Gefährdungen</TabsTrigger>
                <TabsTrigger value="approvals">Genehmigungen</TabsTrigger>
                {mode === 'edit' && <TabsTrigger value="ai-suggestions">KI-Vorschläge</TabsTrigger>}
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
                    <FormField
                      control={form.control}
                      name="identifiedHazards"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Identifizierte Gefährdungen</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Beschreibung der identifizierten Gefährdungen"
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
                          <FormLabel>Maßnahmen vor Arbeitsbeginn</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Vorsorgemaßnahmen vor Beginn der Arbeiten"
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

              {mode === 'edit' && permit && (
                <TabsContent value="ai-suggestions" className="space-y-4">
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