import { renderHeader } from './header';

// Represents a generic user in the system
interface User {
    userId: string;
    username: string;
    status: 'active' | 'archived';
    createdAt: string;
    forcePasswordChange: boolean;
}

// Response from creating a new user
interface CreateUserResponse {
    userId: string;
    username: string;
    tempPassword: string;
}

// Manages a specific user type (e.g., Examiners, Students)
class UserManagement {
    private userType: 'Examiner' | 'Student';
    private apiEndpoint: string;
    private tableBody: HTMLElement;
    private loadingSpinner: HTMLElement;
    private errorContainer: HTMLElement;
    private successContainer: HTMLElement;
    private createButton: HTMLElement;
    private filterButtons: NodeListOf<HTMLInputElement>;

    private currentFilter: string = 'all';
    private users: User[] = [];
    private modals: any = {};

    constructor(userType: 'Examiner' | 'Student', apiEndpoint: string) {
        this.userType = userType;
        this.apiEndpoint = apiEndpoint;

        const lowerCaseType = userType.toLowerCase();
        
        this.tableBody = document.getElementById(`${lowerCaseType}s-table-body`)!;
        this.loadingSpinner = document.getElementById(`${lowerCaseType}-loading-spinner`)!;
        this.errorContainer = document.getElementById(`${lowerCaseType}-error-container`)!;
        this.successContainer = document.getElementById(`${lowerCaseType}-success-container`)!;
        this.createButton = document.getElementById(`create-${lowerCaseType}-btn`)!;
        this.filterButtons = document.querySelectorAll(`input[name="${lowerCaseType}StatusFilter"]`);

        if (!this.tableBody || !this.loadingSpinner || !this.errorContainer || !this.createButton) {
            console.error(`Initialization failed for ${userType}. Missing one or more required DOM elements.`);
            return;
        }

        this.initializeModals();
        this.bindEvents();
        this.loadUsers();
    }

    private initializeModals(): void {
        this.modals.createUser = new (window as any).bootstrap.Modal(document.getElementById(`create${this.userType}Modal`));
        this.modals.success = new (window as any).bootstrap.Modal(document.getElementById('successModal'));
        this.modals.confirmation = new (window as any).bootstrap.Modal(document.getElementById('confirmationModal'));
    }

    private bindEvents(): void {
        this.filterButtons.forEach(button => {
            button.addEventListener('change', (e) => {
                const target = e.target as HTMLInputElement;
                this.currentFilter = target.value;
                this.filterUsers();
            });
        });

        this.createButton.addEventListener('click', () => {
            this.showCreateUserModal();
        });

        const createSubmit = document.getElementById(`create-${this.userType.toLowerCase()}-submit`);
        if (createSubmit) {
            createSubmit.addEventListener('click', () => {
                this.createUser();
            });
        }
    }

    private async loadUsers(): Promise<void> {
        this.showLoading(true);
        this.hideMessages();

        try {
            const token = localStorage.getItem('jwt_token');
            if (!token) {
                window.location.href = '/index.html';
                return;
            }

            const response = await fetch(this.apiEndpoint, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.status === 403) {
                this.showError("Åtkomst nekad. Du måste vara administratör.");
                return;
            }
            if (response.status === 401) {
                this.showError("Din session har gått ut. Logga in igen.");
                localStorage.removeItem('jwt_token');
                setTimeout(() => window.location.href = '/index.html', 2000);
                return;
            }
            if (!response.ok) throw new Error(`HTTP ${response.status}: ${await response.text()}`);

            this.users = await response.json();
            this.renderTable();
            this.filterUsers();

        } catch (error) {
            console.error(`Error loading ${this.userType}s:`, error);
            this.showError(error instanceof Error ? error.message : `Kunde inte ladda ${this.userType.toLowerCase()}er.`);
        } finally {
            this.showLoading(false);
        }
    }

    private renderTable(): void {
        this.tableBody.innerHTML = '';
        if (this.users.length === 0) {
            this.tableBody.innerHTML = `<tr><td colspan="5" class="text-center">Inga ${this.userType.toLowerCase()}er hittades.</td></tr>`;
            return;
        }
        this.users.forEach(user => this.tableBody.appendChild(this.createRow(user)));
    }

