import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusIndicator } from "@/components/status-indicator";
import { WorkflowButtons } from "@/components/workflow-buttons";
import { StatusTimeline } from "@/components/status-timeline";
import { WorkflowVisualization } from "@/components/workflow-visualization";
import { AiSuggestions } from "@/components/ai-suggestions";
import { WORKFLOW_CONFIG } from "@/lib/workflow-config";
import { canEditPermit } from "@/lib/permissions";
import type { Permit } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { queryClient, apiRequest } from "@/lib/queryClient";

const editPermitSchema = z.object({
  type: z.string().min(1, "Arbeitstyp ist erforderlich"),
  location: z.string().min(1, "Arbeitsort ist erforderlich"),
  description: z.string().min(1, "Beschreibung ist erforderlich"),
  requestorName: z.string().min(1, "Antragsteller ist erforderlich"),
  department: z.string().min(1, "Abteilung ist erforderlich"),
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
  performerName: z.string().optional(),
});

type EditPermitFormData = z.infer<typeof editPermitSchema>;

interface EditPermitModalWorkflowProps {
  permit: Permit | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditPermitModalWorkflow({ permit, open, onOpenChange }: EditPermitModalWorkflowProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("general");

  // Get latest permit data
  const { data: latestPermit } = useQuery<Permit>({
    queryKey: [`/api/permits/${permit?.id}`],
    enabled: !!permit?.id && open,
  });

  const currentPermit = latestPermit || permit;
  const workflowState = currentPermit ? WORKFLOW_CONFIG[currentPermit.status] : null;
  const isEditable = user && currentPermit ? canEditPermit(user, currentPermit) : false;

  const form = useForm<EditPermitFormData>({
    resolver: zodResolver(editPermitSchema),
    defaultValues: {
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
      safetyOfficer: "",
      departmentHead: "",
      maintenanceApprover: "",
      identifiedHazards: "",
      additionalComments: "",
      performerName: "",
    },
  });

  // Update form when permit data changes
  useEffect(() => {
    if (currentPermit) {
      form.reset({
        type: currentPermit.type || "",
        location: currentPermit.location || "",
        description: currentPermit.description || "",
        requestorName: currentPermit.requestorName || "",
        department: currentPermit.department || "",
        contactNumber: currentPermit.contactNumber || "",
        emergencyContact: currentPermit.emergencyContact || "",
        startDate: currentPermit.startDate ? new Date(currentPermit.startDate).toISOString().slice(0, 16) : "",
        endDate: currentPermit.endDate ? new Date(currentPermit.endDate).toISOString().slice(0, 16) : "",
        riskLevel: currentPermit.riskLevel || "",
        safetyOfficer: currentPermit.safetyOfficer || "",
        departmentHead: currentPermit.departmentHead || "",
        maintenanceApprover: currentPermit.maintenanceApprover || "",
        identifiedHazards: currentPermit.identifiedHazards || "",
        additionalComments: currentPermit.additionalComments || "",
        performerName: currentPermit.performerName || "",
      });
    }
  }, [currentPermit, form]);

  // Get user lists
  const { data: safetyOfficers = [] } = useQuery({
    queryKey: ["/api/users/safety-officers"],
  });

  const { data: departmentHeads = [] } = useQuery({
    queryKey: ["/api/users/department-heads"],
  });

  const { data: maintenanceApprovers = [] } = useQuery({
    queryKey: ["/api/users/maintenance-approvers"],
  });

  const { data: workLocations = [] } = useQuery({
    queryKey: ["/api/work-locations/active"],
  });

  const updateMutation = useMutation({
    mutationFn: async (data: EditPermitFormData) => {
      if (!currentPermit) throw new Error("No permit to update");
      
      const response = await fetch(`/api/permits/${currentPermit.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to update permit");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/permits"] });
      queryClient.invalidateQueries({ queryKey: [`/api/permits/${currentPermit?.id}`] });
      toast({
        title: "Erfolg",
        description: "Genehmigung wurde erfolgreich aktualisiert.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Fehler",
        description: error.message || "Fehler beim Aktualisieren der Genehmigung.",
        variant: "destructive",
      });
    },
  });

  const workflowMutation = useMutation({
    mutationFn: async ({ actionId, nextStatus }: { actionId: string; nextStatus: string }) => {
      if (!currentPermit) throw new Error("No permit selected");
      
      const response = await fetch(`/api/permits/${currentPermit.id}/workflow`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action: actionId, nextStatus }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to execute workflow action");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/permits"] });
      queryClient.invalidateQueries({ queryKey: [`/api/permits/${currentPermit?.id}`] });
      toast({
        title: "Erfolg",
        description: "Workflow-Aktion wurde erfolgreich ausgeführt.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Fehler",
        description: error.message || "Fehler bei der Workflow-Aktion.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: EditPermitFormData) => {
    updateMutation.mutate(data);
  };

  const handleWorkflowAction = async (actionId: string, nextStatus: string) => {
    await workflowMutation.mutateAsync({ actionId, nextStatus });
  };

  if (!currentPermit) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl font-bold">
                {currentPermit.permitId}
              </DialogTitle>
              <div className="flex items-center gap-4 mt-2">
                <StatusIndicator status={currentPermit.status} />
                {workflowState && (
                  <span className="text-sm text-gray-600">
                    {workflowState.description}
                  </span>
                )}
              </div>
            </div>
            <WorkflowButtons
              permit={currentPermit}
              currentUser={user!}
              onAction={handleWorkflowAction}
              isLoading={workflowMutation.isPending}
            />
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="general">Allgemein</TabsTrigger>
            <TabsTrigger value="attachments">Anhänge</TabsTrigger>
            <TabsTrigger value="approval">Genehmigung</TabsTrigger>
            <TabsTrigger value="status">Status</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Arbeitstyp</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          value={field.value}
                          disabled={!isEditable}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Arbeitstyp wählen" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="confined_space">Enger Raum</SelectItem>
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
                        <Select 
                          onValueChange={field.onChange} 
                          value={field.value}
                          disabled={!isEditable}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Arbeitsort wählen" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {(workLocations as any[]).map((location: any) => (
                              <SelectItem key={location.id} value={location.name}>
                                {location.name}
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
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Beschreibung der Arbeiten</FormLabel>
                      <FormControl>
                        <Textarea 
                          {...field} 
                          placeholder="Detaillierte Beschreibung der durchzuführenden Arbeiten"
                          disabled={!isEditable}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="requestorName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Antragsteller</FormLabel>
                        <FormControl>
                          <Input {...field} disabled={!isEditable} />
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
                          <Input {...field} disabled={!isEditable} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="startDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Startdatum</FormLabel>
                        <FormControl>
                          <Input type="datetime-local" {...field} disabled={!isEditable} />
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
                          <Input type="datetime-local" {...field} disabled={!isEditable} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {isEditable && (
                  <div className="flex justify-end">
                    <Button 
                      type="submit" 
                      disabled={updateMutation.isPending}
                      className="bg-safety-blue text-white hover:bg-blue-700"
                    >
                      {updateMutation.isPending ? "Wird gespeichert..." : "Änderungen speichern"}
                    </Button>
                  </div>
                )}
              </form>
            </Form>
          </TabsContent>

          <TabsContent value="attachments" className="space-y-6">
            {/* Attachments will be implemented here */}
            <div className="text-center py-8 text-gray-500">
              Anhänge-Funktionalität wird hier integriert
            </div>
          </TabsContent>

          <TabsContent value="approval" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Genehmigungsverfahren</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center p-4 border rounded-lg">
                      <div className="font-medium text-gray-900 mb-2">Abteilungsleiter</div>
                      <div className="text-sm text-gray-600 mb-3">{currentPermit.departmentHead}</div>
                      <div className="flex items-center justify-center mb-2">
                        {currentPermit.departmentHeadApproval ? (
                          <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-sm">
                            Genehmigt
                          </span>
                        ) : (
                          <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-sm">
                            Ausstehend
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="text-center p-4 border rounded-lg">
                      <div className="font-medium text-gray-900 mb-2">Instandhaltung</div>
                      <div className="text-sm text-gray-600 mb-3">{currentPermit.maintenanceApprover}</div>
                      <div className="flex items-center justify-center mb-2">
                        {currentPermit.maintenanceApproval ? (
                          <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-sm">
                            Genehmigt
                          </span>
                        ) : (
                          <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-sm">
                            Ausstehend
                          </span>
                        )}
                      </div>
                    </div>

                    {currentPermit.safetyOfficer && (
                      <div className="text-center p-4 border rounded-lg">
                        <div className="font-medium text-gray-900 mb-2">Sicherheit</div>
                        <div className="text-sm text-gray-600 mb-3">{currentPermit.safetyOfficer}</div>
                        <div className="flex items-center justify-center mb-2">
                          {currentPermit.safetyOfficerApproval ? (
                            <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-sm">
                              Genehmigt
                            </span>
                          ) : (
                            <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-sm">
                              Ausstehend
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {currentPermit && <AiSuggestions permitId={currentPermit.id} />}
          </TabsContent>

          <TabsContent value="status" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <WorkflowVisualization currentStatus={currentPermit.status} />
              </div>
              <div>
                <StatusTimeline 
                  statusHistory={currentPermit.statusHistory ? JSON.parse(currentPermit.statusHistory) : []} 
                  currentStatus={currentPermit.status}
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}