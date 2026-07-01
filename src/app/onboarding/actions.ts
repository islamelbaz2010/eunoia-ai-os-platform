"use server";

import { redirect } from "next/navigation";
import * as z from "zod";
import { createClient } from "@/lib/supabase/server";
import { verifySession } from "@/lib/auth/dal";
import { slugify } from "@/lib/utils";

const orgSchema = z.object({
  name: z
    .string()
    .min(2, { error: "Organization name must be at least 2 characters." })
    .max(80, { error: "Organization name must be 80 characters or fewer." })
    .trim(),
});

export type OnboardingState = { error?: string } | undefined;

export async function createOrganization(
  _prevState: OnboardingState,
  formData: FormData
): Promise<OnboardingState> {
  await verifySession();

  const parsed = orgSchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const slug = slugify(parsed.data.name);
  const supabase = await createClient();

  const { error } = await supabase.rpc("create_organization", {
    org_name: parsed.data.name,
    org_slug: slug,
  });

  if (error) {
    if (error.code === "PGRST202" || error.code === "PGRST205") {
      return { error: "Workspace creation is temporarily unavailable. Please contact support." };
    }
    if (error.message && !error.message.includes("public.") && !error.message.includes("schema cache")) {
      return { error: error.message };
    }
    return { error: "Failed to create workspace. Please try again." };
  }

  redirect("/dashboard");
}
