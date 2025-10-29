function showTab(id, event) {
  document.querySelectorAll('nav button').forEach(b=>b.classList.remove('active'));
  document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  if (event) event.target.classList.add('active');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

const gallery = document.getElementById('gallery');
const rankList = document.getElementById('rank-list');
let images = [];

function uploadImage() {
  const file = document.getElementById('imgUpload').files[0];
  if (!file) return alert('Vui lòng chọn ảnh!');
  const reader = new FileReader();
  reader.onload = e => { images.push({ src: e.target.result, votes: 0 }); renderGallery(); };
  reader.readAsDataURL(file);
}

function vote(i){ images[i].votes++; renderGallery(); renderRank(); }

function renderGallery(){
  gallery.innerHTML='';
  images.forEach((img,i)=>{
    gallery.innerHTML+=`
      <div class="text-center">
        <img src="${img.src}" alt="Sản phẩm tái chế">
        <p>❤️ ${img.votes}</p>
        <button class="btn btn-outline-success btn-sm" onclick="vote(${i})">Bình chọn</button>
      </div>`;
  });
}

function renderRank(){
  rankList.innerHTML='';
  [...images].sort((a,b)=>b.votes-a.votes).forEach((img,i)=>{
    rankList.innerHTML+=`<li class="list-group-item d-flex justify-content-between">#${i+1} ❤️ ${img.votes}</li>`;
  });
}
