import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { ThemeProvider } from "next-themes";

// Global error handlers to prevent unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  console.log('Caught unhandled promise rejection:', event.reason);
  // Prevent the default browser behavior (like logging to console as error)
  event.preventDefault();
});

window.addEventListener('error', (event) => {
  console.log('Caught global error:', event.error);
});

createRoot(document.getElementById("root")!).render(
  <ThemeProvider attribute="class" defaultTheme="light">
    <App />
  </ThemeProvider>
);
