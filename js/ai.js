// ===================================================
// 🤖 PHÂN LOẠI RÁC BẰNG AI - Teachable Machine + Camera Tự Động
// ===================================================

const MODEL_URL = "./model/";

let model, labelContainer;
let webcam = null;
let facingMode = "user"; // "user" (trước) | "environment" (sau)
let maxPredictions = 0;

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
    document.getElementById("label-container").innerHTML = `
      ⚠️ <span style="color:red;">Không thể tải model hoặc khởi động camera.</span><br>
      ${err.message}
    `;
  }
}

// ===================================================
// 🎥 Khởi động camera (Tối ưu cho di động & laptop)
// ===================================================
async function startCamera() {
  try {
    if (webcam && webcam.stop) webcam.stop();

    const isMobile = /iPhone|Android|iPad/i.test(navigator.userAgent);
    const size = isMobile ? 300 : 340; // 📏 rộng hơn, vẫn vuông 1:1

    const constraints = {
      audio: false,
      video: {
        facingMode: facingMode === "user" ? "user" : { exact: "environment" },
        width: { ideal: size },
        height: { ideal: size }
      }
    };

    const stream = await navigator.mediaDevices.getUserMedia(constraints);

    // 🎥 Tạo phần tử video
    const video = document.createElement("video");
    video.setAttribute("autoplay", "");
    video.setAttribute("muted", ""); // iOS cần muted để không chặn autoplay
    video.setAttribute("playsinline", ""); // chặn iPhone bật full-screen

    video.width = size;
    video.height = size;
    video.srcObject = stream;

    // ⚙️ Gắn vào DOM trước khi play() để tránh Safari bật full-screen
    const container = document.getElementById("webcam-container");
    container.innerHTML = "";
    container.appendChild(video);

    try {
      await video.play();
    } catch (err) {
      console.warn("Không thể autoplay video:", err);
    }

    // 🎨 Giao diện camera
    video.style.width = `${size}px`;
    video.style.height = `${size}px`;
    video.style.border = "3px solid #3cb371";
    video.style.borderRadius = "16px";
    video.style.aspectRatio = "1 / 1";
    video.style.objectFit = "cover";
    video.style.boxShadow = "0 4px 12px rgba(0,0,0,0.25)";
    video.style.margin = "0 auto";
    video.style.display = "block";

    webcam = {
      canvas: video,
      stop: () => stream.getTracks().forEach(track => track.stop())
    };

    labelContainer.innerHTML = "📸 Camera sẵn sàng – hãy đưa vật thể vào khung!";

  } catch (err) {
    console.error("❌ Lỗi mở camera:", err);
    document.getElementById("label-container").innerHTML = `
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
// 🔁 Vòng lặp dự đoán liên tục
// ===================================================
async function loop() {
  if (webcam && webcam.canvas && model) {
    await predict();
  }
  window.requestAnimationFrame(loop);
}

// ===================================================
// 📊 Dự đoán kết quả
// ===================================================
async function predict() {
  try {
    const prediction = await model.predict(webcam.canvas);
    const best = prediction.reduce((a, b) =>
      a.probability > b.probability ? a : b
    );

    // 🎨 Khung kết quả gọn hơn, nổi bật
    labelContainer.innerHTML = `
      <div style="
        background: linear-gradient(145deg, #ffffff, #eafff2);
        border: 2px solid #2e8b57;
        border-radius: 14px;
        padding: 8px 16px;
        display: inline-block;
        box-shadow: 0 3px 8px rgba(0,0,0,0.15);
        font-size: 0.95rem;
        font-weight: 700;
        color: #1f703e;
      ">
        ♻️ ${best.className}<br>
        <span style="font-size: 0.85rem; color:#2c2c2c;">
          🔍 ${(best.probability * 100).toFixed(1)}%
        </span>
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
