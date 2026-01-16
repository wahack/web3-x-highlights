import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const docsDir = path.join(__dirname, '..', 'docs');
const projectsDir = path.join(docsDir, 'projects');
const handlersDir = path.join(docsDir, 'handlers');

// 常见项目后缀，用于提取核心项目名称
const projectSuffixes = ['Labs', 'Protocol', 'Network', 'Platform', 'Chain', 'DAO', 'Foundation'];

/**
 * 从完整项目名称中提取核心名称
 * 例如: "MegaETH Frontier Mainnet Beta Launch" -> "MegaETH"
 *       "AlignerZ Labs" -> "AlignerZ Labs"
 */
function extractProjectName(fullName) {
  const trimmed = fullName.trim();
  const words = trimmed.split(/\s+/);
  
  // 如果第一个单词后面跟着常见后缀，则包含后缀
  if (words.length >= 2 && projectSuffixes.includes(words[1])) {
    return words.slice(0, 2).join(' ');
  }
  
  // 否则只取第一个单词
  return words[0];
}

/**
 * 将项目名称转换为文件名（URL友好）
 */
function projectNameToFilename(projectName) {
  return projectName
    .replace(/[^\w\s-]/g, '') // 移除特殊字符
    .replace(/\s+/g, '-')      // 空格替换为连字符
    .toLowerCase();
}

/**
 * 扫描所有 markdown 文件，提取项目名称
 */
async function scanProjects() {
  const files = await fs.readdir(docsDir);
  const mdFiles = files.filter(f => f.endsWith('.md') && f !== 'index.md');
  
  const projectMap = new Map(); // fullName -> coreName
  const projectFiles = new Map(); // coreName -> Set of files mentioning it
  
  // 匹配 **项目名**: 格式
  const projectRegex = /\*\*([^*]+?)\*\*:/g;
  
  for (const file of mdFiles) {
    const filePath = path.join(docsDir, file);
    const content = await fs.readFile(filePath, 'utf-8');
    
    let match;
    while ((match = projectRegex.exec(content)) !== null) {
      const fullName = match[1].trim();
      const coreName = extractProjectName(fullName);
      
      // 记录项目映射
      if (!projectMap.has(fullName)) {
        projectMap.set(fullName, coreName);
      }
      
      // 记录哪些文件提到了这个项目
      if (!projectFiles.has(coreName)) {
        projectFiles.set(coreName, new Set());
      }
      projectFiles.get(coreName).add(file);
    }
  }
  
  return { projectMap, projectFiles };
}

/**
 * 扫描所有 markdown 文件，提取博主（handlers）
 */
