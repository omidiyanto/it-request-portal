import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Search, Ticket as TicketIcon, Calendar as CalendarIcon, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import TicketDetailModal from "@/components/ticket-detail-modal";
import { Button } from "@/components/ui/button";
import { queryClient } from "@/lib/queryClient";
import type { TicketWithDetails } from "@shared/schema";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { cn, formatWithTimeZone, getAppTimeZone } from "@/lib/utils";

// Helper function to strip HTML tags for preview
const stripHtml = (html: string) => {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return doc.body.textContent || '';
};

// Helper function to extract fields from HTML content
const extractFieldFromHtml = (html: string, fieldName: string): string => {
  if (!html) return '';
  
  // Try to match the field pattern
  const regex = new RegExp(`<strong>${fieldName}<\\/strong>:\\s*([^<]+)`, 'i');
  const altRegex = new RegExp(`${fieldName}:\\s*([^<]+)`, 'i');
  const tagRegex = new RegExp(`<p><strong>${fieldName}<\\/strong>:(.*?)<\\/p>`, 'i');
  
  const match = html.match(regex) || html.match(altRegex) || html.match(tagRegex);
  
  if (match && match[1]) {
    return match[1].trim();
  }
  
  return '';
};
  
// Helper function to extract issue description from HTML content
const extractIssueDescription = (html: string): string => {
  return extractFieldFromHtml(html, "ISSUE DESCRIPTION") || stripHtml(html);
};

// Helper function to extract device type from HTML content
const extractDeviceType = (html: string): string => {
  return extractFieldFromHtml(html, "DEVICE TYPE") || "-";
};

