import { redirect } from "next/navigation";

type SignalDetailPageProps = {
  params: {
    id: string;
  };
};

export default function SignalDetailPage({ params }: SignalDetailPageProps) {
  const signalId = encodeURIComponent(params.id);
  redirect(`/market-structure-signals?signalId=${signalId}`);
}
