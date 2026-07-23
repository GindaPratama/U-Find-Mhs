document.addEventListener("DOMContentLoaded", async () => {
  // --- FITUR UPDATE: Tampilkan NIM di Navbar ---
  const usernameEl = document.querySelector(".username");
  if (typeof supabaseClient !== "undefined" && usernameEl) {
    const {
      data: { session },
    } = await supabaseClient.auth.getSession();
    if (session) {
      const { data: mhsData } = await supabaseClient
        .from("Mahasiswa")
        .select("NIM, Nama_Lengkap")
        .eq("user_id", session.user.id)
        .maybeSingle();
      if (mhsData) usernameEl.textContent = getTwoWords(mhsData.Nama_Lengkap);
    }
  }

  // Notifikasi
  if (typeof initNotifications === "function") {
    initNotifications();
  }

  function getTwoWords(fullName) {
    if (!fullName) return "Pengguna";
    return fullName.trim().split(/\s+/).slice(0, 2).join(" ");
  }

  // ---------- Konfigurasi ----------
  const MAX_FILE_SIZE_MB = 5;
  const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
  const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp"];
  const STORAGE_BUCKET = "bukti-barang-temuan";
  const REDIRECT_AFTER_SUCCESS = "Dashboard.html";

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
  })();

  // ---------- Modal Sukses ----------
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
        <p class="success-text">Berhasil Melaporkan</p>
        <button type="button" class="success-ok-btn" id="successOkBtn">Ok</button>
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

  // ---------- Ambil elemen ----------
  const form = document.getElementById("laporForm");
  const submitBtn = document.getElementById("submitBtn");
  const formStatus = document.getElementById("formStatus");

  const namaBarang = document.getElementById("namaBarang");
  const rincianBarang = document.getElementById("rincianBarang");
  const lokasiKejadian = document.getElementById("lokasiKejadian");
  const tanggalKejadian = document.getElementById("tanggalKejadian");

  const fotoInput = document.getElementById("fotoBarang");
  const uploadDropzone = document.getElementById("uploadDropzone");
  const uploadTriggerBtn = document.getElementById("uploadTriggerBtn");
  const uploadEmpty = document.getElementById("uploadEmpty");
  const uploadPreview = document.getElementById("uploadPreview");
  const previewImage = document.getElementById("previewImage");
  const previewFilename = document.getElementById("previewFilename");
  const previewFilesize = document.getElementById("previewFilesize");
  const changePhotoBtn = document.getElementById("changePhotoBtn");
  const removePhotoBtn = document.getElementById("removePhotoBtn");

  let selectedFile = null;
  let objectUrl = null;

  tanggalKejadian.max = new Date().toISOString().split("T")[0];

  // ---------- Util ----------
  function formatFileSize(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  function showFieldError(fieldName, message) {
    const errorEl = document.querySelector(`[data-error-for="${fieldName}"]`);
    const inputEl = document.getElementById(fieldName);
    if (errorEl) {
      errorEl.textContent = message;
      errorEl.classList.add("show");
    }
    if (inputEl) inputEl.classList.add("invalid");
  }

  function clearFieldError(fieldName) {
    const errorEl = document.querySelector(`[data-error-for="${fieldName}"]`);
    const inputEl = document.getElementById(fieldName);
    if (errorEl) {
      errorEl.textContent = "";
      errorEl.classList.remove("show");
    }
    if (inputEl) inputEl.classList.remove("invalid");
  }

  function clearAllErrors() {
    document.querySelectorAll(".error-text").forEach((el) => el.classList.remove("show"));
    document.querySelectorAll(".invalid").forEach((el) => el.classList.remove("invalid"));
    uploadDropzone.classList.remove("invalid");
  }

  function setStatus(message, type) {
    formStatus.textContent = message;
    formStatus.className = "form-status" + (type ? ` ${type}` : "");
  }

  // ---------- Upload & Preview Foto ----------
  function openFilePicker() {
    fotoInput.click();
  }

  function resetPhoto() {
    selectedFile = null;
    fotoInput.value = "";
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl);
      objectUrl = null;
    }
    previewImage.src = "";
    uploadEmpty.classList.remove("hidden");
    uploadPreview.classList.add("hidden");
    clearFieldError("fotoBarang");
  }

  function handleFile(file) {
    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      uploadDropzone.classList.add("invalid");
      showFieldError("fotoBarang", "Format file tidak didukung.");
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      uploadDropzone.classList.add("invalid");
      showFieldError("fotoBarang", `Ukuran file maks ${MAX_FILE_SIZE_MB}MB.`);
      return;
    }

    uploadDropzone.classList.remove("invalid");
    clearFieldError("fotoBarang");

    selectedFile = file;

    if (objectUrl) URL.revokeObjectURL(objectUrl);
    objectUrl = URL.createObjectURL(file);

    previewImage.src = objectUrl;
    previewFilename.textContent = file.name;
    previewFilesize.textContent = formatFileSize(file.size);

    uploadEmpty.classList.add("hidden");
    uploadPreview.classList.remove("hidden");
  }

  uploadTriggerBtn.addEventListener("click", openFilePicker);
  changePhotoBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    openFilePicker();
  });
  removePhotoBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    resetPhoto();
  });
  fotoInput.addEventListener("change", (e) => {
    const file = e.target.files && e.target.files[0];
    handleFile(file);
  });

  // ---------- Submit Form ----------
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    setStatus("", "");

    if (
      !namaBarang.value.trim() ||
      !rincianBarang.value.trim() ||
      !lokasiKejadian.value.trim() ||
      !tanggalKejadian.value
    ) {
      setStatus("Periksa kembali data yang kamu isi ya.", "error");
      return;
    }

    submitBtn.disabled = true;
    submitBtn.querySelector(".submit-btn-text").textContent = "Mengirim...";

    try {
      const {
        data: { user },
      } = await supabaseClient.auth.getUser();
      const { data: mhs } = await supabaseClient
        .from("Mahasiswa")
        .select("NIM, Nama_Lengkap")
        .eq("user_id", user.id)
        .single();
      const nim = mhs.NIM;

      let fotoUrl = null;
      if (selectedFile) {
        const ext = selectedFile.name.split(".").pop();
        const filePath = `${nim}/${Date.now()}.${ext}`;
        const { error: uploadError } = await supabaseClient.storage
          .from(STORAGE_BUCKET)
          .upload(filePath, selectedFile);
        if (uploadError) {
          throw new Error("Gagal mengupload foto: " + uploadError.message);
        }
        const { data } = supabaseClient.storage.from(STORAGE_BUCKET).getPublicUrl(filePath);
        fotoUrl = data.publicUrl;
      }

      const { error: insertError } = await supabaseClient.from("Laporan_Temuan").insert({
        NIM_Penemu: nim,
        Nama_Barang: namaBarang.value.trim(),
        Ciri_Khusus: rincianBarang.value.trim(),
        Lokasi_Penemuan: lokasiKejadian.value.trim(),
        Tanggal_Penemuan: tanggalKejadian.value,
        Foto_Barang: fotoUrl,
        status: "Menunggu Validasi", // Tambahkan status awal
      });

      if (insertError) {
        console.error("Gagal menyimpan laporan temuan:", insertError);
        throw new Error("Gagal menyimpan laporan: " + insertError.message);
      }

      showSuccessModal(() => {
        form.reset();
        resetPhoto();
        window.location.href = REDIRECT_AFTER_SUCCESS;
      });
    } catch (err) {
      console.error(err);
      setStatus("Terjadi kesalahan, silakan coba lagi.", "error");
    } finally {
      submitBtn.disabled = false;
      submitBtn.querySelector(".submit-btn-text").textContent = "Laporkan";
    }
  });

  [namaBarang, rincianBarang, lokasiKejadian, tanggalKejadian].forEach((field) => {
    field.addEventListener("input", () => clearFieldError(field.id));
  });
});
