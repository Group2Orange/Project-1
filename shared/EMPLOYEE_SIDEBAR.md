# Employee sidebar

`employee-sidebar.html`, `employee-sidebar.css`, and `employee-sidebar.js` form one sidebar shared by employee pages. My Workspace and My Tasks already use it.

Add these to another employee page (adjust `../../` if its folder depth differs):

```html
<link rel="stylesheet" href="../../shared/employee-sidebar.css">
```

Place the sidebar inside the page's main layout:

```html
<aside class="employee-sidebar" data-employee-sidebar data-sidebar-active="details" aria-label="Employee workspace"></aside>
```

Load the script near the end of the body:

```html
<script src="../../shared/employee-sidebar.js"></script>
```

Use `workspace`, `details`, `tasks`, `leave`, `policies`, `feedback`, or `helpdesk` for `data-sidebar-active`. The sidebar links are defined in one place, `employee-sidebar.html`. When the My Details, Leave & Time Off, and Helpdesk pages arrive, update their links there. The current links point to available project pages while those teammate files are absent.

The sidebar reads the `employeeTasks` localStorage key for the active-task count and progress. Pages that change tasks in the current tab can dispatch `window.dispatchEvent(new Event('teamspace:tasks-changed'))` after saving.
