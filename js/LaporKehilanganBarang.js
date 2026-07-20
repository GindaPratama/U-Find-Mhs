/**
 * LaporKehilanganBarang.js
 * Logic lengkap untuk halaman "Lapor Kehilangan Barang" - U-Find.
 * File ini SENGAJA berdiri sendiri (tidak bergantung ke navbar.js
 * atau supabaseClient.js) - koneksi Supabase & logic dropdown navbar
 * ditulis langsung di sini.
 *
 * HTML wajib memuat library Supabase sebelum file ini:
 *   <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
 *   <script src="../js/LaporKehilanganBarang.js"></script>
 */

document.addEventListener("DOMContentLoaded", () => {
  // ---------- Konfigurasi ----------
  const MAX_FILE_SIZE_MB = 5;
  const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
  const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp"];
  const STORAGE_BUCKET = "bukti-barang-hilang";
  const REDIRECT_AFTER_SUCCESS = "Dashboard.html";

  // ---------- Dropdown navbar (gantinya navbar.js) ----------
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
  const ciriBarang = document.getElementById("ciriBarang");
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
    document
      .querySelectorAll(".error-text")
      .forEach((el) => el.classList.remove("show"));
    document
      .querySelectorAll(".invalid")
      .forEach((el) => el.classList.remove("invalid"));
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
      showFieldError(
        "fotoBarang",
        "Format file tidak didukung. Gunakan PNG, JPG, atau WEBP.",
      );
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      uploadDropzone.classList.add("invalid");
      showFieldError(
        "fotoBarang",
        `Ukuran file terlalu besar. Maksimal ${MAX_FILE_SIZE_MB}MB.`,
      );
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

  ["dragenter", "dragover"].forEach(() => {
    uploadDropzone.addEventListener("dragenter", (e) => {
      e.preventDefault();
      e.stopPropagation();
      uploadDropzone.classList.add("dragover");
    });
    uploadDropzone.addEventListener("dragover", (e) => {
      e.preventDefault();
      e.stopPropagation();
      uploadDropzone.classList.add("dragover");
    });
  });

  ["dragleave", "drop"].forEach((eventName) => {
    uploadDropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (eventName === "dragleave") {
        uploadDropzone.classList.remove("dragover");
      }
    });
  });

  uploadDropzone.addEventListener("drop", (e) => {
    uploadDropzone.classList.remove("dragover");
    const file = e.dataTransfer.files && e.dataTransfer.files[0];
    if (file) handleFile(file);
  });

  // ---------- Validasi Form ----------
  function validateForm() {
    let isValid = true;
    clearAllErrors();

    if (!namaBarang.value.trim()) {
      showFieldError("namaBarang", "Nama barang wajib diisi.");
      isValid = false;
    }

    if (!ciriBarang.value.trim()) {
      showFieldError("ciriBarang", "Ciri barang wajib diisi.");
      isValid = false;
    } else if (ciriBarang.value.trim().length < 10) {
      showFieldError(
        "ciriBarang",
        "Jelaskan ciri barang lebih detail (min. 10 karakter).",
      );
      isValid = false;
    }

    if (!lokasiKejadian.value.trim()) {
      showFieldError("lokasiKejadian", "Lokasi kejadian wajib diisi.");
      isValid = false;
    }

    if (!tanggalKejadian.value) {
      showFieldError("tanggalKejadian", "Tanggal kehilangan wajib diisi.");
      isValid = false;
    } else if (tanggalKejadian.value > tanggalKejadian.max) {
      showFieldError(
        "tanggalKejadian",
        "Tanggal tidak boleh lebih dari hari ini.",
      );
      isValid = false;
    }

    return isValid;
  }

  // ---------- Ambil NIM mahasiswa yang sedang login ----------
  async function getNimMahasiswaLogin() {
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      throw new Error("Sesi login tidak ditemukan. Silakan login ulang.");
    }

    const { data: mhs, error: mhsError } = await supabaseClient
      .from("Mahasiswa")
      .select("NIM")
      .eq("user_id", user.id)
      .single();

    if (mhsError || !mhs) {
      throw new Error("Data mahasiswa tidak ditemukan untuk akun ini.");
    }

    return mhs.NIM;
  }

  // ---------- Upload foto ke Supabase Storage ----------
  async function uploadFotoBarang(nim, file) {
    if (!file) return null;

    const ext = file.name.split(".").pop();
    const filePath = `${nim}/${Date.now()}.${ext}`;

    const { error: uploadError } = await supabaseClient.storage
      .from(STORAGE_BUCKET)
      .upload(filePath, file, { cacheControl: "3600", upsert: false });

    if (uploadError) {
      throw new Error(`Gagal mengupload foto: ${uploadError.message}`);
    }

    const { data: publicUrlData } = supabaseClient.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(filePath);

    return publicUrlData.publicUrl;
  }

  // ---------- Insert laporan ke tabel Laporan_Hilang ----------
  async function insertLaporanHilang(nim, fotoUrl) {
    const { error: insertError } = await supabaseClient
      .from("Laporan_Hilang")
      .insert({
        NIM_Pelapor: nim,
        Nama_Barang: namaBarang.value.trim(),
        Ciri_Khusus: ciriBarang.value.trim(),
        Lokasi_Kejadian: lokasiKejadian.value.trim(),
        Tanggal_Kehilangan: tanggalKejadian.value,
        Foto_Barang: fotoUrl,
        // status tidak perlu dikirim - default "Menunggu Validasi" dari DB
      });

    if (insertError) {
      throw new Error(`Gagal menyimpan laporan: ${insertError.message}`);
    }
  }

  // ---------- Submit Form ----------
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    setStatus("", "");

    if (!validateForm()) {
      setStatus("Periksa kembali data yang kamu isi ya.", "error");
      return;
    }

    submitBtn.disabled = true;
    submitBtn.querySelector(".submit-btn-text").textContent = "Mengirim...";

    try {
      const nim = await getNimMahasiswaLogin();
      const fotoUrl = await uploadFotoBarang(nim, selectedFile);
      await insertLaporanHilang(nim, fotoUrl);

      // Tampilkan popup sukses. Reset form & redirect BARU terjadi
      // setelah user klik tombol "Ok" di popup.
      showSuccessModal(() => {
        form.reset();
        resetPhoto();
        window.location.href = REDIRECT_AFTER_SUCCESS;
      });
    } catch (err) {
      console.error(err);
      setStatus(
        err.message || "Terjadi kesalahan, silakan coba lagi.",
        "error",
      );
    } finally {
      submitBtn.disabled = false;
      submitBtn.querySelector(".submit-btn-text").textContent = "Laporkan";
    }
  });

  [namaBarang, ciriBarang, lokasiKejadian, tanggalKejadian].forEach((field) => {
    field.addEventListener("input", () => clearFieldError(field.id));
  });
});
