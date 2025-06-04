import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, Search, Download, FileText, Clock, AlertTriangle, CheckCircle } from "lucide-react";
import { NavigationHeader } from "@/components/navigation-header";
import { CreatePermitModal } from "@/components/create-permit-modal";
import { PermitTable } from "@/components/permit-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { PermitStats } from "@/lib/types";
import type { Permit } from "@shared/schema";

export default function Dashboard() {
  const [createModalOpen, setCreateModalOpen] = useState(false);

  const { data: stats, isLoading: statsLoading } = useQuery<PermitStats>({
    queryKey: ["/api/permits/stats"],
  });

  const { data: permits = [], isLoading: permitsLoading } = useQuery<Permit[]>({
    queryKey: ["/api/permits"],
  });

  const recentPermits = permits.slice(0, 10);

  return (
    <div className="min-h-screen bg-gray-50">
      <NavigationHeader />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Dashboard Header */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-industrial-gray mb-2">
            Genehmigungsverwaltung Dashboard
          </h2>
          <p className="text-secondary-gray">
            Überwachung und Verwaltung von Arbeitsgenehmigungen für enge Räume und chemische Umgebungen
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-secondary-gray">Aktive Genehmigungen</p>
                  <p className="text-3xl font-bold text-safety-blue">
                    {statsLoading ? "..." : stats?.activePermits || 0}
                  </p>
                </div>
                <div className="bg-blue-50 p-3 rounded-lg">
                  <FileText className="text-safety-blue text-xl" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-secondary-gray">Pending Approval</p>
                  <p className="text-3xl font-bold text-warning-orange">
                    {statsLoading ? "..." : stats?.pendingApproval || 0}
                  </p>
                </div>
                <div className="bg-orange-50 p-3 rounded-lg">
                  <Clock className="text-warning-orange text-xl" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-secondary-gray">Expired Today</p>
                  <p className="text-3xl font-bold text-alert-red">
                    {statsLoading ? "..." : stats?.expiredToday || 0}
                  </p>
                </div>
                <div className="bg-red-50 p-3 rounded-lg">
                  <AlertTriangle className="text-alert-red text-xl" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-secondary-gray">Completed</p>
                  <p className="text-3xl font-bold text-safety-green">
                    {statsLoading ? "..." : stats?.completed || 0}
                  </p>
                </div>
                <div className="bg-green-50 p-3 rounded-lg">
                  <CheckCircle className="text-safety-green text-xl" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <Button 
            className="bg-safety-blue text-white hover:bg-blue-700"
            onClick={() => setCreateModalOpen(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Create New Permit
          </Button>
          <Button variant="outline">
            <Search className="w-4 h-4 mr-2" />
            Search Permits
          </Button>
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </Button>
        </div>

        {/* Recent Permits Table */}
        <PermitTable permits={recentPermits} isLoading={permitsLoading} />
      </main>

      {/* Mobile Floating Action Button */}
      <Button
        className="fixed bottom-6 right-6 bg-safety-blue text-white p-4 rounded-full shadow-lg md:hidden z-40"
        size="icon"
        onClick={() => setCreateModalOpen(true)}
      >
        <Plus className="h-6 w-6" />
      </Button>

      <CreatePermitModal 
        open={createModalOpen} 
        onOpenChange={setCreateModalOpen} 
      />
    </div>
  );
}
