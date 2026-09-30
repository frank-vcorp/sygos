import { redirect } from "next/navigation";
import { canUseViewAs, listViewAsTargets } from "@/lib/impersonation";
import { getRealSession, getSession } from "@/lib/session";
import { ViewAsBanner } from "@/components/view-as-banner";
import { canUseGlobalSearch } from "@/lib/permissions";
import { ActiveCompanyNotice } from "@/components/active-company-notice";
import { IntegrationNotice } from "@/components/integration-notice";
import { AppShell } from "@/components/shell/app-shell";
import { buildNavigation } from "@/lib/app-navigation";
import { listIntegrations } from "./maestros/actions";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");

  const realSession = await getRealSession();
  const viewAsOptions =
    realSession && canUseViewAs(realSession) ? await listViewAsTargets() : [];

  const integrations = await listIntegrations(session.activeCompany.id);
  const navigation = buildNavigation(session);

  return (
    <AppShell
      session={session}
      groups={navigation}
      canSearch={canUseGlobalSearch(session.role)}
      viewAsOptions={viewAsOptions}
      notices={
        <>
          <ViewAsBanner session={session} />
          <ActiveCompanyNotice session={session} />
          <IntegrationNotice role={session.role} rows={integrations} />
        </>
      }
    >
      {children}
    </AppShell>
  );
}
