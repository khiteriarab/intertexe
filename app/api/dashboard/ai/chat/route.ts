import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { getHqSession } from "../../../../../lib/dashboard/auth";
import { fetchInsightsBundle } from "../../../../../lib/dashboard/insights";
import { fetchHqCommercePage } from "../../../../../lib/dashboard/metrics";
import { buildExecutiveSystemPrompt } from "../../../../../lib/dashboard/revenue";
import { getServerSupabase } from "../../../../../lib/supabase-service-client";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const session = await getHqSession();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const supabase = getServerSupabase();
  if (!supabase) return NextResponse.json({ message: "DB unavailable" }, { status: 503 });

  const convId = request.nextUrl.searchParams.get("conversationId");
  if (convId) {
    const { data: messages } = await supabase
      .from("hq_ai_messages")
      .select("id, role, content, created_at")
      .eq("conversation_id", convId)
      .order("created_at", { ascending: true });
    return NextResponse.json({ messages: messages || [] });
  }

  const { data: conversations } = await supabase
    .from("hq_ai_conversations")
    .select("id, title, created_at, updated_at")
    .eq("workspace_id", session.workspaceId)
    .eq("internal_user_id", session.internalUserId)
    .order("updated_at", { ascending: false })
    .limit(30);

  return NextResponse.json({ conversations: conversations || [] });
}

export async function POST(request: NextRequest) {
  const session = await getHqSession();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const openaiKey = process.env.OPENAI_API_KEY || process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
  if (!openaiKey) {
    return NextResponse.json(
      { message: "OPENAI_API_KEY not configured. Add it to the website environment." },
      { status: 503 }
    );
  }

  const supabase = getServerSupabase();
  if (!supabase) return NextResponse.json({ message: "DB unavailable" }, { status: 503 });

  const body = await request.json();
  const content = String(body.content || "").trim();
  if (!content) return NextResponse.json({ message: "content required" }, { status: 400 });

  let conversationId = body.conversationId as string | undefined;
  if (!conversationId) {
    const { data: conv, error } = await supabase
      .from("hq_ai_conversations")
      .insert({
        workspace_id: session.workspaceId,
        internal_user_id: session.internalUserId,
        title: content.slice(0, 72),
      })
      .select("id")
      .maybeSingle();
    if (error || !conv?.id) {
      return NextResponse.json({ message: error?.message || "Could not start conversation" }, { status: 500 });
    }
    conversationId = conv.id;
  }

  await supabase.from("hq_ai_messages").insert({
    conversation_id: conversationId,
    role: "user",
    content,
  });

  const [{ metrics, live }, commerce] = await Promise.all([
    fetchInsightsBundle(session.workspaceId),
    fetchHqCommercePage(session.workspaceId),
  ]);

  const { data: history } = await supabase
    .from("hq_ai_messages")
    .select("role, content")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .limit(40);

  const system = buildExecutiveSystemPrompt({
    name: session.fullName?.split(/\s+/)[0] || "Founder",
    workspaceName: session.workspaceName,
    metrics,
    insights: live,
    revenue: {
      connected: commerce.revenueConnected,
      commission7d: commerce.commission7d,
      sales7d: commerce.sales7d,
      transactions7d: commerce.transactions7d,
    },
  });

  const openai = new OpenAI({ apiKey: openaiKey });
  const messages = [
    { role: "system" as const, content: system },
    ...((history || []) as Array<{ role: string; content: string }>)
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
  ];

  try {
    const stream = await openai.chat.completions.create({
      model: process.env.HQ_AI_MODEL || "gpt-4o-mini",
      messages,
      max_tokens: 1200,
      stream: true,
    });

    const encoder = new TextEncoder();
    let full = "";
    const convId = conversationId!;

    const readable = new ReadableStream({
      async start(controller) {
        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ conversationId: convId })}\n\n`)
          );
          for await (const chunk of stream) {
            const delta = chunk.choices[0]?.delta?.content;
            if (delta) {
              full += delta;
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: delta })}\n\n`));
            }
          }
          await supabase.from("hq_ai_messages").insert({
            conversation_id: convId,
            role: "assistant",
            content: full,
          });
          await supabase
            .from("hq_ai_conversations")
            .update({ updated_at: new Date().toISOString() })
            .eq("id", convId);
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`));
          controller.close();
        } catch (err: any) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ error: err?.message || "Stream failed" })}\n\n`)
          );
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (err: any) {
    return NextResponse.json({ message: err?.message || "AI failed" }, { status: 500 });
  }
}
