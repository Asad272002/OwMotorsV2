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
  ShoppingCart,
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
    label: "Home",
    items: [{ href: "/admin", label: "Dashboard", description: "Overview", icon: LayoutDashboard }],
  },
  {
    id: "sales",
    label: "Sales",
    items: [
      { href: "/admin/sales/new", label: "Sell Bike", description: "Bike sale", icon: BadgeDollarSign, roles: ["developer", "admin", "manager"] },
      { href: "/admin/stock/part-sales", label: "Sell Parts", description: "Spare-part sale", icon: ShoppingCart, roles: ["developer", "admin", "manager"] },
      { href: "/admin/sales/list", label: "All Sales", description: "Sales register", icon: Store, roles: ["developer", "admin", "manager"] },
      { href: "/admin/receipts", label: "Receipts", description: "Receipts", icon: FilePenLine, roles: ["developer", "admin", "manager"] },
      { href: "/admin/customers", label: "Customers", description: "Customer records", icon: Users, roles: ["developer", "admin", "manager", "apprentice"] },
    ],
  },
  {
    id: "inventory",
    label: "Inventory",
    items: [
      { href: "/admin/stock/availability", label: "Stock Availability", description: "Current stock", icon: PackageSearch, roles: ["developer", "admin", "manager", "apprentice"] },
      { href: "/admin/stock/bikes/new", label: "Add Bike", description: "New bike model", icon: Bike, roles: ["developer", "admin", "manager"] },
      { href: "/admin/stock/parts", label: "Spare Parts", description: "Parts catalog", icon: Tags, roles: ["developer", "admin", "manager"] },
      { href: "/admin/stock/movements", label: "Stock Changes", description: "Stock requests", icon: History, roles: ["developer", "admin", "manager"] },
    ],
  },
  {
    id: "approvals",
    label: "Approvals",
    items: [
      { href: "/admin/sales/approvals", label: "Sales Approval", description: "Approve sales", icon: FilePenLine, roles: ["developer", "admin"] },
      { href: "/admin/stock/approvals", label: "Stock Approval", description: "Approve stock", icon: FilePenLine, roles: ["developer", "admin"] },
    ],
  },
  {
    id: "leads",
    label: "Leads",
    items: [
      { href: "/admin/inquiries", label: "Contact Inquiries", description: "Messages", icon: Inbox, roles: ["developer", "admin"] },
    ],
  },
  {
    id: "administration",
    label: "Admin",
    items: [
      { href: "/admin/users-access", label: "Users & Access", description: "Team access", icon: Users, roles: ["developer", "admin"] },
      { href: "/admin/activity", label: "Activity Logs", description: "Audit trail", icon: History, roles: ["developer", "admin"] },
      { href: "/admin/settings", label: "Settings", description: "Settings", icon: Settings, roles: ["developer", "admin"] },
    ],
  },
  {
    id: "website",
    label: "Website",
    items: [
      { href: "/admin/inventory/motorcycles", label: "Website Bikes", description: "Public catalog", icon: Bike, roles: ["developer"] },
      { href: "/admin/inventory/brands", label: "Website Brands", description: "Brand pages", icon: Store, roles: ["developer"] },
      { href: "/admin/inventory/categories", label: "Website Categories", description: "Category pages", icon: Tags, roles: ["developer"] },
      { href: "/admin/inventory/homepage-display", label: "Homepage Display", description: "Homepage rows", icon: PanelsTopLeft, roles: ["developer"] },
      { href: "/admin/inventory/storefront-content", label: "Storefront Content", description: "Page copy", icon: FilePenLine, roles: ["developer"] },
      { href: "/admin/inventory/blog", label: "Blog", description: "Articles", icon: Newspaper, roles: ["developer"] },
      { href: "/admin/inventory/media", label: "Media", description: "Images", icon: Images, roles: ["developer"] },
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
          <section key={group.id} className="mb-4 border-t border-[#F1F2F4] pt-3 first:border-t-0 first:pt-0" aria-labelledby={`admin-nav-${group.id}`}>
            <button
              type="button"
              id={`admin-nav-${group.id}`}
              aria-expanded={open}
              aria-controls={`admin-nav-items-${group.id}`}
              onClick={() => onToggleGroup(group.id)}
              className={`flex min-h-10 w-full items-center justify-between rounded-md px-3 text-left text-[11px] font-bold uppercase tracking-[0.18em] transition-colors duration-200 focus-visible:outline-offset-0 ${
                groupContainsActive ? "bg-[#FEF2F2] text-[#C62828]" : "text-[#6B7280] hover:bg-[#F7F7F8] hover:text-[#111111]"
              }`}
            >
              <span>{group.label}</span>
              <ChevronDown aria-hidden="true" className={`h-4 w-4 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
            </button>
            {open ? (
              <ul id={`admin-nav-items-${group.id}`} className="mt-1 space-y-1 pl-1">
                {group.items.map((item) => {
                  const active = isActivePath(pathname, item.href);
                  const Icon = item.icon;
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        aria-current={active ? "page" : undefined}
                        onClick={onNavigate}
                        className={`group flex min-h-10 items-center gap-3 rounded-md border-l-[3px] px-3 py-2 text-sm font-semibold transition-colors duration-200 ${
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
    bikes: "Bikes",
    parts: "Spare Parts",
    "part-sales": "Part Sales",
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
          <input ref={inputRef} value={query} onChange={(event) => setQuery(event.target.value)} className="min-h-14 min-w-0 flex-1 bg-transparent text-base text-[#111111] outline-none placeholder:text-[#9CA3AF]" placeholder="Search sales, stock, customers..." />
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
          ) : <div className="px-4 py-12 text-center"><PackageSearch aria-hidden="true" className="mx-auto h-7 w-7 text-[#9CA3AF]" /><p className="mt-3 text-sm font-semibold text-[#111111]">No result</p><p className="mt-1 text-xs text-[#6B7280]">Try another search.</p></div>}
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
  const roleLabel = role.charAt(0).toUpperCase() + role.slice(1);

  useEffect(() => {
    function closeOnOutsideClick(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, []);

  return (
    <div ref={containerRef} className="relative" onKeyDown={(event) => { if (event.key === "Escape") setOpen(false); }}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex h-12 items-center gap-3 rounded-full border border-[#E5E7EB] bg-white px-2.5 pr-3 text-left shadow-[0_1px_2px_rgb(0_0_0/0.04)] transition-colors hover:border-[#C62828]/40 hover:bg-[#FAFAFA]"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#111111] text-xs font-bold text-white ring-2 ring-[#F3F4F6]">{initials}</span>
        <span className="hidden min-w-0 sm:block">
          <span className="flex min-w-0 items-center gap-2">
            <strong className="max-w-36 truncate text-xs font-bold leading-none text-[#111111]">{name}</strong>
            <span className="admin-role-badge inline-flex shrink-0 items-center rounded-full border border-[#FECACA] bg-[#FEF2F2] px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.12em] text-[#C62828]">{roleLabel}</span>
          </span>
          <span className="mt-1 block text-[10px] font-medium text-[#6B7280]">Signed in</span>
        </span>
        <ChevronDown aria-hidden="true" className={`h-4 w-4 shrink-0 text-[#6B7280] transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open ? (
        <div role="menu" className="absolute right-0 top-[calc(100%+0.55rem)] z-50 w-72 overflow-hidden rounded-lg border border-[#E5E7EB] bg-white shadow-2xl">
          <div className="bg-[#FAFAFA] px-4 py-4">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#111111] text-xs font-bold text-white">{initials}</span>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-[#111111]">{name}</p>
                <span className="admin-role-badge mt-1 inline-flex rounded-full border border-[#FECACA] bg-[#FEF2F2] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[#C62828]">{roleLabel} access</span>
              </div>
            </div>
          </div>
          <div className="p-2">
            <Link href="/" target="_blank" rel="noreferrer" className="flex min-h-11 items-center gap-3 rounded-md px-3 text-sm font-medium text-[#374151] hover:bg-[#F7F7F8]" role="menuitem"><ExternalLink aria-hidden="true" className="h-4 w-4" />View website</Link>
            <form action={logoutAdmin}><button type="submit" role="menuitem" className="flex min-h-11 w-full items-center gap-3 rounded-md px-3 text-left text-sm font-semibold text-[#C62828] hover:bg-[#FEF2F2]"><CircleUserRound aria-hidden="true" className="h-4 w-4" />Sign out</button></form>
          </div>
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
        <header className="sticky top-0 z-40 flex h-[72px] items-center gap-4 border-b border-[#E5E7EB] bg-white/95 px-4 backdrop-blur sm:px-6 lg:px-8">
          <button type="button" onClick={() => setMobileOpen(true)} className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border border-[#E5E7EB] text-[#111111] hover:border-[#C62828] hover:bg-[#FEF2F2] hover:text-[#C62828] lg:hidden" aria-label="Open admin navigation"><Menu aria-hidden="true" className="h-5 w-5" /></button>
          <button type="button" onClick={() => setSearchOpen(true)} className="flex h-12 min-w-0 flex-1 items-center gap-3 rounded-lg border border-[#E5E7EB] bg-[#F7F7F8] px-4 text-left text-sm text-[#6B7280] shadow-[0_1px_2px_rgb(0_0_0/0.03)] transition-colors hover:border-[#C62828]/50 hover:bg-white sm:max-w-2xl" aria-label="Search admin dashboard">
            <Search aria-hidden="true" className="h-[18px] w-[18px] shrink-0" /><span className="truncate">Search sales, stock, customers</span><span className="ml-auto hidden items-center gap-1 rounded-md border border-[#D1D5DB] bg-white px-2 py-1 text-[10px] font-bold text-[#6B7280] sm:inline-flex"><Command aria-hidden="true" className="h-3 w-3" />K</span>
          </button>
          <Link href="/admin#attention" className="relative inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-[#E5E7EB] bg-white text-[#6B7280] shadow-[0_1px_2px_rgb(0_0_0/0.04)] transition-colors hover:border-[#C62828]/40 hover:bg-[#FEF2F2] hover:text-[#C62828]" aria-label="Review dashboard attention summary"><Bell aria-hidden="true" className="h-5 w-5" /><span className="absolute right-3 top-3 h-2.5 w-2.5 rounded-full border-2 border-white bg-[#D97706]" /><span className="sr-only">Attention summary</span></Link>
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
