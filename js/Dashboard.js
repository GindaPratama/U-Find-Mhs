// Dashboard.js
// Tampilkan NIM asli user yang login (bukan teks statis "Pengguna"),
// urus dropdown profil, dan logout dari Supabase Auth.


// ==========================================
// 1. DROPDOWN PROFIL (UI, tetap sama seperti sebelumnya)
// ==========================================
const profileTrigger = document.getElementById("profileTrigger");
const profileDropdown = document.getElementById("profileDropdown");

if (profileTrigger && profileDropdown) {
  profileTrigger.addEventListener("click", (e) => {
    e.stopPropagation();
    profileDropdown.classList.toggle("open");
    profileTrigger.classList.toggle("open");
  });

  document.addEventListener("click", (e) => {
    if (
      !profileDropdown.contains(e.target) &&
      !profileTrigger.contains(e.target)
    ) {
      profileDropdown.classList.remove("open");
      profileTrigger.classList.remove("open");
    }
  });
}

// ==========================================
// 2. AMBIL NIM USER YANG SEDANG LOGIN
// ==========================================
document.addEventListener("DOMContentLoaded", async () => {
  const usernameEl = document.querySelector(".username");

  if (!supabaseClient) return;

  const {
    data: { session },
  } = await supabaseClient.auth.getSession();

  if (!session) {
    // Belum login / sesi habis -> lempar balik ke halaman login
    window.location.href = "../index.html";
    return;
  }

  const { data: mhsData, error } = await supabaseClient
    .from("Mahasiswa")
    .select("NIM")
    .eq("user_id", session.user.id)
    .maybeSingle();

  if (error) {
    console.error("Gagal mengambil data mahasiswa:", error);
    return;
  }

  if (mhsData && usernameEl) {
    usernameEl.textContent = mhsData.NIM;
  }
});

// ==========================================
// 3. LOGOUT
// ==========================================
const logoutLink = document.querySelector(".dropdown-item-danger");

if (logoutLink) {
  logoutLink.addEventListener("click", async (e) => {
    e.preventDefault();
    if (supabaseClient) {
      await supabaseClient.auth.signOut();
    }
    sessionStorage.removeItem("loggedInNim");
    window.location.href = "../index.html";
  });
}
