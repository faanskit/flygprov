import { getUser, logout } from './main';

const renderHeader = () => {
    const user = getUser();
    const headerPlaceholder = document.getElementById('app-header-placeholder');
    
    // Om det inte finns en header-placeholder (t.ex. på inloggningssidan) eller ingen användare, gör inget.
    if (!headerPlaceholder || !user) {
        return;
    }

    // Fyll platshållaren med det faktiska header-innehållet
    headerPlaceholder.className = 'app-header';
    headerPlaceholder.innerHTML = `
        <div class="header-container">
            <div class="header-left">
                <img src="/img/LOGGA_KFK_Web-5cm.jpg" alt="Kalmar Flygklubb" class="logo">
                <nav id="main-nav"></nav>
            </div>
            <div class="header-right">
                <span class="user-name">${user.username}</span>
                <button id="change-password-header-btn" class="btn btn-secondary btn-sm">Ändra lösenord</button>
                <button id="logout-button-header" class="btn btn-danger btn-sm">Logga ut</button>
            </div>
        </div>
    `;

    // Lägg till event listeners
    document.getElementById('logout-button-header')?.addEventListener('click', logout);

    document.getElementById('change-password-header-btn')?.addEventListener('click', () => {
        const modalEl = document.getElementById('password-change-modal');
        if (modalEl) {
            const modal = (window as any).bootstrap.Modal.getOrCreateInstance(modalEl);
            modal.show();
        }
    });
    
    // Rendera navigationen
    renderNavigation(user.role);
};

const renderNavigation = (role: 'student' | 'examinator' | 'admin') => {
    const navContainer = document.getElementById('main-nav');
    if (!navContainer) return;

    let navLinks = '';
    const currentPage = window.location.pathname;

    if (role === 'student') {
        navLinks = `<a href="/dashboard.html" class="${currentPage.includes('dashboard.html') ? 'active' : ''}">Översikt</a>`;
    } else if (role === 'examinator') {
        navLinks = `
            <a href="/examinator.html" class="${currentPage.includes('examinator.html') ? 'active' : ''}">Översikt</a>
            <a href="/student-management.html" class="${currentPage.includes('student-management.html') ? 'active' : ''}">Hantera Studenter</a>
        `;
    } else if (role === 'admin') {
        navLinks = `<span class="nav-role">Adminpanel</span>`;
    }

    navContainer.innerHTML = navLinks;
};

export { renderHeader };