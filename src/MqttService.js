import { Client, Message } from "paho-mqtt";
import { RP_URL } from "@env";

const clientId = 'refrigerator_' + Math.random().toString(16).substr(2, 8);
let client = null;
let isInitialized = false;
let reconnectTimeout = null;
let isConnecting = false;

// 메시지 핸들러를 저장할 Map 추가
const messageHandlers = new Map();

const createClient = () => {
  if (!client) {
    client = new Client(`${RP_URL}`, 9001, clientId);

    // 메시지 수신 이벤트 핸들러 설정
    client.onMessageArrived = (message) => {
      const topic = message.destinationName;
      const payload = message.payloadString;
      console.log("MQTT Message received:", { topic, payload });

      // 해당 토픽에 등록된 모든 핸들러 호출
      const handlers = messageHandlers.get(topic);
      if (handlers) {
        handlers.forEach(handler => {
          try {
            handler(payload);
          } catch (error) {
            console.error("Message handler error:", error);
          }
        });
      }
    };

    // 연결 종료 이벤트 핸들러
    client.onConnectionLost = (responseObject) => {
      console.log("MQTT Connection lost:", responseObject.errorMessage);
      isInitialized = false;
      isConnecting = false;

      // 재연결 시도
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
      reconnectTimeout = setTimeout(connect, 5000);
    };
  }
  return client;
};

const connect = () => {
  if (isConnecting || (client && client.isConnected())) {
    console.log("Already connected or connecting, skipping connection");
    return;
  }

  isConnecting = true;

  try {
    const mqttClient = createClient();

    const connectOptions = {
      onSuccess: () => {
        console.log("MQTT Connect Success");
        isInitialized = true;
        isConnecting = false;
        subscribeToTopics();
      },
      onFailure: (error) => {
        console.log("MQTT Connect Fail", {
          errorCode: error.errorCode,
          errorMessage: error.errorMessage,
          detail: error
        });
        isInitialized = false;
        isConnecting = false;

        if (reconnectTimeout) {
          clearTimeout(reconnectTimeout);
        }
        reconnectTimeout = setTimeout(connect, 5000);
      },
      useSSL: false,
      reconnect: true,
      keepAliveInterval: 30,
      timeout: 3
    };

    mqttClient.connect(connectOptions);
  } catch (error) {
    console.error("Connection error:", error);
    isConnecting = false;
    isInitialized = false;

    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
    }
    reconnectTimeout = setTimeout(connect, 5000);
  }
};

const disconnect = () => {
  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout);
    reconnectTimeout = null;
  }

  if (client && client.isConnected()) {
    try {
      client.disconnect();
      isInitialized = false;
      isConnecting = false;
      // 연결 종료 시 모든 메시지 핸들러 제거
      messageHandlers.clear();
      console.log("MQTT Disconnected successfully");
    } catch (error) {
      console.error("Disconnect error:", error);
    }
  }
};

const subscribeToTopics = () => {
  if (!client || !client.isConnected()) {
    console.log("Cannot subscribe: client not connected");
    return;
  }

  const topics = [
    "refrigerator/mode",
    "refrigerator/cold_fan",
    "refrigerator/frozen_fan",
    "refrigerator/cold_uv",
    "refrigerator/frozen_uv"
  ];

  try {
    topics.forEach(topic => {
      client.subscribe(topic);
      console.log(`Subscribed to ${topic}`);
    });
  } catch (error) {
    console.error("Subscribe error:", error);
  }
};

const sendMessage = (topic, message) => {
  if (!client || !client.isConnected()) {
    console.log("MQTT Client is not connected");
    return;
  }

  try {
    const payload = new Message(message);
    payload.destinationName = topic;
    client.send(payload);
    console.log("MQTT Message sent:", { topic, message });
  } catch (error) {
    console.error("Send message error:", error);
  }
};

// 메시지 핸들러 등록 함수 추가
const addMessageHandler = (topic, handler) => {
  if (!messageHandlers.has(topic)) {
    messageHandlers.set(topic, new Set());
  }
  messageHandlers.get(topic).add(handler);
};

// 메시지 핸들러 제거 함수 추가
const removeMessageHandler = (topic, handler) => {
  if (messageHandlers.has(topic)) {
    messageHandlers.get(topic).delete(handler);
    if (messageHandlers.get(topic).size === 0) {
      messageHandlers.delete(topic);
    }
  }
};

const isConnected = () => {
  return client && client.isConnected();
};

export {
  connect,
  disconnect,
  sendMessage,
  isConnected,
  addMessageHandler,
  removeMessageHandler
};