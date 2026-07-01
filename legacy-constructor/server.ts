import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));

  app.post("/api/import-brief", async (req, res) => {
    try {
      const { url } = req.body || {};
      if (!url || typeof url !== 'string') {
        return res.status(400).json({ error: "Missing url" });
      }
      const parsed = new URL(url);
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        return res.status(400).json({ error: "Only http/https links are supported" });
      }
      const response = await fetch(parsed.toString(), {
        headers: {
          "User-Agent": "LevelDevilConstructor/1.0",
          "Accept": "text/html,application/pdf,text/plain,*/*",
        },
      });
      if (!response.ok) {
        return res.status(response.status).json({ error: `Failed to fetch brief (${response.status})` });
      }
      const contentType = response.headers.get("content-type") || "";
      const raw = await response.text();
      const text = contentType.includes("html")
        ? raw
            .replace(/<script[\s\S]*?<\/script>/gi, " ")
            .replace(/<style[\s\S]*?<\/style>/gi, " ")
            .replace(/<[^>]+>/g, " ")
            .replace(/&nbsp;/g, " ")
            .replace(/&amp;/g, "&")
            .replace(/&lt;/g, "<")
            .replace(/&gt;/g, ">")
            .replace(/\s+/g, " ")
            .trim()
        : raw.replace(/\s+/g, " ").trim();
      res.json({ text: text.slice(0, 60000), title: parsed.hostname });
    } catch (err: any) {
      console.error("Import brief error:", err);
      res.status(500).json({ error: err.message || "Failed to import brief" });
    }
  });

  // Export the current level straight into the IMPION template at ../src/level.json
  // (fixed target — no user-controlled path). Run the constructor from legacy-constructor/.
  app.post("/api/export-level", (req, res) => {
    try {
      const project = req.body;
      if (!project || !Array.isArray(project.runs)) {
        return res.status(400).json({ error: "Expected a project with a runs array" });
      }
      const target = path.resolve(process.cwd(), "..", "src", "level.json");
      const repoSrc = path.resolve(process.cwd(), "..", "src");
      if (!fs.existsSync(repoSrc)) {
        return res.status(404).json({ error: "Template src/ not found (run from legacy-constructor/ inside the repo)" });
      }
      fs.writeFileSync(target, JSON.stringify(project, null, 2), "utf8");
      console.log("Exported level to", target);
      res.json({ success: true, path: target });
    } catch (err: any) {
      console.error("Export level error:", err);
      res.status(500).json({ error: err.message || "Failed to export level" });
    }
  });

  // API to save files fetched from Google Drive in the user's browser
  app.post("/api/save-file", (req, res) => {
    try {
      const { filePath, content } = req.body;
      
      if (!filePath || typeof content !== 'string') {
        return res.status(400).json({ error: "Missing filePath or content" });
      }

      // Secure the file path to prevent writing outside the applet directory
      const cleanPath = path.normalize(filePath).replace(/^(\.\.(\/|\\|$))+/, '');
      const absolutePath = path.resolve(process.cwd(), cleanPath);

      if (!absolutePath.startsWith(process.cwd())) {
        return res.status(403).json({ error: "Access denied: outside workspace boundary" });
      }

      // Prevent writing to system or ignored folders
      const pathParts = cleanPath.split(/[/\\]/);
      const isRestricted = pathParts.some(part => {
        const partLower = part.toLowerCase();
        return (
          partLower === 'node_modules' ||
          partLower === '.git' ||
          partLower === 'dist' ||
          partLower === '.next' ||
          partLower === 'build' ||
          partLower === 'out'
        );
      });

      if (isRestricted) {
        return res.status(403).json({ error: "Access denied: cannot write to system or dependency folders" });
      }

      // Ensure target directory exists
      const dir = path.dirname(absolutePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // Write file content
      fs.writeFileSync(absolutePath, content, 'utf8');
      console.log(`Successfully saved imported file: ${cleanPath}`);
      
      res.json({ success: true, path: cleanPath });
    } catch (err: any) {
      console.error("Error saving file:", err);
      res.status(500).json({ error: err.message || "Failed to save file" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
