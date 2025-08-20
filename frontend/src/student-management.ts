import { renderHeader } from './header';

interface Student {
    userId: string;
    username: string;
    status: 'active' | 'archived';
    authMethod: 'local' | 'google';
    createdAt: string;
    forcePasswordChange: boolean;
}

interface CreateStudentResponse {
    userId: string;
    username: string;
    tempPassword: string;
}

class StudentManagement {
    private currentFilter: string = 'all';
    private students: Student[] = [];
    private modals: any = {};

    constructor() {
        this.initializeModals();
        this.bindEvents();
        this.loadStudents();
    }

    private initializeModals(): void {
        // Initialize Bootstrap modals
        this.modals.createStudent = new (window as any).bootstrap.Modal(document.getElementById('createStudentModal'));
        this.modals.success = new (window as any).bootstrap.Modal(document.getElementById('successModal'));
        this.modals.confirmation = new (window as any).bootstrap.Modal(document.getElementById('confirmationModal'));
    }

    private bindEvents(): void {
        // Status filter buttons
        const filterButtons = document.querySelectorAll('input[name="statusFilter"]');
        filterButtons.forEach(button => {
            button.addEventListener('change', (e) => {
                const target = e.target as HTMLInputElement;
                this.currentFilter = target.value;
                this.filterStudents();
            });
        });

        // Create student button
        const createStudentBtn = document.getElementById('create-student-btn');
        if (createStudentBtn) {
            createStudentBtn.addEventListener('click', () => {
                this.showCreateStudentModal();
            });
        }

        // Create student form submit
        const createStudentSubmit = document.getElementById('create-student-submit');
        if (createStudentSubmit) {
            createStudentSubmit.addEventListener('click', () => {
                this.createStudent();
            });
        }

        // Username input validation
        const usernameInput = document.getElementById('username') as HTMLInputElement;
        if (usernameInput) {
            usernameInput.addEventListener('input', () => {
                this.validateUsername(usernameInput.value);
            });
        }
    }

