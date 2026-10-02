import express from "express";
import path from "path";
import app from "./app";

const PORT = Number(process.env.PORT) || 3000;

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
  }

  // SPA fallback: serve index.html for all non-API routes (e.g. /admin).
  const indexPath = process.env.NODE_ENV === "production"
    ? path.join(process.cwd(), "dist", "index.html")
    : path.join(process.cwd(), "index.html");
  app.get("*", (_req, res) => {
    res.sendFile(indexPath);
  });

  app.listen(PORT, "127.0.0.1", () => {
    console.log(`Server listening at http://127.0.0.1:${PORT}`);
  });
}

startServer();
