// main.js - ملف الربط النهائي وإدارة Web3Forms

// كائن الإعدادات العامة
const AppConfig = {
    web3FormsKey: '8f907260-fc10-46e0-b5b6-422b56f45c19',
    apiEndpoint: 'https://api.web3forms.com/submit',
    sessionTimeout: 30 * 60 * 1000 // 30 دقيقة
};

// تهيئة التطبيق
document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ النظام جاهز للعمل - جامعة نجران');
    
    // التحقق من انتهاء الجلسة
    checkSession();
    
    // إعداد المستمعين للنماذج
    setupFormListeners();
    
    // إعداد تحديث الإحصائيات للصفحة الرئيسية
    if (window.location.pathname.includes('index.html') || window.location.pathname === '/') {
        updateStatistics();
        setInterval(updateStatistics, 10000);
    }
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
        console.log('✅ تم إعداد مستمع النموذج');
        
        // إزالة أي حقول مخفية إلزامية
        removeHiddenRequiredFields(registrationForm);
    }
}

// إزالة الحقول المخفية الإلزامية
function removeHiddenRequiredFields(form) {
    const hiddenRequired = form.querySelectorAll('input[type="hidden"][required]');
    hiddenRequired.forEach(field => {
        field.removeAttribute('required');
        console.log(`⚠️ تم إزالة خاصية required من الحقل المخفي: ${field.name}`);
    });
}

// معالجة إرسال النموذج
async function handleRegistrationSubmit(event) {
    event.preventDefault();
    
    console.log('🚀 بدء إرسال النموذج...');
    
    const form = event.target;
    const submitButton = form.querySelector('button[type="submit"]');
    const originalText = submitButton.innerHTML;
    
    // تعطيل الزر أثناء الإرسال
    submitButton.disabled = true;
    submitButton.innerHTML = '<span class="loading"></span> جاري الإرسال...';
    
    try {
        // التحقق من صحة البيانات
        console.log('🔍 التحقق من صحة البيانات...');
        if (!validateForm(form)) {
            console.log('❌ فشل التحقق من صحة البيانات');
            throw new Error('يرجى تصحيح الأخطاء في النموذج');
        }
        
        // جمع بيانات النموذج
        const formData = new FormData(form);
        console.log('✅ تم جمع بيانات النموذج');
        
        // إضافة بيانات إضافية
        formData.append('from_name', 'نظام حجز السكن - جامعة نجران');
        formData.append('replyto', formData.get('email'));
        formData.append('subject', `طلب سكن جامعي جديد - ${new Date().toLocaleDateString('ar-SA')}`);
        
        // إرسال البيانات إلى Web3Forms
        console.log('📤 إرسال البيانات إلى Web3Forms...');
        
        let response;
        try {
            response = await fetch(AppConfig.apiEndpoint, {
                method: 'POST',
                body: formData
            });
            console.log('📥 تم استلام الرد من الخادم');
        } catch (networkError) {
            console.error('❌ خطأ في الشبكة:', networkError);
            throw new Error('فشل الاتصال بالخادم. يرجى التحقق من اتصال الإنترنت.');
        }
        
        let result;
        try {
            result = await response.json();
            console.log('📊 نتيجة الإرسال:', result);
        } catch (jsonError) {
            console.error('❌ خطأ في تحويل الرد إلى JSON:', jsonError);
            throw new Error('رد غير صحيح من الخادم.');
        }
        
        if (result.success) {
            console.log('🎉 تم الإرسال بنجاح إلى Web3Forms');
            
            // حفظ البيانات في الخزنة المحلية
            const studentData = collectFormData(form);
            const referenceNumber = generateReferenceNumber();
            
            // التأكد من وجود studentVault
            if (typeof studentVault !== 'undefined') {
                const saveResult = studentVault.saveStudent(studentData);
                
                // حفظ البيانات مؤقتاً للعرض في صفحة النجاح
                sessionStorage.setItem('lastSubmission', JSON.stringify({
                    referenceNumber: saveResult.referenceNumber,
                    studentData: saveResult.studentData,
                    timestamp: new Date().toISOString()
                }));
            } else {
                console.warn('⚠️ studentVault غير معرف، سيتم استخدام رقم مرجعي مؤقت');
                
                // حفظ البيانات مؤقتاً بدون vault
                sessionStorage.setItem('lastSubmission', JSON.stringify({
                    referenceNumber: referenceNumber,
                    studentData: studentData,
                    timestamp: new Date().toISOString()
                }));
            }
            
            // توجيه إلى صفحة النجاح
            console.log('↪️ توجيه إلى صفحة النجاح...');
            setTimeout(() => {
                window.location.href = 'success.html';
            }, 100);
            
        } else {
            console.log('❌ فشل الإرسال:', result.message);
            throw new Error(result.message || 'فشل إرسال البيانات إلى الخادم');
        }
        
    } catch (error) {
        console.error('❌ خطأ في الإرسال:', error);
        showAlert(`فشل إرسال الطلب: ${error.message}`, 'error');
        
        // إعادة تفعيل الزر
        submitButton.disabled = false;
        submitButton.innerHTML = originalText;
    }
}

