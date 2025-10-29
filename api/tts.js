export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Chỉ hỗ trợ POST" });
  }

  const { text } = req.body;
  if (!text) {
    return res.status(400).json({ error: "Thiếu nội dung văn bản" });
  }

  try {
    const apiKey = process.env.GOOGLE_API_KEY; // hoặc tên biến bạn đã set trong Vercel
    const response = await fetch("https://texttospeech.googleapis.com/v1/text:synthesize?key=" + apiKey, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        input: { text },
        voice: { languageCode: "vi-VN", name: "vi-VN-Standard-A", ssmlGender: "FEMALE" },
        audioConfig: { audioEncoding: "MP3" }
      })
    });

    const data = await response.json();
    if (data.audioContent) {
      res.status(200).json({ audio: "data:audio/mp3;base64," + data.audioContent });
    } else {
      res.status(500).json({ error: "Không tạo được âm thanh", details: data });
    }
  } catch (err) {
    res.status(500).json({ error: "Lỗi máy chủ", details: err.message });
  }
}
