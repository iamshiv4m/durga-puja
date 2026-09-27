import { RegionPage } from "@/components/RegionPage";
import { pageMetadata } from "@/lib/site";

export const metadata = pageMetadata("bengal");

export default function Home() {
  return <RegionPage style="bengal" />;
}
