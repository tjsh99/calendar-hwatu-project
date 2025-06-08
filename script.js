document.addEventListener('DOMContentLoaded', () => {

    const publicHolidays2025 = [
        "1-1", "1-27", "1-28", "1-29", "1-30", "3-1", "3-3", "5-5", 
        "5-6", "6-3", "6-6", "8-15", "10-3", "10-5", "10-6", "10-7", 
        "10-8", "10-9", "12-25"
    ];

    const today = new Date();
    const todayYear = today.getFullYear();
    const todayMonth = today.getMonth() + 1;
    const todayDate = today.getDate();
    let currentYear = todayYear;
    let currentMonth = todayMonth;
    let previousDayCount = 0;

    // --- DOM 요소 캐싱 ---
    const dateDisplay = document.getElementById("date-display");
    const circleBar = document.getElementById('circle-bar');
    const pageLoader = document.getElementById('page-loader');
    const mainWrap = document.querySelector('.main-wrap');
    const videoCarousel = document.getElementById('video-carousel');
    const videoTrack = document.querySelector('.video-track');
    
    // 팝업 & 게임 관련
    const popupOverlay = document.getElementById("popup-overlay");
    const closeBtn = document.getElementById("close-popup-btn");
    const gameInitialScreen = document.getElementById('game-initial-screen');
    const gameResultScreen = document.getElementById('game-result-screen');
    const playerHandDisplay = document.getElementById('player-hand-display');
    const playerJokboText = document.getElementById('player-jokbo-text');
    const showdownBtn = document.getElementById('showdown-btn');
    const resultText = document.getElementById('result-text');
    const playerResultHand = document.getElementById('player-result-hand');
    const computerResultHand = document.getElementById('computer-result-hand');
    const playerResultJokbo = document.getElementById('player-result-jokbo');
    const computerResultJokbo = document.getElementById('computer-result-jokbo');
    const playAgainBtn = document.getElementById('play-again-btn');
    const useBonusBtn = document.getElementById('use-bonus-btn');
    const dontShowCheckbox = document.getElementById('dont-show-checkbox');
    const bonusTooltipContent = document.getElementById('bonus-tooltip-content');


    // --- 전역 변수 및 상수 ---
    const videoCards = [];
    const videoElements = [];
    let isVideoTransitioning = false;
    let isAutoplayUnlocked = false;
    const TOTAL_VIDEOS = 12;
    const FRAME_RATE = 30;
    const SAFE_ZONE_START_TIME = 31 / FRAME_RATE;
    const PAUSE_TIME = 75 / FRAME_RATE;
    let currentTrackX = 0;

    const JOKBO_RANKS = {
        "보너스": { rank: 0, name: "보너스 승리" },
        "알리": { rank: 1, name: "알리" }, "독사": { rank: 2, name: "독사" },
        "구삥": { rank: 3, name: "구삥" }, "장삥": { rank: 4, name: "장삥" },
        "장사": { rank: 5, name: "장사" }, "세륙": { rank: 6, name: "세륙" },
        "암행어사": { rank: 100, name: "암행어사" },
    };

    const BONUS_CARDS_POOL = [
        { id: 'bonus1', name: '오광' },
        { id: 'bonus2', name: '비광' },
        { id: 'bonus3', name: '홍단' },
        { id: 'bonus4', name: '청단' },
        { id: 'bonus5', name: '초단' }
    ];

    let playerData = {};
    let todaysPlayerCards = [];

    // --- 이벤트 리스너 ---
    window.addEventListener('load', () => {
      document.body.style.backgroundImage = 'url("assets/images/background.png")';
      document.body.style.backgroundSize = 'cover';
      document.body.style.backgroundPosition = 'center';
      document.body.style.backgroundRepeat = 'no-repeat';
      document.body.style.backgroundAttachment = 'fixed';
      if(pageLoader) pageLoader.classList.add('hidden');
      if(mainWrap) mainWrap.classList.add('loaded');
      
      initializePopupAndGame();

      if (dateDisplay) {
        const formattedDate = `${todayYear} • ${todayMonth} • ${todayDate}`;
        dateDisplay.textContent = formattedDate;
      }
      initCarousel();
      initCircleBar();
      updateCalendarDays(currentYear, currentMonth, false);
      updateCircleActive(currentMonth);
    });
    
    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => { recenterCarousel(currentMonth); }, 100);
    });

    let touchStartX = 0;
    let touchEndX = 0;
    if (videoCarousel) {
        videoCarousel.addEventListener('touchstart', (e) => { touchStartX = e.touches[0].clientX; }, { passive: true });
        videoCarousel.addEventListener('touchmove', (e) => { touchEndX = e.touches[0].clientX; }, { passive: true });
        videoCarousel.addEventListener('touchend', () => {
            if (isVideoTransitioning || touchEndX === 0) return;
            const swipeDistance = touchStartX - touchEndX;
            const swipeThreshold = 50;
            if (swipeDistance > swipeThreshold) {
                goToMonth((currentMonth % TOTAL_VIDEOS) + 1);
            } else if (swipeDistance < -swipeThreshold) {
                goToMonth((currentMonth - 2 + TOTAL_VIDEOS) % TOTAL_VIDEOS + 1);
            }
            touchStartX = 0; touchEndX = 0;
        });
    }
    
    // --- 함수 정의 ---
    
    function initCircleBar() {
        if (!circleBar) return;
        for (let i = 1; i <= 12; i++) {
            const btn = document.createElement('button');
            btn.className = 'circle';
            btn.dataset.month = i;
            btn.onclick = () => {
                if (i !== currentMonth && !isVideoTransitioning) goToMonth(i);
            };
            circleBar.appendChild(btn);
        }
    }

    function initCarousel() {
      if (!videoTrack) return;
        for (let i = 1; i <= 12; i++) {
            const card = document.createElement('div'); card.className = 'video-card'; card.dataset.month = i;
            const video = document.createElement('video');
            video.src = `assets/videos/${i}.mp4`; // 이제 모든 사용자가 mp4만 봅니다.
            video.setAttribute('muted', ''); video.setAttribute('playsinline', ''); video.setAttribute('loop', ''); video.setAttribute('preload', 'metadata');
            video.addEventListener('loadedmetadata', () => { video.currentTime = PAUSE_TIME; });
            
            card.appendChild(video); 
            videoTrack.appendChild(card); 
            videoCards.push(card);
            videoElements.push(video);
        }
        goToMonth(currentMonth, false);
    }


    function playVideo(video) {
        if (!video) return;
        video.muted = true;
        video.currentTime = PAUSE_TIME;
        
        const playPromise = video.play();

        if (playPromise !== undefined) {
            playPromise.catch(error => {
                console.error("Video autoplay was prevented:", error);
                
                if (!window.isAutoplayUnlocked) { 
                    const unlockAutoplay = () => {
                        console.log("Autoplay unlocked by user interaction.");
                        window.isAutoplayUnlocked = true;
                        
                        const currentVideo = videoElements[currentMonth - 1];
                        if (currentVideo && currentVideo.paused) {
                            currentVideo.play();
                        }
                        document.removeEventListener('click', unlockAutoplay);
                        document.removeEventListener('touchend', unlockAutoplay);
                        document.removeEventListener('keydown', unlockAutoplay);
                    };
                    
                    document.addEventListener('click', unlockAutoplay, { once: true });
                    document.addEventListener('touchend', unlockAutoplay, { once:true });
                    document.addEventListener('keydown', unlockAutoplay, { once: true });
                }
            });
        }
    }

    const ease = (t) => 1 - Math.pow(1 - t, 4);

    function animateTo(targetMonth) {
        if (isVideoTransitioning) return;
        isVideoTransitioning = true;
        const startX = currentTrackX;
        const endX = calculateTargetX(targetMonth);
        const duration = 1000;
        let startTime = null;
        function animationLoop(currentTime) {
            if (!startTime) startTime = currentTime;
            const elapsedTime = currentTime - startTime;
            const progress = Math.min(elapsedTime / duration, 1);
            const easedProgress = ease(progress);
            currentTrackX = startX + (endX - startX) * easedProgress;
            videoTrack.style.transform = `translateX(${currentTrackX}px)`;
            if (window.innerWidth > 768) {
                const viewportCenter = window.innerWidth / 2;
                videoCards.forEach(card => {
                    const rect = card.getBoundingClientRect();
                    const cardCenter = rect.left + rect.width / 2;
                    const proximity = Math.min(Math.abs(viewportCenter - cardCenter) / (rect.width * 1.2), 1);
                    const translateY = proximity * 15;
                    card.style.transform = `translateY(${translateY}%)`;
                });
            }
            if (progress < 1) {
                requestAnimationFrame(animationLoop);
            } else {
                isVideoTransitioning = false;
            }
        }
        requestAnimationFrame(animationLoop);
    }
    
    function goToMonth(targetMonth, withAnimation = true) {
        const oldMonth = currentMonth;
        currentMonth = targetMonth;
        const oldVideo = videoElements[oldMonth - 1];
        const newVideo = videoElements[targetMonth - 1];
        if (oldVideo && newVideo && oldMonth !== targetMonth) {
            handleOldVideoPausing(oldVideo);
            playVideo(newVideo);
        } else if (newVideo) {
            playVideo(newVideo);
        }
        if (withAnimation) {
            animateTo(targetMonth);
        } else {
            recenterCarousel(targetMonth);
        }
        updateCircleActive(targetMonth);
        if (oldMonth !== targetMonth) {
            previousDayCount = getDaysInMonth(currentYear, oldMonth);
            updateCalendarDays(currentYear, targetMonth, true);
        }
    }

    function calculateTargetX(targetMonth) {
        const targetCard = videoCards[targetMonth - 1];
        if (!targetCard) return 0;
        const cardWidth = targetCard.offsetWidth;
        const cardMargin = parseFloat(getComputedStyle(targetCard).marginRight);
        const totalCardWidth = cardWidth + cardMargin * 2;
        return (window.innerWidth / 2) - (totalCardWidth / 2) - ((targetMonth - 1) * totalCardWidth);
    }
    
    function recenterCarousel(targetMonth) {
        currentTrackX = calculateTargetX(targetMonth);
        videoTrack.style.transform = `translateX(${currentTrackX}px)`;
        if (window.innerWidth > 768) {
            videoCards.forEach((card, index) => {
                card.style.transform = (index + 1) === targetMonth ? 'translateY(0%)' : 'translateY(15%)';
            });
        } else {
            videoCards.forEach(card => card.style.transform = 'none');
        }
    }

    function handleOldVideoPausing(video) {
        if (!video || !video.duration) return;
        const currentTime = video.currentTime; const duration = video.duration;
        if (currentTime >= SAFE_ZONE_START_TIME && currentTime <= duration - SAFE_ZONE_START_TIME) {
            video.pause();
        } else {
            let checkTimeInterval;
            const check = () => {
                if (video.currentTime >= SAFE_ZONE_START_TIME || video.paused) {
                    video.pause(); cancelAnimationFrame(checkTimeInterval);
                } else {
                    checkTimeInterval = requestAnimationFrame(check);
                }
            };
            checkTimeInterval = requestAnimationFrame(check);
        }
    }
    
    function updateCircleActive(month) {
        if (!circleBar) return;
        for (let i = 0; i < circleBar.children.length; i++) {
            circleBar.children[i].classList.toggle('active', i === month - 1);
        }
    }
    
    function getDaysInMonth(year, month) { return new Date(year, month, 0).getDate(); }
    
    function updateCalendarDays(year, month, withAnimation = false) {
      const calendarDates = document.getElementById('calendar-dates');
      if (!calendarDates) return;
      if (calendarDates.children.length === 0) {
        for (let i = 1; i <= 31; i++) { const day = document.createElement('div'); day.className = 'day'; day.textContent = i; calendarDates.appendChild(day); }
      }
      const daysInMonth = getDaysInMonth(year, month);
      for (let i = 0; i < 31; i++) {
        const dayEl = calendarDates.children[i]; if (!dayEl) continue;
        const isVisibleNow = i < daysInMonth;
        dayEl.classList.toggle('hidden', !isVisibleNow);
      }
      applyDayColors(year, month);
      highlightToday(year, month);
    }
    
    function applyDayColors(year, month) {
      const days = document.querySelectorAll('#calendar-dates .day:not(.hidden)');
      days.forEach((dayElem) => {
        const dayNumber = parseInt(dayElem.textContent, 10);
        dayElem.classList.remove('sunday', 'saturday');
        const date = new Date(year, month - 1, dayNumber);
        const dateString = `${month}-${dayNumber}`;
        const isSunday = date.getDay() === 0;
        const isHoliday = publicHolidays2025.includes(dateString);
        if (isSunday || isHoliday) {
          dayElem.classList.add('sunday');
        } else if (date.getDay() === 6) {
          dayElem.classList.add('saturday');
        }
      });
    }
    
    function highlightToday(displayedYear, displayedMonth) {
      const days = document.querySelectorAll('#calendar-dates .day');
      days.forEach((dayElem) => {
        const dayNumber = parseInt(dayElem.textContent, 10);
        const isToday = (displayedYear === todayYear && displayedMonth === todayMonth && dayNumber === todayDate);
        dayElem.classList.toggle('today', isToday);
      });
    }
    
    function initializePopupAndGame() {
        if (!popupOverlay) return;
        loadGameData();
        updateBonusTooltip();
        
        const todayStr = new Date().toISOString().split('T')[0];
        const hideUntil = playerData.hidePopupUntil ? new Date(playerData.hidePopupUntil) : null;
        if (hideUntil && hideUntil > new Date()) {
            return;
        }

        setTimeout(() => { popupOverlay.classList.add("show"); }, 2000);
        startNewGame();
        
        playAgainBtn?.addEventListener('click', rematch);
        closeBtn?.addEventListener('click', hidePopup);
        useBonusBtn?.addEventListener('click', useBonusCard);
    }

    function hidePopup() {
        if (dontShowCheckbox.checked) {
            const endOfToday = new Date();
            endOfToday.setHours(23, 59, 59, 999);
            playerData.hidePopupUntil = endOfToday.toISOString();
            saveGameData();
        }
        popupOverlay?.classList.remove('show');
    }

    function loadGameData() {
        const savedData = localStorage.getItem('suttaGameData');
        playerData = savedData ? JSON.parse(savedData) : {
            hidePopupUntil: null, lastVisitDate: null, consecutiveDays: 0, bonusCards: [], todaysHand: null
        };
        checkConsecutiveLogin();
    }

    // [최종 수정] 이 함수만 수정되었습니다.
    function checkConsecutiveLogin() {
        // 한국 시간(KST)을 기준으로 YYYY-MM-DD 형식의 날짜 문자열 생성
        // 'sv-SE' 로캘은 'YYYY-MM-DD' 형식을 안정적으로 반환합니다.
        const todayKST = new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Seoul' }).split(' ')[0];

        // 마지막 방문 날짜가 오늘과 같으면, 아무것도 하지 않고 함수 종료
        if (playerData.lastVisitDate === todayKST) return;

        // 어제 날짜도 한국 시간 기준으로 계산
        const today = new Date();
        const yesterday = new Date(today.getTime() - (24 * 60 * 60 * 1000)); // 24시간 전
        const yesterdayKST = yesterday.toLocaleString('sv-SE', { timeZone: 'Asia/Seoul' }).split(' ')[0];
        
        // 마지막 방문일이 어제와 같으면 연속일수 증가, 아니면 1로 초기화
        playerData.consecutiveDays = (playerData.lastVisitDate === yesterdayKST) ? (playerData.consecutiveDays || 0) + 1 : 1;
        
        // 7일 연속 출석 시 보너스 카드 지급
        if (playerData.consecutiveDays >= 7) {
            const randomIndex = Math.floor(Math.random() * BONUS_CARDS_POOL.length);
            const awardedCard = BONUS_CARDS_POOL[randomIndex];
            if (!playerData.bonusCards) playerData.bonusCards = []; // 혹시 bonusCards가 없을 경우 대비
            playerData.bonusCards.push(awardedCard);
            playerData.consecutiveDays = 0; // 7일 채우면 초기화
        }
        
        // 마지막 방문 날짜를 오늘(한국 기준)로 업데이트
        playerData.lastVisitDate = todayKST;
        saveGameData();
    }
    
    function saveGameData() {
        localStorage.setItem('suttaGameData', JSON.stringify(playerData));
    }

    function updateBonusTooltip() {
        if (!bonusTooltipContent) return;
        const days = playerData.consecutiveDays || 0;
        const remainingDays = 7 - days;
        
        let content = `<h4>🎁 보너스 현황</h4>`;
        content += `<p>현재 <span>${days}일</span> 연속 출석 중입니다. (${remainingDays}일 남음)</p>`;
        
        if (playerData.bonusCards && playerData.bonusCards.length > 0) {
            content += `<h4>보유 중인 보너스 패 (${playerData.bonusCards.length}개)</h4><ul>`;
            playerData.bonusCards.forEach(card => {
                content += `<li>${card.name}</li>`;
            });
            content += `</ul>`;
        } else {
            content += `<p>아직 획득한 보너스 패가 없습니다.</p>`;
        }
        bonusTooltipContent.innerHTML = content;
    }

    function dealPlayerHand() {
        const deck = Array.from({length: 12}, (_, i) => i + 1);
        for (let i = deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [deck[i], deck[j]] = [deck[j], deck[i]];
        }
        return [deck.pop(), deck.pop()].sort((a,b) => a-b);
    }

    function dealComputerHand(playerHand) {
        let deck = Array.from({length: 12}, (_, i) => i + 1);
        deck = deck.filter(card => !playerHand.includes(card) && typeof card === 'number');
        for (let i = deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [deck[i], deck[j]] = [deck[j], deck[i]];
        }
        return [deck.pop(), deck.pop()].sort((a,b) => a-b);
    }

    function getHandInfo(cards) {
        if (cards.some(card => typeof card === 'object')) return JOKBO_RANKS["보너스"];
        const [c1, c2] = cards;
        const key = `${c1}-${c2}`;
        if (key === "1-2") return JOKBO_RANKS["알리"]; if (key === "1-4") return JOKBO_RANKS["독사"];
        if (key === "1-9") return JOKBO_RANKS["구삥"]; if (key === "1-10") return JOKBO_RANKS["장삥"];
        if (key === "4-10") return JOKBO_RANKS["장사"]; if (key === "4-6") return JOKBO_RANKS["세륙"];
        if (key === "4-7") return JOKBO_RANKS["암행어사"];
        const kkeut = (c1 + c2) % 10;
        return { rank: 10 + (9 - kkeut), name: `${kkeut === 0 ? '망통' : kkeut + '끗'}` };
    }

    function compareHands(playerInfo, computerInfo) {
        if (playerInfo.rank === 0) return "win";
        if (playerInfo.name === "암행어사" && computerInfo.rank <= 4) return "win";
        if (computerInfo.name === "암행어사" && playerInfo.rank <= 4) return "lose";
        if (playerInfo.rank < computerInfo.rank) return "win";
        if (playerInfo.rank > computerInfo.rank) return "lose";
        return "draw";
    }

    function renderCards(container, cards) {
        if (!container) return;
        container.innerHTML = '';
        cards.forEach(card => {
            const cardDiv = document.createElement('div');
            cardDiv.className = 'card';
            const cardImage = typeof card === 'object' ? card.id : card;
            cardDiv.style.backgroundImage = `url('assets/images/cards/${cardImage}.png')`;
            container.appendChild(cardDiv);
        });
    }

    function startNewGame() {
        if (!gameInitialScreen) return;
        gameInitialScreen.classList.remove('hidden');
        gameResultScreen.classList.add('hidden');
        
        const todayStr = new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Seoul' }).split(' ')[0];
        if (playerData.todaysHand && playerData.todaysHand.date === todayStr) {
            todaysPlayerCards = playerData.todaysHand.cards;
        } else {
            todaysPlayerCards = dealPlayerHand();
            playerData.todaysHand = { date: todayStr, cards: todaysPlayerCards };
            saveGameData();
        }
        
        const playerInfo = getHandInfo(todaysPlayerCards);
        renderCards(playerHandDisplay, todaysPlayerCards);
        playerJokboText.textContent = `족보: ${playerInfo.name}`;
        
        showdownBtn.onclick = () => {
            const computerCards = dealComputerHand(todaysPlayerCards);
            showResult(todaysPlayerCards, computerCards);
        };
    }
    
    function rematch() {
        const computerCards = dealComputerHand(todaysPlayerCards);
        showResult(todaysPlayerCards, computerCards);
    }

    function showResult(playerCards, computerCards, bonusUsed = false) {
        if (!gameInitialScreen) return;
        gameInitialScreen.classList.add('hidden');
        gameResultScreen.classList.remove('hidden');
        
        const playerInfo = getHandInfo(playerCards);
        const computerInfo = getHandInfo(computerCards);
        const result = bonusUsed ? "win" : compareHands(playerInfo, computerInfo);

        resultText.classList.remove('win', 'lose', 'draw', 'bonus-win');

        if (bonusUsed) {
            resultText.textContent = "보너스 승리!";
            resultText.classList.add('bonus-win');
        } else if (result === "win") {
            resultText.textContent = "승리";
            resultText.classList.add('win');
        } else if (result === "lose") {
            resultText.textContent = "패배";
            resultText.classList.add('lose');
        } else {
            resultText.textContent = "무승부";
            resultText.classList.add('draw');
        }

        renderCards(playerResultHand, playerCards);
        playerResultJokbo.textContent = playerInfo.name;
        renderCards(computerResultHand, computerCards);
        computerResultJokbo.textContent = computerInfo.name;

        const hasBonus = playerData.bonusCards && playerData.bonusCards.length > 0;
        useBonusBtn.classList.toggle('hidden', !(result === 'lose' && hasBonus && !bonusUsed));
    }

    function useBonusCard() {
        if (!playerData.bonusCards || playerData.bonusCards.length === 0) return;

        const usedBonusCard = playerData.bonusCards.pop(); 
        saveGameData();
        updateBonusTooltip();
        
        const newPlayerCards = [...todaysPlayerCards];
        newPlayerCards[0] = usedBonusCard; 
        
        const computerCards = dealComputerHand(newPlayerCards); 
        
        showResult(newPlayerCards, computerCards, true);
    }
});