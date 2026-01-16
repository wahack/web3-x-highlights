import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const docsDir = path.join(__dirname, '..', 'docs');

/**
 * 修复错误的博主链接格式
 * 例如：[[handlers/web3tuhao|[[handlers/web3|@web3]]tuhao]] 
 * 应该修复为：[[handlers/web3tuhao|@web3tuhao]]
 * 
 * 同时从 X 链接中提取正确的用户名并修复
 */
async function fixBrokenHandlerLinks() {
  const files = await fs.readdir(docsDir);
  const mdFiles = files.filter(f => f.endsWith('.md') && f !== 'index.md');
  
  // 匹配嵌套的链接格式：[[handlers/xxx|[[handlers/yyy|@yyy]]zzz]]
  const brokenLinkRegex = /\[\[handlers\/([\w_]+)\|\[\[handlers\/[\w_]+\|@[\w_]+\]\]([\w_]+)\]\]/g;
  // 匹配包含 X 链接的行，提取正确的用户名
  const xLinkRegex = /\[\[handlers\/([\w_]+)\|@[\w_]+\]\] \[Link\]\(https?:\/\/(?:www\.)?(?:x\.com|twitter\.com)\/([\w_]+)\/status\//g;
  
  for (const file of mdFiles) {
    const filePath = path.join(docsDir, file);
    let content = await fs.readFile(filePath, 'utf-8');
    let modified = false;
    
    // 修复嵌套链接
    let fixedContent = content.replace(brokenLinkRegex, (match, username, suffix) => {
      // 如果 suffix 是空的，说明用户名就是完整的
      // 否则需要组合：username + suffix
      const fullUsername = suffix ? `${username}${suffix}` : username;
      modified = true;
      return `[[handlers/${fullUsername.toLowerCase()}|@${fullUsername}]]`;
    });
    
    // 从 X 链接中提取正确的用户名并修复链接
    fixedContent = fixedContent.replace(xLinkRegex, (match, handlerUsername, xUsername) => {
      // 如果链接中的用户名和 X 链接中的用户名不一致，修复它
      if (handlerUsername.toLowerCase() !== xUsername.toLowerCase()) {
        modified = true;
        return `[[handlers/${xUsername.toLowerCase()}|@${xUsername}]] [Link](https://x.com/${xUsername}/status/`;
      }
      return match;
    });
    
    if (modified) {
      await fs.writeFile(filePath, fixedContent, 'utf-8');
      console.log(`修复文件: ${file}`);
    }
  }
  
  console.log('修复完成！');
}

fixBrokenHandlerLinks().catch(console.error);
