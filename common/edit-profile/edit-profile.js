// Read and update this employee directly through the local API.
const API = 'http://127.0.0.1:3000';
const user = JSON.parse(localStorage.getItem('loggedUser') || 'null');
if (!user) location.replace('../login/login.html');

const form = document.getElementById('editProfileForm');
const fullName = document.getElementById('fullName');
const phone = document.getElementById('phone');
const photo = document.getElementById('profileImage');
let newImage = null;

async function renderProfile() {
  let current;
  try {
    // OLD WAY: current = JSON.parse(localStorage.getItem('loggedUser'));
    // NEW WAY: read the current employee from api/db.json through the API.
    const response = await fetch(`${API}/employees/${encodeURIComponent(user.id)}`);
    if (!response.ok) throw new Error('Could not load profile.');
    current = await response.json();
  }
  catch (error) {
    document.getElementById('employeeName').textContent = error.message;
    return;
  }
  if (!current) return;
  document.getElementById('employeeName').textContent = current.name;
  fullName.value = current.name || '';
  phone.value = current.phone || '';
  document.getElementById('position').value = current.position || '';
  document.getElementById('department').value = current.department || '';
  document.getElementById('email').value = current.email || '';
  document.getElementById('employeeId').value = current.id || '';
  photo.style.backgroundImage = current.image?.startsWith('data:')
    ? `url("${current.image}")` : 'url("../profile/assets/profile.svg")';
}

function showPhoneError(show) {
  phone.classList.toggle('error-input', show);
  document.getElementById('phoneErrorIcon').style.display = show ? 'inline-block' : 'none';
  document.getElementById('phoneErrorMessage').style.display = show ? 'block' : 'none';
  document.getElementById('phoneValidationText').style.display = show ? 'inline' : 'none';
}

form.addEventListener('submit', async event => {
  event.preventDefault();
  const name = fullName.value.trim();
  const number = phone.value.trim();
  fullName.classList.toggle('error-input', !name);
  const invalidPhone = number.replace(/\D/g, '').length < 7;
  showPhoneError(invalidPhone);
  if (!name || invalidPhone) return;

  const changes = { name, phone: number, ...(newImage ? { image: newImage } : {}) };
  try {
    // OLD WAY: localStorage.setItem(`profileEdits_${user.id}`, JSON.stringify(changes));
    // NEW WAY: PATCH the employee record so a later visit loads these edits.
    const response = await fetch(`${API}/employees/${encodeURIComponent(user.id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(changes)
    });
    if (!response.ok) throw new Error('Could not update profile.');
    const updated = await response.json();
    const safeUser = {
      id: updated.id,
      role: updated.role,
      name: updated.name,
      email: updated.email,
      department: updated.department,
      position: updated.position,
      employeeId: updated.employeeId,
      image: updated.image
    };
    localStorage.setItem('loggedUser', JSON.stringify(safeUser));
    localStorage.removeItem('currentUser');
    newImage = null;
    await renderProfile();
    window.dispatchEvent(new Event('teamspace:profile-changed'));
    alert('Profile updated successfully.');
  } catch (error) {
    alert(error.message || 'Could not save the profile. Try a smaller photo.');
  }
});

document.getElementById('btnCancel').addEventListener('click', () => {
  newImage = null;
  document.getElementById('photoInput').value = '';
  // Leave the edit screen without saving any pending changes.
  location.href = '../profile/profile.html';
});

document.getElementById('photoInput').addEventListener('change', event => {
  const file = event.target.files[0];
  if (!file || !file.type.startsWith('image/')) return;
  if (file.size > 1024 * 1024) {
    alert('Choose a photo smaller than 1 MB.');
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    newImage = String(reader.result);
    photo.style.backgroundImage = `url("${newImage}")`;
  };
  reader.readAsDataURL(file);
});

phone.addEventListener('input', () => showPhoneError(false));
if (user) renderProfile();