// توليد رقم مرجعي فريد
function generateReferenceNumber() {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const random = Math.floor(1000 + Math.random() * 9000);
    return `NU-${year}-${month}${day}-${random}`;
}

// جمع بيانات النموذج في كائن
function collectFormData(form) {
    const data = {};
    const formData = new FormData(form);
    
    // جمع الحقول النصية
    const fields = [
        'fullName', 'nationalId', 'phone', 'email', 'gender', 
        'province', 'specialization', 'gpa', 'academicYear',
        'roomType', 'buildingPreference', 'specialNeeds'
    ];
    
    fields.forEach(field => {
        data[field] = formData.get(field) || '';
    });
    
    // إضافة طابع زمني
    data.timestamp = new Date().toISOString();
    
    // إضافة رقم مرجعي مؤقت
    data.referenceNumber = generateReferenceNumber();
    
    return data;
}

// التحقق من صحة النموذج
function validateForm(form) {
    console.log('🔍 بدء التحقق من صحة النموذج');
    let isValid = true;
    const errors = [];
    
    // التحقق من الحقول المطلوبة الظاهرة فقط
    const visibleRequiredFields = form.querySelectorAll('[required]:not([type="hidden"]):not([style*="display: none"]):not([style*="display:none"])');
    console.log(`🔢 عدد الحقول المطلوبة الظاهرة: ${visibleRequiredFields.length}`);
    
    visibleRequiredFields.forEach(field => {
        console.log(`📝 التحقق من الحقل: ${field.name || field.id}, النوع: ${field.type}`);
        
        if (field.type === 'checkbox') {
            if (!field.checked) {
                let fieldName = '';
                if (field.name === 'agreeTerms') {
                    fieldName = 'الموافقة على الشروط والأحكام';
                } else if (field.name === 'confirmInfo') {
                    fieldName = 'تأكيد صحة المعلومات';
                } else {
                    fieldName = field.nextElementSibling?.textContent || field.name || '';
                }
                errors.push(`يجب ${fieldName}`);
                console.log(`❌ خطأ: يجب ${fieldName}`);
                isValid = false;
            }
        } else if (field.type === 'radio') {
            const radioGroup = form.querySelectorAll(`input[name="${field.name}"]`);
            const isChecked = Array.from(radioGroup).some(radio => radio.checked);
            if (!isChecked) {
                const label = form.querySelector(`label[for="${field.name}"]`) || 
                             field.closest('.form-group')?.querySelector('.form-label');
                errors.push(`يجب اختيار ${label?.textContent?.replace(/[^أ-ي\s]/g, '').trim() || field.name}`);
                console.log(`❌ خطأ: يجب اختيار ${field.name}`);
                isValid = false;
            }
        } else {
            if (!field.value.trim()) {
                let fieldLabel = '';
                // محاولة الحصول على تسمية الحقل
                const label = form.querySelector(`label[for="${field.id}"]`);
                if (label) {
                    fieldLabel = label.textContent || label.innerText;
                } else if (field.previousElementSibling && field.previousElementSibling.classList.contains('form-label')) {
                    fieldLabel = field.previousElementSibling.textContent || field.previousElementSibling.innerText;
                } else {
                    fieldLabel = field.name || field.placeholder || 'هذا الحقل';
                }
                
                // تنظيف النص من الأيقونات
                fieldLabel = fieldLabel.replace(/[^\u0600-\u06FF\s]/g, '').trim();
                
                if (fieldLabel) {
                    errors.push(`حقل "${fieldLabel}" مطلوب`);
                    console.log(`❌ خطأ: حقل "${fieldLabel}" مطلوب`);
                } else {
                    errors.push('حقل مطلوب لم يتم تعبئته');
                    console.log('❌ خطأ: حقل مطلوب لم يتم تعبئته');
                }
                isValid = false;
            }
        }
    });
    
    // التحقق من صيغة البريد الإلكتروني
    const emailField = form.querySelector('input[type="email"]');
    if (emailField && emailField.value) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(emailField.value)) {
            errors.push('البريد الإلكتروني غير صحيح');
            console.log('❌ خطأ: البريد الإلكتروني غير صحيح');
            isValid = false;
        }
    }
    
    // التحقق من رقم الهاتف
    const phoneField = form.querySelector('input[type="tel"]');
    if (phoneField && phoneField.value) {
        const phoneRegex = /^05[0-9]{8}$/;
        if (!phoneRegex.test(phoneField.value)) {
            errors.push('رقم الجوال يجب أن يبدأ بـ 05 ويتكون من 10 أرقام');
            console.log('❌ خطأ: رقم الجوال يجب أن يبدأ بـ 05 ويتكون من 10 أرقام');
            isValid = false;
        }
    }
    
    // التحقق من المعدل التراكمي
    const gpaField = form.querySelector('input[name="gpa"]');
    if (gpaField && gpaField.value) {
        const gpa = parseFloat(gpaField.value);
        if (isNaN(gpa) || gpa < 1 || gpa > 5) {
            errors.push('المعدل التراكمي يجب أن يكون بين 1.00 و 5.00');
            console.log('❌ خطأ: المعدل التراكمي يجب أن يكون بين 1.00 و 5.00');
            isValid = false;
        }
    }
    
    // التحقق من رقم الهوية
    const nationalIdField = form.querySelector('input[name="nationalId"]');
    if (nationalIdField && nationalIdField.value) {
        if (nationalIdField.value.length !== 10 || !/^\d+$/.test(nationalIdField.value)) {
            errors.push('رقم الهوية يجب أن يتكون من 10 أرقام');
            console.log('❌ خطأ: رقم الهوية يجب أن يتكون من 10 أرقام');
            isValid = false;
        }
    }
    
    console.log(`📊 نتيجة التحقق: ${isValid ? '✅ صالح' : '❌ غير صالح'}, عدد الأخطاء: ${errors.length}`);
    
    // عرض الأخطاء إذا وجدت
    if (errors.length > 0) {
        showAlert(errors.join('<br>'), 'error');
    }
    
    return isValid;
}