    private async loadStudents(): Promise<void> {
        this.showLoading(true);
        this.hideMessages();

        try {
            const token = localStorage.getItem('jwt_token');
            if (!token) {
                window.location.href = '/index.html';
                return;
            }

            const response = await fetch('/api/examinator/students', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.status === 403) {
                this.showError("Åtkomst nekad. Du måste vara examinator.");
                return;
            }

            if (response.status === 401) {
                this.showError("Din session har gått ut. Logga in igen.");
                localStorage.removeItem('jwt_token');
                setTimeout(() => {
                    window.location.href = '/index.html';
                }, 2000);
                return;
            }

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP ${response.status}: ${errorText || 'Okänt fel'}`);
            }

            this.students = await response.json();
            this.renderStudentsTable();
            this.filterStudents();

        } catch (error) {
            console.error('Error loading students:', error);
            const errorMessage = error instanceof Error ? error.message : 'Kunde inte ladda studenterna.';
            this.showError(errorMessage);
        } finally {
            this.showLoading(false);
        }
    }

    private renderStudentsTable(): void {
        const tbody = document.getElementById('students-table-body');
        if (!tbody) return;

        tbody.innerHTML = '';

        if (this.students.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center">Inga studenter hittades.</td></tr>';
            return;
        }

        this.students.forEach(student => {
            const row = this.createStudentRow(student);
            tbody.appendChild(row);
        });
    }

    private createStudentRow(student: Student): HTMLTableRowElement {
        const row = document.createElement('tr');
        
        const statusClass = student.status === 'active' ? 'success' : 'secondary';
        const statusText = student.status === 'active' ? 'Aktiv' : 'Arkiverad';
        const passwordStatus = student.forcePasswordChange ? 'Nej' : 'Ja';
        const passwordClass = student.forcePasswordChange ? 'warning' : 'success';
        
        const createdAt = new Date(student.createdAt).toLocaleDateString('sv-SE');

        row.innerHTML = `
            <td>${student.username}</td>
            <td><span class="badge bg-${statusClass}">${statusText}</span></td>
            <td>${createdAt}</td>
            <td><span class="badge bg-${passwordClass}">${passwordStatus}</span></td>
            <td>
                ${this.createActionMenu(student)}
            </td>
        `;

        // Bind action events
        const actionLinks = row.querySelectorAll('[data-action]');
        actionLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const action = (link as HTMLElement).dataset.action;
                const studentId = (link as HTMLElement).dataset.studentId;
                if (action && studentId) {
                    this.handleStudentAction(action, studentId, student.username);
                }
            });
        });

        return row;
    }

    private createActionMenu(student: Student): string {
        const archiveOption = `<li><a class="dropdown-item text-warning" href="#" data-action="archive" data-student-id="${student.userId}"><i class="bi bi-archive"></i> Arkivera</a></li>`;
        const reactivateOption = `<li><a class="dropdown-item text-success" href="#" data-action="reactivate" data-student-id="${student.userId}"><i class="bi bi-arrow-clockwise"></i> Återaktivera</a></li>`;
        const resetPasswordOption = `<li><a class="dropdown-item" href="#" data-action="reset-password" data-student-id="${student.userId}"><i class="bi bi-key"></i> Återställ lösenord</a></li>`;
        const deleteOption = `<li><a class="dropdown-item text-danger" href="#" data-action="delete" data-student-id="${student.userId}"><i class="bi bi-trash"></i> Ta bort permanent</a></li>`;

        let options = '';
        if (student.status === 'active') {
            options += archiveOption;
        } else {
            options += reactivateOption;
        }
        if(student.authMethod !== 'google') {
            options += resetPasswordOption;
        }
        options += '<li><hr class="dropdown-divider"></li>';
        options += deleteOption;

        return `
        <div class="dropdown">
            <button class="btn btn-sm dropdown-toggle neutral-dropdown" type="button" data-bs-toggle="dropdown" aria-expanded="false">
                <i class="bi bi-three-dots-vertical"></i>
            </button>
            <ul class="dropdown-menu">
                ${options}
            </ul>
        </div>
        `;
        }

    private filterStudents(): void {
        const rows = document.querySelectorAll('#students-table-body tr');
        
        rows.forEach(row => {
            const statusCell = row.querySelector('td:nth-child(2)');
            if (!statusCell) return;

            const statusText = statusCell.textContent?.trim();
            let shouldShow = true;

            if (this.currentFilter === 'active') {
                shouldShow = statusText === 'Aktiv';
            } else if (this.currentFilter === 'archived') {
                shouldShow = statusText === 'Arkiverad';
            }

            (row as HTMLElement).style.display = shouldShow ? '' : 'none';
        });
    }

    private showCreateStudentModal(): void {
        const form = document.getElementById('create-student-form') as HTMLFormElement;
        if (form) {
            form.reset();
        }
        this.modals.createStudent.show();
    }

    private validateUsername(username: string): boolean {
        const submitBtn = document.getElementById('create-student-submit') as HTMLButtonElement;
        const isValid = username.length >= 3 && username.length <= 20;
        
        if (submitBtn) {
            submitBtn.disabled = !isValid;
        }
        
        return isValid;
    }

    private async createStudent(): Promise<void> {
        const usernameInput = document.getElementById('username') as HTMLInputElement;
        const username = usernameInput.value.trim();

        if (!username || !this.validateUsername(username)) {
            return;
        }

        // Show loading state on submit button
        const submitBtn = document.getElementById('create-student-submit') as HTMLButtonElement;
        const originalText = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Skapar...';

        try {
            const token = localStorage.getItem('jwt_token');
            if (!token) {
                window.location.href = '/index.html';
                return;
            }

            const response = await fetch('/api/examinator/students', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username })
            });

            if (response.status === 409) {
                this.showError('Användarnamnet finns redan. Välj ett annat.');
                return;
            }

            if (response.status === 401) {
                this.showError("Din session har gått ut. Logga in igen.");
                localStorage.removeItem('jwt_token');
                setTimeout(() => {
                    window.location.href = '/index.html';
                }, 2000);
                return;
            }

            if (response.status === 403) {
                this.showError("Du har inte behörighet att skapa studenter.");
                return;
            }

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP ${response.status}: ${errorText || 'Okänt fel'}`);
            }

