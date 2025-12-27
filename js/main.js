/* ===========================================
   الملف الرئيسي للجافاسكريبت
   نظام حجز السكن الجامعي - جامعة نجران
   =========================================== */

// فئة لإدارة الطلاب
class Student {
    constructor(data) {
        this.id = data.id || Date.now();
        this.fullName = data.fullName;
        this.nationalId = data.nationalId;
        this.phone = data.phone;
        this.email = data.email;
        this.gender = data.gender;
        this.province = data.province;
        this.gpa = parseFloat(data.gpa);
        this.specialization = data.specialization;
        this.timestamp = data.timestamp || new Date().toISOString();
        this.selectedBuilding = data.selectedBuilding;
        this.buildingName = data.buildingName;
        this.reservationCode = data.reservationCode;
        this.status = data.status || 'pending';
    }
}

// فئة لإدارة النظام بأكمله
class UniversityHousingSystem {
    constructor() {
        this.currentStudent = null;
        this.students = this.loadFromStorage();
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.updateLiveStats();
        this.setupDarkModeToggle();
    }
    
    setupEventListeners() {
        // تفعيل التنقل بين الصفحات
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function(e) {
                e.preventDefault();
                const targetId = this.getAttribute('href').substring(1);
                const targetElement = document.getElementById(targetId);
                if (targetElement) {
                    targetElement.scrollIntoView({ behavior: 'smooth' });
                }
            });
        });
        
        // تفعيل الأزرار الديناميكية
        this.setupDynamicButtons();
    }
    
    setupDynamicButtons() {
        // أزرار اختيار المبنى
        document.querySelectorAll('.btn-select-building').forEach(button => {
            button.addEventListener('click', function() {
                this.classList.toggle('selected');
                
                // إزالة التحديد من الأزرار الأخرى
                const allButtons = document.querySelectorAll('.btn-select-building');
                allButtons.forEach(btn => {
                    if (btn !== this) btn.classList.remove('selected');
                });
                
                // حفظ الاختيار
                const building = this.getAttribute('data-building');
                const gender = this.getAttribute('data-gender');
                
                localStorage.setItem('selectedBuilding', JSON.stringify({
                    building,
                    gender,
                    timestamp: new Date().toISOString()
                }));
                
                // إظهار رسالة تأكيد
                this.innerHTML = '<i class="fas fa-check-circle"></i> تم الاختيار';
                setTimeout(() => {
                    this.innerHTML = '<i class="fas fa-check-circle"></i> اختيار هذا المبنى';
                }, 2000);
            });
        });
    }
    
    setupDarkModeToggle() {
        // التحقق من تفضيلات المستخدم
        const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)');
        
        // زر تبديل الوضع الليلي (إذا كان موجوداً)
        const darkModeToggle = document.getElementById('darkModeToggle');
        if (darkModeToggle) {
            darkModeToggle.addEventListener('click', () => {
                document.body.classList.toggle('dark-mode');
                
                // حفظ التفضيل
                const isDarkMode = document.body.classList.contains('dark-mode');
                localStorage.setItem('darkMode', isDarkMode);
                
                // تحديث أيقونة الزر
                const icon = darkModeToggle.querySelector('i');
                if (icon) {
                    icon.className = isDarkMode ? 'fas fa-sun' : 'fas fa-moon';
                }
            });
            
            // تطبيق التفضيل المحفوظ
            const savedDarkMode = localStorage.getItem('darkMode');
            if (savedDarkMode === 'true') {
                document.body.classList.add('dark-mode');
                const icon = darkModeToggle.querySelector('i');
                if (icon) icon.className = 'fas fa-sun';
            }
        }
    }
    
    loadFromStorage() {
        try {
            const data = localStorage.getItem('university_housing');
            return data ? JSON.parse(data) : [];
        } catch (error) {
            console.error('خطأ في تحميل البيانات من التخزين المحلي:', error);
            return [];
        }
    }
    
    saveToStorage() {
        try {
            localStorage.setItem('university_housing', JSON.stringify(this.students));
            return true;
        } catch (error) {
            console.error('خطأ في حفظ البيانات في التخزين المحلي:', error);
            return false;
        }
    }
    
    addStudent(studentData) {
        const student = new Student(studentData);
        this.students.push(student);
        this.saveToStorage();
        this.updateLiveStats();
        return student;
    }
    
    updateLiveStats() {
        // تحديث الإحصائيات الحية في الصفحة الرئيسية
        const totalElement = document.getElementById('totalStudentsLive');
        const occupancyElement = document.getElementById('occupancyRate');
        
        if (totalElement) {
            const total = this.students.length;
            totalElement.textContent = total.toLocaleString();
            
            if (occupancyElement) {
                const occupancyRate = Math.min(100, Math.round((total / 3500) * 100));
                occupancyElement.textContent = `${occupancyRate}%`;
            }
        }
        
        // إرسال حدث تحديث الإحصائيات
        this.dispatchStatsUpdate();
    }
    
    dispatchStatsUpdate() {
        const event = new CustomEvent('statsUpdated', {
            detail: { total: this.students.length }
        });
        window.dispatchEvent(event);
    }
    
    getStudentById(id) {
        return this.students.find(student => student.id === id);
    }
    
    getStudentsByProvince(province) {
        return this.students.filter(student => student.province === province);
    }
    
    getTopStudents(limit = 10) {
        return [...this.students]
            .sort((a, b) => b.gpa - a.gpa)
            .slice(0, limit);
    }
    
    // حساب المسافة النسبية (محاكاة)
    calculateDistanceScore(province) {
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
        
        return distanceMap[province] || 50;
    }
    
    // التحقق من صحة البيانات
    validateStudentData(data) {
        const errors = [];
        
        if (!data.fullName || data.fullName.length < 10) {
            errors.push('الاسم الرباعي يجب أن يكون 10 أحرف على الأقل');
        }
        
        if (!/^[0-9]{10}$/.test(data.nationalId)) {
            errors.push('رقم الهوية الوطني يجب أن يتكون من 10 أرقام');
        }
        
        if (!/^05[0-9]{8}$/.test(data.phone)) {
            errors.push('رقم الهاتف يجب أن يبدأ بـ 05 ويتكون من 10 أرقام');
        }
        
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
            errors.push('البريد الإلكتروني غير صالح');
        }
        
        if (!data.gender) {
            errors.push('الرجاء اختيار الجنس');
        }
        
        if (!data.province) {
            errors.push('الرجاء اختيار المحافظة');
        }
        
        const gpa = parseFloat(data.gpa);
        if (isNaN(gpa) || gpa < 0 || gpa > 5) {
            errors.push('المعدل التراكمي يجب أن يكون بين 0 و 5');
        }
        
        if (!data.specialization) {
            errors.push('الرجاء اختيار التخصص');
        }
        
        return {
            isValid: errors.length === 0,
            errors
        };
    }
    
    // إنشاء رقم حجز فريد
    generateReservationCode(nationalId) {
        const timestamp = Date.now().toString().slice(-6);
        const idPart = nationalId.slice(-4);
        const randomPart = Math.floor(1000 + Math.random() * 9000);
        return `NU-HS-${idPart}-${timestamp}-${randomPart}`;
    }
    
    // إرسال إشعارات (محاكاة)
    sendNotification(student, type) {
        const notifications = {
            registration: `مرحباً ${student.fullName}، تم استلام طلب حجز سكنك الجامعي بنجاح.`,
            confirmation: `تم تأكيد حجز سكنك الجامعي. رقم حجزك: ${student.reservationCode}`,
            reminder: `تذكير: موعد استلام السكن خلال أسبوع من بداية الفصل الدراسي.`
        };
        
        const message = notifications[type] || 'إشعار من نظام السكن الجامعي';
        
        // في الإصدار الحقيقي، نرسل رسالة حقيقية
        console.log(`إرسال إشعار إلى ${student.phone}: ${message}`);
        
        return {
            success: true,
            message: 'تم إرسال الإشعار بنجاح'
        };
    }
}

