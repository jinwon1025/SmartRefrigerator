import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, StyleSheet, Keyboard } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { API_URL } from "@env";

const COLORS = {
  primary: '#2563EB',
  background: '#F1F5F9',
  text: {
    primary: '#0F172A',
    secondary: '#475569',
  },
  find: '#4CAF50',
  white: '#FFFFFF',
  border: '#CBD5E1',
  error: '#DC2626',
  errorBg: '#FEE2E2',
  female: '#E91E63',
  disabled: '#94A3B8',
  categories: {
    basic: '#4338CA',
    energy: '#EA580C',
    macro: '#059669',
    vitamin: '#DB2777',
    mineral: '#4F46E5',
  },
};

const NUTRIENT_CATEGORIES = {
  basic: {
    title: '기본 정보',
    items: ['연령', '성별'],
    color: COLORS.categories.basic,
    icons: {
      '연령': 'calendar',
      '성별': 'person'
    }
  },
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
      '비타민 A(㎍ RAE)': 'eye',
      '비타민 C(mg)': 'medkit',
      '티아민(mg)': 'flash',
      '리보플라빈(mg)': 'battery-charging',
      '니아신(mg)': 'pulse'
    }
  },
  mineral: {
    title: '무기질',
    items: ['칼슘(mg)', '칼륨(mg)', '나트륨(mg)', '철(mg)'],
    color: COLORS.categories.mineral,
    icons: {
      '칼슘(mg)': 'fitness',
      '칼륨(mg)': 'heart',
      '나트륨(mg)': 'water',
      '철(mg)': 'medal'
    }
  }
};

const Guideline = () => {
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [queriedGender, setQueriedGender] = useState('');
  const [nutritionInfo, setNutritionInfo] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchNutritionInfo = async () => {
    if (!age || !gender) {
      setNutritionInfo({ error: "나이와 성별을 모두 입력해주세요." });
      return;
    }

    Keyboard.dismiss();
    setLoading(true);

    try {
      // 1초 딜레이 추가
      await new Promise(resolve => setTimeout(resolve, 1000));

      const response = await fetch(`http://${API_URL}:3000/nutritional-info?age=${age}&gender=${gender}`);
      const data = await response.json();

      if (response.ok) {
        setNutritionInfo(data);
        setQueriedGender(gender);
      } else {
        setNutritionInfo({ error: data.error });
      }
    } catch (error) {
      setNutritionInfo({ error: "서버 연결에 실패했습니다." });
    } finally {
      setLoading(false);
    }
  };

  const renderNutrientItem = (nutrient, value, categoryColor, icon) => {
    const unit = nutrient.includes('(') ? nutrient.split('(')[1].replace(')', '') : '';
    const label = nutrient.split('(')[0];

    return (
      <View style={styles.nutrientItem} key={nutrient}>
        <View style={styles.nutrientMainInfo}>
          <View style={[styles.iconContainer, { backgroundColor: `${categoryColor}20` }]}>
            <Ionicons name={`${icon}-outline`} size={20} color={categoryColor} />
          </View>
          <Text style={styles.nutrientLabel}>{label}</Text>
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

  const renderNutrientCategory = (categoryKey) => {
    if (!nutritionInfo) return null;

    const categoryInfo = NUTRIENT_CATEGORIES[categoryKey];
    const relevantNutrients = categoryInfo.items.filter(nutrient => nutritionInfo[nutrient]);

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
          {relevantNutrients.map(nutrient =>
            nutritionInfo[nutrient] &&
            renderNutrientItem(
              nutrient,
              nutritionInfo[nutrient],
              categoryInfo.color,
              categoryInfo.icons[nutrient]
            )
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.fixedContainer}>
        <Text style={styles.title}>📋 영양 가이드</Text>
        <Text style={styles.subtitle}>성별과 나이에 맞는 영양 기준을 알아보세요 </Text>

        <View style={styles.formContainer}>
          <View style={styles.inputContainer}>
            <Ionicons name="calendar-outline" size={24} color={COLORS.text.secondary} />
            <TextInput
              style={styles.input}
              placeholder="나이를 입력하세요"
              value={age}
              onChangeText={setAge}
              keyboardType="numeric"
              placeholderTextColor={COLORS.text.secondary}
            />
          </View>

          <View style={styles.genderContainer}>
            <TouchableOpacity
              style={[
                styles.genderButton,
                gender === '남성' && styles.genderButtonActiveMale,
                gender === '여성' && styles.genderButtonInactive,
              ]}
              onPress={() => setGender('남성')}
            >
              <Ionicons
                name="male"
                size={24}
                color={gender === '남성' ? COLORS.white : COLORS.text.secondary}
              />
              <Text style={[
                styles.genderButtonText,
                gender === '남성' ? styles.genderButtonTextActive : null
              ]}>남성</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.genderButton,
                gender === '여성' && styles.genderButtonActiveFemale,
                gender === '남성' && styles.genderButtonInactive,
              ]}
              onPress={() => setGender('여성')}
            >
              <Ionicons
                name="female"
                size={24}
                color={gender === '여성' ? COLORS.white : COLORS.text.secondary}
              />
              <Text style={[
                styles.genderButtonText,
                gender === '여성' ? styles.genderButtonTextActive : null
              ]}>여성</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[
              styles.submitButton,
              (!age || !gender) && styles.submitButtonDisabled
            ]}
            onPress={fetchNutritionInfo}
            disabled={!age || !gender}
          >
            <Ionicons name="search" size={24} color={COLORS.white} />
            <Text style={styles.submitButtonText}>영양 정보 조회</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={loading ? styles.centerContent : null}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={queriedGender === '여성' ? COLORS.female : COLORS.primary} />
            <Text style={styles.loadingText}>영양 정보를 조회하고 있습니다...</Text>
          </View>
        ) : nutritionInfo && (
          <View style={styles.resultContainer}>
            {nutritionInfo.error ? (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={24} color={COLORS.error} />
                <Text style={styles.errorText}>{nutritionInfo.error}</Text>
              </View>
            ) : (
              <View style={styles.categoriesContainer}>
                {Object.keys(NUTRIENT_CATEGORIES).map(categoryKey =>
                  renderNutrientCategory(categoryKey)
                )}
              </View>
            )}
          </View>
        )}
      </ScrollView>
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
    padding: 24,
    paddingTop: 0,
  },
  centerContent: {
    flexGrow: 1,
    justifyContent: 'center',
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
  formContainer: {
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
  genderButtonActiveMale: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  genderButtonActiveFemale: {
    backgroundColor: COLORS.female,
    borderColor: COLORS.female,
  },
  genderButtonInactive: {
    opacity: 0.5,
  },
  genderButtonText: {
    fontSize: 15,
    color: COLORS.text.primary,
    fontWeight: '500',
  },
  genderButtonTextActive: {
    color: COLORS.white,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.find,
    height: 48,
    borderRadius: 12,
    gap: 8,
  },
  submitButtonDisabled: {
    backgroundColor: COLORS.disabled,
  },
  submitButtonText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '600',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: COLORS.text.secondary,
    textAlign: 'center',
  },
  resultContainer: {
    marginTop: 8,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.errorBg,
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  errorText: {
    color: COLORS.error,
    fontSize: 16,
    flex: 1,
  },
  categoriesContainer: {
    gap: 20,
    marginBottom: 50,
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
});

export default Guideline;