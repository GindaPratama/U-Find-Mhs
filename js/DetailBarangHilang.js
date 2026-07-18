/**
 * DetailBarangHilang.js
 * Logic khusus halaman Detail Barang Hilang — berdiri sendiri, tidak
 * bergantung ke file lain.
 *
 * --- UNTUK DIHUBUNGKAN KE SUPABASE ---
 * Ganti isi getItemById() jadi query ke tabel "barang_hilang", contoh:
 *
 *   const { data, error } = await supabase
 *     .from('barang_hilang')
 *     .select('*')
 *     .eq('id', id)
 *     .single();
 *
 *   return error ? null : data;
 */
(function () {
  // Data sementara — nanti akan digantikan oleh tabel "barang_hilang" di Supabase.
  const SAMPLE_DATA = [
    {
      id: "LH-001",
      nama: "Handphone",
      icon: "fa-mobile-screen",
      lokasi: "Kantin Fasilkom",
      tanggal: "24/06/2026",
      ciri: "Warna hitam, terdapat retak kecil di pojok layar",
    },
    {
      id: "LH-002",
      nama: "Topi",
      icon: "fa-hat-cowboy",
      lokasi: "Kantin Unikom",
      tanggal: "21/06/2026",
      ciri: "Warna hitam, tulisan BALENCIAGA",
    },
    {
      id: "LH-003",
      nama: "Kunci Motor",
      icon: "fa-key",
      lokasi: "Parkiran Gedung Miracle",
      tanggal: "26/06/2026",
      ciri: "Kunci motor Honda dengan gantungan karet warna merah",
    },
  ];

  async function getItemById(id) {
    // ==== GANTI BLOK DI BAWAH INI DENGAN QUERY SUPABASE ====
    // const { data, error } = await supabase
    //   .from('barang_hilang')
    //   .select('*')
    //   .eq('id', id)
    //   .single();
    // if (error) {
    //   console.error('Gagal mengambil data barang hilang:', error);
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

    if (photoIcon)
      photoIcon.className = `fa-solid ${item.icon} placeholder-icon-lg`;
    if (valId) valId.textContent = item.id;
    if (valNama) valNama.textContent = item.nama;
    if (valLokasi) valLokasi.textContent = item.lokasi;
    if (valTanggal) valTanggal.textContent = item.tanggal;
    if (valCiri) valCiri.textContent = item.ciri;

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
