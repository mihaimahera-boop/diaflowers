const productsGrid = document.getElementById("productsGrid");
const cartBtn = document.getElementById("cartBtn");
const cartDrawer = document.getElementById("cartDrawer");
const closeCart = document.getElementById("closeCart");
const cartItems = document.getElementById("cartItems");
const cartTotal = document.getElementById("cartTotal");
const cartCount = document.getElementById("cartCount");
const searchInput = document.getElementById("searchInput");
const checkoutForm = document.getElementById("checkoutForm");
const orderMessage = document.getElementById("orderMessage");
const promoCodeInput = document.getElementById("promoCode");
const promoMessage = document.getElementById("promoMessage");
const sortProducts = document.getElementById("sortProducts");
const openCheckoutBtn = document.getElementById("openCheckoutBtn");
const checkoutModal = document.getElementById("checkoutModal");
const closeCheckoutBtn = document.getElementById("closeCheckoutBtn");
const cartCheckoutBtn = document.getElementById("cartCheckoutBtn");
const favoritesFilterBtn = document.getElementById("favoritesFilterBtn");

const WHATSAPP_PHONE = "40764699342";

let products = [];
let cart = JSON.parse(localStorage.getItem("flowerCart") || "[]");
let favorites = JSON.parse(localStorage.getItem("flowerFavorites") || "[]");
let currentCategory = "toate";
let showOnlyFavorites = false;
let currentSort = "default";
let appliedPromo = null;

const lei = (n) => `${Number(n || 0).toLocaleString("ro-RO")} lei`;
function calculatePromoDiscount(subtotal) {
  const code = (promoCodeInput?.value || "").trim().toUpperCase();

  if (!code) {
    appliedPromo = null;
    if (promoMessage) promoMessage.textContent = "";
    return 0;
  }

  if (code === "DIA10") {
    appliedPromo = { code, discount: Math.round(subtotal * 0.1) };
    if (promoMessage) promoMessage.textContent = "Cod aplicat: 10% reducere.";
    return appliedPromo.discount;
  }

  if (code === "FLORI50") {
    if (subtotal < 300) {
      appliedPromo = null;
      if (promoMessage)
        promoMessage.textContent =
          "FLORI50 se aplică la comenzi peste 300 lei.";
      return 0;
    }

    appliedPromo = { code, discount: 50 };
    if (promoMessage)
      promoMessage.textContent = "Cod aplicat: 50 lei reducere.";
    return 50;
  }

  appliedPromo = null;
  if (promoMessage) promoMessage.textContent = "Cod promoțional invalid.";
  return 0;
}
const saveCart = () => localStorage.setItem("flowerCart", JSON.stringify(cart));

async function loadProducts() {
  const res = await fetch("/api/products");
  products = await res.json();

  renderProducts();
  renderCart();
}

