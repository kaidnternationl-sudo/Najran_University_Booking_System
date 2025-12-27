/* ===========================================
   نظام المصادقة والتحقق من الهوية
   نظام حجز السكن الجامعي - جامعة نجران
   =========================================== */

class AuthenticationSystem {
    constructor() {
        this.currentUser = null;
        this.isAdmin = false;
        this.init();
    }
    
    init() {
        this.loadSession();
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        // استماع لأحداث تسجيل الدخول
        document.addEventListener('DOMContentLoaded', () => {
            const loginForm = document.getElementById('registrationForm');
            if (loginForm) {
                loginForm.addEventListener('submit', (e) => this.handleLogin(e));
            }
            
            const adminLoginForm = document.getElementById('adminLoginForm');
            if (adminLoginForm) {
                adminLoginForm.addEventListener('submit', (e) => this.handleAdminLogin(e));
            }
        });
    }
    
    // معالجة تسجيل الدخول للطلاب
    async handleLogin(event) {
        event.preventDefault();
        
        const form = event.target;
        const formData = new FormData(form);
        
        // جمع البيانات من النموذج
        const studentData = {
            fullName: formData.get('fullName'),
            nationalId: formData.get('nationalId'),
            phone: formData.get('phone'),
            email: formData.get('email'),
            gender: formData.get('gender'),
            province: formData.get('province'),
            gpa: formData.get('gpa'),
            specialization: formData.get('specialization')
        };
        
        // التحقق من صحة البيانات
        const validation = this.validateStudentData(studentData);
        if (!validation.isValid) {
            this.showError(validation.errors.join('<br>'));
            return;
        }
        
        // التحقق من رقم الهوية الوطني (محاكاة)
        const verificationResult = await this.verifyNationalID(studentData.nationalId);
        if (!verificationResult.success) {
            this.showError(verificationResult.message);
            return;
        }
        
        // حفظ بيانات الطالب مؤقتاً
        this.currentUser = {
            ...studentData,
            id: Date.now(),
            role: 'student',
            sessionId: this.generateSessionId()
        };
        
        // حفظ الجلسة
        this.saveSession();
        
        // تسجيل الدخول الناجح
        this.onLoginSuccess(studentData);
    }
    
    // معالجة تسجيل الدخول للمديرين
    async handleAdminLogin(event) {
        event.preventDefault();
        
        const form = event.target;
        const formData = new FormData(form);
        
        const credentials = {
            username: formData.get('username'),
            password: formData.get('password')
        };
        
        const result = await this.verifyAdminCredentials(credentials);
        
        if (result.success) {
            this.currentUser = {
                username: credentials.username,
                role: 'admin',
                sessionId: this.generateSessionId(),
                permissions: result.permissions
            };
            
            this.isAdmin = true;
            this.saveSession();
            
            // توجيه إلى لوحة التحكم
            window.location.href = 'admin-dashboard.html';
        } else {
            this.showError(result.message);
        }
    }
    
    // التحقق من بيانات الطالب
    validateStudentData(data) {
        const errors = [];
        
        // التحقق من الاسم
        if (!data.fullName || data.fullName.trim().length < 10) {
            errors.push('الاسم الرباعي يجب أن يكون 10 أحرف على الأقل');
        }
        
        // التحقق من رقم الهوية
        if (!/^[0-9]{10}$/.test(data.nationalId)) {
            errors.push('رقم الهوية الوطني يجب أن يتكون من 10 أرقام');
        }
        
        // التحقق من رقم الهاتف
        if (!/^05[0-9]{8}$/.test(data.phone)) {
            errors.push('رقم الهاتف يجب أن يبدأ بـ 05 ويتكون من 10 أرقام');
        }
        
        // التحقق من البريد الإلكتروني
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(data.email)) {
            errors.push('البريد الإلكتروني غير صالح');
        }
        
        // التحقق من المعدل التراكمي
        const gpa = parseFloat(data.gpa);
        if (isNaN(gpa) || gpa < 0 || gpa > 5) {
            errors.push('المعدل التراكمي يجب أن يكون بين 0 و 5');
        }
        
        // التحقق من الحقول المطلوبة
        const requiredFields = ['gender', 'province', 'specialization'];
        requiredFields.forEach(field => {
            if (!data[field]) {
                errors.push(`حقل ${this.getFieldName(field)} مطلوب`);
            }
        });
        
