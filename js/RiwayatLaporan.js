/* ============================================================
   RiwayatLaporan.js
   Logic untuk halaman "Riwayat Laporan Anda" (U-Find)
   Terhubung ke Supabase untuk mengambil, menampilkan, dan
   menghapus data laporan kehilangan & laporan temuan milik
   pengguna yang sedang login.

   ------------------------------------------------------------
   ASUMSI STRUKTUR TABEL SUPABASE (sesuaikan nama kolom jika
   struktur database Anda berbeda):

   Tabel: laporan_kehilangan
     - id                uuid / bigint (PK)
     - user_id           uuid (FK -> auth.users.id)
     - nama_barang       text
     - ciri_barang       text
     - lokasi            text
     - gambar_url        text (nullable)
     - status            text -> 'pending' | 'searching' | 'rejected' | 'found'
     - catatan_status    text (nullable, alasan ditolak dsb)
     - created_at        timestamptz (default now())

   Tabel: laporan_temuan
     - id                uuid / bigint (PK)
     - user_id           uuid (FK -> auth.users.id)
     - nama_barang       text
     - ciri_barang       text
     - lokasi            text
     - gambar_url        text (nullable)
     - status            text -> 'pending' | 'searching' | 'rejected' | 'found'
     - catatan_status    text (nullable)
     - created_at        timestamptz (default now())

   Pastikan Row Level Security (RLS) aktif dengan policy, contoh:
     CREATE POLICY "User can view own reports"
       ON laporan_kehilangan FOR SELECT
       USING (auth.uid() = user_id);

     CREATE POLICY "User can delete own reports"
       ON laporan_kehilangan FOR DELETE
       USING (auth.uid() = user_id);
   (Policy yang sama dibuat juga untuk tabel laporan_temuan)
   ============================================================ */