// دالة عرض التنبيهات
function showAlert(message, type = 'info') {
    console.log(`💬 عرض تنبيه: ${type} - ${message}`);
    
    // البحث عن عنصر التنبيه الموجود
    let alertDiv = document.getElementById('alertMessage');
    
    // إذا لم يكن موجوداً، إنشاؤه
    if (!alertDiv) {
        alertDiv = document.createElement('div');
        alertDiv.id = 'alertMessage';
        alertDiv.className = 'alert';
        
        // إضافة إلى المكان المناسب
        const formSection = document.querySelector('.form-section');
        if (formSection) {
            formSection.prepend(alertDiv);
        } else {
            document.body.prepend(alertDiv);
        }
    }
    
    // تعيين النص والنوع
    alertDiv.innerHTML = message;
    alertDiv.className = `alert alert-${type}`;
    alertDiv.style.display = 'block';
    
    // إخفاء التنبيه بعد 5 ثوانٍ
    setTimeout(() => {
        if (alertDiv && alertDiv.style.display !== 'none') {
            alertDiv.style.display = 'none';
        }
    }, 5000);
    
    return alertDiv;
}

// دالة تحديث الإحصائيات (للصفحة الرئيسية)
function updateStatistics() {
    try {
        if (typeof studentVault === 'undefined') {
            console.log('📊 studentVault غير معرف، سيتم تخطي تحديث الإحصائيات');
            return;
        }
        
        const stats = studentVault.getStatistics();
        const students = studentVault.getStudents();
        
        // تحديث الأرقام الرئيسية
        const totalStudentsEl = document.getElementById('totalStudents');
        const availableRoomsEl = document.getElementById('availableRooms');
        const maleCountEl = document.getElementById('maleCount');
        const femaleCountEl = document.getElementById('femaleCount');
        const averageGPAEl = document.getElementById('averageGPA');
        const maxGPAEl = document.getElementById('maxGPA');
        const occupancyRateEl = document.getElementById('occupancyRate');
        const availableRateEl = document.getElementById('availableRate');
        const maleProgressEl = document.getElementById('maleProgress');
        const occupancyProgressEl = document.getElementById('occupancyProgress');
        const gpaProgressEl = document.getElementById('gpaProgress');
        
        if (totalStudentsEl) totalStudentsEl.textContent = stats.total;
        if (availableRoomsEl) availableRoomsEl.textContent = stats.available;
        
        if (maleCountEl) maleCountEl.textContent = stats.genderStats['ذكر'] || 0;
        if (femaleCountEl) femaleCountEl.textContent = stats.genderStats['أنثى'] || 0;
        
        const malePercent = stats.total > 0 ? Math.round((stats.genderStats['ذكر'] || 0) / stats.total * 100) : 0;
        if (maleProgressEl) maleProgressEl.style.width = malePercent + '%';
        
        if (averageGPAEl) averageGPAEl.textContent = stats.averageGPA;
        
        // حساب أعلى معدل
        if (students.length > 0 && maxGPAEl) {
            const gpas = students.map(s => parseFloat(s.gpa)).filter(gpa => !isNaN(gpa));
            if (gpas.length > 0) {
                const maxGPA = Math.max(...gpas);
                maxGPAEl.textContent = maxGPA.toFixed(2);
                
                if (gpaProgressEl) {
                    gpaProgressEl.style.width = Math.round((maxGPA / 5) * 100) + '%';
                }
            }
        }
        
        // تحديث معدل الإشغال
        if (occupancyRateEl && availableRateEl && occupancyProgressEl) {
            const occupancyPercent = Math.round((stats.total / stats.capacity) * 100);
            occupancyProgressEl.style.width = occupancyPercent + '%';
            occupancyRateEl.textContent = occupancyPercent + '%';
            availableRateEl.textContent = (100 - occupancyPercent) + '%';
        }
    } catch (error) {
        console.error('❌ خطأ في تحديث الإحصائيات:', error);
    }
}

