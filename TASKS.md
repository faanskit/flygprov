# **Task List: User Management for Examiners**

### **Phase 1: Backend API Development**

#### **1.1 Create New API Endpoints**
- [x] **Task 1.1.1**: Extend existing `netlify/functions/examinator/examinator.ts` with new student management endpoints
- [x] **Task 1.1.2**: Implement `POST /api/examinator/students` endpoint for creating new students
- [x] **Task 1.1.3**: Implement `GET /api/examinator/students` endpoint for listing all students
- [x] **Task 1.1.4**: Implement `PUT /api/examinator/students/:studentId/archive` endpoint for archiving students
- [x] **Task 1.1.5**: Implement `PUT /api/examinator/students/:studentId/reactivate` endpoint for reactivating students
- [x] **Task 1.1.6**: Implement `PUT /api/student/change-password` endpoint for password changes
- [ ] **Task 1.1.7**: Implement `DELETE /api/examinator/students/:studentId` endpoint for removing students (LOW PRIORITY)

#### **1.2 Backend Business Logic**
- [x] **Task 1.2.1**: Implement simple password generation for temporary passwords (e.g., username123)
- [x] **Task 1.2.2**: Implement password hashing using bcrypt before database storage
- [x] **Task 1.2.3**: Implement username uniqueness validation
- [x] **Task 1.2.4**: Implement student status filtering (active/archived/all)
- [x] **Task 1.2.5**: Add proper error handling and HTTP status codes
- [x] **Task 1.2.6**: Set `forcePasswordChange: true` for newly created students

#### **1.3 Database Updates**
- [x] **Task 1.3.1**: Verify `users` collection schema supports `archived` field ✅
- [~] **Task 1.3.2**: Add database indexes for efficient student queries (SKIPPED - not needed for small application)
- [x] **Task 1.3.3**: Update existing student queries to filter out archived students
- [x] **Task 1.3.4**: Update User model to include `forcePasswordChange` field
- [x] **Task 1.3.5**: Ensure new students are created with `forcePasswordChange: true`

### **Phase 2: Frontend UI Development**

#### **2.1 Navigation Updates**
- [x] **Task 2.1.1**: Add "Hantera Studenter" menu link to examiner dashboard
- [x] **Task 2.1.2**: Update examiner navigation to include new student management section

#### **2.2 New Student Management Page**
- [x] **Task 2.2.1**: Create new HTML file `frontend/student-management.html`
- [x] **Task 2.2.2**: Create corresponding TypeScript file `frontend/src/student-management.ts`
- [x] **Task 2.2.3**: Implement student list table with columns: Username, Status, Created Date
- [x] **Task 2.2.4**: Add "+ Skapa ny student" button above the table
- [x] **Task 2.2.5**: Implement action menu (⋮) for each student row with Archive/Reactivate options

#### **2.3 Student Creation Modal**
- [x] **Task 2.3.1**: Design and implement modal dialog for creating new students
- [x] **Task 2.3.2**: Add username input field with validation
- [x] **Task 2.3.3**: Implement success message display with temporary password
- [x] **Task 2.3.4**: Add copy-to-clipboard functionality for temporary password
- [x] **Task 2.3.5**: Implement one-time display of temporary password with clear warning

#### **2.4 Student Status Management**
- [x] **Task 2.4.1**: Implement archive student functionality with confirmation
- [x] **Task 2.4.2**: Implement reactivate student functionality with confirmation
- [x] **Task 2.4.3**: Add visual indicators for active vs archived student status
- [x] **Task 2.4.4**: Implement status filtering (active/archived/all)
- [ ] **Task 2.4.5**: Implement remove student functionality with confirmation (LOW PRIORITY)

#### **2.5 Student Password Change Interface**
- [x] **Task 2.5.1**: Create password change modal/page for students
- [x] **Task 2.5.2**: Implement password change form with validation
- [x] **Task 2.5.3**: Connect password change to backend API
- [x] **Task 2.5.4**: Update student dashboard to show forced password change state
- [x] **Task 2.5.5**: Handle password change success and redirect flow
- [x] **Task 2.5.6**: Add manual "Change Password" button for anytime access

### **Phase 3: Integration and Testing**

