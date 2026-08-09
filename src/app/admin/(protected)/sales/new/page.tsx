import NewSalePageClient from "./client";
import { listBanks, listMotorcycleVariantsForSale, listCustomers } from "@/lib/erp/queries";
import { getAuthenticatedProfile } from "@/lib/supabase/auth";

export const metadata = { title: "New Sale" };

export default async function NewSalePage() {
  const actor = await getAuthenticatedProfile();
  const [variants, banks, customers] = await Promise.all([
    listMotorcycleVariantsForSale(),
    listBanks(),
    listCustomers(),
  ]);
  return (
    <NewSalePageClient
      variants={JSON.parse(JSON.stringify(variants))}
      banks={JSON.parse(JSON.stringify(banks))}
      customers={JSON.parse(JSON.stringify(customers))}
      myProfileId={actor?.profile.id ?? null}
    />
  );
}
