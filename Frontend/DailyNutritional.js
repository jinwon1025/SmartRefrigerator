import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ScrollView, StyleSheet, ActivityIndicator, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { API_URL } from "@env";

const COLORS = {
    primary: '#3B82F6',
    background: '#F1F5F9',
    text: {
        primary: '#111827',
        secondary: '#6B7280',
    },
    white: '#FFFFFF',
    disabled: '#94A3B8',
    female: '#FF4081',
    border: '#CBD5E1',
    error: '#DC2626',
    categories: {
        energy: '#EA580C',
        macro: '#059669',
        vitamin: '#DB2777',
        mineral: '#4F46E5',
    },
};

const NUTRIENT_CATEGORIES = {
    energy: {
        title: '에너지',
        items: ['에너지(kcal)'],
        color: COLORS.categories.energy,
        icons: {
            '에너지(kcal)': 'flame'
        }
    },
    macro: {
        title: '다량영양소',
        items: ['단백질(g)', '식이섬유(g)'],
        color: COLORS.categories.macro,
        icons: {
            '단백질(g)': 'barbell',
            '식이섬유(g)': 'leaf'
        }
    },
    vitamin: {
        title: '비타민',
        items: ['비타민 A(㎍ RAE)', '비타민 C(mg)', '티아민(mg)', '리보플라빈(mg)', '니아신(mg)'],
        color: COLORS.categories.vitamin,
        icons: {
            '비타민 A(㎍ RAE)': 'sunny',
            '비타민 C(mg)': 'medkit',
            '티아민(mg)': 'flash',
            '리보플라빈(mg)': 'battery-charging',
            '니아신(mg)': 'pulse'
        }
    },
    mineral: {
        title: '무기질',
        items: ['칼슘(mg)', '나트륨(mg)', '철(mg)'],
        color: COLORS.categories.mineral,
        icons: {
            '칼슘(mg)': 'fitness',
            '나트륨(mg)': 'water',
            '철(mg)': 'medal'
        }
    }
};

