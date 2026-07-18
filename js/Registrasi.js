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
const SUPABASE_ANON_KEY = "MASUKKAN_ANON_KEY_KAMU_DISINI";

// Kita bungkus dalam try-catch agar jika koneksi database error, UI web tidak ikut macet
try {
  const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  const registerForm = document.getElementById("registerForm");

  if (registerForm) {
    registerForm.addEventListener("submit", async function (event) {
      event.preventDefault(); // Mencegah halaman refresh otomatis

      const nimVal = document.getElementById("nim").value;
      const namaVal = document.getElementById("nama").value;
      const emailVal = document.getElementById("email").value;
      const passwordVal = document.getElementById("password").value;
      const noHpVal = document.getElementById("nohp").value;

      // Mengirim data ke tabel "Mahasiswa" di Supabase
      const { data, error } = await supabase.from("Mahasiswa").insert([
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
      } else {
        alert("Pendaftaran berhasil! Data telah masuk ke database U-Find.");

        // Kosongkan form setelah berhasil daftar
        registerForm.reset();

        // Mengarahkan otomatis ke halaman login (index.html)
        window.location.href = "../index.html";
      }
    });
  }
} catch (err) {
  console.error("Supabase belum terhubung dengan sempurna:", err);
}
