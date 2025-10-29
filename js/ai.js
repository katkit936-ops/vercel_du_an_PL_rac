// ===================================================
// 🤖 PHÂN LOẠI RÁC BẰNG AI - Teachable Machine + Camera
// ===================================================

// ✅ Đường dẫn tới model (tương đối với index.html)
const MODEL_URL = "./model/";

// ✅ Biến toàn cục
let model, labelContainer;
let webcam = null;
let facingMode = "user"; // "user" (camera trước) hoặc "environment" (camera sau)
let maxPredictions = 0;
let detecting = false; // kiểm soát vòng lặp dự đoán

// ===================================================
// 🚀 Khởi tạo mô hình & camera
// ===================================================
async function init() {
  try {
    await tf.setBackend("webgl").catch(() => tf.setBackend("cpu"));

    const modelURL = MODEL_URL + "model.json";
    const metadataURL = MODEL_URL + "metadata.json";

    // Kiểm tra model tồn tại
    const check = await fetch(modelURL);
    if (!check.ok) throw new Error(`Không tìm thấy model tại ${modelURL}`);

    // Tải mô hình
    model = await tmImage.load(modelURL, metadataURL);
    maxPredictions = model.getTotalClasses();

    // Gắn nhãn container
    labelContainer = document.getElementById("label-container");
    labelContainer.innerHTML = "📷 Đang khởi tạo camera...";

    await startCamera();

    detecting = true;
    window.requestAnimationFrame(loop);

  } catch (err) {
    console.error("❌ Lỗi khởi tạo:", err);
    document.getElementById("label-container").innerHTML = `
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
    const size = isMobile ? 260 : 300;

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
    video.width = size;
    video.height = size;
    video.autoplay = true;
    video.playsInline = true; // cần thiết cho iOS
    video.srcObject = stream;
    video.style.border = "3px solid #3cb371";
    video.style.borderRadius = "14px";
    video.style.maxWidth = isMobile ? "85vw" : "320px";
    video.style.aspectRatio = "1 / 1";
    video.style.objectFit = "cover";
    video.style.boxShadow = "0 4px 12px rgba(0,0,0,0.25)";
    video.muted = true;

    const container = document.getElementById("webcam-container");
    container.innerHTML = "";
    container.appendChild(video);

    webcam = {
      canvas: video,
      stop: () => stream.getTracks().forEach(track => track.stop())
    };

    labelContainer.innerHTML = "📸 Camera sẵn sàng – Hãy hướng vật thể vào khung!";

  } catch (err) {
    console.error("❌ Lỗi mở camera:", err);
    document.getElementById("label-container").innerHTML = `
      ⚠️ Không thể mở camera.<br>
      ${err.message}<br>
      👉 Hãy kiểm tra quyền camera hoặc thử lại bằng Chrome.
    `;
  }
}

// ===================================================
// 🔄 Chuyển camera (trước / sau)
// ===================================================
async function switchCamera() {
  facingMode = facingMode === "user" ? "environment" : "user";
  labelContainer.innerHTML = `🔄 Đang chuyển sang camera ${facingMode === "user" ? "trước" : "sau"}...`;
  await startCamera();
}

// ===================================================
// 🔁 Vòng lặp dự đoán
// ===================================================
async function loop() {
  if (detecting && webcam && webcam.canvas && model) {
    await predict();
  }
  window.requestAnimationFrame(loop);
}

// ===================================================
// 📊 Dự đoán vật thể
// ===================================================
async function predict() {
  try {
    const prediction = await model.predict(webcam.canvas);
    const best = prediction.reduce((a, b) =>
      a.probability > b.probability ? a : b
    );

    labelContainer.innerHTML = `
      <div style="
        background:#fff;
        border:2px solid #2e8b57;
        border-radius:14px;
        padding:10px 18px;
        display:inline-block;
        box-shadow:0 2px 6px rgba(0,0,0,0.1);
      ">
        ♻️ <b>Loại rác:</b> ${best.className}<br>
        🔍 <b>Độ tin cậy:</b> ${(best.probability * 100).toFixed(1)}%
      </div>
    `;
  } catch (err) {
    console.error("❌ Lỗi dự đoán:", err);
    labelContainer.innerHTML = `
      ⚠️ Không thể nhận diện. Vui lòng kiểm tra lại model hoặc camera.
    `;
  }
}

// ===================================================
// 🧩 Dừng camera (khi chuyển tab)
// ===================================================
function stopCamera() {
  detecting = false;
  if (webcam && webcam.stop) webcam.stop();
  const container = document.getElementById("webcam-container");
  container.innerHTML = "";
  if (labelContainer) labelContainer.innerHTML = "📷 Camera đã tắt.";
}
