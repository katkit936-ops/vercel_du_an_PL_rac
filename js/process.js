document.getElementById("process-content").innerHTML = `
  <div class="btn-group mb-3">
    <button class="btn btn-outline-success" onclick="showProcess('organic')">Hữu cơ</button>
    <button class="btn btn-outline-success" onclick="showProcess('nonrecycle')">Vô cơ (không tái chế)</button>
    <button class="btn btn-outline-success" onclick="showProcess('recycle')">Vô cơ (tái chế)</button>
  </div>
  <div id="process-detail"></div>
`;

function showProcess(type) {
  let html = "";
  if (type === "organic") {
    html = `
      <h5>🌿 Quy trình xử lý rác hữu cơ</h5>
      <ul>
        <li>Thu gom rác thực phẩm, rau củ</li>
        <li>Ủ tạo phân bón hữu cơ</li>
      </ul>
    `;
  } else if (type === "nonrecycle") {
    html = `
      <h5>🗑️ Rác vô cơ không tái chế</h5>
      <ul>
        <li>Thu gom riêng biệt</li>
        <li>Đưa đi chôn lấp hoặc đốt an toàn</li>
      </ul>
    `;
  } else {
    html = `
      <h5>🔁 Rác vô cơ có thể tái chế</h5>
      <p>Gồm nhựa, kim loại, giấy...</p>
      <button class="btn btn-success" onclick="showTab('tab3', event)">👉 Đi đến Dự án tái chế</button>
    `;
  }
  document.getElementById("process-detail").innerHTML = html;
}
