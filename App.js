import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView, View, Text, TouchableOpacity } from 'react-native';
import { styles } from './styles/styles';
import HomeScreen from './Frontend/HomeScreen';
import InventoryList from './Frontend/InventoryList';
import SearchRecipe from './Frontend/SearchRecipe';
import RecommendRecipe from './Frontend/RecommendRecipe';
import FoodConsum from './Frontend/FoodConsum';
import Nutrition from './Frontend/Nutrition';
import Guideline from './Frontend/Guideline';
import PurchaseLinks from './Frontend/PurchaseLinks';
import DailyNutritional from './Frontend/DailyNutritional';
import Allergie from './Frontend/Allergie';
import Register from './Frontend/Register';

export default function App() {
  const [activeScreen, setActiveScreen] = useState(0);

  const renderScreen = () => {
    switch (activeScreen) {
      case 1: return <InventoryList />;
      case 2: return <SearchRecipe />;
      case 3: return <RecommendRecipe />;
      case 4: return <FoodConsum />;
      case 5: return <Nutrition />;
      case 6: return <Guideline />;
      case 7: return <DailyNutritional />;
      case 8: return <PurchaseLinks />;
      case 9: return <Allergie />
      case 10: return <Register />
      default: return <HomeScreen setActiveScreen={setActiveScreen} />;
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.titleContainer}>
          <View style={styles.headerContainer}>
            {activeScreen !== 0 && (
              <TouchableOpacity
                onPress={() => setActiveScreen(0)}
                style={styles.backButton}
              >
                <Text style={styles.backButtonText}>←</Text>
              </TouchableOpacity>
            )}
            <Text style={styles.title}>스마트 냉장고</Text>
          </View>
        </View>
        {renderScreen()}
      </View>
      <StatusBar style="light" />
    </SafeAreaView>
  );
}