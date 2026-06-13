const state = {
  items: [],
  needs: [],
  recommended: [],
  kind: "all",
  license: "all",
  q: "",
  tags: new Set(),
  sort: "desc",
  favOnly: false,
  fav: new Set(JSON.parse(localStorage.getItem("ctbc.fav") || "[]")),
  recent: JSON.parse(localStorage.getItem("ctbc.recent") || "[]"),
  activeItem: null
};

const labels = {
  task: {
    writing: "寫作",
    analysis: "分析",
    communication: "溝通",
    planning: "規劃",
    learning: "學習",
    automation: "自動化",
    strategy: "策略",
    compliance: "法規規章",
    recruiting: "招募面談",
    training: "教育訓練",
    knowledge: "知識整理"
  },
  tool: {
    outlook: "Outlook",
    teams: "Teams",
    excel: "Excel",
    powerpoint: "PowerPoint",
    word: "Word",
    general: "通用"
  }
};

const taskOrder = ["writing", "analysis", "communication", "planning", "learning", "automation", "strategy", "compliance", "recruiting", "training", "knowledge"];
const toolOrder = ["outlook", "teams", "excel", "powerpoint", "word", "general"];

const $ = (selector) => document.querySelector(selector);

async function init() {
  try {
    const response = await fetch("data/catalog.json");
    if (!response.ok) throw new Error(`catalog ${response.status}`);
    const data = await response.json();
    state.items = data.items || [];
    state.needs = data.hrNeeds || [];
    state.recommended = data.recommendedIds || [];
    renderNeeds();
    renderFilters();
    bindEvents();
    renderRecommended();
    renderLibrary();
    renderRecent();
  } catch (error) {
    $("#libraryGrid").innerHTML = `<div class="empty-state">資料載入失敗：${escapeHtml(error.message)}</div>`;
  }
}

function renderNeeds() {
  $("#needMap").innerHTML = state.needs.map((need) => `
    <article class="need-card">
      <h3>${escapeHtml(need.title)}</h3>
      <p>${escapeHtml(need.summary)}</p>
      <div class="tag-list">
        ${(need.relatedIds || []).map((id) => {
          const item = findItemById(id);
          return item ? `<button class="mini-tag chip-link" type="button" data-preview="${escapeAttr(item.id)}">${escapeHtml(item.title)}</button>` : "";
        }).join("")}
      </div>
    </article>
  `).join("");
}

function renderFilters() {
  $("#taskFilters").innerHTML = taskOrder.map((key) => filterChip("task", key)).join("");
  $("#toolFilters").innerHTML = toolOrder.map((key) => filterChip("tool", key)).join("");
}

function filterChip(type, key) {
  const count = state.items.filter((item) => (item[`${type}Tags`] || []).includes(key)).length;
  if (!count) return "";
  return `<button class="chip" type="button" data-tag="${type}:${key}">${escapeHtml(labels[type][key] || key)} <span>${count}</span></button>`;
}

function bindEvents() {
  $("#searchInput").addEventListener("input", (event) => {
    state.q = event.target.value.trim();
    renderLibrary();
  });

  document.querySelectorAll("[data-kind]").forEach((button) => {
    button.addEventListener("click", () => {
      state.kind = button.dataset.kind;
      document.querySelectorAll("[data-kind]").forEach((node) => node.classList.toggle("active", node === button));
      renderLibrary();
    });
  });

  document.querySelectorAll("[data-license]").forEach((button) => {
    button.addEventListener("click", () => {
      state.license = button.dataset.license;
      document.querySelectorAll("[data-license]").forEach((node) => node.classList.toggle("active", node === button));
      renderLibrary();
    });
  });

  $("#favOnlyBtn").addEventListener("click", () => {
    state.favOnly = !state.favOnly;
    $("#favOnlyBtn").setAttribute("aria-pressed", String(state.favOnly));
    renderLibrary();
  });

  $("#sortBtn").addEventListener("click", () => {
    state.sort = state.sort === "desc" ? "asc" : "desc";
    $("#sortBtn").textContent = state.sort === "desc" ? "名稱反向" : "名稱排序";
    renderLibrary();
  });

  $("#clearFiltersBtn").addEventListener("click", clearFilters);
  $("#clearRecentBtn").addEventListener("click", () => {
    state.recent = [];
    localStorage.removeItem("ctbc.recent");
    renderRecent();
  });

  document.addEventListener("click", handleDocumentClick);
  $("#modalClose").addEventListener("click", closeModal);
  $("#modal").addEventListener("click", (event) => {
    if (event.target.id === "modal") closeModal();
  });
  $("#modalCopy").addEventListener("click", () => copyItem(state.activeItem));
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeModal();
    if (event.key === "/" && document.activeElement.tagName !== "INPUT") {
      event.preventDefault();
      $("#searchInput").focus();
    }
  });
}

