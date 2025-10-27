/**
 * Tutorial Widget
 * Webアプリに組み込んで使えるチュートリアルウィジェット
 */
class TutorialWidget {
  constructor(config) {
    this.config = config;
    this.currentPage = 0;
    this.pages = [];
    this.storageKey = config.storageKey || 'tutorial-widget-dismissed';
    this.container = null;
    this.contentContainer = null;
    this.highlightBox = null;
    this.resizeHandler = null;
  }

  async init() {
    if (localStorage.getItem(this.storageKey) === 'true') {
      return;
    }
    await this.loadConfig();
    if (this.pages.length === 0) {
      return;
    }
    this.createModal();
    this.showPage(0);
  }

  async loadConfig() {
    try {
      const response = await fetch(this.config.configUrl);
      const data = await response.json();
      this.pages = data.pages || [];
    } catch (error) {
      console.error('Failed to load tutorial config:', error);
    }
  }

  createModal() {
    this.container = document.createElement('div');
    this.container.className = 'tutorial-widget-overlay';
    this.container.innerHTML = `
      <div class="tutorial-widget-modal">
        <button class="tutorial-widget-close" aria-label="閉じる">×</button>
        <div class="tutorial-widget-content"></div>
        <div class="tutorial-widget-footer">
          <label class="tutorial-widget-checkbox">
            <input type="checkbox" id="tutorial-widget-no-show">
            <span>次回は表示しない</span>
          </label>
          <div class="tutorial-widget-buttons">
            <button class="tutorial-widget-nav-btn" id="tutorial-widget-next">つぎへ</button>
          </div>
        </div>
      </div>
    `;

    const closeBtn = this.container.querySelector('.tutorial-widget-close');
    const navBtn = this.container.querySelector('#tutorial-widget-next');
    const checkbox = this.container.querySelector('#tutorial-widget-no-show');

    closeBtn.addEventListener('click', () => this.close());
    navBtn.addEventListener('click', () => this.nextPage());
    checkbox.addEventListener('change', (e) => {
      if (e.target.checked) {
        localStorage.setItem(this.storageKey, 'true');
      } else {
        localStorage.removeItem(this.storageKey);
      }
    });

    document.body.appendChild(this.container);
    this.contentContainer = this.container.querySelector('.tutorial-widget-content');
  }

  async showPage(pageIndex) {
    if (pageIndex < 0 || pageIndex >= this.pages.length) {
      return;
    }

    this.currentPage = pageIndex;
    const page = this.pages[pageIndex];

    this.clearHighlight();

    if (page.highlightId) {
      if (this.container && !this.container.classList.contains('tutorial-widget-tooltip')) {
        this.container.remove();
        this.createTooltip();
      } else if (!this.container) {
        this.createTooltip();
      }
      this.createHighlight(page.highlightId);
    } else {
      if (this.container && this.container.classList.contains('tutorial-widget-tooltip')) {
        this.container.remove();
        this.createModal();
      } else if (!this.container) {
        this.createModal();
      }
    }

    try {
      const response = await fetch(page.url);
      const html = await response.text();
      this.contentContainer.innerHTML = html;
    } catch (error) {
      console.error('Failed to load page content:', error);
      this.contentContainer.innerHTML = '<p>コンテンツの読み込みに失敗しました。</p>';
    }

    const navBtn = this.container.querySelector('#tutorial-widget-next');
    if (pageIndex === this.pages.length - 1) {
      navBtn.textContent = 'おわり';
    } else {
      navBtn.textContent = 'つぎへ';
    }
  }

  nextPage() {
    if (this.currentPage < this.pages.length - 1) {
      this.showPage(this.currentPage + 1);
    } else {
      this.close();
    }
  }

  close() {
    this.clearHighlight();
    if (this.container) {
      this.container.remove();
      this.container = null;
    }
    if (this.resizeHandler) {
      window.removeEventListener('resize', this.resizeHandler);
      window.removeEventListener('scroll', this.resizeHandler);
      this.resizeHandler = null;
    }
  }

