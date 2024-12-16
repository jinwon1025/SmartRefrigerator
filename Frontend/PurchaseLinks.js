import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, StyleSheet, Linking, Dimensions, PixelRatio, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { API_URL } from "@env";

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = SCREEN_WIDTH / 360;

const normalize = (size) => {
  const newSize = size * scale;
  if (Platform.OS === 'ios') {
    return Math.round(PixelRatio.roundToNearestPixel(newSize));
  }
  return Math.round(PixelRatio.roundToNearestPixel(newSize)) - 2;
};

const COLORS = {
  primary: '#4dabf7',
  background: '#F9FAFB',
  text: {
    primary: '#343a40',
    secondary: '#6B7280',
    loading: '#6B7280',
  },
  white: '#FFFFFF',
  border: '#CBD5E1',
  accent: {
    primary: '#6366F1',
    blue: '#0EA5E9',
    violet: '#8B5CF6',
    mint: '#2DD4BF',
    rose: '#FB7185',
  },
  expirationColors: {
    sevenDays: '#e03131',
    fourteenDays: '#f76707',
    twentyOneDays: '#e8b30f',
    twentyEightDays: '#37b24d',
  },
};

const DAY_OPTIONS = [7, 14, 21, 28];

const PurchaseLink = () => {
  const [products, setProducts] = useState([]);
  const [similarProducts, setSimilarProducts] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState({});
  const [selectedDays, setSelectedDays] = useState(7);

  useEffect(() => {
    fetchExpiringProducts(selectedDays);
  }, [selectedDays]);

  const getExpirationColor = (diffDays) => {
    if (diffDays <= 7) return COLORS.expirationColors.sevenDays;
    if (diffDays <= 14) return COLORS.expirationColors.fourteenDays;
    if (diffDays <= 21) return COLORS.expirationColors.twentyOneDays;
    return COLORS.expirationColors.twentyEightDays;
  };

  const formatExpirationDate = (dateString) => {
    const expirationDate = new Date(dateString);
    const today = new Date();

    const expDate = new Date(expirationDate.getFullYear(), expirationDate.getMonth(), expirationDate.getDate());
    const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const diffTime = expDate - todayDate;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    const year = expirationDate.getFullYear();
    const month = expirationDate.getMonth() + 1;
    const day = expirationDate.getDate();

    let remainingText = '';
    if (diffDays < 0) {
      remainingText = '유통기한 만료';
    } else if (diffDays === 0) {
      remainingText = '오늘 만료';
    } else {
      remainingText = `${diffDays}일 남음`;
    }

    return {
      dateText: `${year}년 ${month}월 ${day}일`,
      remainingText: remainingText,
      diffDays: diffDays
    };
  };

  const getStatusText = (diffDays) => {
    if (diffDays <= 7) return '매우 임박';
    if (diffDays <= 14) return '임박';
    if (diffDays <= 21) return '여유';
    return '충분';
  };

  const filterProductsByDays = (products, selectedDays) => {
    return products
      .map(product => {
        const { diffDays } = formatExpirationDate(product.expiration_date);
        return { ...product, diffDays };
      })
      .filter(product => product.diffDays <= selectedDays)
      .sort((a, b) => a.diffDays - b.diffDays);
  };

  const fetchExpiringProducts = (days) => {
    setLoading(true);
    axios.get(`http://${API_URL}:3000/expiring-products`)
      .then(response => {
        console.log("Server response:", response.data);
        const filteredProducts = filterProductsByDays(response.data, days);
        // 1.5초 딜레이 추가
        setTimeout(() => {
          setProducts(filteredProducts);
          setLoading(false);  // 로딩 상태를 여기서 변경
        }, 1500);
      })
      .catch(error => {
        console.error("Error fetching products:", error);
        setLoading(false);
      });

  };

  const fetchSimilarProducts = async (productName) => {
    if (similarProducts[productName]) {
      setSimilarProducts(prev => {
        const newState = { ...prev };
        delete newState[productName];
        return newState;
      });
      return;
    }

    setLoadingProducts(prev => ({ ...prev, [productName]: true }));
    try {
      const response = await axios.post(`http://${API_URL}:3000/similar-products`, { productName });
      // 1.5초 딜레이 추가
      await new Promise(resolve => setTimeout(resolve, 1500));

      setSimilarProducts(prev => ({
        ...prev,
        [productName]: response.data.map(item => ({
          name: item.name.replace(/<[^>]*>/g, ''),
          price: parseInt(item.price),
          link: item.link
        }))
      }));
    } catch (error) {
      console.error("Error fetching similar products:", error);
      setSimilarProducts(prev => ({ ...prev, [productName]: null }));
    } finally {
      setLoadingProducts(prev => ({ ...prev, [productName]: false }));
    }
  };

  const openLink = async (url) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      }
    } catch (error) {
      console.error("Error opening URL:", error);
    }
  };

  const renderProductCard = ({ item }) => {
    const { dateText, remainingText, diffDays } = formatExpirationDate(item.expiration_date);
    const expirationColor = getExpirationColor(diffDays);
    const statusText = getStatusText(diffDays);

    return (
      <View style={[styles.categoryContainer, { borderColor: '#CBD5E1' }]}>
        <View style={[styles.categoryHeader, { backgroundColor: `${expirationColor}15` }]}>
          <View style={styles.categoryTitleContainer}>
            <Ionicons
              name="time-outline"
              size={18}
              color={expirationColor}
              style={styles.categoryIcon}
            />
            <Text style={[styles.categoryTitle, { color: expirationColor }]}>
              {item.product_name}
            </Text>
          </View>
        </View>

        <View style={styles.nutrientsList}>
          <View style={[styles.nutrientItem, { borderColor: '#CBD5E1' }]}>
            <View style={styles.nutrientMainInfo}>
              <View style={[styles.iconContainer, { backgroundColor: `${expirationColor}20`, borderColor: '#CBD5E1' }]}>
                <Ionicons name="calendar-outline" size={16} color={expirationColor} />
              </View>
              <Text style={styles.nutrientLabel}>유통기한</Text>
            </View>
            <View style={styles.nutrientValueContainer}>
              <Text style={[styles.nutrientValue, { color: expirationColor }]}>
                {dateText}
              </Text>
            </View>
          </View>

          <View style={[styles.nutrientItem, { borderColor: '#CBD5E1' }]}>
            <View style={styles.nutrientMainInfo}>
              <View style={[styles.iconContainer, { backgroundColor: `${expirationColor}20`, borderColor: '#CBD5E1' }]}>
                <Ionicons name="hourglass-outline" size={16} color={expirationColor} />
              </View>
              <Text style={styles.nutrientLabel}>남은 기간</Text>
            </View>
            <View style={styles.nutrientValueContainer}>
              <Text style={[styles.nutrientValue, { color: expirationColor }]}>
                {remainingText}
                <Text style={styles.statusText}> ({statusText})</Text>
              </Text>
            </View>
          </View>

          {loadingProducts[item.product_name] && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#6B7280" />
              <Text style={[styles.loadingText, { color: '#6B7280' }]}>
                유사 상품 목록을 가져오고 있습니다...
              </Text>
            </View>
          )}

          {!loadingProducts[item.product_name] && similarProducts[item.product_name] === null && (
            <>
              <Text style={styles.errorText}>오류가 발생했습니다. 잠시 후 다시 시도해 주세요.</Text>
              <TouchableOpacity
                style={[styles.recommendButton, { backgroundColor: `${expirationColor}90` }]}
                onPress={() => fetchSimilarProducts(item.product_name)}
              >
                <Ionicons name="cart-outline" size={16} color={COLORS.white} />
                <Text style={styles.recommendButtonText}>추천 상품 보기</Text>
              </TouchableOpacity>
            </>
          )}

          {!loadingProducts[item.product_name] && similarProducts[item.product_name] === undefined && (
            <TouchableOpacity
              style={[styles.recommendButton, { backgroundColor: `${expirationColor}90` }]}
              onPress={() => fetchSimilarProducts(item.product_name)}
            >
              <Ionicons name="cart-outline" size={16} color={COLORS.white} />
              <Text style={styles.recommendButtonText}>추천 상품 보기</Text>
            </TouchableOpacity>
          )}

          {similarProducts[item.product_name] && (
            <View style={styles.similarProductsContainer}>
              {similarProducts[item.product_name].map((product, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.similarProductCard}
                  onPress={() => openLink(product.link)}
                >
                  <Text style={styles.similarProductTitle} numberOfLines={1}>
                    {product.name}
                  </Text>
                  <View style={styles.similarProductFooter}>
                    <Text style={[styles.similarProductPrice, { color: expirationColor }]}>
                      {product.price.toLocaleString()}원
                    </Text>
                    <View style={styles.purchaseLinkButton}>
                      <Text style={[styles.purchaseLinkText, { color: expirationColor }]}>구매하기</Text>
                      <Ionicons name="open-outline" size={16} color={expirationColor} />
                    </View>
                  </View>
                </TouchableOpacity>
              ))}

              <TouchableOpacity
                style={[styles.hideButton, { backgroundColor: `${expirationColor}15` }]}
                onPress={() => fetchSimilarProducts(item.product_name)}
              >
                <Ionicons name="close-outline" size={16} color={expirationColor} />
                <Text style={[styles.hideButtonText, { color: expirationColor }]}>
                  추천 상품 숨기기
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🛒 스마트 쇼핑 </Text>
      <Text style={styles.subtitle}>유통기한 임박 상품을 빠르게 구매하세요 </Text>

      <View style={styles.daysButtonContainer}>
        <Text style={styles.daysButtonLabel}>유통기한 남은 기간 선택</Text>
        <View style={styles.daysButtonGroup}>
          {DAY_OPTIONS.map((days) => (
            <TouchableOpacity
              key={days}
              style={[
                styles.daysButton,
                {
                  backgroundColor: selectedDays === days
                    ? COLORS.expirationColors[`${days}Days`.replace(/(\d+)/, (match) => {
                      const num = parseInt(match);
                      const words = ['seven', 'fourteen', 'twentyOne', 'twentyEight'];
                      return words[DAY_OPTIONS.indexOf(num)];
                    })]
                    : '#CBD5E1'
                }
              ]}
              onPress={() => setSelectedDays(days)}
            >
              <Text
                style={[
                  styles.daysButtonText,
                  { color: selectedDays === days ? COLORS.white : COLORS.text.primary }
                ]}
              >
                {days}일
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {loading ? (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={COLORS.accent.primary} />
          <Text style={styles.loadingText}>
            유통기한 목록을 가져오고 있습니다...
          </Text>
        </View>
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item, index) => index.toString()}
          renderItem={renderProductCard}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="alert-circle-outline" size={48} color={COLORS.text.secondary} />
              <Text style={styles.emptyText}>
                선택한 기간 내 유통기한이 임박한 상품이 없습니다.
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
    padding: 16,
  },
  title: {
    fontSize: normalize(28),
    fontWeight: '700',
    color: COLORS.text.primary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: normalize(14),
    color: COLORS.text.secondary,
    marginBottom: 24,
  },
  daysButtonContainer: {
    marginBottom: 24,
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#adb5bd',
  },
  daysButtonLabel: {
    fontSize: normalize(16),
    fontWeight: '700',
    color: COLORS.text.primary,
    marginBottom: 12,
    letterSpacing: -0.3,
  },
  daysButtonGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  daysButton: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  daysButtonText: {
    fontSize: normalize(14),
    fontWeight: '600',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    paddingBottom: 16,
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    marginTop: 12,
    fontSize: normalize(15),
    color: COLORS.text.secondary,
    textAlign: 'center',
  },
  categoryContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    marginBottom: 10,
  },
  categoryHeader: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  categoryTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryIcon: {
    marginRight: 8,
  },
  categoryTitle: {
    fontSize: normalize(14),
    fontWeight: '600',
    letterSpacing: -0.3,
  },
  nutrientsList: {
    padding: 8,
    gap: 6,
  },
  nutrientItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  nutrientMainInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderWidth: 1,
  },
  nutrientLabel: {
    fontSize: normalize(13),
    fontWeight: '600',
    color: COLORS.text.primary,
    flex: 1,
  },
  nutrientValueContainer: {
    alignItems: 'flex-end',
  },
  nutrientValue: {
    fontSize: normalize(13),
    fontWeight: '600',
  },
  statusText: {
    fontSize: normalize(12),
    fontWeight: '500',
    color: COLORS.text.secondary,
  },
  recommendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    borderRadius: 8,
    gap: 8,
    width: '100%',
  },
  recommendButtonText: {
    fontSize: normalize(13),
    fontWeight: '600',
    color: COLORS.white,
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  loadingText: {
    marginTop: 16,
    fontSize: normalize(16),
    color: COLORS.text.secondary,
    textAlign: 'center',
  },
  similarProductsContainer: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.text.primary,  // 이미 정의된 어두운 색상
    paddingTop: 12,
    gap: 8,
  },
  similarProductCard: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 18,
    borderColor: '#6c757d', // 연한 색상
    borderWidth: 0.5, // borderWidth를 설정해줍니다
  },
  similarProductTitle: {
    fontSize: normalize(14),
    fontWeight: '500',
    color: COLORS.text.primary,
    marginBottom: 8,
  },
  similarProductFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  similarProductPrice: {
    fontSize: normalize(14),
    fontWeight: '600',
  },
  purchaseLinkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  purchaseLinkText: {
    fontSize: normalize(14),
    fontWeight: '500',
  },
  hideButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    borderRadius: 8,
    marginTop: 8,
    gap: 4,
  },
  hideButtonText: {
    fontSize: normalize(13),
    fontWeight: '600',
  },
  errorText: {
    fontSize: normalize(14),
    color: COLORS.text.secondary,
    textAlign: 'center',
    marginBottom: 8,
    padding: 8,
  }
});

export default PurchaseLink;