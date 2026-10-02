// Apply the saved theme before the page is displayed, including pages without a navbar.
document.documentElement.dataset.theme = localStorage.getItem('teamspaceTheme') === 'dark' ? 'dark' : 'light';
