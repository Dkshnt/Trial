import express from "express";
import path from "path";
import crypto from "crypto";
import fs from "fs/promises";
import dotenv from "dotenv";
import nodemailer from "nodemailer";

dotenv.config();

const app = express();
const dataDirectory = path.resolve(process.cwd(), "data");
const uploadsDirectory = path.resolve(process.cwd(), "uploads");
const portfolioFile = path.join(dataDirectory, "portfolio.json");
const MAX_UPLOAD_BYTES = 45 * 1024 * 1024;

app.use(express.json({ limit: "65mb" }));
app.use(express.urlencoded({ limit: "65mb", extended: true }));
app.use("/uploads", express.static(uploadsDirectory, { fallthrough: false, maxAge: "1h" }));

const defaultPortfolio = {
  headline: "Engineering a Sustainable Future.",
  bio: "Professional journey of Dikshant Dahiya. Bridging technical rigor in process safety engineering with high-fidelity ESG research and system audit standards.",
  linkedin: "https://linkedin.com",
  github: "https://github.com",
  youtube: "https://youtube.com",
  assets: [] as { id: string; name: string; url: string; size: string; type: string; createdAt: string }[],
  blocks: [
    { id: "block_1", type: "text", value: "Welcome to my dynamic ESG & Stewardship Portfolio. This section renders elements loaded from locally stored content blocks.", sort_order: 10 },
    { id: "block_2", type: "image", value: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&q=80&w=1200", name: "High-Fidelity Assurance Audits", sort_order: 20 },
    { id: "block_3", type: "text", value: "My core methodology focuses on transferring manual checklists into highly automated audit models, cutting anomalies by 40%. Deploying standard frameworks (BRSR, ISO 14001, ISO 9001).", sort_order: 30 },
  ] as any[],
};

type PortfolioDb = typeof defaultPortfolio;

async function ensureLocalStorage() {
  await fs.mkdir(dataDirectory, { recursive: true });
  await fs.mkdir(uploadsDirectory, { recursive: true });
  try {
    await fs.access(portfolioFile);
  } catch {
    await fs.writeFile(portfolioFile, JSON.stringify(defaultPortfolio, null, 2), "utf8");
  }
}

async function readDb(): Promise<PortfolioDb> {
  await ensureLocalStorage();
  const data = JSON.parse(await fs.readFile(portfolioFile, "utf8")) as PortfolioDb;
  if (!Array.isArray(data.assets)) data.assets = [];
  if (!Array.isArray(data.blocks)) data.blocks = defaultPortfolio.blocks;
  return data;
}

async function writeDb(data: PortfolioDb): Promise<void> {
  await ensureLocalStorage();
  const temporaryFile = `${portfolioFile}.${crypto.randomBytes(6).toString("hex")}.tmp`;
  await fs.writeFile(temporaryFile, JSON.stringify(data, null, 2), "utf8");
  await fs.rename(temporaryFile, portfolioFile);
}

function sign(value: string) {
  return crypto.createHmac("sha256", process.env.ADMIN_PASSWORD || "").update(value).digest("hex");
}

function requireAdmin(req: express.Request, res: express.Response): boolean {
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
    if (actualBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(actualBuffer, expectedBuffer)) throw new Error("Invalid signature");
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

  const encoded = Buffer.from(JSON.stringify({ email: "dikshant9911@gmail.com", exp: Date.now() + 86400000 })).toString("base64url");
  return res.json({ token: `${encoded}.${sign(encoded)}` });
});

app.post("/api/contact", async (req, res) => {
  const { name, email, phone, organization, subject, message } = req.body;
  const clean = (value: unknown, limit: number) => typeof value === "string" ? value.trim().slice(0, limit) : "";
  const senderName = clean(name, 120);
  const senderEmail = clean(email, 254);
  const senderPhone = clean(phone, 60);
  const senderOrganization = clean(organization, 160);
  const inquirySubject = clean(subject, 180);
  const inquiryMessage = clean(message, 8000);

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
    const transporter = nodemailer.createTransport({ service: "gmail", auth: { user: emailUser, pass: emailAppPassword } });
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
        inquiryMessage,
      ].join("\n"),
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
    const updatedData: PortfolioDb = {
      headline: headline.trim(), bio: bio.trim(),
      linkedin: String(linkedin || ""), github: String(github || ""), youtube: String(youtube || ""),
      assets: currentDb.assets,
      blocks: Array.isArray(blocks) ? blocks : currentDb.blocks,
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
    const originalName = path.basename(filename).replace(/[\r\n]/g, "_");
    const extension = path.extname(originalName).slice(0, 16);
    const safeStem = path.basename(originalName, extension).normalize("NFKD").replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 80) || "file";
    const storedName = `${safeStem}_${Date.now()}_${crypto.randomBytes(4).toString("hex")}${extension}`;
    await fs.writeFile(path.join(uploadsDirectory, storedName), buffer, { flag: "wx" });

    const currentDb = await readDb();
    const asset = {
      id: storedName,
      name: originalName,
      url: `/uploads/${encodeURIComponent(storedName)}`,
      size: `${(buffer.length / 1024 / 1024).toFixed(2)} MB`,
      type: mimeType || "application/octet-stream",
      createdAt: new Date().toISOString(),
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
    return res.download(path.join(uploadsDirectory, asset.id), asset.name);
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
    await fs.rm(path.join(uploadsDirectory, asset.id), { force: true });
    currentDb.assets = currentDb.assets.filter((item) => item.id !== asset.id);
    currentDb.blocks = currentDb.blocks.map((block) => block.value === asset.url ? { ...block, value: "" } : block);
    await writeDb(currentDb);
    return res.json({ success: true });
  } catch (err) {
    console.error("Delete asset error:", err);
    return res.status(500).json({ error: "Failed to delete the requested file" });
  }
});

export default app;
