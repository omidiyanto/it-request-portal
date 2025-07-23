import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CheckCircle } from "lucide-react";
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
  };

  useEffect(() => {
    if (isOpen) {
      generateCaptcha();
      form.reset();
    }
  }, [isOpen, form]);

  const completeMutation = useMutation({
    mutationFn: async () => {
      // The server will handle the iTop API call with the format:
      // {
      //   operation: "core/update",
      //   comment: "Updated from Ticket Tracker Pro",
      //   class: "UserRequest",
      //   key: `SELECT UserRequest WHERE ref = "${ticket.ticketId}"`,
      //   fields: {
      //     status: "resolved"
      //   }
      // }
      const response = await apiRequest("PATCH", `/api/tickets/${ticket.ticketId}/status`, {
        status: "closed",
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tickets"] });
      toast({
        title: "Ticket Completed!",
        description: "The ticket has been successfully marked as resolved",
      });
      onSuccess();
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
      form.setError("captchaAnswer", {
        message: "Incorrect answer. Please try again.",
      });
      generateCaptcha();
      form.setValue("captchaAnswer", "");
      return;
    }

    completeMutation.mutate();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md bg-card backdrop-blur-sm border-border">
        <DialogHeader className="text-center pb-6 border-b border-border">
          <div className="w-16 h-16 bg-green-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="text-green-500 text-2xl" />
          </div>
          <DialogTitle className="text-xl font-semibold text-foreground">
            Complete Ticket
          </DialogTitle>
          <p className="text-muted-foreground mt-2">
            Please confirm that this ticket has been resolved
          </p>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Captcha Section */}
            <div className="bg-muted/50 rounded-lg p-4">
              <FormLabel className="block text-sm font-medium text-muted-foreground mb-3">
                Security Verification
              </FormLabel>
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
                          className="bg-muted border-border"
                          placeholder="Answer"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Confirmation Checkbox */}
            <FormField
              control={form.control}
              name="confirmed"
              render={({ field }) => (
                <FormItem className="flex items-start space-x-3">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      className="mt-1"
                    />
                  </FormControl>
                  <FormLabel className="text-sm text-muted-foreground leading-relaxed">
                    I confirm that this ticket has been completely resolved and all issues have been addressed satisfactorily.
                  </FormLabel>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Action Buttons */}
            <div className="flex space-x-3">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="flex-1 bg-muted text-muted-foreground hover:bg-muted/80"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={completeMutation.isPending}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold transition-all duration-200 transform hover:scale-[1.02] shadow-lg"
              >
                {completeMutation.isPending ? (
                  <>
                    <div className="w-4 h-4 mr-2 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    Completing...
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
