import { StyleSheet, Platform } from 'react-native';

export const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#2c3e50',  // 기존 네비게이션 바 색상 유지
  },
  container: {
    flex: 1,
    backgroundColor: '#f0f0f0',
  },
  titleContainer: {
    backgroundColor: '#2c3e50',
    padding: 15,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,  // iOS와 Android의 상단 패딩 차이 처리
    paddingBottom: Platform.OS === 'ios' ? 15 : 15,  // 하단 패딩도 플랫폼별 처리
  },
  homeContainer: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#ecf0f1',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 10,
  },
  quadrant: {
    width: '30%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 15,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    marginHorizontal: 5,
  },
  topLeft: {
    backgroundColor: '#3498db',
  },
  topCenter: {
    backgroundColor: '#9b59b6',
  },
  topRight: {
    backgroundColor: '#e74c3c',
  },
  middleLeft: {
    backgroundColor: '#2ecc71',
  },
  middleCenter: {
    backgroundColor: '#f39c12',
  },
  middleRight: {
    backgroundColor: '#f39c12',
  },
  bottomLeft: {
    backgroundColor: '#9b59b6',
  },
  bottomCenter: {
    backgroundColor: '#34495e',
  },
  bottomRight: {
    backgroundColor: '#34495e',
  },
  quadrantText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 10,
  },
  screenContainer: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 20,
    backgroundColor: '#ecf0f1',
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginVertical: 15,
    color: '#2c3e50',
    textAlign: 'center',
  },
  itemContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    marginVertical: 8,
    marginHorizontal: 16,
    backgroundColor: '#fff',
    borderRadius: 10,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
  },
  itemText: {
    fontSize: 18,
    color: '#2c3e50',
  },
  itemQuantity: {
    fontSize: 16,
    color: '#7f8c8d',
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',  // 너비 명시적 지정
    position: 'relative',  // 상대적 위치 지정
  },
  backButton: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    width: 30,
    zIndex: 1,
  },
  backButtonText: {
    fontSize: 30,
    color: '#fff',
    fontWeight: 'bold',
    textAlign: 'center',
    flex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    flex: 1,
  },
  infoContainer: {
    width: '100%',
    height: 200,
    backgroundColor: '#1abc9c',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderRadius: 15,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 5,
    padding: 30,
  },
  infoText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginVertical: 10,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    alignItems: 'center',
    justifyContent: 'flex-start',
    padding: 20,
  },
  input: {
    width: '100%',
    height: 40,
    borderColor: 'gray',
    borderWidth: 1,
    marginBottom: 10,
    paddingHorizontal: 10,
  },
  resultContainer: {
    marginTop: 20,
    width: '100%',
  },
  resultText: {
    fontSize: 16,
    marginBottom: 5,
  },
  errorText: {
    color: 'red',
    fontSize: 16,
  },
  subTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
  },
  listItem: {
    fontSize: 16,
    marginBottom: 5,
  },
  analysisContainer: {
    marginTop: 20,
  },
  analysisItem: {
    fontSize: 14,
    marginBottom: 5,
  },
  recommendationsContainer: {
    marginTop: 20,
  },
  nutrientTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 10,
  },
  recommendationItem: {
    fontSize: 14,
    marginLeft: 10,
  },
});