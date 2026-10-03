const API = 'http://127.0.0.1:3000';
const now = new Date();
let user = {};
try { user = JSON.parse(localStorage.getItem('loggedUser') || '{}'); } catch { /* Use the default greeting. */ }
const firstName = user.name?.trim().split(/\s+/)[0] || 'there';
const greeting = now.getHours() < 12 ? 'Good morning' : now.getHours() < 18 ? 'Good afternoon' : 'Good evening';
document.getElementById('hrGreeting').textContent = `${greeting}, ${firstName} 👋`;
document.getElementById('hrWorkspaceDate').textContent = `Your HR workspace for ${now.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}.`;

async function loadTeamSummary() {
  const message = document.getElementById('hrWorkspaceMessage');
  try {
    const response = await fetch(`${API}/employees`);
    if (!response.ok) throw new Error('Could not load team summary.');
    const employees = await response.json();
    document.getElementById('hrTotalEmployees').textContent = employees.length;
    document.getElementById('hrActiveEmployees').textContent = employees.filter(item => item.status === 'Active').length;
    document.getElementById('hrFirstAttend').textContent = employees.filter(item => item.firstAttend === true).length;
    document.getElementById('hrBlockedEmployees').textContent = employees.filter(item => item.status === 'Blocked').length;
  } catch (error) {
    message.textContent = `${error.message} Start the API with npm run api.`;
  }
}

loadTeamSummary();
