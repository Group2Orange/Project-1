// Profile edits are saved for the signed-in employee in this browser.
const user = JSON.parse(localStorage.getItem('loggedUser') || 'null');
if (!user) location.replace('../login/login.html');

const editKey = `profileEdits_${user?.id}`;
const form = document.getElementById('editProfileForm');
const fullName = document.getElementById('fullName');
const phone = document.getElementById('phone');
const photo = document.getElementById('profileImage');
let newImage = null;

function renderProfile() {
  const current = JSON.parse(localStorage.getItem('loggedUser') || 'null');
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

form.addEventListener('submit', event => {
  event.preventDefault();
  const name = fullName.value.trim();
  const number = phone.value.trim();
  fullName.classList.toggle('error-input', !name);
  const invalidPhone = number.replace(/\D/g, '').length < 7;
  showPhoneError(invalidPhone);
  if (!name || invalidPhone) return;

  const current = JSON.parse(localStorage.getItem('loggedUser') || 'null');
  const updated = { ...current, name, phone: number, ...(newImage ? { image: newImage } : {}) };
  try {
    localStorage.setItem(editKey, JSON.stringify({ name, phone: number, ...(newImage ? { image: newImage } : {}) }));
    localStorage.setItem('loggedUser', JSON.stringify(updated));
    newImage = null;
    renderProfile();
    window.dispatchEvent(new Event('teamspace:profile-changed'));
    alert('Profile updated successfully.');
  } catch (error) {
    alert('Could not save the profile. Try a smaller photo.');
  }
});

document.getElementById('btnCancel').addEventListener('click', () => {
  newImage = null;
  showPhoneError(false);
  fullName.classList.remove('error-input');
  renderProfile();
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
renderProfile();
