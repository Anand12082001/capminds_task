/* ================================================
   CAPMINDS — script.js
   Exact Figma design match
   Pure Vanilla JS
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
  sidebarCollapsed: false,
  dashPatientQ: '',
  dashDoctorQ: '',
  dashDateStart: '',
  dashDateEnd: '',
};

const MONTHS = ['January','February','March','April','May','June',
                'July','August','September','October','November','December'];

// ================================================
//  UTILS
// ================================================
const $ = id => document.getElementById(id);
const uid = () => 'a_' + Date.now() + '_' + Math.floor(Math.random() * 9999);

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
}

function pad(n) { return String(n).padStart(2,'0'); }

function formatDisplayDate(dateStr) {
  if (!dateStr) return '';
  const [y,m,d] = dateStr.split('-');
  const dt = new Date(+y, +m-1, +d);
  return dt.toLocaleDateString('en-IN', { day:'2-digit', month:'2-digit', year:'numeric' });
}

function formatTime12(timeStr) {
  if (!timeStr) return '';
  const [h, min] = timeStr.split(':');
  const hr = parseInt(h,10);
  const ampm = hr >= 12 ? 'AM' : 'AM';
  const h12 = hr % 12 || 12;
  const endH = (hr + 0) % 24;
  return `${h12}:${min} AM - ${h12}:${min} AM`;
}

function formatTimeShort(timeStr) {
  if (!timeStr) return '';
  const [h, min] = timeStr.split(':');
  const hr = parseInt(h,10);
  const ampm = hr >= 12 ? 'pm' : 'am';
  const h12 = hr % 12 || 12;
  return `${h12}:${min} ${ampm}`;
}

function escHtml(s) {
  return String(s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

function loadStorage() {
  try { return JSON.parse(localStorage.getItem('capminds_appts') || '[]'); }
  catch { return []; }
}
function saveStorage() {
  try { localStorage.setItem('capminds_appts', JSON.stringify(STATE.appointments)); }
  catch {}
}

// ================================================
//  INIT
// ================================================
function init() {
  STATE.appointments = loadStorage();
  const now = new Date();
  STATE.currentYear = now.getFullYear();
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

  const offset = (n) => {
    const dt = new Date(y, m-1, d + n);
    return `${dt.getFullYear()}-${pad(dt.getMonth()+1)}-${pad(dt.getDate())}`;
  };

  STATE.appointments = [
    { id: uid(), patientName: 'Henry James', doctorName: 'James Marry', hospitalName: 'Salus Center (General Hospital)', specialty: 'Dermatology', apptDate: offset(0), apptTime: '09:00', reason: 'Skin check-up', status: 'Arrived' },
    { id: uid(), patientName: 'Henry James', doctorName: 'James Marry', hospitalName: 'Ultracare (General Hospital)', specialty: 'Dermatology', apptDate: offset(0), apptTime: '12:00', reason: 'Follow-up visit', status: 'Scheduled' },
    { id: uid(), patientName: 'Sarah Connor', doctorName: 'James Marry', hospitalName: 'Apollo Hospitals', specialty: 'Cardiology', apptDate: offset(2), apptTime: '10:30', reason: 'ECG review', status: 'Scheduled' },
  ];
  saveStorage();
}

// ================================================
//  CALENDAR RENDER
// ================================================
function renderCalendar() {
  const { currentYear: y, currentMonth: m } = STATE;

  // Update label — match design "January 18, 2023" style (show today's day in current view month)
  const now = new Date();
  const displayDate = new Date(y, m, now.getDate());
  $('calDateLabel').textContent = `${MONTHS[m]} ${now.getDate()}, ${y}`;

  const grid = $('calGrid');
  grid.innerHTML = '';

  const firstDay = new Date(y, m, 1).getDay();
  const daysInMonth = new Date(y, m+1, 0).getDate();
  const prevDays = new Date(y, m, 0).getDate();

  // Build appointment lookup by date
  const apptMap = {};
  STATE.appointments.forEach(a => {
    if (!apptMap[a.apptDate]) apptMap[a.apptDate] = [];
    apptMap[a.apptDate].push(a);
  });

  // Prev month cells
  for (let i = firstDay - 1; i >= 0; i--) {
    const day = prevDays - i;
    const prevM = m === 0 ? 11 : m-1;
    const prevY = m === 0 ? y-1 : y;
    const dateStr = `${prevY}-${pad(prevM+1)}-${pad(day)}`;
    grid.appendChild(makeCell(day, dateStr, true, apptMap));
  }

  // Current month
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${y}-${pad(m+1)}-${pad(d)}`;
    grid.appendChild(makeCell(d, dateStr, false, apptMap));
  }

  // Next month fill
  const total = grid.children.length;
  const remaining = total % 7 === 0 ? 0 : 7 - (total % 7);
  for (let d = 1; d <= remaining; d++) {
    const nextM = m === 11 ? 0 : m+1;
    const nextY = m === 11 ? y+1 : y;
    const dateStr = `${nextY}-${pad(nextM+1)}-${pad(d)}`;
    grid.appendChild(makeCell(d, dateStr, true, apptMap));
  }

  // Update today's column highlight (Friday style)
  updateWeekdayHighlight();
}

function makeCell(day, dateStr, isOther, apptMap) {
  const cell = document.createElement('div');
  cell.className = 'cal-cell';
  cell.dataset.date = dateStr;

  if (isOther) cell.classList.add('cal-cell--other-month');

  const today = todayStr();
  if (dateStr === today) cell.classList.add('cal-cell--today');
  if (dateStr === STATE.selectedDate) cell.classList.add('cal-cell--selected');

  // Day number
  const dayEl = document.createElement('div');
  dayEl.className = 'cal-cell__day';

  // Show abbreviated month for first day of month (match design: "Jan 1", "Feb 1")
  const [, , d] = dateStr.split('-');
  if (parseInt(d) === 1) {
    const mo = new Date(dateStr + 'T00:00:00').toLocaleString('en-US', { month: 'short' });
    dayEl.textContent = '';
    dayEl.style.width = 'auto';
    dayEl.style.fontSize = '0.75rem';
    dayEl.style.padding = '0 2px';
    dayEl.textContent = `${mo} 1`;
  } else {
    dayEl.textContent = day;
  }

  cell.appendChild(dayEl);

  // Appointments on this cell
  const cellAppts = (apptMap[dateStr] || []).sort((a,b) => a.apptTime.localeCompare(b.apptTime));
  if (cellAppts.length > 0) {
    const list = document.createElement('div');
    list.className = 'cal-appt-list';
    cellAppts.forEach(a => {
      list.appendChild(makePill(a));
    });
    cell.appendChild(list);
  }

  // Click to select date
  cell.addEventListener('click', () => {
    STATE.selectedDate = dateStr;
    document.querySelectorAll('.cal-cell--selected').forEach(c => c.classList.remove('cal-cell--selected'));
    cell.classList.add('cal-cell--selected');
  });

  return cell;
}

function makePill(a) {
  const pill = document.createElement('div');
  pill.className = 'cal-appt-pill';

  const status = a.status || 'Scheduled';
  // Match design green color
  pill.style.background = '#4CAF50';

  pill.innerHTML = `
    <div class="cal-appt-pill__text">
      <span class="cal-appt-pill__icon">&#8593;</span>
      <span>${escHtml(a.patientName)} (${escHtml(status)}) ${formatTimeShort(a.apptTime)}</span>
    </div>
    <div class="cal-appt-pill__actions">
      <button class="cal-pill-btn" title="Edit" onclick="event.stopPropagation(); openEditModal('${a.id}')">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
      </button>
      <button class="cal-pill-btn" title="Delete" onclick="event.stopPropagation(); openDeleteConfirm('${a.id}')">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
      </button>
      <button class="cal-pill-btn" title="Copy" onclick="event.stopPropagation(); copyAppt('${a.id}')">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
      </button>
    </div>
  `;
  return pill;
}

function updateWeekdayHighlight() {
  // Highlight current day's column header like the design (Friday in blue)
  const todayDow = new Date().getDay(); // 0=Sun, 5=Fri
  const weekdays = document.querySelectorAll('.cal-weekday');
  weekdays.forEach((el, i) => el.classList.remove('cal-weekday--today'));
  if (weekdays[todayDow]) weekdays[todayDow].classList.add('cal-weekday--today');
}

// ================================================
//  DASHBOARD RENDER
// ================================================
function renderDashboard() {
  applyDashFilters();
}

function applyDashFilters() {
  const pQ = STATE.dashPatientQ.toLowerCase().trim();
  const dQ = STATE.dashDoctorQ.toLowerCase().trim();
  const ds = STATE.dashDateStart;
  const de = STATE.dashDateEnd;

  STATE.filtered = STATE.appointments.filter(a => {
    const mp = !pQ || a.patientName.toLowerCase().includes(pQ);
    const md = !dQ || a.doctorName.toLowerCase().includes(dQ);
    const ms = !ds || a.apptDate >= ds;
    const me = !de || a.apptDate <= de;
    return mp && md && ms && me;
  }).sort((a,b) => (a.apptDate + a.apptTime).localeCompare(b.apptDate + b.apptTime));

  renderTable();
}

function renderTable() {
  const tbody = $('apptTableBody');
  const EMPTY_ROWS = 8;

  let rows = '';

  STATE.filtered.forEach(a => {
    rows += `
      <tr>
        <td class="td-patient">${escHtml(a.patientName)}</td>
        <td class="td-doctor">${escHtml(a.doctorName)}</td>
        <td>${escHtml(a.hospitalName)}</td>
        <td>${escHtml(a.specialty)}</td>
        <td>${formatDisplayDate(a.apptDate)}</td>
        <td class="td-time">${formatTimeRange(a.apptTime)}</td>
        <td>
          <div class="td-actions">
            <button class="action-btn action-btn--edit" onclick="openEditModal('${a.id}')" title="Edit">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
            <button class="action-btn action-btn--delete" onclick="openDeleteConfirm('${a.id}')" title="Delete">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
            </button>
          </div>
        </td>
      </tr>
    `;
  });

  // Fill remaining empty rows to match design
  const emptyNeeded = Math.max(0, EMPTY_ROWS - STATE.filtered.length);
  for (let i = 0; i < emptyNeeded; i++) {
    rows += `<tr class="empty-row"><td colspan="7"></td></tr>`;
  }

  tbody.innerHTML = rows;
}

function formatTimeRange(timeStr) {
  if (!timeStr) return '';
  const [h, min] = timeStr.split(':');
  const hr = parseInt(h, 10);
  const h12 = hr % 12 || 12;
  const ampm = hr >= 12 ? 'AM' : 'AM';
  return `${h12}:${min} AM - ${h12}:${min} AM`;
}

// ================================================
//  MODAL — OPEN / CLOSE
// ================================================
function openAddModal() {
  STATE.editingId = null;
  $('apptForm').reset();
  $('editId').value = '';
  $('apptDate').value = todayStr();
  $('submitBtn').textContent = 'Save';
  clearErrors();
  showEl($('modalOverlay'));
}

window.openEditModal = function(id) {
  const a = STATE.appointments.find(x => x.id === id);
  if (!a) return;
  STATE.editingId = id;
  $('editId').value = id;
  $('patientName').value = a.patientName;
  $('doctorName').value = a.doctorName;
  $('hospitalName').value = a.hospitalName;
  $('specialty').value = a.specialty;
  $('apptDate').value = a.apptDate;
  $('apptTime').value = a.apptTime;
  $('reason').value = a.reason;
  $('submitBtn').textContent = 'Update';
  clearErrors();
  showEl($('modalOverlay'));
};

function closeModal() {
  hideEl($('modalOverlay'));
  STATE.editingId = null;
}

function showEl(el) {
  el.hidden = false;
  document.body.style.overflow = 'hidden';
}

function hideEl(el) {
  el.hidden = true;
  if ($('modalOverlay').hidden && $('deleteOverlay').hidden) {
    document.body.style.overflow = '';
  }
}

// ================================================
//  DELETE
// ================================================
window.openDeleteConfirm = function(id) {
  STATE.pendingDeleteId = id;
  showEl($('deleteOverlay'));
};

function confirmDelete() {
  if (!STATE.pendingDeleteId) return;
  STATE.appointments = STATE.appointments.filter(a => a.id !== STATE.pendingDeleteId);
  saveStorage();
  STATE.pendingDeleteId = null;
  hideEl($('deleteOverlay'));
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
  const copy = { ...a, id: uid(), patientName: a.patientName + ' (Copy)' };
  STATE.appointments.push(copy);
  saveStorage();
  renderCalendar();
  renderDashboard();
  showToast('Appointment copied.', 'info');
};

// ================================================
//  FORM SUBMIT
// ================================================
const REQUIRED = ['patientName','doctorName','hospitalName','specialty','apptDate','apptTime','reason'];
const LABELS = {
  patientName:'Patient Name', doctorName:'Doctor Name', hospitalName:'Hospital Name',
  specialty:'Specialty', apptDate:'Date', apptTime:'Time', reason:'Reason'
};

function validate() {
  clearErrors();
  let ok = true;
  REQUIRED.forEach(f => {
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
  if (inp) {
    const wrap = inp.closest('.field-wrap');
    if (wrap) wrap.classList.add('field-wrap--error');
    else inp.classList.add('reason-input--error');
  }
}

function clearErrors() {
  REQUIRED.forEach(f => {
    const errEl = $('err-' + f);
    if (errEl) errEl.textContent = '';
    const inp = $(f);
    if (inp) {
      const wrap = inp.closest('.field-wrap');
      if (wrap) wrap.classList.remove('field-wrap--error');
      else inp.classList.remove('reason-input--error');
    }
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
    status:       'Scheduled',
  };

  if (STATE.editingId) {
    const idx = STATE.appointments.findIndex(a => a.id === STATE.editingId);
    if (idx !== -1) STATE.appointments[idx] = { id: STATE.editingId, ...data, status: STATE.appointments[idx].status };
    showToast('Appointment updated!', 'success');
  } else {
    STATE.appointments.push({ id: uid(), ...data });
    showToast('Appointment booked!', 'success');
  }

  saveStorage();
  closeModal();

  // Navigate calendar to the appointment's month
  const [y, mo] = data.apptDate.split('-').map(Number);
  STATE.currentYear = y;
  STATE.currentMonth = mo - 1;
  STATE.selectedDate = data.apptDate;

  renderCalendar();
  renderDashboard();
}

// ================================================
//  SIDEBAR TOGGLE
// ================================================
function toggleSidebar() {
  const sb = $('sidebar');
  STATE.sidebarCollapsed = !STATE.sidebarCollapsed;
  sb.classList.toggle('collapsed', STATE.sidebarCollapsed);
  $('toggleArrows').innerHTML = STATE.sidebarCollapsed ? '&#187;' : '&#171;';
}

// ================================================
//  PAGE NAVIGATION
// ================================================
function showPage(page) {
  $('pageCalendar').hidden = page !== 'calendar';
  $('pageDashboard').hidden = page !== 'dashboard';

  document.querySelectorAll('.sidebar__item').forEach(el => {
    el.classList.toggle('sidebar__item--active', el.dataset.page === page);
  });
}

// ================================================
//  TOAST
// ================================================
function showToast(msg, type = 'success') {
  const container = $('toastContainer');
  const t = document.createElement('div');
  t.className = `toast toast--${type}`;
  t.innerHTML = `
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
      ${type === 'success' ? '<polyline points="20 6 9 17 4 12"/>' : '<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/>'}
    </svg>
    ${escHtml(msg)}
  `;
  container.appendChild(t);
  setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 250); }, 3000);
}

// ================================================
//  EVENT BINDING
// ================================================
function bindEvents() {
  // Book button
  $('openModalBtn').addEventListener('click', openAddModal);

  // Modal close
  $('closeModalBtn').addEventListener('click', closeModal);
  $('cancelModalBtn').addEventListener('click', closeModal);
  $('modalOverlay').addEventListener('click', e => { if (e.target === $('modalOverlay')) closeModal(); });

  // Form submit
  $('apptForm').addEventListener('submit', handleSubmit);

  // Realtime clear errors
  REQUIRED.forEach(f => {
    const el = $(f);
    if (el) el.addEventListener('input', () => {
      $('err-'+f) && ($('err-'+f).textContent = '');
      const wrap = el.closest('.field-wrap');
      if (wrap) wrap.classList.remove('field-wrap--error');
      else el.classList.remove('reason-input--error');
    });
  });

  // Delete modal
  $('closeDeleteBtn').addEventListener('click', () => { hideEl($('deleteOverlay')); STATE.pendingDeleteId = null; });
  $('cancelDeleteBtn').addEventListener('click', () => { hideEl($('deleteOverlay')); STATE.pendingDeleteId = null; });
  $('confirmDeleteBtn').addEventListener('click', confirmDelete);
  $('deleteOverlay').addEventListener('click', e => {
    if (e.target === $('deleteOverlay')) { hideEl($('deleteOverlay')); STATE.pendingDeleteId = null; }
  });

  // Calendar nav
  $('calPrev').addEventListener('click', () => {
    STATE.currentMonth--;
    if (STATE.currentMonth < 0) { STATE.currentMonth = 11; STATE.currentYear--; }
    renderCalendar();
  });

  $('calNext').addEventListener('click', () => {
    STATE.currentMonth++;
    if (STATE.currentMonth > 11) { STATE.currentMonth = 0; STATE.currentYear++; }
    renderCalendar();
  });

  $('calTodayBtn').addEventListener('click', () => {
    const now = new Date();
    STATE.currentYear = now.getFullYear();
    STATE.currentMonth = now.getMonth();
    STATE.selectedDate = todayStr();
    renderCalendar();
  });

  // Sidebar toggle
  $('sidebarToggle').addEventListener('click', toggleSidebar);

  // Nav items
  $('navCalendar').addEventListener('click', e => { e.preventDefault(); showPage('calendar'); });
  $('navDashboard').addEventListener('click', e => { e.preventDefault(); showPage('dashboard'); renderDashboard(); });

  // Dashboard filters
  $('dashUpdateBtn').addEventListener('click', () => {
    STATE.dashPatientQ = $('dashPatientSearch').value;
    STATE.dashDoctorQ = $('dashDoctorSearch').value;
    STATE.dashDateStart = $('dashDateStart').value;
    STATE.dashDateEnd = $('dashDateEnd').value;
    applyDashFilters();
    showToast('Filters applied.', 'info');
  });

  // Live search as typing
  $('dashPatientSearch').addEventListener('input', e => { STATE.dashPatientQ = e.target.value; applyDashFilters(); });
  $('dashDoctorSearch').addEventListener('input', e => { STATE.dashDoctorQ = e.target.value; applyDashFilters(); });

  // Keyboard ESC
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      if (!$('modalOverlay').hidden) closeModal();
      if (!$('deleteOverlay').hidden) { hideEl($('deleteOverlay')); STATE.pendingDeleteId = null; }
    }
  });
}

// ================================================
//  BOOT
// ================================================
document.addEventListener('DOMContentLoaded', init);
