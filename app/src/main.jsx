import { createRoot } from "react-dom/client";
import "./storage.js";
import "./styles.css";
import App from "./App.jsx";
import { SupabaseAuthGate } from "./auth/SupabaseAuthContext.jsx";

createRoot(document.getElementById("root")).render(
  <SupabaseAuthGate>
    <App />
  </SupabaseAuthGate>,
);