function renderProducts() {
  const q = (searchInput.value || "").toLowerCase();

  let filtered = products.filter((p) => {
    const matchesSearch = [p.name, p.category, p.description]
      .join(" ")
      .toLowerCase()
      .includes(q);

    const matchesCategory =
      currentCategory === "toate" || p.category === currentCategory;

    const matchesFavorites = !showOnlyFavorites || favorites.includes(p.id);

    return matchesSearch && matchesCategory && matchesFavorites;
  });
  if (currentSort === "bestseller") {
    filtered.sort(
      (a, b) => Number(b.bestseller || false) - Number(a.bestseller || false),
    );
  }

  if (currentSort === "priceAsc") {
    filtered.sort((a, b) => Number(a.price) - Number(b.price));
  }

  if (currentSort === "priceDesc") {
    filtered.sort((a, b) => Number(b.price) - Number(a.price));
  }

  if (currentSort === "nameAsc") {
    filtered.sort((a, b) => a.name.localeCompare(b.name));
  }

  if (currentSort === "nameDesc") {
    filtered.sort((a, b) => b.name.localeCompare(a.name));
  }

  productsGrid.innerHTML = filtered
    .map(
      (p) => `
      <article class="product-card">
      <div
  class="favorite-btn"
  onclick="event.stopPropagation(); toggleFavorite('${p.id}')"
>
  ${favorites.includes(p.id) ? "❤️" : "🤍"}
</div>
      ${
        p.bestseller
          ? `
<div class="bestseller-badge">
🔥 Bestseller
</div>
`
          : ""
      }
        <img
          src="${p.image || p.images?.[0] || "https://images.unsplash.com/photo-1490750967868-88aa4486c946?auto=format&fit=crop&w=900&q=80"}"
          alt="${p.name}"
          onclick="openGallery('${p.id}')"
        />

        ${
          p.images && p.images.length > 1
            ? `<div class="gallery-badge">📸 ${p.images.length} poze</div>`
            : ""
        }

        <div class="product-body">
          <span class="category">${p.category}</span>
          <h3>
${p.bestseller ? "🔥 " : ""}
${p.name}
</h3>
          <p>${p.description || ""}</p>

          <div class="price-row">
            <div class="stock-info">
  ${
    Number(p.stock || 0) <= 0
      ? '<span class="out-of-stock">Stoc epuizat</span>'
      : Number(p.stock || 0) <= 3
        ? `<span class="low-stock">Ultimele ${p.stock} bucăți</span>`
        : `<span class="in-stock">În stoc: ${p.stock}</span>`
  }
</div>

<span class="price">${lei(p.price)}</span>

<button
  class="add-btn"
  ${Number(p.stock || 0) <= 0 ? "disabled" : ""}
  onclick="addToCart('${p.id}')"
>
  ${Number(p.stock || 0) <= 0 ? "Indisponibil" : "Adaugă"}
</button>

          </div>
          <button
  class="similar-btn"
  onclick="event.stopPropagation(); showSimilarProducts('${p.id}')"
>
  Vezi produse similare
</button>
        </div>
      </article>
    `,
    )
    .join("");
}
function showSimilarProducts(productId) {
  const product = products.find((p) => p.id === productId);
  if (!product) return;

  const similar = products
    .filter((p) => p.id !== productId && p.category === product.category)
    .slice(0, 4);

  if (similar.length === 0) {
    alert("Nu există produse similare momentan.");
    return;
  }

  const modal = document.createElement("div");
  modal.className = "similar-modal";
  modal.innerHTML = `
    <div class="similar-modal-content">
      <button class="similar-close" onclick="closeSimilarModal()">×</button>

      <h2>Produse similare cu ${product.name}</h2>

      <div class="similar-products-grid">
        ${similar
          .map(
            (p) => `
            <article class="product-card similar-card">
              <div
                class="favorite-btn"
                onclick="event.stopPropagation(); toggleFavorite('${p.id}')"
              >
                ${favorites.includes(p.id) ? "❤️" : "🤍"}
              </div>

              <img
                src="${p.image || p.images?.[0] || "https://images.unsplash.com/photo-1490750967868-88aa4486c946?auto=format&fit=crop&w=900&q=80"}"
                alt="${p.name}"
                onclick="openGallery('${p.id}')"
              />

              <div class="product-body">
                <span class="category">${p.category}</span>
                <h3>${p.name}</h3>
                <p>${p.description || ""}</p>

                <div class="price-row">
                  <span class="price">${lei(p.price)}</span>

                  <button
                    class="add-btn"
                    ${Number(p.stock || 0) <= 0 ? "disabled" : ""}
                    onclick="addToCart('${p.id}')"
                  >
                    ${Number(p.stock || 0) <= 0 ? "Indisponibil" : "Adaugă"}
                  </button>
                  <button
  class="similar-btn"
  onclick="event.stopPropagation(); showSimilarProducts('${p.id}')"
>
  Produse similare
</button>
                </div>
              </div>
            </article>
          `,
          )
          .join("")}
      </div>
    </div>
  `;

  document.body.appendChild(modal);
}
function closeSimilarModal() {
  const modal = document.querySelector(".similar-modal");
  if (modal) modal.remove();
}

