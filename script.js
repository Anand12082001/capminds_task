/* ================================================
   CAPMINDS — script.js
   Responsive Appointment Scheduler
   Pure Vanilla JS — No Libraries
   ================================================ */
'use strict';

// ================================================
//  STATE
// ================================================
const STATE = {
  appointments: [],
  filtered: [],
  currentYear: 0,
  currentMonth: 0,
  selectedDate: null,
  editingId: null,
  pendingDeleteId: null,
  sidebarCollapsed: false,   // desktop collapse
  sidebarOpen: false,        // mobile/tablet drawer
  dashPatientQ: '',
  dashDoctorQ: '',
  dashDateStart: '',
  dashDateEnd: '',
};

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December'
];

// ================================================
//  UTILS
// ================================================
const $ = id => document.getElementById(id);
const uid = () => 'a_' + Date.now() + '_' + Math.floor(Math.random() * 99999);

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
}

function pad(n) { return String(n).padStart(2,'0'); }

function formatDisplayDate(dateStr) {
  if (!dateStr) return '';
  const [y,m,d] = dateStr.split('-');
  return `${pad(+d)}/${pad(+m)}/${y}`;
}

function formatTimeRange(timeStr) {
  if (!timeStr) return '';
  const [h, min] = timeStr.split(':');
  const hr = parseInt(h,10);
  const h12 = hr % 12 || 12;
  const ampm = hr >= 12 ? 'PM' : 'AM';
  return `${h12}:${min} ${ampm}`;
}

function formatTimePill(timeStr) {
  if (!timeStr) return '';
  const [h, min] = timeStr.split(':');
  const hr = parseInt(h,10);
  const h12 = hr % 12 || 12;
  const ampm = hr >= 12 ? 'pm' : 'am';
  return `${h12}:${min} ${ampm}`;
}

