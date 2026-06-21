import type { Metadata } from "next";
import { redirect } from "next/navigation";

type SignalDetailPageProps = {
  params: {
    id: string;
  };
};

export async function generateMetadata({ params }: SignalDetailPageProps): Promise<Metadata> {
  return {
    title: `Signal Details - ${params.id}`,
    description: `View details for signal ${params.id} on Plan Before Trade.`,
  };
}

export default function SignalDetailPage({ params }: SignalDetailPageProps) {
  const signalId = encodeURIComponent(params.id);
  redirect(`/market-structure-signals?signalId=${signalId}`);
}
