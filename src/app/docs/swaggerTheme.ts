export const customSiteTitle = 'DeliGo API Docs';

export const customfavIcon =
  'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA2NCA2NCI+CiAgPGRlZnM+CiAgICA8bGluZWFyR3JhZGllbnQgaWQ9ImciIHgxPSIwIiB5MT0iMCIgeDI9IjEiIHkyPSIxIj4KICAgICAgPHN0b3Agb2Zmc2V0PSIwJSIgc3RvcC1jb2xvcj0iI2ZmNWM5ZSIvPgogICAgICA8c3RvcCBvZmZzZXQ9IjEwMCUiIHN0b3AtY29sb3I9IiNkYzMxNzMiLz4KICAgIDwvbGluZWFyR3JhZGllbnQ+CiAgPC9kZWZzPgogIDxyZWN0IHdpZHRoPSI2NCIgaGVpZ2h0PSI2NCIgcng9IjE2IiBmaWxsPSJ1cmwoI2cpIi8+CiAgPHRleHQgeD0iMzIiIHk9IjQzIiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMzQiIGZvbnQtd2VpZ2h0PSI3MDAiIGZpbGw9IiNmZmYiIHRleHQtYW5jaG9yPSJtaWRkbGUiPkQ8L3RleHQ+Cjwvc3ZnPgo=';

// DeliGo-branded Swagger UI theme, matched to the DeliGo Admin dashboard's visual language:
// pink gradient hero banner, soft-tint pill badges, rounded white cards, auto light/dark.
export const customCss = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

