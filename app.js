document.addEventListener('DOMContentLoaded', function() {
    // عناصر DOM
    const currentBalanceEl = document.getElementById('currentBalance');
    const expensesTableBody = document.getElementById('expensesTableBody');
    const expenseForm = document.getElementById('expenseForm');
    const filterCategory = document.getElementById('filterCategory');
    const addInitialBalanceBtn = document.getElementById('addInitialBalance');
    const addAdditionalFundsBtn = document.getElementById('addAdditionalFunds');
    const transferFundsBtn = document.getElementById('transferFunds');
    const resetAllBtn = document.getElementById('resetAll');
    const balanceModal = new bootstrap.Modal(document.getElementById('balanceModal'));
    const transferModal = new bootstrap.Modal(document.getElementById('transferModal'));
    const editExpenseModal = new bootstrap.Modal(document.getElementById('editExpenseModal'));
    const confirmBalanceBtn = document.getElementById('confirmBalance');
    const confirmTransferBtn = document.getElementById('confirmTransfer');
    const saveEditExpenseBtn = document.getElementById('saveEditExpense');
    const balanceAmountInput = document.getElementById('balanceAmount');
    const transferAmountInput = document.getElementById('transferAmount');
    const expenseChartCtx = document.getElementById('expensesChart').getContext('2d');
    
    // حالة التطبيق
    let appState = {
        balance: 0,
        expenses: [],
        isInitialBalanceSet: false,
        chart: null
    };
    
    // تهيئة التطبيق
    function initApp() {
        loadData();
        updateBalanceDisplay();
        renderExpensesTable();
        updateChart();
        
        // تعيين معالج الأحداث
        setupEventListeners();
    }
    
    // تحميل البيانات من localStorage
    function loadData() {
        const savedData = localStorage.getItem('qassaAppData');
        if (savedData) {
            const parsedData = JSON.parse(savedData);
            appState.balance = parsedData.balance || 0;
            appState.expenses = parsedData.expenses || [];
            appState.isInitialBalanceSet = parsedData.isInitialBalanceSet || false;
        }
    }
    
    // حفظ البيانات في localStorage
    function saveData() {
        localStorage.setItem('qassaAppData', JSON.stringify({
            balance: appState.balance,
            expenses: appState.expenses,
            isInitialBalanceSet: appState.isInitialBalanceSet
        }));
    }
    
    // تحديث عرض الرصيد
    function updateBalanceDisplay() {
        currentBalanceEl.textContent = formatCurrency(appState.balance) + ' د.ع';
    }
    
    // تنسيق العملة
    function formatCurrency(amount) {
        return new Intl.NumberFormat('ar-IQ').format(amount);
    }
    
    // عرض جدول المصاريف
    function renderExpensesTable(filter = '') {
        expensesTableBody.innerHTML = '';
        
        const filteredExpenses = filter ? 
            appState.expenses.filter(exp => exp.category === filter) : 
            appState.expenses;
            
        if (filteredExpenses.length === 0) {
            expensesTableBody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center text-muted py-4">لا توجد مصاريف مسجلة</td>
                </tr>
            `;
            return;
        }
        
        filteredExpenses.forEach((expense, index) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${index + 1}</td>
                <td>${formatCurrency(expense.amount)} د.ع</td>
                <td><span class="badge bg-primary">${expense.category}</span></td>
                <td>${expense.description || '-'}</td>
                <td>${new Date(expense.date).toLocaleDateString('ar-IQ')}</td>
                <td>
                    <button class="btn btn-sm btn-outline-primary edit-expense" data-id="${expense.id}">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger delete-expense" data-id="${expense.id}">
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            `;
            expensesTableBody.appendChild(row);
        });
        
        // إضافة معالج الأحداث للأزرار الجديدة
        document.querySelectorAll('.delete-expense').forEach(btn => {
            btn.addEventListener('click', handleDeleteExpense);
        });
        
        document.querySelectorAll('.edit-expense').forEach(btn => {
            btn.addEventListener('click', handleEditExpense);
        });
    }
    
    // تحديث الرسم البياني
    function updateChart() {
        if (appState.chart) {
            appState.chart.destroy();
        }
        
        if (appState.expenses.length === 0) {
            return;
        }
        
        // تجميع المصاريف حسب الفئة
        const categories = {};
        appState.expenses.forEach(expense => {
            if (!categories[expense.category]) {
                categories[expense.category] = 0;
            }
            categories[expense.category] += expense.amount;
        });
        
        const labels = Object.keys(categories);
        const data = Object.values(categories);
        const backgroundColors = [
            '#3498db', '#2ecc71', '#e74c3c', '#f39c12', '#9b59b6', '#1abc9c'
        ];
        
        appState.chart = new Chart(expenseChartCtx, {
            type: 'pie',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: backgroundColors,
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'bottom',
                        rtl: true
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.raw || 0;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = Math.round((value / total) * 100);
                                return `${label}: ${formatCurrency(value)} د.ع (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
    }
    
    // معالج الأحداث
    function setupEventListeners() {
        // إضافة مصروف جديد
        expenseForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const amount = parseFloat(document.getElementById('expenseAmount').value);
            const category = document.getElementById('expenseCategory').value;
            const description = document.getElementById('expenseDescription').value;
            
            if (amount > appState.balance) {
                alert('الرصيد الحالي لا يكفي لهذا المصروف!');
                return;
            }
            
            const newExpense = {
                id: Date.now(),
                amount: amount,
                category: category,
                description: description,
                date: new Date().toISOString()
            };
            
            appState.expenses.unshift(newExpense);
            appState.balance -= amount;
            
            updateBalanceDisplay();
            renderExpensesTable(filterCategory.value);
            updateChart();
            saveData();
            
            // إعادة تعيين النموذج
            expenseForm.reset();
        });
        
        // تصفية المصاريف
        filterCategory.addEventListener('change', function() {
            renderExpensesTable(this.value);
        });
        
        // إضافة رصيد أساسي
        addInitialBalanceBtn.addEventListener('click', function() {
            document.getElementById('balanceModalTitle').textContent = 'إضافة رصيد أساسي';
            balanceModal.show();
        });
        
        // إضافة أموال إضافية
        addAdditionalFundsBtn.addEventListener('click', function() {
            document.getElementById('balanceModalTitle').textContent = 'إيداع أموال إضافية';
            balanceModal.show();
        });
        
        // تأكيد إضافة الرصيد
        confirmBalanceBtn.addEventListener('click', function() {
            const amount = parseFloat(balanceAmountInput.value);
            
            if (isNaN(amount) || amount <= 0) {
                alert('الرجاء إدخال مبلغ صحيح!');
                return;
            }
            
            appState.balance += amount;
            
            if (document.getElementById('balanceModalTitle').textContent === 'إضافة رصيد أساسي') {
                appState.isInitialBalanceSet = true;
            }
            
            updateBalanceDisplay();
            balanceModal.hide();
            balanceAmountInput.value = '';
            saveData();
        });
        
        // فتح نافذة التحويل
        transferFundsBtn.addEventListener('click', function() {
            if (appState.balance <= 0) {
                alert('لا يوجد رصيد كافي للتحويل!');
                return;
            }
            transferModal.show();
        });
        
        // تأكيد التحويل
        confirmTransferBtn.addEventListener('click', function() {
            const amount = parseFloat(transferAmountInput.value);
            const account = document.getElementById('transferAccount').value;
            const description = document.getElementById('transferDescription').value;
            
            if (isNaN(amount) || amount <= 0) {
                alert('الرجاء إدخال مبلغ صحيح!');
                return;
            }
            
            if (amount > appState.balance) {
                alert('الرصيد الحالي لا يكفي لهذا التحويل!');
                return;
            }
            
            if (!account.trim()) {
                alert('الرجاء إدخال حساب الهدف!');
                return;
            }
            
            // تسجيل التحويل كمصروف
            const transferExpense = {
                id: Date.now(),
                amount: amount,
                category: 'تحويل',
                description: `تحويل إلى ${account}: ${description || 'لا يوجد وصف'}`,
                date: new Date().toISOString()
            };
            
            appState.expenses.unshift(transferExpense);
            appState.balance -= amount;
            
            updateBalanceDisplay();
            renderExpensesTable(filterCategory.value);
            updateChart();
            saveData();
            
            // إغلاق النافذة وإعادة تعيين النموذج
            transferModal.hide();
            document.getElementById('transferForm').reset();
        });
        
        // إغلاق القاصة
        resetAllBtn.addEventListener('click', function() {
            if (confirm('هل أنت متأكد من رغبتك في إغلاق القاصة؟ سيتم حذف جميع البيانات بما في ذلك الرصيد والمصاريف.')) {
                appState.balance = 0;
                appState.expenses = [];
                appState.isInitialBalanceSet = false;
                
                updateBalanceDisplay();
                renderExpensesTable();
                updateChart();
                saveData();
            }
        });
    }
    
    // حذف مصروف
    function handleDeleteExpense(e) {
        const expenseId = parseInt(e.currentTarget.getAttribute('data-id'));
        
        if (confirm('هل أنت متأكد من رغبتك في حذف هذا المصروف؟')) {
            const expenseIndex = appState.expenses.findIndex(exp => exp.id === expenseId);
            
            if (expenseIndex !== -1) {
                // استعادة المبلغ إلى الرصيد
                appState.balance += appState.expenses[expenseIndex].amount;
                
                // حذف المصروف
                appState.expenses.splice(expenseIndex, 1);
                
                updateBalanceDisplay();
                renderExpensesTable(filterCategory.value);
                updateChart();
                saveData();
            }
        }
    }
    
    // تعديل مصروف
    function handleEditExpense(e) {
        const expenseId = parseInt(e.currentTarget.getAttribute('data-id'));
        const expense = appState.expenses.find(exp => exp.id === expenseId);
        
        if (expense) {
            document.getElementById('editExpenseId').value = expense.id;
            document.getElementById('editExpenseAmount').value = expense.amount;
            document.getElementById('editExpenseCategory').value = expense.category;
            document.getElementById('editExpenseDescription').value = expense.description || '';
            
            editExpenseModal.show();
        }
    }
    
    // حفظ التعديلات على المصروف
    saveEditExpenseBtn.addEventListener('click', function() {
        const expenseId = parseInt(document.getElementById('editExpenseId').value);
        const newAmount = parseFloat(document.getElementById('editExpenseAmount').value);
        const newCategory = document.getElementById('editExpenseCategory').value;
        const newDescription = document.getElementById('editExpenseDescription').value;
        
        const expenseIndex = appState.expenses.findIndex(exp => exp.id === expenseId);
        
        if (expenseIndex !== -1) {
            const oldAmount = appState.expenses[expenseIndex].amount;
            
            // حساب الفرق في المبلغ
            const amountDiff = oldAmount - newAmount;
            
            // تحديث الرصيد
            appState.balance += amountDiff;
            
            // تحديث بيانات المصروف
            appState.expenses[expenseIndex].amount = newAmount;
            appState.expenses[expenseIndex].category = newCategory;
            appState.expenses[expenseIndex].description = newDescription;
            
            updateBalanceDisplay();
            renderExpensesTable(filterCategory.value);
            updateChart();
            saveData();
            
            editExpenseModal.hide();
        }
    });
    
    // بدء التطبيق
    initApp();
});