// main.js - Portal Admin features

// --- DOM refs ---
const loginBox = document.getElementById('loginBox');
const homeBox = document.getElementById('homeBox');
const mainBox = document.getElementById('mainBox');
const devBox = document.getElementById('devBox');
const loginForm = document.getElementById('loginForm');
const loginUser = document.getElementById('loginUser');
const loginPass = document.getElementById('loginPass');
const loginMsg = document.getElementById('loginMsg');
const btnLogin = document.getElementById('btnLogin');
const btnLogout = document.getElementById('btnLogout');
const userInfo = document.getElementById('userInfo');
const userInfoDash = document.getElementById('userInfoDash');


// --- Auth logic ---
let currentUser = null;

export function getCurrentUser() {
  return currentUser;
}

export async function checkAuth() {
  try {
    const res = await fetch('/api/me');
    if (!res.ok) throw new Error('not auth');
    const data = await res.json();
    if (data && data.user) {
      currentUser = data.user;
      document.dispatchEvent(new CustomEvent('auth:checked', { detail: { user: currentUser } }));
      return true;
    }
  } catch (e) {}
  currentUser = null;
  document.dispatchEvent(new CustomEvent('auth:checked', { detail: { user: null } }));
  return false;
}

// --- Login/Logout events ---
if (loginForm) {
  loginForm.onsubmit = async (e) => {
    e.preventDefault();
    btnLogin.disabled = true;
    loginMsg.textContent = 'Đang đăng nhập...';
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: loginUser.value.trim(), password: loginPass.value })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        loginMsg.textContent = err.detail || 'Sai tài khoản hoặc mật khẩu';
        btnLogin.disabled = false;
        return;
      }
      loginMsg.textContent = 'Đăng nhập thành công!';
      loginUser.value = '';
      loginPass.value = '';
      setTimeout(() => { 
        checkAuth().then(() => {
          document.dispatchEvent(new CustomEvent('auth:login', { detail: { user: currentUser } }));
        });
      }, 500);
    } catch (e) {
      loginMsg.textContent = 'Lỗi kết nối';
    }
    btnLogin.disabled = false;
  };
}

if (btnLogout) {
  btnLogout.onclick = async () => {
    await fetch('/api/logout', { method: 'POST' });
    checkAuth().then(() => {
      document.dispatchEvent(new CustomEvent('auth:logout'));
    });
  };
}

// --- Khởi tạo kiểm tra auth khi load ---
document.addEventListener('DOMContentLoaded', () => {
  checkAuth();
});