function addToCart(id) {
  const item = cart.find((i) => i.id === id);

  if (item) {
    item.qty += 1;
  } else {
    cart.push({ id, qty: 1 });
  }

  saveCart();
  renderCart();
  cartDrawer.classList.remove("hidden");
}
function saveFavorites() {
  localStorage.setItem("flowerFavorites", JSON.stringify(favorites));
}

function toggleFavorite(id) {
  favorites = [...new Set(favorites)];

  if (favorites.includes(id)) {
    favorites = favorites.filter((x) => x !== id);
  } else {
    favorites.push(id);
  }

  saveFavorites();
  renderProducts();
}

function changeQty(id, delta) {
  const item = cart.find((i) => i.id === id);

  if (!item) return;

  item.qty += delta;

  if (item.qty <= 0) {
    cart = cart.filter((i) => i.id !== id);
  }

  saveCart();
  renderCart();
}
function removeFromCart(id) {
  cart = cart.filter((i) => i.id !== id);

  saveCart();
  renderCart();
}

function getCartRows() {
  return cart
    .map((item) => ({
      ...item,
      product: products.find((p) => p.id === item.id),
    }))
    .filter((x) => x.product);
}

function renderCart() {
  const rows = getCartRows();

  cartItems.innerHTML = rows.length
    ? rows
        .map(
          (x) => `
          <div class="cart-item">
            <div>
              <strong>${x.product.name}</strong><br>
              ${lei(x.product.price)} x ${x.qty}
            </div>

            <div class="qty-actions">
  <button onclick="changeQty('${x.id}', -1)">-</button>
  <span>${x.qty}</span>
  <button onclick="changeQty('${x.id}', 1)">+</button>
</div>

<button
  class="remove-cart-btn"
  onclick="removeFromCart('${x.id}')"
>
  🗑 Elimină
</button>
          </div>
        `,
        )
        .join("")
    : "<p>Coșul este gol.</p>";

  const subtotal = rows.reduce((s, x) => s + x.product.price * x.qty, 0);

  const discount = calculatePromoDiscount(subtotal);

  const transport = subtotal >= 250 ? 0 : 25;

  const total = Math.max(0, subtotal + transport - discount);

  const count = rows.reduce((s, x) => s + x.qty, 0);

  const progress = Math.min(100, Math.round((subtotal / 250) * 100));

  cartTotal.innerHTML = `
<div class="free-shipping-progress">

  <div class="progress-bar">
    <div
      class="progress-fill"
      style="width:${progress}%"
    ></div>
  </div>

  ${
    subtotal >= 250
      ? `
        <div class="free-shipping-success">
          🎉 Ai obținut livrare gratuită!
        </div>
      `
      : `
        <div class="free-shipping-text">
          Mai adaugă produse de
          <strong>${lei(250 - subtotal)}</strong>
          pentru livrare gratuită 🚚
        </div>
      `
  }

</div>

<br>

Produse: ${lei(subtotal)}<br>
Reducere: ${discount > 0 ? `-${lei(discount)}` : "0 lei"}<br>
Transport: ${transport === 0 ? "GRATUIT" : lei(transport)}<br>
<strong>Total: ${lei(total)}</strong>
`;
  cartCount.textContent = count;
  const missing = 250 - subtotal;

  if (subtotal > 0 && subtotal < 250) {
    cartTotal.innerHTML += `
    <div style="margin-top:10px;color:#e11d72;font-weight:700;">
      Mai adaugă produse de ${lei(missing)}
      pentru livrare gratuită 🚚
    </div>
  `;
  }
}

function buildWhatsAppMessage(order, rows) {
  const produse = rows
    .map(
      (x) => `- ${x.product.name} x ${x.qty} = ${lei(x.product.price * x.qty)}`,
    )
    .join("\n");

  return `
Bună ziua! Doresc să plasez o comandă Dia Flowers.

Comanda: ${order.id}

Produse:
${produse}

Total: ${lei(order.total)}

Date client:
Nume: ${order.customer.name}
Telefon: ${order.customer.phone}
Email: ${order.customer.email || "-"}

Livrare:
Adresă: ${order.delivery.address}

Observații:
${order.notes || "-"}
`.trim();
}

