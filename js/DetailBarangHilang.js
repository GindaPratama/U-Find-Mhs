document.addEventListener("DOMContentLoaded", async () => {
  // 1. Setup Dropdown Profil
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

  // 2. Inisialisasi Notifikasi
  if (typeof initNotifications === "function") {
    initNotifications();
  }

  // 3. Setup Navbar NIM & Logout
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

  // 4. Logic Ambil Detail Barang
  const container = document.getElementById("detailContainer");
  const params = new URLSearchParams(window.location.search);
  const idString = params.get("id");

  if (!idString) {
    if (container) container.innerHTML = "<p>ID barang tidak ditemukan.</p>";
    return;
  }

  const numericId = parseInt(idString.split("-")[1], 10);

  try {
    const { data, error } = await supabaseClient
      .from("Laporan_Hilang")
      .select("*")
      .eq("Id_Laporan", numericId)
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
        <table>
          <tr><td class="label">ID</td><td class="colon">:</td><td class="value">${displayId}</td></tr>
          <tr><td class="label">Nama Barang</td><td class="colon">:</td><td class="value">${item.Nama_Barang}</td></tr>
          <tr><td class="label">Lokasi</td><td class="colon">:</td><td class="value">${item.Lokasi_Kejadian}</td></tr>
          <tr><td class="label">Tanggal</td><td class="colon">:</td><td class="value">${item.Tanggal_Kehilangan}</td></tr>
          <tr><td class="label">Ciri Khusus</td><td class="colon">:</td><td class="value">${item.Ciri_Khusus}</td></tr>
          <tr><td class="label">Status</td><td class="colon">:</td><td class="value"><span style="color: var(--gold); font-weight: 800; background: rgba(255,255,255,0.15); padding: 4px 10px; border-radius: 8px;">${item.status}</span></td></tr>
        </table>
      </div>
    `;

    const reportSection = document.createElement("div");
    reportSection.innerHTML = `
      <div class="claim-question">
        <p class="claim-question-title">Apakah Anda Menemukan Barang Ini?</p>
        <p class="claim-question-text">Jika ya, silakan laporkan penemuan Anda di pos Satpam agar dapat dikembalikan ke pemiliknya.</p>
      </div>
      <a href="LaporBarangTemuan.html" class="claim-btn">Laporkan Penemuan Barang</a>
    `;
    container.after(reportSection);
  }
});
