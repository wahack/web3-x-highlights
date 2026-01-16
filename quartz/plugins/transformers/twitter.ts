import { QuartzTransformerPlugin } from "../types"
import { visit, SKIP } from "unist-util-visit"
import { Root, Element } from "hast"
import { JSResource } from "../../util/resources"
// @ts-ignore
import twitterScript from "../../components/scripts/twitter.inline"

export interface TwitterOptions {
  /** Enable Twitter/X post embedding */
  enableTwitterEmbed: boolean
  /** Theme for embedded tweets: 'light' or 'dark' */
  theme?: "light" | "dark"
  /** Maximum width of embedded tweets in pixels (220-550) */
  maxWidth?: number
  /** Hide media in embedded tweets */
  hideMedia?: boolean
  /** Hide thread context in reply tweets */
  hideThread?: boolean
  /** Language code for embedded content */
  lang?: string
}

const defaultOptions: TwitterOptions = {
  enableTwitterEmbed: true,
  theme: "light",
  maxWidth: 550,
  hideMedia: false,
  hideThread: false,
}

// Regex to match Twitter/X URLs
// Matches: https://x.com/username/status/1234567890 or https://twitter.com/username/status/1234567890
const twitterUrlRegex = /(?:https?:\/\/)?(?:www\.)?(?:twitter\.com|x\.com)\/(\w+)\/status\/(\d+)/i
// Matches: https://x.com/i/web/status/1234567890
const twitterUrlRegexAlt = /(?:https?:\/\/)?(?:www\.)?(?:twitter\.com|x\.com)\/i\/web\/status\/(\d+)/i

export const Twitter: QuartzTransformerPlugin<Partial<TwitterOptions>> = (userOpts) => {
  const opts = { ...defaultOptions, ...userOpts }

  return {
    name: "Twitter",
    getQuartzComponents() {
      return []
    },
    htmlPlugins() {
      if (!opts.enableTwitterEmbed) {
        return []
      }

      return [
        () => {
          return (tree: Root) => {
            visit(tree, "element", (node: Element, index: number | undefined, parent: any) => {
              // Skip if already inside a twitter-tweet blockquote
              if (parent && parent.tagName === "blockquote") {
                const parentClass = parent.properties?.className || parent.properties?.class
                const classArray = Array.isArray(parentClass) 
                  ? parentClass 
                  : typeof parentClass === "string" 
                    ? [parentClass] 
                    : []
                if (classArray.includes("twitter-tweet")) {
                  return SKIP
                }
              }

              // Check if it's a link element
              if (node.tagName === "a" && typeof node.properties.href === "string") {
                const href = node.properties.href as string
                let match = href.match(twitterUrlRegex)
                let tweetId: string | null = null
                let username: string | null = null

                if (match) {
                  username = match[1]
                  tweetId = match[2]
                } else {
                  // Try alternative format
                  const altMatch = href.match(twitterUrlRegexAlt)
                  if (altMatch) {
                    tweetId = altMatch[1]
                  }
                }

                if (tweetId && parent && index !== undefined) {
                  // Build the embed URL (use original format for better compatibility)
                  const embedUrl = username 
                    ? `https://x.com/${username}/status/${tweetId}`
                    : `https://x.com/i/web/status/${tweetId}`
                  
                  // Get link text or use default
                  const linkText = node.children
                    ?.map((child: any) => {
                      if (child.type === "text") return child.value
                      if (child.type === "element" && child.tagName === "br") return "\n"
                      return ""
                    })
                    .join("")
                    .trim() || `Tweet by ${username || "user"}`
                  
                  // Create blockquote element for Twitter embed
                  const blockquote: Element = {
                    type: "element",
                    tagName: "blockquote",
                    properties: {
                      className: ["twitter-tweet"],
                      "data-theme": opts.theme,
                      "data-width": opts.maxWidth?.toString(),
                      "data-lang": opts.lang || "en",
                      ...(opts.hideMedia && { "data-cards": "hidden" }),
                      ...(opts.hideThread && { "data-conversation": "none" }),
                    },
                    children: [
                      {
                        type: "element",
                        tagName: "p",
                        properties: {},
                        children: [
                          {
                            type: "text",
                            value: linkText,
                          },
                        ],
                      },
                      {
                        type: "element",
                        tagName: "a",
                        properties: {
                          href: embedUrl,
                          "data-no-popover": true, // Prevent popover on the inner link
                        },
                        children: [
                          {
                            type: "text",
                            value: embedUrl,
                          },
                        ],
                      },
                    ],
                  }

                  // Replace the link with the blockquote in parent
                  parent.children[index] = blockquote
                  return SKIP
                }
              }
            })
          }
        },
      ]
    },
    externalResources() {
      if (!opts.enableTwitterEmbed) {
        return {}
      }

      return {
        js: [
          {
            src: "https://platform.twitter.com/widgets.js",
            loadTime: "afterDOMReady",
            contentType: "external",
            spaPreserve: true,
          } as JSResource,
          {
            script: twitterScript,
            loadTime: "afterDOMReady",
            contentType: "inline",
            spaPreserve: true,
          } as JSResource,
        ],
      }
    },
  }
}
