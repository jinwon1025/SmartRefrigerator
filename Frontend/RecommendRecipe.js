import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TextInput, ActivityIndicator, StyleSheet, TouchableOpacity, ScrollView, Keyboard } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { API_URL } from "@env";

const COLORS = {
  primary: '#3B82F6',
  primaryLight: '#EBF5FF',
  background: '#F1F5F9',
  accent: {
    primary: '#6366F1',
    blue: '#0EA5E9',
    violet: '#8B5CF6',
    mint: '#2DD4BF',
    rose: '#FB7185',
  },
  text: {
    primary: '#111827',
    secondary: '#4B5A60',
    white: '#FFFFFF',
  },
  white: '#FFFFFF',
  error: '#DC2626',
  errorBg: '#FEE2E2',
  border: '#E5E7EB',
  success: '#40C057',
  lightBg: '#F8FAFC',
  disabled: '#94A3B8', // disabled 색상 추가
};

const RecommendRecipe = () => {
  const [products, setProducts] = useState([]);
  const [selectedIngredients, setSelectedIngredients] = useState([]);
  const [recipe, setRecipe] = useState(null);
  const [error, setError] = useState(null);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [showProducts, setShowProducts] = useState(true);
  const [lastSearchValue, setLastSearchValue] = useState(''); // 마지막 검색어 저장
  const [ingredientsLoading, setIngredientsLoading] = useState(true);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setIngredientsLoading(true);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000);
      const response = await fetch(`http://${API_URL}:3000/search`, {
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      const data = await response.json();

      // 여기에 1초 딜레이 추가
      setTimeout(() => {
        setProducts(data);
        setIngredientsLoading(false);  // 로딩 상태를 여기서 해제
      }, 1000);

    } catch (err) {
      console.error(err);
      if (err.name === 'AbortError') {
        setError("네트워크 요청 시간이 초과되었습니다.");
      }
      setTimeout(() => {
        setIngredientsLoading(false);  // 에러 발생시에도 1초 후 로딩 상태 해제
      }, 1000);
    }
  };
  const handleSelectProduct = (product) => {
    setSelectedIngredients(prev => {
      const newSelected = prev.includes(product)
        ? prev.filter(item => item !== product)
        : [...prev, product];

      const manualInputs = inputValue
        .split(',')
        .map(item => item.trim())
        .filter(item => !selectedIngredients.includes(item) && item !== product && item !== '');

      const combinedIngredients = [...new Set([...newSelected, ...manualInputs])];
      setInputValue(combinedIngredients.join(', '));

      return newSelected;
    });
  };

  const handleRecommendRecipe = async () => {
    const inputIngredients = inputValue.split(',').map(item => item.trim()).filter(item => item);
    const ingredientsArray = [...new Set([...selectedIngredients, ...inputIngredients])];

    if (ingredientsArray.length === 0) {
      setError("재료를 선택하거나 입력해주세요.");
      return;
    }

    setLoading(true);
    setError(null);
    setShowProducts(false);
    setRecipe(null);
    setLastSearchValue(inputValue); // 검색어 저장
    Keyboard.dismiss();

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000);
      const response = await fetch(`http://${API_URL}:3000/recommend-recipe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ingredients: ingredientsArray }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      const data = await response.json();
      if (response.ok) {
        setRecipe(data);
        console.log('Received recipe:', data);
      } else {
        setError(data.error);
      }
    } catch (err) {
      console.error(err);
      setError(err.name === 'AbortError'
        ? "레시피 추천 요청 시간이 초과되었습니다."
        : "레시피 추천 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleSearchAgain = () => {
    setSelectedIngredients([]);
    setInputValue('');
    setRecipe(null);
    setError(null);
    setShowProducts(true);
    setLastSearchValue('');
  };

  const handleSearchWithLastValue = () => {
    setInputValue(lastSearchValue);
    handleRecommendRecipe();
  };

  const renderRecipe = (recipeData) => {
    if (!recipeData.ingredients || !recipeData.name || !recipeData.recipe || recipeData.recipe.length === 0) {
      return (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={24} color={COLORS.error} />
          <Text style={styles.errorText}>해당 재료로 만들 수 있는 음식을 찾을 수 없습니다</Text>
          <TouchableOpacity
            style={[styles.searchAgainButton, { marginTop: 16 }]}
            onPress={handleSearchAgain}
            activeOpacity={0.7}
          >
            <Ionicons name="refresh" size={24} color={COLORS.text.white} />
            <Text style={styles.searchAgainButtonText}>다시 검색하기</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return (
      <View style={styles.recipeCard}>
        <View style={styles.recipeHeader}>
          <View style={styles.recipeIconBubble}>
            <Ionicons name="restaurant" size={32} color={COLORS.text.white} />
          </View>
          <View style={styles.recipeTitleWrap}>
            <Text style={styles.recipeTitle}>{recipeData.name}</Text>
          </View>
        </View>

        <View style={styles.sectionContainer}>
          <View style={[styles.sectionTitleBox, { backgroundColor: COLORS.accent.blue }]}>
            <Ionicons name="leaf" size={24} color={COLORS.text.white} />
            <Text style={styles.sectionTitle}>필요한 재료</Text>
          </View>
          <View style={styles.ingredientsGrid}>
            {recipeData.ingredients.split(',').map((ingredient, index) => (
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
            {recipeData.recipe.map((step, index) => (
              <View key={index} style={styles.stepItem}>
                <View style={styles.stepLeft}>
                  <View style={styles.stepNumberBubble}>
                    <Text style={styles.stepNumberText}>{index + 1}</Text>
                  </View>
                  {index !== recipeData.recipe.length - 1 && (
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

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.searchAgainButton}
            onPress={handleSearchWithLastValue}
            activeOpacity={0.7}
          >
            <Ionicons name="sync" size={24} color={COLORS.text.white} />
            <Text style={styles.searchAgainButtonText}>다른 레시피 추천받기</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.searchAgainButton, styles.newSearchButton]}
            onPress={handleSearchAgain}
            activeOpacity={0.7}
          >
            <Ionicons name="search" size={24} color={COLORS.text.white} />
            <Text style={styles.searchAgainButtonText}>새로 검색하기</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderIngredientItem = ({ item }) => {
    const isSelected = selectedIngredients.includes(item.product_name);

    return (
      <TouchableOpacity
        style={[
          styles.ingredientItem,
          isSelected && styles.selectedIngredient
        ]}
        onPress={() => handleSelectProduct(item.product_name)}
        activeOpacity={0.7}
      >
        <View style={styles.ingredientContent}>
          <View style={[
            styles.checkboxContainer,
            isSelected && styles.selectedCheckboxContainer
          ]}>
            <Ionicons
              name={isSelected ? "checkmark-circle" : "ellipse-outline"}
              size={24}
              color={isSelected ? COLORS.success : COLORS.text.secondary}
            />
          </View>
          <View style={styles.ingredientTextContainer}>
            <Text
              style={[
                styles.ingredientName,
                isSelected && styles.selectedIngredientText
              ]}
              numberOfLines={2}
              ellipsizeMode="tail"
            >
              {item.product_name}
            </Text>
            {item.expiry_date && (
              <Text style={styles.expiryDate}>
                유통기한: {item.expiry_date}
              </Text>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🍳 레시피 추천</Text>
      <Text style={styles.subtitle}>보관 중인 식자재로 가능한 요리를 추천드립니다. </Text>

      <View style={styles.searchContainer}>
        <View style={styles.searchInputWrapper}>
          <Ionicons name="search" size={20} color={COLORS.text.secondary} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="재료를 입력하세요"
            value={inputValue}
            onChangeText={setInputValue}
            onSubmitEditing={() => {
              if (inputValue.trim()) {
                handleRecommendRecipe();
              }
            }}
            returnKeyType="search"
            placeholderTextColor={COLORS.text.secondary}
          />
          {inputValue.length > 0 && (
            <TouchableOpacity onPress={() => setInputValue('')}>
              <Ionicons name="close-circle" size={20} color={COLORS.text.secondary} />
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          style={[
            styles.searchButton,
            !inputValue.trim() && styles.searchButtonDisabled
          ]}
          onPress={handleRecommendRecipe}
          disabled={!inputValue.trim()}
        >
          <Text style={[
            styles.searchButtonText,
            !inputValue.trim() && styles.searchButtonTextDisabled
          ]}>레시피 추천받기</Text>
        </TouchableOpacity>
      </View>


      {showProducts && !recipe && !loading && (
        <View style={styles.ingredientsSection}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleContainer}>
              <Ionicons name="list-outline" size={24} color={COLORS.primary} />
              <Text style={[styles.sectionTitle, { color: COLORS.text.primary }]}>보관 중인 식자재</Text>
            </View>
            {selectedIngredients.length > 0 && (
              <Text style={styles.selectedCount}>
                {selectedIngredients.length}개 선택됨
              </Text>
            )}
          </View>
          {ingredientsLoading ? (
            <View style={styles.centerContent}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={styles.loadingText}>보관 중인 식자재를 가져오고 있습니다...</Text>
            </View>
          ) : (
            <FlatList
              data={products}
              renderItem={renderIngredientItem}
              keyExtractor={(item) => item.product_name}
              numColumns={2}
              contentContainerStyle={[
                styles.ingredientList,
                products.length === 0 && styles.emptyListContainer
              ]}
              showsVerticalScrollIndicator={false}
              columnWrapperStyle={products.length > 0 ? styles.columnWrapper : null}
              ListEmptyComponent={() => (
                <View style={styles.emptyContainer}>
                  <Ionicons name="add-circle-outline" size={48} color={COLORS.text.secondary} />
                  <Text style={styles.emptyText}>보관 중인 식자재가 없습니다.</Text>
                  <Text style={styles.emptySubText}>식자재를 추가해 주세요.</Text>
                </View>
              )}
            />
          )}
        </View>
      )}

      {loading && (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={COLORS.accent.primary} />
          <Text style={styles.loadingText}>레시피를 만들고 있습니다...</Text>
        </View>
      )}

      {error && (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={24} color={COLORS.error} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {recipe && (
        <View style={styles.recipeContainer}>
          <ScrollView
            style={styles.recipeContent}
            showsVerticalScrollIndicator={false}
          >
            {renderRecipe(recipe)}
          </ScrollView>
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
  ingredientsSection: {
    flex: 1,
    backgroundColor: COLORS.background,
    marginHorizontal: 0,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  selectedCount: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '600',
    marginLeft: 'auto',
    paddingLeft: 16,
  },
  ingredientList: {
    padding: 8,
  },
  columnWrapper: {
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  ingredientItem: {
    width: '48.5%',
    backgroundColor: COLORS.white,
    borderRadius: 16,
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  selectedIngredient: {
    backgroundColor: COLORS.primaryLight,
    borderColor: COLORS.primary,
  },
  ingredientContent: {
    padding: 16,
  },
  checkboxContainer: {
    marginBottom: 12,
  },
  selectedCheckboxContainer: {
    transform: [{ scale: 1.1 }],
  },
  ingredientTextContainer: {
    gap: 4,
  },
  ingredientName: {
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.text.primary,
    lineHeight: 20,
  },
  selectedIngredientText: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  expiryDate: {
    fontSize: 12,
    color: COLORS.text.secondary,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  noDataText: {
    marginTop: 12,
    fontSize: 15,
    color: COLORS.text.secondary,
    textAlign: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.text.secondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 16,
    padding: 20,
    backgroundColor: COLORS.errorBg,
    borderRadius: 12,
  },
  errorText: {
    marginTop: 8,
    color: COLORS.error,
    fontSize: 16,
    textAlign: 'center',
    fontWeight: '500',
  },
  recipeContainer: {
    flex: 1,
    marginTop: 24,
  },
  recipeContent: {
    flex: 1,
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
    fontSize: 24,
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
  buttonContainer: {
    flexDirection: 'column',
    gap: 8,
    padding: 16,
  },
  searchAgainButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.accent.primary,
    borderRadius: 12,
    padding: 16,
  },
  newSearchButton: {
    backgroundColor: COLORS.accent.violet,
  },
  searchAgainButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  ingredientDot: {
    marginRight: 8,
  },
  emptyListContainer: {
    flex: 1,
    height: '100%',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    borderRadius: 16,
    margin: 16,
    gap: 8,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.secondary,
    marginTop: 8,
  },
  emptySubText: {
    fontSize: 14,
    color: COLORS.text.secondary,
  },
});

export default RecommendRecipe;