
let allOrders = [];
let myPieChart;
let myBarChart;

const csvFileInput = document.getElementById('csvFileInput');
const yearSelect = document.getElementById('yearSelect');
const city1Select = document.getElementById('city1Select');
const city2Select = document.getElementById('city2Select');

const dataDisplay = document.getElementById('dataDisplay');
const summaryYearSpan = document.getElementById('summaryYear');
const totalRevenueSummary = document.getElementById('totalRevenueSummary');
const totalOrdersSummary = document.getElementById('totalOrdersSummary');
const uniqueCitiesSummary = document.getElementById('uniqueCitiesSummary');
const tableYearSpan = document.getElementById('tableYear');
const cityRevenueTableBody = document.querySelector('#cityRevenueTable tbody');
const pieChartYearSpan = document.getElementById('pieChartYear');
const yearSelectionDiv = document.getElementById('yearSelection');
const cityComparisonSelectionDiv = document.getElementById('cityComparisonSelection');


// Function to generate a random color
function getRandomColor(alpha = 1) {
    const r = Math.floor(Math.random() * 255);
    const g = Math.floor(Math.random() * 255);
    const b = Math.floor(Math.random() * 255);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// Event listener for CSV file input
csvFileInput.addEventListener('change', handleFileSelect);

function handleFileSelect(event) {
    console.log('--- Начат процесс загрузки файла ---');
    const file = event.target.files[0];
    if (!file) {
        console.warn('Файл не выбран.');
        resetUI();
        return;
    }
    console.log('Выбран файл:', file.name);

    Papa.parse(file, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        complete: function(results) {
            console.log('Парсинг CSV завершен. Результаты:', results);

            // Проверка на наличие заголовков
            const requiredHeaders = ['order_date', 'revenue', 'city', 'state'];
            const headers = results.meta.fields;

            if (!headers || headers.length === 0) {
                alert('Ошибка: Не удалось распознать заголовки столбцов в CSV файле. Убедитесь, что первая строка содержит заголовки.');
                console.error('Не удалось распознать заголовки:', results.meta);
                resetUI();
                return;
            }

            const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));

            if (missingHeaders.length > 0) {
                alert(`Ошибка: Отсутствуют необходимые столбцы в CSV файле: ${missingHeaders.join(', ')}. Пожалуйста, убедитесь, что файл содержит столбцы 'order_date', 'revenue', 'city', 'state'.`);
                console.error('Отсутствуют необходимые заголовки:', missingHeaders);
                resetUI();
                return;
            }

            // Обработка данных
            allOrders = results.data.map(row => {
                const orderDate = new Date(row.order_date);
                const year = orderDate.getFullYear();
                const revenue = parseFloat(row.revenue);

                if (isNaN(year) || isNaN(revenue) || revenue <= 0 || !row.city || !row.state) {
                    console.warn('Пропущена строка из-за невалидных данных:', row);
                    return null; // Пропускаем невалидные строки
                }

                return {
                    order_id: row.order_id,
                    customer_id: row.customer_id,
                    order_date: orderDate,
                    year: year,
                    revenue: revenue,
                    city: row.city,
                    state: row.state
                };
            }).filter(order => order !== null); // Удаляем пропущенные строки

            console.log('Обработанные заказы (allOrders):', allOrders);
            console.log('Количество валидных заказов:', allOrders.length);

            if (allOrders.length === 0) {
                alert('Файл CSV пуст или не содержит валидных данных о заказах после фильтрации.');
                resetUI();
                return;
            }
            
            // Заполнение выпадающих списков и отображение UI
            populateYearDropdown();
            populateCityDropdowns();
            dataDisplay.style.display = 'block';
            yearSelectionDiv.style.display = 'block';
            cityComparisonSelectionDiv.style.display = 'flex'; // Use flex for this group
            
            // Триггер первичных отчетов и графиков
            if (yearSelect.value) {
                console.log('Инициирован запуск отчетов для года:', yearSelect.value);
                updateReportsAndCharts();
            }
            if (city1Select.value && city2Select.value) {
                console.log('Инициирован запуск графика сравнения городов:', city1Select.value, city2Select.value);
                updateBarChart();
            }
            console.log('--- Процесс загрузки файла завершен успешно ---');
        },
        error: function(error) {
            alert('Ошибка при парсинге CSV файла: ' + error.message);
            console.error('Ошибка PapaParse:', error);
            resetUI();
        }
    });
}

