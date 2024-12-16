import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, ScrollView, ActivityIndicator, StyleSheet, TouchableOpacity, Keyboard } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { API_URL } from "@env";
import AsyncStorage from '@react-native-async-storage/async-storage';

const COLORS = {
  primary: '#3B82F6',
  background: '#F1F5F9',
  border: '#CBD5E1',
  accent: {
    primary: '#6366F1',
    blue: '#0EA5E9',
    violet: '#8B5CF6',
    mint: '#2DD4BF',
    rose: '#FB7185',
  },
  text: {
    primary: '#111827',
    secondary: '#6B7280',
    white: '#FFFFFF',
  },
  white: '#FFFFFF',
  lightBg: '#F8FAFC',
  disabled: '#94A3B8',
};

const RECENT_SEARCHES_KEY = 'recent_recipe_searches';
const MAX_RECENT_SEARCHES = 5;

const SearchRecipe = () => {
  const [name, setName] = useState('');
  const [recipeInfo, setRecipeInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [noResults, setNoResults] = useState(false);
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

  const handleRecentSearchClick = (search) => {
    setName(search);
  };

  const searchRecipe = async (searchTerm = name) => {
    if (!searchTerm.trim()) return;

    Keyboard.dismiss();
    setLoading(true);
    setNoResults(false);
    setName(searchTerm);

    // 검색어 저장을 API 호출 전에 수행
    await saveRecentSearch(searchTerm);

    try {
      const response = await fetch(`http://${API_URL}:3000/search-recipe?q=${searchTerm}`);
      const data = await response.json();

      if (response.ok) {
        setRecipeInfo(data);
        if (!data || Object.keys(data).length === 0) {
          setNoResults(true);
        }
      } else {
        setRecipeInfo(null);
        setNoResults(true);
      }
    } catch (error) {
      console.error(error);
      setRecipeInfo(null);
      setNoResults(true);
    } finally {
      setLoading(false);
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

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🔍 레시피 검색</Text>
      <Text style={styles.subtitle}>맛있는 요리의 레시피를 검색해보세요. </Text>

      <View style={styles.searchWrapper}>
        <View style={styles.searchInputWrapper}>
          <Ionicons name="search" size={20} color={COLORS.text.secondary} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="레시피 이름을 입력하세요"
            value={name}
            onChangeText={setName}
            onSubmitEditing={() => searchRecipe()}
            returnKeyType="search"
            placeholderTextColor={COLORS.text.secondary}
          />
          {name.length > 0 && (
            <TouchableOpacity onPress={() => setName('')}>
              <Ionicons name="close-circle" size={20} color={COLORS.text.secondary} />
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          style={[
            styles.searchButton,
            !name.trim() && styles.searchButtonDisabled
          ]}
          onPress={() => searchRecipe()}
          disabled={!name.trim()}
        >
          <Text style={[
            styles.searchButtonText,
            !name.trim() && styles.searchButtonTextDisabled
          ]}>레시피 검색하기</Text>
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
                  onPress={() => handleRecentSearchClick(search)} // searchRecipe(search)에서 변경
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
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={COLORS.accent.primary} />
          <Text style={styles.loadingText}>레시피를 찾고 있습니다...</Text>
        </View>
      ) : noResults ? (
        <View style={styles.centerContent}>
          <Ionicons name="alert-circle-outline" size={48} color={COLORS.text.secondary} />
          <Text style={styles.noResultsText}>검색된 레시피가 없습니다</Text>
        </View>
      ) : (
        recipeInfo && (
          <ScrollView
            style={styles.recipeContainer}
            contentContainerStyle={styles.recipeContentContainer}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.recipeCard}>
              <View style={styles.recipeHeader}>
                <View style={styles.recipeIconBubble}>
                  <Ionicons name="restaurant" size={32} color={COLORS.text.white} />
                </View>
                <View style={styles.recipeTitleWrap}>
                  <Text style={styles.recipeTitle}>{recipeInfo.name}</Text>
                </View>
              </View>

              <View style={styles.sectionContainer}>
                <View style={[styles.sectionTitleBox, { backgroundColor: COLORS.accent.blue }]}>
                  <Ionicons name="leaf" size={24} color={COLORS.text.white} />
                  <Text style={styles.sectionTitle}>필요한 재료</Text>
                </View>
                <View style={styles.ingredientsGrid}>
                  {recipeInfo.ingredients.split(',').map((ingredient, index) => (
                    <View key={index} style={styles.ingredientBubble}>
                      <Ionicons
                        name="ellipse"
                        size={6}
                        color={COLORS.accent.blue}
                        style={styles.ingredientDot}
                      />
                      <Text style={styles.ingredientText}>{ingredient.trim()}</Text>
                    </View>
                  ))}
                </View>
              </View>

              <View style={styles.sectionContainer}>
                <View style={[styles.sectionTitleBox, { backgroundColor: COLORS.accent.violet }]}>
                  <Ionicons name="compass" size={24} color={COLORS.text.white} />
                  <Text style={styles.sectionTitle}>조리 순서</Text>
                </View>
                <View style={styles.stepsContainer}>
                  {recipeInfo.recipe.map((step, index) => (
                    <View key={index} style={styles.stepItem}>
                      <View style={styles.stepLeft}>
                        <View style={styles.stepNumberBubble}>
                          <Text style={styles.stepNumberText}>{index + 1}</Text>
                        </View>
                        {index !== recipeInfo.recipe.length - 1 && (
                          <View style={styles.stepConnector} />
                        )}
                      </View>
                      <View style={styles.stepContent}>
                        <Text style={styles.stepText}>{step}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          </ScrollView>
        )
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
  searchWrapper: {
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
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
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
  searchButtonTextDisabled: {
    color: COLORS.white,
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
  noResultsText: {
    marginTop: 12,
    fontSize: 15,
    color: COLORS.text.secondary,
  },
  recipeContainer: {
    flex: 1,
    marginTop: 24,
  },
  recipeCard: {
    backgroundColor: COLORS.white,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: COLORS.accent.primary,
    overflow: 'hidden',
  },
  recipeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.accent.primary,
    padding: 20,
    gap: 16,
  },
  recipeIconBubble: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 20,
    padding: 12,
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  recipeTitleWrap: {
    flex: 1,
  },
  recipeTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: COLORS.text.white,
  },
  sectionContainer: {
    padding: 20,
    borderBottomWidth: 2,
    borderBottomColor: COLORS.background,
  },
  sectionTitleBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    marginBottom: 20,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text.white,
  },
  ingredientsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    padding: 8,
  },
  ingredientBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.lightBg,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.accent.blue,
  },
  ingredientDot: {
    marginRight: 8,
  },
  ingredientText: {
    fontSize: 15,
    color: COLORS.text.primary,
    fontWeight: '500',
  },
  stepsContainer: {
    padding: 8,
  },
  stepItem: {
    flexDirection: 'row',
    marginBottom: 24,
  },
  stepLeft: {
    alignItems: 'center',
    marginRight: 16,
  },
  stepNumberBubble: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.accent.violet,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  stepConnector: {
    width: 2,
    height: '100%',
    backgroundColor: COLORS.accent.violet,
    position: 'absolute',
    top: 32,
    left: '50%',
    marginLeft: -1,
  },
  stepNumberText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text.white,
  },
  stepContent: {
    flex: 1,
    backgroundColor: COLORS.lightBg,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: COLORS.accent.violet,
  },
  stepText: {
    fontSize: 15,
    color: COLORS.text.primary,
    lineHeight: 24,
    fontWeight: '500',
  },
});

export default SearchRecipe;