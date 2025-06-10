import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Global error handler to catch unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
  console.error('Promise:', event.promise);
  console.error('Stack trace:', event.reason?.stack);
  
  // Prevent the default browser behavior that might cause navigation
  event.preventDefault();
});

createRoot(document.getElementById("root")!).render(<App />);
