const childProcess = require("child_process");
const fs = require("fs");
const http = require("http");
const path = require("path");
const vm = require("vm");

const ROOT = __dirname;
const START_PORT = Number(process.env.PORT || 5177);
const MAX_BODY = 90 * 1024 * 1024;

const MIME = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".ogg": "video/ogg"
};

function sendJson(res, status, payload) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > MAX_BODY) {
        reject(new Error("请求内容太大，图片或视频请先压缩后再上传。"));
        req.destroy();
      }
    });
    req.on("end", () => resolve(body ? JSON.parse(body) : {}));
    req.on("error", reject);
  });
}

function loadShopData() {
  const dataPath = path.join(ROOT, "data.js");
  const code = fs.readFileSync(dataPath, "utf8");
  const context = { window: {} };
  vm.runInNewContext(code, context, { filename: dataPath });
  return context.window.SHOP_DATA;
}

function saveShopData(data) {
  validateShopData(data);
  const content = [
    "/*",
    " * 店铺内容集中维护文件。",
    " * 建议优先使用本地商品管理助手修改，手动修改时注意逗号和引号。",
    " */",
    `window.SHOP_DATA = ${JSON.stringify(data, null, 2)};`,
    ""
  ].join("\n");
  fs.writeFileSync(path.join(ROOT, "data.js"), content, "utf8");
}

function validateShopData(data) {
  if (!data || typeof data !== "object") throw new Error("数据格式不正确。");
  if (!data.store || typeof data.store !== "object") throw new Error("缺少店铺信息。");
  if (!Array.isArray(data.products)) throw new Error("商品列表必须是数组。");
  const ids = new Set();
  data.products.forEach((product) => {
    if (!product.id || !/^[a-z0-9-]+$/.test(product.id)) {
      throw new Error(`商品 ID 只能用小写英文、数字和横杠：${product.name || "未命名商品"}`);
    }
    if (ids.has(product.id)) throw new Error(`商品 ID 重复：${product.id}`);
    ids.add(product.id);
  });
}

function safeStaticPath(urlPath) {
  const cleanUrl = decodeURIComponent(urlPath.split("?")[0]);
  const relative = cleanUrl === "/" ? "index.html" : cleanUrl.replace(/^\/+/, "");
  const filePath = path.resolve(ROOT, relative);
  if (!filePath.startsWith(ROOT)) return null;
  return filePath;
}

function serveStatic(req, res) {
  const filePath = safeStaticPath(req.url);
  if (!filePath || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not found");
    return;
  }
  const ext = path.extname(filePath).toLowerCase();
  res.writeHead(200, {
    "Content-Type": MIME[ext] || "application/octet-stream",
    "Cache-Control": "no-store"
  });
  fs.createReadStream(filePath).pipe(res);
}

function uploadProductImage(payload) {
  const rawName = String(payload.fileName || "product-image").toLowerCase();
  const ext = path.extname(rawName);
  if (![".jpg", ".jpeg", ".png", ".webp"].includes(ext)) {
    throw new Error("图片只支持 jpg、png、webp。");
  }
  const preferred = String(payload.preferredName || "")
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  const stamp = new Date().toISOString().replace(/[-:T.Z]/g, "").slice(0, 14);
  const fileName = `${preferred || "product"}-${stamp}${ext === ".jpeg" ? ".jpg" : ext}`;
  const buffer = Buffer.from(String(payload.base64 || ""), "base64");
  if (!buffer.length) throw new Error("图片内容为空。");
  if (buffer.length > 8 * 1024 * 1024) throw new Error("图片太大，建议先压缩到 5MB 以内。");
  const targetDir = path.join(ROOT, "assets", "products");
  fs.mkdirSync(targetDir, { recursive: true });
  fs.writeFileSync(path.join(targetDir, fileName), buffer);
  return `assets/products/${fileName}`;
}

