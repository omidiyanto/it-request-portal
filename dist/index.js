// server/index.ts
import dotenv from "dotenv";
import express2 from "express";

// server/routes.ts
import { createServer } from "http";

// server/storage.ts
import axios from "axios";
import FormData from "form-data";
var ITOP_API_URL = process.env.ITOP_API_URL;
if (!ITOP_API_URL) console.log("Warning: ITOP_API_URL environment variable not found");
var ITOP_API_VERSION = process.env.ITOP_API_VERSION;
if (!ITOP_API_VERSION) console.log("Warning: ITOP_API_VERSION environment variable not found");
var ITOP_AUTH = {
  user: process.env.ITOP_API_USER,
  password: process.env.ITOP_API_PASSWORD
};
if (!ITOP_AUTH.user) console.log("Warning: ITOP_API_USER environment variable not found");
if (!ITOP_AUTH.password) console.log("Warning: ITOP_API_PASSWORD environment variable not found");
var ITOP_DEFAULT_ORG_ID = process.env.ITOP_DEFAULT_ORG_ID;
if (!ITOP_DEFAULT_ORG_ID) console.log("Warning: ITOP_DEFAULT_ORG_ID environment variable not found");
var ITOP_SERVICE_NAME = process.env.ITOP_SERVICE_NAME;
if (!ITOP_SERVICE_NAME) console.log("Warning: ITOP_SERVICE_NAME environment variable not found");
var ITOP_SERVICESUBCATEGORY_NAME = process.env.ITOP_SERVICESUBCATEGORY_NAME;
if (!ITOP_SERVICESUBCATEGORY_NAME) console.log("Warning: ITOP_SERVICESUBCATEGORY_NAME environment variable not found");
var MemStorage = class {
  departments;
  users;
  tickets;
  currentDepartmentId;
  currentUserId;
  currentTicketId;
  ticketCounter;
  constructor() {
    this.departments = /* @__PURE__ */ new Map();
    this.users = /* @__PURE__ */ new Map();
    this.tickets = /* @__PURE__ */ new Map();
    this.currentDepartmentId = 1;
    this.currentUserId = 1;
    this.currentTicketId = 1;
    this.ticketCounter = 1;
    this.initializeDefaultData();
  }
  initializeDefaultData() {
    const defaultDepartments = [
      { name: "Information Technology", value: "it" },
      { name: "Human Resources", value: "hr" },
      { name: "Finance", value: "finance" },
      { name: "Operations", value: "operations" },
      { name: "Marketing", value: "marketing" }
    ];
    defaultDepartments.forEach((dept) => {
      const department = {
        id: this.currentDepartmentId++,
        name: dept.name,
        value: dept.value
      };
      this.departments.set(department.id, department);
    });
    const defaultUsers = [
      { name: "John Doe", value: "john.doe", departmentId: 1 },
      { name: "Jane Smith", value: "jane.smith", departmentId: 2 },
      { name: "Mike Johnson", value: "mike.johnson", departmentId: 3 },
      { name: "Sarah Wilson", value: "sarah.wilson", departmentId: 4 },
      { name: "David Brown", value: "david.brown", departmentId: 5 },
      { name: "Lisa Davis", value: "lisa.davis", departmentId: 1 },
      { name: "Tom Wilson", value: "tom.wilson", departmentId: 2 }
    ];
    defaultUsers.forEach((user) => {
      const newUser = {
        id: this.currentUserId++,
        name: user.name,
        value: user.value,
        departmentId: user.departmentId
      };
      this.users.set(newUser.id, newUser);
    });
    const defaultTickets = [
      {
        departmentId: 1,
        userId: 1,
        title: "[REQUEST] from John Doe (Information Technology)",
        extension: "1234",
        rackLocation: "A1-R03-U12",
        issueDescription: "Network connectivity issues with server rack. Unable to establish connection to the main network. This is affecting multiple servers in the rack and causing service disruptions.",
        status: "in-progress"
      },
      {
        departmentId: 2,
        userId: 2,
        title: "[REQUEST] from Jane Smith (Human Resources)",
        extension: "5678",
        rackLocation: "B2-R01-U05",
        issueDescription: "Printer not responding to print requests. Error messages appearing on display. Users unable to print important documents.",
        status: "open"
      },
      {
        departmentId: 3,
        userId: 3,
        title: "[REQUEST] from Mike Johnson (Finance)",
        extension: "9012",
        rackLocation: "C1-R02-U08",
        issueDescription: "Software installation request for new accounting application. Requires admin privileges and compatibility testing.",
        status: "completed"
      }
    ];
    defaultTickets.forEach((ticket) => {
      const now = /* @__PURE__ */ new Date();
      const newTicket = {
        id: this.currentTicketId++,
        ticketId: `TKT-${(/* @__PURE__ */ new Date()).getFullYear()}${String(this.ticketCounter++).padStart(3, "0")}`,
        title: ticket.title,
        departmentId: ticket.departmentId,
        userId: ticket.userId,
        extension: ticket.extension,
        rackLocation: ticket.rackLocation,
        issueDescription: ticket.issueDescription,
        status: ticket.status,
        createdAt: now,
        updatedAt: now
      };
      this.tickets.set(newTicket.id, newTicket);
    });
  }
  async getDepartments() {
    try {
      const iTopDepartments = await this.fetchTeamsFromITop();
      if (iTopDepartments.length > 0) {
        return iTopDepartments;
      }
    } catch (error) {
      console.error("Failed to fetch departments from iTop API, falling back to local data:", error);
    }
    return Array.from(this.departments.values());
  }
  async createDepartment(insertDepartment) {
    const id = this.currentDepartmentId++;
    const department = { ...insertDepartment, id };
    this.departments.set(id, department);
    return department;
  }
  async getUsers() {
    try {
      const iTopUsers = await this.fetchUsersFromITop();
      if (iTopUsers.length > 0) {
        return iTopUsers;
      }
    } catch (error) {
      console.error("Failed to fetch users from iTop API, falling back to local data:", error);
    }
    return Array.from(this.users.values());
  }
  async getUsersByDepartment(departmentId) {
    try {
      const iTopUsers = await this.fetchUsersFromITop();
      if (iTopUsers.length > 0) {
        return iTopUsers.filter((user) => user.departmentId === departmentId);
      }
    } catch (error) {
      console.error("Failed to fetch users from iTop API, falling back to local data:", error);
    }
    return Array.from(this.users.values()).filter((user) => user.departmentId === departmentId);
  }
  async createUser(insertUser) {
    const id = this.currentUserId++;
    const user = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }
  async getTickets() {
    try {
      const iTopTickets = await this.fetchTicketsFromITop();
      if (iTopTickets.length > 0) {
        return iTopTickets;
      }
    } catch (error) {
      console.error("Failed to fetch tickets from iTop API, falling back to local data:", error);
    }
    const ticketsArray = Array.from(this.tickets.values());
    return ticketsArray.map((ticket) => this.enrichTicket(ticket)).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }
  async getTicketByTicketId(ticketId) {
    try {
      const iTopTickets = await this.fetchTicketsFromITop();
      if (iTopTickets.length > 0) {
        return iTopTickets.find((ticket2) => ticket2.ticketId === ticketId);
      }
    } catch (error) {
      console.error("Failed to fetch tickets from iTop API, falling back to local data:", error);
    }
    const ticket = Array.from(this.tickets.values()).find((t) => t.ticketId === ticketId);
    return ticket ? this.enrichTicket(ticket) : void 0;
  }
  async createTicket(insertTicket) {
    try {
      const user = this.users.get(insertTicket.userId);
      if (!user) {
        throw new Error("User not found");
      }
      const ticketRef = await this.createTicketInITop(insertTicket, user.name);
      console.log("Successfully created ticket in iTop with ref:", ticketRef);
      const id = this.currentTicketId++;
      const now = /* @__PURE__ */ new Date();
      const ticket = {
        ...insertTicket,
        id,
        ticketId: ticketRef,
        // Use the ref directly from iTop
        status: "open",
        createdAt: now,
        updatedAt: now
      };
      this.tickets.set(id, ticket);
      return this.enrichTicket(ticket);
    } catch (error) {
      console.error("Failed to create ticket in iTop, creating locally:", error);
      const id = this.currentTicketId++;
      const now = /* @__PURE__ */ new Date();
      const ticket = {
        ...insertTicket,
        id,
        ticketId: `TKT-${(/* @__PURE__ */ new Date()).getFullYear()}${String(this.ticketCounter++).padStart(3, "0")}`,
        status: "open",
        createdAt: now,
        updatedAt: now
      };
      this.tickets.set(id, ticket);
      return this.enrichTicket(ticket);
    }
  }
  async updateTicketStatus(ticketId, status) {
    try {
      const formData = new FormData();
      formData.append("version", ITOP_API_VERSION || "1.3");
      formData.append("auth_user", ITOP_AUTH.user || "admin");
      formData.append("auth_pwd", ITOP_AUTH.password || "Passw0rd");
      const jsonData = {
        operation: "core/update",
        comment: "Updated from Ticket Tracker Pro",
        class: "UserRequest",
        key: `SELECT UserRequest WHERE ref = "${ticketId}"`,
        fields: {
          status
        }
      };
      formData.append("json_data", JSON.stringify(jsonData));
      const response = await axios.post(ITOP_API_URL || "http://192.168.0.250:8111/webservices/rest.php", formData, {
        headers: {
          ...formData.getHeaders()
        }
      });
      console.log("iTop API update status response:", JSON.stringify(response.data, null, 2));
    } catch (error) {
      console.error("Error updating ticket status in iTop:", error);
    }
    const ticket = Array.from(this.tickets.values()).find((t) => t.ticketId === ticketId);
    if (!ticket) {
      throw new Error("Ticket not found");
    }
    ticket.status = status;
    ticket.updatedAt = /* @__PURE__ */ new Date();
    this.tickets.set(ticket.id, ticket);
    return this.enrichTicket(ticket);
  }
  async searchTicketsByUser(userName) {
    try {
      const iTopTickets = await this.fetchTicketsFromITop();
      if (iTopTickets.length > 0) {
        return iTopTickets.filter(
          (ticket) => ticket.user.name.toLowerCase().includes(userName.toLowerCase())
        );
      }
    } catch (error) {
      console.error("Failed to fetch tickets from iTop API, falling back to local data:", error);
    }
    const allTickets = await this.getTickets();
    return allTickets.filter(
      (ticket) => ticket.user.name.toLowerCase().includes(userName.toLowerCase())
    );
  }
  enrichTicket(ticket) {
    const department = this.departments.get(ticket.departmentId);
    const user = this.users.get(ticket.userId);
    if (!department || !user) {
      throw new Error("Invalid ticket data");
    }
    return {
      ...ticket,
      department,
      user
    };
  }
  // iTop API integration methods
  async fetchTeamsFromITop() {
    try {
      const formData = new FormData();
      formData.append("version", ITOP_API_VERSION || "1.3");
      formData.append("auth_user", ITOP_AUTH.user || "admin");
      formData.append("auth_pwd", ITOP_AUTH.password || "Passw0rd");
      formData.append("json_data", JSON.stringify({
        operation: "core/get",
        class: "Team",
        key: "SELECT Team",
        output_fields: "name,persons_list"
      }));
      const response = await axios.post(ITOP_API_URL || "http://192.168.0.250:8111/webservices/rest.php", formData, {
        headers: {
          ...formData.getHeaders()
        }
      });
      const data = response.data;
      if (data.code !== 0) {
        throw new Error(`iTop API error: ${data.message}`);
      }
      this.departments.clear();
      this.currentDepartmentId = 1;
      const departments2 = Object.values(data.objects).map((team) => {
        const id = this.currentDepartmentId++;
        const department = {
          id,
          name: team.fields.name,
          value: team.fields.name.toLowerCase().replace(/\s+/g, "-")
        };
        this.departments.set(id, department);
        return department;
      });
      return departments2;
    } catch (error) {
      console.error("Error fetching teams from iTop:", error);
      throw error;
    }
  }
  async fetchUsersFromITop() {
    try {
      const formData = new FormData();
      formData.append("version", ITOP_API_VERSION || "1.3");
      formData.append("auth_user", ITOP_AUTH.user || "admin");
      formData.append("auth_pwd", ITOP_AUTH.password || "Passw0rd");
      formData.append("json_data", JSON.stringify({
        operation: "core/get",
        class: "Team",
        key: "SELECT Team",
        output_fields: "name,persons_list"
      }));
      const response = await axios.post(ITOP_API_URL || "http://192.168.0.250:8111/webservices/rest.php", formData, {
        headers: {
          ...formData.getHeaders()
        }
      });
      const data = response.data;
      if (data.code !== 0) {
        throw new Error(`iTop API error: ${data.message}`);
      }
      this.users.clear();
      this.currentUserId = 1;
      if (this.departments.size === 0) {
        await this.fetchTeamsFromITop();
      }
      const userMap = /* @__PURE__ */ new Map();
      Object.values(data.objects).forEach((team) => {
        const teamName = team.fields.name;
        team.fields.persons_list.forEach((person) => {
          const personId = person.person_id;
          const personName = person.person_id_friendlyname;
          if (userMap.has(personId)) {
            userMap.get(personId)?.teams.push(teamName);
          } else {
            userMap.set(personId, {
              name: personName,
              teams: [teamName]
            });
          }
        });
      });
      const users2 = [];
      userMap.forEach((userData, personId) => {
        const primaryTeam = userData.teams[0];
        const departmentEntry = Array.from(this.departments.values()).find((dept) => dept.name === primaryTeam);
        if (departmentEntry) {
          const id = this.currentUserId++;
          const user = {
            id,
            name: userData.name,
            value: userData.name.toLowerCase().replace(/\s+/g, "."),
            departmentId: departmentEntry.id
          };
          this.users.set(id, user);
          users2.push(user);
        }
      });
      return users2;
    } catch (error) {
      console.error("Error fetching users from iTop:", error);
      throw error;
    }
  }
  async fetchTicketsFromITop() {
    try {
      if (this.departments.size === 0) {
        await this.fetchTeamsFromITop();
      }
      if (this.users.size === 0) {
        await this.fetchUsersFromITop();
      }
      const formData = new FormData();
      formData.append("version", ITOP_API_VERSION || "1.3");
      formData.append("auth_user", ITOP_AUTH.user || "admin");
      formData.append("auth_pwd", ITOP_AUTH.password || "Passw0rd");
      let query = "SELECT UserRequest";
      if (ITOP_SERVICE_NAME && ITOP_SERVICESUBCATEGORY_NAME) {
        query = `SELECT UserRequest WHERE service_name="${ITOP_SERVICE_NAME}" AND servicesubcategory_name="${ITOP_SERVICESUBCATEGORY_NAME}"`;
      } else if (ITOP_SERVICE_NAME) {
        query = `SELECT UserRequest WHERE service_name="${ITOP_SERVICE_NAME}"`;
      }
      formData.append("json_data", JSON.stringify({
        operation: "core/get",
        class: "UserRequest",
        key: query,
        output_fields: "*"
      }));
      const response = await axios.post(ITOP_API_URL || "http://192.168.0.250:8111/webservices/rest.php", formData, {
        headers: {
          ...formData.getHeaders()
        }
      });
      const data = response.data;
      if (data.code !== 0) {
        throw new Error(`iTop API error: ${data.message}`);
      }
      this.tickets.clear();
      this.currentTicketId = 1;
      this.ticketCounter = 1;
      const ticketsWithDetails = [];
      for (const ticketKey in data.objects) {
        const iTopTicket = data.objects[ticketKey];
        const callerName = iTopTicket.fields.caller_name;
        let user = Array.from(this.users.values()).find(
          (u) => u.name.includes(callerName) || callerName.includes(u.name)
        );
        if (!user) {
          const defaultDeptId = this.departments.size > 0 ? Array.from(this.departments.values())[0].id : 1;
          user = {
            id: this.currentUserId++,
            name: iTopTicket.fields.caller_id_friendlyname || callerName,
            value: (iTopTicket.fields.caller_id_friendlyname || callerName).toLowerCase().replace(/\s+/g, "."),
            departmentId: defaultDeptId
          };
          this.users.set(user.id, user);
        }
        let department = Array.from(this.departments.values()).find(
          (d) => d.name === iTopTicket.fields.team_name
        );
        if (!department) {
          department = this.departments.get(user.departmentId) || {
            id: this.currentDepartmentId++,
            name: iTopTicket.fields.team_name || "Unknown Department",
            value: (iTopTicket.fields.team_name || "unknown").toLowerCase().replace(/\s+/g, "-")
          };
          if (!this.departments.has(department.id)) {
            this.departments.set(department.id, department);
          }
        }
        const id = this.currentTicketId++;
        const startDate = iTopTicket.fields.start_date ? new Date(iTopTicket.fields.start_date) : /* @__PURE__ */ new Date();
        const lastUpdateDate = iTopTicket.fields.last_update ? new Date(iTopTicket.fields.last_update) : startDate;
        const status = iTopTicket.fields.status || "new";
        let extension = "N/A";
        let rackLocation = "N/A";
        let issueDescription = "";
        let fullDescription = iTopTicket.fields.description || iTopTicket.fields.title;
        if (iTopTicket.fields.description) {
          const extensionMatch = iTopTicket.fields.description.match(/<strong>EXTENSION<\/strong>:\s*([^<]+)/i) || iTopTicket.fields.description.match(/EXTENSION:\s*([^\n]+)/i);
          if (extensionMatch && extensionMatch[1]) {
            extension = extensionMatch[1].trim();
          }
          const rackLocationMatch = iTopTicket.fields.description.match(/<strong>RACK LOCATION<\/strong>:\s*([^<]+)/i) || iTopTicket.fields.description.match(/RACK LOCATION:\s*([^\n]+)/i);
          if (rackLocationMatch && rackLocationMatch[1]) {
            rackLocation = rackLocationMatch[1].trim();
          }
          const issueDescMatch = iTopTicket.fields.description.match(/<strong>ISSUE DESCRIPTION<\/strong>:\s*([^<]+)/i) || iTopTicket.fields.description.match(/ISSUE DESCRIPTION:\s*([^<]+)/i) || iTopTicket.fields.description.match(/<p><strong>ISSUE DESCRIPTION<\/strong>:(.*?)<\/p>/i);
          if (issueDescMatch && issueDescMatch[1]) {
            issueDescription = issueDescMatch[1].trim();
          } else {
            const parts = iTopTicket.fields.description.split(/RACK LOCATION:.*?\n/i);
            if (parts.length > 1) {
              issueDescription = parts[1].trim();
            }
          }
          if (!issueDescription) {
            issueDescription = "No issue description provided";
          }
        }
        const ticket = {
          id,
          ticketId: iTopTicket.fields.ref,
          title: iTopTicket.fields.title,
          departmentId: department.id,
          userId: user.id,
          extension,
          rackLocation,
          issueDescription: fullDescription,
          // Keep the full HTML description for display
          status,
          createdAt: startDate,
          updatedAt: lastUpdateDate
        };
        this.tickets.set(id, ticket);
        ticketsWithDetails.push({
          ...ticket,
          department,
          user
        });
      }
      return ticketsWithDetails;
    } catch (error) {
      console.error("Error fetching tickets from iTop:", error);
      throw error;
    }
  }
  async createTicketInITop(ticket, userName) {
    try {
      const formData = new FormData();
      formData.append("version", ITOP_API_VERSION || "1.3");
      formData.append("auth_user", ITOP_AUTH.user || "admin");
      formData.append("auth_pwd", ITOP_AUTH.password || "Passw0rd");
      const jsonData = {
        operation: "core/create",
        comment: "Created from Ticket Tracker Pro",
        class: "UserRequest",
        output_fields: "ref",
        fields: {
          caller_id: `SELECT Person WHERE friendlyname="${userName}"`,
          org_id: ITOP_DEFAULT_ORG_ID || "3",
          // Use default if not found
          origin: "portal",
          title: ticket.title,
          description: ticket.issueDescription,
          urgency: "4",
          impact: "3",
          status: "new",
          service_id: `SELECT Service WHERE name="${ITOP_SERVICE_NAME || "Computers and peripherals"}"`,
          servicesubcategory_id: `SELECT ServiceSubcategory WHERE name="${ITOP_SERVICESUBCATEGORY_NAME || "New desktop ordering"}"`
        }
      };
      formData.append("json_data", JSON.stringify(jsonData));
      const response = await axios.post(ITOP_API_URL || "http://192.168.0.250:8111/webservices/rest.php", formData, {
        headers: {
          ...formData.getHeaders()
        }
      });
      console.log("iTop API create ticket response:", JSON.stringify(response.data, null, 2));
      const data = response.data;
      if (data.code !== 0) {
        throw new Error(`iTop API error: ${data.message}`);
      }
      if (data.objects) {
        const objectKey2 = Object.keys(data.objects)[0];
        if (objectKey2 && data.objects[objectKey2] && data.objects[objectKey2].fields && data.objects[objectKey2].fields.ref) {
          const ticketRef = data.objects[objectKey2].fields.ref;
          console.log("Ticket reference extracted directly:", ticketRef);
          return ticketRef;
        }
      }
      console.log("Could not extract ref directly, trying alternative approach");
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
      refFormData.append("version", ITOP_API_VERSION || "1.3");
      refFormData.append("auth_user", ITOP_AUTH.user || "admin");
      refFormData.append("auth_pwd", ITOP_AUTH.password || "Passw0rd");
      refFormData.append("json_data", JSON.stringify({
        operation: "core/get",
        class: "UserRequest",
        key: numericKey,
        output_fields: "ref"
      }));
      const refResponse = await axios.post(ITOP_API_URL || "http://192.168.0.250:8111/webservices/rest.php", refFormData, {
        headers: {
          ...refFormData.getHeaders()
        }
      });
      console.log("iTop API get ticket ref response:", JSON.stringify(refResponse.data, null, 2));
      const refData = refResponse.data;
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
    } catch (error) {
      console.error("Error creating ticket in iTop:", error);
      throw error;
    }
  }
};
var storage = new MemStorage();

