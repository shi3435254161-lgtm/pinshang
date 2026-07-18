(function () {
  "use strict";

  const data = window.SHOP_DATA;
  const grid = document.getElementById("productGrid");
  const tabs = document.getElementById("categoryTabs");
  const search = document.getElementById("productSearch");
  const resultCount = document.getElementById("resultCount");
  const emptyState = document.getElementById("emptyState");
  const productDialog = document.getElementById("productDialog");
  const productDialogContent = document.getElementById("productDialogContent");
  const contactDialog = document.getElementById("contactDialog");
  const inquiryProduct = document.getElementById("inquiryProduct");
  const inquiryVillage = document.getElementById("inquiryVillage");
  const inquiryNeed = document.getElementById("inquiryNeed");
  const copyStatus = document.getElementById("copyStatus");
  let selectedCategory = "全部";
  let activeProduct = null;

  const escapeHtml = (value) => String(value).replace(/[&<>"]/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;"
  })[character]);

  function icon(name) {
    return `<img src="assets/icons/${name}.svg" alt="">`;
  }

  function renderTabs() {
    tabs.innerHTML = data.categories.map((category) => `
      <button type="button" role="tab" aria-selected="${category === selectedCategory}" data-category="${escapeHtml(category)}">
        ${escapeHtml(category)}
      </button>
    `).join("");
  }

  function matchesSearch(product, query) {
    const haystack = [
      product.name,
      product.brand,
      product.model,
      product.category,
      ...(product.tags || []),
      ...(product.aliases || [])
    ].join(" ").toLowerCase();
    return haystack.includes(query.toLowerCase());
  }

  function renderWechatQr() {
    const qrPlaceholder = document.getElementById("qrPlaceholder");
    const qrImage = (data.store.wechatQr || "").trim();
    if (!qrPlaceholder || !qrImage) return;

    qrPlaceholder.classList.add("qr-placeholder--image");
    qrPlaceholder.setAttribute("aria-label", "业务微信二维码");
    qrPlaceholder.innerHTML = `<img src="${escapeHtml(qrImage)}" alt="业务微信二维码">`;
  }

  function productCard(product) {
    return `
      <article class="product-card">
        <button class="product-card__image" type="button" data-product="${product.id}" aria-label="查看${escapeHtml(product.name)}详情">
          <img src="${product.image}" alt="${escapeHtml(product.name)}" loading="lazy">
          <span>${escapeHtml(product.category)}</span>
        </button>
        <div class="product-card__body">
          <p class="product-brand">${escapeHtml(product.brand)}</p>
          <h3>${escapeHtml(product.name)}</h3>
          <p class="product-price">${escapeHtml(product.price)}</p>
          <p class="product-note">${escapeHtml(product.priceNote)}</p>
          <div class="product-card__actions">
            <button class="button button--quiet" type="button" data-product="${product.id}">查看详情</button>
            <button class="icon-button icon-button--accent" type="button" data-quote="${product.id}" aria-label="咨询${escapeHtml(product.name)}" title="询价">
              ${icon("message-circle")}
            </button>
          </div>
        </div>
      </article>
    `;
  }

  function renderProducts() {
    const query = search.value.trim();
    const products = data.products.filter((product) => {
      const categoryMatch = selectedCategory === "全部" || product.category === selectedCategory;
      return categoryMatch && (!query || matchesSearch(product, query));
    });

    grid.innerHTML = products.map(productCard).join("");
    resultCount.textContent = `${products.length} 项`;
    grid.hidden = products.length === 0;
    emptyState.hidden = products.length !== 0;
  }

  function renderCases() {
    if (!data.cases.length) return;
    const section = document.getElementById("cases");
    const caseGrid = document.getElementById("caseGrid");
    caseGrid.innerHTML = data.cases.map((item) => `
      <article class="case-card">
        <img src="${item.image}" alt="${escapeHtml(item.title)}" loading="lazy">
        <div><p>${escapeHtml(item.location)}</p><h3>${escapeHtml(item.title)}</h3><span>${escapeHtml(item.summary)}</span></div>
      </article>
    `).join("");
    section.hidden = false;
  }

  function detailList(title, items, className) {
    return `
      <section class="detail-list ${className || ""}">
        <h3>${escapeHtml(title)}</h3>
        <ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
      </section>
    `;
  }

  function productDetail(product) {
    return `
      <div class="product-detail">
        <div class="product-detail__media"><img src="${product.image}" alt="${escapeHtml(product.name)}"></div>
        <div class="product-detail__main">
          <p class="eyebrow">${escapeHtml(product.category)} · ${escapeHtml(product.brand)}</p>
          <h2 id="productDialogTitle">${escapeHtml(product.name)}</h2>
          <p class="detail-model">${escapeHtml(product.model)}</p>
          <div class="detail-price"><strong>${escapeHtml(product.price)}</strong><span>${escapeHtml(product.priceNote)}</span></div>
          <p class="detail-description">${escapeHtml(product.description)}</p>
          <div class="tag-list">${product.tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join("")}</div>
          ${detailList("基础安装包含", product.included, "detail-list--included")}
          ${detailList("以下情况可能另计费用", product.extras, "detail-list--extras")}
          <p class="safety-note">${icon("shield-check")}<span>${escapeHtml(product.notice)}</span></p>
          <div class="detail-actions">
            <button class="button button--primary" type="button" data-quote="${product.id}">${icon("message-circle")}微信询价</button>
            <a class="button button--secondary" href="tel:${data.store.phones[0]}">${icon("phone")}电话咨询</a>
            <button class="icon-button" type="button" data-share-product="${product.id}" aria-label="分享这个产品" title="分享">${icon("share-2")}</button>
          </div>
        </div>
      </div>
    `;
  }

  function showProduct(id, updateHistory) {
    const product = data.products.find((item) => item.id === id);
    if (!product) return;
    activeProduct = product;
    productDialogContent.innerHTML = productDetail(product);
    productDialog.showModal();
    document.title = `${product.name}｜${data.store.name}`;
    if (updateHistory) {
      const url = new URL(window.location.href);
      url.searchParams.set("product", id);
      history.pushState({ product: id }, "", url);
    }
  }

  function closeDialog(dialog) {
    if (dialog.open) dialog.close();
  }

  function openContact(product) {
    activeProduct = product || activeProduct;
    inquiryProduct.value = activeProduct ? activeProduct.name : "暂未指定，先说明需求";
    inquiryVillage.value = "";
    inquiryNeed.value = "";
    copyStatus.textContent = "";
    closeDialog(productDialog);
    contactDialog.showModal();
  }

  function buildInquiryText() {
    const product = inquiryProduct.value.trim() || "未指定";
    const village = inquiryVillage.value.trim() || "待补充";
    const need = inquiryNeed.value.trim() || "想了解产品价格、配送和安装费用";
    return `您好，我在${data.store.name}产品页看到：\n意向产品：${product}\n所在村镇：${village}\n需求说明：${need}\n请帮我确认商品价格、安装包含内容和可能增加的费用。`;
  }

  async function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return;
    }
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    textarea.remove();
  }

  async function shareProduct(id) {
    const product = data.products.find((item) => item.id === id);
    if (!product) return;
    const url = new URL(window.location.href);
    url.searchParams.set("product", product.id);
    const shareData = { title: `${product.name}｜${data.store.name}`, text: product.priceNote, url: url.href };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await copyText(url.href);
        window.alert("产品链接已复制");
      }
    } catch (error) {
      if (error.name !== "AbortError") window.alert("暂时无法分享，请稍后重试");
    }
  }

  document.addEventListener("click", (event) => {
    const categoryButton = event.target.closest("[data-category]");
    const productButton = event.target.closest("[data-product]");
    const quoteButton = event.target.closest("[data-quote]");
    const shareButton = event.target.closest("[data-share-product]");
    const contactButton = event.target.closest("[data-open-contact]");
    const closeButton = event.target.closest("[data-close-dialog]");

    if (categoryButton) {
      selectedCategory = categoryButton.dataset.category;
      search.value = "";
      renderTabs();
      renderProducts();
    } else if (productButton) {
      showProduct(productButton.dataset.product, true);
    } else if (quoteButton) {
      const product = data.products.find((item) => item.id === quoteButton.dataset.quote);
      openContact(product);
    } else if (shareButton) {
      shareProduct(shareButton.dataset.shareProduct);
    } else if (contactButton) {
      openContact(null);
    } else if (closeButton) {
      closeDialog(closeButton.closest("dialog"));
    }
  });

  [productDialog, contactDialog].forEach((dialog) => {
    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) closeDialog(dialog);
    });
  });

  productDialog.addEventListener("close", () => {
    document.title = data.store.name;
  });

  search.addEventListener("input", renderProducts);

  document.getElementById("inquiryForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      await copyText(buildInquiryText());
      copyStatus.textContent = "询价内容已复制，请返回微信发送给店主。";
    } catch (error) {
      copyStatus.textContent = "复制失败，请直接拨打上方电话。";
    }
  });

  window.addEventListener("popstate", () => {
    const id = new URL(window.location.href).searchParams.get("product");
    if (id) showProduct(id, false);
    else closeDialog(productDialog);
  });

  renderTabs();
  renderProducts();
  renderCases();
  renderWechatQr();

  const initialProduct = new URL(window.location.href).searchParams.get("product");
  if (initialProduct) showProduct(initialProduct, false);
})();
