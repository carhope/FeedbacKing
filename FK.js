const loginBth = document.querySelector('.login-bth');
function isLogin(){
    window.location.href='../html/FK_login.html'
};

function GoToPage(pageURL){
    window.location.href=pageURL;
}
// 발표 등록 영역+++++++++
// 1. 기존 만능 이동 함수 유지
function GoToPage(pageURL){
    window.location.href = pageURL;
}

// 2. 로컬스토리지에서 기존 발표 목록 가져오기 (없으면 빈 배열)
let speechList = JSON.parse(localStorage.getItem('speechList')) || [];

// 3. 발표 등록 모달 열기
function Register_Spech() {
    document.getElementById('registerModal').style.display = 'flex';
}

// 4. 모달 닫기
function closeModal() {
    document.getElementById('registerModal').style.display = 'none';
}

// 5. 게시하기 버튼 클릭 시 데이터 저장
function submitSpeech() {
    const title = document.getElementById('regTitle').value;
    const speaker = document.getElementById('regSpeaker').value;
    const location = document.getElementById('regLocation').value;
    const dateTime = document.getElementById('regDateTime').value;
    const content = document.getElementById('regContent').value;

    // 간단한 유효성 검사
    if (!title || !speaker || !location || !dateTime || !content) {
        alert('모든 항목을 입력해주세요!');
        return;
    }

    // [미래 대비] 검색과 피드백 매칭을 위해 고유 ID를 부여하여 객체(Object)화 합니다.
    const newSpeech = {
        id: Date.now(), // 타임스탬프를 이용한 고유 ID
        title: title,
        speaker: speaker,
        location: location,
        dateTime: dateTime,
        content: content
    };

    // 배열에 추가하고 로컬스토리지에 저장
    speechList.push(newSpeech);
    localStorage.setItem('speechList', JSON.stringify(speechList));

    // 화면 새로고침 없이 바로 광장에 반영하고 모달 닫기
    renderSpeeches();
    closeModal();

    // 다음 입력을 위해 양식 초기화
    document.getElementById('regTitle').value = '';
    document.getElementById('regSpeaker').value = '';
    document.getElementById('regLocation').value = '';
    document.getElementById('regDateTime').value = '';
    document.getElementById('regContent').value = '';
}

// 6. 광장(화면)에 발표 카드들을 뿌려주는 함수
function renderSpeeches() {
    const container = document.getElementById('spechesContainer');
    container.innerHTML = ''; // 기존에 그려진 카드들 초기화

    // 저장된 발표가 하나도 없을 때 보여줄 기본 카드
    if (speechList.length === 0) {
        container.innerHTML = `
            <div class="speches" style="text-align:center;">
                안녕하세요 차희망 연설자 입니다. 첫 발표를 등록해보세요!
            </div>`;
        return;
    }

    // 최신 글로벌 트렌드에 맞춰 최신글이 맨 위에 오도록 배열을 역순(reverse)으로 뿌립니다.
    const displayList = [...speechList].reverse();

    displayList.forEach(speech => {
        const card = document.createElement('div');
        card.className = 'speches';
        
        // 구조를 유지하되 깔끔하게 데이터를 바인딩합니다. 
        // 하단의 피드백하기 버튼은 주소창 뒤에 ?id=값 을 넘겨주어 추후 3단계 피드백 연동이 가능하게 설계했습니다.
        card.innerHTML = `
            <h3>${speech.title}</h3>
            <p style="margin: 4px 0; font-size: 14px; color: #6b7280;">
                <strong>발표자:</strong> ${speech.speaker}
            </p>
            <p style="margin: 4px 0; font-size: 14px; color: #6b7280;">
                <strong>장소:</strong> ${speech.location} | <strong>일시:</strong> ${speech.dateTime.replace('T', ' ')}
            </p>
            <p style="margin: 15px 0 0 0; color: #374151;">${speech.content}</p>
            <button onclick="GoToPage('FK_GiveFeedback.html?id=${speech.id}')" style="margin-top:15px; background-color:#111827; color:white; border:none; padding:8px 16px; border-radius:6px; cursor:pointer; font-weight:bold; font-size:12px;">
                피드백 참여
            </button>
        `;
        container.appendChild(card);
    });
}

// 7. 페이지가 처음 켜질 때 로컬스토리지 데이터를 자동으로 화면에 그려줌
window.onload = function() {
    renderSpeeches();
};
//발표 등록 -----------
