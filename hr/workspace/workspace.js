const API = 'http://127.0.0.1:3000';
const now = new Date();

// Read the signed-in user. If the saved data is broken, use the default greeting.
let user = {};
try {
  user = JSON.parse(localStorage.getItem('loggedUser') || '{}');
} catch (error) {
  user = {};
}

let firstName = 'there';
if (user && user.name) {
  firstName = user.name.trim().split(/\s+/)[0] || 'there';
}

let greeting = 'Good evening';
if (now.getHours() < 12) greeting = 'Good morning';
else if (now.getHours() < 18) greeting = 'Good afternoon';

document.getElementById('hrGreeting').textContent = `${greeting}, ${firstName} 👋`;
const today = now.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
document.getElementById('hrWorkspaceDate').textContent = `Your HR workspace for ${today}.`;

async function loadTeamSummary() {
  const message = document.getElementById('hrWorkspaceMessage');
  try {
    const response = await fetch(`${API}/employees`);
    if (!response.ok) throw new Error('Could not load team summary.');
    const employees = await response.json();
    // reduce() walks the list once and adds each employee to the right counters.
    const totals = employees.reduce(function (counts, item) {
      if (item.status === 'Active') counts.active++;
      if (item.status === 'Blocked') counts.blocked++;
      if (item.firstAttend === true) counts.firstAttend++;
      return counts;
    }, { active: 0, blocked: 0, firstAttend: 0 });

    document.getElementById('hrTotalEmployees').textContent = employees.length;
    document.getElementById('hrActiveEmployees').textContent = totals.active;
    document.getElementById('hrFirstAttend').textContent = totals.firstAttend;
    document.getElementById('hrBlockedEmployees').textContent = totals.blocked;
  } catch (error) {
    message.textContent = `${error.message} Start the API with npm run api.`;
  }
}

loadTeamSummary();
