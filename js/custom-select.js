// Transforme un <select> natif en menu déroulant stylé, qui s'ouvre
// toujours vers le bas. Le <select> d'origine reste dans le DOM (masqué)
// pour que le reste du code (lecture de .value, écouteurs "change",
// repeuplement dynamique des options) continue de fonctionner sans
// modification : on se contente de le refléter visuellement.

function closeAll(except) {
  document.querySelectorAll('.cselect.is-open').forEach(el => {
    if (el !== except) el.classList.remove('is-open');
  });
}

document.addEventListener('click', e => {
  if (!e.target.closest('.cselect')) closeAll();
});

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeAll();
});

export function enhanceSelect(select) {
  if (!select || select.dataset.enhanced) return;
  select.dataset.enhanced = 'true';

  const wrap = document.createElement('div');
  wrap.className = 'cselect';
  select.parentNode.insertBefore(wrap, select);
  wrap.appendChild(select);
  select.classList.add('cselect-native');
  select.tabIndex = -1;

  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.className = 'cselect-trigger';
  trigger.innerHTML = `<span class="cselect-value"></span><svg class="cselect-arrow" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg>`;
  wrap.appendChild(trigger);

  const panel = document.createElement('ul');
  panel.className = 'cselect-panel';
  panel.setAttribute('role', 'listbox');
  wrap.appendChild(panel);

  const valueSpan = trigger.querySelector('.cselect-value');

  function sync() {
    valueSpan.textContent = select.options[select.selectedIndex]?.textContent || '';
    panel.innerHTML = '';
    [...select.options].forEach((opt, i) => {
      const li = document.createElement('li');
      li.className = 'cselect-option' + (i === select.selectedIndex ? ' is-selected' : '');
      li.textContent = opt.textContent;
      li.setAttribute('role', 'option');
      li.addEventListener('click', () => {
        select.value = opt.value;
        select.dispatchEvent(new Event('change', { bubbles: true }));
        wrap.classList.remove('is-open');
        sync();
      });
      panel.appendChild(li);
    });
  }

  trigger.addEventListener('click', () => {
    const willOpen = !wrap.classList.contains('is-open');
    closeAll(wrap);
    wrap.classList.toggle('is-open', willOpen);
  });

  new MutationObserver(sync).observe(select, { childList: true, subtree: true });
  select.addEventListener('change', sync);

  sync();
}
