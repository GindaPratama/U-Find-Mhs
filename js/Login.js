document.addEventListener("DOMContentLoaded", () => {
  // ==========================================
  // 1. TOGGLE ICON MATA PASSWORD
  // ==========================================
  const togglePassword = document.querySelector("#togglePassword");
  const password = document.querySelector("#password");

  if (togglePassword && password) {
    togglePassword.addEventListener("click", function () {
      if (password.type === "password") {
        password.type = "text";
        this.classList.replace("fa-eye", "fa-eye-slash");
      } else {
        password.type = "password";
        this.classList.replace("fa-eye-slash", "fa-eye");
      }
    });
  }

  // ==========================================
  // 2. MODAL PERINGATAN (pengganti alert bawaan)
  // ==========================================
  const warningModal = document.getElementById("warningModal");
  const warningMessage = document.getElementById("warningMessage");
  const warningOkBtn = document.getElementById("warningOkBtn");

  function showWarning(message) {
    if (!warningModal) {
      alert(message);
      return;
    }
    warningMessage.textContent = message;
    warningModal.classList.add("open");
  }

  if (warningOkBtn) {
    warningOkBtn.addEventListener("click", () => {
      warningModal.classList.remove("open");
    });
  }

  // ==========================================
  // 3. LOGIKA LOGIN KE SUPABASE
  // ==========================================
  const loginForm = document.getElementById("loginForm");
  const loginBtn = document.querySelector(".btn-login");

  if (loginForm) {
    loginForm.addEventListener("submit", async function (event) {
      event.preventDefault(); // Cegah halaman reload (karena novalidate)

      if (typeof supabaseClient === "undefined") {
        showWarning("Koneksi ke database belum siap. Coba lagi nanti.");
        return;
      }

      const nimVal = document.getElementById("nim").value.trim();
      const passwordVal = document.getElementById("password").value;

      // VALIDASI 1: Jika salah satu / keduanya kosong
      if (!nimVal || !passwordVal) {
        showWarning("Mohon Lengkapi Data Terlebih Dahulu");
        return;
      }

      const originalBtnText = loginBtn ? loginBtn.textContent : "";
      if (loginBtn) {
        loginBtn.disabled = true;
        loginBtn.textContent = "Memproses...";
      }

      try {
        // Cari Email yang terhubung dengan NIM ini lewat RPC function
        const { data: emailResult, error: mhsError } = await supabaseClient.rpc(
          "get_email_by_nim",
          { p_nim: nimVal },
        );

        if (mhsError) {
          console.error("Gagal cek NIM:", mhsError);
          showWarning("Terjadi kesalahan sistem, coba lagi nanti.");
          return;
        }

        // VALIDASI 2: Jika NIM tidak ditemukan di database
        if (!emailResult) {
          showWarning("NIM atau Password Salah");
          return;
        }

        // Login pakai Email hasil pencarian + password yang diinput user
        const { error: signInError } =
          await supabaseClient.auth.signInWithPassword({
            email: emailResult,
            password: passwordVal,
          });

        // VALIDASI 3: Jika password salah
        if (signInError) {
          console.error("Gagal login:", signInError);
          if (
            signInError.message &&
            signInError.message.toLowerCase().includes("email not confirmed")
          ) {
            showWarning(
              "Akun belum diaktivasi. Silakan cek email kamu untuk link aktivasi.",
            );
          } else {
            showWarning("NIM atau Password Salah");
          }
          return;
        }

        // Sukses login -> simpan session dan arahkan ke Dashboard
        sessionStorage.setItem("loggedInNim", nimVal);
        window.location.href = "html/Dashboard.html";
      } catch (err) {
        console.error("Terjadi kesalahan tak terduga:", err);
        showWarning("Terjadi kesalahan tak terduga. Coba lagi nanti.");
      } finally {
        if (loginBtn) {
          loginBtn.disabled = false;
          loginBtn.textContent = originalBtnText;
        }
      }
    });
  }
});
