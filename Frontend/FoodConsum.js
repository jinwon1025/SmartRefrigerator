import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, ScrollView, FlatList, Dimensions, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { PieChart } from 'react-native-chart-kit';
import { Ionicons } from '@expo/vector-icons';
import { API_URL } from "@env";

const screenWidth = Dimensions.get('window').width;

const COLORS = {
  primary: '#1E3A8A',
  secondary: '#EA580C',
  background: '#F1F5F9',
  text: {
    primary: '#0F172A',
    secondary: '#6B7280',
  },
  white: '#FFFFFF',
  border: '#CBD5E1',
  chart: {
    red: '#DC2626',
    blue: '#2563EB',
    yellow: '#D97706',
    green: '#EA580C',
    purple: '#7C3AED'
  }
};

const NoDataWarning = () => (
  <View style={[styles.chartContent, { alignItems: 'center', justifyContent: 'center', padding: 40 }]}>
    <Ionicons name="alert-circle-outline" size={48} color={COLORS.text.secondary} />
    <Text style={[styles.noDataText, { marginTop: 12 }]}>
      아직 소비된 상품이 없습니다.
    </Text>
  </View>
);

const HistoryItem = ({ item }) => (
  <View style={styles.historyCard}>
    <View style={styles.historyContent}>
      <View style={styles.historyMainInfo}>
        <View style={[styles.historyIconContainer, { backgroundColor: `${COLORS.secondary}20` }]}>
          <Ionicons name="cube-outline" size={24} color={COLORS.secondary} />
        </View>
        <View style={styles.historyTextContainer}>
          <Text style={styles.historyName}>{item.product_name}</Text>
          <View style={styles.categoryInfo}>
            <Text style={styles.categoryMainText}>{item.CLS_NM_1}</Text>
            <Text style={styles.categorySeparator}>›</Text>
            <Text style={styles.categorySubText}>{item.CLS_NM_2}</Text>
          </View>
        </View>
        <View style={[styles.quantityBadge, { backgroundColor: `${COLORS.secondary}15` }]}>
          <Ionicons name="layers-outline" size={16} color={COLORS.secondary} />
          <Text style={[styles.quantityText, { color: COLORS.secondary }]}>
            {item.quantity_used}개
          </Text>
        </View>
      </View>
      <View style={styles.historyFooter}>
        <View style={styles.dateContainer}>
          <Ionicons name="calendar-outline" size={16} color={COLORS.text.secondary} />
          <Text style={styles.dateText}>
            {new Date(item.usage_date).toLocaleDateString()}
          </Text>
        </View>
      </View>
    </View>
  </View>
);

const StatCard = ({ icon, label, value, color }) => (
  <View style={styles.statCard}>
    <View style={[styles.iconContainer, { backgroundColor: `${color}20` }]}>
      <Ionicons name={icon} size={24} color={color} />
    </View>
    <Text style={styles.statLabel}>{label}</Text>
    <Text style={[styles.statValue, { color }]}>
      {value}
      <Text style={styles.statUnit}> 개</Text>
    </Text>
  </View>
);

const ToggleButton = ({ isSelected, onPress, icon, text, color, style }) => (
  <TouchableOpacity
    style={[
      styles.viewToggleButton,
      style,
      isSelected && { backgroundColor: color },
    ]}
    onPress={onPress}
  >
    <Ionicons
      name={icon}
      size={20}
      color={isSelected ? COLORS.white : COLORS.text.secondary}
    />
    <Text style={[
      styles.viewToggleText,
      isSelected && styles.viewToggleTextActive
    ]}>
      {text}
    </Text>
  </TouchableOpacity>
);

