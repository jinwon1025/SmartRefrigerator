import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, ActivityIndicator, ScrollView, Keyboard, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { API_URL } from "@env";
import AsyncStorage from '@react-native-async-storage/async-storage';

const COLORS = {
  primary: '#2563EB',
  background: '#F1F5F9',
  text: {
    primary: '#0F172A',
    secondary: '#475569',
  },
  white: '#FFFFFF',
  border: '#CBD5E1',
  disabled: '#94A3B8',
  categories: {
    basic: '#4338CA',
    energy: '#EA580C',
    macro: '#059669',
    mineral: '#4F46E5',
    vitamin: '#DB2777'
  },
};

const RECENT_SEARCHES_KEY = 'recent_food_searches';
const MAX_RECENT_SEARCHES = 5;

const NUTRIENT_CATEGORIES = {
  basic: {
    title: '기본정보',
    items: ['영양성분함량기준량', '수분', '회분'],
    color: COLORS.categories.basic,
    icons: {
      '영양성분함량기준량': 'information-circle',
      '수분': 'water',
      '회분': 'leaf'
    }
  },
  energy: {
    title: '에너지',
    items: ['에너지', '콜레스테롤', '포화지방산', '트랜스지방산'],
    color: COLORS.categories.energy,
    icons: {
      '에너지': 'flame',
      '콜레스테롤': 'fitness',
      '포화지방산': 'water',
      '트랜스지방산': 'water'
    }
  },
  macro: {
    title: '다량영양소',
    items: ['탄수화물', '단백질', '지방', '식이섬유', '당류'],
    color: COLORS.categories.macro,
    icons: {
      '탄수화물': 'leaf',
      '단백질': 'barbell',
      '지방': 'water',
      '식이섬유': 'nutrition',
      '당류': 'cafe'
    }
  },
  mineral: {
    title: '무기질',
    items: ['칼슘', '철', '인', '칼륨', '나트륨'],
    color: COLORS.categories.mineral,
    icons: {
      '칼슘': 'fitness',
      '철': 'medal',
      '인': 'flash',
      '칼륨': 'heart',
      '나트륨': 'water'
    }
  },
  vitamin: {
    title: '비타민',
    items: ['비타민 A', '레티놀', '베타카로틴', '티아민', '리보플라빈', '니아신', '비타민 C', '비타민 D'],
    color: COLORS.categories.vitamin,
    icons: {
      '비타민 A': 'eye',
      '레티놀': 'sunny',
      '베타카로틴': 'nutrition',
      '티아민': 'flash',
      '리보플라빈': 'battery-charging',
      '니아신': 'pulse',
      '비타민 C': 'medkit',
      '비타민 D': 'sunny'
    }
  }
};