:root {
  --dg-brand: #dc3173;
  --dg-brand-light: #ff5c9e;
  --dg-brand-dark: #a8225a;
  --dg-gradient: linear-gradient(120deg, #c81e5c 0%, #ef4d84 100%);

  --dg-blue: #3b82f6;
  --dg-purple: #8b5cf6;
  --dg-green: #10b981;
  --dg-amber: #f59e0b;
  --dg-red: #ef4444;

  --dg-bg: #f6f7fb;
  --dg-surface: #ffffff;
  --dg-border: #eef0f4;
  --dg-text: #1f2430;
  --dg-text-muted: #6b7280;
  --dg-shadow: 0 1px 3px rgba(17, 17, 17, 0.06), 0 6px 20px rgba(17, 17, 17, 0.04);
}

@media (prefers-color-scheme: dark) {
  :root {
    --dg-bg: #131019;
    --dg-surface: #1c1926;
    --dg-border: rgba(255, 255, 255, 0.08);
    --dg-text: #f2f0f6;
    --dg-text-muted: #a79fb3;
    --dg-shadow: 0 1px 3px rgba(0, 0, 0, 0.4), 0 8px 24px rgba(0, 0, 0, 0.35);
  }
}

html, body { background: var(--dg-bg) !important; }

.swagger-ui {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  color: var(--dg-text);
}

.swagger-ui ::-webkit-scrollbar { width: 10px; height: 10px; }
.swagger-ui ::-webkit-scrollbar-track { background: transparent; }
.swagger-ui ::-webkit-scrollbar-thumb {
  background: linear-gradient(180deg, var(--dg-brand-light), var(--dg-brand));
  border-radius: 8px;
}

/* ---------- Hero banner (topbar) ---------- */
.swagger-ui .topbar {
  background: var(--dg-gradient) !important;
  padding: 28px 32px !important;
  border-radius: 0 0 20px 20px;
  box-shadow: 0 10px 30px rgba(200, 30, 92, 0.28);
  margin-bottom: 8px;
}
.swagger-ui .topbar .download-url-wrapper { display: none !important; }
.swagger-ui .topbar .topbar-wrapper > a,
.swagger-ui .topbar a.link {
  display: none !important;
}
.swagger-ui .topbar-wrapper {
  max-width: 1460px;
  margin: 0 auto;
  align-items: flex-start !important;
  flex-direction: column !important;
  gap: 6px !important;
}
.swagger-ui .topbar-wrapper::before {
  content: 'DeliGo API Docs';
  color: #fff;
  font-weight: 800;
  font-size: 26px;
  letter-spacing: 0.2px;
}
.swagger-ui .topbar-wrapper::after {
  content: 'Explore, authenticate, and test every DeliGo endpoint';
  color: rgba(255, 255, 255, 0.85);
  font-weight: 500;
  font-size: 14px;
}

/* ---------- Info card ---------- */
.swagger-ui .information-container.wrapper,
.swagger-ui .info {
  background: var(--dg-surface);
  border: 1px solid var(--dg-border);
  border-radius: 16px;
  box-shadow: var(--dg-shadow);
  padding: 28px 32px;
  margin: 24px auto !important;
  max-width: 1460px;
}
.swagger-ui .info .title,
.swagger-ui .info .title small.version-stamp,
.swagger-ui .info hgroup.main {
  color: var(--dg-text);
}
.swagger-ui .info .title {
  color: var(--dg-text);
  font-weight: 800;
}
.swagger-ui .info .title small {
  background: rgba(220, 49, 115, 0.12) !important;
  color: var(--dg-brand) !important;
  font-weight: 700;
  border-radius: 999px;
  padding: 3px 10px !important;
}
.swagger-ui .info .title small pre {
  color: inherit !important;
  font-weight: 700;
}
.swagger-ui .info a.link,
.swagger-ui .info a {
  color: var(--dg-brand);
}
.swagger-ui .info li,
.swagger-ui .info p,
.swagger-ui .info table {
  color: var(--dg-text-muted);
}
.swagger-ui .info code {
  background: rgba(220, 49, 115, 0.1);
  border: 1px solid rgba(220, 49, 115, 0.25);
  color: var(--dg-brand-dark);
  border-radius: 4px;
}

/* ---------- Servers + Authorize row ---------- */
.swagger-ui .scheme-container {
  background: var(--dg-surface) !important;
  border: 1px solid var(--dg-border);
  border-radius: 16px;
  box-shadow: var(--dg-shadow);
  max-width: 1460px;
  margin: 0 auto 24px !important;
  padding: 20px 32px !important;
}
.swagger-ui select {
  background: var(--dg-surface);
  color: var(--dg-text);
  border: 1px solid var(--dg-border);
  border-radius: 10px;
}
.swagger-ui .btn.authorize {
  color: var(--dg-brand);
  border: 1.5px solid var(--dg-brand);
  background: rgba(220, 49, 115, 0.08);
  border-radius: 999px;
  font-weight: 700;
  transition: all 0.15s ease;
}
.swagger-ui .btn.authorize svg { fill: var(--dg-brand); }
.swagger-ui .btn.authorize:hover {
  background: var(--dg-gradient);
  border-color: transparent;
  color: #fff;
  box-shadow: 0 6px 16px rgba(200, 30, 92, 0.35);
}
.swagger-ui .btn.authorize:hover svg { fill: #fff; }

/* ---------- Section (tag) headers ---------- */
.swagger-ui .opblock-tag {
  color: var(--dg-text);
  border-bottom: 1px solid var(--dg-border);
  border-radius: 10px;
  transition: background 0.15s ease;
}
.swagger-ui .opblock-tag:hover {
  background: rgba(220, 49, 115, 0.06);
}
.swagger-ui .opblock-tag small {
  color: var(--dg-text-muted);
}

/* ---------- Operation cards ---------- */
.swagger-ui .opblock {
  background: var(--dg-surface) !important;
  border: 1px solid var(--dg-border) !important;
  border-radius: 14px !important;
  box-shadow: var(--dg-shadow);
  overflow: hidden;
  transition: box-shadow 0.15s ease, transform 0.15s ease;
}
.swagger-ui .opblock:hover {
  box-shadow: 0 4px 16px rgba(17, 17, 17, 0.1);
}
.swagger-ui .opblock .opblock-summary {
  border-color: transparent !important;
}
.swagger-ui .opblock .opblock-summary-path,
.swagger-ui .opblock .opblock-summary-description {
  color: var(--dg-text);
}
.swagger-ui .opblock .opblock-summary-method {
  border-radius: 999px !important;
  font-weight: 700;
  min-width: 84px;
  text-align: center;
  box-shadow: none !important;
}
.swagger-ui .opblock-section-header {
  background: transparent !important;
  box-shadow: none !important;
  border-bottom: 1px solid var(--dg-border);
}

/* Soft-tint method badges, mirroring the dashboard's tinted stat-card icons */
.swagger-ui .opblock.opblock-get { background: rgba(220, 49, 115, 0.04) !important; }
.swagger-ui .opblock.opblock-get .opblock-summary-method {
  background: var(--dg-brand) !important;
  color: #fff !important;
}

.swagger-ui .opblock.opblock-post { background: rgba(16, 185, 129, 0.04) !important; }
.swagger-ui .opblock.opblock-post .opblock-summary-method {
  background: var(--dg-green) !important;
}

.swagger-ui .opblock.opblock-put { background: rgba(245, 158, 11, 0.04) !important; }
.swagger-ui .opblock.opblock-put .opblock-summary-method {
  background: var(--dg-amber) !important;
}

.swagger-ui .opblock.opblock-delete { background: rgba(239, 68, 68, 0.04) !important; }
.swagger-ui .opblock.opblock-delete .opblock-summary-method {
  background: var(--dg-red) !important;
}

.swagger-ui .opblock.opblock-patch { background: rgba(139, 92, 246, 0.04) !important; }
.swagger-ui .opblock.opblock-patch .opblock-summary-method {
  background: var(--dg-purple) !important;
}

/* ---------- Buttons ---------- */
.swagger-ui .btn.execute {
  background: var(--dg-gradient) !important;
  border: none !important;
  border-radius: 999px !important;
  font-weight: 700;
  color: #fff !important;
  box-shadow: 0 6px 16px rgba(200, 30, 92, 0.3);
}
.swagger-ui .btn.execute:hover {
  filter: brightness(1.05);
}
.swagger-ui .btn.try-out__btn {
  border-radius: 999px;
  border-color: var(--dg-border);
  color: var(--dg-text);
}
.swagger-ui .btn.cancel {
  border-color: var(--dg-red);
  color: var(--dg-red);
  border-radius: 999px;
}
.swagger-ui .copy-to-clipboard {
  background: rgba(220, 49, 115, 0.1);
  border-radius: 8px;
}

/* ---------- Parameters / responses tables ---------- */
.swagger-ui .parameters-col_description,
.swagger-ui .parameter__name,
.swagger-ui table thead tr th,
.swagger-ui table tbody tr td {
  color: var(--dg-text);
}
.swagger-ui .parameter__name.required::after { color: var(--dg-brand); }
.swagger-ui table thead tr th {
  border-bottom: 2px solid rgba(220, 49, 115, 0.2);
  color: var(--dg-text-muted);
  font-weight: 600;
}
.swagger-ui table tbody tr td {
  border-bottom: 1px solid var(--dg-border);
}
.swagger-ui .response-col_status {
  color: var(--dg-brand-dark);
  font-weight: 700;
}
.swagger-ui .responses-inner h4,
.swagger-ui .responses-inner h5 {
  color: var(--dg-brand);
}
.swagger-ui .response-col_description__inner div.markdown,
.swagger-ui .microlight {
  background: rgba(220, 49, 115, 0.05) !important;
  border-radius: 10px;
}
.swagger-ui .tab li button.tablinks {
  color: var(--dg-text-muted);
}
.swagger-ui .tab li.active button.tablinks {
  color: var(--dg-brand);
}

/* ---------- Models ---------- */
.swagger-ui section.models {
  background: var(--dg-surface);
  border: 1px solid var(--dg-border) !important;
  border-radius: 16px;
  box-shadow: var(--dg-shadow);
}
.swagger-ui section.models.is-open h4 {
  border-bottom: 1px solid var(--dg-border);
  color: var(--dg-text);
}
.swagger-ui section.models h4 span { color: var(--dg-text); }
.swagger-ui .model-title { color: var(--dg-brand-dark); }
.swagger-ui .model { color: var(--dg-text-muted); }
.swagger-ui .model-box {
  background: rgba(220, 49, 115, 0.04);
  border-radius: 10px;
}

/* ---------- Misc ---------- */
.swagger-ui .loading-container .loading::before {
  border-top-color: var(--dg-brand);
}
.swagger-ui input[type=text],
.swagger-ui input[type=password],
.swagger-ui textarea {
  background: var(--dg-surface);
  color: var(--dg-text);
  border: 1px solid var(--dg-border);
  border-radius: 8px;
}
.swagger-ui .dialog-ux .modal-ux {
  background: var(--dg-surface);
  border-radius: 16px;
  box-shadow: var(--dg-shadow);
}
.swagger-ui .dialog-ux .modal-ux-header h3 {
  color: var(--dg-text);
}
`;
