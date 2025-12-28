const DATA = Array.isArray(window.CHECKLIST_DATA) ? window.CHECKLIST_DATA : [];

const STORAGE_KEY = "movinglist-checklist-v1";
const CUSTOM_STORAGE_KEY = "movinglist-custom-items-v1";

const MAGASINS_ORDER = ["JUMBO", "STEPHANIS", "ALPHAMEGA", "SUPERHOME CENTER"];

const CATEGORY_ORDER = [
  "Cuisine : manger & cuisiner",
  "Ménage (matériel “sec”)",
  "Salle de bain (hors liquides)",
  "Chambre & dressing",
  "“Installation appartement” (divers)",
  "Petits appareils indispensables",
  "Nettoyage & linge",
  "Électricité & connectique",
  "Hygiène / salle de bain",
  "Produits ménagers (liquides)",
  "Lessive",
  "Placard “Jour 1”",
  "Bricolage (optionnel — si besoin)"
];

const CATEGORY_FILTERS = [
  { label: "Cuisine", value: "Cuisine : manger & cuisiner" },
  { label: "Ménage", value: "Ménage (matériel “sec”)" },
  { label: "Salle de bain", value: "Salle de bain (hors liquides)" },
  { label: "Chambre & dressing", value: "Chambre & dressing" },
  { label: "Divers", value: "“Installation appartement” (divers)" },
  { label: "Petits appareils", value: "Petits appareils indispensables" },
  { label: "Nettoyage & linge", value: "Nettoyage & linge" },
  { label: "Électricité & connectique", value: "Électricité & connectique" },
  { label: "Hygiène", value: "Hygiène / salle de bain" },
  { label: "Produits ménagers", value: "Produits ménagers (liquides)" },
  { label: "Lessive", value: "Lessive" },
  { label: "Placard “Jour 1”", value: "Placard “Jour 1”" },
  { label: "Bricolage", value: "Bricolage (optionnel — si besoin)" }
];

const state = {
  checkedById: {},
  customItems: [],
  search: "",
  missingOnly: false,
  filters: {
    magasins: new Set(),
    categories: new Set()
  },
  open: {
    shops: new Set(),
    categories: new Set()
  }
};

const elements = {
  searchInput: document.getElementById("search-input"),
  magasinFilters: document.getElementById("magasin-filters"),
  categorieFilters: document.getElementById("categorie-filters"),
  listContainer: document.getElementById("list-container"),
  overallProgress: document.getElementById("overall-progress"),
  overallProgressText: document.getElementById("overall-progress-text"),
  missingCount: document.getElementById("missing-count"),
  missingToggle: document.getElementById("missing-only-toggle"),
  exportBtn: document.getElementById("export-btn"),
  importBtn: document.getElementById("import-btn"),
  importFile: document.getElementById("import-file"),
  resetBtn: document.getElementById("reset-btn"),
  resetModal: document.getElementById("reset-modal"),
  cancelReset: document.getElementById("cancel-reset"),
  confirmReset: document.getElementById("confirm-reset"),
  menuToggle: document.getElementById("menu-toggle"),
  toolbar: document.getElementById("toolbar"),
  toolbarSpacer: document.getElementById("toolbar-spacer"),
  addItemBtn: document.getElementById("add-item-btn"),
  addModal: document.getElementById("add-modal"),
  addForm: document.getElementById("add-form"),
  addMagasin: document.getElementById("add-magasin"),
  addCategorie: document.getElementById("add-categorie"),
  addLibelle: document.getElementById("add-libelle"),
  addNotes: document.getElementById("add-notes"),
  cancelAdd: document.getElementById("cancel-add")
};

const safeShopOrder = MAGASINS_ORDER.filter((shop) => DATA.some((item) => item.magasin === shop));

function normalizeText(value) {
  if (!value) {
    return "";
  }
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/’/g, "'");
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function loadCheckedState() {
  let saved = {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        saved = parsed.checked && typeof parsed.checked === "object" ? parsed.checked : parsed;
      }
    }
  } catch (error) {
    saved = {};
  }

  DATA.forEach((item) => {
    state.checkedById[item.id] = Boolean(saved[item.id]);
  });
}

