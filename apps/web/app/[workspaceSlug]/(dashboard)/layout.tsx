"use client";

import { DashboardLayout } from "@didian/views/layout";
import { DidianIcon } from "@didian/ui/components/common/didian-icon";
import { SearchCommand, SearchTrigger } from "@didian/views/search";
import { FloatingChat } from "@didian/views/chat";
import { WebNotificationBridge } from "@/components/web-notification-bridge";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardLayout
      loadingIndicator={<DidianIcon className="size-6" />}
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
