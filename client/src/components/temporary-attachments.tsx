import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Upload, 
  Camera, 
  File, 
  Image, 
  Trash2, 
  FileText,
  AlertCircle,
  Paperclip
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface TemporaryAttachment {
  id: string;
  file: File;
  description: string;
  preview?: string;
}

interface TemporaryAttachmentsProps {
  attachments: TemporaryAttachment[];
  onAttachmentsChange: (attachments: TemporaryAttachment[]) => void;
  readonly?: boolean;
}

export function TemporaryAttachments({ attachments, onAttachmentsChange, readonly = false }: TemporaryAttachmentsProps) {
  const [uploading, setUploading] = useState(false);
  const [description, setDescription] = useState("");
  const [triggerFileSelect, setTriggerFileSelect] = useState(false);
  const [triggerCameraSelect, setTriggerCameraSelect] = useState(false);
  const { toast } = useToast();

  const handleFileUpload = async (files: FileList | null, isCamera = false) => {
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      const newAttachments: TemporaryAttachment[] = [];
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Validate file size (10MB limit)
        if (file.size > 10 * 1024 * 1024) {
          toast({
            title: "Datei zu groß",
            description: `${file.name} ist größer als 10MB`,
            variant: "destructive",
          });
          continue;
        }

        // Create preview for images
        let preview: string | undefined;
        if (file.type.startsWith('image/')) {
          preview = URL.createObjectURL(file);
        }

        const tempAttachment: TemporaryAttachment = {
          id: `temp_${Date.now()}_${i}`,
          file,
          description: description || "",
          preview
        };

        newAttachments.push(tempAttachment);
      }

      onAttachmentsChange([...attachments, ...newAttachments]);
      setDescription("");
      
      toast({
        title: "Datei(en) hinzugefügt",
        description: `${newAttachments.length} Datei(en) zur Upload-Warteschlange hinzugefügt`,
      });
    } catch (error) {
      console.error("Fehler beim Hinzufügen der Datei:", error);
      toast({
        title: "Fehler",
        description: "Fehler beim Hinzufügen der Datei",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const removeAttachment = (id: string) => {
    const attachment = attachments.find(a => a.id === id);
    if (attachment?.preview) {
      URL.revokeObjectURL(attachment.preview);
    }
    onAttachmentsChange(attachments.filter(a => a.id !== id));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return <Image className="h-4 w-4" />;
    if (mimeType.includes('pdf')) return <FileText className="h-4 w-4" />;
    return <File className="h-4 w-4" />;
  };

  console.log("TemporaryAttachments rendered with attachments:", attachments.length);

  return (
    <div className="space-y-4">
      {!readonly && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Paperclip className="h-5 w-5" />
              Dateien hinzufügen
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="description">Beschreibung (optional)</Label>
              <Textarea
                id="description"
                placeholder="Beschreibung für die Datei(en)..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
              />
            </div>
            
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setTriggerFileSelect(!triggerFileSelect)}
                disabled={uploading}
                className="flex items-center gap-2"
              >
                <Upload className="h-4 w-4" />
                Datei auswählen
              </Button>
              
              <Button
                type="button"
                variant="outline"
                onClick={() => setTriggerCameraSelect(!triggerCameraSelect)}
                disabled={uploading}
                className="flex items-center gap-2"
              >
                <Camera className="h-4 w-4" />
                Foto aufnehmen
              </Button>
            </div>

            <input
              type="file"
              multiple
              accept="image/*,application/pdf,.doc,.docx,.txt"
              style={{ display: 'none' }}
              ref={(input) => {
                if (input && triggerFileSelect) {
                  input.click();
                  setTriggerFileSelect(false);
                }
              }}
              onChange={(e) => handleFileUpload(e.target.files)}
            />
            
            <input
              type="file"
              accept="image/*"
              capture="environment"
              style={{ display: 'none' }}
              ref={(input) => {
                if (input && triggerCameraSelect) {
                  input.click();
                  setTriggerCameraSelect(false);
                }
              }}
              onChange={(e) => handleFileUpload(e.target.files, true)}
            />

            {uploading && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Dateien werden zur Warteschlange hinzugefügt...
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {attachments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Paperclip className="h-5 w-5" />
              Anhänge ({attachments.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {attachments.map((attachment) => (
                <div key={attachment.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3 flex-1">
                    {getFileIcon(attachment.file.type)}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{attachment.file.name}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>{formatFileSize(attachment.file.size)}</span>
                        <Badge variant="secondary">{attachment.file.type}</Badge>
                      </div>
                      {attachment.description && (
                        <p className="text-sm text-muted-foreground mt-1">{attachment.description}</p>
                      )}
                    </div>
                    {attachment.preview && (
                      <img 
                        src={attachment.preview} 
                        alt="Vorschau" 
                        className="w-12 h-12 object-cover rounded border"
                      />
                    )}
                  </div>
                  {!readonly && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeAttachment(attachment.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {attachments.length === 0 && readonly && (
        <Card>
          <CardContent className="text-center py-8">
            <Paperclip className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">Keine Anhänge vorhanden</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}