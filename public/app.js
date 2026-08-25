// State Management
let currentAccountsData = [];
let currentGroupsData = { accounts: [] };

// Toast Notification
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}</span> <div>${message}</div>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// Tab Switching
function switchTab(tabId) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

  const btn = document.querySelector(`.tab-btn[data-tab="${tabId}"]`);
  const content = document.getElementById(`tab-${tabId}`);
  if (btn) btn.classList.add('active');
  if (content) content.classList.add('active');

  if (tabId === 'accounts') loadAccounts();
  if (tabId === 'groups') loadGroups();
}

document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => switchTab(btn.dataset.tab));
});

// Modal Management
function openModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add('active');
}
function closeModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove('active');
}

// ==================== 1. STATUS & SERVERS ====================

async function loadStatus() {
  try {
    const res = await fetch('/api/status');
    const data = await res.json();
    if (!data.ok) return;

    // Cập nhật badge server
    updateBadge('status-srv-3001', data.servers.fanpageGpt.active, 'Cổng 3001');
    updateBadge('status-srv-3002', data.servers.fbGroups.active, 'Cổng 3002');
    updateBadge('status-srv-3003', data.servers.fbPersonal.active, 'Cổng 3003');

    const gptActiveCount = (data.chromeGpt.acc1.active ? 1 : 0) + (data.chromeGpt.acc2.active ? 1 : 0);
    const gptBadge = document.getElementById('status-gpt');
    if (gptBadge) {
      gptBadge.className = `badge ${gptActiveCount > 0 ? 'badge-success' : 'badge-danger'}`;
      gptBadge.innerHTML = `<span class="dot ${gptActiveCount > 0 ? 'pulse' : ''}"></span> ${gptActiveCount}/2 Acc Sẵn sàng`;
    }
  } catch (err) {
    console.error('Lỗi load status:', err);
  }
}

function updateBadge(id, isActive, portText) {
  const el = document.getElementById(id);
  if (!el) return;
  el.className = `badge ${isActive ? 'badge-success' : 'badge-danger'}`;
  el.innerHTML = `<span class="dot ${isActive ? 'pulse' : ''}"></span> ${isActive ? 'Đang chạy' : 'Chưa bật'} (${portText})`;
}

document.getElementById('btn-refresh-status')?.addEventListener('click', () => {
  loadStatus();
  showToast('Đã làm mới trạng thái hệ thống!', 'info');
});

document.getElementById('btn-restart-servers')?.addEventListener('click', async () => {
  if (!confirm('Bạn có chắc chắn muốn khởi động lại toàn bộ 3 Server Bridge (3001, 3002, 3003)?')) return;
  try {
    showToast('Đang gửi lệnh khởi động lại servers...', 'info');
    const res = await fetch('/api/servers/restart', { method: 'POST' });
    const data = await res.json();
    showToast(data.message || 'Servers đang khởi động lại!', 'success');
    setTimeout(loadStatus, 4000);
  } catch (err) {
    showToast('Lỗi khi gửi lệnh restart: ' + err.message, 'error');
  }
});

// ==================== 2. QUẢN LÝ TÀI KHOẢN ====================