    private createRow(user: User): HTMLTableRowElement {
        const row = document.createElement('tr');
        const statusClass = user.status === 'active' ? 'success' : 'secondary';
        const statusText = user.status === 'active' ? 'Aktiv' : 'Arkiverad';
        const passwordStatus = user.forcePasswordChange ? 'Nej' : 'Ja';
        const passwordClass = user.forcePasswordChange ? 'warning' : 'success';
        const createdAt = new Date(user.createdAt).toLocaleDateString('sv-SE');

        row.innerHTML = `
            <td>${user.username}</td>
            <td><span class="badge bg-${statusClass}">${statusText}</span></td>
            <td>${createdAt}</td>
            <td><span class="badge bg-${passwordClass}">${passwordStatus}</span></td>
            <td>${this.createActionMenu(user)}</td>
        `;

        row.querySelectorAll('[data-action]').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const action = (link as HTMLElement).dataset.action;
                const userId = (link as HTMLElement).dataset.userId;
                if (action && userId) {
                    this.handleAction(action, userId, user.username);
                }
            });
        });
        return row;
    }

    private createActionMenu(user: User): string {
        const archiveOption = `<li><a class="dropdown-item text-warning" href="#" data-action="archive" data-user-id="${user.userId}"><i class="bi bi-archive"></i> Arkivera</a></li>`;
        const reactivateOption = `<li><a class="dropdown-item text-success" href="#" data-action="reactivate" data-user-id="${user.userId}"><i class="bi bi-arrow-clockwise"></i> Återaktivera</a></li>`;
        const resetPasswordOption = `<li><a class="dropdown-item" href="#" data-action="reset-password" data-user-id="${user.userId}"><i class="bi bi-key"></i> Återställ lösenord</a></li>`;
        const deleteOption = `<li><a class="dropdown-item text-danger" href="#" data-action="delete" data-user-id="${user.userId}"><i class="bi bi-trash"></i> Ta bort permanent</a></li>`;

        let options = (user.status === 'active' ? archiveOption : reactivateOption) + resetPasswordOption + '<li><hr class="dropdown-divider"></li>' + deleteOption;

        return `
            <div class="dropdown">
                <button class="btn btn-sm dropdown-toggle neutral-dropdown" type="button" data-bs-toggle="dropdown" aria-expanded="false">
                    <i class="bi bi-three-dots-vertical"></i>
                </button>
                <ul class="dropdown-menu">${options}</ul>
            </div>`;
    }

    private filterUsers(): void {
        this.tableBody.querySelectorAll('tr').forEach(row => {
            const statusText = row.querySelector('td:nth-child(2)')?.textContent?.trim();
            let shouldShow = this.currentFilter === 'all' ||
                             (this.currentFilter === 'active' && statusText === 'Aktiv') ||
                             (this.currentFilter === 'archived' && statusText === 'Arkiverad');
            (row as HTMLElement).style.display = shouldShow ? '' : 'none';
        });
    }

    private showCreateUserModal(): void {
        const form = document.getElementById(`create-${this.userType.toLowerCase()}-form`) as HTMLFormElement;
        if (form) form.reset();
        this.modals.createUser.show();
    }

    private async createUser(): Promise<void> {
        const usernameInput = document.getElementById(`${this.userType.toLowerCase()}-username`) as HTMLInputElement;
        const username = usernameInput.value.trim();
        if (!username || username.length < 3) return;

        const submitBtn = document.getElementById(`create-${this.userType.toLowerCase()}-submit`) as HTMLButtonElement;
        const originalText = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Skapar...';

        try {
            const token = localStorage.getItem('jwt_token');
            const response = await fetch(this.apiEndpoint, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ username })
            });

            if (response.status === 409) throw new Error('Användarnamnet finns redan.');
            if (!response.ok) throw new Error(`HTTP ${response.status}: ${await response.text()}`);

            const result: CreateUserResponse = await response.json();
            this.modals.createUser.hide();
            this.showSuccessModal(`${this.userType} skapad!`, `<strong>${this.userType}en '${result.username}' har skapats!</strong><br><strong>Temporärt lösenord:</strong> <code>${result.tempPassword}</code>`);
            this.loadUsers();

        } catch (error) {
            this.showError(error instanceof Error ? error.message : `Kunde inte skapa ${this.userType.toLowerCase()}.`);
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        }
    }

    private handleAction(action: string, userId: string, username: string): void {
        const actions: { [key: string]: { message: string, func: () => void } } = {
            'archive': { message: `Är du säker på att du vill arkivera ${this.userType.toLowerCase()}en "${username}"?`, func: () => this.performAction('PUT', `${this.apiEndpoint}/${userId}/archive`, 'arkiverats') },
            'reactivate': { message: `Är du säker på att du vill återaktivera ${this.userType.toLowerCase()}en "${username}"?`, func: () => this.performAction('PUT', `${this.apiEndpoint}/${userId}/reactivate`, 'återaktiverats') },
            'reset-password': { message: `Är du säker på att du vill återställa lösenordet för "${username}"?`, func: () => this.resetPassword(userId) },
            'delete': { message: `Är du helt säker på att du vill permanent ta bort "${username}"? All data raderas.`, func: () => this.performAction('DELETE', `${this.apiEndpoint}/${userId}`, 'tagits bort permanent') }
        };

        const selectedAction = actions[action];
        if (!selectedAction) return;

        (document.getElementById('confirmation-message')!).textContent = selectedAction.message;
        (document.getElementById('confirm-action-btn')!).onclick = selectedAction.func;
        this.modals.confirmation.show();
        setTimeout(() => {
            (document.getElementById('confirm-action-btn') as HTMLButtonElement)?.focus();
        }, 200);
    }

    private async performAction(method: 'PUT' | 'DELETE', url: string, successVerb: string): Promise<void> {
        try {
            const token = localStorage.getItem('jwt_token');
            const response = await fetch(url, { method, headers: { 'Authorization': `Bearer ${token}` } });
            if (!response.ok) throw new Error(`HTTP ${response.status}: ${await response.text()}`);
            
            this.modals.confirmation.hide();
            this.showSuccess(`${this.userType}en har ${successVerb}.`);
            this.loadUsers();
        } catch (error) {
            this.modals.confirmation.hide();
            this.showError(error instanceof Error ? error.message : `Kunde inte utföra åtgärden.`);
        }
    }

    private async resetPassword(userId: string): Promise<void> {
        try {
            const token = localStorage.getItem('jwt_token');
            const response = await fetch(`${this.apiEndpoint}/${userId}/reset-password`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error(`HTTP ${response.status}: ${await response.text()}`);
            
            const result = await response.json();
            this.modals.confirmation.hide();
            this.showSuccessModal('Lösenord återställt!', `<strong>Nytt temporärt lösenord:</strong> <code>${result.tempPassword}</code>`);
            this.loadUsers();
        } catch (error) {
            this.modals.confirmation.hide();
            this.showError(error instanceof Error ? error.message : 'Kunde inte återställa lösenordet.');
        }
    }

    private showLoading(show: boolean): void {
        this.loadingSpinner.classList.toggle('d-none', !show);
    }

    private showError(message: string): void {
        this.errorContainer.textContent = message;
        this.errorContainer.classList.remove('d-none');
    }

    private showSuccess(message: string): void {
        this.successContainer.textContent = message;
        this.successContainer.classList.remove('d-none');
        setTimeout(() => this.successContainer.classList.add('d-none'), 5000);
    }

    private hideMessages(): void {
        this.errorContainer.classList.add('d-none');
        this.successContainer.classList.add('d-none');
    }

    private showSuccessModal(title: string, message: string): void {
        // Göm eventuella andra öppna modals först för att undvika konflikter
        this.modals.confirmation.hide();
        
        (document.getElementById('successModalLabel')!).textContent = title;
        (document.getElementById('success-message')!).innerHTML = message;
        this.modals.success.show();
    }
}