const Nutrition = () => {
  const [foodName, setFoodName] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedFood, setSelectedFood] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [noResults, setNoResults] = useState(false);
  const [foodDetailLoading, setFoodDetailLoading] = useState(false);
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

  const handleRecentSearchClick = (search) => {
    setFoodName(search);
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

  const searchFood = async (searchTerm = foodName) => {
    if (!searchTerm.trim()) return;
    Keyboard.dismiss();
    setLoading(true);
    setError(null);
    setNoResults(false);
    setFoodName(searchTerm);

    // 검색어 저장을 API 호출 전에 수행
    await saveRecentSearch(searchTerm);

    setTimeout(async () => {
      try {
        const response = await axios.get(`http://${API_URL}:3000/search-food?name=${searchTerm}`);
        console.log('검색어:', searchTerm);
        console.log('검색 결과:', response.data);

        if (response.data.length === 0) {
          setNoResults(true);
          setSearchResults([]);
        } else {
          setSearchResults(response.data);
        }
        setSelectedFood(null);
      } catch (error) {
        console.error('Error searching food:', error);
        setError('음식 검색 중 오류가 발생했습니다.');
      } finally {
        setLoading(false);
      }
    }, 1000);
  };

  const selectFood = async (food) => {
    setFoodDetailLoading(true);
    setSearchResults([]);
    setNoResults(false);

    await new Promise(resolve => setTimeout(resolve, 1000));

    setSelectedFood(food);
    setFoodDetailLoading(false);
  };

  const renderSearchResult = ({ item }) => (
    <TouchableOpacity
      style={styles.searchResultItem}
      onPress={() => selectFood(item)}
    >
      <View style={styles.searchResultIconContainer}>
        <Ionicons name="restaurant-outline" size={20} color={COLORS.primary} />
      </View>
      <Text style={styles.searchResultText}>{item['식품명']}</Text>
      <Ionicons name="chevron-forward" size={20} color={COLORS.text.secondary} />
    </TouchableOpacity>
  );

  const getNutrientIcon = (key) => {
    for (const category of Object.values(NUTRIENT_CATEGORIES)) {
      const baseKey = key.split('(')[0].trim();
      const matchingItem = category.items.find(item => baseKey.includes(item));
      if (matchingItem) {
        return {
          icon: category.icons[matchingItem] || 'nutrition',
          color: category.color
        };
      }
    }
    return {
      icon: 'nutrition',
      color: COLORS.text.secondary
    };
  };

  const renderNutrientItem = (key, value, categoryColor) => {
    if (key === '식품명') return null;
    const { icon } = getNutrientIcon(key);
    const unit = key.includes('(') ? key.split('(')[1].replace(')', '') : '';

    return (
      <View style={styles.nutrientItem} key={key}>
        <View style={styles.nutrientMainInfo}>
          <View style={[styles.iconContainer, { backgroundColor: `${categoryColor}20` }]}>
            <Ionicons name={`${icon}-outline`} size={20} color={categoryColor} />
          </View>
          <Text style={styles.nutrientLabel}>{key}</Text>
        </View>
        <View style={styles.nutrientValueContainer}>
          <Text style={[styles.nutrientValue, { color: categoryColor }]}>
            {value}
            <Text style={styles.nutrientUnit}> {unit}</Text>
          </Text>
        </View>
      </View>
    );
  };

  const renderSelectedFoodHeader = () => {
    if (!selectedFood || !selectedFood['식품명']) return null;

    return (
      <View style={styles.selectedFoodHeader}>
        <View style={styles.selectedFoodContent}>
          <View style={styles.selectedFoodTextContainer}>
            <View style={styles.selectedFoodLabelContainer}>
              <Ionicons name="analytics-outline" size={15} color={COLORS.primary} />
              <Text style={styles.selectedFoodLabel}>영양 분석 정보</Text>
            </View>
            <Text style={styles.selectedFoodName} numberOfLines={2}>{selectedFood['식품명']}</Text>
          </View>
        </View>
      </View>
    );
  };

  const renderNutrientCategory = (category) => {
    if (!selectedFood) return null;

    const categoryInfo = NUTRIENT_CATEGORIES[category];
    const relevantNutrients = Object.entries(selectedFood)
      .filter(([key]) => categoryInfo.items.some(item => key.includes(item)));

    if (relevantNutrients.length === 0) return null;

    return (
      <View key={category} style={styles.categoryContainer}>
        <View style={[styles.categoryHeader, { backgroundColor: `${categoryInfo.color}15` }]}>
          <View style={styles.categoryTitleContainer}>
            <Ionicons
              name={`${categoryInfo.icons[categoryInfo.items[0]]}-outline`}
              size={24}
              color={categoryInfo.color}
              style={styles.categoryIcon}
            />
            <Text style={[styles.categoryTitle, { color: categoryInfo.color }]}>
              {categoryInfo.title}
            </Text>
          </View>
        </View>
        <View style={styles.nutrientsList}>
          {relevantNutrients.map(([key, value]) =>
            renderNutrientItem(key, value, categoryInfo.color)
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🥗 영양 분석표</Text>
      <Text style={styles.subtitle}>음식 성분을 분석하고 건강한 선택을 하세요 </Text>

      <View style={styles.searchContainer}>
        <View style={styles.searchInputWrapper}>
          <Ionicons name="search" size={20} color={COLORS.text.secondary} />
          <TextInput
            style={styles.searchInput}
            value={foodName}
            onChangeText={setFoodName}
            placeholder="음식 이름을 입력하세요"
            placeholderTextColor={COLORS.text.secondary}
            onSubmitEditing={() => searchFood()}
            returnKeyType="search"
          />
          {foodName.length > 0 && (
            <TouchableOpacity onPress={() => setFoodName('')}>
              <Ionicons name="close-circle" size={20} color={COLORS.text.secondary} />
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          style={[styles.searchButton, !foodName.trim() && styles.searchButtonDisabled]}
          onPress={() => searchFood()}
          disabled={!foodName.trim()}
        >
          <Text style={styles.searchButtonText}>검색</Text>
        </TouchableOpacity>
      </View>

      {!loading && !foodDetailLoading && !selectedFood && (
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
              {recentSearches.map((search, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.recentSearchItem}
                  onPress={() => handleRecentSearchClick(search)} // searchFood(search)에서 변경
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

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>음식 목록을 불러오는 중입니다...</Text>
        </View>
      ) : foodDetailLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>음식 정보를 가져오고 있습니다...</Text>
        </View>
      ) : searchResults.length > 0 ? (
        <FlatList
          data={searchResults}
          renderItem={renderSearchResult}
          keyExtractor={(item, index) => index.toString()}
          style={styles.searchResults}
        />
      ) : selectedFood ? (
        <ScrollView style={styles.nutritionContainer} showsVerticalScrollIndicator={false}>
          {renderSelectedFoodHeader()}
          {Object.keys(NUTRIENT_CATEGORIES).map(category =>
            renderNutrientCategory(category)
          )}
        </ScrollView>
      ) : null}

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {noResults && (
        <View style={styles.noResultsContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={COLORS.text.secondary} />
          <Text style={styles.noResultsText}>검색된 음식이 없습니다</Text>
        </View>
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
  searchButtonDisabled: {
    backgroundColor: COLORS.disabled,
  },
  searchButtonText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '600',
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
  searchResults: {
    marginTop: 16,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchResultText: {
    flex: 1,
    fontSize: 15,
    color: COLORS.text.primary,
    marginLeft: 12,
  },
  searchResultIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: `${COLORS.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nutritionContainer: {
    flex: 1,
    marginTop: 16,
  },
  selectedFoodHeader: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  selectedFoodContent: {
    padding: 20,
  },
  selectedFoodTextContainer: {
    gap: 6,
  },
  selectedFoodLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  selectedFoodLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
    letterSpacing: 0.2,
  },
  selectedFoodName: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.text.primary,
    letterSpacing: -0.3,
    lineHeight: 30,
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
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginVertical: 4,
  },
  nutrientMainInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  nutrientLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text.primary,
    flex: 1,
  },
  nutrientValueContainer: {
    alignItems: 'flex-end',
    marginLeft: 12,
  },
  nutrientValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  nutrientUnit: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.text.secondary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 8,
    fontSize: 15,
    color: COLORS.text.secondary,
  },
  errorContainer: {
    padding: 16,
    backgroundColor: '#FEE2E2',
    borderRadius: 12,
    marginTop: 16,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 15,
  },
  noResultsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noResultsText: {
    marginTop: 12,
    fontSize: 15,
    color: COLORS.text.secondary,
  },
});

export default Nutrition;