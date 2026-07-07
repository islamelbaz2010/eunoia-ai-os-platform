"use server";

export type DemoState = { error?: string; success?: boolean } | undefined;

export async function submitDemoRequest(
  _prev: DemoState,
  formData: FormData
): Promise<DemoState> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const property = String(formData.get("property") ?? "").trim();
  const propertyType = String(formData.get("propertyType") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();

  if (!name || name.length < 2) return { error: "Please enter your full name." };
  if (!email || !email.includes("@")) return { error: "Please enter a valid email address." };
  if (!property) return { error: "Please enter your property name." };

  try {
    const { sendDemoRequestEmail } = await import("@/lib/email");
    await sendDemoRequestEmail({ name, email, property, propertyType, message });
    return { success: true };
  } catch {
    return { error: "Failed to send your request. Please email us directly at hello@eunoiaos.com" };
  }
}
