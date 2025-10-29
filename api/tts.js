/**
 * 🔊 Google TTS API (Text-to-Speech)
 * ----------------------------------
 * Tạo giọng nói tiếng Việt dựa trên Google AI Studio API.
 * Yêu cầu: Cần có GOOGLE_API_KEY được khai báo trong Vercel.
 */

export default async function handler(req, res) {
  // Chỉ cho phép POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Chỉ hỗ trợ POST" });
  }

  try {
    const { text } = req.body;
    if (!text || text.trim() === "") {
      return res.status(400).json({ error: "Thiếu nội dung văn bản cần đọc." });
    }

    // Gọi API Google TTS
    const response = await fetch(
      "https://texttospeech.googleapis.com/v1/text:synthesize?key=" +
        process.env.GOOGLE_API_KEY,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input: { text },
          voice: {
            languageCode: "vi-VN",
            name: "vi-VN-Wavenet-A", // giọng tự nhiên nhất của Google
          },
          audioConfig: {
            audioEncoding: "MP3",
            speakingRate: 1.0,
            pitch: 0.0,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.text();
      console.error("❌ Lỗi Google TTS:", errorData);
      return res.status(500).json({ error: "Không thể kết nối đến Google TTS API." });
    }

    const data = await response.json();
    const audioContent = data.audioContent;

    if (!audioContent) {
      return res.status(500).json({ error: "Không nhận được âm thanh từ API." });
    }

    // Trả về file âm thanh
    const audioBuffer = Buffer.from(audioContent, "base64");
    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Content-Length", audioBuffer.length);
    return res.status(200).send(audioBuffer);
  } catch (err) {
    console.error("❌ Lỗi xử lý TTS:", err);
    return res.status(500).json({ error: err.message });
  }
}
