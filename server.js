const express = require('express');
const mysql = require('mysql');
const puppeteer = require('puppeteer');
const cors = require('cors');
const axios = require('axios');
const cheerio = require('cheerio');
const { JSDOM } = require('jsdom');
const OpenAI = require('openai');
const path = require('path');
const fs = require('fs');
const csv = require('csv-parser');
const xml2js = require('xml2js');
const app = express();
const port = 3000;
require('dotenv').config();

// 데이터베이스 연결 설정(로컬)
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: process.env.LOCAL_DB_PASSWORD,
  database: process.env.LOCAL_DB_NAME
});

// 데이터베이스 연결 설정(라즈베리파이)
// const db = mysql.createConnection({
//   host: process.env.RP_URL,
//   user: 'root',
//   password: process.env.DB_PASSWORD, // .env 파일의 DB_PASSWORD 사용
//   database: process.env.DB_NAME     // .env 파일의 DB_NAME 사용
// });

// 데이터베이스 연결
db.connect((err) => {
  if (err) {
    console.error('Database connection failed: ' + err.stack);
    return;
  }
  console.log('Connected to database');
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

app.get('/api/status', (req, res) => {
  const query = `
    SELECT 
      cold_temperature, 
      cold_humidity, 
      cold_gas,
      frozen_temperature, 
      frozen_humidity,
      frozen_gas,
      measured_at
    FROM status 
    ORDER BY measured_at DESC 
    LIMIT 1
  `;

  db.query(query, (error, results) => {

    if (error) {
      res.status(500).json({ error: 'Database error' });
      return;
    }

    if (results.length === 0) {
      console.log('No results found'); // 추가
      res.status(404).json({ error: 'No status data found' });
      return;
    }

    res.json(results[0]);
  });
});

app.get('/api/door-status', (req, res) => {
  const query = `
    SELECT 
      cold_door,
      frozen_door
    FROM door 
    ORDER BY measured_at DESC 
    LIMIT 1
  `;

  db.query(query, (error, results) => {

    if (error) {
      console.error('Error fetching door status:', error);
      res.status(500).json({ error: 'Database error' });
      return;
    }

    if (results.length === 0) {
      console.log('No door results found'); // 추가
      res.json({
        cold_door: 'CLOSE',
        frozen_door: 'CLOSE'
      });
      return;
    }

    res.json({
      cold_door: results[0].cold_door,
      frozen_door: results[0].frozen_door
    });
  });
});


app.get('/api/product/:barcode', async (req, res) => {
  try {
    const { barcode } = req.params;
    const url = `https://gs1.koreannet.or.kr/pr/${barcode}`;

    const response = await axios.get(url);
    const $ = cheerio.load(response.data);

    // 제품 정보 추출
    const productName = $('h3').text().trim() || 'Unknown';
    const country = $('th:contains("제조국가")').next('td').text().trim() || 'Unknown';
    const company = $('th:contains("제조사/생산자")').next('td').text().trim() || 'Unknown';

    // KAN 상품분류만 직접 추출 (코드 제외)
    const classification = $('th:contains("KAN 상품분류"):not(:contains("코드"))').next('td').text().trim();
    const clsNm = classification.split('>').map(item => item.trim());

    const productInfo = {
      productName,
      country,
      company,
      cls_nm_1: clsNm[0] || 'Unknown',
      cls_nm_2: clsNm[1] || 'Unknown',
      cls_nm_3: clsNm[2] || 'Unknown'
    };

    console.log('Final Product Info:', productInfo);

    res.json(productInfo);
  } catch (error) {
    console.error('제품 정보 조회 오류:', error);
    res.status(500).json({ error: '제품 정보를 가져오는데 실패했습니다.' });
  }
});

// 제품 등록/수정 엔드포인트 수정
app.post('/api/product', async (req, res) => {
  try {
    const {
      gtin,
      productName,
      country,
      company,
      quantity,
      expirationDate,
      cls_nm_1,
      cls_nm_2,
      cls_nm_3
    } = req.body;

    // 기존 제품 확인 - 바코드와 유통기한이 모두 동일한 제품 검색
    db.query(
      'SELECT * FROM products WHERE gtin = ? AND expiration_date = ?',
      [gtin, expirationDate],
      (selectErr, selectResults) => {
        if (selectErr) {
          console.error('Select error:', selectErr);
          return res.status(500).json({ error: '제품 조회에 실패했습니다.' });
        }

        if (selectResults.length > 0) {
          // 동일한 바코드와 유통기한을 가진 제품이 있으면 수량만 업데이트
          const updateQuery = `
            UPDATE products 
            SET quantity = quantity + ?
            WHERE gtin = ? AND expiration_date = ?
          `;

          db.query(
            updateQuery,
            [
              quantity,
              gtin,
              expirationDate
            ],
            (updateErr) => {
              if (updateErr) {
                console.error('Update error:', updateErr);
                return res.status(500).json({ error: '제품 업데이트에 실패했습니다.' });
              }
              res.json({ message: '제품 수량이 성공적으로 업데이트되었습니다.' });
            }
          );
        } else {
          // 새 제품으로 삽입
          const insertQuery = `
            INSERT INTO products 
            (gtin, product_name, country, company, quantity, expiration_date, CLS_NM_1, CLS_NM_2, CLS_NM_3)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `;

          db.query(
            insertQuery,
            [
              gtin,
              productName,
              country,
              company,
              quantity,
              expirationDate,
              cls_nm_1,
              cls_nm_2,
              cls_nm_3
            ],
            (insertErr) => {
              if (insertErr) {
                console.error('Insert error:', insertErr);
                return res.status(500).json({ error: '제품 등록에 실패했습니다.' });
              }
              res.json({ message: '제품이 성공적으로 등록되었습니다.' });
            }
          );
        }
      }
    );
  } catch (error) {
    console.error('제품 등록 오류:', error);
    res.status(500).json({ error: '제품 등록에 실패했습니다.' });
  }
});

// 기존에 있던 foodInfo 함수
const foodInfo = async (name) => {
  const url = `https://www.10000recipe.com/recipe/list.html?q=${name}`;

  try {
    const response = await axios.get(url);
    const dom = new JSDOM(response.data);
    const document = dom.window.document;

    const foodList = document.querySelectorAll('.common_sp_link');
    if (foodList.length === 0) {
      return null;
    }

    const foodId = foodList[0].href.split('/').pop();
    const newUrl = `https://www.10000recipe.com/recipe/${foodId}`;
    const newResponse = await axios.get(newUrl);
    const newDom = new JSDOM(newResponse.data);
    const newDocument = newDom.window.document;

    const foodInfo = newDocument.querySelector('script[type="application/ld+json"]');
    const result = JSON.parse(foodInfo.textContent);

    const ingredients = result.recipeIngredient.join(', ');
    const recipe = result.recipeInstructions.map((step, index) => `${index + 1}. ${step.text}`).join('\n');

    return {
      name: result.name,
      ingredients: ingredients,
      recipe: recipe.split('\n')
    };
  } catch (error) {
    console.error("Error fetching food info:", error);
    return null;
  }
};

// parseRecipeResponse 함수 수정
const parseRecipeResponse = (recipeText) => {
  try {
    // 첫 줄에서 음식 이름 추출
    const firstLine = recipeText.split('\n')[0].trim();
    const name = firstLine.startsWith('요리명:')
      ? firstLine.replace('요리명:', '').trim()
      : firstLine;

    // 재료 추출 및 하이픈 제거
    const ingredientsMatch = recipeText.match(/재료:([^]*?)(?=조리순서:)/s);
    let ingredients = '';
    if (ingredientsMatch && ingredientsMatch[1]) {
      ingredients = ingredientsMatch[1]
        .trim()
        .split(/[\n,]/) // 줄바꿈과 쉼표로 분리
        .map(item => item.trim().replace(/^[-\s]+/, '')) // 하이픈과 앞쪽 공백 제거
        .filter(item => item) // 빈 문자열 제거
        .join(', '); // 쉼표로 다시 합치기
    }

    // 조리 단계 추출
    const stepsMatch = recipeText.match(/조리순서:([^]*?)$/s);
    let recipe = [];
    if (stepsMatch && stepsMatch[1]) {
      recipe = stepsMatch[1]
        .trim()
        .split('\n')
        .map(step => step.trim())
        .filter(step => step && /^\d+\./.test(step));
    }

    return {
      name,
      ingredients,
      recipe
    };
  } catch (error) {
    console.error("레시피 파싱 오류:", error);
    return null;
  }
};

// getRecipe 함수의 프롬프트도 수정하여 하이픈 사용을 명시적으로 제한
const getRecipe = async (ingredients) => {
  const prompt = `다음 재료들로 만들 수 있는 요리를 추천해주세요.
먼저 요리 이름을 한 줄로 작성하고, 그 다음 재료 목록과 조리 순서를 알려주세요.

다음과 같은 형식으로 작성해주세요:
[요리 이름]

재료:
파스타 200g, 올리브오일 2큰술, 마늘 2쪽 (이런 형식으로 재료와 분량을 쉼표로 구분해서 작성, 하이픈(-) 사용하지 않기)

조리순서:
1. [첫 번째 단계]
2. [두 번째 단계]
...

재료: ${ingredients.join(', ')}`;

  try {
    const completion = await openai.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: '당신은 요리 전문가입니다. 요리 이름을 먼저 알려주고, 그 다음 재료 목록(하이픈 없이 쉼표로 구분)과 조리 순서를 명확하게 설명해주세요.'
        },
        { role: 'user', content: prompt }
      ],
      model: 'gpt-3.5-turbo',
      max_tokens: 1000
    });

    const recipeText = completion.choices[0].message.content.trim();
    console.log("====== OpenAI 원본 응답 ======");
    console.log(recipeText);
    console.log("==============================");

    const parsedRecipe = parseRecipeResponse(recipeText);
    console.log("====== 파싱된 레시피 ======");
    console.log(JSON.stringify(parsedRecipe, null, 2));
    console.log("===========================");

    return parsedRecipe;
  } catch (error) {
    console.error("OpenAI API 오류:", error);
    return null;
  }
};

