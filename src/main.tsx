import { createRoot } from "react-dom/client";
import { ThemeProvider } from "./components/providers/ThemeProvider";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <ThemeProvider>
    <App />
  </ThemeProvider>
);
