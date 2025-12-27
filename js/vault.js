// vault.js - نظام إدارة الخزنة المحلية
class StudentVault {
    constructor() {
        this.storageKey = 'encrypted_vault';
        this.maxCapacity = 50;
        this.initializeVault();
    }

    // تهيئة الخزنة إذا لم تكن موجودة
    initializeVault() {
        if (!localStorage.getItem(this.storageKey)) {
            localStorage.setItem(this.storageKey, JSON.stringify([]));
        }
    }

    // تشفير بسيط للبيانات (Base64)
    encryptData(data) {
        return btoa(encodeURIComponent(JSON.stringify(data)));
    }

    // فك التشفير
    decryptData(encryptedData) {
        try {
            return JSON.parse(decodeURIComponent(atob(encryptedData)));
        } catch (error) {
            console.error('فك التشفير فشل:', error);
            return null;
        }
    }

    // توليد رقم مرجعي فريد
    generateReferenceNumber() {
        const date = new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const random = Math.floor(1000 + Math.random() * 9000);
        return `NU-${year}-${month}${day}-${random}`;
    }

    // حساب الرسوم بناءً على نوع الغرفة
    calculateFees(roomType) {
        const fees = {
            'standard': 4000,    // غرفة قياسية
            'premium': 6000,     // غرفة متميزة
            'suite': 8000        // جناح
        };
        return fees[roomType] || 4000;
    }

    // حفظ الطالب في الخزنة
    saveStudent(studentData) {
        // توليد رقم مرجعي
        studentData.referenceNumber = this.generateReferenceNumber();
        studentData.timestamp = new Date().toISOString();
        studentData.id = Date.now() + Math.random().toString(36).substr(2, 9);

        // حساب الرسوم
        studentData.fees = this.calculateFees(studentData.roomType);

        // الحصول على الخزنة الحالية
        let vault = this.getStudents();

        // إضافة الطالب الجديد
        vault.push(studentData);

        // تطبيق نظام التدوير (FIFO) إذا تجاوز العدد 50
        if (vault.length > this.maxCapacity) {
            vault.shift(); // حذف أقدم طلب
        }

        // تشفير وحفظ البيانات
        const encryptedVault = this.encryptData(vault);
        localStorage.setItem(this.storageKey, encryptedVault);

        return {
            success: true,
            referenceNumber: studentData.referenceNumber,
            studentData: studentData
        };
    }

    // الحصول على جميع الطلاب
    getStudents() {
        try {
            const encryptedData = localStorage.getItem(this.storageKey);
            if (!encryptedData || encryptedData === '[]') {
                return [];
            }
            return this.decryptData(encryptedData) || [];
        } catch (error) {
            console.error('خطأ في قراءة الخزنة:', error);
            return [];
        }
    }

