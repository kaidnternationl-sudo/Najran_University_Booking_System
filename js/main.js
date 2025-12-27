/* ===========================================
   الملف الرئيسي للنظام الجديد
   جامعة نجران - نظام السكن الجامعي
   =========================================== */

// فئة لإدارة النظام
class HousingSystem {
    constructor() {
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.checkAdminSession();
        this.updateLiveCounters();
    }
    
    setupEventListeners() {
        // تأخير الأحمال الثقيلة
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.onPageLoaded());
        } else {
            this.onPageLoaded();
        }
    }
    
    onPageLoaded() {
        // تحسينات إضافية عند تحميل الصفحة
        this.enhanceForms();
        this.setupPrintButtons();
        this.setupBackButtons();
    }
    
    enhanceForms() {
        // تحسين تجربة النماذج
        document.querySelectorAll('input, select').forEach(element => {
            element.addEventListener('focus', function() {
                this.parentElement.classList.add('focused');
            });
            
            element.addEventListener('blur', function() {
                this.parentElement.classList.remove('focused');
            });
        });
    }
    
    setupPrintButtons() {
        // إعداد أزرار الطباعة
        document.querySelectorAll('[onclick*="print"]').forEach(button => {
            button.addEventListener('click', function(e) {
                if (e.target.tagName === 'BUTTON') {
                    window.print();
                }
            });
        });
    }
    
    setupBackButtons() {
        // إضافة وظيفة الرجوع
        document.querySelectorAll('.btn-secondary[href*="index"]').forEach(button => {
            button.addEventListener('click', function(e) {
                if (!confirm('هل تريد العودة للصفحة الرئيسية؟')) {
                    e.preventDefault();
                }
            });
        });
    }
    
    checkAdminSession() {
        // التحقق من جلسة المدير
        const adminPages = ['admin-vault.html', 'admin-login.html'];
        const currentPage = window.location.pathname.split('/').pop();
        
        if (adminPages.includes(currentPage) && currentPage !== 'admin-login.html') {
            if (!localStorage.getItem('adminLoggedIn')) {
                window.location.href = 'admin-login.html';
            }
        }
    }
    
    updateLiveCounters() {
        // تحديث العدادات الحية
        const counters = document.querySelectorAll('.counter-number, .counter-fill');
        
        if (counters.length > 0) {
            setInterval(() => {
                // يمكن تحديث العدادات من localStorage
                const vault = window.StudentVault ? new StudentVault() : null;
                if (vault) {
                    const count = vault.getApplicationsCount();
                    document.querySelectorAll('.counter-number').forEach(counter => {
                        if (!counter.id.includes('vaultStatus')) {
                            counter.textContent = count;
                        }
                    });
                }
            }, 30000); // كل 30 ثانية
        }
    }
    
    // وظائف مساعدة
    static formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('ar-SA', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
    
    static validatePhone(phone) {
        return /^05[0-9]{8}$/.test(phone);
    }
    
    static validateNationalId(id) {
        return /^[0-9]{10}$/.test(id);
    }
    
    static validateEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }
}

// تهيئة النظام عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', function() {
    window.housingSystem = new HousingSystem();
    
    // إضافة رسالة ترحيبية
    if (localStorage.getItem('welcomeShown') !== 'true') {
        console.log('مرحباً بك في نظام حجز السكن الجامعي - جامعة نجران');
        localStorage.setItem('welcomeShown', 'true');
    }
});

// وظائف عامة
function showAlert(message, type = 'info') {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type}`;
    alertDiv.innerHTML = `
        <span>${message}</span>
        <button onclick="this.parentElement.remove()">&times;</button>
    `;
    
    document.body.prepend(alertDiv);
    
    setTimeout(() => {
        if (alertDiv.parentNode) {
            alertDiv.remove();
        }
    }, 5000);
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
