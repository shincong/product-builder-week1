/* ====================================================
   민컴퍼니 워크스페이스 v2 — 메인 스크립트
   1단계: 데이터 스키마 + localStorage + 라우팅 + 다크모드
   2단계: 카테고리/담당자/설정 + 모달 + 드래그
   T4a:   작업 보드 (빈 상태 + 그룹 그리드 + 카드 + 데모)
   T4b:   workType 색상 체계 + 내 대시보드 + 투두
   ==================================================== */

'use strict';

const STORAGE_KEY = 'mincompany-workspace-v2';
const APP_VERSION = '2.0.0';

/* ----- 작업 종류 (workType) — 카드 색상 결정 ----- */
const WORK_TYPES = {
  blog:     { id: 'blog',     name: '블로그',    color: '#16a34a', icon: '🟢', desc: '블로그 글 작성/배포' },
  cafe:     { id: 'cafe',     name: '카페',      color: '#ea580c', icon: '🟠', desc: '카페 글 작성/배포' },
  exposure: { id: 'exposure', name: '노출 작업', color: '#dc2626', icon: '🔴', desc: '카페침투, 상위노출, 노출 체크' },
  external: { id: 'external', name: '외부 인력', color: '#ca8a04', icon: '🟡', desc: '기자단, 인플루언서, 리더블비' },
  ad:       { id: 'ad',       name: '광고',      color: '#7c3aed', icon: '🟣', desc: '검색광고, 체험단' },
  internal: { id: 'internal', name: '내부 업무', color: '#0891b2', icon: '🩵', desc: '제안서, 계약서, 견적서' },
  etc:      { id: 'etc',      name: '기타',      color: '#64748b', icon: '⚫', desc: '기타' },
};

/* ----- 진행 건 유형 (생성 시 진입 메뉴) ----- */
const PROJECT_TYPES = {
  routine: { id: 'routine', name: '루틴형',         icon: '🔁' },
  package: { id: 'package', name: '패키지형',       icon: '📦' },
  oneoff:  { id: 'oneoff',  name: '단발형',         icon: '📌' },
  guide:   { id: 'guide',   name: '건바이 빠른입력', icon: '⚡' },
};

/* ----- 정산 분류 (=카테고리) ----- */
const DEFAULT_CATEGORIES = [
  { id: 'cat_guide',   name: '건바이', color: '#3b82f6', icon: '📝', desc: '블로그/카페 정산 (건바이)',     defaultType: 'guide',   defaultWorkflowId: null },
  { id: 'cat_cafe',    name: '카페',   color: '#ea580c', icon: '☕', desc: '카페 정산',                    defaultType: 'package', defaultWorkflowId: 'wf_cafe' },
  { id: 'cat_package', name: '패키지', color: '#8b5cf6', icon: '📦', desc: '패키지 단위 정산',              defaultType: 'package', defaultWorkflowId: 'wf_choibul' },
  { id: 'cat_work',    name: '업무',   color: '#06b6d4', icon: '💼', desc: '내부 업무 (제안/계약)',         defaultType: 'oneoff',  defaultWorkflowId: 'wf_proposal' },
  { id: 'cat_monthly', name: '월모장', color: '#a855f7', icon: '🔁', desc: '월간 모니터링 장기 계약',       defaultType: 'routine', defaultWorkflowId: 'wf_monthly' },
  { id: 'cat_etc',     name: '기타',   color: '#94a3b8', icon: '🗂', desc: '기타 정산',                     defaultType: null,      defaultWorkflowId: null },
];

const COLOR_MIGRATION_MAP = {
  cat_cafe: { from: '#f97316', to: '#ea580c' },
  cat_etc:  { from: '#64748b', to: '#94a3b8' },
};

/* categoryId → workType 자동 추론 (기존 진행 건 마이그레이션) */
const CATEGORY_TO_WORKTYPE = {
  cat_guide:   'blog',
  cat_cafe:    'exposure',
  cat_package: 'ad',
  cat_work:    'internal',
  cat_monthly: 'blog',
  cat_etc:     'etc',
};

const DEFAULT_WORKFLOWS = [
  { id: 'wf_cafe', name: '카페침투', type: 'package',
    steps: ['상담', '결제 확인', '침투 가이드 작성', '시트 기입', '업체 원고 작성 요청', '광고주 컨펌 요청', '진행'] },
  { id: 'wf_choibul', name: '최블배포 / 패키지', type: 'package',
    steps: ['상담', '제안서 발송', '견적서 발송 / 입금 확인 / 계산서 전달', '일정 가이드 작성', '가이드 폼 전달 (시트)',
            '가이드대로 원고 작성', '광고주 컨펌 요청', '시트 배정 (발행 일정대로)', '수정 / 발행 GO', '블로거 원고 전달'] },
  { id: 'wf_monthly', name: '월모장', type: 'routine',
    steps: ['상담', '노출/25일 결정 (견적서 여부)', '가이드 작성', '작성', '시트 기입 (노출 체크)', '노출 현황 확인 (월말)'] },
  { id: 'wf_voyage', name: '항해', type: 'oneoff',
    steps: ['요청 접수', '견적서 + 접수 완료', '결재 (정총)', '원고 작성', '컨펌 요청', '발행 배정', '발행', '월말 입금 요청'] },
  { id: 'wf_proposal', name: '제안서/계약서 처리', type: 'oneoff',
    steps: ['클라이언트 정보 정리', '제안서 초안 작성', '검토/수정', '제안서 발송', '계약 협의', '계약서/견적서 작성', '계약 완료'] },
  { id: 'wf_blank', name: '빈 워크플로우', type: null, steps: [] },
];

const STATUS_COLUMNS = [
  { id: 'todo',     name: '시작 전',  color: '#94a3b8' },
  { id: 'doing',    name: '진행 중',  color: '#3b82f6' },
  { id: 'done',     name: '완료',     color: '#10b981' },
  { id: 'archived', name: '보관',     color: '#475569' },
];
const GROUP_MODES = {
  client:   { id: 'client',   name: '클라이언트별' },
  category: { id: 'category', name: '정산 분류별' },
  workType: { id: 'workType', name: '작업 종류별' },
  dueDate:  { id: 'dueDate',  name: '마감일별' },
  assignee: { id: 'assignee', name: '담당자별' },
};

const TODO_GROUPS = [
  { id: 'today',    name: '오늘 할 일', icon: '📅' },
  { id: 'thisWeek', name: '이번 주',    icon: '📆' },
  { id: 'doing',    name: '진행 중',    icon: '⏳' },
  { id: 'later',    name: '나중에',     icon: '🗓' },
];

const COLOR_PALETTE = [
  '#3b82f6', '#ea580c', '#8b5cf6', '#06b6d4', '#10b981', '#ef4444',
  '#ec4899', '#a855f7', '#f59e0b', '#14b8a6', '#6366f1', '#94a3b8',
];
const ICON_PALETTE = ['🗂','📝','☕','📦','💼','📌','🎯','🚀','⚡','🔁','📤','✍','👁','💡','🎨','🛠','📊','🌟','🔔','📅','🏢','✨','📈','🔥','💎','🎁','📱','💬','🏷','🏆'];

const SOON_MESSAGES = {
  default: '이 기능은 준비 중입니다 (곧 추가될 예정)',
  list:    '리스트 뷰는 준비 중입니다 (5단계에서 추가)',
  calendar:'캘린더 뷰는 준비 중입니다 (6단계에서 추가)',
  create:  '진행 건 생성 모달은 준비 중입니다 (다음 단계에서 추가)',
};

/* ============ 전역 상태 ============ */
let state = {
  version: 2,
  settings: {
    theme: 'light', currentView: 'kanban', groupBy: 'client',
    showStarredOnTop: true, starredOnly: false, sortBy: 'dueAsc', boardSearch: '',
    collapsedGroups: {}, currentMemberId: null, myDashboard: false,
    filters: { categoryId: '', assigneeId: '', clientId: '', type: '', search: '' },
    notifyAsked: false, calendarMode: 'month',
  },
  categories: [], workflows: [], members: [], clients: [], projects: [], todos: [],
};

