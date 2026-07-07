// =========================================================================
// [Firebase 클라우드 연동 환경 설정] 
// =========================================================================
import { firebaseConfig } from './config.js';

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();

// 🔥 발표장 방화벽 프리패스를 위한 안정성 강화 코드 추가
db.settings({ experimentalForceLongPolling: true });

let speechList = []; 
let currentUser = JSON.parse(localStorage.getItem('currentUser')) || null;
let currentLiveId = null;

function GoToPage(pageURL){ 
    window.location.href = pageURL; 
}

// =========================================================================
// [실시간 핵심 데이터 동기화 엔진] Firebase 실시간 이벤트 리스너 통합 연동
// =========================================================================
function initRealtimeSync() {
    db.collection('speeches').orderBy('id', 'asc').onSnapshot(snapshot => {
        speechList = [];
        snapshot.forEach(doc => {
            speechList.push({ firestoreId: doc.id, ...doc.data() });
        });
        renderSpeeches();
    }, error => console.error("발표 스트리밍 오류:", error));

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
        // 🛠️ 대소문자 주소 통일 완료
        liveBtn.onclick = () => GoToPage(`FK_Dashboard.html?id=${liveSpeech.id}`);
    } else {
        liveBtn.innerText = "지금 바로 피드백 참여하기";
        liveBtn.style.backgroundColor = "#ef4444"; 
        liveBtn.onclick = () => GoToPage(`FK_GiveFeedback.html?id=${liveSpeech.id}`);
    }
}

// =========================================================================
// [🔐 업그레이드 로그인 및 모달 핸들러 파트]
// =========================================================================

function promptLogin() {
    const loginModal = document.getElementById('loginModal');
    if (loginModal) {
        loginModal.style.display = 'flex';
        document.getElementById('loginIdInput')?.focus();
    }
}

function closeLoginModal() {
    const loginModal = document.getElementById('loginModal');
    if (loginModal) {
        document.getElementById('loginIdInput').value = '';
        document.getElementById('loginPwInput').value = '';
        loginModal.style.display = 'none';
    }
}

async function handleLoginSubmit() {
    const idInput = document.getElementById('loginIdInput');
    const pwInput = document.getElementById('loginPwInput');
    if (!idInput || !pwInput) return;

    const id = idInput.value.trim();
    const pw = pwInput.value.trim();

    if (!id) { alert("아이디를 입력해 주세요."); idInput.focus(); return; }
    if (!pw) { alert("비밀번호를 입력해 주세요."); pwInput.focus(); return; }

    try {
        const userRef = db.collection('users').doc(id);
        const userDoc = await userRef.get();

        if (userDoc.exists) {
            const userData = userDoc.data();
            if (userData.password !== pw) {
                alert("❌ 아이디가 이미 존재하거나 비밀번호가 틀렸습니다! 다시 확인해 주세요.");
                pwInput.value = '';
                pwInput.focus();
                return;
            }
        } else {
            await userRef.set({ id: id, password: pw });
            alert(`🎉 신규 피드백커 계정이 활성화되었습니다!`);
        }

        currentUser = { id: id, password: pw };
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        
        closeLoginModal();
        updateAuthUI();
        renderSpeeches();

    } catch (error) {
        console.error("로그인 연동 장애 발생:", error);
        alert("네트워크 연결을 확인해 주세요.");
    }
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
    const modal = document.getElementById('registerModal');
    if (modal) {
        modal.style.display = 'flex'; 
    } else {
        alert("HTML 에러: 'registerModal' ID를 가진 태그를 찾을 수 없습니다.");
    }
}

function closeModal() { 
    const modal = document.getElementById('registerModal');
    if (modal) modal.style.display = 'none'; 
}

function toggleAuthFields() {
    const authTypeEl = document.getElementById('regAuthType');
    const quizFields = document.getElementById('authQuizFields');
    const passwordFields = document.getElementById('authPasswordFields');
    if (!authTypeEl || !quizFields || !passwordFields) return;

    const authType = authTypeEl.value;
    quizFields.style.display = (authType === 'quiz') ? 'flex' : 'none';
    passwordFields.style.display = (authType === 'password') ? 'flex' : 'none';
}

