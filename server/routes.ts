import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertTicketSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Get all departments
  app.get("/api/departments", async (req, res) => {
    try {
      const departments = await storage.getDepartments();
      res.json(departments);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch departments" });
    }
  });

  // Get users by department
  app.get("/api/users", async (req, res) => {
    try {
      const departmentId = req.query.departmentId;
      let users;
      
      if (departmentId) {
        users = await storage.getUsersByDepartment(parseInt(departmentId as string));
      } else {
        users = await storage.getUsers();
      }
      
      res.json(users);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  // Get all tickets
  app.get("/api/tickets", async (req, res) => {
    try {
      const search = req.query.search as string;
      let tickets;
      
      if (search) {
        tickets = await storage.searchTicketsByUser(search);
      } else {
        tickets = await storage.getTickets();
      }
      
      res.json(tickets);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch tickets" });
    }
  });

  // Get ticket by ID
  app.get("/api/tickets/:ticketId", async (req, res) => {
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

  // Create new ticket
  app.post("/api/tickets", async (req, res) => {
    try {
      // Validate the incoming data
      const validatedData = insertTicketSchema.parse(req.body);
      
      // Create the ticket
      const ticket = await storage.createTicket(validatedData);
      
      res.status(201).json(ticket);
    } catch (error) {
      console.error("Error creating ticket:", error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid ticket data", errors: error.errors });
      }
      
      res.status(500).json({ message: "Failed to create ticket" });
    }
  });

  // Update ticket status
  app.patch("/api/tickets/:ticketId/status", async (req, res) => {
    try {
      const { status } = req.body;
      if (!status) {
        return res.status(400).json({ message: "Status is required" });
      }
      
      // Validate status
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

  const httpServer = createServer(app);
  return httpServer;
}