function uid(prefix = '') { return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }
function $(sel, root = document) { return root.querySelector(sel); }
function $$(sel, root = document) { return [...root.querySelectorAll(sel)]; }
function escapeHtml(str) { if (str == null) return ''; return String(str).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function getInitial(name) { return !name ? '?' : name.trim().charAt(0).toUpperCase(); }

/* ============ 마감일 헬퍼 ============ */
function getNextDeadline(project) {
  if (project.isSplit && Array.isArray(project.slots) && project.slots.length > 0) {
    const sorted = project.slots.filter(s => s.deployAt).sort((a, b) => new Date(a.deployAt) - new Date(b.deployAt));
    if (sorted.length === 0) return { type: null, at: null };
    const next = sorted[0];
    return next.draftDueAt ? { type: 'draft', at: next.draftDueAt } : { type: 'deploy', at: next.deployAt };
  }
  if (project.draftDueAt) return { type: 'draft', at: project.draftDueAt };
  if (project.deployAt) return { type: 'deploy', at: project.deployAt };
  return { type: null, at: null };
}
function minutesUntil(iso) { if (!iso) return null; const t = new Date(iso).getTime(); return isNaN(t) ? null : Math.round((t - Date.now()) / 60000); }
function isOverdue(project) {
  if (project.status === 'done' || project.status === 'archived') return false;
  const { at } = getNextDeadline(project);
  if (!at) return false;
  const m = minutesUntil(at);
  return m !== null && m < 0;
}
function isDeadlineSoon(project) {
  if (project.status === 'done' || project.status === 'archived') return false;
  const { at } = getNextDeadline(project);
  if (!at) return false;
  const m = minutesUntil(at);
  return m !== null && m >= 0 && m <= 60 * 24;
}
function formatDDay(iso, status) {
  if (!iso) return { text: '마감 미정', cls: 'none' };
  const m = minutesUntil(iso);
  const days = Math.ceil(m / (60 * 24));
  const isDoneOrArchived = status === 'done' || status === 'archived';
  if (m < 0 && !isDoneOrArchived) {
    const overDays = Math.abs(Math.floor(m / (60 * 24)));
    return { text: `D+${overDays} (지연)`, cls: 'danger' };
  }
  if (days < 0) return { text: '종료', cls: 'normal' };
  if (days === 0) {
    const hours = Math.max(1, Math.floor(m / 60));
    if (m <= 60) return { text: `D-Day (${m}분)`, cls: 'danger' };
    return { text: `오늘 (${hours}h)`, cls: 'warn' };
  }
  if (days === 1) return { text: 'D-1 (내일)', cls: 'warn' };
  return { text: `D-${days}`, cls: 'normal' };
}

/* ============ 마이그레이션 ============ */
function migrateColors() {
  let changed = false;
  state.categories.forEach(c => {
    const m = COLOR_MIGRATION_MAP[c.id];
    if (m && c.color === m.from) { c.color = m.to; changed = true; }
  });
  return changed;
}
function migrateAddMonthlyCategory() {
  if (!state.categories.find(c => c.id === 'cat_monthly')) {
    const def = DEFAULT_CATEGORIES.find(c => c.id === 'cat_monthly');
    // 기타 앞에 삽입
    const etcIdx = state.categories.findIndex(c => c.id === 'cat_etc');
    if (etcIdx >= 0) state.categories.splice(etcIdx, 0, { ...def });
    else state.categories.push({ ...def });
    return true;
  }
  return false;
}
function migrateWorkType() {
  let changed = false;
  state.projects.forEach(p => {
    if (!p.workType) {
      p.workType = CATEGORY_TO_WORKTYPE[p.categoryId] || 'etc';
      changed = true;
    }
  });
  return changed;
}
function migrateDemoData() {
  // 기존 데모 데이터의 workType / categoryId 강제 매핑
  const map = {
    'prj_demo_1': { workType: 'exposure', categoryId: 'cat_cafe' },
    'prj_demo_2': { workType: 'blog',     categoryId: 'cat_monthly' },
    'prj_demo_3': { workType: 'internal', categoryId: 'cat_work' },
    'prj_demo_4': { workType: 'external', categoryId: 'cat_guide' },
  };
  let changed = false;
  state.projects.forEach(p => {
    if (p.isDemo && map[p.id]) {
      const m = map[p.id];
      if (p.workType !== m.workType) { p.workType = m.workType; changed = true; }
      if (p.categoryId !== m.categoryId) { p.categoryId = m.categoryId; changed = true; }
    }
  });
  return changed;
}

/* ============ localStorage ============ */
function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      state = { ...state, ...parsed, settings: { ...state.settings, ...(parsed.settings || {}) } };
      if (!Array.isArray(state.categories) || state.categories.length === 0) state.categories = [...DEFAULT_CATEGORIES];
      if (!Array.isArray(state.workflows) || state.workflows.length === 0) state.workflows = [...DEFAULT_WORKFLOWS];
      if (!Array.isArray(state.members)) state.members = [];
      if (!Array.isArray(state.clients)) state.clients = [];
      if (!Array.isArray(state.projects)) state.projects = [];
      if (!Array.isArray(state.todos)) state.todos = [];
      let dirty = false;
      if (migrateColors()) dirty = true;
      if (migrateAddMonthlyCategory()) dirty = true;
      if (migrateWorkType()) dirty = true;
      if (migrateDemoData()) dirty = true;
      if (dirty) saveState();
    } else {
      seedInitialData();
    }
  } catch (e) {
    console.error('상태 로드 실패:', e); seedInitialData();
  }
}
function seedInitialData() {
  state.categories = [...DEFAULT_CATEGORIES];
  state.workflows = [...DEFAULT_WORKFLOWS];
  state.members = [{ id: 'mem_shinyoung', name: '박신영', initial: '신', color: '#a855f7' }];
  state.clients = [];
  state.projects = [];
  state.todos = [];
}
function saveState() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
  catch (e) { console.error('저장 실패:', e); showToast('저장 실패', 'danger'); }
}

/* ============ 라우팅 ============ */
const PAGE_META = {
  board:      { title: '작업 보드', sub: '' },
  my:         { title: '내 대시보드', sub: '' },
  clients:    { title: '클라이언트 관리', sub: 'Phase 2' },
  templates:  { title: '템플릿', sub: 'Phase 4' },
  categories: { title: '정산 분류 관리', sub: '' },
  members:    { title: '담당자 관리', sub: '' },
  settings:   { title: '설정', sub: '' },
};
function navigate(route) {
  $$('.menu-item').forEach(el => el.classList.toggle('active', el.dataset.route === route));
  $$('.route-page').forEach(el => el.classList.toggle('hidden', el.dataset.page !== route));
  const meta = PAGE_META[route] || { title: route, sub: '' };
  $('#page-title').textContent = meta.title;
  $('#page-sub').textContent = meta.sub;

  // 상단 우측 "+ 새 진행 건" 버튼은 작업 보드에서만 표시
  $('#topbar-create-btn').classList.toggle('hidden', route !== 'board');

  if (route === 'board')      renderBoardPage();
  if (route === 'my')         renderMyDashboard();
  if (route === 'categories') renderCategoriesPage();
  if (route === 'members')    renderMembersPage();
  if (route === 'settings')   renderSettingsPage();

  if (window.innerWidth <= 1024) closeSidebar();
}

/* ============ 다크모드 ============ */
function applyTheme() {
  document.documentElement.dataset.theme = state.settings.theme;
  $('#theme-icon').textContent = state.settings.theme === 'dark' ? '☀' : '🌙';
  $('#theme-label').textContent = state.settings.theme === 'dark' ? '라이트모드' : '다크모드';
}
function toggleTheme() {
  state.settings.theme = state.settings.theme === 'dark' ? 'light' : 'dark';
  saveState(); applyTheme();
  showToast(state.settings.theme === 'dark' ? '다크모드로 전환' : '라이트모드로 전환');
}

/* ============ 사이드바 렌더링 ============ */
function renderStats() {
  $('#stat-total').textContent = state.projects.filter(p => p.status !== 'archived').length;
  $('#stat-doing').textContent = state.projects.filter(p => p.status === 'doing').length;
  $('#stat-overdue').textContent = state.projects.filter(isOverdue).length;
}
function renderUserSelector() {
  const sel = $('#current-user-select');
  sel.innerHTML = '<option value="">사용자 선택...</option>'
    + state.members.map(m => `<option value="${m.id}">${escapeHtml(m.name)}</option>`).join('');
  sel.value = state.settings.currentMemberId || '';

  const avatar = $('#user-avatar');
  if (state.settings.currentMemberId) {
    const me = state.members.find(m => m.id === state.settings.currentMemberId);
    if (me) {
      avatar.textContent = me.initial || getInitial(me.name);
      avatar.style.background = `linear-gradient(135deg, ${me.color}, color-mix(in srgb, ${me.color} 70%, #ec4899))`;
      avatar.classList.remove('empty');
    } else { avatar.textContent = '?'; avatar.classList.add('empty'); avatar.style.background = ''; }
  } else { avatar.textContent = '?'; avatar.classList.add('empty'); avatar.style.background = ''; }

  const btn = $('#my-dashboard-toggle');
  btn.disabled = !state.settings.currentMemberId;
  btn.classList.toggle('active', !!state.settings.myDashboard && !!state.settings.currentMemberId);
  btn.title = state.settings.currentMemberId
    ? (state.settings.myDashboard ? '내 대시보드 OFF' : '내 대시보드 ON')
    : '먼저 사용자를 선택해 주세요';
}
function renderClientFilter() {
  const list = $('#client-quick-filter');
  const hint = $('#client-count-hint');
  hint.textContent = state.clients.length > 0 ? `${state.clients.length}개` : '';
  if (state.clients.length === 0) {
    list.innerHTML = '<li class="client-empty">진행 건을 만들면<br />여기에 자동 등록됩니다</li>';
    return;
  }
  const allItem = `<li class="client-item ${!state.settings.filters.clientId ? 'active' : ''}" data-client-id=""><span class="client-dot" style="background:var(--c-slate);"></span><span class="client-name">전체 클라이언트</span><span class="client-count">${state.projects.length}</span></li>`;
  list.innerHTML = allItem + state.clients.map(c => {
    const cnt = state.projects.filter(p => p.clientId === c.id).length;
    const isActive = state.settings.filters.clientId === c.id;
    return `<li class="client-item ${isActive ? 'active' : ''}" data-client-id="${c.id}"><span class="client-dot" style="background:${c.color || 'var(--c-cyan)'};"></span><span class="client-name" title="${escapeHtml(c.name)}">${escapeHtml(c.name)}</span><span class="client-count">${cnt}</span></li>`;
  }).join('');
  $$('#client-quick-filter .client-item').forEach(el => {
    el.addEventListener('click', () => {
      state.settings.filters.clientId = el.dataset.clientId;
      saveState(); renderClientFilter();
      if (!$('[data-page="board"]').classList.contains('hidden')) renderBoardPage();
    });
  });
}
function renderSidebar() { renderStats(); renderUserSelector(); renderClientFilter(); }

function showToast(message, type = 'info') {
  const t = document.createElement('div');
  t.className = 'toast' + (type !== 'info' ? ` ${type}` : '');
  t.textContent = message;
  $('#toast-container').appendChild(t);
  setTimeout(() => t.remove(), 3000);
}
function openSidebar() { $('#sidebar').classList.add('open'); $('#sidebar-overlay').classList.remove('hidden'); }
function closeSidebar() { $('#sidebar').classList.remove('open'); $('#sidebar-overlay').classList.add('hidden'); }

