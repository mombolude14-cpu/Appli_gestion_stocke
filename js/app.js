/**
 * Abuni - Application de Gestion Stock & Clients
 * Version 100% Frontend avec LocalStorage
 */

// ===== STORE =====
const Store = {
  get(key) { try { return JSON.parse(localStorage.getItem(key)) || []; } catch { return []; } },
  set(key, data) { localStorage.setItem(key, JSON.stringify(data)); },
  genId() { return Date.now().toString(36) + Math.random().toString(36).substr(2, 6); }
};

// ===== INIT DEFAULT USER =====
if (!localStorage.getItem('abuni_users')) {
  Store.set('abuni_users', [{ id: 'admin1', username: 'admin', password: 'admin123', nom: 'Administrateur', role: 'admin' }]);
}

// ===== HELPERS =====
function fmtMoney(n) { return new Intl.NumberFormat('fr-FR').format(n || 0) + ' FCFA'; }
function fmtDate(d) { if (!d) return '-'; return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }); }
function toast(msg, type = 'success') {
  const c = document.getElementById('toastContainer'), el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `<span>${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}</span> ${msg}`;
  c.appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; el.style.transform = 'translateX(60px)'; setTimeout(() => el.remove(), 300); }, 3000);
}
function openModal(id) { document.getElementById(id).classList.add('active'); }
function closeModal(id) { document.getElementById(id).classList.remove('active'); }
function escapeHtml(s) { return s ? s.replace(/'/g, "\\'").replace(/"/g, '&quot;') : ''; }

// ===== AUTH =====
let currentUser = null;

document.getElementById('loginForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const errEl = document.getElementById('loginError');
  errEl.classList.remove('show');
  const username = document.getElementById('loginUser').value.trim();
  const password = document.getElementById('loginPass').value;
  const users = Store.get('abuni_users');
  const user = users.find(u => u.username === username && u.password === password);
  if (!user) { errEl.textContent = 'Identifiants invalides'; errEl.classList.add('show'); return; }
  currentUser = user;
  localStorage.setItem('abuni_session', user.id);
  showApp(user);
});

document.getElementById('btnLogout').addEventListener('click', () => {
  currentUser = null;
  localStorage.removeItem('abuni_session');
  document.getElementById('appLayout').classList.add('hidden');
  document.getElementById('loginPage').classList.remove('hidden');
  document.getElementById('loginForm').reset();
});

function showApp(user) {
  document.getElementById('loginPage').classList.add('hidden');
  document.getElementById('appLayout').classList.remove('hidden');
  document.getElementById('userName').textContent = user.nom;
  document.getElementById('userRole').textContent = user.role === 'admin' ? 'Administrateur' : 'Utilisateur';
  document.getElementById('userAvatar').textContent = user.nom.charAt(0).toUpperCase();
  navigateTo('dashboard');
}

function checkSession() {
  const sid = localStorage.getItem('abuni_session');
  if (sid) {
    const users = Store.get('abuni_users');
    const user = users.find(u => u.id === sid);
    if (user) { currentUser = user; showApp(user); }
  }
}

// ===== NAVIGATION =====
const navItems = document.querySelectorAll('.nav-item');

function navigateTo(page) {
  navItems.forEach(n => n.classList.remove('active'));
  document.querySelectorAll('.page-section').forEach(p => p.classList.add('hidden'));
  const navEl = document.querySelector(`.nav-item[data-page="${page}"]`);
  if (navEl) navEl.classList.add('active');
  const pageEl = document.getElementById('page' + page.charAt(0).toUpperCase() + page.slice(1));
  if (pageEl) pageEl.classList.remove('hidden');
  document.getElementById('sidebar').classList.remove('open');
  if (page === 'dashboard') loadDashboard();
  else if (page === 'produits') loadProduits();
  else if (page === 'clients') loadClients();
  else if (page === 'transactions') loadTransactions();
  else if (page === 'rapports') loadRapports();
}

