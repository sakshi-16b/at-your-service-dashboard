// Manage all Chart.js instances and drawing functions with Rupee (₹) currency formatting
class BistroCharts {
    constructor() {
        this.instances = {};
        
        this.themeColors = {
            dark: {
                accent: '#6366f1',
                accentGlow: 'rgba(99, 102, 241, 0.2)',
                accentSolid: '#4f46e5',
                secondary: '#06b6d4',
                secondaryGlow: 'rgba(6, 182, 212, 0.2)',
                success: '#10b981',
                warning: '#f59e0b',
                danger: '#ef4444',
                text: '#94a3b8',
                grid: 'rgba(255, 255, 255, 0.05)',
                tooltipBg: '#1e293b',
                palette: ['#6366f1', '#06b6d4', '#f59e0b', '#ec4899', '#10b981', '#8b5cf6']
            },
            light: {
                accent: '#4f46e5',
                accentGlow: 'rgba(79, 70, 229, 0.15)',
                accentSolid: '#4338ca',
                secondary: '#0891b2',
                secondaryGlow: 'rgba(8, 145, 178, 0.15)',
                success: '#059669',
                warning: '#d97706',
                danger: '#dc2626',
                text: '#64748b',
                grid: 'rgba(0, 0, 0, 0.05)',
                tooltipBg: '#ffffff',
                palette: ['#4f46e5', '#0891b2', '#d97706', '#db2777', '#059669', '#7c3aed']
            }
        };
    }

    getCurrentColors() {
        const isDark = document.body.classList.contains('dark-theme');
        return isDark ? this.themeColors.dark : this.themeColors.light;
    }

    destroyChart(key) {
        if (this.instances[key]) {
            this.instances[key].destroy();
            delete this.instances[key];
        }
    }

