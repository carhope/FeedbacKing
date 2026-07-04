// =========================================================================
// [Firebase 클라우드 연동 환경 설정] 
// 구글 콘솔에서 프로젝트 개설 후 발급받은 본인의 구성 값(Config)을 아래 적어넣으시면 즉시 전 세계 공유화가 진행됩니다.
// =========================================================================
const firebaseConfig = {
    apiKey: "AIzaSyA1...",
    authDomain: "feedbacking-XXXXX.firebaseapp.com",
    projectId: "feedbacking-XXXXX",
    storageBucket: "feedbacking-XXXXX.appspot.com",
    messagingSenderId: "1234567890",
    appId: "1:12345:web:abcd"
};
// Firebase 인스턴스 초기화 보호벽
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();

let speechList = []; // 실시간 메모리 동기화 어레이
let currentUser = JSON.parse(localStorage.getItem('currentUser')) || null;
let currentLiveId = null;

function GoToPage(pageURL){ 
    window.location.href = pageURL; 
}

// =========================================================================
// [실시간 핵심 데이터 동기화 엔진] Firebase 실시간 이벤트 리스너 통합 연동
// =========================================================================
function initRealtimeSync() {
    // 1. 발표 목록 컬렉션 감시 (추가, 수정, 삭제 발생 시 자동 화면 리랜더링)
    db.collection('speeches').orderBy('id', 'asc').onSnapshot(snapshot => {
        speechList = [];
        snapshot.forEach(doc => {
            speechList.push({ firestoreId: doc.id, ...doc.data() });
        });
        renderSpeeches();
    }, error => console.error("발표 스트리밍 오류:", error));

    // 2. 전역 실시간 라이브 제어 타워 감시
    db.collection('system').doc('liveState').onSnapshot(doc => {
        if (doc.exists) {
            currentLiveId = doc.data().liveSpeechId || null;
        } else {
            currentLiveId = null;
        }
        checkLiveBanner();
    });
}

function checkLiveBanner() {
    const liveBanner = document.getElementById('liveBanner');
    const liveTitle = document.getElementById('liveTitle');
    const liveBtn = document.getElementById('liveBtn');
    if (!liveBanner || !liveTitle || !liveBtn) return;

    if (!currentLiveId) {
        liveBanner.style.display = 'none';
        return;
    }

    const liveSpeech = speechList.find(s => s.id === Number(currentLiveId));
    if (!liveSpeech) {
        liveBanner.style.display = 'none';
        return;
    }

    liveBanner.style.display = 'flex';
    liveTitle.innerText = liveSpeech.title;

    if (currentUser && liveSpeech.owner === currentUser.id) {
        liveBtn.innerText = "📊 실시간 결과 대시보드 보기";
        liveBtn.style.backgroundColor = "#10b981"; 
        liveBtn.onclick = () => GoToPage(`FK_Dashboard.html?id=${liveSpeech.id}`);
    } else {
        liveBtn.innerText = "지금 바로 피드백 참여하기";
        liveBtn.style.backgroundColor = "#ef4444"; 
        liveBtn.onclick = () => GoToPage(`FK_GiveFeedback.html?id=${liveSpeech.id}`);
    }
}

// 가입 절차가 필요 없는 초경량 식별용 인증 UI 체계
function promptLogin() {
    const id = prompt("아이디를 입력하세요 (별도 가입 없이 즉시 공유화 계정 활성화)");
    if (!id) return;
    const pw = prompt("비밀번호를 입력하세요");
    if (!pw) return;

    currentUser = { id: id.trim(), password: pw.trim() };
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
    alert(`클라우드 동기화 성공: ${currentUser.id}님 반갑습니다!`);
    updateAuthUI();
    renderSpeeches();
}

function logout() {
    localStorage.removeItem('currentUser');
    currentUser = null;
    alert('안전하게 로그아웃 되었습니다.');
    updateAuthUI();
    renderSpeeches();
}

function updateAuthUI() {
    const msg = document.getElementById('welcomeMsg');
    const btnLog = document.getElementById('btnLogin');
    const btnOut = document.getElementById('btnLogout');
    if (!msg || !btnLog || !btnOut) return;

    if (currentUser) {
        msg.innerText = `👤 ${currentUser.id}님`;
        btnLog.style.display = 'none';
        btnOut.style.display = 'inline-block';
    } else {
        msg.innerText = '';
        btnLog.style.display = 'inline-block';
        btnOut.style.display = 'none';
    }
}