function openWhatsApp(message) {
  const encodedMessage = encodeURIComponent(message);
  const url = `https://web.whatsapp.com/send?phone=${WHATSAPP_PHONE}&text=${encodedMessage}`;
  window.location.href = url;
}

function openCheckoutModal() {
  if (!cart.length) {
    alert("Adaugă un produs în coș înainte de finalizarea comenzii.");
    return;
  }

  checkoutModal.classList.remove("hidden");
}

checkoutForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  if (!cart.length) {
    alert("Coșul este gol.");
    return;
  }

  const rows = getCartRows();
  const form = new FormData(checkoutForm);

  const payload = {
    customer: {
      name: form.get("name"),
      phone: form.get("phone"),
      email: form.get("email"),
    },
    delivery: {
      address: form.get("address"),
    },
    payment: {
      method: form.get("paymentMethod") || "cash",
    },

    promo: appliedPromo,

    notes: form.get("message"),
    items: cart,
  };

  const res = await fetch("/api/orders", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json();

  if (!res.ok) {
    const errorText = data.error || "Eroare la trimiterea comenzii.";

    orderMessage.textContent = errorText;
    orderMessage.style.color = "#dc2626";

    alert(errorText);

    return;
  }

  cart = [];
  saveCart();
  renderCart();
  checkoutForm.reset();

  checkoutModal.classList.add("hidden");
  cartDrawer.classList.add("hidden");

  orderMessage.textContent = `Comanda ${data.id} a fost înregistrată. Te vom contacta telefonic pentru confirmarea livrării. Dacă ai introdus adresa de email, vei primi și confirmarea pe email.`;

  // openWhatsApp(buildWhatsAppMessage(data, rows));
});

cartBtn.onclick = () => cartDrawer.classList.remove("hidden");
closeCart.onclick = () => cartDrawer.classList.add("hidden");

searchInput.oninput = renderProducts;

document.querySelectorAll(".category-btn[data-category]").forEach((btn) => {
  btn.addEventListener("click", () => {
    document
      .querySelectorAll(".category-btn[data-category]")
      .forEach((b) => b.classList.remove("active"));

    btn.classList.add("active");

    currentCategory = btn.dataset.category;
    showOnlyFavorites = false;

    favoritesFilterBtn?.classList.remove("active");

    renderProducts();
  });
});

function openGallery(id) {
  const product = products.find((p) => p.id === id);

  if (!product) return;

  const images = product.images?.length ? product.images : [product.image];

  const currentImage = images[0];

  const stockText =
    Number(product.stock || 0) <= 0
      ? "Stoc epuizat"
      : `În stoc: ${product.stock}`;

  const galleryHtml = `
    <div class="gallery-modal" onclick="closeGallery()">

      <div class="gallery-box product-popup" onclick="event.stopPropagation()">

        <button class="gallery-close" onclick="closeGallery()">
          ×
        </button>

        <div class="product-popup-grid">

          <div>

            <img
              id="mainGalleryImage"
              class="gallery-main-image"
              src="${currentImage}"
              alt="${product.name}"
            >

            <div class="gallery-thumbs">
              ${images
                .filter(Boolean)
                .map(
                  (img) => `
                    <img
                      src="${img}"
                      class="gallery-thumb"
                      onclick="changeGalleryImage('${img}')"
                    >
                  `,
                )
                .join("")}
            </div>

          </div>

          <div class="product-popup-info">

            <span class="category">
              ${product.category}
            </span>

            <h2>${product.name}</h2>

            <p>
              ${product.description || "Buchet premium realizat cu flori proaspete."}
            </p>

            <div class="popup-price">
              ${lei(product.price)}
            </div>

            <div class="popup-stock">
              ${stockText}
            </div>

            <button
              class="popup-add-btn"
              ${Number(product.stock || 0) <= 0 ? "disabled" : ""}
              onclick="addToCart('${product.id}'); closeGallery();"
            >
              ${
                Number(product.stock || 0) <= 0
                  ? "Indisponibil"
                  : "💐 Adaugă în coș"
              }
            </button>

          </div>

        </div>

      </div>

    </div>
  `;

  document.body.insertAdjacentHTML("beforeend", galleryHtml);
}