function sanitizeCustomItem(item) {
  if (!item || typeof item !== "object") {
    return null;
  }
  if (!item.id || !item.magasin || !item.categorie || !item.libelle) {
    return null;
  }
  return {
    id: String(item.id),
    magasin: String(item.magasin),
    categorie: String(item.categorie),
    libelle: String(item.libelle),
    notes: item.notes ? String(item.notes) : ""
  };
}

function loadCustomItems() {
  let items = [];
  try {
    const raw = localStorage.getItem(CUSTOM_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        items = parsed.map(sanitizeCustomItem).filter(Boolean);
      }
    }
  } catch (error) {
    items = [];
  }
  state.customItems = items;
  items.forEach((item) => {
    if (state.checkedById[item.id] === undefined) {
      state.checkedById[item.id] = false;
    }
  });
}

function saveCustomItems() {
  try {
    localStorage.setItem(CUSTOM_STORAGE_KEY, JSON.stringify(state.customItems));
  } catch (error) {
    // Ignore storage errors.
  }
}

function saveCheckedState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ checked: state.checkedById }));
  } catch (error) {
    // Ignore storage errors (private mode, quota, etc.).
  }
}

function getAllItems() {
  return DATA.concat(state.customItems);
}

function computeStats() {
  const overall = { total: 0, checked: 0 };
  const byShop = {};
  const byShopCategory = {};

  getAllItems().forEach((item) => {
    const checked = Boolean(state.checkedById[item.id]);
    overall.total += 1;
    if (checked) {
      overall.checked += 1;
    }

    if (!byShop[item.magasin]) {
      byShop[item.magasin] = { total: 0, checked: 0 };
    }
    byShop[item.magasin].total += 1;
    if (checked) {
      byShop[item.magasin].checked += 1;
    }

    const shopKey = `${item.magasin}||${item.categorie}`;
    if (!byShopCategory[shopKey]) {
      byShopCategory[shopKey] = { total: 0, checked: 0 };
    }
    byShopCategory[shopKey].total += 1;
    if (checked) {
      byShopCategory[shopKey].checked += 1;
    }
  });

  return { overall, byShop, byShopCategory };
}

function updateHeader(stats) {
  const percent = stats.overall.total
    ? Math.round((stats.overall.checked / stats.overall.total) * 100)
    : 0;
  const missing = stats.overall.total - stats.overall.checked;

  elements.overallProgress.style.width = `${percent}%`;
  elements.overallProgress.setAttribute("aria-valuenow", String(percent));
  elements.overallProgressText.textContent = `${percent}%`;
  elements.missingCount.textContent = String(missing);
}

function matchesFilters(item) {
  if (state.filters.magasins.size > 0 && !state.filters.magasins.has(item.magasin)) {
    return false;
  }
  if (state.filters.categories.size > 0 && !state.filters.categories.has(item.categorie)) {
    return false;
  }
  if (state.missingOnly && state.checkedById[item.id]) {
    return false;
  }

  const searchValue = normalizeText(state.search.trim());
  if (searchValue) {
    const label = normalizeText(item.libelle);
    return label.includes(searchValue);
  }
  return true;
}

function groupItems(items) {
  const grouped = {};
  items.forEach((item) => {
    if (!grouped[item.magasin]) {
      grouped[item.magasin] = {};
    }
    if (!grouped[item.magasin][item.categorie]) {
      grouped[item.magasin][item.categorie] = [];
    }
    grouped[item.magasin][item.categorie].push(item);
  });
  return grouped;
}

function captureOpenState() {
  const shopDetails = elements.listContainer.querySelectorAll("details.shop");
  if (shopDetails.length) {
    const nextShopSet = new Set(state.open.shops);
    shopDetails.forEach((details) => {
      const shop = details.dataset.shop;
      if (details.open) {
        nextShopSet.add(shop);
      } else {
        nextShopSet.delete(shop);
      }
    });
    state.open.shops = nextShopSet;
  }

  const categoryDetails = elements.listContainer.querySelectorAll("details.category");
  if (categoryDetails.length) {
    const nextCategorySet = new Set(state.open.categories);
    categoryDetails.forEach((details) => {
      const key = details.dataset.key;
      if (details.open) {
        nextCategorySet.add(key);
      } else {
        nextCategorySet.delete(key);
      }
    });
    state.open.categories = nextCategorySet;
  }
}

