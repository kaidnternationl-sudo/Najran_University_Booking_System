/* ===========================================
   نظام الخزنة الإدارية المحدث
   يحفظ 50 طلباً فقط - الأحدث يحل محل الأقدم
   جامعة نجران - نظام السكن الجامعي
   =========================================== */

class StudentVault {
    constructor() {
        this.STORAGE_KEY = 'student_housing_vault';
        this.MAX_APPLICATIONS = 50; // الحد الأقصى 50 طلب
        this.init();
    }
    
    init() {
        // تهيئة التخزين إذا كان فارغاً
        if (!this.getAllApplications()) {
            this.saveApplications([]);
        }
    }
    
    // إضافة طلب جديد
    addApplication(studentData) {
        try {
            // الحصول على جميع الطلبات الحالية
            let applications = this.getAllApplications();
            
            // التحقق من عدم وجود تكرار (بنفس رقم الهوية)
            const existingIndex = applications.findIndex(app => 
                app.nationalId === studentData.nationalId
            );
            
            if (existingIndex !== -1) {
                // تحديث الطلب الموجود بدلاً من إضافة جديد
                applications[existingIndex] = {
                    ...applications[existingIndex],
                    ...studentData,
                    registrationDate: new Date().toISOString() // تحديث التاريخ
                };
            } else {
                // إضافة الطلب الجديد في البداية (الأحدث أولاً)
                applications.unshift(studentData);
                
                // التحقق من عدم تجاوز الحد الأقصى
                if (applications.length > this.MAX_APPLICATIONS) {
                    // حذف الطلب الأقدم (آخر عنصر في المصفوفة)
                    applications = applications.slice(0, this.MAX_APPLICATIONS);
                }
            }
            
            // حفظ المصفوفة المحدثة
            this.saveApplications(applications);
            
            return {
                success: true,
                message: 'تم حفظ الطلب بنجاح في الخزنة',
                totalApplications: applications.length
            };
            
        } catch (error) {
            console.error('خطأ في حفظ الطلب:', error);
            return {
                success: false,
                message: 'حدث خطأ في حفظ الطلب',
                error: error.message
            };
        }
    }
    
    // الحصول على جميع الطلبات
    getAllApplications() {
        try {
            const data = localStorage.getItem(this.STORAGE_KEY);
            return data ? JSON.parse(data) : [];
        } catch (error) {
            console.error('خطأ في قراءة الطلبات:', error);
            return [];
        }
    }
    
    // الحصول على عدد الطلبات الحالي
    getApplicationsCount() {
        return this.getAllApplications().length;
    }
    
    // البحث عن طلب محدد
    searchApplications(searchTerm) {
        const applications = this.getAllApplications();
        
        if (!searchTerm.trim()) {
            return applications;
        }
        
        const term = searchTerm.toLowerCase();
        return applications.filter(app => 
            app.fullName.toLowerCase().includes(term) ||
            app.nationalId.includes(term) ||
            app.province.toLowerCase().includes(term) ||
            app.specialization.toLowerCase().includes(term)
        );
    }
    
    // حذف طلب محدد
    deleteApplication(applicationId) {
        try {
            let applications = this.getAllApplications();
            const initialLength = applications.length;
            
            applications = applications.filter(app => app.id !== applicationId);
            
            if (applications.length < initialLength) {
                this.saveApplications(applications);
                return {
                    success: true,
                    message: 'تم حذف الطلب بنجاح',
                    totalApplications: applications.length
                };
            } else {
                return {
                    success: false,
                    message: 'لم يتم العثور على الطلب'
                };
            }
            
        } catch (error) {
            console.error('خطأ في حذف الطلب:', error);
            return {
                success: false,
                message: 'حدث خطأ في حذف الطلب',
                error: error.message
            };
        }
    }
    