function handleDocumentClick(event) {
  const tagButton = event.target.closest("[data-tag]");
  if (tagButton) {
    const tag = tagButton.dataset.tag;
    if (state.tags.has(tag)) state.tags.delete(tag);
    else state.tags.add(tag);
    tagButton.classList.toggle("active", state.tags.has(tag));
    renderLibrary();
    return;
  }

  const previewButton = event.target.closest("[data-preview]");
  if (previewButton) {
    const item = findItemById(previewButton.dataset.preview);
    if (item) showModal(item);
    return;
  }

  const copyButton = event.target.closest("[data-copy]");
  if (copyButton) {
    const item = findItemById(copyButton.dataset.copy);
    if (item) copyItem(item);
    return;
  }

  const favButton = event.target.closest("[data-fav]");
  if (favButton) {
    toggleFav(favButton.dataset.fav);
    return;
  }

  const recentLink = event.target.closest("[data-recent]");
  if (recentLink) {
    const item = findItemById(recentLink.dataset.recent);
    if (item) showModal(item);
  }
}

function renderRecommended() {
  const items = state.recommended.map(findItemById).filter(Boolean);
  $("#recommendedGrid").innerHTML = items.map(renderCard).join("");
}

function renderLibrary() {
  const items = filteredItems();
  $("#resultCount").textContent = items.length ? "已更新工具清單" : "沒有符合條件的工具";
  $("#emptyState").hidden = items.length > 0;
  $("#libraryGrid").innerHTML = items.map(renderCard).join("");
}

function filteredItems() {
  const q = state.q.toLowerCase();
  const tags = Array.from(state.tags);
  const items = state.items.filter((item) => {
    if (state.kind !== "all" && item.kind !== state.kind) return false;
    if (state.license !== "all" && item.license !== state.license) return false;
    if (state.favOnly && !state.fav.has(item.key)) return false;
    if (tags.length && !tags.every((tag) => item.allTags.includes(tag))) return false;
    if (!q) return true;
    return [
      item.title,
      item.englishTitle,
      item.preview,
      item.hrUseCase,
      ...(item.taskTags || []),
      ...(item.toolTags || [])
    ].join(" ").toLowerCase().includes(q);
  });

  return items.sort((a, b) => {
    const direction = state.sort === "desc" ? -1 : 1;
    return a.title.localeCompare(b.title, "zh-Hant") * direction;
  });
}

