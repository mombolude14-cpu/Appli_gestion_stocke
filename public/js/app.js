/**
 * Abuni - Application principale
 * Gestion de Stock & Clients
 */

// ===== HELPERS =====
/** Appel API avec gestion d'erreur */
async function api(url, options = {}) {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Erreur serveur');
  return data;
}

/** Formater montant FCFA */
function fmtMoney(n) {
  return new Intl.NumberFormat('fr-FR').format(n || 0) + ' FCFA';
}

/** Formater date */
function fmtDate(d) {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

/** Toast notification */
function toast(message, type = 'success') {
  const container = document.getElementById('toastContainer');
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `<span>${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}</span> ${message}`;
  container.appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; el.style.transform = 'translateX(60px)'; setTimeout(() => el.remove(), 300); }, 3000);
}

/** Ouvrir/fermer modal */
function openModal(id) { document.getElementById(id).classList.add('active'); }
function closeModal(id) { document.getElementById(id).classList.remove('active'); }

// ===== AUTH =====
document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const errEl = document.getElementById('loginError');
  errEl.classList.remove('show');
  try {
    const user = await api('/api/login', { method: 'POST', body: { username: document.getElementById('loginUser').value, password: document.getElementById('loginPass').value } });
    showApp(user);
  } catch (err) {
    errEl.textContent = err.message;
    errEl.classList.add('show');
  }
});

document.getElementById('btnLogout').addEventListener('click', async () => {
  await api('/api/logout', { method: 'POST' });
  document.getElementById('appLayout').classList.add('hidden');
  document.getElementById('loginPage').classList.remove('hidden');
  document.getElementById('loginForm').reset();
});

/** Afficher l'app après login */
function showApp(user) {
  document.getElementById('loginPage').classList.add('hidden');
  document.getElementById('appLayout').classList.remove('hidden');
  document.getElementById('userName').textContent = user.nom;
  document.getElementById('userRole').textContent = user.role === 'admin' ? 'Administrateur' : 'Utilisateur';
  document.getElementById('userAvatar').textContent = user.nom.charAt(0).toUpperCase();
  loadDashboard();
}

/** Check session au chargement */
async function checkSession() {
  try {
    const user = await api('/api/me');
    showApp(user);
  } catch { /* pas connecté */ }
}

// ===== NAVIGATION =====
const navItems = document.querySelectorAll('.nav-item');
const bottomNavItems = document.querySelectorAll('.bottom-nav-item');
const sidebar = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebarOverlay');

function navigateTo(page) {
  navItems.forEach(n => n.classList.remove('active'));
  bottomNavItems.forEach(n => n.classList.remove('active'));
  document.querySelectorAll('.page-section').forEach(p => p.classList.add('hidden'));

  const navEl = document.querySelector(`.nav-item[data-page="${page}"]`);
  const bottomNavEl = document.querySelector(`.bottom-nav-item[data-page="${page}"]`);

  if (navEl) navEl.classList.add('active');
  if (bottomNavEl) bottomNavEl.classList.add('active');

  const pageEl = document.getElementById('page' + page.charAt(0).toUpperCase() + page.slice(1));
  if (pageEl) pageEl.classList.remove('hidden');

  closeSidebar();

  if (page === 'dashboard') loadDashboard();
  else if (page === 'produits') loadProduits();
  else if (page === 'clients') loadClients();
  else if (page === 'transactions') loadTransactions();
  else if (page === 'rapports') loadRapports();
}

function openSidebar() {
  sidebar.classList.add('open');
  sidebarOverlay.classList.add('active');
}

function closeSidebar() {
  sidebar.classList.remove('open');
  sidebarOverlay.classList.remove('active');
}

navItems.forEach(item => item.addEventListener('click', () => navigateTo(item.dataset.page)));
bottomNavItems.forEach(item => item.addEventListener('click', () => navigateTo(item.dataset.page)));
document.getElementById('mobileToggle').addEventListener('click', openSidebar);
sidebarOverlay.addEventListener('click', closeSidebar);

