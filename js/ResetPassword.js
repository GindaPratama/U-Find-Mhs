document.addEventListener("DOMContentLoaded", () => {
  const form = document.querySelector("form");
  const emailInput = document.getElementById("email");
  const sendBtn = document.getElementById("sendBtn");
  const actionButtons = document.querySelector(".action-buttons");

  const message = document.createElement("p");
  message.id = "form-message";
  message.style.fontSize = "0.78rem";
  message.style.fontWeight = "600";
  message.style.marginTop = "-8px";
  message.style.marginBottom = "14px";
  message.style.lineHeight = "1.4";
  message.style.display = "none";
  form.insertBefore(message, actionButtons);

  function showMessage(text, isError = true) {
    message.textContent = text;
    message.style.color = isError ? "#d1453b" : "#1c8a4b";
    message.style.display = text ? "block" : "none";
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    showMessage("");

    const email = emailInput.value.trim();

    if (!email) {
      showMessage("Email wajib diisi.");
      return;
    }

    if (!supabaseClient) {
      showMessage("Koneksi ke Supabase belum terkonfigurasi.");
      console.error("Cek SUPABASE_URL & SUPABASE_ANON_KEY di ResetPassword.js");
      return;
    }

    sendBtn.disabled = true;
    const originalLabel = sendBtn.textContent;
    sendBtn.textContent = "Mengirim...";

    try {
      // redirectTo: halaman yang akan dibuka user setelah klik link di email.
      // Supabase akan menambahkan token recovery di URL secara otomatis.
      const redirectTo = new URL("ConfirmPassword.html", window.location.href)
        .href;

      const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
        redirectTo,
      });

      if (error) {
        console.error(error);
        showMessage("Terjadi kesalahan, coba lagi nanti.");
        return;
      }

      // PENTING: Supabase sengaja tidak memberi tahu apakah email terdaftar
      // atau tidak (mencegah orang lain menebak-nebak email pengguna).
      // Jadi pesannya harus generik seperti ini, apapun hasilnya.
      showMessage(
        "Jika email tersebut terdaftar, kami sudah mengirimkan link reset password. Silakan cek email kamu (termasuk folder Spam).",
        false,
      );
      form.reset();
    } catch (err) {
      console.error(err);
      showMessage("Terjadi kesalahan, coba lagi nanti.");
    } finally {
      sendBtn.disabled = false;
      sendBtn.textContent = originalLabel;
    }
  });
});
