"use client";

import {
  BadgeDollarSign,
  Bell,
  Bike,
  ChevronDown,
  CircleUserRound,
  Command,
  ExternalLink,
  FilePenLine,
  History,
  Images,
  Inbox,
  LayoutDashboard,
  Menu,
  Newspaper,
  PackageSearch,
  PanelsTopLeft,
  Search,
  Settings,
  Store,
  Tags,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { logoutAdmin } from "@/app/admin/auth-actions";

type NavItem = {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
  roles?: readonly ("developer" | "admin" | "manager" | "apprentice")[];
};

type NavGroup = {
  id: string;
  label: string;
  items: readonly NavItem[];
};

const NAV_GROUPS_ALL: readonly NavGroup[] = [
  {
    id: "overview",
    label: "Overview",
    items: [{ href: "/admin", label: "Dashboard", description: "Priorities and recent activity", icon: LayoutDashboard }],
  },
  {
    id: "sales",
    label: "Sales & Customers",
    items: [
      { href: "/admin/sales/new", label: "New Sale", description: "Initiate bike sale, record payments", icon: BadgeDollarSign, roles: ["developer", "admin", "manager"] },
      { href: "/admin/sales/approvals", label: "Sale Approvals", description: "Approve pending sales & receipts", icon: FilePenLine, roles: ["developer", "admin"] },
      { href: "/admin/sales/list", label: "All Sales", description: "Complete sales list & history", icon: Store, roles: ["developer", "admin", "manager"] },
      { href: "/admin/receipts", label: "Receipts", description: "Generate & print payment receipts", icon: FilePenLine, roles: ["developer", "admin", "manager"] },
      { href: "/admin/customers", label: "Customers", description: "Customer database & lookup by CNIC", icon: Users, roles: ["developer", "admin", "manager", "apprentice"] },
    ],
  },
  {
    id: "stock",
    label: "Stock Management",
    items: [
      { href: "/admin/stock/availability", label: "Stock Availability", description: "Check bike colors in stock", icon: PackageSearch, roles: ["developer", "admin", "manager", "apprentice"] },
      { href: "/admin/stock/parts", label: "Spare Parts", description: "Inventory of parts & spares", icon: Tags, roles: ["developer", "admin", "manager"] },
      { href: "/admin/stock/movements", label: "Stock Changes", description: "Add/remove stock requests", icon: History, roles: ["developer", "admin", "manager"] },
      { href: "/admin/stock/approvals", label: "Stock Approvals", description: "Approve stock add/remove", icon: FilePenLine, roles: ["developer", "admin"] },
    ],
  },
  {
    id: "inventory",
    label: "Inventory & SEO (Developer)",
    items: [
      { href: "/admin/inventory/motorcycles", label: "Motorcycles", description: "Products, variants, and publishing", icon: Bike, roles: ["developer"] },
      { href: "/admin/inventory/blog", label: "Blog", description: "Articles, guides, and publishing", icon: Newspaper, roles: ["developer"] },
      { href: "/admin/inventory/storefront-content", label: "Storefront Content", description: "Homepage details and Brands page", icon: FilePenLine, roles: ["developer"] },
      { href: "/admin/inventory/homepage-display", label: "Banners & Rows", description: "Campaigns, product rows, and menu logos", icon: PanelsTopLeft, roles: ["developer"] },
      { href: "/admin/inventory/brands", label: "Brands", description: "Brand identity and visibility", icon: Store, roles: ["developer"] },
      { href: "/admin/inventory/categories", label: "Categories", description: "Motorcycle browsing categories", icon: Tags, roles: ["developer"] },
      { href: "/admin/inventory/stock", label: "SEO Stock & Pricing", description: "Availability and price review", icon: BadgeDollarSign, roles: ["developer"] },
      { href: "/admin/inventory/media", label: "Media", description: "Campaign and product images", icon: Images, roles: ["developer"] },
    ],
  },
  {
    id: "leads",
    label: "Leads",
    items: [
      { href: "/admin/inquiries", label: "Contact Inquiries", description: "Review dealership messages", icon: Inbox, roles: ["developer", "admin"] },
    ],
  },
  {
    id: "administration",
    label: "Administration",
    items: [
      { href: "/admin/users-access", label: "Users & Access", description: "Create/manage team logins", icon: Users, roles: ["developer", "admin"] },
      { href: "/admin/settings", label: "Settings", description: "Dealership preferences", icon: Settings, roles: ["developer", "admin"] },
      { href: "/admin/activity", label: "Activity Logs", description: "Sale, stock & user audit trail", icon: History, roles: ["developer", "admin"] },
    ],
  },
] as const;

function buildNavForRole(role: string): readonly NavGroup[] {
  const normalized = role as "developer" | "admin" | "manager" | "apprentice";
  return NAV_GROUPS_ALL
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => {
        if (!item.roles) return true;
        return item.roles.includes(normalized);
      }),
    }))
    .filter((group) => group.items.length > 0);
}