// ===== DASHBOARD =====
async function loadDashboard() {
  try {
    const data = await api('/api/dashboard');
    const s = data.stats;
    document.getElementById('dashStats').innerHTML = `
      <div class="stat-card"><div class="stat-icon">📦</div><div class="stat-value">${s.produits}</div><div class="stat-label">Produits</div></div>
      <div class="stat-card"><div class="stat-icon">💰</div><div class="stat-value">${fmtMoney(s.valeurStock)}</div><div class="stat-label">Valeur du stock</div></div>
      <div class="stat-card"><div class="stat-icon">👤</div><div class="stat-value">${s.clients}</div><div class="stat-label">Clients</div></div>
      <div class="stat-card"><div class="stat-icon">📈</div><div class="stat-value">${fmtMoney(s.chiffreAffaires)}</div><div class="stat-label">Chiffre d'affaires</div></div>
    `;
    // Alertes
    if (data.alertes.length === 0) {
      document.getElementById('dashAlertes').innerHTML = '<div class="empty-state"><div class="icon">✅</div><p>Aucune alerte</p></div>';
    } else {
      document.getElementById('dashAlertes').innerHTML = data.alertes.map(a => `
        <div class="alert-item"><div class="info"><span class="dot"></span><span>${a.nom}</span></div><span class="badge badge-danger">${a.quantite} restant(s)</span></div>
      `).join('');
    }
    // Transactions récentes
    if (data.recentes.length === 0) {
      document.getElementById('dashRecentes').innerHTML = '<tr><td colspan="6"><div class="empty-state"><p>Aucune transaction</p></div></td></tr>';
    } else {
      document.getElementById('dashRecentes').innerHTML = data.recentes.map(t => `
        <tr><td data-label="Type"><span class="badge badge-${t.type}">${t.type === 'entree' ? '📥 Entrée' : '📤 Sortie'}</span></td><td data-label="Produit">${t.produit_nom || '-'}</td><td data-label="Client">${t.client_nom || '-'}</td><td data-label="Qté">${t.quantite}</td><td data-label="Montant">${fmtMoney(t.montant_total)}</td><td data-label="Date">${fmtDate(t.date)}</td></tr>
      `).join('');
    }
    // Chart
    loadChart();
  } catch (err) { toast(err.message, 'error'); }
}

async function loadChart() {
  try {
    const data = await api('/api/transactions/chart');
    const max = Math.max(...data.map(d => Math.max(d.entrees, d.sorties)), 1);
    document.getElementById('dashChart').innerHTML = data.map(d => `
      <div class="chart-bar-group">
        <div class="chart-bars">
          <div class="chart-bar entree" style="height:${Math.max((d.entrees / max) * 100, 3)}%" title="Entrées: ${fmtMoney(d.entrees)}"></div>
          <div class="chart-bar sortie" style="height:${Math.max((d.sorties / max) * 100, 3)}%" title="Sorties: ${fmtMoney(d.sorties)}"></div>
        </div>
        <span class="chart-label">${d.label}</span>
      </div>
    `).join('');
  } catch { /* silencieux */ }
}

// ===== PRODUITS =====
async function loadProduits(search = '') {
  try {
    const url = search ? `/api/produits?search=${encodeURIComponent(search)}` : '/api/produits';
    const produits = await api(url);
    if (produits.length === 0) {
      document.getElementById('produitsTable').innerHTML = '<tr><td colspan="6"><div class="empty-state"><div class="icon">📦</div><p>Aucun produit trouvé</p></div></td></tr>';
      return;
    }
    document.getElementById('produitsTable').innerHTML = produits.map(p => {
      let statut, badge;
      if (p.quantite === 0) { statut = 'Rupture'; badge = 'danger'; }
      else if (p.quantite <= p.seuil_alerte) { statut = 'Alerte'; badge = 'warning'; }
      else { statut = 'En stock'; badge = 'success'; }
      return `<tr>
        <td data-label="Nom"><strong>${p.nom}</strong></td><td data-label="Catégorie">${p.categorie}</td><td data-label="Prix">${fmtMoney(p.prix)}</td><td data-label="Stock">${p.quantite}</td>
        <td data-label="Statut"><span class="badge badge-${badge}">${statut}</span></td>
        <td class="actions">
          <button class="btn btn-ghost btn-sm" onclick="editProduit(${p.id})">✏️</button>
          <button class="btn btn-danger btn-sm" onclick="deleteProduit(${p.id},'${p.nom.replace(/'/g, "\\'")}')">🗑</button>
        </td>
      </tr>`;
    }).join('');
  } catch (err) { toast(err.message, 'error'); }
}

let searchProduitTimer;
document.getElementById('searchProduits').addEventListener('input', (e) => {
  clearTimeout(searchProduitTimer);
  searchProduitTimer = setTimeout(() => loadProduits(e.target.value), 300);
});

document.getElementById('btnAddProduit').addEventListener('click', () => {
  document.getElementById('formProduit').reset();
  document.getElementById('produitId').value = '';
  document.getElementById('modalProduitTitle').textContent = 'Ajouter un produit';
  openModal('modalProduit');
});

document.getElementById('btnSaveProduit').addEventListener('click', async () => {
  const id = document.getElementById('produitId').value;
  const body = {
    nom: document.getElementById('produitNom').value,
    categorie: document.getElementById('produitCategorie').value,
    prix: parseFloat(document.getElementById('produitPrix').value) || 0,
    quantite: parseInt(document.getElementById('produitQuantite').value) || 0,
    seuil_alerte: parseInt(document.getElementById('produitSeuil').value) || 5,
    description: document.getElementById('produitDesc').value
  };
  if (!body.nom) { toast('Le nom est requis', 'error'); return; }
  try {
    if (id) { await api(`/api/produits/${id}`, { method: 'PUT', body }); toast('Produit modifié'); }
    else { await api('/api/produits', { method: 'POST', body }); toast('Produit ajouté'); }
    closeModal('modalProduit');
    loadProduits();
  } catch (err) { toast(err.message, 'error'); }
});

