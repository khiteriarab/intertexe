import { NextRequest } from "next/server";
import { conversations } from "../../route";
import OpenAI from "openai";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const conv = conversations.get(parseInt(id));
  if (!conv) return new Response("Not found", { status: 404 });

  const { content } = await request.json();
  if (!content) return new Response("Content required", { status: 400 });

  conv.messages.push({ role: "user", content });

  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) return new Response("AI not configured", { status: 500 });

  const openai = new OpenAI({ apiKey: openaiKey });

  const systemMessage = {
    role: "system" as const,
    content: `You are INTERTEXE's Material Advisor — an expert AI assistant specializing in luxury fashion fabrics, material quality, designer brands, garment care, and sustainable fashion. You help users understand:
- Fabric types (silk, cotton, linen, wool, cashmere) and their quality indicators
- Designer brand quality ratings and material commitments
- How to read clothing labels and identify quality
- Care instructions for different materials
- Sustainability in fashion
- Price-to-quality value assessment
Be knowledgeable, concise, and practical. Use a warm but authoritative tone. When discussing brands, reference their typical material choices and quality level.`,
  };

  const messages = [
    systemMessage,
    ...conv.messages.map(m => ({ role: m.role as "user" | "assistant", content: m.content })),
  ];

  try {
    const stream = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      max_tokens: 1000,
      stream: true,
    });

    const encoder = new TextEncoder();
    let fullContent = "";

    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const delta = chunk.choices[0]?.delta?.content;
            if (delta) {
              fullContent += delta;
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: delta })}\n\n`));
            }
          }
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`));
          conv.messages.push({ role: "assistant", content: fullContent });
          controller.close();
        } catch (err) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: "Stream failed" })}\n\n`));
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
