/**
 * NotificationHandler.js
 * Mengelola notifikasi status klaim dari tabel Klaim_Barang.
 */

async function initNotifications() {
    if (typeof supabaseClient === "undefined") {
        console.error("Supabase client is not available for notifications.");
        return;
    }

    const trigger = document.getElementById("notificationTrigger");
    const dropdown = document.getElementById("notificationDropdown");
    const badge = document.getElementById("notificationBadge");

    if (!trigger || !dropdown || !badge) {
        console.warn("Elemen notifikasi tidak ditemukan di halaman ini.");
        return;
    }

    // --- Ambil NIM User ---
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) return;

    const { data: mhs } = await supabaseClient
        .from("Mahasiswa")
        .select("NIM")
        .eq("user_id", session.user.id)
        .single();
    if (!mhs) return;
    const userNIM = mhs.NIM;

    // --- Fungsi untuk membuat pesan notifikasi ---
    function createNotificationMessage(klaim) {
        // REVISI: Handle kasus jika Laporan_Temuan null (misal sudah dihapus)
        const namaBarang = klaim.Laporan_Temuan ? klaim.Laporan_Temuan.Nama_Barang : "sebuah barang";

        if (klaim.status_klaim === "Disetujui") {
            return `Klaim Anda untuk <strong>${namaBarang}</strong> telah disetujui. Silahkan ambil barang di pos satpam.`;
        }
        if (klaim.status_klaim === "Ditolak") {
            // REVISI: Pastikan catatan_status dibaca dengan benar dan berikan fallback yang jelas.
            const alasan = klaim.catatan_status ? klaim.catatan_status.trim() : "Tidak ada alasan yang diberikan.";
            return `Klaim Anda untuk <strong>${namaBarang}</strong> ditolak. Alasan: ${alasan}`;
        }
        return null; // Abaikan status lain seperti 'Menunggu Persetujuan'
    }

    // --- Render UI ---
    const renderNotifications = (klaimList) => {
        const notifications = klaimList
            .map(k => ({ ...k, message: createNotificationMessage(k) }))
            .filter(k => k.message !== null);

        const unreadCount = notifications.filter(n => !n.is_read).length;

        badge.textContent = unreadCount;
        badge.style.display = unreadCount > 0 ? "flex" : "none";

        let content = `
      <div class="notification-header">
        <h3>Notifikasi</h3>
        ${unreadCount > 0 ? '<button id="markAllAsReadBtn">Tandai semua dibaca</button>' : ''}
      </div>
      <div class="notification-list" id="notificationList">
    `;

        if (notifications.length === 0) {
            content += '<div class="notification-empty">Tidak ada notifikasi baru.</div>';
        } else {
            notifications.forEach(n => {
                const iconClass = n.status_klaim === 'Disetujui' ? 'fa-circle-check' : 'fa-circle-xmark';
                content += `
          <div class="notification-item ${n.is_read ? 'read' : ''}" data-id="${n.Id_Klaim}">
            <div class="notification-icon"><i class="fa-solid ${iconClass}"></i></div>
            <div class="notification-content">
              <p class="notification-text">${n.message}</p>
              <span class="notification-time">${new Date(n.created_at).toLocaleString('id-ID')}</span>
            </div>
          </div>
        `;
            });
        }
        content += '</div>';
        dropdown.innerHTML = content;
    };

    // --- Fetch Data ---
    const fetchNotifications = async () => {
        const { data, error } = await supabaseClient
            .from("Klaim_Barang")
            .select("*, Laporan_Temuan(Nama_Barang)")
            .eq("NIM_Pengklaim", userNIM)
            .or("status_klaim.eq.Disetujui,status_klaim.eq.Ditolak") // Gunakan .or() untuk kejelasan
            .order("created_at", { ascending: false });

        if (error) {
            console.error("Gagal mengambil notifikasi klaim:", error);
            return;
        }

        // DEBUG: Tampilkan data mentah di console untuk pengecekan
        console.log("Notifikasi diterima dari Supabase:", data);

        renderNotifications(data || []);
    };

    // --- Event Listeners ---
    trigger.addEventListener("click", (e) => {
        e.stopPropagation();
        dropdown.classList.toggle("open");
    });

    document.addEventListener("click", (e) => {
        if (!dropdown.contains(e.target) && !trigger.contains(e.target)) {
            dropdown.classList.remove("open");
        }
    });

    dropdown.addEventListener("click", async (e) => {
        if (e.target.id === "markAllAsReadBtn") {
            const { error } = await supabaseClient
                .from("Klaim_Barang")
                .update({ is_read: true })
                .eq("NIM_Pengklaim", userNIM)
                .eq("is_read", false);

            if (!error) fetchNotifications();
        }

        const item = e.target.closest(".notification-item:not(.read)");
        if (item) {
            const klaimId = item.dataset.id;
            const { error } = await supabaseClient
                .from("Klaim_Barang")
                .update({ is_read: true })
                .eq("Id_Klaim", klaimId);

            if (!error) {
                item.classList.add("read");
                const currentCount = parseInt(badge.textContent || "0", 10);
                const newCount = Math.max(0, currentCount - 1);
                badge.textContent = newCount;
                badge.style.display = newCount > 0 ? "flex" : "none";
            }
        }
    });

    // --- Inisialisasi & Realtime ---
    await fetchNotifications();

    supabaseClient
        .channel(`klaim_status:${userNIM}`)
        .on(
            "postgres_changes",
            {
                event: "UPDATE",
                schema: "public",
                table: "Klaim_Barang",
                filter: `NIM_Pengklaim=eq.${userNIM}`,
            },
            (payload) => {
                // Hanya refresh jika status berubah menjadi Disetujui atau Ditolak
                if (["Disetujui", "Ditolak"].includes(payload.new.status_klaim)) {
                    fetchNotifications();
                }
            }
        )
        .subscribe();
}