import React, { useState } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import type { Permit } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { AiSuggestions } from "@/components/ai-suggestions";
import { SignaturePad } from "@/components/signature-pad";
import { PermitAttachments } from "@/components/permit-attachments";
import { StatusIndicator } from "@/components/status-indicator";
import { StatusTimeline } from "@/components/status-timeline";
import { WorkflowVisualization } from "@/components/workflow-visualization";
import { WorkflowButtons } from "@/components/workflow-buttons";
import { WORKFLOW_CONFIG } from "@/lib/workflow-config";
import { canEditPermit } from "@/lib/permissions";
import { AlertTriangle, Info, Save, Send, ArrowLeft, CheckCircle, Activity } from "lucide-react";

interface EditPermitModalUnifiedProps {
  permit: Permit | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const editPermitSchema = z.object({
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

type EditPermitFormData = z.infer<typeof editPermitSchema>;

export function EditPermitModalUnified({ permit, open, onOpenChange }: EditPermitModalUnifiedProps) {
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

  // Get current permit data
  const { data: currentPermit } = useQuery<Permit>({
    queryKey: [`/api/permits/${permit?.id}`],
    enabled: !!permit?.id,
  });

  const form = useForm<EditPermitFormData>({
    resolver: zodResolver(editPermitSchema),
    defaultValues: {
      type: permit?.type || "",
      workDescription: permit?.workDescription || "",
      location: permit?.location || "",
      workLocationId: permit?.workLocationId || undefined,
      requestedBy: permit?.requestedBy || "",
      department: permit?.department || "",
      plannedStartDate: permit?.plannedStartDate || "",
      plannedEndDate: permit?.plannedEndDate || "",
      emergencyContact: permit?.emergencyContact || "",
      departmentHeadApproval: permit?.departmentHeadApproval || false,
      safetyOfficerApproval: permit?.safetyOfficerApproval || false,
      maintenanceApproval: permit?.maintenanceApproval || false,
      departmentHeadId: permit?.departmentHeadId || undefined,
      safetyOfficerId: permit?.safetyOfficerId || undefined,
      maintenanceApproverId: permit?.maintenanceApproverId || undefined,
      identifiedHazards: permit?.identifiedHazards || "",
      selectedHazards: permit?.selectedHazards || [],
      hazardNotes: permit?.hazardNotes || "",
      completedMeasures: permit?.completedMeasures || [],
      status: permit?.status || "draft",
      performerName: permit?.performerName || "",
      performerSignature: permit?.performerSignature || "",
      workStartedAt: permit?.workStartedAt || "",
      workCompletedAt: permit?.workCompletedAt || "",
      additionalComments: permit?.additionalComments || "",
      immediateActions: permit?.immediateActions || "",
      beforeWorkStarts: permit?.beforeWorkStarts || "",
      complianceNotes: permit?.complianceNotes || "",
      overallRisk: permit?.overallRisk || "",
    },
  });

  // Update form
  const updateMutation = useMutation({
    mutationFn: async (data: EditPermitFormData) => {
      if (!permit?.id) throw new Error("Permit ID fehlt");
      return apiRequest(`/api/permits/${permit.id}`, "PATCH", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/permits/${permit!.id}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/permits"] });
      toast({
        title: "Erfolg",
        description: "Arbeitserlaubnis wurde erfolgreich aktualisiert.",
      });
    },
    onError: (error: Error) => {
      const errorMessage = error.message || "Unbekannter Fehler beim Aktualisieren der Arbeitserlaubnis.";
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
      queryClient.invalidateQueries({ queryKey: [`/api/permits/${permit!.id}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/permits"] });
      toast({
        title: "Erfolg",
        description: "Status erfolgreich aktualisiert.",
      });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      const errorMessage = error.message || "Fehler beim Status-Update.";
      toast({
        title: "Fehler",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: EditPermitFormData) => {
    updateMutation.mutate(data);
  };

  if (!permit) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-industrial-gray flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Arbeitserlaubnis bearbeiten - {permit.permitId}
          </DialogTitle>
          <DialogDescription>
            Bearbeiten Sie die Arbeitserlaubnis mit vollständiger TRBS-Gefährdungsbeurteilung und Status-Management.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid w-full grid-cols-6">
                <TabsTrigger value="basic">Grunddaten</TabsTrigger>
                <TabsTrigger value="hazards">Gefährdungen</TabsTrigger>
                <TabsTrigger value="approvals">Genehmigungen</TabsTrigger>
                <TabsTrigger value="execution">Durchführung</TabsTrigger>
                <TabsTrigger value="ai-suggestions">KI-Vorschläge</TabsTrigger>
                <TabsTrigger value="workflow">Status</TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Arbeitserlaubnis Grunddaten</CardTitle>
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
                                  <SelectValue placeholder="Genehmigungstyp auswählen..." />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="hot_work">Heißarbeiten</SelectItem>
                                <SelectItem value="chemical">Chemische Arbeiten</SelectItem>
                                <SelectItem value="confined_space">Arbeiten in engen Räumen</SelectItem>
                                <SelectItem value="electrical">Elektrische Arbeiten</SelectItem>
                                <SelectItem value="height">Arbeiten in der Höhe</SelectItem>
                                <SelectItem value="excavation">Erdarbeiten</SelectItem>
                                <SelectItem value="maintenance">Wartungsarbeiten</SelectItem>
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
                              <Input placeholder="Abteilung eingeben" {...field} />
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
                              placeholder="Detaillierte Beschreibung der durchzuführenden Arbeiten..." 
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
                        name="plannedStartDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Geplantes Startdatum</FormLabel>
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
                            <FormLabel>Geplantes Enddatum</FormLabel>
                            <FormControl>
                              <Input type="datetime-local" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

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
                              value={field.value?.toString() || ""}
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
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="hazards" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>TRBS Gefährdungsbeurteilung</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* TRBS Hazard Categories */}
                    {[
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
                    ].map((category) => (
                      <Card key={category.id} className="border-l-4 border-l-safety-orange">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-lg text-industrial-gray">
                            {category.id}. {category.category}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="grid gap-3">
                            {category.hazards.map((hazard, hazardIndex) => {
                              const hazardId = `${category.id}-${hazardIndex}`;
                              const isSelected = form.watch('selectedHazards')?.includes(hazardId);
                              
                              return (
                                <div key={hazardIndex} className="space-y-3">
                                  <FormField
                                    control={form.control}
                                    name="selectedHazards"
                                    render={({ field }) => (
                                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                        <FormControl>
                                          <Checkbox
                                            checked={field.value?.includes(hazardId) || false}
                                            onCheckedChange={(checked) => {
                                              const current = field.value || [];
                                              if (checked) {
                                                field.onChange([...current, hazardId]);
                                              } else {
                                                field.onChange(current.filter((id: string) => id !== hazardId));
                                              }
                                            }}
                                          />
                                        </FormControl>
                                        <div className="flex-1 space-y-1 leading-none">
                                          <FormLabel className="text-sm font-normal">
                                            {hazard}
                                          </FormLabel>
                                        </div>
                                      </FormItem>
                                    )}
                                  />
                                  
                                  {/* Kleines Freitextfeld für jede TRBS-Gefährdung */}
                                  {isSelected && (
                                    <div className="ml-6 mt-2">
                                      <FormField
                                        control={form.control}
                                        name="hazardNotes"
                                        render={({ field }) => (
                                          <FormItem>
                                            <FormControl>
                                              <Textarea
                                                placeholder="Zusätzliche Notizen zu dieser Gefährdung..."
                                                className="min-h-[60px] text-sm"
                                                value={(() => {
                                                  const notes = field.value;
                                                  if (typeof notes === 'string') {
                                                    try {
                                                      const parsed = JSON.parse(notes);
                                                      return parsed[hazardId] || '';
                                                    } catch {
                                                      return '';
                                                    }
                                                  }
                                                  return notes?.[hazardId] || '';
                                                })()}
                                                onChange={(e) => {
                                                  const currentNotes = field.value;
                                                  let notesObj = {};
                                                  
                                                  if (typeof currentNotes === 'string') {
                                                    try {
                                                      notesObj = JSON.parse(currentNotes);
                                                    } catch {
                                                      notesObj = {};
                                                    }
                                                  } else if (currentNotes) {
                                                    notesObj = currentNotes;
                                                  }
                                                  
                                                  notesObj[hazardId] = e.target.value;
                                                  field.onChange(JSON.stringify(notesObj));
                                                }}
                                              />
                                            </FormControl>
                                          </FormItem>
                                        )}
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
                    
                    {/* Allgemeine Maßnahmen */}
                    <div className="space-y-4 mt-6">
                      <h4 className="text-lg font-semibold text-gray-900">Allgemeine Sicherheitsmaßnahmen</h4>
                      
                      <FormField
                        control={form.control}
                        name="immediateMeasures"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Allgemeine Maßnahmen</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Beschreiben Sie allgemeine Sicherheitsmaßnahmen für diese Arbeitserlaubnis..."
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
                        name="preventiveMeasures"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Maßnahmen vor Arbeitsbeginn</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Beschreiben Sie spezifische Maßnahmen, die vor Arbeitsbeginn durchzuführen sind..."
                                className="min-h-[100px]"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Risikobewertung und zusätzliche Informationen */}
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
                          <Select onValueChange={field.onChange} value={field.value || ""}>
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
                              placeholder="Beschreiben Sie weitere identifizierte Gefahren, spezielle Bedingungen oder wichtige Kommentare..."
                              className="min-h-[120px]"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="additionalComments"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Weitere Anmerkungen</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Zusätzliche Anmerkungen, besondere Hinweise oder Auflagen..."
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

              <TabsContent value="approvals" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Genehmigungsverantwortliche</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-3">
                        <FormField
                          control={form.control}
                          name="departmentHeadId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Abteilungsleitung</FormLabel>
                              <Select 
                                onValueChange={(value) => field.onChange(value ? Number(value) : undefined)} 
                                value={field.value?.toString() || ""}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Abteilungsleitung auswählen..." />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {departmentHeads.map((head) => (
                                    <SelectItem key={head.id} value={head.id.toString()}>
                                      {head.username} - {head.role}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />


                      </div>

                      <div className="space-y-3">
                        <FormField
                          control={form.control}
                          name="safetyOfficerId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Sicherheitsbeauftragter</FormLabel>
                              <Select 
                                onValueChange={(value) => field.onChange(value ? Number(value) : undefined)} 
                                value={field.value?.toString() || ""}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Sicherheitsbeauftragter auswählen..." />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {safetyOfficers.map((officer) => (
                                    <SelectItem key={officer.id} value={officer.id.toString()}>
                                      {officer.username} - {officer.role}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />


                      </div>

                      <div className="space-y-3">
                        <FormField
                          control={form.control}
                          name="maintenanceApproverId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Technik/Wartung</FormLabel>
                              <Select 
                                onValueChange={(value) => field.onChange(value ? Number(value) : undefined)} 
                                value={field.value?.toString() || ""}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Technik/Wartung auswählen..." />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {maintenanceApprovers.map((approver) => (
                                    <SelectItem key={approver.id} value={approver.id.toString()}>
                                      {approver.username} - {approver.role}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />


                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="execution" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Arbeitsdurchführung</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {permit.status === "active" ? (
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
                                <FormLabel>Arbeit begonnen am</FormLabel>
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
                                <FormLabel>Arbeit abgeschlossen am</FormLabel>
                                <FormControl>
                                  <Input type="datetime-local" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <SignaturePad
                          onSignatureChange={(signature) => form.setValue("performerSignature", signature)}
                          existingSignature={form.watch("performerSignature")}
                          disabled={false}
                        />

                        <Alert>
                          <AlertTriangle className="h-4 w-4" />
                          <AlertDescription>
                            Die digitale Unterschrift wird auf dem gedruckten Arbeitserlaubnis angezeigt. 
                            Stellen Sie sicher, dass alle Informationen korrekt sind, bevor Sie unterschreiben.
                          </AlertDescription>
                        </Alert>
                      </>
                    ) : (
                      <Alert>
                        <Info className="h-4 w-4" />
                        <AlertDescription>
                          Die Durchführungsdetails können nur bei aktiven Arbeitserlaubnissen bearbeitet werden.
                        </AlertDescription>
                      </Alert>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="ai-suggestions" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5" />
                      KI-Verbesserungsvorschläge
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <AiSuggestions permitId={permit.id} />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="workflow" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Activity className="h-5 w-5" />
                      Status-Management
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h4 className="font-semibold mb-3">Aktueller Status</h4>
                        <StatusIndicator status={currentPermit?.status || permit.status} />
                      </div>
                      
                      <div>
                        <h4 className="font-semibold mb-3">Verfügbare Aktionen</h4>
                        <WorkflowButtons 
                          permit={currentPermit || permit} 
                          currentUser={user} 
                          onAction={async (actionId: string, nextStatus: string) => {
                            workflowMutation.mutate({ permitId: permit.id, action: actionId, nextStatus });
                          }}
                          isLoading={workflowMutation.isPending}
                        />
                      </div>
                    </div>

                    <div>
                      <h4 className="font-semibold mb-3">Workflow-Visualisierung</h4>
                      <WorkflowVisualization 
                        currentStatus={currentPermit?.status || permit.status} 
                        permitType={permit.type}
                      />
                    </div>

                    <div>
                      <h4 className="font-semibold mb-3">Status-Verlauf</h4>
                      <StatusTimeline permitId={permit.id} />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            <div className="flex justify-between pt-6 border-t">
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  Abbrechen
                </Button>
                
                <Button
                  type="submit"
                  disabled={updateMutation.isPending}
                  className="bg-industrial-gray hover:bg-industrial-gray/90"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Speichern
                </Button>
              </div>

              <div>
                <PermitAttachments permitId={permit.id} />
              </div>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}