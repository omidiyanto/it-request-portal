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
  
  // Format date to Asia/Jakarta (UTC+7) as 'yyyy-MM-dd HH:mm:ss'
  const formatDate = (date: string) => {
    const d = new Date(date);
    // Convert to Asia/Jakarta timezone
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
    // Format: 2025-07-30 11:50:47
    const parts = new Intl.DateTimeFormat('en-GB', options).formatToParts(d);
    const get = (type: string) => parts.find(p => p.type === type)?.value || '';
    return `${get('year')}-${get('month')}-${get('day')} ${get('hour')}:${get('minute')}:${get('second')}`;
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
    
    // Direct HTML for thermal printer - streamlined for 58mm width
    const ticketContent = `
      <div style="width: 48mm; font-family: Arial, sans-serif; background-color: white; padding: 0; margin: 0; font-weight: bold;">
        <div style="font-size: 12px; font-weight: bold; text-align: center; border-bottom: 1px solid black; padding-bottom: 1mm; margin-bottom: 1mm;">
          Ticket: ${ticketData.ticketId}
        </div>
        <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
          <tr>
            <td style="font-weight: bold; width: 30%; padding: 0.5mm 0; vertical-align: top;">Owner:</td>
            <td style="width: 70%; padding: 0.5mm 0; font-weight: bold; vertical-align: top;">${ticketData.userName}</td>
          </tr>
          <tr>
            <td style="font-weight: bold; width: 30%; padding: 0.5mm 0; vertical-align: top;">Dept:</td>
            <td style="width: 70%; padding: 0.5mm 0; font-weight: bold; vertical-align: top;">${ticketData.departmentName}</td>
          </tr>
          <tr>
            <td style="font-weight: bold; width: 30%; padding: 0.5mm 0; vertical-align: top;">Ext:</td>
            <td style="width: 70%; padding: 0.5mm 0; font-weight: bold; vertical-align: top;">${ticketData.extension}</td>
          </tr>
          <tr>
            <td style="font-weight: bold; width: 30%; padding: 0.5mm 0; vertical-align: top;">Rack:</td>
            <td style="width: 70%; padding: 0.5mm 0; font-weight: bold; vertical-align: top;">${ticketData.rackLocation || "-"}</td>
          </tr>
          <tr>
            <td style="font-weight: bold; width: 25%; padding: 0.5mm 0; vertical-align: top;">Date In:</td>
            <td style="width: 75%; padding: 0.5mm 0; font-weight: bold; vertical-align: top; white-space: nowrap;">${formatDate(ticketData.createdAt)}</td>
          </tr>
          <tr>
            <td style="font-weight: bold; width: 30%; padding: 0.5mm 0; vertical-align: top;">Issue:</td>
            <td style="width: 70%; padding: 0.5mm 0; font-weight: bold; vertical-align: top;">${ticketData.title}</td>
          </tr>
        </table>
      </div>
    `;
    
    // Write content to iframe for thermal printer
    const doc = iframeRef.current.contentWindow.document;
    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Print Ticket</title>
          <style>
            /* Thermal printer specific settings for iWare MP58II */
            @page {
              /* Use default Gprinter size, but force no margins */
              size: 58mm auto !important;
              margin: 0 !important;
            }
            
            html, body {
              width: 48mm !important; /* Printing area width */
              margin: 0 !important;
              padding: 0 !important;
              -webkit-print-color-adjust: exact !important;
              color-adjust: exact !important;
              print-color-adjust: exact !important;
              font-family: Arial, sans-serif !important;
              font-weight: bold !important;
              font-size: 11px !important;
            }
            
            * {
              font-family: Arial, sans-serif !important;
              font-weight: bold !important;
            }
            
            table {
              font-size: 11px !important;
            }
            
            td {
              vertical-align: top !important;
            }
            
            .ticket-header {
              font-size: 12px !important;
            }
          </style>
        </head>
        <body>
          ${ticketContent}
        </body>
      </html>
    `);
    doc.close();
    
    // Use a flag to prevent multiple prints
    let hasPrinted = false;
    
    setTimeout(() => {
      if (iframeRef.current && iframeRef.current.contentWindow && !hasPrinted) {
        hasPrinted = true;
        
        try {
          // Final attempt to force correct paper handling for thermal printer
          const style = doc.createElement('style');
          style.textContent = `
            @media print {
              /* For iWare MP58II thermal printer */
              @page { 
                size: 58mm auto !important; 
                margin: 0 !important; 
              }
            }
          `;
          doc.head.appendChild(style);
          
          // Print once
          iframeRef.current.contentWindow.focus();
          iframeRef.current.contentWindow.print();
        } catch (e) {
          console.error("Print error:", e);
        }
        
        // Reset state
        setTimeout(() => {
          setIsPrinting(false);
        }, 500);
      } else {
        setIsPrinting(false);
      }
    }, 300);
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
            <div className="print-card bg-white text-black border-[1px] border-black p-2 w-[58mm] mx-auto" style={{fontFamily: 'Arial, sans-serif', fontWeight: 'bold'}}>
              <div className="ticket-header text-center font-bold text-[12px] border-b border-black pb-1 mb-1">
                Ticket: {ticketData.ticketId}
              </div>
              <table className="ticket-table w-full text-[11px]">
                <tbody>
                  <tr>
                    <td className="label font-bold align-top">Owner:</td>
                    <td className="value font-bold align-top">{ticketData.userName}</td>
                  </tr>
                  <tr>
                    <td className="label font-bold align-top">Dept:</td>
                    <td className="value font-bold align-top">{ticketData.departmentName}</td>
                  </tr>
                  <tr>
                    <td className="label font-bold align-top">Ext:</td>
                    <td className="value font-bold align-top">{ticketData.extension}</td>
                  </tr>
                  <tr>
                    <td className="label font-bold align-top">Rack:</td>
                    <td className="value font-bold align-top">{ticketData.rackLocation || "-"}</td>
                  </tr>
                  <tr>
                    <td className="label font-bold align-top" style={{width: "25%"}}>Date In:</td>
                    <td className="value font-bold align-top" style={{whiteSpace: "nowrap"}}>{formatDate(ticketData.createdAt)}</td>
                  </tr>
                  <tr>
                    <td className="label font-bold align-top">Issue:</td>
                    <td className="value font-bold align-top">{ticketData.title}</td>
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