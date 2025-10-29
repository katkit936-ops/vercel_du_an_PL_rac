document.getElementById("project-content").innerHTML = `
  <p>Chọn loại rác để thực hiện dự án tái chế:</p>
  <select id="wasteType" class="form-select w-75 mx-auto mb-3" onchange="showProject()">
    <option value="">-- Chọn loại rác --</option>
    <option value="plastic">Nhựa (chai, lọ)</option>
    <option value="paper">Giấy, bìa</option>
    <option value="metal">Kim loại</option>
  </select>
  <div id="project-detail"></div>
`;

function showProject() {
  const t = document.getElementById("wasteType").value;
  let html = "";

  if (t === "plastic") {
    html = `
      <h5>♻️ Tận dụng chai nhựa làm chậu cây</h5>
      <ol>
        <li>Rửa sạch và cắt chai theo hình mong muốn</li>
        <li>Đục lỗ thoát nước và trang trí</li>
        <li>Cho đất và trồng cây</li>
      </ol>
      <img src="./images/plastic_project.jpg" class="img-fluid rounded shadow">
    `;
  } else if (t === "paper") {
    html = `
      <h5>📦 Làm hộp bút từ bìa carton</h5>
      <ol>
        <li>Cắt và gấp bìa theo mẫu</li>
        <li>Dán các cạnh và trang trí</li>
      </ol>
      <img src="./images/paper_project.jpg" class="img-fluid rounded shadow">
    `;
  } else if (t === "metal") {
    html = `
      <h5>🔩 Đèn mini từ lon nhôm</h5>
      <ol>
        <li>Làm sạch lon và đục hoa văn</li>
        <li>Đặt đèn LED hoặc nến bên trong</li>
      </ol>
      <img src="./images/metal_project.jpg" class="img-fluid rounded shadow">
    `;
  }

  document.getElementById("project-detail").innerHTML = html;
}