// تهيئة النظام عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', function() {
    // إنشاء مثيل من النظام
    window.housingSystem = new UniversityHousingSystem();
    
    // تحديث العداد الحي
    updateLiveCounter();
    
    // إعداد تتبع النقرات للتحليلات
    setupAnalytics();
    
    // التحقق من جلسة المستخدم
    checkUserSession();
});

// تحديث العداد الحي
function updateLiveCounter() {
    const counterElement = document.getElementById('liveCounter');
    if (counterElement) {
        let count = 2847; // القيمة الافتراضية
        
        // تحديث من التخزين المحلي إذا كان متاحاً
        try {
            const data = localStorage.getItem('university_housing');
            if (data) {
                const students = JSON.parse(data);
                count = students.length;
            }
        } catch (error) {
            console.error('خطأ في قراءة العداد:', error);
        }
        
        // تأثير العد التصاعدي
        const targetCount = count;
        let currentCount = 0;
        const increment = Math.ceil(targetCount / 100);
        const timer = setInterval(() => {
            currentCount += increment;
            if (currentCount >= targetCount) {
                currentCount = targetCount;
                clearInterval(timer);
            }
            counterElement.textContent = currentCount.toLocaleString();
        }, 20);
    }
}

// إعداد التحليلات
function setupAnalytics() {
    // تتبع أحداث النقر
    document.addEventListener('click', function(e) {
        const target = e.target;
        
        // تتبع النقر على الأزرار المهمة
        if (target.matches('.btn-primary, .btn-secondary, .btn-select-building')) {
            const buttonText = target.textContent.trim();
            const page = window.location.pathname.split('/').pop();
            
            logEvent('button_click', {
                button_text: buttonText,
                page: page,
                timestamp: new Date().toISOString()
            });
        }
    });
    
    // تتبع التنقل بين الصفحات
    window.addEventListener('beforeunload', function() {
        const timeSpent = Math.round((Date.now() - window.pageLoadTime) / 1000);
        
        logEvent('page_exit', {
            page: window.location.pathname,
            time_spent: timeSpent,
            timestamp: new Date().toISOString()
        });
    });
    
    // حفظ وقت تحميل الصفحة
    window.pageLoadTime = Date.now();
}

