import { departments, users, tickets, type Department, type User, type Ticket, type InsertDepartment, type InsertUser, type InsertTicket, type TicketWithDetails } from "@shared/schema";
import axios from "axios";
import FormData from "form-data";
import https from "https";

// Create an axios instance with TLS verification disabled for HTTPS requests
const axiosInstance = axios.create({
  httpsAgent: new https.Agent({
    rejectUnauthorized: false // Skip TLS verification
  })
});

// iTop API configuration from environment variables
if (!process.env.ITOP_API_URL) {
  throw new Error("ITOP_API_URL environment variable is required");
}
const ITOP_API_URL = process.env.ITOP_API_URL;

if (!process.env.ITOP_API_VERSION) {
  throw new Error("ITOP_API_VERSION environment variable is required");
}
const ITOP_API_VERSION = process.env.ITOP_API_VERSION;

if (!process.env.ITOP_API_USER || !process.env.ITOP_API_PASSWORD) {
  throw new Error("ITOP_API_USER and ITOP_API_PASSWORD environment variables are required");
}
const ITOP_AUTH = {
  user: process.env.ITOP_API_USER,
  password: process.env.ITOP_API_PASSWORD
};

if (!process.env.ITOP_DEFAULT_ORG_ID) {
  throw new Error("ITOP_DEFAULT_ORG_ID environment variable is required");
}
const ITOP_DEFAULT_ORG_ID = process.env.ITOP_DEFAULT_ORG_ID;

// Service and ServiceSubcategory configuration
if (!process.env.ITOP_SERVICE_NAME) {
  throw new Error("ITOP_SERVICE_NAME environment variable is required");
}
const ITOP_SERVICE_NAME = process.env.ITOP_SERVICE_NAME;

if (!process.env.ITOP_SERVICESUBCATEGORY_NAME) {
  throw new Error("ITOP_SERVICESUBCATEGORY_NAME environment variable is required");
}
const ITOP_SERVICESUBCATEGORY_NAME = process.env.ITOP_SERVICESUBCATEGORY_NAME;

// iTop API response types
interface ITopTeam {
  code: number;
  message: string;
  class: string;
  key: string;
  fields: {
    name: string;
    persons_list: Array<{
      person_id: string;
      person_name: string;
      role_id: string;
      role_name: string;
      friendlyname: string;
      person_id_friendlyname: string;
      person_id_obsolescence_flag: string;
      role_id_friendlyname: string;
    }>;
  };
}

interface ITopTeamResponse {
  code: number;
  message: string;
  objects: Record<string, ITopTeam>;
}

interface ITopTicket {
  code: number;
  message: string;
  class: string;
  key: string;
  fields: {
    operational_status: string;
    ref: string;
    org_id: string;
    org_name: string;
    caller_id: string;
    caller_name: string;
    team_id: string;
    team_name: string;
    agent_id: string;
    agent_name: string;
    title: string;
    description: string;
    start_date: string;
    status: string;
    request_type: string;
    impact: string;
    priority: string;
    urgency: string;
    service_name: string;
    servicesubcategory_name: string;
    [key: string]: any;
  };
}

interface ITopTicketResponse {
  code: number;
  message: string;
  objects: Record<string, ITopTicket>;
}

interface ITopCreateTicketResponse {
  code: number;
  message: string;
  objects: {
    created: Record<string, {
      key: string;
      code: number;
      message: string;
    }>;
  };
}

export interface IStorage {
  // Departments
  getDepartments(): Promise<Department[]>;
  createDepartment(department: InsertDepartment): Promise<Department>;
  
  // Users
  getUsers(): Promise<User[]>;
  getUsersByDepartment(departmentId: number): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  
  // Tickets
  getTickets(): Promise<TicketWithDetails[]>;
  getTicketByTicketId(ticketId: string): Promise<TicketWithDetails | undefined>;
  createTicket(ticket: InsertTicket): Promise<TicketWithDetails>;
  updateTicketStatus(ticketId: string, status: string): Promise<TicketWithDetails>;
  searchTicketsByUser(userName: string): Promise<TicketWithDetails[]>;
  
