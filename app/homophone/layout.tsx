import type { Metadata } from "next";
import { HOMOPHONE_TAGLINE, SITE_NAME } from "@/lib/site-config";

export const metadata: Metadata = {
  title: HOMOPHONE_TAGLINE,
  description:
    "Generate verified British cryptic homophone clues from dictionary sound-alike pairs.",
  alternates: {
    canonical: "/homophone",
  },
  openGraph: {
    title: `${HOMOPHONE_TAGLINE} | ${SITE_NAME}`,
    url: "/homophone",
  },
};

export default function HomophoneLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
