import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Ticket, Send } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Department, User } from "@shared/schema";

const stepOneSchema = z.object({
  departmentId: z.string().min(1, "Department is required"),
  userId: z.string().min(1, "User is required"),
});

const stepTwoSchema = z.object({
  extension: z.string().min(1, "Extension is required"),
  rackLocation: z.string().min(1, "Rack location is required"),
  issueDescription: z.string().min(10, "Issue description must be at least 10 characters"),
});

type StepOneData = z.infer<typeof stepOneSchema>;
type StepTwoData = z.infer<typeof stepTwoSchema>;

export default function CreateRequest() {
  const [step, setStep] = useState<1 | 2>(1);
  const [stepOneData, setStepOneData] = useState<StepOneData | null>(null);
  const { toast } = useToast();
  const [selectedUserName, setSelectedUserName] = useState<string>("");
  const [selectedDepartmentName, setSelectedDepartmentName] = useState<string>("");

  const stepOneForm = useForm<StepOneData>({
    resolver: zodResolver(stepOneSchema),
    defaultValues: {
      departmentId: "",
      userId: "",
    },
  });

  const stepTwoForm = useForm<StepTwoData>({
    resolver: zodResolver(stepTwoSchema),
    defaultValues: {
      extension: "",
      rackLocation: "",
      issueDescription: "",
    },
  });

  const { data: departments, isLoading: departmentsLoading } = useQuery<Department[]>({
    queryKey: ["/api/departments"],
  });

  const selectedDepartmentId = stepOneForm.watch("departmentId");
  
  // Reset userId when department changes
  useEffect(() => {
    if (selectedDepartmentId) {
      stepOneForm.setValue("userId", "");
      
      // Store department name for title template
      const selectedDept = departments?.find(dept => dept.id.toString() === selectedDepartmentId);
      if (selectedDept) {
        setSelectedDepartmentName(selectedDept.name);
      }
    }
  }, [selectedDepartmentId, stepOneForm, departments]);
  
  const { data: users, isLoading: usersLoading, error: usersError } = useQuery<User[]>({
    queryKey: ["/api/users", { departmentId: selectedDepartmentId }],
    enabled: !!selectedDepartmentId,
  });
  
  // Store selected user name for title template
  const selectedUserId = stepOneForm.watch("userId");
  useEffect(() => {
    if (selectedUserId && users) {
      const selectedUser = users.find(user => user.id.toString() === selectedUserId);
      if (selectedUser) {
        setSelectedUserName(selectedUser.name);
      }
    }
  }, [selectedUserId, users]);

  const createTicketMutation = useMutation({
    mutationFn: async (data: StepTwoData & { departmentId: number; userId: number; userName: string; departmentName: string }) => {
      try {
        // Format description according to the required structure
        const formattedDescription = `<p><strong>EXTENSION</strong>: ${data.extension}</p>
<p><strong>RACK LOCATION</strong>: ${data.rackLocation}</p>
<p><strong>ISSUE DESCRIPTION</strong>: ${data.issueDescription}</p>`;

        // Create title template
        const titleTemplate = `[REQUEST] from ${data.userName} (${data.departmentName})`;

        const requestData = {
          departmentId: data.departmentId,
          userId: data.userId,
          extension: data.extension,
          rackLocation: data.rackLocation,
          issueDescription: formattedDescription,
          title: titleTemplate
        };

        console.log("Sending ticket data:", requestData);
        const response = await apiRequest("POST", "/api/tickets", requestData);
        return response.json();
      } catch (error) {
        console.error("Error creating ticket:", error);
        throw error;
      }
    },
    onSuccess: (ticket) => {
      queryClient.invalidateQueries({ queryKey: ["/api/tickets"] });
      toast({
        title: "Ticket Created Successfully!",
        description: `Your support request has been submitted with ticket ID: ${ticket.ticketId}`,
      });
      
      // Reset forms and step
      stepOneForm.reset();
      stepTwoForm.reset();
      setStepOneData(null);
      setSelectedUserName("");
      setSelectedDepartmentName("");
      setStep(1);
    },
    onError: (error) => {
      console.error("Mutation error:", error);
      toast({
        title: "Error",
        description: "Failed to create ticket. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleStepOneSubmit = (data: StepOneData) => {
    setStepOneData(data);
    setStep(2);
  };

  const handleStepTwoSubmit = (data: StepTwoData) => {
    if (!stepOneData || !selectedUserName || !selectedDepartmentName) {
      console.error("Missing required data:", { stepOneData, selectedUserName, selectedDepartmentName });
      toast({
        title: "Error",
        description: "Missing required information. Please go back and try again.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      createTicketMutation.mutate({
        ...data,
        departmentId: parseInt(stepOneData.departmentId),
        userId: parseInt(stepOneData.userId),
        userName: selectedUserName,
        departmentName: selectedDepartmentName
      });
    } catch (error) {
      console.error("Error submitting form:", error);
    }
  };

  const handleBack = () => {
    setStep(1);
  };

  if (step === 1) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card className="bg-card/80 backdrop-blur-sm border-border shadow-2xl">
          <CardContent className="px-6 py-8 sm:px-8">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/20 rounded-full mb-4">
                <Ticket className="text-primary text-2xl" />
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-2">Create New Request</h2>
              <p className="text-muted-foreground">Select department and user to get started</p>
            </div>

            <Form {...stepOneForm}>
              <form onSubmit={stepOneForm.handleSubmit(handleStepOneSubmit)} className="space-y-6">
                <FormField
                  control={stepOneForm.control}
                  name="departmentId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-muted-foreground">
                        Department <span className="text-destructive">*</span>
                      </FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="bg-muted border-border">
                            <SelectValue placeholder="Select Department" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {departmentsLoading ? (
                            <SelectItem value="loading" disabled>Loading departments...</SelectItem>
                          ) : departments && departments.length > 0 ? (
                            departments.map((dept: Department) => (
                              <SelectItem key={dept.id} value={dept.id.toString()}>
                                {dept.name}
                              </SelectItem>
                            ))
                          ) : (
                            <SelectItem value="none" disabled>No departments found</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={stepOneForm.control}
                  name="userId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-muted-foreground">
                        User <span className="text-destructive">*</span>
                      </FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        value={field.value} 
                        disabled={!selectedDepartmentId || usersLoading}
                      >
                        <FormControl>
                          <SelectTrigger className="bg-muted border-border">
                            <SelectValue placeholder="Select User" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {usersLoading ? (
                            <SelectItem value="loading" disabled>Loading users...</SelectItem>
                          ) : users && users.length > 0 ? (
                            users.map((user: User) => (
                              <SelectItem key={user.id} value={user.id.toString()}>
                                {user.name}
                              </SelectItem>
                            ))
                          ) : (
                            <SelectItem value="none" disabled>No users found for this department</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button 
                  type="submit" 
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-3 px-6 rounded-lg transition-all duration-200 transform hover:scale-[1.02] shadow-lg"
                  disabled={!selectedDepartmentId || !stepOneForm.watch("userId")}
                >
                  <Send className="w-4 h-4 mr-2" />
                  Continue
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Card className="bg-card/80 backdrop-blur-sm border-border shadow-2xl">
        <CardContent className="px-6 py-8 sm:px-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/20 rounded-full mb-4">
              <Ticket className="text-primary text-2xl" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Ticket Details</h2>
            <p className="text-muted-foreground">Fill out the form below to submit your IT support request</p>
          </div>

          <Form {...stepTwoForm}>
            <form onSubmit={stepTwoForm.handleSubmit(handleStepTwoSubmit)} className="space-y-6">
              <div className="space-y-2">
                <label htmlFor="extension" className="text-sm font-medium text-muted-foreground">
                  Extension <span className="text-destructive">*</span>
                </label>
                <input
                  id="extension"
                  type="text"
                  className="flex h-10 w-full rounded-md border border-input bg-muted px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="e.g., 1234"
                  {...stepTwoForm.register("extension")}
                />
                {stepTwoForm.formState.errors.extension && (
                  <p className="text-sm font-medium text-destructive">
                    {stepTwoForm.formState.errors.extension.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label htmlFor="rackLocation" className="text-sm font-medium text-muted-foreground">
                  Rack Location <span className="text-destructive">*</span>
                </label>
                <input
                  id="rackLocation"
                  type="text"
                  className="flex h-10 w-full rounded-md border border-input bg-muted px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="e.g., A1-R03-U12"
                  {...stepTwoForm.register("rackLocation")}
                />
                {stepTwoForm.formState.errors.rackLocation && (
                  <p className="text-sm font-medium text-destructive">
                    {stepTwoForm.formState.errors.rackLocation.message}
                  </p>
                )}
              </div>

              <FormField
                control={stepTwoForm.control}
                name="issueDescription"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-muted-foreground">
                      Issue Description <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Textarea 
                        {...field} 
                        className="bg-muted border-border resize-none" 
                        placeholder="Please describe the issue in detail..."
                        rows={4}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex space-x-3">
                <Button 
                  type="button"
                  variant="outline"
                  onClick={handleBack}
                  className="flex-1 bg-muted text-muted-foreground hover:bg-muted/80 transition-all duration-200"
                >
                  Back
                </Button>
                <Button 
                  type="submit" 
                  disabled={createTicketMutation.isPending}
                  className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-3 px-6 rounded-lg transition-all duration-200 transform hover:scale-[1.02] shadow-lg"
                >
                  {createTicketMutation.isPending ? (
                    <>
                      <div className="w-4 h-4 mr-2 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Submit Request
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
