// Login.js
// Login pakai NIM, tapi Supabase Auth butuh Email -> jadi kita cari dulu
// Email yang berpasangan dengan NIM di tabel Mahasiswa, baru signInWithPassword.

// ==================== KONFIGURASI SUPABASE ====================
// Samakan persis dengan Registrasi.js / ResetPassword.js
const SUPABASE_URL = "https://fctpmyobagajyhgnptbj.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_YVSLcfVELiN_hbLy_VdFZQ_QAIcBJ2V";

let supabaseClient = null;
try {
  supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
  );
} catch (err) {
  console.error("Supabase belum terhubung dengan sempurna:", err);
}

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
const loginForm = document.querySelector("form");
const loginBtn = document.querySelector(".btn-login");

if (loginForm) {
  loginForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    if (!supabaseClient) {
      showWarning("Koneksi ke database belum siap. Coba lagi nanti.");
      return;
    }

    const nimVal = document.getElementById("nim").value.trim();
    const passwordVal = document.getElementById("password").value;

    if (!nimVal || !passwordVal) {
      showWarning("Mohon isi NIM dan Password terlebih dahulu.");
      return;
    }

    const originalBtnText = loginBtn ? loginBtn.textContent : "";
    if (loginBtn) {
      loginBtn.disabled = true;
      loginBtn.textContent = "Memproses...";
    }

    try {
      // 1) Cari Email yang terhubung dengan NIM ini lewat RPC function
      // get_email_by_nim (bukan query langsung ke tabel Mahasiswa), supaya
      // tabel Mahasiswa tetap terkunci ketat lewat RLS untuk publik/anon.
      const { data: emailResult, error: mhsError } = await supabaseClient.rpc(
        "get_email_by_nim",
        { p_nim: nimVal },
      );

      if (mhsError) {
        console.error("Gagal cek NIM:", mhsError);
        showWarning("Terjadi kesalahan, coba lagi nanti.");
        return;
      }

      if (!emailResult) {
        // NIM tidak ditemukan -> pesan digeneralisasi demi keamanan
        showWarning("NIM atau Password Salah");
        return;
      }

      // 2) Login pakai Email hasil pencarian + password yang diinput user
      const { error: signInError } =
        await supabaseClient.auth.signInWithPassword({
          email: emailResult,
          password: passwordVal,
        });

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

      // 3) Simpan NIM di sessionStorage biar Dashboard/Profile bisa langsung
      // pakai tanpa nunggu query lain (opsional, Dashboard tetap fetch ulang
      // dari database supaya datanya selalu akurat).
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
