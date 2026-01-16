import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { resolveRelative, SimpleSlug } from "../util/path"
import { classNames } from "../util/lang"
import style from "./styles/trendingRank.scss"

interface TrendingData {
  projects: Array<{ name: string; count: number; trend: string; recentCount: number }>
  handlers: Array<{ name: string; count: number; trend: string; recentCount: number }>
  stats: {
    totalProjects: number
    totalHandlers: number
    totalArticles: number
  }
}

interface Options {
  title?: string
  type: "projects" | "handlers" | "both"
  limit: number
  showTrend: boolean
}

const defaultOptions: Options = {
  title: undefined,
  type: "both",
  limit: 10,
  showTrend: true,
}

export default ((userOpts?: Partial<Options>) => {
  const TrendingRank: QuartzComponent = ({
    fileData,
    displayClass,
  }: QuartzComponentProps) => {
    const opts = { ...defaultOptions, ...userOpts }
    
    // Load data on client side
    return (
      <div class={classNames(displayClass, "trending-rank")}>
        {opts.title && <h3>{opts.title}</h3>}
        <div class="trending-content" data-type={opts.type} data-limit={opts.limit} data-show-trend={opts.showTrend}>
          <div class="loading">Loading...</div>
        </div>
      </div>
    )
  }

  TrendingRank.css = style
  TrendingRank.afterDOMLoaded = `
    (async function() {
      const containers = document.querySelectorAll('.trending-content');
      containers.forEach(async (container) => {
        try {
          const type = container.getAttribute('data-type');
          const limit = parseInt(container.getAttribute('data-limit') || '10');
          const showTrend = container.getAttribute('data-show-trend') === 'true';
          
          const dataPath = window.location.pathname.includes('/docs/') ? '/docs/trending-data.json' : '/trending-data.json';
          const response = await fetch(dataPath);
          const data = await response.json();
          
          container.innerHTML = '';
          
          if (type === 'projects' || type === 'both') {
            const projectsDiv = document.createElement('div');
            projectsDiv.className = 'trending-section';
            projectsDiv.innerHTML = '<h4>Trending Projects</h4><ul class="trending-list"></ul>';
            const list = projectsDiv.querySelector('.trending-list');
            
            data.projects.slice(0, limit).forEach((item, index) => {
              const li = document.createElement('li');
              li.className = 'trending-item';
              
              const rank = document.createElement('span');
              rank.className = 'rank';
              rank.textContent = \`#\${index + 1}\`;
              
              const link = document.createElement('a');
              link.href = \`/projects/\${item.name}\`;
              link.className = 'internal trending-link';
              link.textContent = item.name.replace(/-/g, ' ');
              
              const count = document.createElement('span');
              count.className = 'count';
              count.textContent = \`\${item.count} times\`;
              
              li.appendChild(rank);
              li.appendChild(link);
              li.appendChild(count);
              
              if (showTrend && item.trend === 'up') {
                const trend = document.createElement('span');
                trend.className = 'trend up';
                trend.textContent = '↑';
                trend.title = \`Recent mentions: \${item.recentCount} times\`;
                li.appendChild(trend);
              }
              
              list.appendChild(li);
            });
            
            container.appendChild(projectsDiv);
          }
          
          if (type === 'handlers' || type === 'both') {
            const handlersDiv = document.createElement('div');
            handlersDiv.className = 'trending-section';
            handlersDiv.innerHTML = '<h4>Trending Handlers</h4><ul class="trending-list"></ul>';
            const list = handlersDiv.querySelector('.trending-list');
            
            data.handlers.slice(0, limit).forEach((item, index) => {
              const li = document.createElement('li');
              li.className = 'trending-item';
              
              const rank = document.createElement('span');
              rank.className = 'rank';
              rank.textContent = \`#\${index + 1}\`;
              
              const link = document.createElement('a');
              link.href = \`/handlers/\${item.name}\`;
              link.className = 'internal trending-link';
              link.textContent = \`@\${item.name}\`;
              
              const count = document.createElement('span');
              count.className = 'count';
              count.textContent = \`\${item.count} times\`;
              
              li.appendChild(rank);
              li.appendChild(link);
              li.appendChild(count);
              
              if (showTrend && item.trend === 'up') {
                const trend = document.createElement('span');
                trend.className = 'trend up';
                trend.textContent = '↑';
                trend.title = \`Recent mentions: \${item.recentCount} times\`;
                li.appendChild(trend);
              }
              
              list.appendChild(li);
            });
            
            container.appendChild(handlersDiv);
          }
        } catch (error) {
          container.innerHTML = '<div class="error">Failed to load</div>';
          console.error('Failed to load trending data:', error);
        }
      });
    })();
  `

  return TrendingRank
}) satisfies QuartzComponentConstructor
