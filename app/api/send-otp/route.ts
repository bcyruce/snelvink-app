import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { NextResponse } from "next/server";
import { Resend } from "resend";

const OTP_TTL_MS = 15 * 60 * 1000;

function randomSixDigit(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.replace(/^Bearer\s+/i, "").trim();
    if (!token) {
      return NextResponse.json(
        { error: "Niet ingelogd. Meld je opnieuw aan." },
        { status: 401 },
      );
    }

    const resendApiKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.RESEND_FROM_EMAIL;
    if (!resendApiKey || !fromEmail) {
      console.error("Missing RESEND_API_KEY or RESEND_FROM_EMAIL");
      return NextResponse.json(
        { error: "E-mail is tijdelijk niet beschikbaar. Probeer later opnieuw." },
        { status: 500 },
      );
    }

    const admin = createSupabaseAdmin();
    const {
      data: { user },
      error: userError,
    } = await admin.auth.getUser(token);

    if (userError || !user?.email) {
      return NextResponse.json(
        { error: "Sessie ongeldig. Meld je opnieuw aan." },
        { status: 401 },
      );
    }

    const code = randomSixDigit();
    const expiresAt = new Date(Date.now() + OTP_TTL_MS).toISOString();

    const { error: updateError } = await admin
      .from("profiles")
      .update({
        email_otp_code: code,
        email_otp_expires_at: expiresAt,
      })
      .eq("id", user.id);

    if (updateError) {
      console.error("OTP opslaan mislukt:", updateError);
      return NextResponse.json(
        {
          error:
            "Kon geen code opslaan. Controleer of de databasekolommen bestaan (email_otp_code, email_otp_expires_at).",
        },
        { status: 500 },
      );
    }

    const resend = new Resend(resendApiKey);
    const { error: sendError } = await resend.emails.send({
      from: fromEmail,
      to: user.email,
      subject: "Je verificatiecode voor SnelVink",
      html: `
        <p>Hallo,</p>
        <p>Je verificatiecode is:</p>
        <p style="font-size: 28px; font-weight: bold; letter-spacing: 0.2em;">${code}</p>
        <p>Deze code is 15 minuten geldig.</p>
        <p>Als je dit niet zelf hebt aangevraagd, negeer deze e-mail.</p>
        <p>— SnelVink</p>
      `,
    });

    if (sendError) {
      console.error("Resend mislukt:", sendError);
      return NextResponse.json(
        { error: "Kon geen e-mail versturen. Probeer later opnieuw." },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("send-otp:", e);
    return NextResponse.json(
      { error: "Er ging iets mis. Probeer opnieuw." },
      { status: 500 },
    );
  }
}
