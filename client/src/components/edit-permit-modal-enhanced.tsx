import { useState } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
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
import { AlertTriangle, Info, Save, Send } from "lucide-react";

interface EditPermitModalEnhancedProps {
  permit: Permit | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const editPermitSchema = z.object({
  type: z.string().min(1, "Genehmigungstyp ist erforderlich"),
  location: z.string().min(1, "Arbeitsort ist erforderlich"),
  description: z.string().min(1, "Beschreibung ist erforderlich"),
  requestorName: z.string().min(1, "Antragsteller ist erforderlich"),
  department: z.string().min(1, "Abteilung ist erforderlich"),
  contactNumber: z.string().min(1, "Kontaktnummer ist erforderlich"),
  emergencyContact: z.string().min(1, "Notfallkontakt ist erforderlich"),
  startDate: z.string().min(1, "Startdatum ist erforderlich"),
  endDate: z.string().min(1, "Enddatum ist erforderlich"),
  riskLevel: z.string().optional(),
  safetyOfficer: z.string().optional(),
  departmentHead: z.string().optional(),
  maintenanceApprover: z.string().optional(),
  identifiedHazards: z.string().optional(),
  additionalComments: z.string().optional(),
  atmosphereTest: z.boolean().optional(),
  ventilation: z.boolean().optional(),
  ppe: z.boolean().optional(),
  emergencyProcedures: z.boolean().optional(),
  fireWatch: z.boolean().optional(),
  isolationLockout: z.boolean().optional(),
  oxygenLevel: z.string().optional(),
  lelLevel: z.string().optional(),
  h2sLevel: z.string().optional(),
});

// Relaxed schema for drafts - only basic fields required
const draftPermitSchema = z.object({
  type: z.string().optional(),
  location: z.string().optional(),
  description: z.string().optional(),
  requestorName: z.string().optional(),
  department: z.string().optional(),
  contactNumber: z.string().optional(),
  emergencyContact: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  riskLevel: z.string().optional(),
  safetyOfficer: z.string().optional(),
  departmentHead: z.string().optional(),
  maintenanceApprover: z.string().optional(),
  identifiedHazards: z.string().optional(),
  additionalComments: z.string().optional(),
  atmosphereTest: z.boolean().optional(),
  ventilation: z.boolean().optional(),
  ppe: z.boolean().optional(),
  emergencyProcedures: z.boolean().optional(),
  fireWatch: z.boolean().optional(),
  isolationLockout: z.boolean().optional(),
  oxygenLevel: z.string().optional(),
  lelLevel: z.string().optional(),
  h2sLevel: z.string().optional(),
});

type EditPermitFormData = z.infer<typeof editPermitSchema>;

export function EditPermitModalEnhanced({ permit, open, onOpenChange }: EditPermitModalEnhancedProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("basic");

  // Fetch all users for approver dropdowns
  const { data: users = [] } = useQuery<any[]>({
    queryKey: ["/api/users"],
  });

  const form = useForm<EditPermitFormData>({
    resolver: zodResolver(editPermitSchema),
    defaultValues: permit ? {
      type: permit.type || "",
      location: permit.location || "",
      description: permit.description || "",
      requestorName: permit.requestorName || "",
      department: permit.department || "",
      contactNumber: permit.contactNumber || "",
      emergencyContact: permit.emergencyContact || "",
      startDate: permit.startDate ? new Date(permit.startDate).toISOString().split('T')[0] : "",
      endDate: permit.endDate ? new Date(permit.endDate).toISOString().split('T')[0] : "",
      riskLevel: permit.riskLevel || "",
      safetyOfficer: permit.safetyOfficer || "",
      departmentHead: permit.departmentHead || "",
      maintenanceApprover: permit.maintenanceApprover || "",
      identifiedHazards: permit.identifiedHazards || "",
      additionalComments: permit.additionalComments || "",
      atmosphereTest: permit.atmosphereTest || false,
      ventilation: permit.ventilation || false,
      ppe: permit.ppe || false,
      emergencyProcedures: permit.emergencyProcedures || false,
      fireWatch: permit.fireWatch || false,
      isolationLockout: permit.isolationLockout || false,
      oxygenLevel: permit.oxygenLevel || "",
      lelLevel: permit.lelLevel || "",
      h2sLevel: permit.h2sLevel || "",
    } : {},
  });

  const updatePermitMutation = useMutation({
    mutationFn: async (data: EditPermitFormData & { status?: string }) => {
      const response = await fetch(`/api/permits/${permit?.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/permits"] });
      toast({
        title: "Erfolg",
        description: "Genehmigung wurde erfolgreich aktualisiert.",
      });
      onOpenChange(false);
    },
    onError: (error) => {
      console.error("Error updating permit:", error);
      toast({
        title: "Fehler",
        description: "Fehler beim Aktualisieren der Genehmigung.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: EditPermitFormData) => {
    updatePermitMutation.mutate(data);
  };

  const saveDraftMutation = useMutation({
    mutationFn: async (data: EditPermitFormData) => {
      console.log("Saving draft for permit:", permit?.id, "with data:", { ...data, status: "draft" });
      const response = await fetch(`/api/permits/${permit?.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ...data, status: "draft" }),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Entwurf gespeichert",
        description: "Die Genehmigung wurde als Entwurf gespeichert.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/permits"] });
      onOpenChange(false);
    },
    onError: (error) => {
      console.error("Draft save error:", error);
      toast({
        title: "Fehler",
        description: "Entwurf konnte nicht gespeichert werden.",
        variant: "destructive",
      });
    },
  });

  const onSaveDraft = () => {
    console.log("=== DRAFT SAVE BUTTON CLICKED ===");
    console.log("Permit ID:", permit?.id);
    
    if (!permit?.id) {
      console.error("No permit ID found");
      toast({
        title: "Fehler",
        description: "Keine Genehmigungsnummer gefunden.",
        variant: "destructive",
      });
      return;
    }
    
    // Get current form values without validation
    const formValues = form.getValues();
    console.log("Form values:", formValues);
    
    // Ensure we have at least some basic data
    const draftData = {
      ...formValues,
      status: "draft"
    };
    
    console.log("Sending draft data:", draftData);
    saveDraftMutation.mutate(draftData);
  };

  const onSubmitForApproval = (data: EditPermitFormData) => {
    updatePermitMutation.mutate({ ...data, status: "pending" });
  };

  const supervisorUsers = users.filter((user: any) => 
    user.role === 'supervisor' || user.role === 'admin' || user.role === 'Vorgesetzter' || user.role === 'Administrator'
  );
  const maintenanceUsers = users.filter((user: any) => 
    user.role === 'maintenance' || user.role === 'admin' || user.role === 'Betriebsleiter' || user.role === 'Administrator'
  );

  if (!permit) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-industrial-gray">
            Arbeitserlaubnis bearbeiten - {permit.permitId}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form className="space-y-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="basic" className="text-sm">
                  1. Grundinformationen
                </TabsTrigger>
                <TabsTrigger value="safety" className="text-sm">
                  2. Sicherheitsbewertung
                </TabsTrigger>
                <TabsTrigger value="approval" className="text-sm">
                  3. Genehmigung & Freigabe
                </TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Genehmigungstyp</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Genehmigungstyp auswählen..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="confined_space">Enger Raum Zutritt</SelectItem>
                            <SelectItem value="hot_work">Heißarbeiten</SelectItem>
                            <SelectItem value="electrical">Elektrische Arbeiten</SelectItem>
                            <SelectItem value="chemical">Chemische Arbeiten</SelectItem>
                            <SelectItem value="height">Höhenarbeiten</SelectItem>
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
                        <FormLabel>Arbeitsort</FormLabel>
                        <FormControl>
                          <Input placeholder="z.B. Tank A-104, Gebäude 3" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="requestorName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Antragsteller</FormLabel>
                        <FormControl>
                          <Input placeholder="Name des Antragstellers" {...field} />
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
                        <FormControl>
                          <Input placeholder="z.B. Produktion, Instandhaltung" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="contactNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Kontaktnummer</FormLabel>
                        <FormControl>
                          <Input placeholder="+49 123 456 789" {...field} />
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
                          <Input placeholder="+49 987 654 321" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="startDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Startdatum</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="endDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Enddatum</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Beschreibung der Arbeiten</FormLabel>
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
              </TabsContent>

              <TabsContent value="safety" className="space-y-6">
                <Alert className="border-yellow-200 bg-yellow-50">
                  <AlertTriangle className="h-4 w-4 text-caution-orange" />
                  <AlertDescription className="text-industrial-gray">
                    <strong>Sicherheitsanforderungen:</strong> Führen Sie alle relevanten Sicherheitsprüfungen durch, bevor Sie mit der Arbeitsfreigabe fortfahren.
                  </AlertDescription>
                </Alert>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-industrial-gray">Sicherheitscheckliste</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="atmosphereTest"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <FormLabel className="text-sm text-industrial-gray">
                              Atmosphärenprüfung durchgeführt
                            </FormLabel>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="ventilation"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <FormLabel className="text-sm text-industrial-gray">
                              Belüftung sichergestellt
                            </FormLabel>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="ppe"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <FormLabel className="text-sm text-industrial-gray">
                              Persönliche Schutzausrüstung bereitgestellt
                            </FormLabel>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="emergencyProcedures"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <FormLabel className="text-sm text-industrial-gray">
                              Notfallverfahren besprochen
                            </FormLabel>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="fireWatch"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <FormLabel className="text-sm text-industrial-gray">
                              Brandwache erforderlich
                            </FormLabel>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="isolationLockout"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <FormLabel className="text-sm text-industrial-gray">
                              Isolation/Lockout durchgeführt
                            </FormLabel>
                          </FormItem>
                        )}
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-industrial-gray">Risikobewertung</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="riskLevel"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Risikostufe</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Risikostufe auswählen..." />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="low">Niedrig</SelectItem>
                                <SelectItem value="medium">Mittel</SelectItem>
                                <SelectItem value="high">Hoch</SelectItem>
                                <SelectItem value="critical">Kritisch</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="safetyOfficer"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Sicherheitsbeauftragter</FormLabel>
                            <FormControl>
                              <Input placeholder="Name des Sicherheitsbeauftragten" {...field} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="identifiedHazards"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Identifizierte Gefahren</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Beschreiben Sie alle identifizierten Gefahren und Schutzmaßnahmen..."
                              {...field}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-industrial-gray">Atmosphärenüberwachung</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <FormField
                        control={form.control}
                        name="oxygenLevel"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Sauerstoffgehalt (%)</FormLabel>
                            <FormControl>
                              <Input placeholder="19.5-23.5%" {...field} />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="lelLevel"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>LEL (%)</FormLabel>
                            <FormControl>
                              <Input placeholder="<10%" {...field} />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="h2sLevel"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>H2S (ppm)</FormLabel>
                            <FormControl>
                              <Input placeholder="<10 ppm" {...field} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="approval" className="space-y-6">
                <Alert className="border-blue-200 bg-blue-50">
                  <Info className="h-4 w-4 text-safety-blue" />
                  <AlertDescription className="text-industrial-gray">
                    <strong>Genehmigungsverfahren:</strong> Mindestens ein Abteilungsleiter und die Instandhaltung/Engineering müssen diese Arbeitserlaubnis genehmigen.
                  </AlertDescription>
                </Alert>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-industrial-gray">Erforderliche Genehmiger zuweisen</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="departmentHead"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Abteilungsleiter (Genehmiger) *</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Abteilungsleiter auswählen..." />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {supervisorUsers.map((user: any) => (
                                <SelectItem key={user.id} value={user.username}>
                                  {user.username}
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
                      name="maintenanceApprover"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Instandhaltung/Engineering-Genehmiger *</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Instandhaltungs-/Engineering-Genehmiger auswählen..." />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {maintenanceUsers.map((user: any) => (
                                <SelectItem key={user.id} value={user.username}>
                                  {user.username}
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
                      name="additionalComments"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Zusätzliche Kommentare</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Zusätzliche Hinweise oder Kommentare..."
                              {...field}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="text-sm text-industrial-gray">
                        <strong>Hinweis:</strong> Diese Personen erhalten eine Benachrichtigung zur Genehmigung der Arbeitserlaubnis. 
                        Beide Genehmigungen sind erforderlich, bevor die Arbeiten beginnen können.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            <Separator />

            <div className="flex justify-between">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Abbrechen
              </Button>
              <div className="flex gap-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    console.log("BUTTON CLICKED - DIRECT HANDLER");
                    onSaveDraft();
                  }}
                  disabled={saveDraftMutation.isPending}
                >
                  <Save className="w-4 h-4 mr-2" />
                  Als Entwurf speichern
                </Button>
                <Button 
                  type="button" 
                  onClick={form.handleSubmit(onSubmitForApproval)}
                  className="bg-safety-blue text-white hover:bg-blue-700"
                  disabled={updatePermitMutation.isPending}
                >
                  <Send className="w-4 h-4 mr-2" />
                  Zur Genehmigung senden
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}