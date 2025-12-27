// main.js - ملف الربط النهائي وإدارة Web3Forms

// كائن الإعدادات العامة
const AppConfig = {
    web3FormsKey: '8f907260-fc10-46e0-b5b6-422b56f45c19',
    apiEndpoint: 'https://api.web3forms.com/submit',
    maxFileSize: 5 * 1024 * 1024, // 5MB
    allowedFileTypes: ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'],
    sessionTimeout: 30 * 60 * 1000 // 30 دقيقة
};

// تهيئة التطبيق
document.addEventListener('DOMContentLoaded', function() {
    // التحقق من انتهاء الجلسة
    checkSession();
    
    // إعداد المستمعين للنماذج
    setupFormListeners();
    
    // إعداد مستمعين للتحميلات
    setupFileUploadListeners();
    
    // إعداد التبديل بين الثيمات
    setupThemeToggle();
});

// التحقق من صحة الجلسة
function checkSession() {
    const lastActivity = sessionStorage.getItem('lastActivity');
    const now = Date.now();
    
    if (lastActivity && (now - lastActivity > AppConfig.sessionTimeout)) {
        // انتهت الجلسة
        sessionStorage.clear();
        localStorage.removeItem('temp_form_data');
        
        // إذا كانت في صفحة تحتاج تسجيل دخول
        if (window.location.pathname.includes('admin')) {
            window.location.href = 'admin-login.html';
        }
    }
    
    // تحديث وقت النشاط الأخير
    sessionStorage.setItem('lastActivity', now.toString());
}

// تحديث النشاط عند التفاعل مع الصفحة
document.addEventListener('click', function() {
    sessionStorage.setItem('lastActivity', Date.now().toString());
});

// إعداد مستمعي النماذج
function setupFormListeners() {
    const registrationForm = document.getElementById('registrationForm');
    
    if (registrationForm) {
        registrationForm.addEventListener('submit', handleRegistrationSubmit);
    }
}

