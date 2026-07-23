document.addEventListener("DOMContentLoaded", async () => {
  // ---------- Dropdown navbar ----------
  (function initNavbarDropdown() {
    const trigger = document.getElementById("profileTrigger");
    const dropdown = document.getElementById("profileDropdown");
    if (!trigger || !dropdown) return;

    const closeDropdown = () => {
      trigger.classList.remove("open");
      dropdown.classList.remove("open");
    };

    trigger.addEventListener("click", (event) => {
      event.stopPropagation();
      const isOpen = dropdown.classList.toggle("open");
      trigger.classList.toggle("open", isOpen);
    });

    document.addEventListener("click", (event) => {
      if (!dropdown.contains(event.target) && !trigger.contains(event.target)) {
        closeDropdown();
      }
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeDropdown();
    });

    if (typeof initNotifications === "function") {
      initNotifications();
    }
  })();

  // ---------- Modal Sukses & Error Builder ----------
  function ensureSuccessModal() {
    let overlay = document.getElementById("successOverlay");
    if (overlay) return overlay;

    overlay = document.createElement("div");
    overlay.id = "successOverlay";
    overlay.className = "success-overlay";
    overlay.innerHTML = `
      <div class="success-modal">
        <div class="success-icon"><i class="fa-solid fa-check"></i></div>
        <h2 class="success-title">Berhasil</h2>
        <p class="success-text">Laporan Berhasil Dikirim</p>
        <button type="button" class="success-ok-btn" id="successOkBtn">Ya</button>
      </div>
    `;
    document.body.appendChild(overlay);
    return overlay;
  }

  function showSuccessModal(onOk) {
    const overlay = ensureSuccessModal();
    const okBtn = overlay.querySelector("#successOkBtn");

    const handleOk = () => {
      overlay.classList.remove("show");
      okBtn.removeEventListener("click", handleOk);
      if (typeof onOk === "function") onOk();
    };

    okBtn.addEventListener("click", handleOk);
    requestAnimationFrame(() => overlay.classList.add("show"));
  }

  function ensureErrorModal() {
    let overlay = document.getElementById("errorOverlay");
    if (overlay) return overlay;

    overlay = document.createElement("div");
    overlay.id = "errorOverlay";
    overlay.className = "success-overlay";
    overlay.innerHTML = `
      <div class="success-modal">
        <div class="error-icon"><i class="fa-solid fa-exclamation"></i></div>
        <h2 class="success-title">Peringatan</h2>
        <p class="success-text" id="errorModalText">Terjadi kesalahan</p>
        <button type="button" class="success-ok-btn" id="errorOkBtn">OK</button>
      </div>
    `;
    document.body.appendChild(overlay);
    return overlay;
  }

  function showErrorModal(message, onOk) {
    const overlay = ensureErrorModal();
    const textEl = overlay.querySelector("#errorModalText");
    const okBtn = overlay.querySelector("#errorOkBtn");

    textEl.textContent = message;

    const handleOk = () => {
      overlay.classList.remove("show");
      okBtn.removeEventListener("click", handleOk);
      if (typeof onOk === "function") onOk();
    };

    okBtn.addEventListener("click", handleOk);
    requestAnimationFrame(() => overlay.classList.add("show"));
  }

  // ---------- Ambil Elemen Form ----------
  const form = document.getElementById("klaimForm");
  const fileInput = document.getElementById("bukti_foto");
  const laporanSelect = document.getElementById("laporanSelect");
  const submitBtn = document.getElementById("submitBtn");
  const usernameLabel = document.getElementById("usernameLabel");
  const uploadDropzone = document.getElementById("uploadDropzone");
  const placeholderText = document.getElementById("placeholderText");
  const logoutBtn = document.getElementById("logoutBtn");

  // 1. Ambil Session & NIM
  const {
    data: { session },
  } = await supabaseClient.auth.getSession();
  if (!session) {
    showErrorModal("Silakan login terlebih dahulu!", () => {
      window.location.href = "../index.html";
    });
    return;
  }

  const { data: mhs } = await supabaseClient
    .from("Mahasiswa")
    .select("NIM, Nama_Lengkap")
    .eq("user_id", session.user.id)
    .single();
  const currentNim = mhs.NIM;

  if (usernameLabel) {
    usernameLabel.textContent = currentNim || session.user.email || "Pengguna";
  }

  // Tarik ID Temuan dari URL
  const params = new URLSearchParams(window.location.search);
  const idTemuan = parseInt(params.get("id")?.split("-")[1] || 0);

  if (!idTemuan) {
    showErrorModal(
      "ID Barang Temuan tidak valid. Silakan pilih barang dari menu Cari Barang.",
      () => {
        window.location.href = "PencarianBarangTemuan.html";
      }
    );
    return;
  }

  // 2. Load Dropdown Laporan Kehilangan (Sesuai List Pencarian)
  const { data: laporan } = await supabaseClient
    .from("Laporan_Hilang")
    .select("Id_Laporan, Nama_Barang, Tanggal_Kehilangan, created_at")
    .eq("NIM_Pelapor", currentNim)
    .eq("status", "Sedang Dicari")
    .order("created_at", { ascending: false });

  laporanSelect.innerHTML = "";

  if (laporan && laporan.length > 0) {
    const defaultOpt = document.createElement("option");
    defaultOpt.value = "";
    defaultOpt.textContent = "- Tidak / Saya belum membuat laporan -";
    laporanSelect.appendChild(defaultOpt);

    laporan.forEach((item) => {
      const opt = document.createElement("option");
      opt.value = item.Id_Laporan;

      let tglMurni = item.Tanggal_Kehilangan || item.created_at || "-";
      if (tglMurni !== "-") tglMurni = tglMurni.split("T")[0];

      opt.textContent = `LH-${String(item.Id_Laporan).padStart(3, "0")} - ${item.Nama_Barang} (${tglMurni})`;
      laporanSelect.appendChild(opt);
    });
  } else {
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = "- Tidak / Saya belum membuat laporan -";
    laporanSelect.appendChild(opt);
    laporanSelect.disabled = true;
  }

  // 3. Feedback visual saat foto dipilih
  if (fileInput && uploadDropzone && placeholderText) {
    fileInput.addEventListener("change", () => {
      if (fileInput.files && fileInput.files.length > 0) {
        placeholderText.textContent = fileInput.files[0].name;
        uploadDropzone.classList.add("has-file");
      } else {
        placeholderText.textContent = "Masukan Foto Bukti Kepemilikan Barang atau KTM Anda";
        uploadDropzone.classList.remove("has-file");
      }
    });
  }

  // 4. Logout
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async (e) => {
      e.preventDefault();
      await supabaseClient.auth.signOut();
      window.location.href = "../index.html";
    });
  }

  // 5. Submit Form
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    submitBtn.disabled = true;
    submitBtn.textContent = "Mengirim...";

    try {
      if (!fileInput.files || fileInput.files.length === 0) {
        throw new Error("Pilih foto bukti kepemilikan Anda!");
      }

      const file = fileInput.files[0];

      // Upload Foto
      const filePath = `klaim/${currentNim}/${Date.now()}.png`;
      const { error: uploadError } = await supabaseClient.storage
        .from("bukti-kepemilikan")
        .upload(filePath, file);
      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabaseClient.storage.from("bukti-kepemilikan").getPublicUrl(filePath);

      // Siapkan Payload Data Klaim
      const payload = {
        Id_Temuan: idTemuan,
        NIM_Pengambil: currentNim,
        Bukti_Kepemilikan: publicUrl,
        status: "Menunggu Validasi",
      };

      if (laporanSelect.value) {
        payload.Id_Laporan = parseInt(laporanSelect.value);
      }

      // Insert ke Klaim_Barang
      const { error: dbError } = await supabaseClient.from("Klaim_Barang").insert(payload);

      if (dbError) throw dbError;

      // Munculkan custom Pop-up Berhasil
      showSuccessModal(() => {
        window.location.href = "Dashboard.html";
      });
    } catch (err) {
      console.error("Full Error:", err);
      showErrorModal(err.message || "Terjadi kesalahan sistem");
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Kirim Pengajuan";
    }
  });
});
