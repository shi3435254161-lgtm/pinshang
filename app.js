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
  const wechatPanel = document.getElementById("wechatPanel");
  const wechatActions = document.getElementById("wechatActions");
  const wechatIdText = document.getElementById("wechatIdText");
  const copyWechatAction = document.getElementById("copyWechatButton");
  const qrImageButton = document.getElementById("qrImageButton");
  const wechatLinkButton = document.getElementById("wechatLinkButton");
  const wechatHelp = document.getElementById("wechatHelp");
  const copyOpenWechatLabel = document.getElementById("copyOpenWechatLabel");
  const siteToast = document.getElementById("siteToast");
  let selectedCategory = "全部";
  let activeProduct = null;
  let toastTimer = 0;

  const escapeHtml = (value) => String(value).replace(/[&<>"]/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;"
  })[character]);

  function icon(name) {
    return `<img src="assets/icons/${name}.svg" alt="">`;
  }

  function clearCopyStatus() {
    copyStatus.textContent = "";
    copyStatus.classList.remove("copy-status--active", "copy-status--error");
  }

  function showCopyStatus(message, isError) {
    copyStatus.textContent = message;
    copyStatus.classList.remove("copy-status--active", "copy-status--error");
    void copyStatus.offsetWidth;
    copyStatus.classList.add("copy-status--active");
    copyStatus.classList.toggle("copy-status--error", Boolean(isError));
    if (!siteToast) return;
    window.clearTimeout(toastTimer);
    siteToast.textContent = message;
    siteToast.hidden = false;
    siteToast.classList.remove("site-toast--active", "site-toast--error");
    void siteToast.offsetWidth;
    siteToast.classList.add("site-toast--active");
    siteToast.classList.toggle("site-toast--error", Boolean(isError));
    toastTimer = window.setTimeout(() => {
      siteToast.hidden = true;
      siteToast.classList.remove("site-toast--active", "site-toast--error");
    }, 2600);
  }

  function createTapRipple(event) {
    if (event.button && event.button !== 0) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const target = event.target.closest([
      ".button",
      ".icon-button",
      ".category-tabs button",
      ".product-card__image",
      ".phone-list a",
      ".contact-path",
      ".scenario-card",
      ".mobile-actions a",
      ".mobile-actions button",
      ".showcase-card",
      ".product-gallery__thumbs button"
    ].join(","));

    if (!target || target.disabled) return;

    const rect = target.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height) * 1.7;
    const ripple = document.createElement("span");
    ripple.className = "tap-ripple";
    ripple.style.setProperty("--tap-x", `${event.clientX - rect.left}px`);
    ripple.style.setProperty("--tap-y", `${event.clientY - rect.top}px`);
    ripple.style.setProperty("--tap-size", `${size}px`);
    target.appendChild(ripple);
    ripple.addEventListener("animationend", () => ripple.remove(), { once: true });
  }

  function renderTabs() {
    const usedCategories = new Set((data.products || []).map((product) => product.category).filter(Boolean));
    const categories = [...new Set(["全部", ...(data.categories || [])])]
      .filter((category) => category === "全部" || usedCategories.has(category));
    if (!categories.includes(selectedCategory)) selectedCategory = "全部";
    tabs.innerHTML = categories.map((category) => `
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
      ...(product.aliases || []),
      ...(product.sellingPoints || []),
      ...(product.buyingGuide || []),
      ...(product.installCheck || []),
      ...(product.specs || []).flat(),
      ...(product.faqs || []).flat()
    ].join(" ").toLowerCase();
    return haystack.includes(query.toLowerCase());
  }

  function isWeChatBrowser() {
    return /micromessenger/i.test(window.navigator.userAgent);
  }

  function getWechatContact() {
    return {
      qrImage: (data.store.wechatQr || "").trim(),
      wechatId: (data.store.wechatId || "").trim(),
      link: (data.store.wechatLink || "").trim()
    };
  }

  function renderWechatContact() {
    const qrPlaceholder = document.getElementById("qrPlaceholder");
    const { qrImage, wechatId, link: wechatLink } = getWechatContact();
    const hasWechatContact = Boolean(qrImage || wechatId || wechatLink);

    if (wechatPanel) {
      wechatPanel.hidden = !hasWechatContact;
      wechatPanel.classList.toggle("wechat-panel--has-qr", Boolean(qrImage));
    }

    if (copyOpenWechatLabel) {
      if (wechatLink) {
        copyOpenWechatLabel.textContent = "复制并打开微信客服";
      } else if (qrImage || wechatId) {
        copyOpenWechatLabel.textContent = "复制后加业务微信";
      } else {
        copyOpenWechatLabel.textContent = "复制咨询内容";
      }
    }

    if (qrPlaceholder && qrImage) {
      qrPlaceholder.classList.add("qr-placeholder--image");
      qrPlaceholder.setAttribute("aria-label", "业务微信二维码，微信内长按识别");
      qrPlaceholder.innerHTML = `<a class="qr-image-link" href="${escapeHtml(qrImage)}" target="_blank" rel="noopener" aria-label="打开业务微信二维码大图"><img src="${escapeHtml(qrImage)}" alt="业务微信二维码"></a>`;
    } else if (qrPlaceholder) {
      qrPlaceholder.classList.remove("qr-placeholder--image");
      qrPlaceholder.setAttribute("aria-label", "业务微信二维码待补充");
      qrPlaceholder.innerHTML = `${icon("qr-code")}<span>二维码待补充</span>`;
    }

    if (wechatActions) {
      wechatActions.hidden = !(qrImage || wechatId || wechatLink);
    }

    if (wechatIdText) {
      wechatIdText.textContent = wechatId ? `微信号：${wechatId}` : "";
    }

    if (copyWechatAction) {
      copyWechatAction.hidden = !wechatId;
    }

    if (qrImageButton) {
      qrImageButton.hidden = !qrImage;
      if (qrImage) qrImageButton.href = qrImage;
      else qrImageButton.removeAttribute("href");
    }

    if (wechatLinkButton && wechatLink) {
      wechatLinkButton.href = wechatLink;
      wechatLinkButton.hidden = false;
    } else if (wechatLinkButton) {
      wechatLinkButton.hidden = true;
      wechatLinkButton.removeAttribute("href");
    }

    if (wechatHelp) {
      if (qrImage && wechatId) {
        wechatHelp.textContent = "先点开二维码大图再长按识别，或复制微信号到微信搜索；添加后粘贴询价内容发送。";
      } else if (qrImage) {
        wechatHelp.textContent = "先点开二维码大图，再长按图片选择识别二维码；添加后粘贴询价内容发送。";
      } else if (wechatId) {
        wechatHelp.textContent = "可复制微信号到微信搜索添加；添加后粘贴询价内容发送。";
      } else {
        wechatHelp.textContent = "复制咨询内容后发送给业务微信，店里会按村镇和需求确认价格与上门安排。";
      }
    }
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

  function renderHeroShowcase() {
    const showcase = document.getElementById("heroShowcase");
    if (!showcase) return;

    const products = data.products.slice(0, 3);
    if (!products.length) return;

    showcase.innerHTML = products.map((product, index) => `
      <button class="showcase-card ${index === 0 ? "showcase-card--large" : ""}" type="button" data-product="${escapeHtml(product.id)}" aria-label="查看${escapeHtml(product.name)}详情">
        <img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.name)}">
        <div>
          <strong>${escapeHtml(product.name)}</strong>
          <span>${escapeHtml(product.priceNote || product.category)}</span>
        </div>
      </button>
    `).join("");
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
    if (!items || !items.length) return "";
    return `
      <section class="detail-list ${className || ""}">
        <h3>${escapeHtml(title)}</h3>
        <ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
      </section>
    `;
  }

  function productGallery(product) {
    const images = [...new Set([...(product.gallery || []), product.image].filter(Boolean))];
    const firstImage = images[0] || product.image;
    const thumbnails = images.length > 1 ? `
      <div class="product-gallery__thumbs" aria-label="商品图片">
        ${images.map((image, index) => `
          <button type="button" data-gallery-image="${escapeHtml(image)}" aria-pressed="${index === 0}" aria-label="查看第 ${index + 1} 张图片">
            <img src="${escapeHtml(image)}" alt="">
          </button>
        `).join("")}
      </div>
    ` : "";

    return `
      <div class="product-gallery">
        <div class="product-gallery__main">
          <img class="product-detail__main-image" src="${escapeHtml(firstImage)}" alt="${escapeHtml(product.name)}">
        </div>
        ${thumbnails}
      </div>
    `;
  }

  function specTable(specs) {
    if (!specs || !specs.length) return "";
    return `
      <section class="commerce-section spec-section">
        <h3>规格参数</h3>
        <dl class="spec-table">
          ${specs.map(([label, value]) => `
            <div>
              <dt>${escapeHtml(label)}</dt>
              <dd>${escapeHtml(value)}</dd>
            </div>
          `).join("")}
        </dl>
      </section>
    `;
  }

  function commerceSection(title, items, className) {
    if (!items || !items.length) return "";
    return `
      <section class="commerce-section ${className || ""}">
        <h3>${escapeHtml(title)}</h3>
        <ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
      </section>
    `;
  }

  function faqSection(faqs) {
    if (!faqs || !faqs.length) return "";
    return `
      <section class="commerce-section product-faqs">
        <h3>常见问题</h3>
        ${faqs.map(([question, answer]) => `
          <details>
            <summary>${escapeHtml(question)}</summary>
            <p>${escapeHtml(answer)}</p>
          </details>
        `).join("")}
      </section>
    `;
  }

  function productDetail(product) {
    return `
      <div class="product-detail">
        <div class="product-detail__lead">
          <div class="product-detail__media">${productGallery(product)}</div>
          <div class="product-detail__main">
            <p class="eyebrow">${escapeHtml(product.category)} · ${escapeHtml(product.brand)}</p>
            <h2 id="productDialogTitle">${escapeHtml(product.name)}</h2>
            <p class="detail-model">${escapeHtml(product.model)}</p>
            <div class="detail-price"><strong>${escapeHtml(product.price)}</strong><span>${escapeHtml(product.priceNote)}</span></div>
            <p class="detail-description">${escapeHtml(product.description)}</p>
            <div class="tag-list">${(product.tags || []).map((tag) => `<span>${escapeHtml(tag)}</span>`).join("")}</div>
            <div class="detail-actions">
              <button class="button button--primary" type="button" data-quote="${product.id}">${icon("message-circle")}咨询/预约</button>
              <a class="button button--secondary" href="tel:${data.store.phones[0]}">${icon("phone")}电话咨询</a>
              <button class="icon-button" type="button" data-share-product="${product.id}" aria-label="分享这个产品" title="分享">${icon("share-2")}</button>
            </div>
            <p class="safety-note">${icon("shield-check")}<span>${escapeHtml(product.notice)}</span></p>
          </div>
        </div>
        <div class="product-detail__commerce">
          ${commerceSection("商品卖点", product.sellingPoints, "commerce-section--points")}
          ${specTable(product.specs)}
          ${commerceSection("选购说明", product.buyingGuide)}
          ${commerceSection("安装前请确认", product.installCheck, "commerce-section--check")}
          <div class="commerce-grid">
            ${detailList("基础安装包含", product.included, "detail-list--included")}
            ${detailList("以下情况可能另计费用", product.extras, "detail-list--extras")}
          </div>
          ${faqSection(product.faqs)}
        </div>
      </div>
    `;
  }

  function showProduct(id, updateHistory) {
    const product = data.products.find((item) => item.id === id);
    if (!product) return;
    activeProduct = product;
    productDialogContent.innerHTML = productDetail(product);
    openDialog(productDialog);
    document.title = `${product.name}｜${data.store.name}`;
    if (updateHistory) {
      const url = new URL(window.location.href);
      url.searchParams.set("product", id);
      history.pushState({ product: id }, "", url);
    }
  }

  function closeDialog(dialog) {
    if (dialog && dialog.open) dialog.close();
  }

  function openDialog(dialog) {
    if (!dialog || dialog.open) return;
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
  }

  function openContact(product = null) {
    activeProduct = product || null;
    inquiryProduct.value = activeProduct ? activeProduct.name : "未指定，先说明需求";
    inquiryVillage.value = "";
    inquiryNeed.value = "";
    clearCopyStatus();
    closeDialog(productDialog);
    openDialog(contactDialog);
  }

  function buildInquiryText() {
    const product = inquiryProduct.value.trim() || "未指定，先说明需求";
    const village = inquiryVillage.value.trim() || "待补充";
    const need = inquiryNeed.value.trim() || "想了解产品价格、配送、安装费用和上门时间";
    return [
      `您好，我在${data.store.name}页面看到信息，想咨询/预约。`,
      `【意向产品】${product}`,
      `【所在村镇】${village}`,
      `【需求说明】${need}`,
      "请帮我确认价格、安装包含内容、可能增加的费用和是否方便上门。"
    ].join("\n");
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

  function openWechatApp() {
    const { link } = getWechatContact();
    window.location.href = link || "weixin://";
  }

  function highlightWechatContact() {
    if (!wechatPanel || wechatPanel.hidden) return;
    wechatPanel.scrollIntoView({ behavior: "smooth", block: "center" });
    wechatPanel.classList.add("wechat-panel--attention");
    window.setTimeout(() => wechatPanel.classList.remove("wechat-panel--attention"), 1300);
  }

  async function copyInquiryAndOpenWechat() {
    try {
      await copyText(buildInquiryText());
      const { qrImage, wechatId, link } = getWechatContact();
      if (link) {
        showCopyStatus("咨询内容已复制，正在打开微信客服；进入后粘贴发送即可。");
        window.setTimeout(openWechatApp, 220);
      } else if (!isWeChatBrowser()) {
        showCopyStatus("咨询内容已复制，正在尝试打开微信；如果没有跳转，请手动打开微信粘贴发送。");
        window.setTimeout(openWechatApp, 220);
      } else if (qrImage) {
        highlightWechatContact();
        showCopyStatus("咨询内容已复制。请点开二维码大图后长按识别添加；添加后粘贴发送。");
      } else if (wechatId) {
        highlightWechatContact();
        showCopyStatus("咨询内容已复制。请先复制上方微信号，到微信搜索添加；添加后粘贴发送。");
      } else {
        showCopyStatus("咨询内容已复制。当前还没配置业务微信，急用可直接拨打安装师傅电话。");
      }
    } catch (error) {
      showCopyStatus("复制失败，请手动复制内容或直接拨打上方电话。", true);
    }
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
    const galleryButton = event.target.closest("[data-gallery-image]");
    const shareButton = event.target.closest("[data-share-product]");
    const copyWechatButton = event.target.closest("[data-copy-wechat]");
    const copyOpenWechatButton = event.target.closest("[data-copy-open-wechat]");
    const focusInquiryButton = event.target.closest("[data-focus-inquiry]");
    const contactButton = event.target.closest("[data-open-contact]");
    const closeButton = event.target.closest("[data-close-dialog]");

    if (categoryButton) {
      selectedCategory = categoryButton.dataset.category;
      search.value = "";
      renderTabs();
      renderProducts();
    } else if (productButton) {
      showProduct(productButton.dataset.product, true);
    } else if (galleryButton) {
      const mainImage = productDialogContent.querySelector(".product-detail__main-image");
      const thumbButtons = productDialogContent.querySelectorAll("[data-gallery-image]");
      if (mainImage) mainImage.src = galleryButton.dataset.galleryImage;
      thumbButtons.forEach((button) => button.setAttribute("aria-pressed", String(button === galleryButton)));
    } else if (quoteButton) {
      const product = data.products.find((item) => item.id === quoteButton.dataset.quote);
      openContact(product);
    } else if (shareButton) {
      shareProduct(shareButton.dataset.shareProduct);
    } else if (copyOpenWechatButton) {
      copyInquiryAndOpenWechat();
    } else if (focusInquiryButton) {
      inquiryVillage.scrollIntoView({ behavior: "smooth", block: "center" });
      inquiryVillage.focus();
    } else if (copyWechatButton) {
      const wechatId = (data.store.wechatId || "").trim();
      if (wechatId) {
        copyText(wechatId).then(() => {
          const oldLabel = copyWechatButton.textContent;
          copyWechatButton.textContent = "已复制微信号";
          window.setTimeout(() => {
            copyWechatButton.textContent = oldLabel;
          }, 1400);
          showCopyStatus("微信号已复制，请到微信搜索添加业务微信。");
        }).catch(() => {
          showCopyStatus("复制失败，请手动输入微信号。", true);
        });
      }
    } else if (contactButton) {
      openContact(null);
    } else if (closeButton) {
      closeDialog(closeButton.closest("dialog"));
    }
  });

  document.addEventListener("pointerdown", createTapRipple);

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
      showCopyStatus("预约信息已复制，请添加业务微信后粘贴发送；急用可直接打师傅电话。");
    } catch (error) {
      showCopyStatus("复制失败，请直接拨打上方电话。", true);
    }
  });

  window.addEventListener("popstate", () => {
    const id = new URL(window.location.href).searchParams.get("product");
    if (id) showProduct(id, false);
    else closeDialog(productDialog);
  });

  renderTabs();
  renderHeroShowcase();
  renderProducts();
  renderCases();
  renderWechatContact();

  const initialProduct = new URL(window.location.href).searchParams.get("product");
  if (initialProduct) showProduct(initialProduct, false);
})();
