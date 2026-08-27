"use server";

import { contactFormSchema } from "@/lib/validation/contact";
import { sendMail } from "@/lib/mail/transporter";
import { contactNotificationEmail, contactConfirmationEmail } from "@/lib/mail/templates";

const CONTACT_INBOX = "info@35events.com";

export type ContactFormState = { error?: string; success?: boolean; fieldErrors?: Record<string, string> };

export async function submitContact(
  _prevState: ContactFormState,
  formData: FormData,
): Promise<ContactFormState> {
  const result = contactFormSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    message: formData.get("message"),
  });
  if (!result.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of result.error.issues) {
      const key = issue.path[0];
      if (typeof key === "string" && !fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { fieldErrors };
  }

  const { name, email, message } = result.data;

  const notification = await contactNotificationEmail(name, email, message);
  const confirmation = await contactConfirmationEmail(name);

  try {
    await sendMail({ to: CONTACT_INBOX, ...notification });
    await sendMail({ to: email, ...confirmation });
  } catch {
    return { error: "Er ging iets mis bij het versturen. Probeer het later opnieuw." };
  }

  return { success: true };
}
