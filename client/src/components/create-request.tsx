import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Send, Search, Check, ChevronDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Department, User } from "@shared/schema";
import { cn } from "@/lib/utils";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import PrintTicketModal from "@/components/print-ticket-modal";

// Import command components for searchable select
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

// Rack locations data - can be easily modified
const RACK_LOCATIONS = [
  { id: "a1-r01", label: "A1-R01" },
  { id: "a1-r02", label: "A1-R02" },
  { id: "a1-r03", label: "A1-R03" },
  { id: "b1-r01", label: "B1-R01" },
  { id: "b1-r02", label: "B1-R02" },
  { id: "c1-r01", label: "C1-R01" },
  { id: "c1-r02", label: "C1-R02" },
];

const stepOneSchema = z.object({
  userId: z.string().min(1, "User is required"),
  extension: z.string().optional(), // Extension is optional
});

const stepTwoSchema = z.object({
  deviceType: z.enum(["PC", "Laptop", "Printer", "Others"], {
    required_error: "Device type is required",
  }),
  issueTitle: z.string().min(5, "Issue title must be at least 5 characters"),
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
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [open, setOpen] = useState(false);
  
  // State for print ticket modal
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [printTicketData, setPrintTicketData] = useState<{
    ticketId: string;
    userName: string;
    departmentName: string;
    extension: string;
    createdAt: string;
    title: string;
    rackLocation?: string;
  } | null>(null);

  const stepOneForm = useForm<StepOneData>({
    resolver: zodResolver(stepOneSchema),
    defaultValues: {
      userId: "",
      extension: "",
    },
  });

  const stepTwoForm = useForm<StepTwoData>({
    resolver: zodResolver(stepTwoSchema),
    defaultValues: {
      deviceType: undefined,
      issueTitle: "",
      rackLocation: "",
      issueDescription: "",
    },
  });

  // Set up queries with auto-refresh every 30 seconds
  const { data: departments } = useQuery<Department[]>({
    queryKey: ["/api/departments"],
    refetchInterval: 3000, // Refresh every 30 seconds
  });

  const { data: allUsers, isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ["/api/users"],
    refetchInterval: 3000, // Refresh every 30 seconds
  });
  
  // Filter users based on search term and sort alphabetically
  const filteredUsers = useMemo(() => {
    if (!allUsers) return [];
    
    let result = [...allUsers];
      
    // Sort alphabetically by name
    result.sort((a, b) => a.name.localeCompare(b.name));
    
    // Filter by search term if provided
    if (searchTerm) {
      result = result.filter(user => 
        user.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    return result;
  }, [allUsers, searchTerm]);
  
  // Update department when user is selected
  const selectedUserId = stepOneForm.watch("userId");
  useEffect(() => {
    if (selectedUserId && allUsers) {
      const selectedUser = allUsers.find(user => user.id.toString() === selectedUserId);
      if (selectedUser) {
        setSelectedUserName(selectedUser.name);
        
        // Set the department based on the selected user
        const userDepartmentId = selectedUser.departmentId.toString();
        setSelectedDepartmentId(userDepartmentId);
        
        // Find department name
        const selectedDept = departments?.find(dept => dept.id.toString() === userDepartmentId);
        if (selectedDept) {
          setSelectedDepartmentName(selectedDept.name);
        }
      }
    }
  }, [selectedUserId, allUsers, departments]);

  const createTicketMutation = useMutation({
    mutationFn: async (data: { 
      departmentId: number; 
      userId: number; 
      userName: string; 
      departmentName: string;
      extension: string;
      deviceType: string;
      issueTitle: string;
      rackLocation: string;
      issueDescription: string;
    }) => {
      try {
        // Format description according to the required structure
        const formattedDescription = `<p><strong>DEVICE TYPE</strong>: ${data.deviceType}</p>
<p><strong>EXTENSION</strong>: ${data.extension || '-'}</p>
<p><strong>RACK LOCATION</strong>: ${data.rackLocation}</p>
<p><strong>ISSUE DESCRIPTION</strong>: ${data.issueDescription}</p>`;

        // Create title template with new format
        const titleTemplate = `${data.issueTitle} (${data.departmentName})`;

        const requestData = {
          departmentId: data.departmentId,
          userId: data.userId,
          extension: data.extension || '-',
          rackLocation: data.rackLocation,
          issueDescription: formattedDescription,
          title: titleTemplate
        };

        const response = await apiRequest("POST", "/api/tickets", requestData);
        const responseData = await response.json();
        console.log("Ticket created successfully:", responseData);
        return {
          ...responseData,
          userName: data.userName,
          departmentName: data.departmentName,
          title: data.issueTitle // Use the original issue title without department
        };
      } catch (error) {
        console.error("Error creating ticket:", error);
        throw error;
      }
    },
    onSuccess: (ticket) => {
      console.log("Mutation success, ticket data:", ticket);
      queryClient.invalidateQueries({ queryKey: ["/api/tickets"] });
      toast({
        title: "Ticket Created Successfully!",
        description: `Your support request has been submitted with ticket ID: ${ticket.ticketId}`,
      });
      
      // Set print ticket data and show modal
      setPrintTicketData({
        ticketId: ticket.ticketId,
        userName: ticket.userName,
        departmentName: ticket.departmentName,
        extension: ticket.extension || "-",
        createdAt: ticket.createdAt,
        title: ticket.title,
        rackLocation: ticket.rackLocation
      });
      setShowPrintModal(true);
      console.log("Setting print modal to show with data:", ticket);
      
      // Don't reset forms or change step until after printing
      // This will be handled in the onClose of the print modal
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
    if (!stepOneData || !selectedUserName || !selectedDepartmentName || !selectedDepartmentId) {
      console.error("Missing required data:", { stepOneData, selectedUserName, selectedDepartmentName, selectedDepartmentId });
      toast({
        title: "Error",
        description: "Missing required information. Please go back and try again.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      createTicketMutation.mutate({
        departmentId: parseInt(selectedDepartmentId),
        userId: parseInt(stepOneData.userId),
        userName: selectedUserName,
        departmentName: selectedDepartmentName,
        extension: stepOneData.extension || '-',
        deviceType: data.deviceType,
        issueTitle: data.issueTitle,
        rackLocation: data.rackLocation,
        issueDescription: data.issueDescription
      });
    } catch (error) {
      console.error("Error submitting form:", error);
    }
  };

  const handleBack = () => {
    setStep(1);
  };

  // Handle closing the print modal and resetting form
  const handlePrintModalClose = () => {
    setShowPrintModal(false);
    
    // Reset forms and step after closing the print modal
    stepOneForm.reset();
    stepTwoForm.reset();
    setStepOneData(null);
    setSelectedUserName("");
    setSelectedDepartmentName("");
    setSelectedDepartmentId("");
    setStep(1);
  };

  // Force refresh data when component mounts or when step changes
  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: ["/api/departments"] });
    queryClient.invalidateQueries({ queryKey: ["/api/users"] });
  }, [step]);

  if (step === 1) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card className="bg-card/80 backdrop-blur-sm border-border shadow-2xl">
          <CardContent className="px-6 py-8 sm:px-8">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/20 rounded-full mb-4">
                <img src="/logo2.png" alt="IT Request Portal Logo" className="w-auto h-15" />
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-2">Create New Request</h2>
              <p className="text-muted-foreground">Select a user to get started</p>
            </div>

            <Form {...stepOneForm}>
              <form onSubmit={stepOneForm.handleSubmit(handleStepOneSubmit)} className="space-y-6">
                <FormField
                  control={stepOneForm.control}
                  name="userId"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel className="text-muted-foreground">
                        User <span className="text-destructive">*</span>
                      </FormLabel>
                      
                      <Popover open={open} onOpenChange={setOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={open}
                            className="w-full justify-between bg-muted border-border"
                          >
                            {field.value && allUsers
                              ? allUsers.find(user => user.id.toString() === field.value)?.name
                              : "Search and select user..."}
                            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                          <Command>
                            <div className="flex items-center border-b px-3">
                              <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                              <input
                                className="flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
                                placeholder="Search users..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                autoComplete="off"
                              />
                            </div>
                            <CommandEmpty>No user found.</CommandEmpty>
                            <CommandGroup className="max-h-64 overflow-y-auto">
                              {usersLoading ? (
                                <CommandItem disabled>Loading users...</CommandItem>
                              ) : filteredUsers.length > 0 ? (
                                filteredUsers.map((user) => (
                                  <CommandItem
                                    key={user.id}
                                    value={user.id.toString()}
                                    onSelect={(currentValue) => {
                                      field.onChange(currentValue);
                                      setOpen(false);
                                    }}
                                    className="flex items-center justify-between"
                                  >
                                    <span>{user.name}</span>
                                    {field.value === user.id.toString() && (
                                      <Check className="h-4 w-4 text-primary" />
                                    )}
                                  </CommandItem>
                            ))
                          ) : (
                                <CommandItem disabled>No users found</CommandItem>
                          )}
                            </CommandGroup>
                          </Command>
                        </PopoverContent>
                      </Popover>

                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Extension field - always visible */}
                <FormField
                  control={stepOneForm.control}
                  name="extension"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-muted-foreground">
                        Extension {/* Remove required indicator */}
                      </FormLabel>
                        <FormControl>
                        <Input
                          {...field}
                          className="bg-muted border-border"
                          placeholder="e.g., 1234 (optional)"
                          autoComplete="off"
                        />
                        </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button 
                  type="submit" 
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-3 px-6 rounded-lg transition-all duration-200 transform hover:scale-[1.02] shadow-lg"
                  disabled={!selectedUserId}
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
    <>
    <div className="max-w-2xl mx-auto">
      <Card className="bg-card/80 backdrop-blur-sm border-border shadow-2xl">
        <CardContent className="px-6 py-8 sm:px-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/20 rounded-full mb-4">
              <img src="/logo2.png" alt="IT Request Portal Logo" className="w-15 h-15" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Ticket Details</h2>
            <p className="text-muted-foreground">Fill out the form below to submit your IT support request</p>
          </div>

            {/* Display selected user and department */}
            <div className="mb-6 p-4 bg-muted/50 rounded-lg border border-border">
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <p className="text-xs font-medium text-muted-foreground mb-1">User</p>
                  <p className="text-sm font-medium">{selectedUserName}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Department</p>
                  <p className="text-sm font-medium">{selectedDepartmentName}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Extension</p>
                  <p className="text-sm font-medium">{stepOneData?.extension || '-'}</p>
                </div>
              </div>
            </div>

          <Form {...stepTwoForm}>
            <form onSubmit={stepTwoForm.handleSubmit(handleStepTwoSubmit)} className="space-y-6">
                {/* 1. Device Type (new field) */}
                <FormField
                  control={stepTwoForm.control}
                  name="deviceType"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel className="text-muted-foreground">
                        Device Type <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="flex flex-wrap gap-4"
                        >
                          <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="PC" />
                            </FormControl>
                            <FormLabel className="font-normal cursor-pointer">PC</FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="Laptop" />
                            </FormControl>
                            <FormLabel className="font-normal cursor-pointer">Laptop</FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="Printer" />
                            </FormControl>
                            <FormLabel className="font-normal cursor-pointer">Printer</FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="Others" />
                            </FormControl>
                            <FormLabel className="font-normal cursor-pointer">Others</FormLabel>
                          </FormItem>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* 2. Issue Title (new field) */}
                <FormField
                  control={stepTwoForm.control}
                  name="issueTitle"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-muted-foreground">
                        Issue Title <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          className="bg-muted border-border"
                          placeholder="Brief description of the issue"
                          autoComplete="off"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                )}
                />

                {/* 3. Issue Description */}
              <FormField
                control={stepTwoForm.control}
                name="issueDescription"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-muted-foreground">
                        Issue Detail <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Textarea 
                        {...field} 
                        className="bg-muted border-border resize-none" 
                          placeholder="Please describe the issue in detail"
                          autoComplete="off"
                        rows={4}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

                {/* 4. Rack Location (changed to radio buttons) */}
                <FormField
                  control={stepTwoForm.control}
                  name="rackLocation"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel className="text-muted-foreground">
                        Rack Location <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="grid grid-cols-3 gap-2"
                        >
                          {RACK_LOCATIONS.map((location) => (
                            <FormItem key={location.id} className="flex items-center space-x-2 space-y-0 rounded-md border p-2">
                              <FormControl>
                                <RadioGroupItem value={location.id} />
                              </FormControl>
                              <FormLabel className="font-normal cursor-pointer">{location.label}</FormLabel>
                            </FormItem>
                          ))}
                        </RadioGroup>
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
      
      {/* Print Ticket Modal */}
      {printTicketData && (
        <PrintTicketModal
          isOpen={showPrintModal}
          onClose={handlePrintModalClose}
          ticketData={printTicketData}
        />
      )}
    </>
  );
}