/* ============ 모달 시스템 ============ */
function openModal(html) { $('#modal-content').innerHTML = html; $('#modal').classList.remove('hidden'); }
function closeModal() { $('#modal').classList.add('hidden'); $('#modal-content').innerHTML = ''; }
function openConfirm({ title = '확인', message, detail, warning, confirmText = '확인', danger = false, onConfirm }) {
  const html = `
    <div class="modal-header">
      <div class="modal-title-wrap">
        <div class="modal-title-icon" style="${danger ? 'background:linear-gradient(135deg,#ef4444,#f97316);' : ''}">${danger ? '⚠' : '?'}</div>
        <div class="modal-title">${escapeHtml(title)}</div>
      </div>
      <button class="icon-btn" data-close-modal>✕</button>
    </div>
    <div class="modal-body">
      <p class="confirm-message">${escapeHtml(message)}</p>
      ${detail ? `<div class="confirm-detail">${detail}</div>` : ''}
      ${warning ? `<div class="confirm-warning">⚠ ${escapeHtml(warning)}</div>` : ''}
    </div>
    <div class="modal-footer"><div></div><div class="modal-footer-right">
      <button class="ghost-btn" data-close-modal>취소</button>
      <button class="${danger ? 'danger-btn' : 'primary-btn'}" id="confirm-ok-btn">${escapeHtml(confirmText)}</button>
    </div></div>`;
  openModal(html);
  $('#confirm-ok-btn').addEventListener('click', () => { if (typeof onConfirm === 'function') onConfirm(); closeModal(); });
}
function buildColorPalette(selectedColor) {
  return `<div class="color-palette">${COLOR_PALETTE.map(c => `<div class="color-swatch ${c === selectedColor ? 'selected' : ''}" data-color="${c}" style="background:${c};"></div>`).join('')}</div>
  <div class="color-custom-row"><input type="color" id="custom-color" value="${selectedColor}" /><span style="font-size:12px;color:var(--text-muted);">커스텀 색상</span></div>`;
}
function buildIconPalette(selectedIcon) {
  return `<div class="icon-palette">${ICON_PALETTE.map(i => `<div class="icon-swatch ${i === selectedIcon ? 'selected' : ''}" data-icon="${i}">${i}</div>`).join('')}</div>
  <div class="icon-input-row"><div class="icon-preview" id="icon-preview">${selectedIcon}</div><input type="text" id="custom-icon-input" class="form-input" placeholder="이모지 직접 입력" maxlength="2" value="${selectedIcon}" /></div>`;
}

/* ============ 작업 보드 ============ */
function renderBoardPage() {
  const empty = state.projects.length === 0;
  $('#board-empty').classList.toggle('hidden', !empty);
  $('#board-main').classList.toggle('hidden', empty);
  if (empty) { $('#topbar-create-btn').classList.add('hidden'); return; }
  $('#topbar-create-btn').classList.remove('hidden');
  $('#clear-demo-btn').classList.toggle('hidden', !hasDemoData());

  $('#starred-only-btn').classList.toggle('active', !!state.settings.starredOnly);
  $('#groupby-select').value = state.settings.groupBy || 'client';
  $('#sort-select').value = state.settings.sortBy || 'dueAsc';
  $('#board-search').value = state.settings.boardSearch || '';
  $('#search-clear').classList.toggle('hidden', !state.settings.boardSearch);

  let projects = getFilteredProjects();
  projects = sortProjects(projects, state.settings.sortBy);

  if (projects.length === 0) {
    $('#board-noresult').classList.remove('hidden');
    $('#board-groups').innerHTML = '';
    return;
  }
  $('#board-noresult').classList.add('hidden');

  const groups = getProjectsByGroup(projects, state.settings.groupBy);
  $('#board-groups').innerHTML = groups.map(g => renderGroup(g)).join('');

  $$('.group-header').forEach(el => {
    el.addEventListener('click', () => {
      const groupEl = el.closest('.board-group');
      const gid = groupEl.dataset.groupId;
      groupEl.classList.toggle('collapsed');
      state.settings.collapsedGroups = state.settings.collapsedGroups || {};
      state.settings.collapsedGroups[gid] = groupEl.classList.contains('collapsed');
      saveState();
    });
  });
  bindCardInteractions();
}

function getFilteredProjects() {
  let list = [...state.projects];
  if (state.settings.filters.clientId) list = list.filter(p => p.clientId === state.settings.filters.clientId);
  if (state.settings.myDashboard && state.settings.currentMemberId) {
    list = list.filter(p => Array.isArray(p.assigneeIds) && p.assigneeIds.includes(state.settings.currentMemberId));
  }
  if (state.settings.starredOnly) list = list.filter(p => p.starred);
  const s = (state.settings.boardSearch || '').trim().toLowerCase();
  if (s) list = list.filter(p => `${p.title} ${p.memo || ''} ${p.clientName || ''}`.toLowerCase().includes(s));
  return list;
}

function sortProjects(projects, sortBy) {
  const arr = [...projects];
  const cmp = (a, b) => state.settings.showStarredOnTop && !!a.starred !== !!b.starred ? Number(!!b.starred) - Number(!!a.starred) : 0;
  if (sortBy === 'dueAsc') {
    arr.sort((a, b) => {
      const c = cmp(a, b); if (c !== 0) return c;
      const ta = getNextDeadline(a).at, tb = getNextDeadline(b).at;
      if (!ta && !tb) return 0;
      if (!ta) return 1;
      if (!tb) return -1;
      return new Date(ta) - new Date(tb);
    });
  } else if (sortBy === 'starred') {
    arr.sort((a, b) => Number(!!b.starred) - Number(!!a.starred));
  } else if (sortBy === 'client') {
    arr.sort((a, b) => { const c = cmp(a, b); if (c !== 0) return c; return (a.clientName || '').localeCompare(b.clientName || '', 'ko'); });
  } else if (sortBy === 'recent') {
    arr.sort((a, b) => { const c = cmp(a, b); if (c !== 0) return c; return new Date(b.createdAt || 0) - new Date(a.createdAt || 0); });
  }
  return arr;
}

function getProjectsByGroup(projects, groupBy) {
  const groups = new Map();

  if (groupBy === 'client') {
    projects.forEach(p => {
      const key = p.clientId || '__no_client__';
      if (!groups.has(key)) {
        const c = state.clients.find(x => x.id === p.clientId);
        groups.set(key, { id: key, name: c?.name || p.clientName || '클라이언트 미지정', color: c?.color || '#94a3b8', icon: '📌', projects: [] });
      }
      groups.get(key).projects.push(p);
    });
    const arr = [...groups.values()].sort((a, b) => {
      if (a.id === '__no_client__') return 1;
      if (b.id === '__no_client__') return -1;
      return a.name.localeCompare(b.name, 'ko');
    });
    return arr;
  }

  if (groupBy === 'category') {
    projects.forEach(p => {
      const cat = state.categories.find(c => c.id === p.categoryId);
      const key = cat?.id || '__no_cat__';
      if (!groups.has(key)) {
        groups.set(key, { id: key, name: cat?.name || '미지정', color: cat?.color || '#94a3b8', icon: cat?.icon || '🗂', projects: [] });
      }
      groups.get(key).projects.push(p);
    });
    return [...groups.values()].sort((a, b) => {
      const ai = state.categories.findIndex(c => c.id === a.id);
      const bi = state.categories.findIndex(c => c.id === b.id);
      if (ai === -1 && bi === -1) return 0;
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    });
  }

  if (groupBy === 'workType') {
    projects.forEach(p => {
      const wt = WORK_TYPES[p.workType] || WORK_TYPES.etc;
      if (!groups.has(wt.id)) {
        groups.set(wt.id, { id: wt.id, name: wt.name, color: wt.color, icon: wt.icon, projects: [] });
      }
      groups.get(wt.id).projects.push(p);
    });
    const order = Object.keys(WORK_TYPES);
    return [...groups.values()].sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
  }

  if (groupBy === 'dueDate') {
    const buckets = [
      { id: 'overdue', name: '지난 마감 (지연)', color: '#ef4444', icon: '🔴', danger: true, projects: [] },
      { id: 'today',   name: '오늘',             color: '#f59e0b', icon: '📅', projects: [] },
      { id: 'tomorrow',name: '내일',             color: '#f59e0b', icon: '📅', projects: [] },
      { id: 'week',    name: '이번 주',          color: '#3b82f6', icon: '📅', projects: [] },
      { id: 'next',    name: '다음 주 이후',     color: '#8b5cf6', icon: '📅', projects: [] },
      { id: 'none',    name: '마감 미정',        color: '#94a3b8', icon: '❓', projects: [] },
    ];
    const now = new Date();
    const todayEnd = new Date(); todayEnd.setHours(23,59,59,999);
    const tomorrowEnd = new Date(); tomorrowEnd.setDate(tomorrowEnd.getDate()+1); tomorrowEnd.setHours(23,59,59,999);
    const weekEnd = new Date(); weekEnd.setDate(weekEnd.getDate()+7); weekEnd.setHours(23,59,59,999);
    projects.forEach(p => {
      const { at } = getNextDeadline(p);
      if (!at) { buckets[5].projects.push(p); return; }
      const t = new Date(at).getTime();
      const isActive = p.status !== 'done' && p.status !== 'archived';
      if (t < now.getTime() && isActive) buckets[0].projects.push(p);
      else if (t <= todayEnd.getTime()) buckets[1].projects.push(p);
      else if (t <= tomorrowEnd.getTime()) buckets[2].projects.push(p);
      else if (t <= weekEnd.getTime()) buckets[3].projects.push(p);
      else buckets[4].projects.push(p);
    });
    return buckets.filter(b => b.projects.length > 0);
  }

  if (groupBy === 'assignee') {
    projects.forEach(p => {
      const assignees = Array.isArray(p.assigneeIds) ? p.assigneeIds : [];
      if (assignees.length === 0) {
        if (!groups.has('__none__')) groups.set('__none__', { id: '__none__', name: '담당자 미지정', color: '#94a3b8', icon: '👤', projects: [] });
        groups.get('__none__').projects.push(p);
      } else {
        const memId = assignees[0];
        const member = state.members.find(m => m.id === memId);
        if (!groups.has(memId)) groups.set(memId, { id: memId, name: member?.name || '?', color: member?.color || '#94a3b8', icon: '👤', projects: [] });
        groups.get(memId).projects.push(p);
      }
    });
    return [...groups.values()].sort((a, b) => {
      if (a.id === '__none__') return 1;
      if (b.id === '__none__') return -1;
      return a.name.localeCompare(b.name, 'ko');
    });
  }
  return [];
}

