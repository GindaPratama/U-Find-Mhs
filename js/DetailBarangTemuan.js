document.addEventListener("DOMContentLoaded", async () => {
  // ==========================================
  // 1. SETUP DROPDOWN PROFIL
  // ==========================================
  const profileTrigger = document.getElementById("profileTrigger");
  const profileDropdown = document.getElementById("profileDropdown");

  if (profileTrigger && profileDropdown) {
    profileTrigger.addEventListener("click", (e) => {
      e.stopPropagation();
      profileDropdown.classList.toggle("open");
      profileTrigger.classList.toggle("open");
    });

    document.addEventListener("click", (e) => {
      if (!profileDropdown.contains(e.target) && !profileTrigger.contains(e.target)) {
        profileDropdown.classList.remove("open");
        profileTrigger.classList.remove("open");
      }
    });
  }

  // ==========================================
  // 2. INISIALISASI NOTIFIKASI
  // ==========================================
  if (typeof initNotifications === "function") {
    initNotifications();
  }

  // ==========================================
  // 3. SETUP NAVBAR NIM & LOGOUT
  // ==========================================
  const usernameLabel = document.getElementById("usernameLabel");
  const logoutBtn = document.getElementById("logoutBtn");

  if (typeof supabaseClient !== "undefined") {
    const {
      data: { session },
    } = await supabaseClient.auth.getSession();
    if (session) {
      supabaseClient
        .from("Mahasiswa")
        .select("NIM")
        .eq("user_id", session.user.id)
        .maybeSingle()
        .then(({ data: mhs }) => {
          if (mhs && usernameLabel) usernameLabel.textContent = mhs.NIM;
        });
    }
  }

  logoutBtn?.addEventListener("click", async (e) => {
    e.preventDefault();
    if (typeof supabaseClient !== "undefined") {
      await supabaseClient.auth.signOut();
    }
    window.location.href = "../index.html";
  });

  // ==========================================
  // 4. LOGIC AMBIL DETAIL BARANG
  // ==========================================
  const container = document.getElementById("detailContainer");
  const params = new URLSearchParams(window.location.search);
  const idString = params.get("id"); // Format: LT-00X

  if (!idString) {
    if (container) container.innerHTML = "<p>ID barang tidak ditemukan.</p>";
    return;
  }

  // Parse ID (contoh: LT-005 -> 5)
  const numericId = parseInt(idString.split("-")[1], 10);

  try {
    const { data, error } = await supabaseClient
      .from("Laporan_Temuan")
      .select("*")
      .eq("Id_Temuan", numericId)
      .single();

    if (error || !data) throw new Error("Data tidak ditemukan");

    renderDetail(data, idString);
  } catch (err) {
    if (container) {
      container.innerHTML = `<div class="empty-state"><i class="fa-solid fa-exclamation-circle"></i><p>Barang tidak ditemukan.</p></div>`;
    }
  }

  function renderDetail(item, displayId) {
    if (!container) return;

    container.innerHTML = `
      <div class="photo-card">
        <p class="photo-label">Gambar Barang</p>
        <div class="photo-frame">
          ${
            item.Foto_Barang
              ? `<img src="${item.Foto_Barang}" alt="${item.Nama_Barang}" />`
              : `<i class="fa-solid fa-box-open placeholder-icon-lg"></i>`
          }
        </div>
      </div>
      <div class="info-card">
        <p class="info-title">SEDANG DICARI!!</p>
        <table>
          <tr><td class="label">ID</td><td class="colon">:</td><td class="value">${displayId}</td></tr>
          <tr><td class="label">Nama Barang</td><td class="colon">:</td><td class="value">${item.Nama_Barang}</td></tr>
          <tr><td class="label">Lokasi</td><td class="colon">:</td><td class="value">${item.Lokasi_Penemuan}</td></tr>
          <tr><td class="label">Tanggal</td><td class="colon">:</td><td class="value">${item.Tanggal_Penemuan}</td></tr>
          <tr><td class="label">Ciri Khusus</td><td class="colon">:</td><td class="value">${item.Ciri_Khusus}</td></tr>
        </table>
      </div>
    `;

    // Tambahkan tombol klaim di bawah
    const claimSection = document.createElement("div");
    claimSection.innerHTML = `
      <div class="claim-question">
        <p class="claim-question-title">Apakah ini Barang Milik Anda?</p>
        <p class="claim-question-text">Jika ya, silakan ajukan klaim untuk mengambil barang ini di pos Satpam.</p>
      </div>
      <a href="AjukanKepemilikanBarang.html?id=${displayId}" class="claim-btn">Ajukan Klaim Kepemilikan</a>
    `;
    container.after(claimSection);
  }
});