// معالجة إرسال النموذج
async function handleRegistrationSubmit(event) {
    event.preventDefault();
    
    const form = event.target;
    const submitButton = form.querySelector('button[type="submit"]');
    const originalText = submitButton.innerHTML;
    
    // تعطيل الزر أثناء الإرسال
    submitButton.disabled = true;
    submitButton.innerHTML = '<span class="loading"></span> جاري الإرسال...';
    
    try {
        // التحقق من صحة البيانات
        if (!validateForm(form)) {
            throw new Error('البيانات غير صحيحة');
        }
        
        // جمع بيانات النموذج
        const formData = new FormData(form);
        
        // إضافة بيانات إضافية
        formData.append('from_name', 'نظام حجز السكن - جامعة نجران');
        formData.append('replyto', formData.get('email'));
        
        // إرسال البيانات إلى Web3Forms
        const response = await fetch(AppConfig.apiEndpoint, {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        
        if (result.success) {
            // حفظ البيانات في الخزنة المحلية
            const studentData = collectFormData(form);
            const saveResult = studentVault.saveStudent(studentData);
            
            // حفظ البيانات مؤقتاً للعرض في صفحة النجاح
            sessionStorage.setItem('lastSubmission', JSON.stringify({
                referenceNumber: saveResult.referenceNumber,
                studentData: saveResult.studentData
            }));
            
            // توجيه إلى صفحة النجاح
            window.location.href = 'success.html';
        } else {
            throw new Error(result.message || 'فشل الإرسال');
        }
        
    } catch (error) {
        console.error('خطأ في الإرسال:', error);
        showAlert(`فشل إرسال الطلب: ${error.message}`, 'error');
        
        // إعادة تفعيل الزر
        submitButton.disabled = false;
        submitButton.innerHTML = originalText;
    }
}

// جمع بيانات النموذج في كائن
function collectFormData(form) {
    const data = {};
    const formData = new FormData(form);
    
    // جمع الحقول النصية
    const fields = [
        'fullName', 'nationalId', 'phone', 'email', 'gender', 
        'province', 'specialization', 'gpa', 'academicYear',
        'roomType', 'buildingPreference', 'roommateRequest',
        'specialNeeds'
    ];
    
    fields.forEach(field => {
        data[field] = formData.get(field) || '';
    });
    
    // معالجة الملفات
    const fileFields = ['idFile', 'academicRecord', 'photo', 'healthCertificate'];
    data.files = {};
    
    fileFields.forEach(field => {
        const file = form.querySelector(`#${field}`).files[0];
        if (file) {
            data.files[field] = {
                name: file.name,
                size: file.size,
                type: file.type,
                uploaded: true
            };
        }
    });
    
    return data;
}

// التحقق من صحة النموذج
function validateForm(form) {
    let isValid = true;
    const errors = [];
    
    // التحقق من الحقول المطلوبة
    const requiredFields = form.querySelectorAll('[required]');
    requiredFields.forEach(field => {
        if (!field.value.trim()) {
            errors.push(`حقل ${field.previousElementSibling?.textContent || ''} مطلوب`);
            isValid = false;
        }
    });
    
    // التحقق من صيغة البريد الإلكتروني
    const emailField = form.querySelector('input[type="email"]');
    if (emailField && emailField.value) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(emailField.value)) {
            errors.push('البريد الإلكتروني غير صحيح');
            isValid = false;
        }
    }
    
    // التحقق من رقم الهاتف
    const phoneField = form.querySelector('input[type="tel"]');
    if (phoneField && phoneField.value) {
        const phoneRegex = /^05[0-9]{8}$/;
        if (!phoneRegex.test(phoneField.value)) {
            errors.push('رقم الجوال يجب أن يبدأ بـ 05 ويتكون من 10 أرقام');
            isValid = false;
        }
    }
    
    // التحقق من المعدل التراكمي
    const gpaField = form.querySelector('input[name="gpa"]');
    if (gpaField && gpaField.value) {
        const gpa = parseFloat(gpaField.value);
        if (gpa < 1 || gpa > 5) {
            errors.push('المعدل التراكمي يجب أن يكون بين 1 و 5');
            isValid = false;
        }
    }
    
    // التحقق من الملفات
    const fileFields = form.querySelectorAll('input[type="file"][required]');
    fileFields.forEach(field => {
        if (!field.files || field.files.length === 0) {
            errors.push(`ملف ${field.previousElementSibling?.textContent || ''} مطلوب`);
            isValid = false;
        } else {
            const file = field.files[0];
            if (file.size > AppConfig.maxFileSize) {
                errors.push(`حجم ملف ${field.previousElementSibling?.textContent || ''} أكبر من 5MB`);
                isValid = false;
            }
            
            if (!AppConfig.allowedFileTypes.includes(file.type)) {
                errors.push(`نوع ملف ${field.previousElementSibling?.textContent || ''} غير مسموح`);
                isValid = false;
            }
        }
    });
    
    // التحقق من الموافقة على الشروط
    const agreeTerms = form.querySelector('input[name="agreeTerms"]');
    const confirmInfo = form.querySelector('input[name="confirmInfo"]');
    
    if (agreeTerms && !agreeTerms.checked) {
        errors.push('يجب الموافقة على الشروط والأحكام');
        isValid = false;
    }
    
    if (confirmInfo && !confirmInfo.checked) {
        errors.push('يجب تأكيد صحة المعلومات');
        isValid = false;
    }
    
    // عرض الأخطاء إذا وجدت
    if (errors.length > 0) {
        showAlert(errors.join('<br>'), 'error');
    }
    
    return isValid;
}

// إعداد مستمعي تحميل الملفات
function setupFileUploadListeners() {
    const fileInputs = document.querySelectorAll('input[type="file"]');
    
    fileInputs.forEach(input => {
        input.addEventListener('change', function() {
            const file = this.files[0];
            if (!file) return;
            
            // التحقق من حجم الملف
            if (file.size > AppConfig.maxFileSize) {
                showAlert(`حجم الملف أكبر من 5MB: ${file.name}`, 'error');
                this.value = '';
                return;
            }
            
            // التحقق من نوع الملف
            if (!AppConfig.allowedFileTypes.includes(file.type)) {
                showAlert(`نوع الملف غير مسموح: ${file.name}`, 'error');
                this.value = '';
                return;
            }
            
            showAlert(`تم رفع الملف: ${file.name}`, 'success');
        });
    });
}

// إعداد تبديل الوضع الليلي
function setupThemeToggle() {
    const themeToggle = document.querySelector('.theme-toggle');
    
    if (themeToggle) {
        themeToggle.addEventListener('click', function() {
            document.body.classList.toggle('dark-mode');
            
            // حفظ التفضيل
            const isDarkMode = document.body.classList.contains('dark-mode');
            localStorage.setItem('darkMode', isDarkMode);
            
            // تحديث أيقونة الزر
            const icon = this.querySelector('i');
            if (isDarkMode) {
                icon.className = 'fas fa-sun';
                this.innerHTML = '<i class="fas fa-sun"></i> الوضع النهاري';
            } else {
                icon.className = 'fas fa-moon';
                this.innerHTML = '<i class="fas fa-moon"></i> الوضع الليلي';
            }
        });
        
        // استعادة التفضيل المحفوظ
        const savedDarkMode = localStorage.getItem('darkMode') === 'true';
        if (savedDarkMode) {
            document.body.classList.add('dark-mode');
            const icon = themeToggle.querySelector('i');
            icon.className = 'fas fa-sun';
            themeToggle.innerHTML = '<i class="fas fa-sun"></i> الوضع النهاري';
        }
    }
}

