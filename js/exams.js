const exams = [
  {
    subject: 'Mathematics',
    grade: 'Form 4',
    year: '2023',
    title: 'KCSE Mathematics Paper 1',
    format: 'PDF',
    download: '#'
  },
  {
    subject: 'Biology',
    grade: 'Form 3',
    year: '2022',
    title: 'Biology End Term Exam',
    format: 'PDF',
    download: '#'
  },
  {
    subject: 'Physics',
    grade: 'Form 4',
    year: '2021',
    title: 'Physics Mock Exam',
    format: 'Printable',
    download: '#'
  }
];

const renderExams = () => {
  const examList = document.querySelector('#examList');
  if (!examList) return;

  examList.innerHTML = exams
    .map(
      (exam) => `
        <article class="exam-card">
          <div class="exam-card-header">
            <span class="exam-subject">${exam.subject}</span>
            <span class="exam-grade">${exam.grade}</span>
          </div>
          <h3>${exam.title}</h3>
          <div class="exam-meta">
            <span>${exam.year}</span>
            <span>${exam.format}</span>
          </div>
          <a href="${exam.download}" class="btn btn-primary">Download</a>
        </article>
      `
    )
    .join('');
};

const setAuthLink = () => {
  const authLink = document.querySelector('#auth-link');
  if (!authLink) return;

  const user = localStorage.getItem('wegem-user');
  if (user) {
    authLink.textContent = 'Sign Out';
    authLink.href = 'home.html';
    authLink.addEventListener('click', (event) => {
      event.preventDefault();
      localStorage.removeItem('wegem-user');
      window.location.href = 'signup.html';
    });
  } else {
    authLink.textContent = 'Sign In';
    authLink.href = 'signup.html';
  }
};

document.addEventListener('DOMContentLoaded', () => {
  renderExams();
  setAuthLink();
});