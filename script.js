import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const STORAGE_KEY = 'stockia-inventory-v1';
const seedProducts = [
  { id: 'p1', name: 'Café molido 500 g', sku: 'CAF-001', category: 'Alimentos', unit: 'unidad', stock: 24, min_stock: 10 },
  { id: 'p2', name: 'Azúcar blanca 1 kg', sku: 'AZU-002', category: 'Alimentos', unit: 'unidad', stock: 8, min_stock: 12 },
  { id: 'p3', name: 'Leche entera 1 L', sku: 'LEC-003', category: 'Refrigerados', unit: 'unidad', stock: 31, min_stock: 10 },
  { id: 'p4', name: 'Servilletas paquete x100', sku: 'SER-004', category: 'Desechables', unit: 'paquete', stock: 5, min_stock: 8 },
  { id: 'p5', name: 'Chocolate de mesa 250 g', sku: 'CHO-005', category: 'Alimentos', unit: 'unidad', stock: 18, min_stock: 7 }
];
const seedMovements = [
  { id: 'm1', product_id: 'p1', type: 'entrada', quantity: 12, note: 'Compra a proveedor', created_at: '2026-11-07T09:10:00' },
  { id: 'm2', product_id: 'p2', type: 'salida', quantity: 4, note: 'Venta mostrador', created_at: '2026-11-06T16:40:00' },
  { id: 'm3', product_id: 'p3', type: 'entrada', quantity: 20, note: 'Reposición semanal', created_at: '2026-11-06T10:15:00' },
  { id: 'm4', product_id: 'p4', type: 'salida', quantity: 3, note: 'Consumo interno', created_at: '2026-11-05T14:22:00' },
  { id: 'm5', product_id: 'p5', type: 'entrada', quantity: 8, note: 'Compra a proveedor', created_at: '2026-11-04T11:05:00' },
  { id: 'm6', product_id: 'p1', type: 'salida', quantity: 6, note: 'Venta mostrador', created_at: '2026-11-03T15:50:00' }
];

const configuredUrl = globalThis.__SUPABASE_URL__;
const configuredKey = globalThis.__SUPABASE_ANON_KEY__;
const remote = configuredUrl && configuredKey ? createClient(configuredUrl, configuredKey) : null;
let products = [];
let movements = [];
let movementFilter = 'all';

const $ = (selector) => document.querySelector(selector);
const formatDate = (value, withTime = false) => new Intl.DateTimeFormat('es-CO', { day: '2-digit', month: 'short', ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}) }).format(new Date(value)).replace('.', '');
const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[character]);
const productById = (id) => products.find((product) => product.id === id);
const initials = (name) => name.split(' ').slice(0, 2).map((part) => part[0]).join('').toUpperCase();
const showToast = (message) => { const toast = $('#toast'); toast.textContent = message; toast.classList.add('show'); window.setTimeout(() => toast.classList.remove('show'), 2800); };

function saveLocal() { localStorage.setItem(STORAGE_KEY, JSON.stringify({ products, movements })); }
function loadLocal() { const stored = localStorage.getItem(STORAGE_KEY); if (stored) { const data = JSON.parse(stored); products = data.products || []; movements = data.movements || []; } else { products = seedProducts; movements = seedMovements; saveLocal(); } }

async function loadData() {
  if (!remote) { loadLocal(); return; }
  const [{ data: productRows, error: productsError }, { data: movementRows, error: movementsError }] = await Promise.all([
    remote.from('inventory_products').select('*').order('name'),
    remote.from('inventory_movements').select('*').order('created_at', { ascending: false })
  ]);
  if (productsError || movementsError) { loadLocal(); showToast('Se activó el modo local de demostración'); return; }
  products = productRows || [];
  movements = movementRows || [];
  if (!products.length) { products = seedProducts.map(({ id, ...product }) => product); const { data } = await remote.from('inventory_products').insert(products).select(); products = data || products; }
}

