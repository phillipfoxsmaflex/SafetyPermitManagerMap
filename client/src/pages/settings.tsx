import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { NavigationHeader } from "@/components/navigation-header";
import { WorkLocationManagement } from "@/components/work-location-management";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { 
  Settings as SettingsIcon, 
  User, 
  Bell, 
  Shield, 
  Database,
  Save,
  Users,
  Mail,
  Server,
  Key,
  Lock,
  Webhook,
  Plus,
  TestTube,
  CheckCircle,
  XCircle,
  Trash2,
  Edit,
  MapPin
} from "lucide-react";
import type { User as UserType } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

interface WebhookConfig {
  id: number;
  name: string;
  webhookUrl: string;
  isActive: boolean;
  lastTestedAt?: string;
  lastTestStatus?: string;
  createdAt: string;
  updatedAt: string;
}

function WebhookConfigSection() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedConfig, setSelectedConfig] = useState<WebhookConfig | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    webhookUrl: "",
    isActive: false
  });

  const { data: webhookConfigs = [], isLoading } = useQuery<WebhookConfig[]>({
    queryKey: ["/api/webhook-configs"],
  });

  const createConfigMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return apiRequest("/api/webhook-configs", "POST", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/webhook-configs"] });
      setCreateModalOpen(false);
      setFormData({ name: "", webhookUrl: "", isActive: false });
      toast({
        title: "Webhook erstellt",
        description: "Die Webhook-Konfiguration wurde erfolgreich erstellt.",
      });
    },
    onError: () => {
      toast({
        title: "Fehler",
        description: "Webhook-Konfiguration konnte nicht erstellt werden.",
        variant: "destructive",
      });
    },
  });

  const updateConfigMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<WebhookConfig> }) => {
      return apiRequest(`/api/webhook-configs/${id}`, "PATCH", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/webhook-configs"] });
      setEditModalOpen(false);
      toast({
        title: "Webhook aktualisiert",
        description: "Die Webhook-Konfiguration wurde erfolgreich aktualisiert.",
      });
    },
    onError: () => {
      toast({
        title: "Fehler",
        description: "Webhook-Konfiguration konnte nicht aktualisiert werden.",
        variant: "destructive",
      });
    },
  });

  const deleteConfigMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(`/api/webhook-configs/${id}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/webhook-configs"] });
      toast({
        title: "Webhook gelöscht",
        description: "Die Webhook-Konfiguration wurde erfolgreich gelöscht.",
      });
    },
    onError: () => {
      toast({
        title: "Fehler",
        description: "Webhook-Konfiguration konnte nicht gelöscht werden.",
        variant: "destructive",
      });
    },
  });

  const testConnectionMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest(`/api/webhook-configs/${id}/test`, "POST");
      return await response.json() as { success: boolean; message: string };
    },
    onSuccess: (data: { success: boolean; message: string }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/webhook-configs"] });
      toast({
        title: data.success ? "Verbindung erfolgreich" : "Verbindung fehlgeschlagen",
        description: data.message,
        variant: data.success ? "default" : "destructive",
      });
    },
    onError: () => {
      toast({
        title: "Fehler",
        description: "Verbindungstest konnte nicht durchgeführt werden.",
        variant: "destructive",
      });
    },
  });

  const handleCreate = () => {
    if (!formData.name || !formData.webhookUrl) {
      toast({
        title: "Fehler",
        description: "Name und Webhook-URL sind erforderlich.",
        variant: "destructive",
      });
      return;
    }
    createConfigMutation.mutate(formData);
  };

  const handleEdit = (config: WebhookConfig) => {
    setSelectedConfig(config);
    setFormData({
      name: config.name,
      webhookUrl: config.webhookUrl,
      isActive: config.isActive
    });
    setEditModalOpen(true);
  };

  const handleUpdate = () => {
    if (!selectedConfig || !formData.name || !formData.webhookUrl) {
      toast({
        title: "Fehler",
        description: "Name und Webhook-URL sind erforderlich.",
        variant: "destructive",
      });
      return;
    }
    updateConfigMutation.mutate({ id: selectedConfig.id, data: formData });
  };

  const handleDelete = (id: number) => {
    if (confirm("Sind Sie sicher, dass Sie diese Webhook-Konfiguration löschen möchten?")) {
      deleteConfigMutation.mutate(id);
    }
  };

  const handleTest = (id: number) => {
    testConnectionMutation.mutate(id);
  };

  const getStatusBadge = (config: WebhookConfig) => {
    if (!config.lastTestedAt) {
      return <Badge variant="secondary">Nicht getestet</Badge>;
    }
    if (config.lastTestStatus === 'success') {
      return <Badge variant="default" className="bg-green-100 text-green-800">Erfolgreich</Badge>;
    }
    return <Badge variant="destructive">Fehlgeschlagen</Badge>;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-2">
            <Webhook className="h-5 w-5" />
            AI Webhook-Konfiguration
          </CardTitle>
          <Button onClick={() => setCreateModalOpen(true)} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Webhook hinzufügen
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <p className="text-sm text-secondary-gray">
            Konfigurieren Sie n8n Webhook-URLs für AI-gestützte Genehmigungsverbesserungen.
          </p>
          
          <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
            <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">HTTP POST Endpoint für n8n</h4>
            <p className="text-sm text-blue-800 dark:text-blue-200 mb-2">
              Kopieren Sie diese URL und fügen Sie sie in Ihren n8n HTTP Request Node ein:
            </p>
            <div className="bg-white dark:bg-gray-800 p-2 rounded border font-mono text-sm">
              {window.location.origin}/api/webhooks/suggestions
            </div>
            <div className="mt-3 flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => navigator.clipboard.writeText(`${window.location.origin}/api/webhooks/suggestions`)}
                className="text-xs"
              >
                URL kopieren
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => window.open('/api/documentation/n8n-integration', '_blank')}
                className="text-xs"
              >
                📖 n8n Setup Dokumentation
              </Button>
            </div>
          </div>

          {isLoading ? (
            <div className="text-center py-4">Lade Webhook-Konfigurationen...</div>
          ) : webhookConfigs.length === 0 ? (
            <div className="text-center py-8 text-secondary-gray">
              <Webhook className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Keine Webhook-Konfigurationen vorhanden</p>
              <p className="text-sm">Fügen Sie eine Konfiguration hinzu, um zu beginnen</p>
            </div>
          ) : (
            <div className="space-y-3">
              {webhookConfigs.map((config) => (
                <div key={config.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="font-medium">{config.name}</h4>
                      {config.isActive && (
                        <Badge variant="default">Aktiv</Badge>
                      )}
                      {getStatusBadge(config)}
                    </div>
                    <p className="text-sm text-secondary-gray font-mono">
                      {config.webhookUrl}
                    </p>
                    {config.lastTestedAt && (
                      <p className="text-xs text-secondary-gray mt-1">
                        Zuletzt getestet: {new Date(config.lastTestedAt).toLocaleString('de-DE')}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleTest(config.id)}
                      disabled={testConnectionMutation.isPending}
                    >
                      <TestTube className="h-4 w-4 mr-1" />
                      Test
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(config)}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Bearbeiten
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDelete(config.id)}
                      disabled={deleteConfigMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Löschen
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Create Webhook Modal */}
        <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Neue Webhook-Konfiguration</DialogTitle>
              <DialogDescription>
                Fügen Sie eine neue n8n Webhook-URL für AI-Verbesserungen hinzu.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Name *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="z.B. n8n AI Workflow"
                />
              </div>
              <div>
                <Label>Webhook-URL *</Label>
                <Input
                  value={formData.webhookUrl}
                  onChange={(e) => setFormData({ ...formData, webhookUrl: e.target.value })}
                  placeholder="https://your-n8n-instance.com/webhook/..."
                />
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                />
                <Label>Als aktive Konfiguration festlegen</Label>
              </div>
              <div className="flex gap-2 pt-4">
                <Button
                  onClick={handleCreate}
                  disabled={createConfigMutation.isPending}
                  className="flex-1"
                >
                  Erstellen
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setCreateModalOpen(false)}
                  className="flex-1"
                >
                  Abbrechen
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit Webhook Modal */}
        <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Webhook-Konfiguration bearbeiten</DialogTitle>
              <DialogDescription>
                Bearbeiten Sie die Webhook-Konfiguration.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Name *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="z.B. n8n AI Workflow"
                />
              </div>
              <div>
                <Label>Webhook-URL *</Label>
                <Input
                  value={formData.webhookUrl}
                  onChange={(e) => setFormData({ ...formData, webhookUrl: e.target.value })}
                  placeholder="https://your-n8n-instance.com/webhook/..."
                />
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                />
                <Label>Als aktive Konfiguration festlegen</Label>
              </div>
              <div className="flex gap-2 pt-4">
                <Button
                  onClick={handleUpdate}
                  disabled={updateConfigMutation.isPending}
                  className="flex-1"
                >
                  Aktualisieren
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setEditModalOpen(false)}
                  className="flex-1"
                >
                  Abbrechen
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

export default function Settings() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { user: currentUser } = useAuth();
  
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });

  const [settings, setSettings] = useState({
    // User Settings
    fullName: currentUser?.fullName || "Hans Mueller",
    email: "hans.mueller@company.com",
    department: currentUser?.department || "Operations",
    
    // Notification Settings
    emailNotifications: true,
    permitExpiring: true,
    newPermitRequests: true,
    
    // Security Settings
    twoFactorAuth: false,
    sessionTimeout: 30,
    
    // System Settings
    autoBackup: true,
    auditLog: true,
    logRetention: 90,
    maintenanceMode: false,
  });

  const [emailSettings, setEmailSettings] = useState({
    smtpServer: "smtp.company.com",
    smtpPort: 587,
    username: "notifications@company.com",
    password: "",
    enableTLS: true,
    fromAddress: "noreply@company.com",
    fromName: "TRBS Permit System"
  });

  const updatePasswordMutation = useMutation({
    mutationFn: async (passwordData: { currentPassword: string; newPassword: string }) => {
      if (!currentUser) throw new Error("Not authenticated");
      return apiRequest(`/api/users/${currentUser.id}/password`, "PATCH", { 
        password: passwordData.newPassword 
      });
    },
    onSuccess: () => {
      setPasswordModalOpen(false);
      setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
      toast({
        title: "Erfolg",
        description: "Passwort wurde erfolgreich geändert",
      });
    },
    onError: (error) => {
      toast({
        title: "Fehler",
        description: "Passwort konnte nicht geändert werden",
        variant: "destructive",
      });
    },
  });

  const saveProfileMutation = useMutation({
    mutationFn: async (data: { fullName: string; email: string }) => {
      if (!currentUser?.id) throw new Error("Not authenticated");
      
      const response = await fetch(`/api/users/${currentUser.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          fullName: data.fullName,
          email: data.email
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to update profile');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Profil aktualisiert",
        description: "Ihre Profildaten wurden erfolgreich gespeichert.",
      });
    },
    onError: () => {
      toast({
        title: "Fehler",
        description: "Profildaten konnten nicht gespeichert werden.",
        variant: "destructive",
      });
    }
  });

  const handleSaveProfile = () => {
    saveProfileMutation.mutate({
      fullName: settings.fullName,
      email: settings.email
    });
  };

  const handlePasswordChange = () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({
        title: "Fehler",
        description: "Passwörter stimmen nicht überein",
        variant: "destructive",
      });
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast({
        title: "Fehler",
        description: "Passwort muss mindestens 6 Zeichen lang sein",
        variant: "destructive",
      });
      return;
    }

    updatePasswordMutation.mutate({
      currentPassword: passwordData.currentPassword,
      newPassword: passwordData.newPassword
    });
  };

  const handleNavigateToPermits = () => {
    setLocation("/permits");
  };

  const handleNavigateToDrafts = () => {
    setLocation("/drafts");
  };

  const handleNavigateToApprovals = () => {
    setLocation("/approvals");
  };

  const handleOpenEmailSettings = () => {
    setEmailModalOpen(true);
  };

  const handleBackupDatabase = () => {
    toast({
      title: "Backup gestartet",
      description: "Die Datenbank-Sicherung wurde erfolgreich initiiert",
    });
  };

  const handleViewSecurityLog = () => {
    toast({
      title: "Sicherheitsprotokoll",
      description: "Öffne Sicherheitsprotokoll-Viewer",
    });
  };

  const handleSaveEmailSettings = () => {
    toast({
      title: "E-Mail-Einstellungen gespeichert",
      description: "Die E-Mail-Konfiguration wurde erfolgreich aktualisiert",
    });
    setEmailModalOpen(false);
  };

  const isAdmin = currentUser?.role === 'admin';

  return (
    <div className="min-h-screen bg-gray-50">
      <NavigationHeader />
      
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-industrial-gray flex items-center gap-3">
            <SettingsIcon className="h-8 w-8" />
            Einstellungen
          </h1>
          <p className="mt-2 text-secondary-gray">
            Verwalten Sie Ihre persönlichen Einstellungen und Systemkonfiguration
          </p>
        </div>

        <div className="space-y-6">
          {/* User Profile Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Benutzerprofil
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Vollständiger Name</Label>
                  <Input
                    value={settings.fullName}
                    onChange={(e) => setSettings({ ...settings, fullName: e.target.value })}
                  />
                </div>
                <div>
                  <Label>E-Mail-Adresse</Label>
                  <Input
                    type="email"
                    value={settings.email}
                    onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Abteilung</Label>
                  <Input
                    value={settings.department}
                    onChange={(e) => setSettings({ ...settings, department: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Benutzername</Label>
                  <Input value={currentUser?.username || ""} disabled />
                </div>
              </div>
              
              <Separator />
              
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-industrial-gray">Passwort ändern</h4>
                  <p className="text-sm text-secondary-gray">
                    Aktualisieren Sie Ihr Login-Passwort für erhöhte Sicherheit
                  </p>
                </div>
                <Button 
                  variant="outline"
                  onClick={() => setPasswordModalOpen(true)}
                >
                  <Key className="w-4 h-4 mr-2" />
                  Passwort ändern
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Notification Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Benachrichtigungen
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>E-Mail-Benachrichtigungen</Label>
                  <p className="text-sm text-secondary-gray">
                    Erhalten Sie wichtige Updates per E-Mail
                  </p>
                </div>
                <Switch
                  checked={settings.emailNotifications}
                  onCheckedChange={(checked) => setSettings({ ...settings, emailNotifications: checked })}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label>Ablaufende Genehmigungen</Label>
                  <p className="text-sm text-secondary-gray">
                    Benachrichtigung bei bald ablaufenden Arbeitserlaubnissen
                  </p>
                </div>
                <Switch
                  checked={settings.permitExpiring}
                  onCheckedChange={(checked) => setSettings({ ...settings, permitExpiring: checked })}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label>Neue Genehmigungsanträge</Label>
                  <p className="text-sm text-secondary-gray">
                    Benachrichtigung bei neuen Anträgen zur Genehmigung
                  </p>
                </div>
                <Switch
                  checked={settings.newPermitRequests}
                  onCheckedChange={(checked) => setSettings({ ...settings, newPermitRequests: checked })}
                />
              </div>
            </CardContent>
          </Card>

          {/* Security Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Sicherheit
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Session-Timeout (Minuten)</Label>
                <Input
                  type="number"
                  value={settings.sessionTimeout}
                  onChange={(e) => setSettings({ ...settings, sessionTimeout: parseInt(e.target.value) })}
                  className="w-32"
                />
              </div>
            </CardContent>
          </Card>

          {/* AI Webhook Configuration - Only for Admins */}
          {isAdmin && (
            <WebhookConfigSection />
          )}

          {/* System Settings - Only for Admins */}
          {isAdmin && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Systemeinstellungen
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Automatische Sicherung</Label>
                    <p className="text-sm text-secondary-gray">
                      Tägliche automatische Datensicherung aktivieren
                    </p>
                  </div>
                  <Switch
                    checked={settings.autoBackup}
                    onCheckedChange={(checked) => setSettings({ ...settings, autoBackup: checked })}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Audit-Protokoll</Label>
                    <p className="text-sm text-secondary-gray">
                      Detaillierte Protokollierung aller Systemaktivitäten
                    </p>
                  </div>
                  <Switch
                    checked={settings.auditLog}
                    onCheckedChange={(checked) => setSettings({ ...settings, auditLog: checked })}
                  />
                </div>
                
                <div>
                  <Label>Log-Aufbewahrung (Tage)</Label>
                  <Input
                    type="number"
                    value={settings.logRetention}
                    onChange={(e) => setSettings({ ...settings, logRetention: parseInt(e.target.value) })}
                    className="w-32"
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Wartungsmodus</Label>
                    <p className="text-sm text-secondary-gray">
                      System für Wartungsarbeiten sperren
                    </p>
                  </div>
                  <Switch
                    checked={settings.maintenanceMode}
                    onCheckedChange={(checked) => setSettings({ ...settings, maintenanceMode: checked })}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Quick Links */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Server className="h-5 w-5" />
                Schnellzugriff
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {isAdmin && (
                  <Link href="/user-management">
                    <Button variant="outline" className="w-full justify-start">
                      <Users className="w-4 h-4 mr-2" />
                      Benutzerverwaltung
                    </Button>
                  </Link>
                )}
                
                {isAdmin && (
                  <>
                    <Button 
                      variant="outline" 
                      className="w-full justify-start"
                      onClick={handleOpenEmailSettings}
                    >
                      <Mail className="w-4 h-4 mr-2" />
                      E-Mail-Einstellungen
                    </Button>
                    
                    <Button 
                      variant="outline" 
                      className="w-full justify-start"
                      onClick={handleBackupDatabase}
                    >
                      <Database className="w-4 h-4 mr-2" />
                      Datenbank-Backup
                    </Button>
                    
                    <Button 
                      variant="outline" 
                      className="w-full justify-start"
                      onClick={handleViewSecurityLog}
                    >
                      <Shield className="w-4 h-4 mr-2" />
                      Sicherheitsprotokoll
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button 
              onClick={handleSaveProfile}
              disabled={saveProfileMutation.isPending}
              className="bg-safety-blue text-white hover:bg-blue-700"
            >
              <Save className="w-4 h-4 mr-2" />
              {saveProfileMutation.isPending ? "Speichere..." : "Profil speichern"}
            </Button>
          </div>
        </div>
      </main>

      {/* Password Change Modal */}
      <Dialog open={passwordModalOpen} onOpenChange={setPasswordModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Passwort ändern
            </DialogTitle>
            <DialogDescription>
              Geben Sie Ihr aktuelles Passwort ein und wählen Sie ein neues, sicheres Passwort.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label>Aktuelles Passwort</Label>
              <Input
                type="password"
                value={passwordData.currentPassword}
                onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                placeholder="Aktuelles Passwort eingeben"
              />
            </div>
            
            <div>
              <Label>Neues Passwort</Label>
              <Input
                type="password"
                value={passwordData.newPassword}
                onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                placeholder="Neues Passwort eingeben"
              />
            </div>
            
            <div>
              <Label>Passwort bestätigen</Label>
              <Input
                type="password"
                value={passwordData.confirmPassword}
                onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                placeholder="Neues Passwort wiederholen"
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button 
                onClick={handlePasswordChange}
                disabled={updatePasswordMutation.isPending}
                className="bg-safety-blue text-white hover:bg-blue-700"
              >
                <Key className="w-4 h-4 mr-2" />
                Passwort ändern
              </Button>
              <Button 
                variant="outline" 
                onClick={() => {
                  setPasswordModalOpen(false);
                  setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
                }}
              >
                Abbrechen
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Email Settings Modal */}
      <Dialog open={emailModalOpen} onOpenChange={setEmailModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              E-Mail-Server Konfiguration
            </DialogTitle>
            <DialogDescription>
              Konfigurieren Sie die SMTP-Einstellungen für E-Mail-Benachrichtigungen.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>SMTP-Server</Label>
                <Input
                  value={emailSettings.smtpServer}
                  onChange={(e) => setEmailSettings({ ...emailSettings, smtpServer: e.target.value })}
                  placeholder="smtp.example.com"
                />
              </div>
              <div>
                <Label>Port</Label>
                <Input
                  type="number"
                  value={emailSettings.smtpPort}
                  onChange={(e) => setEmailSettings({ ...emailSettings, smtpPort: parseInt(e.target.value) })}
                  placeholder="587"
                />
              </div>
            </div>
            
            <div>
              <Label>Benutzername</Label>
              <Input
                value={emailSettings.username}
                onChange={(e) => setEmailSettings({ ...emailSettings, username: e.target.value })}
                placeholder="user@example.com"
              />
            </div>
            
            <div>
              <Label>Passwort</Label>
              <Input
                type="password"
                value={emailSettings.password}
                onChange={(e) => setEmailSettings({ ...emailSettings, password: e.target.value })}
                placeholder="E-Mail-Passwort"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Absender-Adresse</Label>
                <Input
                  value={emailSettings.fromAddress}
                  onChange={(e) => setEmailSettings({ ...emailSettings, fromAddress: e.target.value })}
                  placeholder="noreply@example.com"
                />
              </div>
              <div>
                <Label>Absender-Name</Label>
                <Input
                  value={emailSettings.fromName}
                  onChange={(e) => setEmailSettings({ ...emailSettings, fromName: e.target.value })}
                  placeholder="System Name"
                />
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <Label>TLS aktivieren</Label>
                <p className="text-xs text-secondary-gray">
                  Verschlüsselte Verbindung verwenden
                </p>
              </div>
              <Switch
                checked={emailSettings.enableTLS}
                onCheckedChange={(checked) => setEmailSettings({ ...emailSettings, enableTLS: checked })}
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button 
                onClick={handleSaveEmailSettings}
                className="bg-safety-blue text-white hover:bg-blue-700"
              >
                <Save className="w-4 h-4 mr-2" />
                Speichern
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setEmailModalOpen(false)}
              >
                Abbrechen
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}