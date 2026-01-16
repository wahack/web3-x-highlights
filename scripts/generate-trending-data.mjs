import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const docsDir = path.join(__dirname, '..', 'docs');
const publicDir = path.join(__dirname, '..', 'public');

/**
 * Count mentions of projects and handlers
 */
async function generateTrendingData() {
  const files = await fs.readdir(docsDir);
  const mdFiles = files.filter(f => f.endsWith('.md') && f !== 'index.md');
  
  const projectMentions = new Map(); // project -> count
  const handlerMentions = new Map(); // handler -> count
  const projectDates = new Map(); // project -> Set of dates
  const handlerDates = new Map(); // handler -> Set of dates
  
  // Match project links [[projects/xxx|...]]
  const projectRegex = /\[\[projects\/([^\|]+)\|/g;
  // Match handler links [[handlers/xxx|...]]
  const handlerRegex = /\[\[handlers\/([^\|]+)\|/g;
  
  for (const file of mdFiles) {
    const filePath = path.join(docsDir, file);
    const content = await fs.readFile(filePath, 'utf-8');
    const date = file.replace('.md', '').trim();
    
    // Extract content only from "Core Research Reports" section for projects
    // Match "## Core Research Reports" or "## **Core Research Reports**" followed by content until next ## or end of file
    const coreReportsMatch = content.match(/##\s+\*{0,2}Core Research Reports\*{0,2}\s*\n([\s\S]*?)(?=\n##|$)/i);
    const coreReportsContent = coreReportsMatch ? coreReportsMatch[1] : '';
    
    // Count projects - only extract from Core Research Reports section
    let match;
    if (coreReportsContent) {
      // Reset regex lastIndex
      projectRegex.lastIndex = 0;
      while ((match = projectRegex.exec(coreReportsContent)) !== null) {
        const project = match[1];
        projectMentions.set(project, (projectMentions.get(project) || 0) + 1);
        if (!projectDates.has(project)) {
          projectDates.set(project, new Set());
        }
        projectDates.get(project).add(date);
      }
    }
    
    // Count handlers - extract from entire file (maintain original behavior)
    handlerRegex.lastIndex = 0;
    while ((match = handlerRegex.exec(content)) !== null) {
      const handler = match[1];
      handlerMentions.set(handler, (handlerMentions.get(handler) || 0) + 1);
      if (!handlerDates.has(handler)) {
        handlerDates.set(handler, new Set());
      }
      handlerDates.get(handler).add(date);
    }
  }
  
  // Convert to array and sort
  const projects = Array.from(projectMentions.entries())
    .map(([name, count]) => ({
      name,
      count,
      dates: Array.from(projectDates.get(name) || []),
      recentMentions: Array.from(projectDates.get(name) || []).length
    }))
    .sort((a, b) => b.count - a.count);
  
  const handlers = Array.from(handlerMentions.entries())
    .map(([name, count]) => ({
      name,
      count,
      dates: Array.from(handlerDates.get(name) || []),
      recentMentions: Array.from(handlerDates.get(name) || []).length
    }))
    .sort((a, b) => b.count - a.count);
  
  // Calculate trend (mentions in last 7 days)
  const recentDays = 7;
  const now = new Date();
  const recentThreshold = new Date(now.getTime() - recentDays * 24 * 60 * 60 * 1000);
  
  const projectsWithTrend = projects.map(p => {
    const recentCount = p.dates.filter(d => {
      try {
        const date = new Date(d);
        return date >= recentThreshold;
      } catch {
        return false;
      }
    }).length;
    return {
      ...p,
      trend: recentCount > 0 ? 'up' : 'stable',
      recentCount
    };
  });
  
  const handlersWithTrend = handlers.map(h => {
    const recentCount = h.dates.filter(d => {
      try {
        const date = new Date(d);
        return date >= recentThreshold;
      } catch {
        return false;
      }
    }).length;
    return {
      ...h,
      trend: recentCount > 0 ? 'up' : 'stable',
      recentCount
    };
  });
  
  // Sort by recentCount (last week) instead of total count
  const projectsSortedByRecent = projectsWithTrend.sort((a, b) => {
    // First sort by recentCount (descending), then by total count as tiebreaker
    if (b.recentCount !== a.recentCount) {
      return b.recentCount - a.recentCount;
    }
    return b.count - a.count;
  });
  
  const handlersSortedByRecent = handlersWithTrend.sort((a, b) => {
    // First sort by recentCount (descending), then by total count as tiebreaker
    if (b.recentCount !== a.recentCount) {
      return b.recentCount - a.recentCount;
    }
    return b.count - a.count;
  });
  
  const data = {
    projects: projectsSortedByRecent.slice(0, 50), // Top 50 by recent week
    handlers: handlersSortedByRecent.slice(0, 50), // Top 50 by recent week
    stats: {
      totalProjects: projects.length,
      totalHandlers: handlers.length,
      totalArticles: mdFiles.length,
      topProject: projects[0]?.name || '',
      topHandler: handlers[0]?.name || '',
    },
    generatedAt: new Date().toISOString()
  };
  
  // Ensure public and docs directories exist
  await fs.mkdir(publicDir, { recursive: true });
  await fs.mkdir(docsDir, { recursive: true });
  
  // Write JSON files to both locations
  const publicPath = path.join(publicDir, 'trending-data.json');
  const docsPath = path.join(docsDir, 'trending-data.json');
  
  await fs.writeFile(publicPath, JSON.stringify(data, null, 2), 'utf-8');
  await fs.writeFile(docsPath, JSON.stringify(data, null, 2), 'utf-8');
  
  console.log(`Generated trending data: ${publicPath}`);
  console.log(`Generated trending data: ${docsPath}`);
  console.log(`- Total projects: ${projects.length}`);
  console.log(`- Total handlers: ${handlers.length}`);
  console.log(`- Top 10 projects: ${projects.slice(0, 10).map(p => p.name).join(', ')}`);
  console.log(`- Top 10 handlers: ${handlers.slice(0, 10).map(h => h.name).join(', ')}`);
}

generateTrendingData().catch(console.error);