        return {
            isValid: errors.length === 0,
            errors
        };
    }
    
    // الحصول على اسم الحقل بالعربية
    getFieldName(field) {
        const fieldNames = {
            gender: 'الجنس',
            province: 'المحافظة',
            specialization: 'التخصص'
        };
        
        return fieldNames[field] || field;
    }
    
    // التحقق من رقم الهوية الوطني (محاكاة)
    async verifyNationalID(nationalId) {
        // في الإصدار الحقيقي، يتم الاتصال بخدمة النفاذ الوطني
        
        return new Promise((resolve) => {
            setTimeout(() => {
                // محاكاة التحقق البسيط
                const isValid = /^[0-9]{10}$/.test(nationalId);
                
                if (isValid) {
                    resolve({
                        success: true,
                        message: 'تم التحقق من الهوية بنجاح',
                        data: {
                            verified: true,
                            timestamp: new Date().toISOString()
                        }
                    });
                } else {
                    resolve({
                        success: false,
                        message: 'رقم الهوية الوطني غير صالح'
                    });
                }
            }, 1000); // محاكاة وقت الاستجابة
        });
    }
    
    // التحقق من بيانات المدير (محاكاة)
    async verifyAdminCredentials(credentials) {
        // في الإصدار الحقيقي، يتم التحقق من قاعدة البيانات
        
        const validAdmins = [
            {
                username: 'admin',
                password: 'admin123',
                permissions: ['full_access']
            },
            {
                username: 'housing_manager',
                password: 'housing2024',
                permissions: ['view', 'edit', 'reports']
            }
        ];
        
        return new Promise((resolve) => {
            setTimeout(() => {
                const admin = validAdmins.find(
                    a => a.username === credentials.username && 
                    a.password === credentials.password
                );
                
                if (admin) {
                    resolve({
                        success: true,
                        message: 'تم تسجيل الدخول بنجاح',
                        permissions: admin.permissions
                    });
                } else {
                    resolve({
                        success: false,
                        message: 'اسم المستخدم أو كلمة المرور غير صحيحة'
                    });
                }
            }, 800);
        });
    }
    
    // توليد معرف جلسة فريد
    generateSessionId() {
        return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
    
    // حفظ الجلسة
    saveSession() {
        if (this.currentUser) {
            localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
            localStorage.setItem('isAdmin', this.isAdmin.toString());
            localStorage.setItem('sessionId', this.currentUser.sessionId);
            
            // تعيين تاريخ انتهاء الصلاحية (8 ساعات)
            const expiry = new Date();
            expiry.setHours(expiry.getHours() + 8);
            localStorage.setItem('sessionExpiry', expiry.toISOString());
        }
    }
    
    // تحميل الجلسة
    loadSession() {
        try {
            const expiry = localStorage.getItem('sessionExpiry');
            
            // التحقق من انتهاء صلاحية الجلسة
            if (expiry && new Date(expiry) > new Date()) {
                const userData = localStorage.getItem('currentUser');
                const isAdmin = localStorage.getItem('isAdmin') === 'true';
                
                if (userData) {
                    this.currentUser = JSON.parse(userData);
                    this.isAdmin = isAdmin;
                    return true;
                }
            } else {
                // الجلسة منتهية الصلاحية
                this.clearSession();
            }
        } catch (error) {
            console.error('خطأ في تحميل الجلسة:', error);
            this.clearSession();
        }
        
        return false;
    }
    
    // مسح الجلسة
    clearSession() {
        localStorage.removeItem('currentUser');
        localStorage.removeItem('isAdmin');
        localStorage.removeItem('sessionId');
        localStorage.removeItem('sessionExpiry');
        
        this.currentUser = null;
        this.isAdmin = false;
    }
    
    // التحقق من صلاحية الجلسة
    isSessionValid() {
        return this.loadSession();
    }
    
    // التحقق من الصلاحيات
    hasPermission(permission) {
        if (!this.currentUser || !this.isAdmin) return false;
        
        return this.currentUser.permissions?.includes('full_access') || 
               this.currentUser.permissions?.includes(permission);
    }
    
    // تسجيل الخروج
    logout() {
        // تسجيل حدث الخروج
        this.logEvent('logout', {
            userId: this.currentUser?.id,
            role: this.currentUser?.role
        });
        
        this.clearSession();
        
        // توجيه إلى الصفحة الرئيسية
        window.location.href = 'index.html';
    }
    
    // عند نجاح تسجيل الدخول للطالب
    onLoginSuccess(studentData) {
        // حفظ بيانات الطالب مؤقتاً للتطبيقات الأخرى
        localStorage.setItem('currentStudent', JSON.stringify(studentData));
        
        // تسجيل حدث تسجيل الدخول
        this.logEvent('student_login', {
            studentId: studentData.nationalId,
            timestamp: new Date().toISOString()
        });
        
        // إظهار رسالة نجاح
        this.showSuccess('تم تسجيل البيانات بنجاح! يتم توجيهك لصفحة اختيار المبنى...');
        
        // توجيه إلى صفحة اختيار المبنى بعد تأخير بسيط
        setTimeout(() => {
            window.location.href = 'building_selection.html';
        }, 2000);
    }
    
    // إظهار رسائل الخطأ
    showError(message) {
        // البحث عن حاوية الرسائل
        let errorContainer = document.getElementById('errorContainer');
        
        // إذا لم تكن موجودة، إنشاؤها
        if (!errorContainer) {
            errorContainer = document.createElement('div');
            errorContainer.id = 'errorContainer';
            errorContainer.className = 'error-container';
            
            const form = document.querySelector('form');
            if (form) {
                form.parentNode.insertBefore(errorContainer, form);
            }
        }
        
        // إنشاء رسالة الخطأ
        const errorDiv = document.createElement('div');
        errorDiv.className = 'alert alert-danger';
        errorDiv.innerHTML = `
            <i class="fas fa-exclamation-circle"></i>
            <span>${message}</span>
            <button type="button" class="close-error">&times;</button>
        `;
        
        // إضافة زر الإغلاق
        errorDiv.querySelector('.close-error').addEventListener('click', () => {
            errorDiv.remove();
        });
        
        // إضافة الرسالة إلى الحاوية
        errorContainer.appendChild(errorDiv);
        
        // إزالة الرسالة بعد 5 ثوانٍ
        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.remove();
            }
        }, 5000);
        
        // تأثير الاهتزاز
        const form = document.querySelector('form');
        if (form) {
            form.classList.add('shake');
            setTimeout(() => form.classList.remove('shake'), 500);
        }
    }
    
    // إظهار رسائل النجاح
    showSuccess(message) {
        // البحث عن حاوية الرسائل
        let successContainer = document.getElementById('successContainer');
        
        // إذا لم تكن موجودة، إنشاؤها
        if (!successContainer) {
            successContainer = document.createElement('div');
            successContainer.id = 'successContainer';
            successContainer.className = 'success-container';
            
            const form = document.querySelector('form');
            if (form) {
                form.parentNode.insertBefore(successContainer, form);
            }
        }
        
        // إنشاء رسالة النجاح
        const successDiv = document.createElement('div');
        successDiv.className = 'alert alert-success';
        successDiv.innerHTML = `
            <i class="fas fa-check-circle"></i>
            <span>${message}</span>
        `;
        
        // إضافة الرسالة إلى الحاوية
        successContainer.appendChild(successDiv);
        
        // إزالة الرسالة بعد 3 ثوانٍ
        setTimeout(() => {
            if (successDiv.parentNode) {
                successDiv.remove();
            }
        }, 3000);
    }
    
    // تسجيل الأحداث (محاكاة)
    logEvent(eventName, data) {
        console.log(`[Auth Event] ${eventName}:`, data);
        
        try {
            const events = JSON.parse(localStorage.getItem('auth_events') || '[]');
            events.push({
                event: eventName,
                data,
                timestamp: new Date().toISOString(),
                userAgent: navigator.userAgent
            });
            localStorage.setItem('auth_events', JSON.stringify(events.slice(-50)));
        } catch (error) {
            console.error('خطأ في تسجيل الحدث:', error);
        }
    }
}

