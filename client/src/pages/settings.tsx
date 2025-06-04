import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { NavigationHeader } from "@/components/navigation-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
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
  Lock
} from "lucide-react";
import type { User as UserType } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

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

  const handleSaveSettings = () => {
    toast({
      title: "Einstellungen gespeichert",
      description: "Ihre Einstellungen wurden erfolgreich aktualisiert.",
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
              <div className="flex items-center justify-between">
                <div>
                  <Label>Zwei-Faktor-Authentifizierung</Label>
                  <p className="text-sm text-secondary-gray">
                    Zusätzliche Sicherheitsebene für Ihr Konto
                  </p>
                </div>
                <Switch
                  checked={settings.twoFactorAuth}
                  onCheckedChange={(checked) => setSettings({ ...settings, twoFactorAuth: checked })}
                />
              </div>
              
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
                
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={handleOpenEmailSettings}
                >
                  <Mail className="w-4 h-4 mr-2" />
                  E-Mail-Einstellungen
                </Button>
                
                {isAdmin && (
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    onClick={handleBackupDatabase}
                  >
                    <Database className="w-4 h-4 mr-2" />
                    Datenbank-Backup
                  </Button>
                )}
                
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={handleViewSecurityLog}
                >
                  <Shield className="w-4 h-4 mr-2" />
                  Sicherheitsprotokoll
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button 
              onClick={handleSaveSettings}
              className="bg-safety-blue text-white hover:bg-blue-700"
            >
              <Save className="w-4 h-4 mr-2" />
              Einstellungen speichern
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