export default function SearchRequest() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTicket, setSelectedTicket] = useState<TicketWithDetails | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState<Date | undefined>(undefined);
  const [sortAsc, setSortAsc] = useState(true); // true = ascending, false = descending
  const timezone = getAppTimeZone();

  // Set up query with auto-refresh every 3 seconds
  const { data: tickets, isLoading } = useQuery<TicketWithDetails[]>({
    queryKey: ["/api/tickets"],
    refetchInterval: 3000, // Refresh every 3 seconds
  });

  // Force refresh data when component mounts
  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: ["/api/tickets"] });
  }, []);

  const filteredTickets = useMemo(() => {
    if (!tickets) return [];
    let filtered = tickets.filter((ticket: TicketWithDetails) => {
      // Filter by search term
      const matchesSearchTerm = !searchTerm || 
        ticket.user.name.toLowerCase().includes(searchTerm.toLowerCase());
      // Filter by status
      const matchesStatus = !statusFilter || 
        ticket.status.toLowerCase() === statusFilter.toLowerCase();
      // Hide closed tickets in "All" view
      const hideClosedInAll = statusFilter === null ? 
        ticket.status.toLowerCase() !== "closed" : true;
      // Filter by date if date filter is active
      const ticketDate = new Date(ticket.createdAt);
      const matchesDate = !dateFilter || 
        (ticketDate.getFullYear() === dateFilter.getFullYear() &&
         ticketDate.getMonth() === dateFilter.getMonth() &&
         ticketDate.getDate() === dateFilter.getDate());
      return matchesSearchTerm && matchesStatus && hideClosedInAll && matchesDate;
    });
    // Sort tickets by creation date
    filtered = filtered.sort((a, b) => {
      const diff = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      return sortAsc ? diff : -diff;
    });
    return filtered;
  }, [tickets, searchTerm, statusFilter, dateFilter, sortAsc]);

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

  // Format date to Asia/Jakarta (UTC+7) as 'yyyy-MM-dd HH:mm:ss'
  const formatDate = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
      timeZone: 'UTC',
    };
    const parts = new Intl.DateTimeFormat('en-GB', options).formatToParts(d);
    const get = (type: string) => parts.find(p => p.type === type)?.value || '';
    return `${get('year')}-${get('month')}-${get('day')} ${get('hour')}:${get('minute')}:${get('second')}`;
  };

  // Extract PIC (Person In Charge) from ticket data
  const getPersonInCharge = (ticket: TicketWithDetails) => {
    // Check if ticket has agent_id_friendlyname field
    if (
      ticket.hasOwnProperty('agent_id_friendlyname') && 
      (ticket as any).agent_id_friendlyname
    ) {
      return (ticket as any).agent_id_friendlyname;
    }
    
    // Check if ticket has agent_name field
    if (
      ticket.hasOwnProperty('agent_name') && 
      (ticket as any).agent_name
    ) {
      return (ticket as any).agent_name;
    }
    
    // For tickets with status "assigned" or "in progress", but missing agent info
    if (
      (ticket.status.toLowerCase() === "assigned" || 
       ticket.status.toLowerCase() === "in-progress" ||
       ticket.status.toLowerCase() === "pending") && 
      !ticket.hasOwnProperty('agent_id_friendlyname')
    ) {
      console.log("Ticket is assigned but missing agent info:", ticket.ticketId);
      return "Assigned Agent";
    }
    
    return null;
  };

  // Function to clear date filter
  const clearDateFilter = () => {
    setDateFilter(undefined);
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
            <p className="text-muted-foreground">
              Search and manage existing requests 
            </p>
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
              autoComplete="off"
            />
          </div>
        </div>

        {/* Status Filter Buttons & Sort */}
        <div className="flex flex-wrap gap-2 items-center">
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
          {/* Sort Button */}
          <Button
            variant="outline"
            className="text-sm flex items-center gap-1"
            onClick={() => setSortAsc((prev) => !prev)}
            title={sortAsc ? "Sort by Newest" : "Sort by Oldest"}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              fill="none"
              viewBox="0 0 24 24"
              className="inline-block"
            >
              {sortAsc ? (
                <path stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M12 5v14m0 0l-5-5m5 5l5-5" />
              ) : (
                <path stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M12 19V5m0 0l-5 5m5-5l5 5" />
              )}
            </svg>
            {sortAsc ? "Oldest" : "Newest"}
          </Button>
          {/* Date Filter */}
          <Popover>
            <PopoverTrigger asChild>
              <Button 
                variant={dateFilter ? "default" : "outline"} 
                className="text-sm flex items-center gap-2"
              >
                <CalendarIcon className="h-4 w-4" />
                {dateFilter ? format(dateFilter, "dd MMM yyyy") : "Filter by Date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={dateFilter}
                onSelect={setDateFilter}
                initialFocus
              />
              {dateFilter && (
                <div className="flex justify-center p-2 border-t">
                  <Button variant="ghost" size="sm" onClick={clearDateFilter}>
                    Clear
                  </Button>
                </div>
              )}
            </PopoverContent>
          </Popover>
          
          {/* Clear Date Filter Button */}
          {dateFilter && (
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-9 w-9 rounded-full"
              onClick={clearDateFilter}
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Clear date filter</span>
            </Button>
          )}
        </div>

        {/* Tickets Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTickets.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <TicketIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No tickets found</h3>
              <p className="text-muted-foreground">
                {searchTerm || statusFilter || dateFilter
                  ? `No tickets match the current filters`
                  : "No tickets have been created yet"
                }
              </p>
            </div>
          ) : (
            filteredTickets.map((ticket: TicketWithDetails) => {
              // Extract device type from description
              const deviceType = typeof ticket.issueDescription === 'string' && ticket.issueDescription.includes('<') 
                ? extractDeviceType(ticket.issueDescription) 
                : "-";

              // Get PIC if available
              const personInCharge = getPersonInCharge(ticket);

              // Department name logic: if title does not contain (DEPARTMENT_NAME), show '-'
              let departmentName = ticket.department.name;
              const deptPattern = new RegExp(`\\(${departmentName}\\)`, 'i');
              if (!deptPattern.test(ticket.title)) {
                departmentName = "-";
              }

              return (
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

                    {/* Ticket title: remove department in parentheses at the end */}
                    <h4 className="font-medium text-foreground mb-3 line-clamp-1">{ticket.title.replace(/ \([^)]*\)$/, '').trim()}</h4>

                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Department:</span>
                        <span className="text-foreground">{departmentName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Device Type:</span>
                        <span className="text-foreground">{deviceType}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Extension:</span>
                        <span className="text-foreground">{ticket.extension}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Location:</span>
                        <span className="text-foreground">{ticket.rackLocation}</span>
                      </div>

                      {/* Show PIC if available */}
                      {personInCharge && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">PIC:</span>
                          <span className="text-foreground">{personInCharge}</span>
                        </div>
                      )}
                    </div>

                    <div className="mt-4 text-xs text-muted-foreground">
                      Created: {formatDate(ticket.createdAt)}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      Last Updated: {formatDate(ticket.updatedAt)}
                    </div>
                  </div>
                </div>
              );
            })
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
