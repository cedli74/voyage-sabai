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
  const slotsWrap = document.querySelector('.slots-grid');
  if (!daysWrap || !slotsWrap) return;

  const confirmDay = document.querySelector('[data-confirm-day]');
  const confirmSlot = document.querySelector('[data-confirm-slot]');
  const dayInput = document.querySelector('[data-confirm-day-input]');
  const slotInput = document.querySelector('[data-confirm-slot-input]');

  daysWrap.querySelectorAll('.day-pill').forEach((pill) => {
    pill.addEventListener('click', () => {
      daysWrap.querySelectorAll('.day-pill').forEach((p) => p.classList.remove('active'));
      pill.classList.add('active');
      const full = pill.dataset.full || '';
      if (confirmDay) confirmDay.textContent = full;
      if (dayInput) dayInput.value = full;
    });
  });

  slotsWrap.querySelectorAll('.slot').forEach((slot) => {
    if (slot.classList.contains('taken')) return;
    slot.addEventListener('click', () => {
      slotsWrap.querySelectorAll('.slot').forEach((s) => s.classList.remove('active'));
      slot.classList.add('active');
      const time = slot.textContent.trim();
      if (confirmSlot) confirmSlot.textContent = time;
      if (slotInput) slotInput.value = time;
    });
  });

  const preselectedDay = daysWrap.querySelector('.day-pill.active');
  if (preselectedDay) {
    const full = preselectedDay.dataset.full || '';
    if (confirmDay) confirmDay.textContent = full;
    if (dayInput) dayInput.value = full;
  }
}

function initBookingForm() {
  const bookingForm = document.getElementById('booking-form');
  const messageBox = document.getElementById('booking-message');
  if (!bookingForm) return;

  bookingForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const dayInput = bookingForm.querySelector('[data-confirm-day-input]');
    const slotInput = bookingForm.querySelector('[data-confirm-slot-input]');
    if ((dayInput && !dayInput.value) || (slotInput && !slotInput.value)) {
      if (messageBox) messageBox.textContent = 'Choisissez un jour et un créneau avant de confirmer.';
      return;
    }

    const formData = new FormData(bookingForm);
    const payload = Object.fromEntries(formData.entries());

    if (messageBox) messageBox.textContent = 'Envoi de la réservation en cours...';

    try {
      const response = await fetch('/api/booking/create-booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error('La réservation n’a pas pu être enregistrée.');
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
      adultRate: 50,
      childRate: 25,
      totalLabel: 'Formule 2 — Organisation complète',
      adultText: '50 € par période de 2 semaines, par adulte',
      childText: '25 € par période de 2 semaines, par enfant',
    },
    3: {
      adultRate: 75,
      childRate: 40,
      totalLabel: 'Formule 3 — Planning jour par jour',
      adultText: '75 € par période de 2 semaines, par adulte',
      childText: '40 € par période de 2 semaines, par enfant',
    },
  };

  const limits = {
    adults: { min: 1, max: 12 },
    children: { min: 0, max: 12 },
    periods: { min: 1, max: 12 },
  };

  const formulaButtons = box.querySelectorAll('.calc-formula-btn');
  const adultRateEl = box.querySelector('[data-calc-adult-rate]');
  const childRateEl = box.querySelector('[data-calc-child-rate]');
  const totalLabelEl = box.querySelector('[data-calc-total-label]');
  const weeksEquivEl = box.querySelector('[data-calc-weeks-equiv]');
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
    const periods = readValue('periods');
    const f = formulas[activeFormula];
    const total = (adults * f.adultRate + children * f.childRate) * periods;
    const totalEl = document.querySelector('[data-calc-total]');
    if (totalEl) totalEl.textContent = `${total} €`;
    if (weeksEquivEl) weeksEquivEl.textContent = String(periods * 2);
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