class SubjectManagement {
    private apiEndpoint = '/api/admin-subjects';
    private listContainer: HTMLElement;
    private loadingSpinner: HTMLElement;
    private errorContainer: HTMLElement;
    private successContainer: HTMLElement;
    private createButton: HTMLElement;
    private modals: any = {};
    private questionManagement: QuestionManagement;

    constructor(questionManagement: QuestionManagement) {
        this.questionManagement = questionManagement;
        this.listContainer = document.getElementById('subjects-list')!;
        this.loadingSpinner = document.getElementById('subject-loading-spinner')!;
        this.errorContainer = document.getElementById('subject-error-container')!;
        this.successContainer = document.getElementById('subject-success-container')!;
        this.createButton = document.getElementById('create-subject-btn')!;

        if (!this.listContainer || !this.loadingSpinner || !this.errorContainer || !this.createButton) {
            console.error("Initialization failed for SubjectManagement. Missing one or more required DOM elements.");
            return;
        }

        this.initializeModals();
        this.bindEvents();
        this.loadSubjects();
    }

    private initializeModals(): void {
        this.modals.createSubject = new (window as any).bootstrap.Modal(document.getElementById('createSubjectModal'));
        this.modals.confirmation = new (window as any).bootstrap.Modal(document.getElementById('confirmationModal'));
    }

    private bindEvents(): void {
        this.createButton.addEventListener('click', () => {
            (document.getElementById('create-subject-form') as HTMLFormElement).reset();
            this.modals.createSubject.show();
        });

        const createSubmit = document.getElementById('create-subject-submit');
        if (createSubmit) {
            createSubmit.addEventListener('click', () => this.createSubject());
        }
    }

    private async loadSubjects(): Promise<void> {
        this.showLoading(true);
        this.hideMessages();

        try {
            const token = localStorage.getItem('jwt_token');
            const response = await fetch(this.apiEndpoint, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) throw new Error(`HTTP ${response.status}: ${await response.text()}`);
            
            const subjects = await response.json();
            this.renderList(subjects);

        } catch (error) {
            this.showError(error instanceof Error ? error.message : 'Kunde inte ladda ämnen.');
        } finally {
            this.showLoading(false);
        }
    }

