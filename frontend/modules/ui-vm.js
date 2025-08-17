// ui-vm.js
let vmListData = [];
let vmSortField = null;
let vmSortAsc = true;
let vmFilters = {
  name: '',
  power_state: '',
  cpu_count: '',
  memory_mb: '',
  guest_os: '',
  ip_address: '',
  note: ''
};
let vmFilterTimers = {};
let vmPage = 1;
const VM_PAGE_SIZE = 50;

export function renderVmBox() {
  let vmBox = document.getElementById('vmBox');
  const homeBox = document.getElementById('homeBox');
  if (!vmBox) {
    vmBox = document.createElement('div');
    vmBox.id = 'vmBox';
    vmBox.style.width = '98vw';
    vmBox.style.maxWidth = 'none';
    vmBox.style.background = '#fff';
    vmBox.style.borderRadius = '10px';
    vmBox.style.boxShadow = '0 2px 12px #0002';
    vmBox.style.padding = '32px 24px';
    vmBox.style.display = 'none';
    vmBox.style.position = 'relative';
    vmBox.style.left = '50%';
    vmBox.style.transform = 'translateX(-50%)';
    vmBox.style.marginTop = '40px';
    vmBox.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:18px;">
        <h2 style="margin:0;font-size:1.3rem;">Danh sách VM</h2>
        <div style="display:flex;gap:10px;">
          <button id="btnLoadVmList" style="background:#2355d6;color:#fff;border:none;padding:8px 24px;font-size:1rem;border-radius:6px;">Tải danh sách VM</button>
          <button id="btnBackHomeVm" style="background:#fff;color:#2355d6;border:1px solid #2355d6;padding:8px 24px;font-size:1rem;border-radius:6px;box-shadow:0 1px 4px #0001;">🏠 Trang chủ</button>
        </div>
      </div>
      <div id="vmCount" style="margin-bottom:8px;font-size:0.97rem;color:#666;"></div>
      <div id="vmList"></div>
      <div id="vmPager" style="margin-top:18px;text-align:center;"></div>
    `;
    document.body.appendChild(vmBox);
  }
  const btnBack = document.getElementById('btnBackHomeVm');
  if (btnBack) btnBack.onclick = () => {
    vmBox.style.display = 'none';
    if (homeBox) homeBox.style.display = '';
  };
  const btnLoad = document.getElementById('btnLoadVmList');
  if (btnLoad) btnLoad.onclick = () => fetchVmList();

  document.getElementById('vmList').innerHTML = '';
  document.getElementById('vmCount').textContent = '';
  document.getElementById('vmPager').innerHTML = '';
  vmPage = 1;
  vmBox.style.display = '';
  if (homeBox) homeBox.style.display = 'none';
}

async function fetchVmList() {
  const el = document.getElementById('vmList');
  el.innerHTML = 'Đang tải dữ liệu VM...';
  try {
    const res = await fetch('/api/list-vms');
    const data = await res.json();
    if (!data.ok) {
      el.innerHTML = `<span style='color:#b00020'>Lỗi: ${data.error || 'Không lấy được dữ liệu.'}</span>`;
      return;
    }
    if (!data.vms || !data.vms.length) {
      el.textContent = 'Không có VM nào.';
      return;
    }
    vmListData = data.vms;
    vmSortField = null;
    vmSortAsc = true;
    vmFilters = { name:'', power_state:'', cpu_count:'', memory_mb:'', guest_os:'', ip_address:'', note:'' };
    vmPage = 1;
    renderVmTable();
  } catch (e) {
    el.innerHTML = `<span style='color:#b00020'>Lỗi kết nối</span>`;
  }
}

function renderVmTable() {
  const el = document.getElementById('vmList');
  const countEl = document.getElementById('vmCount');
  const pagerEl = document.getElementById('vmPager');
  if (!vmListData || !vmListData.length) {
    el.textContent = 'Không có VM nào.';
    countEl.textContent = '';
    if (pagerEl) pagerEl.innerHTML = '';
    return;
  }
  let filtered = vmListData.filter(vm => {
    return Object.keys(vmFilters).every(field => {
      const val = (vm[field] ?? '').toString().toLowerCase();
      const filter = (vmFilters[field] ?? '').toString().toLowerCase();
      return !filter || val.includes(filter);
    });
  });
  if (vmSortField) {
    filtered = filtered.slice().sort((a, b) => {
      let va = a[vmSortField], vb = b[vmSortField];
      if (vmSortField === 'cpu_count' || vmSortField === 'memory_mb') {
        va = Number(va) || 0;
        vb = Number(vb) || 0;
      } else {
        va = (va ?? '').toString().toLowerCase();
        vb = (vb ?? '').toString().toLowerCase();
      }
      if (va < vb) return vmSortAsc ? -1 : 1;
      if (va > vb) return vmSortAsc ? 1 : -1;
      return 0;
    });
  }
  countEl.textContent = `Hiển thị ${filtered.length}/${vmListData.length} VM`;

  const totalPages = Math.max(1, Math.ceil(filtered.length / VM_PAGE_SIZE));
  if (vmPage > totalPages) vmPage = totalPages;
  if (vmPage < 1) vmPage = 1;
  const startIdx = (vmPage - 1) * VM_PAGE_SIZE;
  const endIdx = startIdx + VM_PAGE_SIZE;
  const pageData = filtered.slice(startIdx, endIdx);

  el.innerHTML = `
    <style>
      .resizable-table {
        border: 1px solid #e3e8f0;
        border-radius: 8px;
        background: #fff;
        box-shadow: 0 1px 8px #0001;
        overflow-x: auto;
      }
      .resizable-table th, .resizable-table td {
        border-right: 1px solid #e3e8f0;
        border-bottom: 1px solid #e3e8f0;
        padding: 8px 10px;
        background: #fff;
        font-size: 1rem;
        text-align: left;
      }
      .resizable-table th {
        background: #f5f7fa;
        font-weight: 600;
        position: relative;
      }
      .resizable-table th:last-child, .resizable-table td:last-child {
        border-right: none;
      }
      .resizable-table tr:hover td {
        background: #f0f4ff;
      }
      .resizer {
        position: absolute;
        right: 0;
        top: 0;
        width: 6px;
        height: 100%;
        cursor: col-resize;
        user-select: none;
        z-index: 10;
      }
    </style>
    <table class="resizable-table" style="width:100%;border-collapse:collapse;table-layout:auto;">
      <thead>
        <tr>
          ${renderVmHeader('name', 'Tên')}
          ${renderVmHeader('power_state', 'Trạng thái')}
          ${renderVmHeader('cpu_count', 'CPU')}
          ${renderVmHeader('memory_mb', 'RAM (MB)')}
          ${renderVmHeader('guest_os', 'OS')}
          ${renderVmHeader('ip_address', 'IP')}
          ${renderVmHeader('note', 'Note')}
        </tr>
        <tr>
          ${renderVmFilter('name')}
          ${renderVmFilter('power_state')}
          ${renderVmFilter('cpu_count')}
          ${renderVmFilter('memory_mb')}
          ${renderVmFilter('guest_os')}
          ${renderVmFilter('ip_address')}
          ${renderVmFilter('note')}
        </tr>
      </thead>
      <tbody>
        ${pageData.map(vm => `
          <tr>
            <td>${vm.name}</td>
            <td style="color:${vm.power_state==='poweredOn'?'#0a7a2f':'#b00020'}">${vm.power_state}</td>
            <td>${vm.cpu_count}</td>
            <td>${vm.memory_mb}</td>
            <td>${vm.guest_os}</td>
            <td>${
              Array.isArray(vm.ip_address)
                ? vm.ip_address.join(', ')
                : (vm.ip_address || 'N/A')
            }</td>
            <td>${vm.note ? vm.note : ''}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;

  // Pager
  if (pagerEl) {
    let pagerHtml = '';
    if (totalPages > 1) {
      pagerHtml += `<button ${vmPage === 1 ? 'disabled' : ''} style="margin:0 4px;" id="vmPagePrev">&lt;</button>`;
      let pages = [];
      if (totalPages <= 7) {
        for (let i = 1; i <= totalPages; i++) pages.push(i);
      } else {
        if (vmPage <= 4) {
          pages = [1,2,3,4,5,'...',totalPages];
        } else if (vmPage >= totalPages - 3) {
          pages = [1,'...',totalPages-4,totalPages-3,totalPages-2,totalPages-1,totalPages];
        } else {
          pages = [1,'...',vmPage-1,vmPage,vmPage+1,'...',totalPages];
        }
      }
      pages.forEach(p => {
        if (p === '...') {
          pagerHtml += `<span style="margin:0 4px;">...</span>`;
        } else {
          pagerHtml += `<button ${p === vmPage ? 'disabled' : ''} style="margin:0 2px;" class="vmPageBtn" data-page="${p}">${p}</button>`;
        }
      });
      pagerHtml += `<button ${vmPage === totalPages ? 'disabled' : ''} style="margin:0 4px;" id="vmPageNext">&gt;</button>`;
    }
    pagerEl.innerHTML = pagerHtml;

    pagerEl.querySelectorAll('.vmPageBtn').forEach(btn => {
      btn.onclick = () => {
        vmPage = parseInt(btn.getAttribute('data-page'), 10);
        renderVmTable();
      };
    });
    const btnPrev = pagerEl.querySelector('#vmPagePrev');
    if (btnPrev) btnPrev.onclick = () => {
      if (vmPage > 1) {
        vmPage--;
        renderVmTable();
      }
    };
    const btnNext = pagerEl.querySelector('#vmPageNext');
    if (btnNext) btnNext.onclick = () => {
      if (vmPage < totalPages) {
        vmPage++;
        renderVmTable();
      }
    };
  }

  // Column resizing
  const table = el.querySelector('table');
  const ths = table.querySelectorAll('th');
  ths.forEach((th, idx) => {
    if (!th.querySelector('.resizer')) {
      const resizer = document.createElement('div');
      resizer.className = 'resizer';
      th.appendChild(resizer);

      let startX, startWidth;
      resizer.addEventListener('mousedown', function(e) {
        startX = e.pageX;
        startWidth = th.offsetWidth;
        document.body.style.cursor = 'col-resize';

        function onMouseMove(ev) {
          const newWidth = Math.max(50, startWidth + (ev.pageX - startX));
          th.style.width = newWidth + 'px';
          th.style.minWidth = newWidth + 'px';
          th.style.maxWidth = newWidth + 'px';
          Array.from(table.rows).forEach(row => {
            if (row.cells[idx]) {
              row.cells[idx].style.width = newWidth + 'px';
              row.cells[idx].style.minWidth = newWidth + 'px';
              row.cells[idx].style.maxWidth = newWidth + 'px';
            }
          });
        }
        function onMouseUp() {
          document.body.style.cursor = '';
          document.removeEventListener('mousemove', onMouseMove);
          document.removeEventListener('mouseup', onMouseUp);
        }
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
      });
    }
  });

  // Filters & sorting
  Object.keys(vmFilters).forEach(field => {
    const inp = document.getElementById('vmFilter_' + field);
    if (inp) {
      inp.oninput = () => {
        clearTimeout(vmFilterTimers[field]);
        vmFilterTimers[field] = setTimeout(() => {
          vmFilters[field] = inp.value;
          vmPage = 1;
          renderVmTable();
        }, 1000);
      };
    }
    const btnAsc = document.getElementById('vmSortAsc_' + field);
    const btnDesc = document.getElementById('vmSortDesc_' + field);
    if (btnAsc) {
      btnAsc.onclick = () => {
        vmSortField = field;
        vmSortAsc = true;
        vmPage = 1;
        renderVmTable();
      };
    }
    if (btnDesc) {
      btnDesc.onclick = () => {
        vmSortField = field;
        vmSortAsc = false;
        vmPage = 1;
        renderVmTable();
      };
    }
  });
}

function renderVmHeader(field, label) {
  const isSorted = vmSortField === field;
  return `
    <th style="vertical-align:middle;">
      <span style="font-weight:600;">${label}</span>
      <span style="display:inline-flex;align-items:center;gap:2px;">
        <button id="vmSortAsc_${field}" title="Tăng" style="
          border:none;background:none;cursor:pointer;padding:0 2px;
          font-size:1em;outline:none;
          opacity:${isSorted && vmSortAsc ? 1 : 0.5};
        ">
          <svg width="16" height="16" style="vertical-align:middle;" viewBox="0 0 16 16">
            <polygon points="8,4 12,10 4,10" />
          </svg>
        </button>
        <button id="vmSortDesc_${field}" title="Giảm" style="
          border:none;background:none;cursor:pointer;padding:0 2px;
          font-size:1em;outline:none;
          opacity:${isSorted && !vmSortAsc ? 1 : 0.5};
        ">
          <svg width="16" height="16" style="vertical-align:middle;" viewBox="0 0 16 16">
            <polygon points="4,6 12,6 8,12" />
          </svg>
        </button>
      </span>
    </th>
  `;
}

function renderVmFilter(field) {
  return `
    <th>
      <input id="vmFilter_${field}" type="text" value="${vmFilters[field] ?? ''}" placeholder="Lọc..." style="width:98%;padding:2px 6px;font-size:0.97em;border-radius:4px;border:1px solid #ccc;">
    </th>
  `;
}
