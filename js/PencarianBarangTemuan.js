/**
 * PencarianBarangTemuan.js
 * Logic khusus halaman Pencarian Barang Temuan — berdiri sendiri, tidak
 * bergantung ke file lain. Merender kartu, search filter, dan pagination.
 *
 * --- UNTUK DIHUBUNGKAN KE SUPABASE ---
 * Ganti isi getAllItems() jadi query ke tabel "barang_temuan", contoh:
 *
 *   const { data, error } = await supabase
 *     .from('barang_temuan')
 *     .select('*')
 *     .order('tanggal', { ascending: false });
 *
 *   return error ? [] : data;
 *
 * Kalau nanti search juga mau dilakukan di server (bukan di browser),
 * applySearch() bisa diganti untuk memanggil ulang getAllItems() dengan
 * filter `.ilike('nama', `%${keyword}%`)` dsb., lalu render() dipanggil
 * dengan hasilnya.
 */
(function () {
  const ITEMS_PER_PAGE = 6;

  const cardGrid = document.getElementById("cardGrid");
  const pagination = document.getElementById("pagination");
  const searchInput = document.getElementById("searchInput");

  if (!cardGrid) return;

  // Data sementara — nanti akan digantikan oleh tabel "barang_temuan" di Supabase.
  const SAMPLE_DATA = [
    {
      id: "LT-001",
      nama: "Dompet",
      icon: "fa-wallet",
      lokasi: "Ruangan 5306",
      tanggal: "23/06/2026",
    },
    {
      id: "LT-002",
      nama: "SmartWatch",
      icon: "fa-clock",
      lokasi: "Musholla Perpustakaan",
      tanggal: "21/06/2026",
    },
    {
      id: "LT-003",
      nama: "Kacamata",
      icon: "fa-glasses",
      lokasi: "Depan Gedung Miracle",
      tanggal: "30/06/2026",
    },
  ];

  async function getAllItems() {
    // ==== GANTI BLOK DI BAWAH INI DENGAN QUERY SUPABASE ====
    // const { data, error } = await supabase
    //   .from('barang_temuan')
    //   .select('*')
    //   .order('tanggal', { ascending: false });
    // return error ? [] : data;
    // ========================================================
    return SAMPLE_DATA;
  }

  let allItems = [];
  let filteredItems = [];
  let currentPage = 1;

  function renderCard(item) {
    return `
      <div class="card">
        <div class="card-img-container">
          <i class="fa-solid ${item.icon} placeholder-icon" aria-hidden="true"></i>
        </div>
        <div class="card-info">
          <table>
            <tr>
              <td class="label">ID</td>
              <td class="colon">:</td>
              <td class="value">${item.id}</td>
            </tr>
            <tr>
              <td class="label">Nama Barang</td>
              <td class="colon">:</td>
              <td class="value">${item.nama}</td>
            </tr>
            <tr>
              <td class="label">Lokasi</td>
              <td class="colon">:</td>
              <td class="value">${item.lokasi}</td>
            </tr>
            <tr>
              <td class="label">Tanggal</td>
              <td class="colon">:</td>
              <td class="value">${item.tanggal}</td>
            </tr>
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

    const prevBtn = document.getElementById("prevPage");
    const nextBtn = document.getElementById("nextPage");
    if (prevBtn) {
      prevBtn.addEventListener("click", () => {
        if (currentPage > 1) {
          currentPage -= 1;
          render();
        }
      });
    }
    if (nextBtn) {
      nextBtn.addEventListener("click", () => {
        if (currentPage < totalPages) {
          currentPage += 1;
          render();
        }
      });
    }
  }

  function render() {
    const totalPages = Math.max(
      1,
      Math.ceil(filteredItems.length / ITEMS_PER_PAGE),
    );
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
            item.id.toLowerCase().includes(q),
        );
    currentPage = 1;
    render();
  }

  if (searchInput) {
    searchInput.addEventListener("input", (e) => applySearch(e.target.value));
  }

  async function init() {
    cardGrid.innerHTML = `
      <div class="empty-state">
        <i class="fa-solid fa-spinner fa-spin" aria-hidden="true"></i>
        <p>Memuat data barang temuan...</p>
      </div>
    `;

    allItems = await getAllItems();
    filteredItems = allItems.slice();
    render();
  }

  init();
})();
