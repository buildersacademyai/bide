import { pgTable, text, serial, timestamp, jsonb, integer, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { relations } from "drizzle-orm";
import { z } from 'zod';

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  wallet_address: varchar("wallet_address", { length: 42 }).notNull().unique(),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

export const contracts = pgTable("contracts", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").default('file'),
  path: text("path").default(''),
  parentId: integer("parent_id").references(() => contracts.id),
  source_code: text("source_code"),
  abi: jsonb("abi"),
  bytecode: text("bytecode"),
  address: text("address"),
  network: text("network"),
  owner_id: integer("owner_id").references(() => users.id).notNull(),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

// Relations
export const contractsRelations = relations(contracts, ({ one }) => ({
  parent: one(contracts, {
    fields: [contracts.parentId],
    references: [contracts.id],
  }),
  owner: one(users, {
    fields: [contracts.owner_id],
    references: [users.id],
  }),
}));

export const userRelations = relations(users, ({ many }) => ({
  contracts: many(contracts),
}));

// Schemas
export const insertUserSchema = createInsertSchema(users);
export const selectUserSchema = createSelectSchema(users);
export const insertContractSchema = createInsertSchema(contracts);
export const selectContractSchema = createSelectSchema(contracts);

// Types
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Contract = typeof contracts.$inferSelect;
export type NewContract = typeof contracts.$inferInsert;

// Custom Zod schemas for validation
export const loginSchema = z.object({
  wallet_address: z.string().min(1, "Wallet address is required"),
});