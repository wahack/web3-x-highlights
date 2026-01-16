/**
 * Twitter/X embed script
 * Handles loading and re-rendering Twitter embeds in SPA navigation
 */

export default function twitterEmbedScript() {
  // Function to load Twitter widgets
  function loadTwitterWidgets() {
    if (typeof window !== "undefined" && (window as any).twttr) {
      // Twitter widgets.js is already loaded
      const twttr = (window as any).twttr
      if (twttr.widgets && typeof twttr.widgets.load === "function") {
        twttr.widgets.load()
      }
    } else {
      // Load Twitter widgets.js if not already loaded
      const script = document.createElement("script")
      script.src = "https://platform.twitter.com/widgets.js"
      script.async = true
      script.charset = "utf-8"
      script.onload = () => {
        if ((window as any).twttr && (window as any).twttr.widgets) {
          ;(window as any).twttr.widgets.load()
        }
      }
      document.head.appendChild(script)
    }
  }

  // Load on initial page load
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", loadTwitterWidgets)
  } else {
    loadTwitterWidgets()
  }

  // Re-load on SPA navigation (Quartz uses 'nav' event)
  document.addEventListener("nav", () => {
    // Small delay to ensure DOM is updated
    setTimeout(loadTwitterWidgets, 100)
  })
}