// تهيئة نظام المصادقة عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', function() {
    window.authSystem = new AuthenticationSystem();
    
    // التحقق من الجلسة وحماية الصفحات
    protectPages();
});

// حماية الصفحات التي تتطلب مصادقة
function protectPages() {
    const currentPage = window.location.pathname.split('/').pop();
    
    // الصفحات التي تتطلب جلسة طالب نشطة
    const studentPages = ['building_selection.html', 'success.html'];
    
    // الصفحات التي تتطلب جلسة مدير نشطة
    const adminPages = ['database_vault.html', 'admin-dashboard.html'];
    
    // التحقق من صفحات الطالب
    if (studentPages.includes(currentPage)) {
        const studentData = localStorage.getItem('currentStudent');
        if (!studentData) {
            // إذا لم يكن هناك طالب مسجل، توجيه إلى صفحة التسجيل
            window.location.href = 'login.html';
        }
    }
    
    // التحقق من صفحات المدير
    if (adminPages.includes(currentPage)) {
        const authSystem = window.authSystem || new AuthenticationSystem();
        if (!authSystem.isSessionValid() || !authSystem.isAdmin) {
            // إذا لم يكن مديراً مسجلاً، توجيه إلى الصفحة الرئيسية
            window.location.href = 'index.html';
        }
    }
}

// تصدير الفئة للاستخدام في ملفات أخرى
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AuthenticationSystem;
                  }