    private renderList(subjects: any[]): void {
        this.listContainer.innerHTML = '';
        if (subjects.length === 0) {
            this.listContainer.innerHTML = '<p class="text-center">Inga ämnen hittades.</p>';
            return;
        }

        subjects.forEach(subject => {
            const item = document.createElement('div');
            item.className = 'list-group-item d-flex justify-content-between align-items-center';
            item.innerHTML = `
                <div>
                    <h5 class="mb-1">${subject.name} (${subject.code})</h5>
                    <p class="mb-1">${subject.description || 'Ingen beskrivning.'}</p>
                    <small>Tidsgräns: ${subject.defaultTimeLimitMinutes} minuter</small>
                </div>
                <button class="btn btn-sm btn-outline-danger" data-subject-id="${subject._id}" data-subject-name="${subject.name}">
                    <i class="bi bi-trash"></i> Ta bort
                </button>
            `;
            this.listContainer.appendChild(item);
        });

        this.listContainer.querySelectorAll('button[data-subject-id]').forEach(button => {
            button.addEventListener('click', (e) => {
                const target = e.currentTarget as HTMLElement;
                const subjectId = target.dataset.subjectId!;
                const subjectName = target.dataset.subjectName!;
                this.handleDelete(subjectId, subjectName);
            });
        });
    }

