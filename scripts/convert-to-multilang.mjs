import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const docsDir = path.join(__dirname, '..', 'docs');

/**
 * Convert all markdown files in docs to .en.md and .zh.md format
 * Excludes index.md, handlers/, and projects/ directories
 */
async function convertToMultilang() {
  const files = await fs.readdir(docsDir);
  
  // Filter markdown files, excluding index.md and subdirectories
  const mdFiles = files.filter(f => {
    // Check if it's a markdown file
    if (!f.endsWith('.md')) return false;
    
    // Exclude index.md
    if (f === 'index.md') return false;
    
    // Exclude files that are already in multilang format
    if (f.endsWith('.en.md') || f.endsWith('.zh.md')) return false;
    
    // Check if it's a file (not a directory)
    const filePath = path.join(docsDir, f);
    return true;
  });

  console.log(`Found ${mdFiles.length} files to convert\n`);

  for (const file of mdFiles) {
    const filePath = path.join(docsDir, file);
    
    // Check if it's actually a file (not a directory)
    try {
      const stat = await fs.stat(filePath);
      if (!stat.isFile()) {
        console.log(`Skipping ${file} (is a directory)`);
        continue;
      }
    } catch (err) {
      console.log(`Skipping ${file} (error: ${err.message})`);
      continue;
    }

    // Get base name without extension
    const baseName = file.replace(/\.md$/, '');
    const enFileName = `${baseName}.en.md`;
    const zhFileName = `${baseName}.zh.md`;
    const enFilePath = path.join(docsDir, enFileName);
    const zhFilePath = path.join(docsDir, zhFileName);

    try {
      // Read existing content
      const content = await fs.readFile(filePath, 'utf-8');
      
      // Rename existing file to .en.md
      await fs.rename(filePath, enFilePath);
      console.log(`✓ Renamed: ${file} -> ${enFileName}`);
      
      // Create .zh.md file with placeholder content (empty, ready for translation)
      const zhContent = `# ${baseName}\n\n<!-- TODO: Translate this content to Chinese -->\n`;
      await fs.writeFile(zhFilePath, zhContent, 'utf-8');
      console.log(`✓ Created: ${zhFileName}`);
      
    } catch (err) {
      console.error(`✗ Error processing ${file}: ${err.message}`);
    }
  }

  console.log(`\nDone! Converted ${mdFiles.length} files.`);
}

convertToMultilang().catch(console.error);
