// ==========================================
// 1. DROPDOWN PROFIL
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
// 2. AMBIL DATA PROFIL DARI DATABASE
// ==========================================
document.addEventListener("DOMContentLoaded", async () => {
  const namaTopEl = document.getElementById("profileNamaTop");

  if (!supabaseClient) {
    if (namaTopEl) namaTopEl.textContent = "Gagal memuat";
    return;
  }

  const {
    data: { session },
  } = await supabaseClient.auth.getSession();

  if (!session) {
    window.location.href = "../index.html";
    return;
  }

  const { data: mhsData, error } = await supabaseClient
    .from("Mahasiswa")
    .select("NIM, Nama_Lengkap, No_Hp, Email")
    .eq("user_id", session.user.id)
    .maybeSingle();

  if (error || !mhsData) {
    if (namaTopEl) namaTopEl.textContent = "Data tidak ditemukan";
    return;
  }

  document.querySelectorAll(".username").forEach((el) => {
    el.textContent = mhsData.NIM;
  });

  const setText = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.textContent = value || "-";
  };

  setText("profileNamaTop", mhsData.Nama_Lengkap);
  setText("profileNama", mhsData.Nama_Lengkap);
  setText("profileNim", mhsData.NIM);
  setText("profileNoHp", mhsData.No_Hp);
  setText("profileEmail", mhsData.Email);
});

// ==========================================
// 3. LOGIKA POP-UP & LOGOUT
// ==========================================
const logoutButtons = document.querySelectorAll("#navBtnKeluar, #btnKeluar");
const confirmLogoutModal = document.getElementById("confirmLogoutModal");
const confirmYesBtn = document.getElementById("confirmYesBtn");
const confirmNoBtn = document.getElementById("confirmNoBtn");

// Tampilkan modal ketika tombol keluar diklik
logoutButtons.forEach((btn) => {
  btn.addEventListener("click", (e) => {
    e.preventDefault();
    if (confirmLogoutModal) {
      confirmLogoutModal.classList.add("open");
    }
  });
});

// Tutup modal ketika klik "Tidak"
if (confirmNoBtn) {
  confirmNoBtn.addEventListener("click", () => {
    confirmLogoutModal.classList.remove("open");
  });
}

// Proses logout ketika klik "Ya"
if (confirmYesBtn) {
  confirmYesBtn.addEventListener("click", async () => {
    confirmYesBtn.textContent = "Proses...";
    confirmYesBtn.disabled = true;

    try {
      if (supabaseClient) {
        await supabaseClient.auth.signOut();
      }
      sessionStorage.removeItem("loggedInNim");
      window.location.href = "../index.html";
    } catch (err) {
      console.error("Gagal logout:", err);
      confirmYesBtn.textContent = "Ya";
      confirmYesBtn.disabled = false;
    }
  });
}
