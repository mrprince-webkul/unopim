import "@fontsource-variable/bricolage-grotesque";
import "@fontsource-variable/inter";
import "@fontsource/space-mono/400.css";
import "@fontsource/space-mono/700.css";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { HelmetProvider } from "react-helmet-async";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <HelmetProvider>
    <App />
  </HelmetProvider>
);
