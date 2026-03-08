import { NextRequest, NextResponse } from "next/server";
import { conversations } from "../route";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const conv = conversations.get(parseInt(id));
  if (!conv) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(conv);
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  conversations.delete(parseInt(id));
  return NextResponse.json({ message: "Deleted" });
}
