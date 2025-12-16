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
    const file = event.target.files[0];
    if (file) {
        Papa.parse(file, {
            header: true,
            dynamicTyping: true, // Tries to convert values to numbers, booleans, etc.
            skipEmptyLines: true,
            complete: function(results) {
                // Ensure 'order_date', 'revenue', 'city', 'state' columns exist
                const requiredHeaders = ['order_date', 'revenue', 'city', 'state'];
                const headers = results.meta.fields;
                const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));

                if (missingHeaders.length > 0) {
                    alert(`Ошибка: Отсутствуют необходимые столбцы в CSV файле: ${missingHeaders.join(', ')}. Пожалуйста, убедитесь, что файл содержит столбцы 'order_date', 'revenue', 'city', 'state'.`);
                    resetUI();
                    return;
                }

                allOrders = results.data.map(row => ({
                    order_id: row.order_id,
                    customer_id: row.customer_id,
                    order_date: new Date(row.order_date),
                    year: new Date(row.order_date).getFullYear(),
                    revenue: parseFloat(row.revenue) || 0, // Ensure revenue is a number
                    city: row.city,
                    state: row.state
                })).filter(order => order.revenue > 0 && !isNaN(order.year)); // Filter out invalid revenue or date entries

                if (allOrders.length === 0) {
                    alert('Файл CSV пуст или не содержит валидных данных о заказах.');
                    resetUI();
                    return;
                }
                
                populateYearDropdown();
                populateCityDropdowns();
                dataDisplay.style.display = 'block';
                yearSelectionDiv.style.display = 'block';
                cityComparisonSelectionDiv.style.display = 'flex'; // Use flex for this group
                
                // Trigger initial reports for the first available year
                if (yearSelect.value) {
                    updateReportsAndCharts();
                }
                if (city1Select.value && city2Select.value) {
                    updateBarChart();
                }
            },
            error: function(error) {
                alert('Ошибка при парсинге CSV файла: ' + error.message);
                resetUI();
            }
        });
    }
}

function resetUI() {
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
    yearSelect.innerHTML = years.map(year => `<option value="${year}">${year}</option>`).join('');
    yearSelect.removeEventListener('change', updateReportsAndCharts); // Remove previous listener to avoid duplicates
    yearSelect.addEventListener('change', updateReportsAndCharts);
}

function populateCityDropdowns() {
    const cityStateCombinations = [...new Set(allOrders.map(order => `${order.city}, ${order.state}`))].sort();
    
    city1Select.innerHTML = cityStateCombinations.map(city => `<option value="${city}">${city}</option>`).join('');
    city2Select.innerHTML = cityStateCombinations.map(city => `<option value="${city}">${city}</option>`).join('');

    // Select default cities if available (e.g., first two unique cities)
    if (cityStateCombinations.length >= 2) {
        city1Select.value = cityStateCombinations[0];
        city2Select.value = cityStateCombinations[1];
    } else if (cityStateCombinations.length === 1) {
        city1Select.value = cityStateCombinations[0];
        city2Select.value = cityStateCombinations[0]; // If only one city, compare it to itself
    } else {
        cityComparisonSelectionDiv.style.display = 'none'; // No cities to compare
    }

    city1Select.removeEventListener('change', updateBarChart);
    city2Select.removeEventListener('change', updateBarChart);
    city1Select.addEventListener('change', updateBarChart);
    city2Select.addEventListener('change', updateBarChart);
}

function updateReportsAndCharts() {
    const selectedYear = parseInt(yearSelect.value);
    if (isNaN(selectedYear)) return;

    generateCityRevenueReport(selectedYear);
    generateSummaryStatistics(selectedYear);
    generatePieChart(selectedYear);
}

function updateBarChart() {
    const selectedCity1 = city1Select.value;
    const selectedCity2 = city2Select.value;

    if (!selectedCity1 || !selectedCity2) return;
    generateBarChart(selectedCity1, selectedCity2);
}

// --- Отчет по городам ---
function generateCityRevenueReport(year) {
    const ordersInYear = allOrders.filter(order => order.year === year);
    if (ordersInYear.length === 0) {
        cityRevenueTableBody.innerHTML = '<tr><td colspan="3">Нет данных за выбранный год.</td></tr>';
        tableYearSpan.textContent = year;
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
}

// --- Круговая диаграмма ---
function generatePieChart(year) {
    const ordersInYear = allOrders.filter(order => order.year === year);
    if (ordersInYear.length === 0) {
        if (myPieChart) myPieChart.destroy();
        pieChartYearSpan.textContent = year;
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
}
