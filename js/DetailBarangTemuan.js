/**
 * DetailBarangTemuan.js
 * Logic khusus halaman Detail Barang Temuan — berdiri sendiri, tidak
 * bergantung ke file lain.
 *
 * Cara kerja saat ini:
 * 1. Baca parameter ?id=LT-00X dari URL.
 * 2. Ambil datanya lewat getItemById() (masih dari SAMPLE_DATA di bawah).
 * 3. Render ke DOM (ikon foto + tabel info).
 *
 * --- UNTUK DIHUBUNGKAN KE SUPABASE ---
 * Nanti isi fungsi getItemById() cukup diganti jadi query Supabase,
 * kira-kira begini (lihat komentar di dalam fungsinya):
 *
 *   const { data, error } = await supabase
 *     .from('barang_temuan')
 *     .select('*')
 *     .eq('id', id)
 *     .single();
 *
 *   return error ? null : data;
 *
 * Kolom yang dipakai fungsi render (renderItem) mengikuti nama field di
 * SAMPLE_DATA: id, nama, icon, lokasi, tanggal, ciri. Kalau nama kolom
 * di tabel Supabase beda, sesuaikan saja pemetaannya di getItemById()
 * sebelum di-return, supaya renderItem() tidak perlu diubah.
 */
(function () {
  // Data sementara — nanti akan digantikan oleh tabel "barang_temuan" di Supabase.
  const SAMPLE_DATA = [
    {
      id: "LT-001",
      nama: "Dompet",
      icon: "fa-wallet",
      lokasi: "Ruangan 5306",
      tanggal: "23/06/2026",
      ciri: "Dompet kulit warna coklat, terdapat KTM atas nama mahasiswa",
    },
    {
      id: "LT-002",
      nama: "SmartWatch",
      icon: "fa-clock",
      lokasi: "Musholla Perpustakaan",
      tanggal: "21/06/2026",
      ciri: "Warna hitam, terdapat retak kecil pada layar",
    },
    {
      id: "LT-003",
      nama: "Kacamata",
      icon: "fa-glasses",
      lokasi: "Depan Gedung Miracle",
      tanggal: "30/06/2026",
      ciri: "Warna hitam, merk CHANEL",
    },
  ];

  /**
   * Ambil satu barang berdasarkan id.
   * Fungsi ini sengaja dibuat `async` walau saat ini datanya lokal,
   * supaya waktu diganti ke Supabase (yang butuh `await`), pemanggilnya
   * (init()) tidak perlu diubah sama sekali.
   */
  async function getItemById(id) {
    // ==== GANTI BLOK DI BAWAH INI DENGAN QUERY SUPABASE ====
    // const { data, error } = await supabase
    //   .from('barang_temuan')
    //   .select('*')
    //   .eq('id', id)
    //   .single();
    // if (error) {
    //   console.error('Gagal mengambil data barang temuan:', error);
    //   return null;
    // }
    // return data;
    // ========================================================

    if (!id) return SAMPLE_DATA[0] || null;
    return SAMPLE_DATA.find((item) => item.id === id) || SAMPLE_DATA[0] || null;
  }

  function renderItem(item) {
    const photoIcon = document.getElementById("photoIcon");
    const valId = document.getElementById("valId");
    const valNama = document.getElementById("valNama");
    const valLokasi = document.getElementById("valLokasi");
    const valTanggal = document.getElementById("valTanggal");
    const valCiri = document.getElementById("valCiri");
    const claimBtn = document.getElementById("claimBtn");

    if (photoIcon)
      photoIcon.className = `fa-solid ${item.icon} placeholder-icon-lg`;
    if (valId) valId.textContent = item.id;
    if (valNama) valNama.textContent = item.nama;
    if (valLokasi) valLokasi.textContent = item.lokasi;
    if (valTanggal) valTanggal.textContent = item.tanggal;
    if (valCiri) valCiri.textContent = item.ciri;

    // Teruskan id barang ke halaman pengajuan klaim.
    if (claimBtn) {
      claimBtn.href = `AjukanKepemilikanBarang.html?id=${encodeURIComponent(item.id)}`;
    }

    document.title = `Detail ${item.nama} - U-Find`;
  }

  function renderNotFound() {
    const container = document.querySelector(".detail-content");
    if (container) {
      container.innerHTML = `
        <div class="empty-state">
          <i class="fa-solid fa-circle-exclamation" aria-hidden="true"></i>
          <p>Data barang tidak ditemukan.</p>
        </div>
      `;
    }
  }

  async function init() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("id");

    const item = await getItemById(id);

    if (!item) {
      renderNotFound();
      return;
    }

    renderItem(item);
  }

  init();
})();