function renderMetrics() {
  const low = products.filter((product) => product.stock <= product.min_stock).length;
  const entries = movements.filter((movement) => movement.type === 'entrada').reduce((sum, movement) => sum + movement.quantity, 0);
  const exits = movements.filter((movement) => movement.type === 'salida').reduce((sum, movement) => sum + movement.quantity, 0);
  $('#metric-grid').innerHTML = `<article class="metric-card"><span class="metric-label">Total de productos</span><div class="metric-value">${products.length}</div><div class="metric-note positive">Catálogo activo</div><span class="metric-icon">□</span></article><article class="metric-card"><span class="metric-label">Unidades en stock</span><div class="metric-value">${products.reduce((sum, product) => sum + product.stock, 0)}</div><div class="metric-note">En todas las referencias</div><span class="metric-icon">▤</span></article><article class="metric-card"><span class="metric-label">Entradas del periodo</span><div class="metric-value">${entries}</div><div class="metric-note positive">+${entries} unidades registradas</div><span class="metric-icon">↗</span></article><article class="metric-card"><span class="metric-label">Stock bajo</span><div class="metric-value">${low}</div><div class="metric-note ${low ? 'warning' : 'positive'}">${low ? 'Requieren reposición' : 'Todo está en orden'}</div><span class="metric-icon">!</span></article>`;
  $('#nav-alert-count').textContent = low;
}

function renderAlerts() {
  const lowProducts = products.filter((product) => product.stock <= product.min_stock);
  $('#alert-list').innerHTML = lowProducts.length ? lowProducts.slice(0, 4).map((product) => `<div class="alert-item"><span class="product-avatar">${escapeHtml(initials(product.name))}</span><div><strong>${escapeHtml(product.name)}</strong><small>${escapeHtml(product.stock)} ${escapeHtml(product.unit)} disponibles</small></div><span class="stock-alert">Stock bajo</span></div>`).join('') : '<div class="empty-state">No hay productos con stock bajo.</div>'; 
  $('#alert-summary-title').textContent = `${lowProducts.length} ${lowProducts.length === 1 ? 'producto requiere' : 'productos requieren'} atención`;
  $('#alert-cards').innerHTML = lowProducts.length ? lowProducts.map((product) => { const percentage = Math.min(100, Math.round((product.stock / Math.max(product.min_stock, 1)) * 100)); return `<article class="alert-card"><div class="alert-card-top"><span class="product-avatar">${escapeHtml(initials(product.name))}</span><span class="stock-alert">Reponer</span></div><h3>${escapeHtml(product.name)}</h3><p>${escapeHtml(product.category)} · ${escapeHtml(product.sku)}</p><div class="stock-progress"><span style="width:${percentage}%"></span></div><div class="stock-values"><span>${escapeHtml(product.stock)} ${escapeHtml(product.unit)}</span><span>Mínimo: ${escapeHtml(product.min_stock)}</span></div></article>`; }).join('') : '<div class="panel empty-state">Todos los productos tienen existencias suficientes.</div>'; 
}

function renderChart() {
  const days = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
  const now = new Date('2026-11-07T12:00:00');
  const values = days.map((_, index) => { const date = new Date(now); date.setDate(now.getDate() - (6 - index)); return movements.filter((movement) => new Date(movement.created_at).toDateString() === date.toDateString()).reduce((result, movement) => ({ entries: result.entries + (movement.type === 'entrada' ? movement.quantity : 0), exits: result.exits + (movement.type === 'salida' ? movement.quantity : 0) }), { entries: 0, exits: 0 }); });
  const max = Math.max(40, ...values.flatMap((value) => [value.entries, value.exits]));
  $('#activity-chart').innerHTML = values.map((value) => `<div class="bar-pair"><span class="bar entry" style="height:${Math.max(3, value.entries / max * 100)}%"></span><span class="bar exit" style="height:${Math.max(3, value.exits / max * 100)}%"></span></div>`).join('');
  $('#chart-labels').innerHTML = days.map((day) => `<span>${day}</span>`).join('');
}

