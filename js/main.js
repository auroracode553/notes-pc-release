/* ==========================================================================
   Aurora · 极光 官网 — 交互脚本
   ========================================================================== */

(function () {
  'use strict';

  const REPO_OWNER = 'auroracode553';
  const REPO_NAME = 'notes-pc-release';
  const GITHUB_LATEST_API = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/releases/latest`;
  // fallback 用硬编码的最新已知版本直链（release 发布渠道仍走 GitHub，但不暴露仓库主页）
  const FALLBACK_EXE_URL = `https://github.com/${REPO_OWNER}/${REPO_NAME}/releases/download/v1.2.21/Aurora-Setup-1.2.21.exe`;
  const FALLBACK_VERSION = 'v1.2.21';

  // ---------- 1. 主题切换 ----------
  const Theme = {
    STORAGE_KEY: 'aurora-site-theme',

    init() {
      const saved = localStorage.getItem(this.STORAGE_KEY);
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const initialTheme = saved || (prefersDark ? 'dark' : 'light');
      this.set(initialTheme);

      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        if (!localStorage.getItem(this.STORAGE_KEY)) this.set(e.matches ? 'dark' : 'light');
      });

      const btn = document.getElementById('themeToggle');
      if (btn) btn.addEventListener('click', () => {
        const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        this.set(next);
        localStorage.setItem(this.STORAGE_KEY, next);
      });
    },

    set(theme) { document.documentElement.setAttribute('data-theme', theme); },
  };

  // ---------- 2. 导航栏滚动效果 ----------
  const Nav = {
    init() {
      const nav = document.getElementById('nav');
      if (!nav) return;

      const update = () => {
        nav.classList.toggle('scrolled', window.scrollY > 40);
      };
      update();

      let ticking = false;
      window.addEventListener('scroll', () => {
        if (!ticking) {
          requestAnimationFrame(() => { update(); ticking = false; });
          ticking = true;
        }
      }, { passive: true });

      const burger = document.getElementById('navBurger');
      const links = document.querySelector('.nav-links');
      if (burger && links) {
        burger.addEventListener('click', () => {
          const isOpen = links.classList.toggle('open');
          document.body.style.overflow = isOpen ? 'hidden' : '';
          burger.setAttribute('aria-expanded', isOpen);
        });
        links.querySelectorAll('a').forEach((a) => {
          a.addEventListener('click', () => {
            links.classList.remove('open');
            document.body.style.overflow = '';
            burger.setAttribute('aria-expanded', 'false');
          });
        });
        // ESC 关闭
        document.addEventListener('keydown', (e) => {
          if (e.key === 'Escape' && links.classList.contains('open')) {
            links.classList.remove('open');
            document.body.style.overflow = '';
            burger.setAttribute('aria-expanded', 'false');
          }
        });
      }
    },
  };

  // ---------- 3. Scroll Reveal ----------
  const Reveal = {
    init() {
      const els = document.querySelectorAll('.reveal');
      if (!els.length) return;
      const io = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) { entry.target.classList.add('visible'); io.unobserve(entry.target); }
        });
      }, { threshold: 0.12, rootMargin: '0px 0px -50px 0px' });
      els.forEach((el) => io.observe(el));
    },
  };

  // ---------- 4. 平滑滚动锚点 ----------
  const SmoothAnchor = {
    init() {
      document.querySelectorAll('a[href^="#"]').forEach((a) => {
        a.addEventListener('click', (e) => {
          const href = a.getAttribute('href');
          if (!href || href === '#') return;
          const target = document.querySelector(href);
          if (target) {
            e.preventDefault();
            const top = target.getBoundingClientRect().top + window.scrollY - 70;
            window.scrollTo({ top, behavior: 'smooth' });
          }
        });
      });
    },
  };

  // ---------- 5. 动态下载（GitHub API 直链） ----------
  const Download = {
    exeAsset: null,  // { browser_download_url, name, size }
    version: null,   // 'v1.2.21'

    init() {
      this.fetchLatest().then((exe) => {
        if (exe) {
          this.exeAsset = exe;
          this.applyToButtons();
          this.updateBadges();
        } else {
          this.applyFallback();
        }
      }).catch(() => this.applyFallback());
    },

    async fetchLatest() {
      try {
        const res = await fetch(GITHUB_LATEST_API, {
          headers: { 'Accept': 'application/vnd.github+json' },
          cache: 'no-cache',
        });
        if (!res.ok) return null;
        const data = await res.json();
        this.version = data.tag_name;

        // 找 .exe 安装包（排除 .blockmap）
        const exe = (data.assets || []).find((a) =>
          /\.exe$/i.test(a.name) && !/\.blockmap$/i.test(a.name)
        );
        return exe || null;
      } catch {
        return null;
      }
    },

    applyToButtons() {
      const buttons = document.querySelectorAll('[data-download="exe"]');
      buttons.forEach((btn) => {
        btn.href = this.exeAsset.browser_download_url;
        btn.setAttribute('download', this.exeAsset.name);
        // 下载按钮不走外部打开（GitHub 直链会触发浏览器下载）
        btn.removeAttribute('target');
        btn.setAttribute('rel', 'noopener');
      });
    },

    updateBadges() {
      // Hero 区版本标签
      const tag = document.getElementById('heroVersionTag');
      if (tag && this.version) {
        tag.textContent = this.version;
        tag.style.display = 'inline-block';
      }

      // Download 区 meta（版本 + 大小）
      const meta = document.getElementById('downloadMeta');
      if (meta && this.exeAsset) {
        const sizeMB = (this.exeAsset.size / 1024 / 1024).toFixed(1);
        meta.textContent = `${this.version} · ${sizeMB} MB · NSIS 安装包`;
      }

      // Hero 版本 badge（固定写的 v1.2.21 用 API 返回的替换）
      const heroBadge = document.querySelector('.hero-badge');
      if (heroBadge && this.version) {
        heroBadge.childNodes.forEach((node) => {
          if (node.nodeType === Node.TEXT_NODE && node.textContent.includes('v1.')) {
            node.textContent = `${this.version} · 稳定版已发布`;
          }
        });
      }
    },

    applyFallback() {
      // API 不可用时使用硬编码的最新已知版本直链（release 发布渠道仍走 GitHub）
      const fallback = {
        browser_download_url: FALLBACK_EXE_URL,
        name: 'Aurora-Setup-1.2.21.exe',
        size: 88178373,
      };
      this.exeAsset = fallback;
      this.version = FALLBACK_VERSION;
      this.applyToButtons();
      this.updateBadges();
    },
  };

  // ---------- 6. Aurora 界面 mock 交互 ----------
  const MockApp = {
    activeDoc: 'aurora',
    activeTab: 'files',
    sourceMode: false,
    toastTimer: null,

    // 三个演示文档的数据（与 HTML 中渲染块一一对应）
    docs: {
      aurora: {
        name: '极光笔记.md',
        lines: 26,
        chars: 218,
        headings: [
          { level: 1, title: 'Aurora · 极光' },
          { level: 2, title: '功能亮点' },
          { level: 2, title: '快速上手' },
        ],
        source: [
          '# Aurora · 极光',
          '',
          'Aurora 是一款 **所见即所得** 的 Markdown 编辑器，让你专注于 *内容创作* 本身。',
          '轻量、专注、体验流畅，启动即用。',
          '',
          '## 功能亮点',
          '',
          '- 实时渲染，编辑与预览无缝融合',
          '- 亮 / 暗主题与自定义强调色自由切换',
          '- 内置 Git 版本控制，可视化查看每次变更',
          '',
          '```js',
          "const aurora = new Editor({",
          "  theme: 'aurora',",
          "  mode: 'wysiwyg'",
          '});',
          '```',
          '',
          '> 轻量、专注、体验流畅 —— 让你专注于内容创作本身。',
          '',
          '## 快速上手',
          '',
          '1. 打开任意 Markdown 文件或整个文件夹',
          '2. 在渲染视图中直接输入，符号自动转换',
          '3. 通过左侧大纲在长文档中快速跳转',
          '',
        ].join('\n'),
      },
      guide: {
        name: '快速入门.md',
        lines: 32,
        chars: 264,
        headings: [
          { level: 1, title: '快速入门' },
          { level: 2, title: '安装与启动' },
          { level: 2, title: '打开文件' },
          { level: 2, title: '常用快捷键' },
        ],
        source: [
          '# 快速入门',
          '',
          '本指南帮助你在几分钟内熟悉 Aurora 的核心工作流。',
          '',
          '## 安装与启动',
          '',
          '下载 Windows 安装包后一键安装，首次启动会自动创建示例文档目录。',
          '',
          '```bash',
          '# 查看版本',
          'aurora --version',
          '```',
          '',
          '## 打开文件',
          '',
          '支持拖拽打开、命令行打开与最近文件列表三种方式，文件夹会以树形结构呈现在左侧栏。',
          '',
          '## 常用快捷键',
          '',
          '- `Ctrl + B` 加粗',
          '- `Ctrl + /` 切换源码模式',
          '- `Ctrl + P` 快速打开文件',
          '',
        ].join('\n'),
      },
      git: {
        name: 'Git 工作流.md',
        lines: 24,
        chars: 198,
        headings: [
          { level: 1, title: 'Git 工作流' },
          { level: 2, title: '初始化仓库' },
          { level: 2, title: '提交变更' },
          { level: 2, title: '查看历史' },
        ],
        source: [
          '# Git 工作流',
          '',
          'Aurora 内置源代码管理，无需离开编辑器即可完成完整的 Git 操作。',
          '',
          '## 初始化仓库',
          '',
          '```bash',
          'git init',
          'git remote add origin git@example.com:notes.git',
          '```',
          '',
          '## 提交变更',
          '',
          '- 左侧差异面板按文件展示增删行',
          '- 点击状态栏 Git 图标一键查看待提交文件',
          '- 支持拉取、推送与冲突标记',
          '',
          '## 查看历史',
          '',
          '> 每次保存都可以生成历史快照，随时对比与还原。',
          '',
        ].join('\n'),
      },
    },

    placeholders: {
      files: '搜索文件…',
      recent: '搜索最近打开…',
      outline: '搜索大纲…',
    },

    init() {
      this.root = document.getElementById('auroraMock');
      if (!this.root) return;

      this.assignHeadingIds();
      this.bindTabs();
      this.bindSearch();
      this.bindFileSwitch();
      this.bindFolders();
      this.bindStatusBar();
      this.bindWindowControls();
      this.renderOutline('');
      this.syncSourceView();
    },

    // 给每个文档的标题打锚点 id，供大纲跳转
    assignHeadingIds() {
      Object.keys(this.docs).forEach((docId) => {
        const article = this.root.querySelector(`.au-doc[data-render="${docId}"]`);
        if (!article) return;
        const headings = article.querySelectorAll('.au-h1, .au-h2, .au-h3');
        headings.forEach((el, i) => { el.id = `au-h-${docId}-${i}`; });
      });
    },

    // ---------- 标签页切换 ----------
    bindTabs() {
      const tabs = this.root.querySelectorAll('.au-tab');
      const indicator = document.getElementById('auTabIndicator');
      const input = document.getElementById('auSearchInput');

      tabs.forEach((tab, index) => {
        tab.addEventListener('click', () => {
          const tabName = tab.dataset.tab;
          if (tabName === this.activeTab) return;
          this.activeTab = tabName;

          tabs.forEach((t) => t.classList.toggle('is-active', t === tab));
          indicator.style.transform = `translateX(${index * 100}%)`;

          this.root.querySelectorAll('.au-panel').forEach((panel) => {
            panel.classList.toggle('is-active', panel.dataset.panel === tabName);
          });

          // 切换标签时清空搜索并换 placeholder
          input.value = '';
          input.placeholder = this.placeholders[tabName];
          this.root.querySelector('.au-search').classList.remove('has-value');
          this.applyFilter('');

          if (tabName === 'outline') this.renderOutline('');
        });
      });
    },

    // ---------- 搜索过滤 ----------
    bindSearch() {
      const input = document.getElementById('auSearchInput');
      const clearBtn = document.getElementById('auSearchClear');
      const searchBox = this.root.querySelector('.au-search');

      input.addEventListener('input', () => {
        const keyword = input.value.trim();
        searchBox.classList.toggle('has-value', keyword.length > 0);
        this.applyFilter(keyword);
        if (this.activeTab === 'outline') this.renderOutline(keyword);
      });

      clearBtn.addEventListener('click', () => {
        input.value = '';
        searchBox.classList.remove('has-value');
        this.applyFilter('');
        if (this.activeTab === 'outline') this.renderOutline('');
        input.focus();
      });
    },

    applyFilter(keyword) {
      if (this.activeTab === 'files') {
        this.root.querySelectorAll('.au-file').forEach((row) => {
          const name = row.querySelector('.au-file-name').textContent;
          row.style.display = !keyword || name.includes(keyword) ? '' : 'none';
        });
      } else if (this.activeTab === 'recent') {
        this.root.querySelectorAll('.au-recent-item').forEach((row) => {
          const name = row.querySelector('.au-recent-name').textContent;
          row.style.display = !keyword || name.includes(keyword) ? '' : 'none';
        });
      }
    },

    // ---------- 文件 / 最近打开切换文档 ----------
    bindFileSwitch() {
      const switchDoc = (docId) => {
        if (!this.docs[docId] || docId === this.activeDoc) return;
        this.activeDoc = docId;

        // 切换渲染文档
        this.root.querySelectorAll('.au-doc').forEach((article) => {
          const match = article.dataset.render === docId;
          article.hidden = !match;
          article.classList.toggle('is-active', match);
          if (match) {
            article.style.animation = 'none';
            // 强制重排后重新触发淡入动画
            void article.offsetWidth;
            article.style.animation = '';
          }
        });

        // 同步两个面板里的选中态
        this.root.querySelectorAll('.au-file, .au-recent-item').forEach((row) => {
          row.classList.toggle('is-active', row.dataset.doc === docId);
        });

        // 更新状态栏行数 / 字符数
        const doc = this.docs[docId];
        document.getElementById('auLineCount').textContent = `${doc.lines} 行`;
        document.getElementById('auCharCount').textContent = `${doc.chars} 字符`;

        // 重建大纲、重置滚动、刷新源码视图
        this.renderOutline('');
        document.getElementById('auDocScroll').scrollTo({ top: 0 });
        this.syncSourceView();
      };

      this.root.addEventListener('click', (e) => {
        const trigger = e.target.closest('.au-file, .au-recent-item');
        if (trigger && this.root.contains(trigger)) switchDoc(trigger.dataset.doc);
      });
    },

    // ---------- 文件夹折叠 ----------
    bindFolders() {
      this.root.querySelectorAll('.au-folder').forEach((folder) => {
        folder.style.cursor = 'pointer';
        folder.addEventListener('click', () => {
          const isOpen = folder.classList.toggle('is-open');
          const children = folder.nextElementSibling;
          if (children && children.classList.contains('au-tree-children')) {
            children.style.display = isOpen ? '' : 'none';
          }
        });
      });
    },

    // ---------- 大纲渲染与跳转 ----------
    renderOutline(keyword) {
      const tree = document.getElementById('auOutlineTree');
      const empty = document.getElementById('auOutlineEmpty');
      const headings = this.docs[this.activeDoc].headings;
      const visible = keyword
        ? headings.filter((h) => h.title.includes(keyword))
        : headings;

      tree.innerHTML = '';
      empty.hidden = visible.length > 0;

      visible.forEach((heading, index) => {
        const globalIndex = this.docs[this.activeDoc].headings.indexOf(heading);
        const item = document.createElement('button');
        item.className = `au-outline-item au-outline-level-${heading.level}`;
        item.innerHTML =
          `<span class="au-outline-hash">${'#'.repeat(heading.level)}</span>` +
          `<span class="au-outline-title"></span>`;
        item.querySelector('.au-outline-title').textContent = heading.title;
        item.addEventListener('click', () => {
          tree.querySelectorAll('.au-outline-item').forEach((i) => i.classList.remove('is-current'));
          item.classList.add('is-current');
          const target = document.getElementById(`au-h-${this.activeDoc}-${globalIndex}`);
          if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
        if (index === 0) item.classList.add('is-current');
        tree.appendChild(item);
      });
    },

    // ---------- 状态栏按钮 ----------
    bindStatusBar() {
      const workspace = document.getElementById('auWorkspace');
      const editor = document.getElementById('auEditor');
      const docScroll = document.getElementById('auDocScroll');
      const sourcePre = document.getElementById('auDocSource');

      // 侧边栏显隐
      const sidebarBtn = document.getElementById('auBtnSidebar');
      sidebarBtn.addEventListener('click', () => {
        const hidden = workspace.classList.toggle('sidebar-hidden');
        sidebarBtn.classList.toggle('is-selected', !hidden);
        this.toast(hidden ? '侧边栏已隐藏' : '侧边栏已展开');
      });

      // 源码模式
      const sourceBtn = document.getElementById('auBtnSource');
      sourceBtn.addEventListener('click', () => {
        this.sourceMode = !this.sourceMode;
        editor.classList.toggle('source-mode', this.sourceMode);
        sourceBtn.classList.toggle('is-selected', this.sourceMode);
        this.syncSourceView();
        this.toast(this.sourceMode ? '已切换到源码模式' : '已切换到渲染视图');
      });

      // Git 面板
      document.getElementById('auBtnGit').addEventListener('click', () => {
        this.toast('源代码管理：2 个文件待提交');
      });

      // 回到顶部
      document.getElementById('auBtnTop').addEventListener('click', () => {
        if (this.sourceMode) {
          sourcePre.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
          docScroll.scrollTo({ top: 0, behavior: 'smooth' });
        }
      });
    },

    syncSourceView() {
      const pre = document.getElementById('auDocSource');
      if (pre) pre.textContent = this.docs[this.activeDoc].source;
    },

    // ---------- 窗口控制按钮 ----------
    bindWindowControls() {
      const win = this.root;

      document.getElementById('auBtnMin').addEventListener('click', () => {
        win.classList.add('is-minimized');
        this.toast('窗口已最小化（演示效果）');
        setTimeout(() => win.classList.remove('is-minimized'), 600);
      });

      const maxBtn = document.getElementById('auBtnMax');
      maxBtn.addEventListener('click', () => {
        const maximized = win.classList.toggle('is-maximized');
        maxBtn.title = maximized ? '还原' : '最大化';
        maxBtn.setAttribute('aria-label', maximized ? '还原' : '最大化');
      });

      document.getElementById('auBtnClose').addEventListener('click', () => {
        this.toast('演示模式：窗口按钮仅作展示');
      });
    },

    // ---------- Toast ----------
    toast(message) {
      const el = document.getElementById('auToast');
      if (!el) return;
      el.textContent = message;
      el.classList.add('show');
      clearTimeout(this.toastTimer);
      this.toastTimer = setTimeout(() => el.classList.remove('show'), 1800);
    },
  };

  // ---------- 7. 启动 ----------
  document.addEventListener('DOMContentLoaded', () => {
    Theme.init();
    Nav.init();
    Reveal.init();
    SmoothAnchor.init();
    Download.init();
    MockApp.init();
  });
})();
