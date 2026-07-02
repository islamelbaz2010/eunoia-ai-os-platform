import { describe, it, expect } from "vitest";
import * as z from "zod";
import { PIPELINE_STAGES, type CrmPipelineStage } from "@/lib/types";

// ─── Pipeline stages ─────────────────────────────────────────────────────────

describe("PIPELINE_STAGES", () => {
  it("has exactly 6 stages", () => {
    expect(PIPELINE_STAGES).toHaveLength(6);
  });

  it("stages are in correct order", () => {
    const values = PIPELINE_STAGES.map(s => s.value);
    expect(values).toEqual(["lead", "qualified", "proposal", "negotiation", "won", "lost"]);
  });

  it("every stage has a label and color", () => {
    for (const stage of PIPELINE_STAGES) {
      expect(stage.label).toBeTruthy();
      expect(stage.color).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });
});

// ─── Contact validation schema ────────────────────────────────────────────────

const phoneRegex = /^\+?[\d\s\-().]{7,30}$/;
const contactSchema = z.object({
  fullName:    z.string().min(2).max(100).trim(),
  email:       z.email().optional().or(z.literal("")),
  phone:       z.string().regex(phoneRegex).optional().or(z.literal("")),
  company:     z.string().max(200).trim().optional().or(z.literal("")),
  website:     z.url().optional().or(z.literal("")),
  linkedinUrl: z.url().optional().or(z.literal("")),
  notes:       z.string().max(5000).optional().or(z.literal("")),
  status:      z.enum(["new","contacted","qualified","won","lost"]).optional(),
  stage:       z.enum(["lead","qualified","proposal","negotiation","won","lost"]).optional(),
});

describe("contact validation", () => {
  it("accepts minimal valid contact", () => {
    const result = contactSchema.safeParse({ fullName: "Ahmed Ali" });
    expect(result.success).toBe(true);
  });

  it("rejects name shorter than 2 characters", () => {
    const result = contactSchema.safeParse({ fullName: "A" });
    expect(result.success).toBe(false);
  });

  it("rejects name longer than 100 characters", () => {
    const result = contactSchema.safeParse({ fullName: "A".repeat(101) });
    expect(result.success).toBe(false);
  });

  it("accepts blank email (optional)", () => {
    const result = contactSchema.safeParse({ fullName: "John", email: "" });
    expect(result.success).toBe(true);
  });

  it("rejects invalid email", () => {
    const result = contactSchema.safeParse({ fullName: "John", email: "not-an-email" });
    expect(result.success).toBe(false);
  });

  it("accepts valid international email", () => {
    const result = contactSchema.safeParse({ fullName: "John", email: "user@example.co.uk" });
    expect(result.success).toBe(true);
  });

  it("accepts blank phone (optional)", () => {
    const result = contactSchema.safeParse({ fullName: "John", phone: "" });
    expect(result.success).toBe(true);
  });

  it("accepts valid phone formats", () => {
    const phones = ["+1 (555) 000-0000", "+971501234567", "0501234567", "+44 20 7946 0958"];
    for (const phone of phones) {
      const result = contactSchema.safeParse({ fullName: "John", phone });
      expect(result.success, `Expected ${phone} to be valid`).toBe(true);
    }
  });

  it("rejects phone too short", () => {
    const result = contactSchema.safeParse({ fullName: "John", phone: "123" });
    expect(result.success).toBe(false);
  });

  it("accepts valid https website", () => {
    const result = contactSchema.safeParse({ fullName: "John", website: "https://example.com" });
    expect(result.success).toBe(true);
  });

  it("rejects website without protocol", () => {
    const result = contactSchema.safeParse({ fullName: "John", website: "example.com" });
    expect(result.success).toBe(false);
  });

  it("accepts blank website (optional)", () => {
    const result = contactSchema.safeParse({ fullName: "John", website: "" });
    expect(result.success).toBe(true);
  });

  it("accepts all valid pipeline stages", () => {
    const stages: CrmPipelineStage[] = ["lead","qualified","proposal","negotiation","won","lost"];
    for (const stage of stages) {
      const result = contactSchema.safeParse({ fullName: "John", stage });
      expect(result.success, `Expected stage ${stage} to be valid`).toBe(true);
    }
  });

  it("rejects invalid pipeline stage", () => {
    const result = contactSchema.safeParse({ fullName: "John", stage: "cold" });
    expect(result.success).toBe(false);
  });

  it("accepts all valid status values", () => {
    const statuses = ["new","contacted","qualified","won","lost"];
    for (const status of statuses) {
      const result = contactSchema.safeParse({ fullName: "John", status });
      expect(result.success, `Expected status ${status} to be valid`).toBe(true);
    }
  });

  it("notes max 5000 characters", () => {
    const ok = contactSchema.safeParse({ fullName: "John", notes: "X".repeat(5000) });
    expect(ok.success).toBe(true);
    const fail = contactSchema.safeParse({ fullName: "John", notes: "X".repeat(5001) });
    expect(fail.success).toBe(false);
  });

  it("trims whitespace from fullName", () => {
    const result = contactSchema.safeParse({ fullName: "  Ahmed  " });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.fullName).toBe("Ahmed");
  });

  it("full contact with all fields", () => {
    const result = contactSchema.safeParse({
      fullName:    "Ahmed Al-Farsi",
      email:       "ahmed@example.com",
      phone:       "+971501234567",
      company:     "Grand Palace Hotel",
      website:     "https://grandpalace.com",
      linkedinUrl: "https://linkedin.com/in/ahmed",
      notes:       "VIP guest, prefers suite",
      status:      "qualified",
      stage:       "proposal",
    });
    expect(result.success).toBe(true);
  });
});

