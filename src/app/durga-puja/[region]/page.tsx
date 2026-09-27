import { notFound } from "next/navigation";
import { RegionPage } from "@/components/RegionPage";
import { pageMetadata } from "@/lib/site";
import { REGION_SLUGS } from "@/lib/styles";

export const dynamicParams = false;

export function generateStaticParams() {
  return Object.keys(REGION_SLUGS).map((region) => ({ region }));
}

export async function generateMetadata({ params }: PageProps<"/durga-puja/[region]">) {
  const { region } = await params;
  const style = REGION_SLUGS[region];
  return style ? pageMetadata(style) : {};
}

export default async function Region({ params }: PageProps<"/durga-puja/[region]">) {
  const { region } = await params;
  const style = REGION_SLUGS[region];
  if (!style) notFound();
  return <RegionPage style={style} />;
}
