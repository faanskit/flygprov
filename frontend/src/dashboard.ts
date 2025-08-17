import { renderHeader } from './header';
import { logout } from './main';

document.addEventListener('DOMContentLoaded', async () => {
    renderHeader();

    const tableBody = document.getElementById('dashboard-table-body');

    const passwordChangeForm = document.getElementById('password-change-form') as HTMLFormElement;
    const changePasswordSubmit = document.getElementById('change-password-submit') as HTMLButtonElement;
    const errorMessage = document.getElementById('password-change-error');
    const token = localStorage.getItem('jwt_token');

    if (!token) {
        window.location.href = '/index.html';
        return;
    }

    // Password change form submission
    if (passwordChangeForm && changePasswordSubmit) {
        changePasswordSubmit.addEventListener('click', handlePasswordChange);
    }
    
    try {
        // Hämta både dashboard-data och tillgängliga prov samtidigt
        const [dashboardRes, testsRes] = await Promise.all([
            fetch('/api/student/dashboard', {
                headers: { 'Authorization': `Bearer ${token}` }
            }),
            fetch('/api/student/tests', {
                headers: { 'Authorization': `Bearer ${token}` }
            })
        ]);

        if (dashboardRes.status === 401 || testsRes.status === 401) {
            logout();
            return;
        }

        if (!dashboardRes.ok || !testsRes.ok) {
            throw new Error('Network response was not ok');
        }

        const dashboardResponse = await dashboardRes.json();
        const availableTests = await testsRes.json();

        // Check if password change is required
        if (dashboardResponse.forcePasswordChange) {
            const modalEl = document.getElementById('password-change-modal');
            const warningEl = document.getElementById('password-modal-warning');
            if (modalEl) {
                if(warningEl) warningEl.classList.remove('d-none');
                const modal = (window as any).bootstrap.Modal.getOrCreateInstance(modalEl);
                modal.show();
            }
        }

        renderTable(dashboardResponse.subjects, availableTests);

    } catch (error) {
        console.error('Error fetching dashboard data:', error);
        if (tableBody) {
            tableBody.innerHTML = '<tr><td colspan="5">Kunde inte ladda data. Försök att logga in igen.</td></tr>';
        }
    }

    async function handlePasswordChange(event: Event) {
        event.preventDefault();
        
        if (!changePasswordSubmit || !errorMessage) return;

        const currentPassword = (document.getElementById('current-password') as HTMLInputElement).value;
        const newPassword = (document.getElementById('new-password') as HTMLInputElement).value;
        const confirmPassword = (document.getElementById('confirm-password') as HTMLInputElement).value;

        errorMessage.classList.add('d-none');

        // Validation
        if (newPassword !== confirmPassword) {
            errorMessage.textContent = 'De nya lösenorden matchar inte.';
            errorMessage.classList.remove('d-none');
            return;
        }

        if (newPassword.length < 6) {
            errorMessage.textContent = 'Lösenordet måste vara minst 6 tecken långt.';
            errorMessage.classList.remove('d-none');
            return;
        }

        changePasswordSubmit.disabled = true;
        changePasswordSubmit.textContent = 'Ändrar...';

        try {
            const response = await fetch('/api/student/change-password', {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ currentPassword, newPassword })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Kunde inte ändra lösenord');
            }

            // Success - hide modal and refresh page
            const modalEl = document.getElementById('password-change-modal');
            if (modalEl) {
                const modal = (window as any).bootstrap.Modal.getInstance(modalEl);
                modal?.hide();
            }
            window.location.reload();

        } catch (error) {
            const errorText = error instanceof Error ? error.message : 'Ett fel uppstod';
            errorMessage.textContent = errorText;
            errorMessage.classList.remove('d-none');
        } finally {
            changePasswordSubmit.disabled = false;
            changePasswordSubmit.textContent = 'Spara ändringar';
        }
    }

    function renderTable(dashboardItems: any[], tests: any[]) {
        if (!tableBody) return;

        tableBody.innerHTML = ''; // Rensa befintlig data

        dashboardItems.forEach(item => {
            const row = document.createElement('tr');
            const statusClass = `status-${item.status.toLowerCase()}`;
            
            let actionCell = '<td></td>'; // Tom cell som standard

            // Om ämnet är tillgängligt, hitta provet och skapa en knapp
            if (item.status === 'available') {
                const testForSubject = tests.find(t => t.subjectId === item.subjectId && t.status === 'available');
                if (testForSubject) {
                    actionCell = `
                        <td>
                            <a href="/test.html?testId=${testForSubject._id}" class="btn-start">Starta Prov</a>
                        </td>
                    `;
                }
            }

            const statusText = 
                item.status === 'locked' ? 'Låst' :
                item.status === 'passed' ? 'Godkänd' :
                item.status === 'available' ? 'Tillgänglig' :
                item.status === 'in_progress' ? 'Pågående' : item.status;

            row.innerHTML = `
                <td>${item.subject}</td>
                <td><span class="status ${statusClass}">${statusText}</span></td>
                <td>${item.attempts}</td>
                <td>${item.bestScore || 'N/A'}</td>
                ${actionCell}
            `;
            tableBody.appendChild(row);
        });
    }
});