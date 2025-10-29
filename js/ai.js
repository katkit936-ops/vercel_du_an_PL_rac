// ===================================================
// 🤖 PHÂN LOẠI RÁC BẰNG AI - CÓ GIỌNG NÓI HOẠT ĐỘNG TRÊN ĐIỆN THOẠI
// ===================================================

const MODEL_URL = "./model/";
let model, labelContainer;
let webcam = null;
let facingMode = "user";
let maxPredictions = 0;

// Biến điều khiển
let isRunning = false;
let voiceEnabled = false; // bật/tắt giọng nói
let lastSpokenClass = "";
let lastSpokenTime = 0;

// Cấu hình tốc độ
const FRAME_INTERVAL = 150;
const DETECTION_THRESHOLD = 0.75;
const STABLE_THRESHOLD = 3;

// ===================================================
// 🚀 Khởi tạo mô hình + camera
// ===================================================
async function init() {
  try {
    if (isRunning) return;
    isRunning = true;

    // Đánh thức audio context cho iOS/Android
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      oscillator.connect(audioCtx.destination);
      oscillator.start(0);
      oscillator.stop(0);
    } catch (e) {
      console.warn("Không thể khởi tạo audio context:", e);
    }

    await tf.setBackend("webgl").catch(() => tf.setBackend("cpu"));
    const modelURL = MODEL_URL + "model.json";
    const metadataURL = MODEL_URL + "metadata.json";

    const check = await fetch(modelURL);
    if (!check.ok) throw new Error(`Không tìm thấy model tại ${modelURL}`);

    model = await tmImage.load(modelURL, metadataURL);
    maxPredictions = model.getTotalClasses();

    labelContainer = document.getElementById("label-container");
    labelContainer.innerHTML = "📷 Đang khởi tạo camera...";

    await startCamera();
    loop();
  } catch (err) {
    console.error("❌ Lỗi khởi tạo:", err);
    labelContainer.innerHTML = `
      ⚠️ Không thể tải model hoặc camera.<br>${err.message}
    `;
  }
}

// ===================================================
// 🎥 Khởi động camera
// ===================================================
async function startCamera() {
  try {
    if (webcam && webcam.stop) webcam.stop();

    const isMobile = /iPhone|Android|iPad/i.test(navigator.userAgent);
    const size = isMobile ? 340 : 440;

    const constraints = {
      audio: false,
      video: {
        facingMode: facingMode === "user" ? "user" : { exact: "environment" },
        width: { ideal: size },
        height: { ideal: size }
      }
    };

    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    const video = document.createElement("video");
    video.autoplay = true;
    video.playsInline = true;
    video.muted = true;
    video.srcObject = stream;

    Object.assign(video.style, {
      width: `${size}px`,
      height: `${size}px`,
      border: "4px solid #2e8b57",
      borderRadius: "18px",
      aspectRatio: "1 / 1",
      objectFit: "cover",
      boxShadow: "0 6px 14px rgba(0,0,0,0.25)",
      margin: "10px auto",
      display: "block"
    });

    const container = document.getElementById("webcam-container");
    container.innerHTML = "";
    container.appendChild(video);
    await video.play();

    webcam = {
      video,
      stop: () => stream.getTracks().forEach(track => track.stop())
    };

    labelContainer.innerHTML = "📸 Camera sẵn sàng – hãy đưa rác vào khung!";
  } catch (err) {
    console.error("❌ Lỗi camera:", err);
    labelContainer.innerHTML = `
      ⚠️ Không thể mở camera.<br>${err.message}
    `;
  }
}

// ===================================================
// 🔄 Chuyển camera
// ===================================================
async function switchCamera() {
  facingMode = facingMode === "user" ? "environment" : "user";
  labelContainer.innerHTML = `🔄 Đang chuyển sang camera ${
    facingMode === "user" ? "trước" : "sau"
  }...`;
  await startCamera();
}

// ===================================================
// 🔁 Vòng lặp nhanh hơn
// ===================================================
let lastPrediction = "";
let stableCount = 0;

async function loop() {
  if (!isRunning || !webcam || !webcam.video || !model) return;
  await predict();
  await tf.nextFrame();
  setTimeout(loop, FRAME_INTERVAL);
}

// ===================================================
// 📊 Dự đoán thông minh + giọng nói
// ===================================================
async function predict() {
  try {
    const prediction = await model.predict(webcam.video);
    const best = prediction.reduce((a, b) =>
      a.probability > b.probability ? a : b
    );

    const currentClass = best.className;
    const confidence = best.probability;

    // Nếu chưa có vật thể
    if (confidence < DETECTION_THRESHOLD) {
      labelContainer.innerHTML = `
        <div style="
          background:#fff;
          border:2px dashed #3cb371;
          border-radius:14px;
          padding:10px 20px;
          display:inline-block;
          box-shadow:0 2px 6px rgba(0,0,0,0.1);
          font-weight:600;
          color:#2e8b57;">
          🗑️ Hãy cho tôi rác!
        </div>`;
      lastSpokenClass = "";
      stableCount = 0;
      return;
    }

    // Khi có vật thể
    if (currentClass === lastPrediction) stableCount++;
    else stableCount = 0;
    lastPrediction = currentClass;

    if (stableCount >= STABLE_THRESHOLD) {
      const confidenceText = (confidence * 100).toFixed(1);
      labelContainer.innerHTML = `
        <div style="
          background:linear-gradient(145deg,#ffffff,#eafff2);
          border:2px solid #2e8b57;
          border-radius:14px;
          padding:8px 16px;
          display:inline-block;
          box-shadow:0 3px 8px rgba(0,0,0,0.15);
          font-size:1rem;
          font-weight:700;
          color:#1f703e;">
          ♻️ ${currentClass}<br>
          <span style="font-size:0.9rem;color:#2c2c2c;">
            🔍 ${confidenceText}%
          </span>
        </div>`;

      // Chỉ nói nếu bật giọng
      if (voiceEnabled) {
        const now = Date.now();
        if (
          (currentClass !== lastSpokenClass && confidence > 0.8) ||
          now - lastSpokenTime > 4000
        ) {
          speakGoogleTTS(`Đây là ${currentClass}`);
          lastSpokenClass = currentClass;
          lastSpokenTime = now;
        }
      }
    }
  } catch (err) {
    console.error("❌ Lỗi dự đoán:", err);
  }
}

// ===================================================
// 🔊 Giọng nói Google tiếng Việt
// ===================================================
function speakGoogleTTS(text) {
  if (!window.speechSynthesis) return;

  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = "vi-VN";
  utter.pitch = 1;
  utter.rate = 0.95;
  utter.volume = 1;

  const voices = window.speechSynthesis.getVoices();
  const googleVoice = voices.find(v => v.name.includes("Google") && v.lang === "vi-VN");
  if (googleVoice) utter.voice = googleVoice;

  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utter);
}

// ===================================================
// 🔈 Bật / Tắt giọng nói
// ===================================================
function toggleVoice() {
  voiceEnabled = !voiceEnabled;
  alert(voiceEnabled ? "🔊 Giọng nói đã bật" : "🔇 Giọng nói đã tắt");
}

// ===================================================
// 🧩 Dừng camera & giọng nói khi đổi tab
// ===================================================
function stopCameraAndVoice() {
  if (webcam && webcam.stop) webcam.stop();
  window.speechSynthesis.cancel();
  isRunning = false;
  labelContainer.innerHTML = "⏹️ Camera đã dừng.";
}