function resetUI() {
    console.log('Сброс пользовательского интерфейса.');
    allOrders = [];
    yearSelect.innerHTML = '';
    city1Select.innerHTML = '';
    city2Select.innerHTML = '';
    dataDisplay.style.display = 'none';
    yearSelectionDiv.style.display = 'none';
    cityComparisonSelectionDiv.style.display = 'none';
    if (myPieChart) myPieChart.destroy();
    if (myBarChart) myBarChart.destroy();
    cityRevenueTableBody.innerHTML = '';
    totalRevenueSummary.textContent = '';
    totalOrdersSummary.textContent = '';
    uniqueCitiesSummary.textContent = '';
    summaryYearSpan.textContent = '';
    tableYearSpan.textContent = '';
    pieChartYearSpan.textContent = '';
}

function populateYearDropdown() {
    const years = [...new Set(allOrders.map(order => order.year))].sort((a, b) => b - a);
    if (years.length === 0) {
        yearSelect.innerHTML = '<option value="">Нет доступных годов</option>';
        console.warn('Нет доступных годов для выбора.');
        return;
    }
    yearSelect.innerHTML = years.map(year => `<option value="${year}">${year}</option>`).join('');
    // Удаляем предыдущие слушатели, чтобы не было дублирования
    yearSelect.removeEventListener('change', updateReportsAndCharts); 
    yearSelect.addEventListener('change', updateReportsAndCharts);
    console.log('Заполнен выпадающий список годов:', years);
}

function populateCityDropdowns() {
    const cityStateCombinations = [...new Set(allOrders.map(order => `${order.city}, ${order.state}`))].sort();
    
    if (cityStateCombinations.length === 0) {
        city1Select.innerHTML = '<option value="">Нет доступных городов</option>';
        city2Select.innerHTML = '<option value="">Нет доступных городов</option>';
        cityComparisonSelectionDiv.style.display = 'none';
        console.warn('Нет доступных городов для сравнения.');
        return;
    }

    city1Select.innerHTML = cityStateCombinations.map(city => `<option value="${city}">${city}</option>`).join('');
    city2Select.innerHTML = cityStateCombinations.map(city => `<option value="${city}">${city}</option>`).join('');

    // Select default cities if available (e.g., first two unique cities)
    if (cityStateCombinations.length >= 2) {
        city1Select.value = cityStateCombinations[0];
        city2Select.value = cityStateCombinations[1];
    } else { // If only one city or no cities, select the first for both or hide
        city1Select.value = cityStateCombinations[0];
        city2Select.value = cityStateCombinations[0];
        if (cityStateCombinations.length === 0) {
             cityComparisonSelectionDiv.style.display = 'none';
        }
    }

    city1Select.removeEventListener('change', updateBarChart);
    city2Select.removeEventListener('change', updateBarChart);
    city1Select.addEventListener('change', updateBarChart);
    city2Select.addEventListener('change', updateBarChart);
    console.log('Заполнены выпадающие списки городов:', cityStateCombinations);
}

function updateReportsAndCharts() {
    const selectedYear = parseInt(yearSelect.value);
    if (isNaN(selectedYear)) {
        console.warn('Невалидный год выбран для отчетов.');
        return;
    }
    console.log('Обновление отчетов и графиков для года:', selectedYear);
    generateCityRevenueReport(selectedYear);
    generateSummaryStatistics(selectedYear);
    generatePieChart(selectedYear);
}

function updateBarChart() {
    const selectedCity1 = city1Select.value;
    const selectedCity2 = city2Select.value;

    if (!selectedCity1 || !selectedCity2) {
        console.warn('Не выбраны два города для сравнения.');
        if (myBarChart) myBarChart.destroy(); // Destroy chart if cities are not selected
        return;
    }
    console.log('Обновление столбчатой диаграммы для городов:', selectedCity1, selectedCity2);
    generateBarChart(selectedCity1, selectedCity2);
}

// --- Отчет по городам ---
function generateCityRevenueReport(year) {
    const ordersInYear = allOrders.filter(order => order.year === year);
    if (ordersInYear.length === 0) {
        cityRevenueTableBody.innerHTML = '<tr><td colspan="3">Нет данных за выбранный год.</td></tr>';
        tableYearSpan.textContent = year;
        console.log(`Нет данных о выручке по городам за ${year} год.`);
        return;
    }

    const revenueByCityState = {};
    let totalRevenueForYear = 0;

    ordersInYear.forEach(order => {
        const key = `${order.city}, ${order.state}`;
        revenueByCityState[key] = (revenueByCityState[key] || 0) + order.revenue;
        totalRevenueForYear += order.revenue;
    });

    const sortedCities = Object.entries(revenueByCityState).sort(([, a], [, b]) => b - a);

    cityRevenueTableBody.innerHTML = ''; // Clear previous data
    sortedCities.forEach(([cityState, revenue]) => {
        const percentage = (revenue / totalRevenueForYear * 100).toFixed(2);
        const row = `
            <tr>
                <td>${cityState}</td>
                <td>${revenue.toFixed(2)}</td>
                <td>${percentage}%</td>
            </tr>
        `;
        cityRevenueTableBody.innerHTML += row;
    });
    tableYearSpan.textContent = year;
    console.log(`Отчет по выручке по городам за ${year} год сгенерирован.`);
}