    // تصدير البيانات كـ JSON
    exportToJSON() {
        const data = this.getStudents();
        const dataStr = JSON.stringify(data, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
        return dataUri;
    }

    // تصدير البيانات كـ CSV
    exportToCSV() {
        const students = this.getStudents();
        if (students.length === 0) return '';
        
        const headers = ['الرقم المرجعي', 'الاسم الرباعي', 'رقم الهوية', 'الجنس', 'المحافظة', 'التخصص', 'المعدل', 'رقم الهاتف', 'البريد الإلكتروني', 'نوع الغرفة', 'الرسوم', 'تاريخ التسجيل'];
        
        const csvRows = [];
        csvRows.push(headers.join(','));
        
        students.forEach(student => {
            const row = [
                student.referenceNumber,
                `"${student.fullName}"`,
                student.nationalId,
                student.gender,
                student.province,
                `"${student.specialization}"`,
                student.gpa,
                student.phone,
                student.email,
                student.roomType,
                student.fees,
                new Date(student.timestamp).toLocaleDateString('ar-SA')
            ];
            csvRows.push(row.join(','));
        });
        
        return csvRows.join('\n');
    }

    // تنظيف الخزنة
    clearVault() {
        localStorage.setItem(this.storageKey, JSON.stringify([]));
        return true;
    }

    // الحصول على إحصائيات
    getStatistics() {
        const students = this.getStudents();
        const total = students.length;
        
        // حساب التوزيع حسب الجنس
        const genderStats = {
            'ذكر': students.filter(s => s.gender === 'ذكر').length,
            'أنثى': students.filter(s => s.gender === 'أنثى').length
        };

        // حساب التوزيع حسب المحافظة
        const provinceStats = {};
        students.forEach(student => {
            provinceStats[student.province] = (provinceStats[student.province] || 0) + 1;
        });

        // حساب متوسط المعدل
        const totalGPA = students.reduce((sum, student) => sum + parseFloat(student.gpa), 0);
        const averageGPA = total > 0 ? (totalGPA / total).toFixed(2) : 0;

        // حساب الإيرادات
        const totalRevenue = students.reduce((sum, student) => sum + student.fees, 0);

        return {
            total,
            genderStats,
            provinceStats,
            averageGPA,
            totalRevenue,
            capacity: this.maxCapacity,
            available: this.maxCapacity - total
        };
    }

    // البحث في الخزنة
    searchStudents(query) {
        const students = this.getStudents();
        if (!query) return students;
        
        const lowerQuery = query.toLowerCase();
        return students.filter(student => 
            student.fullName?.toLowerCase().includes(lowerQuery) ||
            student.nationalId?.includes(lowerQuery) ||
            student.referenceNumber?.toLowerCase().includes(lowerQuery) ||
            student.phone?.includes(lowerQuery)
        );
    }

    // فرز الطلاب حسب المعدل (تنازلي)
    sortByGPA(students) {
        return [...students].sort((a, b) => parseFloat(b.gpa) - parseFloat(a.gpa));
    }

    // فرز الطلاب حسب البعد الجغرافي (الأبعد أولاً)
    sortByDistance(students) {
        // تعريف أولوية المحافظات (كلما زاد الرقم، زادت الأولوية في السكن)
        const provincePriority = {
            'نجران': 1,
            'شرورة': 2,
            'حبالة': 3,
            'بدر الجنوب': 4,
            'يثرب': 5,
            'خباش': 6,
            // المحافظات البعيدة
            'الرياض': 10,
            'جدة': 11,
            'الدمام': 12,
            'مكة': 13,
            'المدينة': 14,
            'تبوك': 15,
            'الجوف': 16,
            'عسير': 17,
            'الباحة': 18,
            'الحدود الشمالية': 19,
            'جازان': 20,
            'حائل': 21,
            'القصيم': 22,
            'الشرقية': 23
        };
        
        return [...students].sort((a, b) => 
            (provincePriority[b.province] || 99) - (provincePriority[a.province] || 99)
        );
    }

    // فرز الطلاب حسب الأولوية (المعدل + البعد)
    sortByPriority(students) {
        const sortedByGPA = this.sortByGPA(students);
        // إعطاء وزن أكبر للمعدل (70%) والمسافة (30%)
        return sortedByGPA.sort((a, b) => {
            const provincePriority = {
                'نجران': 1, 'شرورة': 2, 'حبالة': 3, 'بدر الجنوب': 4, 'يثرب': 5, 'خباش': 6,
                'الرياض': 10, 'جدة': 11, 'الدمام': 12, 'مكة': 13, 'المدينة': 14, 'تبوك': 15,
                'الجوف': 16, 'عسير': 17, 'الباحة': 18, 'الحدود الشمالية': 19, 'جازان': 20,
                'حائل': 21, 'القصيم': 22, 'الشرقية': 23
            };
            
            const scoreA = (parseFloat(a.gpa) * 0.7) + ((provincePriority[a.province] || 99) * 0.3);
            const scoreB = (parseFloat(b.gpa) * 0.7) + ((provincePriority[b.province] || 99) * 0.3);
            
            return scoreB - scoreA; // تنازلي
        });
    }
}

// إنشاء كائن الخزنة العام
const studentVault = new StudentVault();

// دالة للتحقق من رمز الخزنة
function verifyVaultAccess(passcode) {
    const correctPasscode = 'NU2024VA';
    if (passcode === correctPasscode) {
        sessionStorage.setItem('vault_access', 'granted');
        return true;
    }
    return false;
}

// دالة للتحقق من صلاحية الوصول
function hasVaultAccess() {
    return sessionStorage.getItem('vault_access') === 'granted';
}

// دالة لحماية الصفحة
function protectVaultPage() {
    if (!hasVaultAccess()) {
        window.location.href = 'admin-login.html';
    }
}
