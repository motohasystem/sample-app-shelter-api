// 災害種別ごとのアイコン定義
const DISASTER_ICONS = {
    '洪水': '🌊',
    '崖崩れ、土石流及び地滑り': '⛰️',
    '高潮': '🌀',
    '地震': '🏚️',
    '津波': '🌊',
    '大規模な火事': '🔥',
    '内水氾濫': '💧',
    '火山現象': '🌋'
};

// グローバル変数
let map;
let markersLayer;
let masterData = null; // code-to-city.jsonのデータを保持
let currentLocationMarker = null; // 現在地マーカー

// 地図の初期化
function initMap() {
    // 日本の中心（東京）を初期位置として設定
    map = L.map('map').setView([35.6762, 139.6503], 10);

    // OpenStreetMapタイルレイヤーを追加
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19
    }).addTo(map);

    // マーカーレイヤーグループを作成
    markersLayer = L.layerGroup().addTo(map);
}

// ステータスメッセージの表示
function showStatus(message, type) {
    const statusEl = document.getElementById('status');
    statusEl.textContent = message;
    statusEl.className = `status ${type}`;

    if (type === 'success') {
        setTimeout(() => {
            statusEl.textContent = '';
            statusEl.className = 'status';
        }, 3000);
    }
}

// 避難所の対応災害種別を取得
function getDisasterTypes(properties) {
    const disasters = [];

    if (properties['洪水'] === '1') disasters.push('洪水');
    if (properties['崖崩れ、土石流及び地滑り'] === '1') disasters.push('崖崩れ、土石流及び地滑り');
    if (properties['高潮'] === '1') disasters.push('高潮');
    if (properties['地震'] === '1') disasters.push('地震');
    if (properties['津波'] === '1') disasters.push('津波');
    if (properties['大規模な火事'] === '1') disasters.push('大規模な火事');
    if (properties['内水氾濫'] === '1') disasters.push('内水氾濫');
    if (properties['火山現象'] === '1') disasters.push('火山現象');

    return disasters;
}

// カスタムアイコンの作成（同心円配置）
function createCustomIcon(disasters) {
    // 中心ピンと周囲のアイコンを配置
    let html = '<div class="marker-container">';

    // 中心ピン
    html += '<div class="center-pin">📍</div>';

    if (disasters.length > 0) {
        // 同心円の設定
        const circles = [
            { radius: 39, maxIcons: 6 },  // 内側の円
            { radius: 59, maxIcons: 8 },  // 中間の円
            { radius: 79, maxIcons: 12 }  // 外側の円
        ];

        let remainingIcons = [...disasters];
        let iconIndex = 0;

        // 各同心円にアイコンを配置
        for (const circle of circles) {
            if (remainingIcons.length === 0) break;

            // この円に配置するアイコンの数を決定
            const iconsInThisCircle = Math.min(circle.maxIcons, remainingIcons.length);
            const angleStep = 360 / iconsInThisCircle;

            // この円周上にアイコンを配置
            for (let i = 0; i < iconsInThisCircle; i++) {
                const angle = angleStep * i - 90; // -90度で12時方向から開始
                const angleRad = angle * (Math.PI / 180); // ラジアンに変換

                // 円周上の位置を計算
                const x = circle.radius * Math.cos(angleRad);
                const y = circle.radius * Math.sin(angleRad);

                const disaster = remainingIcons[i];
                const icon = DISASTER_ICONS[disaster] || '📍';
                html += `<div class="disaster-icon" style="left: calc(50% + ${x}px); top: calc(50% + ${y}px);">${icon}</div>`;
                iconIndex++;
            }

            // 配置済みのアイコンを削除
            remainingIcons = remainingIcons.slice(iconsInThisCircle);
        }
    }

    html += '</div>';

    return L.divIcon({
        html: html,
        className: 'custom-marker-icon',
        iconSize: [200, 200],  // サイズを大きく（外側の円に対応）
        iconAnchor: [100, 100],   // アンカーを中心に
        popupAnchor: [0, -100]   // ポップアップ位置を調整
    });
}

