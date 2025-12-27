/* ===========================================
   معالجة النماذج والتحقق من البيانات
   نظام حجز السكن الجامعي - جامعة نجران
   =========================================== */

class FormHandler {
    constructor() {
        this.forms = new Map();
        this.validators = new Map();
        this.init();
    }
    
    init() {
        this.setupDefaultValidators();
        this.bindForms();
        this.setupRealTimeValidation();
    }
    
    setupDefaultValidators() {
        // محددات التحقق الافتراضية
        this.validators.set('fullName', this.validateFullName.bind(this));
        this.validators.set('nationalId', this.validateNationalId.bind(this));
        this.validators.set('phone', this.validatePhone.bind(this));
        this.validators.set('email', this.validateEmail.bind(this));
        this.validators.set('gpa', this.validateGPA.bind(this));
        this.validators.set('province', this.validateProvince.bind(this));
        this.validators.set('specialization', this.validateSpecialization.bind(this));
    }
    
    bindForms() {
        // ربط جميع النماذج في الصفحة
        document.querySelectorAll('form').forEach(form => {
            this.bindForm(form);
        });
    }
    
    bindForm(form) {
        const formId = form.id || `form_${Date.now()}`;
        this.forms.set(formId, form);
        
        // إعداد معالج الإرسال
        form.addEventListener('submit', (e) => this.handleSubmit(e, formId));
        
        // إعداد التحقق في الوقت الحقيقي
        this.setupFormValidation(form);
        
        return formId;
    }
    
    setupFormValidation(form) {
        const inputs = form.querySelectorAll('input, select, textarea');
        
        inputs.forEach(input => {
            // التحقق عند فقد التركيز
            input.addEventListener('blur', () => {
                this.validateInput(input);
            });
            
            // التحقق عند الكتابة (للحقول النصية)
            if (input.type !== 'select-one') {
                input.addEventListener('input', () => {
                    this.validateInput(input, true);
                });
            }
        });
    }
    
    setupRealTimeValidation() {
        // التحقق من رقم الهاتف أثناء الكتابة
        document.querySelectorAll('input[type="tel"]').forEach(input => {
            input.addEventListener('input', (e) => {
                this.formatPhoneNumber(e.target);
            });
        });
        
        // التحقق من المعدل أثناء الكتابة
        document.querySelectorAll('input[name="gpa"]').forEach(input => {
            input.addEventListener('input', (e) => {
                this.formatGPA(e.target);
            });
        });
    }
    
    async handleSubmit(event, formId) {
        event.preventDefault();
        
        const form = this.forms.get(formId);
        if (!form) return;
        
        // إظهار حالة التحميل
        this.showLoading(form);
        
        try {
            // التحقق من جميع الحقول
            const isValid = await this.validateForm(form);
            
            if (!isValid) {
                this.hideLoading(form);
                this.showFormErrors(form);
                return;
            }
            
            // جمع البيانات
            const formData = this.collectFormData(form);
            
            // التحقق الإضافي حسب نوع النموذج
            const additionalValidation = await this.performAdditionalValidation(formData, formId);
            
            if (!additionalValidation.valid) {
                this.hideLoading(form);
                this.showError(form, additionalValidation.message);
                return;
            }
            
            // معالجة النموذج الناجحة
            await this.processForm(formData, formId);
            
        } catch (error) {
            console.error('خطأ في معالجة النموذج:', error);
            this.hideLoading(form);
            this.showError(form, 'حدث خطأ غير متوقع. الرجاء المحاولة مرة أخرى.');
        }
    }
    
    async validateForm(form) {
        const inputs = form.querySelectorAll('input, select, textarea');
        let isValid = true;
        
        for (const input of inputs) {
            const result = await this.validateInput(input);
            if (!result.valid) {
                isValid = false;
            }
        }
        
        return isValid;
    }
    
    async validateInput(input, isRealTime = false) {
        const fieldName = input.name || input.id;
        const validator = this.validators.get(fieldName);
        
        if (!validator) {
            return { valid: true };
        }
        
        const value = input.value.trim();
        const result = await validator(value, input);
        
        // تحديث حالة الحقل
        this.updateInputState(input, result, isRealTime);
        
        return result;
    }
    
