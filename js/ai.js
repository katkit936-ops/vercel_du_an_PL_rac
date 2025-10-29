// ===================================================
// 🤖 PHÂN LOẠI RÁC BẰNG AI - Teachable Machine + Giọng nói
// ===================================================

const MODEL_URL = "./model/";

let model, labelContainer;
let webcam = null;
let facingMode = "user";
let maxPredictions = 0;

// Biến kiểm soát giọng nói
let lastSpokenClass = "";
let lastSpokenTime = 0;
const speakDelay = 2500; // nói cách nhau ít nhất 2.5s

// ===================================================
// 🚀 Khởi tạo mô hình & camera
// ===================================================
async function init() {
  try {
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
      ⚠️ <span style="color:red;">Không thể tải model hoặc khởi động camera.</span><br>
      ${err.message}
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
    const size = isMobile ? 340 : 440; // khung to hơn, vẫn 1:1

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
    video.setAttribute("autoplay", "");
    video.setAttribute("muted", "");
    video.setAttribute("playsinline", "");
    video.width = size;
    video.height = size;
    video.srcObject = stream;

    const container = document.getElementById("webcam-container");
    container.innerHTML = "";
    container.appendChild(video);
    await video.play();

    // 🎨 Giao diện
    video.style.width = `${size}px`;
    video.style.height = `${size}px`;
    video.style.border = "4px solid #2e8b57";
    video.style.borderRadius = "18px";
    video.style.aspectRatio = "1 / 1";
    video.style.objectFit = "cover";
    video.style.boxShadow = "0 6px 14px rgba(0,0,0,0.25)";
    video.style.margin = "10px auto";
    video.style.display = "block";

    webcam = {
      canvas: video,
      stop: () => stream.getTracks().forEach(track => track.stop())
    };

    labelContainer.innerHTML = "📸 Camera sẵn sàng – hãy hướng vật thể vào khung!";
  } catch (err) {
    console.error("❌ Lỗi mở camera:", err);
    labelContainer.innerHTML = `
      ⚠️ Không thể mở camera.<br>
      ${err.message}<br>
      👉 Kiểm tra quyền truy cập camera hoặc thử lại bằng Chrome.
    `;
  }
}

// ===================================================
// 🔄 Chuyển camera (trước/sau)
// ===================================================
async function switchCamera() {
  facingMode = facingMode === "user" ? "environment" : "user";
  labelContainer.innerHTML = `🔄 Đang chuyển sang camera ${
    facingMode === "user" ? "trước" : "sau"
  }...`;
  await startCamera();
}

// ===================================================
// 🔁 Vòng lặp dự đoán liên tục (ổn định, không spam)
// ===================================================
let lastPrediction = "";
let stableCount = 0;
const stableThreshold = 4; // cần 4 frame giống nhau mới xác nhận kết quả

async function loop() {
  if (webcam && webcam.canvas && model) {
    await predict();
  }
  window.requestAnimationFrame(loop);
}

// ===================================================
// 📊 Dự đoán + Giọng nói
// ===================================================
async function predict() {
  try {
    const prediction = await model.predict(webcam.canvas);
    const best = prediction.reduce((a, b) =>
      a.probability > b.probability ? a : b
    );

    const currentClass = best.className;
    const confidence = (best.probability * 100).toFixed(1);

    // Giữ kết quả ổn định trước khi hiển thị
    if (currentClass === lastPrediction) {
      stableCount++;
    } else {
      stableCount = 0;
    }
    lastPrediction = currentClass;

    // Chỉ hiển thị nếu ổn định vài khung
    if (stableCount >= stableThreshold) {
      labelContainer.innerHTML = `
        <div style="
          background: linear-gradient(145deg, #ffffff, #eafff2);
          border: 2px solid #2e8b57;
          border-radius: 14px;
          padding: 8px 16px;
          display: inline-block;
          box-shadow: 0 3px 8px rgba(0,0,0,0.15);
          font-size: 1rem;
          font-weight: 700;
          color: #1f703e;
        ">
          ♻️ ${currentClass}<br>
          <span style="font-size: 0.9rem; color:#2c2c2c;">
            🔍 ${confidence}%
          </span>
        </div>
      `;

      // 🔊 Phát giọng nói chỉ khi loại rác đổi hoặc độ tin cậy > 80%
      const now = Date.now();
      if (
        (currentClass !== lastSpokenClass && confidence > 75) ||
        now - lastSpokenTime > speakDelay * 2
      ) {
        speakVietnamese(`Đây là ${currentClass}`);
        lastSpokenClass = currentClass;
        lastSpokenTime = now;
      }
    }
  } catch (err) {
    console.error("❌ Lỗi dự đoán:", err);
    labelContainer.innerHTML = `
      ⚠️ Không thể nhận diện. Vui lòng kiểm tra lại model hoặc camera.
    `;
  }
}

// ===================================================
// 🔊 Giọng nói tiếng Việt (SpeechSynthesis)
// ===================================================
function speakVietnamese(text) {
  if (!("speechSynthesis" in window)) return;

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "vi-VN";
  utterance.rate = 0.95; // tốc độ nói chậm rãi
  utterance.pitch = 1;
  utterance.volume = 1;
  window.speechSynthesis.cancel(); // tránh chồng tiếng
  window.speechSynthesis.speak(utterance);
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
