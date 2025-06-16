import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { NavigationHeader } from "@/components/navigation-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Shield, AlertTriangle, Plus, Eye, Edit, Key, Upload, Save, Palette, Settings } from "lucide-react";
import type { User } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface AppSettings {
  id?: number;
  appName: string;
  logoPath: string | null;
  headerBackgroundColor: string;
  headerTextColor: string;
}

export default function UserManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [createUserModalOpen, setCreateUserModalOpen] = useState(false);
  const [userDetailsModalOpen, setUserDetailsModalOpen] = useState(false);
  const [editUserModalOpen, setEditUserModalOpen] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const [newUser, setNewUser] = useState({
    username: "",
    password: "",
    role: "employee"
  });

  const [passwordData, setPasswordData] = useState({
    newPassword: "",
    confirmPassword: ""
  });

  // App Settings state
  const [appName, setAppName] = useState("");
  const [headerBgColor, setHeaderBgColor] = useState("#ffffff");
  const [headerTextColor, setHeaderTextColor] = useState("#000000");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  // Fetch app settings
  const { data: settings } = useQuery<AppSettings>({
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

  const createUserMutation = useMutation({
    mutationFn: async (userData: { username: string; password: string; role: string }) => {
      return apiRequest("/api/users", "POST", userData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setCreateUserModalOpen(false);
      setNewUser({ username: "", password: "", role: "employee" });
      toast({
        title: "Erfolg",
        description: "Benutzer wurde erfolgreich erstellt",
      });
    },
    onError: (error) => {
      toast({
        title: "Fehler",
        description: "Benutzer konnte nicht erstellt werden",
        variant: "destructive",
      });
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({ userId, userData }: { userId: number; userData: Partial<User> }) => {
      return apiRequest(`/api/users/${userId}`, "PATCH", userData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setEditUserModalOpen(false);
      toast({
        title: "Erfolg",
        description: "Benutzer wurde erfolgreich aktualisiert",
      });
    },
    onError: (error) => {
      toast({
        title: "Fehler",
        description: "Benutzer konnte nicht aktualisiert werden",
        variant: "destructive",
      });
    },
  });

  const updatePasswordMutation = useMutation({
    mutationFn: async ({ userId, password }: { userId: number; password: string }) => {
      return apiRequest(`/api/users/${userId}/password`, "PATCH", { password });
    },
    onSuccess: () => {
      setPasswordModalOpen(false);
      setPasswordData({ newPassword: "", confirmPassword: "" });
      toast({
        title: "Erfolg",
        description: "Passwort wurde erfolgreich aktualisiert",
      });
    },
    onError: (error) => {
      toast({
        title: "Fehler",
        description: "Passwort konnte nicht aktualisiert werden",
        variant: "destructive",
      });
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: number; role: string }) => {
      return apiRequest(`/api/users/${userId}/role`, "PATCH", { role });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Erfolg",
        description: "Benutzerrolle wurde erfolgreich aktualisiert",
      });
    },
    onError: (error) => {
      toast({
        title: "Fehler",
        description: "Benutzerrolle konnte nicht aktualisiert werden",
        variant: "destructive",
      });
    },
  });

  // App Settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      return apiRequest("/api/settings", "PUT", formData);
    },
    onSuccess: () => {
      toast({
        title: "Erfolg",
        description: "App-Einstellungen wurden erfolgreich gespeichert",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
    },
    onError: (error: any) => {
      toast({
        title: "Fehler",
        description: error.message || "Fehler beim Speichern der Einstellungen",
        variant: "destructive",
      });
    },
  });

  const getRoleLabel = (role: string) => {
    const roleMap: Record<string, string> = {
      'admin': 'Administrator',
      'safety_officer': 'Sicherheitsbeauftragter',
      'department_head': 'Abteilungsleiter',
      'maintenance': 'Technik',
      'employee': 'Mitarbeiter',
    };
    return roleMap[role] || role;
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin':
        return 'default';
      case 'safety_officer':
        return 'secondary';
      case 'department_head':
        return 'outline';
      case 'maintenance':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const handleRoleChange = (userId: number, newRole: string) => {
    updateRoleMutation.mutate({ userId, role: newRole });
  };

  const handleCreateUser = () => {
    if (!newUser.username || !newUser.password) {
      toast({
        title: "Fehler",
        description: "Benutzername und Passwort sind erforderlich",
        variant: "destructive",
      });
      return;
    }
    createUserMutation.mutate(newUser);
  };

  const handleViewUser = (user: User) => {
    setSelectedUser(user);
    setUserDetailsModalOpen(true);
  };

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setEditUserModalOpen(true);
  };

  const handleChangePassword = (user: User) => {
    setSelectedUser(user);
    setPasswordModalOpen(true);
  };

  const handleUpdatePassword = () => {
    if (!selectedUser) return;
    
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
      userId: selectedUser.id,
      password: passwordData.newPassword
    });
  };

  // App Settings handlers
  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        toast({
          title: "Fehler",
          description: "Nur JPEG, PNG, GIF und WebP Dateien sind erlaubt",
          variant: "destructive",
        });
        return;
      }

      // Validate file size (5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "Fehler", 
          description: "Datei ist zu groß. Maximum 5MB erlaubt",
          variant: "destructive",
        });
        return;
      }

      setLogoFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setLogoPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveSettings = () => {
    const formData = new FormData();
    formData.append('appName', appName);
    formData.append('headerBackgroundColor', headerBgColor);
    formData.append('headerTextColor', headerTextColor);
    
    if (logoFile) {
      formData.append('logo', logoFile);
    }

    updateSettingsMutation.mutate(formData);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <NavigationHeader />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-industrial-gray">Einstellungen</h1>
          <p className="mt-2 text-secondary-gray">
            Verwalten Sie Benutzerkonten und App-Einstellungen
          </p>
        </div>

        <Tabs defaultValue="users" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Benutzerverwaltung
            </TabsTrigger>
            <TabsTrigger value="app-settings" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              App-Einstellungen
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="mt-6">

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Gesamte Benutzer</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{users.length}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Administratoren</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {users.filter(user => user.role === 'admin').length}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Sicherheitsbeauftragte</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {users.filter(user => user.role === 'safety_officer').length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Users Table */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Benutzer und Rollen</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Verwalten Sie Benutzerkonten und deren Berechtigungen
                </p>
              </div>
              <Button 
                onClick={() => setCreateUserModalOpen(true)}
                className="bg-safety-blue text-white hover:bg-blue-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Neuer Benutzer
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-4">Lade Benutzer...</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Benutzername</TableHead>
                    <TableHead>Rolle</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Aktionen</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.username}</TableCell>
                      <TableCell>
                        <Select
                          value={user.role}
                          onValueChange={(newRole) => handleRoleChange(user.id, newRole)}
                        >
                          <SelectTrigger className="w-40">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Administrator</SelectItem>
                            <SelectItem value="safety_officer">Sicherheitsbeauftragter</SelectItem>
                            <SelectItem value="department_head">Abteilungsleiter</SelectItem>
                            <SelectItem value="maintenance">Technik</SelectItem>
                            <SelectItem value="employee">Mitarbeiter</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getRoleBadgeVariant(user.role)}>
                          {getRoleLabel(user.role)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleViewUser(user)}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            Details
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEditUser(user)}
                          >
                            <Edit className="w-4 h-4 mr-1" />
                            Bearbeiten
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleChangePassword(user)}
                          >
                            <Key className="w-4 h-4 mr-1" />
                            Passwort
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Create User Modal */}
      <Dialog open={createUserModalOpen} onOpenChange={setCreateUserModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Neuen Benutzer erstellen</DialogTitle>
            <DialogDescription>
              Erstellen Sie ein neues Benutzerkonto mit Benutzername, Passwort und Rolle.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label>Benutzername *</Label>
              <Input
                value={newUser.username}
                onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                placeholder="Benutzername eingeben"
              />
            </div>
            
            <div>
              <Label>Passwort *</Label>
              <Input
                type="password"
                value={newUser.password}
                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                placeholder="Passwort eingeben"
              />
            </div>
            
            <div>
              <Label>Rolle</Label>
              <Select value={newUser.role} onValueChange={(value) => setNewUser({ ...newUser, role: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Administrator</SelectItem>
                  <SelectItem value="safety_officer">Sicherheitsbeauftragter</SelectItem>
                  <SelectItem value="department_head">Abteilungsleiter</SelectItem>
                  <SelectItem value="maintenance">Technik</SelectItem>
                  <SelectItem value="employee">Mitarbeiter</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2 pt-4">
              <Button 
                onClick={handleCreateUser}
                disabled={createUserMutation.isPending}
                className="bg-safety-blue text-white hover:bg-blue-700"
              >
                Benutzer erstellen
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setCreateUserModalOpen(false)}
              >
                Abbrechen
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* User Details Modal */}
      <Dialog open={userDetailsModalOpen} onOpenChange={setUserDetailsModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Benutzerdetails</DialogTitle>
            <DialogDescription>
              Detaillierte Informationen über den Benutzer.
            </DialogDescription>
          </DialogHeader>
          
          {selectedUser && (
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Benutzername</Label>
                <p className="text-sm text-muted-foreground">{selectedUser.username}</p>
              </div>
              
              <div>
                <Label className="text-sm font-medium">Rolle</Label>
                <p className="text-sm text-muted-foreground">{getRoleLabel(selectedUser.role)}</p>
              </div>
              
              <div>
                <Label className="text-sm font-medium">Benutzer-ID</Label>
                <p className="text-sm text-muted-foreground">{selectedUser.id}</p>
              </div>

              <div className="flex gap-2 pt-4">
                <Button 
                  variant="outline" 
                  onClick={() => setUserDetailsModalOpen(false)}
                >
                  Schließen
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit User Modal */}
      <Dialog open={editUserModalOpen} onOpenChange={setEditUserModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Benutzer bearbeiten</DialogTitle>
            <DialogDescription>
              Bearbeiten Sie die Benutzerdaten.
            </DialogDescription>
          </DialogHeader>
          
          {selectedUser && (
            <div className="space-y-4">
              <div>
                <Label>Benutzername</Label>
                <Input
                  value={selectedUser.username}
                  onChange={(e) => setSelectedUser({ ...selectedUser, username: e.target.value })}
                />
              </div>
              
              <div>
                <Label>Rolle</Label>
                <Select 
                  value={selectedUser.role} 
                  onValueChange={(value) => setSelectedUser({ ...selectedUser, role: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Administrator</SelectItem>
                    <SelectItem value="safety_officer">Sicherheitsbeauftragter</SelectItem>
                    <SelectItem value="department_head">Abteilungsleiter</SelectItem>
                    <SelectItem value="maintenance">Technik</SelectItem>
                    <SelectItem value="employee">Mitarbeiter</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2 pt-4">
                <Button 
                  onClick={() => updateUserMutation.mutate({ 
                    userId: selectedUser.id, 
                    userData: { username: selectedUser.username, role: selectedUser.role }
                  })}
                  disabled={updateUserMutation.isPending}
                  className="bg-safety-blue text-white hover:bg-blue-700"
                >
                  Speichern
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setEditUserModalOpen(false)}
                >
                  Abbrechen
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Password Change Modal */}
      <Dialog open={passwordModalOpen} onOpenChange={setPasswordModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Passwort ändern</DialogTitle>
            <DialogDescription>
              Setzen Sie ein neues Passwort für {selectedUser?.username}.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label>Neues Passwort *</Label>
              <Input
                type="password"
                value={passwordData.newPassword}
                onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                placeholder="Neues Passwort eingeben"
              />
            </div>
            
            <div>
              <Label>Passwort bestätigen *</Label>
              <Input
                type="password"
                value={passwordData.confirmPassword}
                onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                placeholder="Passwort wiederholen"
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button 
                onClick={handleUpdatePassword}
                disabled={updatePasswordMutation.isPending}
                className="bg-safety-blue text-white hover:bg-blue-700"
              >
                Passwort ändern
              </Button>
              <Button 
                variant="outline" 
                onClick={() => {
                  setPasswordModalOpen(false);
                  setPasswordData({ newPassword: "", confirmPassword: "" });
                }}
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