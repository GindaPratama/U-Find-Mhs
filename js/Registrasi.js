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
// 2. LOGIKA MODAL SUKSES (pengganti alert bawaan)
// ==========================================
const successModal = document.getElementById("successModal");
const modalTitle = document.getElementById("modalTitle");
const modalMessage = document.getElementById("modalMessage");
const modalOkBtn = document.getElementById("modalOkBtn");

/**
 * Tampilkan modal sukses. redirectAfterClose menentukan apakah
 * user diarahkan ke index.html setelah klik tombol "Mengerti".
 */
function showSuccessModal(title, message, redirectAfterClose = true) {
  if (!successModal) {
    // Fallback kalau modal tidak ditemukan di HTML
    alert(`${title}\n${message}`);
    if (redirectAfterClose) window.location.href = "../index.html";
    return;
  }

  modalTitle.textContent = title;
  modalMessage.textContent = message;
  successModal.classList.add("open");

  const handleClose = () => {
    successModal.classList.remove("open");
    modalOkBtn.removeEventListener("click", handleClose);
    if (redirectAfterClose) {
      window.location.href = "../index.html";
    }
  };

  modalOkBtn.addEventListener("click", handleClose);
}

// ==========================================
// 3. LOGIKA DATABASE SUPABASE (Auth + Profil otomatis via trigger)
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
      // dititipkan lewat "options.data" sebagai metadata, lalu otomatis
      // dibaca oleh trigger database untuk membuat baris di tabel
      // Mahasiswa — tanpa insert manual dari client.
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

        if (
          signUpError.message &&
          signUpError.message.toLowerCase().includes("nim")
        ) {
          alert(
            "NIM ini sudah terdaftar. Silakan login atau gunakan NIM lain.",
          );
        } else if (
          signUpError.message &&
          signUpError.message.toLowerCase().includes("already registered")
        ) {
          alert("Email ini sudah terdaftar. Silakan login.");
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

      registerForm.reset();

      // "Confirm email" aktif -> signUp tidak langsung menghasilkan
      // session, user WAJIB klik link di email dulu sebelum bisa login.
      if (!signUpData.session) {
        showSuccessModal(
          "Terima kasih sudah melakukan registrasi akun",
          "Silahkan cek email Anda untuk melakukan aktivasi akun.",
          true,
        );
      } else {
        // Fallback kalau suatu saat "Confirm email" dimatikan lagi
        showSuccessModal(
          "Pendaftaran berhasil!",
          "Silakan login menggunakan akun yang baru saja Anda daftarkan.",
          true,
        );
      }
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
