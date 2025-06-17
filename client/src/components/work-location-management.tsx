import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Building, MapPin } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface WorkLocation {
  id: number;
  name: string;
  description?: string;
  building?: string;
  area?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface WorkLocationFormData {
  name: string;
  description: string;
  building: string;
  area: string;
  isActive: boolean;
}

export function WorkLocationManagement() {
  const [editingLocation, setEditingLocation] = useState<WorkLocation | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [formData, setFormData] = useState<WorkLocationFormData>({
    name: "",
    description: "",
    building: "",
    area: "",
    isActive: true
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: locations = [], isLoading } = useQuery<WorkLocation[]>({
    queryKey: ["/api/work-locations"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: WorkLocationFormData) => {
      return await apiRequest("/api/work-locations", "POST", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/work-locations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/work-locations/active"] });
      setIsCreateDialogOpen(false);
      resetForm();
      toast({
        title: "Arbeitsort erstellt",
        description: "Der neue Arbeitsort wurde erfolgreich hinzugefügt.",
      });
    },
    onError: () => {
      toast({
        title: "Fehler",
        description: "Beim Erstellen des Arbeitsorts ist ein Fehler aufgetreten.",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<WorkLocationFormData> }) => {
      return await apiRequest(`/api/work-locations/${id}`, "PATCH", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/work-locations"] });
      setIsEditDialogOpen(false);
      setEditingLocation(null);
      resetForm();
      toast({
        title: "Arbeitsort aktualisiert",
        description: "Der Arbeitsort wurde erfolgreich aktualisiert.",
      });
    },
    onError: () => {
      toast({
        title: "Fehler",
        description: "Beim Aktualisieren des Arbeitsorts ist ein Fehler aufgetreten.",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest(`/api/work-locations/${id}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/work-locations"] });
      toast({
        title: "Arbeitsort gelöscht",
        description: "Der Arbeitsort wurde erfolgreich gelöscht.",
      });
    },
    onError: () => {
      toast({
        title: "Fehler",
        description: "Beim Löschen des Arbeitsorts ist ein Fehler aufgetreten.",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      building: "",
      area: "",
      isActive: true
    });
  };

  const handleCreate = () => {
    setIsCreateDialogOpen(true);
    resetForm();
  };

  const handleEdit = (location: WorkLocation) => {
    setEditingLocation(location);
    setFormData({
      name: location.name,
      description: location.description || "",
      building: location.building || "",
      area: location.area || "",
      isActive: location.isActive
    });
    setIsEditDialogOpen(true);
  };

  const handleSubmitCreate = () => {
    if (!formData.name.trim()) {
      toast({
        title: "Fehler",
        description: "Name ist erforderlich.",
        variant: "destructive",
      });
      return;
    }
    createMutation.mutate(formData);
  };

  const handleSubmitEdit = () => {
    if (!editingLocation || !formData.name.trim()) {
      toast({
        title: "Fehler",
        description: "Name ist erforderlich.",
        variant: "destructive",
      });
      return;
    }
    updateMutation.mutate({ id: editingLocation.id, data: formData });
  };

  const handleDelete = (location: WorkLocation) => {
    if (window.confirm(`Möchten Sie den Arbeitsort "${location.name}" wirklich löschen?`)) {
      deleteMutation.mutate(location.id);
    }
  };

  const renderLocationFormFields = () => (
    <div className="grid gap-4 py-4">
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="name" className="text-right">
          Name *
        </Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
          className="col-span-3"
          placeholder="z.B. Produktionshalle A"
        />
      </div>
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="building" className="text-right">
          Gebäude
        </Label>
        <Input
          id="building"
          value={formData.building}
          onChange={(e) => setFormData(prev => ({ ...prev, building: e.target.value }))}
          className="col-span-3"
          placeholder="z.B. Gebäude 1"
        />
      </div>
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="area" className="text-right">
          Bereich
        </Label>
        <Input
          id="area"
          value={formData.area}
          onChange={(e) => setFormData(prev => ({ ...prev, area: e.target.value }))}
          className="col-span-3"
          placeholder="z.B. Lager, Produktion"
        />
      </div>
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="description" className="text-right">
          Beschreibung
        </Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          className="col-span-3"
          placeholder="Zusätzliche Informationen zum Arbeitsort"
        />
      </div>
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="isActive" className="text-right">
          Aktiv
        </Label>
        <Switch
          id="isActive"
          checked={formData.isActive}
          onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
        />
      </div>
    </div>
  );

  if (isLoading) {
    return <div>Lädt Arbeitsorte...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">Arbeitsorte verwalten</h3>
          <p className="text-sm text-muted-foreground">
            Definieren Sie vordefinierte Arbeitsorte für die Genehmigungserstellung
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleCreate}>
              <Plus className="w-4 h-4 mr-2" />
              Arbeitsort hinzufügen
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Neuer Arbeitsort</DialogTitle>
              <DialogDescription>
                Erstellen Sie einen neuen Arbeitsort für die Genehmigungserstellung.
              </DialogDescription>
            </DialogHeader>
            {renderLocationFormFields()}
            <DialogFooter>
              <Button type="submit" onClick={handleSubmitCreate} disabled={createMutation.isPending}>
                {createMutation.isPending ? "Erstelle..." : "Erstellen"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Gebäude</TableHead>
              <TableHead>Bereich</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Beschreibung</TableHead>
              <TableHead className="text-right">Aktionen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(locations as WorkLocation[]).length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  <div className="flex flex-col items-center gap-2">
                    <MapPin className="w-12 h-12 text-muted-foreground" />
                    <p className="text-muted-foreground">Keine Arbeitsorte gefunden</p>
                    <p className="text-sm text-muted-foreground">
                      Fügen Sie den ersten Arbeitsort hinzu
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              (locations as WorkLocation[]).map((location: WorkLocation) => (
                <TableRow key={location.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <Building className="w-4 h-4 text-muted-foreground" />
                      {location.name}
                    </div>
                  </TableCell>
                  <TableCell>{location.building || "-"}</TableCell>
                  <TableCell>{location.area || "-"}</TableCell>
                  <TableCell>
                    <Badge variant={location.isActive ? "default" : "secondary"}>
                      {location.isActive ? "Aktiv" : "Inaktiv"}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-xs truncate">
                    {location.description || "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(location)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(location)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Arbeitsort bearbeiten</DialogTitle>
            <DialogDescription>
              Bearbeiten Sie die Details des Arbeitsorts.
            </DialogDescription>
          </DialogHeader>
          {renderLocationFormFields()}
          <DialogFooter>
            <Button type="submit" onClick={handleSubmitEdit} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Aktualisiere..." : "Speichern"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}