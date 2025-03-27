document.addEventListener('DOMContentLoaded', () => {
    // Elements
    const studentTableBody = document.getElementById('studentTableBody');
    const noDataMessage = document.getElementById('noDataMessage');
    const totalStudentsElement = document.getElementById('totalStudents');
    const newStudentsElement = document.getElementById('newStudents');
    const genderRatioElement = document.getElementById('genderRatio');
    const completionRateElement = document.getElementById('completionRate');
    const currentEntriesElement = document.getElementById('currentEntries');
    const totalEntriesElement = document.getElementById('totalEntries');
    const prevPageButton = document.getElementById('prevPage');
    const nextPageButton = document.getElementById('nextPage');
    const paginationNumbers = document.getElementById('paginationNumbers');
    const searchInput = document.getElementById('searchInput');
    const programFilter = document.getElementById('programFilter');
    const studentModal = document.getElementById('studentModal');
    const deleteModal = document.getElementById('deleteModal');
    const closeModalButtons = document.querySelectorAll('.close-modal');
    const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
    const refreshButton = document.querySelector('.btn-refresh');
    const exportButton = document.querySelector('.btn-export');
    
    // State variables
    let students = [];
    let filteredStudents = [];
    let currentPage = 1;
    const pageSize = 10;
    let selectedStudentId = null;
    
    // Initialize
    fetchStudents();
    
    // Event listeners
    searchInput.addEventListener('input', filterStudents);
    programFilter.addEventListener('change', filterStudents);
    prevPageButton.addEventListener('click', () => changePage(currentPage - 1));
    nextPageButton.addEventListener('click', () => changePage(currentPage + 1));
    refreshButton.addEventListener('click', fetchStudents);
    exportButton.addEventListener('click', exportData);
    
    closeModalButtons.forEach(button => {
        button.addEventListener('click', () => {
            studentModal.classList.remove('show');
            deleteModal.classList.remove('show');
        });
    });
    
    confirmDeleteBtn.addEventListener('click', deleteStudent);
    
    // Show loading indicator
    function showLoading() {
        studentTableBody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; padding: 2rem;">
                    <i class="fas fa-spinner fa-spin" style="font-size: 2rem; color: var(--primary-color);"></i>
                    <p style="margin-top: 1rem;">Loading student data...</p>
                </td>
            </tr>
        `;
        studentTableBody.closest('table').style.display = 'table';
        noDataMessage.style.display = 'none';
    }
    
    // Fetch all students from API
    async function fetchStudents() {
        showLoading();
        
        try {
            const response = await fetch('/api/students');
            
            if (!response.ok) {
                throw new Error('Failed to fetch students');
            }
            
            students = await response.json();
            
            // Sort by createdAt date (newest first)
            students.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            
            // Apply initial filtering
            filterStudents();
            
            // Update stats
            updateStats();
            
            // Show success message
            showToast('success', 'Student data loaded successfully');
            
        } catch (error) {
            console.error('Error fetching students:', error);
            showNoData();
            showToast('error', 'Failed to load student data');
        }
    }
    
    // Filter students based on search input and program filter
    function filterStudents() {
        const searchTerm = searchInput.value.toLowerCase();
        const programValue = programFilter.value;
        
        filteredStudents = students.filter(student => {
            const matchesSearch = 
                student.studentName.toLowerCase().includes(searchTerm) ||
                student.email.toLowerCase().includes(searchTerm) ||
                student.phoneNumber.includes(searchTerm) ||
                (student.regNumber && student.regNumber.toLowerCase().includes(searchTerm));
            
            const matchesProgram = !programValue || student.program === programValue;
            
            return matchesSearch && matchesProgram;
        });
        
        // Reset to first page when filters change
        currentPage = 1;
        
        // Update table with filtered data
        updateTable();
    }
    
    // Update table with current page data
    function updateTable() {
        if (filteredStudents.length === 0) {
            showNoData();
            return;
        }
        
        // Calculate pagination
        const startIndex = (currentPage - 1) * pageSize;
        const endIndex = Math.min(startIndex + pageSize, filteredStudents.length);
        const pageData = filteredStudents.slice(startIndex, endIndex);
        
        // Clear existing table rows
        studentTableBody.innerHTML = '';
        
        // Add data rows
        pageData.forEach(student => {
            const row = document.createElement('tr');
            
            const formatDate = dateString => {
                const date = new Date(dateString);
                return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
            };
            
            const getProgramBadgeClass = program => {
                switch(program) {
                    case 'Computer Science':
                        return 'badge-cs';
                    case 'Business Administration':
                        return 'badge-business';
                    case 'Engineering':
                        return 'badge-engineering';
                    case 'Arts & Design':
                        return 'badge-arts';
                    case 'Medicine':
                        return 'badge-medicine';
                    default:
                        return '';
                }
            };
            
            const getGenderBadgeClass = gender => {
                return gender === 'Male' ? 'badge-male' : 'badge-female';
            };
            
            row.innerHTML = `
                <td>${student.studentName}</td>
                <td>${student.email}</td>
                <td>${student.phoneNumber}</td>
                <td><span class="badge ${getProgramBadgeClass(student.program)}">${student.program || '-'}</span></td>
                <td><span class="badge ${getGenderBadgeClass(student.gender)}">${student.gender}</span></td>
                <td>${student.idCardNumber}</td>
                <td>${formatDate(student.createdAt)}</td>
                <td>
                    <div class="action-buttons">
                        <button class="btn-icon btn-view" data-id="${student._id}" title="View"><i class="fas fa-eye"></i></button>
                        <button class="btn-icon btn-edit" data-id="${student._id}" title="Edit"><i class="fas fa-pencil-alt"></i></button>
                        <button class="btn-icon btn-delete" data-id="${student._id}" title="Delete"><i class="fas fa-trash"></i></button>
                    </div>
                </td>
            `;
            
            studentTableBody.appendChild(row);
        });
        
        // Add event listeners to action buttons
        document.querySelectorAll('.btn-view').forEach(button => {
            button.addEventListener('click', () => viewStudent(button.getAttribute('data-id')));
        });
        
        document.querySelectorAll('.btn-edit').forEach(button => {
            button.addEventListener('click', () => editStudent(button.getAttribute('data-id')));
        });
        
        document.querySelectorAll('.btn-delete').forEach(button => {
            button.addEventListener('click', () => showDeleteConfirmation(button.getAttribute('data-id')));
        });
        
        // Update pagination UI
        updatePagination();
        
        // Hide no data message
        noDataMessage.style.display = 'none';
        
        // Show table
        studentTableBody.closest('table').style.display = 'table';
    }
    
    // Update pagination UI
    function updatePagination() {
        const totalPages = Math.ceil(filteredStudents.length / pageSize);
        
        // Update entries info
        currentEntriesElement.textContent = filteredStudents.length > 0 
            ? `${(currentPage - 1) * pageSize + 1}-${Math.min(currentPage * pageSize, filteredStudents.length)}` 
            : '0';
        totalEntriesElement.textContent = filteredStudents.length;
        
        // Enable/disable prev/next buttons
        prevPageButton.disabled = currentPage <= 1;
        nextPageButton.disabled = currentPage >= totalPages;
        
        // Create page number buttons
        paginationNumbers.innerHTML = '';
        
        // Determine range of pages to show
        let startPage = Math.max(1, currentPage - 2);
        let endPage = Math.min(totalPages, startPage + 4);
        
        // Adjust start if we're near the end
        if (endPage - startPage < 4) {
            startPage = Math.max(1, endPage - 4);
        }
        
        // Add first page if not included
        if (startPage > 1) {
            const pageBtn = createPageButton(1);
            paginationNumbers.appendChild(pageBtn);
            
            if (startPage > 2) {
                const ellipsis = document.createElement('span');
                ellipsis.className = 'pagination-ellipsis';
                ellipsis.textContent = '...';
                paginationNumbers.appendChild(ellipsis);
            }
        }
        
        // Add page buttons
        for (let i = startPage; i <= endPage; i++) {
            const pageBtn = createPageButton(i);
            paginationNumbers.appendChild(pageBtn);
        }
        
        // Add last page if not included
        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                const ellipsis = document.createElement('span');
                ellipsis.className = 'pagination-ellipsis';
                ellipsis.textContent = '...';
                paginationNumbers.appendChild(ellipsis);
            }
            
            const pageBtn = createPageButton(totalPages);
            paginationNumbers.appendChild(pageBtn);
        }
    }
    
    // Create page button
    function createPageButton(pageNum) {
        const pageBtn = document.createElement('button');
        pageBtn.className = `page-number ${pageNum === currentPage ? 'active' : ''}`;
        pageBtn.textContent = pageNum;
        pageBtn.addEventListener('click', () => changePage(pageNum));
        return pageBtn;
    }
    
    // Change current page
    function changePage(pageNum) {
        currentPage = pageNum;
        updateTable();
        
        // Scroll to top of table
        studentTableBody.closest('.data-table-container').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    
    // Show no data message
    function showNoData() {
        studentTableBody.closest('table').style.display = 'none';
        noDataMessage.style.display = 'flex';
        
        // Update entries info
        currentEntriesElement.textContent = '0';
        totalEntriesElement.textContent = '0';
        
        // Disable pagination
        prevPageButton.disabled = true;
        nextPageButton.disabled = true;
        paginationNumbers.innerHTML = '';
    }
    
    // Update statistics
    function updateStats() {
        // Total students
        totalStudentsElement.textContent = students.length;
        
        // New students today
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const newToday = students.filter(student => {
            const createdDate = new Date(student.createdAt);
            return createdDate >= today;
        }).length;
        
        newStudentsElement.textContent = newToday;
        
        // Gender ratio (female percentage)
        const femaleCount = students.filter(student => student.gender === 'Female').length;
        const femaleRatio = students.length > 0 ? Math.round((femaleCount / students.length) * 100) : 0;
        genderRatioElement.textContent = `${femaleRatio}%`;
        
        // Complete profiles (having all optional fields filled)
        const completeProfiles = students.filter(student => {
            return student.program && student.regNumber;
        }).length;
        
        const completionRate = students.length > 0 ? Math.round((completeProfiles / students.length) * 100) : 0;
        completionRateElement.textContent = `${completionRate}%`;
    }
    
    // View student details
    function viewStudent(id) {
        const student = students.find(s => s._id === id);
        
        if (!student) return;
        
        selectedStudentId = id;
        
        const studentDetails = document.getElementById('studentDetails');
        
        const formatDate = dateString => {
            if (!dateString) return '-';
            const date = new Date(dateString);
            return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
        };
        
        studentDetails.innerHTML = `
            <div class="student-details">
                <div class="detail-group">
                    <div class="detail-label">Name</div>
                    <div class="detail-value">${student.studentName}</div>
                </div>
                
                <div class="detail-group">
                    <div class="detail-label">Email</div>
                    <div class="detail-value">${student.email}</div>
                </div>
                
                <div class="detail-group">
                    <div class="detail-label">Phone Number</div>
                    <div class="detail-value">${student.phoneNumber}</div>
                </div>
                
                <div class="detail-group">
                    <div class="detail-label">Program</div>
                    <div class="detail-value">${student.program || '-'}</div>
                </div>
                
                <div class="detail-group">
                    <div class="detail-label">ID Card Number</div>
                    <div class="detail-value">${student.idCardNumber}</div>
                </div>
                
                <div class="detail-group">
                    <div class="detail-label">Gender</div>
                    <div class="detail-value">${student.gender}</div>
                </div>
                
                <div class="detail-group">
                    <div class="detail-label">Date of Birth</div>
                    <div class="detail-value">${formatDate(student.dob)}</div>
                </div>
                
                <div class="detail-group">
                    <div class="detail-label">Registration Number</div>
                    <div class="detail-value">${student.regNumber || '-'}</div>
                </div>
                
                <div class="detail-group">
                    <div class="detail-label">Address</div>
                    <div class="detail-value">${student.address || '-'}</div>
                </div>
                
                <div class="detail-group">
                    <div class="detail-label">Registration Date</div>
                    <div class="detail-value">${formatDate(student.createdAt)}</div>
                </div>
            </div>
        `;
        
        // Set edit button action
        document.getElementById('editStudentBtn').setAttribute('data-id', id);
        document.getElementById('editStudentBtn').addEventListener('click', () => {
            studentModal.classList.remove('show');
            editStudent(id);
        }, { once: true });
        
        // Show modal
        studentModal.classList.add('show');
    }
    
    // Edit student
    function editStudent(id) {
        // In a real app, redirect to edit form or show edit modal
        alert('Edit functionality would be implemented here. Student ID: ' + id);
    }
    
    // Show delete confirmation
    function showDeleteConfirmation(id) {
        const student = students.find(s => s._id === id);
        
        if (!student) return;
        
        selectedStudentId = id;
        
        const deleteStudentPreview = document.getElementById('deleteStudentPreview');
        
        deleteStudentPreview.innerHTML = `
            <p><strong>Name:</strong> ${student.studentName}</p>
            <p><strong>Email:</strong> ${student.email}</p>
            <p><strong>ID Card:</strong> ${student.idCardNumber}</p>
        `;
        
        // Show modal
        deleteModal.classList.add('show');
    }
    
    // Delete student
    async function deleteStudent() {
        if (!selectedStudentId) return;
        
        try {
            const response = await fetch(`/api/students/${selectedStudentId}`, {
                method: 'DELETE'
            });
            
            if (!response.ok) {
                throw new Error('Failed to delete student');
            }
            
            // Remove student from list
            students = students.filter(s => s._id !== selectedStudentId);
            filteredStudents = filteredStudents.filter(s => s._id !== selectedStudentId);
            
            // Hide modal
            deleteModal.classList.remove('show');
            
            // Update table
            updateTable();
            
            // Update stats
            updateStats();
            
            // Show toast notification
            showToast('success', 'Student deleted successfully');
            
        } catch (error) {
            console.error('Error deleting student:', error);
            showToast('error', 'Failed to delete student');
        }
    }
    
    // Export data to CSV
    function exportData() {
        // Get the column headers
        const headers = [
            'Name',
            'Email',
            'Phone',
            'Program',
            'Address',
            'ID Card Number',
            'Gender',
            'Date of Birth',
            'Registration Number',
            'Registration Date'
        ];
        
        // Format student data for CSV
        const csvData = filteredStudents.map(student => {
            const formatDate = dateString => {
                if (!dateString) return '';
                const date = new Date(dateString);
                return date.toLocaleDateString('en-US', { year: 'numeric', month: 'numeric', day: 'numeric' });
            };
            
            return [
                student.studentName,
                student.email,
                student.phoneNumber,
                student.program || '',
                student.address || '',
                student.idCardNumber,
                student.gender,
                formatDate(student.dob),
                student.regNumber || '',
                formatDate(student.createdAt)
            ];
        });
        
        // Add headers to CSV data
        csvData.unshift(headers);
        
        // Convert to CSV format
        let csvContent = csvData.map(row => row.map(cell => {
            // Handle cells that contain commas or quotes
            if (cell && (cell.includes(',') || cell.includes('"'))) {
                return `"${cell.replace(/"/g, '""')}"`;
            }
            return cell;
        }).join(',')).join('\n');
        
        // Create download link
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `students_export_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.display = 'none';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Show success message
        showToast('success', 'Data exported successfully');
    }
    
    // Show toast notification
    function showToast(type, message) {
        // Check if toast container exists, if not create it
        let toastContainer = document.querySelector('.toast-container');
        
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.className = 'toast-container';
            document.body.appendChild(toastContainer);
            
            // Add style for toast container if not already in main CSS
            if (!document.querySelector('#toast-styles')) {
                const style = document.createElement('style');
                style.id = 'toast-styles';
                style.textContent = `
                    .toast-container {
                        position: fixed;
                        top: 20px;
                        right: 20px;
                        z-index: 1050;
                        display: flex;
                        flex-direction: column;
                        gap: 10px;
                    }
                    
                    .toast {
                        padding: 15px 20px;
                        border-radius: var(--border-radius-md);
                        color: white;
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                        gap: 10px;
                        box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
                        opacity: 0;
                        transform: translateX(50px);
                        transition: opacity 0.3s, transform 0.3s;
                        min-width: 280px;
                    }
                    
                    .toast.show {
                        opacity: 1;
                        transform: translateX(0);
                    }
                    
                    .toast.success {
                        background-color: var(--success-color);
                    }
                    
                    .toast.error {
                        background-color: var(--error-color);
                    }
                    
                    .toast-close {
                        background: none;
                        border: none;
                        color: white;
                        cursor: pointer;
                        font-size: 18px;
                        opacity: 0.8;
                        transition: opacity 0.2s;
                    }
                    
                    .toast-close:hover {
                        opacity: 1;
                    }
                `;
                document.head.appendChild(style);
            }
        }
        
        // Create toast element
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <span>${message}</span>
            <button class="toast-close"><i class="fas fa-times"></i></button>
        `;
        
        // Add to container
        toastContainer.appendChild(toast);
        
        // Trigger animation
        setTimeout(() => {
            toast.classList.add('show');
        }, 10);
        
        // Add close button listener
        const closeBtn = toast.querySelector('.toast-close');
        closeBtn.addEventListener('click', () => {
            toast.classList.remove('show');
            setTimeout(() => {
                toastContainer.removeChild(toast);
            }, 300);
        });
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (toast.parentNode) {
                toast.classList.remove('show');
                setTimeout(() => {
                    if (toast.parentNode) {
                        toastContainer.removeChild(toast);
                    }
                }, 300);
            }
        }, 5000);
    }
});