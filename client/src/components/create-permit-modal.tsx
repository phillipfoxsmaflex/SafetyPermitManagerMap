import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { X, AlertTriangle, Info, Search, Eye, ChevronRight, FileText, Shield, ArrowLeft, CheckCircle } from "lucide-react";
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
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { CreatePermitFormData, HazardCategory, HazardNote } from "@/lib/types";

const createPermitSchema = z.object({
  type: z.string().min(1, "Permit type is required"),
  location: z.string().min(1, "Location is required"),
  description: z.string().min(1, "Description is required"),
  requestorName: z.string().min(1, "Requestor name is required"),
  department: z.string().min(1, "Department is required"),
  contactNumber: z.string().min(1, "Contact number is required"),
  emergencyContact: z.string().min(1, "Emergency contact is required"),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  riskLevel: z.string().optional(),
  safetyOfficer: z.string().optional(),
  departmentHead: z.string().min(1, "Abteilungsleiter ist erforderlich"),
  maintenanceApprover: z.string().min(1, "Instandhaltungs-/Engineering-Genehmiger ist erforderlich"),
  identifiedHazards: z.string().optional(),
  additionalComments: z.string().optional(),
  selectedHazards: z.array(z.string()).optional(),
  hazardNotes: z.string().optional(),
  completedMeasures: z.array(z.string()).optional(),
});

