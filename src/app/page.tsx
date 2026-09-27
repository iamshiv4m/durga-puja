import { ParvHome } from "@/components/parv/ParvHome";
import { homeMetadata } from "@/lib/site";

export const metadata = homeMetadata();

export default function Home() {
  return <ParvHome />;
}
