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
    
    // --- DOM 요소 캐싱 ---
    const dateDisplay = document.getElementById("date-display");
    const circleBar = document.getElementById('circle-bar');
    const pageLoader = document.getElementById('page-loader');
    const mainWrap = document.querySelector('.main-wrap');
    const videoCarousel = document.getElementById('video-carousel');
    const videoTrack = document.querySelector('.video-track');
    
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

    // --- PNG 시퀀스 관련 전역 변수 및 상수 ---
    const cards = []; 
    let isTransitioning = false;
    let currentTrackX = 0;
    
    const TOTAL_MONTHS = 12;
    const FRAME_COUNT = 150;
    const TARGET_FPS = 30;
    const FRAME_INTERVAL = 1000 / TARGET_FPS;

    const FOLDER_PATH = 'assets/videos/';
    const PAUSE_FRAME = 75;

    let animationController = {
        isAnimating: false,
        animationFrameId: null,
        loopingFrame: PAUSE_FRAME,
        lastFrameTime: 0,
    };
    
    const imageCache = {};
    let totalImagesToLoad = TOTAL_MONTHS * FRAME_COUNT;
    let imagesLoaded = 0;

    const JOKBO_RANKS = {
        "보너스": { rank: 0, name: "보너스 승리" }, "알리": { rank: 1, name: "알리" }, "독사": { rank: 2, name: "독사" },
        "구삥": { rank: 3, name: "구삥" }, "장삥": { rank: 4, name: "장삥" }, "장사": { rank: 5, name: "장사" }, "세륙": { rank: 6, name: "세륙" },
        "암행어사": { rank: 100, name: "암행어사" },
    };
    const BONUS_CARDS_POOL = [
        { id: 'bonus1', name: '오광' }, { id: 'bonus2', name: '비광' }, { id: 'bonus3', name: '홍단' },
        { id: 'bonus4', name: '청단' }, { id: 'bonus5', name: '초단' }
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
      
      initializePopupAndGame();

      if (dateDisplay) {
        const formattedDate = `${todayYear} • ${todayMonth} • ${todayDate}`;
        dateDisplay.textContent = formattedDate;
      }
      initCarousel();
      initCircleBar();
      updateCalendarDays(currentYear, currentMonth, false);
      updateCircleActive(currentMonth);

      preloadAllImages();
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
            if (isTransitioning || touchEndX === 0) return;
            const swipeDistance = touchStartX - touchEndX;
            const swipeThreshold = 50;
            if (swipeDistance > swipeThreshold) {
                goToMonth((currentMonth % TOTAL_MONTHS) + 1);
            } else if (swipeDistance < -swipeThreshold) {
                goToMonth((currentMonth - 2 + TOTAL_MONTHS) % TOTAL_MONTHS + 1);
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
                if (i !== currentMonth && !isTransitioning) goToMonth(i);
            };
            circleBar.appendChild(btn);
        }
    }

    function formatFrame(frame) {
        return String(frame).padStart(6, '0');
    }
    
    function preloadAllImages() {
        console.log("모든 이미지 미리 로딩을 시작합니다...");
        for (let month = 1; month <= TOTAL_MONTHS; month++) {
            imageCache[month] = [];
            for (let i = 0; i < FRAME_COUNT; i++) {
                const img = new Image();
                img.src = `${FOLDER_PATH}${month}/${formatFrame(i)}.png`;
                img.onload = () => {
                    imagesLoaded++;
                    if (imagesLoaded === totalImagesToLoad) {
                        console.log("모든 이미지 로딩 완료!");
                        if(pageLoader) pageLoader.classList.add('hidden');
                        if(mainWrap) mainWrap.classList.add('loaded');
                    }
                };
                imageCache[month].push(img);
            }
        }
    }

    function initCarousel() {
        if (!videoTrack) return;

        for (let i = 1; i <= TOTAL_MONTHS; i++) {
            const card = document.createElement('div');
            card.className = 'video-card';
            card.dataset.month = i;

            const canvas = document.createElement('canvas');
            canvas.width = 500; 
            canvas.height = 500;
            
            card.appendChild(canvas);
            videoTrack.appendChild(card);
            cards.push(card);
        }

        recenterCarousel(currentMonth); // 초기 위치 설정
        startAnimationLoop();
        updateCircleActive(currentMonth);
        updateCalendarDays(currentYear, currentMonth, false);
    }
    
    // [최종 수정] 애니메이션 루프 로직 단순화
    function startAnimationLoop() {
        if (animationController.isAnimating) return;
        animationController.isAnimating = true;

        const animate = (timestamp) => {
            animationController.animationFrameId = requestAnimationFrame(animate);

            // FPS 제어
            const deltaTime = timestamp - animationController.lastFrameTime;
            if (deltaTime < FRAME_INTERVAL) return;
            animationController.lastFrameTime = timestamp - (deltaTime % FRAME_INTERVAL);

            // 루프 프레임 업데이트
            animationController.loopingFrame = (animationController.loopingFrame + 1) % FRAME_COUNT;
            const loopFrameIndex = Math.floor(animationController.loopingFrame);

            // 모든 카드를 순회하며 상태에 맞게 프레임 그리기
            cards.forEach((card, index) => {
                const month = index + 1;
                const canvas = card.querySelector('canvas');
                const ctx = canvas.getContext('2d');
                const images = imageCache[month];

                if (!images || images.length === 0) return;

                let frameToDraw;
                
                // [수정된 핵심 로직]
                // 현재 월과 일치하는 카드만 루프하고, 나머지는 무조건 PAUSE_FRAME
                if (month === currentMonth) {
                    frameToDraw = loopFrameIndex;
                } else {
                    frameToDraw = PAUSE_FRAME;
                }

                const safeFrameIndex = Math.max(0, Math.min(frameToDraw, FRAME_COUNT - 1));
                const imageToDraw = images[safeFrameIndex];

                if (imageToDraw && imageToDraw.complete) {
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    ctx.drawImage(imageToDraw, 0, 0, canvas.width, canvas.height);
                }
            });
        };
        animationController.animationFrameId = requestAnimationFrame(animate);
    }

    function goToMonth(targetMonth, withAnimation = true) {
        currentMonth = targetMonth;

        if (withAnimation) {
            animateTo(targetMonth);
        } else {
            recenterCarousel(targetMonth);
        }
        updateCircleActive(targetMonth);
        updateCalendarDays(currentYear, targetMonth, true);
    }
    
    const ease = (t) => 1 - Math.pow(1 - t, 4);
    function animateTo(targetMonth) {
        if (isTransitioning) return;
        isTransitioning = true;
        
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
                cards.forEach(card => {
                    const rect = card.getBoundingClientRect();
                    const proximity = Math.min(Math.abs((window.innerWidth / 2) - (rect.left + rect.width / 2)) / (rect.width * 1.2), 1);
                    const translateY = proximity * 15;
                    card.style.transform = `translateY(${translateY}%)`;
                });
            }

            if (progress < 1) {
                requestAnimationFrame(animationLoop);
            } else {
                isTransitioning = false;
            }
        }
        requestAnimationFrame(animationLoop);
    }
    
    function calculateTargetX(targetMonth) {
        const targetCard = cards[targetMonth - 1];
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
            cards.forEach((card, index) => {
                card.style.transform = (index + 1) === targetMonth ? 'translateY(0%)' : 'translateY(15%)';
            });
        } else {
            cards.forEach(card => card.style.transform = 'none');
        }
    }
    
    // --- 달력 및 게임 관련 함수들 (수정 없음) ---
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

    function checkConsecutiveLogin() {
        const todayStr = new Date().toISOString().split('T')[0];
        if (playerData.lastVisitDate === todayStr) return;

        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];
        playerData.consecutiveDays = (playerData.lastVisitDate === yesterdayStr) ? (playerData.consecutiveDays || 0) + 1 : 1;
        
        if (playerData.consecutiveDays >= 7) {
            const randomIndex = Math.floor(Math.random() * BONUS_CARDS_POOL.length);
            const awardedCard = BONUS_CARDS_POOL[randomIndex];
            playerData.bonusCards.push(awardedCard);
            playerData.consecutiveDays = 0;
        }
        
        playerData.lastVisitDate = todayStr;
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
        
        const todayStr = new Date().toISOString().split('T')[0];
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