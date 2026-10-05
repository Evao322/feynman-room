import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: "2mb" }));

const API_KEY = process.env.ANTHROPIC_API_KEY;

app.post("/api/claude", async (req, res) => {
  if (!API_KEY) {
    return res.status(500).json({
      error: "ANTHROPIC_API_KEY is not set. Add it to feynman-room/.env (see .env.example).",
    });
  }

  try {
    const upstream = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(req.body),
    });

    const data = await upstream.json();
    res.status(upstream.status).json(data);
  } catch (err) {
    res.status(502).json({ error: "Could not reach Anthropic API: " + err.message });
  }
});

const PORT = process.env.SERVER_PORT || 3001;
app.listen(PORT, () => {
  console.log(`Feynman Room proxy listening on http://localhost:${PORT}`);
});
