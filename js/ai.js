// ===============================
// 📸 AI Camera & Teachable Machine Handler
// ===============================

// ✅ Đường dẫn đến thư mục chứa model (tương đối so với index.html)
const URL = "./model/";

// ✅ Biến toàn cục
let model, webcam, labelContainer;
let facingMode = "user"; // Mặc định: camera trước (để laptop có thể mở được)
let maxPredictions;

// ===============================
// 🚀 Hàm khởi động (gọi khi bấm "Bắt đầu camera")
// ===============================
async function init() {
  try {
    // Ưu tiên GPU, nếu không có sẽ dùng CPU
    await tf.setBackend("webgl").catch(() => tf.setBackend("cpu"));

    // Đường dẫn model
    const modelURL = URL + "model.json";
    const metadataURL = URL + "metadata.json";

    // Kiểm tra model tồn tại
    const response = await fetch(modelURL);
    if (!response.ok) throw new Error(`Không tìm thấy model tại ${modelURL}`);

    // Tải model
    model = await tmImage.load(modelURL, metadataURL);
    maxPredictions = model.getTotalClasses();

    // Bắt đầu camera
    await startCamera();

    // Giao diện hiển thị
    labelContainer = document.getElementById("label-container");
    labelContainer.innerHTML = "Đang nhận diện...";
    window.requestAnimationFrame(loop);

  } catch (err) {
    console.error("Lỗi khởi tạo:", err);
    document.getElementById("label-container").innerHTML = `
      ⚠️ <span style="color:red;">Không thể tải model hoặc mở camera.</span><br>
      Chi tiết: ${err.message}
    `;
  }
}

// ===============================
// 🎥 Hàm khởi tạo hoặc đổi camera
// ===============================
async function startCamera() {
  try {
    // Nếu đã có webcam đang chạy thì tắt trước
    if (webcam && webcam.stop) webcam.stop();

    // Thiết lập webcam với hướng facingMode (user / environment)
    webcam = new tmImage.Webcam(300, 300, true);
    await webcam.setup({ facingMode });
    await webcam.play();

    // Gắn webcam vào giao diện
    const container = document.getElementById("webcam-container");
    container.innerHTML = "";
    container.appendChild(webcam.canvas);

  } catch (err) {
    console.error("Lỗi camera:", err);
    document.getElementById("label-container").innerHTML = `
      ⚠️ <span style="color:red;">Không thể mở camera. Hãy kiểm tra quyền truy cập!</span><br>
      Chi tiết: ${err.message}
    `;
  }
}

// ===============================
// 🔄 Hàm đổi camera (trước ⇆ sau)
// ===============================
function switchCamera() {
  // Đảo trạng thái camera
  facingMode = facingMode === "user" ? "environment" : "user";
  startCamera(); // Gọi lại camera với hướng mới
}

// ===============================
// 🔁 Vòng lặp dự đoán liên tục
// ===============================
async function loop() {
  webcam.update(); // Cập nhật frame
  await predict(); // Dự đoán vật thể
  window.requestAnimationFrame(loop);
}

// ===============================
// 🤖 Hàm nhận diện vật thể
// ===============================
async function predict() {
  if (!model || !webcam) return;

  const prediction = await model.predict(webcam.canvas);
  const best = prediction.reduce((a, b) =>
    a.probability > b.probability ? a : b
  );

  labelContainer.innerHTML = `
    ♻️ Loại rác: <b>${best.className}</b><br>
    🔍 Chắc chắn: ${(best.probability * 100).toFixed(1)}%
  `;
}
