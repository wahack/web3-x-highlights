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
          <div class="loading">Loading...</div>
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
            projectsDiv.innerHTML = '<h4>Project Tag Cloud</h4><div class="cloud-tags"></div>';
            const tagsContainer = projectsDiv.querySelector('.cloud-tags');
            
            const items = data.projects.slice(0, limit);
            const maxCount = items[0]?.count || 1;
            const minCount = items[items.length - 1]?.count || 1;
            
            items.forEach((item) => {
              const tag = document.createElement('a');
              // Projects are at /projects/ (Quartz removes docs/ prefix in URLs)
              // Use absolute path for simplicity - Quartz SPA will handle it
              tag.href = '/projects/' + item.name;
              tag.className = 'internal cloud-tag';
              
              // Calculate font size
              const ratio = (item.count - minCount) / (maxCount - minCount || 1);
              const fontSize = minSize + (maxSize - minSize) * ratio;
              tag.style.fontSize = \`\${fontSize}rem\`;
              
              tag.textContent = item.name.replace(/-/g, ' ');
              tag.title = \`\${item.name}: \${item.count} mentions\`;
              
              tagsContainer.appendChild(tag);
            });
            
            container.appendChild(projectsDiv);
          }
          
          if (type === 'handlers' || type === 'both') {
            const handlersDiv = document.createElement('div');
            handlersDiv.className = 'cloud-section';
            handlersDiv.innerHTML = '<h4>Handler Tag Cloud</h4><div class="cloud-tags"></div>';
            const tagsContainer = handlersDiv.querySelector('.cloud-tags');
            
            const items = data.handlers.slice(0, limit);
            const maxCount = items[0]?.count || 1;
            const minCount = items[items.length - 1]?.count || 1;
            
            items.forEach((item) => {
              const tag = document.createElement('a');
              // Handlers are at /handlers/ (Quartz removes docs/ prefix in URLs)
              // Use absolute path for simplicity - Quartz SPA will handle it
              tag.href = '/handlers/' + item.name;
              tag.className = 'internal cloud-tag';
              
              // Calculate font size
              const ratio = (item.count - minCount) / (maxCount - minCount || 1);
              const fontSize = minSize + (maxSize - minSize) * ratio;
              tag.style.fontSize = \`\${fontSize}rem\`;
              
              tag.textContent = \`@\${item.name}\`;
              tag.title = \`@\${item.name}: \${item.count} mentions\`;
              
              tagsContainer.appendChild(tag);
            });
            
            container.appendChild(handlersDiv);
          }
        } catch (error) {
          container.innerHTML = '<div class="error">Failed to load</div>';
          console.error('Failed to load tag cloud data:', error);
        }
      });
    })();
  `

  return TagCloud
}) satisfies QuartzComponentConstructor
