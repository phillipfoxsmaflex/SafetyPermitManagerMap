import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
  Download, 
  Trash2, 
  FileText,
  AlertCircle,
  Paperclip
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface PermitAttachment {
  id: number;
  permitId: number;
  fileName: string;
  originalName: string;
  fileType: string;
  mimeType: string;
  fileSize: number;
  filePath: string;
  uploadedBy: number;
  description?: string;
  createdAt: string;
}

interface PermitAttachmentsProps {
  permitId: number;
  readonly?: boolean;
}

export function PermitAttachments({ permitId, readonly = false }: PermitAttachmentsProps) {
  const [uploading, setUploading] = useState(false);
  const [description, setDescription] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  console.log('PermitAttachments rendered with permitId:', permitId);

  // Fetch attachments for this permit
  const { data: attachments = [], isLoading } = useQuery<PermitAttachment[]>({
    queryKey: ["/api/permits", permitId, "attachments"],
    enabled: !!permitId,
  });

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      console.log(`Starting upload for permit ${permitId}`);
      
      try {
        const response = await fetch(`/api/permits/${permitId}/attachments`, {
          method: 'POST',
          body: formData,
        });
        
        console.log(`Upload response status: ${response.status}`);
        
        if (!response.ok) {
          const error = await response.json();
          console.error('Upload failed:', error);
          throw new Error(error.message || 'Upload failed');
        }
        
        const result = await response.json();
        console.log('Upload successful:', result);
        return result;
      } catch (error) {
        console.error('Upload error:', error);
        throw error;
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/permits", permitId, "attachments"] });
      setDescription("");
      console.log('File uploaded successfully:', data);
      toast({
        title: "Erfolg",
        description: "Datei erfolgreich hochgeladen",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Fehler",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (attachmentId: number) => {
      const response = await fetch(`/api/attachments/${attachmentId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete attachment');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/permits", permitId, "attachments"] });
      toast({
        title: "Erfolg",
        description: "Datei erfolgreich gelöscht",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Fehler",
        description: "Fehler beim Löschen der Datei",
        variant: "destructive",
      });
    },
  });

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const file = files[0];
    
    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "Fehler",
        description: "Datei ist zu groß. Maximum 10MB erlaubt.",
        variant: "destructive",
      });
      return;
    }

    console.log(`Uploading file for permit ${permitId}:`, file.name, file.type, file.size);

    const formData = new FormData();
    formData.append('file', file);
    if (description) {
      formData.append('description', description);
    }

    setUploading(true);
    try {
      await uploadMutation.mutateAsync(formData);
      console.log(`File uploaded successfully for permit ${permitId}`);
    } catch (error) {
      console.error(`Failed to upload file for permit ${permitId}:`, error);
    } finally {
      setUploading(false);
    }
  };

  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    handleFileUpload(event.target.files);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleCameraCapture = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      console.log('Camera captured file:', files[0].name, files[0].type);
      await handleFileUpload(files);
    }
    if (cameraInputRef.current) {
      cameraInputRef.current.value = '';
    }
  };

  const handleDownload = (attachment: PermitAttachment) => {
    const link = document.createElement('a');
    link.href = `/api/attachments/${attachment.id}/download`;
    link.download = attachment.originalName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDelete = (attachmentId: number) => {
    if (confirm('Sind Sie sicher, dass Sie diese Datei löschen möchten?')) {
      deleteMutation.mutate(attachmentId);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (fileType: string, mimeType: string) => {
    if (fileType === 'image') {
      return <Image className="h-4 w-4" />;
    } else if (mimeType === 'application/pdf') {
      return <FileText className="h-4 w-4" />;
    } else {
      return <File className="h-4 w-4" />;
    }
  };

  const getFileTypeBadge = (fileType: string) => {
    const variants: Record<string, any> = {
      image: "default",
      document: "secondary",
      other: "outline"
    };
    
    const labels: Record<string, string> = {
      image: "Bild",
      document: "Dokument",
      other: "Datei"
    };

    return (
      <Badge variant={variants[fileType] || "outline"}>
        {labels[fileType] || "Unbekannt"}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Paperclip className="h-5 w-5" />
            Anhänge
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">Lädt Anhänge...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Paperclip className="h-5 w-5" />
          Anhänge ({attachments.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Upload Section */}
        {!readonly && (
          <div className="space-y-4 p-4 border rounded-lg bg-gray-50">
            <div className="grid gap-4">
              <div>
                <Label htmlFor="description">Beschreibung (optional)</Label>
                <Textarea
                  id="description"
                  placeholder="Beschreibung der Datei..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                />
              </div>
              
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="flex items-center gap-2"
                >
                  <Upload className="h-4 w-4" />
                  Datei hochladen
                </Button>
                
                <Button
                  variant="outline"
                  onClick={() => {
                    console.log('Camera button clicked');
                    cameraInputRef.current?.click();
                  }}
                  disabled={uploading}
                  className="flex items-center gap-2"
                >
                  <Camera className="h-4 w-4" />
                  Foto aufnehmen
                </Button>
              </div>
              
              {uploading && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Datei wird hochgeladen...
                  </AlertDescription>
                </Alert>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileInputChange}
              accept=".jpg,.jpeg,.png,.gif,.pdf,.doc,.docx,.txt,.xls,.xlsx"
              style={{ display: 'none' }}
            />
            
            <input
              ref={cameraInputRef}
              type="file"
              onChange={handleCameraCapture}
              accept="image/*"
              capture="environment"
              style={{ display: 'none' }}
            />
          </div>
        )}

        {/* Attachments List */}
        {attachments.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Paperclip className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Keine Anhänge vorhanden</p>
            {!readonly && (
              <p className="text-sm mt-2">
                Fügen Sie Dokumente oder Bilder zu dieser Genehmigung hinzu
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {attachments.map((attachment) => (
              <div
                key={attachment.id}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
              >
                <div className="flex items-center gap-3 flex-1">
                  {getFileIcon(attachment.fileType, attachment.mimeType)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium truncate">
                        {attachment.originalName}
                      </span>
                      {getFileTypeBadge(attachment.fileType)}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {formatFileSize(attachment.fileSize)} • {new Date(attachment.createdAt).toLocaleDateString('de-DE')}
                    </div>
                    {attachment.description && (
                      <div className="text-sm text-muted-foreground mt-1">
                        {attachment.description}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownload(attachment)}
                    className="flex items-center gap-1"
                  >
                    <Download className="h-3 w-3" />
                    Download
                  </Button>
                  
                  {!readonly && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(attachment.id)}
                      className="flex items-center gap-1 text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-3 w-3" />
                      Löschen
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}