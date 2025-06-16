import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Settings as SettingsIcon, Upload, Save, Palette } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface AppSettings {
  id?: number;
  appName: string;
  logoPath: string | null;
  headerBackgroundColor: string;
  headerTextColor: string;
}

export default function Settings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [appName, setAppName] = useState("");
  const [headerBgColor, setHeaderBgColor] = useState("#ffffff");
  const [headerTextColor, setHeaderTextColor] = useState("#000000");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  // Fetch current settings
  const { data: settings, isLoading } = useQuery({
    queryKey: ["/api/settings"]
  });

  // Update state when settings are loaded
  useEffect(() => {
    if (settings) {
      setAppName(settings.appName || "Arbeitserlaubnis");
      setHeaderBgColor(settings.headerBackgroundColor || "#ffffff");
      setHeaderTextColor(settings.headerTextColor || "#000000");
      if (settings.logoPath) {
        setLogoPreview(settings.logoPath);
      }
    }
  }, [settings]);

  // Update settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: async (updates: Partial<AppSettings>) => {
      const response = await fetch("/api/settings", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(updates),
        credentials: 'include'
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Settings update failed");
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Einstellungen gespeichert",
        description: "Die App-Einstellungen wurden erfolgreich aktualisiert."
      });
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
    },
    onError: (error: any) => {
      toast({
        title: "Fehler",
        description: error.message || "Einstellungen konnten nicht gespeichert werden.",
        variant: "destructive"
      });
    }
  });

  // Logo upload mutation
  const uploadLogoMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('logo', file);
      
      const response = await fetch("/api/settings/logo", {
        method: "POST",
        body: formData,
        credentials: 'include'
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Logo-Upload fehlgeschlagen");
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      setLogoPreview(data.logoPath);
      toast({
        title: "Logo hochgeladen",
        description: "Das neue Logo wurde erfolgreich gespeichert."
      });
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
    },
    onError: (error: any) => {
      toast({
        title: "Upload-Fehler",
        description: error.message || "Logo konnte nicht hochgeladen werden.",
        variant: "destructive"
      });
    }
  });

  const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        toast({
          title: "Ungültiger Dateityp",
          description: "Nur Bilddateien (JPEG, PNG, GIF, WebP) sind erlaubt.",
          variant: "destructive"
        });
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "Datei zu groß",
          description: "Das Logo darf maximal 5MB groß sein.",
          variant: "destructive"
        });
        return;
      }

      setLogoFile(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setLogoPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUploadLogo = () => {
    if (logoFile) {
      uploadLogoMutation.mutate(logoFile);
    }
  };

  const handleSaveSettings = () => {
    updateSettingsMutation.mutate({
      appName,
      headerBackgroundColor: headerBgColor,
      headerTextColor: headerTextColor
    });
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Einstellungen werden geladen...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <SettingsIcon className="h-6 w-6" />
        <h1 className="text-2xl font-bold">App-Einstellungen</h1>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Logo Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Logo & Branding
            </CardTitle>
            <CardDescription>
              Passen Sie das Logo und die Bezeichnung im Header an
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="appName">App-Name</Label>
              <Input
                id="appName"
                value={appName}
                onChange={(e) => setAppName(e.target.value)}
                placeholder="z.B. Ihr Firmenname - Arbeitserlaubnis"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="logo">Logo hochladen</Label>
              <Input
                id="logo"
                type="file"
                accept="image/*"
                onChange={handleLogoFileChange}
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Empfohlene Größe: 200x50px, max. 5MB (JPEG, PNG, GIF, WebP)
              </p>
            </div>

            {logoPreview && (
              <div>
                <Label>Vorschau</Label>
                <div className="mt-1 p-4 border rounded-lg bg-gray-50">
                  <img 
                    src={logoPreview} 
                    alt="Logo Vorschau" 
                    className="max-h-12 w-auto"
                  />
                </div>
              </div>
            )}

            {logoFile && (
              <Button 
                onClick={handleUploadLogo} 
                disabled={uploadLogoMutation.isPending}
                className="w-full"
              >
                <Upload className="h-4 w-4 mr-2" />
                {uploadLogoMutation.isPending ? "Wird hochgeladen..." : "Logo hochladen"}
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Color Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Farben & Design
            </CardTitle>
            <CardDescription>
              Passen Sie die Farben des Headers an
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="headerBgColor">Header-Hintergrundfarbe</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  id="headerBgColor"
                  type="color"
                  value={headerBgColor}
                  onChange={(e) => setHeaderBgColor(e.target.value)}
                  className="w-20 h-10 p-1 border rounded"
                />
                <Input
                  value={headerBgColor}
                  onChange={(e) => setHeaderBgColor(e.target.value)}
                  placeholder="#ffffff"
                  className="flex-1"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="headerTextColor">Header-Textfarbe</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  id="headerTextColor"
                  type="color"
                  value={headerTextColor}
                  onChange={(e) => setHeaderTextColor(e.target.value)}
                  className="w-20 h-10 p-1 border rounded"
                />
                <Input
                  value={headerTextColor}
                  onChange={(e) => setHeaderTextColor(e.target.value)}
                  placeholder="#000000"
                  className="flex-1"
                />
              </div>
            </div>

            {/* Preview */}
            <div>
              <Label>Vorschau Header</Label>
              <div 
                className="mt-1 p-4 rounded-lg border flex items-center gap-3"
                style={{ 
                  backgroundColor: headerBgColor,
                  color: headerTextColor 
                }}
              >
                {logoPreview && (
                  <img 
                    src={logoPreview} 
                    alt="Logo" 
                    className="h-8 w-auto"
                  />
                )}
                <span className="font-semibold text-lg">
                  {appName || "Arbeitserlaubnis"}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button 
          onClick={handleSaveSettings}
          disabled={updateSettingsMutation.isPending}
          size="lg"
        >
          <Save className="h-4 w-4 mr-2" />
          {updateSettingsMutation.isPending ? "Wird gespeichert..." : "Einstellungen speichern"}
        </Button>
      </div>
    </div>
  );
}