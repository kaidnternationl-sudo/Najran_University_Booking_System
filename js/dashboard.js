/* ===========================================
   لوحة التحكم الإدارية - الرسوم البيانية والإحصائيات
   نظام حجز السكن الجامعي - جامعة نجران
   =========================================== */

class DashboardSystem {
    constructor() {
        this.charts = new Map();
        this.data = null;
        this.init();
    }
    
    init() {
        this.loadData();
        this.setupEventListeners();
        this.setupAutoRefresh();
    }
    
    setupEventListeners() {
        // تحديث عند تغيير الفلاتر
        document.addEventListener('change', (e) => {
            if (e.target.matches('.chart-select, .building-filters input')) {
                this.updateCharts();
            }
        });
        
        // تصدير البيانات
        const exportButtons = document.querySelectorAll('.btn-export-chart, #exportData');
        exportButtons.forEach(button => {
            button.addEventListener('click', () => this.exportChartData());
        });
    }
    
    setupAutoRefresh() {
        // تحديث تلقائي كل دقيقة
        setInterval(() => {
            this.refreshDashboard();
        }, 60000);
    }
    
    loadData() {
        // تحميل البيانات من الخزنة
        const vault = window.vault || new StudentVault();
        this.data = vault.calculateStatistics();
        this.updateCharts();
    }
    
    refreshDashboard() {
        this.loadData();
        this.showNotification('تم تحديث البيانات', 'info');
    }
    
    updateCharts() {
        this.createRegistrationsChart();
        this.createSpecializationsChart();
        this.createGeographicChart();
        this.createBuildingsChart();
        this.createHourlyChart();
        this.updatePriorityList();
    }
    
