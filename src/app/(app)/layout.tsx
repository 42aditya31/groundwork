import { ToastProvider } from "@/components/client/toast";
import { LocalProvider } from "@/components/client/local-provider";
import { LocalShell } from "@/components/client/local-shell";
import { requireUser } from "@/server/auth";
import { readContent } from "@/server/content";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const { version } = readContent(user.pathId);
  return (
    <ToastProvider>
      <LocalProvider user={user} contentVersion={version} requireOnboarded>
        <div data-path={user.pathId}>
          <LocalShell>{children}</LocalShell>
        </div>
      </LocalProvider>
    </ToastProvider>
  );
}
