import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles.css";

// Punto de entrada de React: monta la aplicacion dentro del div #root de index.html.
createRoot(document.getElementById("root") as HTMLElement).render(
  // StrictMode ayuda a detectar efectos secundarios inseguros durante el desarrollo.
  <StrictMode>
    <App />
  </StrictMode>,
);