// shared/schema.ts
import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
var departments = pgTable("departments", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  value: text("value").notNull().unique()
});
var users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  value: text("value").notNull().unique(),
  departmentId: integer("department_id").notNull().references(() => departments.id)
});
var tickets = pgTable("tickets", {
  id: serial("id").primaryKey(),
  ticketId: text("ticket_id").notNull().unique(),
  title: text("title").notNull(),
  departmentId: integer("department_id").notNull().references(() => departments.id),
  userId: integer("user_id").notNull().references(() => users.id),
  extension: text("extension").notNull(),
  rackLocation: text("rack_location").notNull(),
  issueDescription: text("issue_description").notNull(),
  status: text("status").notNull().default("open"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});
var insertDepartmentSchema = createInsertSchema(departments).omit({
  id: true
});
var insertUserSchema = createInsertSchema(users).omit({
  id: true
});
var insertTicketSchema = createInsertSchema(tickets).omit({
  id: true,
  ticketId: true,
  createdAt: true,
  updatedAt: true
}).extend({
  extension: z.string().min(1, "Extension is required"),
  rackLocation: z.string().min(1, "Rack location is required"),
  issueDescription: z.string().min(10, "Issue description must be at least 10 characters"),
  title: z.string().min(1, "Title is required")
});

// server/routes.ts
import { z as z2 } from "zod";
async function registerRoutes(app2) {
  app2.get("/api/departments", async (req, res) => {
    try {
      const departments2 = await storage.getDepartments();
      res.json(departments2);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch departments" });
    }
  });
  app2.get("/api/users", async (req, res) => {
    try {
      const departmentId = req.query.departmentId;
      let users2;
      if (departmentId) {
        users2 = await storage.getUsersByDepartment(parseInt(departmentId));
      } else {
        users2 = await storage.getUsers();
      }
      res.json(users2);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });
  app2.get("/api/tickets", async (req, res) => {
    try {
      const search = req.query.search;
      let tickets2;
      if (search) {
        tickets2 = await storage.searchTicketsByUser(search);
      } else {
        tickets2 = await storage.getTickets();
      }
      res.json(tickets2);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch tickets" });
    }
  });
  app2.get("/api/tickets/:ticketId", async (req, res) => {
    try {
      const ticket = await storage.getTicketByTicketId(req.params.ticketId);
      if (!ticket) {
        return res.status(404).json({ message: "Ticket not found" });
      }
      res.json(ticket);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch ticket" });
    }
  });
  app2.post("/api/tickets", async (req, res) => {
    try {
      const validatedData = insertTicketSchema.parse(req.body);
      const ticket = await storage.createTicket(validatedData);
      res.status(201).json(ticket);
    } catch (error) {
      console.error("Error creating ticket:", error);
      if (error instanceof z2.ZodError) {
        return res.status(400).json({ message: "Invalid ticket data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create ticket" });
    }
  });
  app2.patch("/api/tickets/:ticketId/status", async (req, res) => {
    try {
      const { status } = req.body;
      if (!status) {
        return res.status(400).json({ message: "Status is required" });
      }
      const validStatuses = ["new", "assigned", "pending", "resolved", "closed"];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          message: "Invalid status. Status must be one of: " + validStatuses.join(", ")
        });
      }
      const ticket = await storage.updateTicketStatus(req.params.ticketId, status);
      res.json(ticket);
    } catch (error) {
      if (error instanceof Error && error.message === "Ticket not found") {
        return res.status(404).json({ message: "Ticket not found" });
      }
      res.status(500).json({ message: "Failed to update ticket status" });
    }
  });
  const httpServer = createServer(app2);
  return httpServer;
}