async function editProduit(id) {
  try {
    const produits = await api('/api/produits');
    const p = produits.find(x => x.id === id);
    if (!p) return;
    document.getElementById('produitId').value = p.id;
    document.getElementById('produitNom').value = p.nom;
    document.getElementById('produitCategorie').value = p.categorie;
    document.getElementById('produitPrix').value = p.prix;
    document.getElementById('produitQuantite').value = p.quantite;
    document.getElementById('produitSeuil').value = p.seuil_alerte;
    document.getElementById('produitDesc').value = p.description;
    document.getElementById('modalProduitTitle').textContent = 'Modifier le produit';
    openModal('modalProduit');
  } catch (err) { toast(err.message, 'error'); }
}

function deleteProduit(id, nom) {
  document.getElementById('confirmMessage').textContent = `Supprimer le produit "${nom}" ?`;
  document.getElementById('btnConfirmAction').onclick = async () => {
    try {
      await api(`/api/produits/${id}`, { method: 'DELETE' });
      toast('Produit supprimé');
      closeModal('modalConfirm');
      loadProduits();
    } catch (err) { toast(err.message, 'error'); }
  };
  openModal('modalConfirm');
}

// ===== CLIENTS =====
async function loadClients(search = '') {
  try {
    const url = search ? `/api/clients?search=${encodeURIComponent(search)}` : '/api/clients';
    const clients = await api(url);
    if (clients.length === 0) {
      document.getElementById('clientsTable').innerHTML = '<tr><td colspan="5"><div class="empty-state"><div class="icon">👤</div><p>Aucun client trouvé</p></div></td></tr>';
      return;
    }
    document.getElementById('clientsTable').innerHTML = clients.map(c => `
      <tr>
        <td data-label="Nom"><strong>${c.nom}</strong></td><td data-label="Email">${c.email || '-'}</td><td data-label="Téléphone">${c.telephone || '-'}</td><td data-label="Entreprise">${c.entreprise || '-'}</td>
        <td class="actions">
          <button class="btn btn-ghost btn-sm" onclick="editClient(${c.id})">✏️</button>
          <button class="btn btn-danger btn-sm" onclick="deleteClient(${c.id},'${c.nom.replace(/'/g, "\\'")}')">🗑</button>
        </td>
      </tr>
    `).join('');
  } catch (err) { toast(err.message, 'error'); }
}

let searchClientTimer;
document.getElementById('searchClients').addEventListener('input', (e) => {
  clearTimeout(searchClientTimer);
  searchClientTimer = setTimeout(() => loadClients(e.target.value), 300);
});

document.getElementById('btnAddClient').addEventListener('click', () => {
  document.getElementById('formClient').reset();
  document.getElementById('clientId').value = '';
  document.getElementById('modalClientTitle').textContent = 'Ajouter un client';
  openModal('modalClient');
});

document.getElementById('btnSaveClient').addEventListener('click', async () => {
  const id = document.getElementById('clientId').value;
  const body = {
    nom: document.getElementById('clientNom').value,
    email: document.getElementById('clientEmail').value,
    telephone: document.getElementById('clientTel').value,
    adresse: document.getElementById('clientAdresse').value,
    entreprise: document.getElementById('clientEntreprise').value,
    notes: document.getElementById('clientNotes').value
  };
  if (!body.nom) { toast('Le nom est requis', 'error'); return; }
  try {
    if (id) { await api(`/api/clients/${id}`, { method: 'PUT', body }); toast('Client modifié'); }
    else { await api('/api/clients', { method: 'POST', body }); toast('Client ajouté'); }
    closeModal('modalClient');
    loadClients();
  } catch (err) { toast(err.message, 'error'); }
});

async function editClient(id) {
  try {
    const clients = await api('/api/clients');
    const c = clients.find(x => x.id === id);
    if (!c) return;
    document.getElementById('clientId').value = c.id;
    document.getElementById('clientNom').value = c.nom;
    document.getElementById('clientEmail').value = c.email;
    document.getElementById('clientTel').value = c.telephone;
    document.getElementById('clientAdresse').value = c.adresse;
    document.getElementById('clientEntreprise').value = c.entreprise;
    document.getElementById('clientNotes').value = c.notes;
    document.getElementById('modalClientTitle').textContent = 'Modifier le client';
    openModal('modalClient');
  } catch (err) { toast(err.message, 'error'); }
}

