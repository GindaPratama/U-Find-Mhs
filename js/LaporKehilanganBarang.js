/**
 * LaporKehilanganBarang.js
 * Logic untuk halaman "Lapor Kehilangan Barang" - U-Find
 * - Upload & preview foto barang secara lokal (tanpa upload ke server)
 * - Drag & drop file
 * - Validasi tipe & ukuran file
 * - Validasi form sebelum submit
 * - Simulasi pengiriman laporan
 */

document.addEventListener("DOMContentLoaded", () => {
  // ---------- Konfigurasi ----------
  const MAX_FILE_SIZE_MB = 5;
  const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
  const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp"];

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

  // Tanggal kehilangan tidak boleh di masa depan
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

    // Validasi tipe file
    if (!ALLOWED_TYPES.includes(file.type)) {
      uploadDropzone.classList.add("invalid");
      showFieldError(
        "fotoBarang",
        "Format file tidak didukung. Gunakan PNG, JPG, atau WEBP.",
      );
      return;
    }

    // Validasi ukuran file
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

  // Klik tombol "Pilih Foto Barang" -> buka file picker
  uploadTriggerBtn.addEventListener("click", openFilePicker);

  // Klik tombol "Ganti" -> buka file picker lagi
  changePhotoBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    openFilePicker();
  });

  // Klik tombol "Hapus" -> reset foto
  removePhotoBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    resetPhoto();
  });

  // File dipilih lewat file picker
  fotoInput.addEventListener("change", (e) => {
    const file = e.target.files && e.target.files[0];
    handleFile(file);
  });

  // Drag & drop
  ["dragenter", "dragover"].forEach((eventName) => {
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

  // ---------- Submit Form ----------
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    setStatus("", "");

    if (!validateForm()) {
      setStatus("Periksa kembali data yang kamu isi ya.", "error");
      return;
    }

    const payload = {
      namaBarang: namaBarang.value.trim(),
      ciriBarang: ciriBarang.value.trim(),
      lokasiKejadian: lokasiKejadian.value.trim(),
      tanggalKejadian: tanggalKejadian.value,
      foto: selectedFile
        ? {
            name: selectedFile.name,
            size: selectedFile.size,
            type: selectedFile.type,
          }
        : null,
      createdAt: new Date().toISOString(),
    };

    // Nonaktifkan tombol submit selama "mengirim"
    submitBtn.disabled = true;
    submitBtn.querySelector(".submit-btn-text").textContent = "Mengirim...";

    // Simulasi proses pengiriman ke server.
    // Ganti bagian ini dengan pemanggilan API/backend U-Find yang sesungguhnya,
    // contoh: fetch('/api/laporan-kehilangan', { method: 'POST', body: formData })
    setTimeout(() => {
      console.log("Laporan Kehilangan Barang:", payload);

      setStatus(
        "Laporan berhasil dikirim! Kamu bisa cek statusnya di Riwayat Laporan.",
        "success",
      );

      submitBtn.disabled = false;
      submitBtn.querySelector(".submit-btn-text").textContent = "Laporkan";

      form.reset();
      resetPhoto();
    }, 900);
  });

  // Hapus pesan error tiap kali user mulai mengetik ulang
  [namaBarang, ciriBarang, lokasiKejadian, tanggalKejadian].forEach((field) => {
    field.addEventListener("input", () => clearFieldError(field.id));
  });
});
