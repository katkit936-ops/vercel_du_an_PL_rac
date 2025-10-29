const URL = "./model/";
let model, webcam, labelContainer, facingMode = "environment"; // sau lưng
let facingMode = "environment";
async function init() {
  try {
    await tf.setBackend('webgl').catch(() => tf.setBackend('cpu'));

    const modelURL = URL + "model.json";
    const metadataURL = URL + "metadata.json";
    model = await tmImage.load(modelURL, metadataURL);

    await startCamera();

    labelContainer = document.getElementById("label-container");
    labelContainer.innerHTML = "Đang nhận diện...";
    window.requestAnimationFrame(loop);
  } catch (err) {
    console.error("Lỗi:", err);
    document.getElementById("label-container").innerHTML =
      "⚠️ Không thể tải model hoặc camera.";
  }
}

async function startCamera() {
  if (webcam && webcam.stop) webcam.stop();
  webcam = new tmImage.Webcam(300, 300, true);
  await webcam.setup({ facingMode });
  await webcam.play();

  const container = document.getElementById("webcam-container");
  container.innerHTML = "";
  container.appendChild(webcam.canvas);
}

function switchCamera() {
  facingMode = facingMode === "user" ? "environment" : "user";
  startCamera();
}

async function loop() {
  webcam.update();
  await predict();
  window.requestAnimationFrame(loop);
}

async function predict() {
  const prediction = await model.predict(webcam.canvas);
  let best = prediction.reduce((a, b) =>
    a.probability > b.probability ? a : b
  );
  labelContainer.innerHTML = `
    ♻️ Loại rác: <b>${best.className}</b><br>
    🔍 Chắc chắn: ${(best.probability * 100).toFixed(1)}%`;
}
