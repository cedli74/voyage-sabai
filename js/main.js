document.addEventListener('DOMContentLoaded', () => {
  initFooterYear();
  initMobileNav();
  initFaqAccordion();
  initScrollReveal();
  initBookingSelection();
  initBookingForm();
  initPricingCalculator();
  initDestinations();
});

function initFooterYear() {
  const year = String(new Date().getFullYear());
  document.querySelectorAll('[data-year]').forEach((el) => {
    el.textContent = year;
  });
}

function initMobileNav() {
  const toggle = document.getElementById('navToggle');
  const links = document.getElementById('navLinks');
  if (!toggle || !links) return;

  toggle.addEventListener('click', () => {
    const isOpen = links.classList.toggle('is-open');
    toggle.setAttribute('aria-expanded', String(isOpen));
  });

  links.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      links.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
    });
  });
}

function initFaqAccordion() {
  document.querySelectorAll('.faq-q').forEach((button) => {
    button.addEventListener('click', () => {
      const isOpen = button.getAttribute('aria-expanded') === 'true';
      button.setAttribute('aria-expanded', String(!isOpen));
    });
  });
}

function initScrollReveal() {
  const items = document.querySelectorAll('.reveal');
  if (!items.length) return;

  if (!('IntersectionObserver' in window)) return;

  items.forEach((item) => item.classList.add('reveal-hidden'));

  const observer = new IntersectionObserver(
    (entries, obs) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.remove('reveal-hidden');
          obs.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
  );

  items.forEach((item) => observer.observe(item));
}