  // iTop API methods
  fetchTeamsFromITop(): Promise<Department[]>;
  fetchUsersFromITop(): Promise<User[]>;
  fetchTicketsFromITop(): Promise<TicketWithDetails[]>;
  createTicketInITop(ticket: InsertTicket, userName: string): Promise<string>;
}

export class MemStorage implements IStorage {
  private departments: Map<number, Department>;
  private users: Map<number, User>;
  private tickets: Map<number, Ticket>;
  private currentDepartmentId: number;
  private currentUserId: number;
  private currentTicketId: number;
  private ticketCounter: number;

  constructor() {
    this.departments = new Map();
    this.users = new Map();
    this.tickets = new Map();
    this.currentDepartmentId = 1;
    this.currentUserId = 1;
    this.currentTicketId = 1;
    this.ticketCounter = 1;
    
    // Initialize with default data
    this.initializeDefaultData();
  }

  private initializeDefaultData() {
    // Create departments
    const defaultDepartments = [
      { name: "Information Technology", value: "it" },
      { name: "Human Resources", value: "hr" },
      { name: "Finance", value: "finance" },
      { name: "Operations", value: "operations" },
      { name: "Marketing", value: "marketing" },
    ];

    defaultDepartments.forEach(dept => {
      const department: Department = {
        id: this.currentDepartmentId++,
        name: dept.name,
        value: dept.value,
      };
      this.departments.set(department.id, department);
    });

    // Create users
    const defaultUsers = [
      { name: "John Doe", value: "john.doe", departmentId: 1 },
      { name: "Jane Smith", value: "jane.smith", departmentId: 2 },
      { name: "Mike Johnson", value: "mike.johnson", departmentId: 3 },
      { name: "Sarah Wilson", value: "sarah.wilson", departmentId: 4 },
      { name: "David Brown", value: "david.brown", departmentId: 5 },
      { name: "Lisa Davis", value: "lisa.davis", departmentId: 1 },
      { name: "Tom Wilson", value: "tom.wilson", departmentId: 2 },
    ];

    defaultUsers.forEach(user => {
      const newUser: User = {
        id: this.currentUserId++,
        name: user.name,
        value: user.value,
        departmentId: user.departmentId,
      };
      this.users.set(newUser.id, newUser);
    });

    // Create some initial tickets
    const defaultTickets = [
      {
        departmentId: 1,
        userId: 1,
        title: "[REQUEST] from John Doe (Information Technology)",
        extension: "1234",
        rackLocation: "A1-R03-U12",
        issueDescription: "Network connectivity issues with server rack. Unable to establish connection to the main network. This is affecting multiple servers in the rack and causing service disruptions.",
        status: "in-progress",
      },
      {
        departmentId: 2,
        userId: 2,
        title: "[REQUEST] from Jane Smith (Human Resources)",
        extension: "5678",
        rackLocation: "B2-R01-U05",
        issueDescription: "Printer not responding to print requests. Error messages appearing on display. Users unable to print important documents.",
        status: "open",
      },
      {
        departmentId: 3,
        userId: 3,
        title: "[REQUEST] from Mike Johnson (Finance)",
        extension: "9012",
        rackLocation: "C1-R02-U08",
        issueDescription: "Software installation request for new accounting application. Requires admin privileges and compatibility testing.",
        status: "completed",
      },
    ];

    defaultTickets.forEach(ticket => {
      const now = new Date();
      const newTicket: Ticket = {
        id: this.currentTicketId++,
        ticketId: `TKT-${new Date().getFullYear()}${String(this.ticketCounter++).padStart(3, '0')}`,
        title: ticket.title,
        departmentId: ticket.departmentId,
        userId: ticket.userId,
        extension: ticket.extension,
        rackLocation: ticket.rackLocation,
        issueDescription: ticket.issueDescription,
        status: ticket.status,
        createdAt: now,
        updatedAt: now,
      };
      this.tickets.set(newTicket.id, newTicket);
    });
  }

