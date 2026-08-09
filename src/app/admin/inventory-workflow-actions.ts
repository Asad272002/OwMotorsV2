"use server";

import { z } from "zod";
import { getAuthorizedAdminClient } from "@/lib/admin/auth";
import { databaseAction, revalidateAdminContent, unauthorizedAction, validationAction } from "@/lib/admin/action-helpers";
import type { AdminActionState } from "@/lib/admin/action-state";
import { uuid } from "@/lib/admin/schemas";

const bulkInventorySchema = z.object({
  motorcycleIds: z.array(uuid).min(1, "Select at least one motorcycle.").max(100, "Choose 100 motorcycles or fewer."),
  bulkAction: z.enum(["archive", "restore", "feature", "unfeature"]),
});

export async function updateMotorcycleInventoryBulk(_previous: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const auth = await getAuthorizedAdminClient();
  if (!auth) return unauthorizedAction;
  const parsed = bulkInventorySchema.safeParse({ motorcycleIds: formData.getAll("motorcycleIds"), bulkAction: formData.get("bulkAction") });
  if (!parsed.success) return validationAction(parsed.error);

  const { motorcycleIds, bulkAction } = parsed.data;
  const values = bulkAction === "archive"
    ? { publication_status: "archived" as const }
    : bulkAction === "restore"
      ? { publication_status: "draft" as const }
      : { is_featured: bulkAction === "feature" };

  const { error } = await auth.supabase.from("motorcycles").update(values).in("id", motorcycleIds);
  if (error) return databaseAction("updateMotorcycleInventoryBulk", error);
  revalidateAdminContent();
  const messages = {
    archive: "Selected motorcycles archived.",
    restore: "Selected motorcycles restored as drafts.",
    feature: "Selected motorcycles marked as featured.",
    unfeature: "Selected motorcycles removed from featured displays.",
  };
  return { status: "success", message: messages[bulkAction] };
}
