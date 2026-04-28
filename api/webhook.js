import Anthropic from "@anthropic-ai/sdk";
import * as crypto from "crypto";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export default async function handler(req, res) {
  if (req.method === "POST") {
    const body = JSON.stringify(req.body);
    const sig = req.headers["x-line-signature"];
    const hash = crypto
      .createHmac("sha256", process.env.LINE_CHANNEL_SECRET)
      .update(body)
      .digest("base64");
    if (hash !== sig) return res.status(401).send("Unauthorized");

    const events = req.body.events;
    for (const event of events) {
      if (event.type === "message" && event.message.type === "text") {
        const userMsg = event.message.text;
        const response = await client.messages.create({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 1000,
          system: `คุณคือ AI ผู้ช่วยของร้าน อมรินทร์ โคตรเนื้อ ตอบภาษาไทย กระชับ เป็นมิตร`,
          messages: [{ role: "user", content: userMsg }],
        });
        const replyText = response.content[0].text;
        await fetch("https://api.line.me/v2/bot/message/reply", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
          },
          body: JSON.stringify({
            replyToken: event.replyToken,
            messages: [{ type: "text", text: replyText }],
          }),
        });
      }
    }
    res.status(200).send("OK");
  } else {
    res.status(200).send("Webhook is running");
  }
}