#### **3.1 API Integration**
- [x] **Task 3.1.1**: Connect frontend to new student management API endpoints
- [x] **Task 3.1.2**: Implement proper error handling for API calls
- [x] **Task 3.1.3**: Add loading states and user feedback
- [x] **Task 3.1.4**: Implement proper JWT token handling for authenticated requests

#### **3.2 Data Flow Updates**
- [x] **Task 3.2.1**: Update existing examiner dashboard to exclude archived students
- [x] **Task 3.2.2**: Update test creation flow to filter out archived students
- [x] **Task 3.2.3**: Ensure archived students cannot log in to the system
- [x] **Task 3.2.4**: Implement student password change flow for `forcePasswordChange: true`
- [x] **Task 3.2.5**: Update student dashboard to handle forced password change state

#### **3.3 Security and Validation**
- [~] **Task 3.3.1**: Implement proper role-based access control for all new endpoints
- [~] **Task 3.3.2**: Add input validation for username creation
- [~] **Task 3.3.3**: Implement rate limiting for student creation to prevent abuse
- [~] **Task 3.3.4**: Add audit logging for student management actions

### **Phase 4: User Experience and Polish**

#### **4.1 UI/UX Improvements**
- [~] **Task 4.1.1**: Add confirmation dialogs for destructive actions (archive/reactivate)
- [~] **Task 4.1.2**: Implement responsive design for mobile devices
- [~] **Task 4.1.3**: Add success/error toast notifications
- [~] **Task 4.1.4**: Implement keyboard shortcuts for common actions

### **Phase 5: Documentation and Deployment**

#### **5.1 Documentation**
- [ ] **Task 5.1.1**: Update API documentation with new endpoints
- [ ] **Task 5.1.2**: Create user manual for examiners
- [ ] **Task 5.1.3**: Update technical specification document

#### **5.2 Testing and Quality Assurance**
- [~] **Task 5.2.1**: Write unit tests for new backend functions
- [~] **Task 5.2.2**: Write integration tests for new API endpoints
- [x] **Task 5.2.3**: Perform manual testing of complete user flows
- [x] **Task 5.2.4**: Test with different user roles and permissions

#### **5.3 Deployment**
- [x] **Task 5.3.1**: Build and test in development environment
- [~] **Task 5.3.2**: Deploy to staging environment for testing
- [x] **Task 5.3.3**: Deploy to production environment
- [~] **Task 5.3.4**: Monitor system performance and error logs

### **Priority Levels**
- **High Priority**: Tasks 1.1.1-1.1.6, 2.2.1-2.2.5, 2.5.1-2.5.5, 3.1.1-3.1.4
- **Medium Priority**: Tasks 1.2.1-1.2.6, 2.3.1-2.3.5, 2.4.1-2.4.4, 3.2.1-3.2.5
- **Low Priority**: Tasks 3.3.1-3.3.4, 4.1.1-4.2.3, 5.1.1-5.3.4

### **Estimated Timeline**
- **Phase 1**: 3-4 days
- **Phase 2**: 4-5 days  
- **Phase 3**: 2-3 days
- **Phase 4**: 1-2 days
- **Phase 5**: 1-2 days

**Total Estimated Time**: 11-16 days

---

## **Notes**

This task list covers all the requirements specified in the `Utökadet_krav.md` document and provides a structured approach to implementing the new user management functionality for examiners. Each task is specific and actionable, making it easy to track progress and assign responsibilities.

### **Important Implementation Notes**
- **Password Change Flow**: There is already an existing modal system that handles password changes for students. This should be integrated with the new `forcePasswordChange` field.
- **Simple Password Generation**: Use basic password generation (e.g., `username123`) since users must change password on first login anyway.
- **Database Schema**: The `users` collection already supports both `archived` and `forcePasswordChange` fields.
- **Flexible Password Changes**: Students can change passwords anytime via manual button, not just when forced.

### **Key Requirements Summary**
- Examiners can create new students with auto-generated temporary passwords
- Students can be archived and reactivated
- Archived students cannot log in or appear in test creation lists
- Temporary passwords are shown only once after creation
- New students must change password on first login (`forcePasswordChange: true`)
- Existing modal system handles password change flow for students
- Proper role-based access control for all operations
- Modern, responsive UI with confirmation dialogs 