const productsGrid = document.getElementById('productsGrid');
const cartBtn = document.getElementById('cartBtn');
const cartDrawer = document.getElementById('cartDrawer');
const closeCart = document.getElementById('closeCart');
const cartItems = document.getElementById('cartItems');
const cartTotal = document.getElementById('cartTotal');
const cartCount = document.getElementById('cartCount');
const searchInput = document.getElementById('searchInput');
const checkoutForm = document.getElementById('checkoutForm');
const orderMessage = document.getElementById('orderMessage');
let products = [];
let cart = JSON.parse(localStorage.getItem('flowerCart') || '[]');

const lei = n => `${Number(n || 0).toLocaleString('ro-RO')} lei`;
const saveCart = () => localStorage.setItem('flowerCart', JSON.stringify(cart));

async function loadProducts(){
  const res = await fetch('/api/products');
  products = await res.json();
  renderProducts();
  renderCart();
}
function renderProducts(){
  const q = (searchInput.value || '').toLowerCase();
  const filtered = products.filter(p => [p.name,p.category,p.description].join(' ').toLowerCase().includes(q));
  productsGrid.innerHTML = filtered.map(p => `
    <article class="product-card">
      <img src="${p.image || 'https://images.unsplash.com/photo-1490750967868-88aa4486c946?auto=format&fit=crop&w=900&q=80'}" alt="${p.name}">
      <div class="product-body">
        <span class="category">${p.category}</span>
        <h3>${p.name}</h3>
        <p>${p.description || ''}</p>
        <div class="price-row"><span class="price">${lei(p.price)}</span><button class="add-btn" onclick="addToCart('${p.id}')">Adaugă</button></div>
      </div>
    </article>`).join('');
}
function addToCart(id){
  const item = cart.find(i => i.id === id);
  if(item) item.qty += 1; else cart.push({id, qty:1});
  saveCart(); renderCart(); cartDrawer.classList.remove('hidden');
}
function changeQty(id, delta){
  const item = cart.find(i => i.id === id); if(!item) return;
  item.qty += delta;
  if(item.qty <= 0) cart = cart.filter(i => i.id !== id);
  saveCart(); renderCart();
}
function renderCart(){
  const rows = cart.map(item => ({...item, product: products.find(p => p.id === item.id)})).filter(x => x.product);
  cartItems.innerHTML = rows.length ? rows.map(x => `
    <div class="cart-item"><div><strong>${x.product.name}</strong><br>${lei(x.product.price)} x ${x.qty}</div>
    <div class="qty-actions"><button onclick="changeQty('${x.id}',-1)">-</button><span>${x.qty}</span><button onclick="changeQty('${x.id}',1)">+</button></div></div>`).join('') : '<p>Coșul este gol.</p>';
  const total = rows.reduce((s,x)=>s+x.product.price*x.qty,0);
  const count = rows.reduce((s,x)=>s+x.qty,0);
  cartTotal.textContent = lei(total); cartCount.textContent = count;
}
checkoutForm.addEventListener('submit', async e => {
  e.preventDefault();
  if(!cart.length){ orderMessage.textContent = 'Coșul este gol.'; return; }
  const form = new FormData(checkoutForm);
  const payload = {
    customer:{ name:form.get('name'), phone:form.get('phone'), email:form.get('email') },
    delivery:{ address:form.get('address'), date:form.get('date'), time:form.get('time') },
    notes: form.get('message'),
    items: cart
  };
  const res = await fetch('/api/orders',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
  const data = await res.json();
  if(!res.ok){ orderMessage.textContent = data.error || 'Eroare la trimiterea comenzii.'; return; }
  cart = []; saveCart(); renderCart(); checkoutForm.reset();
  orderMessage.textContent = `Comanda ${data.id} a fost trimisă. Total: ${lei(data.total)}.`;
});
cartBtn.onclick = () => cartDrawer.classList.remove('hidden');
closeCart.onclick = () => cartDrawer.classList.add('hidden');
searchInput.oninput = renderProducts;
loadProducts();
