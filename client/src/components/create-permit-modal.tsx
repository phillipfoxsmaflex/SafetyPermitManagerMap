import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { X, Save, AlertTriangle, Info, Search, Eye, ChevronRight, FileText, Shield, Clock } from "lucide-react";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { insertPermitSchema } from "@shared/schema";
import type { User, WorkLocation } from "@shared/schema";

const createPermitSchema = insertPermitSchema.extend({
  plannedStartDate: z.string().min(1, "Geplantes Startdatum ist erforderlich"),
  plannedEndDate: z.string().min(1, "Geplantes Enddatum ist erforderlich"),
  workDescription: z.string().min(1, "Arbeitsumfang ist erforderlich"),
  requestedBy: z.string().min(1, "Antragsteller ist erforderlich"),
  workLocationId: z.string().optional(),
  departmentHeadId: z.number().optional(),
  safetyOfficerId: z.number().optional(),
  maintenanceApproverId: z.number().optional(),
});

type CreatePermitFormData = z.infer<typeof createPermitSchema>;

interface CreatePermitModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreatePermitModal({ open, onOpenChange }: CreatePermitModalProps) {
  const [hazardNotes, setHazardNotes] = useState<{[key: string]: string}>({});
  const [selectedHazards, setSelectedHazards] = useState<string[]>([]);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch dropdown data
  const { data: workLocations = [] } = useQuery<WorkLocation[]>({
    queryKey: ["/api/work-locations/active"],
  });

  const { data: departmentHeads = [] } = useQuery<User[]>({
    queryKey: ["/api/users/department-heads"],
  });

  const { data: safetyOfficers = [] } = useQuery<User[]>({
    queryKey: ["/api/users/safety-officers"],
  });

  const { data: maintenanceApprovers = [] } = useQuery<User[]>({
    queryKey: ["/api/users/maintenance-approvers"],
  });

