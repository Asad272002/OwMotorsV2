import { redirect } from "next/navigation";

export default function LegacyNewMotorcyclePage() {
  redirect("/admin/inventory/motorcycles/new");
}
