// @ts-check
const { themes: prismThemes } = require('prism-react-renderer');

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'Software Dev Interview Prep',
  tagline: 'A comprehensive guide for senior engineering interviews',
  favicon: 'img/favicon.ico',

  url: 'https://ishansharma191.github.io',
  baseUrl: '/notes_web/',

  organizationName: 'ishansharma191',
  projectName: 'notes_web',

  onBrokenLinks: 'warn',
  onBrokenMarkdownLinks: 'warn',

  // Treat .md files as CommonMark (not MDX) to avoid parse errors
  // from angle brackets and {expressions} in java_prep content
  markdown: {
    format: 'md',
    mermaid: false,
  },

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          sidebarPath: require.resolve('./sidebars.js'),
          routeBasePath: 'docs',
        },
        blog: false,
        theme: {
          customCss: require.resolve('./src/css/custom.css'),
        },
      }),
    ],
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      navbar: {
        title: 'Dev Interview Prep',
        items: [
          {
            type: 'docSidebar',
            sidebarId: 'tutorialSidebar',
            position: 'left',
            label: 'Docs',
          },
          {
            href: 'https://github.com/ishansharma191/notes_web',
            label: 'GitHub',
            position: 'right',
          },
        ],
      },
      footer: {
        style: 'dark',
        copyright: `Copyright © ${new Date().getFullYear()} Ishan Sharma. Built with Docusaurus.`,
      },
      prism: {
        theme: prismThemes.github,
        darkTheme: prismThemes.dracula,
        additionalLanguages: ['java', 'python', 'bash', 'yaml', 'kotlin', 'elixir'],
      },
    }),
};

module.exports = config;
