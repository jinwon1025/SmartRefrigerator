import React, { useState, useEffect } from 'react';
import { View, ScrollView, TouchableOpacity, Text, Dimensions, PixelRatio, Platform, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { connect, sendMessage, disconnect, addMessageHandler, removeMessageHandler } from '../src/MqttService';
import * as Notifications from 'expo-notifications';
import { API_URL } from "@env";
import AsyncStorage from '@react-native-async-storage/async-storage';

const FREEZER_NOTIFICATION_COUNT = 'freezer_notification_count';
const FRIDGE_NOTIFICATION_COUNT = 'fridge_notification_count';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const scale = SCREEN_WIDTH / 360;

const normalize = (size) => {
  const newSize = size * scale;
  if (Platform.OS === 'ios') {
    return Math.round(PixelRatio.roundToNearestPixel(newSize));
  }
  return Math.round(PixelRatio.roundToNearestPixel(newSize)) - 2;
};

const COLORS = {
  primary: '#4facfe',
  secondary: '#f78ca0',
  fridge: '#20c997',
  freezer: '#339af0',
  text: {
    primary: '#0F172A',
    secondary: '#475569',
  },
  white: '#FFFFFF',
  disabled: '#cbd5e1',
  success: '#2ac769',
  danger: '#ff4d4d',
};

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const HomeScreen = ({ setActiveScreen }) => {
  const [mode, setMode] = useState('auto');
  const [controls, setControls] = useState({
    fridgeFan: false,
    freezerFan: false,
    fridgeUV: false,
    freezerUV: false,
  });

  const [fridgeStatus, setFridgeStatus] = useState({
    temperature: 0,
    humidity: 0,
    gas: 333,
    doorOpenTime: null,
    notificationCount: 0
  });

  const [freezerStatus, setFreezerStatus] = useState({
    temperature: 0,
    humidity: 0,
    gas: 333,
    doorOpenTime: null,
    notificationCount: 0
  });

  const [doorStatus, setDoorStatus] = useState({
    coldDoor: 'Closed',
    frozenDoor: 'Closed'
  });

  const [doorAlertStatus, setDoorAlertStatus] = useState({
    coldDoorAlertCount: 0,
    frozenDoorAlertCount: 0,
    coldDoorTimer: null,
    frozenDoorTimer: null
  });

  // MQTT 메시지 처리 함수
  const handleMqttMessage = (topic, message) => {
    console.log('Received MQTT message:', topic, message);

    switch (topic) {
      case 'refrigerator/mode':
        setMode(message);
        break;
      case 'refrigerator/cold_fan':
        setControls(prev => ({ ...prev, fridgeFan: message === 'ON' }));
        break;
      case 'refrigerator/frozen_fan':
        setControls(prev => ({ ...prev, freezerFan: message === 'ON' }));
        break;
      case 'refrigerator/cold_uv':
        setControls(prev => ({ ...prev, fridgeUV: message === 'ON' }));
        break;
      case 'refrigerator/frozen_uv':
        setControls(prev => ({ ...prev, freezerUV: message === 'ON' }));
        break;
    }
  };

  useEffect(() => {
    const init = async () => {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('알림 권한이 필요합니다');
        return;
      }

      // MQTT 연결
      connect();

      // 토픽 구독 및 메시지 핸들러 등록
      const topics = [
        'refrigerator/mode',
        'refrigerator/cold_fan',
        'refrigerator/frozen_fan',
        'refrigerator/cold_uv',
        'refrigerator/frozen_uv'
      ];

      topics.forEach(topic => {
        addMessageHandler(topic, (message) => handleMqttMessage(topic, message));
      });

      // 초기 상태 및 주기적 업데이트 설정
      fetchStatus();
      fetchDoorStatus();

      const statusInterval = setInterval(fetchStatus, 2000);
      const doorInterval = setInterval(fetchDoorStatus, 2000);

      return () => {
        clearInterval(statusInterval);
        clearInterval(doorInterval);
        topics.forEach(topic => {
          removeMessageHandler(topic);
        });
        disconnect();
      };
    };

    init();
  }, []);
  // sendDoorNotification 함수
  const sendDoorNotification = async (compartment) => {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: `${compartment} 문 열림`,
        body: `${compartment} 문이 열려있습니다.`,
        sound: true,
      },
      trigger: null,
    });
  };

  // fetchStatus 함수
  const fetchStatus = async () => {
    try {
      const response = await fetch(`http://${API_URL}:3000/api/status`);
      const data = await response.json();

      setFridgeStatus(prev => ({
        ...prev,
        temperature: parseFloat(data.cold_temperature).toFixed(1),
        humidity: parseFloat(data.cold_humidity).toFixed(1),
        gas: parseFloat(data.cold_gas).toFixed(1)
      }));

      setFreezerStatus(prev => ({
        ...prev,
        temperature: parseFloat(data.frozen_temperature).toFixed(1),
        humidity: parseFloat(data.frozen_humidity).toFixed(1),
        gas: parseFloat(data.frozen_gas).toFixed(1)
      }));
    } catch (error) {
      console.error('Status fetch error:', error);
    }
  };

  // fetchDoorStatus 함수
  const fetchDoorStatus = async () => {
    try {
      const response = await fetch(`http://${API_URL}:3000/api/door-status`);
      const data = await response.json();
      console.log('Door API Response:', data);

      const isColdDoorClosed = data.cold_door.toLowerCase().includes('close');
      const isFrozenDoorClosed = data.frozen_door.toLowerCase().includes('close');

      const newDoorStatus = {
        coldDoor: isColdDoorClosed ? 'Closed' : 'Open',
        frozenDoor: isFrozenDoorClosed ? 'Closed' : 'Open'
      };

      setDoorStatus(prev => {
        if (prev.coldDoor !== newDoorStatus.coldDoor) {
          if (newDoorStatus.coldDoor === 'Closed') {
            console.log('냉장실 문 닫힘 - 알림 카운트 초기화');
            setFridgeStatus(prevStatus => {
              AsyncStorage.setItem(FRIDGE_NOTIFICATION_COUNT, '0');
              return {
                ...prevStatus,
                notificationCount: 0,
                doorOpenTime: null
              };
            });
          } else {
            console.log('냉장실 문 열림 - 타이머 시작');
            setFridgeStatus(prevStatus => ({
              ...prevStatus,
              doorOpenTime: Date.now()
            }));
          }
        }

        if (prev.frozenDoor !== newDoorStatus.frozenDoor) {
          if (newDoorStatus.frozenDoor === 'Closed') {
            console.log('냉동실 문 닫힘 - 알림 카운트 초기화');
            setFreezerStatus(prevStatus => {
              AsyncStorage.setItem(FREEZER_NOTIFICATION_COUNT, '0');
              return {
                ...prevStatus,
                notificationCount: 0,
                doorOpenTime: null
              };
            });
          } else {
            console.log('냉동실 문 열림 - 타이머 시작');
            setFreezerStatus(prevStatus => ({
              ...prevStatus,
              doorOpenTime: Date.now()
            }));
          }
        }

        return newDoorStatus;
      });
    } catch (error) {
      console.error('Door status fetch error:', error);
    }
  };

  // 알림 처리 useEffect
  useEffect(() => {
    let coldDoorTimer, frozenDoorTimer;

    if (doorStatus.coldDoor === 'Open' && fridgeStatus.notificationCount === 0) {
      console.log('냉장실 알림 타이머 시작 - 15초 카운트다운');

      coldDoorTimer = setTimeout(() => {
        console.log('냉장실 알림 발송');
        sendDoorNotification('냉장실');
        setFridgeStatus(prev => {
          const newCount = prev.notificationCount + 1;
          AsyncStorage.setItem(FRIDGE_NOTIFICATION_COUNT, newCount.toString());
          return { ...prev, notificationCount: newCount };
        });
      }, 15000);
    } else if (doorStatus.coldDoor === 'Open' && fridgeStatus.notificationCount === 1) {
      console.log('냉장실 알림은 이미 보냈습니다.');
    }

    if (doorStatus.frozenDoor === 'Open' && freezerStatus.notificationCount === 0) {
      console.log('냉동실 알림 타이머 시작 - 15초 카운트다운');

      frozenDoorTimer = setTimeout(() => {
        console.log('냉동실 알림 발송');
        sendDoorNotification('냉동실');
        setFreezerStatus(prev => {
          const newCount = prev.notificationCount + 1;
          AsyncStorage.setItem(FREEZER_NOTIFICATION_COUNT, newCount.toString());
          return { ...prev, notificationCount: newCount };
        });
      }, 15000);
    } else if (doorStatus.frozenDoor === 'Open' && freezerStatus.notificationCount === 1) {
      console.log('냉동실 알림은 이미 보냈습니다.');
    }

    return () => {
      if (coldDoorTimer) clearTimeout(coldDoorTimer);
      if (frozenDoorTimer) clearTimeout(frozenDoorTimer);
    };
  }, [doorStatus.coldDoor, doorStatus.frozenDoor, fridgeStatus.notificationCount, freezerStatus.notificationCount]);

  // handleModeChange 함수 - MQTT 통합
  const handleModeChange = (newMode) => {
    setMode(newMode);
    sendMessage('refrigerator/mode', newMode);

    if (newMode === 'manual') {
      const newControls = {
        fridgeFan: false,
        freezerFan: false,
        fridgeUV: false,
        freezerUV: false,
      };
      setControls(newControls);

      // MQTT로 모든 컨트롤 상태 전송
      sendMessage('refrigerator/cold_fan', 'OFF');
      sendMessage('refrigerator/frozen_fan', 'OFF');
      sendMessage('refrigerator/cold_uv', 'OFF');
      sendMessage('refrigerator/frozen_uv', 'OFF');
    }
  };

  // handleControlToggle 함수 - MQTT 통합
  const handleControlToggle = (control) => {
    if (mode === 'manual') {
      setControls(prev => {
        const newState = { ...prev, [control]: !prev[control] };

        const topics = {
          fridgeFan: 'refrigerator/cold_fan',
          freezerFan: 'refrigerator/frozen_fan',
          fridgeUV: 'refrigerator/cold_uv',
          freezerUV: 'refrigerator/frozen_uv'
        };

        // MQTT로 상태 변경 전송
        sendMessage(topics[control], newState[control] ? 'ON' : 'OFF');
        return newState;
      });
    }
  };
  // UI 컴포넌트들
  const ToggleButton = ({ isSelected, onPress, icon, text, color, style }) => (
    <TouchableOpacity
      style={[
        styles.viewToggleButton,
        style,
        isSelected && { backgroundColor: color },
      ]}
      onPress={onPress}
    >
      <Ionicons
        name={icon}
        size={20}
        color={isSelected ? COLORS.white : COLORS.text.secondary}
      />
      <Text style={[
        styles.viewToggleText,
        isSelected && styles.viewToggleTextActive
      ]}>
        {text}
      </Text>
    </TouchableOpacity>
  );

  const ControlButton = ({ icon, title, isActive, onPress, disabled, color }) => (
    <TouchableOpacity
      style={[
        styles.controlButton,
        { borderColor: color },
        isActive && { backgroundColor: color },
        (disabled || mode === 'auto') && styles.controlButtonDisabled
      ]}
      onPress={onPress}
      disabled={disabled || mode === 'auto'}
    >
      <Ionicons
        name={icon}
        size={16}
        color={(disabled || mode === 'auto') ? COLORS.disabled : (isActive ? COLORS.white : color)}
      />
      <Text style={[
        styles.controlButtonText,
        { color: (disabled || mode === 'auto') ? COLORS.disabled : (isActive ? COLORS.white : color) }
      ]}>
        {title}
      </Text>
    </TouchableOpacity>
  );

  const renderModeToggle = () => (
    <View style={styles.modeToggleContainer}>
      <View style={[
        styles.modeToggleGroup,
        { borderColor: mode === 'auto' ? COLORS.primary : COLORS.secondary }
      ]}>
        <ToggleButton
          isSelected={mode === 'auto'}
          onPress={() => handleModeChange('auto')}
          icon="flash"
          text="자동 모드"
          color={COLORS.primary}
          style={[
            styles.modeToggleButtonLeft,
            { borderRightColor: mode === 'auto' ? COLORS.primary : COLORS.secondary }
          ]}
        />
        <ToggleButton
          isSelected={mode === 'manual'}
          onPress={() => handleModeChange('manual')}
          icon="hand-left"
          text="수동 모드"
          color={COLORS.secondary}
          style={[
            styles.modeToggleButtonRight,
            { borderLeftColor: mode === 'auto' ? COLORS.primary : COLORS.secondary }
          ]}
        />
      </View>
    </View>
  );

  const renderControls = () => (
    <View style={styles.controlsWrapper}>
      {renderModeToggle()}
      <View style={styles.controlsContainer}>
        <View style={styles.controlsRow}>
          <ControlButton
            icon="radio-button-on"
            title="냉장고 쿨링팬"
            isActive={controls.fridgeFan}
            onPress={() => handleControlToggle('fridgeFan')}
            color={COLORS.fridge}
          />
          <ControlButton
            icon="sunny"
            title="냉장고 UV"
            isActive={controls.fridgeUV}
            onPress={() => handleControlToggle('fridgeUV')}
            color={COLORS.fridge}
          />
        </View>
        <View style={styles.controlsRow}>
          <ControlButton
            icon="radio-button-on"
            title="냉동고 쿨링팬"
            isActive={controls.freezerFan}
            onPress={() => handleControlToggle('freezerFan')}
            color={COLORS.freezer}
          />
          <ControlButton
            icon="sunny"
            title="냉동고 UV"
            isActive={controls.freezerUV}
            onPress={() => handleControlToggle('freezerUV')}
            color={COLORS.freezer}
          />
        </View>
      </View>
    </View>
  );

  const renderCompartmentCard = (title, status, color) => {
    const cardWidth = (SCREEN_WIDTH - 32 - 16) / 3;
    const statusFontSize = Math.min(normalize(11), cardWidth * 0.11);
    const titleFontSize = Math.min(normalize(13), cardWidth * 0.13);
    const iconSize = Math.min(normalize(20), cardWidth * 0.18);

    return (
      <View style={[styles.statusCard, styles.compartmentCard, {
        width: cardWidth,
        height: SCREEN_HEIGHT * 0.18,
        padding: 0,
        borderColor: color,
      }]}>
        <View style={[styles.cardHeader, {
          backgroundColor: color,
          padding: normalize(8),
          width: '100%',
          marginBottom: 0,
        }]}>
          <View style={{
            width: '100%',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Ionicons
              name={title === '냉장실' ? 'thermometer-outline' : 'snow'}
              size={iconSize}
              color="white"
            />
            <Text style={[styles.cardTitle, {
              color: 'white',
              fontSize: titleFontSize,
              marginLeft: normalize(4),
            }]} numberOfLines={1}>
              {title}
            </Text>
          </View>
        </View>

        <View style={[styles.compartmentContent, {
          padding: normalize(8),
          justifyContent: 'space-between',
          paddingVertical: normalize(12),
        }]}>
          <View style={styles.statusRow}>
            <Ionicons name="thermometer" size={iconSize * 0.9} color={color} style={{ width: iconSize }} />
            <Text style={[styles.statusLabel, { fontSize: statusFontSize }]}>온도</Text>
            <Text style={[styles.statusValue, { color, fontSize: statusFontSize }]}>
              {status.temperature}°C
            </Text>
          </View>

          <View style={styles.statusRow}>
            <Ionicons name="water" size={iconSize * 0.9} color={color} style={{ width: iconSize }} />
            <Text style={[styles.statusLabel, { fontSize: statusFontSize }]}>습도</Text>
            <Text style={[styles.statusValue, { color, fontSize: statusFontSize }]}>
              {status.humidity}%
            </Text>
          </View>

          <View style={styles.statusRow}>
            <Ionicons name="skull" size={iconSize * 0.9} color={color} style={{ width: iconSize }} />
            <Text style={[styles.statusLabel, { fontSize: statusFontSize }]}>가스</Text>
            <Text style={[styles.statusValue, { color, fontSize: statusFontSize }]}>
              {status.gas}ppm
            </Text>
          </View>
        </View>
      </View>
    );
  };

  const renderDoorCard = () => (
    <View style={[styles.statusCard, styles.doorStatusCard]}>
      <View style={[styles.cardHeader, {
        backgroundColor: '#1e293b',
        padding: normalize(8),
        width: '100%',
        marginBottom: 0,
      }]}>
        <View style={{
          width: '100%',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <Ionicons name="lock-closed" size={normalize(20)} color="white" />
          <Text style={[styles.cardTitle, {
            color: 'white',
            marginLeft: normalize(8),
          }]}>문 상태</Text>
        </View>
      </View>

      <View style={styles.doorStatusContent}>
        <TouchableOpacity
          activeOpacity={0.8}
          style={[
            styles.doorItem,
            {
              backgroundColor: doorStatus.frozenDoor === 'Open' ? '#fff1f0' : '#f6fef9',
              borderColor: doorStatus.frozenDoor === 'Open' ? '#ffccc7' : '#d9f7be',
            }
          ]}
        >
          <View style={styles.doorIconContainer}>
            <View style={[
              styles.doorIconCircle,
              {
                backgroundColor: doorStatus.frozenDoor === 'Open' ? '#fff0f6' : '#f6ffed',
                borderColor: doorStatus.frozenDoor === 'Open' ? '#ffa39e' : '#95de64',
              }
            ]}>
              <Ionicons
                name={doorStatus.frozenDoor === 'Open' ? 'lock-open' : 'lock-closed'}
                size={normalize(16)}
                color={doorStatus.frozenDoor === 'Open' ? COLORS.danger : COLORS.success}
              />
            </View>
          </View>
          <View style={styles.doorInfo}>
            <Text style={[styles.doorName, { color: '#000000' }]}>냉동실</Text>
            <Text style={[
              styles.doorStateText,
              { color: doorStatus.frozenDoor === 'Open' ? COLORS.danger : COLORS.success }
            ]}>
              {doorStatus.frozenDoor === 'Open' ? '열림' : '닫힘'}
            </Text>
          </View>
        </TouchableOpacity>

        <View style={styles.doorDivider} />

        <TouchableOpacity
          activeOpacity={0.8}
          style={[
            styles.doorItem,
            {
              backgroundColor: doorStatus.coldDoor === 'Open' ? '#fff1f0' : '#f6fef9',
              borderColor: doorStatus.coldDoor === 'Open' ? '#ffccc7' : '#d9f7be',
            }
          ]}
        >
          <View style={styles.doorIconContainer}>
            <View style={[
              styles.doorIconCircle,
              {
                backgroundColor: doorStatus.coldDoor === 'Open' ? '#fff0f6' : '#f6ffed',
                borderColor: doorStatus.coldDoor === 'Open' ? '#ffa39e' : '#95de64',
              }
            ]}>
              <Ionicons
                name={doorStatus.coldDoor === 'Open' ? 'lock-open' : 'lock-closed'}
                size={normalize(16)}
                color={doorStatus.coldDoor === 'Open' ? COLORS.danger : COLORS.success}
              />
            </View>
          </View>
          <View style={styles.doorInfo}>
            <Text style={[styles.doorName, { color: '#000000' }]}>냉장실</Text>
            <Text style={[
              styles.doorStateText,
              { color: doorStatus.coldDoor === 'Open' ? COLORS.danger : COLORS.success }
            ]}>
              {doorStatus.coldDoor === 'Open' ? '열림' : '닫힘'}
            </Text>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );

  const MenuButton = ({ icon, title, onPress, backgroundColor }) => (
    <TouchableOpacity
      style={[
        styles.menuButton,
        { backgroundColor }
      ]}
      onPress={onPress}
    >
      <View style={styles.menuContent}>
        <Ionicons name={icon} size={32} color="white" />
        <Text style={styles.menuText}>{title}</Text>
      </View>
    </TouchableOpacity>
  );

  const renderRegisterButton = () => (
    <TouchableOpacity
      style={[styles.registerButton, {
        height: normalize(56),
        marginBottom: normalize(24),
        backgroundColor: '#4facfe'
      }]}
      onPress={() => setActiveScreen(10)}
    >
      <View style={styles.registerContent}>
        <Ionicons name="cart" size={normalize(26)} color="white" />
        <Text style={[styles.registerText, { fontSize: normalize(16) }]}>
          상품 등록하기
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container}>
      <View style={styles.mainContent}>
        <View style={[styles.statusContainer, { marginBottom: normalize(16) }]}>
          {renderCompartmentCard('냉장실', fridgeStatus, COLORS.fridge)}
          {renderCompartmentCard('냉동실', freezerStatus, COLORS.freezer)}
          {renderDoorCard()}
        </View>
        {renderControls()}
        {renderRegisterButton()}

        <View style={[styles.menuGrid, { paddingBottom: 20 }]}>
          <View style={styles.menuRow}>
            <MenuButton
              icon="cart"
              title="상품 관리"
              onPress={() => setActiveScreen(1)}
              backgroundColor="#4facfe"
            />
            <MenuButton
              icon="search"
              title="레시피 검색"
              onPress={() => setActiveScreen(2)}
              backgroundColor="#667eea"
            />
            <MenuButton
              icon="restaurant"
              title="레시피 추천"
              onPress={() => setActiveScreen(3)}
              backgroundColor="#ff9a9e"
            />
          </View>

          <View style={styles.menuRow}>
            <MenuButton
              icon="stats-chart"
              title="소비 리포트"
              onPress={() => setActiveScreen(4)}
              backgroundColor="#3a7bd5"
            />
            <MenuButton
              icon="nutrition"
              title="영양 분석표"
              onPress={() => setActiveScreen(5)}
              backgroundColor="#fa709a"
            />
            <MenuButton
              icon="book"
              title="영양 가이드"
              onPress={() => setActiveScreen(6)}
              backgroundColor="#30cfd0"
            />
          </View>

          <View style={styles.menuRow}>
            <MenuButton
              icon="today"
              title="섭취량 분석"
              onPress={() => setActiveScreen(7)}
              backgroundColor="#48c6ef"
            />
            <MenuButton
              icon="cart-outline"
              title="스마트 쇼핑"
              onPress={() => setActiveScreen(8)}
              backgroundColor="#f78ca0"
            />
            <MenuButton
              icon="shield"
              title="알레르기"
              onPress={() => setActiveScreen(9)}
              backgroundColor="#6991c7"
            />
          </View>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = {
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  mainContent: {
    padding: 16,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'stretch',
    marginBottom: 16,
    gap: 8,
  },
  statusCard: {
    backgroundColor: 'white',
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
    overflow: 'hidden',
  },
  compartmentCard: {
    padding: 0,
    borderWidth: 1,
    borderRadius: 15,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    borderTopLeftRadius: 1,
    borderTopRightRadius: 13,
  },
  cardTitle: {
    fontWeight: 'bold',
    flexShrink: 1,
  },
  compartmentContent: {
    flex: 1,
    justifyContent: 'space-between',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    paddingVertical: normalize(2),
  },
  statusLabel: {
    color: '#666',
    flex: 1,
    marginRight: normalize(4),
  },
  statusValue: {
    fontWeight: 'bold',
    textAlign: 'right',
    minWidth: normalize(48),
  },
  doorStatusCard: {
    width: (SCREEN_WIDTH - 32 - 16) / 3,
    padding: 0,
    backgroundColor: 'white',
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#1e293b',
    height: SCREEN_HEIGHT * 0.18,
    overflow: 'hidden',
  },
  doorStatusContent: {
    flex: 1,
    justifyContent: 'space-between',
    padding: normalize(6),
  },
  doorItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: normalize(6),
    borderRadius: 8,
    borderWidth: 1,
    marginVertical: normalize(2),
  },
  doorIconContainer: {
    marginRight: normalize(8),
  },
  doorIconCircle: {
    width: normalize(24),
    height: normalize(24),
    borderRadius: normalize(12),
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doorInfo: {
    flex: 1,
  },
  doorName: {
    fontSize: normalize(10),
    fontWeight: '600',
    marginBottom: normalize(1),
  },
  doorStateText: {
    fontSize: normalize(12),
    fontWeight: '700',
  },
  doorDivider: {
    height: 1,
    backgroundColor: '#e2e8f0',
    marginVertical: normalize(2),
    marginHorizontal: normalize(2),
  },
  modeToggleContainer: {
    marginBottom: 16,
  },
  modeToggleGroup: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  viewToggleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    gap: 8,
  },
  modeToggleButtonLeft: {
    borderRightWidth: 0.5,
  },
  modeToggleButtonRight: {
    borderLeftWidth: 0.5,
  },
  viewToggleText: {
    fontSize: 15,
    color: COLORS.text.secondary,
    fontWeight: '500',
  },
  viewToggleTextActive: {
    color: COLORS.white,
    fontWeight: '600',
  },
  controlsContainer: {
    gap: 12,
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  controlButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
  },
  controlButtonDisabled: {
    backgroundColor: '#f1f5f9',
    borderColor: COLORS.disabled,
  },
  controlButtonText: {
    fontSize: 12,
    fontWeight: '500',
  },
  controlsWrapper: {
    marginBottom: normalize(16),
    borderWidth: 2,
    borderColor: '#cbd5e1',
    borderRadius: 16,
    padding: 16,
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  menuGrid: {
    flex: 1,
  },
  menuRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  menuButton: {
    width: '31%',
    aspectRatio: 1,
    borderRadius: 15,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  menuContent: {
    flex: 1,
    padding: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 12,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: {
      width: 1,
      height: 1,
    },
    textShadowRadius: 3,
  },
  registerButton: {
    borderRadius: 15,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  registerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    paddingHorizontal: normalize(20),
  },
  registerText: {
    color: 'white',
    fontWeight: '600',
    marginLeft: normalize(12),
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: {
      width: 1,
      height: 1,
    },
    textShadowRadius: 3,
  },
};

export default HomeScreen;