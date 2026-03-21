"""
Загружает 25 вопросов по сетям + 25 по БД через POST /admin/quiz/questions
Запуск: python seed_questions.py
"""
import asyncio
import httpx

BASE_URL = "http://localhost:8000"

QUESTIONS = [
    # ══════════════════════════════════════════
    #  СЕТИ — category="network"  (1–25)
    # ══════════════════════════════════════════
    {"category": "network", "text": "OSI моделінің қай деңгейі байланыс сеанстарын басқару және синхрондауға жауап береді?", "options": ["Желiлік", "Тасымалдау", "Сеанстық", "Ұсыныс", "Қолданбалық"], "correct_index": 2},
    {"category": "network", "text": "TCP мен UDP арасындағы негізгі айырмашылық неде (тасымалдау деңгейінде)?", "options": ["TCP — байланыссыз, UDP — байланысты", "TCP сенімді жеткізуді қамтамасыз етеді, UDP — жоқ", "UDP 3-way handshake қолданады", "TCP тек IPv6-пен жұмыс істейді", "UDP-ның тақырыбы үлкенірек"], "correct_index": 1},
    {"category": "network", "text": "DHCPv6 серверсіз IPv6 мекенжайын автоматты түрде конфигурациялау үшін қандай хаттама қолданылады?", "options": ["SLAAC", "DHCPv6", "NDP", "ICMPv6", "OSPFv3"], "correct_index": 0},
    {"category": "network", "text": "BGP хаттамасында қандай маршрутизация түрі қолданылады?", "options": ["Distance Vector", "Link State", "Path Vector", "Hybrid", "Flooding"], "correct_index": 2},
    {"category": "network", "text": "TCP тақырыбындағы SYN жалауы нені білдіреді?", "options": ["Байланысты аяқтау сұрауы", "Деректердің алынғанын растау", "Байланысты бастау", "Байланысты қалпына келтіру", "Шұғыл деректер"], "correct_index": 2},
    {"category": "network", "text": "TCP-де қабылдаушы буферінің толып кетуін болдырмайтын механизм қандай?", "options": ["Sliding Window", "Congestion Window", "Slow Start", "Fast Retransmit", "Three Duplicate ACKs"], "correct_index": 0},
    {"category": "network", "text": "Коммутаторларда циклдерді болдырмау үшін IEEE 802.1 отбасының қандай хаттамасы қолданылады?", "options": ["802.1Q", "802.1X", "STP (802.1D)", "LLDP", "LACP (802.3ad)"], "correct_index": 2},
    {"category": "network", "text": "IPv6-да фрагментацияға қай кеңейтілген тақырып жауап береді?", "options": ["Hop-by-Hop Options", "Routing Header", "Fragment Header", "Destination Options", "Authentication Header"], "correct_index": 2},
    {"category": "network", "text": "SDN (Software-Defined Networking) артықшылықтарының қайсысы дұрыс?", "options": ["Жабдықтағы тұрақты маршрутизация", "Контроллер арқылы ағынды орталықтан басқару", "OpenFlow-тың болмауы", "Коммутаторларға жүктеменің артуы", "Қауіпсіздіктің толық болмауы"], "correct_index": 1},
    {"category": "network", "text": "Желiлік деңгейде құпиялылық пен тұтастықты қамтамасыз ететін хаттама қандай?", "options": ["TLS", "SSL", "IPsec", "SSH", "HTTPS"], "correct_index": 2},
    {"category": "network", "text": "Атакушы көптеген SYN-пакеттерді жіберіп, handshake-ті аяқтамайтын шабуыл қалай аталады?", "options": ["SYN Flood", "Smurf Attack", "Ping of Death", "ARP Poisoning", "DNS Amplification"], "correct_index": 0},
    {"category": "network", "text": "Көптеген TCP реализацияларында әдепкі терезе өлшемі қанша байт?", "options": ["4096", "65535", "1460", "536", "16384"], "correct_index": 1},
    {"category": "network", "text": "IPv6-да көршілерді анықтау үшін қандай хаттама қолданылады?", "options": ["ARP", "ICMPv4", "NDP (Neighbor Discovery Protocol)", "IGMP", "DHCPv4"], "correct_index": 2},
    {"category": "network", "text": "Қай хаттамада Dijkstra алгоритмі ең қысқа жолдарды есептеу үшін қолданылады?", "options": ["RIP", "OSPF", "BGP", "EIGRP", "IS-IS"], "correct_index": 1},
    {"category": "network", "text": "IP-пакет тақырыбындағы TTL нені білдіреді?", "options": ["Пакеттің өмір сүру уақыты секундпен", "Қалған хоптар саны", "Пайдалы жүктеме өлшемі", "Пакет приоритеті", "Фрагментация жалауы"], "correct_index": 1},
    {"category": "network", "text": "L2TP + IPsec хаттамаларын қолданатын VPN түрі қандай?", "options": ["Site-to-Site", "Remote Access", "Layer 2", "Layer 3", "SSL VPN"], "correct_index": 2},
    {"category": "network", "text": "Бір физикалық канал арқылы бірнеше VLAN-ды өткізуге мүмкіндік беретін технология қалай аталады?", "options": ["Trunking (802.1Q)", "Port Channel", "Spanning Tree", "QoS", "NAT"], "correct_index": 0},
    {"category": "network", "text": "QUIC хаттамасы (HTTP/3) әдепкі бойынша қандай портты қолданады?", "options": ["80", "443", "8080", "53", "21"], "correct_index": 1},
    {"category": "network", "text": "Төмендегілердің қайсысы канальдық деңгей хаттамаларына жатпайды?", "options": ["PPP", "Ethernet", "ARP", "OSPF", "Wi-Fi (802.11)"], "correct_index": 3},
    {"category": "network", "text": "TCP-де желілік қайта жүктемеге қарсы қандай механизм қолданылады?", "options": ["Тек Sliding Window", "Congestion Avoidance + Slow Start", "Тек Exponential Backoff", "Selective Repeat", "Go-Back-N"], "correct_index": 1},
    {"category": "network", "text": "IPv6-да one-to-many коммуникация үшін қандай адресация түрі қолданылады?", "options": ["Unicast", "Multicast", "Anycast", "Broadcast", "Link-local"], "correct_index": 1},
    {"category": "network", "text": "Қазіргі кәсіпорын желілерінде RIP-ті алмастыратын хаттама қалай аталады?", "options": ["OSPF", "BGP", "IS-IS", "EIGRP", "RIPng"], "correct_index": 0},
    {"category": "network", "text": "Ethernet контекстінде MTU деген не?", "options": ["Тақырыпсыз кадрдың максималды өлшемі", "Фрагментациясыз IP-пакеттің максималды өлшемі", "TCP тақырыбының өлшемі", "Қабылдау терезесінің өлшемі", "Кадрдың пайдалы жүктемесінің максималды өлшемі"], "correct_index": 1},
    {"category": "network", "text": "WPA2-Enterprise сымсыз желілерінде аутентификация үшін қандай хаттама қолданылады?", "options": ["PSK", "EAP", "TKIP", "AES", "WEP"], "correct_index": 1},
    {"category": "network", "text": "IPv6-тың IPv4-ке қарағанда мобильділік тұрғысынан артықшылығы неде?", "options": ["Тақырыптың кішірек өлшемі", "Mobile IPv6-тың кіріктірілген қолдауы", "NAT-тың болмауы", "Автоматты конфигурация", "Жоғарыдағылардың барлығы"], "correct_index": 4},

    # ══════════════════════════════════════════
    #  ДЕРЕКҚОРЛАР — category="database"  (26–50)
    # ══════════════════════════════════════════
    {"category": "database", "text": "Қай нормальдық форма транзитивті функционалдық тәуелділіктерді жоюды талап етеді?", "options": ["1НФ", "2НФ", "3НФ", "BCNF", "4НФ"], "correct_index": 2},
    {"category": "database", "text": "ACID қасиеттерінің қайсысы транзакциялардың бір-бірінің аралық нәтижелерін көрмеуін қамтамасыз етеді?", "options": ["Барлық операциялар атомарлы орындалады", "Транзакциялар басқа транзакциялардың аралық нәтижелерін көрмейді", "Транзакциядан кейін база сәйкестікте қалады", "Өзгерістер коммиттен кейін сақталады", "Жоғары өнімділік"], "correct_index": 1},
    {"category": "database", "text": "Қай JOIN түрі екі кестедегі барлық жолдарды қайтарады, сәйкес келмейтін жерлерде NULL қояды?", "options": ["INNER JOIN", "LEFT JOIN", "RIGHT JOIN", "FULL OUTER JOIN", "CROSS JOIN"], "correct_index": 3},
    {"category": "database", "text": "Көптеген СУБД-де B+-tree индексі не істейді?", "options": ["INSERT-ті әрқашан жылдамдатады", "Аралық (диапазондық) сұраулар мен сұрыптауды қолдайды", "Тек бірегей мәндермен жұмыс істейді", "Дерекқор көлемін азайтады", "Бастапқы кілтті алмастырады"], "correct_index": 1},
    {"category": "database", "text": "Қай SQL операторы ішкі сұраудың бар-жоғын тексереді?", "options": ["IN", "EXISTS", "ANY", "ALL", "SOME"], "correct_index": 1},
    {"category": "database", "text": "ROW_NUMBER() OVER (PARTITION BY ... ORDER BY ...) функциясы нені қайтарады?", "options": ["Партициядағы жолдар санын", "Партиция ішіндегі жолдың бірегей нөмірін", "Мәндердің қосындысын", "Дубльсіз рангті", "Орташа мәнді"], "correct_index": 1},
    {"category": "database", "text": "Қай транзакция оқшаулау деңгейі қайталанбайтын оқуды рұқсат етеді?", "options": ["READ UNCOMMITTED", "READ COMMITTED", "REPEATABLE READ", "SERIALIZABLE", "SNAPSHOT"], "correct_index": 1},
    {"category": "database", "text": "Төмендегілердің қайсысы денормализацияның артықшылығы емес?", "options": ["Оқуды жылдамдату", "JOIN санының азаюы", "Сұраулардың жеңілдеуі", "Жаңарту аномалияларын жою", "Сақталатын деректер көлемінің азаюы"], "correct_index": 3},
    {"category": "database", "text": "Бағандағы дубльдерді тыйым салатын шектеу түрі қандай?", "options": ["PRIMARY KEY", "FOREIGN KEY", "UNIQUE", "CHECK", "NOT NULL"], "correct_index": 2},
    {"category": "database", "text": "Құрама бастапқы кілт суррогаттық кілттен артық болатын жағдай қандай?", "options": ["INSERT жиі болғанда", "Табиғи кілт әрқашан бірегей және өзгермейтін болғанда", "JOIN саны көп болғанда", "Орын үнемдеу үшін", "Ешқашан"], "correct_index": 1},
    {"category": "database", "text": "WITH командасы (рекурсивті CTE) не істейді?", "options": ["Уақытша кесте жасайды", "Рекурсивті сұрауларға (иерархияларға) мүмкіндік береді", "Индекс жасайды", "Ішкі сұраумен UPDATE орындайды", "Терезе функциясын анықтайды"], "correct_index": 1},
    {"category": "database", "text": "PostgreSQL/MySQL-де индекстелетін JSON құжаттарын сақтауға қай деректер түрі қолайлы?", "options": ["TEXT", "VARCHAR", "JSON/JSONB", "BLOB", "XML"], "correct_index": 2},
    {"category": "database", "text": "RANK() функциясы DENSE_RANK()-тен несімен ерекшеленеді?", "options": ["Дубльдер болғанда нөмірлерді өткізіп жібереді", "Дубльдер болғанда нөмірлерді өткізбейді", "Орташа рангті қайтарады", "Дубльдер санын қайтарады", "Тек сандармен жұмыс істейді"], "correct_index": 0},
    {"category": "database", "text": "Екі SELECT нәтижесін дубльсіз біріктіру үшін қай оператор қолданылады?", "options": ["UNION", "UNION ALL", "INTERSECT", "EXCEPT", "CROSS JOIN"], "correct_index": 0},
    {"category": "database", "text": "FOREIGN KEY-ді бұзатын жазбаны қосуға әрекет жасағанда не болады?", "options": ["Жазба NULL-мен қосылады", "Шектеу бұзылғаны туралы қате шығады", "Жазба қосылады, бірақ FK NULL болады", "Транзакция автоматты түрде қайтарылады", "ON DELETE CASCADE-қа байланысты"], "correct_index": 1},
    {"category": "database", "text": "Жиі қолданылатын диапазондық шарттарға (> , < , BETWEEN) қай индекс қолайлы?", "options": ["Hash", "B-tree", "Bitmap", "GiST", "GIN"], "correct_index": 1},
    {"category": "database", "text": "AFTER триггерінің мысалы қайсы?", "options": ["Қосудың алдында тексеру", "Жаңартудан кейін логтау", "Қосудың алдында мәнді өзгерту", "Қатеде операцияны тоқтату", "Автоинкремент"], "correct_index": 1},
    {"category": "database", "text": "Бір фактты жаңарту бірнеше жолды өзгертуді талап ететін аномалия қалай аталады?", "options": ["Insertion anomaly", "Deletion anomaly", "Update anomaly", "Selection anomaly", "Join anomaly"], "correct_index": 2},
    {"category": "database", "text": "Қай ішкі сұрау бірнеше жол қайтара алады?", "options": ["Скалярлық", "Корреляцияланған", "WHERE шартта IN-пен", "SELECT-те өрнек ретінде", "Мүмкін емес"], "correct_index": 2},
    {"category": "database", "text": "Көптеген СУБД-де EXPLAIN командасы не істейді?", "options": ["Сұрауды орындайды", "Сұраудың орындалу жоспарын көрсетеді", "Индекс жасайды", "Кестені оңтайландырады", "Дубльдерді жояды"], "correct_index": 1},
    {"category": "database", "text": "Қай агрегаттық функция NULL мәндерді елемейді?", "options": ["COUNT(*)", "COUNT(баған)", "SUM", "AVG", "COUNT(*)-дан басқасының барлығы"], "correct_index": 4},
    {"category": "database", "text": "TRUNCATE мен WHERE-сыз DELETE арасындағы айырмашылық неде?", "options": ["TRUNCATE баяу", "DELETE-ті қайтаруға болады, TRUNCATE-ті көп жағдайда жоқ", "TRUNCATE автоинкрементті қалпына келтірмейді", "DELETE индекстермен жылдамырақ жұмыс істейді", "Айырмашылық жоқ"], "correct_index": 1},
    {"category": "database", "text": "Аралық кесте арқылы қандай байланыс түрі жүзеге асады?", "options": ["1:1", "1:N", "N:1", "M:N", "1:0..1"], "correct_index": 3},
    {"category": "database", "text": "Дерекқорлардағы deadlock деген не?", "options": ["Транзакция өзі күткенде", "Екі немесе одан көп транзакцияның циклдік ресурстарды күтуі", "Индекс зақымдалғанда", "FOREIGN KEY бұзылғанда", "Қосылулар шегі асып кеткенде"], "correct_index": 1},
    {"category": "database", "text": "PostgreSQL-де ішінара (partial) индекстерді қалай жасауға болады?", "options": ["CREATE INDEX-те WHERE қолдану", "CREATE INDEX-те INCLUDE қолдану", "PARTITION BY", "USING GIN", "CONCURRENTLY"], "correct_index": 0},
]