    // --- CHART 1: REVENUE TREND (LINE) ---
    drawRevenueTrend(canvasId, trendData) {
        this.destroyChart('revenueTrend');
        
        const ctx = document.getElementById(canvasId).getContext('2d');
        const colors = this.getCurrentColors();
        
        const labels = trendData.map(d => d.date);
        const data = trendData.map(d => d.revenue);
        
        const gradient = ctx.createLinearGradient(0, 0, 0, 300);
        gradient.addColorStop(0, colors.accentGlow);
        gradient.addColorStop(1, 'rgba(99, 102, 241, 0.00)');
        
        this.instances['revenueTrend'] = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Daily Revenue',
                    data: data,
                    borderColor: colors.accent,
                    backgroundColor: gradient,
                    borderWidth: 3,
                    fill: true,
                    tension: 0.35,
                    pointBackgroundColor: colors.accent,
                    pointBorderColor: 'transparent',
                    pointHoverBackgroundColor: '#ffffff',
                    pointHoverBorderColor: colors.accent,
                    pointRadius: 3,
                    pointHoverRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: colors.tooltipBg,
                        titleColor: document.body.classList.contains('dark-theme') ? '#ffffff' : '#000000',
                        bodyColor: colors.text,
                        borderColor: colors.grid,
                        borderWidth: 1,
                        padding: 12,
                        displayColors: false,
                        callbacks: {
                            label: function(context) {
                                return `Revenue: ₹${context.raw.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: {
                            color: colors.text,
                            maxTicksLimit: 8,
                            font: { family: 'Inter' }
                        }
                    },
                    y: {
                        grid: { color: colors.grid },
                        ticks: {
                            color: colors.text,
                            font: { family: 'Inter' },
                            callback: function(value) { return '₹' + value; }
                        }
                    }
                }
            }
        });
    }

    // --- CHART 2: CATEGORY SHARE (DOUGHNUT) ---
    drawCategoryShare(canvasId, categoryData) {
        this.destroyChart('categoryShare');
        
        if (!categoryData || categoryData.length === 0) return;
        
        const ctx = document.getElementById(canvasId).getContext('2d');
        const colors = this.getCurrentColors();
        
        const labels = categoryData.map(d => d.category);
        const data = categoryData.map(d => d.revenue);
        
        this.instances['categoryShare'] = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: colors.palette,
                    borderColor: document.body.classList.contains('dark-theme') ? '#131b2e' : '#ffffff',
                    borderWidth: 3,
                    hoverOffset: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right',
                        labels: {
                            color: colors.text,
                            padding: 16,
                            font: { family: 'Inter', size: 12 }
                        }
                    },
                    tooltip: {
                        backgroundColor: colors.tooltipBg,
                        padding: 12,
                        callbacks: {
                            label: function(context) {
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = ((context.raw / total) * 100).toFixed(1);
                                return ` ${context.label}: ₹${context.raw.toLocaleString()} (${percentage}%)`;
                            }
                        }
                    }
                },
                cutout: '70%'
            }
        });
    }

    // --- CHART 3: TOP ITEMS (HORIZONTAL BAR) ---
    drawTopItems(canvasId, topItemsData) {
        this.destroyChart('topItems');
        
        if (!topItemsData || topItemsData.length === 0) return;
        
        const ctx = document.getElementById(canvasId).getContext('2d');
        const colors = this.getCurrentColors();
        
        const sortedData = [...topItemsData].reverse();
        const labels = sortedData.map(d => d.item_name);
        const data = sortedData.map(d => d.revenue);
        
        this.instances['topItems'] = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: colors.secondary,
                    borderRadius: 6,
                    borderWidth: 0,
                    barThickness: 16
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: colors.tooltipBg,
                        callbacks: {
                            label: function(context) {
                                return ` Revenue: ₹${context.raw.toLocaleString()}`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { color: colors.grid },
                        ticks: {
                            color: colors.text,
                            font: { family: 'Inter' }
                        }
                    },
                    y: {
                        grid: { display: false },
                        ticks: {
                            color: colors.text,
                            font: { family: 'Inter' }
                        }
                    }
                }
            }
        });
    }

    // --- CHART 4: WEEKLY DISTRIBUTION (BAR) ---
    drawWeeklyDistribution(canvasId, weeklyData) {
        this.destroyChart('weeklyDistribution');
        
        if (!weeklyData || weeklyData.length === 0) return;
        
        const ctx = document.getElementById(canvasId).getContext('2d');
        const colors = this.getCurrentColors();
        
        const labels = weeklyData.map(d => d.weekday);
        const data = weeklyData.map(d => d.revenue);
        
        this.instances['weeklyDistribution'] = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Sales Revenue',
                    data: data,
                    backgroundColor: colors.accent,
                    borderRadius: 8,
                    barThickness: 24
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: colors.tooltipBg,
                        callbacks: {
                            label: function(context) {
                                return ` Revenue: ₹${context.raw.toLocaleString()}`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: { color: colors.text, font: { family: 'Inter' } }
                    },
                    y: {
                        grid: { color: colors.grid },
                        ticks: {
                            color: colors.text,
                            font: { family: 'Inter' },
                            callback: function(value) { return '₹' + value; }
                        }
                    }
                }
            }
        });
    }

    // --- CHART 5: HOURLY PEAK (LINE / BAR COMBINED) ---
    drawHourlyPeak(canvasId, hourlyData) {
        this.destroyChart('hourlyPeak');
        
        const ctx = document.getElementById(canvasId).getContext('2d');
        const colors = this.getCurrentColors();
        
        const fullHourlyData = Array.from({ length: 24 }, (_, i) => {
            const match = hourlyData.find(d => d.hour === i);
            return {
                hour: i,
                revenue: match ? match.revenue : 0,
                orders: match ? match.orders : 0
            };
        });
        
        const labels = fullHourlyData.map(d => {
            const h = d.hour;
            if (h === 0) return '12 AM';
            if (h === 12) return '12 PM';
            return h > 12 ? `${h - 12} PM` : `${h} AM`;
        });
        const revenueData = fullHourlyData.map(d => d.revenue);
        const orderData = fullHourlyData.map(d => d.orders);
        
        this.instances['hourlyPeak'] = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        type: 'line',
                        label: 'Orders Count',
                        data: orderData,
                        borderColor: colors.secondary,
                        borderWidth: 2.5,
                        pointRadius: 2,
                        fill: false,
                        yAxisID: 'y1'
                    },
                    {
                        type: 'bar',
                        label: 'Revenue (₹)',
                        data: revenueData,
                        backgroundColor: colors.accentGlow,
                        borderColor: colors.accent,
                        borderWidth: 1.5,
                        borderRadius: 4,
                        yAxisID: 'y'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        labels: { color: colors.text, font: { family: 'Inter' } }
                    },
                    tooltip: { backgroundColor: colors.tooltipBg }
                },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: { color: colors.text, font: { family: 'Inter' }, maxTicksLimit: 12 }
                    },
                    y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        grid: { color: colors.grid },
                        ticks: {
                            color: colors.text,
                            font: { family: 'Inter' },
                            callback: function(value) { return '₹' + value; }
                        }
                    },
                    y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        grid: { drawOnChartArea: false },
                        ticks: {
                            color: colors.text,
                            font: { family: 'Inter' }
                        }
                    }
                }
            }
        });
    }

    // --- CHART 6: FORECAST WITH CONFIDENCE BAND ---
    drawForecast(canvasId, historicalData, forecastData) {
        this.destroyChart('forecast');
        
        if (!historicalData || historicalData.length === 0 || !forecastData || forecastData.length === 0) return;
        
        const ctx = document.getElementById(canvasId).getContext('2d');
        const colors = this.getCurrentColors();
        
        const historySlice = historicalData.slice(-14);
        const histLabels = historySlice.map(d => d.date);
        const foreLabels = forecastData.map(d => d.date);
        const allLabels = [...histLabels, ...foreLabels];
        
        const histPoints = historySlice.map(d => d.revenue);
        const histDataset = [...histPoints, ...Array(forecastData.length).fill(null)];
        
        const lastHistVal = histPoints[histPoints.length - 1];
        const forePoints = forecastData.map(d => d.revenue);
        const foreDataset = [...Array(histPoints.length - 1).fill(null), lastHistVal, ...forePoints];
        
        const upperPoints = forecastData.map(d => d.confidence_upper);
        const upperDataset = [...Array(histPoints.length - 1).fill(null), lastHistVal, ...upperPoints];
        
        const lowerPoints = forecastData.map(d => d.confidence_lower);
        const lowerDataset = [...Array(histPoints.length - 1).fill(null), lastHistVal, ...lowerPoints];
        
        this.instances['forecast'] = new Chart(ctx, {
            type: 'line',
            data: {
                labels: allLabels,
                datasets: [
                    {
                        label: 'Historical Sales',
                        data: histDataset,
                        borderColor: colors.text,
                        borderWidth: 2,
                        fill: false,
                        pointRadius: 3
                    },
                    {
                        label: 'Forecasted Sales',
                        data: foreDataset,
                        borderColor: colors.accent,
                        borderWidth: 3,
                        borderDash: [5, 5],
                        fill: false,
                        pointRadius: 4,
                        pointBackgroundColor: colors.accent
                    },
                    {
                        label: 'Upper Confidence',
                        data: upperDataset,
                        borderColor: 'transparent',
                        pointRadius: 0,
                        fill: false
                    },
                    {
                        label: 'Confidence Band (90%)',
                        data: lowerDataset,
                        borderColor: 'transparent',
                        pointRadius: 0,
                        backgroundColor: colors.accentGlow,
                        fill: '-1'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        labels: {
                            color: colors.text,
                            font: { family: 'Inter' },
                            filter: function(item) {
                                return item.text !== 'Upper Confidence';
                            }
                        }
                    },
                    tooltip: {
                        backgroundColor: colors.tooltipBg,
                        callbacks: {
                            label: function(context) {
                                if (context.datasetIndex === 0) {
                                    return `Historical Sales: ₹${context.raw}`;
                                } else if (context.datasetIndex === 1) {
                                    return `Forecast: ₹${context.raw}`;
                                } else if (context.datasetIndex === 3) {
                                    const index = context.dataIndex;
                                    const upperVal = context.chart.data.datasets[2].data[index];
                                    const lowerVal = context.raw;
                                    return `Confidence Range: ₹${lowerVal} - ₹${upperVal}`;
                                }
                                return null;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: { color: colors.text, font: { family: 'Inter' } }
                    },
                    y: {
                        grid: { color: colors.grid },
                        ticks: {
                            color: colors.text,
                            font: { family: 'Inter' },
                            callback: function(value) { return '₹' + value; }
                        }
                    }
                }
            }
        });
    }
}
