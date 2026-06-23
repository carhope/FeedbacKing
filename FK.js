// ==========================================
// 1. 전역 데이터 초기화 (중복 선언 해결)
// ==========================================
let speechList = JSON.parse(localStorage.getItem('speechList')) || [];
let currentUser = JSON.parse(localStorage.getItem('currentUser')) || null;

function GoToPage(pageURL){ 
    window.location.href = pageURL; 
}

// ==========================================
// 2. [신규] 간이 인증(로그인) 시스템
// ==========================================
function promptLogin() {
    const id = prompt("아이디를 입력하세요 (별도 가입 없이 즉시 생성됨)");
    if (!id) return;
    const pw = prompt("비밀번호를 입력하세요");
    if (!pw) return;

    currentUser = { id: id.trim(), password: pw.trim() };
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
    alert(`환영합니다, ${currentUser.id}님!`);
    updateAuthUI();
    renderSpeeches();
}

function logout() {
    localStorage.removeItem('currentUser');
    currentUser = null;
    alert('로그아웃 되었습니다.');
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
        alert("발표를 등록하려면 먼저 로그인해 주세요!");
        promptLogin();
        return;
    }
    Register_Spech();
}

// ==========================================
// 3. 모달 열기 / 닫기 / 인증필드 제어
// ==========================================
function Register_Spech() { 
    document.getElementById('registerModal').style.display = 'flex'; 
}

function closeModal() { 
    document.getElementById('registerModal').style.display = 'none'; 
}

function toggleAuthFields() {
    const authType = document.getElementById('regAuthType').value;
    const quizFields = document.getElementById('authQuizFields');
    const passwordFields = document.getElementById('authPasswordFields');

    if (authType === 'quiz') {
        quizFields.style.display = 'flex';
        passwordFields.style.display = 'none';
    } else if (authType === 'password') {
        quizFields.style.display = 'none';
        passwordFields.style.display = 'flex';
    } else {
        quizFields.style.display = 'none';
        passwordFields.style.display = 'none';
    }
}

// ==========================================
// 4. 발표 등록 및 소유권 주입 (submitSpeech)
// ==========================================
function submitSpeech() {
    const title = document.getElementById('regTitle').value.trim();
    const speaker = document.getElementById('regSpeaker').value.trim();
    const location = document.getElementById('regLocation').value.trim();
    const dateTime = document.getElementById('regDateTime').value;
    const content = document.getElementById('regContent').value.trim();
    const authType = document.getElementById('regAuthType').value;

    if (!title || !speaker || !location || !dateTime || !content) {
        alert('기본 발표 정보를 모두 입력해주세요!');
        return;
    }

    let authData = { authType: authType };
    if (authType === 'quiz') {
        const youtube = document.getElementById('regYoutube').value.trim();
        const question = document.getElementById('regQuizQuestion').value.trim();
        const answer = document.getElementById('regQuizAnswer').value.trim();
        if (!youtube || !question || !answer) {
            alert('영상 퀴즈 인증에 필요한 모든 항목을 입력해주세요!');
            return;
        }
        authData.youtube = youtube;
        authData.quizQuestion = question;
        authData.quizAnswer = answer;
    } else if (authType === 'password') {
        const password = document.getElementById('regPassword').value.trim();
        if (!password) {
            alert('입장 암호를 입력해주세요!');
            return;
        }
        authData.password = password;
    }

    // 요구사항 1: 등록 시 owner 정보 결합
    const newSpeech = { 
        id: Date.now(), 
        owner: currentUser ? currentUser.id : 'anonymous',
        title, 
        speaker, 
        location, 
        dateTime, 
        content, 
        ...authData 
    };

    speechList.push(newSpeech);
    localStorage.setItem('speechList', JSON.stringify(speechList));

    renderSpeeches();
    closeModal();
    resetModalInputs();
}

function resetModalInputs() {
    document.getElementById('regTitle').value = '';
    document.getElementById('regSpeaker').value = '';
    document.getElementById('regLocation').value = '';
    document.getElementById('regDateTime').value = '';
    document.getElementById('regContent').value = '';
    document.getElementById('regAuthType').value = 'none';
    document.getElementById('regYoutube').value = '';
    document.getElementById('regQuizQuestion').value = '';
    document.getElementById('regQuizAnswer').value = '';
    document.getElementById('regPassword').value = '';
    toggleAuthFields();
}

// ==========================================
// 5. 광장 리스트 렌더러 (요구사항 2 동적 분기 반영)
// ==========================================
function renderSpeeches(list = speechList) {
    const container = document.getElementById('spechesContainer');
    if(!container) return;
    container.innerHTML = ''; 
    if (list.length === 0) {
        container.innerHTML = `<div class="speches" style="text-align:center; color:#9ca3af;">등록된 발표가 없습니다.</div>`;
        return;
    }
    [...list].reverse().forEach(speech => {
        const card = document.createElement('div');
        card.className = 'speches';
        
        let badge = "🔓 자유 참여";
        if(speech.authType === 'quiz') badge = "📺 영상 퀴즈";
        if(speech.authType === 'password') badge = "🔒 현장 암호";

        // 요구사항 2: 내가 만든 발표글이면 대시보드로, 남의 발표글이면 참여로 분기
        let actionButton = '';
        if (currentUser && speech.owner === currentUser.id) {
            actionButton = `
                <button onclick="GoToPage('FK_Dashboard.html?id=${speech.id}')" style="margin-top:15px; background-color:#10b981; color:white; border:none; padding:8px 16px; border-radius:6px; cursor:pointer; font-weight:bold; font-size:12px;">
                    📊 피드백 결과 조회
                </button>`;
        } else {
            actionButton = `
                <button onclick="GoToPage('FK_GiveFeedback.html?id=${speech.id}')" style="margin-top:15px; background-color:#111827; color:white; border:none; padding:8px 16px; border-radius:6px; cursor:pointer; font-weight:bold; font-size:12px; transition:0.2s;" onmouseover="this.style.backgroundColor='#10b981'" onmouseout="this.style.backgroundColor='#111827'">
                    피드백 참여
                </button>`;
        }

        card.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                <h3 style="margin:0;">${speech.title}</h3>
                <span style="font-size:11px; padding:4px 8px; background:#f3f4f6; border-radius:12px; color:#4b5563; font-weight:bold;">${badge}</span>
            </div>
            <p style="margin: 4px 0; font-size: 14px; color: #6b7280;"><strong>발표자:</strong> ${speech.speaker}</p>
            <p style="margin: 4px 0; font-size: 14px; color: #6b7280;"><strong>장소:</strong> ${speech.location} | <strong>일시:</strong> ${speech.dateTime.replace('T', ' ')}</p>
            <p style="margin: 15px 0 0 0; color: #374151;">${speech.content}</p>
            ${actionButton}
        `;
        container.appendChild(card);
    });
}

// ==========================================
// 6. 검색 및 필터링 기능
// ==========================================
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
    renderSpeeches(); 
};