async function scanHandlers() {
  const files = await fs.readdir(docsDir);
  const mdFiles = files.filter(f => f.endsWith('.md') && f !== 'index.md');
  
  const handlerSet = new Set(); // 所有唯一的博主用户名
  const handlerFiles = new Map(); // username -> Set of files mentioning it
  
  // 匹配 @username 格式（在行首或前面有空格/连字符）
  const handlerRegex = /(?:^|\s)(@[\w_]+)/gm;
  // 匹配 X 链接格式：https://x.com/username/status/...
  const xLinkRegex = /https?:\/\/(?:www\.)?(?:x\.com|twitter\.com)\/([\w_]+)\/status\//gi;
  
  for (const file of mdFiles) {
    const filePath = path.join(docsDir, file);
    const content = await fs.readFile(filePath, 'utf-8');
    
    // 从 @username 格式提取
    let match;
    while ((match = handlerRegex.exec(content)) !== null) {
      const username = match[1]; // 包含 @ 符号
      const usernameWithoutAt = username.substring(1); // 去掉 @ 符号
      
      handlerSet.add(usernameWithoutAt);
      
      // 记录哪些文件提到了这个博主
      if (!handlerFiles.has(usernameWithoutAt)) {
        handlerFiles.set(usernameWithoutAt, new Set());
      }
      handlerFiles.get(usernameWithoutAt).add(file);
    }
    
    // 从 X 链接中提取用户名
    while ((match = xLinkRegex.exec(content)) !== null) {
      const usernameFromLink = match[1]; // x.com 和 status 之间的部分
      
      // 只添加有效的用户名（至少1个字符，只包含字母数字下划线）
      if (usernameFromLink && /^[\w_]+$/.test(usernameFromLink)) {
        handlerSet.add(usernameFromLink);
        
        // 记录哪些文件提到了这个博主
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
 * 创建项目文件
 */
async function createProjectFiles(projectFiles) {
  // 确保 projects 目录存在
  await fs.mkdir(projectsDir, { recursive: true });
  
  for (const [coreName, files] of projectFiles.entries()) {
    const filename = projectNameToFilename(coreName) + '.md';
    const filePath = path.join(projectsDir, filename);
    
    // 检查文件是否已存在
    try {
      await fs.access(filePath);
      console.log(`项目文件已存在: ${filename}`);
    } catch {
      // 文件不存在，创建它
      const content = `# ${coreName}\n\n`;
      await fs.writeFile(filePath, content, 'utf-8');
      console.log(`创建项目文件: ${filename}`);
    }
  }
}

/**
 * 创建博主（handler）文件
 */
async function createHandlerFiles(handlerFiles) {
  // 确保 handlers 目录存在
  await fs.mkdir(handlersDir, { recursive: true });
  
  for (const [username, files] of handlerFiles.entries()) {
    const filename = username.toLowerCase() + '.md';
    const filePath = path.join(handlersDir, filename);
    
    // 检查文件是否已存在
    try {
      await fs.access(filePath);
      console.log(`博主文件已存在: ${filename}`);
    } catch {
      // 文件不存在，创建它
      const content = `# @${username}\n\n`;
      await fs.writeFile(filePath, content, 'utf-8');
      console.log(`创建博主文件: ${filename}`);
    }
  }
}

/**
 * 替换文章中的项目名称为链接
 */
async function replaceProjectLinks(projectMap) {
  const files = await fs.readdir(docsDir);
  const mdFiles = files.filter(f => f.endsWith('.md') && f !== 'index.md');
  
  for (const file of mdFiles) {
    const filePath = path.join(docsDir, file);
    let content = await fs.readFile(filePath, 'utf-8');
    let modified = false;
    
    // 替换所有 **项目名**: 为 [[projects/项目名|项目名]]:
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
      console.log(`更新文件: ${file}`);
    }
  }
}

/**
 * 替换文章中的博主提及为链接
 */
async function replaceHandlerLinks(handlerSet) {
  const files = await fs.readdir(docsDir);
  const mdFiles = files.filter(f => f.endsWith('.md') && f !== 'index.md');
  
  for (const file of mdFiles) {
    const filePath = path.join(docsDir, file);
    let content = await fs.readFile(filePath, 'utf-8');
    let modified = false;
    
    // 按用户名长度降序排序，先替换长的用户名，避免部分匹配
    const sortedHandlers = Array.from(handlerSet).sort((a, b) => b.length - a.length);
    
    for (const username of sortedHandlers) {
      const escapedUsername = username.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const linkPattern = `[[handlers/${username.toLowerCase()}|@${username}]]`;
      
      // 如果已经链接了，跳过
      if (content.includes(linkPattern)) {
        continue;
      }
      
      // 使用单词边界确保完整匹配用户名
      // @username 后面不能是字母、数字或下划线
      // 这样可以避免 @web3 匹配 @web3_xiaoyao
      const lines = content.split('\n');
      const newLines = lines.map(line => {
        // 如果这一行已经包含链接，跳过（检查是否已经有这个用户的链接）
        if (line.includes(`[[handlers/${username.toLowerCase()}|`)) {
          return line;
        }
        
        // 检查是否已经有其他链接包含了这个用户名（避免重复链接）
        // 例如：[[handlers/web3|@web3]]_xiaoyao 这种情况
        if (line.includes(`[[handlers/`) && line.includes(`@${username}`)) {
          // 如果已经有链接但格式不对，需要修复
          // 但这里先跳过，避免重复处理
          return line;
        }
        
        // 构建正则表达式：@username 后面不能是字母、数字或下划线
        // 使用负向前瞻：(?![\w_]) 表示后面不能是单词字符或下划线
        // 这样可以确保 @web3 不会匹配 @web3_xiaoyao
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
      console.log(`更新文件（博主链接）: ${file}`);
    }
  }
}

/**
 * 主函数
 */
async function main() {
  console.log('开始扫描项目...');
  const { projectMap, projectFiles } = await scanProjects();
  
  console.log(`\n找到 ${projectMap.size} 个不同的项目名称`);
  console.log(`提取出 ${projectFiles.size} 个核心项目`);
  
  console.log('\n创建项目文件...');
  await createProjectFiles(projectFiles);
  
  console.log('\n替换文章中的项目链接...');
  await replaceProjectLinks(projectMap);
  
  console.log('\n开始扫描博主...');
  const { handlerSet, handlerFiles } = await scanHandlers();
  
  console.log(`\n找到 ${handlerSet.size} 个不同的博主`);
  
  console.log('\n创建博主文件...');
  await createHandlerFiles(handlerFiles);
  
  console.log('\n替换文章中的博主链接...');
  await replaceHandlerLinks(handlerSet);
  
  console.log('\n完成！');
}

main().catch(console.error);