// دالة لتنسيق الأرقام
function formatNumber(number) {
    return new Intl.NumberFormat('ar-SA').format(number);
}

// دالة لتنسيق التاريخ
function formatDate(dateString) {
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('ar-SA', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (error) {
        return dateString;
    }
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

// دالة لإخفاء رسالة تحميل
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
        console.error('❌ خطأ في استعادة البيانات:', error);
    }
}

// أنماط إضافية للتحميل (سيتم إضافتها تلقائياً)
if (!document.getElementById('loading-styles')) {
    const loadingStyles = document.createElement('style');
    loadingStyles.id = 'loading-styles';
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
            background-color: var(--dark-card);
            padding: 2rem;
            border-radius: var(--border-radius-md);
            text-align: center;
            box-shadow: var(--shadow-lg);
            border: 1px solid var(--dark-border);
        }
        
        .loading-spinner {
            width: 50px;
            height: 50px;
            border: 5px solid var(--dark-border);
            border-top-color: var(--primary-green);
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto 1rem;
        }
        
        @keyframes spin {
            to { transform: rotate(360deg); }
        }
        
        .loading {
            display: inline-block;
            width: 20px;
            height: 20px;
            border: 3px solid var(--dark-border);
            border-top-color: var(--primary-green);
            border-radius: 50%;
            animation: spin 1s linear infinite;
        }
    `;
    document.head.appendChild(loadingStyles);
}

// تهيئة تحديث الإحصائيات تلقائياً
setInterval(() => {
    if (typeof studentVault !== 'undefined') {
        updateStatistics();
    }
}, 30000);

// دعم إضافي لوظائف الصفحات الأخرى
window.AppUtils = {
    showAlert: showAlert,
    formatDate: formatDate,
    formatNumber: formatNumber,
    generateReferenceNumber: generateReferenceNumber,
    checkInternetConnection: checkInternetConnection
};

console.log('✅ تم تحميل main.js بنجاح');