function closeGallery() {
  const modal = document.querySelector(".gallery-modal");
  if (modal) modal.remove();
}

function changeGalleryImage(src) {
  const img = document.getElementById("mainGalleryImage");

  if (img) {
    img.src = src;
  }
}

openCheckoutBtn?.addEventListener("click", openCheckoutModal);
cartCheckoutBtn?.addEventListener("click", openCheckoutModal);

closeCheckoutBtn?.addEventListener("click", () => {
  checkoutModal.classList.add("hidden");
});
promoCodeInput?.addEventListener("input", () => {
  renderCart();
});
favoritesFilterBtn?.addEventListener("click", () => {
  showOnlyFavorites = !showOnlyFavorites;

  document
    .querySelectorAll(".category-btn[data-category]")
    .forEach((b) => b.classList.remove("active"));

  if (showOnlyFavorites) {
    currentCategory = "toate";
  }

  favoritesFilterBtn.classList.toggle("active", showOnlyFavorites);

  renderProducts();
});
sortProducts?.addEventListener("change", () => {
  currentSort = sortProducts.value;
  renderProducts();
});


loadProducts();
document.addEventListener("DOMContentLoaded", () => {
  const searchToggle = document.getElementById("searchToggle");
  const headerSearch = document.getElementById("headerSearch");
  const searchInput = document.getElementById("searchInput");

  if (searchToggle && headerSearch) {
    searchToggle.addEventListener("click", () => {
      headerSearch.classList.toggle("active");

      if (headerSearch.classList.contains("active")) {
        headerSearch.focus();
      }
    });
  }

  if (headerSearch && searchInput) {
    headerSearch.addEventListener("input", () => {
      searchInput.value = headerSearch.value;
      renderProducts();
      const mobileMenuBtn = document.getElementById("mobileMenuBtn");
const mainMenu = document.getElementById("mainMenu");

if (mobileMenuBtn && mainMenu) {
  mobileMenuBtn.addEventListener("click", () => {
    mainMenu.classList.toggle("open");
  });
}
    });
  }
});
document.addEventListener("DOMContentLoaded", () => {
  const mobileMenuBtn = document.getElementById("mobileMenuBtn");
  const mainMenu = document.getElementById("mainMenu");

  if (mobileMenuBtn && mainMenu) {
    mobileMenuBtn.addEventListener("click", () => {
      mainMenu.classList.toggle("open");
    });
  }
});
const openChat = document.getElementById("openChat");
const closeChat = document.getElementById("closeChat");
const chatWidget = document.getElementById("chatWidget");
const chatMessageInput = document.getElementById("chatMessageInput");
const sendChatMessage = document.getElementById("sendChatMessage");

openChat?.addEventListener("click", () => {
  chatWidget.classList.add("open");
});

closeChat?.addEventListener("click", () => {
  chatWidget.classList.remove("open");
});

sendChatMessage?.addEventListener("click", () => {
  const message = chatMessageInput.value.trim();
  if (!message) return;

  const url = `https://wa.me/40764699342?text=${encodeURIComponent(message)}`;
  window.open(url, "_blank");
});
function acceptCookies() {
  localStorage.setItem(
    "diaflowersCookies",
    "accepted"
  );

  document.getElementById(
    "cookieBanner"
  ).style.display = "none";
}

window.addEventListener("load", () => {

  const accepted =
    localStorage.getItem(
      "diaflowersCookies"
    );

  if (accepted === "accepted") {

    const banner =
      document.getElementById(
        "cookieBanner"
      );

    if (banner) {
      banner.style.display = "none";
    }
  }
});