// recommend-recipe 엔드포인트 수정
app.post('/recommend-recipe', async (req, res) => {
  const ingredients = req.body.ingredients;

  if (!ingredients || ingredients.length === 0) {
    return res.status(400).json({ error: "재료 목록이 필요합니다." });
  }

  try {
    const recipeData = await getRecipe(ingredients);
    if (!recipeData) {
      return res.status(500).json({ error: "레시피를 생성하는 데 실패했습니다." });
    }

    console.log("생성된 레시피:", recipeData);
    return res.json(recipeData);
  } catch (error) {
    console.error("레시피 처리 오류:", error);
    return res.status(500).json({ error: "레시피 처리 중 오류가 발생했습니다." });
  }
});

// 기존 경로
app.get('/search-recipe', async (req, res) => {
  const name = req.query.q || '';
  const recipeInfo = await foodInfo(name);

  if (recipeInfo) {
    return res.json(recipeInfo);
  } else {
    return res.status(404).json({ error: "레시피를 찾을 수 없습니다." });
  }
});


// 기존 DB 검색 기능
app.get('/search', (req, res) => {
  const searchQuery = req.query.q || '';
  const sql = "SELECT * FROM products WHERE product_name LIKE ?";
  db.query(sql, [`%${searchQuery}%`], (err, result) => {
    if (err) {
      console.log("error", err);
      return res.status(500).json({ error: "Database error" });
    } else {
      console.log("success");
      return res.json(result);
    }
  });
});

