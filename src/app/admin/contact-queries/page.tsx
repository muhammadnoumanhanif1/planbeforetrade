"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, FormEvent } from "react";
import { createBrowserClient } from "@/lib/supabase-client";
import { Navigation } from "@/components/Navigation";
import { isTemporaryPublicAccessEnabled } from "@/lib/auth-access";
import styles from "../../page.module.css";

interface ContactQuery {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: "new" | "in-progress" | "resolved" | "closed";
  response_message?: string;
  created_at: string;
}

export default function AdminContactsPage() {
  const isTemporaryPublicAccess = isTemporaryPublicAccessEnabled();
  const [queries, setQueries] = useState<ContactQuery[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [selectedQuery, setSelectedQuery] = useState<ContactQuery | null>(null);
  const [responseMessage, setResponseMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadQueries = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = createBrowserClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        if (!isTemporaryPublicAccess) {
          window.location.href = "/login";
          return;
        }
        setIsAdmin(false);
        return;
      }

      // Check if user is admin (you can customize this check)
      const isUserAdmin = user.app_metadata?.role === "admin";
      setIsAdmin(isUserAdmin);

      if (!isUserAdmin) {
        setIsAdmin(false);
        return;
      }

      const { data, error } = await supabase
        .from("contact_queries")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setQueries(data || []);
    } catch (error) {
      console.error("Error loading queries:", error);
    } finally {
      setLoading(false);
    }
  }, [isTemporaryPublicAccess]);

  useEffect(() => {
    loadQueries();
  }, [loadQueries]);

  const updateQueryStatus = async (queryId: string, newStatus: string) => {
    try {
      const supabase = createBrowserClient();
      const { error } = await supabase
        .from("contact_queries")
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq("id", queryId);

      if (error) throw error;
      loadQueries();
    } catch (error) {
      console.error("Error updating status:", error);
    }
  };

  const sendResponse = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedQuery || !responseMessage.trim()) return;

    setSubmitting(true);
    try {
      const supabase = createBrowserClient();
      const { error } = await supabase
        .from("contact_queries")
        .update({
          response_message: responseMessage,
          status: "resolved",
          updated_at: new Date().toISOString(),
        })
        .eq("id", selectedQuery.id);

      if (error) throw error;
      setResponseMessage("");
      setSelectedQuery(null);
      loadQueries();
    } catch (error) {
      console.error("Error sending response:", error);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.page}>
        <main className={styles.main}>
          <p className={styles.placeholder}>Loading...</p>
        </main>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className={styles.page}>
        <main className={styles.main}>
          <header
            className={styles.header}
            style={{
              backgroundColor: "#f8fafc",
              borderBottom: "2px solid #34a853",
              boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
            }}
          >
            <div>
              <p className={styles.kicker} style={{ color: "#64748b" }}>
                Plan Before Trade
              </p>
              <h1 style={{ color: "#0f1729" }}>ADMIN ACCESS DENIED</h1>
            </div>
          </header>
          <div className={styles.card}>
            <h2>Access Denied</h2>
            <p style={{ color: "#94a3b8" }}>
              You do not have permission to access this page.
            </p>
            <Link href="/dashboard" className={styles.button} style={{ textDecoration: "none" }}>
              Back to Dashboard
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <header
          className={styles.header}
          style={{
            backgroundColor: "#f8fafc",
            borderBottom: "2px solid #34a853",
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
          }}
        >
          <div>
            <p className={styles.kicker} style={{ color: "#64748b" }}>
              Plan Before Trade
            </p>
            <h1 style={{ color: "#0f1729" }}>CONTACT QUERIES</h1>
          </div>
        </header>

        <Navigation />

        <section className={styles.grid}>
          <div className={styles.card} style={{ gridColumn: "1 / -1" }}>
            <h2>User Messages</h2>
            <p style={{ color: "#94a3b8", marginBottom: 20 }}>
              Total queries: {queries.length}
            </p>

            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(148, 163, 184, 0.2)" }}>
                    <th style={{ textAlign: "left", padding: "12px", color: "#94a3b8" }}>Name</th>
                    <th style={{ textAlign: "left", padding: "12px", color: "#94a3b8" }}>Email</th>
                    <th style={{ textAlign: "left", padding: "12px", color: "#94a3b8" }}>Subject</th>
                    <th style={{ textAlign: "left", padding: "12px", color: "#94a3b8" }}>Status</th>
                    <th style={{ textAlign: "left", padding: "12px", color: "#94a3b8" }}>Date</th>
                    <th style={{ textAlign: "left", padding: "12px", color: "#94a3b8" }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {queries.map((query) => (
                    <tr key={query.id} style={{ borderBottom: "1px solid rgba(148, 163, 184, 0.1)" }}>
                      <td style={{ padding: "12px", color: "#cbd5e1" }}>{query.name}</td>
                      <td style={{ padding: "12px", color: "#cbd5e1" }}>{query.email}</td>
                      <td style={{ padding: "12px", color: "#cbd5e1" }}>{query.subject}</td>
                      <td style={{ padding: "12px" }}>
                        <select
                          value={query.status}
                          onChange={(e) => updateQueryStatus(query.id, e.target.value)}
                          style={{
                            padding: "4px 8px",
                            borderRadius: "4px",
                            border: "1px solid rgba(52, 168, 83, 0.3)",
                            backgroundColor: "#0f1729",
                            color:
                              query.status === "new"
                                ? "#fbbf24"
                                : query.status === "in-progress"
                                ? "#3b82f6"
                                : query.status === "resolved"
                                ? "#34a853"
                                : "#94a3b8",
                            cursor: "pointer",
                          }}
                        >
                          <option value="new">New</option>
                          <option value="in-progress">In Progress</option>
                          <option value="resolved">Resolved</option>
                          <option value="closed">Closed</option>
                        </select>
                      </td>
                      <td style={{ padding: "12px", color: "#cbd5e1", fontSize: "12px" }}>
                        {new Date(query.created_at).toLocaleDateString()}
                      </td>
                      <td style={{ padding: "12px" }}>
                        <button
                          onClick={() => setSelectedQuery(query)}
                          style={{
                            padding: "6px 12px",
                            backgroundColor: "#34a853",
                            color: "#fff",
                            border: "none",
                            borderRadius: "4px",
                            cursor: "pointer",
                            fontSize: "12px",
                          }}
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {queries.length === 0 && (
              <p style={{ color: "#94a3b8", textAlign: "center", padding: "20px" }}>
                No contact queries yet.
              </p>
            )}
          </div>

          {selectedQuery && (
            <div className={styles.card} style={{ gridColumn: "1 / -1" }}>
              <h3>{selectedQuery.subject}</h3>
              <p style={{ color: "#94a3b8", marginBottom: 16 }}>
                <strong>From:</strong> {selectedQuery.name} ({selectedQuery.email})
              </p>
              <div
                style={{
                  padding: 12,
                  backgroundColor: "rgba(52, 168, 83, 0.05)",
                  borderRadius: 6,
                  marginBottom: 20,
                }}
              >
                <p style={{ color: "#cbd5e1", margin: 0, whiteSpace: "pre-wrap" }}>
                  {selectedQuery.message}
                </p>
              </div>

              {selectedQuery.response_message && (
                <div
                  style={{
                    padding: 12,
                    backgroundColor: "rgba(59, 130, 246, 0.05)",
                    borderRadius: 6,
                    marginBottom: 20,
                  }}
                >
                  <p style={{ color: "#94a3b8", margin: "0 0 8px 0", fontSize: "12px" }}>
                    Your Response:
                  </p>
                  <p style={{ color: "#cbd5e1", margin: 0, whiteSpace: "pre-wrap" }}>
                    {selectedQuery.response_message}
                  </p>
                </div>
              )}

              {selectedQuery.status !== "resolved" && (
                <form onSubmit={sendResponse}>
                  <label style={{ display: "block", marginBottom: 12 }}>
                    <span style={{ color: "#94a3b8", fontSize: 14 }}>Send Response</span>
                    <textarea
                      value={responseMessage}
                      onChange={(e) => setResponseMessage(e.target.value)}
                      placeholder="Type your response here..."
                      rows={5}
                      style={{
                        width: "100%",
                        marginTop: 8,
                        padding: 12,
                        borderRadius: 6,
                        border: "1px solid rgba(148, 163, 184, 0.2)",
                        backgroundColor: "rgba(15, 23, 42, 0.5)",
                        color: "#fff",
                        fontFamily: "monospace",
                        fontSize: 14,
                        boxSizing: "border-box",
                      }}
                    />
                  </label>
                  <div style={{ display: "flex", gap: 12 }}>
                    <button
                      type="submit"
                      disabled={submitting}
                      style={{
                        padding: "8px 16px",
                        backgroundColor: "#34a853",
                        color: "#fff",
                        border: "none",
                        borderRadius: "4px",
                        cursor: "pointer",
                        opacity: submitting ? 0.6 : 1,
                      }}
                    >
                      {submitting ? "Sending..." : "Send Response"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedQuery(null)}
                      style={{
                        padding: "8px 16px",
                        backgroundColor: "transparent",
                        color: "#94a3b8",
                        border: "1px solid rgba(148, 163, 184, 0.2)",
                        borderRadius: "4px",
                        cursor: "pointer",
                      }}
                    >
                      Close
                    </button>
                  </div>
                </form>
              )}

              {selectedQuery.status === "resolved" && (
                <button
                  type="button"
                  onClick={() => setSelectedQuery(null)}
                  style={{
                    padding: "8px 16px",
                    backgroundColor: "transparent",
                    color: "#94a3b8",
                    border: "1px solid rgba(148, 163, 184, 0.2)",
                    borderRadius: "4px",
                    cursor: "pointer",
                  }}
                >
                  Close
                </button>
              )}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
