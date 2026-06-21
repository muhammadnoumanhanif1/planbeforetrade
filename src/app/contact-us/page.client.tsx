"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { createBrowserClient } from "@/lib/supabase-client";
import { Navigation } from "@/components/Navigation";
import styles from "../page.module.css";

interface FormData {
  name: string;
  email: string;
  subject: string;
  message: string;
}


export default function ContactUsPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [formData, setFormData] = useState<FormData>({
    name: "",
    email: "",
    subject: "",
    message: "",
  });

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const supabase = createBrowserClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          setIsAuthenticated(true);
          setFormData((prev) => ({
            ...prev,
            email: user.email || "",
            name: user.user_metadata?.full_name || "",
          }));
        } else {
          setIsAuthenticated(false);
        }
      } catch (error) {
        console.error("Auth check error:", error);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setMessage(null);
      setSubmitting(true);

      try {
        if (!formData.name || !formData.email || !formData.subject || !formData.message) {
          setMessage({ type: "error", text: "Please fill in all fields." });
          return;
        }

        const supabase = createBrowserClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        const response = await fetch("/api/contact-us", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: formData.name,
            email: formData.email,
            subject: formData.subject,
            message: formData.message,
            userId: user?.id || null,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to send message");
        }

        setMessage({
          type: "success",
          text: data.message || "Thank you! Your message has been sent successfully. We'll get back to you soon.",
        });
        setFormData({
          name: formData.name,
          email: formData.email,
          subject: "",
          message: "",
        });
      } catch (error) {
        setMessage({
          type: "error",
          text: (error as Error).message || "Failed to send message. Please try again.",
        });
      } finally {
        setSubmitting(false);
      }
    },
    [formData]
  );

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
              <h1>CONTACT US</h1>
            </div>
          </div>
        </header>

        {isAuthenticated && <Navigation />}

        <section className={styles.grid}>
          <div className={styles.card} style={{ maxWidth: "600px", margin: "0 auto" }}>
            <h2>Get In Touch</h2>
            <p style={{ color: "#94a3b8", marginBottom: 24 }}>
              Have a question or suggestion? We'd love to hear from you. Fill out the form below and we'll get back to you as soon as possible.
            </p>

            {message && (
              <div
                style={{
                  padding: 12,
                  borderRadius: 6,
                  marginBottom: 20,
                  backgroundColor:
                    message.type === "success" ? "rgba(52, 168, 83, 0.1)" : "rgba(239, 68, 68, 0.1)",
                  color: message.type === "success" ? "#34a853" : "#ef4444",
                  fontSize: 14,
                }}
              >
                {message.text}
              </div>
            )}

            <form onSubmit={handleSubmit} className={styles.profileForm}>
              <label className={styles.label}>
                Name
                <input
                  className={styles.input}
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="Your name"
                  required
                  disabled={submitting}
                />
              </label>

              <label className={styles.label}>
                Email
                <input
                  className={styles.input}
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, email: e.target.value }))
                  }
                  placeholder="your@email.com"
                  required
                  disabled={submitting}
                />
              </label>

              <label className={styles.label}>
                Subject
                <input
                  className={styles.input}
                  type="text"
                  value={formData.subject}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, subject: e.target.value }))
                  }
                  placeholder="What is this about?"
                  required
                  disabled={submitting}
                />
              </label>

              <label className={styles.label}>
                Message
                <textarea
                  className={styles.input}
                  value={formData.message}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, message: e.target.value }))
                  }
                  placeholder="Your message..."
                  required
                  rows={6}
                  disabled={submitting}
                  style={{ fontFamily: "monospace", resize: "vertical" }}
                />
              </label>

              <button
                type="submit"
                className={styles.button}
                disabled={submitting}
                style={{ opacity: submitting ? 0.6 : 1 }}
              >
                {submitting ? "Sending..." : "Send Message"}
              </button>
            </form>

            <div style={{ marginTop: 32, paddingTop: 20, borderTop: "1px solid rgba(148, 163, 184, 0.2)" }}>
              <h3 style={{ margin: "0 0 12px 0", color: "#000000" }}>Other Ways to Reach Us</h3>
              <ul style={{ color: "#94a3b8", paddingLeft: 20, margin: 0 }}>
                <li>Check out our <a href="/faq" style={{ color: "#34a853", textDecoration: "none" }}>FAQ page</a></li>
                <li>Visit our <a href="/about" style={{ color: "#34a853", textDecoration: "none" }}>About Us</a> page for more information</li>
                <li>Review our <a href="/privacy" style={{ color: "#34a853", textDecoration: "none" }}>Privacy Policy</a></li>
              </ul>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
