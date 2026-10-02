var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express2 = __toESM(require("express"), 1);
var import_path2 = __toESM(require("path"), 1);

// app.ts
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_crypto = __toESM(require("crypto"), 1);
var import_promises = __toESM(require("fs/promises"), 1);
var import_dotenv = __toESM(require("dotenv"), 1);
var import_nodemailer = __toESM(require("nodemailer"), 1);
import_dotenv.default.config();
var app = (0, import_express.default)();
var dataDirectory = import_path.default.resolve(process.cwd(), "data");
var uploadsDirectory = import_path.default.resolve(process.cwd(), "uploads");
var portfolioFile = import_path.default.join(dataDirectory, "portfolio.json");
var MAX_UPLOAD_BYTES = 45 * 1024 * 1024;
app.use(import_express.default.json({ limit: "65mb" }));
app.use(import_express.default.urlencoded({ limit: "65mb", extended: true }));
app.use("/uploads", import_express.default.static(uploadsDirectory, { fallthrough: false, maxAge: "1h" }));
var defaultPortfolio = {
  headline: "Engineering a Sustainable Future.",
  bio: "Professional journey of Dikshant Dahiya. Bridging technical rigor in process safety engineering with high-fidelity ESG research and system audit standards.",
  linkedin: "https://linkedin.com",
  github: "https://github.com",
  youtube: "https://youtube.com",
  assets: [],
  blocks: [
    { id: "block_1", type: "text", value: "Welcome to my dynamic ESG & Stewardship Portfolio. This section renders elements loaded from locally stored content blocks.", sort_order: 10 },
    { id: "block_2", type: "image", value: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&q=80&w=1200", name: "High-Fidelity Assurance Audits", sort_order: 20 },
    { id: "block_3", type: "text", value: "My core methodology focuses on transferring manual checklists into highly automated audit models, cutting anomalies by 40%. Deploying standard frameworks (BRSR, ISO 14001, ISO 9001).", sort_order: 30 }
  ]
};
async function ensureLocalStorage() {
  await import_promises.default.mkdir(dataDirectory, { recursive: true });
  await import_promises.default.mkdir(uploadsDirectory, { recursive: true });
  try {
    await import_promises.default.access(portfolioFile);
  } catch {
    await import_promises.default.writeFile(portfolioFile, JSON.stringify(defaultPortfolio, null, 2), "utf8");
  }
}
async function readDb() {
  await ensureLocalStorage();
  const data = JSON.parse(await import_promises.default.readFile(portfolioFile, "utf8"));
  if (!Array.isArray(data.assets)) data.assets = [];
  if (!Array.isArray(data.blocks)) data.blocks = defaultPortfolio.blocks;
  return data;
}
async function writeDb(data) {
  await ensureLocalStorage();
  const temporaryFile = `${portfolioFile}.${import_crypto.default.randomBytes(6).toString("hex")}.tmp`;
  await import_promises.default.writeFile(temporaryFile, JSON.stringify(data, null, 2), "utf8");
  await import_promises.default.rename(temporaryFile, portfolioFile);
}
function sign(value) {
  return import_crypto.default.createHmac("sha256", process.env.ADMIN_PASSWORD || "").update(value).digest("hex");
}
function requireAdmin(req, res) {
  const token = req.headers.authorization?.match(/^Bearer (.+)$/)?.[1];
  if (!token) {
    res.status(401).json({ error: "Administrator login required" });
    return false;
  }
  try {
    const [encoded, signature] = token.split(".");
    const expected = sign(encoded);
    const actualBuffer = Buffer.from(signature || "", "hex");
    const expectedBuffer = Buffer.from(expected, "hex");
    if (actualBuffer.length !== expectedBuffer.length || !import_crypto.default.timingSafeEqual(actualBuffer, expectedBuffer)) throw new Error("Invalid signature");
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
    if (payload.email !== "dikshant9911@gmail.com" || payload.exp <= Date.now()) throw new Error("Expired session");
    return true;
  } catch {
    res.status(401).json({ error: "Invalid or expired administrator session" });
    return false;
  }
}
app.get("/api/portfolio", async (_req, res) => {
  try {
    res.json(await readDb());
  } catch (err) {
    console.error("Error reading portfolio:", err);
    res.status(500).json({ error: "Failed to load portfolio data" });
  }
});
app.post("/api/login", (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: "Email and password are required" });
  if (String(email).trim().toLowerCase() !== "dikshant9911@gmail.com") return res.status(401).json({ error: "Access denied. Unauthorized administrator account." });
  const configuredPassword = process.env.ADMIN_PASSWORD;
  if (!configuredPassword) return res.status(500).json({ error: "Set ADMIN_PASSWORD in .env before using the admin page" });
  if (password !== configuredPassword) return res.status(401).json({ error: "Incorrect administrator password" });
  const encoded = Buffer.from(JSON.stringify({ email: "dikshant9911@gmail.com", exp: Date.now() + 864e5 })).toString("base64url");
  return res.json({ token: `${encoded}.${sign(encoded)}` });
});
app.post("/api/contact", async (req, res) => {
  const { name, email, phone, organization, subject, message } = req.body;
  const clean = (value, limit) => typeof value === "string" ? value.trim().slice(0, limit) : "";
  const senderName = clean(name, 120);
  const senderEmail = clean(email, 254);
  const senderPhone = clean(phone, 60);
  const senderOrganization = clean(organization, 160);
  const inquirySubject = clean(subject, 180);
  const inquiryMessage = clean(message, 8e3);
  if (!senderName || !senderEmail || !inquiryMessage || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(senderEmail)) {
    return res.status(400).json({ error: "Please provide a name, valid email address, and message." });
  }
  const emailUser = process.env.EMAIL_USER;
  const emailAppPassword = process.env.EMAIL_APP_PASSWORD;
  if (!emailUser || !emailAppPassword) {
    console.error("Contact email is not configured. Set EMAIL_USER and EMAIL_APP_PASSWORD.");
    return res.status(503).json({ error: "The contact form is not configured yet. Please email directly instead." });
  }
  try {
    const transporter = import_nodemailer.default.createTransport({ service: "gmail", auth: { user: emailUser, pass: emailAppPassword } });
    await transporter.sendMail({
      from: `Portfolio contact form <${emailUser}>`,
      to: "dikshantdahiya8@gmail.com",
      replyTo: senderEmail,
      subject: `[Portfolio] ${inquirySubject || "New inquiry"}`,
      text: [
        "New portfolio inquiry",
        "",
        `Name: ${senderName}`,
        `Email: ${senderEmail}`,
        `Phone: ${senderPhone || "Not provided"}`,
        `Organization: ${senderOrganization || "Not provided"}`,
        `Subject: ${inquirySubject || "Not provided"}`,
        "",
        "Message:",
        inquiryMessage
      ].join("\n")
    });
    return res.json({ success: true });
  } catch (error) {
    console.error("Failed to send contact email:", error);
    return res.status(502).json({ error: "Unable to send your message right now. Please try again later." });
  }
});
app.post("/api/portfolio", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  const { headline, bio, linkedin, github, youtube, blocks } = req.body;
  if (typeof headline !== "string" || !headline.trim() || typeof bio !== "string" || !bio.trim()) return res.status(400).json({ error: "Headline and bio must not be empty" });
  try {
    const currentDb = await readDb();
    const updatedData = {
      headline: headline.trim(),
      bio: bio.trim(),
      linkedin: String(linkedin || ""),
      github: String(github || ""),
      youtube: String(youtube || ""),
      assets: currentDb.assets,
      blocks: Array.isArray(blocks) ? blocks : currentDb.blocks
    };
    await writeDb(updatedData);
    return res.json({ success: true, data: updatedData });
  } catch (err) {
    console.error("Error saving portfolio:", err);
    return res.status(500).json({ error: "Failed to save portfolio data locally" });
  }
});
app.post("/api/upload", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  const { filename, mimeType, base64Data } = req.body;
  if (typeof filename !== "string" || !filename.trim() || typeof mimeType !== "string" || typeof base64Data !== "string") return res.status(400).json({ error: "Missing uploaded file details" });
  try {
    const cleanBase64 = base64Data.replace(/^data:.*?;base64,/, "");
    const buffer = Buffer.from(cleanBase64, "base64");
    if (!buffer.length) return res.status(400).json({ error: "The selected file is empty or invalid" });
    if (buffer.length > MAX_UPLOAD_BYTES) return res.status(413).json({ error: "Files must be 45 MB or smaller" });
    await ensureLocalStorage();
    const originalName = import_path.default.basename(filename).replace(/[\r\n]/g, "_");
    const extension = import_path.default.extname(originalName).slice(0, 16);
    const safeStem = import_path.default.basename(originalName, extension).normalize("NFKD").replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 80) || "file";
    const storedName = `${safeStem}_${Date.now()}_${import_crypto.default.randomBytes(4).toString("hex")}${extension}`;
    await import_promises.default.writeFile(import_path.default.join(uploadsDirectory, storedName), buffer, { flag: "wx" });
    const currentDb = await readDb();
    const asset = {
      id: storedName,
      name: originalName,
      url: `/uploads/${encodeURIComponent(storedName)}`,
      size: `${(buffer.length / 1024 / 1024).toFixed(2)} MB`,
      type: mimeType || "application/octet-stream",
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    currentDb.assets.push(asset);
    await writeDb(currentDb);
    return res.json({ success: true, asset });
  } catch (err) {
    console.error("Upload error:", err);
    return res.status(500).json({ error: "Failed to store uploaded file locally" });
  }
});
app.get("/api/assets/:id", async (req, res) => {
  try {
    const data = await readDb();
    const asset = data.assets.find((item) => item.id === req.params.id);
    if (!asset) return res.status(404).json({ error: "Asset not found" });
    return res.download(import_path.default.join(uploadsDirectory, asset.id), asset.name);
  } catch (err) {
    console.error("Error serving asset:", err);
    return res.status(404).json({ error: "Asset not found" });
  }
});
app.delete("/api/assets", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  const { url } = req.body;
  if (typeof url !== "string") return res.status(400).json({ error: "Missing asset URL" });
  try {
    const currentDb = await readDb();
    const asset = currentDb.assets.find((item) => item.url === url);
    if (!asset) return res.status(404).json({ error: "Asset not found" });
    await import_promises.default.rm(import_path.default.join(uploadsDirectory, asset.id), { force: true });
    currentDb.assets = currentDb.assets.filter((item) => item.id !== asset.id);
    currentDb.blocks = currentDb.blocks.map((block) => block.value === asset.url ? { ...block, value: "" } : block);
    await writeDb(currentDb);
    return res.json({ success: true });
  } catch (err) {
    console.error("Delete asset error:", err);
    return res.status(500).json({ error: "Failed to delete the requested file" });
  }
});
var app_default = app;

// server.ts
var PORT = Number(process.env.PORT) || 3e3;
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app_default.use(vite.middlewares);
  } else {
    const distPath = import_path2.default.join(process.cwd(), "dist");
    app_default.use(import_express2.default.static(distPath));
  }
  const indexPath = process.env.NODE_ENV === "production" ? import_path2.default.join(process.cwd(), "dist", "index.html") : import_path2.default.join(process.cwd(), "index.html");
  app_default.get("*", (_req, res) => {
    res.sendFile(indexPath);
  });
  app_default.listen(PORT, "127.0.0.1", () => {
    console.log(`Server listening at http://127.0.0.1:${PORT}`);
  });
}
startServer();
//# sourceMappingURL=server.cjs.map
