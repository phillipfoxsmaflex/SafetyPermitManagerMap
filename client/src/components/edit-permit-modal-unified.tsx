
import React, { useState, useEffect } from "react";
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
import type { Permit, User, WorkLocation, MapBackground } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { AiSuggestions } from "@/components/ai-suggestions";
import { SignaturePad } from "@/components/signature-pad";
import { PermitAttachments } from "@/components/permit-attachments";
import { StatusIndicator } from "@/components/status-indicator";
import { StatusTimeline } from "@/components/status-timeline";
import { WorkflowVisualization } from "@/components/workflow-visualization";
import { WorkflowButtons } from "@/components/workflow-buttons";
import { MapPositionSelector } from "@/components/map-position-selector";
import trbsData from "@/data/trbs_complete_hazards.json";
import { WORKFLOW_CONFIG } from "@/lib/workflow-config";
import { canEditPermit } from "@/lib/permissions";
import { AlertTriangle, Info, Save, Activity, FileText, Users, Settings, Brain, GitBranch } from "lucide-react";

interface EditPermitModalUnifiedProps {
  permit: Permit | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode?: 'edit' | 'create';
  mapClickPosition?: { x: number, y: number } | null;
  onMapReset?: () => void;
}

const permitSchema = z.object({
  type: z.string().min(1, "Arbeitstyp ist erforderlich"),
  workDescription: z.string().min(1, "Arbeitsumfang ist erforderlich"),
  location: z.string().optional(),
  workLocationId: z.string().optional(),
  requestedBy: z.string().min(1, "Antragsteller ist erforderlich"),
  department: z.string().min(1, "Abteilung ist erforderlich"),
  contactNumber: z.string().optional(),
  plannedStartDate: z.string().min(1, "Geplanter Beginn ist erforderlich"),
  plannedEndDate: z.string().min(1, "Geplantes Ende ist erforderlich"),
  emergencyContact: z.string().optional(),
  performerName: z.string().optional(),
  departmentHeadId: z.number().optional(),
  safetyOfficerId: z.number().optional(),
  maintenanceApproverId: z.number().optional(),
  identifiedHazards: z.string().optional(),
  selectedHazards: z.array(z.string()).optional(),
  hazardNotes: z.string().optional(),
  completedMeasures: z.array(z.string()).optional(),
  status: z.string().optional(),
  performerSignature: z.string().optional(),
  workStartedAt: z.string().optional(),
  workCompletedAt: z.string().optional(),
  additionalComments: z.string().optional(),
  immediateActions: z.string().optional(),
  beforeWorkStarts: z.string().optional(),
  complianceNotes: z.string().optional(),
  overallRisk: z.string().optional(),
  positionX: z.number().optional(),
  positionY: z.number().optional(),
});

type PermitFormData = z.infer<typeof permitSchema>;

