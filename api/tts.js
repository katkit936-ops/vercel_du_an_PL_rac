// =======================================
// 🔊 GOOGLE TTS - Phát giọng tiếng Việt tự nhiên
// =======================================

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Chỉ hỗ trợ POST" });
  }

  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: "Thiếu text cần đọc" });

    // 🔑 Dán API key bạn lấy từ Google AI Studio vào đây (hoặc dùng biến môi trường)
    const GOOGLE_API_KEY = process.env.GOOGLE_TTS_API_KEY || "YOUR_API_KEY_HERE";

    const response = await fetch(
      `https://texttospeech.googleapis.com/v1/text:synthesize?key=${GOOGLE_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input: { text },
          voice: {
            languageCode: "vi-VN",
            name: "vi-VN-Wavenet-A" // có thể đổi: vi-VN-Wavenet-B/C/D
          },
          audioConfig: {
            audioEncoding: "MP3",
            speakingRate: 1.0,
            pitch: 0
          }
        })
      }
    );

    const data = await response.json();

    if (!data.audioContent)
      throw new Error(data.error?.message || "Không có dữ liệu âm thanh trả về");

    res.status(200).json({
      audio: `data:audio/mp3;base64,${data.audioContent}`
    });
  } catch (err) {
    console.error("Lỗi TTS:", err);
    res.status(500).json({ error: err.message });
  }
}
