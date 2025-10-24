import { useEffect, useState } from "react";
import Editor from "./Editor.jsx";
import LandingPage from "./LandingPage.jsx";

const VIEW = {
  landing: "landing",
  editor: "editor",
};

function getViewFromHash() {
  if (typeof window === "undefined") {
    return VIEW.landing;
  }
  return window.location.hash === "#editor" ? VIEW.editor : VIEW.landing;
}

export default function App() {
  const [view, setView] = useState(() => getViewFromHash());

  useEffect(() => {
    const handleHashChange = () => {
      setView(getViewFromHash());
    };

    if (typeof window === "undefined") {
      return undefined;
    }

    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  const openEditor = () => {
    if (typeof window !== "undefined") {
      if (window.location.hash !== "#editor") {
        window.location.hash = "editor";
      }
    }
    setView(VIEW.editor);
  };

  const openLanding = () => {
    if (typeof window !== "undefined" && window.location.hash) {
      window.location.hash = "";
    }
    setView(VIEW.landing);
  };

  if (view === VIEW.editor) {
    return <Editor onNavigateHome={openLanding} />;
  }

  return <LandingPage onStart={openEditor} />;
}
