import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { resolveRelative, SimpleSlug } from "../util/path"
import { classNames } from "../util/lang"
import style from "./styles/tagCloud.scss"

interface Options {
  title?: string
  type: "projects" | "handlers" | "both"
  minSize: number
  maxSize: number
  limit: number
}

const defaultOptions: Options = {
  title: undefined,
  type: "both",
  minSize: 0.8,
  maxSize: 2.0,
  limit: 50,
}

export default ((userOpts?: Partial<Options>) => {
  const TagCloud: QuartzComponent = ({
    fileData,
    displayClass,
  }: QuartzComponentProps) => {
    const opts = { ...defaultOptions, ...userOpts }
    
    return (
      <div class={classNames(displayClass, "tag-cloud")}>
        {opts.title && <h3>{opts.title}</h3>}
        <div 
          class="cloud-content" 
          data-type={opts.type} 
          data-limit={opts.limit}
          data-min-size={opts.minSize}
          data-max-size={opts.maxSize}
        >
          <div class="loading">加载中...</div>
        </div>
      </div>
    )
  }

  TagCloud.css = style
  TagCloud.afterDOMLoaded = `
    (async function() {
      const containers = document.querySelectorAll('.cloud-content');
      containers.forEach(async (container) => {
        try {
          const type = container.getAttribute('data-type');
          const limit = parseInt(container.getAttribute('data-limit') || '50');
          const minSize = parseFloat(container.getAttribute('data-min-size') || '0.8');
          const maxSize = parseFloat(container.getAttribute('data-max-size') || '2.0');
          
          const response = await fetch(window.location.pathname.includes('/docs/') ? '/docs/trending-data.json' : '/trending-data.json');
          const data = await response.json();
          
          container.innerHTML = '';
          
          if (type === 'projects' || type === 'both') {
            const projectsDiv = document.createElement('div');
            projectsDiv.className = 'cloud-section';
            projectsDiv.innerHTML = '<h4>项目标签云</h4><div class="cloud-tags"></div>';
            const tagsContainer = projectsDiv.querySelector('.cloud-tags');
            
            const items = data.projects.slice(0, limit);
            const maxCount = items[0]?.count || 1;
            const minCount = items[items.length - 1]?.count || 1;
            
            items.forEach((item) => {
              const tag = document.createElement('a');
              // Calculate relative path - projects are always in docs/projects/
              const currentPath = window.location.pathname;
              const pathParts = currentPath.split('/').filter(p => p);
              let relativePath = '';
              
              // If we're in docs, calculate relative path
              if (currentPath.includes('/docs/')) {
                const docsIndex = pathParts.indexOf('docs');
                const depth = pathParts.length - docsIndex - 1;
                relativePath = depth > 0 ? '../'.repeat(depth) : './';
                relativePath += 'projects/' + item.name;
              } else {
                // If not in docs, use absolute path
                relativePath = '/docs/projects/' + item.name;
              }
              
              tag.href = relativePath;
              tag.className = 'internal cloud-tag';
              
              // 计算字体大小
              const ratio = (item.count - minCount) / (maxCount - minCount || 1);
              const fontSize = minSize + (maxSize - minSize) * ratio;
              tag.style.fontSize = \`\${fontSize}rem\`;
              
              tag.textContent = item.name.replace(/-/g, ' ');
              tag.title = \`\${item.name}: \${item.count}次提及\`;
              
              tagsContainer.appendChild(tag);
            });
            
            container.appendChild(projectsDiv);
          }
          
          if (type === 'handlers' || type === 'both') {
            const handlersDiv = document.createElement('div');
            handlersDiv.className = 'cloud-section';
            handlersDiv.innerHTML = '<h4>博主标签云</h4><div class="cloud-tags"></div>';
            const tagsContainer = handlersDiv.querySelector('.cloud-tags');
            
            const items = data.handlers.slice(0, limit);
            const maxCount = items[0]?.count || 1;
            const minCount = items[items.length - 1]?.count || 1;
            
            items.forEach((item) => {
              const tag = document.createElement('a');
              // Calculate relative path - handlers are always in docs/handlers/
              const currentPath = window.location.pathname;
              const pathParts = currentPath.split('/').filter(p => p);
              let relativePath = '';
              
              // If we're in docs, calculate relative path
              if (currentPath.includes('/docs/')) {
                const docsIndex = pathParts.indexOf('docs');
                const depth = pathParts.length - docsIndex - 1;
                relativePath = depth > 0 ? '../'.repeat(depth) : './';
                relativePath += 'handlers/' + item.name;
              } else {
                // If not in docs, use absolute path
                relativePath = '/docs/handlers/' + item.name;
              }
              
              tag.href = relativePath;
              tag.className = 'internal cloud-tag';
              
              // 计算字体大小
              const ratio = (item.count - minCount) / (maxCount - minCount || 1);
              const fontSize = minSize + (maxSize - minSize) * ratio;
              tag.style.fontSize = \`\${fontSize}rem\`;
              
              tag.textContent = \`@\${item.name}\`;
              tag.title = \`@\${item.name}: \${item.count}次提及\`;
              
              tagsContainer.appendChild(tag);
            });
            
            container.appendChild(handlersDiv);
          }
        } catch (error) {
          container.innerHTML = '<div class="error">加载失败</div>';
          console.error('Failed to load tag cloud data:', error);
        }
      });
    })();
  `

  return TagCloud
}) satisfies QuartzComponentConstructor
