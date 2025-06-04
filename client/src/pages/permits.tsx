import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, Search, Filter } from "lucide-react";
import { NavigationHeader } from "@/components/navigation-header";
import { CreatePermitModal } from "@/components/create-permit-modal";
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
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>

              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="confined_space">Confined Space</SelectItem>
                  <SelectItem value="hot_work">Hot Work</SelectItem>
                  <SelectItem value="electrical">Electrical Work</SelectItem>
                  <SelectItem value="chemical">Chemical Handling</SelectItem>
                  <SelectItem value="height">Height Work</SelectItem>
                </SelectContent>
              </Select>

              <Button 
                className="bg-safety-blue text-white hover:bg-blue-700"
                onClick={() => setCreateModalOpen(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                New Permit
              </Button>
            </div>
          </div>

          {/* Results Summary */}
          <div className="mt-4 text-sm text-secondary-gray">
            Showing {filteredPermits.length} of {permits.length} permits
            {searchQuery && ` matching "${searchQuery}"`}
            {statusFilter !== "all" && ` with status "${statusFilter}"`}
            {typeFilter !== "all" && ` of type "${typeFilter}"`}
          </div>
        </div>

        {/* Permits Table */}
        <PermitTable permits={filteredPermits} isLoading={isLoading} />
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
