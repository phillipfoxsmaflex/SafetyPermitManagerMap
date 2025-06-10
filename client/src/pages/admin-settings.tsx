import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Upload, Trash2, Image, AlertCircle, CheckCircle2, ArrowLeft, Database } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Link } from "wouter";

interface CompanyLogoConfig {
  logoUrl: string | null;
  logoName?: string;
  logoSize?: number;
  updatedAt?: string;
  updatedBy?: string;
}

export default function AdminSettings() {
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch current company logo
  const { data: logoConfig, isLoading: logoLoading } = useQuery<CompanyLogoConfig>({
    queryKey: ["/api/admin/company-logo"],
  });

  // Upload logo mutation
  const uploadLogoMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('logo', file);
      
      const response = await fetch('/api/admin/company-logo', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Upload failed');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Erfolg",
        description: "Firmenlogo wurde erfolgreich hochgeladen",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/company-logo"] });
      setLogoFile(null);
      setPreviewUrl(null);
      setUploading(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Fehler",
        description: error.message || "Fehler beim Hochladen des Logos",
        variant: "destructive",
      });
      setUploading(false);
    },
  });

  // Delete logo mutation
  const deleteLogoMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/admin/company-logo', {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Delete failed');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Erfolg",
        description: "Firmenlogo wurde erfolgreich entfernt",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/company-logo"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Fehler",
        description: error.message || "Fehler beim Entfernen des Logos",
        variant: "destructive",
      });
    },
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Ungültiger Dateityp",
        description: "Nur PNG, JPEG, JPG und GIF Dateien sind erlaubt",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      toast({
        title: "Datei zu groß",
        description: "Die Datei darf maximal 5MB groß sein",
        variant: "destructive",
      });
      return;
    }

    setLogoFile(file);
    
    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleUpload = async () => {
    if (!logoFile) return;
    
    setUploading(true);
    uploadLogoMutation.mutate(logoFile);
  };

  const handleDelete = () => {
    if (window.confirm('Sind Sie sicher, dass Sie das Firmenlogo entfernen möchten?')) {
      deleteLogoMutation.mutate();
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('de-DE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/settings">
            <Button variant="outline" size="sm" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Zurück zu Einstellungen
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Administrator-Einstellungen</h1>
            <p className="text-gray-600 mt-2">
              Verwalten Sie die System-Konfiguration und Firmeneinstellungen
            </p>
          </div>
        </div>

        <Separator />

        {/* Database Connection Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Datenbankverbindung für n8n
            </CardTitle>
            <CardDescription>
              Verwenden Sie diese Verbindungsdaten um n8n mit der Permit-Datenbank zu verbinden.
              Diese Informationen benötigen Sie für die AI-Workflow-Konfiguration.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium">Host</Label>
                <div className="mt-1 p-3 bg-gray-50 border rounded-md font-mono text-sm">
                  {process.env.PGHOST || 'localhost'}
                </div>
              </div>
              <div>
                <Label className="text-sm font-medium">Port</Label>
                <div className="mt-1 p-3 bg-gray-50 border rounded-md font-mono text-sm">
                  {process.env.PGPORT || '5432'}
                </div>
              </div>
              <div>
                <Label className="text-sm font-medium">Datenbank</Label>
                <div className="mt-1 p-3 bg-gray-50 border rounded-md font-mono text-sm">
                  {process.env.PGDATABASE || 'permits'}
                </div>
              </div>
              <div>
                <Label className="text-sm font-medium">Benutzer</Label>
                <div className="mt-1 p-3 bg-gray-50 border rounded-md font-mono text-sm">
                  {process.env.PGUSER || 'postgres'}
                </div>
              </div>
              <div className="md:col-span-2">
                <Label className="text-sm font-medium">Passwort</Label>
                <div className="mt-1 p-3 bg-gray-50 border rounded-md font-mono text-sm">
                  {process.env.PGPASSWORD ? '••••••••••••' : 'Nicht konfiguriert'}
                </div>
              </div>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="text-sm font-medium text-blue-900 mb-2">n8n Workflow-Integration</h4>
              <p className="text-sm text-blue-700 mb-3">
                1. Importieren Sie den bereitgestellten n8n-Workflow (n8n-ai-permit-workflow.json)
              </p>
              <p className="text-sm text-blue-700 mb-3">
                2. Konfigurieren Sie die PostgreSQL-Verbindung in n8n mit den obigen Daten
              </p>
              <p className="text-sm text-blue-700 mb-3">
                3. Fügen Sie Ihren OpenAI API-Schlüssel in den GPT-4 Node hinzu
              </p>
              <p className="text-sm text-blue-700">
                4. Die KI schreibt verbesserte Genehmigungsdaten direkt in die permits_staging Tabelle
              </p>
            </div>
          </CardContent>
        </Card>

        <Separator />

        {/* Company Logo Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Image className="h-5 w-5" />
              Firmenlogo
            </CardTitle>
            <CardDescription>
              Laden Sie Ihr Firmenlogo hoch, das auf allen gedruckten Genehmigungen angezeigt wird.
              Unterstützte Formate: PNG, JPEG, JPG, GIF (max. 5MB)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Current Logo Display */}
            {logoConfig?.logoUrl && (
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">Aktuelles Logo</Label>
                  <div className="mt-2 p-4 border border-gray-200 rounded-lg bg-gray-50">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-4">
                        <img 
                          src={logoConfig.logoUrl} 
                          alt="Firmenlogo" 
                          className="h-16 w-auto max-w-[200px] object-contain border border-gray-300 rounded"
                        />
                        <div className="space-y-1">
                          {logoConfig.logoName && (
                            <p className="text-sm font-medium">{logoConfig.logoName}</p>
                          )}
                          {logoConfig.logoSize && (
                            <p className="text-xs text-gray-500">
                              {formatFileSize(logoConfig.logoSize)}
                            </p>
                          )}
                          {logoConfig.updatedAt && (
                            <p className="text-xs text-gray-500">
                              Hochgeladen: {formatDate(logoConfig.updatedAt)}
                              {logoConfig.updatedBy && ` von ${logoConfig.updatedBy}`}
                            </p>
                          )}
                        </div>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={handleDelete}
                        disabled={deleteLogoMutation.isPending}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Entfernen
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Upload New Logo */}
            <div className="space-y-4">
              <Label className="text-sm font-medium">
                {logoConfig?.logoUrl ? 'Logo ersetzen' : 'Logo hochladen'}
              </Label>
              
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                <div className="text-center space-y-4">
                  {previewUrl ? (
                    <div className="space-y-4">
                      <img 
                        src={previewUrl} 
                        alt="Vorschau" 
                        className="h-20 w-auto max-w-[250px] object-contain mx-auto border border-gray-300 rounded"
                      />
                      <div className="space-y-2">
                        <p className="text-sm font-medium">{logoFile?.name}</p>
                        <p className="text-xs text-gray-500">
                          {logoFile && formatFileSize(logoFile.size)}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Upload className="h-12 w-12 text-gray-400 mx-auto" />
                      <div>
                        <p className="text-sm font-medium">Klicken Sie hier oder ziehen Sie eine Datei</p>
                        <p className="text-xs text-gray-500">PNG, JPG, GIF bis zu 5MB</p>
                      </div>
                    </div>
                  )}
                  
                  <Input
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/gif"
                    onChange={handleFileSelect}
                    className="max-w-xs mx-auto"
                  />
                </div>
              </div>

              {logoFile && (
                <div className="flex space-x-2">
                  <Button 
                    onClick={handleUpload}
                    disabled={uploading || uploadLogoMutation.isPending}
                    className="flex-1"
                  >
                    {uploading ? 'Wird hochgeladen...' : 'Logo hochladen'}
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setLogoFile(null);
                      setPreviewUrl(null);
                    }}
                    disabled={uploading}
                  >
                    Abbrechen
                  </Button>
                </div>
              )}
            </div>

            {/* Info Alert */}
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Das Logo wird automatisch in der linken oberen Ecke aller gedruckten Arbeitserlaubnisse angezeigt.
                Für beste Ergebnisse verwenden Sie ein Logo mit transparentem Hintergrund.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        {/* Print Layout Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5" />
              Druck-Layout
            </CardTitle>
            <CardDescription>
              Informationen über das neue einheitliche Druck-Layout
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>
                  <strong>Neues einheitliches DIN A4 Layout implementiert:</strong>
                  <ul className="mt-2 space-y-1 text-sm">
                    <li>• Alle Druckfunktionen verwenden jetzt dasselbe professionelle Layout</li>
                    <li>• Firmenlogo wird automatisch eingebunden</li>
                    <li>• Vollständige Anzeige aller Genehmigungsinformationen</li>
                    <li>• Optimiert für DIN A4 Druck</li>
                    <li>• Anhänge werden mit Dateigrößen aufgelistet</li>
                    <li>• "Allgemeine Maßnahmen" statt "Sofortmaßnahmen"</li>
                  </ul>
                </AlertDescription>
              </Alert>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}