function productRow(product) { const low = product.stock <= product.min_stock; return `<tr><td><div class="product-cell"><span class="product-avatar">${escapeHtml(initials(product.name))}</span>${escapeHtml(product.name)}</div></td><td>${escapeHtml(product.sku)}</td><td>${escapeHtml(product.category)}</td><td><strong>${escapeHtml(product.stock)}</strong> ${escapeHtml(product.unit)}</td><td>${escapeHtml(product.min_stock)}</td><td><span class="type-badge ${low ? 'salida' : 'entrada'}">${low ? 'Stock bajo' : 'Disponible'}</span></td><td><button class="text-button quick-movement" data-product-id="${escapeHtml(product.id)}">Mover</button></td></tr>`; }
function movementRow(movement, detailed = false) { const product = productById(movement.product_id); if (!product) return ''; return `<tr><td><div class="product-cell"><span class="product-avatar">${escapeHtml(initials(product.name))}</span>${escapeHtml(product.name)}</div></td><td><span class="type-badge ${escapeHtml(movement.type)}">${movement.type === 'entrada' ? 'Entrada' : 'Salida'}</span></td><td class="quantity ${escapeHtml(movement.type)}">${movement.type === 'entrada' ? '+' : '-'}${escapeHtml(movement.quantity)}</td>${detailed ? `<td>${escapeHtml(movement.note || 'Sin nota')}</td>` : '<td>Administrador</td>'}<td class="date-cell">${escapeHtml(formatDate(movement.created_at, detailed))}</td></tr>`; }
function renderTables() {
  $('#recent-movements').innerHTML = movements.slice(0, 5).map((movement) => movementRow(movement)).join('') || '<tr><td colspan="5" class="empty-state">Aún no hay movimientos registrados.</td></tr>';
  const query = ($('#product-search')?.value || '').toLowerCase(); const filteredProducts = products.filter((product) => `${product.name} ${product.sku}`.toLowerCase().includes(query));
  $('#products-table').innerHTML = filteredProducts.map(productRow).join('') || '<tr><td colspan="7" class="empty-state">No encontramos productos.</td></tr>'; $('#product-count').textContent = `${filteredProducts.length} productos`;
  const filteredMovements = movements.filter((movement) => movementFilter === 'all' || movement.type === movementFilter); $('#movements-table').innerHTML = filteredMovements.map((movement) => movementRow(movement, true)).join('') || '<tr><td colspan="5" class="empty-state">No hay movimientos para este filtro.</td></tr>'; $('#movement-count').textContent = `${filteredMovements.length} movimientos`;
}
function renderAll() { renderMetrics(); renderAlerts(); renderChart(); renderTables(); fillProductSelect(); }
function fillProductSelect() { $('#movement-product').innerHTML = products.map((product) => `<option value="${escapeHtml(product.id)}">${escapeHtml(product.name)} · ${escapeHtml(product.stock)} disponibles</option>`).join(''); }

async function createProduct(event) { event.preventDefault(); const product = { name: $('#product-name').value.trim(), sku: $('#product-sku').value.trim().toUpperCase(), category: $('#product-category').value.trim(), unit: 'unidad', stock: Number($('#product-stock').value), min_stock: Number($('#product-min').value) }; if (!product.name || !product.sku || !product.category) { $('#product-error').textContent = 'Completa todos los campos obligatorios.'; return; } if (products.some((item) => item.sku === product.sku)) { $('#product-error').textContent = 'Ya existe un producto con ese SKU.'; return; } if (remote) { const { data, error } = await remote.from('inventory_products').insert(product).select().maybeSingle(); if (error) { $('#product-error').textContent = 'No fue posible guardar el producto.'; return; } products.push(data); } else { product.id = `p-${Date.now()}`; products.push(product); saveLocal(); } closeModal(); renderAll(); showToast('Producto creado correctamente'); }

