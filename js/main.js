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

  // ---------- 6. 启动 ----------
  document.addEventListener('DOMContentLoaded', () => {
    Theme.init();
    Nav.init();
    Reveal.init();
    SmoothAnchor.init();
    Download.init();
  });
})();