function renderCard(item) {
  const isFav = state.fav.has(item.key);
  const licenseLabel = item.license === "required" ? "Premium" : "Basic";
  const tagHtml = item.allTags.slice(0, 4).map((tag) => `<span class="card-tag">${escapeHtml(tagLabel(tag))}</span>`).join("");
  return `
    <article class="tool-card" data-kind="${escapeAttr(item.kind)}">
      <div class="card-meta">
        <div><span class="kind">${escapeHtml(item.kind)}</span></div>
        <button class="fav-btn ${isFav ? "active" : ""}" type="button" data-fav="${escapeAttr(item.key)}" aria-label="切換收藏">${isFav ? "已藏" : "收藏"}</button>
      </div>
      <h3>${escapeHtml(item.title)}</h3>
      <p class="english-name">${escapeHtml(item.englishTitle || "")}</p>
      <p class="preview">${escapeHtml(item.hrUseCase || item.preview || "可作為課後練習工具，依工作情境調整後貼到 Copilot 使用。")}</p>
      <div class="card-tags">
        <span class="license-tag ${item.license === "required" ? "required" : ""}">${licenseLabel}</span>
        ${tagHtml}
      </div>
      <div class="card-actions">
        <button type="button" data-preview="${escapeAttr(item.id)}">預覽</button>
        <button type="button" class="primary-action" data-copy="${escapeAttr(item.id)}">複製</button>
        <a href="${escapeAttr(item.htmlPath)}" target="_blank" rel="noopener">開啟</a>
      </div>
    </article>
  `;
}

function showModal(item) {
  state.activeItem = item;
  $("#modalMeta").textContent = item.kind;
  $("#modalTitle").textContent = item.title;
  $("#modalFrame").src = item.htmlPath;
  $("#modalOpen").href = item.htmlPath;
  $("#modal").classList.add("open");
  $("#modal").setAttribute("aria-hidden", "false");
  addRecent(item);
}

function closeModal() {
  $("#modal").classList.remove("open");
  $("#modal").setAttribute("aria-hidden", "true");
  $("#modalFrame").src = "about:blank";
}

async function copyItem(item) {
  if (!item) return;
  const text = item.copyText || item.preview || item.title;
  try {
    await navigator.clipboard.writeText(text);
    toast("已複製，可貼到 Copilot 使用");
  } catch {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    textarea.remove();
    toast("已複製，可貼到 Copilot 使用");
  }
}

function toggleFav(key) {
  if (state.fav.has(key)) state.fav.delete(key);
  else state.fav.add(key);
  localStorage.setItem("ctbc.fav", JSON.stringify(Array.from(state.fav)));
  renderRecommended();
  renderLibrary();
}

function addRecent(item) {
  state.recent = [
    { id: item.id, title: item.title, kind: item.kind, time: Date.now() },
    ...state.recent.filter((recent) => recent.id !== item.id)
  ].slice(0, 8);
  localStorage.setItem("ctbc.recent", JSON.stringify(state.recent));
  renderRecent();
}

function renderRecent() {
  if (!state.recent.length) {
    $("#recentList").innerHTML = `<li>尚無瀏覽紀錄。</li>`;
    return;
  }
  $("#recentList").innerHTML = state.recent.map((recent) => `
    <li><a href="#recent-title" data-recent="${escapeAttr(recent.id)}">${escapeHtml(recent.title)}</a><br><span>${escapeHtml(recent.kind)}</span></li>
  `).join("");
}

function clearFilters() {
  state.kind = "all";
  state.license = "all";
  state.tags.clear();
  state.favOnly = false;
  state.q = "";
  $("#searchInput").value = "";
  document.querySelectorAll("[data-kind]").forEach((node) => node.classList.toggle("active", node.dataset.kind === "all"));
  document.querySelectorAll("[data-license]").forEach((node) => node.classList.toggle("active", node.dataset.license === "all"));
  document.querySelectorAll("[data-tag]").forEach((node) => node.classList.remove("active"));
  $("#favOnlyBtn").setAttribute("aria-pressed", "false");
  renderLibrary();
}

function findItemById(id) {
  return state.items.find((item) => item.id === id);
}

function tagLabel(tag) {
  const [type, key] = tag.split(":");
  return labels[type]?.[key] || key || tag;
}

function toast(message) {
  const node = $("#toast");
  node.textContent = message;
  node.classList.add("show");
  window.clearTimeout(toast.timer);
  toast.timer = window.setTimeout(() => node.classList.remove("show"), 1600);
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttr(value = "") {
  return escapeHtml(value);
}

init();
