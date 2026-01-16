import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const docsDir = path.join(__dirname, '..', 'docs');
const projectsDir = path.join(docsDir, 'projects');
const handlersDir = path.join(docsDir, 'handlers');

// Common project suffixes, used to extract core project names
const projectSuffixes = ['Labs', 'Protocol', 'Network', 'Platform', 'Chain', 'DAO', 'Foundation'];

/**
 * Extract core name from full project name
 * Example: "MegaETH Frontier Mainnet Beta Launch" -> "MegaETH"
 *          "AlignerZ Labs" -> "AlignerZ Labs"
 */
function extractProjectName(fullName) {
  const trimmed = fullName.trim();
  const words = trimmed.split(/\s+/);
  
  // If first word is followed by common suffix, include suffix
  if (words.length >= 2 && projectSuffixes.includes(words[1])) {
    return words.slice(0, 2).join(' ');
  }
  
  // Otherwise take only the first word
  return words[0];
}

/**
 * Convert project name to filename (URL-friendly)
 */
function projectNameToFilename(projectName) {
  return projectName
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-')      // Replace spaces with hyphens
    .toLowerCase();
}

/**
 * Scan all markdown files to extract project names
 */
async function scanProjects() {
  const files = await fs.readdir(docsDir);
  const mdFiles = files.filter(f => f.endsWith('.md') && f !== 'index.md');
  
  const projectMap = new Map(); // fullName -> coreName
  const projectFiles = new Map(); // coreName -> Set of files mentioning it
  
  // Match **project name**: format
  const projectRegex = /\*\*([^*]+?)\*\*:/g;
  
  for (const file of mdFiles) {
    const filePath = path.join(docsDir, file);
    const content = await fs.readFile(filePath, 'utf-8');
    
    let match;
    while ((match = projectRegex.exec(content)) !== null) {
      const fullName = match[1].trim();
      const coreName = extractProjectName(fullName);
      
      // Record project mapping
      if (!projectMap.has(fullName)) {
        projectMap.set(fullName, coreName);
      }
      
      // Record which files mention this project
      if (!projectFiles.has(coreName)) {
        projectFiles.set(coreName, new Set());
      }
      projectFiles.get(coreName).add(file);
    }
  }
  
  return { projectMap, projectFiles };
}

/**
 * Scan all markdown files to extract handlers
 */
async function scanHandlers() {
  const files = await fs.readdir(docsDir);
  const mdFiles = files.filter(f => f.endsWith('.md') && f !== 'index.md');
  
  const handlerSet = new Set(); // All unique handler usernames
  const handlerFiles = new Map(); // username -> Set of files mentioning it
  
  // Match @username format (at line start or preceded by space/hyphen)
  const handlerRegex = /(?:^|\s)(@[\w_]+)/gm;
  // Match X link format: https://x.com/username/status/...
  const xLinkRegex = /https?:\/\/(?:www\.)?(?:x\.com|twitter\.com)\/([\w_]+)\/status\//gi;
  
  for (const file of mdFiles) {
    const filePath = path.join(docsDir, file);
    const content = await fs.readFile(filePath, 'utf-8');
    
    // Extract from @username format
    let match;
    while ((match = handlerRegex.exec(content)) !== null) {
      const username = match[1]; // Includes @ symbol
      const usernameWithoutAt = username.substring(1); // Remove @ symbol
      
      handlerSet.add(usernameWithoutAt);
      
      // Record which files mention this handler
      if (!handlerFiles.has(usernameWithoutAt)) {
        handlerFiles.set(usernameWithoutAt, new Set());
      }
      handlerFiles.get(usernameWithoutAt).add(file);
    }
    
    // Extract username from X links
    while ((match = xLinkRegex.exec(content)) !== null) {
      const usernameFromLink = match[1]; // Part between x.com and status
      
      // Only add valid usernames (at least 1 character, alphanumeric and underscores only)
      if (usernameFromLink && /^[\w_]+$/.test(usernameFromLink)) {
        handlerSet.add(usernameFromLink);
        
        // Record which files mention this handler
        if (!handlerFiles.has(usernameFromLink)) {
          handlerFiles.set(usernameFromLink, new Set());
        }
        handlerFiles.get(usernameFromLink).add(file);
      }
    }
  }
  
  return { handlerSet, handlerFiles };
}

/**
 * Create project files
 */
async function createProjectFiles(projectFiles) {
  // Ensure projects directory exists
  await fs.mkdir(projectsDir, { recursive: true });
  
  for (const [coreName, files] of projectFiles.entries()) {
    const filename = projectNameToFilename(coreName) + '.md';
    const filePath = path.join(projectsDir, filename);
    
    // Check if file already exists
    try {
      await fs.access(filePath);
      console.log(`Project file already exists: ${filename}`);
    } catch {
      // File doesn't exist, create it
      const content = `# ${coreName}\n\n`;
      await fs.writeFile(filePath, content, 'utf-8');
      console.log(`Created project file: ${filename}`);
    }
  }
}

