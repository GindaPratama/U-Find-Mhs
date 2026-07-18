/**
 * AjukanKepemilikanBarang.js
 * Kasih feedback visual sederhana di area upload: begitu user memilih
 * foto, teks placeholder berubah jadi nama filenya dan area upload
 * dikasih style "sudah terisi" (border solid + tint biru).
 */
document.addEventListener("DOMContentLoaded", () => {
  const fileInput = document.getElementById("bukti_foto");
  const uploadArea = document.querySelector(".upload-area");
  const placeholder = document.querySelector(".upload-placeholder");

  if (!fileInput || !uploadArea || !placeholder) return;

  const defaultText = placeholder.textContent;

  fileInput.addEventListener("change", () => {
    if (fileInput.files && fileInput.files.length > 0) {
      placeholder.textContent = fileInput.files[0].name;
      uploadArea.classList.add("has-file");
    } else {
      placeholder.textContent = defaultText;
      uploadArea.classList.remove("has-file");
    }
  });
});
