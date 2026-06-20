import type { Metadata } from "next";
import ClientPage from "./page.client";

export const metadata: Metadata = {
  title: "Contact Us",
  description: "Explore the Contact Us page on Plan Before Trade. Get the latest insights, tools, and signals to optimize your cryptocurrency trading strategy.",
};

export default function Page(props: any) {
  return <ClientPage {...props} />;
}