// server/vite.ts
import express from "express";
import fs from "fs";
import path2 from "path";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
var vite_config_default = defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...process.env.NODE_ENV !== "production" && process.env.REPL_ID !== void 0 ? [
      await import("@replit/vite-plugin-cartographer").then(
        (m) => m.cartographer()
      )
    ] : []
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets")
    }
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"]
    }
  }
});

// server/vite.ts
import { nanoid } from "nanoid";
var viteLogger = createLogger();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app2, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: serverOptions,
    appType: "custom"
  });
  app2.use(vite.middlewares);
  app2.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path2.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html"
      );
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app2) {
  const distPath = path2.resolve(import.meta.dirname, "..", "dist", "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path2.resolve(distPath, "index.html"));
  });
  log(`Serving static files from ${distPath}`);
}

// server/index.ts
import cors from "cors";
dotenv.config();
var app = express2();
app.use(express2.json());
app.use(express2.urlencoded({ extended: false }));
app.use(cors());
app.use((req, res, next) => {
  const start = Date.now();
  const path3 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path3.startsWith("/api")) {
      let logLine = `${req.method} ${path3} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});
(async () => {
  const server = await registerRoutes(app);
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const port = parseInt(process.env.PORT || "5000", 10);
  server.listen({
    port,
    host: "0.0.0.0"
  }, () => {
    log(`serving on port ${port}`);
  });
})();
