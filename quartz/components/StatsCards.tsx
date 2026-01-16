import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { classNames } from "../util/lang"
import style from "./styles/statsCards.scss"

interface Options {
  title?: string
  showIcons: boolean
}

const defaultOptions: Options = {
  title: undefined,
  showIcons: true,
}

export default ((userOpts?: Partial<Options>) => {
  const StatsCards: QuartzComponent = ({
    fileData,
    displayClass,
  }: QuartzComponentProps) => {
    const opts = { ...defaultOptions, ...userOpts }
    
    return (
      <div class={classNames(displayClass, "stats-cards")}>
        {opts.title && <h3>{opts.title}</h3>}
        <div 
          class="stats-grid" 
          data-show-icons={opts.showIcons}
        >
          <div class="loading">加载中...</div>
        </div>
      </div>
    )
  }

  StatsCards.css = style
  StatsCards.afterDOMLoaded = `
    (async function() {
      const containers = document.querySelectorAll('.stats-grid');
      containers.forEach(async (container) => {
        try {
          const showIcons = container.getAttribute('data-show-icons') === 'true';
          
          const response = await fetch(window.location.pathname.includes('/docs/') ? '/docs/trending-data.json' : '/trending-data.json');
          const data = await response.json();
          
          container.innerHTML = '';
          
          const stats = [
            {
              label: '总项目数',
              value: data.stats.totalProjects,
              icon: '📊',
              color: 'primary'
            },
            {
              label: '总博主数',
              value: data.stats.totalHandlers,
              icon: '👥',
              color: 'secondary'
            },
            {
              label: '文章总数',
              value: data.stats.totalArticles,
              icon: '📝',
              color: 'tertiary'
            },
            {
              label: '热门项目',
              value: data.stats.topProject.replace(/-/g, ' '),
              icon: '🔥',
              color: 'accent',
              isText: true
            }
          ];
          
          stats.forEach((stat) => {
            const card = document.createElement('div');
            card.className = \`stat-card stat-\${stat.color}\`;
            
            if (showIcons) {
              const icon = document.createElement('div');
              icon.className = 'stat-icon';
              icon.textContent = stat.icon;
              card.appendChild(icon);
            }
            
            const content = document.createElement('div');
            content.className = 'stat-content';
            
            const value = document.createElement('div');
            value.className = 'stat-value';
            value.textContent = stat.value;
            
            const label = document.createElement('div');
            label.className = 'stat-label';
            label.textContent = stat.label;
            
            content.appendChild(value);
            content.appendChild(label);
            card.appendChild(content);
            
            container.appendChild(card);
          });
        } catch (error) {
          container.innerHTML = '<div class="error">加载失败</div>';
          console.error('Failed to load stats:', error);
        }
      });
    })();
  `

  return StatsCards
}) satisfies QuartzComponentConstructor
