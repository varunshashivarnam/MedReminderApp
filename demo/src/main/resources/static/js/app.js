/* ============ MedReminder — frontend app ============ */
(() => {
  'use strict';

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => [...document.querySelectorAll(sel)];
  const API = '/api';

  // ---------- State ----------
  let meds = [];
  let stats = {};
  let activity = [];
  let adherence = [];      // adherence for the dashboard chart (adhRange days)
  let adherence120 = [];   // long series for calendar dots / streak dots
  let notifs = [];
  let healthEntries = [];
  let analyticsData = null;
  let calMonth = startOfMonth(new Date());
  let bigCalMonth = startOfMonth(new Date());
  let selectedDate = new Date();
  let firstLoad = true;
  let prevTodayDone = null;
  const notified = new Set();
  const snoozed = new Map(); // medId -> timestamp (ms) until which reminders are muted

  const prefs = {
    get name() { return localStorage.getItem('profileName') || 'Varun Shashivarnam'; },
    set name(v) { localStorage.setItem('profileName', v); },
    get snooze() { return +(localStorage.getItem('snoozeMin') || 10); },
    set snooze(v) { localStorage.setItem('snoozeMin', v); },
    get missedNotif() { return localStorage.getItem('missedNotif') !== 'off'; },
    set missedNotif(v) { localStorage.setItem('missedNotif', v ? 'on' : 'off'); },
    get lastSeenNotif() { return localStorage.getItem('lastSeenNotif') || '1970-01-01T00:00'; },
    set lastSeenNotif(v) { localStorage.setItem('lastSeenNotif', v); },
  };

  // ---------- Helpers ----------
  function startOfMonth(d) { return new Date(d.getFullYear(), d.getMonth(), 1); }
  function isoDate(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  function fmtTime12(hhmm) {
    if (!hhmm) return '';
    const [h, m] = hhmm.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
  }

  function fmtWhen(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    const now = new Date();
    const time = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    if (d.toDateString() === now.toDateString()) return `Today, ${time}`;
    const yest = new Date(now); yest.setDate(now.getDate() - 1);
    if (d.toDateString() === yest.toDateString()) return `Yesterday, ${time}`;
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ', ' + time;
  }

  function esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function toast(msg, type = '', actions = []) {
    const el = document.createElement('div');
    el.className = 'toast ' + type;
    el.innerHTML = `<span>${esc(msg)}</span>` +
      actions.map((a, i) => `<button class="mini-btn" data-toast-act="${i}">${esc(a.label)}</button>`).join('');
    actions.forEach((a, i) => {
      el.querySelector(`[data-toast-act="${i}"]`).onclick = () => { a.onClick(); el.remove(); };
    });
    $('#toasts').appendChild(el);
    setTimeout(() => el.remove(), actions.length ? 12000 : 3500);
  }

  async function api(path, opts) {
    const res = await fetch(API + path, opts);
    if (!res.ok) {
      let msg = 'Request failed (' + res.status + ')';
      try { msg = (await res.json()).error || msg; } catch (_) { /* no body */ }
      throw new Error(msg);
    }
    const text = await res.text();
    return text ? JSON.parse(text) : null;
  }

  // ---------- Theme ----------
  function applyTheme(mode) {
    localStorage.setItem('theme', mode === 'auto' ? '' : mode);
    if (mode === 'auto') localStorage.removeItem('theme');
    document.documentElement.dataset.theme =
      localStorage.getItem('theme') ||
      (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    $$('.seg-btn[data-theme-set]').forEach((b) =>
      b.classList.toggle('active', b.dataset.themeSet === (localStorage.getItem('theme') || 'auto')));
  }
  $('#themeBtn').onclick = () => {
    applyTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');
  };
  $$('.seg-btn[data-theme-set]').forEach((b) => b.onclick = () => applyTheme(b.dataset.themeSet));
  applyTheme(localStorage.getItem('theme') || 'auto');

  if (localStorage.getItem('reduceMotion') === 'on') {
    document.documentElement.classList.add('reduce-motion');
  }

  // ---------- Ripple ----------
  document.addEventListener('pointerdown', (e) => {
    const btn = e.target.closest('.btn, .nav-item, .fab, .qa, .chip');
    if (!btn) return;
    const r = btn.getBoundingClientRect();
    const ripple = document.createElement('span');
    const size = Math.max(r.width, r.height);
    ripple.className = 'ripple';
    ripple.style.cssText = `width:${size}px;height:${size}px;left:${e.clientX - r.left - size / 2}px;top:${e.clientY - r.top - size / 2}px`;
    btn.appendChild(ripple);
    setTimeout(() => ripple.remove(), 550);
  });

  // ---------- Navigation ----------
  function showPage(page) {
    $$('.nav-item').forEach((b) => b.classList.toggle('active', b.dataset.page === page));
    $$('.page').forEach((p) => p.classList.toggle('active', p.id === 'page-' + page));
    $('#sidebar').classList.remove('open');
    closePopovers();
    if (page === 'reports') renderReport();
    if (page === 'analytics') loadAnalytics();
    if (page === 'healthlog') loadHealth();
    if (page === 'assistant') initAssistant();
    if (page === 'calendar') loadDayDetail(selectedDate);
  }

  $('#nav').addEventListener('click', (e) => {
    const btn = e.target.closest('.nav-item');
    if (btn) showPage(btn.dataset.page);
  });
  document.body.addEventListener('click', (e) => {
    const goto = e.target.closest('[data-goto]');
    if (goto) showPage(goto.dataset.goto);
  });
  $('#menuBtn').onclick = (e) => { e.stopPropagation(); $('#sidebar').classList.toggle('open'); };

  // ---------- Popovers ----------
  function closePopovers() { $('#notifPanel').hidden = true; $('#profilePanel').hidden = true; }
  $('#bellBtn').onclick = (e) => {
    e.stopPropagation();
    const panel = $('#notifPanel');
    const wasHidden = panel.hidden;
    closePopovers();
    panel.hidden = !wasHidden;
    if (!panel.hidden) renderNotifs();
  };
  $('#profileBtn').onclick = (e) => {
    e.stopPropagation();
    const panel = $('#profilePanel');
    const wasHidden = panel.hidden;
    closePopovers();
    panel.hidden = !wasHidden;
  };
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.popover') && !e.target.closest('#bellBtn') && !e.target.closest('#profileBtn')) {
      closePopovers();
    }
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closePopovers(); });

  // ---------- Greeting / profile ----------
  function setGreeting() {
    const h = new Date().getHours();
    const part = h < 12 ? 'morning' : h < 18 ? 'afternoon' : 'evening';
    const first = prefs.name.split(' ')[0];
    $('#greeting').textContent = `Good ${part}, ${first}! 👋`;
    $('#profileName').textContent = prefs.name;
    $('#profilePopName').textContent = prefs.name;
    $('#avatarInitial').textContent = (prefs.name[0] || 'U').toUpperCase();
    $('#setName').value = prefs.name;
  }

  // ---------- Data loading ----------
  async function refresh() {
    try {
      const days = +($('#adhRange').value || 14);
      [meds, stats, activity, adherence, adherence120, notifs] = await Promise.all([
        api('/medications'),
        api('/stats'),
        api('/activity'),
        api('/adherence?days=' + days),
        api('/adherence?days=120'),
        api('/notifications'),
      ]);
    } catch (err) {
      toast('Could not reach the server: ' + err.message, 'error');
      return;
    }
    if (firstLoad) {
      firstLoad = false;
      $('#dashSkeleton').remove();
      $('#dashContent').hidden = false;
    }
    renderAiSummary();
    renderStats();
    renderAlertStrip();
    renderSchedule();
    renderActivity();
    renderCalendar($('#calendar'), calMonth, $('#calTitle'));
    renderCalendar($('#bigCalendar'), bigCalMonth, $('#bigCalTitle'));
    renderChart();
    renderInsights();
    renderStreak();
    renderRefills();
    renderMedGrid();
    renderReminders();
    updateBellBadge();
    maybeConfetti();
  }

  // ---------- AI summary ----------
  function renderAiSummary() {
    const lines = [];
    const t = stats.todayTaken ?? 0, tot = stats.todayTotal ?? 0;
    lines.push(`You completed ${t}/${tot} medications today${t === tot && tot > 0 ? ' — all done! 🎉' : ''}.`);
    lines.push(`Your adherence this month is ${stats.adherenceRate ?? 0}%.`);
    if ((stats.streak ?? 0) > 0) lines.push(`You're on a ${stats.streak}-day streak (best: ${stats.longestStreak}).`);
    else lines.push(`Take every dose today to start a new streak (best: ${stats.longestStreak ?? 0} days).`);
    const refills = stats.refillAlerts || [];
    if (refills.length) {
      const r = refills[0];
      lines.push(`${r.name} needs a refill in about ${r.daysLeft} day${r.daysLeft === 1 ? '' : 's'}.`);
    }
    const missed = stats.missedToday || [];
    if (missed.length) lines.push(`Still due: ${missed.join(', ')}.`);
    else if ((stats.adherenceRate ?? 0) >= 90) lines.push('Great work staying consistent. 💪');
    $('#aiSummaryLines').innerHTML = lines.map((l) => `<li>${esc(l)}</li>`).join('');
    $('#aiSummaryDate').textContent = new Date().toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });
  }

  // ---------- Stat cards ----------
  function renderStats() {
    $('#statTaken').textContent = stats.todayTaken ?? 0;
    $('#statTotal').textContent = stats.todayTotal ?? 0;
    const pct = stats.todayTotal ? Math.round(100 * stats.todayTaken / stats.todayTotal) : 0;
    $('#todayProgress').style.width = pct + '%';
    $('#todayPct').textContent = pct + '% Completed';
    $('#todayRing').style.setProperty('--pct', pct);
    $('#todayRingLabel').textContent = pct + '%';

    $('#statNextTime').textContent = stats.nextDoseTime ? fmtTime12(stats.nextDoseTime) : '—';
    $('#statNextName').textContent = stats.nextDoseName || 'All doses taken 🎉';
    $('#statTotalMeds').textContent = stats.totalMedications ?? 0;
    $('#statAdherence').textContent = stats.adherenceRate ?? 0;

    const pts = adherence120.filter((p) => p.percent != null).slice(-10);
    if (pts.length > 1) {
      const line = pts.map((p, i) => {
        const x = (i / (pts.length - 1)) * 56;
        const y = 21 - (p.percent / 100) * 18;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      }).join(' ');
      $('#sparkline').setAttribute('points', line);
    }
  }

  // ---------- Alert strip ----------
  function renderAlertStrip() {
    const strip = $('#alertStrip');
    const parts = [];
    (stats.missedToday || []).forEach((m) =>
      parts.push(`<span class="alert-pill miss">⚠️ Missed: ${esc(m)}</span>`));
    (stats.refillAlerts || []).filter((r) => r.daysLeft <= 7).forEach((r) =>
      parts.push(`<span class="alert-pill refill">💊 ${esc(r.name)} — refill in ~${r.daysLeft}d</span>`));
    strip.innerHTML = parts.join('');
    strip.hidden = parts.length === 0;
  }

  // ---------- Schedule ----------
  function dailyMeds() {
    return meds.filter((m) => m.frequency && m.frequency.toLowerCase() === 'daily' && m.time);
  }

  function scheduleStatus(m) {
    if (m.taken) return 'taken';
    const now = new Date();
    const [h, mm] = m.time.split(':').map(Number);
    const doseMin = h * 60 + mm;
    const nowMin = now.getHours() * 60 + now.getMinutes();
    if (doseMin + 60 < nowMin) return 'late';
    return doseMin >= nowMin ? 'upcoming' : 'pending';
  }

  function renderSchedule() {
    const daily = dailyMeds();
    let upcomingMarked = false;
    $('#scheduleList').innerHTML = daily.map((m) => {
      let st = scheduleStatus(m);
      if (st === 'upcoming') {
        if (upcomingMarked) st = 'pending';
        upcomingMarked = true;
      }
      const icon = st === 'taken' ? '✓' : st === 'upcoming' ? '🕐' : st === 'late' ? '!' : '';
      const label = { taken: 'Taken', upcoming: 'Upcoming', late: 'Late', pending: 'Pending' }[st];
      const action = m.taken
        ? `<button class="tag taken tag-btn" data-take="${m.id}" data-to="false" title="Undo">Taken ✓</button>`
        : `<button class="tag ${st} tag-btn" data-take="${m.id}" data-to="true" title="Mark as taken">${label}</button>`;
      return `
        <div class="tl-item">
          <div class="tl-rail"><div class="tl-dot ${st}">${icon}</div><div class="tl-line"></div></div>
          <span class="tl-time">${fmtTime12(m.time)}</span>
          <div class="tl-info">
            <div class="tl-name">${esc(m.name)} ${esc(m.dosage)}</div>
            <div class="tl-sub">${esc(m.instructions || '')}${m.withFood ? ' · 🍽 with food' : ''}${m.beforeBed ? ' · 🌙 before bed' : ''}</div>
          </div>
          <div class="tl-actions">${action}</div>
        </div>`;
    }).join('') || `
      <div class="empty-state">
        <span class="empty-emoji">🌤</span>
        <h3>Nothing scheduled today</h3>
        <p class="muted">Add a daily medication to build your schedule.</p>
      </div>`;
  }

  document.body.addEventListener('click', async (e) => {
    const take = e.target.closest('[data-take]');
    if (take) {
      const taking = take.dataset.to === 'true';
      if (!taking && !confirm('Mark this dose as not taken?')) return;
      try {
        await api(`/medications/${take.dataset.take}/take?taken=${take.dataset.to}`, { method: 'POST' });
        toast(taking ? 'Dose marked as taken ✓' : 'Dose unmarked', taking ? 'success' : '');
        refresh();
      } catch (err) { toast(err.message, 'error'); }
      return;
    }
    const skip = e.target.closest('[data-skip]');
    if (skip) {
      if (!confirm('Skip this dose for today? It won\'t count as missed.')) return;
      try {
        await api(`/medications/${skip.dataset.skip}/skip`, { method: 'POST' });
        toast('Dose skipped for today');
        refresh();
      } catch (err) { toast(err.message, 'error'); }
      return;
    }
    const snooze = e.target.closest('[data-snooze]');
    if (snooze) {
      snoozeMed(+snooze.dataset.snooze, +snooze.dataset.mins || prefs.snooze);
      return;
    }
    const del = e.target.closest('[data-del]');
    if (del) {
      const med = meds.find((m) => m.id == del.dataset.del);
      if (!confirm(`Delete ${med ? med.name : 'this medication'}? Its history stays in your logs.`)) return;
      try {
        await api('/medications/' + del.dataset.del, { method: 'DELETE' });
        toast('Medication deleted');
        refresh();
      } catch (err) { toast(err.message, 'error'); }
      return;
    }
    const edit = e.target.closest('[data-edit]');
    if (edit) {
      const med = meds.find((m) => m.id == edit.dataset.edit);
      if (med) openModal(med);
    }
  });

  function snoozeMed(id, mins) {
    snoozed.set(id, Date.now() + mins * 60000);
    const med = meds.find((m) => m.id === id);
    toast(`Snoozed ${med ? med.name : 'reminder'} for ${mins} minutes 😴`);
    setTimeout(() => {
      notified.forEach((k) => { if (k.startsWith(id + '@')) notified.delete(k); });
    }, mins * 60000);
  }

  // ---------- Activity ----------
  const TAG_ICONS = { Taken: '💊', Logged: '❤️', Added: '➕', Updated: '✏️', Deleted: '🗑️', Skipped: '⏭️', Achievement: '🏅' };
  function renderActivity() {
    $('#activityList').innerHTML = activity.slice(0, 6).map((a) => `
      <div class="act-item">
        <span class="act-icon">${TAG_ICONS[a.tag] || '•'}</span>
        <div class="act-info">
          <div class="act-msg">${esc(a.message)}</div>
          <div class="act-when">${fmtWhen(a.at)}</div>
        </div>
        <span class="tag ${a.tag.toLowerCase()}">${a.tag}</span>
      </div>`).join('') || '<p class="muted">No activity yet today.</p>';
  }

  // ---------- Calendar ----------
  const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const DOWS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

  function dayStatusMap() {
    const map = {};
    adherence120.forEach((p) => { map[p.date] = p.percent; });
    return map;
  }

  function renderCalendar(container, month, titleEl) {
    if (!container) return;
    if (titleEl) titleEl.textContent = `${MONTHS[month.getMonth()]} ${month.getFullYear()}`;
    const today = new Date();
    const statuses = dayStatusMap();
    const first = new Date(month.getFullYear(), month.getMonth(), 1);
    const cells = [];
    DOWS.forEach((d) => cells.push(`<div class="cal-dow">${d}</div>`));
    const start = new Date(first);
    start.setDate(1 - first.getDay());
    const hasDaily = dailyMeds().length > 0;
    for (let i = 0; i < 42; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const key = isoDate(d);
      const dim = d.getMonth() !== month.getMonth();
      const isToday = d.toDateString() === today.toDateString();
      const isSel = d.toDateString() === selectedDate.toDateString();
      let dot = '';
      if (!dim) {
        const pct = statuses[key];
        if (pct != null && !isToday) {
          dot = pct === 100 ? 'full' : pct > 0 ? 'part' : 'miss';
        } else if (hasDaily && (d > today || isToday)) {
          dot = 'future';
        }
      }
      cells.push(`<div class="cal-day ${dim ? 'dim' : ''} ${isToday ? 'today' : ''} ${isSel ? 'selected' : ''}"
        role="button" tabindex="0" data-date="${key}" aria-label="${key}">${d.getDate()}${dot ? `<span class="dot ${dot}"></span>` : ''}</div>`);
    }
    container.innerHTML = cells.join('');
    container.onclick = (e) => {
      const day = e.target.closest('.cal-day');
      if (!day || day.classList.contains('dim')) return;
      selectedDate = new Date(day.dataset.date + 'T00:00:00');
      renderCalendar($('#calendar'), calMonth, $('#calTitle'));
      renderCalendar($('#bigCalendar'), bigCalMonth, $('#bigCalTitle'));
      updateCalSelected();
      if (container.id === 'bigCalendar') loadDayDetail(selectedDate);
    };
    updateCalSelected();
  }

  function updateCalSelected() {
    const n = dailyMeds().length;
    $('#calSelDate').textContent = selectedDate.toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' });
    $('#calSelInfo').textContent = ` — ${n} medication${n === 1 ? '' : 's'} scheduled`;
  }

  $('#calPrev').onclick = () => { calMonth = new Date(calMonth.getFullYear(), calMonth.getMonth() - 1, 1); renderCalendar($('#calendar'), calMonth, $('#calTitle')); };
  $('#calNext').onclick = () => { calMonth = new Date(calMonth.getFullYear(), calMonth.getMonth() + 1, 1); renderCalendar($('#calendar'), calMonth, $('#calTitle')); };
  $('#bigCalPrev').onclick = () => { bigCalMonth = new Date(bigCalMonth.getFullYear(), bigCalMonth.getMonth() - 1, 1); renderCalendar($('#bigCalendar'), bigCalMonth, $('#bigCalTitle')); };
  $('#bigCalNext').onclick = () => { bigCalMonth = new Date(bigCalMonth.getFullYear(), bigCalMonth.getMonth() + 1, 1); renderCalendar($('#bigCalendar'), bigCalMonth, $('#bigCalTitle')); };
  $('#viewDayBtn').onclick = () => { showPage('calendar'); loadDayDetail(selectedDate); };

  async function loadDayDetail(date) {
    const key = isoDate(date);
    $('#dayDetailTitle').textContent = date.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });
    try {
      const doses = await api('/doses?date=' + key);
      const taken = doses.filter((d) => d.status === 'TAKEN').length;
      const missed = doses.filter((d) => d.status === 'MISSED' || d.status === 'LATE').length;
      const skipped = doses.filter((d) => d.status === 'SKIPPED').length;
      $('#dayDetailStats').innerHTML = doses.length ? `
        <div class="day-stat"><b>${taken}</b> taken</div>
        <div class="day-stat"><b>${missed}</b> ${date.toDateString() === new Date().toDateString() ? 'late' : 'missed'}</div>
        <div class="day-stat"><b>${skipped}</b> skipped</div>` : '';
      const STATUS_META = {
        TAKEN: ['taken', '✓', 'Taken'], MISSED: ['missed', '✕', 'Missed'], LATE: ['late', '!', 'Late'],
        SKIPPED: ['skipped', '⏭', 'Skipped'], UPCOMING: ['upcoming', '🕐', 'Upcoming'],
      };
      $('#dayDetailList').innerHTML = doses.map((d) => {
        const [cls, icon, label] = STATUS_META[d.status] || ['pending', '', d.status];
        return `
          <div class="tl-item">
            <div class="tl-rail"><div class="tl-dot ${cls}">${icon}</div><div class="tl-line"></div></div>
            <span class="tl-time">${fmtTime12(d.time)}</span>
            <div class="tl-info">
              <div class="tl-name">${esc(d.name)} ${esc(d.dosage || '')}</div>
              <div class="tl-sub">${d.status === 'TAKEN' && d.at ? 'taken ' + fmtWhen(d.at).toLowerCase() : ''}</div>
            </div>
            <span class="tag ${cls}">${label}</span>
          </div>`;
      }).join('') || '<p class="muted">No dose history recorded for this day.</p>';
    } catch (err) {
      $('#dayDetailList').innerHTML = '<p class="muted">Could not load this day.</p>';
    }
  }

  // ---------- Dashboard adherence chart ----------
  $('#adhRange').addEventListener('change', async () => {
    adherence = await api('/adherence?days=' + $('#adhRange').value);
    renderChart();
  });

  function renderChart() {
    const el = $('#adherenceChart');
    const showEvery = adherence.length > 16 ? 3 : 1;
    el.innerHTML = adherence.map((p, i) => {
      const pct = p.percent ?? 0;
      const d = new Date(p.date + 'T00:00:00');
      const label = d.toLocaleDateString([], { month: 'short', day: 'numeric' });
      return `
        <div class="bar-wrap">
          <div class="bar" style="height:${Math.max(pct, 2) * (126 / 100)}px">
            <span class="tip">${label}: ${p.percent == null ? 'n/a' : pct + '%'}</span>
          </div>
          <span class="bar-label">${i % showEvery === 0 ? d.getDate() : ''}</span>
        </div>`;
    }).join('');
  }

  // ---------- Insights, streak, refills ----------
  function renderInsights() {
    const rate = stats.adherenceRate ?? 0;
    $('#insightTitle').textContent = rate >= 80 ? 'Great Progress!' : rate >= 50 ? 'Keep Going!' : 'Needs Attention';
    $('#insightText').textContent = `You've been ${rate}% adherent to your medications this month.`;
    $('#adherenceRing').style.setProperty('--pct', rate);
    $('#ringLabel').textContent = rate + '%';
    $('#insightStreak').textContent = stats.streak ?? 0;
    $('#insightBest').textContent = stats.longestStreak ?? 0;
    $('#insightDoses').textContent = `${stats.monthTaken ?? 0} / ${stats.monthTotal ?? 0}`;
  }

  function renderStreak() {
    $('#streakDays').textContent = stats.streak ?? 0;
    $('#streakMsg').textContent = (stats.streak ?? 0) > 0 ? 'Great job! Keep it up.' : 'Take all doses today to start a streak!';
    const statuses = dayStatusMap();
    const labels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
    const today = new Date();
    const mondayIdx = (today.getDay() + 6) % 7;
    $('#streakDots').innerHTML = labels.map((l, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() - mondayIdx + i);
      let cls = '';
      if (i === mondayIdx) cls = 'today';
      else if (i < mondayIdx && statuses[isoDate(d)] === 100) cls = 'done';
      return `<span class="streak-dot ${cls}"><i></i>${l}</span>`;
    }).join('');
  }

  function renderRefills() {
    const alerts = stats.refillAlerts || [];
    $('#refillList').innerHTML = alerts.length ? alerts.map((r) => {
      const urgent = r.daysLeft <= 3;
      const pct = Math.min(100, r.daysLeft * 10);
      return `
        <div class="refill-item">
          <div class="refill-top">
            <span>${esc(r.name)} ${esc(r.dosage)}</span>
            <span class="refill-days ${urgent ? 'urgent' : ''}">${r.daysLeft}d left</span>
          </div>
          <div class="refill-bar"><div class="refill-fill ${urgent ? 'urgent' : ''}" style="width:${pct}%"></div></div>
          <div class="refill-sub">${r.pillsRemaining} pills · refill by ${r.refillDate}${r.pharmacy ? ' · ' + esc(r.pharmacy) : ''}</div>
        </div>`;
    }).join('') : '<p class="muted">All medications are well stocked. ✨</p>';
  }

  // ---------- Medications page ----------
  const CATEGORIES = ['All', 'Heart', 'Diabetes', 'Skincare', 'Pain Relief', 'Supplement', 'Other'];
  let activeCat = 'All';

  function timeTag(t) {
    if (!t) return null;
    const h = +t.split(':')[0];
    return h < 12 ? '🌅 Morning' : h < 17 ? '☀️ Afternoon' : '🌙 Evening';
  }

  function renderCatFilters() {
    $('#catFilters').innerHTML = CATEGORIES.map((c) =>
      `<button class="chip ${c === activeCat ? 'active' : ''}" data-cat="${c}">${c}</button>`).join('');
  }
  $('#catFilters').addEventListener('click', (e) => {
    const chip = e.target.closest('[data-cat]');
    if (!chip) return;
    activeCat = chip.dataset.cat;
    renderCatFilters();
    renderMedGrid();
  });
  $('#medSearch').addEventListener('input', () => renderMedGrid());

  function renderMedGrid() {
    renderCatFilters();
    const q = ($('#medSearch').value || '').toLowerCase();
    const filtered = meds.filter((m) =>
      (activeCat === 'All' || (m.category || 'Other') === activeCat) &&
      (!q || m.name.toLowerCase().includes(q) || (m.notes || '').toLowerCase().includes(q)));
    $('#medEmpty').hidden = filtered.length > 0;
    $('#medGrid').innerHTML = filtered.map((m) => {
      const tags = [];
      if (m.category) tags.push(esc(m.category));
      const tt = timeTag(m.time);
      if (tt) tags.push(tt);
      if (m.withFood) tags.push('🍽 With food');
      if (m.beforeBed) tags.push('🌙 Before bed');
      const daysLeft = m.pillsRemaining != null && m.frequency?.toLowerCase() === 'daily' && m.time
        ? Math.floor(m.pillsRemaining / (m.pillsPerDose || 1)) : null;
      const inv = m.pillsRemaining != null ? `
        <div class="med-inv">
          <div class="med-inv-top"><span>${m.pillsRemaining} pills left</span>${daysLeft != null ? `<span>~${daysLeft} days</span>` : ''}</div>
          <div class="refill-bar"><div class="refill-fill ${daysLeft != null && daysLeft <= 5 ? 'urgent' : ''}" style="width:${Math.min(100, (daysLeft ?? 30) * (100 / 30))}%"></div></div>
        </div>` : '';
      const meta = [
        m.frequency?.toLowerCase() === 'daily' && m.time ? `⏰ Daily at ${fmtTime12(m.time)}` : `🔁 ${esc(m.frequency || 'Daily')}`,
        m.doctor ? `👨‍⚕️ ${esc(m.doctor)}` : null,
        m.pharmacy ? `🏥 ${esc(m.pharmacy)}${m.rxNumber ? ' · ' + esc(m.rxNumber) : ''}` : null,
        m.notes ? `📝 ${esc(m.notes)}` : null,
      ].filter(Boolean).map((x) => `<span>${x}</span>`).join('');
      return `
        <div class="med-card" style="border-top-color:${esc(m.color || 'var(--muted)')}">
          <div class="med-card-head">
            <div>
              <div class="med-title">${esc(m.name)}</div>
              <div class="med-dose">${esc(m.dosage)}</div>
            </div>
            ${m.taken ? '<span class="tag taken">Taken today</span>' : ''}
          </div>
          <div class="med-tags">${tags.map((t) => `<span class="mini-chip">${t}</span>`).join('')}</div>
          <div class="med-meta">${meta}</div>
          ${inv}
          <div class="med-actions">
            ${m.taken
              ? `<button class="mini-btn" data-take="${m.id}" data-to="false">Undo</button>`
              : `<button class="mini-btn primary" data-take="${m.id}" data-to="true">Take</button>`}
            <button class="mini-btn" data-edit="${m.id}">Edit</button>
            <button class="mini-btn danger" data-del="${m.id}">Delete</button>
          </div>
        </div>`;
    }).join('');
  }

  // ---------- Modal ----------
  const modal = $('#medModal');
  const SWATCHES = ['#2563eb', '#12b76a', '#7c5cfc', '#f59e0b', '#f43f5e', '#0d9488', '#98a2b3'];
  let chosenColor = SWATCHES[0];

  function renderSwatches() {
    $('#colorSwatches').innerHTML = SWATCHES.map((c) =>
      `<button type="button" class="swatch ${c === chosenColor ? 'active' : ''}" style="background:${c}" data-color="${c}" aria-label="Color ${c}"></button>`).join('');
  }
  $('#colorSwatches').addEventListener('click', (e) => {
    const s = e.target.closest('[data-color]');
    if (!s) return;
    chosenColor = s.dataset.color;
    renderSwatches();
  });

  function openModal(med) {
    $('#modalTitle').textContent = med ? 'Edit Medication' : 'Add Medication';
    $('#medId').value = med ? med.id : '';
    $('#medName').value = med ? med.name : '';
    $('#medDosage').value = med ? med.dosage : '';
    $('#medFrequency').value = med ? med.frequency || 'Daily' : 'Daily';
    $('#medTime').value = med ? med.time || '' : '';
    $('#medCategory').value = med ? med.category || 'Other' : 'Other';
    $('#medInstructions').value = med ? med.instructions || '' : '';
    $('#medWithFood').checked = !!(med && med.withFood);
    $('#medBeforeBed').checked = !!(med && med.beforeBed);
    $('#medDoctor').value = med ? med.doctor || '' : '';
    $('#medPharmacy').value = med ? med.pharmacy || '' : '';
    $('#medRx').value = med ? med.rxNumber || '' : '';
    $('#medPills').value = med && med.pillsRemaining != null ? med.pillsRemaining : '';
    $('#medPerDose').value = med && med.pillsPerDose != null ? med.pillsPerDose : '';
    $('#medEndDate').value = med ? med.endDate || '' : '';
    $('#medNotes').value = med ? med.notes || '' : '';
    $('#labelPaste').value = '';
    $('#advDetails').open = false;
    chosenColor = (med && med.color) || SWATCHES[0];
    renderSwatches();
    syncTimeVisibility();
    modal.hidden = false;
    $('#medName').focus();
  }
  function closeModal() { modal.hidden = true; }

  function syncTimeVisibility() {
    const daily = $('#medFrequency').value === 'Daily';
    $('#timeLabel').style.display = daily ? '' : 'none';
    $('#medTime').required = daily;
  }
  $('#medFrequency').addEventListener('change', syncTimeVisibility);

  ['addMedBtn', 'addMedBtn2', 'qaAdd', 'fab', 'emptyAddBtn'].forEach((id) => {
    const el = $('#' + id);
    if (el) el.addEventListener('click', () => openModal(null));
  });
  $('#modalClose').onclick = closeModal;
  $('#modalCancel').onclick = closeModal;
  modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !modal.hidden) closeModal(); });

  // Prescription label parser (paste text → auto-fill)
  $('#parseLabelBtn').onclick = () => {
    const text = $('#labelPaste').value;
    if (!text.trim()) return toast('Paste some label text first', 'error');
    const dosage = text.match(/\b\d+(?:\.\d+)?\s*(?:mg|mcg|iu|%|ml|g)\b/i);
    const rx = text.match(/\bRX[-\s#]?\w+/i) || text.match(/#\s?(\d{5,})/);
    const doctor = text.match(/\bDr\.?\s+[A-Z][a-z]+/);
    const qty = text.match(/\bqty:?\s*(\d+)/i);
    const pharmacy = text.match(/\b(CVS|Walgreens|Rite Aid|Walmart|Costco|Kroger)[\w\s]*/i);
    const nameMatch = text.match(/^[\s*]*([A-Za-z][A-Za-z\- ]{2,30}?)(?=\s*\d|\s*—|\s*-|\s*,|$)/m);
    if (nameMatch) $('#medName').value = nameMatch[1].trim().replace(/\b\w/g, (c) => c.toUpperCase());
    if (dosage) $('#medDosage').value = dosage[0].replace(/\s+/g, '');
    if (rx) $('#medRx').value = rx[0].replace(/\s+/g, '').toUpperCase();
    if (doctor) $('#medDoctor').value = doctor[0];
    if (qty) $('#medPills').value = qty[1];
    if (pharmacy) $('#medPharmacy').value = pharmacy[0].trim();
    if (/nightly|at night|bedtime/i.test(text)) { $('#medTime').value = '21:30'; $('#medBeforeBed').checked = true; }
    if (/with food|with meals/i.test(text)) $('#medWithFood').checked = true;
    if (/as needed|prn/i.test(text)) $('#medFrequency').value = 'As needed';
    else if (/weekly/i.test(text)) $('#medFrequency').value = 'Weekly';
    syncTimeVisibility();
    toast('Form filled from label — please double-check the values ✓', 'success');
  };

  $('#medForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = $('#medId').value;
    const pills = $('#medPills').value;
    const perDose = $('#medPerDose').value;
    const body = JSON.stringify({
      name: $('#medName').value.trim(),
      dosage: $('#medDosage').value.trim(),
      frequency: $('#medFrequency').value,
      time: $('#medFrequency').value === 'Daily' ? $('#medTime').value : '',
      instructions: $('#medInstructions').value.trim(),
      category: $('#medCategory').value,
      color: chosenColor,
      withFood: $('#medWithFood').checked,
      beforeBed: $('#medBeforeBed').checked,
      doctor: $('#medDoctor').value.trim() || null,
      pharmacy: $('#medPharmacy').value.trim() || null,
      rxNumber: $('#medRx').value.trim() || null,
      pillsRemaining: pills === '' ? null : +pills,
      pillsPerDose: perDose === '' ? (pills === '' ? null : 1) : +perDose,
      endDate: $('#medEndDate').value || null,
      notes: $('#medNotes').value.trim() || null,
      startDate: null,
    });
    const headers = { 'Content-Type': 'application/json' };
    try {
      if (id) {
        // keep the original start date on edit
        const existing = meds.find((m) => m.id == id);
        const patched = JSON.parse(body);
        patched.startDate = existing ? existing.startDate : null;
        await api('/medications/' + id, { method: 'PUT', headers, body: JSON.stringify(patched) });
        toast('Medication updated ✓', 'success');
      } else {
        await api('/medications', { method: 'POST', headers, body });
        toast('Medication added ✓', 'success');
      }
      closeModal();
      refresh();
    } catch (err) { toast(err.message, 'error'); }
  });

  // ---------- Reminders ----------
  function renderReminders() {
    const daily = dailyMeds();
    $('#reminderList').innerHTML = daily.map((m) => {
      const st = m.taken ? 'taken' : scheduleStatus(m);
      const actions = m.taken ? '<span class="tag taken">Done ✓</span>' : `
        <button class="mini-btn primary" data-take="${m.id}" data-to="true">Take now</button>
        <button class="mini-btn" data-snooze="${m.id}" data-mins="${prefs.snooze}">Snooze ${prefs.snooze}m</button>
        <button class="mini-btn" data-skip="${m.id}">Skip today</button>`;
      return `
        <div class="tl-item">
          <div class="tl-rail"><div class="tl-dot ${st}">${st === 'taken' ? '✓' : '🔔'}</div><div class="tl-line"></div></div>
          <span class="tl-time">${fmtTime12(m.time)}</span>
          <div class="tl-info">
            <div class="tl-name">${esc(m.name)} ${esc(m.dosage)}</div>
            <div class="tl-sub">Daily reminder${m.withFood ? ' · take with food 🍽' : ''}</div>
          </div>
          <div class="tl-actions">${actions}</div>
        </div>`;
    }).join('') || '<p class="muted">No scheduled medications to remind you about.</p>';
    updateNotifStatus();
  }

  function updateNotifStatus() {
    const el = $('#notifStatus');
    const toggle = $('#setNotif');
    if (!('Notification' in window)) {
      el.textContent = 'This browser does not support notifications.';
    } else if (Notification.permission === 'granted') {
      el.textContent = '✅ Notifications are on. You\'ll get an alert when a dose is due while this tab is open.';
      toggle.checked = true;
    } else if (Notification.permission === 'denied') {
      el.textContent = 'Notifications are blocked in your browser settings.';
      toggle.checked = false;
    } else {
      el.textContent = 'Notifications are off. Enable them to get an alert when a dose is due.';
      toggle.checked = false;
    }
  }

  async function enableNotifications() {
    if (!('Notification' in window)) return toast('Browser does not support notifications', 'error');
    const perm = await Notification.requestPermission();
    updateNotifStatus();
    toast(perm === 'granted' ? 'Reminders enabled 🔔' : 'Notifications not enabled', perm === 'granted' ? 'success' : 'error');
  }
  $('#enableNotifBtn').onclick = enableNotifications;
  $('#qaReminder').onclick = enableNotifications;
  $('#setNotif').addEventListener('change', (e) => { if (e.target.checked) enableNotifications(); });

  function checkDueDoses() {
    const now = new Date();
    const nowMin = now.getHours() * 60 + now.getMinutes();
    dailyMeds().forEach((m) => {
      if (m.taken) return;
      const [h, mm] = m.time.split(':').map(Number);
      const doseMin = h * 60 + mm;
      const key = `${m.id}@${m.time}@${now.toDateString()}`;
      const snoozedUntil = snoozed.get(m.id) || 0;
      const due = nowMin >= doseMin && nowMin <= doseMin + (prefs.missedNotif ? 90 : 2);
      if (due && !notified.has(key) && Date.now() >= snoozedUntil) {
        notified.add(key);
        toast(`💊 Time for ${m.name} ${m.dosage}`, '', [
          { label: 'Take', onClick: async () => { await api(`/medications/${m.id}/take?taken=true`, { method: 'POST' }); refresh(); } },
          { label: '10m', onClick: () => snoozeMed(m.id, 10) },
          { label: '30m', onClick: () => snoozeMed(m.id, 30) },
          { label: 'Skip', onClick: async () => { await api(`/medications/${m.id}/skip`, { method: 'POST' }); refresh(); } },
        ]);
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('MedReminder 💊', {
            body: `Time to take ${m.name} ${m.dosage}${m.withFood ? ' — with food 🍽' : ''}`,
            tag: key,
          });
        }
      }
    });
  }

  // ---------- Notification center ----------
  function unreadNotifs() {
    return notifs.filter((n) => n.at > prefs.lastSeenNotif);
  }
  function updateBellBadge() {
    const n = unreadNotifs().length;
    const badge = $('#bellBadge');
    badge.hidden = n === 0;
    badge.textContent = n;
  }
  const NOTIF_ICONS = { missed: '⚠️', refill: '💊', upcoming: '⏰', achievement: '🏅' };
  function renderNotifs() {
    $('#notifList').innerHTML = notifs.length ? notifs.map((n) => `
      <div class="notif-item ${n.at > prefs.lastSeenNotif ? 'unread' : ''}">
        <span class="notif-icon">${NOTIF_ICONS[n.type] || '🔔'}</span>
        <div class="notif-body">
          <strong>${esc(n.title)}</strong>
          <p>${esc(n.body)}</p>
          <time>${fmtWhen(n.at)}</time>
        </div>
      </div>`).join('') : '<p class="muted" style="padding:20px">You\'re all caught up. 🎉</p>';
  }
  $('#markAllRead').onclick = () => {
    prefs.lastSeenNotif = new Date().toISOString();
    renderNotifs();
    updateBellBadge();
  };

  // ---------- Analytics ----------
  async function loadAnalytics() {
    try {
      const [ana, ach] = await Promise.all([
        api('/analytics?days=' + $('#anaRange').value),
        api('/achievements'),
      ]);
      analyticsData = ana;
      renderAnalytics(ana);
      renderAchievements(ach);
    } catch (err) { toast('Analytics failed: ' + err.message, 'error'); }
  }
  $('#anaRange').addEventListener('change', loadAnalytics);

  function renderAnalytics(a) {
    $('#anaStreak').textContent = a.currentStreak;
    $('#anaBest').textContent = a.longestStreak;
    $('#anaDelay').textContent = a.avgDelayMinutes == null ? '—' : a.avgDelayMinutes + 'm';
    $('#anaMostMissed').textContent = a.mostMissed || 'None 🎉';
    const mm = a.perMed.find((p) => p.name === a.mostMissed);
    $('#anaMissedCount').textContent = mm ? `${mm.missed} missed doses` : 'no missed doses';

    renderLineChart(a.daily);
    renderWeekly(a.weekly);
    renderHeatmap(a.daily);
    renderDonut(a);
    renderPerMed(a.perMed);
  }

  function renderLineChart(daily) {
    const w = 600, h = 220, padL = 30, padB = 24, padT = 12;
    const pts = daily.map((p, i) => ({ i, pct: p.percent, date: p.date }));
    const n = Math.max(pts.length - 1, 1);
    const x = (i) => padL + (i / n) * (w - padL - 8);
    const y = (pct) => padT + (1 - pct / 100) * (h - padT - padB);
    let dLine = '', dArea = '', started = false, firstX = null, lastX = null;
    pts.forEach((p) => {
      if (p.pct == null) return;
      const px = x(p.i).toFixed(1), py = y(p.pct).toFixed(1);
      dLine += (started ? ' L' : 'M') + px + ' ' + py;
      if (!started) firstX = px;
      lastX = px;
      started = true;
    });
    if (started) dArea = dLine + ` L${lastX} ${h - padB} L${firstX} ${h - padB} Z`;
    const labels = [0, Math.floor(pts.length / 2), pts.length - 1].filter((v, i, arr) => arr.indexOf(v) === i);
    $('#lineChart').innerHTML = `
      <defs>
        <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="var(--blue)" stop-opacity=".25"/>
          <stop offset="1" stop-color="var(--blue)" stop-opacity="0"/>
        </linearGradient>
      </defs>
      <line class="axis" x1="${padL}" y1="${h - padB}" x2="${w - 8}" y2="${h - padB}"/>
      <line class="goal" x1="${padL}" y1="${y(90)}" x2="${w - 8}" y2="${y(90)}"/>
      <text x="${padL - 26}" y="${y(90) + 3}">90%</text>
      <text x="${padL - 26}" y="${y(100) + 3}">100</text>
      <text x="${padL - 20}" y="${h - padB + 3}">0</text>
      ${dArea ? `<path class="area" d="${dArea}"/>` : ''}
      ${dLine ? `<path class="line" d="${dLine}"/>` : ''}
      ${labels.map((i) => pts[i] ? `<text x="${x(i)}" y="${h - 6}" text-anchor="middle">${pts[i].date.slice(5)}</text>` : '').join('')}
    `;
  }

  function renderWeekly(weekly) {
    $('#weeklyChart').innerHTML = weekly.slice(-12).map((wk) => {
      const pct = wk.percent ?? 0;
      const d = new Date(wk.weekStart + 'T00:00:00');
      return `
        <div class="bar-wrap">
          <div class="bar" style="height:${Math.max(pct, 2) * (126 / 100)}px">
            <span class="tip">Week of ${d.toLocaleDateString([], { month: 'short', day: 'numeric' })}: ${wk.percent == null ? 'n/a' : pct + '%'}</span>
          </div>
          <span class="bar-label">${d.getDate()}/${d.getMonth() + 1}</span>
        </div>`;
    }).join('');
  }

  function renderHeatmap(daily) {
    // Pad so columns start on Monday.
    const first = new Date(daily[0].date + 'T00:00:00');
    const padDays = (first.getDay() + 6) % 7;
    let cells = '';
    for (let i = 0; i < padDays; i++) cells += '<span class="hm-cell" style="visibility:hidden"></span>';
    daily.forEach((p) => {
      let l = '0';
      if (p.percent === 100) l = '4';
      else if (p.percent >= 75) l = '3';
      else if (p.percent >= 50) l = '2';
      else if (p.percent > 0) l = '1';
      else if (p.percent === 0) l = 'm';
      cells += `<span class="hm-cell" data-l="${l}" title="${p.date}: ${p.percent == null ? 'no data' : p.percent + '%'}"></span>`;
    });
    $('#heatmap').innerHTML = cells;
  }

  function renderDonut(a) {
    const total = a.taken + a.missed + a.skipped || 1;
    const C = 2 * Math.PI * 44;
    let off = 0;
    const seg = (count, color) => {
      const len = (count / total) * C;
      const s = `<circle r="44" cx="60" cy="60" fill="none" stroke="${color}" stroke-width="16"
        stroke-dasharray="${len} ${C - len}" stroke-dashoffset="${-off}" transform="rotate(-90 60 60)"/>`;
      off += len;
      return s;
    };
    $('#donut').innerHTML =
      seg(a.taken, 'var(--green)') + seg(a.missed, 'var(--rose)') + seg(a.skipped, 'var(--amber)') +
      `<text x="60" y="57" text-anchor="middle" style="font-size:19px;font-weight:800;fill:var(--text)">${Math.round(100 * a.taken / total)}%</text>
       <text x="60" y="73" text-anchor="middle" style="font-size:9px;fill:var(--muted)">taken</text>`;
    $('#donutLegend').innerHTML = `
      <span><i style="background:var(--green)"></i>Taken · ${a.taken}</span>
      <span><i style="background:var(--rose)"></i>Missed · ${a.missed}</span>
      <span><i style="background:var(--amber)"></i>Skipped · ${a.skipped}</span>`;
  }

  function renderPerMed(perMed) {
    $('#perMedList').innerHTML = perMed.map((p) => {
      const adh = p.adherence ?? 0;
      const cls = adh >= 90 ? '' : adh >= 70 ? 'mid' : 'low';
      return `
        <div class="pm-row">
          <div class="pm-top"><span>${esc(p.name)}</span><span>${p.adherence == null ? '—' : adh + '%'} · ${p.missed} missed</span></div>
          <div class="pm-bar"><div class="pm-fill ${cls}" style="width:${adh}%"></div></div>
        </div>`;
    }).join('') || '<p class="muted">No dose history yet.</p>';
  }

  function renderAchievements(ach) {
    $('#achGrid').innerHTML = ach.map((a) => `
      <div class="ach ${a.unlockedAt ? 'unlocked' : 'locked'}" title="${a.unlockedAt ? 'Unlocked ' + fmtWhen(a.unlockedAt) : 'Locked'}">
        <span class="ach-emoji">${a.emoji}</span>
        <strong>${esc(a.title)}</strong>
        <p>${esc(a.description)}</p>
      </div>`).join('');
  }

  // ---------- AI Assistant ----------
  let assistantReady = false;
  const CHIP_QUESTIONS = [
    'What happens if I use too much tretinoin?',
    'What if I miss a tretinoin night?',
    'What should I pair with tretinoin?',
    'Can I take ibuprofen with lisinopril?',
    'Should I take metformin with food?',
    'What does atorvastatin do?',
  ];

  function initAssistant() {
    populateInteractionSelects();
    if (assistantReady) return;
    assistantReady = true;
    botSay(`Hi ${prefs.name.split(' ')[0]}! 👋 I can explain your medications in plain language — what they do, what to do about missed or double doses, side effects, food rules, and what pairs well with them.\n\nTry a question below, or ask me anything about the medications in your list.`);
    $('#chatChips').innerHTML = CHIP_QUESTIONS.map((q) => `<button class="chip" data-q="${esc(q)}">${esc(q)}</button>`).join('');
  }

  $('#chatChips').addEventListener('click', (e) => {
    const chip = e.target.closest('[data-q]');
    if (chip) askAssistant(chip.dataset.q);
  });
  $('#chatForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const q = $('#chatInput').value.trim();
    if (!q) return;
    $('#chatInput').value = '';
    askAssistant(q);
  });

  function chatAppend(cls, html) {
    const el = document.createElement('div');
    el.className = 'msg ' + cls;
    el.innerHTML = html;
    $('#chatLog').appendChild(el);
    $('#chatLog').scrollTop = $('#chatLog').scrollHeight;
    return el;
  }
  function botSay(text) {
    chatAppend('bot', esc(text).replace(/\n/g, '<br>'));
  }

  function findMedsInText(text) {
    const t = ' ' + text.toLowerCase() + ' ';
    const found = [];
    for (const [key, info] of Object.entries(window.MED_KB)) {
      if (info.aliases.some((a) => t.includes(a.toLowerCase()))) found.push(key);
    }
    // Also match user meds not in the KB by name.
    meds.forEach((m) => {
      const name = m.name.toLowerCase();
      if (t.includes(name) && !found.includes(name) && !window.MED_KB[name]) found.push(name);
    });
    return found;
  }

  const INTENTS = [
    { key: 'tooMuch', re: /(too much|overdose|double(d)? (dose|up)|extra dose|twice|over-?appl)/i, label: 'If you take too much' },
    { key: 'missed', re: /(miss|forgot|skip|too little|didn'?t take|late dose)/i, label: 'If you miss a dose' },
    { key: 'sideEffects', re: /(side effect|reaction|purge|irritat|safe)/i, label: 'Common side effects' },
    { key: 'food', re: /(food|meal|eat|empty stomach|alcohol|drink)/i, label: 'Food & drink' },
    { key: 'timing', re: /(when|what time|morning|night|timing|how (do|should) i (take|use|apply))/i, label: 'When & how to take it' },
    { key: 'companions', re: /(pair|need after|alongside|companion|what (else|might i need)|moisturiz|sunscreen|with it|go with)/i, label: 'What pairs well with it' },
    { key: 'what', re: /(what is|what does|explain|tell me about|simple|how does .* work)/i, label: 'What it does' },
  ];

  function askAssistant(q) {
    chatAppend('user', esc(q));
    const typing = chatAppend('bot typing', '<i></i><i></i><i></i>');
    setTimeout(() => {
      typing.remove();
      answerQuestion(q);
    }, 500 + Math.random() * 400);
  }

  function answerQuestion(q) {
    const foundMeds = findMedsInText(q);
    const kbMeds = foundMeds.filter((f) => window.MED_KB[f]);

    // Interaction question with two meds?
    if (foundMeds.length >= 2 && /(with|together|combine|interact|mix|and)/i.test(q)) {
      const warn = lookupInteraction(foundMeds[0], foundMeds[1]);
      const title = `${cap(foundMeds[0])} + ${cap(foundMeds[1])}`;
      if (warn) {
        botSay(`⚠️ ${title}\n\n${warn.warning}\n\nSeverity: ${warn.severity}.\n\n${window.ASSISTANT_DISCLAIMER}`);
      } else {
        botSay(`I don't have a specific interaction warning for ${title} in my local knowledge base — that doesn't guarantee safety, it just means it's not in my list. Your pharmacist can run a full interaction check in seconds.\n\n${window.ASSISTANT_DISCLAIMER}`);
      }
      return;
    }

    if (kbMeds.length === 0) {
      if (foundMeds.length > 0) {
        botSay(`I can see ${cap(foundMeds[0])} in your list, but I don't have detailed notes on it in my local knowledge base. Your pharmacist or the printed leaflet are the best sources for specifics.\n\n${window.ASSISTANT_DISCLAIMER}`);
      } else {
        botSay(`I couldn't match that to one of your medications. Try naming the medication, e.g. “What if I miss my lisinopril?” or “What pairs well with tretinoin?”\n\nMedications I know well: ${Object.keys(window.MED_KB).map(cap).join(', ')}.`);
      }
      return;
    }

    const med = kbMeds[0];
    const info = window.MED_KB[med];
    const matched = INTENTS.filter((it) => it.re.test(q));
    const sections = matched.length ? matched : [INTENTS.find((i) => i.key === 'what'), INTENTS.find((i) => i.key === 'timing')];
    const parts = [`💊 ${cap(med)}`];
    const seen = new Set();
    sections.forEach((s) => {
      if (!s || seen.has(s.key) || !info[s.key]) return;
      seen.add(s.key);
      parts.push(`${s.label}:\n${info[s.key]}`);
    });
    parts.push(window.ASSISTANT_DISCLAIMER);
    botSay(parts.join('\n\n'));
  }

  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

  function lookupInteraction(a, b) {
    const norm = (x) => x.toLowerCase();
    return window.MED_INTERACTIONS.find((it) => {
      const [p, qq] = it.pair.map(norm);
      return (p === norm(a) && qq === norm(b)) || (p === norm(b) && qq === norm(a));
    });
  }

  // Interaction checker widget
  function populateInteractionSelects() {
    const kbNames = Object.keys(window.MED_KB);
    const userNames = meds.map((m) => m.name.toLowerCase());
    const all = [...new Set([...userNames, ...kbNames, 'warfarin', 'grapefruit', 'alcohol', 'benzoyl peroxide', 'salicylic acid', 'potassium', 'clopidogrel'])].sort();
    const opts = all.map((n) => `<option value="${esc(n)}">${esc(cap(n))}</option>`).join('');
    $('#interA').innerHTML = opts;
    $('#interB').innerHTML = opts;
    if (all.includes('ibuprofen')) $('#interA').value = 'ibuprofen';
    if (all.includes('lisinopril')) $('#interB').value = 'lisinopril';
  }

  $('#interCheckBtn').onclick = () => {
    const a = $('#interA').value, b = $('#interB').value;
    if (a === b) { $('#interResult').innerHTML = '<div class="inter-ok">Pick two different medications to compare.</div>'; return; }
    const warn = lookupInteraction(a, b);
    $('#interResult').innerHTML = warn
      ? `<div class="inter-warn"><strong>⚠️ ${esc(cap(a))} × ${esc(cap(b))} — ${esc(warn.severity)} interaction</strong>${esc(warn.warning)}<br><br><em>${esc(window.ASSISTANT_DISCLAIMER)}</em></div>`
      : `<div class="inter-ok">✅ No interaction found between <strong>${esc(cap(a))}</strong> and <strong>${esc(cap(b))}</strong> in the local knowledge base. This isn't a guarantee — your pharmacist can run a complete check.</div>`;
  };

  // ---------- Health tracking ----------
  const HEALTH_TYPES = {
    bp: { label: 'Blood Pressure', unit: 'mmHg', emoji: '🩺', placeholder: '120/80' },
    sugar: { label: 'Blood Sugar', unit: 'mg/dL', emoji: '🩸', placeholder: '95' },
    weight: { label: 'Weight', unit: 'kg', emoji: '⚖️', placeholder: '70.5' },
    heart: { label: 'Heart Rate', unit: 'bpm', emoji: '❤️', placeholder: '72' },
    mood: { label: 'Mood', unit: '/10', emoji: '😊', placeholder: '8' },
    sleep: { label: 'Sleep', unit: 'h', emoji: '😴', placeholder: '7.5' },
    water: { label: 'Water', unit: 'glasses', emoji: '💧', placeholder: '6' },
    symptom: { label: 'Symptom', unit: '', emoji: '🤒', placeholder: 'mild headache' },
  };
  let activeHealthType = 'bp';

  function renderHealthTypes() {
    $('#healthTypes').innerHTML = Object.entries(HEALTH_TYPES).map(([k, v]) =>
      `<button class="chip ${k === activeHealthType ? 'active' : ''}" data-htype="${k}">${v.emoji} ${v.label}</button>`).join('');
    $('#healthUnit').textContent = HEALTH_TYPES[activeHealthType].unit;
    $('#healthLogInput').placeholder = HEALTH_TYPES[activeHealthType].placeholder;
  }
  $('#healthTypes').addEventListener('click', (e) => {
    const chip = e.target.closest('[data-htype]');
    if (!chip) return;
    activeHealthType = chip.dataset.htype;
    renderHealthTypes();
    $('#healthLogInput').focus();
  });

  async function loadHealth() {
    renderHealthTypes();
    try {
      healthEntries = await api('/health');
    } catch (err) { return toast(err.message, 'error'); }
    renderHealthTrends();
    renderHealthList();
  }

  function numericOf(e) {
    const m = String(e.value).match(/-?\d+(\.\d+)?/);
    return m ? parseFloat(m[0]) : null;
  }

  function renderHealthTrends() {
    const byType = {};
    healthEntries.forEach((e) => { (byType[e.type] = byType[e.type] || []).push(e); });
    $('#healthTrends').innerHTML = Object.entries(byType).map(([type, list]) => {
      const meta = HEALTH_TYPES[type] || { label: type, unit: '', emoji: '📊' };
      const latest = list[0];
      const nums = list.map(numericOf).filter((n) => n != null).slice(0, 10).reverse();
      let spark = '';
      if (nums.length > 1) {
        const min = Math.min(...nums), max = Math.max(...nums), range = max - min || 1;
        const pts = nums.map((n, i) => `${(i / (nums.length - 1)) * 100},${34 - ((n - min) / range) * 30}`).join(' ');
        spark = `<svg class="trend-spark" viewBox="0 0 100 36" preserveAspectRatio="none"><polyline points="${pts}"/></svg>`;
      }
      return `
        <div class="card trend-card hoverable">
          <div class="trend-head"><span>${meta.emoji} ${esc(meta.label)}</span><span class="muted">${fmtWhen(latest.at)}</span></div>
          <div class="trend-val">${esc(latest.value)} <span class="muted small">${esc(meta.unit)}</span></div>
          ${spark}
        </div>`;
    }).join('') || '';
  }

  function renderHealthList() {
    $('#healthLogList').innerHTML = healthEntries.slice(0, 20).map((e) => {
      const meta = HEALTH_TYPES[e.type] || { label: e.type, unit: '', emoji: '📊' };
      return `
        <div class="act-item">
          <span class="act-icon">${meta.emoji}</span>
          <div class="act-info">
            <div class="act-msg">${esc(meta.label)}: ${esc(e.value)} ${esc(meta.unit)}</div>
            <div class="act-when">${fmtWhen(e.at)}${e.note ? ' · ' + esc(e.note) : ''}</div>
          </div>
          <button class="mini-btn danger" data-hdel="${e.id}">✕</button>
        </div>`;
    }).join('') || '<p class="muted">No health entries yet. Log your first one above.</p>';
  }

  document.body.addEventListener('click', async (e) => {
    const del = e.target.closest('[data-hdel]');
    if (!del) return;
    try {
      await api('/health/' + del.dataset.hdel, { method: 'DELETE' });
      loadHealth();
    } catch (err) { toast(err.message, 'error'); }
  });

  $('#healthLogForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const value = $('#healthLogInput').value.trim();
    if (!value) return;
    try {
      await api('/health', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: activeHealthType,
          value,
          unit: HEALTH_TYPES[activeHealthType].unit,
          note: $('#healthNote').value.trim() || null,
        }),
      });
      $('#healthLogInput').value = '';
      $('#healthNote').value = '';
      toast('Health data logged ✓', 'success');
      loadHealth();
      refresh();
    } catch (err) { toast(err.message, 'error'); }
  });

  $('#qaLog').onclick = () => { showPage('healthlog'); setTimeout(() => $('#healthLogInput').focus(), 50); };
  $('#qaAsk').onclick = () => showPage('assistant');

  // ---------- Reports ----------
  async function renderReport() {
    const days = +$('#reportRange').value;
    let ana;
    try { ana = await api('/analytics?days=' + days); } catch (e) { return; }
    const daily = dailyMeds();
    $('#reportContent').innerHTML = `
      <h3>Summary — last ${days} days (generated ${new Date().toLocaleDateString()})</h3>
      <div class="report-summary">
        <div class="report-stat"><b>${Math.round(100 * ana.taken / Math.max(ana.taken + ana.missed, 1))}%</b><span>Adherence</span></div>
        <div class="report-stat"><b>${ana.taken}</b><span>Doses taken</span></div>
        <div class="report-stat"><b>${ana.missed}</b><span>Doses missed</span></div>
        <div class="report-stat"><b>${ana.currentStreak} days</b><span>Current streak</span></div>
        <div class="report-stat"><b>${stats.totalMedications ?? meds.length}</b><span>Active medications</span></div>
      </div>
      <h3>Medication List</h3>
      <table>
        <thead><tr><th>Name</th><th>Dosage</th><th>Schedule</th><th>Doctor</th><th>Rx #</th><th>Instructions</th></tr></thead>
        <tbody>
          ${meds.map((m) => `<tr>
            <td>${esc(m.name)}</td><td>${esc(m.dosage)}</td>
            <td>${m.time ? 'Daily at ' + fmtTime12(m.time) : esc(m.frequency || '')}</td>
            <td>${esc(m.doctor || '—')}</td><td>${esc(m.rxNumber || '—')}</td>
            <td>${esc(m.instructions || '—')}</td>
          </tr>`).join('')}
        </tbody>
      </table>
      <h3>Per-Medication Adherence</h3>
      <table>
        <thead><tr><th>Medication</th><th>Taken</th><th>Missed</th><th>Skipped</th><th>Adherence</th></tr></thead>
        <tbody>
          ${ana.perMed.map((p) => `<tr><td>${esc(p.name)}</td><td>${p.taken}</td><td>${p.missed}</td><td>${p.skipped}</td><td>${p.adherence == null ? '—' : p.adherence + '%'}</td></tr>`).join('')}
        </tbody>
      </table>
      <h3>Recent Activity</h3>
      <table>
        <thead><tr><th>Event</th><th>Type</th><th>When</th></tr></thead>
        <tbody>
          ${activity.map((a) => `<tr><td>${esc(a.message)}</td><td>${esc(a.tag)}</td><td>${fmtWhen(a.at)}</td></tr>`).join('')}
        </tbody>
      </table>
      <p class="muted" style="margin-top:14px">Generated by MedReminder for ${esc(prefs.name)} — ${daily.length} daily medication(s) scheduled.</p>`;
  }
  $('#reportRange').addEventListener('change', renderReport);
  $('#printReportBtn').onclick = () => window.print();

  // ---------- Settings ----------
  $('#saveProfileBtn').onclick = () => {
    const name = $('#setName').value.trim();
    if (!name) return toast('Name can\'t be empty', 'error');
    prefs.name = name;
    setGreeting();
    toast('Profile saved ✓', 'success');
  };
  $('#setSnooze').value = prefs.snooze;
  $('#setSnooze').addEventListener('change', () => { prefs.snooze = +$('#setSnooze').value; renderReminders(); });
  $('#setMissedNotif').checked = prefs.missedNotif;
  $('#setMissedNotif').addEventListener('change', (e) => { prefs.missedNotif = e.target.checked; });
  $('#setReduceMotion').checked = localStorage.getItem('reduceMotion') === 'on';
  $('#setReduceMotion').addEventListener('change', (e) => {
    localStorage.setItem('reduceMotion', e.target.checked ? 'on' : 'off');
    document.documentElement.classList.toggle('reduce-motion', e.target.checked);
  });
  $('#resetPrefsBtn').onclick = () => {
    if (!confirm('Reset local preferences (theme, name, notification settings)? Your medication data is unaffected.')) return;
    localStorage.clear();
    location.reload();
  };

  async function exportData() {
    try {
      const data = await api('/export');
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `medreminder-export-${isoDate(new Date())}.json`;
      a.click();
      URL.revokeObjectURL(a.href);
      toast('Data exported 📦', 'success');
    } catch (err) { toast(err.message, 'error'); }
  }
  $('#exportBtn').onclick = exportData;
  $('#exportBtn2').onclick = exportData;

  // ---------- Confetti ----------
  function maybeConfetti() {
    const done = stats.todayTotal > 0 && stats.todayTaken === stats.todayTotal;
    if (done && prevTodayDone === false) {
      confettiBurst();
      toast('All medications taken today — amazing! 🎉', 'success');
    }
    prevTodayDone = done;
  }

  function confettiBurst() {
    if (document.documentElement.classList.contains('reduce-motion')) return;
    const canvas = $('#confetti');
    const ctx = canvas.getContext('2d');
    canvas.width = innerWidth;
    canvas.height = innerHeight;
    const colors = ['#2563eb', '#12b76a', '#7c5cfc', '#f59e0b', '#f43f5e'];
    const parts = Array.from({ length: 140 }, () => ({
      x: innerWidth / 2 + (Math.random() - .5) * 200,
      y: innerHeight * 0.35,
      vx: (Math.random() - .5) * 11,
      vy: -Math.random() * 11 - 4,
      size: Math.random() * 7 + 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      rot: Math.random() * Math.PI,
      vr: (Math.random() - .5) * .3,
    }));
    let frame = 0;
    (function tick() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      parts.forEach((p) => {
        p.x += p.vx; p.y += p.vy; p.vy += .28; p.rot += p.vr;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * .6);
        ctx.restore();
      });
      if (++frame < 130) requestAnimationFrame(tick);
      else ctx.clearRect(0, 0, canvas.width, canvas.height);
    })();
  }

  // ---------- PWA ----------
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(() => { /* offline features unavailable */ });
  }

  // ---------- Boot ----------
  setGreeting();
  refresh();
  setInterval(checkDueDoses, 20000);
  setInterval(refresh, 60000);
})();
