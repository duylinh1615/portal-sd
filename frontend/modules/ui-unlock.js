// ui-unlock.js
export function renderUnlockBox() {
  if (!document.getElementById('unlockBox')) {
    const box = document.createElement('div');
    box.id = 'unlockBox';
    box.style.maxWidth = '400px';
    box.style.margin = '40px auto';
    box.style.background = '#fff';
    box.style.borderRadius = '10px';
    box.style.boxShadow = '0 2px 12px #0002';
    box.style.padding = '32px 24px';
    box.style.display = 'none';
    box.innerHTML = `
      <h2 style="margin:0 0 18px 0;font-size:1.3rem;">Unlock AD User</h2>
      <form id="unlockForm">
        <div style="margin-bottom:12px;">
          <input id="unlockUser" type="text" placeholder="Username cần unlock VD: user1,user2,user3" style="width:100%;padding:10px 12px;font-size:1rem;border-radius:6px;border:1px solid #ccc;">
        </div>
        <div style="margin-bottom:12px;">
          <input id="unlockAdmin" type="text" placeholder="Tài khoản admin AD" style="width:100%;padding:10px 12px;font-size:1rem;border-radius:6px;border:1px solid #ccc;">
        </div>
        <div style="margin-bottom:12px;">
          <input id="unlockPass" type="password" placeholder="Mật khẩu admin" style="width:100%;padding:10px 12px;font-size:1rem;border-radius:6px;border:1px solid #ccc;">
        </div>
        <div style="margin-bottom:12px;">
          <input id="unlockDomain" type="text" placeholder="Domain (mặc định: abc.vn)" style="width:100%;padding:10px 12px;font-size:1rem;border-radius:6px;border:1px solid #ccc;">
        </div>
        <button id="btnUnlock" type="submit" style="width:100%;margin-bottom:8px;">Unlock</button>
        <div id="unlockMsg" class="muted" style="min-height:20px;margin-top:6px;"></div>
      </form>
      <button id="btnBackHomeUnlock" style="margin-top:18px;background:#eee;color:#2355d6;border:1px solid #2355d6;padding:8px 24px;font-size:1rem;width:100%;">Quay về trang chủ</button>
    `;
    document.body.appendChild(box);
  }
  const unlockBox  = document.getElementById('unlockBox');
  const unlockForm = document.getElementById('unlockForm');
  const unlockMsg  = document.getElementById('unlockMsg');
  const unlockBtn  = document.getElementById('btnUnlock');
  const inputs = {
    user:   document.getElementById('unlockUser'),
    admin:  document.getElementById('unlockAdmin'),
    pass:   document.getElementById('unlockPass'),
    domain: document.getElementById('unlockDomain'),
  };
  const btnBack = document.getElementById('btnBackHomeUnlock');
  if (btnBack) btnBack.onclick = () => {
    unlockBox.style.display = 'none';
    const homeBox = document.getElementById('homeBox');
    if (homeBox) homeBox.style.display = '';
  };
  if (unlockForm) unlockForm.onsubmit = async (e) => {
    e.preventDefault();
    if (unlockBtn) unlockBtn.disabled = true;
    if (unlockMsg) unlockMsg.textContent = 'Đang gửi yêu cầu...';
    const payload = {
      username: inputs.user.value.trim(),
      admin_user: inputs.admin.value.trim(),
      admin_pass: inputs.pass.value,
      domain: inputs.domain.value.trim() || 'smartmind.vn',
    };
    try {
      const res = await fetch('/api/unlock-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.ok) {
        unlockMsg.innerHTML = `<span style='color:#0a7a2f'>${data.message || 'Đã unlock thành công.'}</span>`;
      } else {
        unlockMsg.innerHTML = `<span style='color:#b00020'>${data.error || 'Lỗi không xác định.'}</span>`;
      }
    } catch (e) {
      if (unlockMsg) unlockMsg.innerHTML = `<span style='color:#b00020'>Lỗi kết nối</span>`;
    }
    if (unlockBtn) unlockBtn.disabled = false;
  };
  unlockBox.style.display = '';
}
