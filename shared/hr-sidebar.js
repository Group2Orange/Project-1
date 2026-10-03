{
  const placeholder = document.querySelector('[data-hr-sidebar]');
  if (placeholder) {
    const active = placeholder.dataset.hrSidebarActive;
    const file = new URL('hr-sidebar.html', document.currentScript.src);
    fetch(file)
      .then(response => {
        if (!response.ok) throw new Error(`HR sidebar: ${response.status}`);
        return response.text();
      })
      .then(html => {
        placeholder.outerHTML = html;
        const sidebar = document.querySelector('.hr-sidebar');
        const link = sidebar.querySelector(`[data-hr-link="${active}"]`);
        if (link) {
          link.classList.add('is-active');
          link.setAttribute('aria-current', 'page');
        }
        try {
          const user = JSON.parse(localStorage.getItem('currentUser') || localStorage.getItem('loggedUser'));
          if (user?.name) {
            const name = user.name.trim();
            const initials = name.split(/\s+/).map(part => part[0]).slice(0, 2).join('').toUpperCase();
            const avatar = sidebar.querySelector('.hr-sidebar-avatar');
            const fallbackImage = '../../common/profile/assets/profile.svg';
            const imageSource = typeof user.image === 'string' && user.image.startsWith('data:image/')
              ? user.image
              : typeof user.image === 'string' && user.image.startsWith('assets/')
                ? new URL(`../../${user.image}`, document.baseURI).href
                : fallbackImage;
            const image = document.createElement('img');
            image.alt = '';
            image.addEventListener('error', () => {
              if (image.dataset.usingFallback === 'true') {
                image.remove();
                avatar.textContent = initials;
                return;
              }
              image.dataset.usingFallback = 'true';
              image.src = fallbackImage;
            });
            image.src = imageSource;
            avatar.replaceChildren(image);
            sidebar.querySelector('.hr-sidebar-name').textContent = name;
          }
        } catch { /* Keep the generic label. */ }
        const toggle = sidebar.querySelector('.hr-sidebar-toggle');
        toggle.addEventListener('click', () => {
          const open = sidebar.classList.toggle('is-open');
          toggle.setAttribute('aria-expanded', String(open));
          toggle.querySelector('span').textContent = open ? 'close' : 'menu';
        });
      })
      .catch(error => {
        console.error(error);
        placeholder.textContent = 'HR navigation is unavailable.';
      });
  }
}
