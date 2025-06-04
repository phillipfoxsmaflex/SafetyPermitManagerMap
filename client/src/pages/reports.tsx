import { useQuery } from "@tanstack/react-query";
import { NavigationHeader } from "@/components/navigation-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, FileText, BarChart3, TrendingUp } from "lucide-react";
import type { Permit } from "@shared/schema";

export default function Reports() {
  const { data: permits = [], isLoading } = useQuery<Permit[]>({
    queryKey: ["/api/permits"],
  });

  const generateReport = (type: string) => {
    console.log(`Generating ${type} report...`);
    // Report generation logic would go here
  };

  const getReportStats = () => {
    const totalPermits = permits.length;
    const activePermits = permits.filter(p => p.status === 'active').length;
    const completedThisMonth = permits.filter(p => {
      const created = new Date(p.createdAt || '');
      const thisMonth = new Date();
      return created.getMonth() === thisMonth.getMonth() && 
             created.getFullYear() === thisMonth.getFullYear() &&
             p.status === 'completed';
    }).length;

    return { totalPermits, activePermits, completedThisMonth };
  };

  const stats = getReportStats();

  return (
    <div className="min-h-screen bg-gray-50">
      <NavigationHeader />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-industrial-gray mb-2">
            Berichte
          </h2>
          <p className="text-secondary-gray">
            Erstellen und exportieren Sie Berichte über Arbeitserlaubnisse
          </p>
        </div>

        {/* Report Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-secondary-gray">Gesamte Genehmigungen</p>
                  <p className="text-3xl font-bold text-safety-blue">{stats.totalPermits}</p>
                </div>
                <FileText className="text-safety-blue text-xl" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-secondary-gray">Aktive Genehmigungen</p>
                  <p className="text-3xl font-bold text-safety-green">{stats.activePermits}</p>
                </div>
                <TrendingUp className="text-safety-green text-xl" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-secondary-gray">Abgeschlossen (Monat)</p>
                  <p className="text-3xl font-bold text-warning-orange">{stats.completedThisMonth}</p>
                </div>
                <BarChart3 className="text-warning-orange text-xl" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Report Types */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-industrial-gray">Monatsbericht</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-secondary-gray mb-4">
                Vollständiger Überblick über alle Genehmigungen des aktuellen Monats
              </p>
              <Button 
                onClick={() => generateReport('monthly')}
                className="w-full bg-safety-blue text-white hover:bg-blue-700"
              >
                <Download className="w-4 h-4 mr-2" />
                Monatsbericht herunterladen
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-industrial-gray">Sicherheitsbericht</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-secondary-gray mb-4">
                Analyse der Sicherheitsvorfälle und Compliance-Status
              </p>
              <Button 
                onClick={() => generateReport('safety')}
                className="w-full bg-safety-blue text-white hover:bg-blue-700"
              >
                <Download className="w-4 h-4 mr-2" />
                Sicherheitsbericht herunterladen
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-industrial-gray">Abteilungsbericht</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-secondary-gray mb-4">
                Aufschlüsselung der Genehmigungen nach Abteilungen
              </p>
              <Button 
                onClick={() => generateReport('department')}
                className="w-full bg-safety-blue text-white hover:bg-blue-700"
              >
                <Download className="w-4 h-4 mr-2" />
                Abteilungsbericht herunterladen
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-industrial-gray">Compliance-Bericht</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-secondary-gray mb-4">
                Überprüfung der Einhaltung von Sicherheitsstandards
              </p>
              <Button 
                onClick={() => generateReport('compliance')}
                className="w-full bg-safety-blue text-white hover:bg-blue-700"
              >
                <Download className="w-4 h-4 mr-2" />
                Compliance-Bericht herunterladen
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}