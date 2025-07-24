import { useState, useRef, useEffect } from "react";
import { Dialog, DialogPortal, DialogOverlay } from "@/components/ui/dialog";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Button } from "@/components/ui/button";
import { Printer, X } from "lucide-react";
import { cn } from "@/lib/utils";
import * as React from "react";

// Custom DialogContent without the default close button
const CustomDialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg",
        className
      )}
      {...props}
    >
      {children}
    </DialogPrimitive.Content>
  </DialogPortal>
))
CustomDialogContent.displayName = "CustomDialogContent";

interface PrintTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticketData: {
    ticketId: string;
    userName: string;
    departmentName: string;
    extension: string;
    createdAt: string;
    title: string;
    rackLocation?: string; // Added rackLocation as an optional property
  };
}

export default function PrintTicketModal({ isOpen, onClose, ticketData }: PrintTicketModalProps) {
  const [isPrinting, setIsPrinting] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  
  // Format the date to a more readable format
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric"
    }) + " " + date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    });
  };
  
  const handlePrint = () => {
    setIsPrinting(true);
    
    // Create iframe if it doesn't exist
    if (!iframeRef.current) {
      const iframe = document.createElement('iframe');
      iframe.style.position = 'absolute';
      iframe.style.top = '-9999px';
      iframe.style.left = '-9999px';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      document.body.appendChild(iframe);
      iframeRef.current = iframe;
    }
    
    // Get content from the print preview
    const content = printRef.current;
    if (!content || !iframeRef.current || !iframeRef.current.contentWindow) {
      setIsPrinting(false);
      return;
    }
    
    // Write content to iframe
    const doc = iframeRef.current.contentWindow.document;
    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Print Ticket</title>
          <style>
            @page {
              size: 3.5in 2in;
              margin: 0;
            }
            body {
              margin: 0;
              padding: 0;
              width: 3.5in;
              height: 2in;
              overflow: hidden;
            }
            .print-card {
              width: 3.5in;
              height: 2in;
              border: 1px solid black;
              padding: 0.1in;
              box-sizing: border-box;
              background-color: white;
              color: black;
              font-family: Arial, sans-serif;
            }
            .ticket-header {
              font-size: 14px;
              font-weight: bold;
              text-align: center;
              margin-bottom: 5px;
              border-bottom: 1px solid black;
              padding-bottom: 5px;
            }
            .ticket-table {
              width: 100%;
              border-collapse: collapse;
              font-size: 12px;
            }
            .ticket-table td {
              padding: 2px 4px;
            }
            .label {
              font-weight: bold;
              width: 25%;
            }
            .value {
              width: 75%;
            }
          </style>
        </head>
        <body>
          ${content.innerHTML}
        </body>
      </html>
    `);
    doc.close();
    
    // Print the iframe content
    setTimeout(() => {
      if (iframeRef.current && iframeRef.current.contentWindow) {
        iframeRef.current.contentWindow.focus();
        iframeRef.current.contentWindow.print();
        
        // Reset print state
        setTimeout(() => {
          setIsPrinting(false);
        }, 500);
      } else {
        setIsPrinting(false);
      }
    }, 500);
  };
  
  // Clean up iframe on unmount
  useEffect(() => {
    return () => {
      if (iframeRef.current && iframeRef.current.parentNode) {
        iframeRef.current.parentNode.removeChild(iframeRef.current);
      }
    };
  }, []);
  
  // Auto-focus the print button when modal opens
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        const printButton = document.getElementById('print-ticket-button');
        if (printButton) {
          printButton.focus();
        }
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <CustomDialogContent className="sm:max-w-md bg-card border-border">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Print Ticket</h2>
        </div>
        
        <div className="mb-4 p-4 bg-background border border-border rounded-md">
          <p className="text-sm text-muted-foreground mb-2">
            Preview of the ticket that will be printed:
          </p>
          
          {/* Print Preview - This div will be used for printing */}
          <div ref={printRef} className="print-preview">
            <div className="print-card bg-white text-black border border-black p-2 w-[3.5in] h-[2in] mx-auto">
              <div className="ticket-header text-center font-bold text-sm border-b border-black pb-1 mb-1">
                Ticket: {ticketData.ticketId}
              </div>
              <table className="ticket-table w-full text-xs">
                <tbody>
                  <tr>
                    <td className="label font-bold w-1/4 py-0.5">Owner:</td>
                    <td className="value w-3/4 py-0.5">{ticketData.userName}</td>
                  </tr>
                  <tr>
                    <td className="label font-bold w-1/4 py-0.5">Department:</td>
                    <td className="value w-3/4 py-0.5">{ticketData.departmentName}</td>
                  </tr>
                  <tr>
                    <td className="label font-bold w-1/4 py-0.5">Ext:</td>
                    <td className="value w-3/4 py-0.5">{ticketData.extension}</td>
                  </tr>
                  <tr>
                    <td className="label font-bold w-1/4 py-0.5">Rack:</td>
                    <td className="value w-3/4 py-0.5">{ticketData.rackLocation || "-"}</td>
                  </tr>
                  <tr>
                    <td className="label font-bold w-1/4 py-0.5">Date In:</td>
                    <td className="value w-3/4 py-0.5">{formatDate(ticketData.createdAt)}</td>
                  </tr>
                  <tr>
                    <td className="label font-bold w-1/4 py-0.5">Issue:</td>
                    <td className="value w-3/4 py-0.5">{ticketData.title}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
        
        <div className="flex justify-end space-x-2">
          <Button
            variant="outline"
            onClick={onClose}
          >
            Close
          </Button>
          <Button
            id="print-ticket-button"
            onClick={handlePrint}
            disabled={isPrinting}
            className="bg-primary hover:bg-primary/90"
          >
            {isPrinting ? (
              <>
                <div className="w-4 h-4 mr-2 border-2 border-current border-t-transparent rounded-full animate-spin" />
                Printing...
              </>
            ) : (
              <>
                <Printer className="w-4 h-4 mr-2" />
                Print Ticket
              </>
            )}
          </Button>
        </div>
      </CustomDialogContent>
    </Dialog>
  );
} 