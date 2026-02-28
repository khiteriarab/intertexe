import type { Express, Request, Response } from "express";
import OpenAI from "openai";
import { chatStorage } from "./storage";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

export function registerChatRoutes(app: Express): void {
  // Get all conversations
  app.get("/api/conversations", async (req: Request, res: Response) => {
    try {
      const conversations = await chatStorage.getAllConversations();
      res.json(conversations);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      res.status(500).json({ error: "Failed to fetch conversations" });
    }
  });

  // Get single conversation with messages
  app.get("/api/conversations/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const conversation = await chatStorage.getConversation(id);
      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }
      const messages = await chatStorage.getMessagesByConversation(id);
      res.json({ ...conversation, messages });
    } catch (error) {
      console.error("Error fetching conversation:", error);
      res.status(500).json({ error: "Failed to fetch conversation" });
    }
  });

  // Create new conversation
  app.post("/api/conversations", async (req: Request, res: Response) => {
    try {
      const { title } = req.body;
      const conversation = await chatStorage.createConversation(title || "New Chat");
      res.status(201).json(conversation);
    } catch (error) {
      console.error("Error creating conversation:", error);
      res.status(500).json({ error: "Failed to create conversation" });
    }
  });

  // Delete conversation
  app.delete("/api/conversations/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      await chatStorage.deleteConversation(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting conversation:", error);
      res.status(500).json({ error: "Failed to delete conversation" });
    }
  });

  // Send message and get AI response (streaming)
  app.post("/api/conversations/:id/messages", async (req: Request, res: Response) => {
    try {
      const conversationId = parseInt(req.params.id);
      const { content } = req.body;

      // Save user message
      await chatStorage.createMessage(conversationId, "user", content);

      // Get conversation history for context
      const messages = await chatStorage.getMessagesByConversation(conversationId);
      const chatMessages = messages.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));

      // Set up SSE
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      const systemMessage = {
        role: "system" as const,
        content: `You are INTERTEXE's AI fashion and material advisor — a luxury fashion expert who specializes in fabric quality, natural fibers, and sustainable luxury fashion.

Your expertise covers:
- **Fabric & Material Knowledge**: Cotton, silk, linen, wool, cashmere, leather, denim, alpaca, tencel/modal, viscose/rayon — their origins, characteristics, care instructions, and quality grades
- **Natural Fiber Quality**: You understand fiber percentages, why natural fibers matter, and how to identify quality fabrics
- **Luxury Fashion**: High-end designers known for material quality — brands like Hermès, Brunello Cucinelli, Loro Piana, The Row, Zegna, Max Mara, Jil Sander, Bottega Veneta, Auralee, Lemaire, Margaret Howell, Studio Nicholson
- **Sustainability**: Ethical sourcing, organic certifications (GOTS, RWS, LWG), environmental impact of different materials
- **Care & Maintenance**: How to properly care for luxury garments to extend their lifetime
- **Fashion Tech**: Fabric technology, smart textiles, innovative sustainable materials
- **Wardrobe Curation**: Building a quality-focused wardrobe, capsule wardrobes, investment pieces

INTERTEXE ranks designers by their commitment to natural fibers. We believe material quality defines true luxury.

Guidelines:
- Be knowledgeable, warm, and editorial in tone — like a trusted personal stylist at a luxury atelier
- When recommending brands, mention their material specialties
- Always consider sustainability alongside quality
- Use specific, factual information about fabrics and designers
- Keep responses concise but thorough — luxury is about precision
- If asked about something outside fashion/materials, gently redirect to your area of expertise`,
      };

      const stream = await openai.chat.completions.create({
        model: "gpt-5.1",
        messages: [systemMessage, ...chatMessages],
        stream: true,
        max_completion_tokens: 8192,
      });

      let fullResponse = "";

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || "";
        if (content) {
          fullResponse += content;
          res.write(`data: ${JSON.stringify({ content })}\n\n`);
        }
      }

      // Save assistant message
      await chatStorage.createMessage(conversationId, "assistant", fullResponse);

      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
    } catch (error) {
      console.error("Error sending message:", error);
      // Check if headers already sent (SSE streaming started)
      if (res.headersSent) {
        res.write(`data: ${JSON.stringify({ error: "Failed to send message" })}\n\n`);
        res.end();
      } else {
        res.status(500).json({ error: "Failed to send message" });
      }
    }
  });
}

