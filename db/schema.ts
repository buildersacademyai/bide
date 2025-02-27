import { pgTable, text, serial, timestamp, jsonb, integer } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { relations } from "drizzle-orm";

export const contracts = pgTable("contracts", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").default('file'),
  path: text("path").default(''),
  parentId: integer("parent_id").references(() => contracts.id),
  sourceCode: text("source_code"),
  abi: jsonb("abi"),
  bytecode: text("bytecode"),
  address: text("address"),
  network: text("network"),
  ownerAddress: text("owner_address").notNull(), // Added owner address field
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Self-referential relation for folder hierarchy
export const contractsRelations = relations(contracts, ({ one }) => ({
  parent: one(contracts, {
    fields: [contracts.parentId],
    references: [contracts.id],
  }),
}));

export const insertContractSchema = createInsertSchema(contracts);
export const selectContractSchema = createSelectSchema(contracts);
export type InsertContract = typeof contracts.$inferInsert;
export type SelectContract = typeof contracts.$inferSelect;