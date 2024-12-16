import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Keyboard
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { API_URL } from "@env";
import AsyncStorage from '@react-native-async-storage/async-storage';

const COLORS = {
  primary: '#3B82F6',
  background: '#F9FAFB',
  danger: '#ff6b6b',
  success: '#51cf66',
  warning: '#ffd43b',
  text: {
    primary: '#111827',
    secondary: '#6B7280',
  },
  disable: '#94A3B8',
  border: '#CBD5E1',
  white: '#FFFFFF',
};

const ALLERGY_CATEGORIES = {
  basic: {
    title: '기본 정보',
    color: '#4338CA',
    icon: 'information-circle'
  },
  allergy: {
    title: '알레르기 정보',
    color: '#EF4444',
    icon: 'warning'
  },
  ingredient: {
    title: '원재료',
    color: '#10B981',
    icon: 'leaf'
  },
  nutrient: {
    title: '영양성분',
    color: '#F59E0B',
    icon: 'nutrition'
  }
};

const RECENT_SEARCHES_KEY = 'recent_allergy_searches';
const MAX_RECENT_SEARCHES = 5;

const Allergies = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [recentSearches, setRecentSearches] = useState([]);

  useEffect(() => {
    loadRecentSearches();
  }, []);

  const loadRecentSearches = async () => {
    try {
      const searches = await AsyncStorage.getItem(RECENT_SEARCHES_KEY);
      if (searches) {
        setRecentSearches(JSON.parse(searches));
      }
    } catch (error) {
      console.error('Failed to load recent searches:', error);
    }
  };

  const saveRecentSearch = async (searchTerm) => {
    try {
      let searches = recentSearches;
      searches = searches.filter(s => s !== searchTerm);
      searches.unshift(searchTerm);
      searches = searches.slice(0, MAX_RECENT_SEARCHES);

      await AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(searches));
      setRecentSearches(searches);
    } catch (error) {
      console.error('Failed to save recent search:', error);
    }
  };

  const deleteRecentSearch = async (searchTerm) => {
    try {
      const updatedSearches = recentSearches.filter(s => s !== searchTerm);
      await AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updatedSearches));
      setRecentSearches(updatedSearches);
    } catch (error) {
      console.error('Failed to delete recent search:', error);
    }
  };

  const clearRecentSearches = async () => {
    try {
      await AsyncStorage.removeItem(RECENT_SEARCHES_KEY);
      setRecentSearches([]);
    } catch (error) {
      console.error('Failed to clear recent searches:', error);
    }
  };

  const searchProducts = async (searchTerm = searchQuery) => {
    if (!searchTerm.trim()) return;

    Keyboard.dismiss();
    setLoading(true);
    setError(null);
    setSelectedProduct(null);
    setHasSearched(true);
    setSearchQuery(searchTerm);

    await saveRecentSearch(searchTerm);

    try {
      const response = await fetch(
        `http://${API_URL}:3000/api/products?productName=${encodeURIComponent(searchTerm)}`
      );
      const data = await response.json();

      if (!data || !data.products) {
        throw new Error('서버 응답 데이터가 올바르지 않습니다.');
      }

      if (!Array.isArray(data.products)) {
        throw new Error('제품 데이터 형식이 올바르지 않습니다.');
      }

      setProducts(data.products);
    } catch (err) {
      console.error('Search error:', err);
      setError('제품 검색 중 오류가 발생했습니다. 다시 시도해주세요.');
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRecentSearchClick = (search) => {
    setSearchQuery(search);
    searchProducts(search);
  };

  const parseNutrients = (nutrientsStr) => {
    if (!nutrientsStr || nutrientsStr === "알수없음" || nutrientsStr === "정보 없음") {
      return {
        servingInfo: null,
        nutrients: []
      };
    }

    const cleanStr = nutrientsStr.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();

    // 제공량 정보를 추출하기 위한 여러 패턴들
    const servingInfoPatterns = [
      /(총\s*내용량.*?kcal)/i,
      /\[총제공량\/1회제공량\]\s*:\s*(\d+)/i,
      /\[1회제공량\s*칼로리\(Kcal\)\]\s*:\s*(\d+)/i,
      /총\s*제공량\s*\d+g\(\d+g[Xx]\d+봉지\)/i,
      /\d+봉지\(\d+g\)당\s*\d+kcal/i,
      /1회\s*제공량\s*\d+\/\d+봉지\(\d+g\)\s*총\d+회\s*제공량\(\d+g\)/i,
      /1회\s*제공량\s*\(\d+g\)\s*총\s*\d+회\s*제공량\(\d+g\)/i,
      /1회\s*제공량\(\d+g\)\/1회\s*제공량당/i,
      /1회\s*제공량\(\d+g\)\/\s*총\s*\d+회\s*제공량\(\d+g\)/i,
      /(1회\s*제공량.*?함량.*?:)/i,
      /(1회\s*제공량.*?총.*?제공량.*?\))/i,
      /\d+g당\/총\s*내용량\s*\d+g/i,
      /(\d+g당.*?내용량.*?g)/i,
    ];

    let servingInfo = null;
    for (const pattern of servingInfoPatterns) {
      const match = cleanStr.match(pattern);
      if (match) {
        servingInfo = match[0];
        break;
      }
    }

    const parseValue = (name, defaultValue = '0') => {
      const pattern = new RegExp(
        `${name}[^,]*?([0-9,.]+)\\s*(?:mg|g|kcal)`, 'i'
      );
      const match = cleanStr.match(pattern);
      if (match) {
        const value = match[1].replace(',', '.');
        return value;
      }
      return defaultValue;
    };

    const parsePercentage = (name) => {
      const pattern = new RegExp(
        `${name}[^,]*?([0-9,.]+)\\s*%`, 'i'
      );
      const match = cleanStr.match(pattern);
      if (match) {
        return parseInt(match[1]);
      }
      return 0;
    };

    const nutrients = [
      {
        name: '열량',
        value: `${parseValue('열량')}kcal`,
        percentage: 0
      },
      {
        name: '나트륨',
        value: `${parseValue('나트륨')}mg`,
        percentage: parsePercentage('나트륨')
      },
      {
        name: '탄수화물',
        value: `${parseValue('탄수화물')}g`,
        percentage: parsePercentage('탄수화물')
      },
      {
        name: '당류',
        value: `${parseValue('당류')}g`,
        percentage: parsePercentage('당류')
      },
      {
        name: '지방',
        value: `${parseValue('지방')}g`,
        percentage: parsePercentage('지방')
      },
      {
        name: '트랜스지방',
        value: `${parseValue('트랜스지방')}g`,
        percentage: 0
      },
      {
        name: '포화지방',
        value: `${parseValue('포화지방')}g`,
        percentage: parsePercentage('포화지방')
      },
      {
        name: '콜레스테롤',
        value: `${parseValue('콜레스테롤')}mg`,
        percentage: parsePercentage('콜레스테롤')
      },
      {
        name: '단백질',
        value: `${parseValue('단백질')}g`,
        percentage: parsePercentage('단백질')
      },
      {
        name: '칼슘',
        value: `${parseValue('칼슘')}mg`,
        percentage: parsePercentage('칼슘')
      }
    ];

    nutrients.sort((a, b) => b.percentage - a.percentage);

    return {
      servingInfo,
      nutrients
    };
  };

  const renderAllergyIcon = (allergyInfo) => {
    if (!allergyInfo || allergyInfo === "알수없음" || allergyInfo === "." || allergyInfo === " .") {
      return (
        <View style={[styles.allergyBadge, { backgroundColor: COLORS.text.secondary }]}>
          <Ionicons name="help-circle" size={20} color="white" />
          <Text style={styles.allergyBadgeText}>정보 없음</Text>
        </View>
      );
    }

    const hasAllergies = allergyInfo && allergyInfo !== '없음';
    return (
      <View style={[styles.allergyBadge, hasAllergies ? styles.allergyWarning : styles.allergyGood]}>
        <Ionicons
          name={hasAllergies ? "alert-circle" : "checkmark-circle"}
          size={20}
          color="white"
        />
        <Text style={styles.allergyBadgeText}>
          {hasAllergies ? '알레르기 주의' : '알레르기 안전'}
        </Text>
      </View>
    );
  };

  const cleanAllergyInfo = (allergyInfo) => {
    if (!allergyInfo || allergyInfo === "알수없음" || allergyInfo === "없음") {
      return allergyInfo;
    }
    return allergyInfo.replace(/\s*함유\s*$/, '');
  };

  const renderProduct = ({ item }) => (
    <TouchableOpacity
      style={styles.productCard}
      onPress={() => setSelectedProduct(item)}
    >
      <View style={styles.productHeader}>
        <Text style={styles.productName}>{item.name}</Text>
        {renderAllergyIcon(item.allergyInfo)}
      </View>
      <View style={styles.productBarcode}>
        <Ionicons name="barcode-sharp" size={24} color="#334155" />
        <Text style={styles.barcodeText}>{item.id}</Text>
      </View>
    </TouchableOpacity>
  );

  const renderSelectedProductHeader = () => {
    if (!selectedProduct) return null;

    const isLongName = selectedProduct.name.length > 20;

    return (
      <View style={styles.selectedProductHeader}>
        <View style={styles.selectedProductContent}>
          <View style={styles.selectedProductTextContainer}>
            <View style={styles.selectedProductLabelContainer}>
              <Ionicons name="analytics-outline" size={15} color={COLORS.primary} />
              <Text style={styles.selectedProductLabel}>제품 분석 정보</Text>
            </View>
            <Text
              style={[
                styles.selectedProductName,
                isLongName && styles.selectedProductNameLong
              ]}
            >
              {selectedProduct.name}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  const renderNutrientItem = (label, value) => {
    const isLongValue = value.length > 20;

    return (
      <View style={[
        styles.nutrientItem,
        isLongValue && styles.nutrientItemLong
      ]}>
        <View style={styles.nutrientMainInfo}>
          <View style={styles.iconContainer}>
            <Ionicons name="cube-outline" size={20} color={COLORS.primary} />
          </View>
          <Text style={styles.nutrientLabel}>{label}</Text>
        </View>
        <View style={[
          styles.nutrientValueContainer,
          isLongValue && styles.nutrientValueContainerLong
        ]}>
          <Text style={[
            styles.nutrientValue,
            isLongValue && styles.nutrientValueLong
          ]}>
            {value}
          </Text>
        </View>
      </View>
    );
  };

  const renderCategorySection = (category) => {
    const categoryInfo = ALLERGY_CATEGORIES[category];

    if (category === 'basic') {
      return (
        <View key={category} style={styles.categoryContainer}>
          <View style={[styles.categoryHeader, { backgroundColor: `${categoryInfo.color}15` }]}>
            <View style={styles.categoryTitleContainer}>
              <Ionicons
                name={`${categoryInfo.icon}-outline`}
                size={24}
                color={categoryInfo.color}
              />
              <Text style={[styles.categoryTitle, { color: categoryInfo.color }]}>
                {categoryInfo.title}
              </Text>
            </View>
          </View>
          <View style={styles.nutrientsList}>
            {renderNutrientItem('식품명', selectedProduct.name)}
            <View style={styles.nutrientItem}>
              <View style={styles.nutrientMainInfo}>
                <View style={[styles.iconContainer, { backgroundColor: `${COLORS.danger}20` }]}>
                  <Ionicons name="warning-outline" size={20} color={COLORS.danger} />
                </View>
                <Text style={styles.nutrientLabel}>알레르기</Text>
              </View>
              <View style={styles.nutrientValueContainer}>
                {renderAllergyIcon(selectedProduct.allergyInfo)}
              </View>
            </View>
          </View>
        </View>
      );
    }

    if (category === 'allergy') {
      return (
        <View key={category} style={styles.categoryContainer}>
          <View style={[styles.categoryHeader, { backgroundColor: `${categoryInfo.color}15` }]}>
            <View style={styles.categoryTitleContainer}>
              <Ionicons
                name={`${categoryInfo.icon}-outline`}
                size={24}
                color={categoryInfo.color}
              />
              <Text style={[styles.categoryTitle, { color: categoryInfo.color }]}>
                {categoryInfo.title}
              </Text>
            </View>
          </View>
          <View style={styles.nutrientsList}>
            {!selectedProduct.allergyInfo ||
              selectedProduct.allergyInfo === "알수없음" ||
              selectedProduct.allergyInfo === "알 수 없음" ||
              selectedProduct.allergyInfo === "." ||
              selectedProduct.allergyInfo === " ." ? (
              <View style={styles.noNutrientContainer}>
                <Ionicons
                  name="information-circle-outline"
                  size={20}
                  color={COLORS.text.secondary}
                />
                <Text style={styles.noNutrientText}>
                  알레르기 정보를 확인할 수 없습니다.
                </Text>
              </View>
            ) : selectedProduct.allergyInfo === "없음" ? (
              <View style={styles.allergenContainer}>
                <View style={styles.allergenHeader}>
                  <Ionicons name="checkmark-circle-outline" size={20} color={COLORS.success} />
                  <Text style={styles.allergenTitle}>알레르기 유발 성분이 없습니다.</Text>
                </View>
              </View>
            ) : (
              <View style={styles.allergenContainer}>
                <View style={styles.allergenHeader}>
                  <Ionicons name="alert-circle-outline" size={20} color={COLORS.danger} />
                  <Text style={styles.allergenTitle}>알레르기 유발 성분</Text>
                </View>
                <View style={styles.allergenList}>
                  {selectedProduct.allergyInfo.split(',').map((allergen, index) => {
                    const cleanedAllergen = cleanAllergyInfo(allergen);
                    return (
                      <View key={index} style={styles.allergenItem}>
                        <Ionicons name="warning-outline" size={16} color={COLORS.danger} />
                        <Text style={styles.allergenText}>{cleanedAllergen}</Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}
          </View>
        </View>
      );
    }

    if (category === 'ingredient') {
      return (
        <View key={category} style={styles.categoryContainer}>
          <View style={[styles.categoryHeader, { backgroundColor: `${categoryInfo.color}15` }]}>
            <View style={styles.categoryTitleContainer}>
              <Ionicons
                name={`${categoryInfo.icon}-outline`}
                size={24}
                color={categoryInfo.color}
              />
              <Text style={[styles.categoryTitle, { color: categoryInfo.color }]}>
                {categoryInfo.title}
              </Text>
            </View>
          </View>
          <View style={styles.nutrientsList}>
            {!selectedProduct.ingredients ? (
              <View style={styles.noNutrientContainer}>
                <Ionicons
                  name="information-circle-outline"
                  size={20}
                  color={COLORS.text.secondary}
                />
                <Text style={styles.noNutrientText}>
                  원재료 정보를 확인할 수 없습니다.
                </Text>
              </View>
            ) : (
              <View style={styles.infoBox}>
                <View style={styles.ingredientsList}>
                  {selectedProduct.ingredients.split(',').map((ingredient, index) => (
                    <View key={index} style={styles.ingredientItem}>
                      <Ionicons name="leaf-outline" size={16} color={categoryInfo.color} />
                      <Text style={styles.ingredientText}>{ingredient.trim()}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </View>
        </View>
      );
    }

    if (category === 'nutrient') {
      const nutritionData = parseNutrients(selectedProduct.nutrients);
      const isNutrientInfoUnavailable =
        selectedProduct.nutrients === "정보 없음" ||
        selectedProduct.nutrients === "알수없음" ||
        selectedProduct.nutrients === "알 수 없음" ||
        selectedProduct.nutrients === "." ||
        selectedProduct.nutrients === " ." ||
        !selectedProduct.nutrients;

      return (
        <View key={category} style={styles.categoryContainer}>
          <View style={[styles.categoryHeader, { backgroundColor: `${categoryInfo.color}15` }]}>
            <View style={styles.categoryTitleContainer}>
              <Ionicons
                name={`${categoryInfo.icon}-outline`}
                size={24}
                color={categoryInfo.color}
              />
              <Text style={[styles.categoryTitle, { color: categoryInfo.color }]}>
                {categoryInfo.title}
              </Text>
            </View>
          </View>
          <View style={styles.nutrientsList}>
            {isNutrientInfoUnavailable ? (
              <View style={styles.noNutrientContainer}>
                <Ionicons
                  name="information-circle-outline"
                  size={20}
                  color={COLORS.text.secondary}
                />
                <Text style={styles.noNutrientText}>
                  영양성분 정보를 확인할 수 없습니다.
                </Text>
              </View>
            ) : (
              <>
                <View style={styles.totalAmountCard}>
                  <View style={styles.totalAmountHeader}>
                    <Ionicons name="cube-outline" size={20} color={categoryInfo.color} />
                    <Text style={[styles.totalAmountTitle, { color: categoryInfo.color }]}>
                      제공량 정보
                    </Text>
                  </View>
                  <View style={styles.totalAmountContent}>
                    <Text
                      style={styles.totalAmountValue}
                      adjustsFontSizeToFit={true}
                      numberOfLines={3}
                      minimumFontScale={0.5}
                    >
                      {nutritionData.servingInfo || '정보를 불러오지 못했습니다.'}
                    </Text>
                  </View>
                </View>

                <View style={styles.nutrientsGrid}>
                  {nutritionData.nutrients.map((nutrient, index) => (
                    <View key={index} style={styles.nutrientCard}>
                      <Text style={styles.nutrientName}>{nutrient.name}</Text>
                      <View style={styles.nutrientValues}>
                        <Text style={styles.nutrientValue}>{nutrient.value}</Text>
                        {nutrient.percentage > 0 && (
                          <View style={styles.percentageTag}>
                            <Text style={styles.percentageText}>{nutrient.percentage}%</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  ))}
                </View>

                <View style={styles.warningContainer}>
                  <Ionicons name="information-circle-outline" size={20} color={COLORS.warning} />
                  <Text style={styles.warningText}>
                    1일 영양성분 기준치에 대한 비율(%)은 2,000kcal 기준이므로{'\n'}
                    개인의 필요 열량에 따라 다를 수 있습니다.
                  </Text>
                </View>
              </>
            )}
          </View>
        </View>
      );
    }

    return null;
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🚫 알레르기 정보</Text>
      <Text style={styles.subtitle}>식품 알레르기 성분을 확인하고 건강을 지키세요.</Text>

      <View style={styles.searchContainer}>
        <View style={styles.searchInputWrapper}>
          <Ionicons name="search" size={20} color={COLORS.text.secondary} />
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="검색할 식품명을 입력하세요"
            placeholderTextColor={COLORS.text.secondary}
            returnKeyType="search"
            onSubmitEditing={() => searchProducts()}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color={COLORS.text.secondary} />
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          style={[styles.searchButton, !searchQuery.trim() && styles.searchButtonDisabled]}
          onPress={() => searchProducts()}
          disabled={!searchQuery.trim()}
        >
          <Text style={styles.searchButtonText}>검색</Text>
        </TouchableOpacity>
      </View>

      {!loading && (
        <>
          <View style={styles.recentSearchesContainer}>
            <View style={styles.recentSearchesHeader}>
              <Text style={styles.recentSearchesTitle}>최근 검색어</Text>
              <TouchableOpacity onPress={clearRecentSearches}>
                <Text style={styles.clearButton}>전체 삭제</Text>
              </TouchableOpacity>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.recentSearchesList}
            >
              {recentSearches.length > 0 && recentSearches.map((search, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.recentSearchItem}
                  onPress={() => handleRecentSearchClick(search)}
                >
                  <View style={styles.recentSearchContent}>
                    <Ionicons name="time-outline" size={14} color={COLORS.text.secondary} />
                    <Text style={styles.recentSearchText}>{search}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={(e) => {
                      e.stopPropagation();
                      deleteRecentSearch(search);
                    }}
                  >
                    <Ionicons name="close" size={14} color={COLORS.text.secondary} />
                  </TouchableOpacity>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
          <View style={styles.divider} />
        </>
      )}

      <View style={styles.contentContainer}>
        {loading ? (
          <View style={styles.centerContent}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>음식 목록을 가져오고 있습니다...</Text>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={24} color={COLORS.danger} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : selectedProduct ? (
          <ScrollView style={styles.nutritionContainer} showsVerticalScrollIndicator={false}>
            {renderSelectedProductHeader()}
            {Object.keys(ALLERGY_CATEGORIES).map(category =>
              renderCategorySection(category)
            )}
          </ScrollView>
        ) : products.length > 0 ? (
          <FlatList
            data={products}
            renderItem={renderProduct}
            keyExtractor={(item, index) => item.id ? item.id.toString() : index.toString()}
            contentContainerStyle={styles.productList}
            showsVerticalScrollIndicator={false}
          />
        ) : hasSearched ? (
          <View style={styles.centerContent}>
            <Ionicons name="search" size={48} color={COLORS.text.secondary} />
            <Text style={[styles.loadingText, { marginTop: 12 }]}>
              검색 결과가 없습니다.
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
    padding: 16,
  },
  contentContainer: {
    flex: 1,
    marginTop: 16,
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
  searchContainer: {
    gap: 12,
    marginBottom: 16,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 15,
    color: COLORS.text.primary,
  },
  searchButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  searchButtonText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '600',
  },
  searchButtonDisabled: {
    backgroundColor: COLORS.disable,
  },
  recentSearchesContainer: {
    marginTop: 12,
    marginBottom: 8,
  },
  recentSearchesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  recentSearchesTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  clearButton: {
    fontSize: 12,
    color: COLORS.text.secondary,
  },
  recentSearchesList: {
    paddingHorizontal: 4,
    gap: 8,
    flexDirection: 'row',
  },
  recentSearchItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    paddingVertical: 6,
    paddingLeft: 12,
    paddingRight: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: 'space-between',
  },
  recentSearchContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  deleteButton: {
    marginLeft: 8,
    padding: 4,
  },
  recentSearchText: {
    fontSize: 13,
    color: COLORS.text.primary,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginBottom: 16,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.text.secondary,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff5f5',
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
  },
  errorText: {
    marginLeft: 8,
    fontSize: 16,
    color: COLORS.danger,
    flex: 1,
  },
  productList: {
    gap: 10,
    paddingVertical: 8,
  },
  productCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 14,
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  productName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginRight: 8,
  },
  allergyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
  },
  allergyWarning: {
    backgroundColor: COLORS.danger,
  },
  allergyGood: {
    backgroundColor: COLORS.success,
  },
  allergyBadgeText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '600',
  },
  productBarcode: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1.5,
    borderTopColor: COLORS.border,
    gap: 8,
  },
  barcodeText: {
    fontSize: 12,
    color: COLORS.text.secondary,
    fontWeight: '500',
  },
  nutritionContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  selectedProductHeader: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  selectedProductContent: {
    padding: 16,
  },
  selectedProductTextContainer: {
    gap: 6,
  },
  selectedProductLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  selectedProductLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
    letterSpacing: 0.2,
  },
  selectedProductName: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.text.primary,
    letterSpacing: -0.3,
    lineHeight: 30,
  },
  selectedProductNameLong: {
    fontSize: 18,
    lineHeight: 24,
  },
  categoryContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 16,
  },
  categoryHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  categoryTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryIcon: {
    marginRight: 12,
  },
  categoryTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  nutrientsList: {
    padding: 12,
    gap: 8,
  },
  nutrientItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginVertical: 4,
  },
  nutrientItemLong: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 12,
  },
  nutrientMainInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: `${COLORS.primary}20`,
  },
  nutrientLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  nutrientValueContainer: {
    flex: 1,
    alignItems: 'flex-end',
  },
  nutrientValueContainerLong: {
    width: '100%',
    alignItems: 'flex-start',
    paddingLeft: 56, // iconContainer width + gap
  },
  nutrientValue: {
    fontSize: 15,
    color: COLORS.text.primary,
    fontWeight: '500',
  },
  nutrientValueLong: {
    lineHeight: 22,
  },
  warningContainer: {
    backgroundColor: `${COLORS.warning}10`,
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.text.secondary,
    lineHeight: 18,
  },
  totalAmountCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  totalAmountHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  totalAmountTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  totalAmountContent: {
    alignItems: 'flex-start',
    width: '100%',
  },
  totalAmountValue: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text.primary,
    marginBottom: 4,
    flexWrap: 'wrap',
  },
  nutrientsGrid: {
    gap: 8,
  },
  nutrientCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  nutrientName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  nutrientValues: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  percentageTag: {
    backgroundColor: `${COLORS.warning}15`,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  percentageText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#f59f00',
  },
  noNutrientContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  noNutrientText: {
    fontSize: 15,
    color: COLORS.text.secondary,
    flex: 1,
  },
  allergenContainer: {
    backgroundColor: `${COLORS.danger}10`,
    borderRadius: 12,
    padding: 16,
  },
  allergenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  allergenTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  allergenList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  allergenItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    gap: 4,
    borderWidth: 1,
    borderColor: `${COLORS.danger}30`,
  },
  allergenText: {
    fontSize: 14,
    color: COLORS.danger,
    fontWeight: '500',
  },
  infoBox: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 12,
  },
  ingredientsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  ingredientItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${COLORS.success}10`,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    gap: 4,
  },
  ingredientText: {
    fontSize: 14,
    color: COLORS.text.secondary,
  },
});

export default Allergies;