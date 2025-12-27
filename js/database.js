/* ===========================================
   نظام الخزنة - إدارة وعرض البيانات
   نظام حجز السكن الجامعي - جامعة نجران
   =========================================== */

class StudentVault {
    constructor() {
        this.students = this.loadFromStorage();
        this.filteredStudents = [...this.students];
        this.currentPage = 1;
        this.rowsPerPage = 25;
        this.sortField = 'timestamp';
        this.sortDirection = 'desc';
        this.filters = {};
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.renderTable();
        this.updateStatistics();
        this.setupAutoRefresh();
    }
    
    setupEventListeners() {
        // البحث في الوقت الحقيقي
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', debounce((e) => {
                this.searchStudents(e.target.value);
            }, 300));
        }
        
        // الفلاتر
        const filterGender = document.getElementById('filterGender');
        if (filterGender) {
            filterGender.addEventListener('change', (e) => {
                this.setFilter('gender', e.target.value);
            });
        }
        
        const filterProvince = document.getElementById('filterProvince');
        if (filterProvince) {
            filterProvince.addEventListener('change', (e) => {
                this.setFilter('province', e.target.value);
            });
        }
        
        const filterBuilding = document.getElementById('filterBuilding');
        if (filterBuilding) {
            filterBuilding.addEventListener('change', (e) => {
                this.setFilter('selectedBuilding', e.target.value);
            });
        }
        
        // الترتيب
        const sortSelect = document.getElementById('sortBy');
        if (sortSelect) {
            sortSelect.addEventListener('change', (e) => {
                this.setSorting(e.target.value);
            });
        }
        
        // عدد الصفوف في الصفحة
        const rowsPerPageSelect = document.getElementById('rowsPerPage');
        if (rowsPerPageSelect) {
            rowsPerPageSelect.addEventListener('change', (e) => {
                this.setRowsPerPage(parseInt(e.target.value));
            });
        }
        
        // التصفح
        const prevPageBtn = document.getElementById('prevPage');
        const nextPageBtn = document.getElementById('nextPage');
        
        if (prevPageBtn) {
            prevPageBtn.addEventListener('click', () => this.previousPage());
        }
        
        if (nextPageBtn) {
            nextPageBtn.addEventListener('click', () => this.nextPage());
        }
    }
    
    setupAutoRefresh() {
        // تحديث تلقائي كل 30 ثانية
        setInterval(() => {
            this.refreshData();
        }, 30000);
    }
    
    loadFromStorage() {
        try {
            const data = localStorage.getItem('university_housing');
            return data ? JSON.parse(data) : this.getSampleData();
        } catch (error) {
            console.error('خطأ في تحميل البيانات من الخزنة:', error);
            return this.getSampleData();
        }
    }
    
    getSampleData() {
        // بيانات تجريبية لأغراض العرض
        return [
            {
                id: 1,
                fullName: "أحمد محمد العتيبي",
                nationalId: "1087654321",
                phone: "0512345678",
                email: "ahmed@nu.edu.sa",
                gender: "male",
                province: "الرياض",
                gpa: 4.75,
                specialization: "هندسة حاسب",
                timestamp: "2024-01-15T10:30:00Z",
                selectedBuilding: "A",
                buildingName: "المبنى أ",
                reservationCode: "NU-HS-4321-123456-7890",
                status: "confirmed"
            },
            {
                id: 2,
                fullName: "فاطمة عبدالله القحطاني",
                nationalId: "1098765432",
                phone: "0587654321",
                email: "fatima@nu.edu.sa",
                gender: "female",
                province: "نجران",
                gpa: 4.90,
                specialization: "طب وجراحة",
                timestamp: "2024-01-14T14:20:00Z",
                selectedBuilding: "1",
                buildingName: "المبنى 1",
                reservationCode: "NU-HS-5432-123457-7891",
                status: "confirmed"
            },
            {
                id: 3,
                fullName: "خالد سعيد الغامدي",
                nationalId: "1076543210",
                phone: "0567890123",
                email: "khaled@nu.edu.sa",
                gender: "male",
                province: "مكة المكرمة",
                gpa: 4.20,
                specialization: "إدارة أعمال",
                timestamp: "2024-01-13T09:15:00Z",
                selectedBuilding: "B",
                buildingName: "المبنى ب",
                reservationCode: "NU-HS-3210-123458-7892",
                status: "confirmed"
            }
        ];
    }
    
    saveToStorage() {
        try {
            localStorage.setItem('university_housing', JSON.stringify(this.students));
            return true;
        } catch (error) {
            console.error('خطأ في حفظ البيانات في الخزنة:', error);
            return false;
        }
    }
    
    addStudent(studentData) {
        const student = {
            id: Date.now(),
            timestamp: new Date().toISOString(),
            status: 'pending',
            ...studentData
        };
        
        this.students.unshift(student);
        this.saveToStorage();
        this.refreshData();
        
        // تسجيل الحدث
        this.logEvent('student_added', { studentId: student.nationalId });
        
        return student;
    }
    
    updateStudent(id, updates) {
        const index = this.students.findIndex(student => student.id === id);
        
        if (index !== -1) {
            this.students[index] = { ...this.students[index], ...updates };
            this.saveToStorage();
            this.refreshData();
            
            this.logEvent('student_updated', { studentId: this.students[index].nationalId });
            return true;
        }
        
        return false;
    }
    
    deleteStudent(id) {
        const index = this.students.findIndex(student => student.id === id);
        
        if (index !== -1) {
            const deletedStudent = this.students.splice(index, 1)[0];
            this.saveToStorage();
            this.refreshData();
            
            this.logEvent('student_deleted', { studentId: deletedStudent.nationalId });
            return true;
        }
        
        return false;
    }
    
    refreshData() {
        this.students = this.loadFromStorage();
        this.applyFilters();
        this.renderTable();
        this.updateStatistics();
        this.updatePagination();
    }
    
    searchStudents(query) {
        if (!query.trim()) {
            this.filteredStudents = [...this.students];
        } else {
            const searchTerm = query.toLowerCase();
            this.filteredStudents = this.students.filter(student => {
                return (
                    student.fullName.toLowerCase().includes(searchTerm) ||
                    student.nationalId.includes(searchTerm) ||
                    student.phone.includes(searchTerm) ||
                    student.email.toLowerCase().includes(searchTerm) ||
                    student.specialization.toLowerCase().includes(searchTerm) ||
                    student.reservationCode?.toLowerCase().includes(searchTerm)
                );
            });
        }
        
        this.currentPage = 1;
        this.renderTable();
        this.updatePagination();
    }
    
    setFilter(field, value) {
        if (value) {
            this.filters[field] = value;
        } else {
            delete this.filters[field];
        }
        
        this.applyFilters();
        this.renderTable();
        this.updatePagination();
    }
    
    applyFilters() {
        let filtered = [...this.students];
        
        // تطبيق الفلاتر
        Object.entries(this.filters).forEach(([field, value]) => {
            filtered = filtered.filter(student => {
                if (field === 'selectedBuilding') {
                    return student.selectedBuilding === value;
                }
                return student[field] === value;
            });
        });
        
        // تطبيق الترتيب
        filtered.sort(this.getSortFunction());
        
        this.filteredStudents = filtered;
    }
    
    setSorting(sortValue) {
        switch (sortValue) {
            case 'date_desc':
                this.sortField = 'timestamp';
                this.sortDirection = 'desc';
                break;
            case 'date_asc':
                this.sortField = 'timestamp';
                this.sortDirection = 'asc';
                break;
            case 'gpa_desc':
                this.sortField = 'gpa';
                this.sortDirection = 'desc';
                break;
            case 'gpa_asc':
                this.sortField = 'gpa';
                this.sortDirection = 'asc';
                break;
            case 'name_asc':
                this.sortField = 'fullName';
                this.sortDirection = 'asc';
                break;
            case 'name_desc':
                this.sortField = 'fullName';
                this.sortDirection = 'desc';
                break;
        }
        
        this.applyFilters();
        this.renderTable();
    }
    
    getSortFunction() {
        return (a, b) => {
            let aValue = a[this.sortField];
            let bValue = b[this.sortField];
            
            // معالجة خاصة للحقول المختلفة
            if (this.sortField === 'timestamp') {
                aValue = new Date(aValue);
                bValue = new Date(bValue);
            }
            
            if (this.sortField === 'fullName') {
                aValue = aValue.toLowerCase();
                bValue = bValue.toLowerCase();
            }
            
            if (this.sortDirection === 'asc') {
                return aValue > bValue ? 1 : -1;
            } else {
                return aValue < bValue ? 1 : -1;
            }
        };
    }
    
    setRowsPerPage(rows) {
        this.rowsPerPage = rows;
        this.currentPage = 1;
        this.renderTable();
        this.updatePagination();
    }
    
    getPaginatedStudents() {
        const startIndex = (this.currentPage - 1) * this.rowsPerPage;
        const endIndex = startIndex + this.rowsPerPage;
        return this.filteredStudents.slice(startIndex, endIndex);
    }
    
    getTotalPages() {
        return Math.ceil(this.filteredStudents.length / this.rowsPerPage);
    }
    
    previousPage() {
        if (this.currentPage > 1) {
            this.currentPage--;
            this.renderTable();
            this.updatePagination();
        }
    }
    
    nextPage() {
        if (this.currentPage < this.getTotalPages()) {
            this.currentPage++;
            this.renderTable();
            this.updatePagination();
        }
    }
    
    goToPage(page) {
        if (page >= 1 && page <= this.getTotalPages()) {
            this.currentPage = page;
            this.renderTable();
            this.updatePagination();
        }
    }
    
    renderTable() {
        const tableBody = document.getElementById('studentsTableBody');
        if (!tableBody) return;
        
        const students = this.getPaginatedStudents();
        
        if (students.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="11" class="text-center">
                        <div class="empty-state">
                            <i class="fas fa-database"></i>
                            <h4>لا توجد بيانات</h4>
                            <p>لم يتم العثور على طلاب مطابقين للبحث أو الفلاتر المحددة</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }
        
        let html = '';
        
        students.forEach((student, index) => {
            const globalIndex = (this.currentPage - 1) * this.rowsPerPage + index + 1;
            
            html += `
                <tr data-id="${student.id}">
                    <td>${globalIndex}</td>
                    <td>
                        <div class="student-name-cell">
                            <strong>${student.fullName}</strong>
                            <small class="text-muted">${student.email}</small>
                        </div>
                    </td>
                    <td>${student.nationalId}</td>
                    <td>
                        <span class="gender-badge ${student.gender}">
                            ${student.gender === 'male' ? 'ذكر' : 'أنثى'}
                        </span>
                    </td>
                    <td>${student.province}</td>
                    <td>${student.specialization}</td>
                    <td class="gpa-cell">
                        <span class="gpa-badge">${student.gpa.toFixed(2)}</span>
                    </td>
                    <td>
                        ${student.buildingName ? `
                            <span class="building-badge">${student.buildingName}</span>
                        ` : '<span class="text-muted">لم يحدد</span>'}
                    </td>
                    <td>
                        ${student.reservationCode ? `
                            <code class="reservation-code">${student.reservationCode}</code>
                        ` : '<span class="text-muted">-</span>'}
                    </td>
                    <td>
                        <div class="timestamp-cell">
                            <div>${this.formatDate(student.timestamp)}</div>
                            <small>${this.formatTime(student.timestamp)}</small>
                        </div>
                    </td>
                    <td>
                        <div class="action-buttons">
                            <button class="btn-action view-btn" title="عرض التفاصيل" onclick="vault.viewStudent(${student.id})">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="btn-action edit-btn" title="تعديل" onclick="vault.editStudent(${student.id})">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn-action delete-btn" title="حذف" onclick="vault.confirmDelete(${student.id})">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        });
        
        tableBody.innerHTML = html;
        
        // تحديث عداد الطلاب
        this.updateTableCount();
    }
    
    updateTableCount() {
        const countElement = document.getElementById('tableCount');
        if (countElement) {
            countElement.textContent = this.filteredStudents.length.toLocaleString();
        }
    }
    
    updatePagination() {
        const currentPageElement = document.getElementById('currentPage');
        const totalPagesElement = document.getElementById('totalPages');
        const prevPageBtn = document.getElementById('prevPage');
        const nextPageBtn = document.getElementById('nextPage');
        
        if (currentPageElement) {
            currentPageElement.textContent = this.currentPage;
        }
        
        if (totalPagesElement) {
            totalPagesElement.textContent = this.getTotalPages();
        }
        
        if (prevPageBtn) {
            prevPageBtn.disabled = this.currentPage <= 1;
        }
        
        if (nextPageBtn) {
            nextPageBtn.disabled = this.currentPage >= this.getTotalPages();
        }
    }
    
    updateStatistics() {
        this.updateGeneralStats();
        this.updateProvinceStats();
        this.updateGenderStats();
    }
    
    updateGeneralStats() {
        const totalElement = document.getElementById('totalStudents');
        const avgGPAElement = document.getElementById('averageGPA');
        
        if (totalElement) {
            totalElement.textContent = this.students.length.toLocaleString();
        }
        
        if (avgGPAElement) {
            const avgGPA = this.calculateAverageGPA();
            avgGPAElement.textContent = avgGPA.toFixed(2);
        }
    }
    
    updateGenderStats() {
        const maleElement = document.getElementById('maleStudents');
        const femaleElement = document.getElementById('femaleStudents');
        const malePercentElement = document.getElementById('malePercent');
        const femalePercentElement = document.getElementById('femalePercent');
        
        if (maleElement && femaleElement) {
            const maleCount = this.students.filter(s => s.gender === 'male').length;
            const femaleCount = this.students.filter(s => s.gender === 'female').length;
            const total = this.students.length;
            
            maleElement.textContent = maleCount.toLocaleString();
            femaleElement.textContent = femaleCount.toLocaleString();
            
            if (malePercentElement && femalePercentElement && total > 0) {
                const malePercent = Math.round((maleCount / total) * 100);
                const femalePercent = Math.round((femaleCount / total) * 100);
                
                malePercentElement.textContent = `${malePercent}%`;
                femalePercentElement.textContent = `${femalePercent}%`;
            }
        }
    }
    
    updateProvinceStats() {
        const provinceList = document.getElementById('provinceList');
        if (!provinceList) return;
        
        const provinceCounts = {};
        this.students.forEach(student => {
            provinceCounts[student.province] = (provinceCounts[student.province] || 0) + 1;
        });
        
        // تحويل إلى مصفوفة وترتيب تنازلياً
        const provinceArray = Object.entries(provinceCounts)
            .sort((a, b) => b[1] - a[1]);
        
        let html = '';
        
        provinceArray.forEach(([province, count]) => {
            const percentage = Math.round((count / this.students.length) * 100);
            
            html += `
                <div class="province-item">
                    <div class="province-name">${province}</div>
                    <div class="province-bar-container">
                        <div class="province-bar" style="width: ${percentage}%"></div>
                    </div>
                    <div class="province-count">${count} (${percentage}%)</div>
                </div>
            `;
        });
        
        provinceList.innerHTML = html;
    }
    
    calculateStatistics() {
        const total = this.students.length;
        const maleCount = this.students.filter(s => s.gender === 'male').length;
        const femaleCount = total - maleCount;
        
        // حساب توزيع المحافظات
        const provinces = {};
        this.students.forEach(student => {
            provinces[student.province] = (provinces[student.province] || 0) + 1;
        });
        
        // حساب المعدل المتوسط
        const avgGPA = this.calculateAverageGPA();
        
        // حساب توزيع التخصصات
        const specializations = {};
        this.students.forEach(student => {
            specializations[student.specialization] = (specializations[student.specialization] || 0) + 1;
        });
        
        return {
            total,
            maleCount,
            femaleCount,
            provinces,
            specializations,
            avgGPA
        };
    }
    
    calculateAverageGPA() {
        if (this.students.length === 0) return 0;
        
        const sum = this.students.reduce((total, student) => {
            return total + (parseFloat(student.gpa) || 0);
        }, 0);
        
        return sum / this.students.length;
    }
    
    viewStudent(id) {
        const student = this.students.find(s => s.id === id);
        if (!student) return;
        
        this.showStudentModal(student, 'view');
    }
    
    editStudent(id) {
        const student = this.students.find(s => s.id === id);
        if (!student) return;
        
        this.showStudentModal(student, 'edit');
    }
    
    showStudentModal(student, mode = 'view') {
        const modalHtml = `
            <div class="modal" id="studentModal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>
                            <i class="fas fa-user-graduate"></i>
                            ${mode === 'view' ? 'تفاصيل الطالب' : 'تعديل بيانات الطالب'}
                        </h3>
                        <button class="modal-close" onclick="vault.closeModal()">&times;</button>
                    </div>
                    <div class="modal-body">
                        ${this.getStudentModalContent(student, mode)}
                    </div>
                    ${mode === 'edit' ? `
                        <div class="modal-footer">
                            <button class="btn-secondary" onclick="vault.closeModal()">إلغاء</button>
                            <button class="btn-primary" onclick="vault.saveStudentChanges(${student.id})">حفظ التغييرات</button>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
        
        // إضافة المودال إلى الصفحة
        const modalContainer = document.createElement('div');
        modalContainer.innerHTML = modalHtml;
        document.body.appendChild(modalContainer);
        
        // إظهار المودال
        const modal = document.getElementById('studentModal');
        if (modal) {
            modal.style.display = 'flex';
        }
    }
    
    getStudentModalContent(student, mode) {
        if (mode === 'view') {
            return `
                <div class="student-details">
                    <div class="detail-row">
                        <div class="detail-label">الاسم الرباعي:</div>
                        <div class="detail-value">${student.fullName}</div>
                    </div>
                    <div class="detail-row">
                        <div class="detail-label">رقم الهوية:</div>
                        <div class="detail-value">${student.nationalId}</div>
                    </div>
                    <div class="detail-row">
                        <div class="detail-label">رقم الهاتف:</div>
                        <div class="detail-value">${student.phone}</div>
                    </div>
                    <div class="detail-row">
                        <div class="detail-label">البريد الإلكتروني:</div>
                        <div class="detail-value">${student.email}</div>
                    </div>
                    <div class="detail-row">
                        <div class="detail-label">الجنس:</div>
                        <div class="detail-value">${student.gender === 'male' ? 'ذكر' : 'أنثى'}</div>
                    </div>
                    <div class="detail-row">
                        <div class="detail-label">المحافظة:</div>
                        <div class="detail-value">${student.province}</div>
                    </div>
                    <div class="detail-row">
                        <div class="detail-label">التخصص:</div>
                        <div class="detail-value">${student.specialization}</div>
                    </div>
                    <div class="detail-row">
                        <div class="detail-label">المعدل التراكمي:</div>
                        <div class="detail-value">${student.gpa.toFixed(2)}</div>
                    </div>
                    ${student.buildingName ? `
                        <div class="detail-row">
                            <div class="detail-label">المبنى المختار:</div>
                            <div class="detail-value">${student.buildingName}</div>
                        </div>
                    ` : ''}
                    ${student.reservationCode ? `
                        <div class="detail-row">
                            <div class="detail-label">رقم الحجز:</div>
                            <div class="detail-value">${student.reservationCode}</div>
                        </div>
                    ` : ''}
                    <div class="detail-row">
                        <div class="detail-label">تاريخ التسجيل:</div>
                        <div class="detail-value">${this.formatDate(student.timestamp)} ${this.formatTime(student.timestamp)}</div>
                    </div>
                    <div class="detail-row">
                        <div class="detail-label">الحالة:</div>
                        <div class="detail-value">
                            <span class="status-badge ${student.status}">
                                ${this.getStatusText(student.status)}
                            </span>
                        </div>
                    </div>
                </div>
            `;
        } else {
            // وضع التعديل
            return `
                <form id="editStudentForm" class="edit-form">
                    <div class="form-group">
                        <label for="editFullName">الاسم الرباعي</label>
                        <input type="text" id="editFullName" value="${student.fullName}" class="form-control">
                    </div>
                    <div class="form-group">
                        <label for="editNationalId">رقم الهوية</label>
                        <input type="text" id="editNationalId" value="${student.nationalId}" class="form-control" readonly>
                    </div>
                    <div class="form-group">
                        <label for="editPhone">رقم الهاتف</label>
                        <input type="tel" id="editPhone" value="${student.phone}" class="form-control">
                    </div>
                    <div class="form-group">
                        <label for="editEmail">البريد الإلكتروني</label>
                        <input type="email" id="editEmail" value="${student.email}" class="form-control">
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="editGender">الجنس</label>
                            <select id="editGender" class="form-control">
                                <option value="male" ${student.gender === 'male' ? 'selected' : ''}>ذكر</option>
                                <option value="female" ${student.gender === 'female' ? 'selected' : ''}>أنثى</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="editGPA">المعدل التراكمي</label>
                            <input type="number" id="editGPA" value="${student.gpa}" step="0.01" min="0" max="5" class="form-control">
                        </div>
                    </div>
                    <div class="form-group">
                        <label for="editProvince">المحافظة</label>
                        <select id="editProvince" class="form-control">
                            <option value="نجران" ${student.province === 'نجران' ? 'selected' : ''}>نجران</option>
                            <option value="الرياض" ${student.province === 'الرياض' ? 'selected' : ''}>الرياض</option>
                            <option value="مكة المكرمة" ${student.province === 'مكة المكرمة' ? 'selected' : ''}>مكة المكرمة</option>
                            <option value="المدينة المنورة" ${student.province === 'المدينة المنورة' ? 'selected' : ''}>المدينة المنورة</option>
                            <option value="الشرقية" ${student.province === 'الشرقية' ? 'selected' : ''}>الشرقية</option>
                            <option value="عسير" ${student.province === 'عسير' ? 'selected' : ''}>عسير</option>
                            <option value="جازان" ${student.province === 'جازان' ? 'selected' : ''}>جازان</option>
                            <option value="حائل" ${student.province === 'حائل' ? 'selected' : ''}>حائل</option>
                            <option value="القصيم" ${student.province === 'القصيم' ? 'selected' : ''}>القصيم</option>
                            <option value="تبوك" ${student.province === 'تبوك' ? 'selected' : ''}>تبوك</option>
                            <option value="الجوف" ${student.province === 'الجوف' ? 'selected' : ''}>الجوف</option>
                            <option value="الباحة" ${student.province === 'الباحة' ? 'selected' : ''}>الباحة</option>
                            <option value="الحدود الشمالية" ${student.province === 'الحدود الشمالية' ? 'selected' : ''}>الحدود الشمالية</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="editSpecialization">التخصص</label>
                        <select id="editSpecialization" class="form-control">
                            <option value="طب وجراحة" ${student.specialization === 'طب وجراحة' ? 'selected' : ''}>طب وجراحة</option>
                            <option value="هندسة حاسب" ${student.specialization === 'هندسة حاسب' ? 'selected' : ''}>هندسة حاسب</option>
                            <option value="هندسة مدنية" ${student.specialization === 'هندسة مدنية' ? 'selected' : ''}>هندسة مدنية</option>
                            <option value="إدارة أعمال" ${student.specialization === 'إدارة أعمال' ? 'selected' : ''}>إدارة أعمال</option>
                            <option value="محاسبة" ${student.specialization === 'محاسبة' ? 'selected' : ''}>محاسبة</option>
                            <option value="قانون" ${student.specialization === 'قانون' ? 'selected' : ''}>قانون</option>
                            <option value="تربية خاصة" ${student.specialization === 'تربية خاصة' ? 'selected' : ''}>تربية خاصة</option>
                            <option value="علوم الحاسب" ${student.specialization === 'علوم الحاسب' ? 'selected' : ''}>علوم الحاسب</option>
                            <option value="صيدلة" ${student.specialization === 'صيدلة' ? 'selected' : ''}>صيدلة</option>
                            <option value="تمريض" ${student.specialization === 'تمريض' ? 'selected' : ''}>تمريض</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="editStatus">الحالة</label>
                        <select id="editStatus" class="form-control">
                            <option value="pending" ${student.status === 'pending' ? 'selected' : ''}>قيد المراجعة</option>
                            <option value="confirmed" ${student.status === 'confirmed' ? 'selected' : ''}>مؤكد</option>
                            <option value="rejected" ${student.status === 'rejected' ? 'selected' : ''}>مرفوض</option>
                            <option value="completed" ${student.status === 'completed' ? 'selected' : ''}>مكتمل</option>
                        </select>
                    </div>
                </form>
            `;
        }
    }
    
    saveStudentChanges(id) {
        const student = this.students.find(s => s.id === id);
        if (!student) return;
        
        const updates = {
            fullName: document.getElementById('editFullName').value,
            phone: document.getElementById('editPhone').value,
            email: document.getElementById('editEmail').value,
            gender: document.getElementById('editGender').value,
            province: document.getElementById('editProvince').value,
            gpa: parseFloat(document.getElementById('editGPA').value),
            specialization: document.getElementById('editSpecialization').value,
            status: document.getElementById('editStatus').value
        };
        
        this.updateStudent(id, updates);
        this.closeModal();
        this.showMessage('تم تحديث بيانات الطالب بنجاح', 'success');
    }
    
    confirmDelete(id) {
        if (confirm('هل أنت متأكد من حذف هذا الطالب؟ هذا الإجراء لا يمكن التراجع عنه.')) {
            this.deleteStudent(id);
            this.showMessage('تم حذف الطالب بنجاح', 'success');
        }
    }
    
    closeModal() {
        const modal = document.getElementById('studentModal');
        if (modal) {
            modal.remove();
        }
    }
    
    showMessage(message, type = 'info') {
        const messageDiv = document.createElement('div');
        messageDiv.className = `alert alert-${type} vault-message`;
        messageDiv.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : 'info-circle'}"></i>
            <span>${message}</span>
            <button type="button" class="close-message">&times;</button>
        `;
        
        messageDiv.querySelector('.close-message').addEventListener('click', () => {
            messageDiv.remove();
        });
        
        // وضع الرسالة في أعلى الصفحة
        const container = document.querySelector('.vault-container .container');
        if (container) {
            container.insertBefore(messageDiv, container.firstChild);
        }
        
        // إزالة الرسالة بعد 3 ثوانٍ
        setTimeout(() => {
            if (messageDiv.parentNode) {
                messageDiv.remove();
            }
        }, 3000);
    }
    
    getStatusText(status) {
        const statusMap = {
            'pending': 'قيد المراجعة',
            'confirmed': 'مؤكد',
            'rejected': 'مرفوض',
            'completed': 'مكتمل'
        };
        
        return statusMap[status] || status;
    }
    
    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('ar-SA', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }
    
    formatTime(dateString) {
        const date = new Date(dateString);
        return date.toLocaleTimeString('ar-SA', {
            hour: '2-digit',
            minute: '2-digit'
        });
    }
    
    logEvent(eventName, data) {
        console.log(`[Vault Event] ${eventName}:`, data);
        
        try {
            const events = JSON.parse(localStorage.getItem('vault_events') || '[]');
            events.push({
                event: eventName,
                data,
                timestamp: new Date().toISOString()
            });
            localStorage.setItem('vault_events', JSON.stringify(events.slice(-100)));
        } catch (error) {
            console.error('خطأ في تسجيل الحدث:', error);
        }
    }
}

// وظيفة debounce للمساعدة
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// تهيئة الخزنة عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', function() {
    window.vault = new StudentVault();
});

// تصدير الفئة للاستخدام في ملفات أخرى
if (typeof module !== 'undefined' && module.exports) {
    module.exports = StudentVault;
  }