    // حذف الطلبات القديمة (التي تجاوزت المدة)
    cleanupOldApplications(maxAgeDays = 7) {
        try {
            let applications = this.getAllApplications();
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - maxAgeDays);
            
            const initialLength = applications.length;
            applications = applications.filter(app => 
                new Date(app.registrationDate) > cutoffDate
            );
            
            if (applications.length < initialLength) {
                this.saveApplications(applications);
                return {
                    success: true,
                    message: `تم حذف ${initialLength - applications.length} طلب قديم`,
                    deletedCount: initialLength - applications.length,
                    totalApplications: applications.length
                };
            }
            
            return {
                success: true,
                message: 'لا توجد طلبات قديمة للحذف',
                deletedCount: 0,
                totalApplications: applications.length
            };
            
        } catch (error) {
            console.error('خطأ في تنظيف الطلبات القديمة:', error);
            return {
                success: false,
                message: 'حدث خطأ في تنظيف الطلبات',
                error: error.message
            };
        }
    }
    
    // تصدير البيانات
    exportData(format = 'json') {
        const applications = this.getAllApplications();
        
        if (applications.length === 0) {
            return null;
        }
        
        switch (format.toLowerCase()) {
            case 'json':
                return JSON.stringify(applications, null, 2);
                
            case 'csv':
                return this.convertToCSV(applications);
                
            default:
                return JSON.stringify(applications);
        }
    }
    
    // تحويل إلى CSV
    convertToCSV(applications) {
        const headers = ['الاسم', 'رقم الهوية', 'المعدل', 'المحافظة', 'التخصص', 'الجنس', 'تاريخ التسجيل'];
        
        let csv = headers.join(',') + '\n';
        
        applications.forEach(app => {
            const row = [
                `"${app.fullName}"`,
                app.nationalId,
                app.gpa,
                `"${app.province}"`,
                `"${app.specialization}"`,
                `"${app.gender}"`,
                `"${new Date(app.registrationDate).toLocaleDateString('ar-SA')}"`
            ];
            
            csv += row.join(',') + '\n';
        });
        
        return csv;
    }
    
    // حساب الأولوية للطالب
    calculatePriority(gpa, province) {
        // خريطة المسافات النسبية من الجامعة
        const distanceMap = {
            'نجران': 0,      // داخل المدينة
            'عسير': 30,      // قريبة
            'جازان': 65,     // متوسطة
            'حائل': 75,      // بعيدة
            'القصيم': 70,
            'الرياض': 85,    // بعيدة جداً
            'مكة المكرمة': 90,
            'المدينة المنورة': 88,
            'الشرقية': 95
        };
        
        // حساب النقاط: 70% للمعدل، 30% للمسافة
        const gpaScore = (parseFloat(gpa) / 5) * 70;
        const distanceScore = (distanceMap[province] || 50) * 0.3;
        
        // النتيجة النهائية (0-100)
        return Math.min(100, Math.round(gpaScore + distanceScore));
    }
    
    // ترتيب الطلبات حسب الأولوية
    getApplicationsByPriority() {
        const applications = this.getAllApplications();
        
        return applications
            .map(app => ({
                ...app,
                priorityScore: this.calculatePriority(app.gpa, app.province)
            }))
            .sort((a, b) => b.priorityScore - a.priorityScore);
    }
    
    // الحصول على إحصائيات عامة
    getStatistics() {
        const applications = this.getAllApplications();
        
        if (applications.length === 0) {
            return {
                total: 0,
                averageGPA: 0,
                maleCount: 0,
                femaleCount: 0,
                byProvince: {},
                bySpecialization: {}
            };
        }
        
        // حساب المتوسطات
        const totalGPA = applications.reduce((sum, app) => sum + parseFloat(app.gpa), 0);
        const averageGPA = (totalGPA / applications.length).toFixed(2);
        
        // حساب حسب الجنس
        const maleCount = applications.filter(app => app.gender === 'ذكر').length;
        const femaleCount = applications.length - maleCount;
        
        // تجميع حسب المحافظة
        const byProvince = {};
        applications.forEach(app => {
            byProvince[app.province] = (byProvince[app.province] || 0) + 1;
        });
        
        // تجميع حسب التخصص
        const bySpecialization = {};
        applications.forEach(app => {
            bySpecialization[app.specialization] = (bySpecialization[app.specialization] || 0) + 1;
        });
        
        return {
            total: applications.length,
            averageGPA: parseFloat(averageGPA),
            maleCount,
            femaleCount,
            byProvince,
            bySpecialization
        };
    }
    
    // حفظ الطلبات في التخزين
    saveApplications(applications) {
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(applications));
            return true;
        } catch (error) {
            console.error('خطأ في حفظ الطلبات:', error);
            return false;
        }
    }
    
    // مسح جميع الطلبات (لأغراض التنظيف فقط)
    clearAllApplications() {
        try {
            localStorage.removeItem(this.STORAGE_KEY);
            return {
                success: true,
                message: 'تم مسح جميع الطلبات من الخزنة'
            };
        } catch (error) {
            console.error('خطأ في مسح الطلبات:', error);
            return {
                success: false,
                message: 'حدث خطأ في مسح الطلبات'
            };
        }
    }
}

// التصدير للاستخدام في الملفات الأخرى
if (typeof window !== 'undefined') {
    window.StudentVault = StudentVault;
}
