import { QuartzEmitterPlugin } from "../types"
import { FilePath, joinSegments } from "../../util/path"
import path from "path"
import fs from "fs"

// Import the generation logic directly
async function generateTrendingDataToOutput(outputDir: string, contentDir: string) {
  const files = await fs.promises.readdir(contentDir)
  const mdFiles = files.filter(f => f.endsWith('.md') && f !== 'index.md')
  
  const projectMentions = new Map()
  const handlerMentions = new Map()
  const projectDates = new Map()
  const handlerDates = new Map()
  
  const projectRegex = /\[\[projects\/([^\|]+)\|/g
  const handlerRegex = /\[\[handlers\/([^\|]+)\|/g
  
  for (const file of mdFiles) {
    const filePath = path.join(contentDir, file)
    const content = await fs.promises.readFile(filePath, 'utf-8')
    const date = file.replace('.md', '').trim()
    
    const coreReportsMatch = content.match(/##\s+\*{0,2}Core Research Reports\*{0,2}\s*\n([\s\S]*?)(?=\n##|$)/i)
    const coreReportsContent = coreReportsMatch ? coreReportsMatch[1] : ''
    
    let match
    if (coreReportsContent) {
      projectRegex.lastIndex = 0
      while ((match = projectRegex.exec(coreReportsContent)) !== null) {
        const project = match[1]
        projectMentions.set(project, (projectMentions.get(project) || 0) + 1)
        if (!projectDates.has(project)) {
          projectDates.set(project, new Set())
        }
        projectDates.get(project).add(date)
      }
    }
    
    handlerRegex.lastIndex = 0
    while ((match = handlerRegex.exec(content)) !== null) {
      const handler = match[1]
      handlerMentions.set(handler, (handlerMentions.get(handler) || 0) + 1)
      if (!handlerDates.has(handler)) {
        handlerDates.set(handler, new Set())
      }
      handlerDates.get(handler).add(date)
    }
  }
  
  const projects = Array.from(projectMentions.entries())
    .map(([name, count]) => ({
      name,
      count,
      dates: Array.from(projectDates.get(name) || []),
      recentMentions: Array.from(projectDates.get(name) || []).length
    }))
    .sort((a, b) => b.count - a.count)
  
  const handlers = Array.from(handlerMentions.entries())
    .map(([name, count]) => ({
      name,
      count,
      dates: Array.from(handlerDates.get(name) || []),
      recentMentions: Array.from(handlerDates.get(name) || []).length
    }))
    .sort((a, b) => b.count - a.count)
  
  const recentDays = 7
  const now = new Date()
  const recentThreshold = new Date(now.getTime() - recentDays * 24 * 60 * 60 * 1000)
  
  const projectsWithTrend = projects.map(p => {
    const recentCount = p.dates.filter(d => {
      try {
        const date = new Date(d)
        return date >= recentThreshold
      } catch {
        return false
      }
    }).length
    return {
      ...p,
      trend: recentCount > 0 ? 'up' : 'stable',
      recentCount
    }
  })
  
  const handlersWithTrend = handlers.map(h => {
    const recentCount = h.dates.filter(d => {
      try {
        const date = new Date(d)
        return date >= recentThreshold
      } catch {
        return false
      }
    }).length
    return {
      ...h,
      trend: recentCount > 0 ? 'up' : 'stable',
      recentCount
    }
  })
  
  const projectsSortedByRecent = projectsWithTrend.sort((a, b) => {
    if (b.recentCount !== a.recentCount) {
      return b.recentCount - a.recentCount
    }
    return b.count - a.count
  })
  
  const handlersSortedByRecent = handlersWithTrend.sort((a, b) => {
    if (b.recentCount !== a.recentCount) {
      return b.recentCount - a.recentCount
    }
    return b.count - a.count
  })
  
  const data = {
    projects: projectsSortedByRecent.slice(0, 50),
    handlers: handlersSortedByRecent.slice(0, 50),
    stats: {
      totalProjects: projects.length,
      totalHandlers: handlers.length,
      totalArticles: mdFiles.length,
      topProject: projects[0]?.name || '',
      topHandler: handlers[0]?.name || '',
    },
    generatedAt: new Date().toISOString()
  }
  
  const destPath = joinSegments(outputDir, "trending-data.json") as FilePath
  await fs.promises.mkdir(path.dirname(destPath), { recursive: true })
  await fs.promises.writeFile(destPath, JSON.stringify(data, null, 2), 'utf-8')
  
  return destPath
}

export const TrendingData: QuartzEmitterPlugin = () => ({
  name: "TrendingData",
  async *emit({ argv }) {
    try {
      // Determine content directory - check if 'docs' exists, otherwise use argv.directory
      const cwd = process.cwd()
      const docsDir = path.join(cwd, "docs")
      const contentDir = fs.existsSync(docsDir) ? docsDir : path.join(cwd, argv.directory || "content")
      
      // Check if content directory exists
      if (!fs.existsSync(contentDir)) {
        console.warn(`[TrendingData] Content directory not found at ${contentDir}, skipping...`)
        return
      }
      
      const destPath = await generateTrendingDataToOutput(argv.output, contentDir)
      yield destPath
      console.log(`[TrendingData] Generated trending data at ${destPath}`)
    } catch (error) {
      console.error(`[TrendingData] Failed to generate trending data:`, error)
      // Don't throw - allow build to continue even if trending data fails
    }
  },
  async *partialEmit() {},
})
