const productForm = document.getElementById('productForm');
const adminProducts = document.getElementById('adminProducts');
const ordersList = document.getElementById('ordersList');
const lei = n => `${Number(n || 0).toLocaleString('ro-RO')} lei`;
let products = [], orders = [];
async function loadAdmin(){
  products = await (await fetch('/api/products')).json();
  orders = await (await fetch('/api/orders')).json();
  renderProducts(); renderOrders();
}
function renderProducts(){
  adminProducts.innerHTML = products.map(p => `<div class="admin-product"><strong>${p.name}</strong><br>${p.category} · ${lei(p.price)} · Stoc: ${p.stock}<br><button onclick="deleteProduct('${p.id}')">Șterge</button></div>`).join('') || '<p>Nu există produse.</p>';
}
function renderOrders(){
  ordersList.innerHTML = orders.map(o => `<div class="order"><div class="order-head"><strong>${o.customer.name} · ${o.customer.phone}</strong><span class="status">${o.status}</span></div><p><b>Livrare:</b> ${o.delivery.address}, ${o.delivery.date} ${o.delivery.time}</p><p><b>Produse:</b> ${o.items.map(i=>`${i.name} x ${i.qty}`).join(', ')}</p><p><b>Total:</b> ${lei(o.total)}</p><p>${o.notes || ''}</p><select onchange="updateStatus('${o.id}', this.value)"><option>Schimbă status</option><option>Nouă</option><option>Confirmată</option><option>În lucru</option><option>Livrată</option><option>Anulată</option></select></div>`).join('') || '<p>Nu există comenzi încă.</p>';
}
productForm.addEventListener('submit', async e => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(productForm).entries());
  await fetch('/api/products',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
  productForm.reset(); loadAdmin();
});
async function deleteProduct(id){
  if(!confirm('Ștergi produsul?')) return;
  await fetch(`/api/products/${id}`,{method:'DELETE'}); loadAdmin();
}
async function updateStatus(id,status){
  if(status === 'Schimbă status') return;
  await fetch(`/api/orders/${id}/status`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({status})}); loadAdmin();
}
loadAdmin();