navItems.forEach(item => item.addEventListener('click', () => navigateTo(item.dataset.page)));
document.getElementById('mobileToggle').addEventListener('click', () => document.getElementById('sidebar').classList.toggle('open'));

// ===== PRODUITS CRUD =====
function getProduits() { return Store.get('abuni_produits'); }
function saveProduits(data) { Store.set('abuni_produits', data); }

function loadProduits(search) {
  let produits = getProduits();
  if (search) { const q = search.toLowerCase(); produits = produits.filter(p => p.nom.toLowerCase().includes(q) || (p.categorie || '').toLowerCase().includes(q)); }
  const tbody = document.getElementById('produitsTable');
  if (!produits.length) { tbody.innerHTML = '<tr><td colspan="6"><div class="empty-state"><div class="icon">📦</div><p>Aucun produit</p></div></td></tr>'; return; }
  tbody.innerHTML = produits.map(p => {
    let statut, badge;
    if (p.quantite === 0) { statut = 'Rupture'; badge = 'danger'; }
    else if (p.quantite <= (p.seuil || 5)) { statut = 'Alerte'; badge = 'warning'; }
    else { statut = 'En stock'; badge = 'success'; }
    return `<tr><td><strong>${p.nom}</strong></td><td>${p.categorie || 'Général'}</td><td>${fmtMoney(p.prix)}</td><td>${p.quantite}</td><td><span class="badge badge-${badge}">${statut}</span></td><td class="actions"><button class="btn btn-ghost btn-sm" onclick="editProduit('${p.id}')">✏️</button><button class="btn btn-danger btn-sm" onclick="deleteProduit('${p.id}','${escapeHtml(p.nom)}')">🗑</button></td></tr>`;
  }).join('');
}

let searchPTimer;
document.getElementById('searchProduits').addEventListener('input', e => { clearTimeout(searchPTimer); searchPTimer = setTimeout(() => loadProduits(e.target.value), 300); });

document.getElementById('btnAddProduit').addEventListener('click', () => {
  document.getElementById('formProduit').reset();
  document.getElementById('produitId').value = '';
  document.getElementById('modalProduitTitle').textContent = 'Ajouter un produit';
  openModal('modalProduit');
});