function uploadProductVideo(payload) {
  const rawName = String(payload.fileName || "product-video").toLowerCase();
  const ext = path.extname(rawName);
  if (![".mp4", ".webm", ".ogg"].includes(ext)) {
    throw new Error("视频只支持 mp4、webm、ogg。");
  }
  const preferred = String(payload.preferredName || "")
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  const stamp = new Date().toISOString().replace(/[-:T.Z]/g, "").slice(0, 14);
  const fileName = `${preferred || "product"}-${stamp}${ext}`;
  const buffer = Buffer.from(String(payload.base64 || ""), "base64");
  if (!buffer.length) throw new Error("视频内容为空。");
  if (buffer.length > 60 * 1024 * 1024) throw new Error("视频太大，建议压缩到 60MB 以内。");
  const targetDir = path.join(ROOT, "assets", "products");
  fs.mkdirSync(targetDir, { recursive: true });
  fs.writeFileSync(path.join(targetDir, fileName), buffer);
  return `assets/products/${fileName}`;
}

function deleteProductVideo(payload) {
  const relativePath = String(payload.path || "").replace(/\\/g, "/");
  if (!/^assets\/products\/[a-z0-9][a-z0-9-]*-\d{14}\.(mp4|webm|ogg)$/i.test(relativePath)) {
    throw new Error("只能删除商品后台上传的视频文件。");
  }
  const target = path.resolve(ROOT, relativePath);
  const productsDir = path.resolve(ROOT, "assets", "products");
  if (!target.startsWith(`${productsDir}${path.sep}`)) {
    throw new Error("视频路径不安全，已取消删除。");
  }
  if (fs.existsSync(target)) fs.unlinkSync(target);
}

function runBuildPackage() {
  return new Promise((resolve, reject) => {
    const script = path.join(ROOT, "build-upload-package.ps1");
    childProcess.execFile(
      "powershell",
      ["-ExecutionPolicy", "Bypass", "-File", script],
      { cwd: ROOT, windowsHide: true },
      (error, stdout, stderr) => {
        if (error) {
          reject(new Error(stderr || error.message));
          return;
        }
        resolve(stdout.trim());
      }
    );
  });
}

async function handleApi(req, res) {
  try {
    if (req.method === "GET" && req.url === "/api/shop-data") {
      sendJson(res, 200, { ok: true, data: loadShopData() });
      return;
    }
    if (req.method === "POST" && req.url === "/api/shop-data") {
      const payload = await readBody(req);
      saveShopData(payload.data);
      sendJson(res, 200, { ok: true, message: "已保存到 data.js" });
      return;
    }
    if (req.method === "POST" && req.url === "/api/product-image") {
      const payload = await readBody(req);
      const imagePath = uploadProductImage(payload);
      sendJson(res, 200, { ok: true, path: imagePath });
      return;
    }
    if (req.method === "POST" && req.url === "/api/product-video") {
      const payload = await readBody(req);
      const videoPath = uploadProductVideo(payload);
      sendJson(res, 200, { ok: true, path: videoPath });
      return;
    }
    if (req.method === "POST" && req.url === "/api/delete-product-video") {
      const payload = await readBody(req);
      deleteProductVideo(payload);
      sendJson(res, 200, { ok: true, message: "视频已删除" });
      return;
    }
    if (req.method === "POST" && req.url === "/api/build") {
      const output = await runBuildPackage();
      sendJson(res, 200, { ok: true, output });
      return;
    }
    sendJson(res, 404, { ok: false, message: "接口不存在" });
  } catch (error) {
    sendJson(res, 400, { ok: false, message: error.message });
  }
}

function createServer() {
  return http.createServer((req, res) => {
    if (req.url.startsWith("/api/")) {
      handleApi(req, res);
      return;
    }
    serveStatic(req, res);
  });
}

function openBrowser(url) {
  if (process.argv.includes("--no-open")) return;
  if (process.platform === "win32") {
    childProcess.exec(`start "" "${url}"`);
  }
}

function listen(port) {
  const server = createServer();
  server.on("error", (error) => {
    if (error.code === "EADDRINUSE" && port < START_PORT + 20) {
      listen(port + 1);
      return;
    }
    console.error(error.message);
    process.exit(1);
  });
  server.listen(port, "127.0.0.1", () => {
    const url = `http://127.0.0.1:${port}/admin.html`;
    console.log(`商品管理助手已启动：${url}`);
    console.log("关闭这个窗口即可停止管理助手。");
    openBrowser(url);
  });
}

listen(START_PORT);
