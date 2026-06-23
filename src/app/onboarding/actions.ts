"use server";

import { redirect } from "next/navigation";
import * as z from "zod";
import { createClient } from "@/lib/supabase/server";
import { verifySession } from "@/lib/auth/dal";

const createOrgSchema = z.object({
  organizationName: z.string().min(2, { error: "Organization name must be at least 2 characters." }),
});

export type OnboardingFormState = { error?: string } | undefined;

export async function createOrganization(
  _prevState: OnboardingFormState,
  formData: FormData
): Promise<OnboardingFormState> {
  await verifySession();

  const parsed = createOrgSchema.safeParse({
    organizationName: formData.get("organizationName"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("create_organization_for_self", {
    org_name: parsed.data.organizationName,
  });

  if (error) {
    return { error: error.message };
  }

  redirect("/dashboard");
}