function renderGroup(group) {
  const collapsed = state.settings.collapsedGroups?.[group.id];
  const dangerClass = group.danger ? ' overdue-group' : '';
  const cards = group.projects.map(p => renderProjectCard(p)).join('');
  return `
    <section class="board-group${dangerClass} ${collapsed ? 'collapsed' : ''}" data-group-id="${escapeHtml(group.id)}" style="--group-color: ${group.color};">
      <div class="group-header">
        <div class="group-color-bar"></div>
        <div class="group-icon">${group.icon}</div>
        <div class="group-name">${escapeHtml(group.name)}</div>
        <div class="group-count">${group.projects.length}건</div>
        <div class="group-toggle">▼</div>
      </div>
      <div class="group-body">
        ${cards}
        <button class="add-proj-tile" data-soon-action data-group-id="${escapeHtml(group.id)}"><span>⊕</span> <span>추가</span></button>
      </div>
    </section>`;
}

/* 패턴 라벨 추출 */
function getPatternLabel(project) {
  if (project.type === 'guide' && project.guideKind) {
    if (project.guideKind === 'reporter') return { icon: '👥', text: '기자단' };
    if (project.guideKind === 'exposure') return { icon: '⏱', text: '24h 노출 체크' };
    if (project.guideKind === 'deploy')   return { icon: '📅', text: 'N건 배포' };
  }
  if (project.type === 'package' && project.isSplit && Array.isArray(project.slots) && project.slots.length > 0) {
    return { icon: '📅', text: `분할 배포 ${project.slots.length}슬롯` };
  }
  return null;
}

function renderProjectCard(project) {
  const cat = state.categories.find(c => c.id === project.categoryId);
  const wt = WORK_TYPES[project.workType] || WORK_TYPES.etc;
  const tp = PROJECT_TYPES[project.type];
  const status = STATUS_COLUMNS.find(s => s.id === project.status) || STATUS_COLUMNS[0];

  const { at: dueAt } = getNextDeadline(project);
  const m = minutesUntil(dueAt);
  const isActive = project.status !== 'done' && project.status !== 'archived';
  const isDanger = m !== null && m < 0 && isActive;
  const isWarn = !isDanger && m !== null && m >= 0 && m <= 60 * 24;

  // 진행률
  let progress = 0; let progressLabel = '체크리스트 없음'; let extraLabel = '';
  if (project.isSplit) {
    const totalDone = (project.slots || []).reduce((sum, s) => sum + ((s.works || []).filter(w => w.done).length), 0);
    const totalTarget = project.totalCount || (project.slots || []).reduce((sum, s) => sum + (s.count || 0), 0);
    const totalRegistered = (project.slots || []).reduce((sum, s) => sum + ((s.works || []).length), 0);
    progress = totalTarget > 0 ? Math.round((totalDone / totalTarget) * 100) : 0;
    progressLabel = `${totalDone} / ${totalTarget}`;
    if (totalRegistered !== totalTarget) extraLabel = ` · ${totalRegistered}개 등록`;
  } else if (Array.isArray(project.checklist) && project.checklist.length > 0) {
    const done = project.checklist.filter(c => c.done).length;
    progress = Math.round((done / project.checklist.length) * 100);
    progressLabel = `${done} / ${project.checklist.length}`;
  } else if (project.totalCount && project.totalCount > 0) {
    progressLabel = `목표 ${project.totalCount}건`;
  }

  const assignees = (project.assigneeIds || []).map(id => state.members.find(m => m.id === id)).filter(Boolean).slice(0, 3);
  const dd = formatDDay(dueAt, project.status);
  const starred = !!project.starred;
  const pattern = getPatternLabel(project);

  return `
    <article class="proj-card status-${project.status} ${isDanger ? 'danger' : ''} ${isWarn ? 'warn' : ''}"
             data-proj-id="${project.id}"
             style="--card-color: ${wt.color};">
      <div class="proj-card-border"></div>

      <div class="proj-card-indicators">
        ${cat ? `<span class="cat-mini-badge" style="--cat-color:${cat.color};" title="정산 분류: ${escapeHtml(cat.name)}"><span class="cat-mini-dot"></span>${escapeHtml(cat.name)}</span>` : ''}
        ${isDanger ? '<span class="indicator danger" title="마감 지남">🔴</span>' : ''}
        ${isWarn ? '<span class="indicator warn" title="마감 24시간 이내">⚠️</span>' : ''}
        <span class="indicator status-dot" style="background:${status.color}" title="${status.name}"></span>
        <button class="indicator star ${starred ? 'on' : ''}" data-action="star" data-id="${project.id}" title="${starred ? '별표 해제' : '별표 추가'}">${starred ? '★' : '☆'}</button>
      </div>

      <div class="proj-card-content">
        <div class="proj-badges">
          <span class="badge worktype-badge" style="background:color-mix(in srgb, ${wt.color} 14%, transparent);color:${wt.color};border:1px solid color-mix(in srgb, ${wt.color} 30%, transparent);">
            <span class="wt-icon">${wt.icon}</span> ${escapeHtml(wt.name)}
          </span>
          ${tp ? `<span class="badge type-badge">${tp.icon} ${escapeHtml(tp.name)}</span>` : ''}
          ${pattern ? `<span class="badge pattern-badge">${pattern.icon} ${escapeHtml(pattern.text)}</span>` : ''}
        </div>

        <h4 class="proj-title">${escapeHtml(project.title)}</h4>

        <div class="proj-meta">
          ${assignees.length > 0
            ? `<div class="proj-avatars">${assignees.map(a => `<div class="proj-avatar" style="background:linear-gradient(135deg, ${a.color}, color-mix(in srgb, ${a.color} 70%, #ec4899));" title="${escapeHtml(a.name)}">${escapeHtml(a.initial || getInitial(a.name))}</div>`).join('')}</div>`
            : '<span class="proj-no-assignee">담당자 없음</span>'}
          ${project.clientName ? `<span class="proj-client">🏢 ${escapeHtml(project.clientName)}</span>` : ''}
        </div>

        <div class="proj-footer">
          <span class="proj-due ${dd.cls}">${dd.text}</span>
          <div class="proj-progress">
            <div class="proj-progress-bar"><div class="proj-progress-fill" style="width:${progress}%;"></div></div>
            <span class="proj-progress-text">${progressLabel}${extraLabel}</span>
          </div>
        </div>
      </div>

      <div class="proj-card-actions">
        <button class="card-act" data-action="star" data-id="${project.id}" title="별표"><span class="${starred ? 'star-on' : ''}">${starred ? '★' : '☆'}</span></button>
        <button class="card-act" data-action="edit" data-id="${project.id}" title="편집">📝</button>
        <button class="card-act" data-action="duplicate" data-id="${project.id}" title="복제">📋</button>
        <button class="card-act danger" data-action="delete" data-id="${project.id}" title="삭제">🗑</button>
      </div>
    </article>`;
}

function bindCardInteractions() {
  $$('[data-action="star"]').forEach(b => b.addEventListener('click', (e) => {
    e.stopPropagation();
    const p = state.projects.find(x => x.id === b.dataset.id); if (!p) return;
    p.starred = !p.starred; saveState();
    if (!$('[data-page="board"]').classList.contains('hidden')) renderBoardPage();
    if (!$('[data-page="my"]').classList.contains('hidden')) renderMyDashboard();
  }));
  $$('[data-action="edit"], [data-action="duplicate"]').forEach(b => b.addEventListener('click', (e) => {
    e.stopPropagation(); showToast(SOON_MESSAGES.create, 'info-soft');
  }));
  $$('.card-act[data-action="delete"]').forEach(b => b.addEventListener('click', (e) => {
    e.stopPropagation();
    const p = state.projects.find(x => x.id === b.dataset.id); if (!p) return;
    openConfirm({
      title: '진행 건 삭제', message: `'${p.title}' 진행 건을 삭제할까요?`,
      detail: '삭제된 진행 건은 복구할 수 없습니다.', confirmText: '삭제', danger: true,
      onConfirm: () => {
        state.projects = state.projects.filter(x => x.id !== p.id);
        saveState();
        if (!$('[data-page="board"]').classList.contains('hidden')) renderBoardPage();
        if (!$('[data-page="my"]').classList.contains('hidden')) renderMyDashboard();
        renderSidebar();
        showToast(`'${p.title}'을(를) 삭제했습니다`, 'success');
      },
    });
  }));
  $$('.proj-card').forEach(card => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('.proj-card-indicators') || e.target.closest('.proj-card-actions')) return;
      showToast(SOON_MESSAGES.create, 'info-soft');
    });
  });
}

/* ============ 내 대시보드 ============ */
function renderMyDashboard() {
  const memId = state.settings.currentMemberId;
  const me = memId ? state.members.find(m => m.id === memId) : null;

  $('#my-noselect').classList.toggle('hidden', !!me);
  $('#my-main').classList.toggle('hidden', !me);
  if (!me) return;

  // 헤더
  const avatar = $('#my-avatar');
  avatar.textContent = me.initial || getInitial(me.name);
  avatar.style.background = `linear-gradient(135deg, ${me.color}, color-mix(in srgb, ${me.color} 70%, #ec4899))`;
  $('#my-title').textContent = `${me.name} 님의 대시보드`;
  const nowH = new Date().getHours();
  const greet = nowH < 6 ? '늦은 시간이네요' : nowH < 12 ? '좋은 아침이에요' : nowH < 18 ? '오늘도 화이팅!' : '수고하셨어요';
  $('#my-sub').textContent = greet;

  // 빠른 추가 input 활성화
  $('#todo-quick-input').disabled = false;
  $('#todo-quick-group').disabled = false;

  // 통계
  const myTodos = state.todos.filter(t => t.memberId === memId);
  const myProjects = state.projects.filter(p => Array.isArray(p.assigneeIds) && p.assigneeIds.includes(memId) && p.status !== 'archived');
  $('#my-stat-today').textContent = myTodos.filter(t => t.group === 'today' && !t.done).length;
  $('#my-stat-doing').textContent = myProjects.filter(p => p.status === 'doing').length + myTodos.filter(t => t.group === 'doing' && !t.done).length;
  $('#my-stat-urgent').textContent = myProjects.filter(p => isOverdue(p) || isDeadlineSoon(p)).length;

  // 자유 투두 4그룹
  const groupsEl = $('#todo-groups');
  groupsEl.innerHTML = TODO_GROUPS.map(g => {
    const items = myTodos.filter(t => t.group === g.id);
    const itemsHtml = items.length === 0
      ? '<div class="todo-empty">비어 있음</div>'
      : items.map(t => renderTodoItem(t)).join('');
    return `
      <div class="todo-group ${g.id}">
        <div class="todo-group-header">
          <div class="todo-group-name">${g.icon} ${g.name}</div>
          <div class="todo-group-count">${items.length}</div>
        </div>
        <div class="todo-list">${itemsHtml}</div>
      </div>`;
  }).join('');
  bindTodoInteractions();

  // 내 담당 진행 건
  const projectsEl = $('#my-projects');
  if (myProjects.length === 0) {
    projectsEl.innerHTML = `<div class="my-projects-empty">담당으로 지정된 진행 건이 없습니다. 작업 보드의 진행 건에 본인을 담당자로 추가해 주세요.</div>`;
  } else {
    const sorted = [...myProjects].sort((a, b) => {
      const ta = getNextDeadline(a).at, tb = getNextDeadline(b).at;
      if (!ta && !tb) return 0;
      if (!ta) return 1;
      if (!tb) return -1;
      return new Date(ta) - new Date(tb);
    });
    projectsEl.innerHTML = sorted.map(p => renderProjectCard(p)).join('');
    bindCardInteractions();
  }
}