    createRegistrationsChart() {
        const canvas = document.getElementById('registrationsChart');
        if (!canvas) return;
        
        // بيانات تجريبية للتسجيلات اليومية
        const timeRange = document.getElementById('chartTimeRange')?.value || 'month';
        
        let labels, data;
        
        switch (timeRange) {
            case 'week':
                labels = ['السبت', 'الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'];
                data = [45, 67, 89, 102, 78, 56, 34];
                break;
            case 'month':
                labels = ['الأسبوع 1', 'الأسبوع 2', 'الأسبوع 3', 'الأسبوع 4'];
                data = [320, 450, 380, 410];
                break;
            case 'quarter':
                labels = ['يناير', 'فبراير', 'مارس'];
                data = [1250, 1420, 1380];
                break;
            default:
                labels = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو'];
                data = [1250, 1420, 1380, 1560, 1490, 1620];
        }
        
        // تدمير الرسم البياني السابق إذا كان موجوداً
        if (this.charts.has('registrations')) {
            this.charts.get('registrations').destroy();
        }
        
        const ctx = canvas.getContext('2d');
        const chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'عدد المسجلين',
                    data: data,
                    borderColor: '#1a5d1a',
                    backgroundColor: 'rgba(26, 93, 26, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                        rtl: true
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'عدد المسجلين'
                        }
                    }
                }
            }
        });
        
        this.charts.set('registrations', chart);
    }
    
    createSpecializationsChart() {
        const canvas = document.getElementById('specializationsChart');
        if (!canvas) return;
        
        // بيانات التخصصات من الخزنة
        const specializations = this.data?.specializations || {};
        const labels = Object.keys(specializations).slice(0, 8); // أول 8 تخصصات
        const data = labels.map(label => specializations[label]);
        
        // ألوان متنوعة للرسم البياني
        const colors = [
            '#1a5d1a', '#2e8b57', '#3cb371', '#20b2aa',
            '#4682b4', '#5f9ea0', '#6495ed', '#7b68ee'
        ];
        
        // تدمير الرسم البياني السابق
        if (this.charts.has('specializations')) {
            this.charts.get('specializations').destroy();
        }
        
        const ctx = canvas.getContext('2d');
        const chart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: colors,
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        position: 'left',
                        rtl: true,
                        labels: {
                            boxWidth: 12,
                            padding: 15
                        }
                    }
                },
                cutout: '60%'
            }
        });
        
        this.charts.set('specializations', chart);
    }
    
    createGeographicChart() {
        const canvas = document.getElementById('geographicChart');
        if (!canvas) return;
        
        // بيانات التوزيع الجغرافي
        const provinces = this.data?.provinces || {};
        const labels = Object.keys(provinces);
        const data = labels.map(label => provinces[label]);
        
        // ألوان حسب الكثافة
        const backgroundColors = data.map(count => {
            if (count > 50) return '#ff6b6b';
            if (count > 20) return '#4ecdc4';
            return '#a8e6cf';
        });
        
        // تدمير الرسم البياني السابق
        if (this.charts.has('geographic')) {
            this.charts.get('geographic').destroy();
        }
        
        const ctx = canvas.getContext('2d');
        const chart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'عدد الطلاب',
                    data: data,
                    backgroundColor: backgroundColors,
                    borderColor: backgroundColors.map(color => this.darkenColor(color, 20)),
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                indexAxis: 'y',
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    x: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'عدد الطلاب'
                        }
                    }
                }
            }
        });
        
        this.charts.set('geographic', chart);
        
        // تحديث وسيلة الإيضاح
        this.updateProvinceLegend();
    }
    
    createBuildingsChart() {
        const canvas = document.getElementById('buildingsChart');
        if (!canvas) return;
        
        // بيانات إشغال المباني (تجريبية)
        const filterMale = document.getElementById('filterMale')?.checked ?? true;
        const filterFemale = document.getElementById('filterFemale')?.checked ?? true;
        
        const labels = ['المبنى أ', 'المبنى ب', 'المبنى ج', 'المبنى 1', 'المبنى 2', 'المبنى 3'];
        const maleData = filterMale ? [85, 92, 98, 0, 0, 0] : [0, 0, 0, 0, 0, 0];
        const femaleData = filterFemale ? [0, 0, 0, 75, 88, 95] : [0, 0, 0, 0, 0, 0];
        
        // تدمير الرسم البياني السابق
        if (this.charts.has('buildings')) {
            this.charts.get('buildings').destroy();
        }
        
        const ctx = canvas.getContext('2d');
        const chart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'ذكور',
                        data: maleData,
                        backgroundColor: '#1a5d1a',
                        borderColor: '#1a5d1a',
                        borderWidth: 1
                    },
                    {
                        label: 'إناث',
                        data: femaleData,
                        backgroundColor: '#d4af37',
                        borderColor: '#d4af37',
                        borderWidth: 1
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                        rtl: true
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,
                        title: {
                            display: true,
                            text: 'نسبة الإشغال %'
                        }
                    }
                }
            }
        });
        
        this.charts.set('buildings', chart);
    }
    
    createHourlyChart() {
        const canvas = document.getElementById('hourlyChart');
        if (!canvas) return;
        
        // بيانات الساعة (تجريبية)
        const labels = [];
        const data = [];
        
        for (let hour = 8; hour <= 20; hour++) {
            labels.push(`${hour}:00`);
            // بيانات عشوائية تشبه نمط الاستخدام
            let count = Math.floor(Math.random() * 30) + 10;
            if (hour === 10 || hour === 11) count += 40; // ساعات الذروة الصباحية
            if (hour === 16 || hour === 17) count += 30; // ساعات الذروة المسائية
            data.push(count);
        }
        
        // تدمير الرسم البياني السابق
        if (this.charts.has('hourly')) {
            this.charts.get('hourly').destroy();
        }
        
        const ctx = canvas.getContext('2d');
        const chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'التسجيلات حسب الساعة',
                    data: data,
                    borderColor: '#2e8b57',
                    backgroundColor: 'rgba(46, 139, 87, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.3
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'عدد التسجيلات'
                        }
                    }
                }
            }
        });
        
        this.charts.set('hourly', chart);
    }
    
    updatePriorityList() {
        const tableBody = document.getElementById('priorityTableBody');
        if (!tableBody) return;
        
        const vault = window.vault || new StudentVault();
        const prioritySystem = new SmartSortingSystem(vault.students);
        const prioritized = prioritySystem.prioritizeStudents().slice(0, 10); // أول 10 طلاب
        
        let html = '';
        
        prioritized.forEach((student, index) => {
            const priorityScore = this.calculatePriorityScore(student);
            
            html += `
                <tr>
                    <td>
                        <span class="rank-badge rank-${index + 1}">${index + 1}</span>
                    </td>
                    <td>
                        <div class="student-name">${student.fullName}</div>
                        <div class="student-id">${student.nationalId}</div>
                    </td>
                    <td class="gpa-cell">
                        <span class="gpa-value">${student.gpa.toFixed(2)}</span>
                    </td>
                    <td>
                        <span class="province-badge">${student.province}</span>
                    </td>
                    <td>
                        <div class="priority-score">
                            <div class="score-bar">
                                <div class="score-fill" style="width: ${priorityScore}%"></div>
                            </div>
                            <span class="score-text">${priorityScore}</span>
                        </div>
                    </td>
                    <td>
                        <span class="status-badge ${student.status}">
                            ${this.getStatusText(student.status)}
                        </span>
                    </td>
                    <td>
                        <button class="btn-action view-btn" onclick="dashboard.viewStudentDetail(${student.id})">
                            <i class="fas fa-eye"></i>
                        </button>
                    </td>
                </tr>
            `;
        });
        
        tableBody.innerHTML = html;
    }
    
    calculatePriorityScore(student) {
        const distanceMap = {
            'نجران': 0,
            'الرياض': 85,
            'مكة المكرمة': 90,
            'المدينة المنورة': 88,
            'الشرقية': 95,
            'عسير': 30,
            'جازان': 65,
            'حائل': 75,
            'القصيم': 70,
            'تبوك': 80,
            'الجوف': 82,
            'الباحة': 40,
            'الحدود الشمالية': 89
        };
        
        const gpaScore = (student.gpa / 5) * 70;
        const distanceScore = (distanceMap[student.province] || 50) * 0.3;
        return Math.min(100, Math.round(gpaScore + distanceScore));
    }
    
    updateProvinceLegend() {
        const legendElement = document.getElementById('provinceLegend');
        if (!legendElement) return;
        
        legendElement.innerHTML = `
            <div class="legend-item">
                <span class="legend-color" style="background-color: #ff6b6b"></span>
                <span>كثافة عالية</span>
            </div>
            <div class="legend-item">
                <span class="legend-color" style="background-color: #4ecdc4"></span>
                <span>كثافة متوسطة</span>
            </div>
            <div class="legend-item">
                <span class="legend-color" style="background-color: #a8e6cf"></span>
                <span>كثافة منخفضة</span>
            </div>
        `;
    }
    
    viewStudentDetail(studentId) {
        // توجيه إلى صفحة عرض تفاصيل الطالب في الخزنة
        window.location.href = `database_vault.html?view=${studentId}`;
    }
    
    exportChartData() {
        const chartData = {};
        
        // جمع بيانات جميع الرسوم البيانية
        this.charts.forEach((chart, name) => {
            chartData[name] = {
                labels: chart.data.labels,
                datasets: chart.data.datasets.map(dataset => ({
                    label: dataset.label,
                    data: dataset.data
                }))
            };
        });
        
        // إضافة إحصائيات إضافية
        chartData.statistics = this.data;
        chartData.exportDate = new Date().toISOString();
        
        // إنشاء ملف JSON للتنزيل
        const dataStr = JSON.stringify(chartData, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
        
        const exportFileDefaultName = `dashboard_export_${new Date().toISOString().split('T')[0]}.json`;
        
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
        
        this.showNotification('تم تصدير بيانات لوحة التحكم', 'success');
    }
    
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `dashboard-notification alert-${type}`;
        notification.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : 'info-circle'}"></i>
            <span>${message}</span>
        `;
        
        document.body.appendChild(notification);
        
        // إظهار الإشعار
        setTimeout(() => {
            notification.classList.add('show');
        }, 10);
        
        // إخفاء الإشعار بعد 3 ثوانٍ
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                notification.remove();
            }, 300);
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
    
    darkenColor(color, percent) {
        // تحويل اللون إلى RGB
        let r = parseInt(color.slice(1, 3), 16);
        let g = parseInt(color.slice(3, 5), 16);
        let b = parseInt(color.slice(5, 7), 16);
        
        // تظليل اللون
        r = Math.floor(r * (100 - percent) / 100);
        g = Math.floor(g * (100 - percent) / 100);
        b = Math.floor(b * (100 - percent) / 100);
        
        // التحويل مرة أخرى إلى hex
        return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
    }
}

class SmartSortingSystem {
    constructor(students) {
        this.students = students;
    }
    
    prioritizeStudents() {
        // خريطة المسافات النسبية
        const distanceMap = {
            'نجران': 0,
            'الرياض': 85,
            'مكة المكرمة': 90,
            'المدينة المنورة': 88,
            'الشرقية': 95,
            'عسير': 30,
            'جازان': 65,
            'حائل': 75,
            'القصيم': 70,
            'تبوك': 80,
            'الجوف': 82,
            'الباحة': 40,
            'الحدود الشمالية': 89
        };
        
        // حساب نقاط الأولوية لكل طالب
        const studentsWithScores = this.students.map(student => {
            const gpaScore = (student.gpa / 5) * 70; // 70% للمعدل
            const distanceScore = (distanceMap[student.province] || 50) * 0.3; // 30% للمسافة
            
            return {
                ...student,
                priorityScore: Math.min(100, Math.round(gpaScore + distanceScore))
            };
        });
        
        // الترتيب حسب نقاط الأولوية (تنازلياً)
        return studentsWithScores.sort((a, b) => b.priorityScore - a.priorityScore);
    }
    
    calculateLiveStats() {
        const total = this.students.length;
        const prioritized = this.prioritizeStudents();
        
        // حساب الإشغال
        const totalBeds = 1000; // السعة الإجمالية الافتراضية
        const occupancyRate = ((total / totalBeds) * 100).toFixed(1);
        
        // توزيع الكليات
        const colleges = {};
        this.students.forEach(student => {
            // استخراج الكلية من التخصص
            const college = this.extractCollege(student.specialization);
            colleges[college] = (colleges[college] || 0) + 1;
        });
        
        // حساب المعدلات حسب الكلية
        const gpaByCollege = {};
        this.students.forEach(student => {
            const college = this.extractCollege(student.specialization);
            if (!gpaByCollege[college]) {
                gpaByCollege[college] = {
                    total: 0,
                    count: 0,
                    average: 0
                };
            }
            gpaByCollege[college].total += parseFloat(student.gpa);
            gpaByCollege[college].count++;
        });
        
        // حساب المتوسطات
        Object.keys(gpaByCollege).forEach(college => {
            const data = gpaByCollege[college];
            data.average = data.total / data.count;
        });
        
        return {
            total,
            occupancyRate,
            colleges,
            gpaByCollege,
            prioritizedList: prioritized.slice(0, 100) // أول 100 طالب مؤهل
        };
    }
    
    extractCollege(specialization) {
        // دالة مساعدة لاستخراج الكلية من التخصص
        const collegeMap = {
            'طب وجراحة': 'كلية الطب',
            'صيدلة': 'كلية الصيدلة',
            'تمريض': 'كلية التمريض',
            'هندسة حاسب': 'كلية الهندسة',
            'هندسة مدنية': 'كلية الهندسة',
            'علوم الحاسب': 'كلية علوم الحاسب',
            'إدارة أعمال': 'كلية إدارة الأعمال',
            'محاسبة': 'كلية إدارة الأعمال',
            'قانون': 'كلية القانون',
            'تربية خاصة': 'كلية التربية'
        };
        
        return collegeMap[specialization] || 'كلية أخرى';
    }
}

// تهيئة لوحة التحكم عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', function() {
    window.dashboard = new DashboardSystem();
    window.smartSorting = new SmartSortingSystem([]);
});

// تصدير الفئات للاستخدام في ملفات أخرى
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        DashboardSystem,
        SmartSortingSystem
    };
                  }
