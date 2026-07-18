/**
 * PencarianBarangTemuan.js
 * Logic untuk halaman "Pencarian Barang Temuan" - U-Find
 * - Render daftar laporan barang temuan ke dalam card
 * - Pencarian (nama barang / lokasi) secara real-time
 * - Pagination dinamis: kalau hasilnya cuma sedikit (muat 1 halaman),
 *   tombol pagination otomatis disembunyikan. Kalau datanya banyak,
 *   nomor halaman ditambahkan otomatis sesuai jumlah data.
 */

document.addEventListener("DOMContentLoaded", () => {
  const profileTrigger = document.getElementById("profileTrigger");
  const profileDropdown = document.getElementById("profileDropdown");

  if (profileTrigger && profileDropdown) {
    profileTrigger.addEventListener("click", (e) => {
      e.stopPropagation();
      profileDropdown.classList.toggle("open");
      profileTrigger.classList.toggle("open");
    });

    document.addEventListener("click", (e) => {
      if (
        !profileDropdown.contains(e.target) &&
        !profileTrigger.contains(e.target)
      ) {
        profileDropdown.classList.remove("open");
        profileTrigger.classList.remove("open");
      }
    });
  }
});

document.addEventListener("DOMContentLoaded", () => {
  // ---------- Konfigurasi ----------
  const ITEMS_PER_PAGE = 6;

  // ---------- Data ----------
  // TODO: Ganti dengan data asli dari backend/API U-Find, contoh:
  // const res = await fetch('/api/laporan-temuan');
  // const barangTemuanData = await res.json();
  const barangTemuanData = [
    {
      id: "LT-001",
      nama: "Dompet",
      lokasi: "Ruangan 5306",
      tanggal: "23/06/2026",
      icon: "fa-wallet",
      foto: null,
    },
    {
      id: "LT-002",
      nama: "SmartWatch",
      lokasi: "Musholla Perpustakaan",
      tanggal: "21/06/2026",
      icon: "fa-clock",
      foto: null,
    },
    {
      id: "LT-003",
      nama: "Kacamata",
      lokasi: "Depan Gedung Miracle",
      tanggal: "27/06/2026",
      icon: "fa-glasses",
      foto: null,
    },
    {
      id: "LT-004",
      nama: "Flashdisk",
      lokasi: "Lab Komputer 2",
      tanggal: "19/06/2026",
      icon: "fa-usb",
      foto: null,
    },
    {
      id: "LT-005",
      nama: "Payung",
      lokasi: "Gerbang Belakang",
      tanggal: "17/06/2026",
      icon: "fa-umbrella",
      foto: null,
    },
    {
      id: "LT-006",
      nama: "Buku Modul",
      lokasi: "Ruangan 4102",
      tanggal: "14/06/2026",
      icon: "fa-book",
      foto: null,
    },
    {
      id: "LT-007",
      nama: "Kunci Kos",
      lokasi: "Kantin Fasilkom",
      tanggal: "11/06/2026",
      icon: "fa-key",
      foto: null,
    },
    {
      id: "LT-008",
      nama: "Headset",
      lokasi: "Aula Gedung Rektorat",
      tanggal: "09/06/2026",
      icon: "fa-headphones",
      foto: null,
    },
  ];

  const detailPageUrl = "DetailBarangTemuan.html";

  // ---------- State ----------
  let currentPage = 1;
  let searchQuery = "";

  // ---------- Elemen ----------
  const cardGrid = document.getElementById("cardGrid");
  const pagination = document.getElementById("pagination");
  const searchInput = document.getElementById("searchInput");

  // ---------- Util ----------
  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  function getFilteredData() {
    if (!searchQuery.trim()) return barangTemuanData;
    const q = searchQuery.trim().toLowerCase();
    return barangTemuanData.filter(
      (item) =>
        item.nama.toLowerCase().includes(q) ||
        item.lokasi.toLowerCase().includes(q) ||
        item.id.toLowerCase().includes(q),
    );
  }

  // ---------- Render Card Grid ----------
  function renderCards() {
    const filtered = getFilteredData();
    const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));

    // Kalau currentPage jadi kelebihan (misal habis search), turunkan ke halaman terakhir yang valid
    if (currentPage > totalPages) currentPage = totalPages;

    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    const pageItems = filtered.slice(start, start + ITEMS_PER_PAGE);

    if (filtered.length === 0) {
      cardGrid.innerHTML = `
        <div class="empty-state">
          <i class="fa-solid fa-box-open"></i>
          <p>Tidak ada laporan barang temuan yang cocok dengan pencarianmu.</p>
        </div>
      `;
      pagination.innerHTML = "";
      return;
    }

    cardGrid.innerHTML = pageItems
      .map((item) => {
        const imageMarkup = item.foto
          ? `<img src="${escapeHtml(item.foto)}" alt="${escapeHtml(item.nama)}" />`
          : `<i class="fa-solid ${item.icon} placeholder-icon" aria-hidden="true"></i>`;

        return `
          <div class="card">
            <div class="card-img-container">
              ${imageMarkup}
            </div>
            <div class="card-info">
              <table>
                <tr>
                  <td class="label">ID</td>
                  <td class="colon">:</td>
                  <td class="value">${escapeHtml(item.id)}</td>
                </tr>
                <tr>
                  <td class="label">Nama Barang</td>
                  <td class="colon">:</td>
                  <td class="value">${escapeHtml(item.nama)}</td>
                </tr>
                <tr>
                  <td class="label">Lokasi</td>
                  <td class="colon">:</td>
                  <td class="value">${escapeHtml(item.lokasi)}</td>
                </tr>
                <tr>
                  <td class="label">Tanggal</td>
                  <td class="colon">:</td>
                  <td class="value">${escapeHtml(item.tanggal)}</td>
                </tr>
              </table>
            </div>
            <a href="${detailPageUrl}?id=${encodeURIComponent(item.id)}" class="detail-btn">Cek Detail</a>
          </div>
        `;
      })
      .join("");

    renderPagination(totalPages);
  }

  // ---------- Render Pagination (dinamis) ----------
  function renderPagination(totalPages) {
    // Kalau semua data muat dalam 1 halaman, sembunyikan pagination sama sekali
    if (totalPages <= 1) {
      pagination.innerHTML = "";
      return;
    }

    let html = `
      <button class="page-arrow" id="prevPage" ${currentPage === 1 ? "disabled" : ""} aria-label="Halaman sebelumnya">
        <i class="fa-solid fa-angle-left"></i>
      </button>
    `;

    for (let i = 1; i <= totalPages; i++) {
      html += `
        <button class="page-num ${i === currentPage ? "active" : ""}" data-page="${i}">
          ${i}
        </button>
      `;
    }

    html += `
      <button class="page-arrow" id="nextPage" ${currentPage === totalPages ? "disabled" : ""} aria-label="Halaman berikutnya">
        <i class="fa-solid fa-angle-right"></i>
      </button>
    `;

    pagination.innerHTML = html;

    // Event listener nomor halaman
    pagination.querySelectorAll(".page-num").forEach((btn) => {
      btn.addEventListener("click", () => {
        currentPage = parseInt(btn.dataset.page, 10);
        renderCards();
        scrollGridIntoView();
      });
    });

    // Event listener tombol panah
    const prevBtn = document.getElementById("prevPage");
    const nextBtn = document.getElementById("nextPage");

    if (prevBtn) {
      prevBtn.addEventListener("click", () => {
        if (currentPage > 1) {
          currentPage -= 1;
          renderCards();
          scrollGridIntoView();
        }
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener("click", () => {
        if (currentPage < totalPages) {
          currentPage += 1;
          renderCards();
          scrollGridIntoView();
        }
      });
    }
  }

  function scrollGridIntoView() {
    cardGrid.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  // ---------- Search ----------
  let searchDebounce;
  searchInput.addEventListener("input", (e) => {
    clearTimeout(searchDebounce);
    searchDebounce = setTimeout(() => {
      searchQuery = e.target.value;
      currentPage = 1;
      renderCards();
    }, 250);
  });

  // ---------- Init ----------
  renderCards();
});
