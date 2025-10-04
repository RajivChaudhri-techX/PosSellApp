import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { reportsAPI, transactionsAPI } from '../services/api';

const ReportsScreen = () => {
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState({
    totalSales: 0,
    totalTransactions: 0,
    avgTransaction: 0,
    profitMargin: 0,
    topProducts: [],
    recentTransactions: [],
    salesTrends: [],
  });
  const [selectedPeriod, setSelectedPeriod] = useState('month');

  useEffect(() => {
    loadReports();
  }, [selectedPeriod]);

  const loadReports = async () => {
    setLoading(true);
    try {
      // Calculate date range based on selected period
      const now = new Date();
      let startDate, endDate;

      switch (selectedPeriod) {
        case 'today':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
          break;
        case 'week':
          const weekStart = new Date(now);
          weekStart.setDate(now.getDate() - now.getDay());
          startDate = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate());
          endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
          break;
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
          break;
        default:
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      }

      // Load sales report
      const salesResponse = await reportsAPI.get('/sales', {
        params: {
          start_date: startDate.toISOString().split('T')[0],
          end_date: endDate.toISOString().split('T')[0],
        }
      });

      // Load sales trends for chart
      const trendsResponse = await reportsAPI.get('/charts/sales-trends', {
        params: {
          start_date: startDate.toISOString().split('T')[0],
          end_date: endDate.toISOString().split('T')[0],
          group_by: 'day'
        }
      });

      const summary = salesResponse.data.summary;
      const trends = trendsResponse.data.map(item => ({
        period: new Date(item.period).toLocaleDateString(),
        sales: parseFloat(item.sales)
      }));

      // Load transactions for top products and recent
      const transactionsResponse = await transactionsAPI.getTransactions({
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
      });

      const transactions = transactionsResponse.transactions || [];

      // Calculate top products
      const productSales = {};
      transactions.forEach(transaction => {
        transaction.TransactionItems?.forEach(item => {
          const productId = item.product_id;
          const productName = item.Product?.name || 'Unknown Product';
          const quantity = item.quantity;
          const revenue = parseFloat(item.total_price);

          if (!productSales[productId]) {
            productSales[productId] = {
              name: productName,
              quantity: 0,
              revenue: 0,
            };
          }
          productSales[productId].quantity += quantity;
          productSales[productId].revenue += revenue;
        });
      });

      const topProducts = Object.values(productSales)
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);

      // Get recent transactions (last 10)
      const recentTransactions = transactions.slice(0, 10);

      setReportData({
        totalSales: summary.total_sales || 0,
        totalTransactions: summary.total_transactions || 0,
        avgTransaction: summary.avg_transaction || 0,
        profitMargin: summary.profit_margin || 0,
        topProducts,
        recentTransactions,
        salesTrends: trends,
      });
    } catch (error) {
      console.error('Error loading reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return `$${parseFloat(amount).toFixed(2)}`;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderPeriodButtons = () => (
    <View style={styles.periodSelector}>
      {['today', 'week', 'month'].map(period => (
        <TouchableOpacity
          key={period}
          style={[
            styles.periodButton,
            selectedPeriod === period && styles.periodButtonActive
          ]}
          onPress={() => setSelectedPeriod(period)}
        >
          <Text style={[
            styles.periodButtonText,
            selectedPeriod === period && styles.periodButtonTextActive
          ]}>
            {period.charAt(0).toUpperCase() + period.slice(1)}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderSummaryCards = () => (
    <View style={styles.summaryContainer}>
      <View style={styles.summaryCard}>
        <Text style={styles.summaryValue}>{formatCurrency(reportData.totalSales)}</Text>
        <Text style={styles.summaryLabel}>Total Sales</Text>
      </View>
      <View style={styles.summaryCard}>
        <Text style={styles.summaryValue}>{reportData.totalTransactions}</Text>
        <Text style={styles.summaryLabel}>Transactions</Text>
      </View>
      <View style={styles.summaryCard}>
        <Text style={styles.summaryValue}>{formatCurrency(reportData.avgTransaction)}</Text>
        <Text style={styles.summaryLabel}>Avg Transaction</Text>
      </View>
      <View style={styles.summaryCard}>
        <Text style={styles.summaryValue}>{reportData.profitMargin.toFixed(2)}%</Text>
        <Text style={styles.summaryLabel}>Profit Margin</Text>
      </View>
    </View>
  );

  const renderTopProducts = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Top Products</Text>
      {reportData.topProducts.length === 0 ? (
        <Text style={styles.emptyText}>No sales data available</Text>
      ) : (
        reportData.topProducts.map((product, index) => (
          <View key={index} style={styles.productItem}>
            <View style={styles.productInfo}>
              <Text style={styles.productName}>{product.name}</Text>
              <Text style={styles.productStats}>
                {product.quantity} units • {formatCurrency(product.revenue)}
              </Text>
            </View>
            <Text style={styles.productRank}>#{index + 1}</Text>
          </View>
        ))
      )}
    </View>
  );

  const renderSalesChart = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Sales Trends</Text>
      {reportData.salesTrends.length === 0 ? (
        <Text style={styles.emptyText}>No trend data available</Text>
      ) : (
        <LineChart
          data={{
            labels: reportData.salesTrends.map(item => item.period),
            datasets: [{
              data: reportData.salesTrends.map(item => item.sales)
            }]
          }}
          width={Dimensions.get('window').width - 40}
          height={220}
          chartConfig={{
            backgroundColor: '#fff',
            backgroundGradientFrom: '#fff',
            backgroundGradientTo: '#fff',
            decimalPlaces: 2,
            color: (opacity = 1) => `rgba(0, 123, 255, ${opacity})`,
            labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
            style: {
              borderRadius: 16
            },
            propsForDots: {
              r: '6',
              strokeWidth: '2',
              stroke: '#007bff'
            }
          }}
          bezier
          style={{
            marginVertical: 8,
            borderRadius: 16
          }}
        />
      )}
    </View>
  );

  const renderRecentTransactions = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Recent Transactions</Text>
      {reportData.recentTransactions.length === 0 ? (
        <Text style={styles.emptyText}>No transactions found</Text>
      ) : (
        reportData.recentTransactions.map((transaction) => (
          <View key={transaction.id} style={styles.transactionItem}>
            <View style={styles.transactionInfo}>
              <Text style={styles.transactionId}>#{transaction.id}</Text>
              <Text style={styles.transactionDate}>
                {formatDate(transaction.created_at)}
              </Text>
            </View>
            <Text style={styles.transactionAmount}>
              {formatCurrency(transaction.total_amount)}
            </Text>
          </View>
        ))
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007bff" />
        <Text style={styles.loadingText}>Loading reports...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Reports</Text>

      {renderPeriodButtons()}
      {renderSummaryCards()}
      {renderSalesChart()}
      {renderTopProducts()}
      {renderRecentTransactions()}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 15,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  periodSelector: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20,
  },
  periodButton: {
    padding: 10,
    marginHorizontal: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
  },
  periodButtonActive: {
    backgroundColor: '#007bff',
    borderColor: '#007bff',
  },
  periodButtonText: {
    fontSize: 16,
    color: '#666',
  },
  periodButtonTextActive: {
    color: '#fff',
  },
  summaryContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 8,
    marginHorizontal: 5,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007bff',
    marginBottom: 5,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
  },
  section: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
    fontStyle: 'italic',
  },
  productItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 3,
  },
  productStats: {
    fontSize: 14,
    color: '#666',
  },
  productRank: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#007bff',
  },
  transactionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  transactionInfo: {
    flex: 1,
  },
  transactionId: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 3,
  },
  transactionDate: {
    fontSize: 14,
    color: '#666',
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#28a745',
  },
});

export default ReportsScreen;