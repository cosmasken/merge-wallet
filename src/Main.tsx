import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";

function App() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-1000">
      <h1 className="text-2xl font-bold text-primary">Merge Wallet</h1>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
