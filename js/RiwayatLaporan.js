document.addEventListener("DOMContentLoaded", async () => {
  if (typeof supabaseClient === "undefined" || !supabaseClient) {
    console.error("SupabaseClient gagal dimuat!");
    return;
  }

  // ==========================================
  // SETUP DROPDOWN PROFIL
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
  // INISIALISASI NOTIFIKASI
  // ==========================================
  if (typeof initNotifications === "function") {
    initNotifications();
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

  // Modal Konfirmasi Hapus & Berhasil
  const deleteConfirmModal = document.getElementById("deleteConfirmModal");
  const deleteSuccessModal = document.getElementById("deleteSuccessModal");

  // Elemen Teks dan Tombol Modal Hapus (Penting untuk dinamis)
  const confirmDeleteText = document.getElementById("confirmDeleteText");
  const btnConfirmYes = document.getElementById("btnConfirmYes");
  const btnConfirmNo = document.getElementById("btnConfirmNo");
  const btnSuccessOk = document.getElementById("btnSuccessOk");

  let pendingDeleteParams = null;
  let userNIM = "";

  const STATUS_CONFIG = {
    "Menunggu Validasi": { label: "Menunggu Validasi", className: "status-pending" },
    "Sedang Dicari": { label: "Sedang Dicari", className: "status-searching" },
    "Tersedia dipos": { label: "Tersedia di pos", className: "status-searching" },
    "Laporan Ditolak": { label: "Laporan Ditolak", className: "status-rejected" },
    Selesai: { label: "Selesai", className: "status-found" },
  };

  // --- 1. INISIALISASI USER ---
  async function initUser() {
    const {
      data: { session },
    } = await supabaseClient.auth.getSession();
    if (!session) {
      window.location.href = "../index.html";
      return false;
    }
    const { data: mhsData, error } = await supabaseClient
      .from("Mahasiswa")
      .select("NIM")
      .eq("user_id", session.user.id)
      .maybeSingle();

    if (error || !mhsData) return false;
    userNIM = mhsData.NIM;
    if (usernameLabel) usernameLabel.textContent = userNIM;
    return true;
  }

  // --- 2. LOGOUT ---
  document.getElementById("logoutBtn")?.addEventListener("click", async (e) => {
    e.preventDefault();
    await supabaseClient.auth.signOut();
    window.location.href = "../index.html";
  });

  // --- 3. RENDER TABEL ---
  function renderRows(tbody, items) {
    if (items.length === 0) {
      tbody.innerHTML = `<tr class="state-row"><td colspan="9">Anda belum memiliki laporan di kategori ini.</td></tr>`;
      return;
    }

    tbody.innerHTML = items
      .map((item) => {
        const imageHTML = item.foto
          ? `<img src="${item.foto}" alt="Foto" style="width:100%; height:100%; object-fit:cover; border-radius:6px;"/>`
          : `<i class="fa-solid fa-box-open" style="color:var(--blue-accent); font-size:1.5rem;"></i>`;

        const st = STATUS_CONFIG[item.status] || {
          label: item.status || "Menunggu",
          className: "status-pending",
        };
        const statusBadge = `<span class="status ${st.className}">${st.label}</span>`;

        let actionButtons = "-";
        if (["Menunggu Validasi", "Sedang Dicari", "Tersedia dipos"].includes(item.status)) {
          const itemJson = encodeURIComponent(JSON.stringify(item));
          actionButtons = `
          <div class="action-buttons">
            <button class="btn-edit" onclick="window.openEditModal('${itemJson}')" title="Edit">
              <i class="fa-solid fa-pen"></i>
            </button>
            <button class="btn-delete" onclick="window.deleteReport('${item.table}', '${item.pkColumn}', ${item.rawId})" title="Hapus">
              <i class="fa-solid fa-trash"></i>
            </button>
          </div>
        `;
        }

        return `
        <tr>
          <td><strong>${item.displayId}</strong></td>
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

  // --- 4. FETCH DATA DARI SUPABASE ---
  async function loadData() {
    try {
      // Fetch Laporan Kehilangan
      const { data: h } = await supabaseClient
        .from("Laporan_Hilang")
        .select("*")
        .eq("NIM_Pelapor", userNIM)
        .order("created_at", { ascending: false });
      if (h)
        renderRows(
          kehilanganBody,
          h.map((r) => ({
            table: "Laporan_Hilang",
            pkColumn: "Id_Laporan",
            rawId: r.Id_Laporan,
            displayId: "LH-" + String(r.Id_Laporan).padStart(3, "0"),
            created_at: r.created_at,
            nama: r.Nama_Barang,
            foto: r.Foto_Barang,
            ciri: r.Ciri_Khusus,
            lokasi: r.Lokasi_Kejadian,
            tanggal: r.Tanggal_Kehilangan,
            status: r.status,
          }))
        );

      // Fetch Laporan Temuan
      const { data: t } = await supabaseClient
        .from("Laporan_Temuan")
        .select("*")
        .eq("NIM_Penemu", userNIM)
        .order("created_at", { ascending: false });
      if (t)
        renderRows(
          temuanBody,
          t.map((r) => ({
            table: "Laporan_Temuan",
            pkColumn: "Id_Temuan",
            rawId: r.Id_Temuan,
            displayId: "LT-" + String(r.Id_Temuan).padStart(3, "0"),
            created_at: r.created_at,
            nama: r.Nama_Barang,
            foto: r.Foto_Barang,
            ciri: r.Ciri_Khusus,
            lokasi: r.Lokasi_Penemuan,
            tanggal: r.Tanggal_Penemuan,
            status: r.status,
          }))
        );
    } catch (e) {
      console.error(e);
    }
  }

  // --- 5. LOGIKA HAPUS (POP UP DINAMIS) ---
  window.deleteReport = (table, pkColumn, id) => {
    pendingDeleteParams = { table, pkColumn, id };

    if (table === "Laporan_Temuan") {
      confirmDeleteText.innerHTML = "Apakah anda yakin ingin<br>menghapus Laporan Temuan?";
      btnConfirmYes.textContent = "Ya";
      btnConfirmNo.textContent = "Tidak";
    } else {
      confirmDeleteText.innerHTML = "Apakah barang sudah ditemukan?";
      btnConfirmYes.textContent = "Sudah";
      btnConfirmNo.textContent = "Belum";
    }

    deleteConfirmModal.classList.remove("hidden");
  };

  btnConfirmNo.addEventListener("click", () => {
    deleteConfirmModal.classList.add("hidden");
    pendingDeleteParams = null;
  });

  btnConfirmYes.addEventListener("click", async () => {
    if (!pendingDeleteParams) return;
    const { table, pkColumn, id } = pendingDeleteParams;

    const originalText = btnConfirmYes.textContent;
    btnConfirmYes.textContent = "Memproses...";
    btnConfirmYes.disabled = true;

    const { error } = await supabaseClient.from(table).delete().eq(pkColumn, id);

    btnConfirmYes.textContent = originalText;
    btnConfirmYes.disabled = false;
    deleteConfirmModal.classList.add("hidden");

    if (error) {
      alert("Gagal menghapus: " + error.message);
    } else {
      deleteSuccessModal.classList.remove("hidden");
    }
  });

  btnSuccessOk.addEventListener("click", async () => {
    deleteSuccessModal.classList.add("hidden");
    await loadData();
  });

  // --- 6. EDIT DATA (MODAL) ---
  window.openEditModal = (itemString) => {
    const item = JSON.parse(decodeURIComponent(itemString));
    document.getElementById("editTable").value = item.table;
    document.getElementById("editPkColumn").value = item.pkColumn;
    document.getElementById("editRawId").value = item.rawId;
    document.getElementById("editDisplayId").value = item.displayId;
    document.getElementById("editNama").value = item.nama;
    document.getElementById("editCiri").value = item.ciri;
    document.getElementById("editLokasi").value = item.lokasi;
    document.getElementById("editTanggal").value = item.tanggal;
    editModal.classList.remove("hidden");
  };

  closeEditModalBtn.addEventListener("click", () => editModal.classList.add("hidden"));
  cancelEditBtn.addEventListener("click", () => editModal.classList.add("hidden"));

  editForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const table = document.getElementById("editTable").value;
    const pk = document.getElementById("editPkColumn").value;
    const id = document.getElementById("editRawId").value;

    let updateData = {
      Nama_Barang: document.getElementById("editNama").value,
      Ciri_Khusus: document.getElementById("editCiri").value,
    };
    if (table === "Laporan_Hilang") {
      updateData.Lokasi_Kejadian = document.getElementById("editLokasi").value;
      updateData.Tanggal_Kehilangan = document.getElementById("editTanggal").value;
    } else {
      updateData.Lokasi_Penemuan = document.getElementById("editLokasi").value;
      updateData.Tanggal_Penemuan = document.getElementById("editTanggal").value;
    }

    const { error } = await supabaseClient.from(table).update(updateData).eq(pk, id);
    if (!error) {
      editModal.classList.add("hidden");
      loadData();
    } else {
      alert("Gagal update: " + error.message);
    }
  });

  // HELPER FUNCTIONS
  function escapeHtml(text) {
    return String(text).replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
  function formatWaktu(iso) {
    const d = new Date(iso);
    return `${String(d.getHours()).padStart(2, "0")}.${String(d.getMinutes()).padStart(2, "0")} WIB<br>${d.toLocaleDateString("id-ID")}`;
  }

  // START APP
  if (await initUser()) loadData();
});