  async getDepartments(): Promise<Department[]> {
    try {
      // Try to fetch from iTop API first
      const iTopDepartments = await this.fetchTeamsFromITop();
      if (iTopDepartments.length > 0) {
        return iTopDepartments;
      }
    } catch (error) {
      console.error("Failed to fetch departments from iTop API, falling back to local data:", error);
    }
    
    // Fall back to local data if API fails
    return Array.from(this.departments.values());
  }

  async createDepartment(insertDepartment: InsertDepartment): Promise<Department> {
    const id = this.currentDepartmentId++;
    const department: Department = { ...insertDepartment, id };
    this.departments.set(id, department);
    return department;
  }

  async getUsers(): Promise<User[]> {
    try {
      // Try to fetch from iTop API first
      const iTopUsers = await this.fetchUsersFromITop();
      if (iTopUsers.length > 0) {
        // Remove duplicates by name and value
        const seen = new Set();
        return iTopUsers.filter(u => {
          const key = `${u.name.toLowerCase()}|${u.value.toLowerCase()}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
      }
    } catch (error) {
      console.error("Failed to fetch users from iTop API, falling back to local data:", error);
    }
    // Fall back to local data if API fails
    const seen = new Set();
    return Array.from(this.users.values()).filter(u => {
      const key = `${u.name.toLowerCase()}|${u.value.toLowerCase()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  async getUsersByDepartment(departmentId: number): Promise<User[]> {
    try {
      // Try to fetch all users from iTop API first
      const iTopUsers = await this.fetchUsersFromITop();
      if (iTopUsers.length > 0) {
        // Filter by department ID
        return iTopUsers.filter(user => user.departmentId === departmentId);
      }
    } catch (error) {
      console.error("Failed to fetch users from iTop API, falling back to local data:", error);
    }
    
    // Fall back to local data if API fails
    return Array.from(this.users.values()).filter(user => user.departmentId === departmentId);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async getTickets(): Promise<TicketWithDetails[]> {
    try {
      // Try to fetch from iTop API first
      const iTopTickets = await this.fetchTicketsFromITop();
      if (iTopTickets.length > 0) {
        return iTopTickets;
      }
    } catch (error) {
      console.error("Failed to fetch tickets from iTop API, falling back to local data:", error);
    }
    
    // Fall back to local data if API fails
    const ticketsArray = Array.from(this.tickets.values());
    return ticketsArray.map(ticket => this.enrichTicket(ticket)).sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async getTicketByTicketId(ticketId: string): Promise<TicketWithDetails | undefined> {
    try {
      // Try to fetch all tickets from iTop API first
      const iTopTickets = await this.fetchTicketsFromITop();
      if (iTopTickets.length > 0) {
        return iTopTickets.find(ticket => ticket.ticketId === ticketId);
      }
    } catch (error) {
      console.error("Failed to fetch tickets from iTop API, falling back to local data:", error);
    }
    
    // Fall back to local data if API fails
    const ticket = Array.from(this.tickets.values()).find(t => t.ticketId === ticketId);
    return ticket ? this.enrichTicket(ticket) : undefined;
  }

  async createTicket(insertTicket: InsertTicket): Promise<TicketWithDetails> {
    try {
      // Try to create ticket in iTop first
      const user = this.users.get(insertTicket.userId);
      if (!user) {
        throw new Error("User not found");
      }
      
      // Create ticket in iTop
      const ticketRef = await this.createTicketInITop(insertTicket, user.name);
      console.log("Successfully created ticket in iTop with ref:", ticketRef);
      
      // Create local ticket with the reference from iTop
      const id = this.currentTicketId++;
      const now = new Date();
      const ticket: Ticket = {
        ...insertTicket,
        id,
        ticketId: ticketRef, // Use the ref directly from iTop
        status: "open",
        createdAt: now,
        updatedAt: now,
      };
      
      this.tickets.set(id, ticket);
      return this.enrichTicket(ticket);
    } catch (error) {
      console.error("Failed to create ticket in iTop, creating locally:", error);
      
      // Fall back to local creation
      const id = this.currentTicketId++;
      const now = new Date();
      const ticket: Ticket = {
        ...insertTicket,
        id,
        ticketId: `TKT-${new Date().getFullYear()}${String(this.ticketCounter++).padStart(3, '0')}`,
        status: "open",
        createdAt: now,
        updatedAt: now,
      };
      
      this.tickets.set(id, ticket);
      return this.enrichTicket(ticket);
    }
  }

  async updateTicketStatus(ticketId: string, status: string): Promise<TicketWithDetails> {
    try {
      // Try to update the status in iTop first
      console.log("Preparing to update ticket status in iTop");
      
      const formData = new FormData();
      formData.append('version', ITOP_API_VERSION);
      formData.append('auth_user', ITOP_AUTH.user);
      formData.append('auth_pwd', ITOP_AUTH.password);
      
      // Prepare the JSON data for updating the ticket
      const jsonData = {
        operation: "core/update",
        comment: "Updated from Ticket Tracker Pro",
        class: "UserRequest",
        key: `SELECT UserRequest WHERE ref = "${ticketId}"`,
        fields: {
          status: status
        }
      };
      
      formData.append('json_data', JSON.stringify(jsonData));

      try {
        const response = await axiosInstance.post(ITOP_API_URL, formData, {
          headers: {
            ...formData.getHeaders()
          }
        });

        console.log("iTop API update status response:", JSON.stringify(response.data, null, 2));
      } catch (error: any) {
        console.error("Error in iTop API request for updating ticket status:", error.message);
        if (error.response) {
          console.error("Response status:", error.response.status);
          console.error("Response data:", error.response.data);
        }
        // Continue with local update even if iTop update fails
        console.log("Continuing with local update despite iTop API error");
      }
      
      // Update the local ticket
      const ticket = Array.from(this.tickets.values()).find(t => t.ticketId === ticketId);
      if (!ticket) {
        throw new Error("Ticket not found");
      }
      
      ticket.status = status;
      ticket.updatedAt = new Date();
      this.tickets.set(ticket.id, ticket);
      return this.enrichTicket(ticket);
    } catch (error) {
      console.error("Error updating ticket status:", error);
      throw error;
    }
  }

  async searchTicketsByUser(userName: string): Promise<TicketWithDetails[]> {
    try {
      // Try to fetch all tickets from iTop API first
      const iTopTickets = await this.fetchTicketsFromITop();
      if (iTopTickets.length > 0) {
        return iTopTickets.filter(ticket => 
          ticket.user.name.toLowerCase().includes(userName.toLowerCase())
        );
      }
    } catch (error) {
      console.error("Failed to fetch tickets from iTop API, falling back to local data:", error);
    }
    
    // Fall back to local data if API fails
    const allTickets = await this.getTickets();
    return allTickets.filter(ticket => 
      ticket.user.name.toLowerCase().includes(userName.toLowerCase())
    );
  }

  private enrichTicket(ticket: Ticket): TicketWithDetails {
    const user = this.users.get(ticket.userId);
    let department = this.departments.get(ticket.departmentId);

    // If departmentId is 0 (custom/bypass), allow and create a placeholder department object
    if (!department && ticket.departmentId === 0) {
      department = {
        id: 0,
        name: "Custom Department",
        value: "custom-department"
      };
    }

    // Only throw error if user or (department is missing and not a custom department)
    if (!user || !department) {
      throw new Error("Invalid ticket data");
    }

    return {
      ...ticket,
      department,
      user,
    };
  }

  // iTop API integration methods
  async fetchTeamsFromITop(): Promise<Department[]> {
    try {
      console.log("Preparing to fetch teams from iTop");
      
      const formData = new FormData();
      formData.append('version', ITOP_API_VERSION);
      formData.append('auth_user', ITOP_AUTH.user);
      formData.append('auth_pwd', ITOP_AUTH.password);
      formData.append('json_data', JSON.stringify({
        operation: "core/get",
        class: "Team",
        key: "SELECT Team",
        output_fields: "name,persons_list"
      }));

      console.log("Sending request to iTop API:", ITOP_API_URL);
      
      try {
        const response = await axiosInstance.post(ITOP_API_URL, formData, {
          headers: {
            ...formData.getHeaders()
          }
        });

        console.log("iTop API response status:", response.status);
        
        const data = response.data as ITopTeamResponse;
        
        if (data.code !== 0) {
          throw new Error(`iTop API error: ${data.message}`);
        }

        // Clear existing departments
        this.departments.clear();
        this.currentDepartmentId = 1;
        
        // Convert iTop teams to departments
        const departments: Department[] = Object.values(data.objects).map(team => {
          const id = this.currentDepartmentId++;
          const department: Department = {
            id,
            name: team.fields.name,
            value: team.fields.name.toLowerCase().replace(/\s+/g, '-')
          };
          this.departments.set(id, department);
          return department;
        });

        return departments;
      } catch (error: any) {
        console.error("Error in iTop API request:", error.message);
        if (error.response) {
          console.error("Response status:", error.response.status);
          console.error("Response data:", error.response.data);
        }
        throw error;
      }
    } catch (error) {
      console.error("Error fetching teams from iTop:", error);
      throw error;
    }
  }

  async fetchUsersFromITop(): Promise<User[]> {
    try {
      console.log("Preparing to fetch ALL users from iTop (Person)");
      // Fetch all Person objects
      const formData = new FormData();
      formData.append('version', ITOP_API_VERSION);
      formData.append('auth_user', ITOP_AUTH.user);
      formData.append('auth_pwd', ITOP_AUTH.password);
      formData.append('json_data', JSON.stringify({
        operation: "core/get",
        class: "Person",
        key: "SELECT Person",
        output_fields: "id,friendlyname,team_list"
      }));

      const response = await axiosInstance.post(ITOP_API_URL, formData, {
        headers: {
          ...formData.getHeaders()
        }
      });
      console.log("iTop API users response status:", response.status);
      const data = response.data;
      if (data.code !== 0) {
        throw new Error(`iTop API error: ${data.message}`);
      }

      // Clear existing users
      this.users.clear();
      this.currentUserId = 1;

      // Make sure departments are loaded
      if (this.departments.size === 0) {
        await this.fetchTeamsFromITop();
      }

      const users: User[] = [];
      const departmentNameToId = new Map<string, number>();
      for (const dept of Array.from(this.departments.values())) {
        departmentNameToId.set(dept.name, dept.id);
      }

      Object.values(data.objects).forEach((person: any) => {
        const name = person.fields.friendlyname;
        const value = name.toLowerCase().replace(/\s+/g, '.');
        let departmentId: number | null = null;
        let departmentName = "";
        // If team_list is not empty, use the first team as department
        if (person.fields.team_list && person.fields.team_list.length > 0) {
          const team = person.fields.team_list[0];
          departmentName = team.team_name;
          departmentId = departmentNameToId.get(departmentName) || null;
        }
        // Prevent duplicate users by name and value
        const key = `${name.toLowerCase()}|${value.toLowerCase()}`;
        if (users.some(u => `${u.name.toLowerCase()}|${u.value.toLowerCase()}` === key)) {
          return;
        }
        const personId = this.currentUserId++;
        const user: User = {
          id: personId,
          name,
          value,
          departmentId: departmentId as any, // can be null
          // Save iTop person id for later use
          iTopId: person.fields.id
        } as any;
        this.users.set(personId, user);
        users.push(user);
      });
      return users;
    } catch (error: any) {
      console.error("Error fetching users from iTop (Person):", error.message);
      if (error.response) {
        console.error("Response status:", error.response.status);
        console.error("Response data:", error.response.data);
      }
      throw error;
    }
  }

  async fetchTicketsFromITop(): Promise<TicketWithDetails[]> {
    try {
      console.log("Preparing to fetch tickets from iTop");
      
      // Make sure departments and users are loaded
      if (this.departments.size === 0) {
        await this.fetchTeamsFromITop();
      }
      
      if (this.users.size === 0) {
        await this.fetchUsersFromITop();
      }

      const formData = new FormData();
      formData.append('version', ITOP_API_VERSION);
      formData.append('auth_user', ITOP_AUTH.user);
      formData.append('auth_pwd', ITOP_AUTH.password);
      
      // Create a query that filters by service_name and servicesubcategory_name if they are provided
      let query = "SELECT UserRequest";
      if (ITOP_SERVICE_NAME && ITOP_SERVICESUBCATEGORY_NAME) {
        query = `SELECT UserRequest WHERE service_name="${ITOP_SERVICE_NAME}" AND servicesubcategory_name="${ITOP_SERVICESUBCATEGORY_NAME}"`;
      } else if (ITOP_SERVICE_NAME) {
        query = `SELECT UserRequest WHERE service_name="${ITOP_SERVICE_NAME}"`;
      }
      
      formData.append('json_data', JSON.stringify({
        operation: "core/get",
        class: "UserRequest",
        key: query,
        output_fields: "*"
      }));

      try {
        const response = await axiosInstance.post(ITOP_API_URL, formData, {
          headers: {
            ...formData.getHeaders()
          }
        });

        console.log("iTop API tickets response status:", response.status);
        
        const data = response.data as ITopTicketResponse;
        
        if (data.code !== 0) {
          throw new Error(`iTop API error: ${data.message}`);
        }

        // Clear existing tickets
        this.tickets.clear();
        this.currentTicketId = 1;
        this.ticketCounter = 1;

        // Convert iTop tickets to our ticket format
        const ticketsWithDetails: TicketWithDetails[] = [];

        for (const ticketKey in data.objects) {
          const iTopTicket = data.objects[ticketKey];
          
          // Find user by name
          const callerName = iTopTicket.fields.caller_name;
          let user = Array.from(this.users.values()).find(u => 
            u.name.includes(callerName) || callerName.includes(u.name)
          );
          
          // If user not found, create a placeholder user
          if (!user) {
            const defaultDeptId = this.departments.size > 0 ? 
              Array.from(this.departments.values())[0].id : 1;
              
            user = {
              id: this.currentUserId++,
              name: iTopTicket.fields.caller_id_friendlyname || callerName,
              value: (iTopTicket.fields.caller_id_friendlyname || callerName).toLowerCase().replace(/\s+/g, '.'),
              departmentId: defaultDeptId
            };
            
            this.users.set(user.id, user);
          }
          
          // Find department by team name
          let department = Array.from(this.departments.values()).find(d => 
            d.name === iTopTicket.fields.team_name
          );
          
          // If department not found, use user's department or create one
          if (!department) {
            department = this.departments.get(user.departmentId) || {
              id: this.currentDepartmentId++,
              name: iTopTicket.fields.team_name || "Unknown Department",
              value: (iTopTicket.fields.team_name || "unknown").toLowerCase().replace(/\s+/g, '-')
            };
            
            if (!this.departments.has(department.id)) {
              this.departments.set(department.id, department);
            }
          }

          const id = this.currentTicketId++;
          
          // Use start_date for createdAt and last_update for updatedAt
          const startDate = iTopTicket.fields.start_date ? new Date(iTopTicket.fields.start_date) : new Date();
          const lastUpdateDate = iTopTicket.fields.last_update ? new Date(iTopTicket.fields.last_update) : startDate;
          
          // Use the status directly from iTop
          const status = iTopTicket.fields.status || "new";

          // Extract extension, rack location, and issue description from description using regex
          let extension = "N/A";
          let rackLocation = "N/A";
          let issueDescription = "";
          let fullDescription = iTopTicket.fields.description || iTopTicket.fields.title;

          if (iTopTicket.fields.description) {
            // Extract extension
            const extensionMatch = iTopTicket.fields.description.match(/<strong>EXTENSION<\/strong>:\s*([^<]+)/i) || 
                                 iTopTicket.fields.description.match(/EXTENSION:\s*([^\n]+)/i);
            if (extensionMatch && extensionMatch[1]) {
              extension = extensionMatch[1].trim();
            }
            
            // Extract rack location
            const rackLocationMatch = iTopTicket.fields.description.match(/<strong>RACK LOCATION<\/strong>:\s*([^<]+)/i) || 
                                    iTopTicket.fields.description.match(/RACK LOCATION:\s*([^\n]+)/i);
            if (rackLocationMatch && rackLocationMatch[1]) {
              rackLocation = rackLocationMatch[1].trim();
            }
            
            // Extract issue description
            const issueDescMatch = iTopTicket.fields.description.match(/<strong>ISSUE DESCRIPTION<\/strong>:\s*([^<]+)/i) || 
                                 iTopTicket.fields.description.match(/ISSUE DESCRIPTION:\s*([^<]+)/i) ||
                                 iTopTicket.fields.description.match(/<p><strong>ISSUE DESCRIPTION<\/strong>:(.*?)<\/p>/i);
            
            if (issueDescMatch && issueDescMatch[1]) {
              issueDescription = issueDescMatch[1].trim();
            } else {
              // If no match found, try to extract the last part of the description after RACK LOCATION
              const parts = iTopTicket.fields.description.split(/RACK LOCATION:.*?\n/i);
              if (parts.length > 1) {
                issueDescription = parts[1].trim();
              }
            }
            
            // If still no issue description, use a default
            if (!issueDescription) {
              issueDescription = "No issue description provided";
            }
          }

          // Create the base ticket object
          const ticket: Ticket = {
            id,
            ticketId: iTopTicket.fields.ref,
            title: iTopTicket.fields.title,
            departmentId: department.id,
            userId: user.id,
            extension,
            rackLocation,
            issueDescription: fullDescription, // Keep the full HTML description for display
            status,
            createdAt: startDate,
            updatedAt: lastUpdateDate
          };
          
          this.tickets.set(id, ticket);
          
          // Create the enriched ticket with department and user
          const enrichedTicket: TicketWithDetails = {
            ...ticket,
            department,
            user
          };

          // Add agent_id_friendlyname if it exists
          if (iTopTicket.fields.agent_id_friendlyname) {
            (enrichedTicket as any).agent_id_friendlyname = iTopTicket.fields.agent_id_friendlyname;
            console.log(`Added agent_id_friendlyname: ${iTopTicket.fields.agent_id_friendlyname} to ticket ${ticket.ticketId}`);
          }
          
          ticketsWithDetails.push(enrichedTicket);
        }

        return ticketsWithDetails;
      } catch (error: any) {
        console.error("Error in iTop API request for tickets:", error.message);
        if (error.response) {
          console.error("Response status:", error.response.status);
          console.error("Response data:", error.response.data);
        }
        throw error;
      }
    } catch (error) {
      console.error("Error fetching tickets from iTop:", error);
      throw error;
    }
  }

  async createTicketInITop(ticket: InsertTicket, userName: string): Promise<string> {
    try {
      console.log("Preparing to create ticket in iTop");
      // Find the user object by name (case-insensitive)
      let userObj = Array.from(this.users.values()).find(u => u.name.toLowerCase() === userName.toLowerCase());
      let callerIdQuery = '';
      if (userObj && (userObj as any).iTopId) {
        // Use the unique iTop id if available
        callerIdQuery = (userObj as any).iTopId;
      } else {
        // Fallback to friendlyname (may cause duplicate error if not unique)
        callerIdQuery = `SELECT Person WHERE friendlyname=\"${userName}\"`;
      }
      const formData = new FormData();
      formData.append('version', ITOP_API_VERSION);
      formData.append('auth_user', ITOP_AUTH.user);
      formData.append('auth_pwd', ITOP_AUTH.password);
      // Prepare the JSON data for ticket creation
      const jsonData = {
        operation: "core/create",
        comment: "Created from Ticket Tracker Pro",
        class: "UserRequest",
        output_fields: "ref",
        fields: {
          caller_id: callerIdQuery,
          org_id: ITOP_DEFAULT_ORG_ID,
          origin: "portal",
          title: ticket.title,
          description: ticket.issueDescription,
          urgency: "4",
          impact: "3",
          status: "new",
          service_id: `SELECT Service WHERE name=\"${ITOP_SERVICE_NAME}\"`,
          servicesubcategory_id: `SELECT ServiceSubcategory WHERE name=\"${ITOP_SERVICESUBCATEGORY_NAME}\"`
        }
      };
      console.log("Create ticket payload:", JSON.stringify(jsonData));
      formData.append('json_data', JSON.stringify(jsonData));
      try {
        const response = await axiosInstance.post(ITOP_API_URL, formData, {
          headers: {
            ...formData.getHeaders()
          }
        });
        console.log("iTop API create ticket response status:", response.status);
        console.log("iTop API create ticket response:", JSON.stringify(response.data, null, 2));
        const data = response.data as any;
        if (data.code !== 0) {
          throw new Error(`iTop API error: ${data.message}`);
        }
        // Based on the actual response structure, extract the ref directly
        if (data.objects) {
          const objectKey = Object.keys(data.objects)[0];
          if (objectKey && data.objects[objectKey] && data.objects[objectKey].fields && data.objects[objectKey].fields.ref) {
            const ticketRef = data.objects[objectKey].fields.ref;
            console.log("Ticket reference extracted directly:", ticketRef);
            return ticketRef;
          }
        }
        // Fallback: try to get the key and make another request
        let objectKey = "";
        if (data.objects) {
          objectKey = Object.keys(data.objects)[0];
          if (!objectKey) {
            throw new Error("No object key found in response");
          }
        } else {
          throw new Error("No objects found in response");
        }
        const keyParts = objectKey.split("::");
        const numericKey = keyParts.length > 1 ? keyParts[1] : objectKey;
        const refFormData = new FormData();
        refFormData.append('version', ITOP_API_VERSION);
        refFormData.append('auth_user', ITOP_AUTH.user);
        refFormData.append('auth_pwd', ITOP_AUTH.password);
        refFormData.append('json_data', JSON.stringify({
          operation: "core/get",
          class: "UserRequest",
          key: numericKey,
          output_fields: "ref"
        }));
        const refResponse = await axiosInstance.post(ITOP_API_URL, refFormData, {
          headers: {
            ...refFormData.getHeaders()
          }
        });
        console.log("iTop API get ticket ref response:", JSON.stringify(refResponse.data, null, 2));
        const refData = refResponse.data as any;
        if (refData.code !== 0) {
          throw new Error(`Failed to get ticket reference: ${refData.message}`);
        }
        if (refData.objects) {
          const refObjectKey = Object.keys(refData.objects)[0];
          if (refObjectKey && refData.objects[refObjectKey] && refData.objects[refObjectKey].fields && refData.objects[refObjectKey].fields.ref) {
            const ticketRef = refData.objects[refObjectKey].fields.ref;
            console.log("Ticket reference from second request:", ticketRef);
            return ticketRef;
          }
        }
        throw new Error("Could not extract ticket reference from API responses");
      } catch (error: any) {
        console.error("Error in iTop API request for creating ticket:", error.message);
        if (error.response) {
          console.error("Response status:", error.response.status);
          console.error("Response data:", error.response.data);
        }
        throw error;
      }
    } catch (error) {
      console.error("Error creating ticket in iTop:", error);
      throw error;
    }
  }
}

export const storage = new MemStorage();
