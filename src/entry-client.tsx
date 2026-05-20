import { StrictMode } from "react";
import { createRoot, hydrateRoot } from "react-dom/client";
import App from "./App";

const root = document.getElementById("root") as HTMLElement;
const app = (
  // StrictMode ayuda a detectar efectos secundarios inseguros durante el desarrollo.
  <StrictMode>
    <App routePath={window.location.pathname} />
  </StrictMode>
);

// Dev serves index.html without prerendered app markup, so hydration would
// compare React against the <!--app-html--> placeholder and fail. Production
// SSG replaces that marker with real HTML, which should be hydrated.
const hasPrerenderedHtml =
  root.innerHTML.trim().length > 0 && !root.innerHTML.includes("app-html");

if (hasPrerenderedHtml) {
  hydrateRoot(root, app);
} else {
  createRoot(root).render(app);
}
