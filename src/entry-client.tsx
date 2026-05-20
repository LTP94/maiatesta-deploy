import { StrictMode } from "react";
import { hydrateRoot } from "react-dom/client";
import App from "./App";

// Punto de entrada de React: hidrata el HTML estatico generado para crawlers.
hydrateRoot(
  document.getElementById("root") as HTMLElement,
  // StrictMode ayuda a detectar efectos secundarios inseguros durante el desarrollo.
  <StrictMode>
    <App routePath={window.location.pathname} />
  </StrictMode>
);
