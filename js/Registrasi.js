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
// 2. LOGIKA DATABASE SUPABASE (Auth + Profil)
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
      // Cek dulu apakah NIM sudah dipakai (Email sudah otomatis dicek unik oleh Auth)
      const { data: existingNim, error: checkError } = await supabaseClient
        .from("Mahasiswa")
        .select("NIM")
        .eq("NIM", nimVal)
        .maybeSingle();

      if (checkError) {
        console.error("Gagal memeriksa NIM:", checkError);
        alert("Terjadi kesalahan saat memeriksa data: " + checkError.message);
        return;
      }

      if (existingNim) {
        alert("NIM ini sudah terdaftar. Silakan login atau gunakan NIM lain.");
        return;
      }

      // Langkah 1: Daftarkan akun ke Supabase Auth (password otomatis di-hash)
      const { data: signUpData, error: signUpError } =
        await supabaseClient.auth.signUp({
          email: emailVal,
          password: passwordVal,
        });

      if (signUpError) {
        console.error("Gagal mendaftar akun:", signUpError);
        alert("Pendaftaran gagal: " + signUpError.message);
        return;
      }

      const newUser = signUpData.user;
      if (!newUser) {
        alert(
          "Pendaftaran diproses, tapi tidak mendapat data user. Coba lagi.",
        );
        return;
      }

      // Langkah 2: Simpan data profil tambahan ke tabel Mahasiswa,
      // dihubungkan lewat user_id ke akun Auth yang baru dibuat.
      const { error: insertError } = await supabaseClient
        .from("Mahasiswa")
        .insert([
          {
            user_id: newUser.id,
            NIM: nimVal,
            Nama_Lengkap: namaVal,
            Email: emailVal,
            No_Hp: noHpVal,
          },
        ]);

      if (insertError) {
        console.error("Gagal menyimpan profil:", insertError);
        alert(
          "Akun berhasil dibuat, tapi gagal menyimpan data profil: " +
            insertError.message,
        );
        return;
      }

      // Jika project mengaktifkan "Confirm email", session belum ada di sini
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
