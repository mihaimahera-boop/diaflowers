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

const WHATSAPP_PHONE = "40764699342"; // pune aici numărul Dia Flowers, ex: 40721234567

let products = [];
let cart = JSON.parse(localStorage.getItem("flowerCart") || "[]");
let currentCategory = "toate";

const lei = (n) => `${Number(n || 0).toLocaleString("ro-RO")} lei`;
const saveCart = () => localStorage.setItem("flowerCart", JSON.stringify(cart));

async function loadProducts() {
  const res = await fetch("/api/products");
  products = await res.json();

  renderProducts();
  renderCart();
}

function renderProducts() {
  const q = (searchInput.value || "").toLowerCase();

  const filtered = products.filter((p) => {
  const matchesSearch = [p.name, p.category, p.description]
    .join(" ")
    .toLowerCase()
    .includes(q);

  const matchesCategory =
    currentCategory === "toate" ||
    p.category === currentCategory;

  return matchesSearch && matchesCategory;
});

  productsGrid.innerHTML = filtered
    .map(
      (p) => `
      <article class="product-card">
        <img
  src="${p.image || p.images?.[0] || "https://images.unsplash.com/photo-1490750967868-88aa4486c946?auto=format&fit=crop&w=900&q=80"}"
  alt="${p.name}"
  onclick="openGallery('${p.id}')"
/>
${p.images && p.images.length > 1
  ? `<div class="gallery-badge">📸 ${p.images.length} poze</div>`
  : ""}
        <div class="product-body">
          <span class="category">${p.category}</span>
          <h3>${p.name}</h3>
          <p>${p.description || ""}</p>
          <div class="price-row">
            <span class="price">${lei(p.price)}</span>
            <button class="add-btn" onclick="addToCart('${p.id}')">Adaugă</button>
          </div>
        </div>
      </article>
    `
    )
    .join("");
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
          </div>
        `
        )
        .join("")
    : "<p>Coșul este gol.</p>";

  const total = rows.reduce((s, x) => s + x.product.price * x.qty, 0);
  const count = rows.reduce((s, x) => s + x.qty, 0);

  cartTotal.textContent = lei(total);
  cartCount.textContent = count;
}

function buildWhatsAppMessage(order, rows) {
  const produse = rows
    .map(
      (x) =>
        `- ${x.product.name} x ${x.qty} = ${lei(x.product.price * x.qty)}`
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
Data: ${order.delivery.date}
Ora: ${order.delivery.time}

Observații:
${order.notes || "-"}
`.trim();
}

function openWhatsApp(message) {
  const encodedMessage = encodeURIComponent(message);
  const url = `https://web.whatsapp.com/send?phone=${WHATSAPP_PHONE}&text=${encodedMessage}`;
  window.location.href = url;
}

checkoutForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  if (!cart.length) {
    orderMessage.textContent = "Coșul este gol.";
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
      date: form.get("date"),
      time: form.get("time"),
    },
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
    orderMessage.textContent = data.error || "Eroare la trimiterea comenzii.";
    return;
  }

  const whatsappMessage = buildWhatsAppMessage(data, rows);

  cart = [];
  saveCart();
  renderCart();
  checkoutForm.reset();

  orderMessage.textContent = `Comanda ${data.id} a fost trimisă. Total: ${lei(data.total)}. Se deschide WhatsApp pentru confirmare.`;

  openWhatsApp(whatsappMessage);
});

cartBtn.onclick = () => cartDrawer.classList.remove("hidden");
closeCart.onclick = () => cartDrawer.classList.add("hidden");
searchInput.oninput = renderProducts;
document.querySelectorAll(".category-btn").forEach((btn) => {
  btn.addEventListener("click", () => {

    document
      .querySelectorAll(".category-btn")
      .forEach((b) => b.classList.remove("active"));

    btn.classList.add("active");

    currentCategory = btn.dataset.category;

    renderProducts();
  });
});
function openGallery(id) {
  const product = products.find((p) => p.id === id);
  if (!product) return;

  const images = product.images?.length ? product.images : [product.image];

  const galleryHtml = `
    <div class="gallery-modal" onclick="closeGallery()">
      <div class="gallery-box" onclick="event.stopPropagation()">
        <button class="gallery-close" onclick="closeGallery()">×</button>
        <h2>${product.name}</h2>

        <div class="gallery-grid">
          ${images
            .filter(Boolean)
            .map((img) => `<img src="${img}" alt="${product.name}">`)
            .join("")}
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
loadProducts();