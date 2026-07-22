document.addEventListener("DOMContentLoaded", async () => {
  const ITEMS_PER_PAGE = 3;

  const cardGrid = document.getElementById("cardGrid");
  const pagination = document.getElementById("pagination");
  const searchInput = document.getElementById("searchInput");
  const usernameEl = document.querySelector(".username");

  // ==========================================
  // 1. CEK SESSION & UBAH NAMA PENGGUNA JADI NIM
  // ==========================================
  if (typeof supabaseClient !== "undefined" && supabaseClient) {
    const {
      data: { session },
    } = await supabaseClient.auth.getSession();

    if (session) {
      const { data: mhsData, error: mhsError } = await supabaseClient
        .from("Mahasiswa")
        .select("NIM")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (mhsData && !mhsError && usernameEl) {
        usernameEl.textContent = mhsData.NIM;
      }
    }
  } else {
    console.error("SupabaseClient belum ter-load dengan benar!");
  }

  // ==========================================
  // 2. DROPDOWN PROFIL & LOGOUT
  // ==========================================
  const profileTrigger = document.getElementById("profileTrigger");
  const profileDropdown = document.getElementById("profileDropdown");
  const logoutLink = document.querySelector(".dropdown-item-danger");

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

  if (logoutLink) {
    logoutLink.addEventListener("click", async (e) => {
      e.preventDefault();
      if (typeof supabaseClient !== "undefined" && supabaseClient) {
        await supabaseClient.auth.signOut();
      }
      window.location.href = "../index.html";
    });
  }

  if (!cardGrid) return;

  // ==========================================
  // 3. LOGIC PENGAMBILAN DATA (Laporan_Temuan)
  // ==========================================
  async function getAllItems() {
    try {
      const { data, error } = await supabaseClient
        .from("Laporan_Temuan")
        .select("*")
        .eq("status", "Tersedia dipos")
        .order("created_at", { ascending: false }); // FIX: Memastikan sorting aman

      if (error) {
        console.error("Gagal mengambil data dari Supabase:", error);
        return [];
      }

      return data.map((item) => {
        let customId = "LT-" + String(item.Id_Temuan).padStart(3, "0");

        // FIX: Tanggal_Penemuan (sesuai field DB)
        let tglMurni = item.Tanggal_Penemuan || item.created_at || "-";
        if (tglMurni !== "-") tglMurni = tglMurni.split("T")[0];

        return {
          id: customId,
          nama: item.Nama_Barang || "-",
          lokasi: item.Lokasi_Penemuan || "-",
          tanggal: tglMurni,
          foto: item.Foto_Barang || null,
          icon: "fa-box-open",
        };
      });
    } catch (err) {
      console.error("Terjadi kesalahan sistem:", err);
      return [];
    }
  }

  let allItems = [];
  let filteredItems = [];
  let currentPage = 1;

  function renderCard(item) {
    const imageHTML = item.foto
      ? `<img src="${item.foto}" alt="${item.nama}" class="card-photo" />`
      : `<i class="fa-solid ${item.icon} placeholder-icon" aria-hidden="true"></i>`;

    return `
      <div class="card">
        <div class="card-img-container">
          ${imageHTML}
        </div>
        <div class="card-info">
          <table>
            <tr><td class="label">ID</td><td class="colon">:</td><td class="value">${item.id}</td></tr>
            <tr><td class="label">Nama Barang</td><td class="colon">:</td><td class="value">${item.nama}</td></tr>
            <tr><td class="label">Lokasi</td><td class="colon">:</td><td class="value">${item.lokasi}</td></tr>
            <tr><td class="label">Tanggal</td><td class="colon">:</td><td class="value">${item.tanggal}</td></tr>
          </table>
        </div>
        <a href="DetailBarangTemuan.html?id=${encodeURIComponent(item.id)}" class="detail-btn">Cek Detail</a>
      </div>
    `;
  }

  function renderEmptyState() {
    return `
      <div class="empty-state">
        <i class="fa-solid fa-box-open" aria-hidden="true"></i>
        <p>Tidak ada barang temuan yang cocok dengan pencarianmu.</p>
      </div>
    `;
  }

  function renderPagination(totalPages) {
    if (!pagination) return;
    if (totalPages <= 1) {
      pagination.innerHTML = "";
      return;
    }

    let html = `
      <button class="page-arrow" id="prevPage" ${currentPage === 1 ? "disabled" : ""}>
        <i class="fa-solid fa-angle-left"></i>
      </button>
    `;

    for (let i = 1; i <= totalPages; i++) {
      html += `<button class="page-num ${i === currentPage ? "active" : ""}" data-page="${i}">${i}</button>`;
    }

    html += `
      <button class="page-arrow" id="nextPage" ${currentPage === totalPages ? "disabled" : ""}>
        <i class="fa-solid fa-angle-right"></i>
      </button>
    `;

    pagination.innerHTML = html;

    pagination.querySelectorAll(".page-num").forEach((btn) => {
      btn.addEventListener("click", () => {
        currentPage = parseInt(btn.dataset.page, 10);
        render();
      });
    });

    document.getElementById("prevPage")?.addEventListener("click", () => {
      if (currentPage > 1) {
        currentPage -= 1;
        render();
      }
    });

    document.getElementById("nextPage")?.addEventListener("click", () => {
      if (currentPage < totalPages) {
        currentPage += 1;
        render();
      }
    });
  }

  function render() {
    const totalPages = Math.max(1, Math.ceil(filteredItems.length / ITEMS_PER_PAGE));
    if (currentPage > totalPages) currentPage = totalPages;

    if (filteredItems.length === 0) {
      cardGrid.innerHTML = renderEmptyState();
      renderPagination(0);
      return;
    }

    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    const pageItems = filteredItems.slice(start, start + ITEMS_PER_PAGE);
    cardGrid.innerHTML = pageItems.map(renderCard).join("");
    renderPagination(totalPages);
  }

  function applySearch(keyword) {
    const q = keyword.trim().toLowerCase();
    filteredItems = !q
      ? allItems.slice()
      : allItems.filter(
          (item) =>
            item.nama.toLowerCase().includes(q) ||
            item.lokasi.toLowerCase().includes(q) ||
            item.id.toLowerCase().includes(q)
        );
    currentPage = 1;
    render();
  }

  if (searchInput) {
    searchInput.addEventListener("input", (e) => applySearch(e.target.value));
  }

  cardGrid.innerHTML = `
    <div class="empty-state">
      <i class="fa-solid fa-spinner fa-spin" aria-hidden="true"></i>
      <p>Memuat data barang temuan...</p>
    </div>
  `;

  allItems = await getAllItems();
  filteredItems = allItems.slice();

  // ==========================================
  // 4. INISIALISASI NOTIFIKASI
  // ==========================================
  if (typeof initNotifications === "function") {
    initNotifications();
  }

  render();
});
