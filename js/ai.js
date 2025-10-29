// ===================================================
// 🤖 PHÂN LOẠI RÁC BẰNG AI - Teachable Machine + Giọng nói Google + Dừng khi đổi tab
// ===================================================

const MODEL_URL = "./model/";
let model, labelContainer;
let webcam = null;
let facingMode = "user";
let maxPredictions = 0;

// Biến điều khiển
let lastSpokenClass = "";
let lastSpokenTime = 0;
const speakDelay = 2500;
let isRunning = false;
let isSpeaking = false;

// Ngưỡng để xác định có vật thể hay không
const DETECTION_THRESHOLD = 0.80; // 80%

// ===================================================
// 🚀 Khởi tạo mô hình & camera
// ===================================================
async function init() {
  try {
    if (isRunning) return;
    isRunning = true;

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
    window.requestAnimationFrame(loop);
  } catch (err) {
    console.error("❌ Lỗi khởi tạo:", err);
    labelContainer.innerHTML = `
      ⚠️ Không thể tải model hoặc khởi động camera.<br>
      ${err.message}
    `;
  }
}

// ===================================================
// 🎥 Bật camera
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
    console.error("❌ Lỗi mở camera:", err);
    labelContainer.innerHTML = `
      ⚠️ Không thể mở camera.<br>${err.message}<br>
      👉 Kiểm tra quyền camera hoặc thử lại bằng Chrome.
    `;
  }
}

// ===================================================
// 🔄 Đổi camera trước/sau
// ===================================================
async function switchCamera() {
  facingMode = facingMode === "user" ? "environment" : "user";
  labelContainer.innerHTML = `🔄 Đang chuyển sang camera ${
    facingMode === "user" ? "trước" : "sau"
  }...`;
  await startCamera();
}

// ===================================================
// 🔁 Vòng lặp dự đoán
// ===================================================
let lastPrediction = "";
let stableCount = 0;
const stableThreshold = 4;

async function loop() {
  if (isRunning && webcam && webcam.video && model) {
    await predict();
    setTimeout(() => window.requestAnimationFrame(loop), 400);
  }
}

// ===================================================
// 📊 Dự đoán thông minh - chỉ khi có vật thể
// ===================================================
async function predict() {
  try {
    const prediction = await model.predict(webcam.video);
    const best = prediction.reduce((a, b) =>
      a.probability > b.probability ? a : b
    );

    const currentClass = best.className;
    const confidence = best.probability;

    // Nếu không có vật thể đủ tin cậy
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
        </div>
      `;
      window.speechSynthesis.cancel(); // dừng giọng nếu đang nói
      lastSpokenClass = "";
      stableCount = 0;
      return;
    }

    // Khi có vật thể
    if (currentClass === lastPrediction) stableCount++;
    else stableCount = 0;
    lastPrediction = currentClass;

    if (stableCount >= stableThreshold) {
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
        </div>
      `;

      const now = Date.now();
      if (
        (currentClass !== lastSpokenClass && confidence > 0.8) ||
        now - lastSpokenTime > speakDelay * 2
      ) {
        speakGoogleTTS(`Đây là ${currentClass}`);
        lastSpokenClass = currentClass;
        lastSpokenTime = now;
      }
    }
  } catch (err) {
    console.error("❌ Lỗi dự đoán:", err);
    labelContainer.innerHTML = `⚠️ Không thể nhận diện.`;
  }
}

// ===================================================
// 🔊 Giọng nói tiếng Việt Google
// ===================================================
function speakGoogleTTS(text) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();

  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = "vi-VN";
  utter.pitch = 1;
  utter.rate = 0.95;
  utter.volume = 1;

  const voices = window.speechSynthesis.getVoices();
  const googleVoice = voices.find(v => v.name.includes("Google") && v.lang === "vi-VN");
  if (googleVoice) utter.voice = googleVoice;

  isSpeaking = true;
  utter.onend = () => (isSpeaking = false);
  window.speechSynthesis.speak(utter);
}

// ===================================================
// 🧩 Dừng camera & giọng nói khi đổi tab
// ===================================================
function stopCameraAndVoice() {
  if (webcam && webcam.stop) webcam.stop();
  window.speechSynthesis.cancel();
  isRunning = false;
  labelContainer.innerHTML = "⏹️";
}

// ===================================================
// 🔐 Kiểm tra quyền camera
// ===================================================
async function checkCameraPermission() {
  try {
    if (!navigator.permissions) return;
    const status = await navigator.permissions.query({ name: "camera" });
    if (status.state === "denied") {
      alert("❗ Ứng dụng chưa được cấp quyền camera. Hãy vào Cài đặt để bật lại.");
    }
  } catch (err) {
    console.warn("Không thể kiểm tra quyền camera:", err);
  }
}
checkCameraPermission();
