// Modules and screens in the order a user meets them in the app. One line per screen (pk check reads it).
// status: Brief | In progress | Review | Approved | Archived. updated: date of the last change (YYYY-MM-DD).
window.MOCKUP = {
  title: '{{TITLE}}',
  description: 'One line: what the product does and what this mockup validates.',
  status: 'Brief',
  updated: '{{DATE}}',
  lang: '{{LANG}}',
  device: 'phone',
  themes: ['light'],
  phases: {
    p1: { label: 'P1 MVP', name: 'Launch', desc: 'Launch scope' },
    p2: { label: 'P2', name: 'Second release', desc: 'After launch' },
  },
  modules: [
    { title: '1. Sample module', icon: 'layout-grid', screens: [
      { id: 'home', name: 'Home', phase: 'p1', built: true, desc: 'Greeting, today’s summary, quick actions' },
      { id: 'settings', name: 'Settings', phase: 'p2', desc: 'Account, notifications, privacy' },
    ] },
  ],
};
