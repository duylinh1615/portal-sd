// ui-home.js (navigation, page switching)
// Depends on main.js (ES module): import { checkAuth, getCurrentUser } from './main.js'
import { checkAuth, getCurrentUser } from './main.js';
import { initDashboard, fetchStatus, fetchHistory, fetchSchedules } from './ui-dashboard.js';
import { renderUnlockBox } from './ui-unlock.js';
import { renderVmBox } from './ui-vm.js';

const loginBox = document.getElementById('loginBox');
const homeBox  = document.getElementById('homeBox');
const mainBox  = document.getElementById('mainBox');
const devBox   = document.getElementById('devBox');

const userInfo     = document.getElementById('userInfo');
const userInfoDash = document.getElementById('userInfoDash');

export function showPage(page) {
  if (loginBox) loginBox.style.display = 'none';
  if (homeBox)  homeBox.style.display = 'none';
  if (mainBox)  mainBox.style.display = 'none';
  if (devBox)   devBox.style.display = 'none';

  if (page === 'login' && loginBox) loginBox.style.display = '';
  if (page === 'home'  && homeBox)  homeBox.style.display  = '';
  if (page === 'main'  && mainBox)  mainBox.style.display  = '';
  if (page === 'dev'   && devBox)   devBox.style.display   = '';
}

// Reflect auth state into UI
function onAuthChecked(user) {
  if (user) {
    if (userInfo) userInfo.textContent = `Xin chào, ${user.sub} (${user.role})`;
    showPage('home');
  } else {
    if (userInfo) userInfo.textContent = '';
    showPage('login');
    const loginMsg = document.getElementById('loginMsg');
    if (loginMsg) loginMsg.textContent = '';
  }
}

function bindFeatureCards() {
  document.querySelectorAll('.feature-card').forEach(card => {
    card.onclick = () => {
      const feat = card.getAttribute('data-feature');
      if (feat === 'sync-users') {
        showPage('main');
        initDashboard();
        const u = getCurrentUser();
        if (u && userInfoDash) {
          userInfoDash.textContent = `Xin chào, ${u.sub} (${u.role})`;
        }
        fetchHistory();
        fetchSchedules();
        fetchStatus(true);
      } else if (feat === 'unlock-users') {
        showPage('none');
        renderUnlockBox();
        if (homeBox) homeBox.style.display = 'none';
      } else if (feat === 'list-vm') {
        showPage('none');
        renderVmBox();
      } else {
        showPage('dev');
      }
    };
  });

  const btnBackHome  = document.getElementById('btnBackHome');
  const btnBackHome2 = document.getElementById('btnBackHome2');
  if (btnBackHome)  btnBackHome.onclick  = () => showPage('home');
  if (btnBackHome2) btnBackHome2.onclick = () => showPage('home');

  const btnVm = document.getElementById('btnVmList');
  if (btnVm && btnVm.remove) btnVm.remove();
}

document.addEventListener('DOMContentLoaded', () => {
  bindFeatureCards();
});

// Listen to auth events from main.js
document.addEventListener('auth:checked', (e) => onAuthChecked(e.detail.user));
document.addEventListener('auth:login',   (e) => onAuthChecked(e.detail.user));
document.addEventListener('auth:logout',  ()  => onAuthChecked(null));

// Re-check auth if needed from elsewhere
export { checkAuth };