interface CreatePermitModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreatePermitModal({ open, onOpenChange }: CreatePermitModalProps) {
  const [activeTab, setActiveTab] = useState("basic");
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [hazardNotes, setHazardNotes] = useState<HazardNote>({});
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // TRBS hazard categories data
  const categories: HazardCategory[] = [
    {
      id: 1,
      category: "Mechanische Gefährdungen",
      hazards: [
        { hazard: "ungeschützte bewegte Maschinenteile", protectiveMeasures: "Schutzeinrichtungen, Abschalten der Maschine" },
        { hazard: "Teile mit gefährlichen Oberflächen", protectiveMeasures: "Schutzhandschuhe, Abdeckungen" },
        { hazard: "bewegte Transportmittel, bewegte Arbeitsmittel", protectiveMeasures: "Absperrungen, Warnsignale" },
        { hazard: "unkontrolliert bewegte Teile", protectiveMeasures: "Sicherung gegen Herabfallen" },
        { hazard: "Sturz, Ausrutschen, Umknicken, Stolpern", protectiveMeasures: "rutschfeste Bodenbeläge, ordentliche Verkehrswege" }
      ]
    },
    {
      id: 2,
      category: "Elektrische Gefährdungen",
      hazards: [
        { hazard: "elektrischer Schlag", protectiveMeasures: "Freischaltung, spannungsfreier Zustand" },
        { hazard: "Lichtbogenbildung", protectiveMeasures: "geeignete Schutzausrüstung" },
        { hazard: "elektrostatische Aufladungen", protectiveMeasures: "Erdung, antistatische Ausrüstung" },
        { hazard: "Blitzschlag", protectiveMeasures: "Blitzschutzanlage" }
      ]
    },
    {
      id: 3,
      category: "Gefahrstoffe",
      hazards: [
        { hazard: "Hautkontakt mit Gefahrstoffen", protectiveMeasures: "Schutzhandschuhe, Schutzkleidung" },
        { hazard: "Einatmen von Gefahrstoffen", protectiveMeasures: "Atemschutz, Absaugung" },
        { hazard: "Verschlucken von Gefahrstoffen", protectiveMeasures: "Hygienemaßnahmen, Verbot von Essen und Trinken" },
        { hazard: "Hautkontakt mit unter Druck stehenden Flüssigkeiten", protectiveMeasures: "Schutzausrüstung, Druckentlastung" }
      ]
    },
    {
      id: 4,
      category: "Biologische Arbeitsstoffe",
      hazards: [
        { hazard: "Infektionsgefährdung", protectiveMeasures: "Hygienemaßnahmen, Schutzimpfungen" },
        { hazard: "sensibilisierende Wirkung", protectiveMeasures: "Minimierung der Exposition" },
        { hazard: "toxische Wirkung", protectiveMeasures: "persönliche Schutzausrüstung" }
      ]
    },
    {
      id: 5,
      category: "Brand- und Explosionsgefährdungen",
      hazards: [
        { hazard: "brennbare Feststoffe, Flüssigkeiten, Gase", protectiveMeasures: "Zündquellen vermeiden, Inertisierung" },
        { hazard: "explosionsfähige Atmosphäre", protectiveMeasures: "Ex-Schutz-Maßnahmen, Zoneneinteilung" },
        { hazard: "Explosivstoffe", protectiveMeasures: "sichere Lagerung, Mengenbegrenzung" }
      ]
    },
    {
      id: 6,
      category: "Thermische Gefährdungen",
      hazards: [
        { hazard: "heiße Medien/Oberflächen", protectiveMeasures: "Isolation, Schutzkleidung" },
        { hazard: "kalte Medien/Oberflächen", protectiveMeasures: "Isolation, Schutzkleidung" },
        { hazard: "Brand, Explosion", protectiveMeasures: "Brandschutzmaßnahmen" }
      ]
    },
    {
      id: 7,
      category: "Gefährdungen durch spezielle physikalische Einwirkungen",
      hazards: [
        { hazard: "Lärm", protectiveMeasures: "Gehörschutz, Lärmminderung" },
        { hazard: "Ultraschall, Infraschall", protectiveMeasures: "Abschirmung, Begrenzung der Exposition" },
        { hazard: "Ganzkörpervibrationen", protectiveMeasures: "schwingungsarme Arbeitsmittel" },
        { hazard: "Hand-Arm-Vibrationen", protectiveMeasures: "vibrationsmindernde Handschuhe" },
        { hazard: "optische Strahlung", protectiveMeasures: "Augenschutz, Abschirmung" },
        { hazard: "ionisierende Strahlung", protectiveMeasures: "Strahlenschutzmaßnahmen" },
        { hazard: "elektromagnetische Felder", protectiveMeasures: "Abschirmung, Abstandsregelungen" },
        { hazard: "Unter- oder Überdruck", protectiveMeasures: "Druckausgleich" }
      ]
    },
    {
      id: 8,
      category: "Gefährdungen durch Arbeitsumgebungsbedingungen",
      hazards: [
        { hazard: "Klima", protectiveMeasures: "Klimatisierung, geeignete Kleidung" },
        { hazard: "Beleuchtung/Sichtverhältnisse", protectiveMeasures: "ausreichende Beleuchtung" },
        { hazard: "Ersticken", protectiveMeasures: "Belüftung, Sauerstoffmessung" },
        { hazard: "Ertrinken", protectiveMeasures: "Schwimmhilfen, Absicherung" },
        { hazard: "Bewegungseinschränkung", protectiveMeasures: "ausreichend Platz schaffen" }
      ]
    },
    {
      id: 9,
      category: "Physische Belastung/Arbeitsschwere",
      hazards: [
        { hazard: "schwere dynamische Arbeit", protectiveMeasures: "Hebehilfen, Pausenregelung" },
        { hazard: "einseitige dynamische Arbeit", protectiveMeasures: "Arbeitsplatzwechsel, Pausenregelung" },
        { hazard: "Haltungsarbeit/Zwangshaltung", protectiveMeasures: "ergonomische Arbeitsplätze" },
        { hazard: "Kombination aus statischer und dynamischer Arbeit", protectiveMeasures: "ausgewogene Arbeitsgestaltung" }
      ]
    },
    {
      id: 10,
      category: "Psychische Faktoren",
      hazards: [
        { hazard: "ungenügend gestaltete Arbeitsaufgabe", protectiveMeasures: "Arbeitsgestaltung optimieren" },
        { hazard: "ungenügend gestaltete Arbeitsorganisation", protectiveMeasures: "Organisationsverbesserung" },
        { hazard: "ungenügend gestaltete soziale Bedingungen", protectiveMeasures: "Teambuilding-Maßnahmen" },
        { hazard: "ungenügend gestaltete Arbeitsplatz- und Arbeitsumgebungsbedingungen", protectiveMeasures: "ergonomische Verbesserungen" }
      ]
    },
    {
      id: 11,
      category: "Sonstige Gefährdungen",
      hazards: [
        { hazard: "durch Menschen", protectiveMeasures: "Sicherheitspersonal, Überwachung" },
        { hazard: "durch Tiere", protectiveMeasures: "Schutzmaßnahmen, Fernhalten" },
        { hazard: "durch Pflanzen und pflanzliche Produkte", protectiveMeasures: "Schutzkleidung, Information" },
        { hazard: "auf Verkehrswegen", protectiveMeasures: "Verkehrsregelung, Warnschilder" }
      ]
    }
  ];

