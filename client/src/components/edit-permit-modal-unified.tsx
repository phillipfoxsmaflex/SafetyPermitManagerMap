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
import trbsData from "@/data/trbs_complete_hazards.json";
import { WORKFLOW_CONFIG } from "@/lib/workflow-config";
import { canEditPermit } from "@/lib/permissions";
import { AlertTriangle, Info, Save, Send, ArrowLeft, CheckCircle, Activity } from "lucide-react";

interface EditPermitModalUnifiedProps {
  permit: Permit | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode?: 'edit' | 'create';
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

export function EditPermitModalUnified({ permit, open, onOpenChange, mode = 'edit' }: EditPermitModalUnifiedProps) {
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

  // Fetch all users for requestor dropdown
  const { data: allUsers = [] } = useQuery<any[]>({
    queryKey: ["/api/users"],
  });

  // Get current permit data
  const { data: currentPermit } = useQuery<Permit>({
    queryKey: [`/api/permits/${permit?.id}`],
    enabled: !!permit?.id,
  });

  const form = useForm<EditPermitFormData>({
    resolver: zodResolver(editPermitSchema),
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

  // Check if permit can be edited (only drafts can be edited)
  const canEdit = currentPermit?.status === 'draft';
  const isLoading = updateMutation.isPending || workflowMutation.isPending;

  // Sync form with latest permit data whenever currentPermit changes (only in edit mode)
  React.useEffect(() => {
    if (mode === 'edit' && currentPermit && open) {
      console.log("Syncing form with latest permit data:", currentPermit.id);

      // Format dates properly for datetime-local input
      const formatDate = (date: string | Date | null): string => {
        if (!date) return "";
        if (typeof date === 'string') {
          // Convert ISO string to datetime-local format (YYYY-MM-DDTHH:mm)
          const dateObj = new Date(date);
          return dateObj.toISOString().slice(0, 16);
        }
        return date.toISOString().slice(0, 16);
      };

      // Find work location ID by name
      const findWorkLocationId = (locationName: string | null): number | undefined => {
        if (!locationName) return undefined;
        const location = workLocations.find(loc => loc.name === locationName);
        return location?.id;
      };

      // Find user ID by full name
      const findUserIdByName = (fullName: string | null, userList: any[]): number | undefined => {
        if (!fullName) return undefined;
        const user = userList.find(u => u.fullName === fullName || u.username === fullName);
        return user?.id;
      };

      form.reset({
        type: currentPermit.type || "",
        workDescription: currentPermit.description || "",
        location: currentPermit.location || "",
        workLocationId: findWorkLocationId(currentPermit.location),
        requestedBy: currentPermit.requestorName || "",
        department: currentPermit.department || "",
        plannedStartDate: formatDate(currentPermit.startDate),
        plannedEndDate: formatDate(currentPermit.endDate),
        emergencyContact: currentPermit.emergencyContact || "",
        departmentHeadApproval: currentPermit.departmentHeadApproval || false,
        safetyOfficerApproval: currentPermit.safetyOfficerApproval || false,
        maintenanceApproval: currentPermit.maintenanceApproval || false,
        departmentHeadId: findUserIdByName(currentPermit.departmentHead, departmentHeads),
        safetyOfficerId: findUserIdByName(currentPermit.safetyOfficer, safetyOfficers),
        maintenanceApproverId: findUserIdByName(currentPermit.maintenanceApprover, maintenanceApprovers),
        identifiedHazards: currentPermit.identifiedHazards || "",
        selectedHazards: currentPermit.selectedHazards || [],
        hazardNotes: currentPermit.hazardNotes || "",
        completedMeasures: currentPermit.completedMeasures || [],
        status: currentPermit.status || "draft",
        performerName: currentPermit.performerName || "",
        performerSignature: currentPermit.performerSignature || "",
        workStartedAt: formatDate(currentPermit.workStartedAt),
        workCompletedAt: formatDate(currentPermit.workCompletedAt),
        additionalComments: currentPermit.additionalComments || "",
        immediateActions: currentPermit.immediateActions || "",
        beforeWorkStarts: currentPermit.beforeWorkStarts || "",
        complianceNotes: currentPermit.complianceNotes || "",
        overallRisk: currentPermit.overallRisk || "",
      });

      // Update hazard notes state
      if (currentPermit.hazardNotes) {
        try {
          const notes = typeof currentPermit.hazardNotes === 'string' 
            ? JSON.parse(currentPermit.hazardNotes) 
            : currentPermit.hazardNotes;
          setHazardNotes(notes);
        } catch (e) {
          console.warn("Could not parse hazard notes:", currentPermit.hazardNotes);
          setHazardNotes({});
        }
      }
    }
  }, [currentPermit, open, form, workLocations, departmentHeads, safetyOfficers, maintenanceApprovers]);

  // Update/Create form mutation
  const updateMutation = useMutation({
    mutationFn: async (data: EditPermitFormData) => {
      if (mode === 'create') {
        // Transform form data for creation
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
          additionalComments: data.additionalComments,
          immediateActions: data.immediateActions,
          beforeWorkStarts: data.beforeWorkStarts,
          complianceNotes: data.complianceNotes,
          overallRisk: data.overallRisk,
          selectedHazards: data.selectedHazards || [],
          hazardNotes: JSON.stringify(hazardNotes),
          completedMeasures: data.completedMeasures || [],
          performerName: data.performerName,
          departmentHead: departmentHeads.find(head => head.id === data.departmentHeadId)?.fullName || "",
          safetyOfficer: safetyOfficers.find(officer => officer.id === data.safetyOfficerId)?.fullName || "",
          maintenanceApprover: maintenanceApprovers.find(approver => approver.id === data.maintenanceApproverId)?.fullName || "",
          status: "draft",
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
    mutationFn: async ({ actionId, nextStatus }: { actionId: string; nextStatus: string }) => {
      if (!permit) throw new Error("No permit selected");
      return apiRequest(`/api/permits/${permit.id}/workflow`, "POST", { action: actionId, nextStatus });
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
    // Map frontend field names to backend field names
    const mappedData = {
      type: data.type,
      department: data.department,
      description: data.workDescription, // Backend expects 'description'
      requestorName: data.requestedBy, // Backend expects 'requestorName'
      startDate: data.plannedStartDate, // Backend expects 'startDate'
      endDate: data.plannedEndDate, // Backend expects 'endDate'
      location: data.location,
      emergencyContact: data.emergencyContact,
      contactNumber: data.contactNumber || permit?.contactNumber,
      selectedHazards: data.selectedHazards,
      hazardNotes: data.hazardNotes,
      identifiedHazards: data.identifiedHazards,
      additionalComments: data.additionalComments,
      immediateActions: data.immediateActions,
      beforeWorkStarts: data.beforeWorkStarts,
      complianceNotes: data.complianceNotes,
      overallRisk: data.overallRisk,
      completedMeasures: data.completedMeasures,
      preventiveMeasures: data.preventiveMeasures,
      performerName: data.performerName,
      performerSignature: data.performerSignature,
      workStartedAt: data.workStartedAt,
      workCompletedAt: data.workCompletedAt,
      status: data.status
    };

    // Remove undefined fields to avoid validation issues
    const cleanedData = Object.fromEntries(
      Object.entries(mappedData).filter(([_, value]) => value !== undefined)
    );

    updateMutation.mutate(cleanedData);
  };

  if (mode === 'edit' && !permit) return null;

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
                            <Select onValueChange={field.onChange} value={field.value} disabled={!canEdit}>
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
                              <Input placeholder="Abteilung eingeben" disabled={!canEdit} {...field} />
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
                              disabled={!canEdit}
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
                              <Input type="datetime-local" disabled={!canEdit} {...field} />
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
                              <Input type="datetime-local" disabled={!canEdit} {...field} />
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
                            <Select onValueChange={field.onChange} value={field.value} disabled={!canEdit}>
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
                              <Input placeholder="Notfallkontakt (optional)" disabled={!canEdit} {...field} />
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
                              disabled={!canEdit}
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
                              <Input placeholder="Detaillierte Ortsangabe..." disabled={!canEdit} {...field} />
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

                    {/* TRBS Hazard Categories */}
                    {trbsData.categories
                      .filter((category, index) => {
                        if (selectedCategory !== null && index !== selectedCategory) return false;
                        if (!searchQuery) return true;
                        return category.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
                               category.hazards.some(h => h.hazard.toLowerCase().includes(searchQuery.toLowerCase()));
                      })
                      .map((category) => (
                      <Card key={category.id} className="border-l-4 border-l-safety-orange">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-lg text-industrial-gray">
                            {category.id}. {category.category}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="grid gap-3">
                            {category.hazards
                              .filter(hazard => !searchQuery || 
                                hazard.hazard.toLowerCase().includes(searchQuery.toLowerCase()))
                              .map((hazard, hazardIndex) => {
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
                                            disabled={!canEdit}
                                            onCheckedChange={(checked) => {
                                              if (!canEdit) return;
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
                                            {hazard.hazard}
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
                                                disabled={!canEdit}
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
                                                  if (!canEdit) return;
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
                        name="immediateActions"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Allgemeine Maßnahmen</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="PSAgA-Ausrüstung prüfen, Wetterbedingungen bewerten, Absperrung errichten, Notfallplan aktivieren, Kommunikation etablieren"
                                className="min-h-[100px]"
                                disabled={!canEdit}
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
                                disabled={!canEdit}
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
                          <Select onValueChange={field.onChange} value={field.value || ""} disabled={!canEdit}>
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
                              className="min-h-[120px]"
                              disabled={!canEdit}
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
                              placeholder="Auffanggurt und Sicherungsseil erforderlich. Nur bei trockener Witterung arbeiten."
                              className="min-h-[100px]"
                              disabled={!canEdit}
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
                                disabled={!canEdit}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Abteilungsleitung auswählen..." />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {departmentHeads.map((head) => (
                                    <SelectItem key={head.id} value={head.id.toString()}>
                                      {head.fullName || head.username} - {head.role}
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
                                disabled={!canEdit}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Sicherheitsbeauftragter auswählen..." />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {safetyOfficers.map((officer) => (
                                    <SelectItem key={officer.id} value={officer.id.toString()}>
                                      {officer.fullName || officer.username} - {officer.role}
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
                                disabled={!canEdit}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Technik/Wartung auswählen..." />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {maintenanceApprovers.map((approver) => (
                                    <SelectItem key={approver.id} value={approver.id.toString()}>
                                      {approver.fullName || approver.username} - {approver.role}
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
                    {mode === 'edit' && permit?.status === "active" ? (
                      <>
                        <FormField
                          control={form.control}
                          name="performerName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Name des Durchführers</FormLabel>
                              <FormControl>
                                <Input placeholder="Vollständiger Name der Person, die die Arbeit durchführt" disabled={!canEdit} {...field} />
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
                                  <Input type="datetime-local" disabled={!canEdit} {...field} />
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
                                  <Input type="datetime-local" disabled={!canEdit} {...field} />
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
                    {!canEdit && (
                      <Alert className="mb-4">
                        <Info className="h-4 w-4" />
                        <AlertDescription>
                          KI-Analyse ist nur bei Genehmigungen im Entwurfsstatus verfügbar. 
                          Setzen Sie die Genehmigung zurück auf "Entwurf", um Änderungen vorzunehmen.
                        </AlertDescription>
                      </Alert>
                    )}
                    <AiSuggestions permitId={permit.id} disabled={!canEdit} />
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
                            console.log('Unified modal workflow action:', { actionId, nextStatus, permitId: permit.id });
                            workflowMutation.mutate({ actionId, nextStatus });
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
                  disabled={!canEdit || isLoading}
                  className="bg-industrial-gray hover:bg-industrial-gray/90 disabled:opacity-50"
                  title={!canEdit ? "Kann nur bei Entwürfen bearbeitet werden" : ""}
                >
                  <Save className="h-4 w-4 mr-2" />
                  Speichern
                </Button>
              </div>

              <div>
                <PermitAttachments permitId={permit.id} />
              </div>
            </div>

            {!canEdit && mode === 'edit' && (
              <Alert className="mt-4">
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Diese Genehmigung kann nicht bearbeitet werden, da sie sich nicht im Entwurfsstatus befindet. 
                  Verwenden Sie die Workflow-Aktionen, um sie zurück auf "Entwurf" zu setzen.
                </AlertDescription>
              </Alert>
            )}
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}