  createTooltip() {
    this.container = document.createElement('div');
    this.container.className = 'tutorial-widget-modal tutorial-widget-tooltip';
    this.container.innerHTML = `
      <button class="tutorial-widget-close" aria-label="閉じる">×</button>
      <div class="tutorial-widget-content"></div>
      <div class="tutorial-widget-footer">
        <label class="tutorial-widget-checkbox">
          <input type="checkbox" id="tutorial-widget-no-show">
          <span>次回は表示しない</span>
        </label>
        <div class="tutorial-widget-buttons">
          <button class="tutorial-widget-nav-btn" id="tutorial-widget-next">つぎへ</button>
        </div>
      </div>
    `;

    const closeBtn = this.container.querySelector('.tutorial-widget-close');
    const navBtn = this.container.querySelector('#tutorial-widget-next');
    const checkbox = this.container.querySelector('#tutorial-widget-no-show');

    closeBtn.addEventListener('click', () => this.close());
    navBtn.addEventListener('click', () => this.nextPage());
    checkbox.addEventListener('change', (e) => {
      if (e.target.checked) {
        localStorage.setItem(this.storageKey, 'true');
      } else {
        localStorage.removeItem(this.storageKey);
      }
    });

    document.body.appendChild(this.container);
    this.contentContainer = this.container.querySelector('.tutorial-widget-content');
  }

  createHighlight(elementId) {
    const targetElement = document.getElementById(elementId);
    if (!targetElement) {
      console.warn(`Element with id "${elementId}" not found`);
      return;
    }

    this.highlightBox = document.createElement('div');
    this.highlightBox.className = 'tutorial-widget-highlight-box';
    document.body.appendChild(this.highlightBox);

    this.updateHighlightPosition(targetElement);
    this.positionTooltip(targetElement);

    this.resizeHandler = () => {
      this.updateHighlightPosition(targetElement);
      this.positionTooltip(targetElement);
    };
    window.addEventListener('resize', this.resizeHandler);
    window.addEventListener('scroll', this.resizeHandler, true);
  }

  updateHighlightPosition(element) {
    if (!this.highlightBox) return;

    const rect = element.getBoundingClientRect();
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;

    this.highlightBox.style.top = `${rect.top + scrollTop}px`;
    this.highlightBox.style.left = `${rect.left + scrollLeft}px`;
    this.highlightBox.style.width = `${rect.width}px`;
    this.highlightBox.style.height = `${rect.height}px`;
  }

  positionTooltip(targetElement) {
    if (!this.container) return;

    const rect = targetElement.getBoundingClientRect();
    const tooltipRect = this.container.getBoundingClientRect();
    const padding = 20;

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let top = rect.bottom + padding;
    let left = rect.left + (rect.width / 2) - (tooltipRect.width / 2);
    let arrowClass = 'arrow-top';

    if (top + tooltipRect.height > viewportHeight) {
      top = rect.top - tooltipRect.height - padding;
      arrowClass = 'arrow-bottom';
    }

    if (top < 0) {
      top = rect.top + (rect.height / 2) - (tooltipRect.height / 2);

      if (rect.right + tooltipRect.width + padding < viewportWidth) {
        left = rect.right + padding;
        arrowClass = 'arrow-left';
      } else {
        left = rect.left - tooltipRect.width - padding;
        arrowClass = 'arrow-right';
      }
    }

    if (left < padding) {
      left = padding;
    } else if (left + tooltipRect.width > viewportWidth - padding) {
      left = viewportWidth - tooltipRect.width - padding;
    }

    if (top < padding) {
      top = padding;
    } else if (top + tooltipRect.height > viewportHeight - padding) {
      top = viewportHeight - tooltipRect.height - padding;
    }

    this.container.className = 'tutorial-widget-modal tutorial-widget-tooltip ' + arrowClass;
    this.container.style.top = `${top}px`;
    this.container.style.left = `${left}px`;
  }

  clearHighlight() {
    if (this.highlightBox) {
      this.highlightBox.remove();
      this.highlightBox = null;
    }
  }

  static reset(storageKey = 'tutorial-widget-dismissed') {
    localStorage.removeItem(storageKey);
  }
}

window.TutorialWidget = TutorialWidget;