function initBookingSelection() {
  const daysWrap = document.getElementById('bookingDays');
  const slotsWrap = document.getElementById('bookingSlots');
  if (!daysWrap || !slotsWrap) return;

  const slotsMessage = document.getElementById('slots-message');
  const confirmDay = document.querySelector('[data-confirm-day]');
  const confirmSlot = document.querySelector('[data-confirm-slot]');
  const dayInput = document.querySelector('[data-confirm-day-input]');
  const dateInput = document.querySelector('[data-confirm-date-input]');
  const slotInput = document.querySelector('[data-confirm-slot-input]');

  const DAYS_AHEAD = 14;
  const dayFormatter = new Intl.DateTimeFormat('fr-FR', { weekday: 'short' });
  const fullFormatter = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

  const toISODate = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const capitalize = (str) => str.charAt(0).toUpperCase() + str.slice(1);

  function clearSelectedSlot() {
    if (confirmSlot) confirmSlot.textContent = '—';
    if (slotInput) slotInput.value = '';
  }

  async function loadSlots(dateISO) {
    clearSelectedSlot();
    slotsWrap.innerHTML = '';
    if (slotsMessage) slotsMessage.textContent = 'Chargement des créneaux...';

    try {
      const response = await fetch(`/api/booking/availability?date=${dateISO}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Impossible de charger les créneaux.');

      if (!data.slots.length) {
        if (slotsMessage) slotsMessage.textContent = 'Aucun créneau disponible ce jour — essayez un autre jour.';
        return;
      }

      if (slotsMessage) slotsMessage.textContent = '';

      data.slots.forEach((slot) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'slot';
        btn.textContent = slot;
        btn.addEventListener('click', () => {
          slotsWrap.querySelectorAll('.slot').forEach((s) => s.classList.remove('active'));
          btn.classList.add('active');
          if (confirmSlot) confirmSlot.textContent = slot;
          if (slotInput) slotInput.value = slot;
        });
        slotsWrap.appendChild(btn);
      });
    } catch (error) {
      if (slotsMessage) slotsMessage.textContent = error.message;
    }
  }

  function selectDay(pill, dateISO, full) {
    daysWrap.querySelectorAll('.day-pill').forEach((p) => p.classList.remove('active'));
    pill.classList.add('active');
    if (confirmDay) confirmDay.textContent = full;
    if (dayInput) dayInput.value = full;
    if (dateInput) dateInput.value = dateISO;
    loadSlots(dateISO);
  }

  for (let i = 0; i < DAYS_AHEAD; i++) {
    const date = new Date();
    date.setDate(date.getDate() + i);
    const dateISO = toISODate(date);
    const full = capitalize(fullFormatter.format(date));

    const pill = document.createElement('button');
    pill.type = 'button';
    pill.className = 'day-pill';
    pill.dataset.full = full;
    pill.dataset.date = dateISO;
    pill.innerHTML = `<span>${dayFormatter.format(date).replace('.', '').toUpperCase()}</span><span class="d-num">${date.getDate()}</span>`;
    pill.addEventListener('click', () => selectDay(pill, dateISO, full));
    daysWrap.appendChild(pill);

    if (i === 0) selectDay(pill, dateISO, full);
  }
}

function initBookingForm() {
  const bookingForm = document.getElementById('booking-form');
  const messageBox = document.getElementById('booking-message');
  if (!bookingForm) return;

  bookingForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const dayInput = bookingForm.querySelector('[data-confirm-day-input]');
    const dateInput = bookingForm.querySelector('[data-confirm-date-input]');
    const slotInput = bookingForm.querySelector('[data-confirm-slot-input]');
    if ((dayInput && !dayInput.value) || (dateInput && !dateInput.value) || (slotInput && !slotInput.value)) {
      if (messageBox) messageBox.textContent = 'Choisissez un jour et un créneau avant de confirmer.';
      return;
    }

    const formData = new FormData(bookingForm);
    const payload = Object.fromEntries(formData.entries());

    if (messageBox) messageBox.textContent = 'Envoi de la demande en cours...';

    try {
      const response = await fetch('/api/booking/create-booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || 'La demande n’a pas pu être enregistrée.');
      }

      if (messageBox) messageBox.textContent = '';

      const panel = bookingForm.querySelector('.booking-form-panel');
      const success = bookingForm.querySelector('.booking-success');
      if (panel && success) {
        panel.style.display = 'none';
        success.style.display = 'block';
      }
      bookingForm.reset();
    } catch (error) {
      if (messageBox) messageBox.textContent = error.message;
    }
  });
}

function initPricingCalculator() {
  const box = document.querySelector('.calc-box');
  if (!box) return;

  const formulas = {
    2: {
      adultBase: 50,
      adultStep: 25,
      childBase: 25,
      childStep: 12.5,
      totalLabel: 'Formule 2 — Organisation complète',
      adultText: '50 € les 2 premières semaines, puis 25 €/semaine, par adulte',
      childText: '25 € les 2 premières semaines, puis 12,5 €/semaine, par enfant (-12 ans)',
    },
    3: {
      adultBase: 70,
      adultStep: 35,
      childBase: 40,
      childStep: 20,
      totalLabel: 'Formule 3 — Planning jour par jour',
      adultText: '70 € les 2 premières semaines, puis 35 €/semaine, par adulte',
      childText: '40 € les 2 premières semaines, puis 20 €/semaine, par enfant (-12 ans)',
    },
  };

  const limits = {
    adults: { min: 1, max: 12 },
    children: { min: 0, max: 12 },
    weeks: { min: 1, max: 12 },
  };

  const formulaButtons = box.querySelectorAll('.calc-formula-btn');
  const adultRateEl = box.querySelector('[data-calc-adult-rate]');
  const childRateEl = box.querySelector('[data-calc-child-rate]');
  const totalLabelEl = box.querySelector('[data-calc-total-label]');
  let activeFormula = '2';

  const readValue = (key) => {
    const el = box.querySelector(`[data-calc="${key}"]`);
    return el ? parseInt(el.textContent, 10) || 0 : 0;
  };

  const writeValue = (key, value) => {
    const el = box.querySelector(`[data-calc="${key}"]`);
    if (el) el.textContent = String(value);
  };

  const updateFormulaDisplay = () => {
    const f = formulas[activeFormula];
    if (adultRateEl) adultRateEl.textContent = f.adultText;
    if (childRateEl) childRateEl.textContent = f.childText;
    if (totalLabelEl) totalLabelEl.textContent = f.totalLabel;
  };

  const recalcTotal = () => {
    const adults = readValue('adults');
    const children = readValue('children');
    const weeks = readValue('weeks');
    const f = formulas[activeFormula];
    const extraWeeks = Math.max(0, weeks - 2);
    const perAdult = f.adultBase + f.adultStep * extraWeeks;
    const perChild = f.childBase + f.childStep * extraWeeks;
    const total = Math.round(adults * perAdult + children * perChild);
    const totalEl = document.querySelector('[data-calc-total]');
    if (totalEl) totalEl.textContent = `${total} €`;
  };

  formulaButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      formulaButtons.forEach((b) => b.classList.toggle('active', b === btn));
      activeFormula = btn.dataset.formula;
      updateFormulaDisplay();
      recalcTotal();
    });
  });

  box.querySelectorAll('[data-step]').forEach((button) => {
    button.addEventListener('click', () => {
      const key = button.dataset.step;
      const dir = parseInt(button.dataset.dir, 10) || 0;
      const { min, max } = limits[key] || { min: 0, max: 99 };
      const next = Math.min(max, Math.max(min, readValue(key) + dir));
      writeValue(key, next);
      recalcTotal();
    });
  });

  updateFormulaDisplay();
  recalcTotal();
}

function initDestinations() {
  const thumbs = document.querySelectorAll('.dest-thumb');
  if (!thumbs.length) return;

  const explorer = document.getElementById('destExplorer');
  const panels = document.querySelectorAll('.dest-panel');
  const regions = document.querySelectorAll('.dest-region');
  const backBtn = document.getElementById('destBackBtn');

  function selectCity(thumbEl) {
    const city = thumbEl.dataset.city;
    thumbs.forEach((t) => t.classList.toggle('active', t === thumbEl));
    panels.forEach((p) => {
      p.hidden = p.dataset.city !== city;
    });
    const activeRegion = thumbEl.closest('.dest-region');
    regions.forEach((r) => {
      r.hidden = r !== activeRegion;
    });
    if (explorer) explorer.classList.add('is-active');
  }

  thumbs.forEach((t) => {
    t.addEventListener('click', () => selectCity(t));
  });

  if (backBtn && explorer) {
    backBtn.addEventListener('click', () => {
      explorer.classList.remove('is-active');
      regions.forEach((r) => {
        r.hidden = false;
      });
    });
  }
}