async def seed():
    async with httpx.AsyncClient(base_url=BASE_URL, timeout=30) as client:
        # Статистика до загрузки
        stats_res = await client.get("/admin/quiz/questions/stats")
        if stats_res.status_code == 200:
            s = stats_res.json()
            print(f"До загрузки → network: {s['network']['count']}/25, database: {s['database']['count']}/25")

        net_ok = net_fail = db_ok = db_fail = 0

        for i, q in enumerate(QUESTIONS, 1):
            cat = q["category"]
            resp = await client.post("/admin/quiz/questions", json=q)
            label = "🌐 net" if cat == "network" else "🗄️  db "
            if resp.status_code == 201:
                if cat == "network": net_ok += 1
                else: db_ok += 1
                print(f"  [{i:02d}/50] {label} ✓  {q['text'][:55]}...")
            else:
                if cat == "network": net_fail += 1
                else: db_fail += 1
                print(f"  [{i:02d}/50] {label} ✗  ({resp.status_code}) {resp.json().get('detail','')}")

        print(f"\n{'─'*60}")
        print(f"  Сети  (network):  добавлено {net_ok}, ошибок {net_fail}")
        print(f"  БД    (database): добавлено {db_ok}, ошибок {db_fail}")
        print(f"  Итого: {net_ok + db_ok} вопросов успешно загружено")

        # Финальная статистика
        stats_res = await client.get("/admin/quiz/questions/stats")
        if stats_res.status_code == 200:
            s = stats_res.json()
            print(f"\nВ базе сейчас → network: {s['network']['count']}/25, database: {s['database']['count']}/25")


if __name__ == "__main__":
    asyncio.run(seed())
