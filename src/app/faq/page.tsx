import Link from "next/link";
import type { Metadata } from "next";
import styles from "../page.module.css";

export const metadata: Metadata = {
  title: "FAQ | Plan Before Trade",
  description:
    "Frequently asked questions about pricing, payments, usage limits, and premium features on Plan Before Trade.",
};

const FAQ_ITEMS = [
  {
    question: "Can I cancel anytime?",
    answer:
      "Yes. You can cancel anytime from your billing settings. Access remains active until your current billing period ends.",
  },
  {
    question: "What payment methods are supported?",
    answer:
      "International payments use Stripe (cards). In Pakistan, weekly plans can be paid through Easypaisa and JazzCash with manual verification.",
  },
  {
    question: "What do I get on Premium?",
    answer:
      "Premium unlocks unlimited analyses, watchlists, saved analyses, and price alerts.",
  },
  {
    question: "What is the free-tier limit?",
    answer: "Free users can run up to 3 analyses per day.",
  },
  {
    question: "Is this financial advice?",
    answer:
      "No. The platform provides technical analysis tooling only. Always do your own research and manage risk carefully.",
  },
];

export default function FaqPage() {
  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <header className={styles.header}>
<div className={styles.headerTitleWrapper}>
            <img src="/logo.png" alt="Plan Before Trade Logo" style={{ width: 100, height: 100, objectFit: "contain", flexShrink: 0 }} />
            <div>
              <p className={styles.kicker}>Plan Before Trade</p>
              <h1>FREQUENTLY ASKED QUESTIONS</h1>
              <p className={styles.subtitle}>Quick answers to common questions about plans and billing.</p>
            </div>
          </div>
        </header>

        <section style={{ maxWidth: 860, margin: "0 auto", display: "flex", flexDirection: "column", gap: 16 }}>
          {FAQ_ITEMS.map((item) => (
            <article
              key={item.question}
              className={styles.card}
              style={{ padding: 20, borderRadius: 12, boxShadow: "none" }}
            >
              <h2 style={{ margin: 0, fontSize: 20, background: "transparent", color: "#e2e8f0", padding: 0 }}>
                {item.question}
              </h2>
              <p style={{ marginTop: 12, color: "#94a3b8" }}>{item.answer}</p>
            </article>
          ))}
        </section>

        <div style={{ textAlign: "center", marginTop: 24 }}>
          <Link href="/pricing" className={styles.navLink}>
            View Pricing
          </Link>
        </div>
      </main>
    </div>
  );
}
