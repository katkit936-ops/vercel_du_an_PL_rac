// ===================================================
// 🤖 PHÂN LOẠI RÁC BẰNG AI + GIỌNG NÓI TIẾNG VIỆT (TTS GOOGLE API)
// ===================================================

const MODEL_URL = "./model/";
let model, labelContainer, webcam;
let facingMode = "environment";
let lastSpoken = "";
let detecting = false;
let stream = null;
let audio = null;
let stopRequested = false;

// ===================================================
// 🚀 KHỞI TẠO MÔ HÌNH
// ===================================================
async function init() {
  try {
    stopRequested = false;
    if (webcam) stopCameraAndVoice();

    labelContainer = document.getElementById("label-container");
    labelContainer.innerHTML = "📷 Đang khởi tạo camera...";

    const modelURL = MODEL_URL + "model.json";
    const metadataURL = MODEL_URL + "metadata.json";

    model = await tmImage.load(modelURL, metadataURL);
    await startCamera();

    labelContainer.innerHTML = "📸 Camera sẵn sàng, hãy đưa vật thể vào khung!";
    requestAnimationFrame(loop);
  } catch (err) {
    console.error("❌ Lỗi khởi tạo:", err);
    labelContainer.innerHTML = `<span style="color:red;">Không thể khởi động camera hoặc model.</span>`;
  }
}

// ===================================================
// 🎥 KHỞI ĐỘNG CAMERA
// ===================================================
async function startCamera() {
  try {
    const size = /iPhone|Android/i.test(navigator.userAgent) ? 280 : 320;

    const constraints = {
      video: {
        facingMode: facingMode,
        width: { ideal: size },
        height: { ideal: size },
      },
      audio: false,
    };

    stream = await navigator.mediaDevices.getUserMedia(constraints);

    const video = document.createElement("video");
    video.srcObject = stream;
    video.autoplay = true;
    video.playsInline = true;
    video.muted = true;
    video.width = size;
    video.height = size;
    video.style.border = "3px solid #3cb371";
    video.style.borderRadius = "14px";
    video.style.objectFit = "cover";

    const container = document.getElementById("webcam-container");
    container.innerHTML = "";
    container.appendChild(video);

    webcam = video;
  } catch (err) {
    console.error("❌ Không thể bật camera:", err);
    labelContainer.innerHTML = "⚠️ Vui lòng cấp quyền camera để tiếp tục.";
  }
}

// ===================================================
// 🔄 CHUYỂN CAMERA TRƯỚC / SAU
// ===================================================
async function switchCamera() {
  facingMode = facingMode === "user" ? "environment" : "user";
  stopCameraAndVoice();
  await init();
}

// ===================================================
// 🔁 VÒNG LẶP DỰ ĐOÁN
// ===================================================
async function loop() {
  if (stopRequested) return;
  if (webcam && model && !detecting) {
    detecting = true;
    await predict();
    detecting = false;
  }
  requestAnimationFrame(loop);
}

// ===================================================
// 📊 DỰ ĐOÁN & ĐỌC KẾT QUẢ
// ===================================================
async function predict() {
  if (!webcam || webcam.readyState !== 4) return;

  const prediction = await model.predict(webcam);
  const best = prediction.reduce((a, b) =>
    a.probability > b.probability ? a : b
  );

  if (best.probability > 0.8) {
    const label = best.className;
    const conf = (best.probability * 100).toFixed(1);

    // Hiển thị kết quả
    labelContainer.innerHTML = `
      <div style="
        background:#ffffff;
        border:2px solid #2e8b57;
        border-radius:14px;
        padding:10px 20px;
        display:inline-block;
        font-weight:600;
        color:#1f703e;
        box-shadow:0 3px 8px rgba(0,0,0,0.1);
      ">
        ♻️ Loại rác: ${label}<br>🔍 Độ tin cậy: ${conf}%
      </div>
    `;

    // Đọc giọng nói nếu nhãn thay đổi
    if (label !== lastSpoken) {
      lastSpoken = label;
      speakText(`Đây là ${label}`);
    }
  } else {
    labelContainer.innerHTML = "";
    lastSpoken = "";
  }
}

// ===================================================
// 🔊 GIỌNG NÓI (Google TTS API thông qua server /api/tts)
// ===================================================
async function speakText(text) {
  try {
    if (!text) return;
    if (audio) audio.pause();

    const res = await fetch("/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });

    if (!res.ok) throw new Error("Không thể kết nối API TTS.");

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);

    audio = new Audio(url);
    audio.autoplay = true;

    // fix autoplay cho Safari iOS
    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.catch(() => {
        document.body.addEventListener(
          "click",
          () => audio.play(),
          { once: true }
        );
      });
    }
  } catch (err) {
    console.warn("⚠️ Lỗi TTS:", err);
  }
}

// ===================================================
// 🛑 DỪNG CAMERA + ÂM THANH
// ===================================================
function stopCameraAndVoice() {
  stopRequested = true;
  if (stream) {
    stream.getTracks().forEach(t => t.stop());
    stream = null;
  }
  if (audio) {
    audio.pause();
    audio = null;
  }
  const container = document.getElementById("webcam-container");
  container.innerHTML = "";
  if (labelContainer) labelContainer.innerHTML = "";
}