function renderFilters() {
  const magasinChips = [
    `<button type="button" class="chip ${state.filters.magasins.size === 0 ? "active" : ""}" data-group="magasins" data-value="__all__">Tous</button>`
  ];
  safeShopOrder.forEach((shop) => {
    const active = state.filters.magasins.has(shop) ? "active" : "";
    magasinChips.push(
      `<button type="button" class="chip ${active}" data-group="magasins" data-value="${escapeHtml(shop)}">${escapeHtml(shop)}</button>`
    );
  });
  elements.magasinFilters.innerHTML = magasinChips.join("");

  const categorieChips = [
    `<button type="button" class="chip ${state.filters.categories.size === 0 ? "active" : ""}" data-group="categories" data-value="__all__">Toutes</button>`
  ];
  CATEGORY_FILTERS.forEach((category) => {
    const active = state.filters.categories.has(category.value) ? "active" : "";
    categorieChips.push(
      `<button type="button" class="chip ${active}" data-group="categories" data-value="${escapeHtml(category.value)}">${escapeHtml(category.label)}</button>`
    );
  });
  elements.categorieFilters.innerHTML = categorieChips.join("");
}

function renderList() {
  captureOpenState();
  const stats = computeStats();
  updateHeader(stats);

  const filteredItems = getAllItems().filter((item) => matchesFilters(item));
  if (!filteredItems.length) {
    elements.listContainer.innerHTML =
      '<div class="empty-state">Aucun élément ne correspond à vos filtres.</div>';
    return;
  }

  const grouped = groupItems(filteredItems);
  const shopHtml = safeShopOrder
    .filter((shop) => grouped[shop])
    .map((shop, shopIndex) => {
      const shopStats = stats.byShop[shop] || { total: 0, checked: 0 };
      const shopPercent = shopStats.total
        ? Math.round((shopStats.checked / shopStats.total) * 100)
        : 0;
      const shopDelay = `${(shopIndex * 0.06).toFixed(2)}s`;
      const safeShop = escapeHtml(shop);
      const openShop = state.open.shops.has(shop) ? "open" : "";

      const categoriesHtml = CATEGORY_ORDER.filter((cat) => grouped[shop][cat])
        .map((category, categoryIndex) => {
          const key = `${shop}||${category}`;
          const safeCategory = escapeHtml(category);
          const catStats = stats.byShopCategory[key] || { total: 0, checked: 0 };
          const catPercent = catStats.total
            ? Math.round((catStats.checked / catStats.total) * 100)
            : 0;
          const catDelay = `${(categoryIndex * 0.05).toFixed(2)}s`;
          const openCategory = state.open.categories.has(key) ? "open" : "";

          const itemsHtml = grouped[shop][category]
            .map((item, itemIndex) => {
              const checked = Boolean(state.checkedById[item.id]);
              const itemDelay = `${((itemIndex % 12) * 0.02).toFixed(2)}s`;
              const itemId = `item-${item.id}`;
              return `
                <li class="item ${checked ? "is-done" : ""}" style="--delay:${itemDelay}">
                  <label class="item-row" for="${itemId}">
                    <input class="item-checkbox" data-id="${item.id}" type="checkbox" id="${itemId}" ${checked ? "checked" : ""}>
                    <span>${escapeHtml(item.libelle)}</span>
                  </label>
                </li>
              `;
            })
            .join("");

          return `
            <details class="category" data-key="${escapeHtml(key)}" data-category="${safeCategory}" ${openCategory} style="--delay:${catDelay}">
              <summary class="category-summary">
                <div class="summary-main">
                  <div>
                    <div class="summary-kicker">Catégorie</div>
                    <h3>${safeCategory}</h3>
                  </div>
                  <div class="summary-stats">
                    <span class="summary-count">${catStats.checked}/${catStats.total}</span>
                    <div class="mini-progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${catPercent}">
                      <div class="mini-fill" style="width:${catPercent}%"></div>
                    </div>
                  </div>
                </div>
                <div class="summary-actions">
                  <button type="button" class="chip small" data-action="check" data-scope="categorie" data-value="${safeCategory}">Tout cocher</button>
                  <button type="button" class="chip small" data-action="uncheck" data-scope="categorie" data-value="${safeCategory}">Tout décocher</button>
                </div>
              </summary>
              <ul class="item-list">
                ${itemsHtml}
              </ul>
            </details>
          `;
        })
        .join("");

      return `
        <details class="shop" data-shop="${safeShop}" ${openShop} style="--delay:${shopDelay}">
          <summary class="shop-summary">
            <div class="summary-main">
              <div>
                <div class="summary-kicker">Magasin</div>
                <h2>${safeShop}</h2>
              </div>
              <div class="summary-stats">
                <span class="summary-count">${shopStats.checked}/${shopStats.total}</span>
                <div class="mini-progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${shopPercent}">
                  <div class="mini-fill" style="width:${shopPercent}%"></div>
                </div>
              </div>
            </div>
            <div class="summary-actions">
              <button type="button" class="chip small" data-action="check" data-scope="magasin" data-value="${safeShop}">Tout cocher</button>
              <button type="button" class="chip small" data-action="uncheck" data-scope="magasin" data-value="${safeShop}">Tout décocher</button>
            </div>
          </summary>
          <div class="category-stack">
            ${categoriesHtml}
          </div>
        </details>
      `;
    })
    .join("");

  elements.listContainer.innerHTML = shopHtml;
}

