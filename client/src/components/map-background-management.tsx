import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { 
  Plus, 
  Trash2, 
  Edit, 
  Image as ImageIcon,
  Eye,
  EyeOff,
  Upload
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import type { MapBackground } from "@shared/schema";

export function MapBackgroundManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedBackground, setSelectedBackground] = useState<MapBackground | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    isActive: true,
    image: null as File | null
  });

  const { data: backgrounds = [], isLoading } = useQuery<MapBackground[]>({
    queryKey: ["/api/map-backgrounds"],
  });

  const createBackgroundMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const response = await fetch("/api/map-backgrounds", {
        method: "POST",
        credentials: "include",
        body: data,
      });
      if (!response.ok) throw new Error("Failed to create background");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/map-backgrounds"] });
      setCreateModalOpen(false);
      resetForm();
      toast({
        title: "Kartenhintergrund erstellt",
        description: "Der Kartenhintergrund wurde erfolgreich erstellt.",
      });
    },
    onError: () => {
      toast({
        title: "Fehler",
        description: "Kartenhintergrund konnte nicht erstellt werden.",
        variant: "destructive",
      });
    },
  });

  const updateBackgroundMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<MapBackground> }) => {
      return apiRequest(`/api/map-backgrounds/${id}`, "PATCH", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/map-backgrounds"] });
      setEditModalOpen(false);
      toast({
        title: "Kartenhintergrund aktualisiert",
        description: "Der Kartenhintergrund wurde erfolgreich aktualisiert.",
      });
    },
    onError: () => {
      toast({
        title: "Fehler",
        description: "Kartenhintergrund konnte nicht aktualisiert werden.",
        variant: "destructive",
      });
    },
  });

  const deleteBackgroundMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(`/api/map-backgrounds/${id}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/map-backgrounds"] });
      toast({
        title: "Kartenhintergrund gelöscht",
        description: "Der Kartenhintergrund wurde erfolgreich gelöscht.",
      });
    },
    onError: () => {
      toast({
        title: "Fehler",
        description: "Kartenhintergrund konnte nicht gelöscht werden.",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      isActive: true,
      image: null
    });
    setPreviewImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData(prev => ({ ...prev, image: file }));
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewImage(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = () => {
    if (!formData.name.trim()) {
      toast({
        title: "Fehler",
        description: "Name ist erforderlich.",
        variant: "destructive",
      });
      return;
    }

    if (!formData.image) {
      toast({
        title: "Fehler",
        description: "Bild ist erforderlich.",
        variant: "destructive",
      });
      return;
    }

    const formDataToSend = new FormData();
    formDataToSend.append("name", formData.name);
    formDataToSend.append("description", formData.description);
    formDataToSend.append("isActive", formData.isActive.toString());
    formDataToSend.append("image", formData.image);

    createBackgroundMutation.mutate(formDataToSend);
  };

  const handleToggleActive = (background: MapBackground) => {
    updateBackgroundMutation.mutate({
      id: background.id,
      data: { isActive: !background.isActive }
    });
  };

  const handleEdit = (background: MapBackground) => {
    setSelectedBackground(background);
    setEditModalOpen(true);
  };

  const handleDelete = (background: MapBackground) => {
    if (window.confirm(`Sind Sie sicher, dass Sie den Kartenhintergrund "${background.name}" löschen möchten?`)) {
      deleteBackgroundMutation.mutate(background.id);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="w-5 h-5" />
            Kartenhintergründe
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">Lade Kartenhintergründe...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ImageIcon className="w-5 h-5" />
          Kartenhintergründe
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              Verwalten Sie Kartenhintergründe für die Übersichtspläne verschiedener Gebäude und Bereiche.
            </p>
            <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Neuer Hintergrund
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Neuen Kartenhintergrund erstellen</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="z.B. Produktionshalle A"
                    />
                  </div>
                  <div>
                    <Label htmlFor="description">Beschreibung</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Optional: Beschreibung des Bereichs"
                      rows={3}
                    />
                  </div>
                  <div>
                    <Label htmlFor="image">Kartenbild</Label>
                    <div className="space-y-2">
                      <Input
                        id="image"
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        ref={fileInputRef}
                      />
                      {previewImage && (
                        <div className="border rounded-lg p-2">
                          <img
                            src={previewImage}
                            alt="Vorschau"
                            className="w-full h-32 object-contain rounded"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="isActive"
                      checked={formData.isActive}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
                    />
                    <Label htmlFor="isActive">Aktiv</Label>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleSubmit} disabled={createBackgroundMutation.isPending}>
                      {createBackgroundMutation.isPending ? "Erstelle..." : "Erstellen"}
                    </Button>
                    <Button variant="outline" onClick={() => setCreateModalOpen(false)}>
                      Abbrechen
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {backgrounds.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <ImageIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Noch keine Kartenhintergründe vorhanden</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {backgrounds.map((background) => (
                <Card key={background.id} className="overflow-hidden">
                  <div className="aspect-video bg-gray-100 relative">
                    <img
                      src={background.imagePath}
                      alt={background.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2 right-2 flex gap-1">
                      <Badge variant={background.isActive ? "default" : "secondary"}>
                        {background.isActive ? "Aktiv" : "Inaktiv"}
                      </Badge>
                    </div>
                  </div>
                  <CardContent className="p-4">
                    <h3 className="font-semibold text-sm mb-1">{background.name}</h3>
                    {background.description && (
                      <p className="text-xs text-muted-foreground mb-3">
                        {background.description}
                      </p>
                    )}
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleToggleActive(background)}
                        disabled={updateBackgroundMutation.isPending}
                      >
                        {background.isActive ? (
                          <EyeOff className="w-3 h-3" />
                        ) : (
                          <Eye className="w-3 h-3" />
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(background)}
                      >
                        <Edit className="w-3 h-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDelete(background)}
                        disabled={deleteBackgroundMutation.isPending}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}