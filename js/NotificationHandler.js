/**
 * NotificationHandler.js
 * Mengelola notifikasi status laporan dan klaim mahasiswa secara Realtime.
 */

async function initNotifications() {
  if (typeof supabaseClient === "undefined") {
    console.error("Supabase client is not available for notifications.");
    return;
  }

  const trigger = document.getElementById("notificationTrigger");
  const dropdown = document.getElementById("notificationDropdown");
  const badge = document.getElementById("notificationBadge");

  if (!trigger || !dropdown || !badge) return;

  // --- Ambil NIM User ---
  const {
    data: { session },
  } = await supabaseClient.auth.getSession();
  if (!session) return;

  const { data: mhs } = await supabaseClient
    .from("Mahasiswa")
    .select("NIM")
    .eq("user_id", session.user.id)
    .single();
  if (!mhs) return;
  const userNIM = mhs.NIM;

  // --- Gunakan LocalStorage untuk tracking notifikasi yang sudah dibaca ---
  // (Cara ini jauh lebih aman karena kita mengambil dari 3 tabel yang berbeda)
  const getReadNotifs = () => JSON.parse(localStorage.getItem(`read_notifs_${userNIM}`) || "[]");
  const markAsRead = (id) => {
    const reads = getReadNotifs();
    if (!reads.includes(id)) {
      reads.push(id);
      localStorage.setItem(`read_notifs_${userNIM}`, JSON.stringify(reads));
    }
  };

  // --- Fetch Data Notifikasi dari 3 Tabel Sekaligus ---
  const fetchNotifications = async () => {
    const [resHilang, resTemuan, resKlaim] = await Promise.all([
      supabaseClient
        .from("Laporan_Hilang")
        .select("Id_Laporan, Nama_Barang, status, Catatan_Status, created_at")
        .eq("NIM_Pelapor", userNIM)
        .in("status", ["Laporan Ditolak", "Sedang Dicari", "Selesai"]),

      supabaseClient
        .from("Laporan_Temuan")
        .select("Id_Temuan, Nama_Barang, status, Catatan_Status, created_at")
        .eq("NIM_Penemu", userNIM)
        .in("status", ["Laporan Ditolak", "Tersedia dipos", "Selesai"]),

      supabaseClient
        .from("Klaim_Barang")
        .select("Id_Klaim, status, Catatan_Status, created_at, Laporan_Temuan(Nama_Barang)")
        .eq("NIM_Pengklaim", userNIM)
        .in("status", ["Ditolak", "Selesai"]),
    ]);

    let notifications = [];

    // 1. Data Laporan Hilang
    if (resHilang.data) {
      resHilang.data.forEach((item) => {
        let msg = "";
        let isError = false;
        if (item.status === "Laporan Ditolak") {
          msg = `Laporan Kehilangan <strong>${item.Nama_Barang}</strong> DITOLAK. Alasan: ${item.Catatan_Status || "-"}`;
          isError = true;
        } else if (item.status === "Sedang Dicari") {
          msg = `Laporan Kehilangan <strong>${item.Nama_Barang}</strong> DISETUJUI dan Sedang Dicari.`;
        } else if (item.status === "Selesai") {
          msg = `Laporan Kehilangan <strong>${item.Nama_Barang}</strong> telah Selesai/Ditemukan.`;
        }

        // ID gabungan agar unik per status per laporan
        if (msg)
          notifications.push({
            id: `LH-${item.Id_Laporan}-${item.status}`,
            message: msg,
            created_at: item.created_at,
            isError,
            rawTime: new Date(item.created_at).getTime(),
          });
      });
    }

    // 2. Data Laporan Temuan
    if (resTemuan.data) {
      resTemuan.data.forEach((item) => {
        let msg = "";
        let isError = false;
        if (item.status === "Laporan Ditolak") {
          msg = `Laporan Temuan <strong>${item.Nama_Barang}</strong> DITOLAK. Alasan: ${item.Catatan_Status || "-"}`;
          isError = true;
        } else if (item.status === "Tersedia dipos") {
          msg = `Laporan Temuan <strong>${item.Nama_Barang}</strong> DISETUJUI. Barang Tersedia di Pos Satpam.`;
        } else if (item.status === "Selesai") {
          msg = `Laporan Temuan <strong>${item.Nama_Barang}</strong> telah selesai dikembalikan ke pemilik.`;
        }
        if (msg)
          notifications.push({
            id: `LT-${item.Id_Temuan}-${item.status}`,
            message: msg,
            created_at: item.created_at,
            isError,
            rawTime: new Date(item.created_at).getTime(),
          });
      });
    }

    // 3. Data Klaim Barang
    if (resKlaim.data) {
      resKlaim.data.forEach((item) => {
        let msg = "";
        let isError = false;
        const namaBarang = item.Laporan_Temuan ? item.Laporan_Temuan.Nama_Barang : "sebuah barang";
        if (item.status === "Ditolak") {
          msg = `Pengajuan Klaim <strong>${namaBarang}</strong> DITOLAK. Alasan: ${item.Catatan_Status || "-"}`;
          isError = true;
        } else if (item.status === "Selesai") {
          msg = `Pengajuan Klaim <strong>${namaBarang}</strong> DISETUJUI. Silahkan ambil barang di Pos Satpam.`;
        }
        if (msg)
          notifications.push({
            id: `KB-${item.Id_Klaim}-${item.status}`,
            message: msg,
            created_at: item.created_at,
            isError,
            rawTime: new Date(item.created_at).getTime(),
          });
      });
    }

    // Urutkan dari notifikasi terbaru ke paling lama
    notifications.sort((a, b) => b.rawTime - a.rawTime);

    // Tandai mana yang sudah dibaca
    const readIds = getReadNotifs();
    notifications = notifications.map((n) => ({ ...n, is_read: readIds.includes(n.id) }));

    // Update Lonceng (Badge)
    const unreadCount = notifications.filter((n) => !n.is_read).length;
    badge.textContent = unreadCount;
    badge.style.display = unreadCount > 0 ? "flex" : "none";

    // Render UI
    let content = `
            <div class="notification-header">
                <h3>Notifikasi</h3>
                ${unreadCount > 0 ? '<button id="markAllAsReadBtn">Tandai semua dibaca</button>' : ""}
            </div>
            <div class="notification-list" id="notificationList">
        `;

    if (notifications.length === 0) {
      content += '<div class="notification-empty">Tidak ada notifikasi baru.</div>';
    } else {
      notifications.forEach((n) => {
        // UI: Merah untuk penolakan, Hijau untuk persetujuan
        const iconClass = n.isError ? "fa-circle-xmark" : "fa-circle-check";
        const iconColor = n.isError ? "#ef4444" : "#22c55e";

        content += `
                    <div class="notification-item ${n.is_read ? "read" : ""}" data-id="${n.id}">
                        <div class="notification-icon"><i class="fa-solid ${iconClass}" style="color: ${iconColor};"></i></div>
                        <div class="notification-content">
                            <p class="notification-text">${n.message}</p>
                            <span class="notification-time">${new Date(n.created_at).toLocaleString("id-ID")}</span>
                        </div>
                    </div>
                `;
      });
    }
    content += "</div>";
    dropdown.innerHTML = content;
  };

  // --- Event Listeners UI Notifikasi ---
  trigger.addEventListener("click", (e) => {
    e.stopPropagation();
    dropdown.classList.toggle("open");
  });

  document.addEventListener("click", (e) => {
    if (!dropdown.contains(e.target) && !trigger.contains(e.target)) {
      dropdown.classList.remove("open");
    }
  });

  dropdown.addEventListener("click", (e) => {
    // Jika tombol tandai semua dibaca diklik
    if (e.target.id === "markAllAsReadBtn") {
      const unreadItems = dropdown.querySelectorAll(".notification-item:not(.read)");
      unreadItems.forEach((item) => markAsRead(item.dataset.id));
      fetchNotifications();
    }

    // Jika notifikasi individual diklik
    const item = e.target.closest(".notification-item:not(.read)");
    if (item) {
      markAsRead(item.dataset.id);
      item.classList.add("read");
      const currentCount = parseInt(badge.textContent || "0", 10);
      const newCount = Math.max(0, currentCount - 1);
      badge.textContent = newCount;
      badge.style.display = newCount > 0 ? "flex" : "none";
    }
  });

  // --- Inisialisasi & Realtime Supabase (Pantau 3 Tabel) ---
  await fetchNotifications();

  supabaseClient
    .channel(`notif_channel_${userNIM}`)
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "Laporan_Hilang",
        filter: `NIM_Pelapor=eq.${userNIM}`,
      },
      fetchNotifications
    )
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "Laporan_Temuan",
        filter: `NIM_Penemu=eq.${userNIM}`,
      },
      fetchNotifications
    )
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "Klaim_Barang",
        filter: `NIM_Pengklaim=eq.${userNIM}`,
      },
      fetchNotifications
    )
    .subscribe();
}
