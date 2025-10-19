import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Força dark mode por padrão
document.documentElement.classList.add('dark');

createRoot(document.getElementById("root")!).render(<App />);
