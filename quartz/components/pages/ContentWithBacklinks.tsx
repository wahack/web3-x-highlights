import { ComponentChildren } from "preact"
import { htmlToJsx } from "../../util/jsx"
import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "../types"
import { simplifySlug, resolveRelative } from "../../util/path"
import { i18n } from "../../i18n"
import { classNames } from "../../util/lang"
import OverflowListFactory from "../OverflowList"
import style from "../styles/backlinks.scss"
import { Root } from "hast"

const { OverflowList, overflowListAfterDOMLoaded } = OverflowListFactory()

const ContentWithBacklinks: QuartzComponent = ({ fileData, tree, allFiles, cfg }: QuartzComponentProps) => {
  const content = htmlToJsx(fileData.filePath!, tree) as ComponentChildren
  const classes: string[] = fileData.frontmatter?.cssclasses ?? []
  const classString = ["popover-hint", ...classes].join(" ")
  
  // Check if content is empty (only has heading or is minimal)
  const root = tree as Root
  const hasRealContent = root.children && root.children.some((node: any) => {
    // Check if node has meaningful content beyond just headings
    if (node.type === "element") {
      // Skip headings and empty paragraphs
      if (node.tagName === "h1" || node.tagName === "h2" || node.tagName === "h3") {
        return false
      }
      // Check if paragraph has text content
      if (node.tagName === "p") {
        const hasText = node.children && node.children.some((child: any) => {
          if (child.type === "text") {
            return child.value.trim().length > 0
          }
          return false
        })
        return hasText
      }
      // Other elements likely have content
      return true
    }
    return false
  })
  
  // Check if this is a projects or handlers page
  const slug = fileData.slug || ""
  const isProjectsPage = slug.startsWith("projects/")
  const isHandlersPage = slug.startsWith("handlers/")
  
  // Get backlinks
  const simplifiedSlug = simplifySlug(slug)
  const backlinkFiles = allFiles.filter((file) => file.links?.includes(simplifiedSlug))
  
  // If content is empty and it's a projects/handlers page, show backlinks in content area
  if (!hasRealContent && (isProjectsPage || isHandlersPage)) {
    return (
      <article class={classString}>
        <div class="backlinks-content">
          <h2>{i18n(cfg.locale).components.backlinks.title || "Backlinks"}</h2>
          {backlinkFiles.length > 0 ? (
            <>
              <p>The following pages link to this page:</p>
              <OverflowList>
                {backlinkFiles.map((f) => (
                  <li>
                    <a href={resolveRelative(fileData.slug!, f.slug!)} class="internal">
                      {f.frontmatter?.title || f.slug}
                    </a>
                  </li>
                ))}
              </OverflowList>
            </>
          ) : (
            <p>No backlinks found for this page.</p>
          )}
        </div>
      </article>
    )
  }
  
  // Otherwise, show normal content (with backlinks appended if it's a projects/handlers page)
  if (hasRealContent && (isProjectsPage || isHandlersPage) && backlinkFiles.length > 0) {
    return (
      <article class={classString}>
        {content}
        <div class="backlinks-content">
          <h2>{i18n(cfg.locale).components.backlinks.title || "Backlinks"}</h2>
          <p>The following pages link to this page:</p>
          <OverflowList>
            {backlinkFiles.map((f) => (
              <li>
                <a href={resolveRelative(fileData.slug!, f.slug!)} class="internal">
                  {f.frontmatter?.title || f.slug}
                </a>
              </li>
            ))}
          </OverflowList>
        </div>
      </article>
    )
  }
  
  // Default: show normal content
  return <article class={classString}>{content}</article>
}

ContentWithBacklinks.css = style
ContentWithBacklinks.afterDOMLoaded = overflowListAfterDOMLoaded

export default (() => ContentWithBacklinks) satisfies QuartzComponentConstructor
