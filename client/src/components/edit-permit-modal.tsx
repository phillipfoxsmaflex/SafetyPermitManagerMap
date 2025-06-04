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

interface EditPermitModalProps {
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
  identifiedHazards: z.string().optional(),
  additionalComments: z.string().optional(),
  atmosphereTest: z.boolean().default(false),
  ventilation: z.boolean().default(false),
  ppe: z.boolean().default(false),
  emergencyProcedures: z.boolean().default(false),
  fireWatch: z.boolean().default(false),
  isolationLockout: z.boolean().default(false),
  oxygenLevel: z.string().optional(),
  lelLevel: z.string().optional(),
  h2sLevel: z.string().optional(),
});

type EditPermitFormData = z.infer<typeof editPermitSchema>;

export function EditPermitModal({ permit, open, onOpenChange }: EditPermitModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<EditPermitFormData>({
    resolver: zodResolver(editPermitSchema),
    defaultValues: permit ? {
      type: permit.type,
      location: permit.location,
      description: permit.description,
      requestorName: permit.requestorName,
      department: permit.department,
      contactNumber: permit.contactNumber,
      emergencyContact: permit.emergencyContact,
      startDate: new Date(permit.startDate).toISOString().slice(0, 16),
      endDate: new Date(permit.endDate).toISOString().slice(0, 16),
      riskLevel: permit.riskLevel || "",
      safetyOfficer: permit.safetyOfficer || "",
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
    mutationFn: async (data: EditPermitFormData) => {
      if (!permit) throw new Error("Keine Genehmigung ausgewählt");
      
      const response = await fetch(`/api/permits/${permit.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...data,
          startDate: new Date(data.startDate).toISOString(),
          endDate: new Date(data.endDate).toISOString(),
        }),
      });
      
      if (!response.ok) {
        throw new Error("Fehler beim Aktualisieren der Genehmigung");
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/permits"] });
      queryClient.invalidateQueries({ queryKey: ["/api/permits/stats"] });
      toast({
        title: "Erfolg",
        description: "Genehmigung wurde erfolgreich aktualisiert",
      });
      onOpenChange(false);
    },
    onError: (error) => {
      toast({
        title: "Fehler",
        description: error instanceof Error ? error.message : "Unbekannter Fehler",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: EditPermitFormData) => {
    updatePermitMutation.mutate(data);
  };

  if (!permit) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Genehmigung bearbeiten - {permit.permitId}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-industrial-gray">Grundinformationen</h3>
              
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
                            <SelectValue placeholder="Typ auswählen" />
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
                  name="riskLevel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Risikostufe</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Risikostufe auswählen" />
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
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Arbeitsort</FormLabel>
                      <FormControl>
                        <Input placeholder="z.B. Reaktor A-101" {...field} />
                      </FormControl>
                      <FormMessage />
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
                    <FormLabel>Arbeitsbeschreibung</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Detaillierte Beschreibung der durchzuführenden Arbeiten"
                        rows={3}
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Contact Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-industrial-gray">Kontaktinformationen</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="requestorName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Antragsteller</FormLabel>
                      <FormControl>
                        <Input placeholder="Vor- und Nachname" {...field} />
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
                        <Input placeholder="z.B. Produktion, Wartung" {...field} />
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
                        <Input placeholder="Telefonnummer" {...field} />
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
                        <Input placeholder="Notfall-Telefonnummer" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Schedule */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-industrial-gray">Zeitplan</h3>
              
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
            </div>

            {/* Safety Checklist */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-industrial-gray">Sicherheitscheckliste</h3>
              
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
                      <div className="space-y-1 leading-none">
                        <FormLabel>Atmosphärenprüfung durchgeführt</FormLabel>
                      </div>
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
                      <div className="space-y-1 leading-none">
                        <FormLabel>Belüftung sichergestellt</FormLabel>
                      </div>
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
                      <div className="space-y-1 leading-none">
                        <FormLabel>Persönliche Schutzausrüstung vorhanden</FormLabel>
                      </div>
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
                      <div className="space-y-1 leading-none">
                        <FormLabel>Notfallverfahren kommuniziert</FormLabel>
                      </div>
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
                      <div className="space-y-1 leading-none">
                        <FormLabel>Brandwache zugewiesen</FormLabel>
                      </div>
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
                      <div className="space-y-1 leading-none">
                        <FormLabel>Isolierung/Absperrung durchgeführt</FormLabel>
                      </div>
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Atmospheric Monitoring */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-industrial-gray">Atmosphären-Messwerte</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="oxygenLevel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sauerstoff (%)</FormLabel>
                      <FormControl>
                        <Input placeholder="z.B. 20.9" {...field} />
                      </FormControl>
                      <FormMessage />
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
                        <Input placeholder="z.B. 0" {...field} />
                      </FormControl>
                      <FormMessage />
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
                        <Input placeholder="z.B. 0" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Additional Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-industrial-gray">Zusätzliche Informationen</h3>
              
              <FormField
                control={form.control}
                name="identifiedHazards"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Identifizierte Gefahren</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Beschreibung der identifizierten Gefahren und Risiken"
                        rows={3}
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
                    <FormLabel>Zusätzliche Kommentare</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Weitere Anmerkungen oder spezielle Anforderungen"
                        rows={3}
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end space-x-4 pt-6 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Abbrechen
              </Button>
              <Button
                type="submit"
                disabled={updatePermitMutation.isPending}
                className="bg-safety-blue text-white hover:bg-blue-700"
              >
                {updatePermitMutation.isPending ? "Speichern..." : "Änderungen speichern"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}