function renderTodoItem(todo) {
  return `
    <div class="todo-item ${todo.done ? 'done' : ''}" data-todo-id="${todo.id}">
      <input type="checkbox" class="todo-checkbox" ${todo.done ? 'checked' : ''} data-action="toggle-todo" data-id="${todo.id}" />
      <span class="todo-text" data-action="edit-todo" data-id="${todo.id}" title="클릭해서 편집">${escapeHtml(todo.text)}</span>
      <div class="todo-actions">
        <select class="todo-group-select" data-action="move-todo" data-id="${todo.id}">
          ${TODO_GROUPS.map(g => `<option value="${g.id}" ${todo.group === g.id ? 'selected' : ''}>${g.icon} ${g.name}</option>`).join('')}
        </select>
        <button class="todo-act danger" data-action="delete-todo" data-id="${todo.id}" title="삭제">✕</button>
      </div>
    </div>`;
}

function bindTodoInteractions() {
  $$('[data-action="toggle-todo"]').forEach(el => el.addEventListener('change', (e) => {
    const t = state.todos.find(x => x.id === el.dataset.id); if (!t) return;
    t.done = e.target.checked;
    t.completedAt = t.done ? new Date().toISOString() : null;
    saveState(); renderMyDashboard();
  }));
  $$('[data-action="move-todo"]').forEach(el => el.addEventListener('change', (e) => {
    e.stopPropagation();
    const t = state.todos.find(x => x.id === el.dataset.id); if (!t) return;
    t.group = e.target.value;
    saveState(); renderMyDashboard();
    showToast(`'${t.text.length > 20 ? t.text.slice(0,20)+'…' : t.text}' → ${TODO_GROUPS.find(g=>g.id===t.group).name}`, 'success');
  }));
  $$('[data-action="delete-todo"]').forEach(el => el.addEventListener('click', (e) => {
    e.stopPropagation();
    state.todos = state.todos.filter(x => x.id !== el.dataset.id);
    saveState(); renderMyDashboard();
  }));
  // 텍스트 클릭 → 인라인 편집
  $$('[data-action="edit-todo"]').forEach(el => el.addEventListener('click', (e) => {
    e.stopPropagation();
    const t = state.todos.find(x => x.id === el.dataset.id); if (!t) return;
    const input = document.createElement('input');
    input.type = 'text'; input.value = t.text; input.className = 'todo-text-input';
    el.replaceWith(input); input.focus(); input.select();
    const finish = (save) => {
      if (save) {
        const v = input.value.trim();
        if (v) { t.text = v; saveState(); }
      }
      renderMyDashboard();
    };
    input.addEventListener('blur', () => finish(true));
    input.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter') { ev.preventDefault(); finish(true); }
      else if (ev.key === 'Escape') { ev.preventDefault(); finish(false); }
    });
  }));
}

function addTodo(text, group = 'today') {
  if (!state.settings.currentMemberId) return;
  state.todos.push({
    id: 'todo_' + uid(),
    text: text.trim(),
    memberId: state.settings.currentMemberId,
    group,
    done: false,
    relatedProjectId: null,
    createdAt: new Date().toISOString(),
    completedAt: null,
  });
  saveState();
}

/* ============ 데모 데이터 (workType 적용) ============ */
function hasDemoData() {
  return state.projects.some(p => p.isDemo) || state.clients.some(c => c.isDemo) || state.todos.some(t => t.isDemo);
}

function addDemoData() {
  const now = Date.now();
  const inHours = (h) => new Date(now + h * 3600000).toISOString();
  const stamp = new Date().toISOString();

  // 박신영 멤버 ID 보장 (시드 멤버)
  const meId = state.members[0]?.id || 'mem_shinyoung';

  // 클라이언트 3개
  [
    { id: 'cli_demo_ajeong', name: '아정당',     color: '#ea580c' },
    { id: 'cli_demo_rdbb',   name: '리더블비',   color: '#ca8a04' },
    { id: 'cli_demo_jk',     name: 'JK어학원',   color: '#0891b2' },
  ].forEach(c => { if (!state.clients.find(x => x.id === c.id)) state.clients.push({ ...c, isDemo: true }); });

  // 진행 건 4개
  const demoProjects = [
    {
      id: 'prj_demo_1',
      title: '11월 카페침투 패키지',
      type: 'package',
      workType: 'exposure',
      status: 'doing',
      starred: false,
      clientId: 'cli_demo_ajeong', clientName: '아정당',
      categoryId: 'cat_cafe',
      workflowId: 'wf_cafe',
      assigneeIds: [meId],
      isSplit: true,
      totalCount: 15,
      slots: [
        { id: 'slot_1', deployAt: inHours(20), draftDueAt: inHours(12), count: 10, memo: '', works: [
          { id: 'w_1', keyword: '강남 맛집', memo: '', assigneeId: null, done: true },
          { id: 'w_2', keyword: '강남 카페', memo: '', assigneeId: null, done: true },
          { id: 'w_3', keyword: '강남 디저트', memo: '', assigneeId: null, done: false },
        ] },
        { id: 'slot_2', deployAt: inHours(50), draftDueAt: inHours(40), count: 5, memo: '', works: [] },
      ],
      checklist: [
        { id: 'chk_1', text: '상담', done: true },
        { id: 'chk_2', text: '결제 확인', done: true },
        { id: 'chk_3', text: '침투 가이드 작성', done: true },
        { id: 'chk_4', text: '시트 기입', done: false },
        { id: 'chk_5', text: '업체 원고 작성 요청', done: false },
        { id: 'chk_6', text: '광고주 컨펌 요청', done: false },
        { id: 'chk_7', text: '진행', done: false },
      ],
      memo: '데모', isDemo: true, createdAt: stamp, updatedAt: stamp,
    },
    {
      id: 'prj_demo_2',
      title: '12월 월모장 25일 채우기',
      type: 'routine',
      workType: 'blog',
      status: 'doing',
      starred: false,
      clientId: 'cli_demo_jk', clientName: 'JK어학원',
      categoryId: 'cat_monthly',
      workflowId: 'wf_monthly',
      assigneeIds: [meId],
      isSplit: false,
      totalCount: 25,
      deployAt: inHours(72), draftDueAt: inHours(48),
      checklist: [
        { id: 'chk_1', text: '상담', done: true },
        { id: 'chk_2', text: '노출/25일 결정 (견적서 여부)', done: true },
        { id: 'chk_3', text: '가이드 작성', done: true },
        { id: 'chk_4', text: '작성', done: false },
        { id: 'chk_5', text: '시트 기입 (노출 체크)', done: false },
        { id: 'chk_6', text: '노출 현황 확인 (월말)', done: false },
      ],
      routine: { autoClone: true, lastClonedMonth: '2026-04', sheetUrl: '' },
      memo: '데모', isDemo: true, createdAt: stamp, updatedAt: stamp,
    },
    {
      id: 'prj_demo_3',
      title: '제안서 작성 — 신규 거래처',
      type: 'oneoff',
      workType: 'internal',
      status: 'todo',
      starred: true,
      clientId: 'cli_demo_jk', clientName: 'JK어학원',
      categoryId: 'cat_work',
      workflowId: 'wf_proposal',
      assigneeIds: [meId],
      isSplit: false,
      deployAt: inHours(-10), draftDueAt: inHours(-20),
      checklist: [
        { id: 'chk_1', text: '클라이언트 정보 정리', done: false },
        { id: 'chk_2', text: '제안서 초안 작성', done: false },
        { id: 'chk_3', text: '검토/수정', done: false },
      ],
      memo: '데모 (마감 지남 + 별표)', isDemo: true, createdAt: stamp, updatedAt: stamp,
    },
    {
      id: 'prj_demo_4',
      title: '기자단 8건 발행',
      type: 'guide',
      workType: 'external',
      guideKind: 'reporter',
      status: 'done',
      starred: false,
      clientId: 'cli_demo_rdbb', clientName: '리더블비',
      categoryId: 'cat_guide',
      workflowId: null,
      assigneeIds: [meId],
      isSplit: false,
      totalCount: 8,
      deployAt: inHours(-72), draftDueAt: null,
      checklist: [],
      memo: '데모 (완료)', isDemo: true, createdAt: stamp, updatedAt: stamp,
    },
  ];
  demoProjects.forEach(p => { if (!state.projects.find(x => x.id === p.id)) state.projects.push(p); });

  // 데모 투두 (박신영 명의)
  const demoTodos = [
    { id: 'todo_demo_1', text: '카페 원고 3건 작성',     group: 'today',    done: false },
    { id: 'todo_demo_2', text: '아정당 컨펌 요청',        group: 'today',    done: false },
    { id: 'todo_demo_3', text: '신규 제안서 검토',        group: 'thisWeek', done: false },
    { id: 'todo_demo_4', text: '키워드 리스트 정리',      group: 'thisWeek', done: false },
    { id: 'todo_demo_5', text: '솔루션 페이지 인수인계', group: 'doing',    done: false },
  ];
  demoTodos.forEach(t => {
    if (!state.todos.find(x => x.id === t.id)) {
      state.todos.push({ ...t, memberId: meId, relatedProjectId: null, createdAt: stamp, completedAt: null, isDemo: true });
    }
  });

  saveState();
}

