// Enhanced JavaScript for handling stock predictions with company-specific data
document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const stockForm = document.getElementById('stock-form');
    const stockSymbolInput = document.getElementById('stock-symbol');
    const loadingElement = document.getElementById('loading');
    const errorElement = document.getElementById('error-message');
    const errorTextElement = document.getElementById('error-text');
    const resultsElement = document.getElementById('results');
    
    // Company Info Elements
    const companyNameElement = document.getElementById('company-name');
    const stockTickerElement = document.getElementById('stock-ticker');
    
    // Price Elements
    const pastWeekPriceElement = document.getElementById('past-week-price');
    const pastWeekChangeElement = document.getElementById('past-week-change');
    const currentPriceElement = document.getElementById('current-price');
    const predictionPriceElement = document.getElementById('prediction-price');
    const predictionChangeElement = document.getElementById('prediction-change');
    
    // Table Element
    const predictionTableBody = document.getElementById('prediction-table-body');
    
    // Chart Element
    const priceChartCanvas = document.getElementById('price-chart');
    let priceChart = null;
    
    // Form Submit Handler
    stockForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const stockSymbol = stockSymbolInput.value.trim();
        if (!stockSymbol) {
            showError('Please enter a stock symbol');
            return;
        }
        
        // Reset UI
        resetUI();
        
        // Show loading
        loadingElement.classList.remove('hidden');
        
        // Fetch stock data
        fetchStockData(stockSymbol);
    });
    
    // Fetch Stock Data
    function fetchStockData(stockSymbol) {
        const formData = new FormData();
        formData.append('stock_symbol', stockSymbol);
        
        fetch('/predict', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            // Hide loading
            loadingElement.classList.add('hidden');
            
            if (data.error) {
                showError(data.error);
                console.error('Error details:', data.traceback);
                return;
            }
            
            // Display results
            displayResults(data);
        })
        .catch(error => {
            loadingElement.classList.add('hidden');
            showError('An error occurred while fetching data. Please try again.');
            console.error('Error:', error);
        });
    }
    
    // Display Results
    function displayResults(data) {
        // Show results container
        resultsElement.classList.remove('hidden');
        
        // Set company info
        companyNameElement.textContent = data.company_name;
        stockTickerElement.textContent = `Ticker: ${data.stock_symbol}`;
        
        // Format currency
        const formatter = new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        });
        
        // Set current price
        currentPriceElement.textContent = formatter.format(data.current_price);
        
        // Set past week price (first day of past week)
        const pastWeekFirstPrice = data.past_week.prices[0];
        const pastWeekLastPrice = data.past_week.prices[data.past_week.prices.length - 1];
        pastWeekPriceElement.textContent = formatter.format(pastWeekFirstPrice);
        
        // Set past week change
        const pastWeekChange = data.past_week.change_percent;
        pastWeekChangeElement.textContent = `${pastWeekChange.toFixed(2)}%`;
        pastWeekChangeElement.classList.add(pastWeekChange >= 0 ? 'positive' : 'negative');
        
        // Set prediction price (last day of next week)
        const predictionLastPrice = data.next_week.predictions[data.next_week.predictions.length - 1];
        predictionPriceElement.textContent = formatter.format(predictionLastPrice);
        
        // Set prediction change
        const predictionChange = data.next_week.change_percent;
        predictionChangeElement.textContent = `${predictionChange.toFixed(2)}%`;
        predictionChangeElement.classList.add(predictionChange >= 0 ? 'positive' : 'negative');
        
        // Populate prediction table
        predictionTableBody.innerHTML = '';
        data.next_week.dates.forEach((date, index) => {
            const row = document.createElement('tr');
            
            const dateCell = document.createElement('td');
            dateCell.textContent = date;
            
            const priceCell = document.createElement('td');
            priceCell.textContent = formatter.format(data.next_week.predictions[index]);
            
            // Add daily change column
            const changeCell = document.createElement('td');
            if (index === 0) {
                const dailyChange = ((data.next_week.predictions[index] - data.current_price) / data.current_price) * 100;
                changeCell.textContent = `${dailyChange.toFixed(2)}%`;
                changeCell.className = dailyChange >= 0 ? 'positive' : 'negative';
            } else {
                const dailyChange = ((data.next_week.predictions[index] - data.next_week.predictions[index-1]) / data.next_week.predictions[index-1]) * 100;
                changeCell.textContent = `${dailyChange.toFixed(2)}%`;
                changeCell.className = dailyChange >= 0 ? 'positive' : 'negative';
            }
            
            row.appendChild(dateCell);
            row.appendChild(priceCell);
            row.appendChild(changeCell);
            
            predictionTableBody.appendChild(row);
        });
        
        // Create chart
        createChart(data);
    }
    
    // Create Chart
    function createChart(data) {
        // Combine past week and prediction data
        const labels = [...data.past_week.dates, ...data.next_week.dates];
        const actualPrices = [...data.past_week.prices, null, null, null, null, null, null, null];
        const predictedPrices = [null, null, null, null, null, null, null, ...data.next_week.predictions];
        
        // Destroy existing chart if it exists
        if (priceChart) {
            priceChart.destroy();
        }
        
        // Create gradient for chart background
        const ctx = priceChartCanvas.getContext('2d');
        const gradientActual = ctx.createLinearGradient(0, 0, 0, 400);
        gradientActual.addColorStop(0, 'rgba(52, 152, 219, 0.3)');
        gradientActual.addColorStop(1, 'rgba(52, 152, 219, 0.0)');
        
        const gradientPredicted = ctx.createLinearGradient(0, 0, 0, 400);
        gradientPredicted.addColorStop(0, 'rgba(46, 204, 113, 0.3)');
        gradientPredicted.addColorStop(1, 'rgba(46, 204, 113, 0.0)');
        
        // Create new chart
        priceChart = new Chart(priceChartCanvas, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Actual Price',
                        data: actualPrices,
                        borderColor: '#3498db',
                        backgroundColor: gradientActual,
                        borderWidth: 2,
                        pointRadius: 3,
                        tension: 0.3,
                        fill: true
                    },
                    {
                        label: 'Predicted Price',
                        data: predictedPrices,
                        borderColor: '#2ecc71',
                        backgroundColor: gradientPredicted,
                        borderWidth: 2,
                        pointRadius: 3,
                        tension: 0.3,
                        borderDash: [5, 5],
                        fill: true
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    intersect: false,
                    mode: 'index'
                },
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            usePointStyle: true,
                            padding: 20
                        }
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        callbacks: {
                            label: function(context) {
                                if (context.raw === null) {
                                    return '';
                                }
                                return context.dataset.label + ': $' + context.raw.toFixed(2);
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            maxRotation: 45,
                            minRotation: 45
                        }
                    },
                    y: {
                        beginAtZero: false,
                        ticks: {
                            callback: function(value) {
                                return '$' + value.toFixed(2);
                            }
                        },
                        grid: {
                            borderDash: [5, 5]
                        }
                    }
                }
            }
        });
    }
    
    // Show Error
    function showError(message) {
        errorTextElement.textContent = message;
        errorElement.classList.remove('hidden');
    }
    
    // Reset UI
    function resetUI() {
        errorElement.classList.add('hidden');
        resultsElement.classList.add('hidden');
        
        // Reset classes
        pastWeekChangeElement.classList.remove('positive', 'negative');
        predictionChangeElement.classList.remove('positive', 'negative');
        
        // Clear table
        predictionTableBody.innerHTML = '';
        
        // Destroy chart if it exists
        if (priceChart) {
            priceChart.destroy();
            priceChart = null;
        }
    }
});