function escHtml(s) {
  return String(s || '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

// ================================================
//  STORAGE
// ================================================
function loadStorage() {
  try { return JSON.parse(localStorage.getItem('capminds_appts') || '[]'); }
  catch { return []; }
}

function saveStorage() {
  try { localStorage.setItem('capminds_appts', JSON.stringify(STATE.appointments)); }
  catch { /* in-memory fallback */ }
}

// ================================================
//  INIT
// ================================================
function init() {
  STATE.appointments = loadStorage();
  const now = new Date();
  STATE.currentYear  = now.getFullYear();
  STATE.currentMonth = now.getMonth();
  STATE.selectedDate = todayStr();

  if (STATE.appointments.length === 0) seedData();

  renderCalendar();
  renderDashboard();
  bindEvents();
}

// ================================================
//  SEED DATA
// ================================================
function seedData() {
  const today = todayStr();
  const [y, m, d] = today.split('-').map(Number);

  const offset = n => {
    const dt = new Date(y, m-1, d + n);
    return `${dt.getFullYear()}-${pad(dt.getMonth()+1)}-${pad(dt.getDate())}`;
  };

  STATE.appointments = [
    { id: uid(), patientName:'Henry James',   doctorName:'James Marry', hospitalName:'Salus Center (General Hospital)',  specialty:'Dermatology',   apptDate: offset(0),  apptTime:'09:00', reason:'Skin check-up',       status:'Arrived' },
    { id: uid(), patientName:'Henry James',   doctorName:'James Marry', hospitalName:'Ultracare (General Hospital)',     specialty:'Dermatology',   apptDate: offset(0),  apptTime:'12:00', reason:'Follow-up visit',      status:'Scheduled' },
    { id: uid(), patientName:'Sarah Connor',  doctorName:'James Marry', hospitalName:'Apollo Hospitals',                specialty:'Cardiology',    apptDate: offset(2),  apptTime:'10:30', reason:'ECG review',           status:'Scheduled' },
    { id: uid(), patientName:'Ravi Shankar',  doctorName:'James Marry', hospitalName:'Kauvery Hospital',                specialty:'Orthopedics',   apptDate: offset(4),  apptTime:'14:00', reason:'Knee pain',            status:'Scheduled' },
  ];
  saveStorage();
}

// ================================================
//  CALENDAR RENDER
// ================================================
function renderCalendar() {
  const { currentYear: y, currentMonth: m } = STATE;
  const now = new Date();

  // Date label
  $('calDateLabel').textContent = `${MONTHS[m]} ${now.getDate()}, ${y}`;

  // Highlight today's weekday column header
  const todayDow = new Date(todayStr() + 'T00:00:00').getDay();
  document.querySelectorAll('.cal-weekday').forEach((el, i) => {
    el.classList.toggle('cal-weekday--today', i === todayDow);
  });

  const grid = $('calGrid');
  grid.innerHTML = '';

  const firstDay     = new Date(y, m, 1).getDay();
  const daysInMonth  = new Date(y, m+1, 0).getDate();
  const prevDays     = new Date(y, m, 0).getDate();

  // Build appointment lookup
  const apptMap = {};
  STATE.appointments.forEach(a => {
    (apptMap[a.apptDate] = apptMap[a.apptDate] || []).push(a);
  });

  // Prev-month trailing cells
  for (let i = firstDay - 1; i >= 0; i--) {
    const day  = prevDays - i;
    const mo   = m === 0 ? 11 : m-1;
    const yr   = m === 0 ? y-1 : y;
    grid.appendChild(makeCell(day, `${yr}-${pad(mo+1)}-${pad(day)}`, true, apptMap));
  }

  // Current-month cells
  for (let d = 1; d <= daysInMonth; d++) {
    grid.appendChild(makeCell(d, `${y}-${pad(m+1)}-${pad(d)}`, false, apptMap));
  }

  // Next-month leading cells (fill to complete last row)
  const total     = grid.children.length;
  const remaining = total % 7 === 0 ? 0 : 7 - (total % 7);
  for (let d = 1; d <= remaining; d++) {
    const mo = m === 11 ? 0  : m+1;
    const yr = m === 11 ? y+1 : y;
    grid.appendChild(makeCell(d, `${yr}-${pad(mo+1)}-${pad(d)}`, true, apptMap));
  }
}

function makeCell(day, dateStr, isOther, apptMap) {
  const cell = document.createElement('div');
  cell.className = 'cal-cell';
  cell.dataset.date = dateStr;
  cell.setAttribute('role', 'gridcell');

  if (isOther)                      cell.classList.add('cal-cell--other-month');
  if (dateStr === todayStr())       cell.classList.add('cal-cell--today');
  if (dateStr === STATE.selectedDate) cell.classList.add('cal-cell--selected');

  // Day number label — show "Mon 1" for first day of month
  const dayEl = document.createElement('div');
  dayEl.className = 'cal-cell__day';
  const [,, dd] = dateStr.split('-');
  if (parseInt(dd) === 1) {
    const mo = new Date(dateStr + 'T12:00:00').toLocaleString('en-US', { month:'short' });
    dayEl.textContent = `${mo} 1`;
    dayEl.style.width = 'auto';
    dayEl.style.fontSize = '0.62rem';
    dayEl.style.padding = '0 2px';
  } else {
    dayEl.textContent = day;
  }
  cell.appendChild(dayEl);

  // Appointment pills
  const cellAppts = (apptMap[dateStr] || []).slice().sort((a,b) => a.apptTime.localeCompare(b.apptTime));
  if (cellAppts.length > 0) {
    const list = document.createElement('div');
    list.className = 'cal-appt-list';
    cellAppts.forEach(a => list.appendChild(makePill(a)));
    cell.appendChild(list);
  }

  cell.addEventListener('click', () => {
    document.querySelectorAll('.cal-cell--selected').forEach(c => c.classList.remove('cal-cell--selected'));
    STATE.selectedDate = dateStr;
    cell.classList.add('cal-cell--selected');
  });

  return cell;
}

function makePill(a) {
  const pill = document.createElement('div');
  pill.className = 'cal-appt-pill';

  pill.innerHTML = `
    <div class="cal-appt-pill__text">
      <span>&#8593;</span>
      <span>${escHtml(a.patientName)} (${escHtml(a.status || 'Scheduled')}) ${formatTimePill(a.apptTime)}</span>
    </div>
    <div class="cal-appt-pill__actions">
      <button class="cal-pill-btn" title="Edit"
        onclick="event.stopPropagation(); openEditModal('${a.id}')">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
        </svg>
      </button>
      <button class="cal-pill-btn" title="Delete"
        onclick="event.stopPropagation(); openDeleteConfirm('${a.id}')">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
          <polyline points="3 6 5 6 21 6"/>
          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
        </svg>
      </button>
      <button class="cal-pill-btn" title="Copy"
        onclick="event.stopPropagation(); copyAppt('${a.id}')">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
          <rect x="9" y="9" width="13" height="13" rx="2"/>
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
        </svg>
      </button>
    </div>
  `;
  return pill;
}

// ================================================
//  DASHBOARD
// ================================================
function renderDashboard() { applyDashFilters(); }

function applyDashFilters() {
  const pQ = STATE.dashPatientQ.toLowerCase().trim();
  const dQ = STATE.dashDoctorQ.toLowerCase().trim();
  const ds = STATE.dashDateStart;
  const de = STATE.dashDateEnd;

  STATE.filtered = STATE.appointments.filter(a => {
    return (!pQ || a.patientName.toLowerCase().includes(pQ))
        && (!dQ || a.doctorName.toLowerCase().includes(dQ))
        && (!ds || a.apptDate >= ds)
        && (!de || a.apptDate <= de);
  }).sort((a,b) => (a.apptDate + a.apptTime).localeCompare(b.apptDate + b.apptTime));

  renderTable();
}

function renderTable() {
  const tbody = $('apptTableBody');
  const EMPTY_ROWS = 8;
  let html = '';

  STATE.filtered.forEach(a => {
    html += `
      <tr>
        <td class="td-patient">${escHtml(a.patientName)}</td>
        <td class="td-doctor">${escHtml(a.doctorName)}</td>
        <td>${escHtml(a.hospitalName)}</td>
        <td>${escHtml(a.specialty)}</td>
        <td>${formatDisplayDate(a.apptDate)}</td>
        <td class="td-time">${formatTimeRange(a.apptTime)}</td>
        <td>
          <div class="td-actions">
            <button class="action-btn action-btn--edit" onclick="openEditModal('${a.id}')" title="Edit" aria-label="Edit appointment">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </button>
            <button class="action-btn action-btn--delete" onclick="openDeleteConfirm('${a.id}')" title="Delete" aria-label="Delete appointment">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                <path d="M10 11v6"/><path d="M14 11v6"/>
              </svg>
            </button>
          </div>
        </td>
      </tr>`;
  });

  // Fill empty rows to match design
  const empties = Math.max(0, EMPTY_ROWS - STATE.filtered.length);
  for (let i = 0; i < empties; i++) {
    html += `<tr class="empty-row"><td colspan="7"></td></tr>`;
  }

  tbody.innerHTML = html;
}

// ================================================
//  SIDEBAR — Mobile/tablet drawer
// ================================================
function openSidebar() {
  STATE.sidebarOpen = true;
  const sb = $('sidebar');
  const bd = $('sidebarBackdrop');
  const btn = $('menuBtn');
  sb.classList.add('is-open');
  bd.classList.add('is-visible');
  btn.classList.add('is-active');
  btn.setAttribute('aria-expanded', 'true');
  document.body.style.overflow = 'hidden'; // prevent page scroll
}

function closeSidebar() {
  STATE.sidebarOpen = false;
  const sb = $('sidebar');
  const bd = $('sidebarBackdrop');
  const btn = $('menuBtn');
  sb.classList.remove('is-open');
  bd.classList.remove('is-visible');
  btn.classList.remove('is-active');
  btn.setAttribute('aria-expanded', 'false');
  // Only restore scroll if no modal is open
  if ($('modalOverlay').hidden && $('deleteOverlay').hidden) {
    document.body.style.overflow = '';
  }
}

// Desktop collapse toggle
function toggleDesktopCollapse() {
  STATE.sidebarCollapsed = !STATE.sidebarCollapsed;
  $('sidebar').classList.toggle('collapsed', STATE.sidebarCollapsed);
  $('toggleArrows').innerHTML = STATE.sidebarCollapsed ? '&#187;' : '&#171;';
}

// ================================================
//  PAGE NAVIGATION
// ================================================
function showPage(page) {
  $('pageCalendar').hidden  = page !== 'calendar';
  $('pageDashboard').hidden = page !== 'dashboard';

  document.querySelectorAll('.sidebar__item').forEach(el => {
    el.classList.toggle('sidebar__item--active', el.dataset.page === page);
  });

  // Close sidebar on mobile after navigation
  if (window.innerWidth < 1024) closeSidebar();
}

// ================================================
//  MODAL — open/close
// ================================================
function openAddModal() {
  STATE.editingId = null;
  $('apptForm').reset();
  $('editId').value = '';
  $('apptDate').value = todayStr();
  $('modalTitle').textContent = 'Schedule Appointment';
  $('submitBtn').textContent  = 'Save';
  clearErrors();
  showModal($('modalOverlay'));
}

window.openEditModal = function(id) {
  const a = STATE.appointments.find(x => x.id === id);
  if (!a) return;
  STATE.editingId   = id;
  $('editId').value = id;
  $('patientName').value  = a.patientName;
  $('doctorName').value   = a.doctorName;
  $('hospitalName').value = a.hospitalName;
  $('specialty').value    = a.specialty;
  $('apptDate').value     = a.apptDate;
  $('apptTime').value     = a.apptTime;
  $('reason').value       = a.reason;
  $('modalTitle').textContent = 'Edit Appointment';
  $('submitBtn').textContent  = 'Update';
  clearErrors();
  showModal($('modalOverlay'));
};

function closeModal() {
  hideModal($('modalOverlay'));
  STATE.editingId = null;
}

function showModal(el) {
  el.hidden = false;
  document.body.style.overflow = 'hidden';
}

function hideModal(el) {
  el.hidden = true;
  if ($('modalOverlay').hidden && $('deleteOverlay').hidden && !STATE.sidebarOpen) {
    document.body.style.overflow = '';
  }
}

// ================================================
//  DELETE
// ================================================
window.openDeleteConfirm = function(id) {
  STATE.pendingDeleteId = id;
  showModal($('deleteOverlay'));
};

function confirmDelete() {
  if (!STATE.pendingDeleteId) return;
  STATE.appointments = STATE.appointments.filter(a => a.id !== STATE.pendingDeleteId);
  saveStorage();
  STATE.pendingDeleteId = null;
  hideModal($('deleteOverlay'));
  renderCalendar();
  renderDashboard();
  showToast('Appointment deleted.', 'success');
}

// ================================================
//  COPY
// ================================================
window.copyAppt = function(id) {
  const a = STATE.appointments.find(x => x.id === id);
  if (!a) return;
  const copy = { ...a, id: uid() };
  STATE.appointments.push(copy);
  saveStorage();
  renderCalendar();
  renderDashboard();
  showToast('Appointment copied.', 'info');
};

// ================================================
//  FORM VALIDATION & SUBMIT
// ================================================
const FIELDS = ['patientName','doctorName','hospitalName','specialty','apptDate','apptTime','reason'];
const LABELS = {
  patientName:'Patient Name', doctorName:'Doctor Name', hospitalName:'Hospital Name',
  specialty:'Specialty', apptDate:'Date', apptTime:'Time', reason:'Reason'
};

function validate() {
  clearErrors();
  let ok = true;
  FIELDS.forEach(f => {
    const el = $(f);
    if (!el || !el.value.trim()) {
      showErr(f, `${LABELS[f]} is required`);
      if (ok) el && el.focus();
      ok = false;
    }
  });
  return ok;
}

function showErr(f, msg) {
  const errEl = $('err-' + f);
  if (errEl) errEl.textContent = msg;
  const inp = $(f);
  if (!inp) return;
  const wrap = inp.closest('.field-wrap');
  if (wrap) wrap.classList.add('field-wrap--error');
  else      inp.classList.add('reason-input--error');
}

function clearErrors() {
  FIELDS.forEach(f => {
    const errEl = $('err-' + f);
    if (errEl) errEl.textContent = '';
    const inp = $(f);
    if (!inp) return;
    const wrap = inp.closest('.field-wrap');
    if (wrap) wrap.classList.remove('field-wrap--error');
    else      inp.classList.remove('reason-input--error');
  });
}

function handleSubmit(e) {
  e.preventDefault();
  if (!validate()) return;

  const data = {
    patientName:  $('patientName').value.trim(),
    doctorName:   $('doctorName').value.trim(),
    hospitalName: $('hospitalName').value.trim(),
    specialty:    $('specialty').value,
    apptDate:     $('apptDate').value,
    apptTime:     $('apptTime').value,
    reason:       $('reason').value.trim(),
  };

  if (STATE.editingId) {
    const idx = STATE.appointments.findIndex(a => a.id === STATE.editingId);
    if (idx !== -1) {
      STATE.appointments[idx] = { ...STATE.appointments[idx], ...data };
    }
    showToast('Appointment updated!', 'success');
  } else {
    STATE.appointments.push({ id: uid(), status: 'Scheduled', ...data });
    showToast('Appointment booked!', 'success');
  }

  saveStorage();
  closeModal();

  // Navigate calendar to appointment's month
  const [yr, mo] = data.apptDate.split('-').map(Number);
  STATE.currentYear  = yr;
  STATE.currentMonth = mo - 1;
  STATE.selectedDate = data.apptDate;

  renderCalendar();
  renderDashboard();
}

// ================================================
//  TOAST
// ================================================
function showToast(msg, type = 'success') {
  const container = $('toastContainer');
  const t = document.createElement('div');
  t.className = `toast toast--${type}`;

  const icon = type === 'success'
    ? '<polyline points="20 6 9 17 4 12"/>'
    : '<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/>';

  t.innerHTML = `
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">${icon}</svg>
    <span>${escHtml(msg)}</span>
  `;

  container.appendChild(t);
  setTimeout(() => {
    t.classList.add('out');
    setTimeout(() => t.remove(), 220);
  }, 3000);
}

// ================================================
//  BIND ALL EVENTS
// ================================================
function bindEvents() {

  /* ---- Header ---- */
  $('openModalBtn').addEventListener('click', openAddModal);

  // Hamburger: mobile/tablet
  $('menuBtn').addEventListener('click', () => {
    STATE.sidebarOpen ? closeSidebar() : openSidebar();
  });

  // Backdrop tap: close drawer
  $('sidebarBackdrop').addEventListener('click', closeSidebar);

  /* ---- Sidebar ---- */
  // Desktop collapse toggle
  $('sidebarToggle').addEventListener('click', toggleDesktopCollapse);

  // Nav links
  $('navCalendar').addEventListener('click', e => { e.preventDefault(); showPage('calendar'); });
  $('navDashboard').addEventListener('click', e => {
    e.preventDefault();
    showPage('dashboard');
    renderDashboard();
  });

  /* ---- Calendar nav ---- */
  $('calPrev').addEventListener('click', () => {
    if (--STATE.currentMonth < 0) { STATE.currentMonth = 11; STATE.currentYear--; }
    renderCalendar();
  });

  $('calNext').addEventListener('click', () => {
    if (++STATE.currentMonth > 11) { STATE.currentMonth = 0; STATE.currentYear++; }
    renderCalendar();
  });

  $('calTodayBtn').addEventListener('click', () => {
    const now = new Date();
    STATE.currentYear  = now.getFullYear();
    STATE.currentMonth = now.getMonth();
    STATE.selectedDate = todayStr();
    renderCalendar();
  });

  /* ---- Modal ---- */
  $('closeModalBtn').addEventListener('click', closeModal);
  $('cancelModalBtn').addEventListener('click', closeModal);
  $('modalOverlay').addEventListener('click', e => {
    if (e.target === $('modalOverlay')) closeModal();
  });
  $('apptForm').addEventListener('submit', handleSubmit);

  // Clear errors on input
  FIELDS.forEach(f => {
    const el = $(f);
    if (!el) return;
    el.addEventListener('input', () => {
      const errEl = $('err-' + f);
      if (errEl) errEl.textContent = '';
      const wrap = el.closest('.field-wrap');
      if (wrap) wrap.classList.remove('field-wrap--error');
      else      el.classList.remove('reason-input--error');
    });
  });

  /* ---- Delete modal ---- */
  $('closeDeleteBtn').addEventListener('click', () => { hideModal($('deleteOverlay')); STATE.pendingDeleteId = null; });
  $('cancelDeleteBtn').addEventListener('click', () => { hideModal($('deleteOverlay')); STATE.pendingDeleteId = null; });
  $('confirmDeleteBtn').addEventListener('click', confirmDelete);
  $('deleteOverlay').addEventListener('click', e => {
    if (e.target === $('deleteOverlay')) { hideModal($('deleteOverlay')); STATE.pendingDeleteId = null; }
  });

  /* ---- Dashboard filters ---- */
  $('dashPatientSearch').addEventListener('input', e => { STATE.dashPatientQ = e.target.value; applyDashFilters(); });
  $('dashDoctorSearch').addEventListener('input',  e => { STATE.dashDoctorQ  = e.target.value; applyDashFilters(); });

  $('dashUpdateBtn').addEventListener('click', () => {
    STATE.dashPatientQ  = $('dashPatientSearch').value;
    STATE.dashDoctorQ   = $('dashDoctorSearch').value;
    STATE.dashDateStart = $('dashDateStart').value;
    STATE.dashDateEnd   = $('dashDateEnd').value;
    applyDashFilters();
    showToast('Filters applied.', 'info');
  });

  /* ---- Keyboard ---- */
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      if (!$('modalOverlay').hidden)  closeModal();
      if (!$('deleteOverlay').hidden) { hideModal($('deleteOverlay')); STATE.pendingDeleteId = null; }
      if (STATE.sidebarOpen && window.innerWidth < 1024) closeSidebar();
    }
  });

  /* ---- Handle window resize: auto-close drawer on desktop ---- */
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (window.innerWidth >= 1024 && STATE.sidebarOpen) {
        closeSidebar();
      }
    }, 150);
  });
}

// ================================================
//  BOOT
// ================================================
document.addEventListener('DOMContentLoaded', init);
