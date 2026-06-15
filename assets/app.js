const state = {
  items: [],
  needs: [],
  kind: "all",
  q: "",
  sort: "desc",
  favOnly: false,
  fav: new Set(JSON.parse(localStorage.getItem("ctbc.fav") || "[]")),
  recent: JSON.parse(localStorage.getItem("ctbc.recent") || "[]")
};

const $ = (selector) => document.querySelector(selector);

async function init() {
  try {
    const response = await fetch("data/catalog.json");
    if (!response.ok) throw new Error(`catalog ${response.status}`);
    const data = await response.json();
    state.items = data.items || [];
    state.needs = data.hrNeeds || [];
    renderNeeds();
    bindEvents();
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
          return item ? `<a class="mini-tag chip-link" href="${escapeAttr(item.htmlPath)}" target="_blank" rel="noopener" data-open="${escapeAttr(item.id)}">${escapeHtml(item.title)}</a>` : "";
        }).join("")}
      </div>
    </article>
  `).join("");
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
  document.addEventListener("keydown", (event) => {
    if (event.key === "/" && document.activeElement.tagName !== "INPUT") {
      event.preventDefault();
      $("#searchInput").focus();
    }
  });
}

function handleDocumentClick(event) {
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

  const openLink = event.target.closest("[data-open]");
  if (openLink) {
    const item = findItemById(openLink.dataset.open);
    if (item) addRecent(item);
  }
}

function renderLibrary() {
  const items = filteredItems();
  $("#resultCount").textContent = items.length ? "已更新工具清單" : "沒有符合條件的工具";
  $("#emptyState").hidden = items.length > 0;
  $("#libraryGrid").innerHTML = items.map(renderCard).join("");
}

function filteredItems() {
  const q = state.q.toLowerCase();
  const items = state.items.filter((item) => {
    if (state.kind !== "all" && item.kind !== state.kind) return false;
    if (state.favOnly && !state.fav.has(item.key)) return false;
    if (!q) return true;
    return [
      item.title,
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
  const summary = item.hrUseCase || fallbackSummary(item);
  return `
    <article class="tool-card" data-kind="${escapeAttr(item.kind)}">
      <div class="card-meta">
        <div><span class="kind">${escapeHtml(item.kind)}</span></div>
        <button class="fav-btn ${isFav ? "active" : ""}" type="button" data-fav="${escapeAttr(item.key)}" aria-label="切換收藏">${isFav ? "已藏" : "收藏"}</button>
      </div>
      <h3>${escapeHtml(item.title)}</h3>
      <p class="summary">${escapeHtml(summary)}</p>
      <div class="card-actions">
        <button type="button" class="primary-action" data-copy="${escapeAttr(item.id)}">複製</button>
        <a href="${escapeAttr(item.htmlPath)}" target="_blank" rel="noopener" data-open="${escapeAttr(item.id)}">開啟</a>
      </div>
    </article>
  `;
}

function fallbackSummary(item) {
  const subject = item.title || "這個工具";
  return `${subject}可作為課後延伸練習，先用非敏感範例試跑，再依中國信託 HR 的實際工作情境微調輸出。`;
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
  $("#recentList").innerHTML = state.recent.map((recent) => {
    const item = findItemById(recent.id);
    const href = item?.htmlPath || "#library";
    return `<li><a href="${escapeAttr(href)}" target="_blank" rel="noopener" data-open="${escapeAttr(recent.id)}">${escapeHtml(recent.title)}</a><br><span>${escapeHtml(recent.kind)}</span></li>`;
  }).join("");
}

function clearFilters() {
  state.kind = "all";
  state.favOnly = false;
  state.q = "";
  $("#searchInput").value = "";
  document.querySelectorAll("[data-kind]").forEach((node) => node.classList.toggle("active", node.dataset.kind === "all"));
  $("#favOnlyBtn").setAttribute("aria-pressed", "false");
  renderLibrary();
}

function findItemById(id) {
  return state.items.find((item) => item.id === id);
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