  // Helper functions for hazard management
  const getHazardId = (categoryId: number, hazardIndex: number) => `${categoryId}-${hazardIndex}`;
  
  const toggleHazard = (categoryId: number, hazardIndex: number) => {
    const hazardId = getHazardId(categoryId, hazardIndex);
    const currentHazards = form.getValues("selectedHazards") || [];
    const isSelected = currentHazards.includes(hazardId);
    
    if (isSelected) {
      form.setValue("selectedHazards", currentHazards.filter(h => h !== hazardId));
    } else {
      form.setValue("selectedHazards", [...currentHazards, hazardId]);
    }
  };

  const updateHazardNote = (hazardId: string, note: string) => {
    const newNotes = { ...hazardNotes, [hazardId]: note };
    setHazardNotes(newNotes);
    form.setValue("hazardNotes", JSON.stringify(newNotes));
  };

  const isHazardSelected = (categoryId: number, hazardIndex: number) => {
    const hazardId = getHazardId(categoryId, hazardIndex);
    const selectedHazards = watchedSelectedHazards || [];
    return selectedHazards.includes(hazardId);
  };

  const filteredCategories = categories.filter(category =>
    category.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
    category.hazards.some(hazard => 
      hazard.hazard.toLowerCase().includes(searchQuery.toLowerCase()) ||
      hazard.protectiveMeasures.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  const form = useForm<CreatePermitFormData>({
    resolver: zodResolver(createPermitSchema),
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
      identifiedHazards: "",
      additionalComments: "",
      selectedHazards: [],
      hazardNotes: "{}",
      completedMeasures: [],
    },
  });

  // Watch for real-time updates
  const watchedSelectedHazards = form.watch("selectedHazards");

  const createPermitMutation = useMutation({
    mutationFn: async (data: CreatePermitFormData) => {
      const response = await apiRequest("POST", "/api/permits", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/permits"] });
      queryClient.invalidateQueries({ queryKey: ["/api/permits/stats"] });
      toast({
        title: "Success",
        description: "Permit submitted for approval successfully!",
      });
      onOpenChange(false);
      form.reset();
      setActiveTab("basic");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create permit. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: CreatePermitFormData) => {
    createPermitMutation.mutate(data);
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-industrial-gray">
            Neue Arbeitsgenehmigung erstellen
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Tabs value={activeTab} onValueChange={handleTabChange}>
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
                    name="startDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Gewünschtes Startdatum</FormLabel>
                        <FormControl>
                          <Input type="datetime-local" {...field} />
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
                        <FormLabel>Gewünschtes Enddatum</FormLabel>
                        <FormControl>
                          <Input type="datetime-local" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="md:col-span-2">
                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Arbeitsbeschreibung</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Beschreiben Sie die auszuführenden Arbeiten..."
                              className="min-h-[100px]"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="requestorName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name des Antragstellers</FormLabel>
                        <FormControl>
                          <Input {...field} />
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
                          <Input {...field} />
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
                          <Input type="tel" {...field} />
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
                          <Input type="tel" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </TabsContent>

              <TabsContent value="safety" className="space-y-6">
                <Alert className="border-yellow-200 bg-yellow-50">
                  <AlertTriangle className="h-4 w-4 text-caution-orange" />
                  <AlertDescription className="text-industrial-gray">
                    <strong>TRBS Gefährdungsbeurteilung:</strong> Wählen Sie alle zutreffenden Gefährdungskategorien aus und dokumentieren Sie die erforderlichen Schutzmaßnahmen.
                  </AlertDescription>
                </Alert>

                {/* Search and filter */}
                <div className="flex flex-col space-y-4">
                  <div className="flex items-center space-x-4">
                    <div className="flex-1">
                      <Input
                        placeholder="Gefährdungen durchsuchen..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full"
                      />
                    </div>
                    {selectedCategory && (
                      <Button
                        variant="outline"
                        onClick={() => setSelectedCategory(null)}
                        className="flex items-center space-x-2"
                      >
                        <ArrowLeft className="h-4 w-4" />
                        <span>Zurück zur Übersicht</span>
                      </Button>
                    )}
                  </div>
                </div>

                {/* Main hazard interface */}
                {!selectedCategory ? (
                  /* Category overview */
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredCategories.map((category) => {
                      const selectedHazardsInCategory = (form.getValues("selectedHazards") || [])
                        .filter(hazardId => hazardId.startsWith(`${category.id}-`)).length;

                      return (
                        <Card
                          key={category.id}
                          className="cursor-pointer transition-all hover:shadow-md border-l-4 border-l-primary"
                          onClick={() => setSelectedCategory(category.id)}
                        >
                          <CardHeader className="pb-3">
                            <div className="flex items-start justify-between">
                              <CardTitle className="text-sm font-medium text-industrial-gray line-clamp-2">
                                {category.category}
                              </CardTitle>
                              <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0 ml-2" />
                            </div>
                          </CardHeader>
                          <CardContent>
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">
                                {category.hazards.length} Gefährdungen
                              </span>
                              {selectedHazardsInCategory > 0 && (
                                <span className="bg-primary text-primary-foreground px-2 py-1 rounded-full text-xs">
                                  {selectedHazardsInCategory} ausgewählt
                                </span>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                ) : (
                  /* Detailed hazard view */
                  (() => {
                    const category = categories.find(c => c.id === selectedCategory);
                    if (!category) return null;

                    return (
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg text-industrial-gray">
                            {category.category}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          {category.hazards.map((hazard, index) => {
                            const hazardId = getHazardId(category.id, index);
                            const isSelected = isHazardSelected(category.id, index);
                            const note = hazardNotes[hazardId] || "";

                            return (
                              <div key={index} className="border rounded-lg p-4 space-y-3">
                                <div className="flex items-start space-x-3">
                                  <Checkbox
                                    checked={isSelected}
                                    onCheckedChange={() => toggleHazard(category.id, index)}
                                    className="mt-1"
                                  />
                                  <div className="flex-1 space-y-2">
                                    <div>
                                      <h4 className="font-medium text-sm text-industrial-gray">
                                        {hazard.hazard}
                                      </h4>
                                      <p className="text-sm text-muted-foreground mt-1">
                                        <strong>Schutzmaßnahmen:</strong> {hazard.protectiveMeasures}
                                      </p>
                                    </div>
                                    
                                    {isSelected && (
                                      <div className="space-y-2">
                                        <label className="text-sm font-medium text-industrial-gray">
                                          Zusätzliche Notizen:
                                        </label>
                                        <Textarea
                                          value={note}
                                          onChange={(e) => updateHazardNote(hazardId, e.target.value)}
                                          placeholder="Zusätzliche Informationen oder spezifische Maßnahmen..."
                                          className="text-sm"
                                          rows={2}
                                        />
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                          
                          {/* Sonstige (Other) section */}
                          <div className="border rounded-lg p-4 space-y-3 bg-gray-50">
                            <div className="flex items-start space-x-3">
                              <div className="flex-1 space-y-2">
                                <div>
                                  <h4 className="font-medium text-sm text-industrial-gray">
                                    Sonstige Gefährdungen
                                  </h4>
                                  <p className="text-sm text-muted-foreground mt-1">
                                    Weitere spezifische Gefährdungen oder Maßnahmen für diese Kategorie
                                  </p>
                                </div>
                                
                                <div className="space-y-2">
                                  <label className="text-sm font-medium text-industrial-gray">
                                    Zusätzliche Gefährdungen und Maßnahmen:
                                  </label>
                                  <Textarea
                                    value={hazardNotes[`${category.id}-sonstige`] || ""}
                                    onChange={(e) => updateHazardNote(`${category.id}-sonstige`, e.target.value)}
                                    placeholder="Beschreiben Sie weitere Gefährdungen und erforderliche Schutzmaßnahmen..."
                                    className="text-sm"
                                    rows={3}
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })()
                )}

                {/* Summary of selected hazards */}
                {(watchedSelectedHazards || []).length > 0 && (
                  <Card className="bg-blue-50 border-blue-200">
                    <CardHeader>
                      <CardTitle className="text-sm text-blue-800 flex items-center space-x-2">
                        <CheckCircle className="h-4 w-4" />
                        <span>Ausgewählte Gefährdungen ({(watchedSelectedHazards || []).length})</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {(watchedSelectedHazards || []).map(hazardId => {
                          const [categoryId, hazardIndex] = hazardId.split('-').map(Number);
                          const category = categories.find(c => c.id === categoryId);
                          const hazard = category?.hazards[hazardIndex];
                          
                          if (!category || !hazard) return null;
                          
                          return (
                            <div key={hazardId} className="text-xs bg-white p-2 rounded border">
                              <span className="font-medium text-blue-700">{category.category}:</span>
                              <span className="text-blue-600 ml-1">{hazard.hazard}</span>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                )}


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
                          <FormControl>
                            <Input placeholder="Name des Abteilungsleiters" {...field} />
                          </FormControl>
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
                          <FormControl>
                            <Input placeholder="Name des Instandhaltungs-/Engineering-Genehmigers" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="text-sm text-industrial-gray">
                        <strong>Hinweis:</strong> Diese Personen erhalten eine Benachrichtigung zur Genehmigung der Arbeitserlaubnis. 
                        Beide Genehmigungen sind erforderlich, bevor die Arbeiten beginnen können.
                      </p>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="text-secondary-gray">⚙️</div>
                        <div>
                          <p className="font-medium text-industrial-gray">Operations Manager</p>
                          <p className="text-sm text-secondary-gray">Final authorization for critical work</p>
                        </div>
                      </div>
                      <span className="inline-flex px-3 py-1 text-xs font-semibold rounded-full bg-orange-100 text-warning-orange">
                        Pending
                      </span>
                    </div>
                  </CardContent>
                </Card>

                <FormField
                  control={form.control}
                  name="additionalComments"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Additional Comments</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Any additional safety considerations or special instructions..."
                          {...field}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <Card>
                  <CardHeader>
                    <CardTitle className="text-industrial-gray">Emergency Contacts</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-3 bg-red-50 rounded-lg">
                        <p className="font-medium text-alert-red">Emergency Services</p>
                        <p className="text-lg font-bold text-alert-red">112</p>
                      </div>
                      <div className="p-3 bg-orange-50 rounded-lg">
                        <p className="font-medium text-caution-orange">Plant Emergency</p>
                        <p className="text-lg font-bold text-caution-orange">+49 123 456-7890</p>
                      </div>
                      <div className="p-3 bg-blue-50 rounded-lg">
                        <p className="font-medium text-safety-blue">Safety Department</p>
                        <p className="text-lg font-bold text-safety-blue">+49 123 456-7891</p>
                      </div>
                      <div className="p-3 bg-green-50 rounded-lg">
                        <p className="font-medium text-safety-green">Medical</p>
                        <p className="text-lg font-bold text-safety-green">+49 123 456-7892</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            <div className="flex justify-between items-center pt-6 border-t border-gray-200">
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <div className="flex space-x-3">
                <Button
                  type="button"
                  variant="outline"
                  disabled={createPermitMutation.isPending}
                >
                  Save Draft
                </Button>
                <Button
                  type="submit"
                  className="bg-safety-blue hover:bg-blue-700 text-white"
                  disabled={createPermitMutation.isPending}
                >
                  {createPermitMutation.isPending ? "Submitting..." : "Submit for Approval"}
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
