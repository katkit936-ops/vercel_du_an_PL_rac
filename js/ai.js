// ===============================
// 🤖 AI NHẬN DIỆN RÁC - Teachable Machine + Camera đa thiết bị
// ===============================

// ✅ Đường dẫn đến thư mục model (tương đối với index.html)
const MODEL_URL = "./model/";

// ✅ Biến toàn cục
let model, labelContainer;
let webcam = null;
let facingMode = "user"; // "user" (trước) | "environment" (sau)
let maxPredictions = 0;

// ===============================
// 🚀 Khởi tạo mô hình & camera
// ===============================
async function init() {
  try {
    // Thiết lập backend tối ưu: dùng GPU nếu có
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
    labelContainer.innerHTML = "Đang khởi động camera...";

    // Bắt đầu camera
    await startCamera();

    // Bắt đầu vòng lặp dự đoán
    window.requestAnimationFrame(loop);

  } catch (err) {
    console.error("❌ Lỗi khởi tạo:", err);
    document.getElementById("label-container").innerHTML = `
      ⚠️ <span style="color:red;">Không thể tải model hoặc mở camera.</span><br>
      ${err.message}
    `;
  }
}

// ===============================
// 🎥 Khởi động camera (tương thích di động)
// ===============================
async function startCamera() {
  try {
    // Dừng camera cũ (nếu có)
    if (webcam && webcam.stop) webcam.stop();

    const constraints = {
      audio: false,
      video: {
        facingMode: facingMode === "user" ? "user" : { exact: "environment" },
        width: { ideal: 320 },
        height: { ideal: 320 }
      }
    };

    // Truy cập camera
    const stream = await navigator.mediaDevices.getUserMedia(constraints);

    // Tạo phần tử video
    const video = document.createElement("video");
    video.width = 320;
    video.height = 320;
    video.autoplay = true;
    video.playsInline = true; // quan trọng cho iOS
    video.srcObject = stream;
    video.style.border = "3px solid #3cb371";
    video.style.borderRadius = "12px";
    video.style.maxWidth = "90vw";

    // Hiển thị camera lên giao diện
    const container = document.getElementById("webcam-container");
    container.innerHTML = "";
    container.appendChild(video);

    // Gán lại webcam object cho predict()
    webcam = {
      canvas: video,
      stop: () => stream.getTracks().forEach(track => track.stop())
    };

    labelContainer.innerHTML = "📷 Camera đã sẵn sàng!";

  } catch (err) {
    console.error("❌ Lỗi mở camera:", err);
    document.getElementById("label-container").innerHTML = `
      ⚠️ Không thể mở camera.<br>
      ${err.message}<br>
      👉 Hãy kiểm tra quyền truy cập camera hoặc thử lại bằng Chrome.
    `;
  }
}

// ===============================
// 🔄 Chuyển đổi camera (trước/sau)
// ===============================
async function switchCamera() {
  facingMode = facingMode === "user" ? "environment" : "user";
  labelContainer.innerHTML = `🔄 Đang chuyển sang camera ${facingMode === "user" ? "trước" : "sau"}...`;
  await startCamera();
}

// ===============================
// 🔁 Vòng lặp dự đoán liên tục
// ===============================
async function loop() {
  if (webcam && webcam.canvas && model) {
    await predict();
  }
  window.requestAnimationFrame(loop);
}

// ===============================
// 📊 Hàm dự đoán vật thể
// ===============================
async function predict() {
  try {
    const prediction = await model.predict(webcam.canvas);
    const best = prediction.reduce((a, b) =>
      a.probability > b.probability ? a : b
    );

    labelContainer.innerHTML = `
      ♻️ Loại rác: <b>${best.className}</b><br>
      🔍 Độ tin cậy: ${(best.probability * 100).toFixed(1)}%
    `;
  } catch (err) {
    console.error("❌ Lỗi dự đoán:", err);
    labelContainer.innerHTML = `
      ⚠️ Không thể dự đoán. Kiểm tra lại model hoặc camera.
    `;
  }
}

// ===============================
// 🧩 Kiểm tra quyền camera ban đầu (tùy chọn)
// ===============================
async function checkCameraPermission() {
  try {
    const status = await navigator.permissions.query({ name: "camera" });
    if (status.state === "denied") {
      alert("❗ Ứng dụng chưa được cấp quyền camera. Vui lòng vào Cài đặt để bật lại.");
    }
  } catch (err) {
    console.warn("Không thể kiểm tra quyền camera:", err);
  }
}

// Gọi tự động kiểm tra khi tải trang
checkCameraPermission();
