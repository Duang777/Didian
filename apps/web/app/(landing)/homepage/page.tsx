import type { Metadata } from "next";
import { DidianLanding } from "@/features/landing/components/didian-landing";

export const metadata: Metadata = {
  title: "Homepage",
  description:
    "Didian — open-source platform that turns coding agents into real teammates. Assign tasks, track progress, compound skills.",
  openGraph: {
    title: "Didian — Project Management for Human + Agent Teams",
    description:
      "Manage your human + agent workforce in one place.",
    url: "/homepage",
  },
  alternates: {
    canonical: "/homepage",
  },
};

export default function HomepagePage() {
  return <DidianLanding />;
}