// --- Сводная информация ---
function generateSummaryStatistics(year) {
    const ordersInYear = allOrders.filter(order => order.year === year);
    const totalRevenue = ordersInYear.reduce((sum, order) => sum + order.revenue, 0);
    const totalOrders = ordersInYear.length;
    const uniqueCities = new Set(ordersInYear.map(order => `${order.city}, ${order.state}`)).size;

    summaryYearSpan.textContent = year;
    totalRevenueSummary.textContent = totalRevenue.toFixed(2);
    totalOrdersSummary.textContent = totalOrders;
    uniqueCitiesSummary.textContent = uniqueCities;
    console.log(`Сводная информация за ${year} год сгенерирована.`);
}

// --- Круговая диаграмма ---
function generatePieChart(year) {
    const ordersInYear = allOrders.filter(order => order.year === year);
    if (ordersInYear.length === 0) {
        if (myPieChart) myPieChart.destroy();
        pieChartYearSpan.textContent = year;
        console.log(`Нет данных для круговой диаграммы за ${year} год.`);
        return;
    }

    const revenueByCityState = {};
    let totalRevenueForYear = 0;

    ordersInYear.forEach(order => {
        const key = `${order.city}, ${order.state}`;
        revenueByCityState[key] = (revenueByCityState[key] || 0) + order.revenue;
        totalRevenueForYear += order.revenue;
    });

    const sortedCities = Object.entries(revenueByCityState).sort(([, a], [, b]) => b - a);

    const top10Cities = sortedCities.slice(0, 10);
    const otherCitiesRevenue = sortedCities.slice(10).reduce((sum, [, revenue]) => sum + revenue, 0);

    const labels = top10Cities.map(([cityState]) => cityState);
    const data = top10Cities.map(([, revenue]) => revenue);
    const backgroundColors = top10Cities.map(() => getRandomColor());
    const borderColors = top10Cities.map(() => getRandomColor(0.8));

    if (otherCitiesRevenue > 0) {
        labels.push('Остальные');
        data.push(otherCitiesRevenue);
        backgroundColors.push(getRandomColor()); // Color for 'Others'
        borderColors.push(getRandomColor(0.8));
    }

    const ctx = document.getElementById('revenuePieChart').getContext('2d');

    if (myPieChart) {
        myPieChart.destroy(); // Destroy previous chart instance
    }

    myPieChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: backgroundColors,
                borderColor: borderColors,
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'right',
                },
                title: {
                    display: false, // Title is in H3 above
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.raw;
                            const total = context.dataset.data.reduce((acc, val) => acc + val, 0);
                            const percentage = ((value / total) * 100).toFixed(2);
                            return `${label}: ${value.toFixed(2)} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
    pieChartYearSpan.textContent = year;
    console.log(`Круговая диаграмма за ${year} год сгенерирована.`);
}

// --- Столбиковая диаграмма ---
function generateBarChart(city1Name, city2Name) {
    const ordersForCity1 = allOrders.filter(order => `${order.city}, ${order.state}` === city1Name);
    const ordersForCity2 = allOrders.filter(order => `${order.city}, ${order.state}` === city2Name);

    const years = [...new Set(allOrders.map(order => order.year))].sort((a, b) => a - b);

    const revenueByYearCity1 = {};
    ordersForCity1.forEach(order => {
        revenueByYearCity1[order.year] = (revenueByYearCity1[order.year] || 0) + order.revenue;
    });

    const revenueByYearCity2 = {};
    ordersForCity2.forEach(order => {
        revenueByYearCity2[order.year] = (revenueByYearCity2[order.year] || 0) + order.revenue;
    });

    const dataCity1 = years.map(year => revenueByYearCity1[year] || 0);
    const dataCity2 = years.map(year => revenueByYearCity2[year] || 0);

    const ctx = document.getElementById('cityComparisonBarChart').getContext('2d');

    if (myBarChart) {
        myBarChart.destroy();
    }

    myBarChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: years,
            datasets: [
                {
                    label: city1Name,
                    data: dataCity1,
                    backgroundColor: 'rgba(54, 162, 235, 0.7)', // Blue
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 1
                },
                {
                    label: city2Name,
                    data: dataCity2,
                    backgroundColor: 'rgba(255, 99, 132, 0.7)', // Red
                    borderColor: 'rgba(255, 99, 132, 1)',
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'top',
                },
                title: {
                    display: false,
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Выручка'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Год'
                    }
                }
            }
        }
    });
    console.log(`Столбчатая диаграмма для ${city1Name} и ${city2Name} сгенерирована.`);
}
