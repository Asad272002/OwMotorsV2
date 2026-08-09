import { redirect } from "next/navigation";

export default async function LegacyMotorcycleEditorPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string | string[] }> }) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const tab = Array.isArray(query.tab) ? query.tab[0] : query.tab;
  redirect(`/admin/inventory/motorcycles/${id}${tab ? `?tab=${encodeURIComponent(tab)}` : ""}`);
}
