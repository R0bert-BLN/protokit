window.MK = window.MK || {};

MK.config = {
  appName: '{{TITLE}}',
  tabs: [
    { id: 'home', label: 'Home', icon: 'house', href: 'screens/home.html' },
    { id: 'profile', label: 'Profile', icon: 'user', href: 'screens/home.html' },
  ],
};

MK.data = {
  user: { id: 'u1', name: 'Emma Clarke', city: 'London' },
  people: [
    { id: 'u1', name: 'Emma Clarke', city: 'London' },
    { id: 'u2', name: 'James Patel', city: 'Manchester' },
    { id: 'u3', name: 'Sofia Rossi', city: 'Bristol' },
  ],
};
