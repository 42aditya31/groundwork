import type { Metadata } from "next";
import { LocalProvider } from "@/components/client/local-provider";
import { requireUser } from "@/server/auth";
import { readContent } from "@/server/content";
import { WelcomeView } from "./view";

export const metadata: Metadata = { title: "Set up your plan" };
export const dynamic = "force-dynamic";

export default async function WelcomePage() {
  const user = await requireUser();
  const { version } = readContent(user.pathId);
  return (
    <LocalProvider user={user} contentVersion={version} requireOnboarded={false}>
      <WelcomeView />
    </LocalProvider>
  );
}
