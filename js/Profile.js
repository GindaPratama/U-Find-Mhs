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
    if (!profileDropdown.contains(e.target) && !profileTrigger.contains(e.target)) {
      profileDropdown.classList.remove("open");
      profileTrigger.classList.remove("open");
    }
  });
}

// Inisialisasi Notifikasi
if (typeof initNotifications === "function") {
  initNotifications();
}

// ==========================================
// FUNGSI PEMOTONG NAMA (MAKS 2 KATA)
// ==========================================
function getTwoWords(fullName) {
  if (!fullName) return "Pengguna";
  return fullName.trim().split(/\s+/).slice(0, 2).join(" ");
}

// ==========================================
// 2. FETCH & TAMPILKAN DATA
// ==========================================
document.addEventListener("DOMContentLoaded", async () => {
  const navUsername = document.getElementById("navUsername");
  const profileNamaTop = document.getElementById("profileNamaTop");
  const inputNama = document.getElementById("inputNama");

  if (!supabaseClient) {
    if (profileNamaTop) profileNamaTop.textContent = "Gagal memuat";
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
    if (profileNamaTop) profileNamaTop.textContent = "Data tidak ditemukan";
    return;
  }

  // Set Header Nama (2 Kata)
  if (navUsername) navUsername.textContent = getTwoWords(mhsData.Nama_Lengkap);

  // Set Info Profile
  if (profileNamaTop) profileNamaTop.textContent = mhsData.Nama_Lengkap;
  if (inputNama) inputNama.value = mhsData.Nama_Lengkap;

  const setText = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.textContent = value || "-";
  };

  setText("profileNim", mhsData.NIM);
  setText("profileNoHp", mhsData.No_Hp);
  setText("profileEmail", mhsData.Email);

  // ==========================================
  // 3. LOGIKA EDIT NAMA
  // ==========================================
  const btnEditNama = document.getElementById("btnEditNama");
  const actionEditGroup = document.getElementById("actionEditGroup");
  const btnBatalEdit = document.getElementById("btnBatalEdit");
  const btnSimpanEdit = document.getElementById("btnSimpanEdit");
  const successUpdateModal = document.getElementById("successUpdateModal");

  // Masuk Mode Edit
  btnEditNama?.addEventListener("click", () => {
    inputNama.disabled = false;
    inputNama.focus();
    // Taruh kursor di akhir teks
    const val = inputNama.value;
    inputNama.value = "";
    inputNama.value = val;

    btnEditNama.classList.add("hidden");
    actionEditGroup.classList.remove("hidden");
  });

  // Batal Edit
  btnBatalEdit?.addEventListener("click", () => {
    inputNama.value = mhsData.Nama_Lengkap; // Kembalikan ke nama asli
    inputNama.disabled = true;
    btnEditNama.classList.remove("hidden");
    actionEditGroup.classList.add("hidden");
  });

  // Simpan Edit
  btnSimpanEdit?.addEventListener("click", async () => {
    const newName = inputNama.value.trim();
    if (!newName) {
      alert("Nama tidak boleh kosong!");
      return;
    }

    btnSimpanEdit.textContent = "Menyimpan...";
    btnSimpanEdit.disabled = true;

    // Update ke Database
    const { error: updateErr } = await supabaseClient
      .from("Mahasiswa")
      .update({ Nama_Lengkap: newName })
      .eq("NIM", mhsData.NIM);

    if (updateErr) {
      alert("Gagal memperbarui nama: " + updateErr.message);
    } else {
      // Update UI
      mhsData.Nama_Lengkap = newName;
      navUsername.textContent = getTwoWords(newName);
      profileNamaTop.textContent = newName;

      // Tutup Mode Edit
      inputNama.disabled = true;
      btnEditNama.classList.remove("hidden");
      actionEditGroup.classList.add("hidden");

      // Tampilkan Pop-Up Berhasil
      successUpdateModal.classList.add("open");
    }

    btnSimpanEdit.textContent = "Simpan";
    btnSimpanEdit.disabled = false;
  });

  // Tutup Modal Sukses
  document.getElementById("successOkBtn")?.addEventListener("click", () => {
    successUpdateModal.classList.remove("open");
  });
});

// ==========================================
// 4. LOGIKA MODAL LOGOUT
// ==========================================
const logoutButtons = document.querySelectorAll("#navBtnKeluar, #btnKeluarUtama");
const confirmLogoutModal = document.getElementById("confirmLogoutModal");
const confirmYesBtn = document.getElementById("confirmYesBtn");
const confirmNoBtn = document.getElementById("confirmNoBtn");

logoutButtons.forEach((btn) => {
  btn.addEventListener("click", (e) => {
    e.preventDefault();
    if (confirmLogoutModal) confirmLogoutModal.classList.add("open");
  });
});

if (confirmNoBtn) {
  confirmNoBtn.addEventListener("click", () => {
    confirmLogoutModal.classList.remove("open");
  });
}

if (confirmYesBtn) {
  confirmYesBtn.addEventListener("click", async () => {
    confirmYesBtn.textContent = "Proses...";
    confirmYesBtn.disabled = true;
    try {
      if (supabaseClient) await supabaseClient.auth.signOut();
      sessionStorage.removeItem("loggedInNim");
      window.location.href = "../index.html";
    } catch (err) {
      console.error("Gagal logout:", err);
      confirmYesBtn.textContent = "Ya";
      confirmYesBtn.disabled = false;
    }
  });
}