// ポップアップコンテンツの作成
function createPopupContent(properties, disasters) {
    const disasterTags = disasters.map(d =>
        `<span class="disaster-tag">${DISASTER_ICONS[d]} ${d}</span>`
    ).join('');

    return `
        <div class="popup-content">
            <h3>${properties['施設・場所名'] || '名称不明'}</h3>
            <div class="info-row">
                <span class="label">住所:</span>
                <span>${properties['住所'] || '不明'}</span>
            </div>
            <div class="info-row">
                <span class="label">共通ID:</span>
                <span>${properties['共通ID'] || '不明'}</span>
            </div>
            <div class="disaster-types">
                <h4>対応災害種別:</h4>
                <div class="disaster-tags">
                    ${disasterTags || '<span>データなし</span>'}
                </div>
            </div>
            ${properties['備考'] ? `
            <div class="info-row" style="margin-top: 10px;">
                <span class="label">備考:</span>
                <span>${properties['備考']}</span>
            </div>
            ` : ''}
        </div>
    `;
}

// GeoJSONデータから地図にマーカーを追加
function displaySheltersOnMap(geojson) {
    // 既存のマーカーをクリア
    markersLayer.clearLayers();

    if (!geojson.features || geojson.features.length === 0) {
        showStatus('該当するデータが見つかりませんでした', 'error');
        return;
    }

    // 地図の中心を計算するための配列
    const bounds = [];

    // 各避難所をマーカーとして追加
    geojson.features.forEach(feature => {
        const coords = feature.geometry.coordinates;
        const properties = feature.properties;

        // 緯度経度の順序に注意（GeoJSONは [経度, 緯度]）
        const lat = coords[1];
        const lng = coords[0];

        // 対応災害種別を取得
        const disasters = getDisasterTypes(properties);

        // カスタムアイコンを作成（円周配置）
        const customIcon = createCustomIcon(disasters);

        // マーカーを作成
        const marker = L.marker([lat, lng], { icon: customIcon });

        // ポップアップを作成
        const popupContent = createPopupContent(properties, disasters);
        marker.bindPopup(popupContent);

        // マーカーをレイヤーに追加
        marker.addTo(markersLayer);

        // 境界計算用に座標を追加
        bounds.push([lat, lng]);
    });

    // 地図の表示範囲を調整
    if (bounds.length > 0) {
        map.fitBounds(bounds, { padding: [50, 50] });
    }

    showStatus(`${geojson.features.length}件の緊急避難所を表示しました`, 'success');
}

// jp-shelter-apiからデータを取得
async function loadShelterData(cityCode) {
    showStatus('データを読み込み中...', 'loading');

    try {
        // APIエンドポイント
        const apiUrl = `https://motohasystem.github.io/jp-shelter-api/api/v0/emergency/${cityCode}.json`;

        const response = await fetch(apiUrl);

        if (!response.ok) {
            throw new Error(`データの取得に失敗しました (ステータス: ${response.status})`);
        }

        const geojson = await response.json();
        displaySheltersOnMap(geojson);

    } catch (error) {
        console.error('Error loading shelter data:', error);
        showStatus(`エラー: ${error.message}`, 'error');
    }
}

// マスターデータ（code-to-city.json）を読み込み
async function loadMasterData() {
    try {
        showStatus('都道府県・市区町村データを読み込み中...', 'loading');
        const response = await fetch('https://motohasystem.github.io/jp-shelter-api/api/v0/code-to-city.json');

        if (!response.ok) {
            throw new Error('マスターデータの取得に失敗しました');
        }

        masterData = await response.json();
        populatePrefectureSelector();
        showStatus('', '');
    } catch (error) {
        console.error('Error loading master data:', error);
        showStatus(`エラー: ${error.message}`, 'error');
    }
}

// 都道府県セレクトボックスを生成
function populatePrefectureSelector() {
    const prefectureSelect = document.getElementById('prefecture');

    // 都道府県コードでソート
    const prefectureCodes = Object.keys(masterData).sort();

    prefectureCodes.forEach(code => {
        const prefecture = masterData[code];
        const option = document.createElement('option');
        option.value = code;
        option.textContent = prefecture.name;
        prefectureSelect.appendChild(option);
    });
}