function clearDemoData() {
  state.projects = state.projects.filter(p => !p.isDemo);
  state.clients = state.clients.filter(c => !c.isDemo);
  state.todos = state.todos.filter(t => !t.isDemo);
  if (state.settings.filters.clientId && !state.clients.find(c => c.id === state.settings.filters.clientId)) {
    state.settings.filters.clientId = '';
  }
  saveState();
}

/* ============ 카테고리 페이지 ============ */
function renderCategoriesPage() {
  // workType 안내 박스
  const wtGrid = $('#worktype-grid');
  wtGrid.innerHTML = Object.values(WORK_TYPES).map(wt => `
    <div class="worktype-tile" style="--wt-color: ${wt.color};">
      <div class="worktype-tile-icon">${wt.icon}</div>
      <div class="worktype-tile-info">
        <div class="worktype-tile-name">${escapeHtml(wt.name)}</div>
        <div class="worktype-tile-desc">${escapeHtml(wt.desc)}</div>
      </div>
    </div>
  `).join('');

  // 정산 분류 카드
  const list = $('#category-list');
  if (state.categories.length === 0) {
    list.innerHTML = `<div class="empty-state-mini"><div class="icon">🎨</div><h3>정산 분류가 없습니다</h3><p>오른쪽 위 "+ 정산 분류 추가" 버튼으로 시작하세요.</p></div>`;
    return;
  }
  list.innerHTML = state.categories.map(cat => {
    const wf = state.workflows.find(w => w.id === cat.defaultWorkflowId);
    const tp = cat.defaultType ? PROJECT_TYPES[cat.defaultType] : null;
    const used = state.projects.filter(p => p.categoryId === cat.id).length;
    return `
      <div class="cat-card" draggable="true" data-cat-id="${cat.id}" style="--card-color: ${cat.color};">
        <div class="cat-card-head">
          <div class="cat-icon-box">${cat.icon || '🗂'}</div>
          <div class="cat-name">${escapeHtml(cat.name)}</div>
          <div class="cat-actions">
            <button class="cat-action drag-handle" title="드래그로 순서 변경">⋮⋮</button>
            <button class="cat-action" data-action="edit" data-id="${cat.id}" title="편집">✏</button>
            <button class="cat-action danger" data-action="delete" data-id="${cat.id}" title="삭제">🗑</button>
          </div>
        </div>
        <div class="cat-desc ${cat.desc ? '' : 'empty'}">${escapeHtml(cat.desc || '설명 없음')}</div>
        <div class="cat-meta">
          ${tp ? `<span class="cat-meta-item type">${tp.icon} ${escapeHtml(tp.name)}</span>` : ''}
          ${wf ? `<span class="cat-meta-item">📐 <strong>${escapeHtml(wf.name)}</strong></span>` : '<span class="cat-meta-item">📐 워크플로우 없음</span>'}
          <span class="cat-meta-item">사용 중: <strong>${used}</strong></span>
        </div>
      </div>`;
  }).join('');
  $$('.cat-card .cat-action[data-action="edit"]').forEach(b => b.addEventListener('click', (e) => { e.stopPropagation(); openCategoryEditor(b.dataset.id); }));
  $$('.cat-card .cat-action[data-action="delete"]').forEach(b => b.addEventListener('click', (e) => { e.stopPropagation(); deleteCategoryWithConfirm(b.dataset.id); }));
  setupCardDrag(list, '.cat-card', 'cat-id', (newOrder) => {
    state.categories.sort((a, b) => newOrder.indexOf(a.id) - newOrder.indexOf(b.id));
    saveState(); renderCategoriesPage(); renderSidebar();
    showToast('정산 분류 순서를 변경했습니다', 'success');
  });
}

function openCategoryEditor(id = null) {
  const isEdit = !!id;
  const cat = isEdit ? state.categories.find(c => c.id === id) : { id: null, name: '', color: COLOR_PALETTE[0], icon: '🗂', desc: '', defaultType: null, defaultWorkflowId: null };
  if (!cat) return;
  const html = `
    <div class="modal-header"><div class="modal-title-wrap"><div class="modal-title-icon">${isEdit ? '✏' : '+'}</div><div class="modal-title">${isEdit ? '정산 분류 편집' : '새 정산 분류'}</div></div><button class="icon-btn" data-close-modal>✕</button></div>
    <div class="modal-body">
      <div class="form-row"><label class="form-label" for="cat-name">이름 <span style="color:var(--c-red);">*</span></label><input type="text" id="cat-name" class="form-input" maxlength="20" value="${escapeHtml(cat.name)}" placeholder="예: 카페" /></div>
      <div class="form-row"><label class="form-label">아이콘 <span class="form-hint">(이모지 클릭 또는 직접 입력)</span></label>${buildIconPalette(cat.icon || '🗂')}</div>
      <div class="form-row"><label class="form-label">색상 <span class="form-hint">(우상단 미니 뱃지 색상)</span></label>${buildColorPalette(cat.color)}</div>
      <div class="form-row"><label class="form-label" for="cat-desc">설명 <span class="form-hint">(선택)</span></label><input type="text" id="cat-desc" class="form-input" maxlength="60" value="${escapeHtml(cat.desc || '')}" /></div>
      <div class="form-grid-2">
        <div class="form-row"><label class="form-label" for="cat-type">기본 진행 건 유형</label><select id="cat-type" class="form-select"><option value="">— 없음 —</option>${Object.values(PROJECT_TYPES).map(t => `<option value="${t.id}" ${cat.defaultType === t.id ? 'selected' : ''}>${t.icon} ${t.name}</option>`).join('')}</select></div>
        <div class="form-row"><label class="form-label" for="cat-workflow">기본 워크플로우</label><select id="cat-workflow" class="form-select"><option value="">— 없음 —</option>${state.workflows.map(w => `<option value="${w.id}" ${cat.defaultWorkflowId === w.id ? 'selected' : ''}>${escapeHtml(w.name)}${w.type ? ` · ${PROJECT_TYPES[w.type].name}` : ''}</option>`).join('')}</select></div>
      </div>
    </div>
    <div class="modal-footer"><div></div><div class="modal-footer-right"><button class="ghost-btn" data-close-modal>취소</button><button class="primary-btn" id="cat-save-btn">${isEdit ? '저장' : '추가'}</button></div></div>`;
  openModal(html);

  let chosenColor = cat.color;
  $$('.color-swatch').forEach(sw => sw.addEventListener('click', () => {
    chosenColor = sw.dataset.color; $('#custom-color').value = chosenColor;
    $$('.color-swatch').forEach(x => x.classList.toggle('selected', x.dataset.color === chosenColor));
  }));
  $('#custom-color').addEventListener('input', (e) => { chosenColor = e.target.value; $$('.color-swatch').forEach(x => x.classList.remove('selected')); });

  let chosenIcon = cat.icon || '🗂';
  $$('.icon-swatch').forEach(sw => sw.addEventListener('click', () => {
    chosenIcon = sw.dataset.icon; $('#custom-icon-input').value = chosenIcon; $('#icon-preview').textContent = chosenIcon;
    $$('.icon-swatch').forEach(x => x.classList.toggle('selected', x.dataset.icon === chosenIcon));
  }));
  $('#custom-icon-input').addEventListener('input', (e) => {
    chosenIcon = e.target.value || '🗂'; $('#icon-preview').textContent = chosenIcon;
    $$('.icon-swatch').forEach(x => x.classList.toggle('selected', x.dataset.icon === chosenIcon));
  });

  $('#cat-save-btn').addEventListener('click', () => {
    const name = $('#cat-name').value.trim();
    if (!name) { showToast('이름을 입력해 주세요', 'warn'); return; }
    const data = { name, color: chosenColor, icon: chosenIcon, desc: $('#cat-desc').value.trim(), defaultType: $('#cat-type').value || null, defaultWorkflowId: $('#cat-workflow').value || null };
    if (isEdit) { Object.assign(cat, data); showToast('정산 분류를 수정했습니다', 'success'); }
    else { state.categories.push({ id: 'cat_' + uid(), ...data }); showToast('정산 분류를 추가했습니다', 'success'); }
    saveState(); closeModal(); renderCategoriesPage(); renderSidebar();
    if (!$('[data-page="board"]').classList.contains('hidden')) renderBoardPage();
  });
  $('#cat-name').focus();
}

function deleteCategoryWithConfirm(id) {
  const cat = state.categories.find(c => c.id === id);
  if (!cat) return;
  const used = state.projects.filter(p => p.categoryId === id).length;
  openConfirm({
    title: '정산 분류 삭제', message: `'${cat.name}' 분류를 삭제할까요?`,
    detail: used > 0 ? `이 분류에 속한 진행 건 <strong>${used}건</strong>은 '기타'로 이동됩니다.` : `현재 사용 중인 진행 건이 없어 안전하게 삭제됩니다.`,
    confirmText: '삭제', danger: true,
    onConfirm: () => {
      state.categories = state.categories.filter(c => c.id !== id);
      let etc = state.categories.find(c => c.id === 'cat_etc');
      if (!etc) {
        etc = { id: 'cat_etc', name: '기타', color: '#94a3b8', icon: '🗂', desc: '기타', defaultType: null, defaultWorkflowId: null };
        state.categories.push(etc);
      }
      state.projects.forEach(p => { if (p.categoryId === id) p.categoryId = etc.id; });
      saveState(); renderCategoriesPage(); renderSidebar();
      showToast(`'${cat.name}' 분류를 삭제했습니다`, 'success');
    },
  });
}

