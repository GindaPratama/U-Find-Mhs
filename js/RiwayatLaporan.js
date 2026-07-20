document.addEventListener("DOMContentLoaded", async () => {
  if (typeof supabaseClient === "undefined" || !supabaseClient) {
    console.error("SupabaseClient gagal dimuat!");
    return;
  }

  // --- ELEMEN DOM ---
  const usernameLabel = document.getElementById("usernameLabel");
  const kehilanganBody = document.getElementById("kehilanganTableBody");
  const temuanBody = document.getElementById("temuanTableBody");

  // Modal Edit
  const editModal = document.getElementById("editModal");
  const editForm = document.getElementById("editForm");
  const closeEditModalBtn = document.getElementById("closeEditModal");
  const cancelEditBtn = document.getElementById("cancelEditBtn");
  const saveEditBtn = document.getElementById("saveEditBtn");

  // State Global
  let userNIM = "";

  // Konfigurasi Status (Berdasarkan nilai Varchar di Database)
  const STATUS_CONFIG = {
    "Menunggu Validasi": {
      label: "Menunggu Validasi",
      className: "status-pending",
    },
    "Sedang Dicari": { label: "Sedang Dicari", className: "status-searching" },
    "Tersedia dipos": {
      label: "Tersedia di pos",
      className: "status-searching",
    },
    "Laporan Ditolak": {
      label: "Laporan Ditolak",
      className: "status-rejected",
    },
    Selesai: { label: "Selesai", className: "status-found" },
  };

  // --- 1. INISIALISASI & SESI ---
  async function initUser() {
    const {
      data: { session },
    } = await supabaseClient.auth.getSession();
    if (!session) {
      window.location.href = "../index.html";
      return false;
    }

    // Ambil NIM dari tabel Mahasiswa
    const { data: mhsData, error } = await supabaseClient
      .from("Mahasiswa")
      .select("NIM")
      .eq("user_id", session.user.id)
      .maybeSingle();

    if (error || !mhsData) {
      console.error("Gagal mendapatkan NIM.");
      return false;
    }

    userNIM = mhsData.NIM;
    if (usernameLabel) usernameLabel.textContent = userNIM;
    return true;
  }

  // --- 2. DROPDOWN & LOGOUT ---
  document.getElementById("profileTrigger")?.addEventListener("click", (e) => {
    e.stopPropagation();
    document.getElementById("profileDropdown").classList.toggle("open");
  });
  document.addEventListener("click", () => {
    document.getElementById("profileDropdown")?.classList.remove("open");
  });
  document.getElementById("logoutBtn")?.addEventListener("click", async (e) => {
    e.preventDefault();
    await supabaseClient.auth.signOut();
    window.location.href = "../index.html";
  });

  // --- 3. FORMATTER BANTUAN ---
  function escapeHtml(text) {
    if (!text) return "-";
    return String(text).replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function formatWaktu(isoString) {
    if (!isoString) return "-";
    const date = new Date(isoString);
    return `${String(date.getHours()).padStart(2, "0")}.${String(date.getMinutes()).padStart(2, "0")} WIB<br>${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()}`;
  }

  // --- 4. RENDER TABEL ---
  function renderStateRow(tbody, message, icon = "fa-inbox") {
    tbody.innerHTML = `<tr class="state-row"><td colspan="9"><i class="fa-solid ${icon}"></i> ${message}</td></tr>`;
  }

  function renderRows(tbody, items) {
    if (items.length === 0) {
      renderStateRow(tbody, "Anda belum memiliki laporan di kategori ini.");
      return;
    }

    tbody.innerHTML = items
      .map((item) => {
        // Setup Gambar
        const imageHTML = item.foto
          ? `<img src="${item.foto}" alt="Foto" style="width:100%; height:100%; object-fit:cover; border-radius:6px;"/>`
          : `<i class="fa-solid fa-box-open" style="color:var(--blue-accent); font-size:1.5rem;"></i>`;

        // Setup Status
        const st = STATUS_CONFIG[item.status] || {
          label: item.status || "Menunggu",
          className: "status-pending",
        };
        const statusBadge = `<span class="status ${st.className}">${st.label}</span>`;

        // Setup Aksi (Hanya bisa Edit/Hapus jika masih Menunggu Validasi atau Sedang Dicari)
        let actionButtons = "-";
        if (
          item.status === "Menunggu Validasi" ||
          item.status === "Sedang Dicari" ||
          item.status === "Tersedia dipos"
        ) {
          actionButtons = `
          <div class="action-buttons">
            <button class="btn-edit" onclick="openEditModal('${encodeURIComponent(JSON.stringify(item))}')" title="Edit">
              <i class="fa-solid fa-pen"></i>
            </button>
            <button class="btn-delete" onclick="deleteReport('${item.table}', '${item.pkColumn}', ${item.rawId})" title="Hapus">
              <i class="fa-solid fa-trash"></i>
            </button>
          </div>
        `;
        }

        return `
        <tr>
          <td class="col-no"><strong>${item.displayId}</strong></td>
          <td>${formatWaktu(item.created_at)}</td>
          <td>${escapeHtml(item.nama)}</td>
          <td><div style="width:60px; height:60px; background:#fff; border:1px solid #e2e7f1; display:flex; align-items:center; justify-content:center; border-radius:8px; padding:2px;">${imageHTML}</div></td>
          <td>${escapeHtml(item.ciri)}</td>
          <td>${escapeHtml(item.lokasi)}</td>
          <td>${escapeHtml(item.tanggal)}</td>
          <td>${statusBadge}</td>
          <td>${actionButtons}</td>
        </tr>
      `;
      })
      .join("");
  }

  // --- 5. TARIK DATA DARI DATABASE ---
  async function loadData() {
    try {
      // Data Laporan Hilang
      const { data: dataHilang, error: errHilang } = await supabaseClient
        .from("Laporan_Hilang")
        .select("*")
        .eq("NIM_Pelapor", userNIM)
        .order("created_at", { ascending: false });

      if (!errHilang) {
        const mappedHilang = dataHilang.map((row) => ({
          table: "Laporan_Hilang",
          pkColumn: "Id_Laporan",
          rawId: row.Id_Laporan,
          displayId: "LH-" + String(row.Id_Laporan).padStart(3, "0"),
          created_at: row.created_at,
          nama: row.Nama_Barang,
          foto: row.Foto_Barang,
          ciri: row.Ciri_Khusus,
          lokasi: row.Lokasi_Kejadian,
          tanggal: row.Tanggal_Kehilangan,
          status: row.status,
        }));
        renderRows(kehilanganBody, mappedHilang);
      }

      // Data Laporan Temuan
      const { data: dataTemuan, error: errTemuan } = await supabaseClient
        .from("Laporan_Temuan")
        .select("*")
        .eq("NIM_Penemu", userNIM)
        .order("created_at", { ascending: false });

      if (!errTemuan) {
        const mappedTemuan = dataTemuan.map((row) => ({
          table: "Laporan_Temuan",
          pkColumn: "Id_Temuan",
          rawId: row.Id_Temuan,
          displayId: "LT-" + String(row.Id_Temuan).padStart(3, "0"),
          created_at: row.created_at,
          nama: row.Nama_Barang,
          foto: row.Foto_Barang,
          ciri: row.Ciri_Khusus,
          lokasi: row.Lokasi_Penemuan,
          tanggal: row.Tanggal_Penemuan,
          status: row.status,
        }));
        renderRows(temuanBody, mappedTemuan);
      }
    } catch (error) {
      console.error("Gagal menarik data:", error);
    }
  }

  // --- 6. FUNGSI HAPUS ---
  window.deleteReport = async function (table, pkColumn, id) {
    if (!confirm("Yakin ingin menghapus laporan ini?")) return;

    const { error } = await supabaseClient
      .from(table)
      .delete()
      .eq(pkColumn, id);
    if (error) {
      alert("Gagal menghapus data!");
    } else {
      loadData(); // Reload data setelah dihapus
    }
  };

  // --- 7. FUNGSI MODAL EDIT ---
  window.openEditModal = function (itemString) {
    const item = JSON.parse(decodeURIComponent(itemString));

    document.getElementById("editTable").value = item.table;
    document.getElementById("editPkColumn").value = item.pkColumn;
    document.getElementById("editRawId").value = item.rawId;
    document.getElementById("editOldFoto").value = item.foto || "";
    document.getElementById("editDisplayId").value = item.displayId;

    document.getElementById("editNama").value = item.nama;
    document.getElementById("editCiri").value = item.ciri;
    document.getElementById("editLokasi").value = item.lokasi;
    document.getElementById("editTanggal").value = item.tanggal;

    // Ubah label agar relevan
    document.getElementById("labelLokasi").textContent =
      item.table === "Laporan_Hilang" ? "Lokasi Kejadian" : "Lokasi Penemuan";
    document.getElementById("labelTanggal").textContent =
      item.table === "Laporan_Hilang"
        ? "Tanggal Kehilangan"
        : "Tanggal Penemuan";

    document.getElementById("editFoto").value = ""; // Reset input file

    editModal.classList.remove("hidden");
  };

  function closeEdit() {
    editModal.classList.add("hidden");
  }

  closeEditModalBtn.addEventListener("click", closeEdit);
  cancelEditBtn.addEventListener("click", closeEdit);

  // Proses Simpan Edit
  editForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    saveEditBtn.disabled = true;
    saveEditBtn.textContent = "Menyimpan...";

    const table = document.getElementById("editTable").value;
    const pkColumn = document.getElementById("editPkColumn").value;
    const rawId = document.getElementById("editRawId").value;

    // Siapkan data update (kecuali foto)
    let updateData = {
      Nama_Barang: document.getElementById("editNama").value,
      Ciri_Khusus: document.getElementById("editCiri").value,
    };

    if (table === "Laporan_Hilang") {
      updateData.Lokasi_Kejadian = document.getElementById("editLokasi").value;
      updateData.Tanggal_Kehilangan =
        document.getElementById("editTanggal").value;
    } else {
      updateData.Lokasi_Penemuan = document.getElementById("editLokasi").value;
      updateData.Tanggal_Penemuan =
        document.getElementById("editTanggal").value;
    }

    // Logic Jika User Mengupload Foto Baru
    const fileInput = document.getElementById("editFoto");
    if (fileInput.files.length > 0) {
      const file = fileInput.files[0];
      const ext = file.name.split(".").pop();
      const bucketName =
        table === "Laporan_Hilang"
          ? "bukti-barang-hilang"
          : "bukti-barang-temuan";
      const filePath = `${userNIM}/${Date.now()}.${ext}`;

      const { error: uploadErr } = await supabaseClient.storage
        .from(bucketName)
        .upload(filePath, file);
      if (!uploadErr) {
        const { data: publicUrlData } = supabaseClient.storage
          .from(bucketName)
          .getPublicUrl(filePath);
        updateData.Foto_Barang = publicUrlData.publicUrl;
      }
    }

    // Update Data ke Supabase
    const { error } = await supabaseClient
      .from(table)
      .update(updateData)
      .eq(pkColumn, rawId);

    saveEditBtn.disabled = false;
    saveEditBtn.textContent = "Simpan Perubahan";

    if (error) {
      alert("Gagal menyimpan perubahan: " + error.message);
    } else {
      closeEdit();
      loadData(); // Refresh tampilan tabel
    }
  });

  // Eksekusi Awal
  if (await initUser()) {
    loadData();
  }
});
