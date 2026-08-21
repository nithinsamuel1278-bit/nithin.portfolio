const menuToggle = document.querySelector('.menu-toggle');
const navigation = document.querySelector('.main-nav');

menuToggle.addEventListener('click', () => {
  const isOpen = navigation.classList.toggle('open');
  menuToggle.setAttribute('aria-expanded', String(isOpen));
  menuToggle.setAttribute('aria-label', isOpen ? 'Close navigation' : 'Open navigation');
});

document.querySelectorAll('.main-nav a').forEach((link) => {
  link.addEventListener('click', () => {
    navigation.classList.remove('open');
    menuToggle.setAttribute('aria-expanded', 'false');
    menuToggle.setAttribute('aria-label', 'Open navigation');
  });
});

const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.14 });

document.querySelectorAll('.reveal').forEach((element) => revealObserver.observe(element));

const progressBar = document.querySelector('.scroll-progress span');
const sectionLinks = [...document.querySelectorAll('.main-nav a')];
const pageSections = sectionLinks
  .map((link) => document.querySelector(link.getAttribute('href')))
  .filter(Boolean);

const updateScrollProgress = () => {
  const scrollableHeight = document.documentElement.scrollHeight - window.innerHeight;
  const progress = scrollableHeight > 0 ? (window.scrollY / scrollableHeight) * 100 : 0;
  progressBar.style.width = `${progress}%`;
};

window.addEventListener('scroll', updateScrollProgress, { passive: true });
updateScrollProgress();

const activeSectionObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    sectionLinks.forEach((link) => {
      link.classList.toggle('active', link.getAttribute('href') === `#${entry.target.id}`);
    });
  });
}, { rootMargin: '-25% 0px -60% 0px' });

pageSections.forEach((section) => activeSectionObserver.observe(section));

const tiltCard = document.querySelector('[data-tilt]');
if (tiltCard && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  tiltCard.addEventListener('pointermove', (event) => {
    const bounds = tiltCard.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width - 0.5;
    const y = (event.clientY - bounds.top) / bounds.height - 0.5;
    tiltCard.style.transform = `perspective(900px) rotateX(${y * -7}deg) rotateY(${x * 7}deg) rotateZ(3deg)`;
  });

  tiltCard.addEventListener('pointerleave', () => {
    tiltCard.style.transform = 'perspective(900px) rotate(3deg)';
  });
}

const clientLogin = document.querySelector('#client-login');
const clientDashboard = document.querySelector('#client-dashboard');
const loginStatus = document.querySelector('#login-status');
const dashboardBack = document.querySelector('#dashboard-back');
const signupForm = document.querySelector('#client-signup');
const showSignup = document.querySelector('#show-signup');
const showLogin = document.querySelector('#show-login');
const signupStatus = document.querySelector('#signup-status');
const projectProgress = document.querySelector('#project-progress');

const sendAuthRequest = async (url, payload) => {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Something went wrong.');
  return data;
};

const loadProjects = async () => {
  const response = await fetch('/api/projects');
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Unable to load projects.');
  projectProgress.replaceChildren();
  if (!data.projects.length) {
    const emptyState = document.createElement('p');
    emptyState.className = 'login-status';
    emptyState.textContent = 'No projects have been added to this account yet.';
    projectProgress.append(emptyState);
    return;
  }
  data.projects.forEach((project) => {
    const projectItem = document.createElement('div');
    const meta = document.createElement('div');
    const name = document.createElement('strong');
    const progressLabel = document.createElement('span');
    const track = document.createElement('div');
    const progressBar = document.createElement('span');
    const status = document.createElement('small');
    meta.className = 'project-meta';
    track.className = 'progress-track';
    name.textContent = project.name;
    progressLabel.textContent = `${project.progress}%`;
    progressBar.style.width = `${project.progress}%`;
    status.textContent = project.statusLabel;
    meta.append(name, progressLabel);
    track.append(progressBar);
    projectItem.append(meta, track, status);
    projectProgress.append(projectItem);
  });
};

clientLogin.addEventListener('submit', async (event) => {
  event.preventDefault();
  loginStatus.textContent = 'Signing in...';
  try {
    await sendAuthRequest('/api/auth/login', Object.fromEntries(new FormData(clientLogin)));
    await loadProjects();
    clientLogin.hidden = true;
    clientDashboard.hidden = false;
    loginStatus.textContent = '';
  } catch (error) {
    loginStatus.textContent = error.message;
  }
});

dashboardBack.addEventListener('click', () => {
  clientDashboard.hidden = true;
  clientLogin.hidden = false;
  clientLogin.reset();
  clientLogin.querySelector('input').focus();
});

showSignup.addEventListener('click', () => {
  clientLogin.hidden = true;
  signupForm.hidden = false;
  signupForm.querySelector('input').focus();
});

showLogin.addEventListener('click', () => {
  signupForm.hidden = true;
  clientLogin.hidden = false;
  clientLogin.querySelector('input').focus();
});

signupForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  signupStatus.textContent = 'Creating account...';
  try {
    await sendAuthRequest('/api/auth/signup', Object.fromEntries(new FormData(signupForm)));
    await loadProjects();
    signupForm.hidden = true;
    clientDashboard.hidden = false;
    signupStatus.textContent = '';
  } catch (error) {
    signupStatus.textContent = error.message;
  }
});