// 市区町村セレクトボックスを更新
function updateCitySelector(prefectureCode) {
    const citySelect = document.getElementById('city');
    const loadButton = document.getElementById('loadData');

    // 既存のオプションをクリア
    citySelect.innerHTML = '<option value="">-- 市区町村を選択 --</option>';
    citySelect.disabled = true;
    loadButton.disabled = true;

    if (!prefectureCode) {
        citySelect.innerHTML = '<option value="">-- 都道府県を選択してください --</option>';
        return;
    }

    const prefecture = masterData[prefectureCode];
    if (!prefecture || !prefecture.cities) {
        showStatus('市区町村データが見つかりません', 'error');
        return;
    }

    // 市区町村を名前順でソート
    const cities = Object.values(prefecture.cities).sort((a, b) =>
        a.name.localeCompare(b.name)
    );

    cities.forEach(city => {
        const option = document.createElement('option');
        option.value = city.code;
        option.textContent = city.name.replace(prefecture.name, ''); // 都道府県名を除去
        citySelect.appendChild(option);
    });

    citySelect.disabled = false;
}

// URLパラメータを更新
function updateURLParameter(cityCode) {
    const url = new URL(window.location);
    if (cityCode) {
        url.searchParams.set('city', cityCode);
    } else {
        url.searchParams.delete('city');
    }
    window.history.pushState({}, '', url);
}

// URLパラメータから市区町村コードを取得
function getCityCodeFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('city');
}

// 団体コードから都道府県コードを取得
function getPrefectureCodeFromCityCode(cityCode) {
    if (!masterData || !cityCode) return null;

    // 団体コードの最初の2桁が都道府県コード
    const prefectureCode = cityCode.substring(0, 2);

    // マスターデータに存在するか確認
    if (masterData[prefectureCode]) {
        return prefectureCode;
    }

    return null;
}

// 市区町村を選択して表示
function selectAndLoadCity(cityCode) {
    if (!cityCode || !masterData) return false;

    // 都道府県コードを取得
    const prefectureCode = getPrefectureCodeFromCityCode(cityCode);
    if (!prefectureCode) {
        console.error('Invalid city code:', cityCode);
        return false;
    }

    // 都道府県を選択
    const prefectureSelect = document.getElementById('prefecture');
    prefectureSelect.value = prefectureCode;

    // 市区町村リストを更新
    updateCitySelector(prefectureCode);

    // 市区町村を選択
    const citySelect = document.getElementById('city');
    const cityOption = Array.from(citySelect.options).find(opt => opt.value === cityCode);

    if (cityOption) {
        citySelect.value = cityCode;
        document.getElementById('loadData').disabled = false;
        updateURLParameter(cityCode);
        loadShelterData(cityCode);
        return true;
    } else {
        console.error('City not found in options:', cityCode);
        return false;
    }
}

// 現在位置を取得して地図を移動
function getCurrentLocation() {
    if (!navigator.geolocation) {
        showStatus('お使いのブラウザは位置情報に対応していません', 'error');
        return;
    }

    showStatus('現在位置を取得中...', 'loading');

    navigator.geolocation.getCurrentPosition(
        async (position) => {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;

            // 地図を現在位置に移動
            map.setView([lat, lng], 14);

            // 既存の現在位置マーカーを削除
            if (currentLocationMarker) {
                map.removeLayer(currentLocationMarker);
            }

            // 現在位置マーカーを追加
            currentLocationMarker = L.marker([lat, lng], {
                icon: L.divIcon({
                    html: '<div style="font-size: 32px; text-align: center;">📍</div>',
                    className: 'current-location-icon',
                    iconSize: [32, 32],
                    iconAnchor: [16, 32]
                })
            }).addTo(map);

            currentLocationMarker.bindPopup('<b>現在地</b>').openPopup();

            // 逆ジオコーディングで市区町村を特定
            showStatus('市区町村を特定中...', 'loading');
            try {
                const cityCode = await getCityCodeFromLocation(lat, lng);
                if (cityCode) {
                    showStatus('市区町村を特定しました', 'success');
                    selectAndLoadCity(cityCode);
                } else {
                    showStatus('市区町村を特定できませんでした。手動で選択してください。', 'error');
                }
            } catch (error) {
                console.error('Geocoding error:', error);
                showStatus('市区町村の特定に失敗しました。手動で選択してください。', 'error');
            }
        },
        (error) => {
            let message = '位置情報の取得に失敗しました';
            switch (error.code) {
                case error.PERMISSION_DENIED:
                    message = '位置情報の使用が拒否されました';
                    break;
                case error.POSITION_UNAVAILABLE:
                    message = '位置情報が利用できません';
                    break;
                case error.TIMEOUT:
                    message = '位置情報の取得がタイムアウトしました';
                    break;
            }
            showStatus(message, 'error');
        }
    );
}

