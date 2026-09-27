const express = require("express");
const fs = require("node:fs");
const path = require("node:path");

function attachFrontend(app, {
  development = false,
  distDirectory = path.join(__dirname, "../client/dist"),
} = {}) {
  const indexFile = path.join(distDirectory, "index.html");

  if (!development) {
    app.use(express.static(distDirectory, {
      index: false,
      setHeaders(res) { res.setHeader("Cache-Control", "no-cache"); },
    }));
  }

  app.use((req, res, next) => {
    if (!["GET", "HEAD"].includes(req.method) || !req.accepts("html")) return next();
    // Missing assets and API-like paths must not return the SPA HTML.
    if (path.extname(req.path) || /^\/(api|assets|js|css)(\/|$)/.test(req.path)) return next();
    res.setHeader("Cache-Control", "no-store");
    if (development) {
      return res.redirect(302, `http://127.0.0.1:5173${req.originalUrl}`);
    }
    if (!fs.existsSync(indexFile)) {
      return res.status(503).type("text").send(
        "React build is missing. Run npm run build, then open this page again. For development, run npm run dev and npm run dev --prefix client.",
      );
    }
    return res.sendFile(indexFile);
  });
}

module.exports = { attachFrontend };
