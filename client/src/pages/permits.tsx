import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, Search, Filter } from "lucide-react";
import { NavigationHeader } from "@/components/navigation-header";
import { CreatePermitModal } from "@/components/create-permit-modal";
import { EditPermitModalEnhanced } from "@/components/edit-permit-modal-enhanced";
import { PermitTable } from "@/components/permit-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Permit } from "@shared/schema";

export default function Permits() {
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedPermit, setSelectedPermit] = useState<Permit | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  const { data: permits = [], isLoading } = useQuery<Permit[]>({
    queryKey: ["/api/permits"],
  });

  // Filter permits based on search query and filters
  const filteredPermits = permits.filter((permit) => {
    const matchesSearch = 
      permit.permitId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      permit.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      permit.requestorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      permit.description.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === "all" || permit.status === statusFilter;
    const matchesType = typeFilter === "all" || permit.type === typeFilter;

    return matchesSearch && matchesStatus && matchesType;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <NavigationHeader />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Page Header */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-industrial-gray mb-2">
            Arbeitsgenehmigungen
          </h2>
          <p className="text-secondary-gray">
            Anzeigen und Verwalten aller Arbeitsgenehmigungen im System
          </p>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary-gray h-4 w-4" />
                <Input
                  placeholder="Suche nach ID, Standort, Antragsteller oder Beschreibung..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="flex gap-4">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Alle Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle Status</SelectItem>
                  <SelectItem value="pending">Ausstehend</SelectItem>
                  <SelectItem value="approved">Genehmigt</SelectItem>
                  <SelectItem value="active">Aktiv</SelectItem>
                  <SelectItem value="completed">Abgeschlossen</SelectItem>
                  <SelectItem value="expired">Abgelaufen</SelectItem>
                  <SelectItem value="rejected">Abgelehnt</SelectItem>
                </SelectContent>
              </Select>

              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Alle Typen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle Typen</SelectItem>
                  <SelectItem value="confined_space">Enger Raum</SelectItem>
                  <SelectItem value="hot_work">Heißarbeiten</SelectItem>
                  <SelectItem value="electrical">Elektrische Arbeiten</SelectItem>
                  <SelectItem value="chemical">Chemische Arbeiten</SelectItem>
                  <SelectItem value="height">Höhenarbeiten</SelectItem>
                </SelectContent>
              </Select>

              <Button 
                className="bg-safety-blue text-white hover:bg-blue-700"
                onClick={() => setCreateModalOpen(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                Neue Genehmigung
              </Button>
            </div>
          </div>

          {/* Results Summary */}
          <div className="mt-4 text-sm text-secondary-gray">
            Zeige {filteredPermits.length} von {permits.length} Genehmigungen
            {searchQuery && ` mit "${searchQuery}"`}
            {statusFilter !== "all" && ` mit Status "${statusFilter}"`}
            {typeFilter !== "all" && ` vom Typ "${typeFilter}"`}
          </div>
        </div>

        {/* Permits Table */}
        <PermitTable 
          permits={filteredPermits} 
          isLoading={isLoading}
          onEdit={(permit) => {
            setSelectedPermit(permit);
            setEditModalOpen(true);
          }}
        />
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

      <EditPermitModalEnhanced
        permit={selectedPermit}
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
      />
    </div>
  );
}