// ─── Tag validation schema ────────────────────────────────────────────────────

const tagSchema = z.object({
  name:  z.string().min(1).max(40).trim(),
  color: z.string().regex(/^#[0-9a-f]{6}$/i).optional(),
});

describe("tag validation", () => {
  it("accepts minimal tag", () => {
    expect(tagSchema.safeParse({ name: "VIP" }).success).toBe(true);
  });

  it("rejects empty name", () => {
    expect(tagSchema.safeParse({ name: "" }).success).toBe(false);
  });

  it("rejects name longer than 40 chars", () => {
    expect(tagSchema.safeParse({ name: "X".repeat(41) }).success).toBe(false);
  });

  it("accepts valid hex color", () => {
    expect(tagSchema.safeParse({ name: "VIP", color: "#6366f1" }).success).toBe(true);
    expect(tagSchema.safeParse({ name: "VIP", color: "#FFFFFF" }).success).toBe(true);
  });

  it("rejects invalid hex color", () => {
    expect(tagSchema.safeParse({ name: "VIP", color: "red" }).success).toBe(false);
    expect(tagSchema.safeParse({ name: "VIP", color: "#fff" }).success).toBe(false);
  });
});

// ─── Timeline event validation ────────────────────────────────────────────────

const timelineSchema = z.object({
  eventType: z.enum(["note","call","meeting","email","whatsapp","system"]),
  title:     z.string().min(1).max(200).trim(),
  body:      z.string().max(10000).optional().or(z.literal("")),
});

describe("timeline event validation", () => {
  it("accepts all event types", () => {
    const types = ["note","call","meeting","email","whatsapp","system"];
    for (const eventType of types) {
      expect(timelineSchema.safeParse({ eventType, title: "Test" }).success).toBe(true);
    }
  });

  it("rejects invalid event type", () => {
    expect(timelineSchema.safeParse({ eventType: "sms", title: "Test" }).success).toBe(false);
  });

  it("rejects empty title", () => {
    expect(timelineSchema.safeParse({ eventType: "note", title: "" }).success).toBe(false);
  });

  it("accepts event with body", () => {
    const r = timelineSchema.safeParse({ eventType: "call", title: "Called client", body: "Discussed renewal" });
    expect(r.success).toBe(true);
  });
});

// ─── Activity validation schema ───────────────────────────────────────────────

const activitySchema = z.object({
  type:  z.enum(["task","follow_up","call","meeting","email"]),
  title: z.string().min(1).max(200).trim(),
  dueAt: z.string().datetime({ offset: true }).optional().or(z.literal("")),
});

describe("activity validation", () => {
  it("accepts all activity types", () => {
    const types = ["task","follow_up","call","meeting","email"];
    for (const type of types) {
      expect(activitySchema.safeParse({ type, title: "Test" }).success).toBe(true);
    }
  });

  it("rejects invalid type", () => {
    expect(activitySchema.safeParse({ type: "reminder", title: "Test" }).success).toBe(false);
  });

  it("accepts ISO 8601 datetime with offset", () => {
    const r = activitySchema.safeParse({
      type: "call",
      title: "Follow up call",
      dueAt: "2026-08-01T10:00:00+04:00",
    });
    expect(r.success).toBe(true);
  });

  it("rejects invalid datetime", () => {
    const r = activitySchema.safeParse({ type: "call", title: "Test", dueAt: "not-a-date" });
    expect(r.success).toBe(false);
  });
});

// ─── CSV parsing logic ────────────────────────────────────────────────────────

const VALID_STAGES_CSV = new Set(["lead","qualified","proposal","negotiation","won","lost"]);
const VALID_STATUSES_CSV = new Set(["new","contacted","qualified","won","lost"]);

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    if (line[i] === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else { inQuotes = !inQuotes; }
    } else if (line[i] === ',' && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += line[i];
    }
  }
  result.push(current);
  return result;
}

describe("CSV import parsing", () => {
  it("parses basic CSV line", () => {
    expect(parseCSVLine("John,john@example.com,+1234567890")).toEqual([
      "John", "john@example.com", "+1234567890"
    ]);
  });

  it("handles quoted fields with commas", () => {
    expect(parseCSVLine('"Smith, John",john@example.com')).toEqual([
      "Smith, John", "john@example.com"
    ]);
  });

  it("handles escaped quotes in fields", () => {
    expect(parseCSVLine('"He said ""Hello"""')).toEqual(['He said "Hello"']);
  });

  it("handles empty fields", () => {
    expect(parseCSVLine("John,,company")).toEqual(["John", "", "company"]);
  });

  it("VALID_STAGES accepts all pipeline stages", () => {
    const stages = ["lead","qualified","proposal","negotiation","won","lost"];
    for (const s of stages) {
      expect(VALID_STAGES_CSV.has(s)).toBe(true);
    }
  });

  it("VALID_STAGES rejects unknown stages", () => {
    expect(VALID_STAGES_CSV.has("cold")).toBe(false);
    expect(VALID_STAGES_CSV.has("pending")).toBe(false);
  });

  it("VALID_STATUSES accepts all statuses", () => {
    const statuses = ["new","contacted","qualified","won","lost"];
    for (const s of statuses) {
      expect(VALID_STATUSES_CSV.has(s)).toBe(true);
    }
  });
});

// ─── CRM types check ─────────────────────────────────────────────────────────

describe("CRM types", () => {
  it("PIPELINE_STAGES covers all stages from migration constraint", () => {
    const migrationStages = ["lead","qualified","proposal","negotiation","won","lost"];
    const typeStages = PIPELINE_STAGES.map(s => s.value);
    expect(new Set(typeStages)).toEqual(new Set(migrationStages));
  });
});
