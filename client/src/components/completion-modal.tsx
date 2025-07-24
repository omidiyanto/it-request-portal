import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CheckCircle, ShieldCheck, XCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import Captcha from "@/components/ui/captcha";
import type { TicketWithDetails } from "@shared/schema";

const completionSchema = z.object({
  captchaAnswer: z.string().min(1, "Please solve the captcha"),
  confirmed: z.boolean().refine(val => val === true, "Please confirm that the ticket has been resolved"),
});

type CompletionData = z.infer<typeof completionSchema>;

interface Props {
  ticket: TicketWithDetails;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CompletionModal({ ticket, isOpen, onClose, onSuccess }: Props) {
  const { toast } = useToast();
  const [captcha, setCaptcha] = useState({ question: "", answer: "" });
  const [captchaError, setCaptchaError] = useState<string | null>(null);
  const [internalOpen, setInternalOpen] = useState(isOpen);

  // Sync internal state with prop
  useEffect(() => {
    setInternalOpen(isOpen);
  }, [isOpen]);

  const form = useForm<CompletionData>({
    resolver: zodResolver(completionSchema),
    defaultValues: {
      captchaAnswer: "",
      confirmed: false,
    },
  });

  const generateCaptcha = () => {
    const num1 = Math.floor(Math.random() * 10) + 1;
    const num2 = Math.floor(Math.random() * 10) + 1;
    setCaptcha({
      question: `${num1} + ${num2} = ?`,
      answer: (num1 + num2).toString(),
    });
    setCaptchaError(null);
  };

  useEffect(() => {
    if (isOpen) {
      generateCaptcha();
      form.reset();
      setCaptchaError(null);
    }
  }, [isOpen, form]);

  const completeMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("PATCH", `/api/tickets/${ticket.ticketId}/status`, {
        status: "closed",
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tickets"] });
      toast({
        title: "Ticket Completed!",
        description: "The ticket has been successfully marked as closed",
      });
      // Force close this modal
      setInternalOpen(false);
      // Call onSuccess and onClose to close both modals
      onSuccess();
      onClose();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to resolve ticket. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (data: CompletionData) => {
    if (data.captchaAnswer !== captcha.answer) {
      setCaptchaError("Incorrect answer. Please try again.");
      generateCaptcha();
      form.setValue("captchaAnswer", "");
      return;
    }

    completeMutation.mutate();
  };

  const handleClose = () => {
    setInternalOpen(false);
    onClose();
  };

  return (
    <Dialog open={internalOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-md bg-card border-border p-0 overflow-hidden">
        <DialogHeader className="bg-gradient-to-r from-green-600/20 to-green-500/10 p-6 text-center">
          <div className="w-16 h-16 bg-green-600/20 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-green-500/30">
            <CheckCircle className="text-green-500 w-8 h-8" />
          </div>
          <DialogTitle className="text-xl font-semibold text-foreground">
            Complete Ticket
          </DialogTitle>
          <p className="text-muted-foreground mt-2">
            Please confirm that this ticket has been resolved
          </p>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="p-6 space-y-6">
            {/* Captcha Section */}
            <div className="bg-muted/30 rounded-lg p-5 border border-border/50">
              <div className="flex items-center gap-2 mb-4">
                <ShieldCheck className="w-4 h-4 text-muted-foreground" />
                <FormLabel className="text-sm font-medium text-muted-foreground m-0">
                  Human Verification
                </FormLabel>
              </div>
              
              <div className="flex items-center space-x-3">
                <Captcha question={captcha.question} />
                <FormField
                  control={form.control}
                  name="captchaAnswer"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormControl>
                        <Input
                          {...field}
                          className="bg-background border-border text-foreground placeholder:text-muted-foreground focus-visible:ring-primary/30"
                          placeholder="Answer"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              {captchaError && (
                <div className="mt-2 text-sm text-red-500 flex items-center gap-1">
                  <XCircle className="w-3.5 h-3.5" />
                  <span>{captchaError}</span>
                </div>
              )}
            </div>

            {/* Confirmation Checkbox */}
            <FormField
              control={form.control}
              name="confirmed"
              render={({ field }) => (
                <FormItem className="bg-muted/30 rounded-lg p-5 border border-border/50">
                  <div className="flex items-start gap-3">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        className="mt-1 border-border data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600"
                      />
                    </FormControl>
                    <div className="space-y-1">
                      <FormLabel className="text-sm font-medium text-foreground">
                        Confirmation
                      </FormLabel>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        I confirm that this ticket has been completely resolved and all issues have been addressed satisfactorily.
                      </p>
                    </div>
                  </div>
                  <FormMessage className="mt-2 ml-8" />
                </FormItem>
              )}
            />

            {/* Action Buttons */}
            <div className="flex space-x-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="flex-1 border-border"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={completeMutation.isPending}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium transition-all duration-200"
              >
                {completeMutation.isPending ? (
                  <>
                    <div className="w-4 h-4 mr-2 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    Processing...
                  </>
                ) : (
                  "Complete Ticket"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