function applyBulkAction(scope, value, shouldCheck) {
  const items = getAllItems().filter((item) =>
    scope === "magasin" ? item.magasin === value : item.categorie === value
  );
  items.forEach((item) => {
    state.checkedById[item.id] = shouldCheck;
  });
  saveCheckedState();
  renderList();
}

function openResetModal() {
  elements.resetModal.classList.remove("hidden");
  elements.cancelReset.focus();
}

function closeResetModal() {
  elements.resetModal.classList.add("hidden");
}

function openAddModal() {
  elements.addModal.classList.remove("hidden");
  elements.addLibelle.focus();
}

function closeAddModal() {
  elements.addModal.classList.add("hidden");
  elements.addForm.reset();
}

function setToolbarOpen(isOpen) {
  elements.toolbar.classList.toggle("is-hidden", !isOpen);
  elements.toolbarSpacer.classList.toggle("hidden", !isOpen);
  elements.menuToggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
}

function exportJson() {
  const payload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    customItems: state.customItems,
    checked: state.checkedById
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "movinglist-limassol.json";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function parseImportedData(payload) {
  if (!payload || typeof payload !== "object") {
    return null;
  }
  if (Array.isArray(payload.customItems)) {
    state.customItems = payload.customItems.map(sanitizeCustomItem).filter(Boolean);
    saveCustomItems();
  }
  if (payload.checked && typeof payload.checked === "object") {
    return payload.checked;
  }
  if (payload.checkedById && typeof payload.checkedById === "object") {
    return payload.checkedById;
  }
  if (Array.isArray(payload)) {
    const map = {};
    payload.forEach((id) => {
      map[id] = true;
    });
    return map;
  }
  return null;
}

function importJsonFile(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(reader.result);
      const importedChecked = parseImportedData(parsed);
      if (!importedChecked) {
        window.alert("Le fichier importé ne contient pas de données valides.");
        return;
      }
      getAllItems().forEach((item) => {
        state.checkedById[item.id] = Boolean(importedChecked[item.id]);
      });
      saveCheckedState();
      renderList();
    } catch (error) {
      window.alert("Impossible de lire ce fichier JSON.");
    }
  };
  reader.readAsText(file);
}

