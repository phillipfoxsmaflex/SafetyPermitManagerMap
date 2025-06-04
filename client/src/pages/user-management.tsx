import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { NavigationHeader } from "@/components/navigation-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { Users, Shield, AlertTriangle } from "lucide-react";
import type { User } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

export default function UserManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: number; role: string }) => {
      const response = await fetch(`/api/users/${userId}/role`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ role }),
      });
      
      if (!response.ok) {
        throw new Error("Fehler beim Aktualisieren der Benutzerrolle");
      }
      
      return response.json();
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
        description: error instanceof Error ? error.message : "Unbekannter Fehler",
        variant: "destructive",
      });
    },
  });

  const getRoleLabel = (role: string) => {
    const roleMap: Record<string, string> = {
      'admin': 'Administrator',
      'operations_manager': 'Betriebsleiter',
      'safety_officer': 'Sicherheitsbeauftragter',
      'supervisor': 'Vorgesetzter',
      'employee': 'Mitarbeiter',
    };
    return roleMap[role] || role;
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin':
        return 'default'; // Purple/blue
      case 'operations_manager':
        return 'destructive'; // Red
      case 'safety_officer':
        return 'secondary'; // Orange/yellow
      case 'supervisor':
        return 'outline'; // Green
      default:
        return 'secondary'; // Gray
    }
  };

  const handleRoleChange = (userId: number, newRole: string) => {
    updateRoleMutation.mutate({ userId, role: newRole });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <NavigationHeader />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Users className="w-8 h-8 text-safety-blue" />
            <div>
              <h1 className="text-2xl font-bold text-industrial-gray">
                Benutzerverwaltung
              </h1>
              <p className="text-secondary-gray">
                Verwalten Sie Benutzerrollen und Berechtigungen für das Arbeitserlaubnissystem
              </p>
            </div>
          </div>
        </div>

        {/* Role Information Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-secondary-gray">Administrator</p>
                  <p className="text-2xl font-bold text-safety-blue">
                    {users.filter(u => u.role === 'admin').length}
                  </p>
                </div>
                <Shield className="w-8 h-8 text-safety-blue" />
              </div>
              <p className="text-xs text-secondary-gray mt-2">
                Vollzugriff auf alle Funktionen
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-secondary-gray">Betriebsleiter</p>
                  <p className="text-2xl font-bold text-danger-red">
                    {users.filter(u => u.role === 'operations_manager').length}
                  </p>
                </div>
                <AlertTriangle className="w-8 h-8 text-danger-red" />
              </div>
              <p className="text-xs text-secondary-gray mt-2">
                Finale Genehmigungsberechtigung
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-secondary-gray">Sicherheitsbeauftragte</p>
                  <p className="text-2xl font-bold text-warning-orange">
                    {users.filter(u => u.role === 'safety_officer').length}
                  </p>
                </div>
                <Shield className="w-8 h-8 text-warning-orange" />
              </div>
              <p className="text-xs text-secondary-gray mt-2">
                Sicherheitsbewertung und -genehmigung
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-secondary-gray">Mitarbeiter</p>
                  <p className="text-2xl font-bold text-safety-green">
                    {users.filter(u => u.role === 'employee' || u.role === 'supervisor').length}
                  </p>
                </div>
                <Users className="w-8 h-8 text-safety-green" />
              </div>
              <p className="text-xs text-secondary-gray mt-2">
                Vorgesetzte und Standardmitarbeiter
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Users Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Benutzer und Rollen
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">
                <div className="text-secondary-gray">Benutzer werden geladen...</div>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Benutzername</TableHead>
                    <TableHead>Abteilung</TableHead>
                    <TableHead>Aktuelle Rolle</TableHead>
                    <TableHead>Rolle ändern</TableHead>
                    <TableHead>Aktionen</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">
                        {user.fullName}
                      </TableCell>
                      <TableCell>{user.username}</TableCell>
                      <TableCell>{user.department}</TableCell>
                      <TableCell>
                        <Badge variant={getRoleBadgeVariant(user.role)}>
                          {getRoleLabel(user.role)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Select 
                          defaultValue={user.role}
                          onValueChange={(newRole) => handleRoleChange(user.id, newRole)}
                          disabled={updateRoleMutation.isPending}
                        >
                          <SelectTrigger className="w-48">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="employee">Mitarbeiter</SelectItem>
                            <SelectItem value="supervisor">Vorgesetzter</SelectItem>
                            <SelectItem value="safety_officer">Sicherheitsbeauftragter</SelectItem>
                            <SelectItem value="operations_manager">Betriebsleiter</SelectItem>
                            <SelectItem value="admin">Administrator</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm">
                            Details
                          </Button>
                          <Button variant="outline" size="sm">
                            Bearbeiten
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

        {/* Role Permissions Information */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Rollenberechtigung Übersicht</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold text-industrial-gray mb-3">Genehmigungsberechtigungen</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Badge variant="default">Administrator</Badge>
                    <span className="text-secondary-gray">Alle Berechtigungen</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="destructive">Betriebsleiter</Badge>
                    <span className="text-secondary-gray">Finale Genehmigung aller Arbeitserlaubnisse</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">Sicherheitsbeauftragter</Badge>
                    <span className="text-secondary-gray">Sicherheitsbewertung und Genehmigung</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">Vorgesetzter</Badge>
                    <span className="text-secondary-gray">Erstgenehmigung von Arbeitserlaubnissen</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">Mitarbeiter</Badge>
                    <span className="text-secondary-gray">Anträge erstellen und einsehen</span>
                  </div>
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-industrial-gray mb-3">Systemfunktionen</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Badge variant="default">Administrator</Badge>
                    <span className="text-secondary-gray">Benutzerverwaltung, Systemkonfiguration</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="destructive">Betriebsleiter</Badge>
                    <span className="text-secondary-gray">Berichte, Übersichten, Statistiken</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">Sicherheitsbeauftragter</Badge>
                    <span className="text-secondary-gray">Sicherheitsberichte, Risikoanalysen</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">Vorgesetzter</Badge>
                    <span className="text-secondary-gray">Team-Übersichten, Abteilungsberichte</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">Mitarbeiter</Badge>
                    <span className="text-secondary-gray">Eigene Anträge verwalten</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}