    updateInputState(input, validationResult, isRealTime = false) {
        const formGroup = input.closest('.form-group');
        if (!formGroup) return;
        
        // إزالة الحالات السابقة
        formGroup.classList.remove('has-success', 'has-error', 'has-warning');
        
        // إزالة رسائل الخطأ السابقة
        const existingError = formGroup.querySelector('.error-message');
        if (existingError) existingError.remove();
        
        const existingSuccess = formGroup.querySelector('.success-message');
        if (existingSuccess) existingSuccess.remove();
        
        if (!validationResult.valid) {
            // حالة الخطأ
            formGroup.classList.add('has-error');
            
            if (!isRealTime || validationResult.showError) {
                const errorDiv = document.createElement('div');
                errorDiv.className = 'error-message';
                errorDiv.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${validationResult.message}`;
                formGroup.appendChild(errorDiv);
            }
            
            // تأثير الاهتزاز
            if (!isRealTime) {
                input.classList.add('shake');
                setTimeout(() => input.classList.remove('shake'), 500);
            }
            
        } else {
            // حالة النجاح (فقط في الوقت الحقيقي أو عند الإرسال)
            if (isRealTime && input.value.trim() !== '') {
                formGroup.classList.add('has-success');
                
                const successDiv = document.createElement('div');
                successDiv.className = 'success-message';
                successDiv.innerHTML = `<i class="fas fa-check-circle"></i> ${validationResult.message || 'صحيح'}`;
                formGroup.appendChild(successDiv);
            }
        }
    }
    
    showFormErrors(form) {
        // جمع جميع الأخطاء
        const errors = [];
        const errorElements = form.querySelectorAll('.has-error .error-message');
        
        errorElements.forEach(element => {
            errors.push(element.textContent.trim());
        });
        
        // إظهار ملخص الأخطاء
        if (errors.length > 0) {
            const errorList = errors.map(error => `<li>${error}</li>`).join('');
            const errorHtml = `
                <div class="alert alert-danger">
                    <h4><i class="fas fa-exclamation-triangle"></i> يوجد أخطاء في النموذج:</h4>
                    <ul>${errorList}</ul>
                </div>
            `;
            
            this.showMessage(form, errorHtml, 'error');
        }
    }
    
    collectFormData(form) {
        const formData = new FormData(form);
        const data = {};
        
        for (const [key, value] of formData.entries()) {
            data[key] = value.trim();
        }
        
        return data;
    }
    
    async performAdditionalValidation(formData, formId) {
        // التحقق الإضافي حسب نوع النموذج
        switch (formId) {
            case 'registrationForm':
                return await this.validateRegistrationData(formData);
            case 'adminLoginForm':
                return await this.validateAdminLoginData(formData);
            default:
                return { valid: true };
        }
    }
    
    async validateRegistrationData(data) {
        const errors = [];
        
        // التحقق من أن المعدل التراكمي يتناسب مع التخصص (محاكاة)
        const gpa = parseFloat(data.gpa);
        const specialization = data.specialization;
        
        // بعض التخصصات تتطلب معدلاً أعلى (محاكاة)
        const highGPASpecializations = ['طب وجراحة', 'صيدلة', 'هندسة حاسب'];
        if (highGPASpecializations.includes(specialization) && gpa < 4.0) {
            errors.push(`تخصص ${specialization} يتطلب معدلاً تراكمياً أعلى من 4.00`);
        }
        
        // التحقق من أن الطالب لم يسجل من قبل (محاكاة)
        const existingStudents = JSON.parse(localStorage.getItem('university_housing') || '[]');
        const isDuplicate = existingStudents.some(student => 
            student.nationalId === data.nationalId
        );
        
        if (isDuplicate) {
            errors.push('هذا الطالب مسجل بالفعل في النظام');
        }
        
        if (errors.length > 0) {
            return {
                valid: false,
                message: errors.join('<br>')
            };
        }
        
        return { valid: true };
    }
    
    async validateAdminLoginData(data) {
        // التحقق الأساسي
        if (!data.username || !data.password) {
            return {
                valid: false,
                message: 'اسم المستخدم وكلمة المرور مطلوبان'
            };
        }
        
        return { valid: true };
    }
    
    async processForm(formData, formId) {
        switch (formId) {
            case 'registrationForm':
                await this.processRegistration(formData);
                break;
            case 'adminLoginForm':
                await this.processAdminLogin(formData);
                break;
            default:
                console.log('معالجة النموذج:', formData);
        }
    }
    
    async processRegistration(studentData) {
        // حفظ بيانات الطالب في النظام
        const housingSystem = window.housingSystem || new UniversityHousingSystem();
        const student = housingSystem.addStudent(studentData);
        
        // حفظ بيانات الطالب الحالي
        localStorage.setItem('currentStudent', JSON.stringify(student));
        
        // تسجيل الحدث
        this.logRegistration(student);
        
        // إظهار رسالة النجاح
        this.showSuccessMessage('تم تسجيل البيانات بنجاح! يتم توجيهك لصفحة اختيار المبنى...');
        
        // الانتقال بعد تأخير بسيط
        setTimeout(() => {
            window.location.href = 'building_selection.html';
        }, 2000);
    }
    
    async processAdminLogin(credentials) {
        // استخدام نظام المصادقة
        const authSystem = window.authSystem || new AuthenticationSystem();
        await authSystem.handleAdminLogin({ 
            target: { 
                preventDefault: () => {},
                formData: () => {
                    const formData = new FormData();
                    Object.entries(credentials).forEach(([key, value]) => {
                        formData.append(key, value);
                    });
                    return formData;
                }
            }
        });
    }
    
    // محددات التحقق الأساسية
    validateFullName(value) {
        if (!value || value.trim().length < 10) {
            return {
                valid: false,
                message: 'الاسم الرباعي يجب أن يكون 10 أحرف على الأقل',
                showError: true
            };
        }
        
        // التحقق من أن الاسم يحتوي على أحرف عربية فقط
        const arabicRegex = /^[\u0600-\u06FF\s]+$/;
        if (!arabicRegex.test(value)) {
            return {
                valid: false,
                message: 'الرجاء إدخال الاسم باللغة العربية فقط',
                showError: true
            };
        }
        
        return { valid: true, message: 'الاسم صحيح' };
    }
    
    validateNationalId(value) {
        if (!/^[0-9]{10}$/.test(value)) {
            return {
                valid: false,
                message: 'رقم الهوية الوطني يجب أن يتكون من 10 أرقام',
                showError: true
            };
        }
        
        // التحقق من أن الرقم ليس كل أرقامه متشابهة
        if (/^(\d)\1{9}$/.test(value)) {
            return {
                valid: false,
                message: 'رقم الهوية غير صالح',
                showError: true
            };
        }
        
        return { valid: true, message: 'رقم الهوية صحيح' };
    }
    
    validatePhone(value) {
        if (!/^05[0-9]{8}$/.test(value)) {
            return {
                valid: false,
                message: 'رقم الهاتف يجب أن يبدأ بـ 05 ويتكون من 10 أرقام',
                showError: true
            };
        }
        
        return { valid: true, message: 'رقم الهاتف صحيح' };
    }
    
    validateEmail(value) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
            return {
                valid: false,
                message: 'البريد الإلكتروني غير صالح',
                showError: true
            };
        }
        
        // التحقق من النطاق الجامعي إذا كان موجوداً
        if (value.includes('@') && !value.includes('@nu.edu.sa')) {
            return {
                valid: true,
                message: 'يفضل استخدام البريد الجامعي (@nu.edu.sa)'
            };
        }
        
        return { valid: true, message: 'البريد الإلكتروني صحيح' };
    }
    
    validateGPA(value) {
        const gpa = parseFloat(value);
        
        if (isNaN(gpa)) {
            return {
                valid: false,
                message: 'الرجاء إدخال عدد',
                showError: true
            };
        }
        
        if (gpa < 0 || gpa > 5) {
            return {
                valid: false,
                message: 'المعدل التراكمي يجب أن يكون بين 0 و 5',
                showError: true
            };
        }
        
        // التحقق من التنسيق (منزلتان عشريتان كحد أقصى)
        if (!/^\d+(\.\d{1,2})?$/.test(value)) {
            return {
                valid: false,
                message: 'الرجاء إدخال المعدل بصيغة صحيحة (مثال: 4.50)',
                showError: true
            };
        }
        
        return { valid: true, message: 'المعدل صحيح' };
    }
    
    validateProvince(value) {
        if (!value) {
            return {
                valid: false,
                message: 'الرجاء اختيار المحافظة',
                showError: true
            };
        }
        
        return { valid: true };
    }
    
    validateSpecialization(value) {
        if (!value) {
            return {
                valid: false,
                message: 'الرجاء اختيار التخصص',
                showError: true
            };
        }
        
        return { valid: true };
    }
    
    // تنسيق رقم الهاتف أثناء الكتابة
    formatPhoneNumber(input) {
        let value = input.value.replace(/\D/g, '');
        
        if (value.length > 10) {
            value = value.substring(0, 10);
        }
        
        if (value.length > 0) {
            if (!value.startsWith('05')) {
                value = '05' + value.substring(2);
            }
        }
        
        input.value = value;
    }
    
    // تنسيق المعدل التراكمي أثناء الكتابة
    formatGPA(input) {
        let value = input.value.replace(/[^0-9.]/g, '');
        
        // السماح بنقطة واحدة فقط
        const parts = value.split('.');
        if (parts.length > 2) {
            value = parts[0] + '.' + parts.slice(1).join('');
        }
        
        // الحد الأقصى 5.00
        if (parseFloat(value) > 5) {
            value = '5.00';
        }
        
        // الحد الأقصى منزلتين عشريتين
        if (parts.length === 2 && parts[1].length > 2) {
            value = parts[0] + '.' + parts[1].substring(0, 2);
        }
        
        input.value = value;
    }
    
    // إظهار حالة التحميل
    showLoading(form) {
        const submitButton = form.querySelector('button[type="submit"]');
        if (submitButton) {
            submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري المعالجة...';
            submitButton.disabled = true;
        }
        
        // إضافة طبقة تحميل للنموذج
        const loadingOverlay = document.createElement('div');
        loadingOverlay.className = 'form-loading-overlay';
        loadingOverlay.innerHTML = '<div class="loading-spinner"></div>';
        form.appendChild(loadingOverlay);
    }
    
    // إخفاء حالة التحميل
    hideLoading(form) {
        const submitButton = form.querySelector('button[type="submit"]');
        if (submitButton) {
            submitButton.innerHTML = submitButton.getAttribute('data-original-text') || 'إرسال';
            submitButton.disabled = false;
        }
        
        // إزالة طبقة التحميل
        const loadingOverlay = form.querySelector('.form-loading-overlay');
        if (loadingOverlay) {
            loadingOverlay.remove();
        }
    }
    
    // إظهار رسالة
    showMessage(form, message, type = 'info') {
        const messageDiv = document.createElement('div');
        messageDiv.className = `alert alert-${type} form-message`;
        messageDiv.innerHTML = message;
        
        // إضافة زر الإغلاق
        const closeButton = document.createElement('button');
        closeButton.type = 'button';
        closeButton.className = 'close-message';
        closeButton.innerHTML = '&times;';
        closeButton.addEventListener('click', () => messageDiv.remove());
        
        messageDiv.appendChild(closeButton);
        
        // وضع الرسالة قبل النموذج
        form.parentNode.insertBefore(messageDiv, form);
        
        // إزالة الرسالة بعد 5 ثوانٍ
        if (type !== 'error') {
            setTimeout(() => {
                if (messageDiv.parentNode) {
                    messageDiv.remove();
                }
            }, 5000);
        }
    }
    
    showError(form, message) {
        this.showMessage(form, `
            <h4><i class="fas fa-exclamation-triangle"></i> خطأ</h4>
            <p>${message}</p>
        `, 'error');
    }
    
    showSuccessMessage(message) {
        const form = document.querySelector('form');
        if (form) {
            this.showMessage(form, `
                <h4><i class="fas fa-check-circle"></i> نجاح</h4>
                <p>${message}</p>
            `, 'success');
        }
    }
    
    logRegistration(student) {
        console.log('تم تسجيل طالب جديد:', student);
        
        try {
            const registrations = JSON.parse(localStorage.getItem('registration_log') || '[]');
            registrations.push({
                studentId: student.nationalId,
                timestamp: new Date().toISOString(),
                specialization: student.specialization,
                gpa: student.gpa
            });
            localStorage.setItem('registration_log', JSON.stringify(registrations.slice(-100)));
        } catch (error) {
            console.error('خطأ في تسجيل الحدث:', error);
        }
    }
}

// تهيئة معالج النماذج عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', function() {
    window.formHandler = new FormHandler();
    
    // حفظ النص الأصلي لأزرار الإرسال
    document.querySelectorAll('button[type="submit"]').forEach(button => {
        button.setAttribute('data-original-text', button.innerHTML);
    });
});

// تصدير الفئة للاستخدام في ملفات أخرى
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FormHandler;
    }
