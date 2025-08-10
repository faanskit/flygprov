document.addEventListener('DOMContentLoaded', async () => {
    const tableBody = document.getElementById('dashboard-table-body');
    const logoutButton = document.getElementById('logout-button');
    const token = localStorage.getItem('jwt_token');

    if (!token) {
        window.location.href = '/index.html';
        return;
    }

    if (logoutButton) {
        logoutButton.addEventListener('click', () => {
            localStorage.removeItem('jwt_token');
            window.location.href = '/index.html';
        });
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
            localStorage.removeItem('jwt_token');
            window.location.href = '/index.html';
            throw new Error('Unauthorized');
        }

        if (!dashboardRes.ok || !testsRes.ok) {
            throw new Error('Network response was not ok');
        }

        const dashboardData = await dashboardRes.json();
        const availableTests = await testsRes.json();

        renderTable(dashboardData, availableTests);

    } catch (error) {
        console.error('Error fetching dashboard data:', error);
        if (tableBody) {
            tableBody.innerHTML = '<tr><td colspan="5">Kunde inte ladda data. Försök att logga in igen.</td></tr>';
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
                const testForSubject = tests.find(t => t.subjectId === item.subjectId);
                if (testForSubject) {
                    actionCell = `
                        <td>
                            <a href="/test.html?testId=${testForSubject._id}" class="btn-start">Starta Prov</a>
                        </td>
                    `;
                }
            }

            row.innerHTML = `
                <td>${item.subject}</td>
                <td><span class="status ${statusClass}">${item.status}</span></td>
                <td>${item.attempts}</td>
                <td>${item.bestScore || 'N/A'}</td>
                ${actionCell}
            `;
            tableBody.appendChild(row);
        });
    }
});