const FoodConsum = () => {
  const [consumptionData, setConsumptionData] = useState({ rawData: [], analysis: null });
  const [loading, setLoading] = useState(true);
  const [selectedChart, setSelectedChart] = useState('quantity');
  const [selectedView, setSelectedView] = useState('stats');

  const dynamicStyles = useMemo(() => ({
    viewToggleGroup: {
      flexDirection: 'row',
      borderWidth: 1,
      borderColor: selectedView === 'stats' ? COLORS.primary : COLORS.secondary,
      borderRadius: 12,
      overflow: 'hidden',
    },
    viewToggleButtonLeft: {
      borderRightWidth: 0.5,
      borderRightColor: selectedView === 'stats' ? COLORS.primary : COLORS.secondary,
    },
    viewToggleButtonRight: {
      borderLeftWidth: 0.5,
      borderLeftColor: selectedView === 'stats' ? COLORS.primary : COLORS.secondary,
    },
  }), [selectedView]);

  const handleViewChange = useCallback((view) => {
    setSelectedView(view);
  }, []);

  const handleChartChange = useCallback((chartType) => {
    setSelectedChart(chartType);
  }, []);

  const fetchConsumptionData = useCallback(async () => {
    try {
      const response = await fetch(`http://${API_URL}:3000/consumption-analysis`);
      const data = await response.json();
      setConsumptionData(data);
    } catch (error) {
      console.error('Error fetching consumption data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConsumptionData();
  }, [fetchConsumptionData]);

  const QuantityChart = () => {
    if (!consumptionData.analysis || !consumptionData.analysis.productConsumption ||
      Object.keys(consumptionData.analysis.productConsumption).length === 0) {
      return <NoDataWarning />;
    }

    const colors = [
      COLORS.chart.red,
      COLORS.chart.blue,
      COLORS.chart.yellow,
      COLORS.chart.green,
      COLORS.chart.purple
    ];

    const productData = Object.entries(consumptionData.analysis.productConsumption)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);

    const maxValue = Math.max(...productData.map(([_, value]) => value));
    const totalValue = productData.reduce((sum, [_, value]) => sum + value, 0);

    return (
      <View style={styles.chartContent}>
        {productData.map(([name, value], index) => {
          const percentage = ((value / totalValue) * 100).toFixed(1);
          return (
            <View key={index} style={styles.quantityItem}>
              <View style={styles.quantityNameContainer}>
                <Text style={styles.quantityName}>
                  {name}
                  <Text style={[styles.percentageText, { color: colors[index] }]}>
                    {' '}( {percentage}% )
                  </Text>
                </Text>
              </View>
              <View style={styles.quantityBarContainer}>
                <View style={styles.quantityBarWrapper}>
                  <View
                    style={[
                      styles.quantityBar,
                      {
                        width: `${(value / maxValue) * 90}%`,
                        backgroundColor: colors[index]
                      }
                    ]}
                  />
                </View>
                <Text style={[styles.quantityValue, { color: colors[index] }]}>
                  {value}개
                </Text>
              </View>
            </View>
          );
        })}
      </View>
    );
  };

  const pieChartData = useMemo(() => {
    if (!consumptionData.analysis) return [];
    const colors = [
      COLORS.chart.red,
      COLORS.chart.blue,
      COLORS.chart.yellow,
      COLORS.chart.green,
      COLORS.chart.purple
    ];

    return Object.entries(consumptionData.analysis.consumptionPercentages)
      .sort(([, a], [, b]) => parseFloat(b) - parseFloat(a))
      .slice(0, 5)
      .map(([name, value], index) => ({
        name: name,
        population: parseFloat(value),
        color: colors[index],
        legendFontColor: colors[index],
        legendFontSize: 12
      }));
  }, [consumptionData.analysis]);

  const CustomLegend = ({ data }) => {
    return (
      <View style={styles.legendContainer}>
        {data.map((item, index) => (
          <View key={index} style={styles.legendItem}>
            <View style={[styles.legendSquare, { backgroundColor: item.color }]} />
            <Text style={[styles.legendText, { color: item.color }]}>
              {item.name} ( {item.population.toFixed(1)}% )
            </Text>
          </View>
        ))}
      </View>
    );
  };

  const renderHistoryItem = useCallback(({ item }) => (
    <HistoryItem item={item} />
  ), []);

  const keyExtractor = useCallback((_, index) => index.toString(), []);

  const getItemLayout = useCallback((_, index) => ({
    length: 120,
    offset: 120 * index,
    index,
  }), []);

  const listProps = useMemo(() => ({
    windowSize: 5,
    maxToRenderPerBatch: 5,
    initialNumToRender: 5,
    removeClippedSubviews: true,
  }), []);

  const chartConfig = {
    backgroundColor: COLORS.white,
    backgroundGradientFrom: COLORS.white,
    backgroundGradientTo: COLORS.white,
    color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
    labelColor: () => COLORS.text.primary,
  };

  const renderStatsView = () => (
    <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
      <View style={styles.statsGrid}>
        <StatCard
          icon="cube"
          label="총 소비 품목"
          value={consumptionData.analysis?.totalItems || 0}
          color={COLORS.primary}
        />
        <StatCard
          icon="stats-chart"
          label="총 소비량"
          value={consumptionData.analysis?.totalQuantity || 0}
          color={COLORS.secondary}
        />
      </View>

      <View style={styles.chartContainer}>
        <View style={styles.chartHeader}>
          <View style={styles.chartTitleContainer}>
            <Ionicons name="analytics-outline" size={24} color={COLORS.primary} />
            <Text style={styles.chartTitle}>Top 5 소비 분석</Text>
          </View>

          <View style={styles.chartToggle}>
            <View style={styles.toggleButtonGroup}>
              <TouchableOpacity
                style={[
                  styles.toggleButton,
                  styles.toggleButtonLeft,
                  selectedChart === 'quantity' && styles.toggleButtonActive,
                ]}
                onPress={() => handleChartChange('quantity')}
              >
                <Text style={[
                  styles.toggleButtonText,
                  selectedChart === 'quantity' && styles.toggleButtonTextActive
                ]}>
                  수량
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.toggleButton,
                  styles.toggleButtonRight,
                  selectedChart === 'percentage' && styles.toggleButtonActive,
                ]}
                onPress={() => handleChartChange('percentage')}
              >
                <Text style={[
                  styles.toggleButtonText,
                  selectedChart === 'percentage' && styles.toggleButtonTextActive
                ]}>
                  비율
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {selectedChart === 'quantity' ? (
          <QuantityChart />
        ) : (
          <View style={styles.chartContent}>
            {!pieChartData || pieChartData.length === 0 ? (
              <NoDataWarning />
            ) : (
              <>
                <View style={styles.pieChartWrapper}>
                  <PieChart
                    data={pieChartData}
                    width={screenWidth - 48}
                    height={220}
                    chartConfig={chartConfig}
                    accessor="population"
                    backgroundColor="transparent"
                    paddingLeft="0"
                    center={[(screenWidth - 48) / 4, 0]}
                    absolute
                    hasLegend={false}
                  />
                </View>
                <CustomLegend data={pieChartData} />
              </>
            )}
          </View>
        )}
      </View>
    </ScrollView>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>데이터를 불러오는 중...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.fixedContainer}>
        <Text style={styles.title}>📊 소비 리포트</Text>
        <Text style={styles.subtitle}>리포트 통해 소비 패턴을 파악하세요. </Text>
        <View style={styles.viewToggle}>
          <View style={dynamicStyles.viewToggleGroup}>
            <ToggleButton
              isSelected={selectedView === 'stats'}
              onPress={() => handleViewChange('stats')}
              icon="stats-chart"
              text="통계"
              color={COLORS.primary}
              style={[
                dynamicStyles.viewToggleButtonLeft,
                selectedView === 'stats' && styles.viewToggleButtonActive,
              ]}
            />
            <ToggleButton
              isSelected={selectedView === 'details'}
              onPress={() => handleViewChange('details')}
              icon="list"
              text="상세"
              color={COLORS.secondary}
              style={[
                dynamicStyles.viewToggleButtonRight,
                selectedView === 'details' && { backgroundColor: COLORS.secondary },
              ]}
            />
          </View>
        </View>
      </View>

      {selectedView === 'stats' ? (
        renderStatsView()
      ) : (
        consumptionData.rawData.length === 0 ? (
          <View style={[styles.centerContent, { flex: 1 }]}>
            <NoDataWarning />
          </View>
        ) : (
          <FlatList
            data={consumptionData.rawData}
            renderItem={renderHistoryItem}
            keyExtractor={keyExtractor}
            getItemLayout={getItemLayout}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.historyContainer}
            style={styles.scrollContainer}
            {...listProps}
          />
        )
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  fixedContainer: {
    padding: 16,
    backgroundColor: COLORS.white,
  },
  scrollContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.text.primary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.text.secondary,
    marginBottom: 24,
  },
  viewToggle: {
    marginBottom: 16,
  },
  viewToggleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    gap: 8,
  },
  viewToggleButtonActive: {
    backgroundColor: COLORS.primary,
  },
  viewToggleText: {
    fontSize: 15,
    color: COLORS.text.secondary,
    fontWeight: '500',
  },
  viewToggleTextActive: {
    color: COLORS.white,
    fontWeight: '600',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statLabel: {
    fontSize: 14,
    color: COLORS.text.secondary,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.primary,
  },
  statUnit: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text.secondary,
  },
  chartContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
    marginBottom: 24,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: `${COLORS.primary}15`,
  },
  chartTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.primary,
  },
  chartToggle: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  toggleButtonGroup: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: 8,
    overflow: 'hidden',
  },
  toggleButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  toggleButtonLeft: {
    borderRightWidth: 0.5,
    borderRightColor: COLORS.primary,
  },
  toggleButtonRight: {
    borderLeftWidth: 0.5,
    borderLeftColor: COLORS.primary,
  },
  toggleButtonActive: {
    backgroundColor: COLORS.primary,
  },
  toggleButtonText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '500',
  },
  toggleButtonTextActive: {
    color: COLORS.white,
    fontWeight: '600',
  },
  chartContent: {
    padding: 16,
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 300, // NoDataWarning을 위한 최소 높이 추가
  },
  quantityItem: {
    marginBottom: 20,
    width: '100%',  // 너비 100%로 설정
  },
  quantityNameContainer: {
    marginBottom: 8,
  },
  quantityName: {
    fontSize: 14,
    color: COLORS.text.primary,
    fontWeight: '500',
  },
  percentageText: {
    fontSize: 15,
    fontWeight: '700',
  },
  quantityBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 32,
  },
  quantityBarWrapper: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderRadius: 4,
    overflow: 'hidden',
    marginRight: 12,
  },
  quantityBar: {
    height: '100%',
    borderRadius: 4,
  },
  quantityValue: {
    minWidth: 45,
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'right',
  },
  pieChartWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: 220,
    marginTop: 20,
  },
  legendContainer: {
    width: '100%',
    paddingHorizontal: 20,
    marginTop: 20,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    paddingRight: 10,
  },
  legendSquare: {
    width: 16,
    height: 16,
    marginRight: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 14,
    fontWeight: '600',
  },
  historyContainer: {
    gap: 12,
    paddingBottom: 16,
  },
  historyCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 12,
  },
  historyContent: {
    padding: 16,
  },
  historyMainInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  historyIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  historyTextContainer: {
    flex: 1,
    gap: 4,
  },
  historyName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  categoryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryMainText: {
    fontSize: 14,
    color: COLORS.text.secondary,
    fontWeight: '500',
  },
  categorySeparator: {
    fontSize: 14,
    color: COLORS.text.secondary,
  },
  categorySubText: {
    fontSize: 14,
    color: COLORS.text.secondary,
  },
  quantityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  quantityText: {
    fontSize: 14,
    fontWeight: '600',
  },
  historyFooter: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dateText: {
    fontSize: 14,
    color: COLORS.text.secondary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    padding: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: COLORS.text.secondary,
  },
  noDataText: {
    marginTop: 12,
    fontSize: 15,
    color: COLORS.text.secondary,
    textAlign: 'center',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default FoodConsum;