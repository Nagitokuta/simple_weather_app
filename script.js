// script.js - 完成版

const API_KEY = CONFIG.API_KEY;

// DOM要素の取得
const currentLocationBtn = document.getElementById("current-location-btn");
const searchBtn = document.getElementById("search-btn");
const regionInput = document.getElementById("region-input");

// 天気情報表示用の要素を取得
const locationName = document.getElementById("location-name");
const weatherCondition = document.getElementById("weather-condition");
const temperature = document.getElementById("temperature");
const humidity = document.getElementById("humidity");
const windSpeed = document.getElementById("wind-speed");

// 検索履歴の管理クラス
class SearchHistory {
    constructor() {
        this.maxHistory = 5;
        this.storageKey = 'weatherAppHistory';
    }
    
    getHistory() {
        try {
            const history = localStorage.getItem(this.storageKey);
            return history ? JSON.parse(history) : [];
        } catch (error) {
            console.warn('履歴の取得に失敗:', error);
            return [];
        }
    }
    
    addToHistory(cityName) {
        try {
            let history = this.getHistory();
            history = history.filter(item => item !== cityName);
            history.unshift(cityName);
            
            if (history.length > this.maxHistory) {
                history = history.slice(0, this.maxHistory);
            }
            
            localStorage.setItem(this.storageKey, JSON.stringify(history));
        } catch (error) {
            console.warn('履歴の保存に失敗:', error);
        }
    }
}

const searchHistory = new SearchHistory();

// 入力値の検証関数
function validateCityInput(input) {
    const trimmed = input.trim();
    
    if (trimmed === "") {
        return { isValid: false, message: "地域名を入力してください" };
    }
    
    if (trimmed.length > 100) {
        return { isValid: false, message: "地域名が長すぎます（100文字以内）" };
    }
    
    if (trimmed.length < 2) {
        return { isValid: false, message: "地域名は2文字以上で入力してください" };
    }
    
    const validPattern = /^[a-zA-Z0-9\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF\s\-,\.]+$/;
    if (!validPattern.test(trimmed)) {
        return { isValid: false, message: "使用できない文字が含まれています" };
    }
    
    if (/\s{2,}/.test(trimmed)) {
        return { isValid: false, message: "連続するスペースは使用できません" };
    }
    
    return { isValid: true, value: trimmed };
}

// 地域名の正規化関数
function normalizeCityName(cityName) {
    let normalized = cityName.trim();
    
    // 全角英数字を半角に変換
    normalized = normalized.replace(/[Ａ-Ｚａ-ｚ０-９]/g, function(s) {
        return String.fromCharCode(s.charCodeAt(0) - 0xFEE0);
    });
    
    // 日本の主要都市の英語名変換
    const cityMap = {
        '東京': 'Tokyo', 'とうきょう': 'Tokyo', 'トウキョウ': 'Tokyo',
        '大阪': 'Osaka', 'おおさか': 'Osaka', 'オオサカ': 'Osaka',
        '名古屋': 'Nagoya', 'なごや': 'Nagoya', 'ナゴヤ': 'Nagoya',
        '福岡': 'Fukuoka', 'ふくおか': 'Fukuoka', 'フクオカ': 'Fukuoka',
        '札幌': 'Sapporo', 'さっぽろ': 'Sapporo', 'サッポロ': 'Sapporo',
        '仙台': 'Sendai', 'せんだい': 'Sendai', 'センダイ': 'Sendai',
        '広島': 'Hiroshima', 'ひろしま': 'Hiroshima', 'ヒロシマ': 'Hiroshima',
        '京都': 'Kyoto', 'きょうと': 'Kyoto', 'キョウト': 'Kyoto',
        '神戸': 'Kobe', 'こうべ': 'Kobe', 'コウベ': 'Kobe'
    };
    
    return cityMap[normalized] || normalized;
}

// 天気データを画面に表示する関数
function displayWeatherData(data) {
    try {
        locationName.textContent = data.name || "不明な地域";
        
        const weatherDesc = data.weather && data.weather[0] 
            ? data.weather[0].description 
            : "情報なし";
        weatherCondition.textContent = weatherDesc;
        
        const temp = data.main && data.main.temp 
            ? Math.round(data.main.temp) 
            : "---";
        temperature.textContent = temp !== "---" ? `${temp}℃` : "---";
        
        const hum = data.main && data.main.humidity 
            ? data.main.humidity 
            : "---";
        humidity.textContent = hum !== "---" ? `${hum}%` : "---";
        
        const wind = data.wind && data.wind.speed 
            ? data.wind.speed 
            : "---";
        windSpeed.textContent = wind !== "---" ? `${wind}m/s` : "---";
        
        console.log('天気情報を表示しました:', data);
        
    } catch (error) {
        console.error('天気データの表示中にエラーが発生:', error);
        displayError("天気情報の表示に失敗しました");
    }
}

// エラー表示用の関数
function displayError(message) {
    locationName.textContent = "エラー";
    weatherCondition.textContent = message;
    temperature.textContent = "---";
    humidity.textContent = "---";
    windSpeed.textContent = "---";
}

// ローディング表示用の関数
function displayLoading() {
    locationName.textContent = "取得中...";
    weatherCondition.textContent = "しばらくお待ちください";
    temperature.textContent = "---";
    humidity.textContent = "---";
    windSpeed.textContent = "---";
}

