import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Atlas Preview",
  description: "Redirects to the workspace Atlas page.",
};

export default async function AtlasPreviewPage() {
  const cookieStore = await cookies();
  const workspaceSlug = cookieStore.get("last_workspace_slug")?.value;

  if (workspaceSlug && /^[a-zA-Z0-9-]+$/.test(workspaceSlug)) {
    redirect(`/${workspaceSlug}/atlas`);
  }

  redirect("/");
}