/* ============ 담당자 페이지 ============ */
function renderMembersPage() {
  const list = $('#member-list');
  if (state.members.length === 0) {
    list.innerHTML = `<div class="empty-state-mini"><div class="icon">👥</div><h3>담당자가 없습니다</h3><p>오른쪽 위 "+ 담당자 추가" 버튼으로 멤버를 등록하세요.</p></div>`;
    return;
  }
  list.innerHTML = state.members.map(m => {
    const used = state.projects.filter(p => Array.isArray(p.assigneeIds) && p.assigneeIds.includes(m.id)).length;
    const isCurrent = state.settings.currentMemberId === m.id;
    return `
      <div class="member-card" data-member-id="${m.id}" style="--card-color: ${m.color};">
        <div class="member-card-head">
          <div class="member-avatar" style="background:linear-gradient(135deg, ${m.color}, color-mix(in srgb, ${m.color} 70%, #ec4899));">${escapeHtml(m.initial || getInitial(m.name))}</div>
          <div class="member-info">
            <div class="member-name">${escapeHtml(m.name)} ${isCurrent ? '<span style="font-size:10px;color:var(--c-indigo);font-weight:600;">· 현재 사용자</span>' : ''}</div>
            <div class="member-sub">담당 진행 건 ${used}개</div>
          </div>
          <div class="cat-actions">
            <button class="cat-action" data-action="edit" data-id="${m.id}">✏</button>
            <button class="cat-action danger" data-action="delete" data-id="${m.id}">🗑</button>
          </div>
        </div>
        <div class="member-color-bar"><span class="swatch"></span><span>이니셜 <strong style="color:var(--text);">${escapeHtml(m.initial || getInitial(m.name))}</strong> · 색상 <strong style="color:var(--text);">${m.color}</strong></span></div>
      </div>`;
  }).join('');
  $$('.member-card .cat-action[data-action="edit"]').forEach(b => b.addEventListener('click', (e) => { e.stopPropagation(); openMemberEditor(b.dataset.id); }));
  $$('.member-card .cat-action[data-action="delete"]').forEach(b => b.addEventListener('click', (e) => { e.stopPropagation(); deleteMemberWithConfirm(b.dataset.id); }));
}

function openMemberEditor(id = null) {
  const isEdit = !!id;
  const member = isEdit ? state.members.find(m => m.id === id) : { id: null, name: '', initial: '', color: COLOR_PALETTE[Math.floor(Math.random() * COLOR_PALETTE.length)] };
  if (!member) return;
  const html = `
    <div class="modal-header"><div class="modal-title-wrap"><div class="modal-title-icon">${isEdit ? '✏' : '+'}</div><div class="modal-title">${isEdit ? '담당자 편집' : '새 담당자'}</div></div><button class="icon-btn" data-close-modal>✕</button></div>
    <div class="modal-body">
      <div class="form-grid-2">
        <div class="form-row"><label class="form-label" for="mem-name">이름 <span style="color:var(--c-red);">*</span></label><input type="text" id="mem-name" class="form-input" maxlength="20" value="${escapeHtml(member.name)}" /></div>
        <div class="form-row"><label class="form-label" for="mem-initial">이니셜 <span class="form-hint">(자동/직접)</span></label><input type="text" id="mem-initial" class="form-input" maxlength="2" value="${escapeHtml(member.initial)}" /></div>
      </div>
      <div class="form-row"><label class="form-label">색상</label>${buildColorPalette(member.color)}</div>
      <div class="form-row"><label class="form-label">미리보기</label><div style="display:flex;align-items:center;gap:12px;padding:12px;background:var(--bg-2);border-radius:var(--radius);"><div id="mem-preview-avatar" style="width:48px;height:48px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;font-size:17px;font-weight:700;background:linear-gradient(135deg, ${member.color}, color-mix(in srgb, ${member.color} 70%, #ec4899));">${escapeHtml(member.initial || getInitial(member.name) || '?')}</div><div><div id="mem-preview-name" style="font-size:14px;font-weight:600;color:var(--text);">${escapeHtml(member.name || '이름 미입력')}</div><div style="font-size:11.5px;color:var(--text-muted);" id="mem-preview-color">${member.color}</div></div></div></div>
    </div>
    <div class="modal-footer"><div></div><div class="modal-footer-right"><button class="ghost-btn" data-close-modal>취소</button><button class="primary-btn" id="mem-save-btn">${isEdit ? '저장' : '추가'}</button></div></div>`;
  openModal(html);

  let chosenColor = member.color;
  const updatePreview = () => {
    const name = $('#mem-name').value.trim();
    const initial = $('#mem-initial').value.trim() || getInitial(name);
    $('#mem-preview-avatar').textContent = initial || '?';
    $('#mem-preview-avatar').style.background = `linear-gradient(135deg, ${chosenColor}, color-mix(in srgb, ${chosenColor} 70%, #ec4899))`;
    $('#mem-preview-name').textContent = name || '이름 미입력';
    $('#mem-preview-color').textContent = chosenColor;
  };
  $$('.color-swatch').forEach(sw => sw.addEventListener('click', () => {
    chosenColor = sw.dataset.color; $('#custom-color').value = chosenColor;
    $$('.color-swatch').forEach(x => x.classList.toggle('selected', x.dataset.color === chosenColor));
    updatePreview();
  }));
  $('#custom-color').addEventListener('input', (e) => { chosenColor = e.target.value; $$('.color-swatch').forEach(x => x.classList.remove('selected')); updatePreview(); });
  $('#mem-name').addEventListener('input', updatePreview);
  $('#mem-initial').addEventListener('input', updatePreview);

  $('#mem-save-btn').addEventListener('click', () => {
    const name = $('#mem-name').value.trim();
    if (!name) { showToast('이름을 입력해 주세요', 'warn'); return; }
    const initial = $('#mem-initial').value.trim() || getInitial(name);
    const data = { name, initial, color: chosenColor };
    if (isEdit) { Object.assign(member, data); showToast('담당자를 수정했습니다', 'success'); }
    else { state.members.push({ id: 'mem_' + uid(), ...data }); showToast('담당자를 추가했습니다', 'success'); }
    saveState(); closeModal(); renderMembersPage(); renderSidebar();
  });
  $('#mem-name').focus();
}

function deleteMemberWithConfirm(id) {
  const member = state.members.find(m => m.id === id);
  if (!member) return;
  const used = state.projects.filter(p => Array.isArray(p.assigneeIds) && p.assigneeIds.includes(id)).length;
  openConfirm({
    title: '담당자 삭제', message: `'${member.name}' 담당자를 삭제할까요?`,
    detail: used > 0 ? `이 담당자가 지정된 진행 건 <strong>${used}건</strong>의 담당자 목록에서 제거됩니다.` : `담당 중인 진행 건이 없어 안전하게 삭제됩니다.`,
    confirmText: '삭제', danger: true,
    onConfirm: () => {
      state.members = state.members.filter(m => m.id !== id);
      state.projects.forEach(p => { if (Array.isArray(p.assigneeIds)) p.assigneeIds = p.assigneeIds.filter(aid => aid !== id); });
      // 해당 멤버의 todos도 삭제
      state.todos = state.todos.filter(t => t.memberId !== id);
      if (state.settings.currentMemberId === id) { state.settings.currentMemberId = null; state.settings.myDashboard = false; }
      saveState(); renderMembersPage(); renderSidebar();
      showToast(`'${member.name}' 담당자를 삭제했습니다`, 'success');
    },
  });
}

/* ============ 설정 페이지 ============ */
function renderSettingsPage() {
  $('#data-summary').textContent = `진행 건 ${state.projects.length}건 · 정산 분류 ${state.categories.length}개 · 담당자 ${state.members.length}명 · 클라이언트 ${state.clients.length}개 · 투두 ${state.todos.length}개`;
  updateNotificationStatus();
  $$('#groupby-radios input').forEach(r => r.checked = r.value === state.settings.groupBy);
  $('#starred-on-top').checked = !!state.settings.showStarredOnTop;
}
function updateNotificationStatus() {
  const pill = $('#notification-status'); const btn = $('#request-notification-btn');
  if (!('Notification' in window)) { pill.textContent = '미지원'; pill.className = 'status-pill unsupported'; btn.disabled = true; return; }
  const p = Notification.permission;
  if (p === 'granted') { pill.textContent = '✓ 허용됨'; pill.className = 'status-pill granted'; btn.disabled = true; btn.textContent = '권한 허용 완료'; }
  else if (p === 'denied') { pill.textContent = '✕ 차단됨'; pill.className = 'status-pill denied'; btn.disabled = true; btn.textContent = '브라우저 설정에서 변경'; }
  else { pill.textContent = '미요청'; pill.className = 'status-pill default'; btn.disabled = false; btn.textContent = '권한 요청'; }
}
function requestNotificationPermission() {
  if (!('Notification' in window)) return;
  Notification.requestPermission().then(p => {
    state.settings.notifyAsked = true; saveState(); updateNotificationStatus();
    if (p === 'granted') { showToast('알림 권한이 허용되었습니다', 'success'); try { new Notification('민컴퍼니 워크스페이스', { body: '알림 정상 작동' }); } catch(e){} }
    else if (p === 'denied') showToast('알림 권한이 차단되었습니다', 'warn');
  });
}
function exportJson() {
  const data = { exportedAt: new Date().toISOString(), appVersion: APP_VERSION, ...state };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  a.href = url; a.download = `mincompany-workspace-${ts}.json`;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('백업 파일을 내려받았습니다', 'success');
}
function importJson(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      if (!data || typeof data !== 'object') throw new Error('형식이 올바르지 않습니다');
      const summary = `진행 건 ${(data.projects||[]).length}건 · 정산 분류 ${(data.categories||[]).length}개 · 담당자 ${(data.members||[]).length}명 · 투두 ${(data.todos||[]).length}개`;
      openConfirm({
        title: 'JSON 가져오기', message: '현재 데이터를 가져온 데이터로 교체합니다.',
        detail: `<strong>가져올 데이터:</strong><br />${summary}`,
        warning: '현재 워크스페이스의 모든 데이터가 덮어써집니다.', confirmText: '가져오기', danger: true,
        onConfirm: () => {
          if (Array.isArray(data.projects)) state.projects = data.projects;
          if (Array.isArray(data.categories) && data.categories.length) state.categories = data.categories;
          if (Array.isArray(data.workflows) && data.workflows.length) state.workflows = data.workflows;
          if (Array.isArray(data.members)) state.members = data.members;
          if (Array.isArray(data.clients)) state.clients = data.clients;
          if (Array.isArray(data.todos)) state.todos = data.todos;
          if (data.settings) state.settings = { ...state.settings, ...data.settings };
          // 마이그레이션 재실행
          migrateColors(); migrateAddMonthlyCategory(); migrateWorkType(); migrateDemoData();
          saveState(); applyTheme(); renderSidebar(); renderSettingsPage();
          showToast('데이터를 가져왔습니다', 'success');
        },
      });
    } catch (e) { console.error(e); showToast('가져오기 실패: ' + e.message, 'danger'); }
  };
  reader.readAsText(file);
}
function resetDataWithConfirm() {
  openConfirm({
    title: '데이터 초기화 (1/2)', message: '정말 모든 데이터를 초기화할까요?',
    detail: `진행 건 <strong>${state.projects.length}건</strong>, 정산 분류 <strong>${state.categories.length}개</strong>, 담당자 <strong>${state.members.length}명</strong>, 투두 <strong>${state.todos.length}개</strong>가 모두 삭제됩니다.`,
    warning: '이 작업은 되돌릴 수 없습니다. 백업이 필요하면 먼저 "JSON 내보내기"를 눌러주세요.',
    confirmText: '계속', danger: true,
    onConfirm: () => {
      setTimeout(() => {
        openConfirm({
          title: '데이터 초기화 (2/2)', message: '마지막 확인입니다.',
          detail: '아래 버튼을 누르면 즉시 모든 데이터가 삭제되고 페이지가 새로 고쳐집니다.',
          confirmText: '삭제 확정', danger: true,
          onConfirm: () => {
            localStorage.removeItem(STORAGE_KEY);
            showToast('데이터를 초기화했습니다. 새로고침 중...', 'warn');
            setTimeout(() => location.reload(), 800);
          },
        });
      }, 200);
    },
  });
}

