// ===================================================
// 🤖 PHÂN LOẠI RÁC BẰNG AI - GIẢN LƯỢC GIAO DIỆN, TỐI ƯU TRÊN MOBILE
// ===================================================

const MODEL_URL = "./model/";
let model, labelContainer;
let webcam = null;
let facingMode = "user";
let maxPredictions = 0;

// Cấu hình
let isRunning = false;
let lastSpokenClass = "";
let lastSpokenTime = 0;

// Cấu hình tốc độ
const FRAME_INTERVAL = 150;        // ms giữa mỗi lần dự đoán
const DETECTION_THRESHOLD = 0.75;   // xác suất tối thiểu để được tính
const STABLE_THRESHOLD = 3;        // cần ổn định 3 khung hình

// ===================================================
// 🚀 Khởi tạo mô hình và camera
// ===================================================
async function init() {
  try {
    if (isRunning) return;
    isRunning = true;

    // “Đánh thức” audio context cho iOS/Android
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      osc.connect(ctx.destination);
      osc.start(0);
      osc.stop(0);
    } catch {}

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
    loop(); // bắt đầu vòng lặp liên tục
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

    labelContainer.innerHTML = "📸 Hãy đưa rác vào khung!";
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
// 📊 Dự đoán thông minh + giọng nói mặc định
// ===================================================
async function predict() {
  try {
    const prediction = await model.predict(webcam.video);
    const best = prediction.reduce((a, b) =>
      a.probability > b.probability ? a : b
    );

    const currentClass = best.className;
    const confidence = best.probability;

    // Không đủ độ tin cậy → không làm gì
    if (confidence < DETECTION_THRESHOLD) {
      stableCount = 0;
      return;
    }

    // Khi có vật thể rõ ràng
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
  } catch (err) {
    console.error("❌ Lỗi dự đoán:", err);
  }
}

// ===================================================
// 🔊 Giọng nói Google tiếng Việt (mặc định bật)
// ===================================================
function speakGoogleTTS(text) {
  if (!window.speechSynthesis) return;

  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = "vi-VN";
  utter.pitch = 1;
  utter.rate = 1;
  utter.volume = 1;

  const voices = window.speechSynthesis.getVoices();
  const googleVoice = voices.find(v => v.name.includes("Google") && v.lang === "vi-VN");
  if (googleVoice) utter.voice = googleVoice;

  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utter);
}

// ===================================================
// 🧩 Dừng camera & giọng nói
// ===================================================
function stopCameraAndVoice() {
  if (webcam && webcam.stop) webcam.stop();
  window.speechSynthesis.cancel();
  isRunning = false;
  labelContainer.innerHTML = "⏹️ Camera đã dừng.";
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
  } catch {}
}
checkCameraPermission();
