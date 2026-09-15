// Vignova site navigation. The menus are <details> elements, so every link is
// reachable without this script; it only closes menus the way people expect.
(() => {
  const dropdowns = [...document.querySelectorAll('.vn-dropdown')];
  const mobile = document.querySelector('.vn-mobile');
  const hoverable = window.matchMedia('(hover: hover) and (pointer: fine)');

  const closeDropdowns = (except) => {
    dropdowns.forEach((menu) => {
      if (menu !== except) menu.open = false;
    });
  };

  dropdowns.forEach((menu) => {
    menu.addEventListener('toggle', () => {
      if (menu.open) closeDropdowns(menu);
    });

    // Desktop pointers open on hover too; a short delay stops the menu
    // flickering shut while the pointer crosses the gap to the panel.
    let closeTimer = 0;
    menu.addEventListener('mouseenter', () => {
      if (!hoverable.matches) return;
      window.clearTimeout(closeTimer);
      menu.open = true;
    });
    menu.addEventListener('mouseleave', () => {
      if (!hoverable.matches) return;
      closeTimer = window.setTimeout(() => {
        menu.open = false;
      }, 160);
    });
  });

  document.addEventListener('click', (event) => {
    if (!event.target.closest('.vn-dropdown')) closeDropdowns();
    if (mobile && mobile.open && !event.target.closest('.vn-mobile')) mobile.open = false;
  });

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    const open = dropdowns.find((menu) => menu.open) || (mobile && mobile.open ? mobile : null);
    if (!open) return;
    open.open = false;
    const summary = open.querySelector('summary');
    if (summary) summary.focus();
  });

  // A same-page link, such as /#plans on the home page, would otherwise leave
  // the menu covering the section it just scrolled to.
  document.querySelectorAll('.vn-dropdown a, .vn-mobile a').forEach((link) => {
    link.addEventListener('click', () => {
      closeDropdowns();
      if (mobile) mobile.open = false;
    });
  });

  document.querySelectorAll('[data-vn-year]').forEach((element) => {
    element.textContent = String(new Date().getFullYear());
  });
})();