// 기존 수량 업데이트 기능
app.put('/update-quantity', (req, res) => {
  const { id, change } = req.body;

  // 현재 수량 확인
  const checkSql = "SELECT quantity FROM products WHERE id = ?";
  db.query(checkSql, [id], (checkErr, checkResult) => {
    if (checkErr) {
      return res.status(500).json({ error: "Failed to check current quantity" });
    }

    if (checkResult.length === 0) {
      return res.status(404).json({ error: "Product not found" });
    }

    const currentQuantity = checkResult[0].quantity;
    const newQuantity = currentQuantity + change;

    if (newQuantity < 0) {
      return res.status(400).json({ error: "수량은 0보다 작을 수 없습니다." });
    }

    // 트랜잭션 시작
    db.beginTransaction(err => {
      if (err) {
        return res.status(500).json({ error: "Transaction start failed" });
      }

      // 수량 업데이트
      const updateSql = "UPDATE products SET quantity = ? WHERE id = ?";
      db.query(updateSql, [newQuantity, id], (updateErr, updateResult) => {
        if (updateErr) {
          return db.rollback(() => {
            res.status(500).json({ error: "Update failed" });
          });
        }

        // 수량이 감소할 때만 consumption_logs 처리
        if (change < 0) {
          // 가장 최근 로그 확인
          const checkLatestLogSql = `
            SELECT id, quantity_used 
            FROM consumption_logs 
            WHERE product_id = ? 
            ORDER BY id DESC 
            LIMIT 1`;

          db.query(checkLatestLogSql, [id], (checkLogErr, checkLogResult) => {
            if (checkLogErr) {
              return db.rollback(() => {
                res.status(500).json({ error: "Log check failed" });
              });
            }

            if (checkLogResult.length > 0) {
              // 최근 로그가 있으면 업데이트
              const updateLogSql = `
                UPDATE consumption_logs 
                SET quantity_used = quantity_used + ?, 
                    usage_date = NOW() 
                WHERE id = ?`;

              db.query(updateLogSql, [Math.abs(change), checkLogResult[0].id], (updateLogErr) => {
                if (updateLogErr) {
                  return db.rollback(() => {
                    res.status(500).json({ error: "Log update failed" });
                  });
                }
                completeTransaction();
              });
            } else {
              // 로그가 없으면 새로 생성
              const insertLogSql = `
                INSERT INTO consumption_logs 
                (product_id, quantity_used, usage_date) 
                VALUES (?, ?, NOW())`;

              db.query(insertLogSql, [id, Math.abs(change)], (insertLogErr) => {
                if (insertLogErr) {
                  return db.rollback(() => {
                    res.status(500).json({ error: "Log insert failed" });
                  });
                }
                completeTransaction();
              });
            }
          });
        } else {
          // 수량 증가의 경우 바로 트랜잭션 완료
          completeTransaction();
        }
      });
    });

    // 트랜잭션 완료 및 응답 전송 함수
    function completeTransaction() {
      db.commit(commitErr => {
        if (commitErr) {
          return db.rollback(() => {
            res.status(500).json({ error: "Commit failed" });
          });
        }

        // 업데이트된 제품 정보 조회
        const selectSql = "SELECT * FROM products WHERE id = ?";
        db.query(selectSql, [id], (selectErr, selectResult) => {
          if (selectErr) {
            return res.status(500).json({ error: "Failed to fetch updated product" });
          }
          return res.json(selectResult[0]);
        });
      });
    }
  });
});

