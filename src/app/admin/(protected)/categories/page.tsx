import { redirect } from "next/navigation";

export default function LegacyCategoriesPage() {
  redirect("/admin/inventory/categories");
}
