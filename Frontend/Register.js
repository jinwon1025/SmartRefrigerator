import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TextInput, Alert, Platform, ActivityIndicator, Linking, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { BarCodeScanner } from 'expo-barcode-scanner';
import { LogBox } from 'react-native';
import { API_URL } from "@env";

LogBox.ignoreLogs(['ViewPropTypes', 'BarCodeScanner has been deprecated']);

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

const Register = () => {
  const [scannerVisible, setScannerVisible] = useState(false);
  const [hasPermission, setHasPermission] = useState(null);
  const [scanned, setScanned] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [date, setDate] = useState(new Date());
  const [loading, setLoading] = useState(false);
  const [productFound, setProductFound] = useState(false);
  const [formData, setFormData] = useState({
    barcode: '',
    quantity: '',
    expiryDate: '',
    productName: '',
    country: '',
    company: '',
    cls_nm_1: '',
    cls_nm_2: '',
    cls_nm_3: ''
  });

  useEffect(() => {
    checkPermissions();
  }, []);

  const checkPermissions = async () => {
    try {
      const { status } = await BarCodeScanner.getPermissionsAsync();
      console.log('Initial permission status:', status);
      setHasPermission(status === 'granted');
    } catch (error) {
      console.error('Permission check error:', error);
      setHasPermission(false);
    }
  };

  const requestPermissions = async () => {
    try {
      const { status } = await BarCodeScanner.requestPermissionsAsync();
      console.log('Permission request result:', status);
      setHasPermission(status === 'granted');
      return status === 'granted';
    } catch (error) {
      console.error('Permission request error:', error);
      setHasPermission(false);
      return false;
    }
  };

  const handleBarCodeScanned = ({ type, data }) => {
    setScanned(true);
    setScannerVisible(false);
    setFormData(prev => ({
      ...prev,
      barcode: data
    }));
    setProductFound(false);
    Alert.alert(
      "스캔 완료",
      `바코드: ${data}`,
      [{ text: "확인" }]
    );
  };

  const searchProductInfo = async () => {
    if (!formData.barcode) {
      Alert.alert("입력 오류", "바코드를 입력해주세요.");
      return;
    }

    try {
      setLoading(true);
      // 1초 딜레이 추가
      await new Promise(resolve => setTimeout(resolve, 1000));

      const response = await fetch(`http://${API_URL}:3000/api/product/${formData.barcode}`);
      if (!response.ok) {
        throw new Error('제품 정보를 가져오는데 실패했습니다.');
      }

      const productInfo = await response.json();

      setFormData(prev => ({
        ...prev,
        productName: productInfo.productName,
        country: productInfo.country,
        company: productInfo.company,
        cls_nm_1: productInfo.cls_nm_1,
        cls_nm_2: productInfo.cls_nm_2,
        cls_nm_3: productInfo.cls_nm_3
      }));
      setProductFound(true);
    } catch (error) {
      Alert.alert("오류", "제품 정보를 가져오는데 실패했습니다.");
      setProductFound(false);
    } finally {
      setLoading(false);
    }
  };

  const handleScannerOpen = async () => {
    try {
      const { status: existingStatus } = await BarCodeScanner.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await BarCodeScanner.requestPermissionsAsync();
        finalStatus = status;
      }

      setHasPermission(finalStatus === 'granted');

      if (finalStatus === 'granted') {
        setScannerVisible(true);
        setScanned(false);
      } else {
        Alert.alert(
          "권한 거부됨",
          "카메라 사용 권한이 거부되었습니다. 설정에서 권한을 허용해주세요.",
          [
            {
              text: "설정으로 이동",
              onPress: () => Platform.OS === 'ios' ? Linking.openURL('app-settings:') : Linking.openSettings()
            },
            { text: "취소" }
          ]
        );
      }
    } catch (error) {
      console.error('Camera permission error:', error);
      Alert.alert("오류", "카메라 권한을 확인하는 중 오류가 발생했습니다.");
    }
  };

  const formatDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const onDateChange = (event, selectedDate) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setDate(selectedDate);
      setFormData({
        ...formData,
        expiryDate: formatDate(selectedDate)
      });
    }
  };

  const showDatepicker = () => {
    setShowDatePicker(true);
  };

  const validateForm = () => {
    if (!formData.barcode) {
      Alert.alert("입력 오류", "바코드를 입력해주세요.");
      return false;
    }

    if (!formData.productName) {
      Alert.alert("입력 오류", "제품 정보를 먼저 검색해주세요.");
      return false;
    }

    if (!formData.quantity && !formData.expiryDate) {
      Alert.alert("입력 오류", "수량과 유통기한을 입력해주세요.");
      return false;
    }

    if (!formData.quantity || parseInt(formData.quantity) <= 0) {
      Alert.alert("입력 오류", "올바른 수량을 입력해주세요.");
      return false;
    }

    if (!formData.expiryDate) {
      Alert.alert("입력 오류", "유통기한을 선택해주세요.");
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    Alert.alert(
      "제품 등록 확인",
      `${formData.productName}을(를) 등록하시겠습니까?`,
      [
        {
          text: "취소",
          style: "cancel"
        },
        {
          text: "확인",
          onPress: async () => {
            try {
              setLoading(true);
              const response = await fetch(`http://${API_URL}:3000/api/product`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  gtin: formData.barcode,
                  productName: formData.productName,
                  country: formData.country,
                  company: formData.company,
                  quantity: parseInt(formData.quantity),
                  expirationDate: formData.expiryDate,
                  cls_nm_1: formData.cls_nm_1,
                  cls_nm_2: formData.cls_nm_2,
                  cls_nm_3: formData.cls_nm_3
                }),
              });

              if (!response.ok) {
                throw new Error('제품 등록에 실패했습니다.');
              }

              Alert.alert("성공", "제품이 성공적으로 등록되었습니다.");
              handleReset();
            } catch (error) {
              Alert.alert("오류", "제품 등록에 실패했습니다.");
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleReset = () => {
    setFormData({
      barcode: '',
      quantity: '',
      expiryDate: '',
      productName: '',
      country: '',
      company: '',
      cls_nm_1: '',
      cls_nm_2: '',
      cls_nm_3: ''
    });
    setDate(new Date());
    setProductFound(false);
  };

  const isSearchButtonEnabled = () => {
    return formData.barcode.length > 0;
  };

  const isSubmitButtonEnabled = () => {
    return productFound &&
      formData.quantity &&
      formData.expiryDate &&
      !loading;
  };

  if (scannerVisible) {
    if (hasPermission === null) {
      return (
        <View style={[styles.container, styles.centerContent]}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>카메라 권한 요청 중...</Text>
        </View>
      );
    }

    if (hasPermission === false) {
      return (
        <View style={[styles.container, styles.centerContent]}>
          <Text style={styles.errorText}>카메라 접근이 거부되었습니다.</Text>
          <TouchableOpacity
            style={styles.submitButton}
            onPress={() => {
              setScannerVisible(false);
              handleScannerOpen();
            }}
          >
            <Text style={styles.submitButtonText}>권한 다시 요청</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.submitButton, { marginTop: 8 }]}
            onPress={() => setScannerVisible(false)}
          >
            <Text style={styles.submitButtonText}>돌아가기</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.container}>
        <BarCodeScanner
          onBarCodeScanned={scanned ? undefined : handleBarCodeScanned}
          style={StyleSheet.absoluteFillObject}
        />
        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => setScannerVisible(false)}
        >
          <Ionicons name="close-circle" size={40} color="white" />
        </TouchableOpacity>
        <View style={styles.scannerOverlay}>
          <Text style={styles.scannerText}>바코드를 스캔해주세요</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>📦 상품 등록</Text>
      <Text style={styles.subtitle}>새로운 상품을 등록하고 관리해보세요. </Text>

      <ScrollView style={styles.formContainer}>
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>바코드 번호</Text>
          <View style={styles.barcodeInputContainer}>
            <TextInput
              style={styles.barcodeInput}
              value={formData.barcode}
              onChangeText={(text) => {
                setFormData({ ...formData, barcode: text });
                setProductFound(false);
              }}
              placeholder="바코드 번호"
              keyboardType="numeric"
              editable={!loading}
            />
            <TouchableOpacity
              style={styles.scanButton}
              onPress={handleScannerOpen}
              disabled={loading}
            >
              <Ionicons name="scan-outline" size={24} color="white" />
              <Text style={styles.scanButtonText}>스캔</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={[
              styles.searchButton,
              !isSearchButtonEnabled() && styles.disabledSearchButton
            ]}
            onPress={searchProductInfo}
            disabled={!isSearchButtonEnabled() || loading}
          >
            <Ionicons name="search-outline" size={24} color="white" />
            <Text style={styles.searchButtonText}>정보 불러오기</Text>
          </TouchableOpacity>
        </View>

        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>정보를 찾고 있습니다...</Text>
          </View>
        )}

        {!loading && productFound && (
          <>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>상품명</Text>
              <Text style={styles.infoText}>{formData.productName}</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>제조사</Text>
              <Text style={styles.infoText}>{formData.company}</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>제조국가</Text>
              <Text style={styles.infoText}>{formData.country}</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>상품분류</Text>
              <Text style={styles.infoText}>
                {formData.cls_nm_1} &gt; {formData.cls_nm_2} &gt; {formData.cls_nm_3}
              </Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>수량</Text>
              <TextInput
                style={styles.input}
                value={formData.quantity}
                onChangeText={(text) => setFormData({ ...formData, quantity: text })}
                placeholder="수량 입력"
                keyboardType="numeric"
                editable={!loading}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>유통기한</Text>
              <TouchableOpacity
                style={styles.dateInput}
                onPress={showDatepicker}
                disabled={loading}
              >
                <Text style={[styles.dateText, !formData.expiryDate && styles.placeholderText]}>
                  {formData.expiryDate || '날짜를 선택하세요'}
                </Text>
                <Ionicons name="calendar-outline" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {showDatePicker && (
              <DateTimePicker
                value={date}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={onDateChange}
                minimumDate={new Date()}
              />
            )}

            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.submitButton, !isSubmitButtonEnabled() && styles.disabledButton]}
                onPress={handleSubmit}
                disabled={!isSubmitButtonEnabled()}
              >
                {loading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.submitButtonText}>등록하기</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.resetButton, loading && styles.disabledButton]}
                onPress={handleReset}
                disabled={loading}
              >
                <Text style={styles.resetButtonText}>초기화</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>
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
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  formContainer: {
    flex: 1,
  },
  inputGroup: {
    marginBottom: 20,
    gap: 8,
  },
  inputLabel: {
    fontSize: 16,
    color: COLORS.text.primary,
    fontWeight: '500',
  },
  barcodeInputContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  barcodeInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 15,
    fontSize: 16,
  },
  scanButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    justifyContent: 'center',
    minWidth: 100,
  },
  searchButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  disabledSearchButton: {
    backgroundColor: COLORS.disabled,
  },
  scanButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
  searchButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 15,
    fontSize: 16,
  },
  dateInput: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 15,
    backgroundColor: COLORS.white,
  },
  dateText: {
    fontSize: 16,
    color: COLORS.text.primary,
  },
  placeholderText: {
    color: COLORS.text.secondary,
  },
  infoText: {
    fontSize: 16,
    color: COLORS.text.primary,
    padding: 15,
    backgroundColor: COLORS.background,
    borderRadius: 12,
  },
  disabledButton: {
    opacity: 0.5,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.text.secondary,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    color: COLORS.accent.rose,
    marginBottom: 20,
    textAlign: 'center',
  },
  scannerOverlay: {
    position: 'absolute',
    bottom: 100,
    left: 0,
    right: 0,
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
    padding: 16,
  },
  scannerText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
  closeButton: {
    position: 'absolute',
    top: 40,
    right: 20,
    zIndex: 1,
    padding: 8,
  },
  bottomPadding: {
    height: 40,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
    marginBottom: 20,
  },
  submitButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    flex: 1,
  },
  submitButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
  resetButton: {
    backgroundColor: COLORS.accent.rose,
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    flex: 1,
  },
  resetButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 200,
  },
});

export default Register;