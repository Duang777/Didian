"use client";

import { DashboardLayout } from "@didian/views/layout";
import { MulticaIcon } from "@didian/ui/components/common/multica-icon";
import { SearchCommand, SearchTrigger } from "@didian/views/search";
import { FloatingChat } from "@didian/views/chat";
import { WebNotificationBridge } from "@/components/web-notification-bridge";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardLayout
      loadingIndicator={<MulticaIcon className="size-6" />}
      searchSlot={<SearchTrigger />}
      extra={
        <>
          <SearchCommand />
          <WebNotificationBridge />
          <FloatingChat />
        </>
      }
    >
      {children}
    </DashboardLayout>
  );
}