// 소비 내역 및 분석 데이터 조회 엔드포인트
app.get('/consumption-analysis', async (req, res) => {
  const query = `
    SELECT 
      cl.usage_date,
      p.product_name,
      p.CLS_NM_1,
      p.CLS_NM_2,
      p.CLS_NM_3,
      cl.quantity_used
    FROM consumption_logs cl
    JOIN products p ON cl.product_id = p.id
    WHERE cl.usage_date >= DATE_SUB(CURDATE(), INTERVAL 1 MONTH)
    ORDER BY cl.usage_date DESC
  `;

  db.query(query, (err, results) => {
    if (err) {
      return res.status(500).json({ error: "Failed to fetch consumption data" });
    }

    // 소비 패턴 분석
    const analysis = {
      totalItems: results.length,
      totalQuantity: results.reduce((sum, item) => sum + item.quantity_used, 0),
    };

    // 제품별 소비량 계산 및 정렬
    const productConsumption = results.reduce((acc, item) => {
      acc[item.product_name] = (acc[item.product_name] || 0) + item.quantity_used;
      return acc;
    }, {});

    // 상위 5개 제품 추출 (수량 기준)
    const topProducts = Object.entries(productConsumption)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .reduce((acc, [product, quantity]) => {
        acc[product] = quantity;
        return acc;
      }, {});

    // 상위 5개 제품의 비율 계산 및 정렬
    const topProductsTotal = Object.values(topProducts).reduce((sum, quantity) => sum + quantity, 0);
    const topProductsPercentages = Object.entries(topProducts)
      .map(([product, quantity]) => ({
        product,
        percentage: (quantity / topProductsTotal * 100).toFixed(2)
      }))
      .sort((a, b) => parseFloat(b.percentage) - parseFloat(a.percentage))
      .reduce((acc, { product, percentage }) => {
        acc[product] = percentage;
        return acc;
      }, {});

    // 분석 결과 업데이트
    analysis.productConsumption = topProducts;
    analysis.consumptionPercentages = topProductsPercentages;

    // 데이터와 분석 결과 함께 전송
    res.json({
      rawData: results,
      analysis: analysis
    });
  });
});