(() => {
  // ------------------------------------------------------------
  // 1. KONFIGURASI SUPABASE
  //    Ganti SUPABASE_URL & SUPABASE_ANON_KEY dengan kredensial
  //    project Supabase Anda (Project Settings > API).
  // ------------------------------------------------------------
  const SUPABASE_URL = "https://YOUR_PROJECT_REF.supabase.co";
  const SUPABASE_ANON_KEY = "YOUR_SUPABASE_ANON_KEY";

  const supabase = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
  );

  // ------------------------------------------------------------
  // 2. KONSTAN & ELEMENT REFERENCES
  // ------------------------------------------------------------
  const TABLE_KEHILANGAN = "laporan_kehilangan";
  const TABLE_TEMUAN = "laporan_temuan";

  const kehilanganBody = document.getElementById("kehilanganTableBody");
  const temuanBody = document.getElementById("temuanTableBody");
  const usernameLabel = document.getElementById("usernameLabel");
  const logoutBtn = document.getElementById("logoutBtn");

  // Ikon fallback berdasarkan kata kunci nama barang (opsional,
  // hanya dipakai kalau laporan tidak punya gambar_url)
  const ICON_MAP = [
    { keywords: ["dompet"], icon: "fa-wallet" },
    {
      keywords: ["hp", "handphone", "ponsel", "phone"],
      icon: "fa-mobile-screen-button",
    },
    { keywords: ["laptop", "notebook"], icon: "fa-laptop" },
    { keywords: ["kunci"], icon: "fa-key" },
    { keywords: ["earphone", "headset", "headphone"], icon: "fa-headphones" },
    { keywords: ["powerbank"], icon: "fa-battery-full" },
    { keywords: ["tas", "ransel"], icon: "fa-bag-shopping" },
    { keywords: ["kartu", "ktm", "ktp"], icon: "fa-id-card" },
    { keywords: ["botol"], icon: "fa-bottle-water" },
    { keywords: ["payung"], icon: "fa-umbrella" },
  ];

  const STATUS_CONFIG = {
    pending: { label: "Menunggu Validasi", className: "status-pending" },
    searching: { label: "Sedang Dicari", className: "status-searching" },
    rejected: { label: "Laporan Ditolak", className: "status-rejected" },
    found: { label: "Barang Ditemukan", className: "status-found" },
  };

  // ------------------------------------------------------------
  // 3. HELPER
  // ------------------------------------------------------------

  /** Escape teks agar aman disisipkan ke innerHTML */
  function escapeHtml(text) {
    if (text === null || text === undefined) return "";
    return String(text)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  /** Format timestamp Supabase (ISO string) -> "HH.MM WIB<br>DD/MM/YYYY" */
  function formatWaktu(isoString) {
    if (!isoString) return "-";
    const date = new Date(isoString);
    const jam = String(date.getHours()).padStart(2, "0");
    const menit = String(date.getMinutes()).padStart(2, "0");
    const hari = String(date.getDate()).padStart(2, "0");
    const bulan = String(date.getMonth() + 1).padStart(2, "0");
    const tahun = date.getFullYear();
    return `${jam}.${menit} WIB<br>${hari}/${bulan}/${tahun}`;
  }

  /** Cari ikon FontAwesome berdasarkan nama barang */
  function getIconForItem(namaBarang) {
    const lower = (namaBarang || "").toLowerCase();
    const found = ICON_MAP.find((entry) =>
      entry.keywords.some((kw) => lower.includes(kw)),
    );
    return found ? found.icon : "fa-box";
  }

  /** Bangun kolom gambar/thumbnail */
  function renderThumb(row) {
    if (row.gambar_url) {
      return `<div class="thumb"><img src="${escapeHtml(
        row.gambar_url,
      )}" alt="${escapeHtml(row.nama_barang)}" /></div>`;
    }
    return `<div class="thumb"><i class="fa-solid ${getIconForItem(
      row.nama_barang,
    )}" aria-hidden="true"></i></div>`;
  }

  /** Bangun kolom status (+ tombol hapus jika status masih bisa dihapus) */
  function renderStatus(row, table) {
    const config = STATUS_CONFIG[row.status] || STATUS_CONFIG.pending;
    const label =
      row.status === "rejected" && row.catatan_status
        ? `${config.label}! ${escapeHtml(row.catatan_status)}`
        : config.label;

    const badge = `<span class="status ${config.className}">${escapeHtml(
      label,
    )}</span>`;

    // Laporan yang masih "pending" atau "searching" boleh dihapus pengguna
    const canDelete = row.status === "pending" || row.status === "searching";

    if (!canDelete) {
      return badge;
    }

    return `
      <div class="status-row">
        ${badge}
        <button
          type="button"
          class="delete-btn"
          title="Hapus Laporan"
          data-table="${table}"
          data-id="${escapeHtml(row.id)}"
        >
          <i class="fa-solid fa-trash" aria-hidden="true"></i>
        </button>
      </div>
    `;
  }

  /** Render satu baris state (loading / kosong / error) */
  function renderStateRow(tbody, message, iconClass = "fa-inbox") {
    tbody.innerHTML = `
      <tr class="state-row">
        <td colspan="7">
          <i class="fa-solid ${iconClass}"></i>
          ${escapeHtml(message)}
        </td>
      </tr>
    `;
  }

  /** Render daftar laporan ke dalam tbody target */
  function renderRows(tbody, rows, table, emptyMessage) {
    if (!rows || rows.length === 0) {
      renderStateRow(tbody, emptyMessage, "fa-inbox");
      return;
    }

    tbody.innerHTML = rows
      .map((row, index) => {
        return `
          <tr data-row-id="${escapeHtml(row.id)}">
            <td class="col-no">${index + 1}</td>
            <td>${formatWaktu(row.created_at)}</td>
            <td>${escapeHtml(row.nama_barang)}</td>
            <td>${renderThumb(row)}</td>
            <td>${escapeHtml(row.ciri_barang)}</td>
            <td>${escapeHtml(row.lokasi)}</td>
            <td>${renderStatus(row, table)}</td>
          </tr>
        `;
      })
      .join("");

    // Pasang event listener untuk semua tombol hapus di tabel ini
    tbody.querySelectorAll(".delete-btn").forEach((btn) => {
      btn.addEventListener("click", handleDeleteClick);
    });
  }

  // ------------------------------------------------------------
  // 4. DATA FETCHING
  // ------------------------------------------------------------

  /** Ambil data user yang sedang login */
  async function getCurrentUser() {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error) {
      console.error("Gagal mengambil data user:", error.message);
      return null;
    }
    return user;
  }

  /** Ambil laporan milik user dari salah satu tabel */
  async function fetchLaporan(table, userId) {
    const { data, error } = await supabase
      .from(table)
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error(`Gagal mengambil data dari ${table}:`, error.message);
      throw error;
    }
    return data;
  }

  /** Muat & render kedua tabel riwayat */
  async function loadRiwayat(userId) {
    // Laporan Kehilangan
    try {
      const kehilangan = await fetchLaporan(TABLE_KEHILANGAN, userId);
      renderRows(
        kehilanganBody,
        kehilangan,
        TABLE_KEHILANGAN,
        "Anda belum memiliki laporan kehilangan.",
      );
    } catch (err) {
      renderStateRow(
        kehilanganBody,
        "Gagal memuat laporan kehilangan. Coba muat ulang halaman.",
        "fa-triangle-exclamation",
      );
    }

    // Laporan Temuan
    try {
      const temuan = await fetchLaporan(TABLE_TEMUAN, userId);
      renderRows(
        temuanBody,
        temuan,
        TABLE_TEMUAN,
        "Anda belum memiliki laporan temuan.",
      );
    } catch (err) {
      renderStateRow(
        temuanBody,
        "Gagal memuat laporan temuan. Coba muat ulang halaman.",
        "fa-triangle-exclamation",
      );
    }
  }

  // ------------------------------------------------------------
  // 5. HAPUS LAPORAN
  // ------------------------------------------------------------
  async function handleDeleteClick(event) {
    const btn = event.currentTarget;
    const table = btn.dataset.table;
    const id = btn.dataset.id;

    const confirmDelete = window.confirm(
      "Apakah Anda yakin ingin menghapus laporan ini? Tindakan ini tidak dapat dibatalkan.",
    );
    if (!confirmDelete) return;

    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';

    const { error } = await supabase.from(table).delete().eq("id", id);

    if (error) {
      console.error("Gagal menghapus laporan:", error.message);
      alert("Gagal menghapus laporan. Silakan coba lagi.");
      btn.disabled = false;
      btn.innerHTML = '<i class="fa-solid fa-trash"></i>';
      return;
    }

    // Hapus baris dari tampilan tanpa perlu fetch ulang seluruh data
    const row = btn.closest("tr");
    if (row) row.remove();

    // Jika tabel jadi kosong, tampilkan state kosong
    const targetBody = table === TABLE_KEHILANGAN ? kehilanganBody : temuanBody;
    if (targetBody.querySelectorAll("tr[data-row-id]").length === 0) {
      const emptyMessage =
        table === TABLE_KEHILANGAN
          ? "Anda belum memiliki laporan kehilangan."
          : "Anda belum memiliki laporan temuan.";
      renderStateRow(targetBody, emptyMessage, "fa-inbox");
    } else {
      renumberRows(targetBody);
    }
  }

  /** Perbarui ulang nomor urut (kolom No) setelah ada baris dihapus */
  function renumberRows(tbody) {
    tbody.querySelectorAll("tr[data-row-id] .col-no").forEach((cell, idx) => {
      cell.textContent = idx + 1;
    });
  }

  // ------------------------------------------------------------
  // 6. LOGOUT
  // ------------------------------------------------------------
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async (e) => {
      e.preventDefault();
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error("Gagal logout:", error.message);
      }
      window.location.href = "../index.html";
    });
  }

  // ------------------------------------------------------------
  // 7. INISIALISASI HALAMAN
  // ------------------------------------------------------------
  async function init() {
    const user = await getCurrentUser();

    if (!user) {
      // Tidak ada sesi login, arahkan kembali ke halaman login
      window.location.href = "../index.html";
      return;
    }

    if (usernameLabel) {
      const displayName =
        user.user_metadata?.full_name ||
        user.user_metadata?.username ||
        user.email ||
        "Pengguna";
      usernameLabel.textContent = displayName;
    }

    renderStateRow(
      kehilanganBody,
      "Memuat data laporan kehilangan...",
      "fa-spinner fa-spin",
    );
    renderStateRow(
      temuanBody,
      "Memuat data laporan temuan...",
      "fa-spinner fa-spin",
    );

    await loadRiwayat(user.id);
  }

  document.addEventListener("DOMContentLoaded", init);
})();
