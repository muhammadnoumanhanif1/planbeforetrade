import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const name = String(body.name || "").trim();
    const email = String(body.email || "").trim();
    const subject = String(body.subject || "").trim();
    const message = String(body.message || "").trim();

    if (!name || !email || !subject || !message) {
      return NextResponse.json({ error: "Please fill in all fields." }, { status: 400 });
    }

    console.log("[contact-us] message received", { name, email, subject, message, userId: body.userId || null });

    return NextResponse.json({
      success: true,
      message: "Thank you! Your message has been sent successfully. We'll get back to you soon.",
    });
  } catch (error) {
    console.error("[contact-us] submission error:", error);
    return NextResponse.json(
      { error: "Failed to send message. Please try again." },
      { status: 500 }
    );
  }
}