export function EditPermitModalUnified({ permit, open, onOpenChange, mode = 'edit', mapClickPosition, onMapReset }: EditPermitModalUnifiedProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [hazardNotes, setHazardNotes] = useState<{ [key: string]: string }>({});
  const [selectedHazards, setSelectedHazards] = useState<string[]>([]);
  const [selectedMapBackground, setSelectedMapBackground] = useState<MapBackground | null>(null);
  const [permitMapPosition, setPermitMapPosition] = useState<{ x: number, y: number } | null>(null);


  // Dropdown data queries
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

  const { data: mapBackgrounds = [] } = useQuery<MapBackground[]>({
    queryKey: ["/api/map-backgrounds"],
  });

  // Get current permit data for edit mode with optimized refresh
  const { data: currentPermit } = useQuery<Permit>({
    queryKey: [`/api/permits/${permit?.id}`],
    enabled: !!permit?.id && mode === 'edit',
    refetchOnWindowFocus: true,
    refetchInterval: 10000, // Refresh every 10 seconds - optimized for performance
  });

  const form = useForm<PermitFormData>({
    resolver: zodResolver(permitSchema),
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
      performerName: "",
      departmentHeadId: undefined,
      safetyOfficerId: undefined,
      maintenanceApproverId: undefined,
      identifiedHazards: "",
      selectedHazards: [],
      hazardNotes: "",
      completedMeasures: [],
      status: "draft",
      performerSignature: "",
      workStartedAt: "",
      workCompletedAt: "",
      additionalComments: "",
      immediateActions: "",
      beforeWorkStarts: "",
      complianceNotes: "",
      overallRisk: "",
      positionX: mapClickPosition?.x,
      positionY: mapClickPosition?.y,
    },
  });

  // Update form when map position changes
  useEffect(() => {
    if (mapClickPosition && mode === 'create') {
      form.setValue('positionX', mapClickPosition.x);
      form.setValue('positionY', mapClickPosition.y);
    }
  }, [mapClickPosition, mode, form]);

  // Create/Update mutation
  const submitMutation = useMutation({
    mutationFn: async (data: PermitFormData & { mapPosition?: string }) => {
      console.log("Processing submit data:", data);
      
      const submitData = {
        type: data.type,
        description: data.workDescription,
        location: data.location || "",
        workLocationId: data.workLocationId ? parseInt(data.workLocationId) : undefined,
        requestorName: data.requestedBy,
        department: data.department,
        contactNumber: data.contactNumber || "",
        startDate: data.plannedStartDate,
        endDate: data.plannedEndDate,
        emergencyContact: data.emergencyContact || "",
        identifiedHazards: data.identifiedHazards || "",
        additionalComments: data.additionalComments || "",
        immediateActions: data.immediateActions || "",
        beforeWorkStarts: data.beforeWorkStarts || "",
        complianceNotes: data.complianceNotes || "",
        overallRisk: data.overallRisk || "",
        selectedHazards: selectedHazards,
        hazardNotes: JSON.stringify(hazardNotes),
        completedMeasures: data.completedMeasures || [],
        performerName: data.performerName || "",
        departmentHead: departmentHeads.find(head => head.id === data.departmentHeadId)?.fullName || "",
        safetyOfficer: safetyOfficers.find(officer => officer.id === data.safetyOfficerId)?.fullName || "",
        maintenanceApprover: maintenanceApprovers.find(approver => approver.id === data.maintenanceApproverId)?.fullName || "",
        performerSignature: data.performerSignature || "",
        workStartedAt: data.workStartedAt || null,
        workCompletedAt: data.workCompletedAt || null,
        status: mode === 'create' ? "draft" : data.status,
        mapPosition: data.mapPosition || (permitMapPosition ? JSON.stringify(permitMapPosition) : null),
      };

      console.log("Final submit data:", submitData);

      if (mode === 'create') {
        return apiRequest("/api/permits", "POST", submitData);
      } else {
        if (!permit?.id) throw new Error("Permit ID fehlt");
        return apiRequest(`/api/permits/${permit.id}`, "PATCH", submitData);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/permits"] });
      queryClient.invalidateQueries({ queryKey: ["/api/permits/map"] });
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
        setSelectedHazards([]);
        onMapReset?.();
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

  // Workflow mutation for edit mode
  const workflowMutation = useMutation({
    mutationFn: async ({ actionId, nextStatus }: { actionId: string; nextStatus: string }) => {
      const targetPermit = mode === 'edit' ? currentPermit : permit;
      if (!targetPermit) throw new Error("No permit selected");
      return apiRequest(`/api/permits/${targetPermit.id}/workflow`, "POST", { action: actionId, nextStatus });
    },
    onSuccess: () => {
      const targetPermit = mode === 'edit' ? currentPermit : permit;
      if (targetPermit) {
        queryClient.invalidateQueries({ queryKey: [`/api/permits/${targetPermit.id}`] });
        queryClient.invalidateQueries({ queryKey: ["/api/permits"] });
      }
      toast({
        title: "Erfolg",
        description: "Status erfolgreich aktualisiert.",
      });
      // Don't close modal automatically to allow confirmation dialogs to work
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

  // Check if permit can be edited
  const canEdit = mode === 'create' || (currentPermit?.status === 'draft');
  const canEditExecution = currentPermit?.status === 'active'; // Only active permits can edit execution
  const canStartAiAnalysis = mode === 'create' || (currentPermit?.status === 'draft'); // AI analysis only for drafts
  const isLoading = submitMutation.isPending || workflowMutation.isPending;

  // Initialize map background
  React.useEffect(() => {
    if (mapBackgrounds.length > 0 && !selectedMapBackground) {
      setSelectedMapBackground(mapBackgrounds[0]);
    }
  }, [mapBackgrounds, selectedMapBackground]);

  // Initialize permit map position from props or permit data
  React.useEffect(() => {
    if (mode === 'create' && mapClickPosition) {
      setPermitMapPosition(mapClickPosition);
    } else if (currentPermit && currentPermit.mapPositionX !== null && currentPermit.mapPositionY !== null) {
      // Load position from separate X/Y coordinates
      setPermitMapPosition({
        x: currentPermit.mapPositionX || 0,
        y: currentPermit.mapPositionY || 0
      });
    } else if (currentPermit && currentPermit.mapPosition) {
      // Fallback: try to parse from JSON field if exists
      try {
        const position = typeof currentPermit.mapPosition === 'string' 
          ? JSON.parse(currentPermit.mapPosition) 
          : currentPermit.mapPosition;
        setPermitMapPosition(position);
      } catch (e) {
        console.warn("Could not parse permit map position:", currentPermit.mapPosition);
      }
    } else if (mode === 'create' && !mapClickPosition) {
      // Reset position for new permits without map click
      setPermitMapPosition(null);
    }
  }, [mode, mapClickPosition, currentPermit]);

  // Reset map position when modal closes
  React.useEffect(() => {
    if (!open && mode === 'create' && onMapReset) {
      onMapReset();
      setPermitMapPosition(null);
    }
  }, [open, mode, onMapReset]);

  // Sync form with permit data in edit mode
  React.useEffect(() => {
    if (mode === 'edit' && currentPermit && open && !workflowMutation.isPending) {
      console.log("Syncing form with latest permit data:", currentPermit.id);

      const formatDate = (date: string | Date | null): string => {
        if (!date) return "";
        if (typeof date === 'string') {
          const dateObj = new Date(date);
          return dateObj.toISOString().slice(0, 16);
        }
        return date.toISOString().slice(0, 16);
      };

      const findUserIdByName = (fullName: string | null, userList: any[]): number | undefined => {
        if (!fullName) return undefined;
        const user = userList.find(u => u.fullName === fullName || u.username === fullName);
        return user?.id;
      };

      // Ensure workLocationId is properly formatted as string
      const workLocationIdStr = currentPermit.workLocationId ? currentPermit.workLocationId.toString() : "";

      const formData = {
        type: currentPermit.type || "",
        workDescription: currentPermit.description || "",
        location: currentPermit.location || "",
        workLocationId: workLocationIdStr,
        requestedBy: currentPermit.requestorName || "",
        department: currentPermit.department || "",
        contactNumber: currentPermit.contactNumber || "",
        plannedStartDate: formatDate(currentPermit.startDate),
        plannedEndDate: formatDate(currentPermit.endDate),
        emergencyContact: currentPermit.emergencyContact || "",
        performerName: currentPermit.performerName || "",
        departmentHeadId: findUserIdByName(currentPermit.departmentHead, departmentHeads),
        safetyOfficerId: findUserIdByName(currentPermit.safetyOfficer, safetyOfficers),
        maintenanceApproverId: findUserIdByName(currentPermit.maintenanceApprover, maintenanceApprovers),
        identifiedHazards: currentPermit.identifiedHazards || "",
        selectedHazards: currentPermit.selectedHazards || [],
        hazardNotes: currentPermit.hazardNotes || "",
        completedMeasures: currentPermit.completedMeasures || [],
        status: currentPermit.status || "draft",
        performerSignature: currentPermit.performerSignature || "",
        workStartedAt: formatDate(currentPermit.workStartedAt),
        workCompletedAt: formatDate(currentPermit.workCompletedAt),
        additionalComments: currentPermit.additionalComments || "",
        immediateActions: currentPermit.immediateActions || "",
        beforeWorkStarts: currentPermit.beforeWorkStarts || "",
        complianceNotes: currentPermit.complianceNotes || "",
        overallRisk: currentPermit.overallRisk || "",
      };

      console.log("Form data being set:", {
        type: formData.type,
        workLocationId: formData.workLocationId,
        overallRisk: formData.overallRisk
      });

      form.reset(formData);

      setSelectedHazards(currentPermit.selectedHazards || []);

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
  }, [currentPermit, open, form, departmentHeads, safetyOfficers, maintenanceApprovers, mode]);

  // LÖSUNG 1: Zusätzliche State-Synchronisation für AI-Vorschläge
  // Synchronisiert selectedHazards und hazardNotes wenn sich currentPermit ändert
  React.useEffect(() => {
    if (currentPermit && mode === 'edit') {
      console.log("AI-Suggestions: Syncing TRBS states with updated permit data");
      console.log("Current permit selectedHazards:", currentPermit.selectedHazards);
      console.log("Current permit hazardNotes:", currentPermit.hazardNotes);
      
      // Sync selectedHazards - auch wenn es ein leeres Array ist
      if (currentPermit.selectedHazards !== undefined) {
        const newSelectedHazards = Array.isArray(currentPermit.selectedHazards) 
          ? currentPermit.selectedHazards 
          : [];
        console.log("AI-Suggestions: Updating selectedHazards:", newSelectedHazards);
        setSelectedHazards(newSelectedHazards);
      } else {
        // If undefined, reset to empty array
        console.log("AI-Suggestions: Resetting selectedHazards to empty array");
        setSelectedHazards([]);
      }
      
      // Sync hazardNotes
      if (currentPermit.hazardNotes) {
        try {
          const parsedNotes = typeof currentPermit.hazardNotes === 'string' 
            ? JSON.parse(currentPermit.hazardNotes) 
            : currentPermit.hazardNotes;
          console.log("AI-Suggestions: Updating hazardNotes:", parsedNotes);
          setHazardNotes(parsedNotes);
        } catch (e) {
          console.warn("AI-Suggestions: Could not parse hazard notes:", currentPermit.hazardNotes);
          setHazardNotes({});
        }
      } else {
        // Reset hazardNotes if empty
        setHazardNotes({});
      }
    }
  }, [currentPermit, mode]); // Vereinfachte Dependency - watch das gesamte currentPermit Objekt

  const onSubmit = (data: PermitFormData) => {
    console.log("Form submission data:", data);
    console.log("Selected hazards:", selectedHazards);
    console.log("Hazard notes:", hazardNotes);
    console.log("Permit map position:", permitMapPosition);
    
    // Add map position to the data
    const submitData = {
      ...data,
      mapPosition: permitMapPosition ? JSON.stringify(permitMapPosition) : null,
    };
    
    submitMutation.mutate(submitData);
  };

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

  const handleMapClick = (position: { x: number, y: number }) => {
    if (canEdit) {
      setPermitMapPosition(position);
    }
  };

  const handlePermitClick = (permitId: string) => {
    // Handle permit click if needed
  };

  const handleWorkflowAction = async (actionId: string, nextStatus: string) => {
    console.log("Modal: Handling workflow action:", actionId, nextStatus);
    
    // Execute all actions directly without confirmation
    await workflowMutation.mutateAsync({ actionId, nextStatus });
  };



  if (mode === 'edit' && !permit) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] w-full sm:w-[95vw] md:w-auto mobile-dialog-content">
        <DialogHeader>
          <DialogTitle className="text-industrial-gray flex items-center gap-2 text-lg sm:text-xl">
            <Activity className="h-5 w-5" />
            {mode === 'create' ? 'Neue Arbeitserlaubnis erstellen' : `Arbeitserlaubnis bearbeiten - ${permit?.permitId}`}
          </DialogTitle>
          <DialogDescription className="text-sm sm:text-base">
            {mode === 'create' 
              ? 'Erstellen Sie eine neue Arbeitserlaubnis mit vollständiger TRBS-Gefährdungsbeurteilung.'
              : 'Bearbeiten Sie die Arbeitserlaubnis mit vollständiger TRBS-Gefährdungsbeurteilung und Status-Management.'
            }
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-2" style={{ maxHeight: 'calc(90vh - 140px)' }}>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="h-full">
            <Tabs defaultValue="basic" className="h-full flex flex-col">
              <TabsList className="grid w-full grid-cols-7">
                <TabsTrigger value="basic" className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Grunddaten
                </TabsTrigger>
                <TabsTrigger value="hazards" className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Gefährdungen
                </TabsTrigger>
                <TabsTrigger value="approvals" className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Genehmigungen
                </TabsTrigger>
                <TabsTrigger value="execution" className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Durchführung
                </TabsTrigger>
                <TabsTrigger value="ai-suggestions" className="flex items-center gap-2">
                  <Brain className="h-4 w-4" />
                  KI-Vorschläge
                </TabsTrigger>
                <TabsTrigger value="attachments" className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Anhänge
                </TabsTrigger>
                <TabsTrigger value="workflow" className="flex items-center gap-2">
                  <GitBranch className="h-4 w-4" />
                  Status
                </TabsTrigger>
              </TabsList>

              <div className="flex-1 overflow-y-auto p-6">
                <TabsContent value="basic" className="space-y-6 mt-0">
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
                              <Select onValueChange={field.onChange} value={field.value} disabled={!canEdit}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Arbeitstyp auswählen..." />
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
                          name="workLocationId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Arbeitsort</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value} disabled={!canEdit}>
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
                                disabled={!canEdit}
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Map Position Selection */}
                      <div className="space-y-2">
                        <FormLabel>Arbeitsort auf der Karte markieren</FormLabel>
                        <div className="border rounded-lg p-2">
                          <div className="h-64 w-full relative">
                            <MapPositionSelector
                              mapBackground={selectedMapBackground}
                              selectedPosition={permitMapPosition}
                              onPositionChange={handleMapClick}
                              disabled={!canEdit}
                            />
                          </div>
                          {permitMapPosition && (
                            <div className="mt-2 text-sm text-gray-600">
                              Position markiert: ({permitMapPosition.x.toFixed(0)}, {permitMapPosition.y.toFixed(0)})
                            </div>
                          )}
                        </div>
                      </div>

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
                                disabled={!canEdit}
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
                          name="plannedEndDate"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Geplantes Ende</FormLabel>
                              <FormControl>
                                <Input 
                                  type="datetime-local"
                                  disabled={!canEdit}
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="requestedBy"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Antragsteller</FormLabel>
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
                          name="department"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Abteilung</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value} disabled={!canEdit}>
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
                        name="contactNumber"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Kontaktnummer</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Telefonnummer für Rückfragen..."
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
                        name="emergencyContact"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Notfallkontakt</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Notfallkontakte mit Telefonnummern (24h erreichbar)..."
                                className="min-h-[80px]"
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
                        name="performerName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Ausführende Person(en)</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Name(n) der ausführenden Person(en)..."
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

                <TabsContent value="hazards" className="space-y-6 mt-0">
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
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                          <Input
                            placeholder="Gefährdungen suchen..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="mt-1"
                          />
                        </div>
                        <div>
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

                      {trbsData.categories
                        .filter((category, index) => {
                          if (selectedCategory !== null && index !== selectedCategory) return false;
                          if (!searchQuery) return true;
                          return category.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                 category.hazards.some(h => h.hazard.toLowerCase().includes(searchQuery.toLowerCase()));
                        })
                        .map((category) => (
                        <Card key={category.id} className="mb-4">
                          <CardHeader className="pb-3">
                            <CardTitle className="text-lg text-blue-700">
                              {category.id}. {category.category}
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-3">
                              {category.hazards
                                .filter(hazard => !searchQuery || 
                                  hazard.hazard.toLowerCase().includes(searchQuery.toLowerCase()))
                                .map((hazard, hazardIndex) => {
                                const hazardId = `${category.id}-${hazardIndex}`;
                                const isSelected = selectedHazards.includes(hazardId);
                                
                                // Debug logging removed - AI suggestions now working correctly
                                
                                return (
                                  <div key={hazardIndex} className="border rounded-lg p-4">
                                    <div className="flex items-start space-x-3">
                                      <Checkbox
                                        checked={isSelected}
                                        disabled={!canEdit}
                                        onCheckedChange={() => canEdit && toggleHazard(hazardId)}
                                        className="mt-1"
                                      />
                                      <div className="flex-1 space-y-2">
                                        <div>
                                          <span className="font-medium text-gray-900">{hazard.hazard}</span>
                                        </div>
                                        
                                        {isSelected && (
                                          <div className="mt-3">
                                            <Textarea
                                              placeholder="Spezifische Anmerkungen zu dieser Gefährdung..."
                                              value={hazardNotes[hazardId] || ""}
                                              disabled={!canEdit}
                                              onChange={(e) => canEdit && updateHazardNote(hazardId, e.target.value)}
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
                                  placeholder="Beschreiben Sie spezifische Maßnahmen, die vor Arbeitsbeginn durchzuführen sind..."
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
                                placeholder="Beschreiben Sie weitere identifizierte Gefahren, spezielle Bedingungen oder wichtige Kommentare..."
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
                                placeholder="Zusätzliche Anmerkungen, besondere Hinweise oder Auflagen..."
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
                        name="complianceNotes"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Relevante Vorschriften und Normen</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="z.B. TRBS 2152-2 (Behälter), DGUV 113-004 (Schweißen), ATEX 153..."
                                className="min-h-[80px]"
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
                            <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString() || ""} disabled={!canEdit}>
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
                            <FormLabel>Sicherheitsfachkraft</FormLabel>
                            <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString() || ""} disabled={!canEdit}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Sicherheitsfachkraft auswählen..." />
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
                            <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString() || ""} disabled={!canEdit}>
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

                <TabsContent value="execution" className="space-y-6 mt-0">
                  <Card>
                    <CardHeader>
                      <CardTitle>Arbeitsdurchführung</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {canEditExecution ? (
                        <>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                              control={form.control}
                              name="workStartedAt"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Arbeit begonnen am</FormLabel>
                                  <FormControl>
                                    <Input type="datetime-local" disabled={!canEditExecution} {...field} />
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
                                    <Input type="datetime-local" disabled={!canEditExecution} {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>

                          <SignaturePad
                            onSignatureChange={(signature) => form.setValue("performerSignature", signature)}
                            existingSignature={form.watch("performerSignature")}
                            disabled={!canEditExecution}
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

                <TabsContent value="ai-suggestions" className="space-y-6 mt-0">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5" />
                        KI-Verbesserungsvorschläge
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {!canEdit && mode === 'edit' && (
                        <Alert className="mb-4">
                          <Info className="h-4 w-4" />
                          <AlertDescription>
                            KI-Analyse ist nur bei Genehmigungen im Entwurfsstatus verfügbar. 
                            Setzen Sie die Genehmigung zurück auf "Entwurf", um Änderungen vorzunehmen.
                          </AlertDescription>
                        </Alert>
                      )}
                      {mode === 'edit' && permit && (
                        <AiSuggestions permitId={permit.id} disabled={!canStartAiAnalysis} />
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="attachments" className="space-y-6 mt-0">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        Datei-Anhänge
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {mode === 'edit' && permit && (
                        <PermitAttachments permitId={permit.id} />
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="workflow" className="space-y-6 mt-0">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Activity className="h-5 w-5" />
                        Status-Management
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {mode === 'edit' && permit && (
                        <>
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
                                onAction={handleWorkflowAction}
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
                        </>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t">
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  Abbrechen
                </Button>

                <Button
                  type="submit"
                  disabled={(!canEdit && !canEditExecution) || isLoading}
                  className="bg-industrial-gray hover:bg-industrial-gray/90 disabled:opacity-50"
                  title={(!canEdit && !canEditExecution) ? "Kann nur bei Entwürfen oder aktiven Genehmigungen (Durchführung) bearbeitet werden" : ""}
                >
                  <Save className="h-4 w-4 mr-2" />
                  {mode === 'create' ? 'Erstellen' : 'Speichern'}
                </Button>
              </div>

              {!canEdit && !canEditExecution && mode === 'edit' && (
                <Alert className="mt-4">
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    Diese Genehmigung kann nicht vollständig bearbeitet werden. 
                    Entwürfe können vollständig bearbeitet werden, aktive Genehmigungen nur im Durchführung-Tab.
                    Verwenden Sie die Workflow-Aktionen, um den Status zu ändern.
                  </AlertDescription>
                </Alert>
              )}
            </Tabs>
          </form>
        </Form>
        </div>
      </DialogContent>

    </Dialog>
  );
}