function deleteClient(id, nom) {
  document.getElementById('confirmMessage').textContent = `Supprimer le client "${nom}" ?`;
  document.getElementById('btnConfirmAction').onclick = async () => {
    try {
      await api(`/api/clients/${id}`, { method: 'DELETE' });
      toast('Client supprimé');
      closeModal('modalConfirm');
      loadClients();
    } catch (err) { toast(err.message, 'error'); }
  };
  openModal('modalConfirm');
}

// ===== TRANSACTIONS =====
async function loadTransactions() {
  try {
    const transactions = await api('/api/transactions');
    if (transactions.length === 0) {
      document.getElementById('transactionsTable').innerHTML = '<tr><td colspan="6"><div class="empty-state"><div class="icon">🔁</div><p>Aucune transaction</p></div></td></tr>';
      return;
    }
    document.getElementById('transactionsTable').innerHTML = transactions.map(t => `
      <tr>
        <td data-label="Type"><span class="badge badge-${t.type}">${t.type === 'entree' ? '📥 Entrée' : '📤 Sortie'}</span></td>
        <td data-label="Produit">${t.produit_nom || '-'}</td><td data-label="Client">${t.client_nom || '-'}</td><td data-label="Qté">${t.quantite}</td>
        <td data-label="Montant">${fmtMoney(t.montant_total)}</td><td data-label="Date">${fmtDate(t.date)}</td>
      </tr>
    `).join('');
  } catch (err) { toast(err.message, 'error'); }
}

document.getElementById('btnAddTransaction').addEventListener('click', async () => {
  document.getElementById('formTransaction').reset();
  try {
    const [produits, clients] = await Promise.all([api('/api/produits'), api('/api/clients')]);
    document.getElementById('transProduit').innerHTML = produits.map(p => `<option value="${p.id}">${p.nom} (stock: ${p.quantite})</option>`).join('');
    document.getElementById('transClient').innerHTML = '<option value="">-- Aucun --</option>' + clients.map(c => `<option value="${c.id}">${c.nom}</option>`).join('');
    openModal('modalTransaction');
  } catch (err) { toast(err.message, 'error'); }
});

document.getElementById('btnSaveTransaction').addEventListener('click', async () => {
  const body = {
    type: document.getElementById('transType').value,
    produit_id: parseInt(document.getElementById('transProduit').value),
    client_id: document.getElementById('transClient').value ? parseInt(document.getElementById('transClient').value) : null,
    quantite: parseInt(document.getElementById('transQuantite').value),
    note: document.getElementById('transNote').value
  };
  if (!body.quantite || body.quantite <= 0) { toast('Quantité invalide', 'error'); return; }
  try {
    await api('/api/transactions', { method: 'POST', body });
    toast('Transaction enregistrée');
    closeModal('modalTransaction');
    loadTransactions();
  } catch (err) { toast(err.message, 'error'); }
});

// ===== RAPPORTS =====
async function loadRapports() {
  try {
    const [pStats, tStats, transactions] = await Promise.all([
      api('/api/produits/stats'),
      api('/api/transactions/stats'),
      api('/api/transactions')
    ]);
    document.getElementById('rapportStats').innerHTML = `
      <div class="stat-card"><div class="stat-icon">📦</div><div class="stat-value">${pStats.total}</div><div class="stat-label">Produits total</div></div>
      <div class="stat-card"><div class="stat-icon">💰</div><div class="stat-value">${fmtMoney(pStats.valeurTotale)}</div><div class="stat-label">Valeur du stock</div></div>
      <div class="stat-card"><div class="stat-icon">🔁</div><div class="stat-value">${tStats.totalTransactions}</div><div class="stat-label">Transactions</div></div>
      <div class="stat-card"><div class="stat-icon">📈</div><div class="stat-value">${fmtMoney(tStats.chiffreAffaires)}</div><div class="stat-label">C.A. total</div></div>
    `;
    if (transactions.length === 0) {
      document.getElementById('rapportTable').innerHTML = '<tr><td colspan="7"><div class="empty-state"><p>Aucune donnée</p></div></td></tr>';
    } else {
      document.getElementById('rapportTable').innerHTML = transactions.map(t => `
        <tr>
          <td data-label="Type"><span class="badge badge-${t.type}">${t.type === 'entree' ? 'Entrée' : 'Sortie'}</span></td>
          <td data-label="Produit">${t.produit_nom || '-'}</td><td data-label="Client">${t.client_nom || '-'}</td><td data-label="Qté">${t.quantite}</td>
          <td data-label="P.U.">${fmtMoney(t.prix_unitaire)}</td><td data-label="Total">${fmtMoney(t.montant_total)}</td><td data-label="Date">${fmtDate(t.date)}</td>
        </tr>
      `).join('');
    }
  } catch (err) { toast(err.message, 'error'); }
}

// ===== INIT =====
checkSession();
