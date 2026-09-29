import { getDb } from "@/db/client";
import { clientContacts } from "@/db/schema";

export type ParsedClientContact = {
  slot: string;
  name: string;
  phone: string | null;
  email: string | null;
};

export function parseClientContactsFromForm(formData: FormData): ParsedClientContact[] {
  const slots = new Set<string>();
  for (const key of formData.keys()) {
    const m = /^contact_(.+)_name$/.exec(key);
    if (m) slots.add(m[1]);
  }

  const contacts: ParsedClientContact[] = [];
  for (const slot of slots) {
    const name = String(formData.get(`contact_${slot}_name`) ?? "").trim();
    if (!name) continue;
    const phone = String(formData.get(`contact_${slot}_phone`) ?? "").trim() || null;
    const email = String(formData.get(`contact_${slot}_email`) ?? "").trim() || null;
    contacts.push({ slot, name, phone, email });
  }

  return contacts;
}

export function resolvePrimaryContactSlot(
  formData: FormData,
  contacts: ParsedClientContact[],
): string | null {
  const chosen = String(formData.get("primaryContactSlot") ?? "").trim();
  if (chosen && contacts.some((c) => c.slot === chosen)) return chosen;
  return contacts[0]?.slot ?? null;
}

export async function insertClientContacts(
  db: ReturnType<typeof getDb>,
  clientId: string,
  contacts: ParsedClientContact[],
  primarySlot: string | null,
) {
  if (contacts.length === 0) return;

  for (const c of contacts) {
    await db.insert(clientContacts).values({
      clientId,
      name: c.name,
      phone: c.phone,
      email: c.email,
      isPrimary: c.slot === primarySlot,
    });
  }
}