async function loadAccounts() {
  const container = document.getElementById('accounts-container');
  if (!container) return;
  container.innerHTML = '<div style="text-align:center; padding:2rem; color:var(--text-muted);">Đang tải danh sách tài khoản...</div>';

  try {
    const res = await fetch('/api/accounts');
    const data = await res.json();
    currentAccountsData = data.accounts || [];

    const totalAccs = currentAccountsData.reduce((sum, cat) => sum + (cat.items?.length || 0), 0);
    const statAccEl = document.getElementById('stat-total-accounts');
    if (statAccEl) statAccEl.textContent = totalAccs;

    container.innerHTML = data.accounts.map(cat => `
      <div class="card">
        <div class="card-header">
          <span class="card-title">${cat.categoryName}</span>
          <span class="badge badge-info">${cat.items.length} Tài khoản</span>
        </div>
        <div class="grid-3">
          ${cat.items.map(acc => `
            <div class="card account-card" style="background: rgba(255,255,255,0.02);">
              <div class="account-info">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 6px;">
                  <h4>${acc.name}</h4>
                  <span class="badge ${acc.isReady ? 'badge-success' : 'badge-danger'}">
                    <span class="dot ${acc.isReady ? 'pulse' : ''}"></span> ${acc.isReady ? 'Port ' + acc.port + ' Online' : 'Chưa bật'}
                  </span>
                </div>
                <p>${acc.desc || ''}</p>
                <div class="account-meta">
                  <span class="account-tag">Port: <b>${acc.port}</b></span>
                  <span class="account-tag">Profile: <b>${acc.profileDir}</b></span>
                  ${acc.groupCount !== undefined ? `<span class="account-tag" style="background:rgba(59,130,246,0.15); color:#93c5fd;">📁 <b>${acc.groupCount}</b> nhóm</span>` : ''}
                </div>
              </div>
              <div>
                <button class="btn btn-primary btn-block btn-sm" onclick="openChrome('${acc.profileDir}', ${acc.port}, '${acc.url || 'https://www.facebook.com/'}')">
                  🌐 Mở Chrome Đăng nhập
                </button>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `).join('');
  } catch (err) {
    container.innerHTML = `<div class="badge badge-danger">Lỗi: ${err.message}</div>`;
  }
}

async function openChrome(profileDir, port, url) {
  showToast(`Đang mở Chrome (Profile: ${profileDir}, Port: ${port})...`, 'info');
  try {
    const res = await fetch('/api/accounts/open-chrome', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profileDir, port, url }),
    });
    const data = await res.json();
    if (data.ok) {
      showToast(data.message, 'success');
      setTimeout(() => { loadStatus(); if (document.getElementById('tab-accounts').classList.contains('active')) loadAccounts(); }, 5000);
    } else {
      showToast(data.error || 'Không mở được Chrome', 'error');
    }
  } catch (err) {
    showToast('Lỗi kết nối: ' + err.message, 'error');
  }
}

// ==================== 3. QUẢN LÝ LINK NHÓM ====================

async function loadGroups() {
  try {
    const res = await fetch('/api/groups');
    const data = await res.json();
    if (!data.ok) return;
    currentGroupsData = data.data;

    // Cập nhật thống kê tổng nhóm
    const totalGroups = (currentGroupsData.accounts || []).reduce((sum, a) => sum + (a.groupUrls?.length || 0), 0);
    const statEl = document.getElementById('stat-total-groups');
    if (statEl) statEl.textContent = totalGroups;

    // Populate dropdown tài khoản
    const select = document.getElementById('group-account-select');
    const modalAddSelect = document.getElementById('modal-add-group-acc');
    const modalBulkSelect = document.getElementById('modal-bulk-acc');

    if (select) {
      const currentVal = select.value;
      const optionsHtml = currentGroupsData.accounts.map(a => `
        <option value="${a.id}">${a.name} (${a.groupUrls?.length || 0} nhóm)</option>
      `).join('');

      select.innerHTML = optionsHtml;
      if (modalAddSelect) modalAddSelect.innerHTML = optionsHtml;
      if (modalBulkSelect) modalBulkSelect.innerHTML = optionsHtml;

      if (currentVal && currentGroupsData.accounts.some(a => a.id === currentVal)) {
        select.value = currentVal;
      }
    }

    renderGroupList();
  } catch (err) {
    showToast('Lỗi tải danh sách nhóm: ' + err.message, 'error');
  }
}

function renderGroupList() {
  const select = document.getElementById('group-account-select');
  const searchInput = document.getElementById('group-search');
  const tbody = document.getElementById('group-table-body');
  if (!select || !tbody) return;

  const accountId = select.value;
  const searchTerm = (searchInput?.value || '').toLowerCase().trim();
  const acc = currentGroupsData.accounts.find(a => a.id === accountId);

  if (!acc || !acc.groupUrls || acc.groupUrls.length === 0) {
    tbody.innerHTML = `<tr><td colspan="3" style="text-align:center; padding:2rem; color:var(--text-muted);">Chưa có link nhóm nào trong tài khoản này. Bấm "Thêm link nhóm" để thêm.</td></tr>`;
    return;
  }

  let filtered = acc.groupUrls;
  if (searchTerm) {
    filtered = filtered.filter(u => u.toLowerCase().includes(searchTerm));
  }

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="3" style="text-align:center; padding:2rem; color:var(--text-muted);">Không tìm thấy nhóm phù hợp với từ khóa "${searchTerm}".</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map((url, idx) => `
    <tr>
      <td style="color:var(--text-muted);">${idx + 1}</td>
      <td>
        <a href="${url}" target="_blank" style="color:#60a5fa; text-decoration:none; word-break:break-all;">
          🔗 ${url}
        </a>
      </td>
      <td style="text-align:center;">
        <button class="btn btn-danger btn-sm" onclick="removeGroup('${accountId}', '${url}')" title="Xóa nhóm này">
          🗑️ Xóa
        </button>
      </td>
    </tr>
  `).join('');
}

function openAddGroupModal() {
  const select = document.getElementById('group-account-select');
  const modalSelect = document.getElementById('modal-add-group-acc');
  if (select && modalSelect) modalSelect.value = select.value;
  document.getElementById('modal-add-group-url').value = '';
  openModal('modal-add-group');
}

async function handleAddGroupSubmit(e) {
  e.preventDefault();
  const accountId = document.getElementById('modal-add-group-acc').value;
  const groupUrl = document.getElementById('modal-add-group-url').value.trim();

  try {
    const res = await fetch('/api/groups/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accountId, groupUrl }),
    });
    const data = await res.json();
    if (data.ok) {
      showToast(data.message, 'success');
      closeModal('modal-add-group');
      loadGroups();
    } else {
      showToast(data.error || 'Lỗi thêm nhóm', 'error');
    }
  } catch (err) {
    showToast('Lỗi: ' + err.message, 'error');
  }
}

async function removeGroup(accountId, groupUrl) {
  if (!confirm(`Bạn có chắc chắn muốn xóa nhóm:\n${groupUrl}?`)) return;

  try {
    const res = await fetch('/api/groups/remove', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accountId, groupUrl }),
    });
    const data = await res.json();
    if (data.ok) {
      showToast(data.message, 'success');
      loadGroups();
    }
  } catch (err) {
    showToast('Lỗi: ' + err.message, 'error');
  }
}

function openBulkImportModal() {
  const select = document.getElementById('group-account-select');
  const modalSelect = document.getElementById('modal-bulk-acc');
  if (select && modalSelect) modalSelect.value = select.value;
  document.getElementById('modal-bulk-text').value = '';
  openModal('modal-bulk-import');
}

async function handleBulkImportSubmit(e) {
  e.preventDefault();
  const accountId = document.getElementById('modal-bulk-acc').value;
  const mode = document.getElementById('modal-bulk-mode').value;
  const groupUrlsText = document.getElementById('modal-bulk-text').value;

  try {
    const res = await fetch('/api/groups/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accountId, groupUrlsText, mode }),
    });
    const data = await res.json();
    if (data.ok) {
      showToast(data.message, 'success');
      closeModal('modal-bulk-import');
      loadGroups();
    } else {
      showToast(data.error || 'Lỗi import', 'error');
    }
  } catch (err) {
    showToast('Lỗi: ' + err.message, 'error');
  }
}



function onChannelChange() {
  // Option updates if needed
}

async function handleQuickPost(e) {
  e.preventDefault();
  const channel = document.getElementById('qp-channel').value;
  const caption = document.getElementById('qp-caption').value.trim();
  const prompt = document.getElementById('qp-prompt').value.trim();
  const aspectRatio = document.getElementById('qp-aspect').value;
  const hasDu = document.getElementById('qp-has-du').value === 'true';

  const btn = document.getElementById('btn-submit-quick-post');
  const resultDiv = document.getElementById('quick-post-result');

  btn.disabled = true;
  btn.innerHTML = '⏳ Đang tạo ảnh ChatGPT & Đăng bài (Khoảng 1 - 2 phút)...';
  resultDiv.style.display = 'block';
  resultDiv.innerHTML = `<div class="badge badge-info" style="padding:12px; width:100%;"><span class="dot pulse"></span> Đang gửi lệnh tới Bridge Server... Vui lòng không đóng trang.</div>`;

  try {
    // 1. Tạo ảnh ChatGPT trước
    let port = channel === 'personal' ? 3003 : 3001;
    showToast('Đang yêu cầu ChatGPT tạo ảnh...', 'info');

    const genRes = await fetch(`http://127.0.0.1:${port}/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'generate_chatgpt_image',
        prompt: prompt || 'Professional modern marketing visual for Vietnamese technology company',
        aspectRatio: aspectRatio || '4:5',
        referenceImageUrl: hasDu ? 'https://res.cloudinary.com/dbwahdjzg/image/upload/v1786351452/4022ffed-ef18-4faf-bf7e-156716aa5d4e.png' : null,
      }),
    });

    const genData = await genRes.json();
    if (!genData.imageBase64) throw new Error(genData.error || 'Không tạo được ảnh từ ChatGPT');

    showToast('ChatGPT đã tạo ảnh xong! Đang xuất bản lên Facebook...', 'success');

    // 2. Xuất bản lên Facebook
    let pubRes;
    if (channel === 'fanpage') {
      pubRes = await fetch('http://127.0.0.1:3001/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'publish_facebook_page',
          caption,
          imageBase64: genData.imageBase64,
        }),
      });
    } else if (channel === 'groups') {
      pubRes = await fetch('http://127.0.0.1:3002/post-groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caption,
          imageBase64: genData.imageBase64,
        }),
      });
    } else {
      pubRes = await fetch('http://127.0.0.1:3003/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'publish_facebook_personal',
          caption,
          imageBase64: genData.imageBase64,
        }),
      });
    }

    const pubData = await pubRes.json();
    if (pubData.ok) {
      resultDiv.innerHTML = `
        <div class="card" style="border-color:var(--success); background:rgba(16,185,129,0.08);">
          <h4 style="color:#34d399; margin-bottom:8px;">🎉 Đăng bài thành công!</h4>
          <p style="font-size:0.9rem; color:#e2e8f0;">Bài viết và ảnh ChatGPT vừa tạo đã được xuất bản lên Facebook.</p>
          <div style="margin-top:12px;">
            <img src="data:image/png;base64,${genData.imageBase64}" style="max-height:220px; border-radius:8px; border:1px solid rgba(255,255,255,0.1);" />
          </div>
        </div>
      `;
      showToast('Đăng bài thành công lên Facebook!', 'success');
    } else {
      throw new Error(pubData.error || 'Lỗi khi đăng bài');
    }
  } catch (err) {
    resultDiv.innerHTML = `
      <div class="card" style="border-color:var(--danger); background:rgba(239,68,68,0.08);">
        <h4 style="color:#f87171; margin-bottom:8px;">❌ Đăng bài thất bại</h4>
        <p style="font-size:0.9rem; color:#fca5a5;">${err.message}</p>
      </div>
    `;
    showToast('Lỗi: ' + err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '🚀 Bắt đầu Tạo ảnh ChatGPT & Đăng bài ngay';
  }
}

// Initial Load
document.addEventListener('DOMContentLoaded', () => {
  loadStatus();
  loadGroups();
  loadAccounts();
  setInterval(loadStatus, 15000); // Polling status every 15s
});