// 기존의 search-food 엔드포인트를 수정
app.get('/search-food', (req, res) => {
  const foodName = req.query.name.toLowerCase();
  console.log('검색어:', foodName); // 검색어 출력
  const results = [];

  const filePath = path.join(__dirname, 'assets', 'nutrition_food.csv');

  fs.createReadStream(filePath)
    .pipe(csv())
    .on('data', (row) => {
      if (row['식품명'].toLowerCase().includes(foodName)) {
        Object.keys(row).forEach(key => {
          if (key !== '식품명') {
            row[key] = parseFloat(row[key]) || 0;
          }
        });
        results.push(row);
      }
    })
    .on('end', () => {
      console.log('검색 결과:', results.slice(0, 10)); // 결과 출력
      res.json(results.slice(0, 10));
    })
    .on('error', (error) => {
      console.error("Error reading CSV file:", error);
      res.status(500).json({ error: "CSV 파일을 읽는 데 오류가 발생했습니다." });
    });
});

function readCsv(filename) {
  return new Promise((resolve, reject) => {
    const results = [];
    fs.createReadStream(filename)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', () => resolve(results))
      .on('error', (error) => reject(error));
  });
}

function getNutritionalStandard(age, gender, standards) {
  let ageGroup = "";
  if (age >= 15 && age <= 18) ageGroup = "15-18세";
  else if (age >= 19 && age <= 29) ageGroup = "19-29세";
  else if (age >= 30 && age <= 49) ageGroup = "30-49세";
  else if (age >= 50 && age <= 64) ageGroup = "50-64세";
  else if (age >= 65 && age <= 74) ageGroup = "65-74세";
  else if (age >= 75) ageGroup = "75세 이상";
  else return null;

  gender = ["남성", "남자", "male", "m"].includes(gender.toLowerCase()) ? "남성" : "여성";

  return standards.find(row => row['연령'] === ageGroup && row['성별'] === gender);
}

function searchFood(foodName, foods) {
  return foods.filter(food => food['식품명'].toLowerCase().includes(foodName.toLowerCase()));
}

function analyzeNutrition(dailyIntake, standard) {
  const analysis = {};
  for (const [nutrient, value] of Object.entries(standard)) {
    if (nutrient !== '연령' && nutrient !== '성별') {
      const intake = parseFloat(dailyIntake[nutrient] || 0);
      const std = parseFloat(value);
      if (!isNaN(intake) && !isNaN(std) && std !== 0) {
        const percentage = (intake / std) * 100;
        analysis[nutrient] = {
          intake: intake,
          standard: std,
          percentage: percentage
        };
      }
    }
  }
  return analysis;
}

function recommendFoods(deficientNutrients, foods) {
  const recommendations = {};
  for (const nutrient of deficientNutrients) {
    recommendations[nutrient] = foods
      .filter(food => food[nutrient] && parseFloat(food[nutrient]) > 0)
      .map(food => [food['식품명'], parseFloat(food[nutrient])])
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);
  }
  return recommendations;
}


