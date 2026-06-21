"use client";

import { useEffect, useState } from "react";
import { createBrowserClient } from "@/lib/supabase-client";
import { Navigation } from "@/components/Navigation";
import styles from "../page.module.css";


export default function PrivacyPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const supabase = createBrowserClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        setIsAuthenticated(!!user);
      } catch (error) {
        console.error("Auth check error:", error);
      }
    };

    checkAuth();
  }, []);

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <header className={styles.header}>
<div className={styles.headerTitleWrapper}>
            <img src="/logo.png" alt="Plan Before Trade Logo" style={{ width: 100, height: 100, objectFit: "contain", flexShrink: 0 }} />
            <div>
              <p className={styles.kicker}>
                Plan Before Trade
              </p>
              <h1>PRIVACY POLICY</h1>
            </div>
          </div>
        </header>

        {isAuthenticated && <Navigation />}

        <section className={styles.grid} style={{ maxWidth: "900px", margin: "0 auto" }}>
          <div className={styles.card}>
            <div style={{ color: "#cbd5e1", lineHeight: 1.8 }}>
              <h2 style={{ marginTop: 24, marginBottom: 12, color: "rgb(15, 23, 42)" }}>1. Introduction</h2>
              <p>
                Plan Before Trade ("we", "us", "our", or "Company") operates the planbeforetrade.com website and associated services (collectively, the "Service"). This Privacy Policy explains how we collect, use, disclose, and otherwise handle your information when you use our Service.
              </p>

              <h2 style={{ marginTop: 24, marginBottom: 12, color: "rgb(15, 23, 42)" }}>2. Information We Collect</h2>
              <p>We collect information you provide directly, including:</p>
              <ul style={{ paddingLeft: 20 }}>
                <li><strong>Account Information:</strong> Name, email address, password, and country of residence</li>
                <li><strong>Profile Data:</strong> Full name, avatar, and preferences</li>
                <li><strong>Trading Data:</strong> Your analyses, watchlists, alerts, and historical trades</li>
                <li><strong>Payment Information:</strong> Billing details (processed securely through third-party providers)</li>
                <li><strong>Communication:</strong> Messages through contact forms and support inquiries</li>
              </ul>

              <h2 style={{ marginTop: 24, marginBottom: 12, color: "rgb(15, 23, 42)" }}>3. How We Use Your Information</h2>
              <p>We use collected information for the following purposes:</p>
              <ul style={{ paddingLeft: 20 }}>
                <li>Providing and maintaining our Service</li>
                <li>Processing transactions and sending related information</li>
                <li>Sending technical notices and customer service responses</li>
                <li>Responding to your inquiries and support requests</li>
                <li>Improving user experience and analyzing platform usage</li>
                <li>Detecting fraud and ensuring compliance</li>
                <li>Sending promotional communications (with your consent)</li>
              </ul>

              <h2 style={{ marginTop: 24, marginBottom: 12, color: "rgb(15, 23, 42)" }}>4. Data Security</h2>
              <p>
                We implement comprehensive security measures including encryption, secure authentication, and regular security audits to protect your personal information. However, no method of transmission over the internet is 100% secure. While we strive to protect your data, we cannot guarantee absolute security.
              </p>

              <h2 style={{ marginTop: 24, marginBottom: 12, color: "rgb(15, 23, 42)" }}>5. Third-Party Services</h2>
              <p>
                Our Service integrates with third-party services including:
              </p>
              <ul style={{ paddingLeft: 20 }}>
                <li><strong>Authentication:</strong> Supabase for secure user authentication</li>
                <li><strong>Cryptocurrency Exchanges:</strong> Binance, Bitget, and MEXC for market data</li>
                <li><strong>Payment Processing:</strong> Third-party payment providers for billing</li>
              </ul>
              <p>
                These providers have their own privacy policies. We recommend reviewing them.
              </p>

              <h2 style={{ marginTop: 24, marginBottom: 12, color: "rgb(15, 23, 42)" }}>6. Cookies and Tracking</h2>
              <p>
                We use cookies and similar technologies to:
              </p>
              <ul style={{ paddingLeft: 20 }}>
                <li>Keep you logged in securely</li>
                <li>Remember your preferences</li>
                <li>Analyze usage patterns to improve our Service</li>
                <li>Prevent fraud and enhance security</li>
              </ul>
              <p>
                Most browsers allow you to disable cookies, but this may affect Service functionality.
              </p>

              <h2 style={{ marginTop: 24, marginBottom: 12, color: "rgb(15, 23, 42)" }}>7. Your Rights</h2>
              <p>
                Depending on your location, you may have rights to:
              </p>
              <ul style={{ paddingLeft: 20 }}>
                <li>Access your personal information</li>
                <li>Correct inaccurate data</li>
                <li>Request deletion of your data</li>
                <li>Export your data in portable format</li>
                <li>Withdraw consent or opt-out of communications</li>
              </ul>
              <p>
                To exercise any of these rights, contact us through the{" "}
                <a href="/contact-us" style={{ color: "#34a853", textDecoration: "none", fontWeight: 600 }}>
                  Contact Us
                </a>{" "}
                page.
              </p>

              <h2 style={{ marginTop: 24, marginBottom: 12, color: "rgb(15, 23, 42)" }}>8. Data Retention</h2>
              <p>
                We retain your personal information for as long as necessary to provide our Service, comply with legal obligations, and resolve disputes. You can request deletion at any time, subject to certain legal exceptions.
              </p>

              <h2 style={{ marginTop: 24, marginBottom: 12, color: "rgb(15, 23, 42)" }}>9. International Transfers</h2>
              <p>
                Your information may be transferred to, stored in, and processed in countries other than your country of residence. These countries may have data protection laws that differ from your home country. By using our Service, you consent to such transfers.
              </p>

              <h2 style={{ marginTop: 24, marginBottom: 12, color: "rgb(15, 23, 42)" }}>10. Changes to This Policy</h2>
              <p>
                We may update this Privacy Policy from time to time. Material changes will be announced through the Service or via email. Your continued use of the Service constitutes acceptance of changes.
              </p>

              <h2 style={{ marginTop: 24, marginBottom: 12, color: "rgb(15, 23, 42)" }}>11. Contact Us</h2>
              <p>
                If you have questions about this Privacy Policy or our practices, please{" "}
                <a href="/contact-us" style={{ color: "#34a853", textDecoration: "none", fontWeight: 600 }}>
                  contact us
                </a>
                .
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