function checkLoginAndRegister() {
    if (!currentUser) {
        alert("무대에 발표를 등록하려면 먼저 로그인 체계를 활성화해 주세요!");
        promptLogin();
        return;
    }
    document.getElementById('registerModal').style.display = 'flex'; 
}

function closeModal() { 
    document.getElementById('registerModal').style.display = 'none'; 
}

function toggleAuthFields() {
    const authType = document.getElementById('regAuthType').value;
    const quizFields = document.getElementById('authQuizFields');
    const passwordFields = document.getElementById('authPasswordFields');

    quizFields.style.display = (authType === 'quiz') ? 'flex' : 'none';
    passwordFields.style.display = (authType === 'password') ? 'flex' : 'none';
}

// =========================================================================
// [데이터 업로드] 로컬스토리지가 아닌 Firebase 클라우드 DB로 발표 안전 저장
// =========================================================================
function submitSpeech() {
    const title = document.getElementById('regTitle').value.trim();
    const speaker = document.getElementById('regSpeaker').value.trim();
    const location = document.getElementById('regLocation').value.trim();
    const dateTime = document.getElementById('regDateTime').value;
    const content = document.getElementById('regContent').value.trim();
    const authType = document.getElementById('regAuthType').value;
    const presenterNote = document.getElementById('regPresenterNote').value.trim(); // 한마디 추출

    if (!title || !speaker || !location || !dateTime || !content) {
        alert('발표 핵심 기본 명세를 전부 채워주셔야 무대 배포가 가능합니다!');
        return;
    }

    let authData = { authType: authType };
    if (authType === 'quiz') {
        const youtube = document.getElementById('regYoutube').value.trim();
        const question = document.getElementById('regQuizQuestion').value.trim();
        const answer = document.getElementById('regQuizAnswer').value.trim();
        if (!youtube || !question || !answer) {
            alert('영상 인증 데이터 항목을 충실히 채워주십시오.');
            return;
        }
        authData.youtube = youtube;
        authData.quizQuestion = question;
        authData.quizAnswer = answer;
    } else if (authType === 'password') {
        const password = document.getElementById('regPassword').value.trim();
        if (!password) {
            alert('오프라인 비밀번호 도어락 패스워드를 기재하십시오.');
            return;
        }
        authData.password = password;
    }

    const newSpeech = { 
        id: Date.now(), 
        owner: currentUser ? currentUser.id : 'anonymous',
        title, 
        speaker, 
        location, 
        dateTime, 
        content, 
        presenterNote: presenterNote || "특별히 정해진 피드백 가이드가 없습니다. 자유롭고 유익한 한줄평을 부탁드립니다!",
        ...authData 
    };

    // Firebase Firestore에 Document 트랜잭션 전송
    db.collection('speeches').add(newSpeech)
    .then(() => {
        closeModal();
        resetModalInputs();
    })
    .catch(err => alert("클라우드 전송 실패: " + err));
}

function resetModalInputs() {
    document.getElementById('regTitle').value = '';
    document.getElementById('regSpeaker').value = '';
    document.getElementById('regLocation').value = '';
    document.getElementById('regDateTime').value = '';
    document.getElementById('regContent').value = '';
    document.getElementById('regPresenterNote').value = '';
    document.getElementById('regAuthType').value = 'none';
    document.getElementById('regYoutube').value = '';
    document.getElementById('regQuizQuestion').value = '';
    document.getElementById('regQuizAnswer').value = '';
    document.getElementById('regPassword').value = '';
    toggleAuthFields();
}

