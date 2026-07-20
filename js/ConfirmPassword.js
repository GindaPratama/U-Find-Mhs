document.addEventListener("DOMContentLoaded", async () => {
  // ---------- 1. Toggle ikon mata password ----------
  document.querySelectorAll(".toggle-password").forEach((icon) => {
    icon.addEventListener("click", function () {
      const input = document.getElementById(this.getAttribute("data-target"));
      if (!input) return;
      if (input.type === "password") {
        input.type = "text";
        this.classList.replace("fa-eye", "fa-eye-slash");
      } else {
        input.type = "password";
        this.classList.replace("fa-eye-slash", "fa-eye");
      }
    });
  });

  // ---------- 2. Elemen form ----------
  const form = document.getElementById("confirmPasswordForm");
  const newPasswordInput = document.getElementById("new_password");
  const confirmPasswordInput = document.getElementById("confirm_password");
  const submitBtn = document.getElementById("submitBtn");

  // ---------- 3. Modal helpers ----------
  function openModal(id) {
    const el = document.getElementById(id);
    if (el) el.classList.add("open");
  }

  function closeModal(id) {
    const el = document.getElementById(id);
    if (el) el.classList.remove("open");
  }

  // Event Listener Tombol Modal
  document
    .getElementById("incompleteOkBtn")
    ?.addEventListener("click", () => closeModal("incompleteModal"));
  document
    .getElementById("shortOkBtn")
    ?.addEventListener("click", () => closeModal("shortModal"));
  document
    .getElementById("invalidLinkOkBtn")
    ?.addEventListener("click", () => closeModal("invalidLinkModal"));
  document.getElementById("successOkBtn")?.addEventListener("click", () => {
    closeModal("successModal");
    window.location.href = "../index.html"; // Kembali ke login setelah sukses
  });

  // ---------- 4. Verifikasi Sesi Recovery ----------
  function setFormEnabled(enabled) {
    if (newPasswordInput) newPasswordInput.disabled = !enabled;
    if (confirmPasswordInput) confirmPasswordInput.disabled = !enabled;
    if (submitBtn) submitBtn.disabled = !enabled;
  }

  // Kunci form secara default
  setFormEnabled(false);

  // Cek apakah supabaseClient ada di global scope
  if (typeof supabaseClient === "undefined") {
    document.getElementById("invalidLinkText").textContent =
      "Koneksi ke server belum siap. Silakan muat ulang halaman.";
    openModal("invalidLinkModal");
    return;
  }

  try {
    // Ketika link reset diklik, Supabase otomatis membuat sesi dari token di URL
    const {
      data: { session },
      error,
    } = await supabaseClient.auth.getSession();

    // Kita juga cek URL secara manual untuk memastikan ini alur recovery
    const hash = window.location.hash;
    const isRecovery = hash.includes("type=recovery");

    if (session || isRecovery) {
      // Valid! Buka gembok inputan
      setFormEnabled(true);
    } else {
      // Tidak ada token valid di URL atau sesi
      document.getElementById("invalidLinkText").textContent =
        "Link reset password tidak valid, sudah kadaluarsa, atau sudah pernah digunakan.";
      openModal("invalidLinkModal");
    }
  } catch (err) {
    console.error("Error cek sesi:", err);
  }

  // ---------- 5. Submit Update Password ----------
  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      const newPassword = newPasswordInput.value;
      const confirmPassword = confirmPasswordInput.value;

      // Validasi kosong
      if (newPassword.trim() === "" || confirmPassword.trim() === "") {
        openModal("incompleteModal");
        return;
      }

      // Validasi kecocokan
      if (newPassword !== confirmPassword) {
        openModal("incompleteModal");
        return;
      }

      // Validasi panjang
      if (newPassword.length < 6) {
        openModal("shortModal");
        return;
      }

      // Lolos validasi, proses ubah password
      submitBtn.disabled = true;
      const originalLabel = submitBtn.textContent;
      submitBtn.textContent = "Menyimpan...";

      try {
        const { error } = await supabaseClient.auth.updateUser({
          password: newPassword,
        });

        if (error) {
          throw error;
        }

        // Kunci form kembali agar tidak di-submit dua kali
        setFormEnabled(false);
        form.reset();

        // Logout dari sesi recovery agar pengguna harus login normal menggunakan password baru
        await supabaseClient.auth.signOut();

        openModal("successModal");
      } catch (err) {
        console.error("Gagal update password:", err);
        document.getElementById("invalidLinkText").textContent =
          "Gagal mengubah password: " + err.message;
        openModal("invalidLinkModal");
      } finally {
        submitBtn.textContent = originalLabel;
        submitBtn.disabled = false;
      }
    });
  }
});
