import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const departments = pgTable("departments", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  value: text("value").notNull().unique(),
});

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  value: text("value").notNull().unique(),
  departmentId: integer("department_id").notNull().references(() => departments.id),
});

export const tickets = pgTable("tickets", {
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
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertDepartmentSchema = createInsertSchema(departments).omit({
  id: true,
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
});

export const insertTicketSchema = createInsertSchema(tickets).omit({
  id: true,
  ticketId: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  extension: z.string().min(1, "Extension is required"),
  rackLocation: z.string().min(1, "Rack location is required"),
  issueDescription: z.string().min(10, "Issue description must be at least 10 characters"),
  title: z.string().min(1, "Title is required"),
});

export type Department = typeof departments.$inferSelect;
export type User = typeof users.$inferSelect;
export type Ticket = typeof tickets.$inferSelect;
export type InsertDepartment = z.infer<typeof insertDepartmentSchema>;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertTicket = z.infer<typeof insertTicketSchema>;

// Extended types for API responses
export type TicketWithDetails = Ticket & {
  department: Department;
  user: User;
};