const DailyNutritional = () => {
    const [age, setAge] = useState('');
    const [gender, setGender] = useState('');
    const [foodName, setFoodName] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [addedFoods, setAddedFoods] = useState([]);
    const [nutritionResults, setNutritionResults] = useState({ analysis: {}, recommendations: {} });
    const [isLoading, setIsLoading] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [selectedFood, setSelectedFood] = useState(null);
    const [amount, setAmount] = useState('');
    const [searchLoading, setSearchLoading] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);

    const searchFood = async () => {
        if (!foodName.trim()) return;
        setSearchLoading(true);
        setHasSearched(true);

        try {
            // 1초 딜레이 추가
            await new Promise(resolve => setTimeout(resolve, 1000));

            const response = await axios.get(`http://${API_URL}:3000/search-food?name=${foodName}`);
            setSearchResults(response.data);
        } catch (error) {
            console.error('Error searching food:', error);
            Alert.alert('오류', '음식 검색 중 오류가 발생했습니다.');
        } finally {
            setSearchLoading(false);
        }
    };

    const handleAddFood = (food) => {
        setSelectedFood(food);
        setModalVisible(true);
    };

    const confirmAddFood = () => {
        if (amount && !isNaN(amount)) {
            const newFood = {
                name: selectedFood['식품명'],
                amount: parseFloat(amount),
                details: selectedFood,
            };
            setAddedFoods([...addedFoods, newFood]);
            setFoodName('');
            setSearchResults([]);
            setModalVisible(false);
            setAmount('');
            setHasSearched(false);
        } else {
            Alert.alert('오류', '올바른 섭취량을 입력해주세요.');
        }
    };

    const removeFood = (index) => {
        setAddedFoods(addedFoods.filter((_, i) => i !== index));
    };

    const handleSubmit = async () => {
        if (!age || !gender || addedFoods.length === 0) {
            Alert.alert('오류', '나이, 성별, 그리고 최소 하나의 음식을 입력해야 합니다.');
            return;
        }

        setIsLoading(true);
        try {
            // 1초 딜레이 추가
            await new Promise(resolve => setTimeout(resolve, 1000));

            const response = await axios.post(`http://${API_URL}:3000/analyze-nutrition`, {
                age: parseInt(age),
                gender,
                foodIntake: addedFoods.map(food => ({
                    name: food.name,
                    amount: food.amount,
                })),
            });
            setNutritionResults(response.data);
        } catch (error) {
            console.error('분석 오류:', error);
            Alert.alert('오류', '영양 분석 중 오류가 발생했습니다.');
        } finally {
            setIsLoading(false);
        }
    };
    const handleReset = () => {
        setAge('');
        setGender('');
        setFoodName('');
        setAddedFoods([]);
        setSearchResults([]);
        setNutritionResults({ analysis: {}, recommendations: {} });
        setHasSearched(false);
    };

    const renderNutrientItem = (nutrient, data, categoryColor, icon) => {
        const percentage = data.percentage;
        const intake = data.intake;
        const standard = data.standard;

        return (
            <View style={styles.nutrientItem} key={nutrient}>
                <View style={styles.nutrientMainInfo}>
                    <View style={[styles.iconContainer, { backgroundColor: `${categoryColor}20` }]}>
                        <Ionicons name={`${icon}-outline`} size={20} color={categoryColor} />
                    </View>
                    <Text style={styles.nutrientLabel}>{nutrient}</Text>
                </View>
                <View style={styles.nutrientValueContainer}>
                    <View style={[styles.percentageBar, { backgroundColor: `${categoryColor}20` }]}>
                        <View
                            style={[
                                styles.percentageFill,
                                {
                                    backgroundColor: categoryColor,
                                    width: `${Math.min(percentage, 100)}%`
                                }
                            ]}
                        />
                        <Text style={[styles.percentageText, { color: categoryColor }]}>
                            {percentage.toFixed(1)}%
                        </Text>
                    </View>
                    <View style={styles.nutritionDetails}>
                        <Text style={styles.nutritionValue}>
                            섭취량: {intake.toFixed(1)}
                        </Text>
                        <Text style={styles.nutritionValue}>
                            권장량: {standard.toFixed(1)}
                        </Text>
                    </View>
                </View>
            </View>
        );
    };

    const renderNutrientCategory = (categoryKey) => {
        if (!nutritionResults.analysis) return null;

        const categoryInfo = NUTRIENT_CATEGORIES[categoryKey];
        const relevantNutrients = categoryInfo.items.filter(nutrient =>
            nutritionResults.analysis[nutrient]
        );

        if (relevantNutrients.length === 0) return null;

        return (
            <View key={categoryKey} style={styles.categoryContainer}>
                <View style={[styles.categoryHeader, { backgroundColor: `${categoryInfo.color}15` }]}>
                    <View style={styles.categoryTitleContainer}>
                        <Ionicons
                            name={`${Object.values(categoryInfo.icons)[0]}-outline`}
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
                    {relevantNutrients.map(nutrient => {
                        const data = nutritionResults.analysis[nutrient];
                        if (!data) return null;

                        return renderNutrientItem(
                            nutrient,
                            data,
                            categoryInfo.color,
                            categoryInfo.icons[nutrient]
                        );
                    })}
                </View>
            </View>
        );
    };

    const renderRecommendationCategory = (nutrient, foods, categoryColor) => {
        if (!foods || foods.length === 0) return null;

        const categoryInfo = Object.values(NUTRIENT_CATEGORIES).find(category =>
            category.items.some(item => item === nutrient)
        );

        const icon = categoryInfo?.icons[nutrient] || 'restaurant-outline';
        const color = categoryColor || COLORS.primary;

        const unit = nutrient.match(/\((.*?)\)/)?.[1] || '';

        return (
            <View style={styles.categoryContainer}>
                <View style={[styles.categoryHeader, { backgroundColor: `${color}15` }]}>
                    <View style={styles.categoryTitleContainer}>
                        <Ionicons
                            name={`${icon}-outline`}
                            size={24}
                            color={color}
                            style={styles.categoryIcon}
                        />
                        <Text style={[styles.categoryTitle, { color: color }]}>
                            {nutrient} 보충 추천
                        </Text>
                    </View>
                </View>
                <View style={styles.nutrientsList}>
                    <View style={styles.recommendationHeader}>
                        <Text style={styles.recommendationHeaderText}>추천 음식</Text>
                        <Text style={styles.recommendationHeaderText}>함유량 ({unit})</Text>
                    </View>
                    {foods.map((food, foodIndex) => (
                        <View
                            key={`${nutrient}-food-${foodIndex}`}
                            style={[
                                styles.recommendedFoodItem,
                                foodIndex === foods.length - 1 && { borderBottomWidth: 0 }
                            ]}
                        >
                            <View style={styles.recommendedFoodInfo}>
                                <Ionicons
                                    name="restaurant-outline"
                                    size={16}
                                    color={color}
                                    style={styles.recommendedFoodIcon}
                                />
                                <Text style={styles.recommendedFoodName}>{food[0]}</Text>
                            </View>
                            <Text style={[styles.recommendedFoodValue, { color }]}>
                                {food[1].toFixed(1)}
                            </Text>
                        </View>
                    ))}
                </View>
            </View>
        );
    };

    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            <Text style={styles.title}>📈 섭취량 분석 </Text>
            <Text style={styles.subtitle}>오늘 섭취한 영양소를 한눈에 파악하세요 </Text>

            <View style={styles.formSection}>
                <View style={styles.inputContainer}>
                    <Ionicons name="person-outline" size={24} color={COLORS.text.secondary} />
                    <TextInput
                        style={styles.input}
                        value={age}
                        onChangeText={setAge}
                        keyboardType="numeric"
                        placeholder="나이를 입력하세요"
                        placeholderTextColor={COLORS.text.secondary}
                    />
                </View>

                <View style={styles.genderContainer}>
                    <TouchableOpacity
                        style={[styles.genderButton, gender === '남성' && styles.maleButtonActive]}
                        onPress={() => setGender('남성')}
                    >
                        <Ionicons name="male" size={24} color={gender === '남성' ? COLORS.white : COLORS.text.secondary} />
                        <Text style={[styles.genderButtonText, gender === '남성' && styles.genderButtonTextActive]}>남성</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.genderButton, gender === '여성' && styles.femaleButtonActive]}
                        onPress={() => setGender('여성')}
                    >
                        <Ionicons name="female" size={24} color={gender === '여성' ? COLORS.white : COLORS.text.secondary} />
                        <Text style={[styles.genderButtonText, gender === '여성' && styles.genderButtonTextActive]}>여성</Text>
                    </TouchableOpacity>
                </View>
            </View>

            <View style={styles.searchSection}>
                <View style={styles.searchSectionHeader}>
                    <Ionicons name="restaurant-outline" size={24} color={COLORS.text.primary} />
                    <Text style={styles.searchSectionTitle}>섭취한 음식 입력</Text>
                </View>
            </View>

            <View style={styles.searchContainer}>
                <View style={styles.searchInputWrapper}>
                    <Ionicons name="search" size={20} color={COLORS.text.secondary} style={styles.searchIcon} />
                    <TextInput
                        style={styles.searchInput}
                        value={foodName}
                        onChangeText={(text) => {
                            setFoodName(text);
                            if (!text.trim()) {
                                setSearchResults([]);
                                setHasSearched(false);
                            }
                        }}
                        placeholder="음식 이름을 입력하세요"
                        placeholderTextColor={COLORS.text.secondary}
                        returnKeyType="search"
                        onSubmitEditing={searchFood}
                    />
                    {foodName.length > 0 && (
                        <TouchableOpacity
                            onPress={() => {
                                setFoodName('');
                                setSearchResults([]);
                                setHasSearched(false);
                            }}>
                            <Ionicons name="close-circle" size={20} color={COLORS.text.secondary} />
                        </TouchableOpacity>
                    )}
                </View>

                <TouchableOpacity
                    style={[styles.searchButton, !foodName.trim() && styles.searchButtonDisabled]}
                    onPress={searchFood}
                    disabled={!foodName.trim()}
                >
                    <Text style={styles.searchButtonText}>검색</Text>
                </TouchableOpacity>
            </View>

            {searchLoading ? (
                <View style={styles.searchLoadingContainer}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                    <Text style={styles.searchLoadingText}>음식 목록을 불러오는 중입니다...</Text>
                </View>
            ) : hasSearched && searchResults.length === 0 ? (
                <View style={styles.noResultsContainer}>
                    <Ionicons name="alert-circle-outline" size={48} color={COLORS.text.secondary} />
                    <Text style={styles.noResultsText}>검색된 음식이 없습니다</Text>
                </View>
            ) : searchResults.length > 0 && (
                <ScrollView style={styles.searchResults} nestedScrollEnabled={true}>
                    {searchResults.map((food, index) => (
                        <TouchableOpacity
                            key={index}
                            style={styles.searchResultItem}
                            onPress={() => handleAddFood(food)}
                        >
                            <Ionicons name="restaurant-outline" size={24} color={COLORS.primary} />
                            <Text style={styles.searchResultText}>{food['식품명']}</Text>
                            <Ionicons name="add-circle-outline" size={24} color={COLORS.primary} />
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            )}

            {addedFoods.length > 0 && (
                <View style={styles.addedFoodsContainer}>
                    <Text style={styles.sectionTitle}>추가된 음식</Text>
                    {addedFoods.map((food, index) => (
                        <View key={index} style={styles.addedFoodItem}>
                            <View style={styles.addedFoodInfo}>
                                <Text style={styles.addedFoodName}>{food.name}</Text>
                                <Text style={styles.addedFoodAmount}>{food.amount}g</Text>
                            </View>
                            <TouchableOpacity onPress={() => removeFood(index)}>
                                <Ionicons name="close-circle" size={24} color={COLORS.error} />
                            </TouchableOpacity>
                        </View>
                    ))}
                    <View style={styles.actionButtons}>
                        <TouchableOpacity
                            style={[styles.actionButton, styles.analyzeButton]}
                            onPress={handleSubmit}
                        >
                            <Ionicons name="analytics" size={24} color={COLORS.white} />
                            <Text style={styles.actionButtonText}>분석하기</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.actionButton, styles.resetButton]}
                            onPress={handleReset}
                        >
                            <Ionicons name="refresh" size={24} color={COLORS.white} />
                            <Text style={styles.actionButtonText}>초기화</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}

            {isLoading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                    <Text style={styles.loadingText}>영양 정보를 분석하는 중입니다...</Text>
                </View>
            ) : (
                nutritionResults.analysis && Object.keys(nutritionResults.analysis).length > 0 && (
                    <View style={styles.resultsSection}>
                        <Text style={styles.sectionTitle}>분석 결과</Text>
                        <View style={styles.categoriesContainer}>
                            {Object.keys(NUTRIENT_CATEGORIES).map((categoryKey) => (
                                <View key={`category-${categoryKey}`}>
                                    {renderNutrientCategory(categoryKey)}
                                </View>
                            ))}
                        </View>

                        {nutritionResults.recommendations &&
                            Object.keys(nutritionResults.recommendations).length > 0 && (
                                <View style={styles.recommendationsContainer}>
                                    <Text style={styles.sectionTitle}>추천 음식</Text>
                                    {Object.entries(nutritionResults.recommendations).map(
                                        ([nutrient, foods], index) => {
                                            const category = Object.entries(NUTRIENT_CATEGORIES).find(
                                                ([_, cat]) => cat.items.includes(nutrient)
                                            );
                                            const categoryColor = category ? category[1].color : COLORS.primary;

                                            return (
                                                <View key={`recommendation-${nutrient}-${index}`}>
                                                    {renderRecommendationCategory(nutrient, foods, categoryColor)}
                                                </View>
                                            );
                                        }
                                    )}
                                </View>
                            )}
                    </View>
                )
            )}

            <Modal
                animationType="slide"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>
                            {selectedFood ? selectedFood['식품명'] : ''}
                        </Text>
                        <View style={styles.modalInputContainer}>
                            <TextInput
                                style={styles.modalInput}
                                value={amount}
                                onChangeText={setAmount}
                                placeholder="섭취량(g)을 입력하세요"
                                keyboardType="numeric"
                                placeholderTextColor={COLORS.text.secondary}
                            />
                            <Text style={styles.modalInputUnit}>g</Text>
                        </View>
                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.modalCancelButton]}
                                onPress={() => setModalVisible(false)}
                            >
                                <Text style={styles.modalButtonText}>취소</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.modalConfirmButton]}
                                onPress={confirmAddFood}
                            >
                                <Text style={styles.modalButtonText}>추가</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </ScrollView>
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
    formSection: {
        gap: 12,
        marginBottom: 16,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.background,
        borderRadius: 12,
        padding: 10,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    input: {
        flex: 1,
        marginLeft: 8,
        fontSize: 15,
        color: COLORS.text.primary,
    },
    genderContainer: {
        flexDirection: 'row',
        gap: 8,
    },
    genderButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: COLORS.background,
        height: 48,
        borderRadius: 12,
        gap: 8,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    maleButtonActive: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary,
    },
    femaleButtonActive: {
        backgroundColor: COLORS.female,
        borderColor: COLORS.female,
    },
    genderButtonText: {
        fontSize: 15,
        color: COLORS.text.primary,
        fontWeight: '500',
    },
    genderButtonTextActive: {
        color: COLORS.white,
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
    searchResults: {
        maxHeight: 350,
        marginTop: 16,
        marginBottom: 50,
    },
    searchResultItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.background,
        borderRadius: 12,
        padding: 10,
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
    addedFoodsContainer: {
        marginTop: 24,
    },
    addedFoodItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: COLORS.background,
        borderRadius: 12,
        padding: 10,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    addedFoodInfo: {
        flex: 1,
    },
    addedFoodName: {
        fontSize: 15,
        fontWeight: '500',
        color: COLORS.text.primary,
    },
    addedFoodAmount: {
        fontSize: 14,
        color: COLORS.text.secondary,
        marginTop: 4,
    },
    actionButtons: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 24,
        marginBottom: 50,
    },
    actionButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 12,
        borderRadius: 12,
        gap: 8,
    },
    analyzeButton: {
        backgroundColor: COLORS.primary,
    },
    resetButton: {
        backgroundColor: COLORS.error,
    },
    actionButtonText: {
        color: COLORS.white,
        fontSize: 15,
        fontWeight: '600',
    },
    loadingContainer: {
        alignItems: 'center',
        padding: 32,
    },
    loadingText: {
        marginTop: 16,
        fontSize: 15,
        color: COLORS.text.secondary,
    },
    resultsSection: {
        backgroundColor: COLORS.white,
        borderRadius: 12,
        padding: 16,
        marginTop: 24,
        borderWidth: 1,
        borderColor: COLORS.border,
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
        marginBottom: 12,
        gap: 12,
    },
    iconContainer: {
        width: 44,
        height: 44,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
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
        gap: 8,
    },
    percentageBar: {
        height: 32,
        borderRadius: 16,
        overflow: 'hidden',
        position: 'relative',
    },
    percentageFill: {
        position: 'absolute',
        height: '100%',
        left: 0,
        top: 0,
    },
    percentageText: {
        position: 'absolute',
        width: '100%',
        textAlign: 'center',
        lineHeight: 32,
        fontSize: 14,
        fontWeight: '600',
    },
    nutritionDetails: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 4,
    },
    nutritionValue: {
        fontSize: 13,
        color: COLORS.text.secondary,
    },
    recommendedValue: {
        fontSize: 16,
        fontWeight: '600',
    },
    categoriesContainer: {
        gap: 20,
        marginBottom: 24,
    },
    recommendationsContainer: {
        marginTop: 24,
    },
    recommendationCard: {
        backgroundColor: COLORS.background,
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    recommendationTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: COLORS.text.primary,
        marginBottom: 12,
    },
    recommendedFood: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    recommendedFoodText: {
        marginLeft: 8,
        fontSize: 14,
        color: COLORS.text.secondary,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        backgroundColor: COLORS.white,
        borderRadius: 12,
        padding: 16,
        width: '80%',
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.text.primary,
        textAlign: 'center',
        marginBottom: 16,
    },
    modalInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.background,
        borderRadius: 12,
        paddingHorizontal: 10,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    modalInput: {
        flex: 1,
        height: 48,
        fontSize: 15,
        color: COLORS.text.primary,
    },
    modalInputUnit: {
        fontSize: 15,
        color: COLORS.text.secondary,
        marginLeft: 8,
    },
    modalButtons: {
        flexDirection: 'row',
        gap: 12,
    },
    modalButton: {
        flex: 1,
        alignItems: 'center',
        padding: 12,
        borderRadius: 12,
    },
    modalCancelButton: {
        backgroundColor: COLORS.text.secondary,
    },
    modalConfirmButton: {
        backgroundColor: COLORS.primary,
    },
    modalButtonText: {
        color: COLORS.white,
        fontSize: 15,
        fontWeight: '600',
    },
    searchLoadingContainer: {
        alignItems: 'center',
        paddingVertical: 20,
        borderRadius: 12,
        margin: 16,
    },
    searchLoadingText: {
        marginTop: 10,
        fontSize: 14,
        color: COLORS.text.secondary,
    },
    searchIcon: {
        marginRight: 8,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: COLORS.text.primary,
        marginBottom: 16,
    },
    recommendationHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
        backgroundColor: COLORS.background,
    },
    recommendationHeaderText: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.text.secondary,
    },
    recommendedFoodItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 12,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    recommendedFoodInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    recommendedFoodIcon: {
        marginRight: 8,
    },
    recommendedFoodName: {
        fontSize: 14,
        color: COLORS.text.primary,
        flex: 1,
    },
    recommendedFoodValue: {
        fontSize: 14,
        fontWeight: '600',
        minWidth: 60,
        textAlign: 'right',
    },
    noResultsContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 32,
        borderRadius: 12,
        margin: 16,
    },
    noResultsText: {
        marginTop: 12,
        fontSize: 15,
        color: COLORS.text.secondary,
        textAlign: 'center',
    },
    searchSection: {
        marginBottom: 20,
        paddingVertical: 8,
    },
    searchSectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    searchSectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: COLORS.text.primary,
    },
});

export default DailyNutritional;