/* ============ 카드 드래그 ============ */
let dragSrcEl = null;
function setupCardDrag(container, cardSelector, dataAttr, onReorder) {
  const cards = $$(cardSelector, container);
  cards.forEach(card => {
    card.addEventListener('dragstart', (e) => {
      dragSrcEl = card; card.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', card.dataset[dataAttrToCamel(dataAttr)]);
    });
    card.addEventListener('dragend', () => { card.classList.remove('dragging'); cards.forEach(c => c.classList.remove('drag-over')); dragSrcEl = null; });
    card.addEventListener('dragover', (e) => { if (!dragSrcEl || dragSrcEl === card) return; e.preventDefault(); e.dataTransfer.dropEffect = 'move'; card.classList.add('drag-over'); });
    card.addEventListener('dragleave', () => card.classList.remove('drag-over'));
    card.addEventListener('drop', (e) => {
      e.preventDefault(); card.classList.remove('drag-over');
      if (!dragSrcEl || dragSrcEl === card) return;
      const rect = card.getBoundingClientRect();
      const after = (e.clientY - rect.top) > rect.height / 2;
      if (after) card.parentNode.insertBefore(dragSrcEl, card.nextSibling);
      else card.parentNode.insertBefore(dragSrcEl, card);
      const newOrder = $$(cardSelector, container).map(c => c.dataset[dataAttrToCamel(dataAttr)]);
      onReorder(newOrder);
    });
  });
}
function dataAttrToCamel(attr) { return attr.replace(/-([a-z])/g, (_, c) => c.toUpperCase()); }

/* ============ 이벤트 바인딩 ============ */
function bindEvents() {
  $$('.menu-item').forEach(el => el.addEventListener('click', () => navigate(el.dataset.route)));
  $('#theme-toggle').addEventListener('click', toggleTheme);
  $('#menu-toggle').addEventListener('click', openSidebar);
  $('#sidebar-close').addEventListener('click', closeSidebar);
  $('#sidebar-overlay').addEventListener('click', closeSidebar);

  $('#current-user-select').addEventListener('change', (e) => {
    state.settings.currentMemberId = e.target.value || null;
    if (!state.settings.currentMemberId) state.settings.myDashboard = false;
    saveState(); renderUserSelector();
    if (!$('[data-page="board"]').classList.contains('hidden')) renderBoardPage();
    if (!$('[data-page="my"]').classList.contains('hidden')) renderMyDashboard();
  });
  $('#my-dashboard-toggle').addEventListener('click', () => {
    if (!state.settings.currentMemberId) return;
    state.settings.myDashboard = !state.settings.myDashboard;
    saveState(); renderUserSelector();
    if (!$('[data-page="board"]').classList.contains('hidden')) renderBoardPage();
    showToast(state.settings.myDashboard ? '내 대시보드 ON' : '내 대시보드 OFF', 'success');
  });

  $('#add-category-btn').addEventListener('click', () => openCategoryEditor(null));
  $('#add-member-btn').addEventListener('click', () => openMemberEditor(null));

  $('#export-btn').addEventListener('click', exportJson);
  $('#import-btn').addEventListener('click', () => $('#import-file').click());
  $('#import-file').addEventListener('change', (e) => { if (e.target.files[0]) importJson(e.target.files[0]); e.target.value = ''; });
  $('#request-notification-btn').addEventListener('click', requestNotificationPermission);
  $('#reset-data-btn').addEventListener('click', resetDataWithConfirm);
  $$('#groupby-radios input').forEach(r => r.addEventListener('change', (e) => {
    state.settings.groupBy = e.target.value; saveState();
    showToast(`기본 그룹화: ${GROUP_MODES[e.target.value].name}`, 'success');
  }));
  $('#starred-on-top').addEventListener('change', (e) => { state.settings.showStarredOnTop = e.target.checked; saveState(); });

  $('#empty-create-btn').addEventListener('click', () => showToast(SOON_MESSAGES.create, 'info-soft'));
  $('#empty-demo-btn').addEventListener('click', () => {
    addDemoData(); renderBoardPage(); renderSidebar();
    showToast('데모 데이터를 추가했습니다 (클라이언트 3·진행 건 4·투두 5)', 'success');
  });

  $('#groupby-select').addEventListener('change', (e) => { state.settings.groupBy = e.target.value; saveState(); renderBoardPage(); });
  $('#sort-select').addEventListener('change', (e) => { state.settings.sortBy = e.target.value; saveState(); renderBoardPage(); });
  $('#starred-only-btn').addEventListener('click', () => {
    state.settings.starredOnly = !state.settings.starredOnly; saveState(); renderBoardPage();
    showToast(state.settings.starredOnly ? '별표 항목만 표시' : '전체 표시', 'success');
  });
  $('#board-search').addEventListener('input', (e) => {
    state.settings.boardSearch = e.target.value;
    $('#search-clear').classList.toggle('hidden', !e.target.value);
    saveState(); renderBoardPage();
  });
  $('#search-clear').addEventListener('click', () => {
    state.settings.boardSearch = ''; $('#board-search').value = '';
    $('#search-clear').classList.add('hidden'); saveState(); renderBoardPage();
  });
  $('#reset-board-filters').addEventListener('click', () => {
    state.settings.starredOnly = false; state.settings.boardSearch = ''; state.settings.filters.clientId = '';
    saveState(); renderBoardPage(); renderSidebar();
    showToast('필터를 초기화했습니다', 'success');
  });
  $('#clear-demo-btn').addEventListener('click', () => {
    openConfirm({
      title: '데모 데이터 비우기', message: '데모 데이터를 모두 삭제할까요?',
      detail: '클라이언트 3 + 진행 건 4 + 투두 5가 삭제됩니다. 본인이 직접 만든 데이터는 그대로 유지됩니다.',
      confirmText: '비우기', danger: true,
      onConfirm: () => {
        clearDemoData();
        if (!$('[data-page="board"]').classList.contains('hidden')) renderBoardPage();
        if (!$('[data-page="my"]').classList.contains('hidden')) renderMyDashboard();
        renderSidebar();
        showToast('데모 데이터를 비웠습니다', 'success');
      },
    });
  });

  $$('.view-btn').forEach(b => b.addEventListener('click', () => {
    if (b.dataset.soonAction !== undefined) {
      showToast(SOON_MESSAGES[b.dataset.view] || SOON_MESSAGES.default, 'info-soft');
      return;
    }
    $$('.view-btn').forEach(x => x.classList.toggle('active', x === b));
  }));

  // 빠른 투두 추가
  $('#todo-quick-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const v = e.target.value.trim();
      if (!v) return;
      if (!state.settings.currentMemberId) { showToast('먼저 사이드바에서 사용자를 선택해 주세요', 'warn'); return; }
      addTodo(v, $('#todo-quick-group').value || 'today');
      e.target.value = '';
      renderMyDashboard();
      showToast('투두를 추가했습니다', 'success');
    }
  });

  // 비활성 액션 위임
  document.addEventListener('click', (e) => {
    const t = e.target.closest('[data-soon-action]');
    if (t && !t.classList.contains('view-btn')) {
      e.preventDefault(); e.stopPropagation();
      showToast(SOON_MESSAGES.create, 'info-soft');
    }
  });

  $('#modal').addEventListener('click', (e) => {
    if (e.target.matches('[data-close-modal]') || e.target.closest('[data-close-modal]')) closeModal();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (!$('#modal').classList.contains('hidden')) closeModal();
      else closeSidebar();
    }
  });
}

function init() {
  loadState();
  applyTheme();
  bindEvents();
  renderSidebar();
  navigate('board');

  console.log(
    '%c민컴퍼니 워크스페이스 v2 — workType + 내 대시보드 (T4b)',
    'background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;padding:6px 12px;border-radius:6px;font-weight:700;'
  );
  console.log('진행 건:', state.projects.length, '· 정산 분류:', state.categories.length, '· 멤버:', state.members.length, '· 투두:', state.todos.length);
}

document.addEventListener('DOMContentLoaded', init);
