import { NextResponse } from "next/server";
import { addSubmission } from "@/lib/store";
import { sendMail, getAdminEmail, getAdminBcc } from "@/lib/email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

export async function POST(req: Request) {
  try {
    const form = await req.formData();

    // Honeypot: bots fill hidden fields. Pretend success without storing.
    if (String(form.get("company") || "").trim()) {
      return NextResponse.json({ ok: true });
    }

    const name = String(form.get("name") || "").trim();
    const email = String(form.get("email") || "").trim();
    const subject = String(form.get("subject") || "").trim();
    const message = String(form.get("message") || "").trim();

    if (!name || !email || !message) {
      return NextResponse.json(
        { ok: false, error: "Please fill in your name, email, and message." },
        { status: 400 },
      );
    }
    if (!isEmail(email)) {
      return NextResponse.json(
        { ok: false, error: "Please enter a valid email address." },
        { status: 400 },
      );
    }
    if (message.length > 5000) {
      return NextResponse.json(
        { ok: false, error: "Your message is too long." },
        { status: 400 },
      );
    }

    await addSubmission({ kind: "contact", name, email, subject, message });

    const admin = getAdminEmail();
    if (admin) {
      await sendMail({
        to: admin,
        bcc: getAdminBcc() || undefined,
        replyTo: email,
        subject: `[Fellows site] Contact: ${subject || "New message"}`,
        text: `New contact form submission\n\nName: ${name}\nEmail: ${email}\nSubject: ${subject || "(none)"}\n\n${message}`,
      }).catch((e) => console.error("[contact] admin email failed", e));
    }
    await sendMail({
      to: email,
      subject: "We received your message — HPRI Summer Fellows",
      text: `Hi ${name},\n\nThank you for contacting the HPRI Summer Fellows Program. We have received your message and will reply soon.\n\nYour message:\n${message}\n\n— HPRI Summer Fellows Program`,
    }).catch((e) => console.error("[contact] confirmation email failed", e));

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[contact] error", e);
    return NextResponse.json(
      { ok: false, error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
