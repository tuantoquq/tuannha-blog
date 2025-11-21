import { defineConfig } from 'vitepress';

// https://vitepress.dev/reference/site-config
export default defineConfig({
  lang: 'en-US',
  title: 'TDev Blog',
  description:
    'A personal tech blog focused on sharing practical knowledge, real-world experience and tips in software development, devops, system architecture, and modern technologies.',
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: 'Home', link: '/' },
      { text: 'DevOps', link: '/devops' },
      { text: 'Backend', link: '/backend' },
    ],

    sidebar: [
      {
        text: 'Devops',
        items: [
          { text: 'DevOps Overview', link: '/devops/' },
          {
            text: 'Dockerfile Optimization',
            link: '/devops/optimize-dockerfile',
          },
          { text: 'Kubernetes Debugging', link: '/devops/debug-k8s' },
        ],
      },
    ],

    socialLinks: [
      {
        icon: 'github',
        link: 'https://github.com/tuantoquq',
        ariaLabel: 'Personal Github',
      },
    ],

    footer: {
      message: 'Released under the MIT License.',
      copyright:
        'Copyright © 2025-present <a href="https://github.com/tuantoquq">tuannha</a>',
    },

    lastUpdated: {
      text: 'Updated at',
      formatOptions: {
        dateStyle: 'full',
        timeStyle: 'medium',
      },
    },
    search: {
      provider: 'local',
    },
  },
});