function bindEvents() {
  elements.searchInput.addEventListener("input", (event) => {
    state.search = event.target.value;
    renderList();
  });

  elements.missingToggle.addEventListener("change", (event) => {
    state.missingOnly = event.target.checked;
    renderList();
  });

  document.addEventListener("click", (event) => {
    const chip = event.target.closest(".chip[data-group]");
    if (!chip) {
      return;
    }
    const group = chip.dataset.group;
    const value = chip.dataset.value;
    const set = group === "magasins" ? state.filters.magasins : state.filters.categories;

    if (value === "__all__") {
      set.clear();
    } else if (set.has(value)) {
      set.delete(value);
    } else {
      set.add(value);
    }
    renderFilters();
    renderList();
  });

  elements.listContainer.addEventListener("click", (event) => {
    const actionBtn = event.target.closest("[data-action]");
    if (!actionBtn) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    const scope = actionBtn.dataset.scope;
    const value = actionBtn.dataset.value;
    const shouldCheck = actionBtn.dataset.action === "check";
    applyBulkAction(scope, value, shouldCheck);
  });

  elements.listContainer.addEventListener("change", (event) => {
    if (!event.target.classList.contains("item-checkbox")) {
      return;
    }
    const id = event.target.dataset.id;
    state.checkedById[id] = event.target.checked;
    saveCheckedState();
    renderList();
  });

  elements.listContainer.addEventListener(
    "toggle",
    (event) => {
      if (event.target.classList.contains("shop")) {
        const shop = event.target.dataset.shop;
        if (event.target.open) {
          state.open.shops.add(shop);
        } else {
          state.open.shops.delete(shop);
        }
      }
      if (event.target.classList.contains("category")) {
        const key = event.target.dataset.key;
        if (event.target.open) {
          state.open.categories.add(key);
        } else {
          state.open.categories.delete(key);
        }
      }
    },
    true
  );

  elements.exportBtn.addEventListener("click", exportJson);

  elements.importBtn.addEventListener("click", () => {
    elements.importFile.click();
  });

  elements.importFile.addEventListener("change", (event) => {
    const file = event.target.files[0];
    if (file) {
      importJsonFile(file);
    }
    event.target.value = "";
  });

  elements.resetBtn.addEventListener("click", openResetModal);
  elements.cancelReset.addEventListener("click", closeResetModal);
  elements.confirmReset.addEventListener("click", () => {
    DATA.forEach((item) => {
      state.checkedById[item.id] = false;
    });
    saveCheckedState();
    renderList();
    closeResetModal();
  });

  elements.resetModal.addEventListener("click", (event) => {
    if (event.target === elements.resetModal) {
      closeResetModal();
    }
  });

  elements.addItemBtn.addEventListener("click", openAddModal);
  elements.cancelAdd.addEventListener("click", closeAddModal);
  elements.addModal.addEventListener("click", (event) => {
    if (event.target === elements.addModal) {
      closeAddModal();
    }
  });

  elements.addForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const magasin = elements.addMagasin.value;
    const categorie = elements.addCategorie.value;
    const libelle = elements.addLibelle.value.trim();
    const notes = elements.addNotes.value.trim();
    if (!magasin || !categorie || !libelle) {
      return;
    }

    const newItem = {
      id: `custom-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
      magasin,
      categorie,
      libelle,
      notes
    };
    state.customItems.push(newItem);
    state.checkedById[newItem.id] = false;
    saveCustomItems();
    saveCheckedState();
    renderList();
    closeAddModal();
  });

  elements.menuToggle.addEventListener("click", () => {
    const isOpen = !elements.toolbar.classList.contains("is-hidden");
    setToolbarOpen(!isOpen);
  });
}

function init() {
  if (!DATA.length) {
    elements.listContainer.innerHTML = '<div class="empty-state">Checklist introuvable.</div>';
    return;
  }
  loadCheckedState();
  loadCustomItems();
  elements.searchInput.value = state.search;
  elements.missingToggle.checked = state.missingOnly;
  setToolbarOpen(false);
  MAGASINS_ORDER.forEach((magasin) => {
    const option = document.createElement("option");
    option.value = magasin;
    option.textContent = magasin;
    elements.addMagasin.appendChild(option);
  });
  CATEGORY_ORDER.forEach((categorie) => {
    const option = document.createElement("option");
    option.value = categorie;
    option.textContent = categorie;
    elements.addCategorie.appendChild(option);
  });
  renderFilters();
  bindEvents();
  renderList();
}

init();
