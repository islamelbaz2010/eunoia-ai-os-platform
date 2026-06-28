"use server";

import { redirect } from "next/navigation";
import * as z from "zod";
import { createClient } from "@/lib/supabase/server";

const credentialsSchema = z.object({
  email: z.email({ error: "Enter a valid email address." }),
  password: z.string().min(8, { error: "Password must be at least 8 characters." }),
});

export type AuthFormState = { error?: string } | undefined;
export type ResetPasswordState = { error?: string; success?: boolean } | undefined;

export async function login(
  _prevState: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const parsed = credentialsSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    return { error: error.message };
  }

  redirect("/dashboard");
}

const signupSchema = credentialsSchema.extend({
  fullName: z.string().min(2, { error: "Name must be at least 2 characters." }),
});

export async function signup(
  _prevState: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const parsed = signupSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    fullName: formData.get("fullName"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: { data: { full_name: parsed.data.fullName } },
  });

  if (error) {
    return { error: error.message };
  }

  redirect("/dashboard");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function requestPasswordReset(
  _prevState: ResetPasswordState,
  formData: FormData
): Promise<ResetPasswordState> {
  const parsed = z
    .email({ error: "Enter a valid email address." })
    .safeParse(formData.get("email"));

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid email." };
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://eunoiaos.com";
  const supabase = await createClient();

  // Always return success to prevent email enumeration.
  await supabase.auth.resetPasswordForEmail(parsed.data, {
    redirectTo: `${appUrl}/auth/callback?next=/auth/update-password`,
  });

  return { success: true };
}

export async function updatePassword(
  _prevState: ResetPasswordState,
  formData: FormData
): Promise<ResetPasswordState> {
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }
  if (password !== confirmPassword) {
    return { error: "Passwords do not match." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    return { error: error.message };
  }

  redirect("/dashboard");
}
