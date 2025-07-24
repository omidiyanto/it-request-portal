import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Clock, CalendarClock, User, Briefcase, Phone, MapPin, Info } from "lucide-react";
import { queryClient } from "@/lib/queryClient";
import CompletionModal from "@/components/completion-modal";
import type { TicketWithDetails } from "@shared/schema";

interface TicketDetailModalProps {
  ticket: TicketWithDetails;
  isOpen: boolean;
  onClose: () => void;
}

export default function TicketDetailModal({ ticket, isOpen, onClose }: TicketDetailModalProps) {
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [internalOpen, setInternalOpen] = useState(isOpen);
  const [extractedData, setExtractedData] = useState({
    deviceType: "",
    issueDescription: ""
  });

  // Sync internal state with prop
  useEffect(() => {
    setInternalOpen(isOpen);
  }, [isOpen]);

  // Extract PIC (Person In Charge) from ticket data
  const getPersonInCharge = () => {
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
      return "Assigned Agent";
    }
    
    return null;
  };

  // Extract data from HTML content
  useEffect(() => {
    if (ticket.issueDescription && typeof ticket.issueDescription === 'string') {
      // Extract device type
      const deviceTypeMatch = ticket.issueDescription.match(/<strong>DEVICE TYPE<\/strong>:\s*([^<]+)/i) || 
                            ticket.issueDescription.match(/DEVICE TYPE:\s*([^\n]+)/i);
      
      const deviceType = deviceTypeMatch && deviceTypeMatch[1] ? deviceTypeMatch[1].trim() : "-";
      
      // Extract issue description
      const issueDescMatch = ticket.issueDescription.match(/<strong>ISSUE DESCRIPTION<\/strong>:\s*([^<]+)/i) || 
                           ticket.issueDescription.match(/ISSUE DESCRIPTION:\s*([^\n]+)/i) ||
                           ticket.issueDescription.match(/<p><strong>ISSUE DESCRIPTION<\/strong>:(.*?)<\/p>/i);
      
      let issueDescription = "";
      if (issueDescMatch && issueDescMatch[1]) {
        issueDescription = issueDescMatch[1].trim();
      } else {
        // If no specific issue description found, use the full description
        // but strip HTML tags
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = ticket.issueDescription;
        issueDescription = tempDiv.textContent || tempDiv.innerText || ticket.issueDescription;
      }
      
      setExtractedData({
        deviceType,
        issueDescription
      });
    }
  }, [ticket]);

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

  // Check if a ticket can be marked as complete (only if status is "resolved")
  const canMarkComplete = ticket.status.toLowerCase() === "resolved";

  const updateTicketStatusMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/tickets/${ticket.ticketId}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: "closed" }),
      });
      
      if (!response.ok) {
        throw new Error("Failed to update ticket status");
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tickets"] });
      onClose();
    },
  });

  const handleCompleteTicket = () => {
    setShowCompletionModal(false);
    setInternalOpen(false);
    updateTicketStatusMutation.mutate();
    onClose();
  };

  return (
    <Dialog open={internalOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto p-0">
        {/* Ticket Header with Status Badge */}
        <div className="bg-gradient-to-r from-primary/10 to-primary/5 p-6 border-b border-border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-primary font-mono text-sm">{ticket.ticketId}</span>
            <Badge className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(ticket.status)}`}>
              {getStatusLabel(ticket.status)}
            </Badge>
          </div>
          <h2 className="text-xl font-semibold text-foreground">{ticket.title}</h2>
          <div className="flex items-center mt-2 text-sm text-muted-foreground">
            <User className="w-3.5 h-3.5 mr-1.5" />
            <span>{ticket.user.name}</span>
          </div>
          
          {/* Timestamps */}
          <div className="grid grid-cols-2 gap-2 mt-4 text-xs text-muted-foreground">
            <div className="flex items-center">
              <Clock className="w-3.5 h-3.5 mr-1.5" />
              <span>Created: {formatDate(ticket.createdAt)}</span>
            </div>
            <div className="flex items-center">
              <CalendarClock className="w-3.5 h-3.5 mr-1.5" />
              <span>Updated: {formatDate(ticket.updatedAt)}</span>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Ticket Details Cards */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-muted/30 rounded-lg p-4 flex flex-col">
              <div className="flex items-center text-sm font-medium text-muted-foreground mb-2">
                <Briefcase className="w-4 h-4 mr-2" />
                <span>Department</span>
              </div>
              <span className="text-foreground">{ticket.department.name}</span>
            </div>
            
            <div className="bg-muted/30 rounded-lg p-4 flex flex-col">
              <div className="flex items-center text-sm font-medium text-muted-foreground mb-2">
                <Info className="w-4 h-4 mr-2" />
                <span>Device Type</span>
              </div>
              <span className="text-foreground">{extractedData.deviceType}</span>
            </div>
            
            <div className="bg-muted/30 rounded-lg p-4 flex flex-col">
              <div className="flex items-center text-sm font-medium text-muted-foreground mb-2">
                <Phone className="w-4 h-4 mr-2" />
                <span>Extension</span>
              </div>
              <span className="text-foreground">{ticket.extension || "-"}</span>
            </div>
            
            <div className="bg-muted/30 rounded-lg p-4 flex flex-col">
              <div className="flex items-center text-sm font-medium text-muted-foreground mb-2">
                <MapPin className="w-4 h-4 mr-2" />
                <span>Rack Location</span>
              </div>
              <span className="text-foreground">{ticket.rackLocation}</span>
            </div>
            
            {/* Show PIC if available */}
            {getPersonInCharge() && (
              <div className="bg-muted/30 rounded-lg p-4 flex flex-col col-span-2">
                <div className="flex items-center text-sm font-medium text-muted-foreground mb-2">
                  <User className="w-4 h-4 mr-2" />
                  <span>Person In Charge (PIC)</span>
                </div>
                <span className="text-foreground">{getPersonInCharge()}</span>
              </div>
            )}
          </div>

          {/* Issue Description with proper text wrapping */}
          <div className="bg-muted/50 rounded-lg p-5 border border-border/50">
            <h4 className="text-sm font-medium text-muted-foreground mb-3 flex items-center">
              <Info className="w-4 h-4 mr-2" />
              Issue Detail
            </h4>
            <p className="text-foreground leading-relaxed whitespace-normal break-all overflow-hidden w-full">
              {extractedData.issueDescription || "No issue description provided"}
            </p>
          </div>

          {/* Mark as Complete Button - only for resolved tickets */}
          {canMarkComplete && (
            <div className="pt-4">
              <Button
                onClick={() => setShowCompletionModal(true)}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 transform hover:scale-[1.02] shadow-lg"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Mark as Complete
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
      
      {/* Completion Confirmation Modal */}
      {showCompletionModal && (
        <CompletionModal
          ticket={ticket}
          isOpen={showCompletionModal}
          onClose={() => setShowCompletionModal(false)}
          onSuccess={handleCompleteTicket}
        />
      )}
    </Dialog>
  );
}
