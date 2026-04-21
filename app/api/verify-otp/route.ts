import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { NextResponse } from "next/server";

type Body = {
  code?: string;
};

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

    let body: Body;
    try {
      body = (await request.json()) as Body;
    } catch {
      return NextResponse.json({ error: "Ongeldige aanvraag." }, { status: 400 });
    }

    const rawCode = String(body.code ?? "").replace(/\D/g, "").slice(0, 6);
    if (rawCode.length !== 6) {
      return NextResponse.json(
        { error: "Voer de 6-cijferige code in." },
        { status: 400 },
      );
    }

    const admin = createSupabaseAdmin();
    const {
      data: { user },
      error: userError,
    } = await admin.auth.getUser(token);

    if (userError || !user?.id) {
      return NextResponse.json(
        { error: "Sessie ongeldig. Meld je opnieuw aan." },
        { status: 401 },
      );
    }

    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("email_otp_code, email_otp_expires_at")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError || !profile) {
      console.error("Profiel ophalen mislukt:", profileError);
      return NextResponse.json(
        { error: "Profiel niet gevonden." },
        { status: 404 },
      );
    }

    const row = profile as {
      email_otp_code: string | null;
      email_otp_expires_at: string | null;
    };

    if (!row.email_otp_code || !row.email_otp_expires_at) {
      return NextResponse.json(
        { error: "Geen actieve code. Vraag een nieuwe code aan." },
        { status: 400 },
      );
    }

    const expires = new Date(row.email_otp_expires_at).getTime();
    if (Number.isNaN(expires) || Date.now() > expires) {
      return NextResponse.json(
        { error: "Code verlopen. Vraag een nieuwe code aan." },
        { status: 400 },
      );
    }

    if (row.email_otp_code !== rawCode) {
      return NextResponse.json(
        { error: "Onjuiste code. Probeer opnieuw." },
        { status: 400 },
      );
    }

    const { error: verifyError } = await admin
      .from("profiles")
      .update({
        is_email_verified: true,
        email_otp_code: null,
        email_otp_expires_at: null,
      })
      .eq("id", user.id);

    if (verifyError) {
      console.error("Verificatie opslaan mislukt:", verifyError);
      return NextResponse.json(
        { error: "Kon verificatie niet opslaan. Probeer opnieuw." },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("verify-otp:", e);
    return NextResponse.json(
      { error: "Er ging iets mis. Probeer opnieuw." },
      { status: 500 },
    );
  }
}
