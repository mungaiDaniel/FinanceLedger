import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getCurrentUser, loginDemo } from "../api/client";

export default function DemoLogin({ onLogin }) {
  const navigate = useNavigate();
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    loginDemo()
      .then(() => getCurrentUser())
      .then((user) => {
        if (active) {
          onLogin(user);
          navigate("/dashboard", { replace: true });
        }
      })
      .catch(() => {
        if (active) setError("The live demo could not be opened. Please try again shortly.");
      });
    return () => {
      active = false;
    };
  }, [navigate, onLogin]);

  return (
    <main className="app-loading demo-login-page">
      {error ? (
        <>
          <p>{error}</p>
          <Link className="secondary-button" to="/">
            Back home
          </Link>
        </>
      ) : (
        "Opening the live demo…"
      )}
    </main>
  );
}
