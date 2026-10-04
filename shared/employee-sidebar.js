{
  const placeholder = document.querySelector('[data-employee-sidebar]');

  if (placeholder) {
    const activePage = placeholder.dataset.sidebarActive;
    const file = new URL('employee-sidebar.html', document.currentScript.src);

    fetch(file)
      .then(response => {
        if (!response.ok) throw new Error(`Sidebar request failed: ${response.status}`);
        return response.text();
      })
      .then(html => {
        placeholder.outerHTML = html;

        const sidebar = document.querySelector('.employee-sidebar');
        try {
          const user = JSON.parse(localStorage.getItem('loggedUser'));
          if (user?.name) {
            const parts = user.name.trim().split(/\s+/);
            const initials = `${parts[0][0]}${parts.length > 1 ? parts[parts.length - 1][0] : ''}`.toUpperCase();
            sidebar.querySelector('.employee-sidebar-person strong').textContent = user.name;
            sidebar.querySelector('.employee-sidebar-person small').textContent = user.department || user.position || 'Employee';
            const avatar = sidebar.querySelector('.employee-sidebar-avatar');
            avatar.textContent = initials;

            const imageSource = String(user.image || '');
            if (imageSource.startsWith('data:image/') || imageSource.startsWith('assets/')) {
              const image = document.createElement('img');
              image.alt = '';
              image.addEventListener('error', () => {
                image.remove();
                avatar.textContent = initials;
              });
              avatar.textContent = '';
              image.src = imageSource.startsWith('assets/')
                ? new URL(`../../${imageSource}`, document.baseURI).href
                : imageSource;
              avatar.append(image);
            }
          }
        } catch (error) {
          console.warn('Could not read the logged-in user for the sidebar:', error);
        }

        const activeLink = sidebar.querySelector(`[data-sidebar-link="${activePage}"]`);
        if (activeLink) {
          activeLink.classList.add('is-active');
          activeLink.setAttribute('aria-current', 'page');
        }

        sidebar.querySelector('#employeeSidebarLogout').addEventListener('click', () => {
          localStorage.removeItem('loggedUser');
          localStorage.removeItem('currentUserId');
          localStorage.removeItem('currentUser');
          window.location.href = '../../common/login/login.html';
        });

        const toggle = sidebar.querySelector('.employee-sidebar-toggle');
        toggle.addEventListener('click', () => {
          const open = sidebar.classList.toggle('is-open');
          toggle.setAttribute('aria-expanded', String(open));
          toggle.setAttribute('aria-label', open ? 'Hide workspace pages' : 'Show workspace pages');
          toggle.querySelector('span').textContent = open ? 'close' : 'menu';
        });

        async function updateTaskSummary() {
          let tasks = [];
          try {
            const user = JSON.parse(localStorage.getItem('loggedUser') || 'null');
            if (user?.id) {
              const response = await fetch(`http://127.0.0.1:3000/tasks?employeeId=${encodeURIComponent(user.id)}`);
              if (!response.ok) throw new Error('Could not load task progress.');
              tasks = await response.json();
            }
          } catch (error) {
            console.warn(error);
          }

          const activeCount = tasks.filter(task => task.status !== 'completed').length;
          const completedCount = tasks.filter(task => task.status === 'completed').length;
          const progress = tasks.length ? Math.round(completedCount / tasks.length * 100) : 0;

          sidebar.querySelector('#sidebarTaskCount').textContent = activeCount;
          sidebar.querySelector('#weeklyProgressText').textContent = `${progress}%`;
          sidebar.querySelector('#weeklyProgressBar').style.width = `${progress}%`;
          sidebar.querySelector('[role="progressbar"]').setAttribute('aria-valuenow', String(progress));
        }

        updateTaskSummary();
        window.addEventListener('teamspace:tasks-changed', updateTaskSummary);
        window.addEventListener('pageshow', updateTaskSummary);
      })
      .catch(error => {
        console.error('Could not load the employee sidebar. Open this page through Live Server.', error);
        placeholder.textContent = 'Workspace navigation is unavailable.';
      });
  }
}
