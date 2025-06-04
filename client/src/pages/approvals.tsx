import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { 
  CheckCircle, 
  Clock, 
  FileText, 
  AlertTriangle,
  User,
  Calendar,
  MapPin,
  Building,
  Phone,
  Shield
} from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Permit } from "@shared/schema";

export default function Approvals() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("pending");

  const { data: permits = [], isLoading } = useQuery<Permit[]>({
    queryKey: ["/api/permits"],
  });

  const { data: currentUser } = useQuery<{ role: string }>({
    queryKey: ["/api/auth/user"],
  });

  const approvePermitMutation = useMutation({
    mutationFn: async ({ permitId, approvalType }: { permitId: number; approvalType: 'department_head' | 'maintenance' }) => {
      const response = await fetch(`/api/permits/${permitId}/approve`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ approvalType }),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/permits"] });
      toast({
        title: "Genehmigung erteilt",
        description: "Die Arbeitserlaubnis wurde erfolgreich genehmigt.",
      });
    },
    onError: (error) => {
      toast({
        title: "Fehler",
        description: "Die Genehmigung konnte nicht erteilt werden.",
        variant: "destructive",
      });
    },
  });

  const rejectPermitMutation = useMutation({
    mutationFn: async ({ permitId, reason }: { permitId: number; reason: string }) => {
      const response = await fetch(`/api/permits/${permitId}/reject`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ reason }),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/permits"] });
      toast({
        title: "Genehmigung abgelehnt",
        description: "Die Arbeitserlaubnis wurde abgelehnt.",
      });
    },
    onError: (error) => {
      toast({
        title: "Fehler",
        description: "Die Ablehnung konnte nicht verarbeitet werden.",
        variant: "destructive",
      });
    },
  });

  // Filter permits based on user role and approval requirements
  const getPendingPermits = () => {
    if (!currentUser) return [];
    
    return permits.filter((permit: Permit) => {
      // Department head approvals
      if (currentUser.role === 'supervisor' || currentUser.role === 'admin') {
        return permit.status === 'pending' && !permit.departmentHeadApproval;
      }
      
      // Maintenance/Engineering approvals
      if (currentUser.role === 'maintenance' || currentUser.role === 'admin') {
        return permit.status === 'pending' && !permit.maintenanceApproval;
      }
      
      return false;
    });
  };

  const getApprovedPermits = () => {
    return permits.filter((permit: Permit) => permit.status === 'approved');
  };

  const getMyApprovals = () => {
    if (!currentUser) return [];
    
    return permits.filter((permit: Permit) => {
      if (currentUser.role === 'supervisor' || currentUser.role === 'admin') {
        return permit.departmentHeadApproval;
      }
      if (currentUser.role === 'maintenance' || currentUser.role === 'admin') {
        return permit.maintenanceApproval;
      }
      return false;
    });
  };

  const handleApprove = (permit: Permit) => {
    let approvalType: 'department_head' | 'maintenance';
    
    if (currentUser?.role === 'supervisor' || currentUser?.role === 'admin') {
      approvalType = 'department_head';
    } else if (currentUser?.role === 'maintenance') {
      approvalType = 'maintenance';
    } else {
      return;
    }
    
    approvePermitMutation.mutate({ permitId: permit.id, approvalType });
  };

  const handleReject = (permit: Permit) => {
    const reason = prompt("Grund für die Ablehnung:");
    if (reason) {
      rejectPermitMutation.mutate({ permitId: permit.id, reason });
    }
  };

  const PermitCard = ({ permit }: { permit: Permit }) => (
    <Card className="mb-4">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg text-industrial-gray">{permit.permitId}</CardTitle>
            <p className="text-sm text-secondary-gray mt-1">{permit.type}</p>
          </div>
          <div className="flex gap-2">
            <Badge variant={permit.status === 'pending' ? 'destructive' : 'default'}>
              {permit.status === 'pending' ? 'Ausstehend' : 'Genehmigt'}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-secondary-gray" />
            <span>{permit.location}</span>
          </div>
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-secondary-gray" />
            <span>{permit.requestorName}</span>
          </div>
          <div className="flex items-center gap-2">
            <Building className="h-4 w-4 text-secondary-gray" />
            <span>{permit.department}</span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-secondary-gray" />
            <span>
              {format(new Date(permit.startDate), "dd.MM.yyyy", { locale: de })} - 
              {format(new Date(permit.endDate), "dd.MM.yyyy", { locale: de })}
            </span>
          </div>
        </div>

        <Separator />

        <div className="text-sm">
          <p className="font-medium text-industrial-gray mb-2">Beschreibung:</p>
          <p className="text-secondary-gray">{permit.description}</p>
        </div>

        {permit.riskLevel && (
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-warning-orange" />
            <span className="text-sm">Risikostufe: {permit.riskLevel}</span>
          </div>
        )}

        <Separator />

        <div className="space-y-2">
          <p className="font-medium text-industrial-gray text-sm">Genehmigungs-Status:</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div className={`flex items-center gap-2 p-2 rounded ${permit.departmentHeadApproval ? 'bg-green-50' : 'bg-orange-50'}`}>
              {permit.departmentHeadApproval ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <Clock className="h-4 w-4 text-orange-600" />
              )}
              <span className="text-sm">
                Abteilungsleiter: {permit.departmentHeadApproval ? 'Genehmigt' : 'Ausstehend'}
              </span>
            </div>
            <div className={`flex items-center gap-2 p-2 rounded ${permit.maintenanceApproval ? 'bg-green-50' : 'bg-orange-50'}`}>
              {permit.maintenanceApproval ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <Clock className="h-4 w-4 text-orange-600" />
              )}
              <span className="text-sm">
                Instandhaltung/Engineering: {permit.maintenanceApproval ? 'Genehmigt' : 'Ausstehend'}
              </span>
            </div>
          </div>
        </div>

        {permit.status === 'pending' && (
          <div className="flex gap-2 pt-2">
            <Button 
              onClick={() => handleApprove(permit)}
              className="bg-green-600 hover:bg-green-700 text-white"
              disabled={approvePermitMutation.isPending}
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Genehmigen
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => handleReject(permit)}
              disabled={rejectPermitMutation.isPending}
            >
              Ablehnen
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-safety-blue mx-auto"></div>
            <p className="mt-2 text-secondary-gray">Lade Genehmigungen...</p>
          </div>
        </div>
      </div>
    );
  }

  const pendingPermits = getPendingPermits();
  const approvedPermits = getApprovedPermits();
  const myApprovals = getMyApprovals();

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-industrial-gray">Genehmigungen</h1>
          <p className="text-secondary-gray mt-2">
            Verwalten Sie Arbeitserlaubnis-Genehmigungen
          </p>
        </div>
      </div>

      <Alert className="mb-6 border-blue-200 bg-blue-50">
        <Shield className="h-4 w-4 text-safety-blue" />
        <AlertDescription className="text-industrial-gray">
          <strong>Genehmigungsverfahren:</strong> Jede Arbeitserlaubnis benötigt mindestens die Genehmigung eines Abteilungsleiters und der Instandhaltung/Engineering.
        </AlertDescription>
      </Alert>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="pending" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Ausstehend ({pendingPermits.length})
          </TabsTrigger>
          <TabsTrigger value="approved" className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            Genehmigt ({approvedPermits.length})
          </TabsTrigger>
          <TabsTrigger value="my-approvals" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Meine Genehmigungen ({myApprovals.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          <div className="space-y-4">
            {pendingPermits.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <Clock className="h-12 w-12 text-secondary-gray mx-auto mb-4" />
                  <p className="text-industrial-gray">Keine ausstehenden Genehmigungen</p>
                  <p className="text-secondary-gray text-sm">
                    Alle Arbeitserlaubnisse wurden bearbeitet oder Sie haben keine Genehmigungsrechte.
                  </p>
                </CardContent>
              </Card>
            ) : (
              pendingPermits.map((permit: Permit) => (
                <PermitCard key={permit.id} permit={permit} />
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="approved">
          <div className="space-y-4">
            {approvedPermits.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <CheckCircle className="h-12 w-12 text-secondary-gray mx-auto mb-4" />
                  <p className="text-industrial-gray">Keine genehmigten Arbeitserlaubnisse</p>
                  <p className="text-secondary-gray text-sm">
                    Es wurden noch keine Arbeitserlaubnisse vollständig genehmigt.
                  </p>
                </CardContent>
              </Card>
            ) : (
              approvedPermits.map((permit: Permit) => (
                <PermitCard key={permit.id} permit={permit} />
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="my-approvals">
          <div className="space-y-4">
            {myApprovals.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <User className="h-12 w-12 text-secondary-gray mx-auto mb-4" />
                  <p className="text-industrial-gray">Keine Genehmigungen erteilt</p>
                  <p className="text-secondary-gray text-sm">
                    Sie haben noch keine Arbeitserlaubnisse genehmigt.
                  </p>
                </CardContent>
              </Card>
            ) : (
              myApprovals.map((permit: Permit) => (
                <PermitCard key={permit.id} permit={permit} />
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}