// دالة عرض التنبيهات
function showAlert(message, type = 'info') {
    // البحث عن عنصر التنبيه الموجود
    let alertDiv = document.getElementById('alertMessage');
    
    // إذا لم يكن موجوداً، إنشاؤه
    if (!alertDiv) {
        alertDiv = document.createElement('div');
        alertDiv.id = 'alertMessage';
        alertDiv.className = 'alert';
        document.querySelector('.form-section')?.prepend(alertDiv);
    }
    
    // تعيين النص والنوع
    alertDiv.innerHTML = message;
    alertDiv.className = `alert alert-${type}`;
    alertDiv.style.display = 'block';
    
    // إخفاء التنبيه بعد 5 ثوانٍ
    setTimeout(() => {
        alertDiv.style.display = 'none';
    }, 5000);
    
    // إرجاع العنصر للاستخدام الخارجي إذا لزم
    return alertDiv;
}

// دالة لتنسيق الأرقام
function formatNumber(number) {
    return new Intl.NumberFormat('ar-SA').format(number);
}

// دالة لتنسيق التاريخ
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('ar-SA', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// دالة لإنشاء ملف CSV للتصدير
function downloadCSV(data, filename) {
    const csvContent = data;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (navigator.msSaveBlob) {
        navigator.msSaveBlob(blob, filename);
    } else {
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

// دالة لإنشاء ملف JSON للتصدير
function downloadJSON(data, filename) {
    const jsonContent = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
    const link = document.createElement('a');
    
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// دالة لإظهار رسالة تحميل
function showLoading(containerId, message = 'جاري التحميل...') {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'loading-overlay';
    loadingDiv.innerHTML = `
        <div class="loading-content">
            <div class="loading-spinner"></div>
            <p>${message}</p>
        </div>
    `;
    
    container.appendChild(loadingDiv);
    return loadingDiv;
}

// دالة لإخفاء رسالة التحميل
function hideLoading(loadingDiv) {
    if (loadingDiv && loadingDiv.parentNode) {
        loadingDiv.parentNode.removeChild(loadingDiv);
    }
}

// دالة للتحقق من اتصال الإنترنت
function checkInternetConnection() {
    return navigator.onLine;
}

// مستمع لانقطاع الاتصال
window.addEventListener('offline', function() {
    showAlert('انقطع الاتصال بالإنترنت. سيتم حفظ البيانات محلياً.', 'warning');
});

// مستمع لعودة الاتصال
window.addEventListener('online', function() {
    showAlert('تم استعادة الاتصال بالإنترنت.', 'success');
});

// دالة لحفظ البيانات مؤقتاً
function saveTempFormData(formId) {
    const form = document.getElementById(formId);
    if (!form) return;
    
    const formData = {};
    const inputs = form.querySelectorAll('input, select, textarea');
    
    inputs.forEach(input => {
        if (input.name && !input.type.includes('file')) {
            formData[input.name] = input.value;
        }
    });
    
    localStorage.setItem('temp_form_data', JSON.stringify(formData));
}

// دالة لاستعادة البيانات المؤقتة
function restoreTempFormData(formId) {
    const form = document.getElementById(formId);
    if (!form) return;
    
    const savedData = localStorage.getItem('temp_form_data');
    if (!savedData) return;
    
    try {
        const formData = JSON.parse(savedData);
        
        Object.keys(formData).forEach(key => {
            const input = form.querySelector(`[name="${key}"]`);
            if (input && !input.type.includes('file')) {
                input.value = formData[key];
            }
        });
        
        localStorage.removeItem('temp_form_data');
    } catch (error) {
        console.error('خطأ في استعادة البيانات:', error);
    }
}

// أنماط إضافية للتحميل
const loadingStyles = document.createElement('style');
loadingStyles.textContent = `
    .loading-overlay {
        position: fixed;
        top: 0;
        right: 0;
        bottom: 0;
        left: 0;
        background-color: rgba(0, 0, 0, 0.7);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9999;
    }
    
    .loading-content {
        background-color: var(--white);
        padding: 2rem;
        border-radius: var(--border-radius-md);
        text-align: center;
        box-shadow: var(--shadow-lg);
    }
    
    .loading-spinner {
        width: 50px;
        height: 50px;
        border: 5px solid var(--gray-light);
        border-top-color: var(--primary-green);
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin: 0 auto 1rem;
    }
    
    @keyframes spin {
        to { transform: rotate(360deg); }
    }
    
    .dark-mode .loading-content {
        background-color: var(--dark-secondary);
        color: var(--white);
    }
`;

document.head.appendChild(loadingStyles);
