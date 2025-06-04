import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Save, Send } from "lucide-react";
import type { Permit } from "@shared/schema";

interface EditPermitModalSimpleProps {
  permit: Permit | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditPermitModalSimple({ permit, open, onOpenChange }: EditPermitModalSimpleProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState({
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
    identifiedHazards: permit?.identifiedHazards || "",
    additionalComments: permit?.additionalComments || "",
  });

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const saveDraftMutation = useMutation({
    mutationFn: async (data: any) => {
      console.log("Saving draft for permit:", permit?.id);
      const response = await fetch(`/api/permits/${permit?.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, status: "draft" })
      });
      if (!response.ok) throw new Error("Failed to save draft");
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Erfolg", description: "Entwurf gespeichert." });
      queryClient.invalidateQueries({ queryKey: ["/api/permits"] });
      onOpenChange(false);
    },
    onError: () => {
      toast({ title: "Fehler", description: "Entwurf konnte nicht gespeichert werden.", variant: "destructive" });
    }
  });

  const submitMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch(`/api/permits/${permit?.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, status: "pending" })
      });
      if (!response.ok) throw new Error("Failed to submit");
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Erfolg", description: "Zur Genehmigung gesendet." });
      queryClient.invalidateQueries({ queryKey: ["/api/permits"] });
      onOpenChange(false);
    },
    onError: () => {
      toast({ title: "Fehler", description: "Fehler beim Senden.", variant: "destructive" });
    }
  });

  const handleSaveDraft = () => {
    console.log("Save draft clicked");
    saveDraftMutation.mutate(formData);
  };

  const handleSubmit = () => {
    console.log("Submit clicked");
    submitMutation.mutate(formData);
  };

  if (!permit) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Arbeitserlaubnis bearbeiten - {permit.permitId}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Genehmigungstyp</Label>
              <Select value={formData.type} onValueChange={(value) => updateField("type", value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hot_work">Heißarbeiten</SelectItem>
                  <SelectItem value="confined_space">Enger Raum</SelectItem>
                  <SelectItem value="electrical">Elektrische Arbeiten</SelectItem>
                  <SelectItem value="height_work">Höhenarbeiten</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Arbeitsort</Label>
              <Input value={formData.location} onChange={(e) => updateField("location", e.target.value)} />
            </div>
          </div>

          <div>
            <Label>Beschreibung der Arbeiten</Label>
            <Textarea value={formData.description} onChange={(e) => updateField("description", e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Antragsteller</Label>
              <Input value={formData.requestorName} onChange={(e) => updateField("requestorName", e.target.value)} />
            </div>
            <div>
              <Label>Abteilung</Label>
              <Input value={formData.department} onChange={(e) => updateField("department", e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Kontaktnummer</Label>
              <Input value={formData.contactNumber} onChange={(e) => updateField("contactNumber", e.target.value)} />
            </div>
            <div>
              <Label>Notfallkontakt</Label>
              <Input value={formData.emergencyContact} onChange={(e) => updateField("emergencyContact", e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Startdatum</Label>
              <Input type="datetime-local" value={formData.startDate} onChange={(e) => updateField("startDate", e.target.value)} />
            </div>
            <div>
              <Label>Enddatum</Label>
              <Input type="datetime-local" value={formData.endDate} onChange={(e) => updateField("endDate", e.target.value)} />
            </div>
          </div>

          <div>
            <Label>Risikostufe</Label>
            <Select value={formData.riskLevel} onValueChange={(value) => updateField("riskLevel", value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Niedrig</SelectItem>
                <SelectItem value="medium">Mittel</SelectItem>
                <SelectItem value="high">Hoch</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Identifizierte Gefahren</Label>
            <Textarea value={formData.identifiedHazards} onChange={(e) => updateField("identifiedHazards", e.target.value)} />
          </div>

          <div>
            <Label>Zusätzliche Kommentare</Label>
            <Textarea value={formData.additionalComments} onChange={(e) => updateField("additionalComments", e.target.value)} />
          </div>
        </div>

        <div className="flex justify-between pt-6 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Abbrechen
          </Button>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={handleSaveDraft}
              disabled={saveDraftMutation.isPending}
            >
              <Save className="w-4 h-4 mr-2" />
              Als Entwurf speichern
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={submitMutation.isPending}
              className="bg-safety-blue text-white hover:bg-blue-700"
            >
              <Send className="w-4 h-4 mr-2" />
              Zur Genehmigung senden
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}