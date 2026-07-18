// ==========================================
// 1. LOGIKA UI TAMPILAN (Aman dari error Database)
// ==========================================
const togglePassword = document.querySelector("#togglePassword");
const password = document.querySelector("#password");

if (togglePassword && password) {
  togglePassword.addEventListener("click", function () {
    if (password.type === "password") {
      password.type = "text";
      this.classList.remove("fa-eye");
      this.classList.add("fa-eye-slash");
    } else {
      password.type = "password";
      this.classList.remove("fa-eye-slash");
      this.classList.add("fa-eye");
    }
  });
}

// ==========================================
// 2. LOGIKA DATABASE SUPABASE (Auth + Profil otomatis via trigger)
// ==========================================
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

const registerForm = document.getElementById("registerForm");
const submitBtn = registerForm
  ? registerForm.querySelector(".btn-primary")
  : null;

if (registerForm) {
  registerForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    if (!supabaseClient) {
      alert(
        "Koneksi ke database belum siap. Periksa SUPABASE_ANON_KEY di Registrasi.js.",
      );
      return;
    }

    const nimVal = document.getElementById("nim").value.trim();
    const namaVal = document.getElementById("nama").value.trim();
    const emailVal = document.getElementById("email").value.trim();
    const passwordVal = document.getElementById("password").value;
    const noHpVal = document.getElementById("nohp").value.trim();

    if (!nimVal || !namaVal || !emailVal || !passwordVal || !noHpVal) {
      alert("Mohon lengkapi semua field terlebih dahulu.");
      return;
    }

    if (passwordVal.length < 6) {
      alert("Password minimal 6 karakter.");
      return;
    }

    const originalBtnText = submitBtn ? submitBtn.textContent : "";
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = "Memproses...";
    }

    try {
      // Daftarkan akun ke Supabase Auth. Data profil (NIM, nama, no HP)
      // dititipkan lewat "options.data" sebagai metadata — nanti dibaca
      // otomatis oleh trigger database untuk membuat baris di tabel
      // Mahasiswa, TANPA perlu insert manual dari sisi client.
      // Pola ini aman walau "Confirm email" aktif (session belum ada).
      const { data: signUpData, error: signUpError } =
        await supabaseClient.auth.signUp({
          email: emailVal,
          password: passwordVal,
          options: {
            data: {
              nim: nimVal,
              nama_lengkap: namaVal,
              no_hp: noHpVal,
            },
          },
        });

      if (signUpError) {
        console.error("Gagal mendaftar akun:", signUpError);

        // Pesan Supabase untuk NIM duplikat akan muncul lewat trigger
        // sebagai error constraint unique, tangkap biar pesannya jelas
        if (
          signUpError.message &&
          signUpError.message.toLowerCase().includes("nim")
        ) {
          alert(
            "NIM ini sudah terdaftar. Silakan login atau gunakan NIM lain.",
          );
        } else {
          alert("Pendaftaran gagal: " + signUpError.message);
        }
        return;
      }

      if (!signUpData.user) {
        alert(
          "Pendaftaran diproses, tapi tidak mendapat data user. Coba lagi.",
        );
        return;
      }

      if (!signUpData.session) {
        alert(
          "Pendaftaran berhasil! Silakan cek email kamu untuk konfirmasi akun sebelum login.",
        );
      } else {
        alert("Pendaftaran berhasil! Data telah masuk ke database U-Find.");
      }

      registerForm.reset();
      window.location.href = "../index.html";
    } catch (err) {
      console.error("Terjadi kesalahan tak terduga:", err);
      alert("Terjadi kesalahan tak terduga. Coba lagi nanti.");
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = originalBtnText;
      }
    }
  });
}
