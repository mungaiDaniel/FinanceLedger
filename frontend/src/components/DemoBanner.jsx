import { useEffect } from "react";
import { DEMO_MODE } from "../api/config";

// Persistent notice shown only when the app is built with VITE_DEMO_MODE=true.
export default function DemoBanner() {
  useEffect(() => {
    if (!DEMO_MODE) return undefined;
    document.body.classList.add("demo-mode");
    return () => document.body.classList.remove("demo-mode");
  }, []);

  if (!DEMO_MODE) return null;
  return (
    <div className="demo-banner" role="status">
      Demo mode — sample data, changes are not saved.
    </div>
  );
}
