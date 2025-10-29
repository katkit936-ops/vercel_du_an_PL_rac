// ===================================================
// 🤖 PHÂN LOẠI RÁC BẰNG AI + GOOGLE TTS TIẾNG VIỆT
// ===================================================

// ✅ Đường dẫn model
const MODEL_URL = "./model/";

// ✅ Biến toàn cục
let model, labelContainer;
let webcam = null;
let facingMode = "user";
let maxPredictions = 0;
let isSpeaking = false;
let previousLabel = "";
let speakingTimeout;

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
    labelContainer.innerHTML = "📷 Đang khởi động camera...";

    await startCamera();
    window.requestAnimationFrame(loop);

  } catch (err) {
    console.error("❌ Lỗi khởi tạo:", err);
    document.getElementById("label-container").innerHTML = `
      ⚠️ <span style="color:red;">Không thể tải model hoặc mở camera.</span><br>
      ${err.message}
    `;
  }
}

// ===================================================
// 🎥 Mở camera (Tối ưu cho di động & laptop)
// ===================================================
async function startCamera() {
  try {
    if (webcam && webcam.stop) webcam.stop();

    const isMobile = /iPhone|Android|iPad/i.test(navigator.userAgent);
    const size = isMobile ? 280 : 340; // kích thước vừa đủ

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
    video.playsInline = true; // tránh full-screen trên iPhone
    video.srcObject = stream;

    // giao diện camera
    video.style.border = "3px solid #3cb371";
    video.style.borderRadius = "14px";
    video.style.aspectRatio = "1 / 1";
    video.style.objectFit = "cover";
    video.style.boxShadow = "0 4px 10px rgba(0,0,0,0.25)";
    video.style.maxWidth = isMobile ? "85vw" : "400px";

    const container = document.getElementById("webcam-container");
    container.innerHTML = "";
    container.appendChild(video);

    webcam = {
      canvas: video,
      stop: () => stream.getTracks().forEach(track => track.stop())
    };

    labelContainer.innerHTML = "📸 Camera đã sẵn sàng – hãy hướng vật thể vào khung.";
  } catch (err) {
    console.error("❌ Lỗi mở camera:", err);
    document.getElementById("label-container").innerHTML = `
      ⚠️ Không thể mở camera.<br>
      ${err.message}<br>
      👉 Hãy cấp quyền truy cập camera hoặc thử lại bằng Chrome.
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
// 🔁 Vòng lặp dự đoán liên tục
// ===================================================
async function loop() {
  if (webcam && webcam.canvas && model) {
    await predict();
  }
  window.requestAnimationFrame(loop);
}

// ===================================================
// 📊 Dự đoán + Kích hoạt giọng nói thông minh
// ===================================================
async function predict() {
  try {
    const prediction = await model.predict(webcam.canvas);
    const best = prediction.reduce((a, b) =>
      a.probability > b.probability ? a : b
    );

    // chỉ dự đoán khi có vật thể thật (độ tin cậy > 0.7)
    if (best.probability > 0.7) {
      labelContainer.innerHTML = `
        ♻️ Loại rác: <b>${best.className}</b><br>
        🔍 Độ tin cậy: ${(best.probability * 100).toFixed(1)}%
      `;

      // chỉ nói khi nhãn thay đổi để tránh nói liên tục
      if (best.className !== previousLabel && !isSpeaking) {
        previousLabel = best.className;
        await speakVietnamese(`Đây là ${best.className}`);
      }
    } else {
      labelContainer.innerHTML = `
        ♻️ Đang chờ vật thể...
      `;
      previousLabel = "";
    }
  } catch (err) {
    console.error("❌ Lỗi dự đoán:", err);
    labelContainer.innerHTML = `⚠️ Không thể dự đoán.`;
  }
}

// ===================================================
// 🔊 Phát giọng nói tiếng Việt qua Google TTS
// ===================================================
async function speakVietnamese(text) {
  try {
    isSpeaking = true;
    clearTimeout(speakingTimeout);

    const response = await fetch("/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text })
    });

    const data = await response.json();
    if (!data.audio) throw new Error("Không nhận được âm thanh");

    const audio = new Audio(data.audio);
    audio.volume = 1.0;
    await audio.play();

    // chờ nói xong mới cho phép nói tiếp
    audio.onended = () => {
      isSpeaking = false;
    };

    // tránh treo trạng thái nói quá lâu
    speakingTimeout = setTimeout(() => {
      isSpeaking = false;
    }, 7000);
  } catch (err) {
    console.error("Không thể phát âm thanh:", err);
    isSpeaking = false;
  }
}

// ===================================================
// 🧩 Dừng camera khi đổi tab
// ===================================================
function stopCamera() {
  if (webcam && webcam.stop) {
    webcam.stop();
    webcam = null;
  }
  if (labelContainer) labelContainer.innerHTML = "📷 Camera đã tắt.";
}

// ===================================================
// ⚡ Gắn sự kiện khi đổi tab
// ===================================================
document.querySelectorAll("nav button").forEach(btn => {
  btn.addEventListener("click", stopCamera);
});

// ===================================================
// 🔐 Kiểm tra quyền camera
// ===================================================
async function checkCameraPermission() {
  try {
    if (!navigator.permissions) return;
    const status = await navigator.permissions.query({ name: "camera" });
    if (status.state === "denied") {
      alert("❗ Ứng dụng chưa được cấp quyền camera. Vui lòng bật lại trong Cài đặt.");
    }
  } catch (err) {
    console.warn("Không thể kiểm tra quyền camera:", err);
  }
}

checkCameraPermission();