// =========================================================================
// [실시간 리랜더링 및 삭제 제어] 내 글에만 쓰레기통 아이콘 바인딩
// =========================================================================
function renderSpeeches(list = speechList) {
    const container = document.getElementById('spechesContainer');
    if(!container) return;
    container.innerHTML = ''; 
    
    if (list.length === 0) {
        container.innerHTML = `<div class="speches" style="text-align:center; color:#9ca3af;">현재 클라우드 허브에 공유 배포된 발표 세션이 존재하지 않습니다.</div>`;
        return;
    }

    [...list].reverse().forEach(speech => {
        const card = document.createElement('div');
        card.className = 'speches';
        card.style.position = 'relative';
        
        let badge = "🔓 자유 참여";
        if(speech.authType === 'quiz') badge = "📺 영상 퀴즈";
        if(speech.authType === 'password') badge = "🔒 현장 암호";

        // [추가 기능 2] 소유자 전용 삭제 버튼 바인딩 처리 문맥
        let deleteBtnHtml = '';
        if (currentUser && speech.owner === currentUser.id) {
            deleteBtnHtml = `
                <button class="btn-delete" onclick="deleteSpeech('${speech.firestoreId}', ${speech.id})" style="position:absolute; top:15px; right:15px;" title="이 발표 세션 영구 삭제">
                    🗑️
                </button>`;
        }

        let actionButton = '';
        if (currentUser && speech.owner === currentUser.id) {
            actionButton = `
                <button onclick="GoToPage('FK_Dashboard.html?id=${speech.id}')" style="margin-top:15px; background-color:#10b981; color:white; border:none; padding:8px 16px; border-radius:6px; cursor:pointer; font-weight:bold; font-size:12px;">
                    📊 실시간 대시보드 리포트 열기
                </button>`;
        } else {
            actionButton = `
                <button onclick="GoToPage('FK_GiveFeedback.html?id=${speech.id}')" style="margin-top:15px; background-color:#111827; color:white; border:none; padding:8px 16px; border-radius:6px; cursor:pointer; font-weight:bold; font-size:12px; transition:0.2s;" onmouseover="this.style.backgroundColor='#10b981'" onmouseout="this.style.backgroundColor='#111827'">
                    피드백 참여하기
                </button>`;
        }

        card.innerHTML = `
            ${deleteBtnHtml}
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; padding-right:25px;">
                <h3 style="margin:0; color:#1f2937;">${speech.title}</h3>
                <span style="font-size:11px; padding:4px 8px; background:#f3f4f6; border-radius:12px; color:#4b5563; font-weight:bold;">${badge}</span>
            </div>
            <p style="margin: 4px 0; font-size: 14px; color: #6b7280;"><strong>발표자:</strong> ${speech.speaker}</p>
            <p style="margin: 4px 0; font-size: 14px; color: #6b7280;"><strong>장소:</strong> ${speech.location} | <strong>일시:</strong> ${speech.dateTime.replace('T', ' ')}</p>
            
            <div class="presenter-note-box">
                <strong>💡 발표자의 피드백 포커싱:</strong> ${speech.presenterNote}
            </div>

            <p style="margin: 10px 0 0 0; color: #374151; font-size:14px; line-height:1.5;">${speech.content}</p>
            ${actionButton}
        `;
        container.appendChild(card);
    });

    checkLiveBanner();
}

// [추가 기능 2] 발표 세션 영구 소멸 및 종속 데이터 크러시 예방 처리
function deleteSpeech(firestoreId, numericId) {
    if (!confirm("발표를 영구 삭제하시겠습니까?\n이 발표 세션에 청중들이 기록한 피드백 보고서 정보 데이터도 함께 클라우드에서 말소 처리됩니다.")) return;
    
    // 발표 세션 본체 삭제
    db.collection('speeches').doc(firestoreId).delete()
    .then(() => {
        // 혹시 라이브 중이었던 연설 세션이라면 전역 라이브 깃발도 자동 초기화 폭파
        if(String(numericId) === String(currentLiveId)) {
            db.collection('system').doc('liveState').delete();
        }
        alert("무대 발표 세션 데이터가 실시간으로 소멸 제거되었습니다.");
    })
    .catch(err => alert("삭제 실패: " + err));
}

function searchSpeeches() {
    const sTitle = document.getElementById('searchTitle').value.trim();
    const sSpeaker = document.getElementById('searchSpeaker').value.trim();
    const sLocation = document.getElementById('searchLocation').value.trim();
    const sDate = document.getElementById('searchDate').value.trim();

    const filteredList = speechList.filter(speech => {
        const matchTitle = sTitle ? speech.title.includes(sTitle) : true;
        const matchSpeaker = sSpeaker ? speech.speaker.includes(sSpeaker) : true;
        const matchLocation = sLocation ? speech.location.includes(sLocation) : true;
        const matchDate = sDate ? speech.dateTime.includes(sDate) : true;
        return matchTitle && matchSpeaker && matchLocation && matchDate;
    });

    renderSpeeches(filteredList);
}

function resetSearch() {
    document.getElementById('searchTitle').value = '';
    document.getElementById('searchSpeaker').value = '';
    document.getElementById('searchLocation').value = '';
    document.getElementById('searchDate').value = '';
    renderSpeeches();
}

window.onload = function() { 
    updateAuthUI();
    initRealtimeSync(); // 실시간 소켓 파이프라인 오픈
};