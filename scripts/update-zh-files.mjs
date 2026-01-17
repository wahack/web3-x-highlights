import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const docsDir = path.join(__dirname, '..', 'docs');

/**
 * Update all .zh.md files to remove original content, keeping only title and TODO
 */
async function updateZhFiles() {
  const files = await fs.readdir(docsDir);
  const zhFiles = files.filter(f => f.endsWith('.zh.md'));

  console.log(`Found ${zhFiles.length} .zh.md files to update\n`);

  for (const file of zhFiles) {
    const filePath = path.join(docsDir, file);
    
    try {
      // Get base name (remove .zh.md)
      const baseName = file.replace(/\.zh\.md$/, '');
      
      // Create clean content with just title and TODO
      const zhContent = `# ${baseName}\n\n<!-- TODO: Translate this content to Chinese -->\n`;
      
      await fs.writeFile(filePath, zhContent, 'utf-8');
      console.log(`✓ Updated: ${file}`);
      
    } catch (err) {
      console.error(`✗ Error updating ${file}: ${err.message}`);
    }
  }

  console.log(`\nDone! Updated ${zhFiles.length} files.`);
}

updateZhFiles().catch(console.error);
