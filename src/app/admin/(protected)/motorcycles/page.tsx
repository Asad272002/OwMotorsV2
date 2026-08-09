import { redirect } from "next/navigation";

export default function LegacyMotorcyclesPage() {
  redirect("/admin/inventory/motorcycles");
}