// 🔥 에러 방어형으로 전면 리팩토링된 등록 엔진
function submitSpeech() {
    try {
        const elements = {
            title: document.getElementById('regTitle'),
            speaker: document.getElementById('regSpeaker'),
            location: document.getElementById('regLocation'),
            dateTime: document.getElementById('regDateTime'),
            content: document.getElementById('regContent'),
            authType: document.getElementById('regAuthType'),
            presenterNote: document.getElementById('regPresenterNote')
        };

        // 🔍 HTML에 ID 오타가 있는지 검사하는 안전 장치
        for (const [key, el] of Object.entries(elements)) {
            if (!el) {
                alert(`HTML 에러: 'reg${key.charAt(0).toUpperCase() + key.slice(1)}' ID를 가진 입력창이 없습니다. HTML을 확인해 주세요.`);
                return;
            }
        }

        const title = elements.title.value.trim();
        const speaker = elements.speaker.value.trim();
        const location = elements.location.value.trim();
        const dateTime = elements.dateTime.value;
        const content = elements.content.value.trim();
        const authType = elements.authType.value;
        const presenterNote = elements.presenterNote.value.trim();

        if (!title || !speaker || !location || !dateTime || !content) {
            alert('발표 핵심 기본 명세를 전부 채워주셔야 무대 배포가 가능합니다!');
            return;
        }

        let authData = { authType: authType };
        if (authType === 'quiz') {
            const youtube = document.getElementById('regYoutube')?.value.trim();
            const question = document.getElementById('regQuizQuestion')?.value.trim();
            const answer = document.getElementById('regQuizAnswer')?.value.trim();
            if (!youtube || !question || !answer) {
                alert('영상 인증 데이터 항목을 충실히 채워주십시오.');
                return;
            }
            authData.youtube = youtube;
            authData.quizQuestion = question;
            authData.quizAnswer = answer;
        } else if (authType === 'password') {
            const password = document.getElementById('regPassword')?.value.trim();
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

        db.collection('speeches').add(newSpeech)
        .then(() => {
            closeModal();
            resetModalInputs();
        })
        .catch(err => alert("클라우드 전송 실패: " + err));

    } catch (e) {
        console.error("등록 로직 크래시:", e);
        alert("입력창 로드 중 에러가 발생했습니다. 개발자 도구 콘솔을 확인하세요.");
    }
}

function resetModalInputs() {
    const fields = ['regTitle', 'regSpeaker', 'regLocation', 'regDateTime', 'regContent', 'regPresenterNote', 'regYoutube', 'regQuizQuestion', 'regQuizAnswer', 'regPassword'];
    fields.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    const authType = document.getElementById('regAuthType');
    if (authType) authType.value = 'none';
    toggleAuthFields();
}

// =========================================================================
// [실시간 리랜더링 및 위임 이벤트 바인딩]
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

        let deleteBtnHtml = '';
        if (currentUser && speech.owner === currentUser.id) {
            deleteBtnHtml = `
                <button class="btn-delete dynamic-delete" data-firestore-id="${speech.firestoreId}" data-numeric-id="${speech.id}" style="position:absolute; top:15px; right:15px;" title="이 발표 세션 영구 삭제">
                    🗑️
                </button>`;
        }

        let actionButton = '';
        if (currentUser && speech.owner === currentUser.id) {
            actionButton = `
                <button class="btn-action-style dynamic-action" data-url="FK_DashBoard.html?id=${speech.id}" style="background-color:#10b981; color:white;">
                    📊 실시간 대시보드 리포트 열기
                </button>`;
        } else {
            actionButton = `
                <button class="btn-action-style dynamic-action" data-url="FK_GiveFeedback.html?id=${speech.id}" style="background-color:#111827; color:white;">
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

//머지 및 딜리트 기법
function deleteSpeech(firestoreId, numericId) {
    if (!confirm("발표를 영구 삭제하시겠습니까?\n이 발표 세션에 청중들이 기록한 피드백 보고서 정보 데이터도 함께 클라우드에서 말소 처리됩니다.")) return;
    
    db.collection('speeches').doc(firestoreId).delete()
    .then(() => {
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

// =========================================================================
// [프로 개발자 규격: 중앙 집중형 이벤트 청취 통제소]
// =========================================================================
window.addEventListener('DOMContentLoaded', () => {
    updateAuthUI();
    initRealtimeSync();

    // 1. 고정 엘리먼트 정적 바인딩 파트
    document.getElementById('logoHeader')?.addEventListener('click', () => window.location.reload());
    document.getElementById('navHome')?.addEventListener('click', () => GoToPage('FK.html'));
    document.getElementById('navRegister')?.addEventListener('click', checkLoginAndRegister);
    document.getElementById('navIntroduce')?.addEventListener('click', () => GoToPage('FK_introduce.html'));
    document.getElementById('navMyPage')?.addEventListener('click', () => GoToPage('FK_MyPage.html'));
    document.getElementById('btnLogin')?.addEventListener('click', promptLogin);
    document.getElementById('btnLogout')?.addEventListener('click', logout);
    document.getElementById('btnSearch')?.addEventListener('click', searchSpeeches);
    document.getElementById('btnReset')?.addEventListener('click', resetSearch);
    document.getElementById('btnSubmitSpeech')?.addEventListener('click', submitSpeech);
    document.getElementById('btnCloseModal')?.addEventListener('click', closeModal);
    document.getElementById('regAuthType')?.addEventListener('change', toggleAuthFields);
    document.getElementById('btnSubmitLogin')?.addEventListener('click', handleLoginSubmit);

    // 2. 동적 엘리먼트 위임(Delegation) 감시 파트
    document.getElementById('spechesContainer')?.addEventListener('click', (e) => {
        const deleteTarget = e.target.closest('.dynamic-delete');
        if (deleteTarget) {
            const fId = deleteTarget.getAttribute('data-firestore-id');
            const nId = deleteTarget.getAttribute('data-numeric-id');
            deleteSpeech(fId, nId);
            return;
        }

        const actionTarget = e.target.closest('.dynamic-action');
        if (actionTarget) {
            const targetUrl = actionTarget.getAttribute('data-url');
            GoToPage(targetUrl);
        }
    });
});

// 🔥 [중요] HTML 상의 inline onclick/onchange 격리 버그 전면 차단 방어막
window.closeLoginModal = closeLoginModal;
window.closeModal = closeModal;
window.checkLoginAndRegister = checkLoginAndRegister;
window.submitSpeech = submitSpeech;
window.toggleAuthFields = toggleAuthFields;