// analyze-nutrition 엔드포인트 수정
app.post('/analyze-nutrition', async (req, res) => {
  try {
    const { age, gender, foodIntake } = req.body;

    const standardsPath = path.join(__dirname, 'assets', 'nutrition_standard.csv');
    const foodDataPath = path.join(__dirname, 'assets', 'nutrition_food.csv');

    const standards = await readCsv(standardsPath);
    const foodData = await readCsv(foodDataPath);

    const standard = getNutritionalStandard(age, gender, standards);
    if (!standard) {
      return res.status(400).json({ error: "해당 연령 및 성별에 대한 영양 기준을 찾을 수 없습니다." });
    }

    const dailyIntake = {};
    for (const { name, amount } of foodIntake) {
      const matches = foodData.filter(food => food['식품명'] === name);
      if (matches.length > 0) {
        const selectedFood = matches[0];
        for (const [nutrient, value] of Object.entries(selectedFood)) {
          if (nutrient !== '식품명' && value) {
            const numericValue = parseFloat(value);
            if (!isNaN(numericValue)) {
              const intakeAmount = (numericValue * (amount / 100));
              dailyIntake[nutrient] = (dailyIntake[nutrient] || 0) + intakeAmount;
            }
          }
        }
      }
    }



    const analysis = analyzeNutrition(dailyIntake, standard);

    const deficientNutrients = Object.entries(analysis)
      .filter(([_, data]) => data.percentage < 90)
      .map(([nutrient, _]) => nutrient);

    const recommendations = recommendFoods(deficientNutrients, foodData);

    res.json({ analysis, recommendations });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

// 유통기한 임박 상품 조회 엔드포인트
app.get('/expiring-products', (req, res) => {
  const today = new Date();
  const expirationThreshold = new Date(today);
  expirationThreshold.setDate(today.getDate() + 28);

  const sql = `
    SELECT product_name, expiration_date 
    FROM products 
    WHERE expiration_date BETWEEN ? AND ?
    ORDER BY expiration_date ASC
  `;

  db.query(sql, [today.toISOString().split('T')[0], expirationThreshold.toISOString().split('T')[0]], (err, results) => {
    if (err) {
      return res.status(500).json({ error: 'Database query failed' });
    }
    console.log("Expiring products:", results); // 디버깅용 로그 추가
    res.json(results);
  });
});

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function searchCoupang(keyword) {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--disable-features=IsolateOrigins,site-per-process',
      '--disable-web-security'
    ]
  });

  const page = await browser.newPage();

  try {
    await page.setRequestInterception(true);
    page.on('request', (request) => {
      if (
        request.resourceType() === 'image' ||
        request.resourceType() === 'stylesheet' ||
        request.resourceType() === 'font'
      ) {
        request.abort();
      } else {
        request.continue();
      }
    });

    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    await page.setViewport({ width: 1280, height: 800 });
    await page.setCacheEnabled(true);

    await page.goto(`https://m.coupang.com/nm/search?q=${encodeURIComponent(keyword)}`, {
      waitUntil: 'domcontentloaded',
      timeout: 10000
    });

    await delay(1000);

    const products = await page.evaluate(() => {
      const results = [];
      const items = document.querySelectorAll('.search-product');

      for (let i = 0; i < Math.min(items.length, 10); i++) {
        const item = items[i];

        try {
          const name = item.querySelector('.name')?.innerText;
          const priceText = item.querySelector('.price-value')?.innerText;
          const link = item.querySelector('a')?.href;

          if (!name || !priceText || !link) continue;

          const price = parseInt(priceText.replace(/[^\d]/g, ''));
          const productId = link.match(/products\/(\d+)/)?.[1];

          if (productId) {
            results.push({
              name,
              price,
              link: `https://www.coupang.com/vp/products/${productId}`
            });
          }
        } catch (error) {
          continue;
        }
      }

      return results;
    });

    return products;
  } catch (error) {
    console.error("쿠팡 크롤링 중 오류 발생:", error);
    throw error;
  } finally {
    await browser.close();
  }
}

async function searchNaverShopping(keyword) {
  try {
    const encodedKeyword = encodeURIComponent(keyword);
    const url = `https://openapi.naver.com/v1/search/shop?query=${encodedKeyword}&display=10`;

    const response = await axios.get(url, {
      headers: {
        'X-Naver-Client-Id': process.env.NAVER_CLIENT_ID,
        'X-Naver-Client-Secret': process.env.NAVER_CLIENT_SECRET
      }
    });

    return response.data.items.map(item => ({
      name: item.title.replace(/<[^>]*>/g, ''),
      price: parseInt(item.lprice),
      link: item.link
    }));
  } catch (error) {
    console.error("Error fetching from Naver Shopping API:", error);
    throw error;
  }
}



app.post('/similar-products', async (req, res) => {
  const { productName } = req.body;

  if (!productName) {
    return res.status(400).json({ error: "상품 이름이 필요합니다." });
  }

  try {
    const results = await searchNaverShopping(productName);
    res.json(results);
  } catch (error) {
    console.error("Error fetching similar products:", error);
    res.status(500).json({
      error: "유사 상품을 가져오는 데 실패했습니다.",
      details: error.message
    });
  }
});

