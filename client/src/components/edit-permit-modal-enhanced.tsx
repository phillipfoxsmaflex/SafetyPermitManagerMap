import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
import { AlertTriangle, Info, Save, Send, ArrowLeft, CheckCircle } from "lucide-react";

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
  departmentHead: z.string().min(1, "Abteilungsleiter ist erforderlich"),
  maintenanceApprover: z.string().min(1, "Instandhaltungsgenehmiger ist erforderlich"),
  identifiedHazards: z.string().optional(),
  additionalComments: z.string().optional(),
  selectedHazards: z.array(z.string()).optional(),
  hazardNotes: z.string().optional(),
  completedMeasures: z.array(z.string()).optional(),
});

type EditPermitFormData = z.infer<typeof editPermitSchema>;

export function EditPermitModalEnhanced({ permit, open, onOpenChange }: EditPermitModalEnhancedProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [hazardNotes, setHazardNotes] = useState<{ [key: string]: string }>({});

  // TRBS hazard categories data
  const categories = [
    {
      id: 1,
      category: "Mechanische Gefährdungen",
      hazards: [
        { hazard: "Quetschung durch bewegte Teile", protectiveMeasures: "Schutzeinrichtungen, Absperrungen" },
        { hazard: "Schneiden an scharfen Kanten", protectiveMeasures: "Schutzhandschuhe, Kantenschutz" },
        { hazard: "Stoß durch herunterfallende Gegenstände", protectiveMeasures: "Schutzhelm, Absicherung von Arbeitsbereichen" },
        { hazard: "Sturz durch ungesicherte Öffnungen", protectiveMeasures: "Abdeckungen, Absturzsicherung" }
      ]
    },
    {
      id: 2,
      category: "Elektrische Gefährdungen",
      hazards: [
        { hazard: "Stromschlag durch defekte Geräte", protectiveMeasures: "Prüfung elektrischer Anlagen, FI-Schutzschalter" },
        { hazard: "Lichtbogen bei Schalthandlungen", protectiveMeasures: "Lichtbogenschutzkleidung, sichere Schaltverfahren" },
        { hazard: "Statische Entladung", protectiveMeasures: "Erdung, antistatische Ausrüstung" },
        { hazard: "Induktive Kopplung", protectiveMeasures: "Abschaltung benachbarter Leitungen" }
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
        { hazard: "Klima (Hitze, Kälte)", protectiveMeasures: "Klimatisierung, Schutzkleidung" },
        { hazard: "unzureichende Beleuchtung", protectiveMeasures: "ausreichende Beleuchtung" },
        { hazard: "Lärm", protectiveMeasures: "Lärmschutzmaßnahmen" },
        { hazard: "unzureichende Verkehrswege", protectiveMeasures: "sichere Verkehrswege" },
        { hazard: "Sturz, Ausgleiten", protectiveMeasures: "rutschfeste Beläge, Ordnung" },
        { hazard: "unzureichende Flucht- und Rettungswege", protectiveMeasures: "freihalten der Fluchtwege" }
      ]
    },
    {
      id: 9,
      category: "Physische Belastung/Arbeitsschwere",
      hazards: [
        { hazard: "schwere dynamische Arbeit", protectiveMeasures: "Hilfsmittel, Pausenregelung" },
        { hazard: "einseitige dynamische Arbeit", protectiveMeasures: "Arbeitsplatzwechsel, Pausenregelung" },
        { hazard: "Haltungsarbeit/Zwangshaltungen", protectiveMeasures: "ergonomische Arbeitsplätze" },
        { hazard: "Fortbewegung/ungünstige Körperhaltung", protectiveMeasures: "Hilfsmittel, Arbeitsorganisation" },
        { hazard: "Kombination körperlicher Belastungsfaktoren", protectiveMeasures: "ganzheitliche Arbeitsplatzgestaltung" }
      ]
    },
    {
      id: 10,
      category: "Psychische Faktoren",
      hazards: [
        { hazard: "unzureichend gestaltete Arbeitsaufgabe", protectiveMeasures: "klare Arbeitsanweisungen" },
        { hazard: "unzureichend gestaltete Arbeitsorganisation", protectiveMeasures: "strukturierte Arbeitsabläufe" },
        { hazard: "unzureichend gestaltete soziale Bedingungen", protectiveMeasures: "Kommunikation, Teamarbeit" },
        { hazard: "unzureichend gestaltete Arbeitsplatz- und Arbeitsumgebungsfaktoren", protectiveMeasures: "ergonomische Arbeitsplätze" }
      ]
    },
    {
      id: 11,
      category: "Sonstige Gefährdungen",
      hazards: [
        { hazard: "durch Menschen (körperliche Gewalt)", protectiveMeasures: "Sicherheitsmaßnahmen, Schulungen" },
        { hazard: "durch Tiere", protectiveMeasures: "Schutzmaßnahmen, Abstand halten" },
        { hazard: "durch Pflanzen und pflanzliche Produkte", protectiveMeasures: "Schutzkleidung, Allergietests" },
        { hazard: "Absturz in/durch Behälter, Becken, Gruben", protectiveMeasures: "Absturzsicherung, Rettungsausrüstung" }
      ]
    }
  ];

  const getHazardId = (categoryId: number, hazardIndex: number) => `${categoryId}-${hazardIndex}`;

  const toggleHazard = (categoryId: number, hazardIndex: number) => {
    const hazardId = getHazardId(categoryId, hazardIndex);
    const currentHazards = watchedSelectedHazards || [];
    
    if (currentHazards.includes(hazardId)) {
      form.setValue("selectedHazards", currentHazards.filter(id => id !== hazardId));
      // Remove note when unchecking
      const newNotes = { ...hazardNotes };
      delete newNotes[hazardId];
      setHazardNotes(newNotes);
      form.setValue("hazardNotes", JSON.stringify(newNotes));
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

  const form = useForm<EditPermitFormData>({
    resolver: zodResolver(editPermitSchema),
    defaultValues: {
      type: permit?.type || "",
      location: permit?.location || "",
      description: permit?.description || "",
      requestorName: permit?.requestorName || "",
      department: permit?.department || "",
      contactNumber: permit?.contactNumber || "",
      emergencyContact: permit?.emergencyContact || "",
      startDate: permit?.startDate ? new Date(permit.startDate).toISOString().slice(0, 16) : "",
      endDate: permit?.endDate ? new Date(permit.endDate).toISOString().slice(0, 16) : "",
      riskLevel: permit?.riskLevel || "",
      safetyOfficer: permit?.safetyOfficer || "",
      departmentHead: permit?.departmentHead || "",
      maintenanceApprover: permit?.maintenanceApprover || "",
      identifiedHazards: permit?.identifiedHazards || "",
      additionalComments: permit?.additionalComments || "",
      selectedHazards: permit?.selectedHazards || [],
      hazardNotes: permit?.hazardNotes || "{}",
      completedMeasures: permit?.completedMeasures || [],
    },
  });

  // Watch for real-time updates
  const watchedSelectedHazards = form.watch("selectedHazards");

  // Initialize hazard notes from permit data
  useState(() => {
    if (permit?.hazardNotes) {
      try {
        const notes = JSON.parse(permit.hazardNotes);
        setHazardNotes(notes);
      } catch (e) {
        setHazardNotes({});
      }
    }
  });

  const updateMutation = useMutation({
    mutationFn: async (data: EditPermitFormData) => {
      const response = await apiRequest("PATCH", `/api/permits/${permit?.id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/permits"] });
      toast({
        title: "Genehmigung aktualisiert",
        description: "Die Arbeitserlaubnis wurde erfolgreich aktualisiert.",
      });
      onOpenChange(false);
    },
    onError: (error) => {
      toast({
        title: "Fehler",
        description: "Die Genehmigung konnte nicht aktualisiert werden.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: EditPermitFormData) => {
    updateMutation.mutate(data);
  };

  const onSubmitForApproval = (data: EditPermitFormData) => {
    updateMutation.mutate({ ...data, status: "pending" });
  };

  if (!permit) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-industrial-gray">
            Arbeitserlaubnis bearbeiten - {permit.permitId}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form className="space-y-6">
            <Tabs defaultValue="details" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="details">Arbeitsdetails</TabsTrigger>
                <TabsTrigger value="safety">Sicherheitsbewertung</TabsTrigger>
                <TabsTrigger value="approval">Genehmigung</TabsTrigger>
              </TabsList>

              <TabsContent value="details" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-industrial-gray">Grundlegende Informationen</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                                <SelectItem value="confined_space">Arbeiten in engen Räumen</SelectItem>
                                <SelectItem value="hot_work">Heißarbeiten</SelectItem>
                                <SelectItem value="electrical">Elektrische Arbeiten</SelectItem>
                                <SelectItem value="height">Arbeiten in der Höhe</SelectItem>
                                <SelectItem value="chemical">Arbeiten mit Chemikalien</SelectItem>
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
                              <Input placeholder="Spezifischer Arbeitsort" {...field} />
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
                          <FormLabel>Beschreibung der Arbeit</FormLabel>
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
                        name="startDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Startdatum und -zeit</FormLabel>
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
                            <FormLabel>Enddatum und -zeit</FormLabel>
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

                <Card>
                  <CardHeader>
                    <CardTitle className="text-industrial-gray">Kontaktinformationen</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="requestorName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Antragsteller</FormLabel>
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
                  </CardContent>
                </Card>
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
                      const selectedHazardsInCategory = (watchedSelectedHazards || [])
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
                              <div className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full whitespace-nowrap ml-2">
                                {selectedHazardsInCategory}/{category.hazards.length}
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="pt-0">
                            <p className="text-xs text-muted-foreground">
                              {category.hazards.length} Gefährdungen verfügbar
                            </p>
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
                    <CardTitle className="text-industrial-gray">Genehmigungsbeauftragte</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="departmentHead"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Abteilungsleiter</FormLabel>
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
                            <FormLabel>Instandhaltung/Engineering</FormLabel>
                            <FormControl>
                              <Input placeholder="Name des Instandhaltungsverantwortlichen" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="riskLevel"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Risikostufe (Optional)</FormLabel>
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
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="safetyOfficer"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Sicherheitsbeauftragter (Optional)</FormLabel>
                            <FormControl>
                              <Input placeholder="Name des Sicherheitsbeauftragten" {...field} />
                            </FormControl>
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
                              placeholder="Besondere Anweisungen, zusätzliche Sicherheitsmaßnahmen oder andere wichtige Informationen..."
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
            </Tabs>

            <div className="flex justify-end space-x-3 pt-6 border-t">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Abbrechen
              </Button>
              <Button
                onClick={form.handleSubmit(onSubmit)}
                disabled={updateMutation.isPending}
                className="bg-industrial-gray hover:bg-industrial-gray/90"
              >
                <Save className="h-4 w-4 mr-2" />
                {updateMutation.isPending ? "Speichern..." : "Als Entwurf speichern"}
              </Button>
              <Button
                onClick={form.handleSubmit(onSubmitForApproval)}
                disabled={updateMutation.isPending}
                className="bg-safety-blue hover:bg-safety-blue/90"
              >
                <Send className="h-4 w-4 mr-2" />
                {updateMutation.isPending ? "Übermitteln..." : "Zur Genehmigung übermitteln"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}