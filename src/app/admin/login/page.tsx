import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";
import { LockKeyhole } from "lucide-react";
import { LoginForm } from "@/components/admin/login-form";
import { getStaffActor } from "@/lib/admin/auth";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Admin Sign In", robots: { index: false, follow: false } };

export default async function AdminLoginPage() {
  if (await getStaffActor()) redirect("/admin");
  return <main className="admin-scope grid min-h-screen bg-[#F7F7F8] lg:grid-cols-[minmax(0,0.9fr)_minmax(32rem,1.1fr)]"><section className="hidden bg-[#111111] p-12 text-white lg:flex lg:flex-col lg:justify-between xl:p-16"><Image src="/images/ow-motors-logo.png" alt="OW Motors" width={1536} height={1024} className="h-16 w-auto self-start rounded-md bg-white object-contain px-3" priority /><div className="max-w-xl"><p className="text-[11px] font-bold uppercase tracking-[0.18em] text-red-300">OW Motors Administration</p><p className="mt-4 font-display text-5xl font-bold leading-[1.02] xl:text-6xl">Run the dealership website with clarity.</p><p className="mt-5 max-w-lg text-base leading-7 text-gray-300">Manage inventory, website content, and customer follow-ups from one protected workspace.</p></div><p className="text-xs text-gray-500">Authorized team access only</p></section><section className="flex items-center justify-center px-5 py-12 sm:px-8"><div className="w-full max-w-md rounded-lg border border-[#E5E7EB] bg-white p-7 shadow-[0_16px_40px_rgb(17_17_17/0.08)] sm:p-10"><div className="flex h-11 w-11 items-center justify-center rounded-md bg-[#FEF2F2] text-[#C62828]"><LockKeyhole aria-hidden="true" className="h-5 w-5" /></div><p className="mt-6 text-[11px] font-bold uppercase tracking-[0.18em] text-[#C62828]">Protected workspace</p><h1 className="mt-2 font-display text-4xl font-bold leading-none text-[#111111]">Sign in</h1><p className="mt-3 text-sm leading-6 text-[#6B7280]">Use your active OW Motors administrator or editor account.</p><div className="mt-8"><LoginForm /></div></div></section></main>;
}