// 緯度経度から市区町村コードを取得（逆ジオコーディング）
async function getCityCodeFromLocation(lat, lng) {
    try {
        // Nominatim APIで逆ジオコーディング
        const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1&accept-language=ja`,
            {
                headers: {
                    'User-Agent': 'ShelterMapApp/1.0'
                }
            }
        );

        if (!response.ok) {
            throw new Error('Geocoding API request failed');
        }

        const data = await response.json();
        const address = data.address;

        if (!address) {
            return null;
        }

        // 都道府県名と市区町村名を取得
        const prefecture = address.province || address.state;
        const city = address.city || address.town || address.village || address.municipality;

        if (!prefecture || !city) {
            return null;
        }

        // マスターデータから該当する市区町村コードを検索
        return findCityCode(prefecture, city);
    } catch (error) {
        console.error('Reverse geocoding error:', error);
        return null;
    }
}

// 都道府県名と市区町村名から団体コードを検索
function findCityCode(prefectureName, cityName) {
    if (!masterData) return null;

    // 都道府県を検索
    for (const [prefCode, prefData] of Object.entries(masterData)) {
        if (prefData.name.includes(prefectureName) || prefectureName.includes(prefData.name)) {
            // 市区町村を検索
            for (const [cityKey, cityData] of Object.entries(prefData.cities || {})) {
                const fullCityName = cityData.name;
                // 部分一致で検索（例：「札幌市」と「札幌市中央区」）
                if (fullCityName.includes(cityName) || cityName.includes(fullCityName.replace(prefData.name, ''))) {
                    return cityData.code;
                }
            }
        }
    }

    return null;
}

// イベントリスナーの設定
document.addEventListener('DOMContentLoaded', async () => {
    // 地図の初期化
    initMap();

    // マスターデータの読み込み
    await loadMasterData();

    // 都道府県選択時のイベント
    document.getElementById('prefecture').addEventListener('change', (e) => {
        const prefectureCode = e.target.value;
        updateCitySelector(prefectureCode);
    });

    // 市区町村選択時のイベント
    document.getElementById('city').addEventListener('change', (e) => {
        const cityCode = e.target.value;
        const loadButton = document.getElementById('loadData');

        if (cityCode) {
            loadButton.disabled = false;
            // URLパラメータを更新
            updateURLParameter(cityCode);
        } else {
            loadButton.disabled = true;
            // URLパラメータを削除
            updateURLParameter(null);
        }
    });

    // データ読み込みボタン
    document.getElementById('loadData').addEventListener('click', () => {
        const cityCode = document.getElementById('city').value;

        if (!cityCode) {
            showStatus('市区町村を選択してください', 'error');
            return;
        }

        loadShelterData(cityCode);
    });

    // 現在地ボタン
    document.getElementById('getCurrentLocation').addEventListener('click', () => {
        getCurrentLocation();
    });

    // URLパラメータまたはデフォルトで初期表示
    if (masterData) {
        const cityCodeFromURL = getCityCodeFromURL();

        if (cityCodeFromURL) {
            // URLパラメータがある場合、その市区町村を表示
            const success = selectAndLoadCity(cityCodeFromURL);
            if (!success) {
                // URLパラメータが無効な場合、デフォルトを表示
                selectAndLoadCity('011002');
            }
        } else {
            // URLパラメータがない場合、デフォルトで北海道札幌市を選択
            selectAndLoadCity('011002');
        }
    }
});