  const { data: allUsers = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const form = useForm<CreatePermitFormData>({
    resolver: zodResolver(createPermitSchema),
    defaultValues: {
      type: "",
      workDescription: "",
      location: "",
      workLocationId: "",
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

  const createMutation = useMutation({
    mutationFn: async (data: CreatePermitFormData) => {
      // Transform form data to match API expectations
      const submitData = {
        type: data.type,
        description: data.workDescription,
        location: data.location,
        requestorName: data.requestedBy,
        department: data.department,
        startDate: data.plannedStartDate,
        endDate: data.plannedEndDate,
        emergencyContact: data.emergencyContact,
        identifiedHazards: data.identifiedHazards,
        additionalComments: data.additionalComments,
        immediateActions: data.immediateActions,
        beforeWorkStarts: data.beforeWorkStarts,
        complianceNotes: data.complianceNotes,
        overallRisk: data.overallRisk,
        selectedHazards: selectedHazards,
        hazardNotes: JSON.stringify(hazardNotes),
        completedMeasures: data.completedMeasures || [],
        performerName: data.performerName,
        departmentHead: departmentHeads.find(head => head.id === data.departmentHeadId)?.fullName || "",
        safetyOfficer: safetyOfficers.find(officer => officer.id === data.safetyOfficerId)?.fullName || "",
        maintenanceApprover: maintenanceApprovers.find(approver => approver.id === data.maintenanceApproverId)?.fullName || "",
        status: "draft",
      };
      
      return apiRequest("/api/permits", "POST", submitData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/permits"] });
      toast({
        title: "Erfolg",
        description: "Arbeitserlaubnis wurde erfolgreich erstellt.",
      });
      onOpenChange(false);
      form.reset();
      setHazardNotes({});
      setSelectedHazards([]);
    },
    onError: (error: Error) => {
      const errorMessage = error.message || "Unbekannter Fehler beim Erstellen der Arbeitserlaubnis.";
      toast({
        title: "Fehler",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: CreatePermitFormData) => {
    console.log("Form submission data:", data);
    createMutation.mutate(data);
  };

  // Load TRBS hazard data
  const { data: trbsData } = useQuery({
    queryKey: ["/api/trbs-hazards"],
    staleTime: Infinity,
  });

  const hazardCategories = trbsData || {};

  const toggleHazard = (hazardId: string) => {
    setSelectedHazards(prev => 
      prev.includes(hazardId) 
        ? prev.filter(id => id !== hazardId)
        : [...prev, hazardId]
    );
  };

  const updateHazardNote = (hazardId: string, note: string) => {
    setHazardNotes(prev => ({
      ...prev,
      [hazardId]: note
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[95vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Neue Arbeitserlaubnis erstellen
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 overflow-hidden">
            <Tabs defaultValue="basic" className="h-full flex flex-col">
              <TabsList className="grid w-full grid-cols-3 flex-shrink-0">
                <TabsTrigger value="basic" className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Grunddaten
                </TabsTrigger>
                <TabsTrigger value="hazards" className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Gefährdungsbeurteilung
                </TabsTrigger>
                <TabsTrigger value="approvals" className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Genehmigungen
                </TabsTrigger>
              </TabsList>

              <ScrollArea className="flex-1 p-1">
                <TabsContent value="basic" className="space-y-6 mt-0">
                  {/* Grundinformationen */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Grundinformationen</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="type"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Arbeitstyp</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Arbeitstyp auswählen..." />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
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
                          name="workLocationId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Arbeitsort</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
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
                      </div>

                      <FormField
                        control={form.control}
                        name="location"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Spezifischer Arbeitsort</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="z.B. Tank 3, Halle A, Dach Gebäude B..."
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="workDescription"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Arbeitsumfang</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Detaillierte Beschreibung der durchzuführenden Arbeiten..."
                                className="min-h-[100px]"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="plannedStartDate"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Geplanter Beginn</FormLabel>
                              <FormControl>
                                <Input 
                                  type="datetime-local"
                                  {...field}
                                />
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
                                <Input 
                                  type="datetime-local"
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

                  {/* Antragsteller und Kontakt */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Antragsteller und Kontaktdaten</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="requestedBy"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Antragsteller</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="Name des Antragstellers..."
                                  {...field}
                                />
                              </FormControl>
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
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Abteilung auswählen..." />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="Engineering">Engineering</SelectItem>
                                  <SelectItem value="Maintenance">Instandhaltung</SelectItem>
                                  <SelectItem value="Production">Produktion</SelectItem>
                                  <SelectItem value="Quality">Qualitätssicherung</SelectItem>
                                  <SelectItem value="Safety">Arbeitssicherheit</SelectItem>
                                  <SelectItem value="External">Externe Firma</SelectItem>
                                </SelectContent>
                              </Select>
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
                              <Textarea 
                                placeholder="Notfallkontakte mit Telefonnummern (24h erreichbar)..."
                                className="min-h-[80px]"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="performerName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Ausführende Person(en)</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Name(n) der ausführenden Person(en)..."
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

                <TabsContent value="hazards" className="space-y-6 mt-0">
                  {/* TRBS Gefährdungsbeurteilung */}
                  <Card>
                    <CardHeader>
                      <CardTitle>TRBS-konforme Gefährdungsbeurteilung</CardTitle>
                      <Alert>
                        <Info className="h-4 w-4" />
                        <AlertDescription>
                          Wählen Sie alle zutreffenden Gefährdungen aus den TRBS-Kategorien aus und dokumentieren Sie spezifische Schutzmaßnahmen.
                        </AlertDescription>
                      </Alert>
                    </CardHeader>
                    <CardContent>
                      {Object.entries(hazardCategories).map(([categoryId, category]: [string, any]) => (
                        <Card key={categoryId} className="mb-4">
                          <CardHeader className="pb-3">
                            <CardTitle className="text-lg text-blue-700">
                              {categoryId}. {category.name}
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-3">
                              {category.hazards && Object.entries(category.hazards).map(([hazardId, hazard]: [string, any]) => {
                                const fullHazardId = `${categoryId}-${hazardId}`;
                                const isSelected = selectedHazards.includes(fullHazardId);
                                
                                return (
                                  <div key={hazardId} className="border rounded-lg p-4">
                                    <div className="flex items-start space-x-3">
                                      <Checkbox
                                        checked={isSelected}
                                        onCheckedChange={() => toggleHazard(fullHazardId)}
                                        className="mt-1"
                                      />
                                      <div className="flex-1 space-y-2">
                                        <div>
                                          <span className="font-medium text-gray-900">{hazard.name}</span>
                                          {hazard.description && (
                                            <p className="text-sm text-gray-600 mt-1">{hazard.description}</p>
                                          )}
                                        </div>
                                        
                                        {hazard.measures && (
                                          <div className="text-sm">
                                            <span className="font-medium text-green-700">Standard-Schutzmaßnahmen:</span>
                                            <p className="text-green-600 mt-1">{hazard.measures}</p>
                                          </div>
                                        )}

                                        {isSelected && (
                                          <div className="mt-3">
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                              Spezifische Anmerkungen zu dieser Gefährdung:
                                            </label>
                                            <Textarea
                                              placeholder="Spezifische Bedingungen, zusätzliche Maßnahmen oder Anmerkungen..."
                                              value={hazardNotes[fullHazardId] || ""}
                                              onChange={(e) => updateHazardNote(fullHazardId, e.target.value)}
                                              className="w-full"
                                              rows={2}
                                            />
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                      
                      {/* Allgemeine Sicherheitsmaßnahmen */}
                      <div className="space-y-4 mt-6">
                        <h4 className="text-lg font-semibold text-gray-900">Allgemeine Sicherheitsmaßnahmen</h4>
                        
                        <FormField
                          control={form.control}
                          name="immediateActions"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Sofortmaßnahmen</FormLabel>
                              <FormControl>
                                <Textarea 
                                  placeholder="Beschreiben Sie Sofortmaßnahmen, die bei Gefahr oder Notfall einzuleiten sind..."
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

                      <FormField
                        control={form.control}
                        name="complianceNotes"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Relevante Vorschriften und Normen</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="z.B. TRBS 2152-2 (Behälter), DGUV 113-004 (Schweißen), ATEX 153..."
                                className="min-h-[80px]"
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

                <TabsContent value="approvals" className="space-y-6 mt-0">
                  <Card>
                    <CardHeader>
                      <CardTitle>Genehmigungsverantwortliche</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <FormField
                        control={form.control}
                        name="departmentHeadId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Abteilungsleiter</FormLabel>
                            <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString() || ""}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Abteilungsleiter auswählen..." />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {departmentHeads.map((head) => (
                                  <SelectItem key={head.id} value={head.id.toString()}>
                                    {head.fullName} ({head.username})
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
                            <FormLabel>Sicherheitsbeauftragter</FormLabel>
                            <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString() || ""}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Sicherheitsbeauftragter auswählen..." />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {safetyOfficers.map((officer) => (
                                  <SelectItem key={officer.id} value={officer.id.toString()}>
                                    {officer.fullName} ({officer.username})
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
                            <FormLabel>Instandhaltungs-/Engineering-Genehmiger</FormLabel>
                            <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString() || ""}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Genehmiger auswählen..." />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {maintenanceApprovers.map((approver) => (
                                  <SelectItem key={approver.id} value={approver.id.toString()}>
                                    {approver.fullName} ({approver.username})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>
                </TabsContent>
              </ScrollArea>

              <div className="flex justify-end space-x-2 pt-4 border-t flex-shrink-0">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Abbrechen
                </Button>
                <Button 
                  type="submit" 
                  disabled={createMutation.isPending}
                  className="flex items-center gap-2"
                >
                  <Save className="h-4 w-4" />
                  {createMutation.isPending ? "Wird erstellt..." : "Arbeitserlaubnis erstellen"}
                </Button>
              </div>
            </Tabs>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}