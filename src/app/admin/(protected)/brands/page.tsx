import { redirect } from "next/navigation";

export default function LegacyBrandsPage() {
  redirect("/admin/inventory/brands");
}
