import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import ytSearch from "yt-search";
import * as cheerio from "cheerio";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.get("/api/proxy", async (req, res) => {
    try {
      const targetUrl = req.query.url as string;
      if (!targetUrl) return res.status(400).send("Missing url parameter");

      const response = await fetch(targetUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.5"
        }
      });

      const contentType = response.headers.get("content-type") || "";
      res.set("Content-Type", contentType);

      if (contentType.includes("text/html")) {
        const html = await response.text();
        const $ = cheerio.load(html);

        // Inject base tag for external assets (images, css)
        const urlObj = new URL(targetUrl);
        $("head").prepend(`<base href="${urlObj.origin}">`);

        // Inject CSS to force text selection (easy copy paste)
        $("head").append(`
          <style>
            * { 
              user-select: text !important; 
              -webkit-user-select: text !important; 
            }
            /* Hide common annoying overlays if possible */
            .qc-cmp2-container, #qc-cmp2-ui, .cookie-banner { display: none !important; }
          </style>
        `);

        // Rewrite all links to go through our proxy
        $("a").each((i, link) => {
          const href = $(link).attr("href");
          if (!href) return;
          
          try {
            let absoluteUrl = "";
            if (href.startsWith("http")) absoluteUrl = href;
            else if (href.startsWith("//")) absoluteUrl = "https:" + href;
            else absoluteUrl = new URL(href, targetUrl).toString();

            $(link).attr("href", `/api/proxy?url=${encodeURIComponent(absoluteUrl)}`);
            $(link).attr("target", "_self"); // force open in the same iframe
          } catch (e) {
            // ignore invalid urls
          }
        });

        // Remove scripts to prevent frame busting and popups
        $("script").remove();

        res.send($.html());
      } else {
        const buffer = await response.arrayBuffer();
        res.send(Buffer.from(buffer));
      }
    } catch (error) {
      console.error("Proxy error:", error);
      res.status(500).send("Error fetching content.");
    }
  });

  app.get("/api/search-youtube", async (req, res) => {
    try {
      const query = req.query.q as string;
      if (!query) {
        return res.status(400).json({ error: "Missing query parameter" });
      }
      
      const r = await ytSearch(query);
      const videos = r.videos.slice(0, 10).map(v => ({
        id: v.videoId,
        title: v.title,
        thumbnail: v.thumbnail,
        author: v.author.name,
        duration: v.timestamp
      }));
      
      res.json({ videos });
    } catch (error) {
      console.error("YouTube search error:", error);
      res.status(500).json({ error: "Failed to search YouTube" });
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
    // Production: serve static files from dist
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    // Fallback for SPA routing in React
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
