/**
 * Language detection and auto-redirect script
 * Detects browser language and redirects to appropriate language version
 */

function detectBrowserLanguage(): string {
  // Get browser language
  const browserLang = navigator.language || (navigator as any).userLanguage || "en"
  
  // Extract language code (e.g., "zh-CN" -> "zh", "en-US" -> "en")
  const langCode = browserLang.split("-")[0].toLowerCase()
  
  // Map to supported languages
  if (langCode === "zh") {
    return "zh-CN"
  }
  
  // Default to English
  return "en"
}

function getCurrentPageLanguage(): string | null {
  // Check if current page has lang attribute in frontmatter
  const htmlLang = document.documentElement.lang
  if (htmlLang) {
    if (htmlLang.startsWith("zh")) {
      return "zh-CN"
    }
    return "en"
  }
  
  // Check slug for language indicator
  const slug = document.body.dataset.slug || ""
  if (slug.endsWith(".zh") || slug.endsWith("-zh")) {
    return "zh-CN"
  }
  if (slug.endsWith(".en") || slug.endsWith("-en")) {
    return "en"
  }
  
  return null
}

function findAlternateLanguageUrl(targetLang: string): string | null {
  const currentSlug = document.body.dataset.slug || ""
  if (!currentSlug) return null
  
  // Get all language links
  const langLinks = document.querySelectorAll('a[href*=".en"], a[href*=".zh"], a[href*="-en"], a[href*="-zh"]')
  
  // Try to find alternate language version
  let baseSlug = currentSlug
  if (currentSlug.endsWith(".en") || currentSlug.endsWith("-en")) {
    baseSlug = currentSlug.replace(/\.(en|zh)$/, "").replace(/-(en|zh)$/, "")
    if (targetLang === "zh-CN") {
      return "/" + baseSlug + ".zh"
    }
  } else if (currentSlug.endsWith(".zh") || currentSlug.endsWith("-zh")) {
    baseSlug = currentSlug.replace(/\.(en|zh)$/, "").replace(/-(en|zh)$/, "")
    if (targetLang === "en") {
      return "/" + baseSlug + ".en"
    }
  } else {
    // No language suffix, try to find alternate
    if (targetLang === "zh-CN") {
      return "/" + currentSlug + ".zh"
    } else {
      return "/" + currentSlug + ".en"
    }
  }
  
  return null
}

function shouldRedirect(): boolean {
  // Check if user has manually selected a language (stored in localStorage)
  const manualLang = localStorage.getItem("quartz-language-preference")
  if (manualLang) {
    return false // Don't auto-redirect if user has manually selected
  }
  
  // Check if this is the first visit (no language preference set)
  const hasVisited = sessionStorage.getItem("quartz-has-visited")
  if (hasVisited) {
    return false // Don't redirect on subsequent visits
  }
  
  // Only redirect on index page or pages without language suffix
  const currentSlug = document.body?.dataset?.slug || ""
  if (currentSlug === "index" || (!currentSlug.endsWith(".en") && !currentSlug.endsWith(".zh") && 
      !currentSlug.endsWith("-en") && !currentSlug.endsWith("-zh"))) {
    return true
  }
  
  return false
}

document.addEventListener("DOMContentLoaded", () => {
  // Mark that user has visited
  sessionStorage.setItem("quartz-has-visited", "true")
  
  if (!shouldRedirect()) {
    return
  }
  
  const browserLang = detectBrowserLanguage()
  const currentLang = getCurrentPageLanguage()
  
  // If browser language matches current page, no redirect needed
  if (currentLang === browserLang) {
    return
  }
  
  // If current page has no language indicator, try to redirect
  if (!currentLang) {
    const targetUrl = findAlternateLanguageUrl(browserLang)
    if (targetUrl) {
      // Check if target URL exists by trying to fetch it
      fetch(targetUrl, { method: "HEAD" })
        .then((response) => {
          if (response.ok) {
            window.location.href = targetUrl
          } else {
            // If target doesn't exist, try fallback to English
            if (browserLang !== "en") {
              const fallbackUrl = findAlternateLanguageUrl("en")
              if (fallbackUrl && fallbackUrl !== targetUrl) {
                fetch(fallbackUrl, { method: "HEAD" })
                  .then((response) => {
                    if (response.ok) {
                      window.location.href = fallbackUrl
                    }
                  })
                  .catch(() => {
                    // Silently fail
                  })
              }
            }
          }
        })
        .catch(() => {
          // If fetch fails, try the fallback (English)
          if (browserLang !== "en") {
            const fallbackUrl = findAlternateLanguageUrl("en")
            if (fallbackUrl && fallbackUrl !== targetUrl) {
              fetch(fallbackUrl, { method: "HEAD" })
                .then((response) => {
                  if (response.ok) {
                    window.location.href = fallbackUrl
                  }
                })
                .catch(() => {
                  // Silently fail
                })
            }
          }
        })
    } else if (browserLang === "en") {
      // If no alternate found but browser wants English, stay on current page
      // (it's likely already English or has no language)
    }
  } else {
    // Current page has a language, but it doesn't match browser
    // Only redirect if browser language is different and we can find alternate
    const targetUrl = findAlternateLanguageUrl(browserLang)
    if (targetUrl) {
      fetch(targetUrl, { method: "HEAD" })
        .then((response) => {
          if (response.ok) {
            window.location.href = targetUrl
          }
        })
        .catch(() => {
          // Silently fail
        })
    }
  }
})

// Store language preference when user manually switches
document.addEventListener("click", (e) => {
  const target = e.target as HTMLElement
  if (target.closest(".language-link")) {
    const link = target.closest(".language-link") as HTMLAnchorElement
    const href = link.getAttribute("href") || ""
    if (href.includes(".zh") || href.includes("-zh")) {
      localStorage.setItem("quartz-language-preference", "zh-CN")
    } else if (href.includes(".en") || href.includes("-en")) {
      localStorage.setItem("quartz-language-preference", "en")
    }
  }
})