            const result: CreateStudentResponse = await response.json();
            this.modals.createStudent.hide();
            this.showCreateStudentSuccess(result);
            this.loadStudents(); // Refresh the list

        } catch (error) {
            console.error('Error creating student:', error);
            const errorMessage = error instanceof Error ? error.message : 'Kunde inte skapa studenten.';
            this.showError(errorMessage);
        } finally {
            // Restore submit button
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        }
    }

    private showCreateStudentSuccess(result: CreateStudentResponse): void {
        const successModalLabel = document.getElementById('successModalLabel');
        const successMessage = document.getElementById('success-message');
        if (successModalLabel) {
            successModalLabel.textContent = "Student skapad!";
        }
        if (successMessage) {
            successMessage.innerHTML = `
                <div class="alert alert-success">
                    <strong>Studenten '${result.username}' har skapats!</strong><br>
                    <strong>Temporärt lösenord:</strong> <code>${result.tempPassword}</code>
                </div>
            `;
        }
        this.modals.success.show();
    }

    private showPasswordResetSuccess(tempPassword: string): void {
        const successModalLabel = document.getElementById('successModalLabel');
        const successMessage = document.getElementById('success-message');
        if (successModalLabel) {
            successModalLabel.textContent = "Lösenord återställt!";
        }
        if (successMessage) {
            successMessage.innerHTML = `
                <div class="alert alert-success">
                    <strong>Lösenordet har återställts!</strong><br>
                    <strong>Nytt temporärt lösenord:</strong> <code>${tempPassword}</code>
                </div>
            `;
        }
        this.modals.success.show();
    }

    private handleStudentAction(action: string, studentId: string, username: string): void {
        let message = '';
        let actionFunction: () => void;

        if (action === 'archive') {
            message = `Är du säker på att du vill arkivera studenten "${username}"? Denna student kommer inte att kunna logga in eller visas i provlistor.`;
            actionFunction = () => this.archiveStudent(studentId);
        } else if (action === 'reactivate') {
            message = `Är du säker på att du vill återaktivera studenten "${username}"?`;
            actionFunction = () => this.reactivateStudent(studentId);
        } else if (action === 'reset-password') {
            message = `Är du säker på att du vill återställa lösenordet för "${username}"? Ett nytt temporärt lösenord kommer att genereras.`;
            actionFunction = () => this.resetStudentPassword(studentId);
        } else if (action === 'delete') {
            message = `Är du helt säker på att du vill permanent ta bort studenten "${username}"? All data, inklusive provresultat, kommer att raderas för alltid. Denna åtgärd kan inte ångras.`;
            actionFunction = () => this.deleteStudent(studentId);
        } else {
            return;
        }

        const confirmationMessage = document.getElementById('confirmation-message');
        if (confirmationMessage) {
            confirmationMessage.textContent = message;
        }

        const confirmBtn = document.getElementById('confirm-action-btn');
        if (confirmBtn) {
            confirmBtn.onclick = actionFunction;
        }

        this.modals.confirmation.show();
    }

    private async archiveStudent(studentId: string): Promise<void> {
        try {
            const token = localStorage.getItem('jwt_token');
            if (!token) {
                window.location.href = '/index.html';
                return;
            }

            const response = await fetch(`/api/examinator/students/${studentId}/archive`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.status === 401) {
                this.showError("Din session har gått ut. Logga in igen.");
                localStorage.removeItem('jwt_token');
                setTimeout(() => {
                    window.location.href = '/index.html';
                }, 2000);
                return;
            }

            if (response.status === 403) {
                this.showError("Du har inte behörighet att arkivera studenter.");
                return;
            }

            if (response.status === 404) {
                this.showError("Studenten kunde inte hittas.");
                return;
            }

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP ${response.status}: ${errorText || 'Okänt fel'}`);
            }

            this.modals.confirmation.hide();
            this.showSuccess('Studenten har arkiverats framgångsrikt.');
            this.loadStudents(); // Refresh the list

        } catch (error) {
            console.error('Error archiving student:', error);
            const errorMessage = error instanceof Error ? error.message : 'Kunde inte arkivera studenten.';
            this.showError(errorMessage);
        }
    }

    private async reactivateStudent(studentId: string): Promise<void> {
        try {
            const token = localStorage.getItem('jwt_token');
            if (!token) {
                window.location.href = '/index.html';
                return;
            }

            const response = await fetch(`/api/examinator/students/${studentId}/reactivate`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.status === 401) {
                this.showError("Din session har gått ut. Logga in igen.");
                localStorage.removeItem('jwt_token');
                setTimeout(() => {
                    window.location.href = '/index.html';
                }, 2000);
                return;
            }

            if (response.status === 403) {
                this.showError("Du har inte behörighet att återaktivera studenter.");
                return;
            }

            if (response.status === 404) {
                this.showError("Studenten kunde inte hittas.");
                return;
            }

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP ${response.status}: ${errorText || 'Okänt fel'}`);
            }

            this.modals.confirmation.hide();
            this.showSuccess('Studenten har återaktiverats framgångsrikt.');
            this.loadStudents(); // Refresh the list

        } catch (error) {
            console.error('Error reactivating student:', error);
            const errorMessage = error instanceof Error ? error.message : 'Kunde inte återaktivera studenten.';
            this.showError(errorMessage);
        }
    }

    private async resetStudentPassword(studentId: string): Promise<void> {
        try {
            const token = localStorage.getItem('jwt_token');
            if (!token) {
                window.location.href = '/index.html';
                return;
            }

            const response = await fetch(`/api/examinator/students/${studentId}/reset-password`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                }
            });

            if (response.status === 401) {
                this.showError("Din session har gått ut. Logga in igen.");
                localStorage.removeItem('jwt_token');
                setTimeout(() => {
                    window.location.href = '/index.html';
                }, 2000);
                return;
            }

            if (response.status === 403) {
                this.showError("Du har inte behörighet att återställa lösenord.");
                return;
            }

            if (response.status === 404) {
                this.showError("Studenten kunde inte hittas.");
                return;
            }

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP ${response.status}: ${errorText || 'Okänt fel'}`);
            }

            const result = await response.json();
            this.modals.confirmation.hide();
            this.showPasswordResetSuccess(result.tempPassword);
            this.loadStudents(); // Refresh the list

        } catch (error) {
            console.error('Error resetting password:', error);
            const errorMessage = error instanceof Error ? error.message : 'Kunde inte återställa lösenordet.';
            this.showError(errorMessage);
        }
    }

    private async deleteStudent(studentId: string): Promise<void> {
        try {
            const token = localStorage.getItem('jwt_token');
            if (!token) {
                window.location.href = '/index.html';
                return;
            }

            const response = await fetch(`/api/examinator/students/${studentId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                }
            });

            if (response.status === 401) {
                this.showError("Din session har gått ut. Logga in igen.");
                localStorage.removeItem('jwt_token');
                setTimeout(() => {
                    window.location.href = '/index.html';
                }, 2000);
                return;
            }

            if (response.status === 403) {
                this.showError("Du har inte behörighet att ta bort studenter.");
                return;
            }

            if (response.status === 404) {
                this.showError("Studenten kunde inte hittas.");
                return;
            }

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP ${response.status}: ${errorText || 'Okänt fel'}`);
            }

            this.modals.confirmation.hide();
            this.showSuccess('Studenten har tagits bort permanent.');
            this.loadStudents(); // Refresh the list

        } catch (error) {
            console.error('Error deleting student:', error);
            const errorMessage = error instanceof Error ? error.message : 'Kunde inte ta bort studenten.';
            this.showError(errorMessage);
        }
    }

    private showLoading(show: boolean): void {
        const spinner = document.getElementById('loading-spinner');
        if (spinner) {
            spinner.classList.toggle('d-none', !show);
        }
    }

    private showError(message: string): void {
        const errorContainer = document.getElementById('error-container');
        if (errorContainer) {
            errorContainer.textContent = message;
            errorContainer.classList.remove('d-none');
        }
    }

    private showSuccess(message: string): void {
        const successContainer = document.getElementById('success-container');
        if (successContainer) {
            successContainer.textContent = message;
            successContainer.classList.remove('d-none');
            setTimeout(() => {
                successContainer.classList.add('d-none');
            }, 5000);
        }
    }

    private hideMessages(): void {
        const errorContainer = document.getElementById('error-container');
        const successContainer = document.getElementById('success-container');
        
        if (errorContainer) errorContainer.classList.add('d-none');
        if (successContainer) successContainer.classList.add('d-none');
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    renderHeader();
    new StudentManagement();
}); 