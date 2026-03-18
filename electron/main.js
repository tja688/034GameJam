const { app, BrowserWindow } = require("electron");
const fs = require("node:fs");
const fsp = require("node:fs/promises");
const http = require("node:http");
const net = require("node:net");
const path = require("node:path");
const { URL } = require("node:url");

const SERVER_HOST = "127.0.0.1";
const PREFERRED_PORT = 4173;
const MAX_PORT_OFFSET = 30;

const JSON_WRITE_ALLOWLIST = new Set([
  "tuning-profile.json",
  "save-slot.json",
  "audio-profile.json",
  "audio-noise-mute-config.json",
  "data/fixtures/playground/custom-sandbox.json",
  "data/tuning/movement.base.json",
  "data/tuning/gameplay.base.json",
  "data/tuning/camera.base.json",
  "data/tuning/debug.base.json"
]);

const MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".gif": "image/gif",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".m4a": "audio/mp4",
  ".mp3": "audio/mpeg",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".wav": "audio/wav",
  ".webp": "image/webp"
};

let internalServer = null;
let serverBaseUrl = "";
let mainWindow = null;

function getStaticRoot() {
  return app.getAppPath();
}

function getWritableRoot() {
  if (!app.isPackaged) {
    return getStaticRoot();
  }

  return path.join(app.getPath("userData"), "mutable-json");
}

function getWritableJsonPath(relativePath) {
  return path.join(getWritableRoot(), ...relativePath.split("/"));
}

function getStaticPath(relativePath) {
  return path.join(getStaticRoot(), ...relativePath.split("/"));
}

function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return MIME_TYPES[ext] || "application/octet-stream";
}

function isNoCachePath(relativePath) {
  return relativePath.endsWith(".html") ||
    relativePath.endsWith(".js") ||
    relativePath.endsWith(".css") ||
    relativePath.endsWith(".json");
}

function normalizeRequestPath(requestPathname) {
  let decoded;
  try {
    decoded = decodeURIComponent(requestPathname);
  } catch {
    return null;
  }

  const normalized = path.posix.normalize(decoded.replace(/\\/g, "/"));
  const withLeadingSlash = normalized.startsWith("/") ? normalized : `/${normalized}`;

  if (withLeadingSlash === "/.." || withLeadingSlash.startsWith("/../")) {
    return null;
  }

  let safePath = withLeadingSlash;
  if (safePath === "/" || safePath === "/.") {
    safePath = "/index.html";
  } else if (safePath.endsWith("/")) {
    safePath = `${safePath}index.html`;
  }

  return safePath.replace(/^\/+/, "");
}

function sendJson(res, statusCode, payload) {
  const body = Buffer.from(JSON.stringify(payload), "utf8");
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": String(body.length),
    "Cache-Control": "no-store"
  });
  res.end(body);
}

function sendText(res, statusCode, message) {
  const body = Buffer.from(message, "utf8");
  res.writeHead(statusCode, {
    "Content-Type": "text/plain; charset=utf-8",
    "Content-Length": String(body.length),
    "Cache-Control": "no-store"
  });
  res.end(body);
}

async function resolveServedFile(relativePath) {
  if (JSON_WRITE_ALLOWLIST.has(relativePath)) {
    const writablePath = getWritableJsonPath(relativePath);
    try {
      const stat = await fsp.stat(writablePath);
      if (stat.isFile()) {
        return writablePath;
      }
    } catch {
      // fall through to the packaged/static asset.
    }
  }

  return getStaticPath(relativePath);
}

async function streamFile(res, relativePath) {
  const filePath = await resolveServedFile(relativePath);
  let stat;
  try {
    stat = await fsp.stat(filePath);
  } catch {
    sendText(res, 404, "Not Found");
    return;
  }

  if (!stat.isFile()) {
    sendText(res, 404, "Not Found");
    return;
  }

  const headers = {
    "Content-Type": getMimeType(filePath),
    "Content-Length": String(stat.size)
  };

  if (isNoCachePath(relativePath)) {
    headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0";
    headers["Pragma"] = "no-cache";
    headers["Expires"] = "0";
  }

  res.writeHead(200, headers);
  const stream = fs.createReadStream(filePath);
  stream.on("error", () => {
    if (!res.headersSent) {
      sendText(res, 500, "Internal Server Error");
    } else {
      res.destroy();
    }
  });
  stream.pipe(res);
}

