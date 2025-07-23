import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Ticket as TicketIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import TicketDetailModal from "@/components/ticket-detail-modal";
import { Button } from "@/components/ui/button";
import type { TicketWithDetails } from "@shared/schema";

// Helper function to strip HTML tags for preview
const stripHtml = (html: string) => {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return doc.body.textContent || '';
};

// Helper function to extract issue description from HTML content
const extractIssueDescription = (html: string): string => {
  if (!html) return '';
  
  // Try to match the issue description pattern
  const issueDescMatch = html.match(/<strong>ISSUE DESCRIPTION<\/strong>:\s*([^<]+)/i) || 
                         html.match(/ISSUE DESCRIPTION:\s*([^<]+)/i) ||
                         html.match(/<p><strong>ISSUE DESCRIPTION<\/strong>:(.*?)<\/p>/i);
  
  if (issueDescMatch && issueDescMatch[1]) {
    return issueDescMatch[1].trim();
  }
  
  // If no match found, try to extract the last part of the description after RACK LOCATION
  const parts = html.split(/RACK LOCATION:.*?\n/i);
  if (parts.length > 1) {
    return parts[1].trim();
  }
  
  // If all else fails, just return the stripped HTML
  return stripHtml(html);
};

export default function SearchRequest() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTicket, setSelectedTicket] = useState<TicketWithDetails | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  const { data: tickets, isLoading } = useQuery<TicketWithDetails[]>({
    queryKey: ["/api/tickets"],
  });

  const filteredTickets = useMemo(() => {
    if (!tickets) return [];
    
    return tickets.filter((ticket: TicketWithDetails) => {
      // Filter by search term
      const matchesSearchTerm = !searchTerm || 
        ticket.user.name.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Filter by status
      const matchesStatus = !statusFilter || 
        ticket.status.toLowerCase() === statusFilter.toLowerCase();
      
      return matchesSearchTerm && matchesStatus;
    });
  }, [tickets, searchTerm, statusFilter]);

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "new":
        return "bg-gray-500/20 text-gray-400"; // Gray
      case "assigned":
        return "bg-yellow-500/20 text-yellow-400"; // Yellow
      case "pending":
        return "bg-red-500/20 text-red-400"; // Red
      case "resolved":
        return "bg-green-500/20 text-green-400"; // Green
      case "closed":
        return "bg-blue-500/20 text-blue-400"; // Blue
      default:
        return "bg-gray-500/20 text-gray-400"; // Default to gray
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status.toLowerCase()) {
      case "new":
        return "Open";
      case "assigned":
        return "In Progress";
      case "pending":
        return "Pending";
      case "resolved":
        return "Done";
      case "closed":
        return "Closed";
      default:
        return status.charAt(0).toUpperCase() + status.slice(1);
    }
  };

  const formatDate = (date: Date | string) => {
    const d = new Date(date);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-5 w-64" />
          </div>
          <Skeleton className="h-12 w-full max-w-md" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-64 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Search Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Request List</h2>
            <p className="text-muted-foreground">Search and manage existing requests</p>
          </div>
          
          {/* Search Bar */}
          <div className="relative max-w-md w-full">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-muted border-border"
              placeholder="Search by user name..."
            />
          </div>
        </div>

        {/* Status Filter Buttons */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant={statusFilter === null ? "default" : "outline"}
            onClick={() => setStatusFilter(null)}
            className="text-sm"
          >
            All
          </Button>
          <Button
            variant={statusFilter === "new" ? "default" : "outline"}
            onClick={() => setStatusFilter("new")}
            className="text-sm"
          >
            Open
          </Button>
          <Button
            variant={statusFilter === "assigned" ? "default" : "outline"}
            onClick={() => setStatusFilter("assigned")}
            className="text-sm"
          >
            In Progress
          </Button>
          <Button
            variant={statusFilter === "pending" ? "default" : "outline"}
            onClick={() => setStatusFilter("pending")}
            className="text-sm"
          >
            Pending
          </Button>
          <Button
            variant={statusFilter === "resolved" ? "default" : "outline"}
            onClick={() => setStatusFilter("resolved")}
            className="text-sm"
          >
            Done
          </Button>
          <Button
            variant={statusFilter === "closed" ? "default" : "outline"}
            onClick={() => setStatusFilter("closed")}
            className="text-sm"
          >
            Closed
          </Button>
        </div>

        {/* Tickets Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTickets.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <TicketIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No tickets found</h3>
              <p className="text-muted-foreground">
                {searchTerm || statusFilter
                  ? `No tickets match the current filters`
                  : "No tickets have been created yet"
                }
              </p>
            </div>
          ) : (
            filteredTickets.map((ticket: TicketWithDetails) => (
              <div
                key={ticket.id}
                className="ticket-card"
                onClick={() => setSelectedTicket(ticket)}
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center">
                        <TicketIcon className="text-primary w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">{ticket.ticketId}</h3>
                        <p className="text-sm text-muted-foreground">{ticket.user.name}</p>
                      </div>
                    </div>
                    <Badge className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(ticket.status)}`}>
                      {getStatusLabel(ticket.status)}
                    </Badge>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Department:</span>
                      <span className="text-foreground">{ticket.department.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Extension:</span>
                      <span className="text-foreground">{ticket.extension}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Location:</span>
                      <span className="text-foreground">{ticket.rackLocation}</span>
                    </div>
                  </div>
                  
                  <div className="mt-4 pt-4 border-t border-border">
                    <p className="text-sm text-foreground line-clamp-2">
                      {typeof ticket.issueDescription === 'string' && ticket.issueDescription.includes('<') 
                        ? extractIssueDescription(ticket.issueDescription) 
                        : ticket.issueDescription}
                    </p>
                  </div>
                  
                  <div className="mt-4 text-xs text-muted-foreground">
                    Created: {formatDate(ticket.createdAt)}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    Last Updated: {formatDate(ticket.updatedAt)}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Ticket Detail Modal */}
      {selectedTicket && (
        <TicketDetailModal
          ticket={selectedTicket}
          isOpen={!!selectedTicket}
          onClose={() => setSelectedTicket(null)}
        />
      )}
    </>
  );
}
