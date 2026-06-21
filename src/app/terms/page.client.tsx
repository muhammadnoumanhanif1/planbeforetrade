"use client";

import { useEffect, useState } from "react";
import { createBrowserClient } from "@/lib/supabase-client";
import { Navigation } from "@/components/Navigation";
import styles from "../page.module.css";


export default function TermsPage() {
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
            <h1>TERMS OF USE</h1>
            </div>
          </div>
        </header>

        {isAuthenticated && <Navigation />}

        <section className={styles.grid} style={{ maxWidth: "900px", margin: "0 auto" }}>
          <div className={styles.card}>
            <div style={{ color: "#cbd5f5", lineHeight: 1.8 }}>
              <h2 style={{ marginTop: 24, marginBottom: 12, color: "rgb(15, 23, 42)" }}>1. Terms and Conditions</h2>
              <p>
                These Terms of Use (&quot;Terms&quot;) govern your use of Plan Before Trade&apos;s website and services (the &quot;Service&quot;). By accessing or using the Service, you agree to be bound by these Terms. If you do not agree, do not use the Service.
              </p>

              <h2 style={{ marginTop: 24, marginBottom: 12, color: "rgb(15, 23, 42)" }}>2. User Accounts</h2>
              <p>
                To use certain features, you must create an account with accurate information. You are responsible for:
              </p>
              <ul style={{ paddingLeft: 20 }}>
                <li>Maintaining the confidentiality of your account credentials</li>
                <li>All activities that occur under your account</li>
                <li>Notifying us immediately of any unauthorized access</li>
              </ul>
              <p>
                You agree not to create multiple accounts or impersonate others.
              </p>

              <h2 style={{ marginTop: 24, marginBottom: 12, color: "rgb(15, 23, 42)" }}>3. Use Restrictions</h2>
              <p>
                You agree not to:
              </p>
              <ul style={{ paddingLeft: 20 }}>
                <li>Use the Service for any illegal purpose or in violation of applicable laws</li>
                <li>Access or use the Service in a way that disrupts normal operations</li>
                <li>Attempt to gain unauthorized access to systems or data</li>
                <li>Engage in automated scraping or excessive data collection</li>
                <li>Use the Service to transmit malware or harmful content</li>
                <li>Engage in market manipulation or fraudulent trading practices</li>
              </ul>

              <h2 style={{ marginTop: 24, marginBottom: 12, color: "rgb(15, 23, 42)" }}>4. Disclaimer of Liability</h2>
              <p>
                THE SERVICE IS PROVIDED &quot;AS IS&quot; WITHOUT WARRANTIES OF ANY KIND. WE DO NOT GUARANTEE:
              </p>
              <ul style={{ paddingLeft: 20 }}>
                <li>Accuracy, completeness, or timeliness of market data</li>
                <li>Profitability of any trading strategy or recommendation</li>
                <li>Uninterrupted or error-free service operation</li>
              </ul>
              <p style={{ color: "#f87171", fontWeight: 600 }}>
                CRYPTOCURRENCY TRADING INVOLVES SUBSTANTIAL RISK OF LOSS. PAST PERFORMANCE DOES NOT GUARANTEE FUTURE RESULTS. ALWAYS VERIFY DATA INDEPENDENTLY BEFORE MAKING TRADING DECISIONS.
              </p>

              <h2 style={{ marginTop: 24, marginBottom: 12, color: "rgb(15, 23, 42)" }}>5. Limitation of Liability</h2>
              <p>
                TO THE MAXIMUM EXTENT PERMITTED BY LAW, WE SHALL NOT BE LIABLE FOR:
              </p>
              <ul style={{ paddingLeft: 20 }}>
                <li>Any indirect, incidental, special, or consequential damages</li>
                <li>Loss of profits, revenue, or business opportunity</li>
                <li>Loss or corruption of data</li>
                <li>Trading losses or financial damages</li>
              </ul>
              <p>
                Our total liability shall not exceed the amount you paid us in the 12 months preceding the claim.
              </p>

              <h2 style={{ marginTop: 24, marginBottom: 12, color: "rgb(15, 23, 42)" }}>6. Indemnification</h2>
              <p>
                You agree to indemnify and hold harmless Plan Before Trade, its officers, directors, and employees from any claims, damages, or expenses arising from:
              </p>
              <ul style={{ paddingLeft: 20 }}>
                <li>Your violation of these Terms</li>
                <li>Your misuse of the Service</li>
                <li>Your trading decisions or losses</li>
                <li>Infringement of third-party rights</li>
              </ul>

              <h2 style={{ marginTop: 24, marginBottom: 12, color: "rgb(15, 23, 42)" }}>7. Cookies Policy</h2>
              <p>
                We use cookies to:
              </p>
              <ul style={{ paddingLeft: 20 }}>
                <li><strong>Essential Cookies:</strong> Maintain secure sessions and authentication</li>
                <li><strong>Preference Cookies:</strong> Remember your settings and preferences</li>
                <li><strong>Analytics Cookies:</strong> Analyze usage to improve our Service</li>
                <li><strong>Security Cookies:</strong> Prevent fraud and protect your account</li>
              </ul>
              <p>
                You can control cookie settings through your browser. Disabling cookies may affect Service functionality.
              </p>

              <h2 style={{ marginTop: 24, marginBottom: 12, color: "rgb(15, 23, 42)" }}>8. Payment Policy</h2>
              <p>
                <strong>Subscription Terms:</strong>
              </p>
              <ul style={{ paddingLeft: 20 }}>
                <li>Premium subscriptions renew automatically unless cancelled</li>
                <li>You will be charged on your renewal date at the current subscription rate</li>
                <li>Billing occurs on a monthly, quarterly, or annual basis as selected</li>
              </ul>
              <p>
                <strong>Refunds:</strong>
              </p>
              <ul style={{ paddingLeft: 20 }}>
                <li>Refund requests must be made within 14 days of payment</li>
                <li>Refunds apply to failed transactions or billing errors</li>
                <li>Subscriptions cancelled mid-period are not refundable</li>
              </ul>
              <p>
                <strong>Cancellation:</strong>
              </p>
              <ul style={{ paddingLeft: 20 }}>
                <li>Cancel anytime from your account settings</li>
                <li>Cancellation takes effect at the end of your current billing period</li>
                <li>Access continues until your subscription expires</li>
              </ul>

              <h2 style={{ marginTop: 24, marginBottom: 12, color: "rgb(15, 23, 42)" }}>9. User Agreement & Acceptance</h2>
              <p>
                By using Plan Before Trade, you acknowledge that:
              </p>
              <ul style={{ paddingLeft: 20 }}>
                <li>You have read and understand these Terms</li>
                <li>You bear full responsibility for your trading decisions</li>
                <li>The Service is for informational purposes only, not investment advice</li>
                <li>You will not hold us liable for trading losses or market outcomes</li>
                <li>You are of legal age and have the authority to enter into this agreement</li>
              </ul>

              <h2 style={{ marginTop: 24, marginBottom: 12, color: "rgb(15, 23, 42)" }}>10. Third-Party Links</h2>
              <p>
                Our Service may contain links to third-party websites and services. We are not responsible for their content, privacy practices, or operations. Your use of third-party services is governed by their terms and policies.
              </p>

              <h2 style={{ marginTop: 24, marginBottom: 12, color: "rgb(15, 23, 42)" }}>11. Termination</h2>
              <p>
                We may suspend or terminate your account if you:
              </p>
              <ul style={{ paddingLeft: 20 }}>
                <li>Violate these Terms or applicable laws</li>
                <li>Engage in fraudulent or abusive behavior</li>
                <li>Fail to pay subscription fees</li>
              </ul>
              <p>
                Upon termination, your access to the Service will be revoked immediately.
              </p>

              <h2 style={{ marginTop: 24, marginBottom: 12, color: "rgb(15, 23, 42)" }}>12. Modifications to Service</h2>
              <p>
                We reserve the right to modify, suspend, or discontinue the Service or any part thereof at any time. We will provide notice of material changes when possible.
              </p>

              <h2 style={{ marginTop: 24, marginBottom: 12, color: "rgb(15, 23, 42)" }}>13. Governing Law</h2>
              <p>
                These Terms shall be governed by and construed in accordance with applicable law, without regard to conflict of law provisions.
              </p>

              <h2 style={{ marginTop: 24, marginBottom: 12, color: "rgb(15, 23, 42)" }}>14. Contact for Questions</h2>
              <p>
                For questions about these Terms, please{" "}
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
