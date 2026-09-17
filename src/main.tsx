import { createRoot } from "react-dom/client";
import { ThemeProvider } from "./components/providers/ThemeProvider";
import { I18nProvider } from "./contexts/I18nContext";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <ThemeProvider>
    <I18nProvider>
      <App />
    </I18nProvider>
  </ThemeProvider>
);
