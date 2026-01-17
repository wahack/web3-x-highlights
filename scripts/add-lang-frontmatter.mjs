import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const docsDir = path.join(__dirname, '..', 'docs');

/**
 * Add lang frontmatter to markdown files
 * .en.md files get lang: en
 * .zh.md files get lang: zh-CN
 */
async function addLangFrontmatter() {
  const files = await fs.readdir(docsDir);
  
  // Filter markdown files (exclude index.md and subdirectories)
  const mdFiles = files.filter(f => {
    if (f === 'index.md') return false;
    if (f.includes(path.sep)) return false; // Skip subdirectories
    return f.endsWith('.md') || f.endsWith('.en.md') || f.endsWith('.zh.md');
  });

  console.log(`Found ${mdFiles.length} markdown files to process\n`);

  let updatedCount = 0;

  for (const file of mdFiles) {
    const filePath = path.join(docsDir, file);
    let content = await fs.readFile(filePath, 'utf-8');
    
    // Check if file already has frontmatter
    const hasFrontmatter = content.startsWith('---');
    
    // Determine language based on filename
    let lang = null;
    if (file.endsWith('.en.md')) {
      lang = 'en';
    } else if (file.endsWith('.zh.md')) {
      lang = 'zh-CN';
    } else if (file.endsWith('.md') && !file.endsWith('.en.md') && !file.endsWith('.zh.md')) {
      // Default to en for plain .md files
      lang = 'en';
    }

    if (!lang) continue;

    let newContent = content;

    if (hasFrontmatter) {
      // Extract existing frontmatter
      const frontmatterEnd = content.indexOf('---', 3);
      if (frontmatterEnd === -1) {
        console.log(`⚠️  Skipping ${file}: malformed frontmatter`);
        continue;
      }

      const frontmatterText = content.substring(3, frontmatterEnd);
      const body = content.substring(frontmatterEnd + 3).trimStart();

      // Parse existing frontmatter (simple YAML parsing)
      const lines = frontmatterText.split('\n');
      const frontmatter = {};
      let hasLang = false;

      for (const line of lines) {
        if (line.trim() === '') continue;
        const colonIndex = line.indexOf(':');
        if (colonIndex === -1) continue;
        
        const key = line.substring(0, colonIndex).trim();
        const value = line.substring(colonIndex + 1).trim().replace(/^["']|["']$/g, '');
        frontmatter[key] = value;
        
        if (key === 'lang') {
          hasLang = true;
        }
      }

      // Add or update lang field
      frontmatter.lang = lang;

      // Reconstruct frontmatter
      const newFrontmatterLines = Object.entries(frontmatter).map(([key, value]) => {
        return `${key}: ${value}`;
      });

      newContent = `---\n${newFrontmatterLines.join('\n')}\n---\n${body}`;
    } else {
      // Add new frontmatter
      newContent = `---\nlang: ${lang}\n---\n\n${content}`;
    }

    // Only write if content changed
    if (newContent !== content) {
      await fs.writeFile(filePath, newContent, 'utf-8');
      console.log(`✓ Updated: ${file} (lang: ${lang})`);
      updatedCount++;
    } else {
      console.log(`- Skipped: ${file} (already has lang: ${lang})`);
    }
  }

  console.log(`\nDone! Updated ${updatedCount} files.`);
}

addLangFrontmatter().catch(console.error);