// 地域名で天気情報を取得する関数
async function getWeatherByCity(cityName) {
    try {
        displayLoading();
        
        const validation = validateCityInput(cityName);
        if (!validation.isValid) {
            throw new Error(validation.message);
        }
        
        const normalizedCity = normalizeCityName(validation.value);
        const encodedCity = encodeURIComponent(normalizedCity);
        const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodedCity}&appid=${API_KEY}&units=metric&lang=ja`;
        
        console.log('APIリクエスト送信:', url);
        
        const response = await fetch(url);
        
        if (!response.ok) {
            switch (response.status) {
                case 400:
                    throw new Error("リクエストの形式が正しくありません");
                case 401:
                    throw new Error("APIキーが無効です。設定を確認してください");
                case 404:
                    throw new Error(`「${cityName}」が見つかりませんでした。地域名を確認してください`);
                case 429:
                    throw new Error("APIの利用制限に達しました。しばらく待ってから再試行してください");
                case 500:
                    throw new Error("サーバーエラーが発生しました。しばらく待ってから再試行してください");
                default:
                    throw new Error(`天気情報の取得に失敗しました (エラーコード: ${response.status})`);
            }
        }

        const data = await response.json();
        console.log('取得した天気データ:', data);
        
        if (!data || !data.name) {
            throw new Error("無効な天気データを受信しました");
        }
        
        searchHistory.addToHistory(cityName);
        displayWeatherData(data);

    } catch (error) {
        console.error('地域名での天気取得エラー:', error);
        
        if (error instanceof TypeError && error.message.includes('fetch')) {
            displayError("ネットワークに接続できません。インターネット接続を確認してください");
        } else {
            displayError(error.message);
        }
    }
}

// 緯度経度で天気情報を取得する関数
async function getWeatherByCoords(lat, lon) {
    try {
        displayLoading();
        
        const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric&lang=ja`;
        
        console.log('APIリクエスト送信（座標）:', url);
        
        const response = await fetch(url);
        
        if (!response.ok) {
            if (response.status === 401) {
                throw new Error("APIキーが無効です");
            } else if (response.status === 429) {
                throw new Error("APIの利用制限に達しました");
            } else {
                throw new Error(`天気情報の取得に失敗しました (${response.status})`);
            }
        }

        const data = await response.json();
        console.log('取得した天気データ（座標）:', data);
        
        if (!data || !data.name) {
            throw new Error("無効な天気データを受信しました");
        }
        
        displayWeatherData(data);

    } catch (error) {
        console.error('座標での天気取得エラー:', error);
        displayError(error.message);
    }
}

// 位置情報を取得して天気を表示する関数
function getCurrentLocationWeather() {
    if (!navigator.geolocation) {
        displayError("このブラウザでは位置情報取得がサポートされていません");
        return;
    }

    displayLoading();

    const options = {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000
    };

    navigator.geolocation.getCurrentPosition(
        (position) => {
            const lat = position.coords.latitude;
            const lon = position.coords.longitude;
            
            console.log(`現在地の座標: 緯度 ${lat}, 経度 ${lon}`);
            getWeatherByCoords(lat, lon);
        },
        (error) => {
            console.error('位置情報取得エラー:', error);
            
            let errorMessage;
            switch(error.code) {
                case error.PERMISSION_DENIED:
                    errorMessage = "位置情報の取得が許可されませんでした。ブラウザの設定を確認してください。";
                    break;
                case error.POSITION_UNAVAILABLE:
                    errorMessage = "位置情報が利用できません。";
                    break;
                case error.TIMEOUT:
                    errorMessage = "位置情報の取得がタイムアウトしました。";
                    break;
                default:
                    errorMessage = "位置情報の取得に失敗しました。";
                    break;
            }
            
            displayError(errorMessage);
        },
        options
    );
}

// 「現在地の天気を見る」ボタンのクリックイベント
currentLocationBtn.addEventListener("click", () => {
    console.log("現在地ボタンがクリックされました");
    getCurrentLocationWeather();
});

// 「検索」ボタンのクリックイベント
searchBtn.addEventListener("click", () => {
    const inputValue = regionInput.value;
    
    const validation = validateCityInput(inputValue);
    if (!validation.isValid) {
        displayError(validation.message);
        return;
    }
    
    console.log("検索ボタンがクリックされました：", validation.value);
    getWeatherByCity(validation.value);
});

// Enterキーでも検索できるようにする
regionInput.addEventListener("keypress", (event) => {
    if (event.key === "Enter") {
        searchBtn.click();
    }
});

// 入力欄のフォーカス時に前回のエラーをクリア
regionInput.addEventListener("focus", () => {
    if (locationName.textContent === "エラー") {
        locationName.textContent = "---";
        weatherCondition.textContent = "---";
        temperature.textContent = "---";
        humidity.textContent = "---";
        windSpeed.textContent = "---";
    }
});

// ページ読み込み時の初期化
document.addEventListener("DOMContentLoaded", () => {
    console.log("ページが読み込まれました");
    
    if (API_KEY === "YOUR_API_KEY_HERE") {
        displayError("APIキーを設定してください");
        console.warn("APIキーが設定されていません。script.js内のAPI_KEYを設定してください。");
        return;
    }

    if (!navigator.geolocation) {
        console.warn("このブラウザでは位置情報取得がサポートされていません");
        currentLocationBtn.disabled = true;
        currentLocationBtn.textContent = "位置情報未対応";
    }
    
    console.log("アプリの初期化が完了しました");
});