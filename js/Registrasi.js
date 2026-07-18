// ==========================================
// 1. LOGIKA UI TAMPILAN (Aman dari error Database)
// ==========================================
const togglePassword = document.querySelector("#togglePassword");
const password = document.querySelector("#password");

if (togglePassword && password) {
  togglePassword.addEventListener("click", function () {
    // Ubah tipe input
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
// 2. LOGIKA DATABASE SUPABASE
// ==========================================
const SUPABASE_URL = "https://fctpmyobagajyhgnptbj.supabase.co";
// PERHATIAN: Masukkan Anon Key kamu di bawah ini agar data bisa masuk
// (Project Settings > API > Project API keys > anon public)
const SUPABASE_ANON_KEY = "sb_publishable_YVSLcfVELiN_hbLy_VdFZQ_QAIcBJ2V";

// PENTING: gunakan window.supabase (library dari CDN) untuk membuat client,
// lalu simpan ke nama variabel BERBEDA (supabaseClient), bukan "supabase" —
// sebelumnya kode menimpa nama "supabase" dengan dirinya sendiri sehingga
// selalu gagal (ReferenceError) dan data tidak pernah terkirim.
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
    event.preventDefault(); // Mencegah halaman refresh otomatis

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

    // Nonaktifkan tombol saat proses berjalan agar tidak double-submit
    const originalBtnText = submitBtn ? submitBtn.textContent : "";
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = "Memproses...";
    }

    try {
      // Cek apakah NIM atau Email sudah terdaftar sebelumnya
      const { data: existing, error: checkError } = await supabaseClient
        .from("Mahasiswa")
        .select("NIM, Email")
        .or(`NIM.eq.${nimVal},Email.eq.${emailVal}`);

      if (checkError) {
        console.error("Gagal memeriksa data:", checkError);
        alert("Terjadi kesalahan saat memeriksa data: " + checkError.message);
        return;
      }

      if (existing && existing.length > 0) {
        const nimTaken = existing.some((row) => row.NIM === nimVal);
        alert(
          nimTaken
            ? "NIM ini sudah terdaftar. Silakan login atau gunakan NIM lain."
            : "Email ini sudah terdaftar. Silakan login atau gunakan email lain.",
        );
        return;
      }

      // Mengirim data ke tabel "Mahasiswa" di Supabase
      const { data, error } = await supabaseClient.from("Mahasiswa").insert([
        {
          NIM: nimVal,
          Nama_Lengkap: namaVal,
          Email: emailVal,
          No_Hp: noHpVal,
          Password: passwordVal,
        },
      ]);

      // Pengecekan status pendaftaran
      if (error) {
        console.error("Gagal menyimpan data:", error);
        alert("Pendaftaran gagal: " + error.message);
        return;
      }

      alert("Pendaftaran berhasil! Data telah masuk ke database U-Find.");

      // Kosongkan form setelah berhasil daftar
      registerForm.reset();

      // Mengarahkan otomatis ke halaman login (index.html)
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