document.getElementById('btnSaveProduit').addEventListener('click', () => {
  const id = document.getElementById('produitId').value;
  const nom = document.getElementById('produitNom').value.trim();
  if (!nom) { toast('Le nom est requis', 'error'); return; }
  const data = { nom, categorie: document.getElementById('produitCategorie').value.trim() || 'Général', prix: parseFloat(document.getElementById('produitPrix').value) || 0, quantite: parseInt(document.getElementById('produitQuantite').value) || 0, seuil: parseInt(document.getElementById('produitSeuil').value) || 5, description: document.getElementById('produitDesc').value.trim() };
  const produits = getProduits();
  if (id) {
    const idx = produits.findIndex(p => p.id === id);
    if (idx !== -1) { produits[idx] = { ...produits[idx], ...data, updatedAt: new Date().toISOString() }; }
    toast('Produit modifié');
  } else {
    produits.unshift({ id: Store.genId(), ...data, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    toast('Produit ajouté');
  }
  saveProduits(produits);
  closeModal('modalProduit');
  loadProduits();
});

function editProduit(id) {
  const p = getProduits().find(x => x.id === id);
  if (!p) return;
  document.getElementById('produitId').value = p.id;
  document.getElementById('produitNom').value = p.nom;
  document.getElementById('produitCategorie').value = p.categorie || '';
  document.getElementById('produitPrix').value = p.prix;
  document.getElementById('produitQuantite').value = p.quantite;
  document.getElementById('produitSeuil').value = p.seuil || 5;
  document.getElementById('produitDesc').value = p.description || '';
  document.getElementById('modalProduitTitle').textContent = 'Modifier le produit';
  openModal('modalProduit');
}

function deleteProduit(id, nom) {
  document.getElementById('confirmMessage').textContent = `Supprimer "${nom}" ?`;
  document.getElementById('btnConfirmAction').onclick = () => {
    saveProduits(getProduits().filter(p => p.id !== id));
    toast('Produit supprimé');
    closeModal('modalConfirm');
    loadProduits();
  };
  openModal('modalConfirm');
}

// ===== CLIENTS CRUD =====
function getClients() { return Store.get('abuni_clients'); }
function saveClients(data) { Store.set('abuni_clients', data); }

function loadClients(search) {
  let clients = getClients();
  if (search) { const q = search.toLowerCase(); clients = clients.filter(c => c.nom.toLowerCase().includes(q) || (c.email || '').toLowerCase().includes(q) || (c.telephone || '').includes(q)); }
  const tbody = document.getElementById('clientsTable');
  if (!clients.length) { tbody.innerHTML = '<tr><td colspan="5"><div class="empty-state"><div class="icon">👤</div><p>Aucun client</p></div></td></tr>'; return; }
  tbody.innerHTML = clients.map(c => `<tr><td><strong>${c.nom}</strong></td><td>${c.email || '-'}</td><td>${c.telephone || '-'}</td><td>${c.entreprise || '-'}</td><td class="actions"><button class="btn btn-ghost btn-sm" onclick="editClient('${c.id}')">✏️</button><button class="btn btn-danger btn-sm" onclick="deleteClient('${c.id}','${escapeHtml(c.nom)}')">🗑</button></td></tr>`).join('');
}

let searchCTimer;
document.getElementById('searchClients').addEventListener('input', e => { clearTimeout(searchCTimer); searchCTimer = setTimeout(() => loadClients(e.target.value), 300); });

document.getElementById('btnAddClient').addEventListener('click', () => {
  document.getElementById('formClient').reset();
  document.getElementById('clientId').value = '';
  document.getElementById('modalClientTitle').textContent = 'Ajouter un client';
  openModal('modalClient');
});

document.getElementById('btnSaveClient').addEventListener('click', () => {
  const id = document.getElementById('clientId').value;
  const nom = document.getElementById('clientNom').value.trim();
  if (!nom) { toast('Le nom est requis', 'error'); return; }
  const data = { nom, email: document.getElementById('clientEmail').value.trim(), telephone: document.getElementById('clientTel').value.trim(), adresse: document.getElementById('clientAdresse').value.trim(), entreprise: document.getElementById('clientEntreprise').value.trim(), notes: document.getElementById('clientNotes').value.trim() };
  const clients = getClients();
  if (id) {
    const idx = clients.findIndex(c => c.id === id);
    if (idx !== -1) { clients[idx] = { ...clients[idx], ...data, updatedAt: new Date().toISOString() }; }
    toast('Client modifié');
  } else {
    clients.unshift({ id: Store.genId(), ...data, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    toast('Client ajouté');
  }
  saveClients(clients);
  closeModal('modalClient');
  loadClients();
});

function editClient(id) {
  const c = getClients().find(x => x.id === id);
  if (!c) return;
  document.getElementById('clientId').value = c.id;
  document.getElementById('clientNom').value = c.nom;
  document.getElementById('clientEmail').value = c.email || '';
  document.getElementById('clientTel').value = c.telephone || '';
  document.getElementById('clientAdresse').value = c.adresse || '';
  document.getElementById('clientEntreprise').value = c.entreprise || '';
  document.getElementById('clientNotes').value = c.notes || '';
  document.getElementById('modalClientTitle').textContent = 'Modifier le client';
  openModal('modalClient');
}

function deleteClient(id, nom) {
  document.getElementById('confirmMessage').textContent = `Supprimer "${nom}" ?`;
  document.getElementById('btnConfirmAction').onclick = () => {
    saveClients(getClients().filter(c => c.id !== id));
    toast('Client supprimé');
    closeModal('modalConfirm');
    loadClients();
  };
  openModal('modalConfirm');
}

// ===== TRANSACTIONS =====
function getTransactions() { return Store.get('abuni_transactions'); }
function saveTransactions(data) { Store.set('abuni_transactions', data); }

function renderTransRow(t) {
  return `<tr><td><span class="badge badge-${t.type}">${t.type === 'entree' ? '📥 Entrée' : '📤 Sortie'}</span></td><td>${t.produitNom || '-'}</td><td>${t.clientNom || '-'}</td><td>${t.quantite}</td><td>${fmtMoney(t.montant)}</td><td>${fmtDate(t.date)}</td></tr>`;
}

function loadTransactions() {
  const trans = getTransactions();
  const tbody = document.getElementById('transactionsTable');
  if (!trans.length) { tbody.innerHTML = '<tr><td colspan="6"><div class="empty-state"><div class="icon">🔁</div><p>Aucune transaction</p></div></td></tr>'; return; }
  tbody.innerHTML = trans.map(renderTransRow).join('');
}

document.getElementById('btnAddTransaction').addEventListener('click', () => {
  document.getElementById('formTransaction').reset();
  const produits = getProduits(), clients = getClients();
  document.getElementById('transProduit').innerHTML = produits.map(p => `<option value="${p.id}">${p.nom} (stock: ${p.quantite})</option>`).join('');
  document.getElementById('transClient').innerHTML = '<option value="">-- Aucun --</option>' + clients.map(c => `<option value="${c.id}">${c.nom}</option>`).join('');
  openModal('modalTransaction');
});

document.getElementById('btnSaveTransaction').addEventListener('click', () => {
  const type = document.getElementById('transType').value;
  const produitId = document.getElementById('transProduit').value;
  const clientId = document.getElementById('transClient').value;
  const quantite = parseInt(document.getElementById('transQuantite').value);
  const note = document.getElementById('transNote').value.trim();

  if (!produitId) { toast('Sélectionnez un produit', 'error'); return; }
  if (!quantite || quantite <= 0) { toast('Quantité invalide', 'error'); return; }

  const produits = getProduits();
  const pIdx = produits.findIndex(p => p.id === produitId);
  if (pIdx === -1) { toast('Produit introuvable', 'error'); return; }
  const produit = produits[pIdx];

  if (type === 'sortie' && produit.quantite < quantite) { toast('Stock insuffisant !', 'error'); return; }

  // Mettre à jour stock
  produit.quantite = type === 'sortie' ? produit.quantite - quantite : produit.quantite + quantite;
  produit.updatedAt = new Date().toISOString();
  produits[pIdx] = produit;
  saveProduits(produits);

  // Créer transaction
  const client = clientId ? getClients().find(c => c.id === clientId) : null;
  const trans = getTransactions();
  trans.unshift({
    id: Store.genId(), type, produitId, produitNom: produit.nom,
    clientId: clientId || null, clientNom: client ? client.nom : null,
    quantite, prixUnit: produit.prix, montant: produit.prix * quantite,
    note, date: new Date().toISOString()
  });
  saveTransactions(trans);
  toast('Transaction enregistrée');
  closeModal('modalTransaction');
  loadTransactions();
});

// ===== DASHBOARD =====
function loadDashboard() {
  const produits = getProduits(), clients = getClients(), trans = getTransactions();
  const valeurStock = produits.reduce((s, p) => s + p.prix * p.quantite, 0);
  const ca = trans.filter(t => t.type === 'sortie').reduce((s, t) => s + t.montant, 0);

  document.getElementById('dashStats').innerHTML = `
    <div class="stat-card"><div class="stat-icon">📦</div><div class="stat-value">${produits.length}</div><div class="stat-label">Produits</div></div>
    <div class="stat-card"><div class="stat-icon">💰</div><div class="stat-value">${fmtMoney(valeurStock)}</div><div class="stat-label">Valeur du stock</div></div>
    <div class="stat-card"><div class="stat-icon">👤</div><div class="stat-value">${clients.length}</div><div class="stat-label">Clients</div></div>
    <div class="stat-card"><div class="stat-icon">📈</div><div class="stat-value">${fmtMoney(ca)}</div><div class="stat-label">Chiffre d'affaires</div></div>`;

  // Alertes
  const alertes = produits.filter(p => p.quantite <= (p.seuil || 5));
  document.getElementById('dashAlertes').innerHTML = alertes.length === 0
    ? '<div class="empty-state"><div class="icon">✅</div><p>Aucune alerte</p></div>'
    : alertes.slice(0, 5).map(a => `<div class="alert-item"><div class="info"><span class="dot"></span><span>${a.nom}</span></div><span class="badge badge-danger">${a.quantite} restant(s)</span></div>`).join('');

  // Récentes
  const recentes = trans.slice(0, 8);
  document.getElementById('dashRecentes').innerHTML = recentes.length === 0
    ? '<tr><td colspan="6"><div class="empty-state"><p>Aucune transaction</p></div></td></tr>'
    : recentes.map(renderTransRow).join('');

  // Chart
  loadChart(trans);
}

function loadChart(trans) {
  const data = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i); d.setHours(0, 0, 0, 0);
    const nd = new Date(d); nd.setDate(nd.getDate() + 1);
    const dayT = trans.filter(t => { const td = new Date(t.date); return td >= d && td < nd; });
    data.push({
      label: d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' }),
      entrees: dayT.filter(t => t.type === 'entree').reduce((s, t) => s + t.montant, 0),
      sorties: dayT.filter(t => t.type === 'sortie').reduce((s, t) => s + t.montant, 0)
    });
  }
  const max = Math.max(...data.map(d => Math.max(d.entrees, d.sorties)), 1);
  document.getElementById('dashChart').innerHTML = data.map(d => `
    <div class="chart-bar-group"><div class="chart-bars">
      <div class="chart-bar entree" style="height:${Math.max((d.entrees / max) * 100, 3)}%" title="Entrées: ${fmtMoney(d.entrees)}"></div>
      <div class="chart-bar sortie" style="height:${Math.max((d.sorties / max) * 100, 3)}%" title="Sorties: ${fmtMoney(d.sorties)}"></div>
    </div><span class="chart-label">${d.label}</span></div>`).join('');
}

// ===== RAPPORTS =====
function loadRapports() {
  const produits = getProduits(), trans = getTransactions();
  const valeur = produits.reduce((s, p) => s + p.prix * p.quantite, 0);
  const sorties = trans.filter(t => t.type === 'sortie');
  const ca = sorties.reduce((s, t) => s + t.montant, 0);

  document.getElementById('rapportStats').innerHTML = `
    <div class="stat-card"><div class="stat-icon">📦</div><div class="stat-value">${produits.length}</div><div class="stat-label">Produits</div></div>
    <div class="stat-card"><div class="stat-icon">💰</div><div class="stat-value">${fmtMoney(valeur)}</div><div class="stat-label">Valeur du stock</div></div>
    <div class="stat-card"><div class="stat-icon">🔁</div><div class="stat-value">${trans.length}</div><div class="stat-label">Transactions</div></div>
    <div class="stat-card"><div class="stat-icon">📈</div><div class="stat-value">${fmtMoney(ca)}</div><div class="stat-label">C.A. total</div></div>`;

  document.getElementById('rapportTable').innerHTML = trans.length === 0
    ? '<tr><td colspan="7"><div class="empty-state"><p>Aucune donnée</p></div></td></tr>'
    : trans.map(t => `<tr><td><span class="badge badge-${t.type}">${t.type === 'entree' ? 'Entrée' : 'Sortie'}</span></td><td>${t.produitNom || '-'}</td><td>${t.clientNom || '-'}</td><td>${t.quantite}</td><td>${fmtMoney(t.prixUnit)}</td><td>${fmtMoney(t.montant)}</td><td>${fmtDate(t.date)}</td></tr>`).join('');
}

// ===== INIT =====
checkSession();
