document.addEventListener('DOMContentLoaded', () => {

    // =============================
    // ===== 1. FIREBASE SETUP =====
    // =============================
    const firebaseConfig = {
        apiKey: "AIzaSyBUs0Gqhv0P1Up-vDz1HE9iFfaZr0bAEms",
        authDomain: "life-buddy-xok07.firebaseapp.com",
        projectId: "life-buddy-xok07",
        storageBucket: "life-buddy-xok07.firebasestorage.app",
        messagingSenderId: "243239137119",
        appId: "1:243239137119:web:2baf84c64caddf211ad0ea"
    };
    firebase.initializeApp(firebaseConfig);
    const auth = firebase.auth();
    const db = firebase.firestore();

    // =======================================
    // ===== 2. GLOBAL STATE & CONSTANTS =====
    // =======================================
    let currentUser = null;
    let state = {};
    const availableIcons = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14'];
    let currentlyEditingSubjectValue = null;
    let newSubjectIconNumber = '14';
    const defaultActivities = ["เขียนสิ่งที่ขอบคุณวันนี้ 3 อย่าง", "ยืดเส้น 3 นาที", "โทรหาเพื่อนคนหนึ่ง", "จดไอเดียเรื่องที่สนใจ", "จัดโต๊ะทำงาน"];
    const defaultAdvices = ["เหนื่อยได้ แต่อย่าลืมหายใจให้ลึก ๆ", "เก่งแล้วนะ ที่ยังอยู่ตรงนี้ได้", "ต้นไม้ไม่ได้โตในวันเดียว คนเราก็เช่นกัน", "ดื่มน้ำบ้างนะ วันนี้เธอทำดีแล้วล่ะ", "ใจล้า อย่าฝืน แต่ใจสู้ อย่าถอย"];
    const profilePictures = [ 'girl_01.png', 'girl_02.png', 'girl_03.png', 'girl_04.png', 'girl_05.png', 'boy_01.png', 'boy_02.png', 'boy_03.png', 'boy_04.png', 'boy_05.png', 'cat_01.png', 'cat_02.png', 'cat_03.png', 'dog_01.png', 'dog_02.png', 'dog_03.png' ];
    let tcasDatabase = [];
    let selectedMajor = null;

    const initialState = {
        coins: 50,
        coinHistory: [],
        wishList: { name: 'ของชิ้นต่อไป!', target: 1000 },
        lastBonusDate: null,
        lastCoinUsage: null,
        exp: 0,
        streak: 0,
        lastCheckIn: null,
        streakFreezesAvailable: 5,
        lastFreezeReset: null,
        isStreakFrozen: false,
        todos: [],
        planner: {},
        revisitTopics: {},
        subjects: [
            { value: 'physics', name: 'ฟิสิกส์', removable: false, color: '#0A84FF', icon: '1' }, 
            { value: 'chemistry', name: 'เคมี', removable: false, color: '#FF9F0A', icon: '2' }, 
            { value: 'biology', name: 'ชีววิทยา', removable: false, color: '#30D158', icon: '3' }, 
            { value: 'english', name: 'ภาษาอังกฤษ', removable: false, color: '#FF453A', icon: '4' },
            { value: 'social', name: 'สังคมศึกษา', removable: false, color: '#AF52DE', icon: '5' }
        ],
        moods: {},
        focus: { totalSessions: 0, todaySessions: 0, lastFocusDate: null, combo: 0 },
        focusHistory: [],
        badges: { },
        settings: { theme: 'light', focusDuration: 25, breakDuration: 5, showEmail: true },
        userActivities: [...defaultActivities],
        userAdvice: [...defaultAdvices],
        unlocks: {
            banners: ['banner_default']
        },
        shopItems: {
            banners: [
                 { id: 'GalaxyBanner.png', name: 'แบนเนอร์กาแล็กซี', price:250, image: 'assets/banner/GalaxyBanner.png' },
                { id: 'ForestBanner.png', name: 'แบนเนอร์ผืนป่า', price:250, image: 'assets/banner/ForestBanner.png' },
                { id: 'BeachBanner.png', name: 'แบนเนอร์ชายหาด', price: 250,image: 'assets/banner/BeachBanner.png' },
                { id: 'CyberpunkBanner.png', name: 'แบนเนอร์ไซเบอร์พังค์', price: 300 , image: 'assets/banner/CyberpunkBanner.png' },
                { id: 'CuteBanner.png', name: 'แบนเนอร์สุดคิวท์', price: 350 , image: 'assets/banner/CuteBanner.png' }
            ]
        },
        eventCategories: [
            { value: 'homework', name: 'การบ้าน', removable: false },
            { value: 'exam', name: 'สอบ', removable: false },
            { value: 'group-project', name: 'งานกลุ่ม', removable: false }
        ],
        profile: {
            displayName: '',
            gender: 'unspecified',
            age: '',
            bio: '',
            lifebuddyId: '',
            photoURL: 'assets/profiles/startprofile.png',
            savedScores: {},
            currentBanner: 'banner_default'
        },
        following: [],
        followers: [],
        followRequests: [],
        sentFollowRequests: [],
        gpaHistory: [],
    };

        // ฐานข้อมูลคะแนนเต็มสำหรับ TCAS
        const TCAS_SUBJECT_MAX_SCORES = {
            'GPAX': 4.00,
            'TGAT': 300.00,
            'TGAT1': 100.00, 
            'TGAT2': 100.00, 
            'TGAT3': 100.00,
            'TPAT1': 300.00,
            'TPAT2': 100.00,
            'TPAT3': 100.00, 
            'TPAT4': 100.00, 
            'TPAT5': 100.00,
            'A-Level_คณิต1': 100.00, 
            'A-Level_คณิต2': 100.00, 
            'A-Level_วิทย์ทั่วไป': 100.00,
            'A-Level_ฟิสิกส์': 100.00, 
            'A-Level_เคมี': 100.00, 
            'A-Level_ชีววิทยา': 100.00,
            'A-Level_สังคมศึกษา': 100.00, 
            'A-Level_ไทย': 100.00, 
            'A-Level_อังกฤษ': 100.00,
            'A-Level_ฝรั่งเศส': 100.00,
            'A-Level_เยอรมัน': 100.00,
            'A-Level_ญี่ปุ่น': 100.00,
            'A-Level_เกาหลี': 100.00,
            'A-Level_จีน': 100.00,
            'A-Level_บาลี': 100.00,
            'A-Level_สเปน': 100.00,
        };

    // สูตรคำนวณตัวอย่าง (ในอนาคตสามารถให้ผู้ใช้เลือกได้)
    const sampleTcasFormulas = {
        'sci_example': {
            name: 'ตัวอย่าง: คณะวิทยาศาสตร์',
            weights: {
                'GPAX6_SCORE': 20,
                'TGAT_TOTAL': 30, // ใช้คะแนน TGAT รวม (TGAT1+2+3)
                'A-Level_คณิต1': 25,
                'A-Level_ฟิสิกส์': 25,
            }
        }
    };

    const tpatSubjects = {
        'TPAT11': 'TPAT1.1 เชาว์', 'TPAT12': 'TPAT1.2 จริยธรรม', 'TPAT13': 'TPAT1.3 เชื่อมโยง',
        'TPAT21': 'TPAT2.1 ทัศนศิลป์', 'TPAT22': 'TPAT2.2 ดนตรี', 'TPAT23': 'TPAT2.3 นาฏศิลป์',
        'TPAT3': 'TPAT3 วิทย์-วิศวฯ', 'TPAT4': 'TPAT4 สถาปัตย์', 'TPAT5': 'TPAT5 ครู'
    };

    const alevelSubjects = {
        'A-Level คณิต1': 'คณิต1', 'A-Level คณิต2': 'คณิต2', 'A-Level วิทย์ทั่วไป': 'วิทย์ฯ',
        'A-Level ฟิสิกส์': 'ฟิสิกส์', 'A-Level เคมี': 'เคมี', 'A-Level ชีววิทยา': 'ชีวะ',
        'A-Level สังคมศึกษา': 'สังคม', 'A-Level ไทย': 'ไทย', 'A-Level อังกฤษ': 'อังกฤษ',
        'A-Level เยอรมัน': 'เยอรมัน', 'A-Level ฝรั่งเศส': 'ฝรั่งเศส', 'A-Level ญี่ปุ่น': 'ญี่ปุ่น',
        'A-Level เกาหลี': 'เกาหลี', 'A-Level จีน': 'จีน', 'A-Level บาลี': 'บาลี', 'A-Level สเปน': 'สเปน'
    };

    const specificSubjects = {
        'CEFR': { label: 'CEFR', placeholder: '1000.00' },
        'CMUETEGS': { label: 'CMU-eTEGS', placeholder: '100.00' },
        'CUTEP': { label: 'CU-TEP', placeholder: '120.00' },
        'DET': { label: 'DET', placeholder: '120.00' },
        'GED_SCORE': { label: 'GED', placeholder: '800.00' },
        'GPA21': { label: 'GPA ภาษาไทย', placeholder: '4.00' },
        'GPA22': { label: 'GPA คณิตศาสตร์', placeholder: '4.00' },
        'GPA22_23': { label: 'GPA คณิต วิทย์', placeholder: '4.00' },
        'GPA22_23_28': { label: 'GPA คณิต วิทย์ อังกฤษ', placeholder: '4.00' },
        'GPA23': { label: 'GPA วิทยาศาสตร์', placeholder: '4.00' },
        'GPA24': { label: 'GPA สังคม', placeholder: '4.00' },
        'GPA25': { label: 'GPA สุขศึกษาและพลศึกษา', placeholder: '4.00' },
        'GPA26': { label: 'GPA ศิลปะ', placeholder: '4.00' },
        'GPA27': { label: 'GPA การงานอาชีพ', placeholder: '4.00' },
        'GPA28': { label: 'GPA ภาษาต่างประเทศ', placeholder: '4.00' },
        'GPAX5_SCORE': { label: 'GPAX 5 เทอม', placeholder: '4.00' },
        'GPAX6_SCORE': { label: 'GPAX 6 เทอม', placeholder: '4.00' },
        'IELTS': { label: 'IELTS', placeholder: '9.0' },
        'KEPT': { label: 'KKU-KEPT', placeholder: '100.00' },
        'KUEPT': { label: 'KU-EPT', placeholder: '1000.00' },
        'MU001': { label: 'MU001 วาดเส้น', placeholder: '100.00' },
        'MU002': { label: 'MU002 ออกแบบ', placeholder: '100.00' },
        'MU003': { label: 'MU003 ฉุกเฉินการแพทย์', placeholder: '100.00' },
        'MU_ELT': { label: 'MU-ELT', placeholder: '150.00' },
        'NETSAT_BIO': { label: 'NETSAT BIO', placeholder: '100.00' },
        'NETSAT_CHEM': { label: 'NETSAT CHEM', placeholder: '100.00' },
        'NETSAT_LANG': { label: 'NETSAT LANG', placeholder: '100.00' },
        'NETSAT_MATH': { label: 'NETSAT MATH', placeholder: '100.00' },
        'NETSAT_PHY': { label: 'NETSAT PHYSIC', placeholder: '100.00' },
        'NETSAT_SCI': { label: 'NETSAT SCI', placeholder: '100.00' },
        'PSUTEP': { label: 'PSU-TEP', placeholder: '400.00' },
        'SAT': { label: 'SAT', placeholder: '1600.00' },
        'SU001': { label: 'SU001 วาดเส้น', placeholder: '100.00' },
        'SU002': { label: 'SU002 องค์ประกอบศิลป์', placeholder: '100.00' },
        'SU003': { label: 'SU003 สร้างสรรค์', placeholder: '100.00' },
        'SU004': { label: 'SU004 ทั่วไปศิลปะ', placeholder: '100.00' },
        'SU005': { label: 'SU005 วาดเส้นมัณฑศิลป์', placeholder: '100.00' },
        'SU006': { label: 'SU006 ออกแบบผลิตภัณฑ์', placeholder: '100.00' },
        'SU007': { label: 'SU007 ประยุกตศิลป์ศึกษา', placeholder: '100.00' },
        'SU008': { label: 'SU008 เครื่องเคลือบดินเผา', placeholder: '100.00' },
        'SU009': { label: 'SU009 ออกแบบเครื่องประดับ', placeholder: '100.00' },
        'SU010': { label: 'SU010 ออกแบบเครื่องแต่งกาย', placeholder: '100.00' },
        'SU011': { label: 'SU011 วิเคราะห์สังคมศาสตร์', placeholder: '100.00' },
        'SU012': { label: 'SU012 สังคีตศิลป์ไทย', placeholder: '100.00' },
        'SU013': { label: 'SU013 ทักษะภาษาไทย', placeholder: '100.00' },
        'SU014': { label: 'SU014 PSAT เภสัช', placeholder: '200.00' },
        'SWU_SET': { label: 'SWU-SET', placeholder: '1000.00' },
        'T_SCORE': { label: 'T-SCORE', placeholder: '100.00' },
        'TOEFL_CBT': { label: 'TOEFL CBT', placeholder: '300.00' },
        'TOEFL_IBT': { label: 'TOEFL IBT', placeholder: '120.00' },
        'TOEFL_IPT': { label: 'TOEFL IPT', placeholder: '677.00' },
        'TOEFL_ITP': { label: 'TOEFL ITP', placeholder: '677.00' },
        'TOEFL_PBT': { label: 'TOEFL PBT', placeholder: '677.00' },
        'TOEIC': { label: 'TOEIC', placeholder: '990.00' },
        'TU001': { label: 'TU001 นิติศาสตร์', placeholder: '70.00' },
        'TU002': { label: 'TU002 การเมืองการปกครอง', placeholder: '70.00' },
        'TU003': { label: 'TU003 ระหว่างประเทศ', placeholder: '70.00' },
        'TU004': { label: 'TU004 บริหารรัฐกิจ', placeholder: '70.00' },
        'TU005': { label: 'TU005 สังคมสงเคราะห์', placeholder: '100.00' },
        'TU006': { label: 'TU006 รัฐศาสตร์ นานาชาติ', placeholder: '100.00' },
        'TU061': { label: 'TU061 วาดเส้นสิ่งทอ', placeholder: '35.00' },
        'TU062': { label: 'TU062 ออกแบบสิ่งทอ', placeholder: '35.00' },
        'TU071': { label: 'TU071 วาดเส้นแฟชั่น', placeholder: '35.00' },
        'TU072': { label: 'TU072 ออกแบบแฟชั่น', placeholder: '35.00' },
        'TU081': { label: 'TU081 ละคอน', placeholder: '35.00' },
        'TU082': { label: 'TU082 AUDITION', placeholder: '35.00' },
        'TU091': { label: 'TU091 วาดเส้นออกแบบ', placeholder: '50.00' },
        'TU092': { label: 'TU092 หัตถอุตสาหกรรม', placeholder: '50.00' },
        'TUGET': { label: 'TU-GET', placeholder: '120.00' },
        'VNET_51': { label: 'VNET51 ปวช', placeholder: '100.00' },
        'VNET_511': { label: 'VNET511 ภาษา', placeholder: '100.00' },
        'VNET_512': { label: 'VNET512 การคิดแก้ปัญหา', placeholder: '100.00' },
        'VNET_513': { label: 'VNET513 ทักษะสังคม', placeholder: '100.00' },
        'VNET_514': { label: 'VNET514 ทักษะอาชีพ', placeholder: '100.00' },
        'KMITL_TEP': { label: 'KMITL-TEP', placeholder: '120.00' }
    };

    let timerInterval, timeLeft, isFocusing = true;
    let currentPlannerDate = dayjs(), selectedPlannerDate = dayjs().format('YYYY-MM-DD');
    let currentMoodDate = dayjs(), selectedMoodDate = dayjs().format('YYYY-MM-DD');
    let toastTimeout, areListenersSetup = false;
    friendListeners = [];
    let lastSearchResults = [];
    let currentGpaRecord = null;
    let currentTcasSelection = {};
    let currentSubjectSelectionCallback = null;
    const allPages = document.querySelectorAll('.page');
    const allNavLinks = document.querySelectorAll('.nav-link');

    // =================================
    // ===== 3. APP INITIALIZATION =====
    // =================================
    auth.onAuthStateChanged(async (user) => {
        const loadingOverlay = document.getElementById('loading-overlay');
        loadingOverlay.classList.remove('hidden');
        if (user) {
            currentUser = user;
            state = await loadStateFromFirestore(user.uid);
            setupFriendListeners(user.uid);
        } else {
            currentUser = null;
            state = JSON.parse(JSON.stringify(initialState));
            if (friendListeners.length > 0) {
                friendListeners.forEach(unsub => unsub());
                friendListeners = [];
            }
        }
        runApp();
    });

    async function loadStateFromFirestore(userId) {
        try {
            const docRef = db.collection('users').doc(userId);
            const doc = await docRef.get();
            if (doc.exists) {
                return deepMerge(JSON.parse(JSON.stringify(initialState)), doc.data());
            } else {
                console.error(`CRITICAL: No data found in Firestore for user ${userId}. Creating new profile.`);
                const initialName = auth.currentUser.email.split('@')[0];
                const randomTag = Math.floor(1000 + Math.random() * 9000);
                const newUserProfileData = JSON.parse(JSON.stringify(initialState));
                newUserProfileData.profile.displayName = initialName;
                newUserProfileData.profile.lifebuddyId = `${initialName}#${randomTag}`;
                await db.collection('users').doc(userId).set(newUserProfileData);
                return newUserProfileData;
            }
        } catch (error) {
            console.error("Error loading state from Firestore:", error);
            return JSON.parse(JSON.stringify(initialState));
        }
    }

    function runApp() {
        if (!areListenersSetup) {
            setupAllEventListeners();
            areListenersSetup = true;
        }
        applySettings();
        checkStreakStatusOnLoad();
        updateUIForLoginStatus();
        checkDailyReset();
        checkForIdleCoins();
        const hash = window.location.hash.substring(1);
        showPage(hash || 'home');
        document.getElementById('loading-overlay').style.opacity = '0';
        setTimeout(() => document.getElementById('loading-overlay').classList.add('hidden'), 500);
    }

    function checkStreakStatusOnLoad() {
        if (!currentUser) return;

        // 1. ตรวจสอบเพื่อรีเซ็ตโควต้า "ไฟเย็น" ทุกเดือน
        const currentMonthStr = dayjs().format('YYYY-MM');
        if (state.lastFreezeReset !== currentMonthStr) {
            state.streakFreezesAvailable = 5; // รีเซ็ตโควต้าเป็น 5
            state.lastFreezeReset = currentMonthStr;
            showToast("คุณได้รับโควต้ากู้สตรีคประจำเดือนแล้ว!");
        }

        const todayStr = dayjs().format('YYYY-MM-DD');

        // ทำให้เงื่อนไขที่เหลือคือ "ถ้ายังไม่ได้เช็คอินของวันนี้" เท่านั้น
    if (state.lastCheckIn !== todayStr) {
        // หน่วงเวลาเล็กน้อยเพื่อให้ผู้ใช้เห็นหน้าจอหลักก่อน
        setTimeout(showStreakModal, 1500); 
    }

        // 2. ตรวจสอบสถานะสตรีคที่ขาดไป
        const today = dayjs();
        const lastCheckInDate = state.lastCheckIn ? dayjs(state.lastCheckIn) : null;

        // ถ้าไม่เคยเช็คอิน หรือเช็คอินไปแล้ววันนี้ ไม่ต้องทำอะไร
        if (!lastCheckInDate || lastCheckInDate.isSame(today, 'day')) {
            state.isStreakFrozen = false; // ทำให้แน่ใจว่าสถานะ frozen ถูกปิด
            return;
        }

        const daysMissed = today.diff(lastCheckInDate, 'day');

        if (daysMissed > 1) { // ขาดการเช็คอินไปมากกว่า 1 วัน
            if (state.streak > 0 && state.streakFreezesAvailable > 0) {
                // ถ้ามีสตรีคอยู่และมี "ไฟเย็น" เหลือ -> เข้าสู่สถานะ Frozen
                state.isStreakFrozen = true;
            } else {
                // ถ้าไม่มีสตรีค หรือ "ไฟเย็น" หมด -> รีเซ็ตสตรีค
                state.streak = 0;
                state.isStreakFrozen = false;
            }
        } else {
            // ถ้าขาดไปแค่วันเดียว หรือไม่ขาดเลย
            state.isStreakFrozen = false;
        }
    }

    const criteria = {
        // กลุ่ม กสพท
        gpat: {
            "TPAT1": 30, "A-Level_ฟิสิกส์": 9, "A-Level_เคมี": 9.5, "A-Level_ชีววิทยา": 9.5,
            "A-Level_คณิต1": 14, "A-Level_อังกฤษ": 14, "A-Level_ไทย": 7, "A-Level_สังคมศึกษา": 7
        },
        // กลุ่มวิทยาศาสตร์สุขภาพ
        healthSciences: { "TGAT": 40, "A-Level_ฟิสิกส์": 10, "A-Level_เคมี": 10, "A-Level_ชีววิทยา": 10, "A-Level_คณิต1": 10, "A-Level_อังกฤษ": 10, "A-Level_ไทย": 5, "A-Level_สังคมศึกษา": 5 },
        // กลุ่มวิทยาศาสตร์
        science: { "TGAT": 20, "TPAT3": 40, "A-Level_ฟิสิกส์": 13.33, "A-Level_เคมี": 13.33, "A-Level_ชีววิทยา": 13.34 },
        // กลุ่มวิศวกรรมศาสตร์
        engineering: { "TGAT": 20, "TPAT3": 40, "A-Level_คณิต1": 40 },
        // กลุ่มศิลปศาสตร์ (ยื่นคณิต)
        artsWithMath: { "TGAT": 60, "A-Level_คณิต2": 20, "A-Level_ไทย": 10, "A-Level_สังคมศึกษา": 10 },
        // กลุ่มรัฐศาสตร์/นิติศาสตร์ (ยื่นคณิต)
        poliSciLawWithMath: { "TGAT": 40, "A-Level_คณิต2": 20, "A-Level_ไทย": 20, "A-Level_สังคมศึกษา": 20 },
        // กลุ่มบัญชี/เศรษฐศาสตร์
        business: { "TGAT": 50, "A-Level_คณิต1": 50 },
        businessForm2: { "TGAT": 50, "A-Level_คณิต2": 50 },
        economics: { "TGAT": 40, "A-Level_คณิต1": 40, "A-Level_ไทย": 10, "A-Level_สังคมศึกษา": 10 },
        // กลุ่มครุศาสตร์
        education: { "TGAT": 20, "TPAT5": 40, "A-Level_ไทย": 20, "A-Level_สังคมศึกษา": 20 },
        // กลุ่มศิลปกรรมศาสตร์
        fineArts: { "TGAT": 50, "TPAT2": 50 },
        // กลุ่มสถาปัตยกรรมศาสตร์
        architecture: { "TGAT": 40, "TPAT4": 60 },
        // กลุ่มจิตวิทยา
        psychologyWithMath: { "TGAT": 50, "A-Level_คณิต1": 50 },
        psychologyWithSci: { "TGAT": 50, "TPAT3": 50 },
        // สำหรับ ม.กรุงเทพ (เอกชนมักจะเน้น TGAT)
        marketingBU: { "TGAT": 100 },
        // สำหรับ ม.การกีฬาแห่งชาติ (จะใช้เกณฑ์เฉพาะของตัวเอง)
        educationTNSU: { "TGAT": 40, "TPAT5": 60 },      // ศึกษาศาสตร์
        scienceTNSU: { "TGAT": 50, "TPAT3": 50 },        // วิทยาศาสตร์ (การกีฬา)
        artsTNSU: { "TGAT": 100 },                       // ศิลปศาสตร์
        businessTNSU: { "TGAT": 80, "A-Level_คณิต2": 20 }, // บริหารธุรกิจ
        airTraffic: {
            "TGAT": 30, "TPAT3": 30, "A-Level_ฟิสิกส์": 20, "A-Level_คณิต1": 20      
        },
        businessGeneral: {
            "TGAT": 80, "A-Level_คณิต1": 20
        },
        communicationArts: {
            "TGAT": 50, "A-Level_ไทย": 20, "A-Level_สังคมศึกษา": 10, "A-Level_อังกฤษ": 20
        },
        agriEconomics: {
            "TGAT": 40,                 // ความถนัดทั่วไป 40%
            "A-Level_คณิต1": 30,         // คณิตศาสตร์ประยุกต์ 30%
            "A-Level_เคมี": 15,          // เคมี 15%
            "A-Level_ชีววิทยา": 15      // ชีววิทยา 15%
        },
        psychologyClinical: {
            "TGAT": 30,                 // ความถนัดทั่วไป 30%
            "A-Level_คณิต1": 30,         // คณิตศาสตร์ประยุกต์ (สำคัญมาก) 30%
            "A-Level_อังกฤษ": 20,          // ภาษาอังกฤษ 20%
            "A-Level_ชีววิทยา": 20      // ชีววิทยา (สำหรับสายคลินิก) 20%
        },
        multimediaTech: {
            "TGAT": 50,                 // ความถนัดทั่วไป 50%
            "A-Level_คณิต1": 25,         // คณิตศาสตร์ประยุกต์ 25%
            "A-Level_ฟิสิกส์": 25         // ฟิสิกส์ (สำหรับความเข้าใจเรื่องแสง สี เสียง) 25%
        },
        tourismAndHospitality: {
            "TGAT": 80, "A-Level_อังกฤษ": 20
        },
        socialInnovationIntl: {
            "TGAT": 50, "A-Level_อังกฤษ": 30, "A-Level_สังคมศึกษา": 20
        },
        logisticsManagement: {
            "TGAT": 70,                 // ความถนัดทั่วไป 70%
            "A-Level_คณิต2": 30         // คณิตศาสตร์พื้นฐาน 30%
        }

    };

    const createLangCriteria = (langKey) => ({
        "TGAT": 50, [langKey]: 30, "A-Level_ไทย": 10, "A-Level_สังคมศึกษา": 10
    });

    const sampleCriteriaSci = { "GPAX": 20, "TGAT": 30, "TPAT3": 50 };
    const sampleCriteriaArt = { "GPAX": 30, "TGAT": 50, "A_SOC": 20 };   

    const medCriteria = {
        "TPAT1": 30,
        "A-Level_ฟิสิกส์": 9,
        "A-Level_เคมี": 9.5,
        "A-Level_ชีววิทยา": 9.5,
        "A-Level_คณิต1": 14,
        "A-Level_อังกฤษ": 14,
        "A-Level_ไทย": 7,
        "A-Level_สังคมศึกษา": 7
    };
        // ฟังก์ชันสำหรับสร้างฐานข้อมูลจำลองจากข้อมูล TCAS'67 ทั้งหมด
        // [ULTIMATE & FINAL VERSION] ฟังก์ชันสำหรับสร้างฐานข้อมูลจำลองจากข้อมูล TCAS'67 ทั้งหมด
    function createMockTcasDatabase() {

        tcasDatabase = [
        // ข้อมูลกลุ่มสถาบันแพทยศาสตร์แห่งประเทศไทย
        { university: "กลุ่มสถาบันแพทยศาสตร์แห่งประเทศไทย", faculty: "คณะทันตแพทยศาสตร์ จุฬาลงกรณ์มหาวิทยาลัย", major: "ทันตแพทยศาสตรบัณฑิต", admission_criteria: criteria.gpat, last_year_stat: { min_score: 62.5599, max_score: 75.5063 } },
        { university: "กลุ่มสถาบันแพทยศาสตร์แห่งประเทศไทย", faculty: "คณะแพทยศาสตร์ชัยภัทรพระนางเจ้าจอมกระบัง", major: "แพทยศาสตรบัณฑิต", admission_criteria: criteria.gpat, last_year_stat: { min_score: 63.3862, max_score: 75.3419 } },
        { university: "กลุ่มสถาบันแพทยศาสตร์แห่งประเทศไทย", faculty: "คณะแพทยศาสตร์โรงพยาบาลรามาธิบดี", major: "แพทยศาสตรบัณฑิต", admission_criteria: criteria.gpat, last_year_stat: { min_score: 62.2408, max_score: 65.8402 } },
        { university: "กลุ่มสถาบันแพทยศาสตร์แห่งประเทศไทย", faculty: "คณะแพทยศาสตร์ศิริราชพยาบาล", major: "แพทยศาสตรบัณฑิต", admission_criteria: criteria.gpat, last_year_stat: { min_score: 63.4531, max_score: 74.0000 } },
        { university: "กลุ่มสถาบันแพทยศาสตร์แห่งประเทศไทย", faculty: "คณะเภสัชศาสตร์ จุฬาลงกรณ์มหาวิทยาลัย", major: "เภสัชศาสตรบัณฑิต", admission_criteria: criteria.gpat, last_year_stat: { min_score: 51.5208, max_score: 57.8226 } },
        { university: "กลุ่มสถาบันแพทยศาสตร์แห่งประเทศไทย", faculty: "คณะสัตวแพทยศาสตร์ จุฬาลงกรณ์มหาวิทยาลัย", major: "สัตวแพทยศาสตรบัณฑิต", admission_criteria: criteria.gpat, last_year_stat: { min_score: 52.0696, max_score: 65.1520 } },
        { university: "กลุ่มสถาบันแพทยศาสตร์แห่งประเทศไทย", faculty: "วิทยาลัยแพทยศาสตร์พระมงกุฎเกล้า (เพศชาย)", major: "แพทยศาสตรบัณฑิต", admission_criteria: criteria.gpat, last_year_stat: { min_score: 55.7572, max_score: 62.6818 } },
        // ข้อมูลจุฬาลงกรณ์มหาวิทยาลัย
        { university: "จุฬาลงกรณ์มหาวิทยาลัย", faculty: "คณะพาณิชยศาสตร์และการบัญชี", major: "บัญชีบัณฑิต (เลือกสอบคณิตศาสตร์ประยุกต์ 1)", admission_criteria: criteria.business, last_year_stat: { min_score: 74.3552, max_score: 95.3332 } },
        { university: "จุฬาลงกรณ์มหาวิทยาลัย", faculty: "คณะพาณิชยศาสตร์และการบัญชี", major: "บัญชีบัณฑิต (เลือกสอบคณิตศาสตร์ประยุกต์ 2)", admission_criteria: criteria.businessForm2, last_year_stat: { min_score: 70.4664, max_score: 88.0332 } },
        { university: "จุฬาลงกรณ์มหาวิทยาลัย", faculty: "คณะพาณิชยศาสตร์และการบัญชี", major: "บริหารธุรกิจบัณฑิต (เลือกสอบคณิตศาสตร์ประยุกต์ 1)", admission_criteria: criteria.business, last_year_stat: { min_score: 70.0000, max_score: 91.5332 } },
        { university: "จุฬาลงกรณ์มหาวิทยาลัย", faculty: "คณะพาณิชยศาสตร์และการบัญชี", major: "บริหารธุรกิจบัณฑิต (เลือกสอบคณิตศาสตร์ประยุกต์ 2)", admission_criteria:criteria.businessForm2, last_year_stat: { min_score: 61.3108, max_score: 78.6776 } },
        { university: "จุฬาลงกรณ์มหาวิทยาลัย", faculty: "คณะพาณิชยศาสตร์และการบัญชี", major: "สถิติศาสตรบัณฑิต (การประกันภัย)", admission_criteria: criteria.business, last_year_stat: { min_score: 56.1888, max_score: 80.0220 } },
        { university: "จุฬาลงกรณ์มหาวิทยาลัย", faculty: "คณะพาณิชยศาสตร์และการบัญชี", major: "สถิติศาสตรบัณฑิต (สถิติและวิทยาการข้อมูล)", admission_criteria: criteria.business, last_year_stat: { min_score: 59.1444, max_score: 84.9888 } },
        { university: "จุฬาลงกรณ์มหาวิทยาลัย", faculty: "คณะพาณิชยศาสตร์และการบัญชี", major: "สถิติศาสตรบัณฑิต (เทคโนโลยีสารสนเทศเพื่อธุรกิจ)", admission_criteria: criteria.business, last_year_stat: { min_score: 54.2664, max_score: 66.8108 } },
        { university: "จุฬาลงกรณ์มหาวิทยาลัย", faculty: "คณะรัฐศาสตร์", major: "การปกครอง (เลือกสอบคณิตศาสตร์ประยุกต์ 2)", admission_criteria: createLangCriteria('A-Level_A-Level_คณิต2'), last_year_stat: { min_score: 62.8444, max_score: 70.2083 } },
        { university: "จุฬาลงกรณ์มหาวิทยาลัย", faculty: "คณะรัฐศาสตร์", major: "การปกครอง (เลือกสอบภาษาจีน)", admission_criteria: createLangCriteria('A-Level_จีน'), last_year_stat: { min_score: 63.2861, max_score: 66.3583 } },
        { university: "จุฬาลงกรณ์มหาวิทยาลัย", faculty: "คณะรัฐศาสตร์", major: "การปกครอง (เลือกสอบภาษาญี่ปุ่น)", admission_criteria: createLangCriteria('A-Level_ญี่ปุ่น'), last_year_stat: { min_score: 63.0222, max_score: 83.4027 } },
        { university: "จุฬาลงกรณ์มหาวิทยาลัย", faculty: "คณะรัฐศาสตร์", major: "การปกครอง (เลือกสอบภาษาฝรั่งเศส)", admission_criteria: createLangCriteria('A-Level_ฝรั่งเศส'), last_year_stat: { min_score: 63.3861, max_score: 67.2444 } },
        { university: "จุฬาลงกรณ์มหาวิทยาลัย", faculty: "คณะรัฐศาสตร์", major: "การปกครอง (เลือกสอบภาษาสเปน)", admission_criteria: createLangCriteria('A-Level_สเปน'), last_year_stat: { min_score: 63.5500, max_score: 68.5250 } },
        { university: "จุฬาลงกรณ์มหาวิทยาลัย", faculty: "คณะรัฐศาสตร์", major: "การปกครอง (เลือกสอบภาษาเยอรมัน)", admission_criteria: createLangCriteria('A-Level_เยอรมัน'), last_year_stat: { min_score: 0.0000, max_score: 0.0000 } },
        { university: "จุฬาลงกรณ์มหาวิทยาลัย", faculty: "คณะรัฐศาสตร์", major: "การปกครอง (เลือกสอบภาษาเกาหลี)", admission_criteria: createLangCriteria('A-Level_เกาหลี'), last_year_stat: { min_score: 64.8277, max_score: 70.1833 } },
        { university: "จุฬาลงกรณ์มหาวิทยาลัย", faculty: "คณะรัฐศาสตร์", major: "ความสัมพันธ์ระหว่างประเทศ (เลือกสอบคณิตศาสตร์ประยุกต์ 2)", admission_criteria: createLangCriteria('A-Level_คณิต2'), last_year_stat: { min_score: 76.8666, max_score: 83.3750 } },
        { university: "จุฬาลงกรณ์มหาวิทยาลัย", faculty: "คณะรัฐศาสตร์", major: "ความสัมพันธ์ระหว่างประเทศ (เลือกสอบภาษาจีน)", admission_criteria: createLangCriteria('A-Level_จีน'), last_year_stat: { min_score: 82.0638, max_score: 82.0638 } },
        { university: "จุฬาลงกรณ์มหาวิทยาลัย", faculty: "คณะรัฐศาสตร์", major: "ความสัมพันธ์ระหว่างประเทศ (เลือกสอบภาษาญี่ปุ่น)", admission_criteria: createLangCriteria('A-Level_ญี่ปุ่น'), last_year_stat: { min_score: 78.9888, max_score: 85.5416 } },
        { university: "จุฬาลงกรณ์มหาวิทยาลัย", faculty: "คณะรัฐศาสตร์", major: "ความสัมพันธ์ระหว่างประเทศ (เลือกสอบภาษาไทย)", admission_criteria: createLangCriteria('A-Level_ไทย'), last_year_stat: { min_score: 73.1082, max_score: 80.9916 } },
        { university: "จุฬาลงกรณ์มหาวิทยาลัย", faculty: "คณะรัฐศาสตร์", major: "ความสัมพันธ์ระหว่างประเทศ (เลือกสอบภาษาฝรั่งเศส)", admission_criteria: createLangCriteria('A-Level_ฝรั่งเศส'), last_year_stat: { min_score: 75.3776, max_score: 86.7416 } },
        { university: "จุฬาลงกรณ์มหาวิทยาลัย", faculty: "คณะรัฐศาสตร์", major: "ความสัมพันธ์ระหว่างประเทศ (เลือกสอบภาษาสเปน)", admission_criteria: createLangCriteria('A-Level_สเปน'), last_year_stat: { min_score: 73.4250, max_score: 78.4776 } },
        { university: "จุฬาลงกรณ์มหาวิทยาลัย", faculty: "คณะรัฐศาสตร์", major: "ความสัมพันธ์ระหว่างประเทศ (เลือกสอบภาษาเยอรมัน)", admission_criteria: createLangCriteria('A-Level_เยอรมมัน'), last_year_stat: { min_score: 77.8082, max_score: 85.6500 } },
        { university: "จุฬาลงกรณ์มหาวิทยาลัย", faculty: "คณะรัฐศาสตร์", major: "ความสัมพันธ์ระหว่างประเทศ (เลือกสอบภาษาเกาหลี)", admission_criteria: createLangCriteria('A-Level_เกาหลี'), last_year_stat: { min_score: 75.6250, max_score: 75.6250 } },
        { university: "จุฬาลงกรณ์มหาวิทยาลัย", faculty: "คณะรัฐศาสตร์", major: "รัฐประศาสนศาสตร์ (เลือกสอบคณิตศาสตร์ประยุกต์ 2)", admission_criteria: createLangCriteria('A-Level_คณิต2'), last_year_stat: { min_score: 63.0776, max_score: 67.6526 } },
        { university: "จุฬาลงกรณ์มหาวิทยาลัย", faculty: "คณะรัฐศาสตร์", major: "รัฐประศาสนศาสตร์ (เลือกสอบภาษาจีน)", admission_criteria: createLangCriteria('A-Level_จีน'), last_year_stat: { min_score: 63.3276, max_score: 66.9776 } },
        { university: "จุฬาลงกรณ์มหาวิทยาลัย", faculty: "คณะรัฐศาสตร์", major: "รัฐประศาสนศาสตร์ (เลือกสอบภาษาญี่ปุ่น)", admission_criteria: createLangCriteria('A-Level_ญี่ปุ่น'), last_year_stat: { min_score: 63.0082, max_score: 70.0944 } },
        { university: "จุฬาลงกรณ์มหาวิทยาลัย", faculty: "คณะรัฐศาสตร์", major: "รัฐประศาสนศาสตร์ (เลือกสอบภาษาฝรั่งเศส)", admission_criteria: createLangCriteria('A-Level_ฝรั่งเศส'), last_year_stat: { min_score: 63.0110, max_score: 65.3582 } },
        { university: "จุฬาลงกรณ์มหาวิทยาลัย", faculty: "คณะรัฐศาสตร์", major: "รัฐประศาสนศาสตร์ (เลือกสอบภาษาสเปน)", admission_criteria: createLangCriteria('A-Level_สเปน'), last_year_stat: { min_score: 63.3082, max_score: 66.9722 } },
        { university: "จุฬาลงกรณ์มหาวิทยาลัย", faculty: "คณะรัฐศาสตร์", major: "รัฐประศาสนศาสตร์ (เลือกสอบภาษาเยอรมัน)", admission_criteria: createLangCriteria('A-Level_เยอรมัน'), last_year_stat: { min_score: 67.3110, max_score: 71.2472 } },
        { university: "จุฬาลงกรณ์มหาวิทยาลัย", faculty: "คณะรัฐศาสตร์", major: "รัฐประศาสนศาสตร์ (เลือกสอบภาษาเกาหลี)", admission_criteria: createLangCriteria('A-Level_เกาหลี'), last_year_stat: { min_score: 63.9944, max_score: 65.4722 } },
        { university: "จุฬาลงกรณ์มหาวิทยาลัย", faculty: "คณะรัฐศาสตร์", major: "สังคมวิทยาและมานุษยวิทยา (เลือกสอบคณิตศาสตร์ประยุกต์ 2)", admission_criteria: createLangCriteria('A-Level_คณิต2'), last_year_stat: { min_score: 0.0000, max_score: 0.0000 } },
        { university: "จุฬาลงกรณ์มหาวิทยาลัย", faculty: "คณะรัฐศาสตร์", major: "สังคมวิทยาและมานุษยวิทยา (เลือกสอบภาษาจีน)", admission_criteria: createLangCriteria('A-Level_จีน'), last_year_stat: { min_score: 70.0000, max_score: 70.0000 } },
        { university: "จุฬาลงกรณ์มหาวิทยาลัย", faculty: "คณะรัฐศาสตร์", major: "สังคมวิทยาและมานุษยวิทยา (เลือกสอบภาษาญี่ปุ่น)", admission_criteria: createLangCriteria('A-Level_ญี่ปุ่น'), last_year_stat: { min_score: 0.0000, max_score: 0.0000 } },
        { university: "จุฬาลงกรณ์มหาวิทยาลัย", faculty: "คณะรัฐศาสตร์", major: "สังคมวิทยาและมานุษยวิทยา (เลือกสอบภาษาไทย)", admission_criteria: createLangCriteria('A-Level_ไทย'), last_year_stat: { min_score: 69.4513, max_score: 75.9443 } },
        { university: "จุฬาลงกรณ์มหาวิทยาลัย", faculty: "คณะรัฐศาสตร์", major: "สังคมวิทยาและมานุษยวิทยา (เลือกสอบภาษาฝรั่งเศส)", admission_criteria: createLangCriteria('A-Level_ฝรั่งเศส'), last_year_stat: { min_score: 70.0625, max_score: 72.4375 } },
        { university: "จุฬาลงกรณ์มหาวิทยาลัย", faculty: "คณะรัฐศาสตร์", major: "สังคมวิทยาและมานุษยวิทยา (เลือกสอบภาษาสเปน)", admission_criteria: createLangCriteria('A-Level_สเปน'), last_year_stat: { min_score: 0.0000, max_score: 0.0000 } },
        { university: "จุฬาลงกรณ์มหาวิทยาลัย", faculty: "คณะรัฐศาสตร์", major: "สังคมวิทยาและมานุษยวิทยา (เลือกสอบภาษาเยอรมัน)", admission_criteria: createLangCriteria('A-Level_เยอรมัน'), last_year_stat: { min_score: 73.5415, max_score: 73.5415 } },
        { university: "จุฬาลงกรณ์มหาวิทยาลัย", faculty: "คณะรัฐศาสตร์", major: "สังคมวิทยาและมานุษยวิทยา (เลือกสอบภาษาเกาหลี)", admission_criteria: createLangCriteria('A-Level_เกาหลี'), last_year_stat: { min_score: 70.7778, max_score: 74.0208 } },
        { university: "จุฬาลงกรณ์มหาวิทยาลัย", faculty: "คณะวิทยาศาสตร์", major: "คณิตศาสตร์", admission_criteria: criteria.science, last_year_stat: { min_score: 57.4496, max_score: 71.9332 } },
        { university: "จุฬาลงกรณ์มหาวิทยาลัย", faculty: "คณะวิทยาศาสตร์", major: "จุลชีววิทยา", admission_criteria: criteria.science, last_year_stat: { min_score: 53.0604, max_score: 69.5882 } },
        { university: "จุฬาลงกรณ์มหาวิทยาลัย", faculty: "คณะวิทยาศาสตร์", major: "ชีวเคมี", admission_criteria: criteria.science, last_year_stat: { min_score: 51.6440, max_score: 62.9216 } },
        { university: "จุฬาลงกรณ์มหาวิทยาลัย", faculty: "คณะวิทยาศาสตร์", major: "ชีววิทยา", admission_criteria: criteria.science, last_year_stat: { min_score: 52.4604, max_score: 65.2160 } },
        { university: "จุฬาลงกรณ์มหาวิทยาลัย", faculty: "คณะวิทยาศาสตร์", major: "ธรณีวิทยา", admission_criteria: criteria.science, last_year_stat: { min_score: 53.0882, max_score: 62.4444 } },
        { university: "จุฬาลงกรณ์มหาวิทยาลัย", faculty: "คณะวิทยาศาสตร์", major: "เทคโนโลยีทางภาพและการพิมพ์", admission_criteria: criteria.science, last_year_stat: { min_score: 48.5440, max_score: 62.4722 } },
        { university: "จุฬาลงกรณ์มหาวิทยาลัย", faculty: "คณะวิทยาศาสตร์", major: "เทคโนโลยีทางอาหาร", admission_criteria: criteria.science, last_year_stat: { min_score: 54.5444, max_score: 71.9276 } },
        { university: "จุฬาลงกรณ์มหาวิทยาลัย", faculty: "คณะวิทยาศาสตร์", major: "พันธุศาสตร์", admission_criteria: criteria.science, last_year_stat: { min_score: 47.2110, max_score: 61.8552 } },
        { university: "จุฬาลงกรณ์มหาวิทยาลัย", faculty: "คณะวิทยาศาสตร์", major: "พฤกษศาสตร์", admission_criteria: criteria.science, last_year_stat: { min_score: 45.2550, max_score: 55.0722 } },
        { university: "จุฬาลงกรณ์มหาวิทยาลัย", faculty: "คณะวิทยาศาสตร์", major: "ฟิสิกส์", admission_criteria: criteria.science, last_year_stat: { min_score: 52.6222, max_score: 72.3660 } },
        { university: "จุฬาลงกรณ์มหาวิทยาลัย", faculty: "คณะวิทยาศาสตร์", major: "วัสดุศาสตร์และเทคโนโลยี", admission_criteria: criteria.science, last_year_stat: { min_score: 48.5054, max_score: 61.9940 } },
        { university: "จุฬาลงกรณ์มหาวิทยาลัย", faculty: "คณะวิทยาศาสตร์", major: "วิทยาการคอมพิวเตอร์", admission_criteria: criteria.science, last_year_stat: { min_score: 66.8944, max_score: 74.6832 } },
        { university: "จุฬาลงกรณ์มหาวิทยาลัย", faculty: "คณะวิทยาศาสตร์", major: "วิทยาศาสตร์ทางทะเล", admission_criteria: criteria.science, last_year_stat: { min_score: 52.6774, max_score: 66.8050 } },
        { university: "จุฬาลงกรณ์มหาวิทยาลัย", faculty: "คณะวิทยาศาสตร์", major: "วิทยาศาสตร์สิ่งแวดล้อม", admission_criteria: criteria.science, last_year_stat: { min_score: 49.2552, max_score: 61.6774 } },
        { university: "จุฬาลงกรณ์มหาวิทยาลัย", faculty: "คณะวิทยาศาสตร์", major: "สัตววิทยา", admission_criteria: criteria.science, last_year_stat: { min_score: 50.4438, max_score: 62.1500 } },
        { university: "จุฬาลงกรณ์มหาวิทยาลัย", faculty: "คณะวิทยาศาสตร์", major: "เคมี", admission_criteria: criteria.science, last_year_stat: { min_score: 51.9496, max_score: 63.0276 } },
        { university: "จุฬาลงกรณ์มหาวิทยาลัย", faculty: "คณะวิทยาศาสตร์", major: "เคมีวิศวกรรม", admission_criteria: criteria.science, last_year_stat: { min_score: 54.9382, max_score: 65.1496 } },
        { university: "จุฬาลงกรณ์มหาวิทยาลัย", faculty: "คณะวิศวกรรมศาสตร์", major: "วิศวกรรมคอมพิวเตอร์", admission_criteria: criteria.engineering, last_year_stat: { min_score: 72.2942, max_score: 90.4218 } },
        { university: "จุฬาลงกรณ์มหาวิทยาลัย", faculty: "คณะวิศวกรรมศาสตร์", major: "วิศวกรรมคอมพิวเตอร์และเทคโนโลยีดิจิทัล", admission_criteria: criteria.engineering, last_year_stat: { min_score: 58.0222, max_score: 78.8053 } },
        { university: "จุฬาลงกรณ์มหาวิทยาลัย", faculty: "คณะวิศวกรรมศาสตร์", major: "วิศวกรรมทรัพยากรธรณี", admission_criteria: criteria.engineering, last_year_stat: { min_score: 51.4831, max_score: 53.3720 } },
        { university: "จุฬาลงกรณ์มหาวิทยาลัย", faculty: "คณะวิศวกรรมศาสตร์", major: "วิศวกรรมนิวเคลียร์และรังสี", admission_criteria: criteria.engineering, last_year_stat: { min_score: 49.1275, max_score: 53.4721 } },
        { university: "จุฬาลงกรณ์มหาวิทยาลัย", faculty: "คณะวิศวกรรมศาสตร์", major: "วิศวกรรมโยธา", admission_criteria: criteria.engineering, last_year_stat: { min_score: 58.5664, max_score: 64.3274 } },
        { university: "จุฬาลงกรณ์มหาวิทยาลัย", faculty: "คณะวิศวกรรมศาสตร์", major: "วิศวกรรมโลหการและวัสดุ", admission_criteria: criteria.engineering, last_year_stat: { min_score: 51.1498, max_score: 53.6222 } },
        { university: "จุฬาลงกรณ์มหาวิทยาลัย", faculty: "คณะวิศวกรรมศาสตร์", major: "วิศวกรรมศาสตร์", admission_criteria: criteria.engineering, last_year_stat: { min_score: 53.6832, max_score: 83.5332 } },
        { university: "จุฬาลงกรณ์มหาวิทยาลัย", faculty: "คณะวิศวกรรมศาสตร์", major: "วิศวกรรมสํารวจ", admission_criteria: criteria.engineering, last_year_stat: { min_score: 50.9554, max_score: 57.0996 } },
        { university: "จุฬาลงกรณ์มหาวิทยาลัย", faculty: "คณะวิศวกรรมศาสตร์", major: "วิศวกรรมสิ่งแวดล้อม", admission_criteria: criteria.engineering, last_year_stat: { min_score: 51.4386, max_score: 69.6887 } },
        { university: "จุฬาลงกรณ์มหาวิทยาลัย", faculty: "คณะวิศวกรรมศาสตร์", major: "วิศวกรรมอุตสาหการ", admission_criteria: criteria.engineering, last_year_stat: { min_score: 68.6332, max_score: 78.5108 } },
        { university: "จุฬาลงกรณ์มหาวิทยาลัย", faculty: "คณะสถาปัตยกรรมศาสตร์", major: "การออกแบบอุตสาหกรรม", admission_criteria: criteria.architecture, last_year_stat: { min_score: 53.1000, max_score: 69.5000 } },
        { university: "จุฬาลงกรณ์มหาวิทยาลัย", faculty: "คณะสถาปัตยกรรมศาสตร์", major: "ภูมิสถาปัตยกรรม", admission_criteria: criteria.architecture, last_year_stat: { min_score: 51.8500, max_score: 58.4500 } },
        { university: "จุฬาลงกรณ์มหาวิทยาลัย", faculty: "คณะสถาปัตยกรรมศาสตร์", major: "สถาปัตยกรรม", admission_criteria: criteria.architecture, last_year_stat: { min_score: 61.2000, max_score: 80.2500 } },
        { university: "จุฬาลงกรณ์มหาวิทยาลัย", faculty: "คณะสถาปัตยกรรมศาสตร์", major: "สถาปัตยกรรมผังเมือง", admission_criteria: criteria.architecture, last_year_stat: { min_score: 49.5500, max_score: 56.7500 } },
        { university: "จุฬาลงกรณ์มหาวิทยาลัย", faculty: "คณะสถาปัตยกรรมศาสตร์", major: "สถาปัตยกรรมภายใน", admission_criteria: criteria.architecture, last_year_stat: { min_score: 58.6000, max_score: 71.2000 } },
        { university: "จุฬาลงกรณ์มหาวิทยาลัย", faculty: "คณะอักษรศาสตร์", major: "ภูมิศาสตร์และภูมิสารสนเทศ", admission_criteria: criteria.artsWithMath, last_year_stat: { min_score: 62.4375, max_score: 67.1875 } },
        { university: "จุฬาลงกรณ์มหาวิทยาลัย", faculty: "คณะอักษรศาสตร์", major: "สารสนเทศศึกษา", admission_criteria: criteria.artsWithMath, last_year_stat: { min_score: 65.5000, max_score: 71.7500 } },
        { university: "จุฬาลงกรณ์มหาวิทยาลัย", faculty: "คณะอักษรศาสตร์", major: "อักษรศาสตร์ (เลือกสอบคณิตศาสตร์ประยุกต์ 2)", admission_criteria: createLangCriteria('A-Level_คณิต2'), last_year_stat: { min_score: 68.9375, max_score: 80.2500 } },
        { university: "จุฬาลงกรณ์มหาวิทยาลัย", faculty: "คณะอักษรศาสตร์", major: "อักษรศาสตร์ (เลือกสอบภาษาจีน)", admission_criteria: createLangCriteria('A-Level_จีน'), last_year_stat: { min_score: 70.8750, max_score: 81.7500 } },
        { university: "จุฬาลงกรณ์มหาวิทยาลัย", faculty: "คณะอักษรศาสตร์", major: "อักษรศาสตร์ (เลือกสอบภาษาญี่ปุ่น)", admission_criteria: createLangCriteria('A-Level_ญี่ปุ่น'), last_year_stat: { min_score: 70.8750, max_score: 85.2500 } },
        { university: "จุฬาลงกรณ์มหาวิทยาลัย", faculty: "คณะอักษรศาสตร์", major: "อักษรศาสตร์ (เลือกสอบภาษาบาลี)", admission_criteria: createLangCriteria('A-Level_บาลี'), last_year_stat: { min_score: 71.8750, max_score: 74.2500 } },
        { university: "จุฬาลงกรณ์มหาวิทยาลัย", faculty: "คณะอักษรศาสตร์", major: "อักษรศาสตร์ (เลือกสอบภาษาฝรั่งเศส)", admission_criteria: createLangCriteria('A-Level_ฝรั่งเศส'), last_year_stat: { min_score: 70.8750, max_score: 82.5000 } },
        { university: "จุฬาลงกรณ์มหาวิทยาลัย", faculty: "คณะอักษรศาสตร์", major: "อักษรศาสตร์ (เลือกสอบภาษาสเปน)", admission_criteria: createLangCriteria('A-Level_สเปน'), last_year_stat: { min_score: 71.7500, max_score: 80.6875 } },
        { university: "จุฬาลงกรณ์มหาวิทยาลัย", faculty: "คณะอักษรศาสตร์", major: "อักษรศาสตร์ (เลือกสอบภาษาเยอรมัน)", admission_criteria: createLangCriteria('A-Level_เยอรมัน'), last_year_stat: { min_score: 72.0000, max_score: 78.6250 } },
        { university: "จุฬาลงกรณ์มหาวิทยาลัย", faculty: "คณะอักษรศาสตร์", major: "อักษรศาสตร์ (เลือกสอบภาษาเกาหลี)", admission_criteria: createLangCriteria('A-Level_เกาหลี'), last_year_stat: { min_score: 71.2500, max_score: 79.8750 } },
        // ข้อมูลมหาวิทยาลัยกรุงเทพ
        { university: "มหาวิทยาลัยกรุงเทพ", faculty: "คณะบริหารธุรกิจ", major: "การตลาด", admission_criteria: criteria.marketingBU, last_year_stat: { min_score: 25.0000, max_score: 81.5000 } },
        // ข้อมูลมหาวิทยาลัยการกีฬาแห่งชาติ
        { university: "มหาวิทยาลัยการกีฬาแห่งชาติ", faculty: "วิทยาเขตกระบี่", major: "ศึกษาศาสตรบัณฑิต", admission_criteria: criteria.educationTNSU, last_year_stat: { min_score: 55.7500, max_score: 55.7500 } },
        { university: "มหาวิทยาลัยการกีฬาแห่งชาติ", faculty: "วิทยาเขตกรุงเทพ", major: "วิทยาศาสตรบัณฑิต", admission_criteria: criteria.scienceTNSU, last_year_stat: { min_score: 51.5832, max_score: 51.5832 } },
        { university: "มหาวิทยาลัยการกีฬาแห่งชาติ", faculty: "วิทยาเขตชัยภูมิ", major: "ศิลปศาสตรบัณฑิต", admission_criteria: criteria.artsTNSU, last_year_stat: { min_score: 42.5000, max_score: 42.5000 } },
        { university: "มหาวิทยาลัยการกีฬาแห่งชาติ", faculty: "วิทยาเขตเชียงใหม่", major: "บริหารธุรกิจบัณฑิต", admission_criteria: criteria.businessTNSU, last_year_stat: { min_score: 51.2500, max_score: 51.2500 } },
        { university: "มหาวิทยาลัยการกีฬาแห่งชาติ", faculty: "วิทยาเขตตรัง", major: "ศึกษาศาสตรบัณฑิต", admission_criteria: criteria.educationTNSU, last_year_stat: { min_score: 49.5000, max_score: 49.5000 } },
        { university: "มหาวิทยาลัยการกีฬาแห่งชาติ", faculty: "วิทยาเขตยะลา", major: "ศึกษาศาสตรบัณฑิต", admission_criteria: criteria.educationTNSU, last_year_stat: { min_score: 0.0000, max_score: 0.0000 } },
        { university: "มหาวิทยาลัยการกีฬาแห่งชาติ", faculty: "วิทยาเขตลำปาง", major: "ศิลปศาสตรบัณฑิต", admission_criteria: criteria.artsTNSU, last_year_stat: { min_score: 40.0000, max_score: 40.0000 } },
        { university: "มหาวิทยาลัยการกีฬาแห่งชาติ", faculty: "วิทยาเขตศรีสะเกษ", major: "ศึกษาศาสตรบัณฑิต", admission_criteria: criteria.educationTNSU, last_year_stat: { min_score: 0.0000, max_score: 0.0000 } },
        { university: "มหาวิทยาลัยการกีฬาแห่งชาติ", faculty: "วิทยาเขตสุโขทัย", major: "ศิลปศาสตรบัณฑิต", admission_criteria: criteria.artsTNSU, last_year_stat: { min_score: 0.0000, max_score: 0.0000 } },
        { university: "มหาวิทยาลัยการกีฬาแห่งชาติ", faculty: "วิทยาเขตสุพรรณบุรี", major: "ศิลปศาสตรบัณฑิต", admission_criteria: criteria.artsTNSU, last_year_stat: { min_score: 0.0000, max_score: 0.0000 } },
        { university: "มหาวิทยาลัยการกีฬาแห่งชาติ", faculty: "วิทยาเขตอุดรธานี", major: "ศึกษาศาสตรบัณฑิต", admission_criteria: criteria.educationTNSU, last_year_stat: { min_score: 0.0000, max_score: 0.0000 } },
        // ข้อมูลมหาวิทยาลัยเกษตรศาสตร์
        { university: "มหาวิทยาลัยเกษตรศาสตร์", faculty: "คณะประมง", major: "ประมง", admission_criteria: criteria.agroForestryFisheries, last_year_stat: { min_score: 26.5249, max_score: 52.9998 } },
        { university: "มหาวิทยาลัยเกษตรศาสตร์", faculty: "คณะวนศาสตร์", major: "วนศาสตร์", admission_criteria: criteria.agroForestryFisheries, last_year_stat: { min_score: 49.4580, max_score: 67.9855 } },
        { university: "มหาวิทยาลัยเกษตรศาสตร์", faculty: "คณะวิทยาศาสตร์", major: "คณิตศาสตร์", admission_criteria: criteria.science, last_year_stat: { min_score: 48.0914, max_score: 60.5415 } },
        { university: "มหาวิทยาลัยเกษตรศาสตร์", faculty: "คณะวิทยาศาสตร์", major: "เคมี", admission_criteria: criteria.science, last_year_stat: { min_score: 48.0662, max_score: 57.7662 } },
        { university: "มหาวิทยาลัยเกษตรศาสตร์", faculty: "คณะวิทยาศาสตร์", major: "เคมีอุตสาหกรรม", admission_criteria: criteria.science, last_year_stat: { min_score: 46.5331, max_score: 56.0414 } },
        { university: "มหาวิทยาลัยเกษตรศาสตร์", faculty: "คณะวิศวกรรมศาสตร์", major: "วิศวกรรมคอมพิวเตอร์", admission_criteria: criteria.engineering, last_year_stat: { min_score: 57.3275, max_score: 68.6773 } },
        { university: "มหาวิทยาลัยเกษตรศาสตร์", faculty: "คณะวิศวกรรมศาสตร์", major: "วิศวกรรมเคมี", admission_criteria: criteria.engineering, last_year_stat: { min_score: 44.3332, max_score: 50.4998 } },
        { university: "มหาวิทยาลัยเกษตรศาสตร์", faculty: "คณะศึกษาศาสตร์", major: "การสอนภาษาอังกฤษ", admission_criteria: criteria.education, last_year_stat: { min_score: 79.5970, max_score: 82.6944 } },
        { university: "มหาวิทยาลัยเกษตรศาสตร์", faculty: "คณะศึกษาศาสตร์", major: "พาณิชยศาสตรศึกษา (ใช้คะแนน V-NET)", admission_criteria: criteria.education, last_year_stat: { min_score: 58.2400, max_score: 73.2500 } },
        { university: "มหาวิทยาลัยเกษตรศาสตร์", faculty: "คณะสังคมศาสตร์", major: "นิติศาสตรบัณฑิต (ภาคปกติ)", admission_criteria: criteria.poliSciLawWithMath, last_year_stat: { min_score: 53.9541, max_score: 64.0750 } },
        { university: "มหาวิทยาลัยเกษตรศาสตร์", faculty: "คณะสถาปัตยกรรมศาสตร์", major: "สถาปัตยกรรม", admission_criteria: criteria.architecture, last_year_stat: { min_score: 49.5000, max_score: 57.2500 } },
        { university: "มหาวิทยาลัยเกษตรศาสตร์", faculty: "คณะเกษตร", major: "การจัดการศัตรูพืชและสัตว์", admission_criteria: criteria.agroForestryFisheries, last_year_stat: { min_score: 36.1000, max_score: 53.1664 } },
        { university: "มหาวิทยาลัยเกษตรศาสตร์", faculty: "คณะเกษตร", major: "เทคโนโลยีระบบเกษตร", admission_criteria: criteria.agroForestryFisheries, last_year_stat: { min_score: 41.8776, max_score: 57.2442 } },
        { university: "มหาวิทยาลัยเกษตรศาสตร์", faculty: "คณะเกษตร", major: "อาหาร โภชนาการ และการกำหนดอาหาร", admission_criteria: criteria.agroForestryFisheries, last_year_stat: { min_score: 54.2772, max_score: 64.6216 } },
        { university: "มหาวิทยาลัยศิลปากร", faculty: "คณะดุริยางคศาสตร์", major: "ดุริยางคศาสตรบัณฑิต", admission_criteria: criteria.fineArts, last_year_stat: { min_score: 60.00, max_score: 75.00 } },
        // ข้อมูลมหาวิทยาลัยขอนแก่น
        { university: "มหาวิทยาลัยขอนแก่น", faculty: "คณะพยาบาลศาสตร์", major: "พยาบาลศาสตรบัณฑิต", admission_criteria: criteria.healthSciences, last_year_stat: { min_score: 41.9750, max_score: 52.5125 } },
        { university: "มหาวิทยาลัยขอนแก่น", faculty: "คณะวิศวกรรมศาสตร์", major: "วิศวกรรมคอมพิวเตอร์", admission_criteria: criteria.engineering, last_year_stat: { min_score: 45.0666, max_score: 59.2832 } },
        { university: "มหาวิทยาลัยขอนแก่น", faculty: "คณะศึกษาศาสตร์", major: "การสอนภาษาไทย", admission_criteria: criteria.education, last_year_stat: { min_score: 65.8125, max_score: 71.9000 } },
        { university: "มหาวิทยาลัยขอนแก่น", faculty: "คณะเกษตรศาสตร์", major: "เกษตรนวัตกรรม", admission_criteria: criteria.agroForestryFisheries, last_year_stat: { min_score: 30.0319, max_score: 35.4713 } },
        { university: "มหาวิทยาลัยขอนแก่น", faculty: "คณะเกษตรศาสตร์", major: "เศรษฐศาสตร์เกษตร", admission_criteria: criteria.agroForestryFisheries, last_year_stat: { min_score: 30.3621, max_score: 33.4266 } },
        // ข้อมูลมหาวิทยาลัยเชียงใหม่
        { university: "มหาวิทยาลัยเชียงใหม่", faculty: "คณะพยาบาลศาสตร์", major: "พยาบาลศาสตรบัณฑิต", admission_criteria: criteria.healthSciences, last_year_stat: { min_score: 57.3775, max_score: 59.5491 } },
        { university: "มหาวิทยาลัยเชียงใหม่", faculty: "คณะมนุษยศาสตร์", major: "จิตวิทยา (แขนงจิตวิทยาคลินิก)", admission_criteria: criteria.psychologyClinical, last_year_stat: { min_score: 59.9439, max_score: 59.9439 } },
        { university: "มหาวิทยาลัยเชียงใหม่", faculty: "คณะบริหารธุรกิจ", major: "การบัญชีและบริหารธุรกิจ (นานาชาติ)", admission_criteria: criteria.business, last_year_stat: { min_score: 55.4820, max_score: 57.4413 } },
        { university: "มหาวิทยาลัยเชียงใหม่", faculty: "คณะวิจิตรศิลป์", major: "การถ่ายภาพสร้างสรรค์", admission_criteria: criteria.fineArts, last_year_stat: { min_score: 54.5221, max_score: 55.4367 } },
        { university: "มหาวิทยาลัยเชียงใหม่", faculty: "คณะวิทยาศาสตร์", major: "เคมีอุตสาหกรรม", admission_criteria: criteria.science, last_year_stat: { min_score: 51.7130, max_score: 57.7597 } },
        { university: "มหาวิทยาลัยเชียงใหม่", faculty: "คณะเกษตรศาสตร์", major: "เศรษฐศาสตร์เกษตร", admission_criteria: criteria.agroForestryFisheries, last_year_stat: { min_score: 51.9618, max_score: 57.5134 } },
        { university: "มหาวิทยาลัยเชียงใหม่", faculty: "คณะเทคนิคการแพทย์", major: "เทคนิคการแพทย์", admission_criteria: criteria.healthSciences, last_year_stat: { min_score: 57.9653, max_score: 62.6907 } },
        // ข้อมูลมหาวิทยาลัยทักษิณ
        { university: "มหาวิทยาลัยทักษิณ", faculty: "คณะนิติศาสตร์", major: "นิติศาสตรบัณฑิต", admission_criteria: criteria.poliSciLawWithMath, last_year_stat: { min_score: 40.2375, max_score: 54.5000 } },
        // ข้อมูลมหาวิทยาลัยเทคโนโลยีพระจอมเกล้าธนบุรี
        { university: "มหาวิทยาลัยเทคโนโลยีพระจอมเกล้าธนบุรี", faculty: "คณะวิศวกรรมศาสตร์", major: "วิศวกรรมคอมพิวเตอร์", admission_criteria: criteria.engineering, last_year_stat: { min_score: 57.1448, max_score: 57.1448 } },
        // ข้อมูลมหาวิทยาลัยเทคโนโลยีพระจอมเกล้าพระนครเหนือ
        { university: "มหาวิทยาลัยเทคโนโลยีพระจอมเกล้าพระนครเหนือ", faculty: "คณะวิศวกรรมศาสตร์", major: "วิศวกรรมคอมพิวเตอร์", admission_criteria: criteria.engineering, last_year_stat: { min_score: 69.1998, max_score: 73.7328 } },
        // ข้อมูลมหาวิทยาลัยเทคโนโลยีมหานคร
        { university: "มหาวิทยาลัยเทคโนโลยีมหานคร", faculty: "คณะวิศวกรรมศาสตร์และเทคโนโลยี", major: "วิศวกรรมไฟฟ้า", admission_criteria: criteria.engineering, last_year_stat: { min_score: 0.0000, max_score: 0.0000 } },
        { university: "มหาวิทยาลัยเทคโนโลยีมหานคร", faculty: "คณะสัตวแพทยศาสตร์", major: "สัตวแพทยศาสตรบัณฑิต", admission_criteria: criteria.gpat, last_year_stat: { min_score: 41.5000, max_score: 49.5000 } },
        // ข้อมูลมหาวิทยาลัยเทคโนโลยีราชมงคลตะวันออก
        { university: "มหาวิทยาลัยเทคโนโลยีราชมงคลตะวันออก", faculty: "วิทยาเขตจักรพงษภูวนารถ", major: "บริหารธุรกิจบัณฑิต", admission_criteria: criteria.businessGeneral, last_year_stat: { min_score: 83.7500, max_score: 83.7500 } },
        // ข้อมูลมหาวิทยาลัยเทคโนโลยีราชมงคลพระนคร
        { university: "มหาวิทยาลัยเทคโนโลยีราชมงคลพระนคร", faculty: "คณะเทคโนโลยีสื่อสารมวลชน", major: "เทคโนโลยีมัลติมีเดีย", admission_criteria: criteria.multimediaTech, last_year_stat: { min_score: 0.0000, max_score: 0.0000 } },
        // ข้อมูลมหาวิทยาลัยเทคโนโลยีราชมงคลรัตนโกสินทร์
        { university: "มหาวิทยาลัยเทคโนโลยีราชมงคลรัตนโกสินทร์", faculty: "วิทยาลัยเพาะช่าง", major: "ศิลปบัณฑิต", admission_criteria: criteria.fineArts, last_year_stat: { min_score: 0.0000, max_score: 0.0000 } },
        // ข้อมูลมหาวิทยาลัยเทคโนโลยีราชมงคลศรีวิชัย
        { university: "มหาวิทยาลัยเทคโนโลยีราชมงคลศรีวิชัย", faculty: "คณะบริหารธุรกิจ", major: "การจัดการ", admission_criteria: criteria.businessGeneral, last_year_stat: { min_score: 0.0000, max_score: 0.0000 } },
        // ข้อมูลมหาวิทยาลัยเทคโนโลยีราชมงคลอีสาน
        { university: "มหาวิทยาลัยเทคโนโลยีราชมงคลอีสาน", faculty: "คณะบริหารธุรกิจ", major: "การจัดการ", admission_criteria: criteria.businessGeneral, last_year_stat: { min_score: 0.0000, max_score: 0.0000 } },
        { university: "มหาวิทยาลัยเทคโนโลยีราชมงคลอีสาน", faculty: "คณะวิทยาศาสตร์และศิลปศาสตร์", major: "ชีววิทยาประยุกต์", admission_criteria: criteria.science, last_year_stat: { min_score: 0.0000, max_score: 0.0000 } },
        { university: "มหาวิทยาลัยเทคโนโลยีราชมงคลอีสาน", faculty: "คณะวิทยาศาสตร์และศิลปศาสตร์", major: "ฟิสิกส์", admission_criteria: criteria.science, last_year_stat: { min_score: 0.0000, max_score: 0.0000 } },
        { university: "มหาวิทยาลัยเทคโนโลยีราชมงคลอีสาน", faculty: "คณะวิทยาศาสตร์และศิลปศาสตร์", major: "สถิติประยุกต์", admission_criteria: criteria.science, last_year_stat: { min_score: 0.0000, max_score: 0.0000 } },
        { university: "มหาวิทยาลัยเทคโนโลยีราชมงคลอีสาน", faculty: "คณะวิทยาศาสตร์และศิลปศาสตร์", major: "เคมี", admission_criteria: criteria.science, last_year_stat: { min_score: 0.0000, max_score: 0.0000 } },
        // ข้อมูลมหาวิทยาลัยเทคโนโลยีสุรนารี
        { university: "มหาวิทยาลัยเทคโนโลยีสุรนารี", faculty: "สำนักวิชาทันตแพทยศาสตร์", major: "ทันตแพทยศาสตรบัณฑิต", admission_criteria: criteria.gpat, last_year_stat: { min_score: 58.5000, max_score: 65.5000 } },
        { university: "มหาวิทยาลัยเทคโนโลยีสุรนารี", faculty: "สำนักวิชาเทคโนโลยีการเกษตร", major: "วิทยาศาสตรบัณฑิต", admission_criteria: criteria.science, last_year_stat: { min_score: 20.5000, max_score: 30.5000 } },
        { university: "มหาวิทยาลัยเทคโนโลยีสุรนารี", faculty: "สำนักวิชาแพทยศาสตร์", major: "แพทยศาสตรบัณฑิต", admission_criteria: criteria.gpat, last_year_stat: { min_score: 61.5000, max_score: 68.5000 } },
        { university: "มหาวิทยาลัยเทคโนโลยีสุรนารี", faculty: "สำนักวิชาวิศวกรรมศาสตร์", major: "วิศวกรรมคอมพิวเตอร์", admission_criteria: criteria.engineering, last_year_stat: { min_score: 48.0000, max_score: 61.2500 } },
        { university: "มหาวิทยาลัยเทคโนโลยีสุรนารี", faculty: "สำนักวิชาวิศวกรรมศาสตร์", major: "วิศวกรรมศาสตรบัณฑิต", admission_criteria: criteria.engineering, last_year_stat: { min_score: 30.5000, max_score: 40.5000 } },
        { university: "มหาวิทยาลัยเทคโนโลยีสุรนารี", faculty: "สำนักวิชาสาธารณสุขศาสตร์", major: "สาธารณสุขศาสตรบัณฑิต", admission_criteria: criteria.healthSciences, last_year_stat: { min_score: 40.5000, max_score: 47.5000 } },
        // ข้อมูลมหาวิทยาลัยธรรมศาสตร์
        { university: "มหาวิทยาลัยธรรมศาสตร์", faculty: "คณะนิติศาสตร์", major: "นิติศาสตรบัณฑิต", admission_criteria: criteria.poliSciLawWithMath, last_year_stat: { min_score: 75.3889, max_score: 93.3611 } },
        // ข้อมูลมหาวิทยาลัยธุรกิจบัณฑิตย์
        { university: "มหาวิทยาลัยธุรกิจบัณฑิตย์", faculty: "คณะนิเทศศาสตร์", major: "ภาพยนตร์และสื่อดิจิทัล", admission_criteria: criteria.communicationArts, last_year_stat: { min_score: 28.0000, max_score: 92.5000 } },
        // ข้อมูลมหาวิทยาลัยบูรพา
        { university: "มหาวิทยาลัยบูรพา", faculty: "คณะพยาบาลศาสตร์", major: "พยาบาลศาสตรบัณฑิต", admission_criteria: criteria.healthSciences, last_year_stat: { min_score: 50.5000, max_score: 58.0000 } },
        { university: "มหาวิทยาลัยบูรพา", faculty: "คณะพยาบาลศาสตร์", major: "พยาบาลศาสตรบัณฑิต (นานาชาติ)", admission_criteria: criteria.healthSciences, last_year_stat: { min_score: 43.5000, max_score: 57.5000 } },
        { university: "มหาวิทยาลัยบูรพา", faculty: "คณะมนุษยศาสตร์และสังคมศาสตร์", major: "ภาษาเกาหลี", admission_criteria: createLangCriteria('A-Level_เกาหลี'), last_year_stat: { min_score: 71.2500, max_score: 79.9358 } },
        // ข้อมูลมหาวิทยาลัยพะเยา
        { university: "มหาวิทยาลัยพะเยา", faculty: "คณะนิติศาสตร์", major: "นิติศาสตรบัณฑิต", admission_criteria: criteria.poliSciLawWithMath, last_year_stat: { min_score: 31.5000, max_score: 48.0000 } },
        { university: "มหาวิทยาลัยพะเยา", faculty: "คณะบริหารธุรกิจและนิเทศศาสตร์", major: "การบัญชีบัณฑิต", admission_criteria: criteria.business, last_year_stat: { min_score: 30.8332, max_score: 52.5000 } },
        { university: "มหาวิทยาลัยพะเยา", faculty: "คณะพยาบาลศาสตร์", major: "พยาบาลศาสตรบัณฑิต", admission_criteria: criteria.healthSciences, last_year_stat: { min_score: 45.0000, max_score: 52.0000 } },
        { university: "มหาวิทยาลัยพะเยา", faculty: "คณะเภสัชศาสตร์", major: "การบริบาลทางเภสัชกรรม", admission_criteria: criteria.gpat, last_year_stat: { min_score: 48.2500, max_score: 54.1665 } },
        { university: "มหาวิทยาลัยพะเยา", faculty: "คณะรัฐศาสตร์และสังคมศาสตร์", major: "รัฐศาสตรบัณฑิต", admission_criteria: createLangCriteria, last_year_stat: { min_score: 29.5000, max_score: 46.5000 } },
        { university: "มหาวิทยาลัยพะเยา", faculty: "คณะวิทยาศาสตร์", major: "เคมี", admission_criteria: criteria.science, last_year_stat: { min_score: 27.5000, max_score: 35.5000 } },
        { university: "มหาวิทยาลัยพะเยา", faculty: "คณะวิทยาศาสตร์การแพทย์", major: "กายภาพบำบัด", admission_criteria: criteria.healthSciences, last_year_stat: { min_score: 43.1250, max_score: 48.0000 } },
        { university: "มหาวิทยาลัยพะเยา", faculty: "คณะวิศวกรรมศาสตร์", major: "วิศวกรรมโยธา", admission_criteria: criteria.engineering, last_year_stat: { min_score: 26.5000, max_score: 42.5000 } },
        { university: "มหาวิทยาลัยพะเยา", faculty: "คณะศิลปกรรมศาสตร์", major: "ศิลปะการแสดง (แขนงนาฏศิลป์ไทย)", admission_criteria: criteria.fineArts, last_year_stat: { min_score: 55.2500, max_score: 62.5000 } },
        { university: "มหาวิทยาลัยพะเยา", faculty: "คณะสหเวชศาสตร์", major: "เทคนิคการแพทย์", admission_criteria: criteria.healthSciences, last_year_stat: { min_score: 47.5000, max_score: 52.5000 } },
        { university: "มหาวิทยาลัยพะเยา", faculty: "คณะสถาปัตยกรรมศาสตร์และศิลปกรรมศาสตร์", major: "สถาปัตยกรรม", admission_criteria: criteria.architecture, last_year_stat: { min_score: 29.5000, max_score: 45.5000 } },
        { university: "มหาวิทยาลัยพะเยา", faculty: "คณะเกษตรศาสตร์และทรัพยากรธรรมชาติ", major: "วิทยาศาสตร์และเทคโนโลยีการอาหาร", admission_criteria: criteria.science, last_year_stat: { min_score: 28.6000, max_score: 48.7500 } },
        { university: "มหาวิทยาลัยพะเยา", faculty: "คณะเทคโนโลยีสารสนเทศและการสื่อสาร", major: "วิศวกรรมคอมพิวเตอร์", admission_criteria: criteria.engineering, last_year_stat: { min_score: 30.5000, max_score: 43.1250 } },
        // ข้อมูลมหาวิทยาลัยพายัพ
        { university: "มหาวิทยาลัยพายัพ", faculty: "คณะบริหารธุรกิจ", major: "การจัดการโรงแรมและการท่องเที่ยว", admission_criteria: criteria.tourismAndHospitality, last_year_stat: { min_score: 0.0000, max_score: 86.5000 } },
        // ข้อมูลมหาวิทยาลัยมหาสารคาม
        { university: "มหาวิทยาลัยมหาสารคาม", faculty: "คณะพยาบาลศาสตร์", major: "พยาบาลศาสตรบัณฑิต", admission_criteria: criteria.healthSciences, last_year_stat: { min_score: 49.5000, max_score: 56.5000 } },
        { university: "มหาวิทยาลัยมหาสารคาม", faculty: "คณะศึกษาศาสตร์", major: "การประถมศึกษา", admission_criteria: criteria.education, last_year_stat: { min_score: 64.0000, max_score: 71.0000 } },
        // ข้อมูลมหาวิทยาลัยมหิดล
        { university: "มหาวิทยาลัยมหิดล", faculty: "คณะกายภาพบำบัด", major: "กายภาพบำบัด", admission_criteria: criteria.healthSciences, last_year_stat: { min_score: 50.0000, max_score: 60.0000 } },
        { university: "มหาวิทยาลัยมหิดล", faculty: "คณะทันตแพทยศาสตร์", major: "ทันตแพทยศาสตรบัณฑิต", admission_criteria: criteria.gpat, last_year_stat: { min_score: 61.5000, max_score: 68.0000 } },
        { university: "มหาวิทยาลัยมหิดล", faculty: "คณะเทคนิคการแพทย์", major: "เทคนิคการแพทย์", admission_criteria: criteria.healthSciences, last_year_stat: { min_score: 52.0000, max_score: 62.0000 } },
        { university: "มหาวิทยาลัยมหิดล", faculty: "คณะเทคโนโลยีสารสนเทศและการสื่อสาร", major: "วิทยาศาสตรบัณฑิต", admission_criteria: criteria.engineering, last_year_stat: { min_score: 40.0000, max_score: 50.0000 } },
        { university: "มหาวิทยาลัยมหิดล", faculty: "คณะพยาบาลศาสตร์", major: "พยาบาลศาสตรบัณฑิต", admission_criteria: criteria.healthSciences, last_year_stat: { min_score: 50.0000, max_score: 60.0000 } },
        { university: "มหาวิทยาลัยมหิดล", faculty: "คณะแพทยศาสตร์โรงพยาบาลรามาธิบดี", major: "พยาบาลศาสตรบัณฑิต", admission_criteria: criteria.healthSciences, last_year_stat: { min_score: 51.0832, max_score: 57.0832 } },
        { university: "มหาวิทยาลัยมหิดล", faculty: "คณะแพทยศาสตร์ศิริราชพยาบาล", major: "การแพทย์แผนไทยประยุกต์บัณฑิต", admission_criteria: criteria.gpat, last_year_stat: { min_score: 57.8008, max_score: 66.4013 } },
        { university: "มหาวิทยาลัยมหิดล", faculty: "คณะเภสัชศาสตร์", major: "เภสัชศาสตรบัณฑิต", admission_criteria: criteria.gpat, last_year_stat: { min_score: 53.0000, max_score: 60.0000 } },
        { university: "มหาวิทยาลัยมหิดล", faculty: "คณะวิทยาศาสตร์", major: "วิทยาศาสตร์", admission_criteria: criteria.science, last_year_stat: { min_score: 35.0000, max_score: 45.0000 } },
        { university: "มหาวิทยาลัยมหิดล", faculty: "คณะวิศวกรรมศาสตร์", major: "วิศวกรรมศาสตรบัณฑิต", admission_criteria: criteria.engineering, last_year_stat: { min_score: 40.0000, max_score: 50.0000 } },
        { university: "มหาวิทยาลัยมหิดล", faculty: "คณะสัตวแพทยศาสตร์", major: "สัตวแพทยศาสตรบัณฑิต", admission_criteria: criteria.gpat, last_year_stat: { min_score: 50.0000, max_score: 60.0000 } },
        { university: "มหาวิทยาลัยมหิดล", faculty: "คณะสังคมศาสตร์และมนุษยศาสตร์", major: "ศิลปศาสตรบัณฑิต", admission_criteria: criteria.artsWithMath, last_year_stat: { min_score: 45.0000, max_score: 55.0000 } },
        { university: "มหาวิทยาลัยมหิดล", faculty: "คณะสาธารณสุขศาสตร์", major: "สาธารณสุขศาสตรบัณฑิต", admission_criteria: criteria.healthSciences, last_year_stat: { min_score: 45.0000, max_score: 55.0000 } },
        { university: "มหาวิทยาลัยมหิดล", faculty: "คณะสิ่งแวดล้อมและทรัพยากรศาสตร์", major: "วิทยาศาสตร์และเทคโนโลยีสิ่งแวดล้อม", admission_criteria: criteria.science, last_year_stat: { min_score: 35.0000, max_score: 45.0000 } },
        { university: "มหาวิทยาลัยมหิดล", faculty: "วิทยาเขตกาญจนบุรี", major: "วิทยาศาสตรบัณฑิต", admission_criteria: criteria.science, last_year_stat: { min_score: 30.0000, max_score: 40.0000 } },
        { university: "มหาวิทยาลัยมหิดล", faculty: "วิทยาเขตนครสวรรค์", major: "สาธารณสุขศาสตรบัณฑิต", admission_criteria: criteria.healthSciences, last_year_stat: { min_score: 35.0000, max_score: 45.0000 } },
        { university: "มหาวิทยาลัยมหิดล", faculty: "วิทยาเขตอำนาจเจริญ", major: "สาธารณสุขศาสตรบัณฑิต", admission_criteria: criteria.healthSciences, last_year_stat: { min_score: 35.0000, max_score: 45.0000 } },
        { university: "มหาวิทยาลัยมหิดล", faculty: "วิทยาลัยนานาชาติ", major: "บริหารธุรกิจบัณฑิต",admission_criteria: criteria.businessGeneral, last_year_stat: { min_score: 45.0000, max_score: 55.0000 } },
        { university: "มหาวิทยาลัยมหิดล", faculty: "วิทยาลัยราชสุดา", major: "ศิลปศาสตรบัณฑิต", admission_criteria: criteria.artsWithMath, last_year_stat: { min_score: 40.0000, max_score: 50.0000 } },
        // ข้อมูลมหาวิทยาลัยแม่โจ้
        { university: "มหาวิทยาลัยแม่โจ้", faculty: "คณะบริหารธุรกิจ", major: "การบัญชี", admission_criteria: criteria.business, last_year_stat: { min_score: 65.1110, max_score: 80.0415 } },
        // ข้อมูลมหาวิทยาลัยแม่โจ้-ชุมพร
        { university: "มหาวิทยาลัยแม่โจ้-ชุมพร", faculty: "คณะเทคโนโลยีการประมงและทรัพยากรทางน้ำ", major: "การประมง", admission_criteria: criteria.agroForestryFisheries, last_year_stat: { min_score: 0.0000, max_score: 87.2500 } },
        // ข้อมูลมหาวิทยาลัยแม่โจ้-แพร่
        { university: "มหาวิทยาลัยแม่โจ้-แพร่", faculty: "คณะสัตวศาสตร์และเทคโนโลยี", major: "สัตวศาสตร์", admission_criteria: criteria.agroForestryFisheries, last_year_stat: { min_score: 0.0000, max_score: 94.5000 } },
        // ข้อมูลมหาวิทยาลัยแม่ฟ้าหลวง
        { university: "มหาวิทยาลัยแม่ฟ้าหลวง", faculty: "สำนักวิชานวัตกรรมสังคม", major: "การพัฒนาระหว่างประเทศ (นานาชาติ)", admission_criteria: criteria.socialInnovationIntl, last_year_stat: { min_score: 46.8476, max_score: 49.2015 } },
        { university: "มหาวิทยาลัยแม่ฟ้าหลวง", faculty: "สำนักวิชานิติศาสตร์", major: "นิติศาสตรบัณฑิต", admission_criteria: criteria.poliSciLawWithMath, last_year_stat: { min_score: 52.8416, max_score: 60.0311 } },
        { university: "มหาวิทยาลัยแม่ฟ้าหลวง", faculty: "สำนักวิชาพยาบาลศาสตร์", major: "พยาบาลศาสตรบัณฑิต", admission_criteria: criteria.healthSciences, last_year_stat: { min_score: 46.5000, max_score: 53.5000 } },
        { university: "มหาวิทยาลัยแม่ฟ้าหลวง", faculty: "สำนักวิชาวิทยาศาสตร์เครื่องสำอาง", major: "วิทยาศาสตร์เครื่องสำอาง", admission_criteria: criteria.science, last_year_stat: { min_score: 49.6664, max_score: 58.0832 } },
        { university: "มหาวิทยาลัยแม่ฟ้าหลวง", faculty: "สำนักวิชาวิทยาศาสตร์สุขภาพ", major: "สาธารณสุขศาสตรบัณฑิต", admission_criteria: criteria.healthSciences, last_year_stat: { min_score: 40.5000, max_score: 47.5000 } },
        { university: "มหาวิทยาลัยแม่ฟ้าหลวง", faculty: "สำนักวิชาศิลปศาสตร์", major: "ภาษาอังกฤษ", admission_criteria: createLangCriteria('A-Level_อังกฤษ'), last_year_stat: { min_score: 58.1664, max_score: 66.8332 } },
        { university: "มหาวิทยาลัยแม่ฟ้าหลวง", faculty: "สำนักวิชาการจัดการ", major: "การจัดการธุรกิจการบิน (นานาชาติ)", admission_criteria: criteria.tourismAndHospitality, last_year_stat: { min_score: 51.5623, max_score: 59.8164 } },
        { university: "มหาวิทยาลัยแม่ฟ้าหลวง", faculty: "สำนักวิชาการจัดการ", major: "บริหารธุรกิจ", admission_criteria: criteria.businessGeneral, last_year_stat: { min_score: 41.8750, max_score: 51.5832 } },
        // ข้อมูลมหาวิทยาลัยรังสิต
        { university: "มหาวิทยาลัยรังสิต", faculty: "คณะพยาบาลศาสตร์", major: "พยาบาลศาสตรบัณฑิต", admission_criteria: criteria.healthSciences, last_year_stat: { min_score: 41.5000, max_score: 48.2500 } },
        // ข้อมูลมหาวิทยาลัยราชภัฏชัยภูมิ
        { university: "มหาวิทยาลัยราชภัฏชัยภูมิ", faculty: "คณะพยาบาลศาสตร์", major: "พยาบาลศาสตรบัณฑิต", admission_criteria: criteria.healthSciences, last_year_stat: { min_score: 45.6250, max_score: 53.0000 } },
        // ข้อมูลมหาวิทยาลัยราชภัฏบ้านสมเด็จเจ้าพระยา
        { university: "มหาวิทยาลัยราชภัฏบ้านสมเด็จเจ้าพระยา", faculty: "คณะวิทยาศาสตร์และเทคโนโลยี", major: "เทคโนโลยีสารสนเทศและนวัตกรรมดิจิทัล", admission_criteria: criteria.science, last_year_stat: { min_score: 0.0000, max_score: 0.0000 } },
        // ข้อมูลมหาวิทยาลัยราชพฤกษ์
        { university: "มหาวิทยาลัยราชพฤกษ์", faculty: "คณะบริหารธุรกิจ", major: "การจัดการธุรกิจยุคดิจิทัล", admission_criteria: criteria.digitalBusiness, last_year_stat: { min_score: 24.9500, max_score: 41.0750 } },
        { university: "มหาวิทยาลัยราชพฤกษ์", faculty: "คณะบริหารธุรกิจ", major: "การจัดการโลจิสติกส์", admission_criteria: criteria.logisticsManagement, last_year_stat: { min_score: 14.2250, max_score: 14.2250 } },
        { university: "มหาวิทยาลัยราชพฤกษ์", faculty: "คณะบริหารธุรกิจ", major: "การตลาดดิจิทัล", admission_criteria: criteria.businessGeneral, last_year_stat: { min_score: 24.9250, max_score: 24.9250 } },
        { university: "มหาวิทยาลัยราชพฤกษ์", faculty: "คณะบริหารธุรกิจ", major: "การบริหารธุรกิจ", admission_criteria: criteria.businessGeneral, last_year_stat: { min_score: 0.0000, max_score: 0.0000 } },
        { university: "มหาวิทยาลัยราชพฤกษ์", faculty: "คณะบริหารธุรกิจ", major: "อุตสาหกรรมท่องเที่ยว", admission_criteria: criteria.tourismAndHospitality, last_year_stat: { min_score: 0.0000, max_score: 0.0000 } },
        { university: "มหาวิทยาลัยราชพฤกษ์", faculty: "คณะบัญชี", major: "การบัญชี", admission_criteria: criteria.business, last_year_stat: { min_score: 14.3750, max_score: 34.5000 } },
        { university: "มหาวิทยาลัยราชพฤกษ์", faculty: "คณะนิเทศศาสตร์", major: "คอนเทนต์การโฆษณาและการประชาสัมพันธ์", admission_criteria: criteria.communicationArts, last_year_stat: { min_score: 0.0000, max_score: 0.0000 } },
        { university: "มหาวิทยาลัยราชพฤกษ์", faculty: "คณะสาธารณสุขศาสตร์", major: "สาธารณสุขศาสตร์", admission_criteria: criteria.healthSciences, last_year_stat: { min_score: 22.6000, max_score: 22.6000 } },
        { university: "มหาวิทยาลัยราชพฤกษ์", faculty: "คณะเทคโนโลยีดิจิทัล", major: "เทคโนโลยีดิจิทัลเพื่อธุรกิจ", admission_criteria: criteria.digitalBusiness, last_year_stat: { min_score: 0.0000, max_score: 0.0000 } },
        // ข้อมูลมหาวิทยาลัยวลัยลักษณ์
        { university: "มหาวิทยาลัยวลัยลักษณ์", faculty: "สำนักวิชาพยาบาลศาสตร์", major: "พยาบาลศาสตรบัณฑิต", admission_criteria: criteria.healthSciences, last_year_stat: { min_score: 45.5000, max_score: 52.5000 } },
        // ข้อมูลมหาวิทยาลัยศรีนครินทรวิโรฒ
        { university: "มหาวิทยาลัยศรีนครินทรวิโรฒ", faculty: "คณะพลศึกษา", major: "สาธารณสุขศาสตรบัณฑิต", admission_criteria: criteria.healthSciences, last_year_stat: { min_score: 45.4165, max_score: 57.7220 } },
        { university: "มหาวิทยาลัยศรีนครินทรวิโรฒ", faculty: "คณะพยาบาลศาสตร์", major: "พยาบาลศาสตรบัณฑิต", admission_criteria: criteria.healthSciences, last_year_stat: { min_score: 51.2722, max_score: 58.0832 } },
        // ข้อมูลมหาวิทยาลัยศรีปทุม
        { university: "มหาวิทยาลัยศรีปทุม", faculty: "คณะนิเทศศาสตร์", major: "สื่อสารการแสดง", admission_criteria: criteria.communicationArts, last_year_stat: { min_score: 77.5000, max_score: 84.0000 } },
        // ข้อมูลมหาวิทยาลัยศิลปากร
        { university: "มหาวิทยาลัยศิลปากร", faculty: "คณะสัตวศาสตร์และเทคโนโลยีการเกษตร", major: "สัตวศาสตร์และเทคโนโลยีการเกษตร", admission_criteria: criteria.agroForestryFisheries, last_year_stat: { min_score: 31.8750, max_score: 51.6250 } },
        { university: "มหาวิทยาลัยศิลปากร", faculty: "คณะศึกษาศาสตร์", major: "การประถมศึกษา", admission_criteria: criteria.education, last_year_stat: { min_score: 64.6664, max_score: 69.2500 } },
        // ข้อมูลมหาวิทยาลัยสงขลานครินทร์
        { university: "มหาวิทยาลัยสงขลานครินทร์", faculty: "คณะการจัดการสิ่งแวดล้อม", major: "วิทยาศาสตรบัณฑิต", admission_criteria: criteria.agroForestryFisheries, last_year_stat: { min_score: 30.0000, max_score: 40.0000 } },
        { university: "มหาวิทยาลัยสงขลานครินทร์", faculty: "คณะทรัพยากรธรรมชาติ", major: "วิทยาศาสตรบัณฑิต", admission_criteria: criteria.science, last_year_stat: { min_score: 20.0000, max_score: 30.0000 } },
        { university: "มหาวิทยาลัยสงขลานครินทร์", faculty: "คณะนิติศาสตร์", major: "นิติศาสตรบัณฑิต", admission_criteria: criteria.poliSciLawWithMath, last_year_stat: { min_score: 40.0000, max_score: 50.0000 } },
        { university: "มหาวิทยาลัยสงขลานครินทร์", faculty: "คณะพยาบาลศาสตร์", major: "พยาบาลศาสตรบัณฑิต", admission_criteria: criteria.healthSciences, last_year_stat: { min_score: 51.0000, max_score: 58.5000 } },
        { university: "มหาวิทยาลัยสงขลานครินทร์", faculty: "คณะเภสัชศาสตร์", major: "เภสัชศาสตรบัณฑิต", admission_criteria: criteria.gpat, last_year_stat: { min_score: 50.0000, max_score: 60.0000 } },
        { university: "มหาวิทยาลัยสงขลานครินทร์", faculty: "คณะรัฐศาสตร์", major: "รัฐศาสตรบัณฑิต", admission_criteria: createLangCriteria, last_year_stat: { min_score: 40.0000, max_score: 50.0000 } },
        { university: "มหาวิทยาลัยสงขลานครินทร์", faculty: "คณะวิทยาการจัดการ", major: "บัญชีบัณฑิต", admission_criteria: criteria.business, last_year_stat: { min_score: 57.0000, max_score: 67.8240 } },
        { university: "มหาวิทยาลัยสงขลานครินทร์", faculty: "คณะวิทยาการจัดการ", major: "บริหารธุรกิจบัณฑิต", admission_criteria: criteria.businessGeneral, last_year_stat: { min_score: 35.0000, max_score: 45.0000 } },
        { university: "มหาวิทยาลัยสงขลานครินทร์", faculty: "คณะวิทยาการสื่อสาร", major: "นิเทศศาสตรบัณฑิต", admission_criteria: criteria.communicationArts, last_year_stat: { min_score: 40.0000, max_score: 50.0000 } },
        { university: "มหาวิทยาลัยสงขลานครินทร์", faculty: "คณะวิทยาศาสตร์", major: "วิทยาศาสตรบัณฑิต", admission_criteria: criteria.science, last_year_stat: { min_score: 25.0000, max_score: 35.0000 } },
        { university: "มหาวิทยาลัยสงขลานครินทร์", faculty: "คณะวิศวกรรมศาสตร์", major: "วิศวกรรมคอมพิวเตอร์", admission_criteria: criteria.engineering, last_year_stat: { min_score: 49.3744, max_score: 56.8916 } },
        { university: "มหาวิทยาลัยสงขลานครินทร์", faculty: "คณะวิศวกรรมศาสตร์", major: "วิศวกรรมศาสตรบัณฑิต", admission_criteria: criteria.engineering, last_year_stat: { min_score: 30.0000, max_score: 40.0000 } },
        { university: "มหาวิทยาลัยสงขลานครินทร์", faculty: "คณะศิลปศาสตร์", major: "ศิลปศาสตรบัณฑิต", admission_criteria: criteria.artsWithMath, last_year_stat: { min_score: 30.0000, max_score: 40.0000 } },
        { university: "มหาวิทยาลัยสงขลานครินทร์", faculty: "คณะเศรษฐศาสตร์", major: "เศรษฐศาสตรบัณฑิต", admission_criteria: criteria.economics, last_year_stat: { min_score: 30.0000, max_score: 40.0000 } },
        { university: "มหาวิทยาลัยสงขลานครินทร์", faculty: "คณะอุตสาหกรรมเกษตร", major: "วิทยาศาสตรบัณฑิต", admission_criteria: criteria.science, last_year_stat: { min_score: 25.0000, max_score: 35.0000 } },
        { university: "มหาวิทยาลัยสงขลานครินทร์", faculty: "คณะเทคนิคการแพทย์", major: "เทคนิคการแพทย์", admission_criteria: criteria.healthSciences, last_year_stat: { min_score: 50.0000, max_score: 60.0000 } },
        { university: "มหาวิทยาลัยสงขลานครินทร์", faculty: "วิทยาเขตตรัง", major: "สถาปัตยกรรมศาสตรบัณฑิต", admission_criteria: criteria.architecture, last_year_stat: { min_score: 30.0000, max_score: 40.0000 } },
        { university: "มหาวิทยาลัยสงขลานครินทร์", faculty: "วิทยาเขตปัตตานี", major: "ศึกษาศาสตรบัณฑิต", admission_criteria: criteria.education, last_year_stat: { min_score: 50.0000, max_score: 60.0000 } },
        { university: "มหาวิทยาลัยสงขลานครินทร์", faculty: "วิทยาเขตภูเก็ต", major: "บริหารธุรกิจบัณฑิต", admission_criteria: criteria.businessGeneral, last_year_stat: { min_score: 40.0000, max_score: 50.0000 } },
        { university: "มหาวิทยาลัยสงขลานครินทร์", faculty: "วิทยาเขตสุราษฎร์ธานี", major: "ศิลปศาสตรบัณฑิต", admission_criteria: criteria.artsWithMath, last_year_stat: { min_score: 40.0000, max_score: 50.0000 } },
        { university: "มหาวิทยาลัยสงขลานครินทร์", faculty: "วิทยาลัยนานาชาติ", major: "ศิลปศาสตรบัณฑิต", admission_criteria: criteria.artsWithMath, last_year_stat: { min_score: 40.0000, max_score: 50.0000 } },
        // ข้อมูลมหาวิทยาลัยอัสสัมชัญ
        { university: "มหาวิทยาลัยอัสสัมชัญ", faculty: "คณะบริหารธุรกิจและเศรษฐศาสตร์", major: "การตลาดดิจิทัล", admission_criteria: criteria.businessGeneral, last_year_stat: { min_score: 55.2500, max_score: 91.0000 } },
        // ข้อมูลมหาวิทยาลัยอุบลราชธานี
        { university: "มหาวิทยาลัยอุบลราชธานี", faculty: "คณะพยาบาลศาสตร์", major: "พยาบาลศาสตรบัณฑิต", admission_criteria: criteria.healthSciences, last_year_stat: { min_score: 48.0000, max_score: 55.0000 } },
        // ข้อมูลมหาวิทยาลัยเอเชียอาคเนย์
        { university: "มหาวิทยาลัยเอเชียอาคเนย์", faculty: "คณะศิลปศาสตร์และวิทยาศาสตร์", major: "การจัดการโลจิสติกส์และโซ่อุปทาน", admission_criteria: criteria.science, last_year_stat: { min_score: 0.0000, max_score: 0.0000 } },
        // ข้อมูลมหาวิทยาลัยเวสเทิร์น
        { university: "มหาวิทยาลัยเวสเทิร์น", faculty: "คณะพยาบาลศาสตร์", major: "พยาบาลศาสตรบัณฑิต", admission_criteria: criteria.healthSciences, last_year_stat: { min_score: 34.2500, max_score: 48.0000 } },
        // ข้อมูลมหาวิทยาลัยหัวเฉียวเฉลิมพระเกียรติ
        { university: "มหาวิทยาลัยหัวเฉียวเฉลิมพระเกียรติ", faculty: "คณะพยาบาลศาสตร์", major: "พยาบาลศาสตรบัณฑิต", admission_criteria: criteria.healthSciences, last_year_stat: { min_score: 47.5000, max_score: 56.5000 } },
        // ข้อมูลราชวิทยาลัยจุฬาภรณ์
        { university: "ราชวิทยาลัยจุฬาภรณ์", faculty: "คณะทันตแพทยศาสตร์", major: "ทันตแพทยศาสตรบัณฑิต", admission_criteria: criteria.gpat, last_year_stat: { min_score: 58.0000, max_score: 62.0000 } },
        { university: "ราชวิทยาลัยจุฬาภรณ์", faculty: "คณะเทคโนโลยีวิทยาศาสตร์สุขภาพ", major: "รังสีเทคนิค", admission_criteria: criteria.healthSciences, last_year_stat: { min_score: 39.5000, max_score: 47.0000 } },
        { university: "ราชวิทยาลัยจุฬาภรณ์", faculty: "คณะพยาบาลศาสตร์", major: "พยาบาลศาสตรบัณฑิต", admission_criteria: criteria.healthSciences, last_year_stat: { min_score: 54.4820, max_score: 57.4413 } },
        // ข้อมูลโรงเรียนนายร้อยตำรวจ
        { university: "โรงเรียนนายร้อยตำรวจ", faculty: "ส่วนกลาง", major: "รัฐประศาสนศาสตรบัณฑิต", admission_criteria: criteria.poliSciLawWithMath, last_year_stat: { min_score: 64.5000, max_score: 83.5000 } },
        // ข้อมูลโรงเรียนนายร้อยพระจุลจอมเกล้า
        { university: "โรงเรียนนายร้อยพระจุลจอมเกล้า", faculty: "ส่วนกลาง", major: "วิศวกรรมศาสตรบัณฑิต", admission_criteria: criteria.engineering, last_year_stat: { min_score: 0.0000, max_score: 0.0000 } },
        // ข้อมูลโรงเรียนนายเรือ
        { university: "โรงเรียนนายเรือ", faculty: "ส่วนกลาง", major: "วิศวกรรมศาสตรบัณฑิต", admission_criteria: criteria.engineering, last_year_stat: { min_score: 0.0000, max_score: 0.0000 } },
        // ข้อมูลโรงเรียนนายเรืออากาศนวมินทกษัตริยาธิราช
        { university: "โรงเรียนนายเรืออากาศนวมินทกษัตริยาธิราช", faculty: "ส่วนกลาง", major: "วิศวกรรมศาสตรบัณฑิต", admission_criteria: criteria.engineering, last_year_stat: { min_score: 0.0000, max_score: 0.0000 } },
        // ข้อมูลวิทยาลัยดุสิตธานี
        { university: "วิทยาลัยดุสิตธานี", faculty: "คณะอุตสาหกรรมบริการ", major: "ศิลปะการประกอบอาหารอย่างยั่งยืน", admission_criteria: criteria.tourismAndHospitality, last_year_stat: { min_score: 36.5250, max_score: 41.5000 } },
        // ข้อมูลวิทยาลัยเซนต์หลุยส์
        { university: "วิทยาลัยเซนต์หลุยส์", faculty: "คณะกายภาพบำบัด", major: "กายภาพบำบัด", admission_criteria: criteria.healthSciences, last_year_stat: { min_score: 41.5000, max_score: 48.0000 } },
        // ข้อมูลวิทยาลัยเทคโนโลยีภาคใต้
        { university: "วิทยาลัยเทคโนโลยีภาคใต้", faculty: "คณะพยาบาลศาสตร์", major: "พยาบาลศาสตรบัณฑิต", admission_criteria: criteria.healthSciences, last_year_stat: { min_score: 43.5000, max_score: 51.0000 } },
        // ข้อมูลวิทยาลัยนครราชสีมา
        { university: "วิทยาลัยนครราชสีมา", faculty: "คณะนิติศาสตร์", major: "นิติศาสตรบัณฑิต", admission_criteria: criteria.poliSciLawWithMath, last_year_stat: { min_score: 49.6250, max_score: 61.2500 } },
        { university: "วิทยาลัยนครราชสีมา", faculty: "คณะบริหารธุรกิจ", major: "การตลาด", admission_criteria: criteria.businessGeneral, last_year_stat: { min_score: 41.6250, max_score: 65.0000 } },
        // ข้อมูลวิทยาลัยพยาบาลกองทัพเรือ
        { university: "วิทยาลัยพยาบาลกองทัพเรือ", faculty: "ส่วนกลาง", major: "พยาบาลศาสตรบัณฑิต", admission_criteria: criteria.healthSciences, last_year_stat: { min_score: 53.5000, max_score: 58.5000 } },
        // ข้อมูลวิทยาลัยพยาบาลตำรวจ
        { university: "วิทยาลัยพยาบาลตำรวจ", faculty: "ส่วนกลาง", major: "พยาบาลศาสตรบัณฑิต", admission_criteria: criteria.healthSciences, last_year_stat: { min_score: 53.5000, max_score: 60.5000 } },
        // ข้อมูลวิทยาลัยพยาบาลทหารอากาศ
        { university: "วิทยาลัยพยาบาลทหารอากาศ", faculty: "ส่วนกลาง", major: "พยาบาลศาสตรบัณฑิต", admission_criteria: criteria.healthSciences, last_year_stat: { min_score: 54.0000, max_score: 60.5000 } },
        // ข้อมูลวิทยาลัยพิชญบัณฑิต
        { university: "วิทยาลัยพิชญบัณฑิต", faculty: "คณะศึกษาศาสตร์", major: "การศึกษาปฐมวัย", admission_criteria: criteria.education, last_year_stat: { min_score: 63.5000, max_score: 66.5000 } },
        // ข้อมูลวิทยาลัยอินเตอร์เทคลำปาง
        { university: "วิทยาลัยอินเตอร์เทคลำปาง", faculty: "คณะวิศวกรรมศาสตร์", major: "การจัดการโลจิสติกส์และโซ่อุปทาน", admission_criteria: criteria.engineering, last_year_stat: { min_score: 0.0000, max_score: 0.0000 } },
        // ข้อมูลศูนย์ฝึกพาณิชย์นาวี
        { university: "ศูนย์ฝึกพาณิชย์นาวี", faculty: "ส่วนกลาง", major: "วิทยาศาสตรบัณฑิต", admission_criteria: criteria.science, last_year_stat: { min_score: 0.0000, max_score: 0.0000 } },
        // ข้อมูลสถาบันการจัดการปัญญาภิวัฒน์
        { university: "สถาบันการจัดการปัญญาภิวัฒน์", faculty: "คณะบริหารธุรกิจ", major: "การจัดการธุรกิจการค้าสมัยใหม่", admission_criteria: criteria.businessGeneral, last_year_stat: { min_score: 59.3250, max_score: 83.2500 } },
        // ข้อมูลสถาบันการบินพลเรือน
        { university: "สถาบันการบินพลเรือน", faculty: "วิทยาลัยการบินและคมนาคม", major: "การจัดการจราจรทางอากาศ", admission_criteria: criteria.airTraffic, last_year_stat: { min_score: 55.2500, max_score: 66.5000 } },
        // ข้อมูลสถาบันบัณฑิตพัฒนศิลป์
        { university: "สถาบันบัณฑิตพัฒนศิลป์", faculty: "คณะศิลปวิจิตร", major: "ศิลปบัณฑิต", admission_criteria: criteria.fineArts, last_year_stat: { min_score: 0.0000, max_score: 0.0000 } },
        // ข้อมูลสถาบันพระบรมราชชนก
        { university: "สถาบันพระบรมราชชนก", faculty: "คณะพยาบาลศาสตร์", major: "พยาบาลศาสตรบัณฑิต", admission_criteria: criteria.healthSciences, last_year_stat: { min_score: 49.6500, max_score: 60.5000 } },
        { university: "สถาบันพระบรมราชชนก", faculty: "คณะสาธารณสุขศาสตร์และสหเวชศาสตร์", major: "การแพทย์แผนไทย", admission_criteria: criteria.healthSciences, last_year_stat: { min_score: 51.2136, max_score: 53.7756 } },
        { university: "สถาบันพระบรมราชชนก", faculty: "คณะสาธารณสุขศาสตร์และสหเวชศาสตร์", major: "เวชระเบียน", admission_criteria: criteria.healthSciences, last_year_stat: { min_score: 50.4894, max_score: 53.7280 } },
        { university: "สถาบันพระบรมราชชนก", faculty: "คณะสาธารณสุขศาสตร์และสหเวชศาสตร์", major: "สาธารณสุขชุมชน", admission_criteria: criteria.healthSciences, last_year_stat: { min_score: 49.1952, max_score: 55.8744 } },
        // ข้อมูลสถาบันเทคโนโลยีจิตรลดา
        { university: "สถาบันเทคโนโลยีจิตรลดา", faculty: "คณะเทคโนโลยีดิจิทัล", major: "เทคโนโลยีดิจิทัลเพื่อธุรกิจ", admission_criteria: criteria.digitalBusiness, last_year_stat: { min_score: 0.0000, max_score: 0.0000 } },
        { university: "สถาบันเทคโนโลยีจิตรลดา", faculty: "คณะเทคโนโลยีดิจิทัล", major: "วิศวกรรมศาสตรบัณฑิต", admission_criteria: criteria.digitalBusiness, last_year_stat: { min_score: 0.0000, max_score: 0.0000 } },
        { university: "สถาบันเทคโนโลยีจิตรลดา", faculty: "คณะเทคโนโลยีอุตสาหกรรม", major: "วิศวกรรมคอมพิวเตอร์", admission_criteria: criteria.engineering, last_year_stat: { min_score: 0.0000, max_score: 0.0000 } },
        ];
    }
        
    // =============================
    // ===== 4. CORE FUNCTIONS =====
    // =============================
    function saveState() {
        if (!currentUser) return;
        checkBadges();
        db.collection('users').doc(currentUser.uid).set(state, { merge: true }).catch(error => console.error("Error saving state:", error));
    }

    function closeSidebar() {
        document.getElementById('sidebar').classList.remove('show');
        document.getElementById('overlay').classList.remove('show');
    }

    function applySettings() {
        if (!state.settings) return;
        document.body.dataset.theme = state.settings.theme;
    }

    function deepMerge(target, source) {
        const output = { ...target };
        if (isObject(target) && isObject(source)) {
            Object.keys(source).forEach(key => {
                if (isObject(source[key]) && key in target && !Array.isArray(source[key])) {
                    output[key] = deepMerge(target[key], source[key]);
                } else {
                    output[key] = source[key];
                }
            });
        }
        return output;
    }

    function isObject(item) {
        return (item && typeof item === 'object' && !Array.isArray(item));
    }

    function checkDailyReset() {
        if (!state.focus) state.focus = { totalSessions: 0, todaySessions: 0, lastFocusDate: null, combo: 0 };
        const todayStr = dayjs().format('YYYY-MM-DD');
        if (state.focus.lastFocusDate !== todayStr) {
            state.focus.todaySessions = 0;
            state.focus.lastFocusDate = todayStr;
            state.focus.combo = 0;
        }
    }

    function showToast(message) {
        const toast = document.getElementById('toast-notification');
        if (!toast) return;
        toast.textContent = message;
        toast.classList.remove('hidden');
        clearTimeout(toastTimeout);
        toastTimeout = setTimeout(() => {
            toast.classList.add('hidden');
        }, 3000);
    }

    function addExp(amount) {
        if(!currentUser) return;
        if(typeof state.exp !== 'number') state.exp = 0;
        const levelBefore = calculateLevel(state.exp).level;
        state.exp += amount;
        showToast(`ได้รับ ${amount} EXP!`);
        const { level: levelAfter } = calculateLevel(state.exp);
        if (levelAfter > levelBefore) {
            const coinReward = levelAfter * 10;
            updateCoins(coinReward, `เลื่อนระดับเป็น Level ${levelAfter}`);
            setTimeout(() => {
                Swal.fire({
                    title: 'Level Up!',
                    html: `ยินดีด้วย! คุณได้เลื่อนระดับเป็น <strong>Level ${levelAfter}</strong> แล้ว<br>ได้รับรางวัล <strong>${coinReward} Coins</strong>!`,
                    icon: 'success',
                    confirmButtonText: 'ยอดเยี่ยม!',
                    customClass: { title: 'swal-title-levelup' }
                });
            }, 1500);
        }
        updateHeaderUI();
        updateSettingsUI();
    }
      function calculateLevel(exp) {
        if (typeof exp !== 'number') exp = 0; // ตรวจสอบให้แน่ใจว่าเป็นตัวเลข
        
        let currentLevel = 1;
        let accumulatedExp = 0;
        let expForNextLevel = Math.floor(100 * Math.pow(currentLevel, 1.15));

        while (exp >= accumulatedExp + expForNextLevel && currentLevel < 999) {
            accumulatedExp += expForNextLevel;
            currentLevel++;
            expForNextLevel = Math.floor(100 * Math.pow(currentLevel, 1.15));
        }
        
        const expInCurrentLevel = exp - accumulatedExp;

        // กรณีที่ Level สูงสุดแล้ว
        if (currentLevel === 999) {
            return { 
                level: 999, 
                expInCurrentLevel: expForNextLevel, 
                expForNextLevel: expForNextLevel, 
                progress: 100 
            };
        }

        const progress = Math.min(100, (expInCurrentLevel / expForNextLevel) * 100);

        return { 
            level: currentLevel, 
            expInCurrentLevel, 
            expForNextLevel, 
            progress 
        };
    }

    function checkBadges() {
        if(!currentUser || !state) return;
        if(!state.badges) state.badges = {};

        // Badge: ความสม่ำเสมอ
        state.badges.streak15 = (state.streak || 0) >= 15;
        state.badges.streak30 = (state.streak || 0) >= 30;
        state.badges.loyalist45 = (state.streak || 0) >= 45;

        // Badge: การวางแผน
        let totalPlannerEntries = 0;
        if (typeof state.planner === 'object' && state.planner !== null) {
            totalPlannerEntries = Object.values(state.planner).reduce((sum, day) => sum + (Array.isArray(day) ? day.length : 0), 0);
        }
        state.badges.proPlanner = totalPlannerEntries >= 15;
        state.badges.lifeArchitect = totalPlannerEntries >= 30;
        
        // Badge: การทบทวน
        let totalTopics = 0;
        let totalQuizzes = 0; // เปลี่ยนจาก flashcards
        if (typeof state.revisitTopics === 'object' && state.revisitTopics !== null) {
            Object.values(state.revisitTopics).forEach(subjectArray => {
                if (Array.isArray(subjectArray)) {
                    totalTopics += subjectArray.length;
                    subjectArray.forEach(topic => {
                        totalQuizzes += (topic.quizzes || []).length; // เปลี่ยนเป็น quizzes
                    });
                }
            });
        }
        state.badges.eagerLearner = totalTopics > 0;
        state.badges.knowledgeHoarder = totalTopics >= 10;
        state.badges.cardCreator = totalQuizzes >= 25; // อาจจะเปลี่ยนชื่อ badge นี้ในอนาคตเป็น QuizCreator

        // Badge: การโฟกัส
        const focusDurationHours = (state.settings?.focusDuration || 25) / 60;
        state.badges.deepFocus = (state.focus?.combo || 0) >= 5;
        state.badges.focusMarathon = ((state.focus?.totalSessions || 0) * focusDurationHours) >= 5;

        // Badge: สุขภาพจิต
        let moodStreak = 0;
        if(typeof state.moods === 'object' && state.moods !== null) {
            const sortedMoodDays = Object.keys(state.moods).sort((a,b) => b.localeCompare(a));
            if (sortedMoodDays.length > 0) {
                moodStreak = 1;
                for(let i = 1; i < sortedMoodDays.length; i++) {
                    if (dayjs(sortedMoodDays[i-1]).diff(dayjs(sortedMoodDays[i]), 'day') === 1) {
                        moodStreak++;
                    } else {
                        break;
                    }
                }
            }
        }
        state.badges.emotionalBalance = moodStreak >= 7;

        // Badge: สังคม
        state.badges.firstFriend = (state.followers || []).length > 0;
        state.badges.socialButterfly = (state.followers || []).length >= 10;
    }

    // ==================================
    // ===== 5. UI & PAGE RENDERING =====
    // ==================================
    window.showPage = (pageId) => {
        if (!pageId) pageId = 'home';
        const protectedPages = ['profile', 'rewards', 'settings', 'community', 'shop'];
        if (protectedPages.includes(pageId) && !currentUser) {
            openAuthModal();
            return;
        }
        allPages.forEach(p => p.classList.toggle('active', p.id === `${pageId}-page`));
        allNavLinks.forEach(l => l.classList.toggle('active', l.dataset.page === pageId));
        if (history.pushState) {
            history.pushState(null, null, `#${pageId}`);
        } else {
            location.hash = `#${pageId}`;
        }
        switch(pageId) {
            case 'home': updateHomePageUI(); break;
            case 'planner': renderPlannerCalendar(currentPlannerDate); break;
            case 'revisit':
                document.getElementById('revisit-list-view').classList.remove('hidden');
                document.getElementById('quiz-creation-view').classList.add('hidden');
                document.getElementById('quiz-taking-view').classList.add('hidden');
                renderRevisitList();
                break;
            case 'focus': resetTimer(); renderFocusStats('day'); break;
            case 'mood': renderMoodCalendar(currentMoodDate); break;
            case 'community':
                // เมื่อเข้ามาหน้านี้ ให้แสดงแท็บ "กำลังติดตาม" เป็นค่าเริ่มต้น
                showCommunityTab('following'); 
                renderFollowingList();
                break;
            case 'shop': renderShop(); break;
            case 'rewards': updateRewardsUI(); break;
            case 'settings': updateSettingsUI(); break;
            case 'profile': renderProfilePage(); break;
        }
        feather.replace();
        closeSidebar();
    }

    function updateUIForLoginStatus() {
        const guestHeader = document.getElementById('guest-header');
        const userHeader = document.getElementById('user-header');
        if (currentUser) {
            guestHeader.classList.add('hidden');
            userHeader.classList.remove('hidden');
            updateHeaderUI();
        } else {
            guestHeader.classList.remove('hidden');
            userHeader.classList.add('hidden');
             // ซ่อนจำนวนเหรียญเมื่อไม่ได้ล็อกอิน
            const sidebarCoinCountEl = document.getElementById('sidebar-coin-count');
            if (sidebarCoinCountEl) {
                sidebarCoinCountEl.textContent = '0';
            }
        }
        closeAuthModal();
    }

    function updateHeaderUI() {
        if (!currentUser) return;

        const streakCountEl = document.getElementById('streak-count');
        if (streakCountEl) streakCountEl.textContent = state.streak || 0;

        const sidebarCoinCountEl = document.getElementById('sidebar-coin-count');
        if (sidebarCoinCountEl) {
            sidebarCoinCountEl.textContent = state.coins || 0;
        }

        const checkInBtn = document.getElementById('check-in-btn');
        if (!checkInBtn) return;

        const checkInText = checkInBtn.querySelector('.check-in-text');
        const checkInIcon = checkInBtn.querySelector('.check-in-icon');
        const todayStr = dayjs().format('YYYY-MM-DD');

        // ลบคลาสสถานะเก่าออกทั้งหมดก่อน
        checkInBtn.classList.remove('checked', 'restore-streak');
        checkInText.innerHTML = ''; // เคลียร์ข้อความเก่า

        if (state.lastCheckIn === todayStr) {
            // --- สถานะที่ 1: เช็คอินไปแล้ววันนี้ ---
            checkInBtn.disabled = true;
            checkInBtn.classList.add('checked');
            checkInText.classList.add('hidden');
            checkInIcon.classList.remove('hidden');

            const subtext = checkInBtn.parentElement.querySelector('.check-in-subtext-external');
            if (subtext) {
                subtext.style.display = 'none';
            }

        } else if (state.isStreakFrozen === true) {
            // --- สถานะที่ 2: สตรีคแข็งอยู่ (ไฟเย็น) ---
            checkInBtn.disabled = false;
            checkInBtn.classList.add('restore-streak');
            checkInText.classList.remove('hidden');
            checkInIcon.classList.add('hidden');
            
            // [แก้ไขกลับมาเป็นแบบนี้] ทำให้ข้อความและ subtext อยู่ในปุ่มเดียวกัน
            checkInText.innerHTML = `กู้ไฟ 🧊 <span class="check-in-subtext">(เหลือ ${state.streakFreezesAvailable} ครั้ง)</span>`;

        } else {
            // --- สถานะที่ 3: เช็คอินได้ตามปกติ ---
            checkInBtn.disabled = false;
            checkInText.classList.remove('hidden');
            checkInIcon.classList.add('hidden');
            checkInText.textContent = 'เช็คอิน';
        }

        feather.replace();
    }


    function updateHomePageUI() {
        const page = document.getElementById('home-page');
        if (!page || !page.classList.contains('active')) return;

        const homeBanner = document.getElementById('home-banner');
        if (homeBanner) {
            if (currentUser) { // ถ้าผู้ใช้ Login อยู่            
            const bannerId = state.profile?.currentBanner || 'banner_default';
            const allShopBanners = state.shopItems?.banners || [];
            const bannerData = allShopBanners.find(item => item.id === bannerId);

            if (bannerData && bannerData.image) {
                homeBanner.style.backgroundImage = `url('${bannerData.image}')`;
            } else {
                homeBanner.style.backgroundImage = `linear-gradient(135deg, var(--primary-color), var(--accent-color))`;
            }

        } else { // ถ้าเป็น Guest Mode
            homeBanner.style.backgroundImage = `linear-gradient(135deg, var(--primary-color), var(--accent-color))`;
            }
        }

        const todayStr = dayjs().format('YYYY-MM-DD');
        const tasksList = document.getElementById('today-tasks-summary');
        if (tasksList) {
            const tasksForToday = (state.planner && state.planner[todayStr]) || [];
            if (tasksForToday.length > 0) {
                tasksForToday.sort((a,b) => a.time.localeCompare(b.time));
                tasksList.innerHTML = tasksForToday.map(t => `<li><strong>${t.time}</strong> - ${t.name}</li>`).join('');
            } else {
                tasksList.innerHTML = '<li>ไม่มีงานสำหรับวันนี้</li>';
            }
        }

        const revisitList = document.getElementById('today-revisit-summary');
        if (revisitList) {
            let dueTopics = [];
            if (state.revisitTopics && typeof state.revisitTopics === 'object') {
                Object.values(state.revisitTopics).forEach(subjectArray => {
                    if (Array.isArray(subjectArray)) {
                        const dueInSubject = subjectArray.filter(t => t && t.nextReviewDate && dayjs(t.nextReviewDate).isSame(dayjs(), 'day'));
                        dueTopics = dueTopics.concat(dueInSubject);
                    }
                });
            }
            revisitList.innerHTML = dueTopics.length > 0 ? dueTopics.map(t => `<li>ทบทวน: ${t.name}</li>`).join('') : '<li>ไม่มีหัวข้อต้องทบทวน</li>';
        }

        const todayFocusCountEl = document.getElementById('today-focus-count');
        if (todayFocusCountEl) todayFocusCountEl.textContent = state.focus?.todaySessions || 0;

        const todoList = document.getElementById('todo-list');
        if (todoList) {
            const todos = state.todos || [];
            if (todos.length > 0) {
                todoList.innerHTML = todos.map(todo => `
                    <li class="${todo.completed ? 'completed' : ''}">
                        <input type="checkbox" data-id="${todo.id}" ${todo.completed ? 'checked' : ''}>
                        <span>${todo.text}</span>
                        <button class="delete-todo-btn" data-id="${todo.id}" title="ลบเป้าหมายนี้">
                            <i data-feather="trash-2"></i>
                        </button>
                    </li>
                `).join('');
            } else {
                todoList.innerHTML = '<p class="subtle-text" style="text-align: center; padding: 15px;">ยังไม่มีเป้าหมายสำหรับวันนี้</p>';
            }
            feather.replace();
        }
        
        renderWishList();
        feather.replace(); // สั่งให้วาดไอคอนใหม่
    }

    function renderGpaTable(courses = []) {
        const tableBody = document.getElementById('gpa-table-body');
        if (!tableBody) return;

        let tableHTML = '';
        for (let i = 1; i <= 30; i++) {
            const course = courses[i - 1] || {};
            const subjectName = course.subject || '';
            const credit = course.credit !== undefined ? course.credit.toFixed(1) : '3.0';
            const grade = course.grade !== undefined ? course.grade : '';
            const gradeText = getGradeText(grade); // ฟังก์ชันใหม่ที่เราจะสร้าง

            tableHTML += `
                <div class="gpa-table-row" data-row-id="${i}">
                    <span>${i}</span>
                    <input type="text" placeholder="ชื่อวิชา (ไม่บังคับ)" value="${subjectName}">
                    <div class="credit-stepper">
                        <span class="credit-value">${credit}</span>
                        <div class="stepper-buttons-vertical">
                            <button class="credit-stepper-btn" data-action="increase" aria-label="เพิ่มหน่วยกิต">+</button>
                            <button class="credit-stepper-btn" data-action="decrease" aria-label="ลดหน่วยกิต">-</button>
                        </div>
                    </div>
                    <div class="grade-selector" data-value="${grade}">${gradeText}</div>
                </div>
            `;
        }
        tableBody.innerHTML = tableHTML;
    }

    // ฟังก์ชันช่วย แปลงค่าเกรดเป็นข้อความ
    function getGradeText(value) {
        switch(String(value)) {
            case '4': return '4.00 (A)';
            case '3.5': return '3.50 (B+)';
            case '3': return '3.00 (B)';
            case '2.5': return '2.50 (C+)';
            case '2': return '2.00 (C)';
            case '1.5': return '1.50 (D+)';
            case '1': return '1.00 (D)';
            case '0': return '0.00 (F)';
            default: return 'เลือกเกรด';
        }
    }

    /**
     * รีเซ็ตข้อมูลในตาราง GPA ทั้งหมด
     */
    function resetGpaTable() {
        const tableBody = document.getElementById('gpa-table-body');
        if (!tableBody) return;
        
        tableBody.innerHTML = ''; // เคลียร์ตารางเก่าทิ้ง
        renderGpaTable(currentGpaRecord ? currentGpaRecord.courses : []); // สร้างตารางใหม่

        showToast("ล้างข้อมูลทั้งหมดแล้ว");
    }

    function calculateAndDisplayGpa() {
        const rows = document.querySelectorAll('#gpa-table-body .gpa-table-row');
        let totalCreditPoints = 0; // ผลรวมของ (เกรด x หน่วยกิต)
        let totalCredits = 0;      // ผลรวมของหน่วยกิตทั้งหมด

        rows.forEach(row => {
            const creditValue = parseFloat(row.querySelector('.credit-value').textContent);
            const gradeValue = parseFloat(row.querySelector('.grade-selector').dataset.value);

            // ตรวจสอบว่าผู้ใช้ได้เลือกเกรดแล้วหรือยัง (ไม่ใช่ค่าว่าง หรือ NaN)
            if (!isNaN(gradeValue)) {
                totalCreditPoints += (gradeValue * creditValue);
                totalCredits += creditValue;
            }
        });

        // ป้องกันการหารด้วยศูนย์
        if (totalCredits === 0) {
            Swal.fire({
                icon: 'info',
                title: 'ข้อมูลไม่เพียงพอ',
                text: 'กรุณากรอกหน่วยกิตและเลือกเกรดอย่างน้อย 1 วิชาก่อนทำการคำนวณ',
            });
            return;
        }

        const gpa = totalCreditPoints / totalCredits;

        // แสดงผลลัพธ์ด้วย SweetAlert2
        Swal.fire({
            icon: 'success',
            title: 'ผลการคำนวณเกรดเฉลี่ย (GPA)',
            html: `
                <div class="swal-gpa-result">
                    <span class="gpa-value">${gpa.toFixed(3)}</span>
                    <div class="gpa-summary">
                        <p>คะแนนรวม: <strong>${totalCreditPoints.toFixed(2)}</strong></p>
                        <p>หน่วยกิตรวม: <strong>${totalCredits.toFixed(1)}</strong></p>
                    </div>
                </div>
            `,
            confirmButtonText: 'ยอดเยี่ยม!',
            width: '400px',
        });
    }

    // ---- [TCAS Calculator] ----
    function showTcasView(viewId) {
        document.querySelectorAll('#tcas-feature-wrapper .page-view').forEach(view => view.classList.add('hidden'));
        const viewToShow = document.getElementById(viewId);
        if(viewToShow) viewToShow.classList.remove('hidden');
        feather.replace();
    }
    function initializeTcasFeature() {
        createMockTcasDatabase();
        renderTcasSelectionPage();
        showTcasView('tcas-selection-view');
        document.getElementById('tcas-search-input').addEventListener('input', renderTcasSelectionPage);
    }
    function renderTcasSelectionPage() {
        const query = document.getElementById('tcas-search-input').value.toLowerCase();
        const container = document.getElementById('tcas-major-list');
        
        const filteredData = tcasDatabase.filter(major => 
            major.university.toLowerCase().includes(query) ||
            major.faculty.toLowerCase().includes(query) ||
            major.major.toLowerCase().includes(query)
        );

        if (filteredData.length === 0) {
            container.innerHTML = '<p class="subtle-text">ไม่พบข้อมูลคณะ/สาขาที่ค้นหา</p>';
            return;
        }

        container.innerHTML = filteredData.map((major, index) => `
            <div class="major-card" data-index="${tcasDatabase.indexOf(major)}">
                <h4>${major.major}</h4>
                <p>${major.faculty}</p>
                <p class="subtle-text">${major.university}</p>
            </div>
        `).join('');
    }
    function selectTcasMajor(majorIndex) {
        selectedMajor = tcasDatabase[majorIndex];
        if (!selectedMajor) return;

        // โหลดคะแนนที่เคยบันทึกไว้มาใส่ในฟอร์ม
        const savedScores = state.profile.savedScores || {};
        for (const key in savedScores) {
            const input = document.querySelector(`#tcas-input-view input[name="${key}"]`);
            if (input) {
                input.value = savedScores[key];
            }
        }
        
        showTcasView('tcas-input-view');
    }
    
    // สำหรับคำนวณคะแนน กสพท โดยเฉพาะ
    function calculateGpatScore(userScores) {
        // รายชื่อวิชา A-Level ที่ต้องใช้ และ Key ที่ตรงกับ HTML และฐานข้อมูล
        const requiredALevels = [
            'A-Level_ฟิสิกส์', 'A-Level_เคมี', 'A-Level_ชีววิทยา',
            'A-Level_คณิต1', 'A-Level_อังกฤษ', 'A-Level_ไทย', 'A-Level_สังคมศึกษา'
        ];

        // 1. ตรวจสอบว่ากรอกคะแนนครบทุกวิชาหรือไม่
        const allRequiredSubjects = ['TPAT1', ...requiredALevels];
        for (const subjectKey of allRequiredSubjects) {
            if (userScores[subjectKey] === undefined || isNaN(userScores[subjectKey])) {
                return { error: `กรุณากรอกคะแนนสำหรับวิชา: ${subjectKey.replace(/_/g, ' ')}` };
            }
        }

        // 2. ตรวจสอบเงื่อนไขคะแนนขั้นต่ำ 30 คะแนนของ A-Level
        for (const subjectKey of requiredALevels) {
            if (userScores[subjectKey] < 30) {
                return { 
                    finalScore: 0, 
                    status: { text: 'ไม่ผ่านเกณฑ์', icon: '❌', className: 'status-fail' },
                    reason: `เนื่องจากคะแนนวิชา ${subjectKey.replace(/_/g, ' ')} (${userScores[subjectKey]}) ไม่ถึงเกณฑ์ขั้นต่ำ 30 คะแนน`
                };
            }
        }

        // 3. ถ้าผ่านเงื่อนไขขั้นต่ำ: เริ่มคำนวณคะแนน
        
        // ส่วนที่ 1: คำนวณคะแนน A-Level (70%)
        // นำคะแนนแต่ละวิชามาคูณกับน้ำหนักย่อยภายในกลุ่ม A-Level
        const scienceScore = ((userScores['A-Level_ฟิสิกส์'] + userScores['A-Level_เคมี'] + userScores['A-Level_ชีววิทยา']) / 3) * 0.40; // กลุ่มวิทย์ 40%
        const mathScore = userScores['A-Level_คณิต1'] * 0.20;       // คณิต 20%
        const englishScore = userScores['A-Level_อังกฤษ'] * 0.20;   // อังกฤษ 20%
        const thaiScore = userScores['A-Level_ไทย'] * 0.10;         // ไทย 10%
        const socialScore = userScores['A-Level_สังคมศึกษา'] * 0.10; // สังคม 10%

        // รวมคะแนน A-Level ที่ถ่วงน้ำหนักแล้ว (คะแนนเต็มส่วนนี้คือ 100)
        const aLevelCompositeScore = scienceScore + mathScore + englishScore + thaiScore + socialScore;

        // แปลงคะแนน A-Level 100 คะแนน ให้เป็น 70% ของคะแนนทั้งหมด
        const finalALevelScore = aLevelCompositeScore * 0.70;

        // ส่วนที่ 2: คำนวณคะแนน TPAT1 (30%)
        // แปลงคะแนน TPAT1 (เต็ม 300) ให้เป็น 30% ของคะแนนทั้งหมด
        const finalTpatScore = (userScores['TPAT1'] / 300) * 100 * 0.30;
        
        // รวมคะแนนสุดท้าย
        const totalScore = finalALevelScore + finalTpatScore;

        return { finalScore: totalScore };
    }

    function calculateAndShowTcasResult() {
        if (!selectedMajor) return;

        // 1. บันทึกคะแนนที่กรอกล่าสุด
        const inputs = document.querySelectorAll('#tcas-input-view input[type="number"]');
        const userScores = {};
        inputs.forEach(input => {
            // แก้ไข: ใช้ name ที่ถูกต้องจาก HTML
            const name = input.getAttribute('name');
            if (input.value !== '' && name) {
                userScores[name] = parseFloat(input.value);
            }
        });
        state.profile.savedScores = userScores;
        saveState();

        let result = {};
        let calculationReason = null; // สำหรับเก็บเหตุผลกรณีไม่ผ่านเกณฑ์

        // [จุดสำคัญ] แยกวิธีการคำนวณตามเกณฑ์
        if (selectedMajor.admission_criteria === medCriteria) {
            // --- กรณีเป็นคณะในกลุ่ม กสพท ---
            const gpatResult = calculateGpatScore(userScores);
            if (gpatResult.error) {
                Swal.fire('ข้อมูลไม่ครบถ้วน', gpatResult.error, 'warning');
                return;
            }
            result.totalWeightedPercentage = gpatResult.finalScore;
            if (gpatResult.reason) {
                calculationReason = gpatResult.reason;
            }
            
        } else {
            // --- กรณีเป็นคณะอื่นๆ (ใช้การคำนวณแบบเดิม) ---
            let totalWeightedPercentage = 0;
            let missingSubjects = [];
            userScores['TGAT'] = (userScores['TGAT1'] || 0) + (userScores['TGAT2'] || 0) + (userScores['TGAT3'] || 0);

            for (const subjectKey in selectedMajor.admission_criteria) {
                const score = userScores[subjectKey];
                const maxScore = TCAS_SUBJECT_MAX_SCORES[subjectKey];
                const weight = selectedMajor.admission_criteria[subjectKey];

                if (score === undefined || isNaN(score)) {
                    missingSubjects.push(subjectKey.replace(/_/g, ' '));
                    continue;
                }
                if (maxScore) {
                    totalWeightedPercentage += (score / maxScore) * weight;
                }
            }

            if (missingSubjects.length > 0) {
                Swal.fire('ข้อมูลไม่ครบถ้วน', `กรุณากรอกคะแนนสำหรับวิชา: ${missingSubjects.join(', ')}`, 'warning');
                return;
            }
            result.totalWeightedPercentage = totalWeightedPercentage;
        }

        // 3. ประเมินสถานะ (ใช้ Logic ร่วมกัน)
        const minScore = selectedMajor.last_year_stat.min_score;
        const scoreDiff = result.totalWeightedPercentage - minScore;
        let status = {};

        if (calculationReason) { // ถ้ามีเหตุผลการปรับตก (เช่น คะแนนไม่ถึง 30)
            status = { text: 'ไม่ผ่านเกณฑ์', icon: '❌', className: 'status-fail' };
        } else if (scoreDiff >= 5) {
            status = { text: 'ผ่านชัวร์', icon: '✅', className: 'status-pass' };
        } else if (scoreDiff >= -3) {
            status = { text: 'มีความเสี่ยง', icon: '⚠️', className: 'status-risk' };
        } else {
            status = { text: 'ไม่ผ่าน', icon: '❌', className: 'status-fail' };
        }
        
        // 4. แสดงผล
        document.getElementById('result-major-name').textContent = `${selectedMajor.major}, ${selectedMajor.faculty}`;
        document.getElementById('result-university-name').textContent = selectedMajor.university;
        document.getElementById('result-final-score').textContent = `${result.totalWeightedPercentage.toFixed(2)}%`;
        document.getElementById('result-status-badge').innerHTML = `${status.icon} ${status.text}`;
        document.getElementById('result-status-badge').className = `status-badge ${status.className}`;
        
        // แสดงเหตุผลถ้ามี หรือแสดงคะแนนขั้นต่ำถ้าไม่มีเหตุผล
        document.getElementById('result-comparison').textContent = calculationReason 
            ? calculationReason 
            : `(คะแนนขั้นต่ำปีล่าสุด: ${minScore.toFixed(2)}%)`;
        
        // 5. หาคณะแนะนำ
        findSuggestedMajors(userScores);

        showTcasView('tcas-result-view');
    }

    function findSuggestedMajors(userScores) {
        const container = document.getElementById('tcas-suggestions-list');
        const suggestions = [];
        
        tcasDatabase.forEach(major => {
            if (major === selectedMajor) return; // ข้ามคณะที่เลือกไปแล้ว

            let scoreForThisMajor = 0;
            let canCalculate = true;
            for (const subjectKey in major.admission_criteria) {
                const score = userScores[subjectKey];
                const maxScore = TCAS_SUBJECT_MAX_SCORES[subjectKey];
                const weight = major.admission_criteria[subjectKey];
                if (score === undefined || isNaN(score) || !maxScore) {
                    canCalculate = false;
                    break;
                }
                scoreForThisMajor += (score / maxScore) * weight;
            }

            if (canCalculate) {
                const diff = scoreForThisMajor - major.last_year_stat.min_score;
                if (diff >= -5) { // แนะนำคณะที่คะแนนเราต่ำกว่าคะแนนขั้นต่ำไม่เกิน 5%
                    suggestions.push({ ...major, calculatedScore: scoreForThisMajor, diff: diff });
                }
            }
        });

        if (suggestions.length === 0) {
            container.innerHTML = '<p class="subtle-text">ไม่มีคำแนะนำเพิ่มเติมในขณะนี้</p>';
            return;
        }

        suggestions.sort((a, b) => b.diff - a.diff); // เรียงจากคณะที่มีโอกาสติดมากที่สุด
        container.innerHTML = suggestions.slice(0, 5).map(s => `
            <div class="major-card suggestion">
                <h4>${s.major}</h4>
                <p>${s.university}</p>
                <p class="subtle-text">คะแนนของคุณ: ${s.calculatedScore.toFixed(2)}% (ต่ำสุดปีก่อน: ${s.last_year_stat.min_score}%)</p>
            </div>
        `).join('');
    }

    function populateTcasDropdowns(level, filter = '') {
        const universitySelect = document.getElementById('tcas-university-select');
        const facultySelect = document.getElementById('tcas-faculty-select');
        const majorSelect = document.getElementById('tcas-major-select');

        if (level === 1) { // Populate University
            const universities = [...new Set(tcasDatabase.map(item => item.university))];
            universitySelect.innerHTML = '<option value="">-- กรุณาเลือก --</option>' + universities.map(u => `<option value="${u}">${u}</option>`).join('');
            facultySelect.disabled = true;
            majorSelect.disabled = true;
        } else if (level === 2) { // Populate Faculty
            const faculties = [...new Set(tcasDatabase.filter(item => item.university === filter).map(item => item.faculty))];
            facultySelect.innerHTML = '<option value="">-- กรุณาเลือก --</option>' + faculties.map(f => `<option value="${f}">${f}</option>`).join('');
            facultySelect.disabled = false;
            majorSelect.disabled = true;
        } else if (level === 3) { // Populate Major
            const majors = tcasDatabase.filter(item => item.faculty === filter).map(item => item.major);
            majorSelect.innerHTML = '<option value="">-- กรุณาเลือก --</option>' + majors.map(m => `<option value="${m}">${m}</option>`).join('');
            majorSelect.disabled = false;
        }
    }

    function renderScoreInputs(formula) {
        const container = document.getElementById('tcas-score-inputs');
        const savedScores = state.profile.savedScores || {};
        let inputsHTML = '';
        for (const subject in formula.weight) {
            const savedValue = savedScores[subject] || '';
            inputsHTML += `
                <div class="form-group">
                    <label for="score-${subject}">${subject} (น้ำหนัก ${formula.weight[subject]}%)</label>
                    <input type="number" id="score-${subject}" name="${subject}" placeholder="กรอกคะแนน" value="${savedValue}" required>
                </div>
            `;
        }
        container.innerHTML = `<div class="score-input-grid">${inputsHTML}</div>`;
    }

    function calculateAndDisplayTcasScore() {
        const form = document.getElementById('tcas-score-input-form');
        const inputs = form.querySelectorAll('input[type="number"]');
        let userScores = {};
        inputs.forEach(input => {
            userScores[input.name] = parseFloat(input.value) || 0;
        });

        // บันทึกคะแนนที่กรอก
        state.profile.savedScores = { ...state.profile.savedScores, ...userScores };
        saveState();

        // คำนวณ
        let totalScore = 0;
        for (const subject in currentTcasSelection.weight) {
            totalScore += userScores[subject] * (currentTcasSelection.weight[subject] / 100);
        }
        totalScore = parseFloat(totalScore.toFixed(3));

        // เปรียบเทียบและกำหนดสถานะ
        let status = { text: 'ไม่ผ่าน', class: 'fail', advice: 'คะแนนของคุณยังไม่ถึงเกณฑ์ขั้นต่ำของปีที่แล้ว' };
        const { min, max } = currentTcasSelection.last_year;
        if (totalScore >= min) {
            status = { text: 'ผ่านเกณฑ์', class: 'pass', advice: 'ยินดีด้วย! คะแนนของคุณผ่านเกณฑ์ขั้นต่ำของปีที่แล้ว' };
        } else if (totalScore >= min - 5) {
            status = { text: 'มีความเสี่ยง', class: 'risky', advice: `พยายามทำคะแนนเพิ่มอีก ${ (min - totalScore).toFixed(2) } คะแนนเพื่อให้ผ่านเกณฑ์ขั้นต่ำ` };
        }

        // แสดงผล
        const resultContainer = document.getElementById('tcas-result-container');
        resultContainer.innerHTML = `
            <div class="card tcas-result-card">
                <div class="result-header">
                    <h3>ผลการประเมินคะแนน</h3>
                </div>
                <p>คะแนนรวมของคุณคือ</p>
                <div class="result-score">${totalScore}</div>
                <div class="last-year-scores">
                    <p>คะแนนปีล่าสุด: <strong>${min} (ต่ำสุด) - ${max} (สูงสุด)</strong></p>
                </div>
                <div class="status-badge ${status.class}">${status.text}</div>
                <p class="subtle-text"><i><strong>คำแนะนำ:</strong> ${status.advice}</i></p>
                <div class="result-actions">
                    <button class="tcas-back-to-selection-btn small-btn btn-secondary">ลองคณะอื่น</button>
                </div>
            </div>
        `;
    }

    function showGpaView(viewId) {
        document.querySelectorAll('#gpa-feature-wrapper .page-view').forEach(view => {
            view.classList.add('hidden');
        });
        document.getElementById(viewId).classList.remove('hidden');
        feather.replace();
    }

    /**
     * วาดรายการประวัติผลการเรียนทั้งหมด
     */
    function renderGpaHistoryList() {
        const container = document.getElementById('gpa-history-list');
        if (!container) return;

        const history = state.gpaHistory || [];
        if (history.length === 0) {
            container.innerHTML = '<p class="subtle-text" style="text-align:center; padding: 20px;">ยังไม่มีผลการเรียนที่บันทึกไว้</p>';
            return;
        }

        // เรียงจากใหม่ไปเก่า
        history.sort((a, b) => b.id - a.id);

        container.innerHTML = history.map(record => `
            <div class="gpa-history-item" data-id="${record.id}">
                <div class="history-item-icon">📘</div>
                <div class="history-item-info">
                    <h4>${record.level || ''} เทอม ${record.term || ''}</h4>
                    <p>ปีการศึกษา: ${record.year || ''} — <strong>GPA: ${record.gpa.toFixed(2)}</strong></p>
                </div>
                <div class="history-item-actions">
                    <button class="delete-gpa-record-btn icon-button" data-id="${record.id}" title="ลบรายการนี้">
                        <i data-feather="trash-2"></i>
                    </button>
                </div>
            </div>
        `).join('');
        feather.replace();
    }

    /**
     * จัดการการบันทึกข้อมูล GPA ลง State
     */
    function saveGpaRecord() {
        const rows = document.querySelectorAll('#gpa-table-body .gpa-table-row');
        let totalCreditPoints = 0;
        let totalCredits = 0;
        const courses = [];

        rows.forEach(row => {
            const subject = row.querySelector('input[type="text"]').value.trim();
            const credit = parseFloat(row.querySelector('.credit-value').textContent);
            const grade = parseFloat(row.querySelector('.grade-selector').dataset.value);

            // บันทึกเฉพาะแถวที่มีการเลือกเกรด
            if (!isNaN(grade)) {
                totalCreditPoints += (grade * credit);
                totalCredits += credit;
                courses.push({ subject, credit, grade });
            }
        });

        if (totalCredits === 0) {
            showToast("กรุณากรอกข้อมูลอย่างน้อย 1 วิชา");
            return;
        }

        const gpa = totalCreditPoints / totalCredits;
        
        // อัปเดตข้อมูลใน record ปัจจุบัน
        currentGpaRecord.courses = courses;
        currentGpaRecord.gpa = gpa;

        // ตรวจสอบว่าเป็น record ใหม่หรือกำลังแก้ไขของเก่า
        const existingRecordIndex = state.gpaHistory.findIndex(rec => rec.id === currentGpaRecord.id);

        if (existingRecordIndex > -1) {
            // แก้ไขของเก่า
            state.gpaHistory[existingRecordIndex] = currentGpaRecord;
        } else {
            // เพิ่มของใหม่
            state.gpaHistory.push(currentGpaRecord);
        }

        saveState();
        showToast("บันทึกผลการเรียนสำเร็จ!");
        renderGpaHistoryList();
        showGpaView('gpa-history-view');
    }

    function updateRewardsUI() {
        const page = document.getElementById('rewards-page');
        if (!page || !page.classList.contains('active')) return;
        
        const totalExpDisplay = document.getElementById('total-exp-display');
        const badgesContainer = document.getElementById('badges-container');
        if (!totalExpDisplay || !badgesContainer) return;

        if (!currentUser) {
            totalExpDisplay.textContent = 0;
            badgesContainer.innerHTML = '';
            return;
        }

        totalExpDisplay.textContent = state.exp || 0;

        const allBadges = {
            "ความสม่ำเสมอ & การเริ่มต้น": [
                { id: 'explorer', title: 'นักสำรวจ', desc: 'เปิดใช้งานครบทุกหน้าหลัก', icon: '🗺️' },
                { id: 'streak15', title: 'เช็คอินต่อเนื่อง 15 วัน', desc: 'เช็คอินต่อเนื่องครบ 15 วัน', icon: '🔥🥉' },
                { id: 'streak30', title: 'เช็คอินต่อเนื่อง 30 วัน', desc: 'เช็คอินต่อเนื่องครบ 30 วัน', icon: '🔥🥈' },
                { id: 'loyalist45', title: 'ผู้ภักดี', desc: 'เช็คอินต่อเนื่องครบ 45 วัน', icon: '🔥🥇' },
            ],
            "การวางแผน & การจัดการ": [
                { id: 'proPlanner', title: 'นักวางแผนมืออาชีพ', desc: 'เพิ่มกิจกรรมในตาราง 15 ครั้ง', icon: '📝' },
                { id: 'lifeArchitect', title: 'สถาปนิกชีวิต', desc: 'เพิ่มกิจกรรมในตาราง 30 ครั้ง', icon: '🗓️' },
                { id: 'powerhouse', title: 'วันแห่งประสิทธิภาพ', desc: 'ทำเป้าหมายสำเร็จ 10 อย่างในวันเดียว', icon: '🚀' },
            ],
            "การเรียนรู้ & การทบทวน": [
                { id: 'eagerLearner', title: 'ผู้ใฝ่รู้', desc: 'สร้างหัวข้อสำหรับทบทวนครั้งแรก', icon: '🧠' },
                { id: 'knowledgeHoarder', title: 'คลังความรู้', desc: 'สร้างหัวข้อสำหรับทบทวนครบ 10 หัวข้อ', icon: '📚' },
                { id: 'cardCreator', title: 'นักสร้างการ์ด', desc: 'สร้าง Flashcard ครบ 25 ใบ', icon: '🃏' },
                { id: 'revisionMaster', title: 'เซียนทบทวน', desc: 'ทำการทบทวนสำเร็จครบ 20 ครั้ง', icon: '🎓' },
            ],
            "การโฟกัส & สุขภาพจิต": [
                { id: 'deepFocus', title: 'สมาธิแน่วแน่', desc: 'โฟกัสสำเร็จ 5 รอบติดต่อกัน', icon: '🎯' },
                { id: 'focusMarathon', title: 'มาราธอนโฟกัส', desc: 'สะสมเวลาโฟกัสรวมครบ 5 ชั่วโมง', icon: '⏳' },
                { id: 'emotionalBalance', title: 'สมดุลทางอารมณ์', desc: 'บันทึกอารมณ์ต่อเนื่อง 7 วัน', icon: '😊' },
            ],
            "สังคม & ชุมชน": [
                { id: 'firstFriend', title: 'เพื่อนคนแรก', desc: 'มีผู้ติดตามคนแรก', icon: '👋' },
                { id: 'socialButterfly', title: 'ผีเสื้อสังคม', desc: 'มีผู้ติดตามครบ 10 คน', icon: '🦋' },
                { id: 'chatterbox', title: 'นักสนทนา', desc: 'ส่งข้อความในแชทครบ 100 ข้อความ', icon: '💬' },
            ],
            "เหรียญตราลับ": [
                { id: 'nightOwl', title: 'นักท่องราตรี', desc: '???', icon: '🦉' },
            ]
        };
        
        badgesContainer.innerHTML = '';
        for (const category in allBadges) {
            const categoryHtml = `
                <div class="badge-category">
                    <h3 class="category-title">${category}</h3>
                    <div class="badges-grid">
                        ${allBadges[category].map(badge => {
                            const unlocked = state.badges && state.badges[badge.id];
                            return `
                            <div class="badge-card ${unlocked ? 'unlocked' : ''}">
                                <div class="badge-icon">${badge.icon}</div>
                                <div class="badge-info">
                                    <div class="badge-title">${badge.title}</div>
                                    <div class="badge-desc">${badge.desc}</div>
                                </div>
                                ${unlocked ? '<div class="badge-unlocked-tick"><i data-feather="check"></i></div>' : ''}
                            </div>`;
                        }).join('')}
                    </div>
                </div>`;
            badgesContainer.innerHTML += categoryHtml;
        }
        feather.replace();
    }

    function updateSettingsUI() {
        const page = document.getElementById('settings-page');
        if (!page || !page.classList.contains('active')) return;
        applySettings();
        const theme = state.settings?.theme || 'light';
        document.getElementById('theme-light-btn').classList.toggle('active', theme === 'light');
        document.getElementById('theme-dark-btn').classList.toggle('active', theme === 'dark');

        if (!currentUser) return;
        const { level, expInCurrentLevel, expForNextLevel, progress } = calculateLevel(state.exp);
        const currentLevelEl = document.getElementById('current-level');
        if (currentLevelEl) currentLevelEl.textContent = `Level ${level}`;
        const expProgressTextEl = document.getElementById('exp-progress-text');
        if (expProgressTextEl) expProgressTextEl.textContent = `${expInCurrentLevel} / ${expForNextLevel} EXP`;
        const expProgressBarEl = document.getElementById('exp-progress-bar');
        if (expProgressBarEl) expProgressBarEl.style.width = `${progress}%`;
    }
    
    async function showUserListModal(listType, userIds) {
        if (!userIds || userIds.length === 0) {
            showToast("ไม่มีรายชื่อให้แสดง");
            return;
        }
    
        const modal = document.getElementById('user-list-modal');
        const titleEl = document.getElementById('user-list-modal-title');
        const bodyEl = document.getElementById('user-list-modal-body');
    
        titleEl.textContent = listType === 'followers' ? 'ผู้ติดตาม' : 'กำลังติดตาม';
        bodyEl.innerHTML = '<p>กำลังโหลด...</p>';
        modal.classList.remove('hidden');

        const userPromises = userIds.map(uid => db.collection('users').doc(uid).get());
        const userDocs = await Promise.all(userPromises);

        bodyEl.innerHTML = userDocs.map(doc => {
            if (!doc.exists) return '';
            const userData = doc.data().profile;
            return `
                <div class="user-list-modal-item">
                    <img src="${userData.photoURL || 'assets/profiles/startprofile.png'}" class="profile-pic">
                    <div class="user-info">
                        <h4>${userData.displayName || 'User'}</h4>
                        <p class="subtle-text">${userData.lifebuddyId}</p>
                    </div>
                </div>
            `;
        }).join('');
    }
    function renderProfilePage() {
    const page = document.getElementById('profile-page');
    // 1. ตรวจสอบเบื้องต้นว่าควรจะ render หรือไม่
    if (!page || !page.classList.contains('active') || !currentUser) {
        return;
    }
    
    // 2. ทำให้ View Mode แสดงผล และซ่อน Edit Mode (เป็นค่าเริ่มต้นเสมอเมื่อเข้าหน้านี้)
    const viewMode = document.getElementById('profile-view-mode');
    const editMode = document.getElementById('profile-edit-mode');
    if (viewMode) viewMode.classList.remove('hidden');
    if (editMode) editMode.classList.add('hidden');

    // 3. แสดงผล Banner ที่ผู้ใช้ติดตั้งอยู่
    const bannerEl = viewMode.querySelector('.profile-banner');
    if (bannerEl) {
        const bannerId = state.profile.currentBanner;
        const allShopItems = Object.values(state.shopItems || {}).flatMap(category => category);
        const bannerData = allShopItems.find(item => item.id === bannerId);

        if (bannerData && bannerData.image) {
            bannerEl.style.backgroundImage = `url('${bannerData.image}')`;
            bannerEl.style.backgroundSize = 'cover';
            bannerEl.style.backgroundPosition = 'center';
            bannerEl.style.backgroundColor = '';
        } else {
            bannerEl.style.backgroundImage = '';
            bannerEl.style.background = 'linear-gradient(135deg, var(--primary-color), var(--accent-color))';
        }
    }

    // 4. แสดงข้อมูลโปรไฟล์หลักใน View Mode
    const displayName = state.profile.displayName || currentUser.displayName || 'User';
    renderProfilePicture(state.profile.photoURL, document.getElementById('profile-view-photo'));
    
    document.getElementById('profile-view-name').textContent = displayName;
    
    const { level } = calculateLevel(state.exp);
    const profileLevelEl = document.getElementById('profile-view-level');
    if (profileLevelEl) {
        profileLevelEl.textContent = `Level ${level}`;
    }
    
    document.getElementById('profile-view-lifebuddy-id').textContent = state.profile.lifebuddyId || '';
    document.getElementById('profile-view-bio').textContent = state.profile.bio || 'ยังไม่มีคำอธิบายตัวตน...';

    // 5. แสดงข้อมูลวันเข้าร่วม
    if (currentUser.metadata.creationTime) {
        const joinDate = dayjs(currentUser.metadata.creationTime).format('D MMMM YYYY');
        document.getElementById('profile-view-joindate').innerHTML = `<i data-feather="calendar"></i> เข้าร่วมเมื่อ ${joinDate}`;
    }

    // 6. แสดงสถิติการติดตาม
    const followersCount = (state.followers || []).length;
    const followingCount = (state.following || []).length;
    document.getElementById('profile-stat-followers').textContent = followersCount;
    document.getElementById('profile-stat-following').textContent = followingCount;

    const followersDiv = document.getElementById('profile-stat-followers').parentElement;
    const followingDiv = document.getElementById('profile-stat-following').parentElement;

    followersDiv.style.cursor = "pointer";
    followersDiv.onclick = () => {
        showPage('community'); // ไปที่หน้าเพื่อน
        showCommunityTab('followers'); // เปิดแท็บผู้ติดตาม
    };
        
    followingDiv.style.cursor = "pointer";
    followingDiv.onclick = () => {
        showPage('community'); // ไปที่หน้าเพื่อน
        showCommunityTab('following'); // เปิดแท็บกำลังติดตาม
    };

    // 7. แสดงสถิติการใช้งานแอป
    document.getElementById('profile-stat-streak').textContent = state.streak || 0;
    document.getElementById('profile-stat-total-exp').textContent = state.exp || 0;
    document.getElementById('profile-stat-focus').textContent = state.focus?.totalSessions || 0;
    document.getElementById('profile-stat-moods').textContent = Object.keys(state.moods || {}).length;

    // 8. แสดงความสำเร็จ (Achievements) ที่ปลดล็อกแล้ว
    const achievementsContainer = document.getElementById('profile-achievements-container');
    if (achievementsContainer) {
        const badgeData = [ 
            { id: 'focus10', title: 'นักโฟกัสหน้าใหม่', icon: '🎯'}, 
            { id: 'plan5', title: 'นักวางแผนตัวยง', icon: '📝'}, 
            { id: 'mood7', title: 'จิตใจเบิกบาน', icon: '😊'}, 
            { id: 'review20', title: 'ยอดนักทบทวน', icon: '🎓'} 
        ];
        const unlockedBadges = badgeData.filter(badge => state.badges && state.badges[badge.id]);
        
        if (unlockedBadges.length > 0) {
            achievementsContainer.innerHTML = unlockedBadges.map(badge => 
                `<div class="stat-item">
                    <span class="stat-icon">${badge.icon}</span>
                    <span class="stat-value" style="font-size: 1rem; color: var(--text-color); margin: 4px 0;">${badge.title}</span>
                    <span class="stat-label">ปลดล็อกแล้ว</span>
                 </div>`
            ).join('');
        } else {
            achievementsContainer.innerHTML = '<p class="subtle-text">ยังไม่มีความสำเร็จ... มาเริ่มสะสมกันเลย!</p>';
        }
    }
    
    // 9. เตรียมข้อมูลสำหรับหน้าแก้ไขโปรไฟล์ (Edit Mode) ให้พร้อมเสมอ
    // โดยการดึงข้อมูลล่าสุดจาก state มาใส่ในฟอร์มที่ซ่อนอยู่
    if (editMode) {
        renderProfilePicture(state.profile.photoURL, document.getElementById('profile-edit-photo'));
        document.getElementById('profile-edit-name').textContent = displayName;
        document.getElementById('profile-edit-email').textContent = currentUser.email;
        document.getElementById('display-name').value = state.profile.displayName || '';
        document.getElementById('gender').value = state.profile?.gender || 'unspecified';
        document.getElementById('age').value = state.profile?.age || '';
        document.getElementById('bio').value = state.profile?.bio || '';
        document.getElementById('show-email-toggle').checked = state.settings?.showEmail ?? true;
    }

    // 10. สั่งให้ Feather Icons ทำงานใหม่เพื่อแสดงผลไอคอนที่อาจถูกสร้างขึ้นมา
    feather.replace();
}

    window.showFriendProfile = async (friendId) => {
    if (friendId === currentUser.uid) {
        showPage('profile'); // ถ้าเป็น ID ตัวเอง ให้ไปหน้าโปรไฟล์ปกติ
        return;
    }

    const modal = document.getElementById('friend-profile-modal');
    const contentEl = document.getElementById('friend-profile-content');
    contentEl.innerHTML = '<div class="loader" style="margin: 50px auto;"></div>';
    modal.classList.remove('hidden');

    try {
        const doc = await db.collection('users').doc(friendId).get();
        if (!doc.exists) {
            contentEl.innerHTML = '<p>ไม่พบผู้ใช้นี้</p>';
            return;
        }
        const friendData = doc.data();

        // [ส่วนสำคัญ] เราจะ "ยืม" โครงสร้าง HTML จากหน้าโปรไฟล์หลักมาใช้
        // นี่เป็นวิธีที่รวดเร็ว แต่ในระยะยาวอาจจะสร้างเป็น component แยก
        
        // ตรวจสอบสถานะการติดตาม
        const amIFollowing = (state.following || []).includes(friendId);
        const requestSent = (state.sentFollowRequests || []).includes(friendId);
        let followButtonHtml = '';
        if (amIFollowing) {
            followButtonHtml = `<button class="small-btn btn-secondary" disabled>กำลังติดตาม</button>`;
        } else if (requestSent) {
            followButtonHtml = `<button class="small-btn" disabled>ส่งคำขอแล้ว</button>`;
        } else {
            followButtonHtml = `<button class="small-btn" onclick="handleSendFollowRequest('${friendId}')">ติดตาม</button>`;
        }

        const bannerId = friendData.profile.currentBanner;
        const allShopItems = Object.values(state.shopItems || {}).flatMap(category => category);
        const bannerData = allShopItems.find(item => item.id === bannerId);
        const bannerStyle = (bannerData && bannerData.image) 
            ? `background-image: url('${bannerData.image}'); background-size: cover; background-position: center;`
            : 'background: linear-gradient(135deg, var(--primary-color), var(--accent-color));';

        const { level } = calculateLevel(friendData.exp || 0);

        contentEl.innerHTML = `
            <div id="profile-view-mode">
                <div class="profile-header-card">
                    <div class="profile-banner" style="${bannerStyle}"></div>
                    <img src="${friendData.profile.photoURL || 'assets/profiles/startprofile.png'}" alt="Profile Photo" class="avatar-display">
                    <div class="profile-info">
                        <h2>${friendData.profile.displayName || 'User'}</h2>
                        <span class="level-badge">Level ${level}</span>
                        <p class="subtle-text"><em>${friendData.profile.lifebuddyId}</em></p>
                        <p class="bio-text">${friendData.profile.bio || '...'}</p>
                        <div class="profile-follow-stats">
                            <div class="follow-stat-item">
                                <span class="follow-stat-value">${(friendData.followers || []).length}</span>
                                <span class="follow-stat-label">ผู้ติดตาม</span>
                            </div>
                            <div class="follow-stat-item">
                                <span class="follow-stat-value">${(friendData.following || []).length}</span>
                                <span class="follow-stat-label">กำลังติดตาม</span>
                            </div>
                        </div>
                        <div style="margin-top: 15px;">${followButtonHtml}</div>
                    </div>
                </div>
            </div>
        `;

        feather.replace(); // วาดไอคอนใหม่

    } catch (error) {
        console.error("Error showing friend profile:", error);
        contentEl.innerHTML = '<p>เกิดข้อผิดพลาดในการโหลดข้อมูล</p>';
    }
}

    //เปิดหน้าต่าง Modal สำหรับเลือก Banner
    function openBannerSelector() {
        renderBannerSelector(); // สร้างรายการแบนเนอร์ก่อน
        document.getElementById('banner-selector-modal').classList.remove('hidden');
    }

    //สร้างและแสดงผลรายการ Banner ที่ผู้ใช้เป็นเจ้าของใน Modal
    function renderBannerSelector() {
        const container = document.getElementById('banner-selector-body');
        if (!container) return;

        const ownedBannerIds = state.unlocks?.banners || [];
        const allBanners = state.shopItems?.banners || [];
        const currentBannerId = state.profile?.currentBanner;

        // 1. สร้างรายการ Banner ที่ผู้ใช้เป็นเจ้าของทั้งหมด
        const ownedBanners = allBanners.filter(banner => ownedBannerIds.includes(banner.id));

        // 2. เพิ่ม Banner เริ่มต้น (Default) เข้าไปในรายการเสมอ
        const defaultBanner = {
            id: 'banner_default',
            name: 'แบนเนอร์เริ่มต้น',
            image: null // ไม่มีรูปภาพ, จะใช้ CSS gradient แทน
        };
        // ใส่ default banner ไว้ข้างหน้าสุด
        const displayList = [defaultBanner, ...ownedBanners];

        // 3. สร้าง HTML สำหรับแต่ละรายการ
        container.innerHTML = displayList.map(banner => {
            const isSelected = banner.id === currentBannerId;
            const backgroundStyle = banner.image ? `style="background-image: url('${banner.image}')"` : '';
            const isGradient = !banner.image ? 'data-gradient="true"' : '';

            return `
                <div class="banner-option-card ${isSelected ? 'selected' : ''}" onclick="handleSelectBanner('${banner.id}')">
                    <div class="banner-option-preview" ${backgroundStyle} ${isGradient}></div>
                    <div class="banner-option-info">
                        ${banner.name}
                    </div>
                    <div class="selected-tick">
                        <i data-feather="check"></i>
                    </div>
                </div>
            `;
        }).join('');

        feather.replace(); // สั่งให้ icon ทำงาน
    }

    /**
    * //จัดการเมื่อผู้ใช้เลือก Banner ใหม่
     * @param {string} bannerId - ID ของ Banner ที่ถูกเลือก
    */
    window.handleSelectBanner = (bannerId) => {
        if (!currentUser) return;

        // 1. อัปเดต state
        state.profile.currentBanner = bannerId;

        // 2. บันทึกข้อมูลลง Firestore
        saveState();

        // 3. ปิด Modal
        document.getElementById('banner-selector-modal').classList.add('hidden');

        // 4. อัปเดตหน้าโปรไฟล์ทันทีเพื่อแสดงผลการเปลี่ยนแปลง
        renderProfilePage();

        // 5. แจ้งเตือนผู้ใช้
        showToast('เปลี่ยนแบนเนอร์สำเร็จแล้ว!');
    };


    // =========================================
    // ===== 6. FEATURE-SPECIFIC FUNCTIONS =====
    // =========================================
    
    // --- Planner and Mood Calendar Functions ---
    function renderPlannerCalendar(date) {
        const calendarEl = document.getElementById('planner-calendar');
        if (!calendarEl) return;
        currentPlannerDate = date;
        const monthYearEl = document.getElementById('planner-month-year');
        if (monthYearEl) monthYearEl.textContent = date.format('MMMM YYYY');
        calendarEl.innerHTML = '';
        const monthStart = date.startOf('month'), startDay = monthStart.day(), daysInMonth = date.daysInMonth();
        ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'].forEach(d => calendarEl.innerHTML += `<div class="calendar-day-name">${d}</div>`);
        for (let i = 0; i < startDay; i++) calendarEl.innerHTML += '<div></div>';
        for (let i = 1; i <= daysInMonth; i++) {
            const dayElem = document.createElement('div');
            dayElem.className = 'calendar-day';
            dayElem.textContent = i;
            const currentDate = date.date(i);
            const dateStr = currentDate.format('YYYY-MM-DD');
            if (currentDate.isSame(dayjs(), 'day')) dayElem.classList.add('today');
            if (dateStr === selectedPlannerDate) dayElem.classList.add('selected');
            if (state.planner && state.planner[dateStr]?.length > 0) dayElem.innerHTML += '<div class="event-dot"></div>';
            dayElem.addEventListener('click', () => { selectedPlannerDate = dateStr; renderPlannerCalendar(date); });
            calendarEl.appendChild(dayElem);
        }
        renderPlannerDetails(selectedPlannerDate);
    }

    function renderPlannerDetails(dateStr) {
        const dateDisplay = document.getElementById('selected-planner-date-display');
        const eventsList = document.getElementById('events-list');
        if (!dateDisplay || !eventsList) return;

        dateDisplay.textContent = `สำหรับวันที่ ${dayjs(dateStr).format('D MMMM')}`;
        const events = (state.planner && state.planner[dateStr]) || [];
        
        if (events.length > 0) {
            // จัดเรียง event ตามเวลาก่อนแสดงผล
            events.sort((a,b) => a.time.localeCompare(b.time));
            // สร้าง HTML รูปแบบใหม่
            eventsList.innerHTML = events.map(e => `
                <li>
                    <div class="event-details">
                        <span class="event-name">${e.name}</span>
                        <span class="event-category">${e.category}</span>
                    </div>
                    <span class="event-time">${e.time}</span>
                </li>
            `).join('');
        } else {
            eventsList.innerHTML = '<li>ไม่มีกิจกรรม</li>';
        }
    }

    function renderMoodCalendar(date) {
        const calendarEl = document.getElementById('mood-calendar');
        if (!calendarEl) return;
        currentMoodDate = date;
        const monthYearEl = document.getElementById('mood-month-year');
        if (monthYearEl) monthYearEl.textContent = date.format('MMMM YYYY');
        calendarEl.innerHTML = '';
        const monthStart = date.startOf('month'), startDay = monthStart.day(), daysInMonth = date.daysInMonth();
        ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'].forEach(d => calendarEl.innerHTML += `<div class="calendar-day-name">${d}</div>`);
        for (let i = 0; i < startDay; i++) calendarEl.innerHTML += '<div></div>';
        for (let i = 1; i <= daysInMonth; i++) {
            const dayElem = document.createElement('div');
            dayElem.className = 'calendar-day';
            const currentDate = date.date(i);
            const dateStr = currentDate.format('YYYY-MM-DD');
            if (currentDate.isSame(dayjs(), 'day')) dayElem.classList.add('today');
            if (dateStr === selectedMoodDate) dayElem.classList.add('selected');
            const moodEntry = state.moods && state.moods[dateStr];
            if (moodEntry) {
                const moodStyles = { happy: { background: 'rgba(255, 235, 59, 0.6)' }, excited: { background: 'rgba(255, 152, 0, 0.6)' }, neutral: { background: 'rgba(189, 189, 189, 0.6)' }, sad: { background: 'rgba(66, 165, 245, 0.6)' }, angry: { background: 'rgba(239, 83, 80, 0.6)' } };
                if (moodStyles[moodEntry.mood]) dayElem.style.background = moodStyles[moodEntry.mood].background;
                const moodEmojis = { happy: '😊', excited: '🤩', neutral: '😐', sad: '😢', angry: '😡' };
                dayElem.innerHTML = moodEmojis[moodEntry.mood] || i;
                dayElem.style.fontSize = '1.5rem';
                dayElem.style.lineHeight = '1.8';
            } else {
                dayElem.textContent = i;
            }
            dayElem.addEventListener('click', () => { selectedMoodDate = dateStr; renderMoodCalendar(date); });
            calendarEl.appendChild(dayElem);
        }
        renderMoodDetails(selectedMoodDate);
    }

    function renderMoodDetails(dateStr) {
        const dateDisplay = document.getElementById('selected-mood-date-display');
        const detailsEl = document.getElementById('mood-details');
        if (!dateDisplay || !detailsEl) return;
        dateDisplay.textContent = dayjs(dateStr).format('D MMMM YYYY');
        const entry = (state.moods && state.moods[dateStr]);
        if (entry) {
            const reasonsText = (entry.reasons && entry.reasons.length > 0) ? entry.reasons.join(', ') : '<em>ไม่ระบุ</em>';
            detailsEl.innerHTML = `<p><strong>อารมณ์:</strong> ${entry.mood}</p><p><strong>บันทึก:</strong> ${entry.notes || '<em>ไม่มี</em>'}</p><p><strong>เหตุผล:</strong> ${reasonsText}</p>`;
        } else {
            detailsEl.innerHTML = '<p><i>ยังไม่มีการบันทึกสำหรับวันนี้</i></p>';
        }
    }

    // --- Subject Selector Functions ---
    function openSubjectSelector(onSelectCallback) {
        currentSubjectSelectionCallback = onSelectCallback; // เก็บ callback ไว้ใช้งาน
        renderSubjectOptions();
        document.getElementById('subject-selector-modal').classList.remove('hidden');
        feather.replace();
    }
    
    async function handleEditSubject(subjectValue) {
        const subjectIndex = state.subjects.findIndex(s => s.value === subjectValue);
        if (subjectIndex === -1) return;
        const currentSubject = state.subjects[subjectIndex];

        const currentTheme = document.body.dataset.theme || 'light';
        const iconNumber = currentSubject.icon || '14';

         const iconSrc = `assets/subject-icons/${currentTheme}${iconNumber}.png`;

        const { value: formValues } = await Swal.fire({
            title: 'แก้ไขรายละเอียดวิชา',
            html: `
                <input id="swal-subject-name" class="swal2-input" value="${currentSubject.name}" placeholder="ชื่อวิชา">
                <div class="swal-color-picker-wrapper">
                    <label for="swal-subject-color" class="swal-color-label">สีประจำวิชา</label>
                    <input id="swal-subject-color" type="color" class="swal-color-input" value="${currentSubject.color}">
                </div>
                
                <!-- ไอคอนปัจจุบันที่คลิกเพื่อเปลี่ยนได้ -->
                <img src="${iconSrc}" alt="Current Icon" id="swal-change-icon-btn" class="swal-icon-preview" title="คลิกเพื่อเปลี่ยนไอคอน">
                <small>คลิกที่รูปไอคอนเพื่อเลือกใหม่</small>
            `,
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonText: 'บันทึก',
            cancelButtonText: 'ยกเลิก',
            
            // เพิ่ม didOpen เพื่อผูก event หลัง popup เปิด
            didOpen: () => {
                document.getElementById('swal-change-icon-btn').addEventListener('click', () => {
                    Swal.close(); // ปิด popup แก้ไขชื่อ/สี
                    openIconSelectorModal(subjectValue); // เปิด popup เลือกไอคอน
                });
            },
            
            preConfirm: () => {
                const name = document.getElementById('swal-subject-name').value.trim();
                const color = document.getElementById('swal-subject-color').value;
                if (!name) {
                    Swal.showValidationMessage('กรุณาใส่ชื่อวิชา');
                    return false;
                }
                return { name, color };
            }
        });

        if (formValues) {
            // บันทึกเฉพาะชื่อและสี
            state.subjects[subjectIndex].name = formValues.name;
            state.subjects[subjectIndex].color = formValues.color;
            
            saveState();
            renderSubjectOptions();
            const activePeriod = document.querySelector('.stats-tab-btn.active')?.dataset.period || 'day';
            renderFocusStats(activePeriod); 
            showToast('อัปเดตวิชาเรียบร้อยแล้ว');
        }
    }
    
    // เปิดหน้าต่างเลือกไอคอน
    function openIconSelectorModal(subjectValue = null) { // ทำให้ subjectValue เป็น optional
        currentlyEditingSubjectValue = subjectValue; // ถ้าเป็น null หมายถึงกำลังเลือกให้วิชาใหม่
        renderIconSelectorGrid();
        document.getElementById('icon-selector-modal').classList.remove('hidden');
    }
    // วาดตารางไอคอนทั้งหมด
    function renderIconSelectorGrid() {
        const gridContainer = document.getElementById('icon-selector-grid');
        if (!gridContainer) return;

        const currentTheme = document.body.dataset.theme || 'light';
        const subject = state.subjects.find(s => s.value === currentlyEditingSubjectValue);
        const currentIcon = subject ? subject.icon : '14';

        gridContainer.innerHTML = availableIcons.map(iconNum => {
            // สร้าง path ของรูปภาพ (จัดการกรณี general)

            const iconSrc = `assets/subject-icons/${currentTheme}${iconNum}.png`;

            const isSelected = iconNum === currentIcon;

            return `
                <div class="icon-option ${isSelected ? 'selected' : ''}" data-icon-number="${iconNum}">
                    <img src="${iconSrc}" alt="Icon ${iconNum}">
                </div>
            `;
        }).join('');
    }

    function renderSubjectOptions() {
        const container = document.getElementById('subject-selector-body');
        const subjects = state.subjects || [];
        container.innerHTML = subjects.map(subject => `
            <div class="subject-option" data-value="${subject.value}">
                <div class="subject-option-details">
                    <!-- [คืนชีพ] แสดงวงกลมสีประจำวิชาตรงนี้ -->
                    <div class="subject-color-dot" style="background-color: ${subject.color || '#8E8E93'};"></div>
                    <span>${subject.name}</span>
                </div>
                <div class="subject-option-actions">
                    <button class="edit-subject-btn icon-button" data-value="${subject.value}" title="แก้ไขวิชานี้">
                        <i data-feather="edit-2"></i>
                    </button>
                    ${subject.removable ? `
                    <button class="remove-custom-subject-btn icon-button" data-value="${subject.value}" title="ลบวิชานี้">
                        <i data-feather="trash-2"></i>
                    </button>` : ''}
                </div>
            </div>
        `).join('');
        feather.replace();
    }
    function selectSubject(value, name) {
        document.getElementById('revisit-subject-display').value = name;
        document.getElementById('revisit-subject-value').value = value;
        document.getElementById('subject-selector-modal').classList.add('hidden');
    }
    // 1. ฟังก์ชันเปิด Modal
    function openCategorySelectorModal() {
        renderCategoryOptions();
        document.getElementById('event-category-modal').classList.remove('hidden');
        feather.replace();
    }

    // 2. ฟังก์ชันวาดรายการหมวดหมู่ใน Modal
    function renderCategoryOptions() {
        const container = document.getElementById('category-selector-body');
        const categories = state.eventCategories || [];
        container.innerHTML = categories.map(cat => `
            <div class="category-option" data-value="${cat.name}">
                <div class="subject-option-details">
                    <span>${cat.name}</span>
                </div>
                <div class="subject-option-actions">
                    ${cat.removable ? `
                    <button class="remove-custom-category-btn icon-button" data-value="${cat.value}" title="ลบหมวดหมู่นี้">
                        <i data-feather="trash-2"></i>
                    </button>` : ''}
                </div>
            </div>
        `).join('');
        feather.replace();
    }

    // 3. ฟังก์ชันจัดการการเพิ่มหมวดหมู่ใหม่
    function handleAddCustomCategory(e) {
        e.preventDefault();
        const input = document.getElementById('custom-category-input');
        const newName = input.value.trim();
        if (!newName) return;
        
        const newValue = `custom_${newName.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}`;
        if (!state.eventCategories) state.eventCategories = [];
        if (state.eventCategories.some(c => c.name.toLowerCase() === newName.toLowerCase())) {
            showToast("มีหมวดหมู่นี้อยู่แล้ว");
            return;
        }
        state.eventCategories.push({ value: newValue, name: newName, removable: true });
        saveState();
        renderCategoryOptions();
        input.value = '';
    }
    function handleAddCustomSubject(e) {
        e.preventDefault();
        const input = document.getElementById('custom-subject-input');
        const colorInput = document.getElementById('custom-subject-color');
        
        const newName = input.value.trim();
        const newColor = colorInput.value;
        const newIcon = newSubjectIconNumber; // ใช้ค่าจาก Global Variable

        if (!newName) {
            showToast("กรุณาใส่ชื่อวิชา");
            return;
        }
        if (state.subjects.some(s => s.name.toLowerCase() === newName.toLowerCase())) {
            showToast("มีวิชานี้อยู่แล้ว");
            return;
        }

        const newValue = `custom_${newName.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}`;
        if (!state.subjects) state.subjects = [];

        state.subjects.push({ value: newValue, name: newName, removable: true, color: newColor, icon: newIcon });
        saveState();
        renderSubjectOptions();
        
        // รีเซ็ตฟอร์ม
        input.value = '';
        newSubjectIconNumber = '14'; // รีเซ็ตไอคอนกลับเป็นค่าเริ่มต้น
        updateNewSubjectIconPreview(); // อัปเดตรูปไอคอนที่ปุ่ม
    }

    function updateNewSubjectIconPreview() {
        const previewImg = document.getElementById('add-custom-subject-icon-preview');
        if (!previewImg) return;
        const currentTheme = document.body.dataset.theme || 'light';
        
        const iconSrc = `assets/subject-icons/${currentTheme}${newSubjectIconNumber}.png`;

        previewImg.src = iconSrc;
    }


    // --- Revisit & Quiz System ---
    let currentQuizState = { subject: null, topicId: null, quizzes: [], currentQuizIndex: 0, correctAnswers: 0 };
    window.renderRevisitList = () => {
        const container = document.getElementById('revisit-topics-by-subject');
        if (!container) return;
        container.innerHTML = '';
        let hasTopics = false;
        const allSubjects = state.subjects || [];
        for (const subjectData of allSubjects) {
            const subjectKey = subjectData.value;
            const subjectName = subjectData.name;
            if (state.revisitTopics && state.revisitTopics[subjectKey] && state.revisitTopics[subjectKey].length > 0) {
                hasTopics = true;
                const subjectGroup = document.createElement('div');
                subjectGroup.className = 'subject-group';
                const subjectTitle = document.createElement('h3');
                subjectTitle.className = 'subject-title';
                subjectTitle.textContent = subjectName;
                subjectGroup.appendChild(subjectTitle);
                const topicList = document.createElement('ul');
                topicList.className = 'topic-list';
                topicList.innerHTML = state.revisitTopics[subjectKey].map(topic => `
                    <li class="topic-item">
                        <div class="topic-info">
                            <span>${topic.name}</span>
                            <div class="next-review">ทบทวนครั้งถัดไป: ${dayjs(topic.nextReviewDate).format('D MMM YYYY')}</div>
                        </div>
                        <button class="small-btn" onclick="openQuizManager('${subjectKey}', ${topic.id})">จัดการควิซ</button>
                    </li>
                `).join('');
                subjectGroup.appendChild(topicList);
                container.appendChild(subjectGroup);
            }
        }
        if (!hasTopics) container.innerHTML = '<p class="subtle-text" style="text-align:center;">ยังไม่มีหัวข้อสำหรับทบทวน ลองเพิ่มดูสิ!</p>';
        feather.replace();
        const homePage = document.getElementById('home-page');
        if (homePage && homePage.classList.contains('active')) updateHomePageUI();
    };
    window.openQuizManager = (subject, topicId) => {
        currentQuizState.subject = subject;
        currentQuizState.topicId = parseInt(topicId);
        document.getElementById('revisit-list-view').classList.add('hidden');
        document.getElementById('quiz-creation-view').classList.remove('hidden');
        document.getElementById('quiz-taking-view').classList.add('hidden');
        const topic = state.revisitTopics[subject].find(t => t.id === currentQuizState.topicId);
        if (!topic) return;
        document.getElementById('creation-topic-title').textContent = topic.name;
        renderCreatedQuizzesList();
        resetQuizCreationForm();
    };
    function renderCreatedQuizzesList() {
        const topic = state.revisitTopics[currentQuizState.subject].find(t => t.id === currentQuizState.topicId);
        const listEl = document.getElementById('created-quizzes-list');
        const countEl = document.getElementById('quiz-count');
        const startBtn = document.getElementById('start-quiz-btn');
        if (!topic.quizzes || topic.quizzes.length === 0) {
            listEl.innerHTML = '<li><p class="subtle-text">ยังไม่มีควิซในหัวข้อนี้ ลองสร้างดูสิ!</p></li>';
            countEl.textContent = 0;
            startBtn.classList.add('hidden');
            return;
        }
        countEl.textContent = topic.quizzes.length;
        startBtn.classList.remove('hidden');
        listEl.innerHTML = topic.quizzes.map(quiz => `
            <li data-quiz-id="${quiz.id}">
                <span class="quiz-text">${quiz.question.substring(0, 50)}...</span>
                <div class="actions">
                    <button class="icon-button" onclick="editQuiz('${quiz.id}')" title="แก้ไข"><i data-feather="edit-2"></i></button>
                    <button class="icon-button" onclick="deleteQuiz('${quiz.id}')" title="ลบ"><i data-feather="trash-2"></i></button>
                </div>
            </li>
        `).join('');
        feather.replace();
    }
    function handleQuizCreationForm(e) {
        e.preventDefault();
        const question = document.getElementById('quiz-question-input').value.trim();
        const type = document.querySelector('input[name="quiz-type"]:checked').value;
        const explanation = document.getElementById('quiz-explanation-input').value.trim();
        const editingId = document.getElementById('editing-quiz-id').value;
        if (!question) { showToast("กรุณาใส่คำถาม"); return; }
        let newQuizData = { id: editingId ? parseInt(editingId) : Date.now(), question, type, explanation, options: [], correctAnswer: null };
        if (type === 'multiple-choice') {
            const choiceInputs = document.querySelectorAll('#choices-wrapper input[type="text"]');
            const correctRadio = document.querySelector('#choices-wrapper input[type="radio"]:checked');
            newQuizData.options = Array.from(choiceInputs).map(input => input.value.trim());
            if (newQuizData.options.some(opt => opt === '')) { showToast("กรุณากรอกข้อความในตัวเลือกให้ครบทุกช่อง"); return; }
            if (!correctRadio) { showToast("กรุณาเลือกคำตอบที่ถูกต้อง"); return; }
            newQuizData.correctAnswer = parseInt(correctRadio.value);
        } else {
            const answerInputs = document.querySelectorAll('#typed-answers-wrapper input[type="text"]');
            newQuizData.correctAnswer = Array.from(answerInputs).map(input => input.value.trim().toLowerCase());
            if (newQuizData.correctAnswer.some(ans => ans === '')) { showToast("กรุณากรอกคำตอบให้ครบทุกช่อง"); return; }
        }
        const topic = state.revisitTopics[currentQuizState.subject].find(t => t.id === currentQuizState.topicId);
        if(!topic.quizzes) topic.quizzes = [];
        if (editingId) {
            const index = topic.quizzes.findIndex(q => q.id === parseInt(editingId));
            if(index > -1) topic.quizzes[index] = newQuizData;
        } else {
            topic.quizzes.push(newQuizData);
        }
        saveState();
        renderCreatedQuizzesList();
        resetQuizCreationForm();
    }
    window.startQuiz = () => {
        const topic = state.revisitTopics[currentQuizState.subject].find(t => t.id === currentQuizState.topicId);
        if (!topic || !topic.quizzes || topic.quizzes.length === 0) return;
        document.getElementById('quiz-creation-view').classList.add('hidden');
        document.getElementById('quiz-taking-view').classList.remove('hidden');
        currentQuizState.quizzes = [...topic.quizzes].sort(() => 0.5 - Math.random());
        currentQuizState.currentQuizIndex = 0;
        currentQuizState.correctAnswers = 0;
        renderCurrentQuizQuestion();
    };
    function renderCurrentQuizQuestion() {
        document.getElementById('quiz-feedback-footer').classList.add('hidden');
        const progress = (currentQuizState.currentQuizIndex / currentQuizState.quizzes.length) * 100;
        document.getElementById('quiz-progress-bar').style.width = `${progress}%`;
        const quiz = currentQuizState.quizzes[currentQuizState.currentQuizIndex];
        document.getElementById('quiz-question-display').textContent = quiz.question;
        const answersContainer = document.getElementById('quiz-answers-container');
        const submitTypedBtn = document.getElementById('submit-typed-answer-btn');
        answersContainer.innerHTML = '';
        submitTypedBtn.classList.add('hidden');
        if (quiz.type === 'multiple-choice') {
            answersContainer.innerHTML = quiz.options.map((option, index) => `<button class="quiz-choice-btn" data-index="${index}">${option}</button>`).join('');
        } else {
            answersContainer.innerHTML = `<input type="text" id="typed-answer-input" placeholder="พิมพ์คำตอบของคุณที่นี่...">`;
            submitTypedBtn.classList.remove('hidden');
        }
    }
    function handleAnswer(answer) {
        const quiz = currentQuizState.quizzes[currentQuizState.currentQuizIndex];
        let isCorrect = false;
        if (quiz.type === 'multiple-choice') {
            const selectedIndex = parseInt(answer);
            isCorrect = (selectedIndex === quiz.correctAnswer);
            document.querySelectorAll('.quiz-choice-btn').forEach(btn => {
                btn.disabled = true;
                const btnIndex = parseInt(btn.dataset.index);
                if (btnIndex === quiz.correctAnswer) btn.classList.add('correct');
                else if (btnIndex === selectedIndex) btn.classList.add('incorrect');
            });
        } else {
            isCorrect = quiz.correctAnswer.includes(answer.trim().toLowerCase());
            const inputEl = document.getElementById('typed-answer-input');
            inputEl.disabled = true;
            inputEl.style.borderColor = isCorrect ? 'var(--success-color)' : 'var(--danger-color)';
        }
        if (isCorrect) { currentQuizState.correctAnswers++; updateCoins(1, "ตอบควิซถูก"); addExp(10); }
        showQuizFeedback(isCorrect, quiz.explanation);
    }
    function showQuizFeedback(isCorrect, explanation) {
        const footer = document.getElementById('quiz-feedback-footer');
        const titleEl = document.getElementById('feedback-title');
        const explanationEl = document.getElementById('feedback-explanation-preview');
        const explainBtn = document.getElementById('explain-btn');
        footer.className = 'quiz-feedback-footer'; // Reset classes
        footer.classList.add(isCorrect ? 'correct' : 'incorrect');
        
        // [แก้ไข] เปลี่ยนไอคอนเป็น Emoji 🪙 และลบ feather.replace() ที่ไม่จำเป็นแล้ว
        titleEl.innerHTML = isCorrect ? `ถูกต้อง! <span style="font-size:1rem; font-weight:400;">+1 🪙 +10 EXP</span>` : 'ยังไม่ถูกนะ';
        
        if (explanation) {
            explanationEl.textContent = `คำอธิบาย: ${explanation.substring(0, 80)}...`;
            explainBtn.classList.remove('hidden');
            explainBtn.onclick = () => Swal.fire({ title: 'คำอธิบาย', text: explanation, confirmButtonText: 'เข้าใจแล้ว' });
        } else {
            explanationEl.textContent = '';
            explainBtn.classList.add('hidden');
        }
        footer.classList.remove('hidden');
    }
    window.continueQuiz = () => {
        currentQuizState.currentQuizIndex++;
        if (currentQuizState.currentQuizIndex < currentQuizState.quizzes.length) {
            renderCurrentQuizQuestion();
        } else {
            // เมื่อทำควิซข้อสุดท้ายเสร็จ
            document.getElementById('quiz-progress-bar').style.width = '100%';
            document.getElementById('quiz-taking-view').classList.add('hidden');
            
            const topic = state.revisitTopics[currentQuizState.subject].find(t => t.id === currentQuizState.topicId);

            // [สำคัญ] ตรวจสอบก่อนว่าวันนี้เป็นวันครบกำหนดทบทวนหรือไม่
            if (dayjs(topic.nextReviewDate).isSame(dayjs(), 'day')) {
                
                // ถ้าใช่ (ถึงกำหนดแล้ว) ให้ทำการเลื่อนระดับและคำนวณวันทบทวนครั้งถัดไป
                const nextLevel = (topic.level || 0) + 1;
                if (nextLevel < topic.reviewIntervals.length) {
                    topic.level = nextLevel;
                    const daysToAdd = topic.reviewIntervals[nextLevel];
                    topic.nextReviewDate = dayjs().add(daysToAdd, 'day').format('YYYY-MM-DD');
                    showToast("เลื่อนขั้นการทบทวนสำเร็จ!");
                } else {
                    // ถ้าเป็นระดับสุดท้ายแล้ว ให้ถือว่าเชี่ยวชาญ
                    topic.nextReviewDate = dayjs().add(1, 'year').format('YYYY-MM-DD'); // เลื่อนไปไกลๆ
                    showToast("คุณเชี่ยวชาญในหัวข้อนี้แล้ว!");
                }
                
                // บันทึก state ก็ต่อเมื่อมีการเปลี่ยนแปลงเท่านั้น
                saveState();

            } else {
                // ถ้ายังไม่ถึงกำหนด (แค่เข้ามาฝึกซ้อม) ไม่ต้องทำอะไรกับวันที่
                showToast("ฝึกซ้อมสำเร็จ!");
            }

            // แสดงผลสรุปคะแนนเสมอ ไม่ว่าจะเป็นการทบทวนจริงหรือฝึกซ้อม
            Swal.fire({
                title: 'ทำควิซเสร็จแล้ว!',
                html: `คุณตอบถูก <strong>${currentQuizState.correctAnswers}</strong> จาก ${currentQuizState.quizzes.length} ข้อ<br>เก่งมาก!`,
                icon: 'success',
                confirmButtonText: 'ยอดเยี่ยม!'
            }).then(() => {
                document.getElementById('revisit-list-view').classList.remove('hidden');
                renderRevisitList(); // วาดรายการใหม่เพื่อให้เห็นวันที่ (ซึ่งอาจจะเปลี่ยนหรือไม่เปลี่ยนก็ได้)
            });
        }
    };
    function resetQuizCreationForm() {
        document.getElementById('quiz-creation-form').reset();
        document.getElementById('editing-quiz-id').value = '';
        document.getElementById('creation-form-title').innerHTML = '<i data-feather="plus-circle"></i> เพิ่มควิซใหม่';
        document.getElementById('save-quiz-btn').innerHTML = '<i data-feather="save"></i> บันทึกควิซข้อนี้';
        document.getElementById('cancel-edit-quiz-btn').classList.add('hidden');
        document.getElementById('mc-options-container').classList.remove('hidden');
        document.getElementById('typed-answer-container').classList.add('hidden');
        document.querySelectorAll('#mc-options-container input').forEach(input => input.disabled = false);
        document.querySelectorAll('#typed-answer-container input').forEach(input => input.disabled = true);
        const choicesWrapper = document.getElementById('choices-wrapper');
        choicesWrapper.innerHTML = '';
        for (let i=0; i<2; i++) addChoiceInput();
        document.getElementById('typed-answers-wrapper').innerHTML = '';
        addTypedAnswerInput();
        feather.replace();
    }
    function addChoiceInput(text = '', isCorrect = false) {
        const wrapper = document.getElementById('choices-wrapper');
        const index = wrapper.children.length;
        const choiceHTML = `<div class="choice-item"><input type="radio" name="correct-choice" value="${index}" ${isCorrect ? 'checked' : ''}><input type="text" placeholder="ตัวเลือกที่ ${index + 1}" value="${text}"><button type="button" class="remove-btn icon-button"><i data-feather="trash-2"></i></button></div>`;
        wrapper.insertAdjacentHTML('beforeend', choiceHTML);
    }
    function addTypedAnswerInput(text = '') {
        const wrapper = document.getElementById('typed-answers-wrapper');
        const answerHTML = `<div class="typed-answer-item"><input type="text" placeholder="พิมพ์คำตอบที่ยอมรับได้" value="${text}"><button type="button" class="remove-btn icon-button"><i data-feather="trash-2"></i></button></div>`;
        wrapper.insertAdjacentHTML('beforeend', answerHTML);
    }
    window.editQuiz = (quizId) => {
        const topic = state.revisitTopics[currentQuizState.subject].find(t => t.id === currentQuizState.topicId);
        const quiz = topic.quizzes.find(q => q.id === parseInt(quizId));
        if (!quiz) return;
        document.getElementById('editing-quiz-id').value = quiz.id;
        document.getElementById('quiz-question-input').value = quiz.question;
        document.getElementById('quiz-explanation-input').value = quiz.explanation;
        const typeRadio = document.querySelector(`input[name="quiz-type"][value="${quiz.type}"]`);
        typeRadio.checked = true;
        typeRadio.dispatchEvent(new Event('change'));
        if (quiz.type === 'multiple-choice') {
            const choicesWrapper = document.getElementById('choices-wrapper');
            choicesWrapper.innerHTML = '';
            quiz.options.forEach((opt, index) => addChoiceInput(opt, index === quiz.correctAnswer));
        } else {
            const typedWrapper = document.getElementById('typed-answers-wrapper');
            typedWrapper.innerHTML = '';
            quiz.correctAnswer.forEach(ans => addTypedAnswerInput(ans));
        }
        document.getElementById('creation-form-title').innerHTML = '<i data-feather="edit-2"></i> กำลังแก้ไขควิซ';
        document.getElementById('save-quiz-btn').innerHTML = '<i data-feather="check-circle"></i> อัปเดตควิซ';
        document.getElementById('cancel-edit-quiz-btn').classList.remove('hidden');
        document.getElementById('quiz-creation-form').scrollIntoView({ behavior: 'smooth' });
        feather.replace();
    };
    window.deleteQuiz = (quizId) => {
        Swal.fire({
            title: 'แน่ใจหรือไม่?', text: "คุณต้องการลบควิซข้อนี้ใช่ไหม? การกระทำนี้ไม่สามารถย้อนกลับได้", icon: 'warning',
            showCancelButton: true, confirmButtonColor: 'var(--danger-color)', cancelButtonColor: '#6e7881',
            confirmButtonText: 'ใช่, ลบเลย!', cancelButtonText: 'ยกเลิก'
        }).then((result) => {
            if (result.isConfirmed) {
                const topic = state.revisitTopics[currentQuizState.subject].find(t => t.id === currentQuizState.topicId);
                topic.quizzes = topic.quizzes.filter(q => q.id !== parseInt(quizId));
                saveState();
                renderCreatedQuizzesList();
                Swal.fire('ลบแล้ว!', 'ควิซถูกลบออกไปแล้ว', 'success');
            }
        });
    };
    
    function renderPlannerDetails(dateStr) {
        const dateDisplay = document.getElementById('selected-planner-date-display');
        const eventsList = document.getElementById('events-list');
        if (!dateDisplay || !eventsList) return;
        dateDisplay.textContent = `สำหรับวันที่ ${dayjs(dateStr).format('D MMMM')}`;
        eventsList.innerHTML = (state.planner[dateStr] || []).sort((a,b) => a.time.localeCompare(b.time)).map(e => `<li><strong>${e.time}</strong> - ${e.name} (${e.category})</li>`).join('') || '<li>ไม่มีกิจกรรม</li>';
    }

    window.renderRevisitList = () => {
        const container = document.getElementById('revisit-topics-by-subject');
        // ถ้าไม่มี container (เช่น ไม่ได้อยู่หน้า revisit) ก็ไม่ต้องทำอะไรเลย
        if (!container) return; 

        container.innerHTML = '';
        let hasTopics = false;

        const allSubjects = state.subjects || [];

        for (const subjectData of allSubjects) {
            const subjectKey = subjectData.value;
            const subjectName = subjectData.name;

            if (state.revisitTopics && state.revisitTopics[subjectKey] && state.revisitTopics[subjectKey].length > 0) {
                hasTopics = true;
                
                const subjectGroup = document.createElement('div');
                subjectGroup.className = 'subject-group';
                
                const subjectTitle = document.createElement('h3');
                subjectTitle.className = 'subject-title';
                subjectTitle.textContent = subjectName;
                subjectGroup.appendChild(subjectTitle);

                const topicList = document.createElement('ul');
                topicList.className = 'topic-list';
                topicList.innerHTML = state.revisitTopics[subjectKey].map(topic => `
                    <li class="topic-item">
                        <div class="topic-info">
                            <span>${topic.name}</span>
                            <div class="next-review">ทบทวนครั้งถัดไป: ${dayjs(topic.nextReviewDate).format('D MMM YYYY')}</div>
                        </div>
                        <button class="small-btn" onclick="openQuizManager('${subjectKey}', ${topic.id})">จัดการควิซ</button>
                    </li>
                `).join('');
                
                subjectGroup.appendChild(topicList);
                container.appendChild(subjectGroup);
            }
        }

        if (!hasTopics) {
            container.innerHTML = '<p class="subtle-text" style="text-align:center;">ยังไม่มีหัวข้อสำหรับทบทวน ลองเพิ่มดูสิ!</p>';
        }
        
        feather.replace();

        // ตรวจสอบก่อนว่าเราอยู่ที่หน้า Home หรือไม่ ถึงจะเรียก updateHomePageUI
        const homePage = document.getElementById('home-page');
        if (homePage && homePage.classList.contains('active')) {
            updateHomePageUI();
        }
    };

    function renderMoodCalendar(date) {
        const calendarEl = document.getElementById('mood-calendar');
        if (!calendarEl) return; // ป้องกัน Error ถ้าไม่ได้อยู่หน้า Mood

        currentMoodDate = date;

        const monthYearEl = document.getElementById('mood-month-year');
        if (monthYearEl) {
            monthYearEl.textContent = date.format('MMMM YYYY');
        }

        calendarEl.innerHTML = '';

        const monthStart = date.startOf('month');
        const startDay = monthStart.day();
        const daysInMonth = date.daysInMonth();
        
        ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'].forEach(d => {
            calendarEl.innerHTML += `<div class="calendar-day-name">${d}</div>`;
        });
        
        for (let i = 0; i < startDay; i++) {
            calendarEl.innerHTML += '<div></div>';
        }
        
        for (let i = 1; i <= daysInMonth; i++) {
            const dayElem = document.createElement('div');
            dayElem.className = 'calendar-day';
            dayElem.textContent = i;
            
            const currentDate = date.date(i);
            const dateStr = currentDate.format('YYYY-MM-DD');
            
            if (currentDate.isSame(dayjs(), 'day')) {
                dayElem.classList.add('today');
            }
            if (dateStr === selectedMoodDate) {
                dayElem.classList.add('selected');
            }
            
            // เพิ่มสีตามอารมณ์ที่บันทึกไว้
            const moodEntry = state.moods && state.moods[dateStr];
            if (moodEntry) {
                const moodStyles = {
                    happy: { background: 'rgba(255, 235, 59, 0.6)' },   // เหลืองอ่อน
                    excited: { background: 'rgba(255, 152, 0, 0.6)' }, // ส้ม
                    neutral: { background: 'rgba(189, 189, 189, 0.6)' }, // เทา
                    sad: { background: 'rgba(66, 165, 245, 0.6)' },     // ฟ้า
                    angry: { background: 'rgba(239, 83, 80, 0.6)' }     // แดง
                };
                const styles = moodStyles[moodEntry.mood];
                if (styles) {
                    dayElem.style.background = styles.background;
                }
                 // แสดง emoji แทนตัวเลข
                const moodEmojis = { happy: '😊', excited: '🤩', neutral: '😐', sad: '😢', angry: '😡' };
                dayElem.innerHTML = moodEmojis[moodEntry.mood] || i; // ถ้ามี emoji ให้แสดง emoji
                dayElem.style.fontSize = '1.5rem'; // ปรับขนาด emoji
                dayElem.style.lineHeight = '1.8';
            }

            dayElem.addEventListener('click', () => {
                selectedMoodDate = dateStr;
                renderMoodCalendar(date); // วาดปฏิทินใหม่เพื่ออัปเดต 'selected' class
            });
            
            calendarEl.appendChild(dayElem);
        }
        
        // อัปเดตรายละเอียดด้านข้าง
        renderMoodDetails(selectedMoodDate);
    };
    
    function renderMoodDetails(dateStr) {
        const dateDisplay = document.getElementById('selected-mood-date-display');
        const detailsEl = document.getElementById('mood-details');
        if(!dateDisplay || !detailsEl) return;
        dateDisplay.textContent = dayjs(dateStr).format('D MMMM YYYY');
        const entry = state.moods && state.moods[dateStr];
        if (entry) {
            detailsEl.innerHTML = `<p><strong>อารมณ์:</strong> ${entry.mood}</p><p><strong>บันทึก:</strong> ${entry.notes || '<em>ไม่มี</em>'}</p><p><strong>เหตุผล:</strong> ${(entry.reasons || []).join(', ') || '<em>ไม่ระบุ</em>'}</p>`;
        } else {
            detailsEl.innerHTML = '<p><i>ยังไม่มีการบันทึกสำหรับวันนี้</i></p>';
        }
    }    

    function renderPlannerCalendar(date) {
        const calendarEl = document.getElementById('planner-calendar');
        if (!calendarEl) return; // ป้องกัน Error ถ้าไม่ได้อยู่หน้า Planner

        currentPlannerDate = date;
        
        const monthYearEl = document.getElementById('planner-month-year');
        if (monthYearEl) {
            monthYearEl.textContent = date.format('MMMM YYYY');
        }

        calendarEl.innerHTML = '';
        
        const monthStart = date.startOf('month');
        const startDay = monthStart.day();
        const daysInMonth = date.daysInMonth();
        
        // เพิ่มหัวตาราง (วันในสัปดาห์)
        ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'].forEach(d => {
            calendarEl.innerHTML += `<div class="calendar-day-name">${d}</div>`;
        });
        
        // เพิ่มช่องว่างสำหรับวันที่ก่อนเริ่มเดือน
        for (let i = 0; i < startDay; i++) {
            calendarEl.innerHTML += '<div></div>';
        }
        
        // สร้างปฏิทินสำหรับแต่ละวัน
        for (let i = 1; i <= daysInMonth; i++) {
            const dayElem = document.createElement('div');
            dayElem.className = 'calendar-day';
            dayElem.textContent = i;
            
            const currentDate = date.date(i);
            const dateStr = currentDate.format('YYYY-MM-DD');
            
            if (currentDate.isSame(dayjs(), 'day')) {
                dayElem.classList.add('today');
            }
            if (dateStr === selectedPlannerDate) {
                dayElem.classList.add('selected');
            }
            
            // เพิ่มจุดถ้ามี event ในวันนั้น
            if (state.planner && state.planner[dateStr]?.length > 0) {
                dayElem.innerHTML += '<div class="event-dot"></div>';
            }
            
            dayElem.addEventListener('click', () => {
                selectedPlannerDate = dateStr;
                renderPlannerCalendar(date); // วาดปฏิทินใหม่เพื่ออัปเดต 'selected' class
            });
            
            calendarEl.appendChild(dayElem);
        }
        
        // อัปเดตรายละเอียดด้านข้าง
        renderPlannerDetails(selectedPlannerDate);
    };

    function renderPlannerDetails(dateStr) {
        const dateDisplay = document.getElementById('selected-planner-date-display');
        const eventsList = document.getElementById('events-list');

        if (!dateDisplay || !eventsList) return; // ป้องกัน Error

        dateDisplay.textContent = `สำหรับวันที่ ${dayjs(dateStr).format('D MMMM')}`;
        
        const events = (state.planner && state.planner[dateStr]) || [];
        
        if (events.length > 0) {
            // จัดเรียง event ตามเวลาก่อนแสดงผล
            events.sort((a,b) => a.time.localeCompare(b.time));
            eventsList.innerHTML = events.map(e => `<li><strong>${e.time}</strong> - ${e.name} (${e.category})</li>`).join('');
        } else {
            eventsList.innerHTML = '<li>ไม่มีกิจกรรม</li>';
        }
    }

    function updateCoins(amount, reason) { 
        if (!currentUser) return; 
        state.coins = (state.coins || 0) + amount; 
        const actionText = amount > 0 ? "ได้รับ" : "ใช้"; 
        showToast(`${actionText} ${Math.abs(amount)} Coins! (${reason})`); 
        if (!state.coinHistory) state.coinHistory = []; 
        state.coinHistory.unshift({ amount: amount, reason: reason, date: new Date().toISOString() }); 
        if (state.coinHistory.length > 50) state.coinHistory.pop(); 
        if (amount < 0) state.lastCoinUsage = new Date().toISOString(); 
        updateHeaderUI(); 
        if(document.getElementById('shop-page').classList.contains('active')) {
             renderShop();
        }
    }
    
    function checkForDailyBonus() { 
        const today = dayjs().format('YYYY-MM-DD'); 
        if (state.lastBonusDate === today) return; 
        const checkedInToday = state.lastCheckIn === today; 
        const focusedToday = state.focus.lastFocusDate === today && state.focus.todaySessions > 0; 
        const moodLoggedToday = state.moods && state.moods[today] !== undefined; 
        if (checkedInToday && focusedToday && moodLoggedToday) { 
            updateCoins(50, "โบนัสความขยัน!"); 
            state.lastBonusDate = today; 
            saveState(); 
            Swal.fire('ยอดเยี่ยม!', 'คุณได้รับโบนัสความขยัน +50 Coins!', 'success'); 
        } 
    }

    function checkForIdleCoins() { 
        if (!currentUser || !state.lastCoinUsage) return; 
        const daysSinceLastUse = dayjs().diff(dayjs(state.lastCoinUsage), 'day'); 
        if (daysSinceLastUse >= 7 && state.coins > 100) { 
            setTimeout(() => { 
                showToast("เหรียญในกระเป๋าคิดถึงคุณนะ! ลองไปร้านค้าดูสิ 🛍️"); 
            }, 3000); 
            state.lastCoinUsage = new Date().toISOString(); 
        } 
    }

    function renderWishList() { 
        const wishlistContainer = document.getElementById('wishlist-container'); 
        if (!wishlistContainer) return;
        const wishlist = state.wishList || { name: 'ของชิ้นต่อไป!', target: 1000 }; 
        const currentCoins = state.coins || 0; 
        const targetCoins = wishlist.target || 1000; 
        const percentage = Math.min(100, (currentCoins / targetCoins) * 100); 
        document.getElementById('wishlist-name').textContent = wishlist.name || 'ของชิ้นต่อไป!'; 
        document.getElementById('wishlist-progress-text').textContent = `${currentCoins} / ${targetCoins}`; 
        document.getElementById('wishlist-percentage').textContent = `${Math.floor(percentage)}%`; 
        document.getElementById('wishlist-progress-bar').style.width = `${percentage}%`; 
    }

    window.startReviewSession = (subject, topicId) => {
        currentQuizTopic = state.revisitTopics[subject].find(t => t.id === topicId);
        if (!currentQuizTopic) return;
        showPage('revisit');
        document.getElementById('revisit-list-view').classList.add('hidden');
        document.getElementById('flashcard-view').classList.remove('hidden');
        document.getElementById('flashcard-topic-title').textContent = currentQuizTopic.name;
        document.getElementById('flashcard-topic-notes').textContent = currentQuizTopic.notes || "ไม่มีโน้ตย่อ";
        const flashcardForm = document.getElementById('flashcard-form');
        flashcardForm.dataset.subject = subject;
        flashcardForm.dataset.topicId = String(topicId);
        shuffledFlashcards = [...(currentQuizTopic.flashcards || [])].sort(() => 0.5 - Math.random());
        currentCardIndex = 0;
        const flashcardQuizEl = document.getElementById('flashcard-quiz');
        if(shuffledFlashcards.length > 0) {
            flashcardQuizEl.classList.remove('hidden');
            displayNextFlashcard(); 
        } else { 
            flashcardQuizEl.classList.add('hidden'); 
            showToast("ยังไม่มี Flashcard ในหัวข้อนี้ ลองสร้างเพิ่มดูสิ!");
        }
    }

    async function handleEditWishList() {
        if (!currentUser) return;
        const currentWishList = state.wishList || { name: 'ของชิ้นต่อไป!', target: 1000 };
        const { value: formValues } = await Swal.fire({
            title: 'แก้ไขเป้าหมาย Wish List',
            html:
                `<input id="swal-input-name" class="swal2-input" placeholder="ชื่อของที่อยากได้" value="${currentWishList.name}">` +
                `<input id="swal-input-target" type="number" class="swal2-input" placeholder="ราคา (Coins)" value="${currentWishList.target}" min="1">`,
            focusConfirm: false,
            preConfirm: () => {
                const name = document.getElementById('swal-input-name').value.trim();
                const target = parseInt(document.getElementById('swal-input-target').value);
                if (!name || !target || target <= 0) {
                    Swal.showValidationMessage('กรุณากรอกข้อมูลให้ครบถ้วนและถูกต้อง');
                    return false;
                }
                return { name: name, target: target };
            },
            showCancelButton: true,
            confirmButtonText: 'บันทึก',
            cancelButtonText: 'ยกเลิก'
        });
        if (formValues) {
            state.wishList = {
                name: formValues.name,
                target: formValues.target
            };
            saveState();
            renderWishList();
            Swal.fire('สำเร็จ!', 'อัปเดต Wish List ของคุณแล้ว', 'success');
        }
    }

        function renderFocusStats(period = 'day') {
            const chartContainer = document.getElementById('focus-stats-chart-container');
            if (!chartContainer) return;

            const allFocusHistory = state.focusHistory || [];
            let filteredHistory = [];
            const now = dayjs();
            if (period === 'day') {
                filteredHistory = allFocusHistory.filter(item => dayjs(item.date).isSame(now, 'day'));
            } else if (period === 'week') {
                filteredHistory = allFocusHistory.filter(item => dayjs(item.date).isSame(now, 'week'));
            } else {
                filteredHistory = allFocusHistory;
            }

            chartContainer.innerHTML = '';
            
            if (filteredHistory.length === 0) {
                chartContainer.innerHTML = '<p style="text-align:center; color:var(--subtle-text-color); padding: 90px 0;"><i>ไม่มีข้อมูลการโฟกัส</i></p>';
                return;
            }

            const statsByTopic = filteredHistory.reduce((acc, item) => {
                const topicKey = item.topic || 'general';
                if (!acc[topicKey]) { acc[topicKey] = 0; }
                acc[topicKey] += item.duration;
                return acc;
            }, {});
            
            const maxMinutes = Math.max(...Object.values(statsByTopic), 1);
            const sortedStats = Object.entries(statsByTopic).sort((a, b) => b[1] - a[1]);
                
            const subjectMap = (state.subjects || []).reduce((acc, subject) => {
                acc[subject.value] = subject;
                return acc;
            }, {});
            subjectMap['general'] = { name: 'เรื่องทั่วไป', color: '#8E8E93', icon: '14' };
            
            sortedStats.forEach(([topicKey, totalMinutes]) => {
                const subject = subjectMap[topicKey] || subjectMap['general'];
                const barPercentage = (totalMinutes / maxMinutes) * 100;
                const currentTheme = document.body.dataset.theme || 'light';
                
                // ตรวจสอบและสร้าง Path ของไอคอนให้ถูกต้อง (รองรับกรณี general)
                const iconNumber = subject.icon || '14';
                const iconSrc = iconNumber === '14'
                    ? `assets/subject-icons/general-${currentTheme}${iconNumber}.png`
                    : `assets/subject-icons/${currentTheme}${iconNumber}.png`;

                // แปลงนาทีเป็นรูปแบบ "Xh Ym"
                const hours = Math.floor(totalMinutes / 60);
                const minutes = totalMinutes % 60;
                let timeString = '';
                if (hours > 0) timeString += `${hours}h `;
                if (minutes > 0 || totalMinutes === 0) timeString += `${minutes}m`;
                timeString = timeString.trim();

                const rowElement = document.createElement('div');
                rowElement.className = 'stat-item-row';
                
                // สร้าง HTML สำหรับแถวข้อมูล 1 แถว
                rowElement.innerHTML = `
                    <div class="stat-icon">
                        <img src="${iconSrc}" alt="${subject.name}">
                    </div>
                    <div class="stat-details">
                        <span class="stat-name">${subject.name}</span>
                        <div class="stat-progress-bar-wrapper">
                            <div class="stat-progress-bar" style="width: ${barPercentage}%; background-color: ${subject.color};"></div>
                        </div>
                    </div>
                    <span class="stat-time">${timeString}</span>
                `;
                chartContainer.appendChild(rowElement);
            });
        }
        
    function startTimer() {
        const startBtn = document.getElementById('start-timer-btn');
        if (!startBtn) return;
        startBtn.innerHTML = '<i data-feather="pause"></i> หยุดชั่วคราว';
        feather.replace();
        
        const topicSelectorBtn = document.getElementById('focus-topic-selector-btn');
        const settingsBtn = document.getElementById('settings-timer-btn');
        
        if (topicSelectorBtn) topicSelectorBtn.style.pointerEvents = 'none'; // ปิดการคลิกปุ่มเลือกหัวข้อ
        if (settingsBtn) settingsBtn.disabled = true;

        timerInterval = setInterval(() => {
            timeLeft--;
            updateTimerDisplay(timeLeft);

        if (timeLeft <= 0) {
        clearInterval(timerInterval);
        timerInterval = null;

            if (isFocusing) {
                // ... (โค้ดส่วนที่คำนวณ EXP และ Coins เหมือนเดิม) ...
                state.focus.combo = (state.focus.combo || 0) + 1;
                state.focus.todaySessions = (state.focus.todaySessions || 0) + 1;
                state.focus.totalSessions = (state.focus.totalSessions || 0) + 1;
                // ... (โค้ดบันทึก focus history และ saveState() เหมือนเดิม) ...
                
                // [เพิ่ม] รายการประโยคให้กำลังใจ
                const encouragementMessages = [
                    "🌟 เก่งมากเลยนะ ที่ตั้งใจขนาดนี้",
                    "☕ พักเถอะนะ เดี๋ยวลมดีๆ จะพัดรางวัลมาให้",
                    "🐢 เดินช้าไม่เป็นไร แต่อย่าหยุดเดินนะ",
                    "💡 สมองทำงานเก่งมาก ถึงเวลาพักแล้วล่ะ",
                    "🧸 วันนี้เก่งอีกแล้วนะ น่ารักจังเลย",
                    "📚 ขอบคุณที่สู้เพื่อความฝันของตัวเอง",
                    "🍰 พักก่อนนะ แล้วเดี๋ยวไปต่อด้วยพลังใหม่",
                    "✨ เธอทำได้ดีมากกว่าที่คิดนะ",
                    "☁️ แม้จะเหนื่อย แต่ยังไม่ยอมแพ้ เก่งสุดๆ",
                    "🎈 ทุกการพยายามของเธอ มีความหมายเสมอ",
                    "🌱 ถึงจะยังไม่ถึงเป้าหมาย แต่ก็เข้าใกล้ขึ้นทุกวัน",
                    "🧁 ให้รางวัลตัวเองด้วยคำว่า “ฉันภูมิใจในตัวเอง”",
                    "🫶 วันนี้เธอเก่งที่สุดในแบบของเธอแล้ว",
                    "🧘‍♂️ หายใจลึกๆ แล้วบอกตัวเองว่า “ฉันโอเค”",
                    "🦋 ความเหนื่อยตอนนี้ จะกลายเป็นรอยยิ้มในวันหน้า",
                    "🌈 ฟ้าหลังฝนมักสดใส เหมือนใจเธอหลังอ่านจบนั่นแหละ!"
                ];
                
                // [เพิ่ม] สุ่มเลือกข้อความ
                const randomMessage = encouragementMessages[Math.floor(Math.random() * encouragementMessages.length)];

                isFocusing = false;
                timeLeft = (state.settings.breakDuration || 5) * 60;
                document.getElementById('timer-mode').textContent = 'Break';
                updateTimerDisplay(timeLeft);
                
                // [แก้ไข] การแจ้งเตือนเมื่อโฟกัสสำเร็จ
                Swal.fire({
                    iconHtml: '<span style="font-size: 4rem;">🎉</span>', // ใช้อิโมจิแทนไอคอน
                    title: "เยี่ยมมาก! โฟกัสสำเร็จ",
                    text: randomMessage, // ใช้ข้อความที่สุ่มมา
                    confirmButtonText: 'OK',
                    didClose: () => {
                        if (!timerInterval) startTimer();
                    }
                });

            } else { // เมื่อหมดเวลาพัก
                isFocusing = true;
                timeLeft = (state.settings.focusDuration || 25) * 60;
                document.getElementById('timer-mode').textContent = 'Focus';
                updateTimerDisplay(timeLeft);
                
                if (topicSelectorBtn) topicSelectorBtn.style.pointerEvents = 'auto';
                if (settingsBtn) settingsBtn.disabled = false;
                
                // [แก้ไข] การแจ้งเตือนเมื่อหมดเวลาพัก
                Swal.fire({
                    iconHtml: '<span style="font-size: 4rem;">☕</span>', // ใช้อิโมจิถ้วยกาแฟ
                    title: "หมดเวลาพักแล้ว",
                    text: "กลับมาโฟกัสกันต่อ!",
                    confirmButtonText: 'OK'
                });
                
                const startBtnEl = document.getElementById('start-timer-btn');
                if(startBtnEl) {
                    startBtnEl.innerHTML = '<i data-feather="play"></i> เริ่ม';
                    feather.replace();
                }
            }    
            }
        }, 1000);
    }

    function stopTimer() { 
        clearInterval(timerInterval); 
        const startBtn = document.getElementById('start-timer-btn'); 
        startBtn.innerHTML = '<i data-feather="play"></i> ทำต่อ'; 
        feather.replace(); 
    }

    function resetTimer() { 
        clearInterval(timerInterval); 
        timerInterval = null; 
        isFocusing = true; 
        timeLeft = (state.settings?.focusDuration || 25) * 60; 
        const timerDisplay = document.getElementById('timer-display'); 
        if(timerDisplay) updateTimerDisplay(timeLeft); 
        const timerMode = document.getElementById('timer-mode'); 
        if(timerMode) timerMode.textContent = 'Focus'; 
        const startBtn = document.getElementById('start-timer-btn'); 
        if(startBtn) { 
            startBtn.innerHTML = '<i data-feather="play"></i> เริ่ม'; 
            feather.replace(); 
        }

        // [สำคัญ] เปิดการใช้งานปุ่มที่เคยปิดไว้อีกครั้ง
        const topicSelectorBtn = document.getElementById('focus-topic-selector-btn');
        const settingsBtn = document.getElementById('settings-timer-btn');
        if (topicSelectorBtn) topicSelectorBtn.style.pointerEvents = 'auto';
        if (settingsBtn) settingsBtn.disabled = false;
    }

    function handleSaveTimerSettings() {
        if (!state.settings) {
            state.settings = {};
        }
        
        // 1. ดึงค่าจาก input
        const newFocusDuration = parseInt(document.getElementById('focus-duration').value, 10);
        const newBreakDuration = parseInt(document.getElementById('break-duration').value, 10);

        // 2. ตรวจสอบว่าค่าถูกต้อง (เป็นตัวเลขและมากกว่า 0)
        if (isNaN(newFocusDuration) || newFocusDuration < 1 || isNaN(newBreakDuration) || newBreakDuration < 1) {
            showToast("กรุณาใส่เวลาเป็นตัวเลขที่มากกว่า 0");
            return;
        }

        // 3. อัปเดตค่าใน state
        state.settings.focusDuration = newFocusDuration;
        state.settings.breakDuration = newBreakDuration;
        
        // 4. บันทึก state ลง Firestore
        saveState();

        // 5. [สำคัญ] เรียกใช้ resetTimer() เพื่ออัปเดตหน้าปัดนาฬิกาทันที
        resetTimer();

        // 6. ปิด Modal และแจ้งเตือนผู้ใช้
        document.getElementById('timer-settings-modal').classList.add('hidden');
        showToast("บันทึกการตั้งค่าเรียบร้อยแล้ว!");
    }

    function updateTimerDisplay(time) { 
        const timerDisplayEl = document.getElementById('timer-display'); 
        if (!timerDisplayEl) return; 
        const minutes = Math.floor(time / 60); 
        const seconds = time % 60; 
        timerDisplayEl.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`; 
    }
    
    function renderProfilePicture(photoURL, imgElement) { 
        if (!imgElement) return; 
        const defaultImg = 'assets/profiles/startprofile.png'; 
        imgElement.src = photoURL || defaultImg; 
        imgElement.onerror = () => { imgElement.src = defaultImg; }; 
    }

    function populateProfileSelector() { 
        const container = document.querySelector('.profile-selector-body'); 
        if (!container) return; 
        container.innerHTML = ''; 
        profilePictures.forEach(pic => { 
            const path = `assets/profiles/${pic}`; 
            const option = document.createElement('div'); 
            option.className = 'profile-option'; 
            option.dataset.url = path; 
            const img = document.createElement('img'); 
            img.src = path; 
            option.appendChild(img); 
            if (path === state.profile.photoURL) { 
                option.classList.add('selected'); 
            } 
            container.appendChild(option); 
        }); 
    }
    
    // eslint-disable-next-line no-unused-vars
    function setupFriendListeners(userId) {
        if (!userId) return;
        if (friendListeners.length > 0) {
            friendListeners.forEach(unsubscribe => unsubscribe());
            friendListeners = [];
        }
        const userListener = db.collection('users').doc(userId).onSnapshot(doc => {
            if (doc.exists) {
                const data = doc.data();
                state.following = data.following || [];
                state.followers = data.followers || [];
                state.followRequests = data.followRequests || [];
                state.sentFollowRequests = data.sentFollowRequests || [];
                const requestCount = state.followRequests.length;
                const badge = document.getElementById('request-count-badge');
                const dot = document.getElementById('unread-notification-dot');
                if (badge) {
                    badge.textContent = requestCount;
                    badge.classList.toggle('hidden', requestCount === 0);
                }
                if (dot) {
                    dot.classList.toggle('hidden', requestCount === 0);
                }
                const communityPage = document.getElementById('community-page');
                const profilePage = document.getElementById('profile-page');
                if (communityPage && communityPage.classList.contains('active')) {
                    const activeTab = communityPage.querySelector('.tab-btn.active');
                    if (activeTab) {
                        const tab = activeTab.dataset.tab;
                        if (tab === 'requests') renderFollowRequests();
                        else if (tab === 'followers') renderFollowersList();
                        else renderFollowingList();
                    }
                }
                if (profilePage && profilePage.classList.contains('active')) {
                    renderProfilePage();
                }
            }
        }, error => {
            console.error("Error listening to user document:", error);
        });
        friendListeners.push(userListener);
    }

    // eslint-disable-next-line no-unused-vars
    async function renderFollowersList() {
        const listEl = document.getElementById('followers-list');
        if (!listEl) return;
        listEl.innerHTML = '<li>กำลังโหลด...</li>';
        const followerIds = state.followers || [];
        if (followerIds.length === 0) {
            listEl.innerHTML = '<li>ยังไม่มีผู้ติดตาม</li>';
            return;
        }
        const followerPromises = followerIds.map(uid => db.collection('users').doc(uid).get());
        const followerDocs = await Promise.all(followerPromises);
        listEl.innerHTML = followerDocs.map(doc => {
            if (!doc.exists) return '';
            const followerData = doc.data();
            const displayName = followerData.profile.displayName || 'User';
            const amIFollowing = (state.following || []).includes(doc.id);
            let actionButton = '';
            if (amIFollowing) {
                actionButton = `<button class="small-btn btn-secondary" disabled>กำลังติดตาม</button>`;
            } else {
                actionButton = `<button class="small-btn" onclick="handleFollowBack('${doc.id}')">ติดตามกลับ</button>`;
            }
            return `
                <li class="user-list-item">
                    <img src="${followerData.profile.photoURL || 'assets/profiles/startprofile.png'}" alt="Profile Photo" class="user-list-avatar">
                    <div class="user-info">
                        <h4>${displayName}</h4>
                        <p>${followerData.profile.lifebuddyId || ''}</p>
                    </div>
                    <div class="user-actions">
                        ${actionButton}
                    </div>
                </li>
            `;
        }).join('');
        feather.replace();
    }

    function showCommunityTab(tabName) {
        // จัดการ class 'active' ของปุ่มแท็บ
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });
        // จัดการ class 'active' ของเนื้อหาแท็บ
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.toggle('active', content.id.startsWith(tabName));
        });

        // เรียกฟังก์ชันวาดข้อมูลตามแท็บที่เลือก
        if (tabName === 'following') {
            renderFollowingList();
        } else if (tabName === 'followers') {
            renderFollowersList();
        } else if (tabName === 'requests') {
            renderFollowRequests();
        }
    }

    async function renderFollowingList() {
        const listEl = document.getElementById('following-list');
        if (!listEl) return;
        listEl.innerHTML = '<li>กำลังโหลด...</li>';
        const followingIds = state.following || [];
        if (followingIds.length === 0) {
            listEl.innerHTML = '<li class="empty-placeholder">คุณยังไม่ได้ติดตามใครเลย...</li>';
            return;
        }
        try {
            const followingPromises = followingIds.map(uid => db.collection('users').doc(uid).get());
            const followingDocs = await Promise.all(followingPromises);

            // [จุดสำคัญอยู่ตรงนี้]
            listEl.innerHTML = followingDocs.map(doc => {
                if (!doc.exists) return '';
                const friendData = doc.data();
                const isMutual = (friendData.followers || []).includes(currentUser.uid);
                const displayName = friendData.profile.displayName || 'User';
                const { level } = calculateLevel(friendData.exp || 0);

                // [สำคัญมาก] onclick ต้องเรียก showFriendProfile เท่านั้น
                return `
                    <li class="user-list-item" style="cursor: pointer;" onclick="showFriendProfile('${doc.id}')">
                        <img src="${friendData.profile.photoURL || 'assets/profiles/startprofile.png'}" alt="Profile Photo" class="user-list-avatar">
                        <div class="user-info">
                            <h4>${displayName}</h4>
                            <p class="subtle-text">Level ${level}</p>
                        </div>
                        ${isMutual ? '<i data-feather="repeat" class="mutual-icon" title="ติดตามซึ่งกันและกัน"></i>' : ''}
                    </li>
                `;
            }).join('');
            feather.replace();
        } catch (error) {
            console.error("Error rendering following list:", error);
            listEl.innerHTML = '<li>เกิดข้อผิดพลาดในการโหลดข้อมูล</li>';
        }
    }

    // ใน app.js, แทนที่ฟังก์ชัน renderChatList เดิมด้วยเวอร์ชันนี้
    
    async function handleFriendSearch(e) {
        e.preventDefault();
        const searchInput = document.getElementById('search-friends-input');
        const query = searchInput.value.trim();
        if (query.length < 3) {
            showToast("กรุณากรอกอย่างน้อย 3 ตัวอักษร");
            return;
        }
        const resultsContainer = document.getElementById('search-results-container');
        resultsContainer.innerHTML = '<p>กำลังค้นหา...</p>';
        try {
            const nameQuery = db.collection('users')
                .where('profile.displayName', '>=', query)
                .where('profile.displayName', '<=', query + '\uf8ff')
                .limit(10);
            const idQuery = db.collection('users')
                .where('profile.lifebuddyId', '==', query)
                .limit(10);
            const [nameSnapshot, idSnapshot] = await Promise.all([nameQuery.get(), idQuery.get()]);
            const results = new Map();
            nameSnapshot.forEach(doc => {
                if (doc.id !== currentUser.uid) {
                    results.set(doc.id, { id: doc.id, ...doc.data() });
                }
            });
            idSnapshot.forEach(doc => {
                if (doc.id !== currentUser.uid) {
                    results.set(doc.id, { id: doc.id, ...doc.data() });
                }
            });
            renderSearchResults(Array.from(results.values()));
        } catch (error) {
            console.error("Error searching for friends:", error);
            resultsContainer.innerHTML = '<p class="error-message">เกิดข้อผิดพลาดในการค้นหา</p>';
        }
    }
    
    function renderSearchResults(users) {
        lastSearchResults = users;
        const resultsContainer = document.getElementById('search-results-container');
        if (users.length === 0) {
            resultsContainer.innerHTML = '<p>ไม่พบผู้ใช้</p>';
            return;
        }
        resultsContainer.innerHTML = users.map(user => {
            const profile = user.profile;
            const amIFollowing = (state.following || []).includes(user.id);
            const requestSent = (state.sentFollowRequests || []).includes(user.id);
            let actionButton = '';
            if (amIFollowing) {
                actionButton = `<button class="small-btn btn-secondary" disabled>กำลังติดตาม</button>`;
            } else if (requestSent) {
                actionButton = `<button class="small-btn" disabled>ส่งคำขอแล้ว</button>`;
            } else {
                actionButton = `<button class="small-btn" onclick="handleSendFollowRequest('${user.id}')">ติดตาม</button>`;
            }
            return `
                <div class="search-result-item">
                    <img src="${profile.photoURL || 'assets/profiles/startprofile.png'}" alt="Profile Photo" class="profile-pic">
                    <div class="user-info">
                        <h4>${profile.displayName || 'ผู้ใช้'}</h4>
                        <p class="subtle-text">${profile.lifebuddyId || ''}</p>
                    </div>
                    <div class="user-actions">
                        ${actionButton}
                    </div>
                </div>
            `;
        }).join('');
    }
    
    // eslint-disable-next-line no-unused-vars
    window.handleSendFollowRequest = async (recipientId) => {
        if (!currentUser) return;
        const senderId = currentUser.uid;
        const senderRef = db.collection('users').doc(senderId);
        const recipientRef = db.collection('users').doc(recipientId);
        const batch = db.batch();
        batch.update(senderRef, { sentFollowRequests: firebase.firestore.FieldValue.arrayUnion(recipientId) });
        batch.update(recipientRef, { followRequests: firebase.firestore.FieldValue.arrayUnion(senderId) });
        await batch.commit();
        showToast("ส่งคำขอติดตามแล้ว!");
        if (!state.sentFollowRequests) state.sentFollowRequests = [];
        state.sentFollowRequests.push(recipientId);
        renderSearchResults(lastSearchResults);
    };
    
    // eslint-disable-next-line no-unused-vars
    window.handleAcceptFollowRequest = async (senderId) => {
        if (!currentUser) return;
        const recipientId = currentUser.uid;
        const senderRef = db.collection('users').doc(senderId);
        const recipientRef = db.collection('users').doc(recipientId);

        try {
            const batch = db.batch();
            batch.update(recipientRef, { 
                following: firebase.firestore.FieldValue.arrayUnion(senderId),
                followers: firebase.firestore.FieldValue.arrayUnion(senderId),
                followRequests: firebase.firestore.FieldValue.arrayRemove(senderId) 
            });
            batch.update(senderRef, { 
                sentFollowRequests: firebase.firestore.FieldValue.arrayRemove(recipientId) 
            });
            await batch.commit();
            showToast("ยอมรับคำขอติดตามแล้ว ตอนนี้คุณเป็นเพื่อนกัน!");
        } catch (error) {
            console.error("Error accepting follow request:", error);
            showToast("เกิดข้อผิดพลาดในการยอมรับคำขอ");
        }
    };
    
    window.handleDeclineFollowRequest = async (senderId) => {
        if (!currentUser) return;
        const recipientId = currentUser.uid;
        const senderRef = db.collection('users').doc(senderId);
        const recipientRef = db.collection('users').doc(recipientId);

        try {
            const batch = db.batch();
            batch.update(recipientRef, { followRequests: firebase.firestore.FieldValue.arrayRemove(senderId) });
            batch.update(senderRef, { sentFollowRequests: firebase.firestore.FieldValue.arrayRemove(recipientId) });
            await batch.commit();
            showToast("ลบคำขอติดตามแล้ว");
        } catch (error) {
            console.error("Error declining follow request:", error);
            showToast("เกิดข้อผิดพลาดในการลบคำขอ");
        }
    };
    
    // eslint-disable-next-line no-unused-vars
    window .handleFollowBack = async (targetUserId) => {
        if (!currentUser) return;
        const currentUserId = currentUser.uid;

        // ดึง Reference ของ Document ทั้งสอง
        const userRef = db.collection('users').doc(currentUserId);
        const targetUserRef = db.collection('users').doc(targetUserId);

        try {
            // ใช้ Batch เพื่อให้การเขียนข้อมูล 2 ที่สำเร็จพร้อมกัน
            const batch = db.batch();

            // 1. อัปเดต Document ของเรา: เพิ่ม targetUserId เข้าไปใน array 'following'
            batch.update(userRef, { following: firebase.firestore.FieldValue.arrayUnion(targetUserId) });
            
            // 2. อัปเดต Document ของเป้าหมาย: เพิ่ม currentUserId เข้าไปใน array 'followers'
            batch.update(targetUserRef, { followers: firebase.firestore.FieldValue.arrayUnion(currentUserId) });
            
            // สั่งให้ Batch ทำงาน
            await batch.commit();
            
            // [ส่วนที่เพิ่มเข้ามา]
            // 3. อัปเดต State ฝั่ง Client ทันทีเพื่อความรวดเร็ว
            if (!state.following) state.following = [];
            state.following.push(targetUserId);

            // 4. สั่งให้วาดรายการผู้ติดตามใหม่ทั้งหมดด้วยข้อมูลล่าสุด
            renderFollowersList(); 

            // 5. แสดง Toast แจ้งเตือน
            showToast("ติดตามกลับแล้ว!");

        } catch (error) {
            console.error("Error following back user:", error);
            showToast("เกิดข้อผิดพลาดในการติดตามกลับ");
        }
    };
    
    // [ADVANCED DEBUG VERSION]
    async function renderFollowRequests() {
        const listEl = document.getElementById('friend-requests-list');
        const badgeEl = document.getElementById('request-count-badge');
        if (!listEl || !badgeEl) return;

        listEl.innerHTML = '<li class="loading-placeholder">กำลังโหลด...</li>';
        const requestIds = state.followRequests || [];

        badgeEl.textContent = requestIds.length;
        badgeEl.classList.toggle('hidden', requestIds.length === 0);

        if (requestIds.length === 0) {
            listEl.innerHTML = '<li class="empty-placeholder">ไม่มีคำขอติดตาม</li>';
            return;
        }

        try {
            const requestPromises = requestIds.map(uid => db.collection('users').doc(uid).get());
            const requestDocs = await Promise.all(requestPromises);

            let finalHtml = '';
            requestDocs.forEach(doc => {
                if (!doc.exists) return; // ข้าม user ที่ไม่มีข้อมูล
                const senderData = doc.data();
                const { displayName, lifebuddyId, photoURL } = senderData.profile;
                
                finalHtml += `
                    <li class="user-list-item">
                        <img src="${photoURL || 'assets/profiles/startprofile.png'}" alt="Profile Photo" class="user-list-avatar">
                        <div class="user-info">
                            <h4>${displayName || 'User'}</h4>
                            <p class="subtle-text">${lifebuddyId || ''}</p>
                        </div>
                        <div class="user-actions">
                            <button class="small-btn" onclick="handleAcceptFollowRequest('${doc.id}')"><i data-feather="check"></i> ยอมรับ</button>
                            <button class="small-btn btn-secondary" onclick="handleDeclineFollowRequest('${doc.id}')"><i data-feather="x"></i> ลบ</button>
                        </div>
                    </li>
                `;
            });

            listEl.innerHTML = finalHtml || '<li class="empty-placeholder">ไม่พบข้อมูลคำขอ</li>';
            feather.replace();

        } catch (error) {
            console.error("Error rendering follow requests:", error);
            listEl.innerHTML = '<li>เกิดข้อผิดพลาดในการโหลดข้อมูล</li>';
        }
    }

    function initializeTcasPage() {
        // Generate TPAT inputs
        const tpatContainer = document.querySelector('.tpat-grid');
        tpatContainer.innerHTML = Object.entries(tpatSubjects).map(([key, label]) => `
            <div class="score-input-item">
                <label>${label}</label>
                <input type="text" inputmode="decimal" name="${key}" placeholder="100.00">
            </div>
        `).join('');

        // Generate A-Level inputs
        const alevelContainer = document.querySelector('.alevel-grid');
        alevelContainer.innerHTML = Object.entries(alevelSubjects).map(([fullName, shortName]) => `
            <div class="score-input-item">
                <label>${shortName}</label>
                <input type="text" inputmode="decimal" name="${fullName.replace(/\s/g, '_')}" placeholder="100.00">
            </div>
        `).join('');


        // Populate specific subjects dropdown
        const specificSelect = document.getElementById('specific-subject-select');
        // [จุดที่แก้ไข] เปลี่ยนจากการใช้ label ธรรมดา เป็น subjectData.label
        specificSelect.innerHTML = '<option value="">-- เลือกวิชาเฉพาะ และ GPA --</option>' + 
            Object.entries(specificSubjects).map(([key, subjectData]) => `<option value="${key}">${subjectData.label}</option>`).join('');
        
        // Load saved scores
        loadSavedScores();
    }

        // ฟังก์ชันหลักสำหรับคำนวณเปอร์เซ็นต์ TCAS
        function handleTcasCalculation(formula) {
            const form = document.getElementById('tcas-score-form-container');
            if (!form) return;

            // 1. ดึงคะแนนทั้งหมดจากฟอร์มที่ผู้ใช้กรอก
            const inputs = form.querySelectorAll('input[type="number"]');
            const userScores = {};
            inputs.forEach(input => {
                if (input.value !== '') {
                    userScores[input.name] = parseFloat(input.value);
                }
            });

            // สร้างคะแนน TGAT_TOTAL สำหรับสูตรที่ต้องใช้คะแนนรวม
            userScores['TGAT_TOTAL'] = (userScores['TGAT1'] || 0) + (userScores['TGAT2'] || 0) + (userScores['TGAT3'] || 0);

            let totalWeightedPercentage = 0;
            let breakdownHTML = '';
            let missingSubjects = [];

            // 2. วนลูปตามสูตรที่กำหนด (ในที่นี้คือสูตรตัวอย่าง)
            for (const subjectKey in formula.weights) {
                const score = userScores[subjectKey];
                const maxScore = TCAS_SUBJECT_MAX_SCORES[subjectKey];
                const weight = formula.weights[subjectKey];

                if (score === undefined || score === null || isNaN(score)) {
                    missingSubjects.push(subjectKey.replace(/_/g, ' '));
                    continue; // ข้ามไปวิชาถัดไปถ้าไม่มีคะแนน
                }
                
                if (maxScore) {
                    const weightedValue = (score / maxScore) * weight;
                    totalWeightedPercentage += weightedValue;
                    breakdownHTML += `<li><strong>${subjectKey.replace(/_/g, ' ')}:</strong> 
                        (${score.toFixed(2)} / ${maxScore.toFixed(2)}) × ${weight}% = <strong>${weightedValue.toFixed(2)}%</strong></li>`;
                }
            }

            if (missingSubjects.length > 0) {
                showToast(`กรุณากรอกคะแนนสำหรับ: ${missingSubjects.join(', ')}`);
                return;
            }

            // 3. แสดงผลลัพธ์ทั้งหมดด้วย SweetAlert
            Swal.fire({
                title: `ผลการคำนวณ (${formula.name})`,
                html: `
                    <div class="tcas-result-card" style="text-align: left; background: none; border: none; padding: 0;">
                        <p style="text-align: center;">คะแนนรวมแบบเปอร์เซ็นต์ของคุณคือ:</p>
                        <div class="result-score" style="font-size: 3.5rem; text-align: center; color: var(--primary-color); margin: 10px 0;">${totalWeightedPercentage.toFixed(2)}%</div>
                        <hr>
                        <p><strong>รายละเอียด:</strong></p>
                        <ul id="tcas-score-breakdown" style="list-style: none; padding: 0; display: flex; flex-direction: column; gap: 10px;">
                            ${breakdownHTML}
                        </ul>
                    </div>
                `,
                icon: 'success',
                confirmButtonText: 'ยอดเยี่ยม!'
            });
        }

    function addSpecificSubjectInput(subjectKey) {
        if (!subjectKey || document.querySelector(`.specific-input-item[data-key="${subjectKey}"]`)) return;

        const subjectData = specificSubjects[subjectKey];
        if (!subjectData) return;

        const container = document.getElementById('specific-subject-inputs');
        
        // [แก้ไข] เพิ่ม div.input-wrapper เข้ามา
        const inputHTML = `
            <div class="score-input-item specific-input-item" data-key="${subjectKey}">
                <div class="input-wrapper">
                    <label>${subjectData.label}</label>
                    <input type="text" inputmode="decimal" name="${subjectKey}" placeholder="${subjectData.placeholder}">
                </div>
                <button type="button" class="remove-specific-subject-btn icon-button" title="ลบวิชานี้">
                    <i data-feather="x"></i>
                </button>
            </div>
        `;
        container.insertAdjacentHTML('beforeend', inputHTML);
        feather.replace();
    }

    function saveAllScores() {
        const form = document.getElementById('tcas-score-form-container');
        const inputs = form.querySelectorAll('input[type="number"]');
        let scoresToSave = {};
        inputs.forEach(input => {
            if (input.value !== '') {
                scoresToSave[input.name] = input.value;
            }
        });
        state.profile.savedScores = scoresToSave;
        saveState();
        showToast("บันทึกคะแนนของคุณแล้ว!");
    }

    function loadSavedScores() {
        const savedScores = state.profile.savedScores || {};
        const form = document.getElementById('tcas-score-form-container');
        const inputs = form.querySelectorAll('input[type="number"]');
        inputs.forEach(input => {
            if (savedScores[input.name]) {
                input.value = savedScores[input.name];
            }
        });
    }

    function clearAllTcasScores() {
        Swal.fire({
            title: 'ยืนยันการล้างข้อมูล', text: "คุณต้องการล้างคะแนนทั้งหมดที่กรอกไว้ใช่ไหม?",
            icon: 'warning', showCancelButton: true, confirmButtonColor: 'var(--danger-color)',
            confirmButtonText: 'ใช่, ล้างข้อมูล', cancelButtonText: 'ยกเลิก'
        }).then(result => {
            if(result.isConfirmed) {
                document.querySelectorAll('#tcas-score-form-container input[type="number"]').forEach(input => input.value = '');
                document.getElementById('specific-subject-inputs').innerHTML = '';
                state.profile.savedScores = {};
                saveState();
                showToast('ล้างข้อมูลคะแนนทั้งหมดแล้ว');
            }
        });
    }

    // =========================================
    // ===== 7. EVENT LISTENERS & HANDLERS =====
    // =========================================
    function handleCheckIn() {
        if (document.getElementById('check-in-btn').disabled) return;
        const todayStr = dayjs().format('YYYY-MM-DD');

        // กรณีที่ 1: กำลังกู้สตรีค (กดปุ่มไฟเย็น)
        if (state.isStreakFrozen === true) {
            if (state.streakFreezesAvailable <= 0) {
                showToast("โควต้ากู้สตรีคของคุณหมดแล้ว");
                return;
            }
            state.streakFreezesAvailable--;
            state.isStreakFrozen = false;
            // ไม่บวกสตรีคตอนกู้ แต่จะบวกตอนเช็คอินจริง
            state.lastCheckIn = todayStr; // ตั้งค่าการเช็คอินเป็นวันนี้
            state.streak++; // เพิ่มสตรีคสำหรับวันนี้

            addExp(20); // อาจจะให้รางวัลน้อยกว่าปกติ
            saveState();
            updateHeaderUI();
            showToast(`กู้สตรีคสำเร็จ! สตรีคของคุณคือ ${state.streak} วัน`);
            checkForDailyBonus();

        } else {
            // กรณีที่ 2: เช็คอินตามปกติ
            const yesterdayStr = dayjs().subtract(1, 'day').format('YYYY-MM-DD');
            const isContinuing = state.lastCheckIn === yesterdayStr;
            
            // รีเซ็ตสตรีคถ้าไม่ได้มาจากเมื่อวาน
            if (!isContinuing) {
                state.streak = 0;
            }
            
            state.streak++; // เพิ่มสตรีคสำหรับวันนี้
            state.lastCheckIn = todayStr;
            
            addExp(40);
            updateCoins(5, "เช็คอินรายวัน");
            saveState();
            updateHeaderUI();
            checkForDailyBonus();
            showToast(`เช็คอินสำเร็จ! สตรีคต่อเนื่อง ${state.streak} วัน`);
        }
    }

    function showStreakModal() {
        if (!currentUser) { // ถ้ายังไม่ล็อกอิน ให้ไปหน้าล็อกอินแทน
            openAuthModal();
            return;
        }

        const todayStr = dayjs().format('YYYY-MM-DD');

        // --- กรณีที่ 3: เช็คอินไปแล้ววันนี้ ---
        if (state.lastCheckIn === todayStr) {
            Swal.fire({
                html: `
                    <div class="swal-streak-header">
                        <div class="swal-streak-icon" style="text-shadow: 0 4px 20px rgba(255, 193, 7, 0.5);">🎉</div>
                        <h2 class="swal-streak-title">เช็คอินแล้ว!</h2>
                    </div>
                    <p class="swal-streak-text">
                        ยอดเยี่ยม! คุณเช็คอินสำหรับวันนี้เรียบร้อยแล้ว<br>
                        สตรีคปัจจุบันของคุณคือ <strong>${state.streak} วัน</strong>
                    </p>
                    <p class="swal-streak-subtext">กลับมาอีกครั้งในวันพรุ่งนี้นะ!</p>
                `,
                confirmButtonText: 'รับทราบ',
                width: '380px',
                showConfirmButton: true,
                customClass: {
                    confirmButton: 'swal-acknowledge-button'
                }
            });
            return; // จบการทำงาน
        }

        // --- กรณีที่ 2: สตรีคแข็งอยู่ (ไฟเย็น) ---
        if (state.isStreakFrozen === true) {
            Swal.fire({
            // 1. ใช้ "ช่อง" สำหรับไอคอนโดยเฉพาะ
            html: `
                <div class="swal-streak-icon">🧊</div>
                <p class="swal-streak-subtext">
                    คุณมีโควต้ากู้สตรีคเหลือ <strong>${state.streakFreezesAvailable} ครั้ง</strong> ในเดือนนี้
                </p>
            `,
            // 2. ใช้ "ช่อง" สำหรับ Title โดยเฉพาะ (จะถูกจัดกลางให้อัตโนมัติ)
            title: 'แย่แล้ว!',

            // 3. ใช้ "ช่อง" สำหรับข้อความหลักโดยเฉพาะ
            text: 'ดูเหมือนว่าคุณจะลืมเช็คอินเมื่อวานนี้ แต่ไม่เป็นไร! คุณสามารถใช้ "ไฟเย็น" เพื่อกู้สตรีคของคุณกลับมาได้',

            // 4. ส่วนปุ่มยังเหมือนเดิม
            showConfirmButton: false,
            width: '380px',
            didOpen: () => {
                // สร้างปุ่มขึ้นมาเองเพื่อควบคุมได้เต็มที่
                const container = Swal.getHtmlContainer();
                const button = document.createElement('button');
                button.id = 'swal-restore-btn';
                button.className = 'swal-checkin-button swal-restore-button';
                button.textContent = 'กู้สตรีคของฉัน';
                button.onclick = () => {
                    handleCheckIn();
                    Swal.close();
                };
                container.appendChild(button);
            }
        });
            return; // จบการทำงาน
        }

        // --- กรณีที่ 1: เช็คอินได้ตามปกติ ---
        Swal.fire({
            html: `
                <div class="swal-streak-header">
                    <div class="swal-streak-icon" style="text-shadow: 0 4px 20px rgba(255, 159, 10, 0.5);">🔥</div>
                    <h2 class="swal-streak-title">เช็คอินรายวัน</h2>
                </div>
                <p class="swal-streak-text">
                    มาเริ่มต้นวันดีๆ ด้วยการเช็คอินกันเถอะ!
                    การเช็คอินต่อเนื่องจะช่วยเพิ่ม EXP และ Coins ให้กับคุณ
                </p>
                <button id="swal-checkin-now-btn" class="swal-checkin-button">เช็คอินเลย!</button>
            `,
            showConfirmButton: false,
            width: '380px',
            didOpen: () => {
                document.getElementById('swal-checkin-now-btn').addEventListener('click', () => {
                    handleCheckIn();
                    Swal.close();
                });
            }
        });
    }

    function handleProfileFormSubmit(e) { 
        e.preventDefault(); 
        if (!currentUser) return; 
        Swal.fire({ 
            title: 'ยืนยันการบันทึก', 
            text: "คุณต้องการบันทึกการเปลี่ยนแปลงข้อมูลใช่หรือไม่?", 
            icon: 'question', 
            showCancelButton: true, 
            confirmButtonColor: 'var(--primary-color)', 
            cancelButtonColor: 'var(--danger-color)', 
            confirmButtonText: 'ใช่, บันทึกเลย!', 
            cancelButtonText: 'ยกเลิก' 
        }).then(async (result) => { 
            if (result.isConfirmed) { 
                state.profile.displayName = document.getElementById('display-name').value.trim(); 
                state.profile.gender = document.getElementById('gender').value; 
                state.profile.age = document.getElementById('age').value; 
                state.profile.bio = document.getElementById('bio').value; 
                state.settings.showEmail = document.getElementById('show-email-toggle').checked; 
                await saveState(); 
                updateHeaderUI(); 
                Swal.fire('บันทึกสำเร็จ!', 'ข้อมูลโปรไฟล์ของคุณถูกอัปเดตแล้ว', 'success').then(() => { 
                    document.getElementById('profile-edit-mode').classList.add('hidden'); 
                    document.getElementById('profile-view-mode').classList.remove('hidden'); 
                    renderProfilePage(); 
                }); 
            } 
        }); 
    }

    async function handleEditWishList() {
        // ป้องกันการทำงานหากยังไม่ได้ login
        if (!currentUser) {
            showToast("กรุณาเข้าสู่ระบบเพื่อใช้งานฟังก์ชันนี้");
            openAuthModal();
            return;
        }

        // ดึงข้อมูล Wish List ปัจจุบันจาก state
        const currentWishList = state.wishList || { name: 'ของชิ้นต่อไป!', target: 1000 };
        
        // ใช้ Swal.fire เพื่อสร้าง Popup สำหรับแก้ไขข้อมูล
        const { value: formValues } = await Swal.fire({
            title: 'แก้ไขเป้าหมาย Wish List',
            html:
                `<input id="swal-input-name" class="swal2-input" placeholder="ชื่อของที่อยากได้" value="${currentWishList.name}">` +
                `<input id="swal-input-target" type="number" class="swal2-input" placeholder="ราคา (Coins)" value="${currentWishList.target}" min="1">`,
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonText: 'บันทึก',
            cancelButtonText: 'ยกเลิก',
            preConfirm: () => {
                const name = document.getElementById('swal-input-name').value.trim();
                const target = parseInt(document.getElementById('swal-input-target').value);

                // ตรวจสอบข้อมูลก่อนยืนยัน
                if (!name || !target || target <= 0) {
                    Swal.showValidationMessage('กรุณากรอกข้อมูลให้ครบถ้วนและถูกต้อง');
                    return false;
                }
                return { name: name, target: target };
            }
        });

        // ถ้าผู้ใช้กดยืนยันและข้อมูลถูกต้อง
        if (formValues) {
            // อัปเดตข้อมูลใน state
            state.wishList = {
                name: formValues.name,
                target: formValues.target
            };
            
            saveState(); // บันทึกข้อมูลลง Firestore
            renderWishList(); // วาด Wish List ใหม่ทันที
            
            Swal.fire('สำเร็จ!', 'อัปเดต Wish List ของคุณแล้ว', 'success');
        }
    }
    
    function handleMoodFormSubmit(e) { 
        e.preventDefault(); 
        const selectedMood = document.getElementById('selected-mood').value; 
        if (!selectedMood) { 
            showToast("กรุณาเลือกอารมณ์ของคุณก่อน"); 
            return; 
        } 
        const notes = document.getElementById('mood-notes').value; 
        const reasons = Array.from(document.querySelectorAll('input[name="mood-reason"]:checked')).map(el => el.value); 
        const dateToSave = selectedMoodDate; 
        if (!state.moods) {
            state.moods = {}; 
        }
        const hadPreviousEntry = !!state.moods[dateToSave]; 
        state.moods[dateToSave] = { mood: selectedMood, notes: notes, reasons: reasons }; 
        if (!hadPreviousEntry) { 
            updateCoins(5, "บันทึกอารมณ์");
            addExp(25);
        } 
        document.getElementById('mood-form').reset(); 
        document.querySelectorAll('.emoji-option.selected').forEach(el => el.classList.remove('selected')); 
        saveState(); 
        renderMoodCalendar(currentMoodDate);
        showToast("บันทึกอารมณ์เรียบร้อยแล้ว!"); 
        if (dateToSave === dayjs().format('YYYY-MM-DD')) {
            checkForDailyBonus();
        }
    }
    
    function handlePlannerFormSubmit(e) { 
        e.preventDefault(); 
        const eventNameInput = document.getElementById('event-name'); 
        
        // [แก้ไข] เปลี่ยนตัวแปร eventCategoryInput
        const eventCategoryBtn = document.getElementById('event-category-selector-btn'); 
        
        const eventTimeInput = document.getElementById('event-time'); 
        const eventName = eventNameInput.value.trim(); 
        
        // [แก้ไข] อ่านค่าจาก data-value ของปุ่ม
        const eventCategory = eventCategoryBtn.dataset.value; 
        
        const eventTime = eventTimeInput.value; 

        // [แก้ไข] เพิ่มการตรวจสอบว่าเลือกหมวดหมู่หรือยัง
        if (eventName && eventCategory && eventTime) { 
            const newEvent = { name: eventName, category: eventCategory, time: eventTime }; 
            if (!state.planner) state.planner = {}; 
            if (!state.planner[selectedPlannerDate]) { 
                state.planner[selectedPlannerDate] = []; 
            } 
            state.planner[selectedPlannerDate].push(newEvent); 
            saveState(); 
            renderPlannerCalendar(currentPlannerDate); 
            
            // รีเซ็ตฟอร์ม
            eventNameInput.value = ''; 
            eventTimeInput.value = ''; 
            eventCategoryBtn.dataset.value = '';
            eventCategoryBtn.querySelector('span').textContent = 'เลือกหมวดหมู่';

            showToast("เพิ่มกิจกรรมเรียบร้อยแล้ว!"); 
        } else { 
            showToast("กรุณากรอกข้อมูลให้ครบทุกช่อง"); 
        } 
    }

    function handleTodoFormSubmit(e) {
        e.preventDefault();
        const todoInput = document.getElementById('todo-input');
        const newTodoText = todoInput.value.trim();

        // ตรวจสอบว่าผู้ใช้กรอกข้อความหรือไม่
        if (!newTodoText) {
            showToast("กรุณาใส่เป้าหมายของคุณ");
            return;
        }
        
        // ตรวจสอบว่ามี state.todos อยู่หรือไม่ ถ้าไม่มีให้สร้างขึ้นมาใหม่
        if (!state.todos) {
            state.todos = [];
        }
        
        // สร้าง object สำหรับ to-do ใหม่
        const newTodo = {
            id: Date.now(), // ใช้ timestamp เป็น ID ที่ไม่ซ้ำกัน
            text: newTodoText,
            completed: false,
            rewarded: false // เพิ่ม property นี้เพื่อป้องกันการให้รางวัลซ้ำ
        };
        
        // เพิ่ม to-do ใหม่เข้าไปใน state
        state.todos.push(newTodo);
        
        // บันทึก state และอัปเดต UI
        saveState();
        updateHomePageUI(); // เรียกฟังก์ชันนี้เพื่อวาดรายการ to-do ใหม่
        
        // เคลียร์ช่อง input ให้พร้อมสำหรับเป้าหมายถัดไป
        todoInput.value = '';
        
        showToast("เพิ่มเป้าหมายสำเร็จ!");
    }
    function handleAddActivityForm(e) {
        e.preventDefault();
        const input = document.getElementById('new-activity-input');
        const newActivityText = input.value.trim();

        if (!newActivityText) {
            showToast("กรุณาใส่ชื่อกิจกรรม");
            return;
        }
        
        // ตรวจสอบว่ามี state.userActivities หรือไม่
        if (!state.userActivities) {
            state.userActivities = [];
        }
        
        // เพิ่มกิจกรรมใหม่เข้าไปใน state
        state.userActivities.push(newActivityText);
        
        saveState();
        renderActivityList(); // วาดรายการใหม่
        input.value = ''; // เคลียร์ช่อง input
        showToast("เพิ่มกิจกรรมใหม่สำเร็จ!");
    }

    // ===== ฟังก์ชันสำหรับจัดการฟอร์ม "เพิ่มคำแนะนำ" =====
    function handleAddAdviceForm(e) {
        e.preventDefault();
        const input = document.getElementById('new-advice-input');
        const newAdviceText = input.value.trim();

        if (!newAdviceText) {
            showToast("กรุณาใส่คำแนะนำ");
            return;
        }
        
        if (!state.userAdvice) {
            state.userAdvice = [];
        }
        
        state.userAdvice.push(newAdviceText);
        
        saveState();
        renderUserAdviceList(); // วาดรายการใหม่
        input.value = '';
        showToast("เพิ่มคำแนะนำใหม่สำเร็จ!");
    }
    function handleRevisitFormSubmit(e) {
        e.preventDefault();
        const subject = document.getElementById('revisit-subject-value').value; 
        const topicName = document.getElementById('revisit-topic-name').value.trim();
        const topicNotes = document.getElementById('revisit-topic-notes').value.trim();
        const intervals = Array.from(document.querySelectorAll('input[name="review-interval"]:checked')).map(el => parseInt(el.value));
        if (!subject || !topicName) {
            showToast("กรุณาเลือกวิชาและใส่ชื่อหัวข้อ");
            return;
        }
        if (intervals.length === 0) {
            showToast("กรุณาเลือกรอบการทบทวนอย่างน้อย 1 รอบ");
            return;
        }
        const newTopic = {
            id: Date.now(),
            name: topicName,
            notes: topicNotes,
            level: 0,
            reviewIntervals: intervals.sort((a, b) => a - b),
            nextReviewDate: dayjs().add(intervals[0], 'day').format('YYYY-MM-DD'),
            quizzes: []
        };
        if (!state.revisitTopics[subject]) {
            state.revisitTopics[subject] = [];
        }
        state.revisitTopics[subject].push(newTopic);
        saveState();
        renderRevisitList();
        document.getElementById('revisit-form').reset();
        showToast(`เพิ่มหัวข้อ "${topicName}" ในวิชา${subject}แล้ว!`);
        addExp(15);
    }

    async function handleSignupFormSubmit(e) {
        e.preventDefault();
        const emailInput = document.getElementById('signup-email');
        const passwordInput = document.getElementById('signup-password');
        const confirmPasswordInput = document.getElementById('signup-password-confirm');
        const authErrorEl = document.getElementById('auth-error');

        const email = emailInput.value;
        const password = passwordInput.value;
        const confirmPassword = confirmPasswordInput.value;

        // 1. ตรวจสอบรหัสผ่านว่าตรงกันหรือไม่
        if (password !== confirmPassword) {
            Swal.fire({
                title: 'เกิดข้อผิดพลาด',
                text: 'รหัสผ่านและการยืนยันรหัสผ่านไม่ตรงกัน',
                icon: 'error',
                confirmButtonText: 'ตกลง'
            });
            if (authErrorEl) authErrorEl.textContent = 'รหัสผ่านไม่ตรงกัน';
            return;
        }

        // 2. ตรวจสอบความปลอดภัยของรหัสผ่าน (ขั้นต่ำ 6 ตัวอักษรตามที่ Firebase กำหนด)
        if (password.length < 6) {
            Swal.fire({
                title: 'รหัสผ่านไม่ปลอดภัย',
                text: 'รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร',
                icon: 'warning',
                confirmButtonText: 'ตกลง'
            });
            if (authErrorEl) authErrorEl.textContent = 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร';
            return;
        }

        try {
            // 3. ใช้ Firebase auth เพื่อสร้างผู้ใช้ใหม่
            const userCredential = await auth.createUserWithEmailAndPassword(email, password);
            const user = userCredential.user;

            // 4. [สำคัญ] สร้างข้อมูลเริ่มต้นสำหรับผู้ใช้ใหม่ใน Firestore
            // เราจะสร้าง LifeBuddy ID ที่ไม่ซ้ำกัน และตั้งค่าเริ่มต้นอื่นๆ
            const initialName = user.email.split('@')[0];
            const randomTag = Math.floor(1000 + Math.random() * 9000);
            const newUserProfileData = JSON.parse(JSON.stringify(initialState)); // คัดลอกโครงสร้างข้อมูลเริ่มต้น
            newUserProfileData.profile.displayName = initialName;
            newUserProfileData.profile.lifebuddyId = `${initialName}#${randomTag}`;
            newUserProfileData.profile.joinDate = new Date().toISOString(); // บันทึกวันเข้าร่วม

            // บันทึกข้อมูลโปรไฟล์ใหม่ลง Firestore
            await db.collection('users').doc(user.uid).set(newUserProfileData);

            // 5. หากสมัครและสร้างข้อมูลสำเร็จ
            closeAuthModal();
            showToast('สมัครสมาชิกสำเร็จ ยินดีต้อนรับ!');
            // onAuthStateChanged จะทำงานต่อและโหลดข้อมูลผู้ใช้ใหม่โดยอัตโนมัติ

        } catch (error) {
            // 6. หากเกิดข้อผิดพลาดจาก Firebase (เช่น อีเมลนี้ถูกใช้แล้ว)
            const friendlyMessage = getFriendlyAuthError(error);

            // แสดงข้อความใน Modal
            if (authErrorEl) {
                authErrorEl.textContent = friendlyMessage;
            }

            // แสดง Popup แจ้งเตือน
            Swal.fire({
                title: 'สมัครสมาชิกไม่สำเร็จ',
                text: friendlyMessage,
                icon: 'error',
                confirmButtonText: 'ตกลง'
            });
        }
    }

    function updatePasswordStrength() {
        const password = document.getElementById('signup-password').value;
        const strengthText = document.getElementById('password-strength-text');
        if (!strengthText) return; // ตรวจสอบแค่ strengthText

        if (password.length === 0) {
            strengthText.classList.add('hidden'); // ซ่อนข้อความเมื่อไม่มีการพิมพ์
            strengthText.textContent = '';
            return;
        }
        
        strengthText.classList.remove('hidden'); // แสดงข้อความ

        // Logic การคำนวณ score เหมือนเดิม
        let score = 0;
        if (password.length >= 8) score++;
        if (/\d/.test(password)) score++;
        if (/[a-z]/.test(password)) score++;
        if (/[A-Z]/.test(password)) score++;
        if (/[^A-Za-z0-9]/.test(password)) score++;

        // Reset class ของข้อความ
        strengthText.className = 'password-feedback-text';

        // กำหนด class และข้อความตาม score
        if (score <= 2) {
            strengthText.classList.add('weak');
            strengthText.textContent = 'ความปลอดภัย: อ่อนแอ';
        } else if (score <= 4) {
            strengthText.classList.add('medium');
            strengthText.textContent = 'ความปลอดภัย: ปานกลาง';
        } else {
            strengthText.classList.add('strong');
            strengthText.textContent = 'ความปลอดภัย: แข็งแกร่ง';
        }
    }
    function checkPasswordMatch() {
        const password = document.getElementById('signup-password').value;
        const confirmPassword = document.getElementById('signup-password-confirm').value;
        const matchIndicator = document.getElementById('password-match-indicator');
        if (!matchIndicator) return;

        if (confirmPassword.length > 0 && password === confirmPassword) {
            matchIndicator.classList.remove('hidden');
            feather.replace(); // สั่งให้วาดไอคอน
        } else {
            matchIndicator.classList.add('hidden');
        }
    }

        function setupAllEventListeners() {
        if (areListenersSetup) return;

        // ===========================================
        // ====== 1. CLICK EVENT LISTENER (MAIN) ======
        // ===========================================
        document.body.addEventListener('click', (e) => {
            const closest = (selector) => e.target.closest(selector);

            // --- Group 1: Student Hub Navigation ---
            const gpaFeatureCard = closest('#gpa-feature-card');
            const tcasFeatureCard = closest('#tcas-feature-card');

            if (gpaFeatureCard) {
                document.getElementById('student-hub-main-view').classList.add('hidden');
                document.getElementById('tcas-feature-wrapper').classList.add('hidden');
                document.getElementById('gpa-feature-wrapper').classList.remove('hidden');
                
                // ตั้งค่าหน้าเครื่องคิดเลขสำหรับ "การคำนวณด่วน"
                const header = document.querySelector('#gpa-calculator-view .gpa-view-header h2');
                header.innerHTML = `<i data-feather="bar-chart-2"></i> คำนวณเกรดเฉลี่ย (GPA)`;
                document.getElementById('gpa-calculate-btn').classList.remove('hidden');
                document.getElementById('gpa-save-record-btn').classList.add('hidden');
                
                renderGpaTable([]); // สร้างตารางเปล่า
                showGpaView('gpa-calculator-view');
                return;
            } else if (tcasFeatureCard) {
                document.getElementById('student-hub-main-view').classList.add('hidden');
                document.getElementById('gpa-feature-wrapper').classList.add('hidden');
                document.getElementById('tcas-feature-wrapper').classList.remove('hidden');
                initializeTcasFeature();
                return;
            }

            // --- Group 2: GPA & TCAS Feature Interactions ---
            if (closest('#tcas-back-to-hub-btn')) {
                document.getElementById('tcas-feature-wrapper').classList.add('hidden');
                document.getElementById('gpa-feature-wrapper').classList.add('hidden');
                document.getElementById('student-hub-main-view').classList.remove('hidden');
                selectedMajor = null; // รีเซ็ตค่า
                return;
            }
            const majorCard = closest('.major-card');
            if(majorCard && !majorCard.classList.contains('suggestion')) {
                selectTcasMajor(parseInt(majorCard.dataset.index));
                return;
            }

            if (closest('#tcas-calculate-btn')) {
                calculateAndShowTcasResult();
                return;
            }
            
            if (closest('.tcas-back-to-selection-btn')) {
                renderTcasSelectionPage();
                showTcasView('tcas-selection-view');
                return;
            }
            if (closest('#tcas-back-to-input-btn')) {
                showTcasView('tcas-input-view');
                return;
            }

            const gpaGoToHistoryBtn = closest('#gpa-go-to-history-btn');
            if (gpaGoToHistoryBtn) {
                renderGpaHistoryList();
                showGpaView('gpa-history-view');
                return;
            }
            const backToHubBtn = closest('#gpa-back-to-hub-btn');
            if (backToHubBtn) {
                document.getElementById('gpa-feature-wrapper').classList.add('hidden');
                document.getElementById('tcas-feature-wrapper').classList.add('hidden');
                document.getElementById('student-hub-main-view').classList.remove('hidden');
                return;
            }
            const gpaBackToHistoryBtn = closest('.gpa-back-to-history-btn');
            if (gpaBackToHistoryBtn) {
                showGpaView('gpa-history-view');
                return;
            }
            const gpaAddNewRecordBtn = closest('#gpa-add-new-record-btn');
            if (gpaAddNewRecordBtn) {
                document.getElementById('gpa-term-info-form').reset();
                showGpaView('gpa-add-term-info-view');
                return;
            }
            const gpaCalculateBtn = closest('#gpa-calculate-btn');
            if (gpaCalculateBtn) {
                calculateAndDisplayGpa();
                return;
            }
            
            // --- Sub-Group: GPA Table Interactions ---
            const gradePopup = document.getElementById('grade-popup');
            const creditBtn = closest('.credit-stepper-btn');
            if (creditBtn) {
                const action = creditBtn.dataset.action;
                const valueSpan = creditBtn.closest('.credit-stepper').querySelector('.credit-value');
                let currentValue = parseFloat(valueSpan.textContent);
                if (action === 'increase' && currentValue < 15) currentValue += 0.5;
                else if (action === 'decrease' && currentValue > 0.5) currentValue -= 0.5;
                valueSpan.textContent = currentValue.toFixed(1);
                return;
            }
            const gradeSelector = closest('.grade-selector');
            if (gradeSelector) {
                document.querySelectorAll('.grade-selector.active').forEach(el => el.classList.remove('active'));
                gradeSelector.classList.add('active');
                const rect = gradeSelector.getBoundingClientRect();
                gradePopup.style.top = `${rect.bottom + window.scrollY + 5}px`;
                gradePopup.style.left = `${rect.left + window.scrollX}px`;
                gradePopup.classList.remove('hidden');
                gradePopup.currentTargetSelector = gradeSelector;
                return;
            }
            const gradeOption = closest('.grade-option');
            if (gradeOption) {
                const targetSelector = gradePopup.currentTargetSelector;
                if (targetSelector) {
                    targetSelector.textContent = getGradeText(gradeOption.dataset.value);
                    targetSelector.dataset.value = gradeOption.dataset.value;
                }
                gradePopup.classList.add('hidden');
                document.querySelectorAll('.grade-selector.active').forEach(el => el.classList.remove('active'));
                return;
            }
            if (!gradePopup.classList.contains('hidden') && !closest('.grade-selector')) {
                gradePopup.classList.add('hidden');
                document.querySelectorAll('.grade-selector.active').forEach(el => el.classList.remove('active'));
            }
            const gpaClearBtn = closest('#gpa-clear-btn');
            if (gpaClearBtn) { resetGpaTable(); return; }
            const gpaSaveRecordBtn = closest('#gpa-save-record-btn');
            if (gpaSaveRecordBtn) { saveGpaRecord(); return; }
            const historyItem = closest('.gpa-history-item');
            if (historyItem && !closest('.delete-gpa-record-btn')) {
                const recordId = parseInt(historyItem.dataset.id);
                currentGpaRecord = state.gpaHistory.find(rec => rec.id === recordId);
                if (currentGpaRecord) {
                    const header = document.querySelector('#gpa-calculator-view .gpa-view-header h2');
                    header.innerHTML = `<i data-feather="edit"></i> ${currentGpaRecord.level} - เทอม ${currentGpaRecord.term}`;
                    document.getElementById('gpa-calculate-btn').classList.add('hidden');
                    document.getElementById('gpa-save-record-btn').classList.remove('hidden');
                    renderGpaTable(currentGpaRecord.courses);
                    showGpaView('gpa-calculator-view');
                }
                return;
            }
            const deleteGpaBtn = closest('.delete-gpa-record-btn');
            if (deleteGpaBtn) {
                const recordId = parseInt(deleteGpaBtn.dataset.id);
                Swal.fire({
                    title: 'ยืนยันการลบ', text: "คุณต้องการลบผลการเรียนนี้ใช่ไหม?",
                    icon: 'warning', showCancelButton: true, confirmButtonColor: 'var(--danger-color)',
                    confirmButtonText: 'ใช่, ลบเลย', cancelButtonText: 'ยกเลิก'
                }).then(result => {
                    if(result.isConfirmed) {
                        state.gpaHistory = state.gpaHistory.filter(rec => rec.id !== recordId);
                        saveState();
                        renderGpaHistoryList();
                        showToast('ลบผลการเรียนแล้ว');
                    }
                });
                return;
            }
            
            // --- Group 3: Home Page Items (To-Do & Activities) ---
            const deleteTodoBtn = closest('.delete-todo-btn');
            if (deleteTodoBtn) {
                const todoId = parseInt(deleteTodoBtn.dataset.id);
                Swal.fire({
                    title: 'แน่ใจหรือไม่?', text: "คุณต้องการลบเป้าหมายนี้ใช่ไหม?",
                    icon: 'warning', showCancelButton: true, confirmButtonColor: 'var(--danger-color)',
                    cancelButtonColor: '#6e7881', confirmButtonText: 'ใช่, ลบเลย!', cancelButtonText: 'ยกเลิก'
                }).then((result) => {
                    if (result.isConfirmed) {
                        state.todos = state.todos.filter(t => t.id !== todoId);
                        saveState();
                        updateHomePageUI();
                        showToast('ลบเป้าหมายแล้ว');
                    }
                });
                return;
            }
            if (e.target.matches('#todo-list input[type="checkbox"]')) {
                const todoId = parseInt(e.target.dataset.id);
                const todo = state.todos.find(t => t.id === todoId);
                if (todo) {
                    todo.completed = e.target.checked;
                    const listItem = e.target.closest('li');
                    if(listItem) listItem.classList.toggle('completed', todo.completed);
                    if (todo.completed && !todo.rewarded) {
                        todo.rewarded = true;
                        addExp(5);
                        updateCoins(1, `ทำเป้าหมายสำเร็จ`);
                        showToast(`ทำ "${todo.text}" สำเร็จ! +1 Coin & +5 EXP`);
                        setTimeout(() => {
                            state.todos = state.todos.filter(t => t.id !== todoId);
                            saveState();
                            updateHomePageUI(); 
                        }, 300000);
                    }
                    saveState();
                }
                return;
            }
            const deleteActivityBtn = closest('.delete-activity-btn');
            if (deleteActivityBtn) {
                const activityIndex = parseInt(deleteActivityBtn.dataset.index, 10);
                Swal.fire({
                    title: 'แน่ใจหรือไม่?', text: "คุณต้องการลบกิจกรรมนี้ออกจากรายการใช่ไหม?",
                    icon: 'warning', showCancelButton: true, confirmButtonColor: 'var(--danger-color)',
                    cancelButtonColor: '#6e7881', confirmButtonText: 'ใช่, ลบเลย!', cancelButtonText: 'ยกเลิก'
                }).then((result) => {
                    if (result.isConfirmed) {
                        if (state.userActivities && state.userActivities[activityIndex] !== undefined) {
                            state.userActivities.splice(activityIndex, 1);
                            saveState();
                            renderActivityList();
                            showToast('ลบกิจกรรมแล้ว');
                        }
                    }
                });
                return;
            }

            const deleteAdviceBtn = closest('.delete-advice-btn');
            if (deleteAdviceBtn) {
                const adviceIndex = parseInt(deleteAdviceBtn.dataset.index, 10);
                Swal.fire({
                    title: 'แน่ใจหรือไม่?',
                    text: "คุณต้องการลบคำแนะนำนี้ออกจากรายการใช่ไหม?",
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonColor: 'var(--danger-color)',
                    cancelButtonColor: '#6e7881',
                    confirmButtonText: 'ใช่, ลบเลย!',
                    cancelButtonText: 'ยกเลิก'
                }).then((result) => {
                    if (result.isConfirmed) {
                        if (state.userAdvice && state.userAdvice[adviceIndex] !== undefined) {
                            state.userAdvice.splice(adviceIndex, 1);
                            saveState();
                            renderUserAdviceList(); // วาดรายการใหม่
                            showToast('ลบคำแนะนำแล้ว');
                        }
                    }
                });
                return;
            }

            // --- Group 4: Revisit & Quiz System ---
            if (closest('#revisit-subject-display')) { openSubjectSelector(selectSubject); return; }
            const iconOption = closest('.icon-option');
            if (iconOption) {
                const selectedIconNumber = iconOption.dataset.iconNumber;
                if (currentlyEditingSubjectValue) {
                    const subjectIndex = state.subjects.findIndex(s => s.value === currentlyEditingSubjectValue);
                    if (subjectIndex > -1) state.subjects[subjectIndex].icon = selectedIconNumber;
                } else {
                    newSubjectIconNumber = selectedIconNumber;
                    updateNewSubjectIconPreview();
                }
                saveState();
                document.getElementById('icon-selector-modal').classList.add('hidden');
                if (currentlyEditingSubjectValue) {
                    showToast('เปลี่ยนไอคอนสำเร็จ!');
                    renderSubjectOptions();
                    const activePeriod = document.querySelector('.stats-tab-btn.active')?.dataset.period || 'day';
                    renderFocusStats(activePeriod);
                }
                return;
            }
            const subjectOption = closest('.subject-option');
            if (subjectOption) {
                if (e.target.closest('.edit-subject-btn')) {
                    handleEditSubject(subjectOption.dataset.value);
                } else if (e.target.closest('.remove-custom-subject-btn')) {
                    const valueToRemove = e.target.closest('.remove-custom-subject-btn').dataset.value;
                    state.subjects = state.subjects.filter(s => s.value !== valueToRemove);
                    saveState();
                    renderSubjectOptions();
                } else {
                    if (typeof currentSubjectSelectionCallback === 'function') {
                        const value = subjectOption.dataset.value;
                        const name = subjectOption.querySelector('span').textContent;
                        currentSubjectSelectionCallback(value, name);
                    }
                    document.getElementById('subject-selector-modal').classList.add('hidden');
                }
                return;
            }
            const categoryOption = closest('.category-option');
            if (categoryOption) {
                if (e.target.closest('.remove-custom-category-btn')) {
                    const valueToRemove = e.target.closest('.remove-custom-category-btn').dataset.value;
                    state.eventCategories = state.eventCategories.filter(c => c.value !== valueToRemove);
                    saveState();
                    renderCategoryOptions();
                } else {
                    const value = categoryOption.dataset.value;
                    const btn = document.getElementById('event-category-selector-btn');
                    if (btn) {
                        btn.dataset.value = value;
                        btn.querySelector('span').textContent = value;
                    }
                    document.getElementById('event-category-modal').classList.add('hidden');
                }
                return;
            }
            const quizChoiceBtn = closest('.quiz-choice-btn');
            if (quizChoiceBtn && !quizChoiceBtn.disabled) { handleAnswer(quizChoiceBtn.dataset.index); return; }
            const removeBtn = closest('.remove-btn');
            if (removeBtn) { removeBtn.parentElement.remove(); return; }

            // --- Group 5: General UI & Modals ---
            const toggleBtn = closest('.password-toggle-btn');
            if (toggleBtn) {
                const targetId = toggleBtn.dataset.target;
                const input = document.getElementById(targetId);
                if (input) {
                    const isPassword = input.type === 'password';
                    input.type = isPassword ? 'text' : 'password';
                    const icon = toggleBtn.querySelector('i');
                    if (icon) {
                        icon.dataset.feather = isPassword ? 'eye-off' : 'eye';
                        feather.replace();
                    }
                }
                return;
            }
            const calendarNavBtn = closest('.calendar-nav-btn');
            if (calendarNavBtn) {
                const btnId = calendarNavBtn.id;
                switch(btnId) {
                    case 'planner-prev-month': currentPlannerDate = currentPlannerDate.subtract(1, 'month'); renderPlannerCalendar(currentPlannerDate); break;
                    case 'planner-next-month': currentPlannerDate = currentPlannerDate.add(1, 'month'); renderPlannerCalendar(currentPlannerDate); break;
                    case 'mood-prev-month': currentMoodDate = currentMoodDate.subtract(1, 'month'); renderMoodCalendar(currentMoodDate); break;
                    case 'mood-next-month': currentMoodDate = currentMoodDate.add(1, 'month'); renderMoodCalendar(currentMoodDate); break;
                }
                return; 
            }
            const navLink = closest('.nav-link'); 
            if (navLink) { e.preventDefault(); showPage(navLink.dataset.page); return; }
            if (closest('.close-btn')) { const modal = closest('.modal-overlay'); if (modal) modal.classList.add('hidden'); return; }
            const emojiOption = closest('.emoji-option');
            if (emojiOption) {
                document.querySelectorAll('.emoji-option').forEach(opt => opt.classList.remove('selected'));
                emojiOption.classList.add('selected');
                document.getElementById('selected-mood').value = emojiOption.dataset.mood;
                return; 
            }
            const profileOption = closest('.profile-option');
            if (profileOption) {
                document.querySelectorAll('.profile-option.selected').forEach(opt => opt.classList.remove('selected'));
                profileOption.classList.add('selected');
                state.profile.photoURL = profileOption.dataset.url;
                renderProfilePicture(state.profile.photoURL, document.getElementById('profile-edit-photo'));
                saveState();
                document.getElementById('profile-selector-modal').classList.add('hidden');
                showToast('เปลี่ยนรูปโปรไฟล์เรียบร้อย!');
                return; 
            }
            const statsTabBtn = closest('.stats-tab-btn');
            if (statsTabBtn) {
                document.querySelectorAll('.stats-tab-btn').forEach(btn => btn.classList.remove('active'));
                statsTabBtn.classList.add('active');
                renderFocusStats(statsTabBtn.dataset.period);
                return;
            }
            const tabBtn = closest('.tab-btn');
            if (tabBtn) { showCommunityTab(tabBtn.dataset.tab); return; }

            // --- Group 6: Fallback Switch for remaining IDs ---
            const targetId = e.target.id || closest('[id]')?.id;
            switch(targetId) {
                case 'streak-display': case 'check-in-btn': showStreakModal(); break;
                case 'login-btn': openAuthModal(); break;
                case 'show-signup-link': e.preventDefault(); document.getElementById('login-view').classList.add('hidden'); document.getElementById('signup-view').classList.remove('hidden'); document.getElementById('auth-error').textContent = ''; break;
                case 'show-login-link': e.preventDefault(); document.getElementById('signup-view').classList.add('hidden'); document.getElementById('login-view').classList.remove('hidden'); document.getElementById('auth-error').textContent = ''; break;
                case 'logout-btn': auth.signOut(); break;
                case 'open-menu': document.getElementById('sidebar').classList.add('show'); document.getElementById('overlay').classList.add('show'); break;
                case 'close-menu': case 'overlay': closeSidebar(); break;
                case 'add-custom-subject-icon-btn': openIconSelectorModal(); break;
                case 'start-timer-btn': if (timerInterval) { stopTimer(); timerInterval = null; } else { startTimer(); } break;
                case 'reset-timer-btn': resetTimer(); break;
                case 'settings-timer-btn': 
                    if (!state.settings) state.settings = { focusDuration: 25, breakDuration: 5 };
                    document.getElementById('focus-duration').value = state.settings.focusDuration || 25;
                    document.getElementById('break-duration').value = state.settings.breakDuration || 5;
                    document.getElementById('timer-settings-modal').classList.remove('hidden'); 
                    feather.replace(); 
                    break;
                case 'save-timer-settings-btn': handleSaveTimerSettings(); break; 
                case 'change-banner-btn': openBannerSelector(); break;
                case 'focus-topic-selector-btn':
                    const focusPageCallback = (value, name) => {
                        const btn = document.getElementById('focus-topic-selector-btn');
                        btn.querySelector('span').textContent = name;
                        btn.dataset.value = value;
                    };
                    openSubjectSelector(focusPageCallback);
                    break;
                case 'event-category-selector-btn': openCategorySelectorModal(); break;
                case 'main-edit-profile-btn': document.getElementById('profile-view-mode').classList.add('hidden'); document.getElementById('profile-edit-mode').classList.remove('hidden'); break;
                case 'cancel-edit-profile-btn': document.getElementById('profile-edit-mode').classList.add('hidden'); document.getElementById('profile-view-mode').classList.remove('hidden'); renderProfilePage(); break;
                case 'edit-profile-picture-btn': populateProfileSelector(); document.getElementById('profile-selector-modal').classList.remove('hidden'); break;
                case 'random-activity-btn':
                    const activities = state.userActivities && state.userActivities.length > 0 ? state.userActivities : defaultActivities;
                    document.getElementById('activity-suggestion').textContent = activities[Math.floor(Math.random() * activities.length)];
                    break;
                case 'random-advice-btn':
                    const advices = state.userAdvice && state.userAdvice.length > 0 ? state.userAdvice : defaultAdvices;
                    document.getElementById('daily-advice').textContent = advices[Math.floor(Math.random() * advices.length)];
                    break;
                case 'manage-activities-btn': openActivityManager(); break;
                case 'manage-advice-btn': openAdviceManager(); break;
                case 'theme-light-btn': if (state.settings.theme !== 'light') { state.settings.theme = 'light'; applySettings(); saveState(); } break;
                case 'theme-dark-btn': if (state.settings.theme !== 'dark') { state.settings.theme = 'dark'; applySettings(); saveState(); } break;
                case 'search-friends-btn': document.getElementById('search-friends-modal').classList.remove('hidden'); break;
                case 'edit-wishlist-btn': handleEditWishList(); break;
                case 'copy-id-btn':
                    if (state.profile && state.profile.lifebuddyId) {
                        navigator.clipboard.writeText(state.profile.lifebuddyId).then(() => showToast('คัดลอก ID สำเร็จ!')).catch(() => showToast('เกิดข้อผิดพลาดในการคัดลอก'));
                    }
                    break;
                case 'google-signin-btn':
                    const provider = new firebase.auth.GoogleAuthProvider();
                    auth.signInWithPopup(provider).catch(error => { document.getElementById('auth-error').textContent = getFriendlyAuthError(error); });
                    break;
                case 'back-to-revisit-list-from-creation': document.getElementById('quiz-creation-view').classList.add('hidden'); document.getElementById('revisit-list-view').classList.remove('hidden'); renderRevisitList(); break;
                case 'add-choice-btn': addChoiceInput(); feather.replace(); break;
                case 'add-typed-answer-btn': addTypedAnswerInput(); feather.replace(); break;
                case 'start-quiz-btn': startQuiz(); break;
                case 'cancel-edit-quiz-btn': resetQuizCreationForm(); break;
                case 'continue-quiz-btn': continueQuiz(); break;
                case 'exit-quiz-btn': Swal.fire({ title: 'แน่ใจหรือไม่?', text: "คุณต้องการออกจากการทำควิซ?", icon: 'warning', showCancelButton: true, confirmButtonText: 'ใช่, ออกเลย', cancelButtonText: 'ทำต่อ' }).then(r => { if(r.isConfirmed) { document.getElementById('quiz-taking-view').classList.add('hidden'); document.getElementById('revisit-list-view').classList.remove('hidden'); renderRevisitList(); }}); break;
                case 'submit-typed-answer-btn': handleAnswer(document.getElementById('typed-answer-input').value); break;
            }
        });

        // ===========================================
        // ====== 2. CHANGE & SUBMIT LISTENERS ======
        // ===========================================
        document.body.addEventListener('change', (e) => {
            // --- For Quiz Type Selection ---
            if (e.target.name === 'quiz-type') {
                const mcContainer = document.getElementById('mc-options-container');
                const typedContainer = document.getElementById('typed-answer-container');
                const isMc = e.target.value === 'multiple-choice';
                mcContainer.classList.toggle('hidden', !isMc);
                typedContainer.classList.toggle('hidden', isMc);
                mcContainer.querySelectorAll('input').forEach(input => input.disabled = !isMc);
                typedContainer.querySelectorAll('input').forEach(input => input.disabled = isMc);
                return;
            }
            // --- For TCAS Specific Subject Selection ---
            if (e.target.id === 'specific-subject-select') {
                addSpecificSubjectInput(e.target.value);
                e.target.value = ''; // Reset dropdown after selection
                return;
            }
        });

        document.body.addEventListener('submit', (e) => {
            e.preventDefault();
            switch (e.target.id) {
                case 'todo-form': handleTodoFormSubmit(e); break;
                case 'revisit-form': handleRevisitFormSubmit(e); break;
                case 'planner-form': handlePlannerFormSubmit(e); break;
                case 'mood-form': handleMoodFormSubmit(e); break;
                case 'profile-form': handleProfileFormSubmit(e); break;
                case 'add-activity-form': handleAddActivityForm(e); break;
                case 'add-advice-form': handleAddAdviceForm(e); break;
                case 'signup-form': handleSignupFormSubmit(e); break;
                case 'login-form': handleLoginFormSubmit(e); break;
                case 'search-friends-form': handleFriendSearch(e); break;
                case 'quiz-creation-form': handleQuizCreationForm(e); break;
                case 'add-custom-subject-form': handleAddCustomSubject(e); break;
                case 'gpa-term-info-form':
                    const level = document.getElementById('gpa-level-input').value;
                    const term = document.getElementById('gpa-term-select').value;
                    const year = document.getElementById('gpa-year-input').value;
                    currentGpaRecord = { id: Date.now(), level, term, year, courses: [], gpa: 0 };
                    const header = document.querySelector('#gpa-calculator-view .gpa-view-header h2');
                    header.innerHTML = `<i data-feather="edit-3"></i> ${level} - เทอม ${term}`;
                    document.getElementById('gpa-calculate-btn').classList.add('hidden');
                    document.getElementById('gpa-save-record-btn').classList.remove('hidden');
                    renderGpaTable([]);
                    showGpaView('gpa-calculator-view');
                    break;
            }
        });
            
        areListenersSetup = true;
    }

    // ===================================
    // ===== 8. AUTH MODAL FUNCTIONS =====
    // ===================================
    function getFriendlyAuthError(error) {
        console.error("Auth Error:", error);
        switch (error.code) {
            case 'auth/invalid-email': return 'รูปแบบอีเมลไม่ถูกต้อง';
            case 'auth/user-not-found': return 'ไม่พบบัญชีผู้ใช้นี้';
            case 'auth/wrong-password': return 'รหัสผ่านไม่ถูกต้อง';
            case 'auth/email-already-in-use': return 'อีเมลนี้ถูกใช้งานแล้ว';
            case 'auth/weak-password': return 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร';
            case 'auth/popup-closed-by-user': return 'คุณปิดหน้าต่างการลงชื่อเข้าใช้';
            case 'auth/cancelled-popup-request': return '';
            case 'auth/account-exists-with-different-credential': return 'มีบัญชีที่ใช้อีเมลนี้อยู่แล้ว กรุณาเข้าสู่ระบบด้วยวิธีเดิม';
            case 'auth/internal-error': 
                if (error.message && error.message.includes("INVALID_LOGIN_CREDENTIALS")) { 
                    return 'อีเมลหรือรหัสผ่านไม่ถูกต้อง'; 
                } 
                return 'เกิดข้อผิดพลาดภายในระบบ กรุณาลองใหม่';
            default: return 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง';
        }
    }

    function openAuthModal() { 
        document.getElementById('auth-modal').classList.remove('hidden');
        document.getElementById('signup-view').classList.add('hidden');
        document.getElementById('login-view').classList.remove('hidden');
        document.getElementById('auth-error').textContent = '';
        feather.replace();
    }

    function renderActivityList() {
        const container = document.getElementById('activity-list-container');
        if (!container) return; // ป้องกัน error ถ้าหา container ไม่เจอ
        
        // ใช้ state.userActivities ถ้าไม่มี ให้ใช้ defaultActivities
        const activities = state.userActivities || defaultActivities;
        
        if (activities.length === 0) {
            container.innerHTML = '<p style="padding: 20px; text-align: center; color: var(--subtle-text-color);">ยังไม่มีกิจกรรมที่สร้างเอง</p>';
            return;
        }

        container.innerHTML = activities.map((activity, index) => `
            <div class="activity-item">
                <span>${activity}</span>
                <button class="delete-activity-btn icon-button" data-index="${index}" title="ลบ">
                    <i data-feather="trash-2"></i>
                </button>
            </div>
        `).join('');

        feather.replace(); // สั่งให้วาด icon ถังขยะ
    }
    
    function openActivityManager() {
        renderActivityList();
        document.getElementById('activity-manager-modal').classList.remove('hidden');
    }

    function renderUserAdviceList() {
        const container = document.getElementById('advice-list-container');
        if (!container) return;
        const advices = state.userAdvice || [];
        container.innerHTML = advices.map((advice, index) => `
            <div class="activity-item">
                <span>${advice}</span>
                <button class="delete-advice-btn" data-index="${index}" title="ลบ"><i data-feather="trash-2"></i></button>
            </div>
        `).join('');
        feather.replace();
    }

    function openAdviceManager() {
        renderUserAdviceList();
        document.getElementById('advice-manager-modal').classList.remove('hidden');
    }

    function closeAuthModal() { 
        document.getElementById('auth-modal').classList.add('hidden'); 
        document.getElementById('auth-error').textContent = ''; 
    }
});