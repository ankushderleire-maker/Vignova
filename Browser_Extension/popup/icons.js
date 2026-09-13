/* Packaged icons only. No remote fonts, scripts, or icon libraries. */
const VignovaIcons = (() => {
    const paths = {
        bolt: '<path d="m13 2-9 12h7l-1 8 10-12h-7z"/>',
        chart: '<path d="M5 20V12m7 8V4m7 16V9"/>',
        user: '<circle cx="12" cy="7" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/>',
        settings: '<path d="m9 3-1 3-3 1v4l-2 1 2 2v3l3 1 1 3h5l1-3 3-1v-3l2-2-2-1V7l-3-1-1-3z"/><circle cx="11.5" cy="12" r="3"/>',
        close: '<path d="m6 6 12 12M18 6 6 18"/>',
        down: '<path d="m8 10 4 4 4-4"/>',
        right: '<path d="m9 5 7 7-7 7"/>',
        arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
        back: '<path d="M20 12H4m6-6-6 6 6 6"/>',
        file: '<path d="M14 3H6v18h12V7zM14 3v5h4M9 12h6m-6 4h6"/>',
        letter: '<path d="M14 3H6v18h12V7zM14 3v5h4M9 12h6m-6 4h6"/>',
        // Generic profile-card mark, not any network's logo. popup.js swaps in
        // assets/linkedin.svg at runtime when that official asset is present.
        linkedin: '<rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="9" cy="10" r="2"/><path d="M5.5 17c.6-1.8 2-2.7 3.5-2.7s2.9.9 3.5 2.7M15 9h3.5M15 13h3.5"/>',
        chat: '<path d="M5 3h14v14H9l-4 4z"/><path d="m9 9 2 2 4-4"/>',
        check: '<path d="m5 12 4 4L19 6"/>',
        checkCircle: '<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>',
        list: '<path d="M9 5h12M9 12h12M9 19h12M3 5h.1M3 12h.1M3 19h.1"/>',
        bookmark: '<path d="M6 3h12v18l-6-4-6 4z"/>',
        rocket: '<path d="M8 15 5 12l3-5 4 1c3-5 8-5 9-5 0 5-2 8-5 10l1 4-5 3-3-3M4 17l-2 5 5-2"/><circle cx="16" cy="7" r="2"/>',
        bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 7 3 9H3c0-2 3-2 3-9m4 12h4"/>',
        briefcase: '<rect x="3" y="7" width="18" height="14" rx="2"/><path d="M8 7V3h8v4M3 12c6 3 12 3 18 0m-9-1v5"/>',
        copy: '<rect x="8" y="3" width="12" height="14" rx="2"/><path d="M15 17v4H3V7h5"/>',
        email: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 6 9 7 9-7"/>',
        phone: '<path d="M5 3h4l2 5-3 2c2 3 3 4 6 6l2-3 5 2v4c0 5-18-1-18-12z"/>',
        pin: '<path d="M19 9c0 6-7 12-7 12S5 15 5 9a7 7 0 0 1 14 0Z"/><circle cx="12" cy="9" r="2"/>',
        link: '<path d="m10 13 4-4m-6 6-1 1a4 4 0 0 1-6-6l4-4a4 4 0 0 1 6 0m2 2 1-1a4 4 0 0 1 6 6l-4 4a4 4 0 0 1-6 0"/>',
        globe: '<circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18"/>',
        education: '<path d="m2 8 10-5 10 5-10 5zM6 10v7c4 3 8 3 12 0v-7m4-2v8"/>',
        spark: '<path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5zM20 2v4m-2-2h4"/>',
        bulb: '<path d="M8 17h8m-7 4h6M8 14a6 6 0 1 1 8 0v3H8zM12 1v1M1 8h2m18 0h2M3 2l2 2m14 0 2-2"/>',
        edit: '<path d="m15 3 6 6-12 12H3v-6zM12 6l6 6"/>',
        switch: '<path d="M4 7h16m-4-4 4 4-4 4M20 17H4m4-4-4 4 4 4"/>',
        plus: '<path d="M12 5v14M5 12h14"/>',
        lock: '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V6a4 4 0 0 1 8 0v4m-4 5v2"/>',
        download: '<path d="M12 3v12m-5-5 5 5 5-5M4 17v4h16v-4"/>',
        refresh: '<path d="M20 7a9 9 0 1 0 1 9M20 2v6h-6"/>',
        clock: '<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/>',
    };
    function svg(name) {
        return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.file}</svg>`;
    }
    function render(root = document) {
        root.querySelectorAll('[data-icon]').forEach(el => {
            el.innerHTML = svg(el.dataset.icon);
        });
    }
    return { svg, render };
})();
