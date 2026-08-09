import { Settings } from "lucide-react";
import { AdminWorkspaceOverview } from "@/components/admin/admin-workspace-overview";

export default function AdminSettingsWorkspace() {
  return <AdminWorkspaceOverview eyebrow="Administration" title="Settings" description="A future home for validated dealership preferences that should not require code changes." availableNow={[{ href: "/admin", label: "Return to dashboard", description: "Continue using the secured operational workspaces available today.", icon: Settings }]} planned={["Dealership contact and business details", "Regional and notification preferences", "Typed settings without exposing technical configuration"]} />;
}
