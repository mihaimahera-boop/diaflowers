const productForm = document.getElementById("productForm");
const adminProducts = document.getElementById("adminProducts");
const ordersList = document.getElementById("ordersList");
const orderSearch = document.getElementById("orderSearch");

const totalOrders = document.getElementById("totalOrders");
const newOrders = document.getElementById("newOrders");
const totalSales = document.getElementById("totalSales");
const todayOrders = document.getElementById("todayOrders");
const todaySales = document.getElementById("todaySales");

const lei = (n) => `${Number(n || 0).toLocaleString("ro-RO")} lei`;

let products = [];
let orders = [];

async function loadAdmin() {
  products = await (await fetch("/api/products")).json();
  orders = await (await fetch("/api/orders")).json();

  renderStats();
  renderProducts();
  renderOrders();
}

function renderStats() {
  if (!totalOrders || !newOrders || !totalSales) return;

  totalOrders.textContent = orders.length;

  newOrders.textContent = orders.filter((o) => o.status === "Nouă").length;

  const sales = orders
    .filter((o) => o.status !== "Anulată")
    .reduce((sum, o) => sum + Number(o.total || 0), 0);

  totalSales.textContent = lei(sales);

  const today = new Date().toISOString().slice(0, 10);

  const ordersToday = orders.filter((o) =>
    String(o.createdAt || "").slice(0, 10) === today
  );

  if (todayOrders) {
    todayOrders.textContent = ordersToday.length;
  }

  if (todaySales) {
    const salesToday = ordersToday
      .filter((o) => o.status !== "Anulată")
      .reduce((sum, o) => sum + Number(o.total || 0), 0);

    todaySales.textContent = lei(salesToday);
  }
}

function renderProducts() {
  adminProducts.innerHTML =
    products.map((p) => `
      <div class="admin-product">
        ${p.image ? `<img src="${p.image}" alt="${p.name}" class="admin-product-img">` : ""}

        <strong>${p.name}</strong><br>
        ${p.category} · ${lei(p.price)} · Stoc: ${p.stock}

        <br><br>

        <button onclick="editProduct('${p.id}')">✏️ Editează</button>
        <button onclick="deleteProduct('${p.id}')">🗑️ Șterge</button>
      </div>
    `).join("") || "<p>Nu există produse.</p>";
}

function renderOrders() {

  const search = (orderSearch?.value || "").toLowerCase();

  const filteredOrders = orders.filter((o) => {
    return (
      o.customer.name.toLowerCase().includes(search) ||
      o.customer.phone.toLowerCase().includes(search) ||
      o.status.toLowerCase().includes(search)
    );
  });

  ordersList.innerHTML =
    filteredOrders.map((o) => `

productForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const formData = new FormData(productForm);

  let imageUrl = "";
  let images = [];

  const imageFiles = formData
    .getAll("imageFile")
    .filter((file) => file.size > 0);

  if (imageFiles.length > 0) {
    const uploadData = new FormData();

    imageFiles.forEach((file) => {
      uploadData.append("images", file);
    });

    const uploadRes = await fetch("/api/upload-multiple", {
      method: "POST",
      body: uploadData,
    });

    const uploadResult = await uploadRes.json();

    if (!uploadRes.ok) {
      alert(uploadResult.error || "Eroare la încărcarea imaginilor.");
      return;
    }

    images = uploadResult.imageUrls;
    imageUrl = images[0];
  }

  const product = {
    name: formData.get("name"),
    category: formData.get("category"),
    price: formData.get("price"),
    stock: formData.get("stock"),
    image: imageUrl,
    images,
    description: formData.get("description"),
  };

  const res = await fetch("/api/products", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(product),
  });

  if (!res.ok) {
    const err = await res.json();
    alert(err.error || "Nu am putut salva produsul.");
    return;
  }

  productForm.reset();
  loadAdmin();
});

async function editProduct(id) {
  const product = products.find((p) => p.id === id);
  if (!product) return;

  const name = prompt("Nume produs:", product.name);
  if (name === null) return;

  const category = prompt("Categorie:", product.category);
  if (category === null) return;

  const price = prompt("Preț:", product.price);
  if (price === null) return;

  const stock = prompt("Stoc:", product.stock);
  if (stock === null) return;

  const description = prompt("Descriere:", product.description || "");
  if (description === null) return;

  await fetch(`/api/products/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name,
      category,
      price,
      stock,
      description,
      image: product.image,
      images: product.images || [],
    }),
  });

  loadAdmin();
}

async function deleteProduct(id) {
  if (!confirm("Ștergi produsul?")) return;

  await fetch(`/api/products/${id}`, {
    method: "DELETE",
  });

  loadAdmin();
}

async function updateStatus(id, status) {
  if (status === "Schimbă status") return;

  await fetch(`/api/orders/${id}/status`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ status }),
  });

  loadAdmin();
}

function logoutAdmin() {
  localStorage.removeItem("diaflowersAdmin");
  window.location.href = "login.html";
}
orderSearch?.addEventListener("input", () => {
  renderOrders();
});
loadAdmin();