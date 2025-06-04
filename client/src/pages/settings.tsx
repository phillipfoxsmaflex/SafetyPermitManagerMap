import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { NavigationHeader } from "@/components/navigation-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { 
  Settings as SettingsIcon, 
  User, 
  Bell, 
  Shield, 
  Database,
  Save,
  Users,
  Mail,
  Server
} from "lucide-react";
import type { User as UserType } from "@shared/schema";

export default function Settings() {
  const { toast } = useToast();
  const [settings, setSettings] = useState({
    // User Settings
    fullName: "Hans Mueller",
    email: "hans.mueller@company.com",
    department: "Operations",
    
    // Notification Settings
    emailNotifications: true,
    smsNotifications: false,
    permitExpiring: true,
    newPermitRequests: true,
    
    // Security Settings
    twoFactorAuth: false,
    sessionTimeout: 30,
    
    // System Settings
    autoBackup: true,
    auditLog: true,
    dataRetention: 365
  });

  const handleSave = () => {
    // Save settings logic would go here
    toast({
      title: "Einstellungen gespeichert",
      description: "Ihre Einstellungen wurden erfolgreich aktualisiert.",
    });
  };

  const updateSetting = (key: string, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <NavigationHeader />
      
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-industrial-gray mb-2">
            Einstellungen
          </h2>
          <p className="text-secondary-gray">
            Verwalten Sie Ihre Konto- und Systemeinstellungen
          </p>
        </div>

        <div className="space-y-6">
          {/* User Profile Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-industrial-gray">
                <User className="h-5 w-5" />
                Benutzerprofil
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="fullName">Vollständiger Name</Label>
                  <Input
                    id="fullName"
                    value={settings.fullName}
                    onChange={(e) => updateSetting('fullName', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="email">E-Mail-Adresse</Label>
                  <Input
                    id="email"
                    type="email"
                    value={settings.email}
                    onChange={(e) => updateSetting('email', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="department">Abteilung</Label>
                  <Input
                    id="department"
                    value={settings.department}
                    onChange={(e) => updateSetting('department', e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notification Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-industrial-gray">
                <Bell className="h-5 w-5" />
                Benachrichtigungen
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="emailNotifications">E-Mail-Benachrichtigungen</Label>
                  <p className="text-sm text-secondary-gray">Erhalten Sie Updates per E-Mail</p>
                </div>
                <Switch
                  id="emailNotifications"
                  checked={settings.emailNotifications}
                  onCheckedChange={(checked) => updateSetting('emailNotifications', checked)}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="smsNotifications">SMS-Benachrichtigungen</Label>
                  <p className="text-sm text-secondary-gray">Erhalten Sie dringende Updates per SMS</p>
                </div>
                <Switch
                  id="smsNotifications"
                  checked={settings.smsNotifications}
                  onCheckedChange={(checked) => updateSetting('smsNotifications', checked)}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="permitExpiring">Ablaufende Genehmigungen</Label>
                  <p className="text-sm text-secondary-gray">Benachrichtigung vor Ablauf der Genehmigung</p>
                </div>
                <Switch
                  id="permitExpiring"
                  checked={settings.permitExpiring}
                  onCheckedChange={(checked) => updateSetting('permitExpiring', checked)}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="newPermitRequests">Neue Genehmigungsanträge</Label>
                  <p className="text-sm text-secondary-gray">Benachrichtigung bei neuen Anträgen</p>
                </div>
                <Switch
                  id="newPermitRequests"
                  checked={settings.newPermitRequests}
                  onCheckedChange={(checked) => updateSetting('newPermitRequests', checked)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Security Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-industrial-gray">
                <Shield className="h-5 w-5" />
                Sicherheit
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="twoFactorAuth">Zwei-Faktor-Authentifizierung</Label>
                  <p className="text-sm text-secondary-gray">Zusätzliche Sicherheitsebene für Ihr Konto</p>
                </div>
                <Switch
                  id="twoFactorAuth"
                  checked={settings.twoFactorAuth}
                  onCheckedChange={(checked) => updateSetting('twoFactorAuth', checked)}
                />
              </div>
              <Separator />
              <div>
                <Label htmlFor="sessionTimeout">Sitzungs-Timeout (Minuten)</Label>
                <Input
                  id="sessionTimeout"
                  type="number"
                  value={settings.sessionTimeout}
                  onChange={(e) => updateSetting('sessionTimeout', parseInt(e.target.value))}
                  className="w-32 mt-2"
                />
              </div>
            </CardContent>
          </Card>

          {/* System Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-industrial-gray">
                <Database className="h-5 w-5" />
                System
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="autoBackup">Automatische Sicherung</Label>
                  <p className="text-sm text-secondary-gray">Tägliche Datensicherung aktivieren</p>
                </div>
                <Switch
                  id="autoBackup"
                  checked={settings.autoBackup}
                  onCheckedChange={(checked) => updateSetting('autoBackup', checked)}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="auditLog">Audit-Protokoll</Label>
                  <p className="text-sm text-secondary-gray">Alle Benutzeraktivitäten protokollieren</p>
                </div>
                <Switch
                  id="auditLog"
                  checked={settings.auditLog}
                  onCheckedChange={(checked) => updateSetting('auditLog', checked)}
                />
              </div>
              <Separator />
              <div>
                <Label htmlFor="dataRetention">Datenaufbewahrung (Tage)</Label>
                <Input
                  id="dataRetention"
                  type="number"
                  value={settings.dataRetention}
                  onChange={(e) => updateSetting('dataRetention', parseInt(e.target.value))}
                  className="w-32 mt-2"
                />
              </div>
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button 
              onClick={handleSave}
              className="bg-safety-blue text-white hover:bg-blue-700"
            >
              <Save className="w-4 h-4 mr-2" />
              Einstellungen speichern
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}