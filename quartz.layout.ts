import { PageLayout, SharedLayout } from "./quartz/cfg"
import * as Component from "./quartz/components"
import { FileTrieNode } from "./quartz/util/fileTrie"

// Custom sort function for Explorer: sort by date in reverse chronological order (newest first)
// Note: This function must be completely self-contained (no internal functions) to be properly serialized
const sortByDateDescending = (a, b) => {
  try {
    // Sort folders first
    if (a.isFolder && !b.isFolder) return -1
    if (!a.isFolder && b.isFolder) return 1

    // Parse date from node a (completely inline to avoid serialization issues)
    let dateA: number | null = null
    try {
      const dateFromDisplayA = Date.parse(a.displayName || '')
      if (!isNaN(dateFromDisplayA)) {
        dateA = dateFromDisplayA
      } else {
        const dateFromSlugA = Date.parse(a.slug || '')
        if (!isNaN(dateFromSlugA)) {
          dateA = dateFromSlugA
        } else if (a.data && typeof a.data === 'object' && 'date' in a.data && a.data.date) {
          const date = new Date(a.data.date as Date)
          if (!isNaN(date.getTime())) {
            dateA = date.getTime()
          }
        }
      }
    } catch {
      // Ignore parsing errors
    }

    // Parse date from node b (completely inline to avoid serialization issues)
    let dateB: number | null = null
    try {
      const dateFromDisplayB = Date.parse(b.displayName || '')
      if (!isNaN(dateFromDisplayB)) {
        dateB = dateFromDisplayB
      } else {
        const dateFromSlugB = Date.parse(b.slug || '')
        if (!isNaN(dateFromSlugB)) {
          dateB = dateFromSlugB
        } else if (b.data && typeof b.data === 'object' && 'date' in b.data && b.data.date) {
          const date = new Date(b.data.date as Date)
          if (!isNaN(date.getTime())) {
            dateB = date.getTime()
          }
        }
      }
    } catch {
      // Ignore parsing errors
    }

    // If both have dates, sort by date descending (newest first)
    if (dateA !== null && dateB !== null) {
      return dateB - dateA
    }

    // If only one has a date, prioritize it
    if (dateA !== null && dateB === null) return -1
    if (dateA === null && dateB !== null) return 1

    // Otherwise, sort alphabetically
    return (a.displayName || '').localeCompare(b.displayName || '', undefined, {
      numeric: true,
      sensitivity: "base",
    })
  } catch {
    // Fallback to alphabetical sort if anything goes wrong
    return (a.displayName || '').localeCompare(b.displayName || '', undefined, {
      numeric: true,
      sensitivity: "base",
    })
  }
}

// components shared across all pages
export const sharedPageComponents: SharedLayout = {
  head: Component.Head(),
  header: [],
  afterBody: [],
  footer: Component.Footer({
    links: {
      // GitHub: "https://github.com/jackyzha0/quartz",
      // "Discord Community": "https://discord.gg/cRFFHYye7t",
    },
  }),
}

// components for pages that display a single page (e.g. a single note)
export const defaultContentPageLayout: PageLayout = {
  beforeBody: [
    Component.ConditionalRender({
      component: Component.Breadcrumbs(),
      condition: (page) => page.fileData.slug !== "index",
    }),
    Component.ArticleTitle(),
    Component.ContentMeta(),
    // Show trending components on index page
    Component.ConditionalRender({
      component: Component.StatsCards({ title: "Data Overview", showIcons: true }),
      condition: (page) => page.fileData.slug === "index",
    }),
    Component.ConditionalRender({
      component: Component.TagCloud({ title: "Tag Cloud", type: "both", limit: 40, minSize: 0.9, maxSize: 1.8 }),
      condition: (page) => page.fileData.slug === "index",
    }),
    Component.ConditionalRender({
      component: Component.TrendingRank({ title: "Trending", type: "both", limit: 10, showTrend: true }),
      condition: (page) => page.fileData.slug === "index",
    }),
    Component.TagList(),
  ],
  left: [
    Component.PageTitle(),
    Component.MobileOnly(Component.Spacer()),
    Component.Flex({
      components: [
        {
          Component: Component.Search(),
          grow: true,
        },
        { Component: Component.Darkmode() },
        { Component: Component.ReaderMode() },
      ],
    }),
    Component.Explorer({
      sortFn: sortByDateDescending,
    }),
  ],
  right: [
    Component.Graph(),
    Component.DesktopOnly(Component.TableOfContents()),
    Component.Backlinks(),
  ],
  // Use ConditionalContent which shows backlinks in content area for projects/handlers pages
  pageBody: Component.ConditionalContent(),
}

// components for pages that display lists of pages  (e.g. tags or folders)
export const defaultListPageLayout: PageLayout = {
  beforeBody: [Component.Breadcrumbs(), Component.ArticleTitle(), Component.ContentMeta()],
  left: [
    Component.PageTitle(),
    Component.MobileOnly(Component.Spacer()),
    Component.Flex({
      components: [
        {
          Component: Component.Search(),
          grow: true,
        },
        { Component: Component.Darkmode() },
      ],
    }),
    Component.Explorer({
      sortFn: sortByDateDescending,
    }),
  ],
  right: [],
}

