(() => {
  "use strict";

  const $ = (selector) => document.querySelector(selector);
  const fields = [
    "id",
    "category",
    "name",
    "brand",
    "model",
    "price",
    "priceNote",
    "image",
    "videoUrl",
    "videoCover",
    "videoIntro",
    "description",
    "tags",
    "aliases",
    "gallery",
    "sellingPoints",
    "specs",
    "buyingGuide",
    "installCheck",
    "included",
    "extras",
    "faqs",
    "notice"
  ];
  const listFields = ["tags", "aliases", "gallery", "sellingPoints", "buyingGuide", "installCheck", "included", "extras"];
  const pairFields = ["specs", "faqs"];

  let data = null;
  let selectedId = "";
  let lastUploadedVideoPath = "";

  function setStatus(message, type) {
    const status = $("#statusLine");
    status.textContent = message;
    status.dataset.type = type || "";
  }

  function lines(value) {
    return String(value || "")
      .split(/\r?\n/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  function pairs(value) {
    return lines(value).map((line) => {
      const index = line.search(/[=：:]/);
      if (index === -1) return [line, ""];
      return [line.slice(0, index).trim(), line.slice(index + 1).trim()];
    }).filter(([key]) => key);
  }

  function formatList(value) {
    return Array.isArray(value) ? value.join("\n") : "";
  }

  function formatPairs(value) {
    return Array.isArray(value) ? value.map(([key, val]) => `${key}=${val}`).join("\n") : "";
  }

  function slugify(value) {
    const fallback = `product-${Date.now().toString(36)}`;
    return String(value || "")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "") || fallback;
  }

  function getSelectedProduct() {
    return data.products.find((product) => product.id === selectedId) || null;
  }

  function fillStore() {
    $("#storeName").value = data.store.name || "";
    $("#storeArea").value = data.store.serviceArea || "";
    $("#storePhone1").value = (data.store.phones || [])[0] || "";
    $("#storePhone2").value = (data.store.phones || [])[1] || "";
    $("#storeWechatQr").value = data.store.wechatQr || "";
    $("#storeWechatId").value = data.store.wechatId || "";
  }

  function readStore() {
    data.store.name = $("#storeName").value.trim();
    data.store.serviceArea = $("#storeArea").value.trim();
    data.store.phones = [$("#storePhone1").value.trim(), $("#storePhone2").value.trim()].filter(Boolean);
    data.store.wechatQr = $("#storeWechatQr").value.trim();
    data.store.wechatId = $("#storeWechatId").value.trim();
    data.store.wechatLink = data.store.wechatLink || "";
  }

  function fillCategoryOptions() {
    $("#categoryOptions").innerHTML = (data.categories || []).map((category) => `<option value="${escapeHtml(category)}"></option>`).join("");
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"]/g, (character) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "\"": "&quot;"
    })[character]);
  }

  function renderList() {
    const query = $("#productSearch").value.trim().toLowerCase();
    const products = data.products.filter((product) => {
      const text = [product.name, product.brand, product.model, product.category, product.price].join(" ").toLowerCase();
      return !query || text.includes(query);
    });
    $("#productList").innerHTML = products.map((product) => `
      <button type="button" data-id="${escapeHtml(product.id)}" aria-current="${product.id === selectedId}">
        <strong>${escapeHtml(product.name || "未命名商品")}</strong>
        <span>${escapeHtml(product.category || "未分类")} · ${escapeHtml(product.price || "未填价格")}</span>
      </button>
    `).join("");
  }

  function fillProduct(product) {
    selectedId = product.id;
    lastUploadedVideoPath = "";
    $("#editorTitle").textContent = product.name || "未命名商品";
    $("#editorHint").textContent = `${product.category || "未分类"} · ${product.id}`;
    fields.forEach((name) => {
      const input = $(`#${name}`);
      if (!input) return;
      if (listFields.includes(name)) input.value = formatList(product[name]);
      else if (pairFields.includes(name)) input.value = formatPairs(product[name]);
      else input.value = product[name] || "";
    });
    renderList();
  }

  function readProductFromForm() {
    const product = {};
    fields.forEach((name) => {
      const input = $(`#${name}`);
      if (!input) return;
      if (listFields.includes(name)) product[name] = lines(input.value);
      else if (pairFields.includes(name)) product[name] = pairs(input.value);
      else product[name] = input.value.trim();
    });
    product.id = slugify(product.id || product.name);
    if (!product.image && product.gallery.length) product.image = product.gallery[0];
    if (!product.gallery.includes(product.image) && product.image) product.gallery.unshift(product.image);
    return product;
  }

  function saveCurrentProduct() {
    readStore();
    const product = readProductFromForm();
    const duplicate = data.products.find((item) => item.id === product.id && item.id !== selectedId);
    if (duplicate) throw new Error(`商品 ID 已存在：${product.id}`);
    const index = data.products.findIndex((item) => item.id === selectedId);
    if (index === -1) data.products.push(product);
    else data.products[index] = product;
    if (!data.categories.includes(product.category)) {
      data.categories.push(product.category);
      fillCategoryOptions();
    }
    selectedId = product.id;
    fillProduct(product);
    setStatus("当前商品已保存到列表，记得再点“保存到 data.js”。", "success");
  }

  function createProduct() {
    const id = slugify("new-product");
    const product = {
      id,
      category: data.categories[1] || "卫浴",
      name: "新商品",
      brand: "品牌待确认",
      model: "型号待确认",
      image: "",
      videoUrl: "",
      videoCover: "",
      videoIntro: "",
      gallery: [],
      price: "价格待录入",
      priceNote: "价格以到店或微信确认为准",
      description: "这里写一句话介绍商品适合什么场景。",
      tags: ["可咨询"],
      aliases: [],
      sellingPoints: ["本地门店销售，价格、配送和安装可提前确认。"],
      specs: [["品牌", "待确认"], ["型号", "待确认"]],
      buyingGuide: ["购买前建议先发现场照片。"],
      installCheck: ["说明所在村镇，确认是否在服务范围内。"],
      included: ["基础安装内容待店内确认后公开"],
      extras: ["拆旧", "额外配件", "特殊施工"],
      faqs: [["村里能上门吗？", "宁陵县及周边乡村可咨询，较远村镇提前确认。"]],
      notice: "未确认的信息不要夸大，建议以实物和现场确认为准。"
    };
    data.products.push(product);
    fillProduct(product);
    setStatus("已新增商品模板，改完后点保存。", "success");
  }

  async function api(path, payload) {
    const response = await fetch(path, {
      method: payload ? "POST" : "GET",
      headers: payload ? { "Content-Type": "application/json" } : undefined,
      body: payload ? JSON.stringify(payload) : undefined
    });
    const json = await response.json();
    if (!json.ok) throw new Error(json.message || "操作失败");
    return json;
  }

  async function saveAll() {
    saveCurrentProduct();
    readStore();
    await api("/api/shop-data", { data });
    setStatus("已保存到 data.js。上线前请点“生成上传文件夹”。", "success");
  }

  async function buildUpload() {
    saveCurrentProduct();
    readStore();
    await api("/api/shop-data", { data });
    const result = await api("/api/build", {});
    setStatus(`上传文件夹已刷新。${result.output}`, "success");
  }

  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result).split(",")[1] || "");
      reader.onerror = () => reject(new Error("文件读取失败。"));
      reader.readAsDataURL(file);
    });
  }

  async function uploadImage(file) {
    if (!file) return;
    const product = readProductFromForm();
    const base64 = await fileToBase64(file);
    const result = await api("/api/product-image", {
      fileName: file.name,
      preferredName: product.id || product.name,
      base64
    });
    $("#image").value = result.path;
    const gallery = lines($("#gallery").value);
    if (!gallery.includes(result.path)) {
      gallery.unshift(result.path);
      $("#gallery").value = gallery.join("\n");
    }
    setStatus(`图片已保存：${result.path}`, "success");
  }

  async function uploadVideo(file) {
    if (!file) return;
    const product = readProductFromForm();
    const previousVideo = $("#videoUrl").value.trim();
    const base64 = await fileToBase64(file);
    const result = await api("/api/product-video", {
      fileName: file.name,
      preferredName: product.id || product.name,
      base64
    });
    if (previousVideo && previousVideo === lastUploadedVideoPath && previousVideo !== result.path) {
      await api("/api/delete-product-video", { path: previousVideo }).catch(() => null);
    }
    $("#videoUrl").value = result.path;
    lastUploadedVideoPath = result.path;
    if (!$("#videoCover").value.trim() && product.image) $("#videoCover").value = product.image;
    setStatus(`视频已保存：${result.path}`, "success");
  }

  async function clearVideo() {
    const videoPath = $("#videoUrl").value.trim();
    if (videoPath && !confirm("确定清空这个商品的视频吗？如果是刚上传的视频文件，也会从本地删除。")) return;
    if (videoPath) {
      if (videoPath === lastUploadedVideoPath) {
        await api("/api/delete-product-video", { path: videoPath }).catch(() => null);
      }
    }
    $("#videoUrl").value = "";
    $("#videoCover").value = "";
    $("#videoIntro").value = "";
    $("#videoUpload").value = "";
    lastUploadedVideoPath = "";
    setStatus("视频已清空，记得保存当前商品并保存到 data.js。", "success");
  }

  async function init() {
    try {
      const result = await api("/api/shop-data");
      data = result.data;
      data.store.wechatId = data.store.wechatId || "";
      data.store.wechatQr = data.store.wechatQr || "";
      data.store.wechatLink = data.store.wechatLink || "";
      fillStore();
      fillCategoryOptions();
      selectedId = data.products[0]?.id || "";
      if (selectedId) fillProduct(data.products[0]);
      renderList();
      setStatus("已加载。你可以改商品，保存后再生成上传文件夹。", "success");
    } catch (error) {
      setStatus(`加载失败：${error.message}。请确认是从 start-admin.bat 启动。`, "error");
    }
  }

  $("#productList").addEventListener("click", (event) => {
    const button = event.target.closest("[data-id]");
    if (!button) return;
    const product = data.products.find((item) => item.id === button.dataset.id);
    if (product) fillProduct(product);
  });

  $("#productSearch").addEventListener("input", renderList);
  $("#newProductButton").addEventListener("click", createProduct);
  $("#productForm").addEventListener("submit", (event) => {
    event.preventDefault();
    try {
      saveCurrentProduct();
    } catch (error) {
      setStatus(error.message, "error");
    }
  });
  $("#saveAllButton").addEventListener("click", () => saveAll().catch((error) => setStatus(error.message, "error")));
  $("#buildButton").addEventListener("click", () => buildUpload().catch((error) => setStatus(error.message, "error")));
  $("#imageUpload").addEventListener("change", (event) => uploadImage(event.target.files[0]).catch((error) => setStatus(error.message, "error")));
  $("#videoUpload").addEventListener("change", (event) => uploadVideo(event.target.files[0]).catch((error) => setStatus(error.message, "error")));
  $("#clearVideoButton").addEventListener("click", () => clearVideo().catch((error) => setStatus(error.message, "error")));
  $("#deleteButton").addEventListener("click", () => {
    const product = getSelectedProduct();
    if (!product) return;
    if (!confirm(`确定删除「${product.name}」吗？`)) return;
    data.products = data.products.filter((item) => item.id !== selectedId);
    selectedId = data.products[0]?.id || "";
    if (selectedId) fillProduct(data.products[0]);
    renderList();
    setStatus("商品已从列表删除，记得保存到 data.js。", "success");
  });
  $("#duplicateButton").addEventListener("click", () => {
    const product = getSelectedProduct();
    if (!product) return;
    const copy = JSON.parse(JSON.stringify(product));
    copy.id = `${product.id}-copy`;
    copy.name = `${product.name} 副本`;
    data.products.push(copy);
    fillProduct(copy);
    setStatus("已复制商品，改好名称和 ID 后保存。", "success");
  });
  $("#copyLinkButton").addEventListener("click", async () => {
    const product = readProductFromForm();
    const text = `?product=${product.id}`;
    await navigator.clipboard.writeText(text);
    setStatus(`已复制：${text}`, "success");
  });

  init();
})();
