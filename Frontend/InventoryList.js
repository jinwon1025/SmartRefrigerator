import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  Modal,
  Pressable,
  Keyboard
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import debounce from 'lodash/debounce';
import { API_URL } from "@env";

const COLORS = {
  primary: '#3B82F6',
  background: '#F1F5F9',
  surface: '#FFFFFF',
  surfaceHover: '#F8FAFC',
  border: '#CBD5E1',
  text: {
    primary: '#0F172A',
    secondary: '#475569',
  },
  white: '#FFFFFF',
  disabled: '#94A3B8',
  status: {
    error: '#EF4444',    // 빨간색 - 위험
    warning: '#F59E0B',  // 주황색 - 주의
    good: '#10B981',     // 초록색 - 양호
  },
};

const InventoryList = () => {
  const [data, setData] = useState([]);
  const [expandedItems, setExpandedItems] = useState(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [noData, setNoData] = useState(false);
  const [sortOrder, setSortOrder] = useState('asc');
  const [sortType, setSortType] = useState('date');
  const [showSortOptions, setShowSortOptions] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const sortOptions = [
    { label: '유통기한 빠른 순', type: 'date', order: 'asc' },
    { label: '유통기한 느린 순', type: 'date', order: 'desc' },
    { label: '가나다순', type: 'name', order: 'asc' },
    { label: '가나다 역순', type: 'name', order: 'desc' },
  ];

  const getCurrentSortLabel = () => {
    const option = sortOptions.find(
      opt => opt.type === sortType && opt.order === sortOrder
    );
    return option ? option.label : '정렬 방식';
  };

  const formatExpirationDate = (dateString) => {
    const expirationDate = new Date(dateString);
    const today = new Date();

    const koreanDate = expirationDate.toLocaleString('ko-KR', {
      timeZone: 'Asia/Seoul',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });

    const expDate = new Date(expirationDate.getFullYear(), expirationDate.getMonth(), expirationDate.getDate());
    const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    const diffTime = expDate - todayDate;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    const dateMatch = koreanDate.match(/(\d{4})\. (\d{1,2})\. (\d{1,2})/);
    const year = dateMatch[1];
    const month = dateMatch[2];
    const day = dateMatch[3];

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

  const getExpirationColor = (dateString) => {
    const expirationDate = new Date(dateString);
    const today = new Date();
    const expDate = new Date(expirationDate.getFullYear(), expirationDate.getMonth(), expirationDate.getDate());
    const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const diffTime = expDate - todayDate;
    const days = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (days < 0) return COLORS.status.error;     // 유통기한 만료
    if (days <= 14) return COLORS.status.warning; // 14일 이하 남음
    return COLORS.status.good;                    // 14일 초과 남음
  };

  const getStatusText = (diffDays) => {
    if (diffDays < 0) return '만료됨';
    if (diffDays <= 14) return '주의';
    return '양호';
  };

  const fetchData = useCallback((query = '', isInitialLoad = false) => {
    setLoading(true);
    setNoData(false);
    Keyboard.dismiss();

    fetch(`http://${API_URL}:3000/search?q=${encodeURIComponent(query)}`)
      .then(res => res.json())
      .then(data => {
        console.log('상품 목록:', data.map(item => item.product_name));

        setTimeout(() => {
          if (data.length === 0) {
            setNoData(true);
            setLoading(false);
            return;
          }

          setData(data);
          setLoading(false);
        }, 1000);
      })
      .catch(error => {
        console.error(error);
        Alert.alert("오류", "데이터를 불러오는데 실패했습니다.");
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    // 초기 로딩임을 표시하기 위해 true 전달
    fetchData('', true);
  }, []);

  const handleSearch = () => {
    if (searchQuery.trim()) {
      setHasSearched(true);  // 검색 버튼 클릭 표시
      Keyboard.dismiss();
      setLoading(true);
      fetchData(searchQuery, false);
    }
  };

  const handleClearSearch = () => {
    setSearchQuery('');     // 검색어 초기화
    setHasSearched(false);  // 검색 상태 초기화
    // fetchData('') 제거

    // 초기 데이터로 바로 되돌리기
    fetch(`http://${API_URL}:3000/search?q=`)
      .then(res => res.json())
      .then(data => {
        setData(data);
        if (data.length === 0) {
          setNoData(true);
        } else {
          setNoData(false);
        }
      })
      .catch(error => {
        console.error(error);
        Alert.alert("오류", "데이터를 불러오는데 실패했습니다.");
      });
  };

  const toggleExpand = (id) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const handleSort = (type, order) => {
    setSortType(type);
    setSortOrder(order);
    setShowSortOptions(false);

    setData(prevData => {
      return [...prevData].sort((a, b) => {
        if (type === 'date') {
          const dateA = new Date(a.expiration_date);
          const dateB = new Date(b.expiration_date);
          return order === 'asc' ? dateA - dateB : dateB - dateA;
        } else {
          return order === 'asc'
            ? a.product_name.localeCompare(b.product_name, 'ko-KR')
            : b.product_name.localeCompare(a.product_name, 'ko-KR');
        }
      });
    });
  };

  const updateQuantity = async (id, change) => {
    try {
      const response = await fetch(`http://${API_URL}:3000/update-quantity`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id, change }),
      });
      const updatedProduct = await response.json();
      if (response.ok) {
        setData(prevData => prevData.map(item =>
          item.id === updatedProduct.id ? updatedProduct : item
        ));
      } else {
        Alert.alert("오류", updatedProduct.error || "수량 업데이트에 실패했습니다.");
      }
    } catch (error) {
      console.error('Error updating quantity:', error);
      Alert.alert("오류", "수량 업데이트에 실패했습니다.");
    }
  };

  const renderItem = ({ item }) => {
    const { dateText, remainingText, diffDays } = formatExpirationDate(item.expiration_date);
    const expirationColor = getExpirationColor(item.expiration_date);
    const statusText = getStatusText(diffDays);
    const isExpanded = expandedItems.has(item.id);

    return (
      <TouchableOpacity
        style={[
          styles.productCard,
          isExpanded && styles.productCardExpanded
        ]}
        onPress={() => toggleExpand(item.id)}
        activeOpacity={0.7}
      >
        <View style={styles.productHeader}>
          <View style={styles.productMainInfo}>
            <Text style={styles.productName}>{item.product_name}</Text>
            <View style={styles.badge}>
              <Text style={styles.quantityText}>{item.quantity}개</Text>
            </View>
          </View>

          <View style={styles.statusRow}>
            <View style={[styles.expirationBadge, { backgroundColor: `${expirationColor}10` }]}>
              <Text style={[styles.expirationText, { color: expirationColor }]}>
                {dateText}
              </Text>
            </View>
            <Text style={[styles.statusText, { color: expirationColor }]}>
              {remainingText}
            </Text>
          </View>
        </View>

        {isExpanded && (
          <View style={styles.expandedContent}>
            <View style={styles.detailsRow}>
              <View style={styles.detailItem}>
                <Ionicons name="flag-outline" size={16} color={COLORS.text.secondary} />
                <View style={styles.detailTextContainer}>
                  <Text style={styles.detailValue}>{item.country}</Text>
                </View>
              </View>
              <View style={styles.detailItem}>
                <Ionicons name="business-outline" size={16} color={COLORS.text.secondary} />
                <View style={styles.detailTextContainer}>
                  <Text style={styles.detailValue}>{item.company}</Text>
                </View>
              </View>
            </View>

            <View style={styles.quantityControls}>
              <TouchableOpacity
                style={[styles.quantityButton, { borderColor: COLORS.status.error }]}
                onPress={() => updateQuantity(item.id, -1)}
              >
                <Ionicons name="remove" size={20} color={COLORS.status.error} />
              </TouchableOpacity>
              <Text style={styles.quantityValue}>{item.quantity}</Text>
              <TouchableOpacity
                style={[styles.quantityButton, { borderColor: COLORS.status.good }]}
                onPress={() => updateQuantity(item.id, 1)}
              >
                <Ionicons name="add" size={20} color={COLORS.status.good} />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.header}>📦 상품 관리</Text>
        <Text style={styles.subtitle}>등록된 상품을 확인하고 관리할 수 있어요. </Text>

        <View style={styles.searchWrapper}>
          <View style={styles.searchHeader}>
            <View style={styles.searchInputWrapper}>
              <Ionicons name="search" size={20} color={COLORS.text.secondary} style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="상품명을 입력해주세요"
                value={searchQuery}
                onChangeText={(text) => {
                  setSearchQuery(text);
                  if (!text.trim()) {
                    // 검색어가 비었을 때 초기화 로직
                    setHasSearched(false);
                    // 초기 데이터로 바로 되돌리기
                    fetch(`http://${API_URL}:3000/search?q=`)
                      .then(res => res.json())
                      .then(data => {
                        setData(data);
                        if (data.length === 0) {
                          setNoData(true);
                        } else {
                          setNoData(false);
                        }
                      })
                      .catch(error => {
                        console.error(error);
                        Alert.alert("오류", "데이터를 불러오는데 실패했습니다.");
                      });
                  }
                }}
                onSubmitEditing={handleSearch}
                returnKeyType="search"
                placeholderTextColor={COLORS.text.secondary}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={handleClearSearch}>
                  <Ionicons name="close-circle" size={20} color={COLORS.text.secondary} />
                </TouchableOpacity>
              )}
            </View>
            <TouchableOpacity
              style={styles.sortButton}
              onPress={() => setShowSortOptions(true)}
            >
              <Ionicons name="funnel-outline" size={20} color={COLORS.text.secondary} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[
              styles.searchButton,
              !searchQuery.trim() && styles.searchButtonDisabled
            ]}
            onPress={handleSearch}
            disabled={!searchQuery.trim()}
          >
            <Text style={[
              styles.searchButtonText,
              !searchQuery.trim() && styles.searchButtonTextDisabled
            ]}>상품 검색하기</Text>
          </TouchableOpacity>
        </View>

        <Modal
          visible={showSortOptions}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowSortOptions(false)}
        >
          <Pressable
            style={styles.modalOverlay}
            onPress={() => setShowSortOptions(false)}
          >
            <View style={styles.sortOptionsModal}>
              {sortOptions.map((option, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.sortOption,
                    index < sortOptions.length - 1 && styles.sortOptionBorder
                  ]}
                  onPress={() => handleSort(option.type, option.order)}
                >
                  <Text style={[
                    styles.sortOptionText,
                    option.type === sortType && option.order === sortOrder && styles.sortOptionTextActive
                  ]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </Pressable>
        </Modal>

        {loading ? (
          <View style={styles.centerContent}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>상품 정보를 불러오고 있습니다...</Text>
          </View>
        ) : noData && hasSearched ? (  // 검색 버튼을 눌렀고 결과가 없을 때
          <View style={styles.centerContent}>
            <Ionicons name="alert-circle-outline" size={48} color={COLORS.text.secondary} />
            <Text style={styles.noDataText}>검색된 상품이 없습니다</Text>
          </View>
        ) : noData ? (  // 전체 목록이 비어있을 때
          <View style={styles.centerContent}>
            <Ionicons name="alert-circle-outline" size={48} color={COLORS.text.secondary} />
            <Text style={styles.noDataText}>현재 등록된 상품이 없습니다.</Text>
            <Text style={[styles.noDataText, { marginTop: 4 }]}>상품을 추가해 주세요.</Text>
          </View>
        ) : (
          <FlatList
            data={hasSearched ? data : data}  // 검색했을 때만 검색 결과 표시
            renderItem={renderItem}
            keyExtractor={item => item.id.toString()}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  container: {
    flex: 1,
    padding: 16,
  },
  header: {
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
  searchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchInputWrapper: {
    flex: 1,
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
  sortButton: {
    padding: 10,
    borderRadius: 12,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sortOptionsModal: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 4,
    width: '80%',
    maxWidth: 280,
  },
  sortOption: {
    padding: 12,
    borderRadius: 8,
  },
  sortOptionBorder: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  sortOptionText: {
    fontSize: 15,
    color: COLORS.text.secondary,
    textAlign: 'center',
  },
  sortOptionTextActive: {
    color: COLORS.primary,
    fontWeight: '600',
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
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: COLORS.text.secondary,
  },
  noDataText: {
    marginTop: 12,
    fontSize: 15,
    color: COLORS.text.secondary,
    textAlign: 'center',
  },
  listContainer: {
    padding: 4,
  },
  productCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',  // 추가: 자식 요소가 borderRadius를 벗어나지 않도록
  },
  productCardExpanded: {
    backgroundColor: COLORS.background,
  },
  productHeader: {
    padding: 12,
  },
  productMainInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
    flex: 1,
    marginRight: 8,
  },
  badge: {
    backgroundColor: COLORS.white,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  quantityText: {
    fontSize: 13,
    color: COLORS.text.secondary,
    fontWeight: '500',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  expirationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  expirationText: {
    fontSize: 13,
    fontWeight: '500',
  },
  statusText: {
    fontSize: 13,
    fontWeight: '500',
  },
  expandedContent: {
    padding: 12,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    borderBottomLeftRadius: 12,  // 추가: 하단 왼쪽 모서리
    borderBottomRightRadius: 12, // 추가: 하단 오른쪽 모서리
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 8,
  },
  detailItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.background,
    padding: 8,
    borderRadius: 8,
  },
  detailTextContainer: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    color: COLORS.text.secondary,
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 13,
    color: COLORS.text.primary,
    fontWeight: '500',
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  quantityButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    backgroundColor: COLORS.white,
  },
  quantityValue: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
    width: 40,
    textAlign: 'center',
  },
});

export default InventoryList;