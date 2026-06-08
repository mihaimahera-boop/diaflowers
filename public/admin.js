const productForm = document.getElementById("productForm");
const adminProducts = document.getElementById("adminProducts");
const ordersList = document.getElementById("ordersList");

const lei = (n) => `${Number(n || 0).toLocaleString("ro-RO")} lei`;

let products = [];
let orders = [];

async function loadAdmin() {
  products = await (await fetch("/api/products")).json();
  orders = await (await fetch("/api/orders")).json();

  renderProducts();
  renderOrders();
}

function renderProducts() {
  adminProducts.innerHTML =
    products
      .map(
        (p) => `
        <div class="admin-product">
          ${p.image ? `<img src="${p.image}" alt="${p.name}" class="admin-product-img">` : ""}

          <strong>${p.name}</strong><br>
          ${p.category} · ${lei(p.price)} · Stoc: ${p.stock}

          <br><br>

          <button onclick="editProduct('${p.id}')">✏️ Editează</button>
          <button onclick="deleteProduct('${p.id}')">🗑️ Șterge</button>
        </div>
      `
      )
      .join("") || "<p>Nu există produse.</p>";
}

function renderOrders() {
  ordersList.innerHTML =
    orders
      .map(
        (o) => `
        <div class="order">
          <div class="order-head">
            <strong>${o.customer.name} · ${o.customer.phone}</strong>
            <span class="status">${o.status}</span>
          </div>

          <p><b>Livrare:</b> ${o.delivery.address}, ${o.delivery.date} ${o.delivery.time}</p>
          <p><b>Produse:</b> ${o.items.map((i) => `${i.name} x ${i.qty}`).join(", ")}</p>
          <p><b>Total:</b> ${lei(o.total)}</p>
          <p>${o.notes || ""}</p>

          <select onchange="updateStatus('${o.id}', this.value)">
            <option>Schimbă status</option>
            <option>Nouă</option>
            <option>Confirmată</option>
            <option>În lucru</option>
            <option>Livrată</option>
            <option>Anulată</option>
          </select>
        </div>
      `
      )
      .join("") || "<p>Nu există comenzi încă.</p>";
}

productForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const formData = new FormData(productForm);
  let imageUrl = "";

  const imageFile = formData.get("imageFile");

  if (imageFile && imageFile.size > 0) {
    const uploadData = new FormData();
    uploadData.append("image", imageFile);

    const uploadRes = await fetch("/api/upload", {
      method: "POST",
      body: uploadData,
    });

    const uploadResult = await uploadRes.json();

    if (!uploadRes.ok) {
      alert(uploadResult.error || "Eroare la încărcarea imaginii.");
      return;
    }

    imageUrl = uploadResult.imageUrl;
  }

  const product = {
    name: formData.get("name"),
    category: formData.get("category"),
    price: formData.get("price"),
    stock: formData.get("stock"),
    image: imageUrl,
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

loadAdmin();