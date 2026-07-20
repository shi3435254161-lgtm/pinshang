(() => {
  "use strict";

  const REPO = Object.freeze({
    owner: "shi3435254161-lgtm",
    name: "pinshang",
    branch: "main"
  });
  const TOKEN_KEY = "pinshang_mobile_admin_token";
  const API_ROOT = `https://api.github.com/repos/${REPO.owner}/${REPO.name}`;
  const MAX_PHOTOS = 6;

  const $ = (selector) => document.querySelector(selector);
  const views = {
    setup: $("#setupView"),
    catalog: $("#catalogView"),
    editor: $("#editorView"),
    settings: $("#settingsView")
  };

  let token = "";
  let data = null;
  let accountName = "";
  let baseCommitSha = "";
  let currentProduct = null;
  let isNewProduct = false;
  let isPublishing = false;
  let pendingImages = [];

  const listFields = ["sellingPoints", "buyingGuide", "installCheck", "included", "extras"];
  const fieldIds = {
    name: "#nameInput",
    category: "#categoryInput",
    price: "#priceInput",
    brand: "#brandInput",
    model: "#modelInput",
    description: "#descriptionInput",
    priceNote: "#priceNoteInput",
    sellingPoints: "#sellingPointsInput",
    specs: "#specsInput",
    buyingGuide: "#buyingGuideInput",
    installCheck: "#installCheckInput",
    included: "#includedInput",
    extras: "#extrasInput",
    faqs: "#faqsInput",
    notice: "#noticeInput"
  };

  function setView(name, title) {
    Object.entries(views).forEach(([key, element]) => {
      element.hidden = key !== name;
    });
    $("#pageTitle").textContent = title || "手机上货";
    $("#backButton").hidden = !["editor", "settings"].includes(name);
    $("#settingsButton").hidden = name !== "catalog";
    window.scrollTo({ top: 0, behavior: "instant" });
  }

  function setMessage(element, message, type = "") {
    element.textContent = message;
    element.dataset.type = type;
  }

  function setBusy(button, busy, busyText) {
    if (!button.dataset.label) button.dataset.label = button.textContent;
    button.disabled = busy;
    button.textContent = busy ? busyText : button.dataset.label;
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (character) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "\"": "&quot;",
      "'": "&#39;"
    })[character]);
  }

  function lines(value) {
    return String(value || "")
      .split(/\r?\n/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  function pairs(value) {
    return lines(value)
      .map((line) => {
        const index = line.search(/[=＝]/);
        return index === -1
          ? [line, ""]
          : [line.slice(0, index).trim(), line.slice(index + 1).trim()];
      })
      .filter(([key]) => key);
  }

  function formatList(value) {
    return Array.isArray(value) ? value.join("\n") : "";
  }

  function formatPairs(value) {
    return Array.isArray(value)
      ? value.map(([key, val]) => `${key}=${val}`).join("\n")
      : "";
  }

  function slugify(value) {
    const ascii = String(value || "")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
    return ascii || `product-${Date.now().toString(36)}`;
  }

  function friendlyError(error) {
    const message = String(error?.message || error || "未知错误");
    if (/401|Bad credentials/i.test(message)) return "管理员密钥无效或已过期，请让家人重新设置。";
    if (/403|Resource not accessible/i.test(message)) return "密钥没有商品仓库的写入权限，请检查 Contents 权限。";
    if (/409|changed on another device/i.test(message)) return "商品资料已在另一台设备更新，请先返回列表刷新后再改。";
    if (/Failed to fetch|NetworkError|network/i.test(message)) return "网络连接失败。请切换手机网络后重试，或稍后再发布。";
    return message;
  }

  async function github(path, options = {}) {
    const response = await fetch(`https://api.github.com${path}`, {
      ...options,
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
        "X-GitHub-Api-Version": "2022-11-28",
        ...(options.headers || {})
      }
    });
    let result = null;
    try {
      result = await response.json();
    } catch (_) {
      result = null;
    }
    if (!response.ok) {
      throw new Error(`${response.status} ${result?.message || response.statusText}`);
    }
    return result;
  }

  function base64ToUtf8(base64) {
    const binary = atob(base64.replace(/\s/g, ""));
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  }

  function arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    const chunkSize = 0x8000;
    let binary = "";
    for (let index = 0; index < bytes.length; index += chunkSize) {
      binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
    }
    return btoa(binary);
  }

  function parseDataFile(source) {
    const match = source.match(/window\.SHOP_DATA\s*=\s*([\s\S]*);\s*$/);
    if (!match) throw new Error("商品资料格式无法识别，请让家人检查 data.js。 ");
    return JSON.parse(match[1]);
  }

  function serializeDataFile(shopData) {
    return `/*\n * 店铺内容集中维护文件。\n * 可使用电脑商品助手或手机上货后台维护。\n */\nwindow.SHOP_DATA = ${JSON.stringify(shopData, null, 2)};\n`;
  }

  async function loadRepositoryData() {
    const [user, ref, file] = await Promise.all([
      github("/user"),
      github(`${API_ROOT.replace("https://api.github.com", "")}/git/ref/heads/${REPO.branch}`),
      github(`${API_ROOT.replace("https://api.github.com", "")}/contents/data.js?ref=${REPO.branch}`)
    ]);
    accountName = user.login;
    baseCommitSha = ref.object.sha;
    data = parseDataFile(base64ToUtf8(file.content));
    data.products = Array.isArray(data.products) ? data.products : [];
    data.categories = Array.isArray(data.categories) ? data.categories : ["全部"];
  }

  function fillCategoryOptions() {
    $("#categoryOptions").innerHTML = data.categories
      .filter((category) => category !== "全部")
      .map((category) => `<option value="${escapeHtml(category)}"></option>`)
      .join("");
  }

  function renderProducts() {
    const query = $("#searchInput").value.trim().toLowerCase();
    const products = data.products.filter((product) => {
      const haystack = [product.name, product.brand, product.model, product.category].join(" ").toLowerCase();
      return !query || haystack.includes(query);
    });
    $("#productList").innerHTML = products.map((product) => `
      <button class="product-item" type="button" data-product-id="${escapeHtml(product.id)}">
        ${product.image
          ? `<img src="${escapeHtml(product.image)}" alt="" loading="lazy">`
          : `<span class="product-placeholder">暂无图片</span>`}
        <span class="product-item__content">
          <strong>${escapeHtml(product.name || "未命名商品")}</strong>
          <span>${escapeHtml(product.category || "未分类")} · ${escapeHtml(product.price || "价格待确认")}</span>
          <span>${escapeHtml([product.brand, product.model].filter(Boolean).join(" ") || "品牌型号待补充")}</span>
        </span>
        <b aria-hidden="true">›</b>
      </button>
    `).join("");
    $("#emptyState").hidden = products.length > 0;
  }

  function showCatalog() {
    pendingImages.forEach((item) => URL.revokeObjectURL(item.preview));
    pendingImages = [];
    currentProduct = null;
    renderProducts();
    setView("catalog", "商品列表");
  }

  function productTemplate() {
    return {
      id: `product-${Date.now().toString(36)}`,
      category: data.categories.find((item) => item !== "全部") || "卫浴",
      name: "",
      brand: "",
      model: "",
      price: "价格待确认",
      priceNote: "价格以到店或微信确认为准",
      image: "",
      description: "",
      tags: ["可咨询"],
      aliases: [],
      gallery: [],
      sellingPoints: [],
      specs: [],
      buyingGuide: ["购买前建议先发现场照片。"],
      installCheck: ["说明所在村镇，确认是否在服务范围内。"],
      included: ["基础安装内容请先咨询确认。"],
      extras: ["拆旧", "额外配件", "特殊施工"],
      faqs: [["村里能上门吗？", "宁陵县及周边乡村可咨询，较远村镇请提前确认。"]],
      notice: "具体价格、配置和安装条件以咨询确认结果为准。"
    };
  }

  function normalizeProduct(product) {
    return { ...productTemplate(), ...JSON.parse(JSON.stringify(product)) };
  }

  function fillEditor(product) {
    Object.entries(fieldIds).forEach(([key, selector]) => {
      const input = $(selector);
      if (listFields.includes(key)) input.value = formatList(product[key]);
      else if (["specs", "faqs"].includes(key)) input.value = formatPairs(product[key]);
      else input.value = product[key] || "";
    });
    renderPhotos();
    $("#dangerZone").hidden = isNewProduct;
    setMessage($("#publishMessage"), "填写后点右侧按钮发布");
  }

  function readEditor() {
    const product = { ...currentProduct };
    Object.entries(fieldIds).forEach(([key, selector]) => {
      const value = $(selector).value.trim();
      if (listFields.includes(key)) product[key] = lines(value);
      else if (["specs", "faqs"].includes(key)) product[key] = pairs(value);
      else product[key] = value;
    });
    product.id = isNewProduct ? slugify(product.model || product.name) : product.id;
    const gallery = [...new Set([...(product.gallery || []), ...pendingImages.map((item) => item.path)].filter(Boolean))];
    product.gallery = gallery;
    product.image = gallery[0] || "";
    if (!product.tags?.length) product.tags = ["可咨询"];
    product.aliases = Array.isArray(product.aliases) ? product.aliases : [];
    return product;
  }

  function openEditor(product, isNew = false) {
    currentProduct = normalizeProduct(product);
    isNewProduct = isNew;
    pendingImages = [];
    fillEditor(currentProduct);
    setView("editor", isNew ? "新增商品" : "编辑商品");
  }

  function renderPhotos() {
    const existing = currentProduct.gallery || [];
    const photos = [
      ...existing.map((path) => ({ path, src: path, pending: false })),
      ...pendingImages.map((item) => ({ path: item.path, src: item.preview, pending: true }))
    ];
    if (!photos.length) {
      $("#photoList").innerHTML = `<div class="photo-empty">还没有照片，点“拍照 / 选图”添加</div>`;
      return;
    }
    $("#photoList").innerHTML = photos.map((photo, index) => `
      <div class="photo-item">
        <img src="${escapeHtml(photo.src)}" alt="第 ${index + 1} 张商品照片">
        ${index === 0 ? `<span class="photo-item__main">主图</span>` : ""}
        <button class="photo-item__remove" type="button" data-photo-path="${escapeHtml(photo.path)}" aria-label="删除这张照片">×</button>
      </div>
    `).join("");
  }

  function loadImage(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const image = new Image();
      image.onload = () => {
        URL.revokeObjectURL(url);
        resolve(image);
      };
      image.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("这张照片无法读取，请换一张 JPG 或 PNG 图片。"));
      };
      image.src = url;
    });
  }

  async function compressImage(file, index) {
    const image = await loadImage(file);
    const maxEdge = 1600;
    const ratio = Math.min(1, maxEdge / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * ratio));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * ratio));
    const context = canvas.getContext("2d", { alpha: false });
    context.fillStyle = "#fff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.84));
    if (!blob) throw new Error("照片压缩失败，请换一张照片。 ");
    const stem = slugify($("#modelInput").value || $("#nameInput").value || "product");
    const path = `assets/products/${stem}-${Date.now()}-${index + 1}.jpg`;
    return {
      path,
      preview: URL.createObjectURL(blob),
      base64: arrayBufferToBase64(await blob.arrayBuffer())
    };
  }

  async function addPhotos(files) {
    const remaining = MAX_PHOTOS - (currentProduct.gallery || []).length - pendingImages.length;
    if (remaining <= 0) {
      setMessage($("#publishMessage"), `最多上传 ${MAX_PHOTOS} 张照片。`, "error");
      return;
    }
    const selected = Array.from(files).slice(0, remaining);
    setMessage($("#publishMessage"), "正在处理照片，请稍候...");
    for (let index = 0; index < selected.length; index += 1) {
      pendingImages.push(await compressImage(selected[index], pendingImages.length));
    }
    renderPhotos();
    setMessage($("#publishMessage"), `已加入 ${selected.length} 张照片，还没有发布。`, "success");
    $("#photoInput").value = "";
  }

  function removePhoto(path) {
    const pending = pendingImages.find((item) => item.path === path);
    if (pending) URL.revokeObjectURL(pending.preview);
    pendingImages = pendingImages.filter((item) => item.path !== path);
    currentProduct.gallery = (currentProduct.gallery || []).filter((item) => item !== path);
    if (currentProduct.image === path) currentProduct.image = currentProduct.gallery[0] || "";
    renderPhotos();
    setMessage($("#publishMessage"), "照片已从这个商品移除，发布后生效。");
  }

  async function createBlob(content, encoding = "utf-8") {
    return github(`${API_ROOT.replace("https://api.github.com", "")}/git/blobs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, encoding })
    });
  }

  async function publishData(commitMessage) {
    const repoPath = API_ROOT.replace("https://api.github.com", "");
    const ref = await github(`${repoPath}/git/ref/heads/${REPO.branch}`);
    if (ref.object.sha !== baseCommitSha) {
      throw new Error("409 changed on another device");
    }
    const baseCommit = await github(`${repoPath}/git/commits/${baseCommitSha}`);
    const treeEntries = [];
    for (const image of pendingImages) {
      const blob = await createBlob(image.base64, "base64");
      treeEntries.push({ path: image.path, mode: "100644", type: "blob", sha: blob.sha });
    }
    const dataBlob = await createBlob(serializeDataFile(data));
    treeEntries.push({ path: "data.js", mode: "100644", type: "blob", sha: dataBlob.sha });
    const tree = await github(`${repoPath}/git/trees`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ base_tree: baseCommit.tree.sha, tree: treeEntries })
    });
    const commit = await github(`${repoPath}/git/commits`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: commitMessage, tree: tree.sha, parents: [baseCommitSha] })
    });
    await github(`${repoPath}/git/refs/heads/${REPO.branch}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sha: commit.sha, force: false })
    });
    baseCommitSha = commit.sha;
  }

  async function publishCurrentProduct() {
    if (isPublishing) return;
    const product = readEditor();
    if (!product.name) throw new Error("请先填写商品名称。 ");
    if (!product.category) throw new Error("请先填写商品分类。 ");
    const duplicate = data.products.find((item) => item.id === product.id && item.id !== currentProduct.id);
    if (duplicate) product.id = `${product.id}-${Date.now().toString(36)}`;
    const dataBeforePublish = JSON.stringify(data);
    const index = data.products.findIndex((item) => item.id === currentProduct.id || item.id === product.id);
    if (index === -1) data.products.push(product);
    else data.products[index] = product;
    if (!data.categories.includes(product.category)) data.categories.push(product.category);

    isPublishing = true;
    setBusy($("#publishButton"), true, "正在发布...");
    setMessage($("#publishMessage"), pendingImages.length ? "正在上传照片和商品资料..." : "正在更新商品资料...");
    try {
      await publishData(`${isNewProduct ? "add" : "update"} product ${product.name}`);
      pendingImages.forEach((item) => URL.revokeObjectURL(item.preview));
      pendingImages = [];
      currentProduct = JSON.parse(JSON.stringify(product));
      isNewProduct = false;
      fillCategoryOptions();
      fillEditor(currentProduct);
      setMessage($("#publishMessage"), "发布成功，客户网站通常 1-3 分钟后更新。", "success");
      $("#dangerZone").hidden = false;
    } catch (error) {
      data = JSON.parse(dataBeforePublish);
      setMessage($("#publishMessage"), friendlyError(error), "error");
      throw error;
    } finally {
      isPublishing = false;
      setBusy($("#publishButton"), false);
    }
  }

  async function deleteCurrentProduct() {
    if (!currentProduct || isPublishing) return;
    if (!confirm(`确定删除“${currentProduct.name}”吗？发布后客户将看不到它。`)) return;
    const dataBeforeDelete = JSON.stringify(data);
    data.products = data.products.filter((item) => item.id !== currentProduct.id);
    isPublishing = true;
    setBusy($("#deleteButton"), true, "正在删除...");
    setMessage($("#publishMessage"), "正在发布删除操作...");
    try {
      await publishData(`remove product ${currentProduct.name}`);
      showCatalog();
    } catch (error) {
      data = JSON.parse(dataBeforeDelete);
      setMessage($("#publishMessage"), friendlyError(error), "error");
    } finally {
      isPublishing = false;
      setBusy($("#deleteButton"), false);
    }
  }

  async function connect(inputToken) {
    token = inputToken.trim();
    if (!token) throw new Error("请粘贴管理员密钥。 ");
    await loadRepositoryData();
    localStorage.setItem(TOKEN_KEY, token);
    fillCategoryOptions();
    $("#accountLabel").textContent = `已连接 · ${accountName}`;
    $("#settingsAccount").textContent = accountName;
    showCatalog();
  }

  async function initialize() {
    const savedToken = localStorage.getItem(TOKEN_KEY) || "";
    if (!savedToken) {
      setView("setup", "手机上货");
      return;
    }
    setMessage($("#setupMessage"), "正在连接商品库...");
    setBusy($("#connectButton"), true, "正在连接...");
    try {
      await connect(savedToken);
    } catch (error) {
      localStorage.removeItem(TOKEN_KEY);
      token = "";
      $("#tokenInput").value = "";
      setView("setup", "手机上货");
      setMessage($("#setupMessage"), friendlyError(error), "error");
    } finally {
      setBusy($("#connectButton"), false);
    }
  }

  $("#setupForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    setBusy($("#connectButton"), true, "正在连接...");
    setMessage($("#setupMessage"), "正在验证权限...");
    try {
      await connect($("#tokenInput").value);
    } catch (error) {
      setMessage($("#setupMessage"), friendlyError(error), "error");
    } finally {
      setBusy($("#connectButton"), false);
    }
  });

  $("#toggleTokenButton").addEventListener("click", () => {
    const input = $("#tokenInput");
    input.type = input.type === "password" ? "text" : "password";
    $("#toggleTokenButton").textContent = input.type === "password" ? "显示" : "隐藏";
  });

  $("#searchInput").addEventListener("input", renderProducts);
  $("#productList").addEventListener("click", (event) => {
    const button = event.target.closest("[data-product-id]");
    if (!button) return;
    const product = data.products.find((item) => item.id === button.dataset.productId);
    if (product) openEditor(product);
  });
  $("#addButton").addEventListener("click", () => openEditor(productTemplate(), true));
  $("#photoInput").addEventListener("change", (event) => {
    addPhotos(event.target.files).catch((error) => {
      setMessage($("#publishMessage"), friendlyError(error), "error");
    });
  });
  $("#photoList").addEventListener("click", (event) => {
    const button = event.target.closest("[data-photo-path]");
    if (button) removePhoto(button.dataset.photoPath);
  });
  $("#productForm").addEventListener("submit", (event) => {
    event.preventDefault();
    publishCurrentProduct().catch(() => {});
  });
  $("#deleteButton").addEventListener("click", deleteCurrentProduct);
  $("#reloadButton").addEventListener("click", async () => {
    setBusy($("#reloadButton"), true, "刷新中...");
    try {
      await loadRepositoryData();
      fillCategoryOptions();
      renderProducts();
      $("#accountLabel").textContent = `已刷新 · ${new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}`;
    } catch (error) {
      $("#accountLabel").textContent = friendlyError(error);
    } finally {
      setBusy($("#reloadButton"), false);
    }
  });
  $("#settingsButton").addEventListener("click", () => setView("settings", "管理设置"));
  $("#backButton").addEventListener("click", showCatalog);
  $("#disconnectButton").addEventListener("click", () => {
    if (!confirm("确定清除这台手机的管理权限吗？商品不会被删除。")) return;
    localStorage.removeItem(TOKEN_KEY);
    location.reload();
  });

  initialize();
})();
