// J&I Outdoor Living Social AutoGallery

document.addEventListener("DOMContentLoaded", () => {
  const grid = document.getElementById("mdm-gallery-grid");
  const status = document.getElementById("mdm-gallery-status");
  const filters = document.querySelectorAll(".mdm-filter");

  if (!grid || !status) return;

  let requestId = 0;

  function setStatus(english, spanish) {
    status.dataset.en = english;
    status.dataset.es = spanish;
    status.textContent = document.documentElement.lang === "es" ? spanish : english;
  }

  async function loadGallery(category = "all") {
    const currentRequest = ++requestId;

    grid.replaceChildren();
    setStatus("Loading our latest projects...", "Cargando nuestros \u00faltimos proyectos...");

    const params = new URLSearchParams({ limit: "30" });
    if (category !== "all") params.set("category", category);

    try {
      const response = await fetch(`/.netlify/functions/mdm-gallery?${params.toString()}`);
      if (!response.ok) throw new Error(`Gallery returned ${response.status}`);

      const data = await response.json();
      if (currentRequest !== requestId) return;
      if (!data || !Array.isArray(data.items)) {
        throw new Error("Invalid gallery response format");
      }

      setStatus("", "");

      data.items.forEach(item => {
        if (!item || typeof item.imageUrl !== "string" || !item.imageUrl.trim()) {
          console.warn("Skipping gallery item without a valid image URL.");
          return;
        }

        let imageUrl;
        try {
          imageUrl = new URL(item.imageUrl, window.location.origin);
          if (!["https:", "http:"].includes(imageUrl.protocol)) {
            throw new Error("Unsupported gallery image protocol");
          }
        } catch (error) {
          console.warn("Skipping gallery item with an invalid image URL.", error);
          return;
        }

        const card = document.createElement("article");
        card.className = "mdm-gallery-card";

        const img = document.createElement("img");
        img.src = imageUrl.href;
        img.alt = item.altText || item.caption || "Outdoor living project";
        img.loading = "lazy";

        const caption = document.createElement("p");
        caption.className = "mdm-gallery-caption";
        if (item.caption) {
          caption.textContent = item.caption;
        } else {
          caption.dataset.en = "J&I Outdoor Living Project";
          caption.dataset.es = "Proyecto de J&I Outdoor Living";
          caption.textContent = document.documentElement.lang === "es"
            ? caption.dataset.es
            : caption.dataset.en;
        }

        card.append(img, caption);
        grid.appendChild(card);
      });

      if (!grid.children.length) {
        setStatus("New project photos coming soon.", "Pronto habr\u00e1 nuevas fotos de proyectos.");
      }
    } catch (error) {
      if (currentRequest !== requestId) return;
      console.error("Social gallery request failed:", error);
      setStatus(
        "Our social gallery is temporarily unavailable.",
        "Nuestra galer\u00eda social no est\u00e1 disponible temporalmente."
      );
    }
  }

  filters.forEach(button => {
    button.addEventListener("click", () => {
      filters.forEach(filter => {
        const selected = filter === button;
        filter.classList.toggle("active", selected);
        filter.setAttribute("aria-pressed", String(selected));
      });
      loadGallery(button.dataset.category || "all");
    });
  });

  loadGallery();
});
