import { useState, useEffect } from "react";
import { X, CheckCircle, Ticket } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import CompletionModal from "@/components/completion-modal";
import type { TicketWithDetails } from "@shared/schema";

interface Props {
  ticket: TicketWithDetails;
  isOpen: boolean;
  onClose: () => void;
}

export default function TicketDetailModal({ ticket, isOpen, onClose }: Props) {
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [extractedData, setExtractedData] = useState({
    extension: ticket.extension,
    rackLocation: ticket.rackLocation,
    issueDescription: ""
  });

  // Extract data from HTML description
  useEffect(() => {
    if (typeof ticket.issueDescription === 'string' && ticket.issueDescription.includes('<')) {
      // Extract issue description
      const issueDescMatch = ticket.issueDescription.match(/<strong>ISSUE DESCRIPTION<\/strong>:\s*([^<]+)/i) || 
                             ticket.issueDescription.match(/ISSUE DESCRIPTION:\s*([^<]+)/i) ||
                             ticket.issueDescription.match(/<p><strong>ISSUE DESCRIPTION<\/strong>:(.*?)<\/p>/i);
      
      if (issueDescMatch && issueDescMatch[1]) {
        setExtractedData(prev => ({
          ...prev,
          issueDescription: issueDescMatch[1].trim()
        }));
      } else {
        // If no match found, try to extract the last part of the description after RACK LOCATION
        const parts = ticket.issueDescription.split(/RACK LOCATION:.*?\n/i);
        if (parts.length > 1) {
          setExtractedData(prev => ({
            ...prev,
            issueDescription: parts[1].trim()
          }));
        }
      }
    }
  }, [ticket.issueDescription]);

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

  const canMarkComplete = ticket.status.toLowerCase() !== "resolved" && ticket.status.toLowerCase() !== "closed";

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-card backdrop-blur-sm border-border">
          <DialogHeader className="flex flex-row items-center justify-between space-y-0 pb-6 border-b border-border">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center">
                <Ticket className="text-primary text-xl" />
              </div>
              <div>
                <DialogTitle className="text-xl font-semibold text-foreground">
                  {ticket.ticketId}
                </DialogTitle>
                <p className="text-muted-foreground">{ticket.user.name}</p>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-6">
            {/* Ticket Status */}
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Status:</span>
              <Badge className={`px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(ticket.status)}`}>
                {getStatusLabel(ticket.status)}
              </Badge>
            </div>

            {/* Ticket Details Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-muted/50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-muted-foreground mb-2">Department</h4>
                <p className="text-foreground">{ticket.department.name}</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-muted-foreground mb-2">Extension</h4>
                <p className="text-foreground">{ticket.extension}</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-4 sm:col-span-2">
                <h4 className="text-sm font-medium text-muted-foreground mb-2">Rack Location</h4>
                <p className="text-foreground">{ticket.rackLocation}</p>
              </div>
            </div>

            {/* Issue Description */}
            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-muted-foreground mb-2">Issue Description</h4>
              <p className="text-foreground leading-relaxed">
                {extractedData.issueDescription || "No issue description provided"}
              </p>
            </div>

            {/* Timestamps */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Created:</span>
                <span className="text-foreground ml-2">{formatDate(ticket.createdAt)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Last Updated:</span>
                <span className="text-foreground ml-2">{formatDate(ticket.updatedAt)}</span>
              </div>
            </div>

            {/* Mark as Complete Button */}
            {canMarkComplete && (
              <div className="pt-4 border-t border-border">
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
      </Dialog>

      {/* Completion Modal */}
      <CompletionModal
        ticket={ticket}
        isOpen={showCompletionModal}
        onClose={() => setShowCompletionModal(false)}
        onSuccess={() => {
          setShowCompletionModal(false);
          onClose();
        }}
      />
    </>
  );
}
