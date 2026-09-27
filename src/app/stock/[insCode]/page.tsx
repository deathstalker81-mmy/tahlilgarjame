import type { Metadata } from "next";
import { StockView } from "@/components/StockView";

interface Props {
  params: { insCode: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return { title: `تحلیل سهم ${params.insCode}` };
}

export default function StockPage({ params }: Props) {
  return <StockView insCode={params.insCode} />;
}
