import { redirect } from "next/navigation";

export default function LegacyMediaPage() {
  redirect("/admin/inventory/media");
}
