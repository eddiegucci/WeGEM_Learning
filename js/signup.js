// js/signup.js
import { saveUser, setCurrentUser, makeUserId, getCurrentUser } from './firebase.js';

if (getCurrentUser()) {
  window.location.href = 'home.html';
}

let selectedCurriculum = null;

const stepA = document.getElementById('stepA');
const stepB = document.getElementById('stepB');
const form844 = document.getElementById('form844');
const formCBE = document.getElementById('formCBE');
const errorEl = document.getElementById('signupError');

function showError(msg) {
  errorEl.textContent = msg;
  errorEl.classList.remove('hidden');
}
function clearError() {
  errorEl.classList.add('hidden');
  errorEl.textContent = '';
}

document.querySelectorAll('.curriculum-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    selectedCurriculum = btn.dataset.curriculum;
    document.querySelectorAll('.curriculum-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');

    setTimeout(() => {
      stepA.classList.add('hidden');
      stepB.classList.remove('hidden');
      if (selectedCurriculum === '844') {
        form844.classList.remove('hidden');
        formCBE.classList.add('hidden');
        document.getElementById('detailsTitle').textContent = 'Your details (8-4-4)';
      } else {
        formCBE.classList.remove('hidden');
        form844.classList.add('hidden');
        document.getElementById('detailsTitle').textContent = 'Your details (CBE)';
      }
    }, 300);
  });
});

document.getElementById('backBtn').addEventListener('click', () => {
  stepB.classList.add('hidden');
  stepA.classList.remove('hidden');
  clearError();
});

document.getElementById('finishBtn').addEventListener('click', async () => {
  clearError();
  const btn = document.getElementById('finishBtn');
  btn.disabled = true;
  btn.textContent = 'Saving…';

  let data = { curriculum: selectedCurriculum };

  if (selectedCurriculum === '844') {
    const name = document.getElementById('name844').value.trim();
    const form = document.getElementById('form844Select').value;
    const cls = document.getElementById('class844').value.trim();
    const stream = document.getElementById('stream844').value.trim();
    const adm = document.getElementById('adm844').value.trim();
    const school = document.getElementById('school844').value.trim();

    if (!name || !form || !school) {
      showError('Please fill in name, form, and school.');
      btn.disabled = false; btn.textContent = 'Finish →';
      return;
    }
    Object.assign(data, { name, form, class: cls, stream, adm, school });
  } else {
    const name = document.getElementById('nameCBE').value.trim();
    const grade = document.getElementById('gradeCBE').value;
    const stream = document.getElementById('streamCBE').value.trim();
    const adm = document.getElementById('admCBE').value.trim();
    const school = document.getElementById('schoolCBE').value.trim();

    if (!name || !grade || !school) {
      showError('Please fill in name, grade, and school.');
      btn.disabled = false; btn.textContent = 'Finish →';
      return;
    }
    Object.assign(data, { name, grade, stream, adm, school });
  }

  const email = document.getElementById('emailField').value.trim().toLowerCase();
  if (email) data.email = email;

  const userId = email ? makeUserId(email) : 'user_' + Date.now();

  try {
    await saveUser(userId, data);
    setCurrentUser({ userId, ...data });
    window.location.href = 'home.html';
  } catch (e) {
    console.error(e);
    setCurrentUser({ userId, ...data, offline: true });
    window.location.href = 'home.html';
  }
});