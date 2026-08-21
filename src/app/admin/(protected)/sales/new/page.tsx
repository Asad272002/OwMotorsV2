import NewSalePageClient from "./client";
import { listBanks, listMotorcycleVariantsForSale, listMotorcycleStockUnitsForSale, listCustomers } from "@/lib/erp/queries";
import { getAuthenticatedProfile } from "@/lib/supabase/auth";

export const metadata = { title: "New Sale" };

export default async function NewSalePage() {
  const actor = await getAuthenticatedProfile();
  const [variants, stockUnits, banks, customers] = await Promise.all([
    listMotorcycleVariantsForSale(),
    listMotorcycleStockUnitsForSale(),
    listBanks(),
    listCustomers(),
  ]);
  return (
    <NewSalePageClient
      variants={JSON.parse(JSON.stringify(variants))}
      stockUnits={JSON.parse(JSON.stringify(stockUnits))}
      banks={JSON.parse(JSON.stringify(banks))}
      customers={JSON.parse(JSON.stringify(customers))}
      myProfileId={actor?.profile.id ?? null}
    />
  );
}