    private async createSubject(): Promise<void> {
        const form = document.getElementById('create-subject-form') as HTMLFormElement;
        const name = (form.querySelector('#subject-name') as HTMLInputElement).value;
        const code = (form.querySelector('#subject-code') as HTMLInputElement).value;
        const description = (form.querySelector('#subject-description') as HTMLTextAreaElement).value;
        const defaultTimeLimitMinutes = (form.querySelector('#subject-time-limit') as HTMLInputElement).value;

        if (!name || !code || !defaultTimeLimitMinutes) {
            this.showError("Namn, kod och tidsgräns är obligatoriska.");
            return;
        }

        const submitBtn = document.getElementById('create-subject-submit') as HTMLButtonElement;
        submitBtn.disabled = true;

        try {
            const token = localStorage.getItem('jwt_token');
            const response = await fetch(this.apiEndpoint, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, code, description, defaultTimeLimitMinutes })
            });

            if (response.status === 409) throw new Error('En ämneskod måste vara unik.');
            if (!response.ok) throw new Error(`HTTP ${response.status}: ${await response.text()}`);

            this.modals.createSubject.hide();
            this.showSuccess('Ämnet har skapats.');
            this.loadSubjects();
            this.questionManagement.loadSubjects();

        } catch (error) {
            this.showError(error instanceof Error ? error.message : 'Kunde inte skapa ämnet.');
        } finally {
            submitBtn.disabled = false;
        }
    }

    private handleDelete(subjectId: string, subjectName: string): void {
        const message = `Är du helt säker på att du vill ta bort ämnet "${subjectName}"? Alla frågor som är kopplade till detta ämne kommer också att raderas permanent. Denna åtgärd kan inte ångras.`;
        
        (document.getElementById('confirmation-message')!).textContent = message;
        (document.getElementById('confirm-action-btn')!).onclick = () => this.performDelete(subjectId);
        this.modals.confirmation.show();
        setTimeout(() => {
            (document.getElementById('confirm-action-btn') as HTMLButtonElement)?.focus();
        }, 200);
    }

    private async performDelete(subjectId: string): Promise<void> {
        try {
            const token = localStorage.getItem('jwt_token');
            const response = await fetch(`${this.apiEndpoint}/${subjectId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error(`HTTP ${response.status}: ${await response.text()}`);
            
            const result = await response.json();
            this.modals.confirmation.hide();
            this.showSuccess(`Ämnet och ${result.deletedQuestionsCount} tillhörande frågor har tagits bort.`);
            this.loadSubjects();
            this.questionManagement.loadSubjects();
            this.questionManagement.clearQuestions();
        } catch (error) {
            this.modals.confirmation.hide();
            this.showError(error instanceof Error ? error.message : 'Kunde inte ta bort ämnet.');
        }
    }

    private showLoading(show: boolean): void { this.loadingSpinner.classList.toggle('d-none', !show); }
    private showError(message: string): void { this.errorContainer.textContent = message; this.errorContainer.classList.remove('d-none'); }
    private showSuccess(message: string): void { this.successContainer.textContent = message; this.successContainer.classList.remove('d-none'); setTimeout(() => this.hideMessages(), 5000); }
    private hideMessages(): void { this.errorContainer.classList.add('d-none'); this.successContainer.classList.add('d-none'); }
}

class QuestionManagement {
    private questionsApi = '/api/admin-questions';
    private subjectsApi = '/api/admin-subjects';
    private subjectSelect: HTMLSelectElement;
    private filterInput: HTMLInputElement;
    private createButton: HTMLButtonElement;
    private listContainer: HTMLElement;
    private loadingSpinner: HTMLElement;
    private errorContainer: HTMLElement;
    private successContainer: HTMLElement;
    private modals: any = {};
    private questions: any[] = [];
    private currentSubjectId: string | null = null;
    private currentStatusFilter: 'all' | 'active' | 'inactive' = 'all';

    constructor() {
        this.subjectSelect = document.getElementById('subject-select') as HTMLSelectElement;
        this.filterInput = document.getElementById('question-filter') as HTMLInputElement;
        this.createButton = document.getElementById('create-question-btn') as HTMLButtonElement;
        this.listContainer = document.getElementById('questions-list')!;
        this.loadingSpinner = document.getElementById('question-loading-spinner')!;
        this.errorContainer = document.getElementById('question-error-container')!;
        this.successContainer = document.getElementById('question-success-container')!;

        this.initializeModals();
        this.bindEvents();
        this.loadSubjects();
    }

    private initializeModals(): void {
        this.modals.editQuestion = new (window as any).bootstrap.Modal(document.getElementById('editQuestionModal'));
        this.modals.confirmation = new (window as any).bootstrap.Modal(document.getElementById('confirmationModal'));
    }

    private bindEvents(): void {
        this.subjectSelect.addEventListener('change', () => {
            this.currentSubjectId = this.subjectSelect.value;
            this.filterInput.disabled = false;
            this.createButton.disabled = false;
            this.loadQuestions();
        });

        this.filterInput.addEventListener('input', () => this.renderQuestions());

        this.createButton.addEventListener('click', () => this.showEditModal());

        document.getElementById('save-question-btn')?.addEventListener('click', () => this.saveQuestion());

        document.querySelectorAll('input[name="questionStatusFilter"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.currentStatusFilter = (e.target as HTMLInputElement).value as 'all' | 'active' | 'inactive';
                this.renderQuestions();
            });
        });
    }

    public async loadSubjects(): Promise<void> {
        try {
            const token = localStorage.getItem('jwt_token');
            const response = await fetch(this.subjectsApi, { headers: { 'Authorization': `Bearer ${token}` } });
            if (!response.ok) throw new Error('Could not load subjects');
            const subjects = await response.json();

            this.subjectSelect.innerHTML = '<option selected disabled value="">Välj ett ämne...</option>';
            subjects.forEach((s: any) => {
                const option = document.createElement('option');
                option.value = s._id;
                option.textContent = s.name;
                this.subjectSelect.appendChild(option);
            });
        } catch (error) {
            this.subjectSelect.innerHTML = '<option selected disabled>Kunde inte ladda ämnen</option>';
            this.showError(error instanceof Error ? error.message : 'Okänt fel');
        }
    }

    public async loadQuestions(): Promise<void> {
        if (!this.currentSubjectId) return;
        this.showLoading(true);
        this.hideMessages();
        this.listContainer.innerHTML = '';

        try {
            const token = localStorage.getItem('jwt_token');
            const response = await fetch(`${this.questionsApi}?subjectId=${this.currentSubjectId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error(`HTTP ${response.status}: ${await response.text()}`);
            this.questions = await response.json();
            this.renderQuestions();
        } catch (error) {
            this.showError(error instanceof Error ? error.message : 'Kunde inte ladda frågor.');
        } finally {
            this.showLoading(false);
        }
    }

    private renderQuestions(): void {
        this.listContainer.innerHTML = '';
        const filterText = this.filterInput.value.toLowerCase();

        const filteredQuestions = this.questions.filter(q => {
            const textMatch = q.questionText.toLowerCase().includes(filterText);
            const isActive = q.active !== false;
            const statusMatch = this.currentStatusFilter === 'all' ||
                                (this.currentStatusFilter === 'active' && isActive) ||
                                (this.currentStatusFilter === 'inactive' && !isActive);
            return textMatch && statusMatch;
        });

        if (filteredQuestions.length === 0) {
            this.listContainer.innerHTML = '<p class="text-center mt-3">Inga frågor matchade filtret.</p>';
            return;
        }

        filteredQuestions.forEach(q => {
            const card = document.createElement('div');
            card.className = 'card mb-2';
            const isActive = q.active !== false; // Consistent status check for rendering

            card.innerHTML = `
                <div class="card-body">
                    <p class="card-text">${q.questionText}</p>
                    <ul class="list-unstyled">
                        ${q.options.map((opt: string, index: number) => `<li>${index === q.correctOptionIndex ? '<strong>' : ''}${opt}${index === q.correctOptionIndex ? '</strong>' : ''}</li>`).join('')}
                    </ul>
                    <div class="d-flex justify-content-between align-items-center">
                        <span class="badge bg-${isActive ? 'success' : 'secondary'}">${isActive ? 'Aktiv' : 'Inaktiv'}</span>
                        <div>
                            <button class="btn btn-sm btn-outline-secondary me-2" data-action="edit" data-question-id="${q._id}"><i class="bi bi-pencil"></i> Redigera</button>
                            <button class="btn btn-sm btn-outline-${isActive ? 'warning' : 'success'} me-2" data-action="toggle" data-question-id="${q._id}" data-active="${isActive}">
                                ${isActive ? 'Inaktivera' : 'Aktivera'}
                            </button>
                            <button class="btn btn-sm btn-outline-danger" data-action="delete" data-question-id="${q._id}"><i class="bi bi-trash"></i> Ta bort</button>
                        </div>
                    </div>
                </div>
            `;
            this.listContainer.appendChild(card);
        });

        this.listContainer.querySelectorAll('button[data-action]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const target = e.currentTarget as HTMLButtonElement;
                const action = target.dataset.action;
                const id = target.dataset.questionId!;
                if (action === 'edit') this.showEditModal(id);
                if (action === 'toggle') {
                    this.toggleQuestionStatus(id, target.dataset.active === 'true');
                }
                if (action === 'delete') this.handleDeleteQuestion(id);
            });
        });
    }

    public clearQuestions(): void {
        this.listContainer.innerHTML = '<p class="text-center text-muted mt-3">Välj ett ämne för att visa frågor.</p>';
        this.questions = [];
        this.subjectSelect.selectedIndex = 0;
        this.currentSubjectId = null;
        this.filterInput.value = '';
        this.filterInput.disabled = true;
        this.createButton.disabled = true;
    }

    private handleDeleteQuestion(questionId: string): void {
        const message = `Är du säker på att du vill ta bort denna fråga permanent? Åtgärden kan inte ångras.`;
        (document.getElementById('confirmation-message')!).textContent = message;
        (document.getElementById('confirm-action-btn')!).onclick = () => this.performDeleteQuestion(questionId);
        this.modals.confirmation.show();
        setTimeout(() => {
            (document.getElementById('confirm-action-btn') as HTMLButtonElement)?.focus();
        }, 200);
    }

    private async performDeleteQuestion(questionId: string): Promise<void> {
        try {
            const token = localStorage.getItem('jwt_token');
            const response = await fetch(`${this.questionsApi}/${questionId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error(`HTTP ${response.status}: ${await response.text()}`);
            
            this.modals.confirmation.hide();
            this.showSuccess(`Frågan har tagits bort.`);
            this.loadQuestions();
        } catch (error) {
            this.modals.confirmation.hide();
            this.showError(error instanceof Error ? error.message : 'Kunde inte ta bort frågan.');
        }
    }

    private showEditModal(questionId?: string): void {
        const form = document.getElementById('edit-question-form') as HTMLFormElement;
        form.reset();
        (document.getElementById('question-id') as HTMLInputElement).value = questionId || '';

        const modalLabel = document.getElementById('editQuestionModalLabel')!;
        if (questionId) {
            modalLabel.textContent = 'Redigera Fråga';
            const question = this.questions.find(q => q._id === questionId);
            if (question) {
                (document.getElementById('question-text') as HTMLTextAreaElement).value = question.questionText;
                for (let i = 0; i < 4; i++) {
                    (document.getElementById(`option-${i}`) as HTMLInputElement).value = question.options[i] || '';
                }
                (form.querySelector(`input[name="correctOption"][value="${question.correctOptionIndex}"]`) as HTMLInputElement).checked = true;
            }
        } else {
            modalLabel.textContent = 'Skapa Ny Fråga';
        }
        this.modals.editQuestion.show();
    }

    private async saveQuestion(): Promise<void> {
        const questionId = (document.getElementById('question-id') as HTMLInputElement).value;
        const questionText = (document.getElementById('question-text') as HTMLTextAreaElement).value;
        const options = [
            (document.getElementById('option-0') as HTMLInputElement).value,
            (document.getElementById('option-1') as HTMLInputElement).value,
            (document.getElementById('option-2') as HTMLInputElement).value,
            (document.getElementById('option-3') as HTMLInputElement).value,
        ];
        const correctOptionIndex = parseInt((document.querySelector('input[name="correctOption"]:checked') as HTMLInputElement)?.value);

        if (!questionText || options.some(o => !o) || isNaN(correctOptionIndex)) {
            this.showError("Alla fält måste fyllas i.");
            return;
        }

        const url = questionId ? `${this.questionsApi}/${questionId}` : this.questionsApi;
        const method = questionId ? 'PUT' : 'POST';
        const body = JSON.stringify({
            subjectId: this.currentSubjectId,
            questionText,
            options,
            correctOptionIndex
        });

        try {
            const token = localStorage.getItem('jwt_token');
            const response = await fetch(url, {
                method,
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body
            });
            if (!response.ok) throw new Error(`HTTP ${response.status}: ${await response.text()}`);
            
            this.modals.editQuestion.hide();
            this.showSuccess(`Frågan har ${questionId ? 'uppdaterats' : 'skapats'}.`);
            this.loadQuestions();
        } catch (error) {
            this.showError(error instanceof Error ? error.message : 'Kunde inte spara frågan.');
        }
    }

    private async toggleQuestionStatus(questionId: string, currentStatus: boolean): Promise<void> {
        try {
            const token = localStorage.getItem('jwt_token');
            const response = await fetch(`${this.questionsApi}/${questionId}`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ active: !currentStatus })
            });
            if (!response.ok) throw new Error(`HTTP ${response.status}: ${await response.text()}`);
            
            this.showSuccess(`Frågans status har ändrats.`);
            this.loadQuestions();
        } catch (error) {
            this.showError(error instanceof Error ? error.message : 'Kunde inte ändra status.');
        }
    }

    private showLoading(show: boolean): void { this.loadingSpinner.classList.toggle('d-none', !show); }
    private showError(message: string): void { this.errorContainer.textContent = message; this.errorContainer.classList.remove('d-none'); setTimeout(() => this.hideMessages(), 5000); }
    private showSuccess(message: string): void { this.successContainer.textContent = message; this.successContainer.classList.remove('d-none'); setTimeout(() => this.hideMessages(), 5000); }
    private hideMessages(): void { this.errorContainer.classList.add('d-none'); this.successContainer.classList.add('d-none'); }
}

class ImportManagement {
    private apiEndpoint = '/api/admin-import';
    private fileInput: HTMLInputElement;
    private analyzeButton: HTMLButtonElement;
    private resultsContainer: HTMLElement;
    private summaryContainer: HTMLElement;
    private previewContainer: HTMLElement;
    private confirmButton: HTMLButtonElement;
    private cancelButton: HTMLButtonElement;
    private loadingSpinner: HTMLElement;
    private errorContainer: HTMLElement;
    private successContainer: HTMLElement;
    private questionsToImport: any[] = [];
    private questionManagement: QuestionManagement;

    constructor(questionManagement: QuestionManagement) {
        this.questionManagement = questionManagement;
        this.fileInput = document.getElementById('csv-file-input') as HTMLInputElement;
        this.analyzeButton = document.getElementById('analyze-csv-btn') as HTMLButtonElement;
        this.resultsContainer = document.getElementById('import-results-container')!;
        this.summaryContainer = document.getElementById('import-summary')!;
        this.previewContainer = document.getElementById('import-preview')!;
        this.confirmButton = document.getElementById('confirm-import-btn') as HTMLButtonElement;
        this.cancelButton = document.getElementById('cancel-import-btn') as HTMLButtonElement;
        this.loadingSpinner = document.getElementById('import-loading-spinner')!;
        this.errorContainer = document.getElementById('import-error-container')!;
        this.successContainer = document.getElementById('import-success-container')!;

        this.bindEvents();
    }

    private bindEvents(): void {
        this.fileInput.addEventListener('change', () => {
            this.analyzeButton.disabled = !this.fileInput.files || this.fileInput.files.length === 0;
            this.resetView(false);
        });

        this.analyzeButton.addEventListener('click', () => this.analyzeFile());
        this.confirmButton.addEventListener('click', () => this.executeImport());
        this.cancelButton.addEventListener('click', () => this.resetView(true));
    }

    private analyzeFile(): void {
        const file = this.fileInput.files?.[0];
        if (!file) return;

        this.showLoading(true);
        this.hideMessages();
        this.resultsContainer.classList.add('d-none');

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const content = e.target?.result as string;
                const token = localStorage.getItem('jwt_token');
                const response = await fetch(`${this.apiEndpoint}/analyze`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'text/csv' },
                    body: content
                });

                if (!response.ok) throw new Error(`HTTP ${response.status}: ${await response.text()}`);
                
                const result = await response.json();
                this.questionsToImport = result.newQuestions;
                this.displayResults(result.newQuestions, result.duplicatesCount);

            } catch (error) {
                this.showError(error instanceof Error ? error.message : 'Kunde inte analysera filen.');
            } finally {
                this.showLoading(false);
            }
        };
        reader.readAsText(file);
    }

    private displayResults(newQuestions: any[], duplicatesCount: number): void {
        this.summaryContainer.textContent = `Hittade ${newQuestions.length} nya frågor och ${duplicatesCount} dubbletter.`;
        
        this.previewContainer.innerHTML = '';
        if (newQuestions.length === 0) {
            console.error("Inga nya frågor att importera.");
            this.previewContainer.innerHTML = '<div class="list-group-item">Inga nya frågor att importera. Kontrollera att ämnet är korrekt och att filen innehåller giltiga frågor.</div>';
            this.confirmButton.disabled = true;
        } else {
            newQuestions.slice(0, 10).forEach(q => { // Preview max 10 questions
                const item = document.createElement('div');
                item.className = 'list-group-item';
                item.textContent = q.questionText;
                this.previewContainer.appendChild(item);
            });
            if (newQuestions.length > 10) {
                 this.previewContainer.innerHTML += `<div class="list-group-item text-muted">...och ${newQuestions.length - 10} till.</div>`;
            }
            this.confirmButton.disabled = false;
        }
        
        this.resultsContainer.classList.remove('d-none');
    }

    private async executeImport(): Promise<void> {
        this.showLoading(true);
        this.confirmButton.disabled = true;
        this.cancelButton.disabled = true;

        try {
            const token = localStorage.getItem('jwt_token');
            const response = await fetch(`${this.apiEndpoint}/execute`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ questionsToImport: this.questionsToImport })
            });

            if (!response.ok) throw new Error(`HTTP ${response.status}: ${await response.text()}`);
            
            const result = await response.json();
            this.showSuccess(`${result.insertedCount} frågor har importerats.`);
            this.resetView(true);
            this.questionManagement.loadQuestions();
        } catch (error) {
            this.showError(error instanceof Error ? error.message : 'Importen misslyckades.');
        } finally {
            this.showLoading(false);
            this.confirmButton.disabled = false;
            this.cancelButton.disabled = false;
        }
    }

    private resetView(clearFileInput: boolean): void {
        if (clearFileInput) {
            this.fileInput.value = '';
            this.analyzeButton.disabled = true;
        }
        this.resultsContainer.classList.add('d-none');
        this.hideMessages();
    }

    private showLoading(show: boolean): void { this.loadingSpinner.classList.toggle('d-none', !show); }
    private showError(message: string): void { this.errorContainer.textContent = message; this.errorContainer.classList.remove('d-none'); }
    private showSuccess(message: string): void { this.successContainer.textContent = message; this.successContainer.classList.remove('d-none'); }
    private hideMessages(): void { this.errorContainer.classList.add('d-none'); this.successContainer.classList.add('d-none'); }
}

// Main Admin Panel Logic
document.addEventListener('DOMContentLoaded', () => {
    renderHeader();

    // Initialize user management for examiners
    new UserManagement('Examiner', '/api/admin-examiners');
    
    // Initialize user management for students
    new UserManagement('Student', '/api/admin-students');

    // Initialize question management
    const questionManagement = new QuestionManagement();

    // Initialize subject management
    new SubjectManagement(questionManagement);

    // Initialize import management
    new ImportManagement(questionManagement);

    // Initialize password change handler
    initializePasswordChangeHandler();
});

function initializePasswordChangeHandler() {
    const submitButton = document.getElementById('change-password-submit') as HTMLButtonElement;
    const passwordChangeForm = document.getElementById('password-change-form') as HTMLFormElement;
    const errorContainer = document.getElementById('password-change-error');
    const token = localStorage.getItem('jwt_token');

    if (!submitButton || !passwordChangeForm || !errorContainer) {
        return;
    }

    submitButton.addEventListener('click', async () => {
        const currentPassword = (document.getElementById('current-password') as HTMLInputElement).value;
        const newPassword = (document.getElementById('new-password') as HTMLInputElement).value;
        const confirmPassword = (document.getElementById('confirm-password') as HTMLInputElement).value;

        errorContainer.classList.add('d-none');

        if (newPassword !== confirmPassword) {
            errorContainer.textContent = 'De nya lösenorden matchar inte.';
            errorContainer.classList.remove('d-none');
            return;
        }

        if (newPassword.length < 6) {
            errorContainer.textContent = 'Lösenordet måste vara minst 6 tecken långt.';
            errorContainer.classList.remove('d-none');
            return;
        }

        submitButton.disabled = true;

        try {
            const response = await fetch('/api/examinator/change-password', { // Using examinator endpoint for admin
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ currentPassword, newPassword })
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error || 'Kunde inte byta lösenord.');
            }

            // Success
            const modalEl = document.getElementById('password-change-modal');
            if (modalEl) {
                const modal = (window as any).bootstrap.Modal.getInstance(modalEl);
                modal?.hide();
            }
            passwordChangeForm.reset();
            // Show success message
            window.location.reload();


        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Ett okänt fel uppstod.';
            errorContainer.textContent = errorMessage;
            errorContainer.classList.remove('d-none');
        } finally {
            submitButton.disabled = false;
        }
    });
}