async function createMovement(event) { event.preventDefault(); const product = productById($('#movement-product').value); const type = $('#movement-type').value; const quantity = Number($('#movement-quantity').value); const errorText = $('#movement-error'); errorText.textContent = ''; if (!product || quantity < 1) { errorText.textContent = 'Selecciona un producto y una cantidad válida.'; return; } if (type === 'salida' && quantity > product.stock) { errorText.textContent = `No hay existencias suficientes. Disponible: ${product.stock}.`; return; } const movement = { product_id: product.id, type, quantity, note: $('#movement-note').value.trim() }; const newStock = product.stock + (type === 'entrada' ? quantity : -quantity); if (remote) { const { data: savedMovement, error: movementError } = await remote.from('inventory_movements').insert(movement).select().maybeSingle(); if (movementError) { errorText.textContent = 'No fue posible guardar el movimiento.'; return; } const { error: productError } = await remote.from('inventory_products').update({ stock: newStock, updated_at: new Date().toISOString() }).eq('id', product.id); if (productError) { errorText.textContent = 'El movimiento se guardó, pero no se pudo actualizar el stock.'; return; } movements.unshift(savedMovement); product.stock = newStock; } else { movements.unshift({ ...movement, id: `m-${Date.now()}`, created_at: new Date().toISOString() }); product.stock = newStock; saveLocal(); } closeModal(); renderAll(); showToast(type === 'entrada' ? 'Entrada registrada correctamente' : 'Salida registrada correctamente'); }

function openModal(kind, productId = '') { $('#modal-backdrop').classList.remove('hidden'); $('#movement-form').classList.toggle('hidden', kind !== 'movement'); $('#product-form').classList.toggle('hidden', kind !== 'product'); $('#modal-eyebrow').textContent = kind === 'product' ? 'CATÁLOGO' : 'NUEVO REGISTRO'; $('#modal-title').textContent = kind === 'product' ? 'Crear producto' : 'Registrar movimiento'; $('#modal-description').textContent = kind === 'product' ? 'Añade una referencia al catálogo de la microempresa.' : 'Actualiza las existencias de un producto.'; if (kind === 'movement' && productId) $('#movement-product').value = productId; }
function closeModal() { $('#modal-backdrop').classList.add('hidden'); $('#movement-form').reset(); $('#product-form').reset(); $('#movement-error').textContent = ''; $('#product-error').textContent = ''; }
function navigate(view) { document.querySelectorAll('[data-page]').forEach((page) => page.classList.toggle('hidden', page.dataset.page !== view)); document.querySelectorAll('.nav-item').forEach((item) => item.classList.toggle('active', item.dataset.view === view)); $('#breadcrumb-current').textContent = view === 'dashboard' ? 'Resumen' : view === 'products' ? 'Productos' : view === 'movements' ? 'Movimientos' : 'Alertas'; window.location.hash = view; }

document.addEventListener('click', (event) => { const viewLink = event.target.closest('[data-view-link]'); if (viewLink) navigate(viewLink.dataset.viewLink); const openButton = event.target.closest('[data-open-modal]'); if (openButton) openModal(openButton.dataset.openModal); const quick = event.target.closest('.quick-movement'); if (quick) openModal('movement', quick.dataset.productId); const nav = event.target.closest('[data-view]'); if (nav) navigate(nav.dataset.view); if (event.target.closest('#modal-close') || event.target === $('#modal-backdrop')) closeModal(); const filter = event.target.closest('[data-filter]'); if (filter) { movementFilter = filter.dataset.filter; document.querySelectorAll('.filter-tab').forEach((tab) => tab.classList.toggle('active', tab === filter)); renderTables(); } });
$('#product-search').addEventListener('input', renderTables); $('#movement-form').addEventListener('submit', createMovement); $('#product-form').addEventListener('submit', createProduct);

(async function init() { await loadData(); renderAll(); const initialView = window.location.hash.replace('#', '') || 'dashboard'; navigate(['dashboard', 'products', 'movements', 'alerts'].includes(initialView) ? initialView : 'dashboard'); })();
