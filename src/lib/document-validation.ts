/**
 * Inline validation for print-asset ("document") input fields.
 *
 * Pure + framework-free so it can be unit tested and reused by both the
 * editor UI (inline messages) and the save path (hard block). Returns a flat
 * map keyed by a stable field path — the same key the input renders under.
 */
import { z } from "zod";

export type DocumentFieldErrors = Record<string, string>;

const TITLE_MAX = 120;
const LABEL_MAX = 60;
const VALUE_MAX = 16;
const QUOTE_MAX = 400;
const AUTHOR_MAX = 80;
const ROLE_MAX = 80;
const NAME_MAX = 80;
const EMAIL_MAX = 254;

const titleSchema = z
  .string()
  .trim()
  .min(1, { message: "Give the document a title before saving." })
  .max(TITLE_MAX, { message: `Keep the title under ${TITLE_MAX} characters.` });

const emailSchema = z
  .string()
  .trim()
  .email({ message: "Enter a valid email address, e.g. name@company.com." })
  .max(EMAIL_MAX, { message: `Email must be under ${EMAIL_MAX} characters.` });

function firstError(result: { success: boolean; error?: z.ZodError }): string | null {
  return result.success ? null : (result.error?.issues[0]?.message ?? "Invalid value.");
}

function checkLength(value: string, max: number, label: string): string | null {
  if (value.trim().length > max) return `${label} must be under ${max} characters.`;
  return null;
}

export interface DocumentDraft {
  title: string;
  content: {
    stats?: Array<{ label?: string; value?: string }> | null;
    quote?: { text?: string; author?: string; role?: string } | null;
    expert?: { name?: string; role?: string; email?: string } | null;
  } | null;
}

/**
 * Validates every user-editable document field. Optional sections are only
 * validated once the author has started filling them in — an untouched Quote
 * panel is not an error, but a quote with no author is.
 */
export function validateDocument(draft: DocumentDraft): DocumentFieldErrors {
  const errors: DocumentFieldErrors = {};

  const titleErr = firstError(titleSchema.safeParse(draft.title ?? ""));
  if (titleErr) errors.title = titleErr;

  const content = draft.content ?? {};

  (content.stats ?? []).forEach((stat, i) => {
    const label = (stat?.label ?? "").trim();
    const value = (stat?.value ?? "").trim();
    // A stat row is "in use" as soon as either half has text.
    if (!label && !value) return;
    if (!label) errors[`stats.${i}.label`] = "Add a label so the number has context.";
    else {
      const err = checkLength(label, LABEL_MAX, "Label");
      if (err) errors[`stats.${i}.label`] = err;
    }
    if (!value) errors[`stats.${i}.value`] = "Add the figure for this stat.";
    else {
      const err = checkLength(value, VALUE_MAX, "Value");
      if (err) errors[`stats.${i}.value`] = err;
    }
  });

  const quote = content.quote;
  if (quote) {
    const text = (quote.text ?? "").trim();
    const author = (quote.author ?? "").trim();
    const role = (quote.role ?? "").trim();
    if (text || author || role) {
      if (!text) errors["quote.text"] = "Add the quote text, or clear the author and role.";
      else {
        const err = checkLength(text, QUOTE_MAX, "Quote");
        if (err) errors["quote.text"] = err;
      }
      if (!author) errors["quote.author"] = "Quotes need an attributed author.";
      else {
        const err = checkLength(author, AUTHOR_MAX, "Author");
        if (err) errors["quote.author"] = err;
      }
      const roleErr = checkLength(role, ROLE_MAX, "Role");
      if (roleErr) errors["quote.role"] = roleErr;
    }
  }

  const expert = content.expert;
  if (expert) {
    const name = (expert.name ?? "").trim();
    const role = (expert.role ?? "").trim();
    const email = (expert.email ?? "").trim();
    if (name || role || email) {
      if (!name) errors["expert.name"] = "Add a name for the contact.";
      else {
        const err = checkLength(name, NAME_MAX, "Name");
        if (err) errors["expert.name"] = err;
      }
      const roleErr = checkLength(role, ROLE_MAX, "Role");
      if (roleErr) errors["expert.role"] = roleErr;
      if (email) {
        const err = firstError(emailSchema.safeParse(email));
        if (err) errors["expert.email"] = err;
      }
    }
  }

  return errors;
}

export function errorSummary(errors: DocumentFieldErrors): string | null {
  const count = Object.keys(errors).length;
  if (count === 0) return null;
  return count === 1
    ? `Fix 1 field before saving: ${Object.values(errors)[0]}`
    : `Fix ${count} fields before saving.`;
}