async function readJsonBody(req, maxBytes = 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];

    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > maxBytes) {
        reject(new Error("Request body too large"));
        req.destroy();
        return;
      }

      chunks.push(chunk);
    });

    req.on("end", () => {
      const raw = Buffer.concat(chunks).toString("utf8");
      if (!raw.trim()) {
        reject(new Error("Empty body"));
        return;
      }

      try {
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
          reject(new Error("Body must be a JSON object"));
          return;
        }
        resolve(parsed);
      } catch (error) {
        reject(error);
      }
    });

    req.on("error", reject);
  });
}

async function handleWriteJson(req, res) {
  let body;
  try {
    body = await readJsonBody(req);
  } catch (error) {
    sendJson(res, 400, { ok: false, error: `Invalid JSON body: ${error.message}` });
    return;
  }

  const fileName = body.file;
  if (typeof fileName !== "string" || !JSON_WRITE_ALLOWLIST.has(fileName)) {
    sendJson(res, 403, { ok: false, error: "Unsupported file" });
    return;
  }

  const targetPath = getWritableJsonPath(fileName);
  try {
    await fsp.mkdir(path.dirname(targetPath), { recursive: true });
    const content = `${JSON.stringify(body.data, null, 2)}\n`;
    await fsp.writeFile(targetPath, content, "utf8");
  } catch (error) {
    sendJson(res, 500, { ok: false, error: `Write failed: ${error.message}` });
    return;
  }

  sendJson(res, 200, { ok: true, file: fileName });
}

function canBindPort(port) {
  return new Promise((resolve) => {
    const probe = net.createServer();
    probe.unref();
    probe.once("error", () => resolve(false));
    probe.listen(port, SERVER_HOST, () => {
      probe.close(() => resolve(true));
    });
  });
}

async function findAvailablePort() {
  for (let offset = 0; offset <= MAX_PORT_OFFSET; offset += 1) {
    const candidate = PREFERRED_PORT + offset;
    // eslint-disable-next-line no-await-in-loop
    const available = await canBindPort(candidate);
    if (available) {
      return candidate;
    }
  }

  return null;
}

async function startInternalServer() {
  const port = await findAvailablePort();
  if (port === null) {
    throw new Error(
      `Failed to find an available port in ${PREFERRED_PORT}-${PREFERRED_PORT + MAX_PORT_OFFSET}`
    );
  }

  const server = http.createServer(async (req, res) => {
    if (!req.url) {
      sendText(res, 400, "Bad Request");
      return;
    }

    const requestUrl = new URL(req.url, `http://${SERVER_HOST}:${port}`);
    const pathname = requestUrl.pathname;

    if (req.method === "GET" && pathname === "/__api/ping") {
      sendJson(res, 200, { ok: true });
      return;
    }

    if (req.method === "POST" && pathname === "/__api/write-json") {
      await handleWriteJson(req, res);
      return;
    }

    if (req.method !== "GET" && req.method !== "HEAD") {
      sendText(res, 405, "Method Not Allowed");
      return;
    }

    const relativePath = normalizeRequestPath(pathname);
    if (!relativePath) {
      sendText(res, 400, "Bad Request");
      return;
    }

    if (req.method === "HEAD") {
      const filePath = await resolveServedFile(relativePath);
      try {
        const stat = await fsp.stat(filePath);
        if (!stat.isFile()) {
          sendText(res, 404, "Not Found");
          return;
        }
        res.writeHead(200, {
          "Content-Type": getMimeType(filePath),
          "Content-Length": String(stat.size)
        });
        res.end();
      } catch {
        sendText(res, 404, "Not Found");
      }
      return;
    }

    await streamFile(res, relativePath);
  });

  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, SERVER_HOST, () => resolve());
  });

  internalServer = server;
  serverBaseUrl = `http://${SERVER_HOST}:${port}`;
  console.log(`[034GameJam] Internal server started at ${serverBaseUrl}`);
}

async function createMainWindow() {
  if (!serverBaseUrl) {
    throw new Error("Internal server URL is empty");
  }

  mainWindow = new BrowserWindow({
    width: 1600,
    height: 900,
    minWidth: 960,
    minHeight: 540,
    autoHideMenuBar: true,
    backgroundColor: "#071017",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  await mainWindow.loadURL(`${serverBaseUrl}/index.html`);
}

async function bootstrap() {
  try {
    await startInternalServer();
    await createMainWindow();
  } catch (error) {
    console.error("[034GameJam] Failed to bootstrap Electron shell:", error);
    app.quit();
  }
}

app.whenReady().then(bootstrap);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", async () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    await createMainWindow();
  }
});

app.on("before-quit", () => {
  if (internalServer) {
    internalServer.close();
    internalServer = null;
  }
});
