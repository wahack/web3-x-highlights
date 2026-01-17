import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { FullSlug, simplifySlug } from "../util/path"

const LanguageSwitcher: QuartzComponent = ({ fileData, allFiles }: QuartzComponentProps) => {
  if (!fileData.slug || !allFiles) {
    return null
  }

  // Get current language from frontmatter
  const frontmatter = fileData.frontmatter as Record<string, any> | undefined
  const currentLang = (frontmatter?.lang as string) || "en"
  
  // Get current slug and relativePath
  const currentSlug = fileData.slug as string
  const currentRelativePath = (fileData.relativePath as string) || ""
  const currentFilePath = (fileData.filePath as string) || ""
  
  // Try to get filename from relativePath or filePath
  let filename = currentRelativePath
  if (!filename && currentFilePath) {
    // Extract filename from absolute path
    const parts = currentFilePath.replace(/\\/g, "/").split("/")
    filename = parts[parts.length - 1] || ""
  }
  
  let isEn = false
  let isZh = false
  let baseName = ""

  // Check filename first (most reliable)
  if (filename.endsWith(".en.md")) {
    isEn = true
    baseName = filename.replace(/\.en\.md$/, "")
  } else if (filename.endsWith(".zh.md")) {
    isZh = true
    baseName = filename.replace(/\.zh\.md$/, "")
  } else {
    // Fallback to frontmatter
    if (currentLang === "en" || currentLang === "en-US") {
      isEn = true
      baseName = filename.replace(/\.md$/, "")
    } else if (currentLang === "zh-CN" || currentLang === "zh") {
      isZh = true
      baseName = filename.replace(/\.md$/, "")
    } else {
      return null
    }
  }

  // Only show switcher for files that have language versions
  if (!isEn && !isZh) {
    return null
  }

  // Find alternate language file by matching filename
  let alternateFile = null
  let alternateLabel = ""

  if (isEn) {
    // Look for .zh.md version
    const zhFilename = baseName + ".zh.md"
    alternateFile = allFiles.find(f => {
      const relPath = (f.relativePath as string) || ""
      const filePath = (f.filePath as string) || ""
      
      // Check relativePath first
      if (relPath) {
        const normalizedRelPath = relPath.replace(/\\/g, "/")
        const normalizedZhPath = zhFilename.replace(/\\/g, "/")
        if (normalizedRelPath === normalizedZhPath || 
            normalizedRelPath.endsWith("/" + normalizedZhPath)) {
          return true
        }
      }
      
      // Check filePath as fallback
      if (filePath) {
        const normalizedFilePath = filePath.replace(/\\/g, "/")
        const normalizedZhPath = zhFilename.replace(/\\/g, "/")
        if (normalizedFilePath.endsWith("/" + normalizedZhPath)) {
          return true
        }
      }
      
      return false
    })
    alternateLabel = "中文"
  } else if (isZh) {
    // Look for .en.md version
    const enFilename = baseName + ".en.md"
    alternateFile = allFiles.find(f => {
      const relPath = (f.relativePath as string) || ""
      const filePath = (f.filePath as string) || ""
      
      // Check relativePath first
      if (relPath) {
        const normalizedRelPath = relPath.replace(/\\/g, "/")
        const normalizedEnPath = enFilename.replace(/\\/g, "/")
        if (normalizedRelPath === normalizedEnPath || 
            normalizedRelPath.endsWith("/" + normalizedEnPath)) {
          return true
        }
      }
      
      // Check filePath as fallback
      if (filePath) {
        const normalizedFilePath = filePath.replace(/\\/g, "/")
        const normalizedEnPath = enFilename.replace(/\\/g, "/")
        if (normalizedFilePath.endsWith("/" + normalizedEnPath)) {
          return true
        }
      }
      
      return false
    })
    alternateLabel = "English"
  }

  if (!alternateFile || !alternateFile.slug) {
    return null
  }

  // Convert slug to URL using simplifySlug
  const alternateSlug = alternateFile.slug as FullSlug
  const simpleSlug = simplifySlug(alternateSlug)
  const alternateUrl = "/" + simpleSlug

  return (
    <div class="language-switcher">
      <a href={alternateUrl} class="language-link">
        {alternateLabel}
      </a>
    </div>
  )
}

LanguageSwitcher.css = `
.language-switcher {
  display: inline-flex;
  align-items: center;
}

.language-link {
  display: inline-flex;
  align-items: center;
  padding: 0.5rem 1rem;
  border-radius: 0.375rem;
  text-decoration: none;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--secondary);
  background: var(--highlight);
  border: 1px solid var(--lightgray);
  transition: all 0.2s ease;
  cursor: pointer;
  white-space: nowrap;
}

.language-link:hover {
  background: var(--tertiary);
  color: var(--dark);
  border-color: var(--secondary);
}

header .language-switcher {
  margin-left: auto;
  margin-right: 0;
}

@media (max-width: 768px) {
  header .language-switcher {
    margin-left: 0;
    margin-top: 0.5rem;
    width: 100%;
    justify-content: flex-end;
  }
}
`

export default (() => LanguageSwitcher) satisfies QuartzComponentConstructor