function allItems(groups: readonly NavGroup[]): readonly NavItem[] {
  return groups.flatMap((g) => g.items);
}

function isActivePath(pathname: string, href: string) {
  if (href === "/admin") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

function SidebarContent({
  pathname,
  openGroups,
  onToggleGroup,
  onNavigate,
  groups,
}: Readonly<{
  pathname: string;
  openGroups: ReadonlySet<string>;
  onToggleGroup: (id: string) => void;
  onNavigate?: () => void;
  groups: readonly NavGroup[];
}>) {
  return (
    <nav aria-label="Admin navigation" className="flex-1 overflow-y-auto px-3 pb-6 pt-4">
      {groups.map((group) => {
        const open = openGroups.has(group.id);
        const groupContainsActive = group.items.some((item) => isActivePath(pathname, item.href));
        return (
          <section key={group.id} className="mb-3" aria-labelledby={`admin-nav-${group.id}`}>
            <button
              type="button"
              id={`admin-nav-${group.id}`}
              aria-expanded={open}
              aria-controls={`admin-nav-items-${group.id}`}
              onClick={() => onToggleGroup(group.id)}
              className={`flex min-h-11 w-full items-center justify-between rounded-md px-3 text-left text-[11px] font-bold uppercase tracking-[0.16em] transition-colors duration-200 focus-visible:outline-offset-0 ${
                groupContainsActive ? "text-[#C62828]" : "text-[#6B7280] hover:bg-[#F7F7F8] hover:text-[#111111]"
              }`}
            >
              <span>{group.label}</span>
              <ChevronDown aria-hidden="true" className={`h-4 w-4 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
            </button>
            {open ? (
              <ul id={`admin-nav-items-${group.id}`} className="mt-1 space-y-1">
                {group.items.map((item) => {
                  const active = isActivePath(pathname, item.href);
                  const Icon = item.icon;
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        aria-current={active ? "page" : undefined}
                        onClick={onNavigate}
                        className={`group flex min-h-11 items-center gap-3 rounded-md border-l-[3px] px-3 py-2 text-sm font-semibold transition-colors duration-200 ${
                          active
                            ? "border-[#C62828] bg-[#FEF2F2] text-[#C62828]"
                            : "border-transparent text-[#374151] hover:border-[#E5E7EB] hover:bg-[#F7F7F8] hover:text-[#111111]"
                        }`}
                      >
                        <Icon aria-hidden="true" className={`h-[18px] w-[18px] shrink-0 ${active ? "text-[#C62828]" : "text-[#6B7280] group-hover:text-[#111111]"}`} />
                        <span>{item.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : null}
          </section>
        );
      })}
    </nav>
  );
}

function Breadcrumbs({ pathname }: Readonly<{ pathname: string }>) {
  const segments = pathname.split("/").filter(Boolean).slice(1);
  const labels: Record<string, string> = {
    inventory: "Inventory",
    "homepage-display": "Homepage Display",
    "storefront-content": "Storefront Content",
    blog: "Blog",
    brands: "Brands",
    motorcycles: "Motorcycles",
    categories: "Categories",
    stock: "Stock",
    media: "Media",
    inquiries: "Contact Inquiries",
    "users-access": "Users & Access",
    settings: "Settings",
    activity: "Activity Logs",
    new: "New",
    sales: "Sales",
    approvals: "Approvals",
    list: "All Records",
    receipts: "Receipts",
    customers: "Customers",
    availability: "Availability",
    parts: "Spare Parts",
    movements: "Changes",
  };

  return (
    <nav aria-label="Breadcrumb" className="min-w-0">
      <ol className="flex min-w-0 items-center gap-2 text-xs text-[#6B7280]">
        <li><Link href="/admin" className="font-medium transition-colors hover:text-[#C62828]">Admin</Link></li>
        {segments.map((segment, index) => {
          const href = `/admin/${segments.slice(0, index + 1).join("/")}`;
          const last = index === segments.length - 1;
          const label = labels[segment] ?? (segment.length > 20 ? "Motorcycle editor" : segment.replaceAll("-", " "));
          return (
            <li key={href} className="flex min-w-0 items-center gap-2">
              <span aria-hidden="true" className="text-[#9CA3AF]">/</span>
              {last ? <span aria-current="page" className="truncate font-semibold capitalize text-[#111111]">{label}</span> : <Link href={href} className="truncate font-medium capitalize transition-colors hover:text-[#C62828]">{label}</Link>}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function CommandPalette({ onClose, groups }: Readonly<{ onClose: () => void; groups: readonly NavGroup[] }>) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const items = allItems(groups);
  const results = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return items;
    return items.filter((item) => `${item.label} ${item.description}`.toLowerCase().includes(normalized));
  }, [query, items]);

  useEffect(() => {
    const focusTimer = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => window.clearTimeout(focusTimer);
  }, []);
  return (
    <div className="fixed inset-0 z-[80] flex items-start justify-center bg-black/35 px-4 pt-[12vh] backdrop-blur-[2px]" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="admin-command-title" className="w-full max-w-2xl overflow-hidden rounded-lg border border-[#E5E7EB] bg-white shadow-2xl" onKeyDown={(event) => { if (event.key === "Escape") onClose(); }}>
        <h2 id="admin-command-title" className="sr-only">Search the admin dashboard</h2>
        <div className="flex items-center gap-3 border-b border-[#E5E7EB] px-4">
          <Search aria-hidden="true" className="h-5 w-5 text-[#6B7280]" />
          <input ref={inputRef} value={query} onChange={(event) => setQuery(event.target.value)} className="min-h-14 min-w-0 flex-1 bg-transparent text-base text-[#111111] outline-none placeholder:text-[#9CA3AF]" placeholder="Search inventory, leads, or settings…" />
          <button type="button" onClick={onClose} className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md text-[#6B7280] hover:bg-[#F7F7F8] hover:text-[#111111]" aria-label="Close search"><X aria-hidden="true" className="h-5 w-5" /></button>
        </div>
        <div className="max-h-[55vh] overflow-y-auto p-2">
          {results.length ? (
            <ul className="space-y-1">
              {results.map((item) => {
                const Icon = item.icon;
                return <li key={item.href}><button type="button" onClick={() => { onClose(); router.push(item.href); }} className="flex min-h-14 w-full items-center gap-3 rounded-md px-3 text-left transition-colors hover:bg-[#FEF2F2] focus-visible:bg-[#FEF2F2]"><span className="flex h-9 w-9 items-center justify-center rounded-md border border-[#E5E7EB] text-[#C62828]"><Icon aria-hidden="true" className="h-[18px] w-[18px]" /></span><span><strong className="block text-sm text-[#111111]">{item.label}</strong><span className="mt-0.5 block text-xs text-[#6B7280]">{item.description}</span></span></button></li>;
              })}
            </ul>
          ) : <div className="px-4 py-12 text-center"><PackageSearch aria-hidden="true" className="mx-auto h-7 w-7 text-[#9CA3AF]" /><p className="mt-3 text-sm font-semibold text-[#111111]">No matching workspace</p><p className="mt-1 text-xs text-[#6B7280]">Try a motorcycle, brand, category, or lead.</p></div>}
        </div>
        <footer className="flex items-center justify-between border-t border-[#E5E7EB] bg-[#F7F7F8] px-4 py-2.5 text-[11px] text-[#6B7280]"><span>Navigation search</span><span>Esc to close</span></footer>
      </section>
    </div>
  );
}

function UserMenu({ name, role }: Readonly<{ name: string; role: string }>) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "OW";

  useEffect(() => {
    function closeOnOutsideClick(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, []);

  return (
    <div ref={containerRef} className="relative" onKeyDown={(event) => { if (event.key === "Escape") setOpen(false); }}>
      <button type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-haspopup="menu" className="flex min-h-11 items-center gap-2 rounded-md px-1.5 text-left transition-colors hover:bg-[#F7F7F8] sm:px-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#111111] text-xs font-bold text-white">{initials}</span>
        <span className="hidden max-w-36 sm:block"><strong className="block truncate text-xs text-[#111111]">{name}</strong><span className="mt-0.5 block text-[10px] font-semibold uppercase tracking-[0.12em] text-[#6B7280]">{role}</span></span>
        <ChevronDown aria-hidden="true" className={`hidden h-4 w-4 text-[#6B7280] transition-transform sm:block ${open ? "rotate-180" : ""}`} />
      </button>
      {open ? (
        <div role="menu" className="absolute right-0 top-[calc(100%+0.5rem)] z-50 w-64 rounded-md border border-[#E5E7EB] bg-white p-2 shadow-xl">
          <div className="border-b border-[#E5E7EB] px-3 py-3"><p className="truncate text-sm font-semibold text-[#111111]">{name}</p><p className="mt-1 text-xs capitalize text-[#6B7280]">{role} access</p></div>
          <Link href="/" target="_blank" rel="noreferrer" className="mt-2 flex min-h-11 items-center gap-3 rounded-md px-3 text-sm font-medium text-[#374151] hover:bg-[#F7F7F8]" role="menuitem"><ExternalLink aria-hidden="true" className="h-4 w-4" />View website</Link>
          <form action={logoutAdmin}><button type="submit" role="menuitem" className="flex min-h-11 w-full items-center gap-3 rounded-md px-3 text-left text-sm font-semibold text-[#C62828] hover:bg-[#FEF2F2]"><CircleUserRound aria-hidden="true" className="h-4 w-4" />Sign out</button></form>
        </div>
      ) : null}
    </div>
  );
}

export function AdminShell({ children, actorName, actorRole }: Readonly<{ children: React.ReactNode; actorName: string; actorRole: string }>) {
  const pathname = usePathname();
  const mobileCloseRef = useRef<HTMLButtonElement>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const groups = useMemo(() => buildNavForRole(actorRole), [actorRole]);
  const groupKey = useMemo(() => groups.map(g => g.id).join("|"), [groups]);
  const [openGroups, setOpenGroups] = useState<Set<string>>(() => new Set(groups.map((group) => group.id)));

  function toggleGroup(id: string) {
    setOpenGroups((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  useEffect(() => {
    function handleShortcut(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen(true);
      }
      if (event.key === "Escape") {
        setMobileOpen(false);
        setSearchOpen(false);
      }
    }
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, []);

  useEffect(() => {
    if (!mobileOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusTimer = window.setTimeout(() => mobileCloseRef.current?.focus(), 0);
    return () => {
      window.clearTimeout(focusTimer);
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileOpen]);

  return (
    <div className="admin-scope min-h-screen bg-[#F7F7F8] text-[#111111] lg:grid lg:grid-cols-[280px_minmax(0,1fr)]">
      <a href="#admin-main" className="sr-only z-[100] bg-white px-4 py-3 font-semibold text-[#C62828] focus:not-sr-only focus:fixed focus:left-4 focus:top-4">Skip to dashboard content</a>
      <aside className="sticky top-0 hidden h-screen flex-col border-r border-[#E5E7EB] bg-white lg:flex">
        <div className="flex h-[72px] items-center border-b border-[#E5E7EB] px-5">
          <Link href="/admin" className="flex min-h-11 items-center gap-3 rounded-md focus-visible:outline-offset-2">
            <span className="flex h-10 w-14 items-center justify-center rounded-md border border-[#E5E7EB] bg-white"><Image src="/images/ow-motors-logo.png" alt="OW Motors" width={1536} height={1024} className="h-8 w-auto object-contain" priority /></span>
            <span><strong className="block font-display text-lg leading-none">OW MOTORS</strong><span className="mt-1 block text-[10px] font-bold uppercase tracking-[0.16em] text-[#C62828]">ERP</span></span>
          </Link>
        </div>
        <SidebarContent pathname={pathname} openGroups={openGroups} onToggleGroup={toggleGroup} groups={groups} />
        <div className="border-t border-[#E5E7EB] p-4"><Link href="/" target="_blank" rel="noreferrer" className="flex min-h-11 items-center justify-between rounded-md px-3 text-sm font-semibold text-[#374151] transition-colors hover:bg-[#F7F7F8] hover:text-[#C62828]"><span>View website</span><ExternalLink aria-hidden="true" className="h-4 w-4" /></Link></div>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-40 flex h-[72px] items-center gap-3 border-b border-[#E5E7EB] bg-white/95 px-4 backdrop-blur sm:px-6 lg:px-8">
          <button type="button" onClick={() => setMobileOpen(true)} className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border border-[#E5E7EB] text-[#111111] hover:border-[#C62828] hover:bg-[#FEF2F2] hover:text-[#C62828] lg:hidden" aria-label="Open admin navigation"><Menu aria-hidden="true" className="h-5 w-5" /></button>
          <button type="button" onClick={() => setSearchOpen(true)} className="flex min-h-11 min-w-0 flex-1 items-center gap-3 rounded-md border border-[#E5E7EB] bg-[#F7F7F8] px-3 text-left text-sm text-[#6B7280] transition-colors hover:border-[#C62828] hover:bg-white sm:max-w-xl" aria-label="Search admin dashboard">
            <Search aria-hidden="true" className="h-[18px] w-[18px] shrink-0" /><span className="truncate">Search sales, customers, stock, or settings</span><span className="ml-auto hidden items-center gap-1 rounded border border-[#D1D5DB] bg-white px-1.5 py-0.5 text-[10px] font-semibold text-[#6B7280] sm:inline-flex"><Command aria-hidden="true" className="h-3 w-3" />K</span>
          </button>
          <Link href="/admin#attention" className="relative inline-flex min-h-11 min-w-11 items-center justify-center rounded-md text-[#6B7280] transition-colors hover:bg-[#FEF2F2] hover:text-[#C62828]" aria-label="Review dashboard attention summary"><Bell aria-hidden="true" className="h-5 w-5" /><span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full border-2 border-white bg-[#D97706]" /><span className="sr-only">Attention summary</span></Link>
          <UserMenu name={actorName} role={actorRole} />
        </header>
        <div className="border-b border-[#E5E7EB] bg-white px-4 py-3 sm:px-6 lg:px-8"><Breadcrumbs pathname={pathname} /></div>
        <main id="admin-main" className="mx-auto max-w-[1500px] p-4 sm:p-6 lg:p-8 xl:p-10">{children}</main>
      </div>

      {mobileOpen ? (
        <div className="fixed inset-0 z-[70] lg:hidden" role="presentation">
          <button type="button" className="absolute inset-0 bg-black/40 backdrop-blur-[1px]" onClick={() => setMobileOpen(false)} aria-label="Close admin navigation" />
          <aside role="dialog" aria-modal="true" aria-label="Admin navigation" className="admin-drawer-enter relative flex h-full w-[min(22rem,90vw)] flex-col border-r border-[#E5E7EB] bg-white shadow-2xl">
            <div className="flex h-[72px] items-center justify-between border-b border-[#E5E7EB] px-4">
              <Link href="/admin" onClick={() => setMobileOpen(false)} className="flex min-h-11 items-center gap-3"><span className="flex h-10 w-14 items-center justify-center rounded-md border border-[#E5E7EB]"><Image src="/images/ow-motors-logo.png" alt="OW Motors" width={1536} height={1024} className="h-8 w-auto object-contain" /></span><span className="font-display text-lg font-bold">ERP</span></Link>
              <button ref={mobileCloseRef} type="button" onClick={() => setMobileOpen(false)} className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md text-[#6B7280] hover:bg-[#F7F7F8] hover:text-[#111111]" aria-label="Close admin navigation"><X aria-hidden="true" className="h-5 w-5" /></button>
            </div>
            <SidebarContent pathname={pathname} openGroups={openGroups} onToggleGroup={toggleGroup} onNavigate={() => setMobileOpen(false)} groups={groups} />
          </aside>
        </div>
      ) : null}
      {searchOpen ? <CommandPalette onClose={() => setSearchOpen(false)} groups={groups} /> : null}
    </div>
  );
}