/**
 * Create handler files
 */
async function createHandlerFiles(handlerFiles) {
  // Ensure handlers directory exists
  await fs.mkdir(handlersDir, { recursive: true });
  
  for (const [username, files] of handlerFiles.entries()) {
    const filename = username.toLowerCase() + '.md';
    const filePath = path.join(handlersDir, filename);
    
    // Check if file already exists
    try {
      await fs.access(filePath);
      console.log(`Handler file already exists: ${filename}`);
    } catch {
      // File doesn't exist, create it
      const content = `# @${username}\n\n`;
      await fs.writeFile(filePath, content, 'utf-8');
      console.log(`Created handler file: ${filename}`);
    }
  }
}

/**
 * Replace project names in articles with links
 */
async function replaceProjectLinks(projectMap) {
  const files = await fs.readdir(docsDir);
  const mdFiles = files.filter(f => f.endsWith('.md') && f !== 'index.md');
  
  for (const file of mdFiles) {
    const filePath = path.join(docsDir, file);
    let content = await fs.readFile(filePath, 'utf-8');
    let modified = false;
    
    // Replace all **project name**: with [[projects/project name|project name]]:
    for (const [fullName, coreName] of projectMap.entries()) {
      const escapedFullName = fullName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`\\*\\*${escapedFullName}\\*\\*:`, 'g');
      const projectSlug = projectNameToFilename(coreName);
      const replacement = `[[projects/${projectSlug}|${fullName}]]:`;
      
      if (regex.test(content)) {
        content = content.replace(regex, replacement);
        modified = true;
      }
    }
    
    if (modified) {
      await fs.writeFile(filePath, content, 'utf-8');
      console.log(`Updated file: ${file}`);
    }
  }
}

/**
 * Replace handler mentions in articles with links
 */
async function replaceHandlerLinks(handlerSet) {
  const files = await fs.readdir(docsDir);
  const mdFiles = files.filter(f => f.endsWith('.md') && f !== 'index.md');
  
  for (const file of mdFiles) {
    const filePath = path.join(docsDir, file);
    let content = await fs.readFile(filePath, 'utf-8');
    let modified = false;
    
    // Sort by username length descending, replace longer usernames first to avoid partial matches
    const sortedHandlers = Array.from(handlerSet).sort((a, b) => b.length - a.length);
    
    for (const username of sortedHandlers) {
      const escapedUsername = username.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const linkPattern = `[[handlers/${username.toLowerCase()}|@${username}]]`;
      
      // If already linked, skip
      if (content.includes(linkPattern)) {
        continue;
      }
      
      // Use word boundaries to ensure complete username match
      // @username must not be followed by letters, numbers, or underscores
      // This prevents @web3 from matching @web3_xiaoyao
      const lines = content.split('\n');
      const newLines = lines.map(line => {
        // If line already contains link, skip (check if this user's link already exists)
        if (line.includes(`[[handlers/${username.toLowerCase()}|`)) {
          return line;
        }
        
        // Check if another link already contains this username (avoid duplicate links)
        // Example: [[handlers/web3|@web3]]_xiaoyao
        if (line.includes(`[[handlers/`) && line.includes(`@${username}`)) {
          // If link exists but format is wrong, needs fixing
          // But skip here to avoid duplicate processing
          return line;
        }
        
        // Build regex: @username must not be followed by letters, numbers, or underscores
        // Use negative lookahead: (?![\w_]) means cannot be followed by word characters or underscores
        // This ensures @web3 won't match @web3_xiaoyao
        const regex = new RegExp(`@${escapedUsername}(?![\w_])`, 'g');
        
        if (regex.test(line)) {
          return line.replace(regex, linkPattern);
        }
        return line;
      });
      
      const newContent = newLines.join('\n');
      if (newContent !== content) {
        content = newContent;
        modified = true;
      }
    }
    
    if (modified) {
      await fs.writeFile(filePath, content, 'utf-8');
      console.log(`Updated file (handler links): ${file}`);
    }
  }
}

/**
 * Main function
 */
async function main() {
  console.log('Starting project scan...');
  const { projectMap, projectFiles } = await scanProjects();
  
  console.log(`\nFound ${projectMap.size} different project names`);
  console.log(`Extracted ${projectFiles.size} core projects`);
  
  console.log('\nCreating project files...');
  await createProjectFiles(projectFiles);
  
  console.log('\nReplacing project links in articles...');
  await replaceProjectLinks(projectMap);
  
  console.log('\nStarting handler scan...');
  const { handlerSet, handlerFiles } = await scanHandlers();
  
  console.log(`\nFound ${handlerSet.size} different handlers`);
  
  console.log('\nCreating handler files...');
  await createHandlerFiles(handlerFiles);
  
  console.log('\nReplacing handler links in articles...');
  await replaceHandlerLinks(handlerSet);
  
  console.log('\nDone!');
}

main().catch(console.error);