// تسجيل الأحداث (محاكاة)
function logEvent(eventName, data) {
    // في الإصدار الحقيقي، نرسل البيانات إلى خدمة التحليلات
    console.log(`[Analytics] ${eventName}:`, data);
    
    // حفظ محلياً للأغراض التنموية
    try {
        const events = JSON.parse(localStorage.getItem('analytics_events') || '[]');
        events.push({ event: eventName, data, timestamp: new Date().toISOString() });
        localStorage.setItem('analytics_events', JSON.stringify(events.slice(-100))); // احتفظ بآخر 100 حدث
    } catch (error) {
        console.error('خطأ في حفظ بيانات التحليلات:', error);
    }
}

// التحقق من جلسة المستخدم
function checkUserSession() {
    const currentStudent = localStorage.getItem('currentStudent');
    const adminSession = localStorage.getItem('adminSession');
    
    // إذا كان المستخدم مسجلاً كطالب
    if (currentStudent) {
        try {
            const student = JSON.parse(currentStudent);
            updateUIForLoggedInStudent(student);
        } catch (error) {
            console.error('خطأ في تحليل بيانات الطالب:', error);
        }
    }
    
    // إذا كان المستخدم مسجلاً كمدير
    if (adminSession) {
        updateUIForAdmin();
    }
}

// تحديث واجهة المستخدم للطالب المسجل
function updateUIForLoggedInStudent(student) {
    // إضافة فئة للجسم للإشارة إلى أن المستخدم مسجل
    document.body.classList.add('student-logged-in');
    
    // تحديث رابط الملف الشخصي إذا كان موجوداً
    const profileLink = document.getElementById('studentProfileLink');
    if (profileLink) {
        profileLink.innerHTML = `<i class="fas fa-user"></i> ${student.fullName.split(' ')[0]}`;
        profileLink.href = 'success.html';
    }
    
    // إظهار رسالة ترحيبية
    showWelcomeMessage(student.fullName);
}

// تحديث واجهة المستخدم للمدير
function updateUIForAdmin() {
    document.body.classList.add('admin-logged-in');
    
    // تحديث رابط لوحة التحكم
    const adminLink = document.querySelector('.admin-link');
    if (adminLink) {
        adminLink.innerHTML = '<i class="fas fa-user-shield"></i> لوحة التحكم';
        adminLink.href = 'admin-dashboard.html';
    }
}

// إظهار رسالة ترحيبية
function showWelcomeMessage(name) {
    // يمكن إضافة رسالة ترحيبية في الزاوية العلوية
    const welcomeDiv = document.createElement('div');
    welcomeDiv.className = 'welcome-message';
    welcomeDiv.innerHTML = `
        <i class="fas fa-user-circle"></i>
        <span>مرحباً، ${name.split(' ')[0]}</span>
    `;
    
    // وضعها في مكان مناسب (مثل الهيدر)
    const header = document.querySelector('.university-header');
    if (header) {
        header.appendChild(welcomeDiv);
    }
}

// وظائف مساعدة عامة
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('ar-SA', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'long'
    });
}

function formatTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleTimeString('ar-SA', {
        hour: '2-digit',
        minute: '2-digit'
    });
}

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

// تصدير الوظائف لاستخدامها في ملفات أخرى
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        UniversityHousingSystem,
        Student,
        formatDate,
        formatTime,
        debounce
    };
}
