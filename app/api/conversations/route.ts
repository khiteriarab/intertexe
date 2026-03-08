import { NextRequest, NextResponse } from "next/server";

const conversations = new Map<number, { id: number; title: string; createdAt: string; messages: Array<{ role: string; content: string }> }>();
let nextId = 1;

export async function GET() {
  const list = Array.from(conversations.values())
    .map(({ id, title, createdAt }) => ({ id, title, createdAt }))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return NextResponse.json(list);
}

export async function POST(request: NextRequest) {
  const { title } = await request.json();
  const conv = {
    id: nextId++,
    title: title || "New Chat",
    createdAt: new Date().toISOString(),
    messages: [] as Array<{ role: string; content: string }>,
  };
  conversations.set(conv.id, conv);
  return NextResponse.json({ id: conv.id, title: conv.title, createdAt: conv.createdAt }, { status: 201 });
}

export { conversations };