// 식품안전나라 API 호출 함수
async function getFoodCertInfo(productName) {
  const baseUrl = process.env.ALLERGIE_BASE_URL;
  const serviceKey = process.env.ALLERGIE_SERVICE_KEY;
  const encodedProductName = encodeURIComponent(productName);

  try {
    const response = await axios.get(`${baseUrl}?ServiceKey=${serviceKey}&prdlstNm=${encodedProductName}`);
    const parser = new xml2js.Parser({ explicitArray: false });
    const result = await parser.parseStringPromise(response.data);

    if (!result.response.body.items) {
      return null;
    }

    const items = Array.isArray(result.response.body.items.item)
      ? result.response.body.items.item
      : [result.response.body.items.item];

    // 중복 제거 및 데이터 정리
    const uniqueItems = {};
    items.forEach(item => {
      if (!uniqueItems[item.barcode]) {
        uniqueItems[item.barcode] = {
          productName: item.prdlstNm,
          barcode: item.barcode,
          allergyInfo: item.allergy || '정보 없음',
          ingredients: item.rawmtrl || '정보 없음',
          nutrients: item.nutrient || '정보 없음'
        };
      }
    });

    return Object.values(uniqueItems);
  } catch (error) {
    console.error('식품정보 API 호출 오류:', error);
    throw error;
  }
}

// 식품 정보 조회 엔드포인트 추가
app.get('/food-info/:productName', async (req, res) => {
  try {
    const { productName } = req.params;
    const foodInfo = await getFoodCertInfo(productName);
    res.json(foodInfo);
  } catch (error) {
    console.error('식품정보 조회 오류:', error);
    res.status(500).json({ error: '식품정보 조회 중 오류가 발생했습니다.' });
  }
});

app.get('/nutritional-info', (req, res) => {
  const age = parseInt(req.query.age);
  const gender = req.query.gender.toLowerCase();
  const results = [];

  fs.createReadStream('C:/SF/smartRefrigerator/assets/nutrition_standard.csv')
    .pipe(csv())
    .on('data', (row) => {
      results.push(row);
    })
    .on('end', () => {
      let ageGroup;
      if (age >= 15 && age <= 18) ageGroup = "15-18세";
      else if (age >= 19 && age <= 29) ageGroup = "19-29세";
      else if (age >= 30 && age <= 49) ageGroup = "30-49세";
      else if (age >= 50 && age <= 64) ageGroup = "50-64세";
      else if (age >= 65 && age <= 74) ageGroup = "65-74세";
      else if (age >= 75) ageGroup = "75세 이상";
      else return res.status(400).json({ error: "해당 연령대의 정보가 없습니다." });

      const genderNormalized = gender === "male" || gender === "m" || gender === "남성" || gender === "남자" ? "남성" : "여성";

      const info = results.find(row => row['연령'] === ageGroup && row['성별'] === genderNormalized);

      if (info) {
        res.json(info);
      } else {
        res.status(404).json({ error: "해당하는 정보를 찾을 수 없습니다." });
      }
    });
});

// XML을 JSON으로 변환하는 함수
const parseXMLToJSON = async (xml) => {
  const parser = new xml2js.Parser({ explicitArray: false });
  return new Promise((resolve, reject) => {
    parser.parseString(xml, (err, result) => {
      if (err) reject(err);
      else resolve(result);
    });
  });
};

// 제품 검색 API 엔드포인트
app.get('/api/products', async (req, res) => {
  try {
    const { productName } = req.query;
    const encodedProductName = encodeURIComponent(productName);
    const url = `${BASE_URL}?ServiceKey=${SERVICE_KEY}&prdlstNm=${encodedProductName}`;

    const response = await axios.get(url);
    const jsonData = await parseXMLToJSON(response.data);

    // 결과 데이터 처리
    const items = jsonData.response.body.items.item;
    if (!items) {
      return res.json({ products: [] });
    }

    // 중복 제거 및 데이터 정제
    const uniqueProducts = Array.isArray(items) ? items : [items];
    const processedProducts = uniqueProducts.reduce((acc, item) => {
      if (!acc[item.barcode]) {
        acc[item.barcode] = {
          id: item.barcode,
          name: item.prdlstNm,
          allergyInfo: item.allergy || '정보 없음',
          ingredients: item.rawmtrl || '정보 없음',
          nutrients: item.nutrient || '정보 없음'
        };
      }
      return acc;
    }, {});

    res.json({
      products: Object.values(processedProducts)
    });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});



// 서버 실행
app.listen(port, '0.0.0.0', () => {
  console.log(`Connect at http://localhost:${port}`);
});