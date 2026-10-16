#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import docx
import re
import json
import os

doc = docx.Document('/mnt/d/almogam/ocr_output.docx')
pages = {}
curr_page = 0
for p in doc.paragraphs:
    t = p.text.strip()
    if not t:
        continue
    m = re.match(r'^صفحة\s+(\d+)$', t)
    if m:
        curr_page = int(m.group(1))
        pages[curr_page] = []
    elif curr_page > 0:
        for line in t.split('\n'):
            line = line.strip()
            if line:
                pages[curr_page].append(line)

CHAPTERS = [
    (9, "الهمزة", "أ"),
    (27, "الباء", "ب"),
    (37, "التاء", "ت"),
    (51, "الثاء", "ث"),
    (55, "الجيم", "ج"),
    (63, "الحاء", "ح"),
    (75, "الخاء", "خ"),
    (83, "الدال", "د"),
    (89, "الذال", "ذ"),
    (93, "الراء", "ر"),
    (101, "الزاي", "ز"),
    (103, "السين", "س"),
    (113, "الشين", "ش"),
    (121, "الصاد", "ص"),
    (127, "الضاد", "ض"),
    (129, "الطاء", "ط"),
    (135, "الظاء", "ظ"),
    (137, "العين", "ع"),
    (151, "الغين", "غ"),
    (155, "الفاء", "ف"),
    (164, "القاف", "ق"),
    (175, "الكاف", "ك"),
    (183, "اللام", "ل"),
    (189, "الميم", "م"),
    (215, "النون", "ن"),
    (223, "الهاء", "هـ"),
    (227, "الواو", "و"),
    (233, "الياء", "ي"),
]

def get_chapter_for_page(pno):
    current = CHAPTERS[0]
    for start_p, name, short in CHAPTERS:
        if pno >= start_p:
            current = (start_p, name, short)
        else:
            break
    return current[1], current[2]

def clean_noise_line(line):
    if line == "فراغ":
        return ""
    if re.match(r'^حرف\s+\S+', line):
        return ""
    if re.match(r'^[\d٠-٩\s\.]+$', line):
        return ""
    line = re.sub(r'\s+\d+\s+[٠-٩]+$', '', line)
    line = re.sub(r'^[٠-٩\d]+\s+[٠-٩\d]+\s*$', '', line)
    return line.strip()

def normalize_ar(text):
    t = re.sub(r'[\u064B-\u065F\u0670\u0640]', '', text)
    t = re.sub(r'[أإآٱ]', 'ا', t)
    return t.strip()

def starts_with_chapter_letter(term, short_letter):
    norm = normalize_ar(term)
    if norm.startswith('ال') and len(norm) > 2:
        norm_no_al = norm[2:]
    else:
        norm_no_al = norm
    target = normalize_ar(short_letter)[0]
    if not norm_no_al:
        return False
    return norm_no_al[0] == target or norm[0] == target

NON_TERM_PREFIXES = (
    'قال ', 'وقال ', 'وقيل ', 'وفي ', 'وعن ', 'فان ', 'فإن ', 'وان ', 'وإن ',
    'هذا ', 'وهذا ', 'وذلك ', 'وهو ', 'وهي ', 'فهو ', 'فهي ', 'أو ', 'أي ',
    'أول ', 'الأول ', 'الثاني ', 'الثالث ', 'الرابع ', 'الخامس ', 'السادس ',
    'السابع ', 'الثامن ', 'أحدهما ', 'وثانيهما ', 'منها ', 'منه ', 'في ',
    'على ', 'إلى ', 'حتى ', 'بأن ', 'لأن ', 'كما ', 'مثلا', 'ومثله', 'راجع',
    'انظر', 'أنظر', 'يفهم', 'ينتج', 'فنفهم', 'وبعد'
)

def is_valid_term_candidate(cand, short_letter):
    raw = cand.strip()
    if raw.startswith('-') or raw.startswith('ـ') or re.match(r'^[\d٠-٩]', raw):
        return False
    cand = raw.strip(' .-ـ،«»"()[]')
    if not cand or len(cand) < 2 or len(cand) > 38:
        return False
    if ':' in cand:
        return False
    words = cand.split()
    if len(words) > 5:
        return False
    for p in NON_TERM_PREFIXES:
        if cand.startswith(p) or cand == p.strip():
            return False
    cleaned = re.sub(r'\(\s*[عص]\s*\)|\(\s*عج\s*\)', '', cand)
    if any(ch in cleaned for ch in ['(', ')', '«', '»', '،', '.', '؛', '/', '=', '+']):
        return False
    return starts_with_chapter_letter(cand, short_letter)

entries = []

for pno in range(9, 236):
    raw_lines = pages.get(pno, [])
    lines = [clean_noise_line(l) for l in raw_lines]
    lines = [l for l in lines if l]
    if not lines:
        continue
    chapter_name, short_letter = get_chapter_for_page(pno)

    reordered = []
    i = 0
    n = len(lines)
    while i < n:
        line = lines[i]
        # Check if standalone `Term :`
        if line.endswith(':') or line.endswith(' :'):
            cand = line[:-1].strip()
            if is_valid_term_candidate(cand, short_letter):
                headers = []
                j = i
                while j < n and (lines[j].endswith(':') or lines[j].endswith(' :')) and is_valid_term_candidate(lines[j][:-1].strip(), short_letter):
                    headers.append(lines[j][:-1].strip())
                    j += 1
                if len(headers) == 1:
                    if reordered and not reordered[-1].get('is_locked', False) and reordered[-1]['term'] is None:
                        reordered[-1]['term'] = headers[0]
                        reordered[-1]['is_locked'] = True
                        i += 1
                        continue
                    reordered.append({'term': headers[0], 'def_lines': [], 'is_locked': True})
                    i += 1
                    continue
                else:
                    for h in headers:
                        reordered.append({'term': h, 'def_lines': [], 'is_locked': True, 'needs_def': True})
                    i = j
                    continue

        # Check `Term : Rest` (first colon!)
        if ':' in line:
            first_colon_idx = line.index(':')
            cand = line[:first_colon_idx].strip()
            rest = line[first_colon_idx+1:].strip()
            if is_valid_term_candidate(cand, short_letter) and rest:
                reordered.append({'term': cand, 'def_lines': [rest], 'is_locked': True})
                i += 1
                continue

        # Check if next line is standalone `Term :` AND we already have an entry with empty def_lines
        # Wait: if the last entry in `reordered` has `def_lines == []`, then `line` is the definition of that last entry!
        if reordered and len(reordered[-1]['def_lines']) == 0:
            reordered[-1]['def_lines'].append(line)
            if reordered[-1].get('needs_def'):
                reordered[-1]['needs_def'] = False
            i += 1
            continue

        # Check if there are pending `needs_def` headers
        pending = [item for item in reordered if item.get('needs_def') and not item['def_lines']]
        if pending:
            pending[0]['def_lines'].append(line)
            pending[0]['needs_def'] = False
            i += 1
            continue

        # Check if next line is a standalone `Term :` and this line is the first line of that next term's definition (2-col layout where right col def was OCR'd before left col header)
        if i + 1 < n and (lines[i+1].endswith(':') or lines[i+1].endswith(' :')):
            next_cand = lines[i+1][:-1].strip()
            if is_valid_term_candidate(next_cand, short_letter):
                # Only attach `line` to `next_cand` if `i+2` is NOT the start of a new term AND `reordered[-1]` already looks complete (e.g. ends with `.` or `)`).
                prev_complete = True
                if reordered and reordered[-1]['def_lines']:
                    last_txt = reordered[-1]['def_lines'][-1].strip()
                    if not (last_txt.endswith('.') or last_txt.endswith(')') or last_txt.endswith('»')):
                        prev_complete = False
                if prev_complete:
                    reordered.append({'term': next_cand, 'def_lines': [line], 'is_locked': True})
                    i += 2
                    continue

        if reordered:
            reordered[-1]['def_lines'].append(line)
        else:
            reordered.append({'term': None, 'def_lines': [line], 'is_locked': False})
        i += 1

    for item in reordered:
        def_text = ' '.join(item['def_lines']).strip()
        if item['term']:
            entries.append({
                'term': item['term'].strip(' .-ـ،'),
                'definition': def_text,
                'letter': chapter_name,
                'page': pno
            })
        else:
            if entries:
                entries[-1]['definition'] = (entries[-1]['definition'] + ' ' + def_text).strip()

# Post-process: extract sources in parentheses and assign IDs
final_entries = []
for idx, e in enumerate(entries, 1):
    term = e['term']
    defn = e['definition'].strip()
    if not defn:
        continue
    # Extract sources mentioned in parentheses
    sources = []
    for m in re.finditer(r'\(([^()]{3,75})\)', defn):
        src = m.group(1).strip(' .-،')
        if src and src not in ['ع', 'ص', 'عج', 'س ر ر'] and len(src) > 3:
            if any(k in src for k in ['المجمع', 'مجمع', 'المصباح', 'اللمعة', 'التحرير', 'تحرير', 'الجواهر', 'جواهر', 'الشرائع', 'الشرايع', 'المسالك', 'المكاسب', 'العروة', 'أقرب الموارد', 'اللسان', 'لسان العرب', 'الينابيع', 'الوسائل', 'المنجد', 'قاموس', 'فرهنگ', 'الأصول', 'أصول', 'الميزان', 'تفسير', 'التبيان', 'كشف اللثام', 'مفتاح', 'منهاج', 'الفتاوى', 'الحدود', 'أساتذة', 'العرف', 'سفينة', 'البحار', 'نهج البلاغة', 'التبصرة', 'قواعد', 'المفردات', 'الدراية']):
                if src not in sources:
                    sources.append(src)
    final_entries.append({
        'id': f'fiqh_{idx}',
        'term': term,
        'definition': defn,
        'letter': e['letter'],
        'page': e['page'],
        'dictionaryId': 'fiqhi_main',
        'sources': sources[:4]
    })

# Create full database structure with expandable dictionaries
db = {
    "version": "1.0.0",
    "lastUpdated": "2026-10-16",
    "dictionaries": [
        {
            "id": "fiqhi_main",
            "title": "الاصطلاحات الفقهية في الرسائل العملية",
            "category": "معجم فقهي",
            "author": "الشيخ ياسين عيسى العاملي",
            "publisher": "دار البلاغة / مؤسسة النشر الإسلامي",
            "year": "١٤١٣ هـ - ١٩٩٣ م",
            "description": "معجم فقهي شامل يوضح أكثر من ألف مصطلح وكلمة واردة في الرسائل العملية وكتب الفقه الاستدلالي مرتبة حسب الحروف الأبجدية وفق فهرس الكتاب.",
            "icon": "book-open",
            "color": "#0D9488",
            "isDefault": True,
            "chapters": [
                {"letter": name, "short": short, "startPage": start_p}
                for start_p, name, short in CHAPTERS
            ],
            "sourcesList": [
                "القرآن الكريم", "الميزان في تفسير القرآن", "مجمع البيان", "التبيان",
                "تحرير الوسيلة للإمام الخميني", "منهاج الصالحين", "اللمعة الدمشقية وشرحها",
                "شرائع الإسلام للمحقق الحلي", "الينابيع الفقهية", "بحار الأنوار",
                "كتاب التعريفات للجرجاني", "نهج البلاغة", "العروة الوثقى للسيد اليزدي",
                "مسالك الأفهام للشهيد الثاني", "المكاسب للشيخ الأنصاري", "جواهر الكلام",
                "جامع السعادات", "مفاتيح الجنان", "دروس في علم الأصول للسيد محمد باقر الصدر",
                "سفينة البحار", "أصول الفقه للمظفر", "المفردات للراغب الأصفهاني",
                "المصباح المنير للفيومي", "مجمع البحرين للطريحي", "لسان العرب لابن منظور",
                "أقرب الموارد", "تبصرة المتعلمين للعلامة الحلي", "مناسك الحج",
                "موجز أحكام الحج للسيد الصدر", "الحدود والحقائق للبريدي", "الدراية للشهيد الثاني",
                "قاموس الفارسية", "فرهنگ نوين عربي فارسي", "مفتاح الكرامة",
                "الأخلاق للسيد شبر", "الفتاوى الواضحة للسيد الصدر", "مصباح الكفعمي",
                "كشف اللثام", "منطق المظفر", "الوجيزة للبهائي", "المسائل المنتخبة"
            ],
            "entries": final_entries
        },
        {
            "id": "usuli_dict",
            "title": "معجم المصطلحات الأصولية",
            "category": "معجم أصولي",
            "author": "قسم الأبحاث الأصولية",
            "publisher": "تطبيق المعجم",
            "year": "١٤٤٧ هـ",
            "description": "معجم متخصص في مصطلحات علم أصول الفقه والقواعد الأصولية الاستدلالية.",
            "icon": "scale",
            "color": "#4F46E5",
            "isDefault": False,
            "chapters": [
                {"letter": name, "short": short, "startPage": 1}
                for _, name, short in CHAPTERS
            ],
            "sourcesList": ["دروس في علم الأصول", "أصول الفقه للمظفر", "كفاية الأصول"],
            "entries": [
                {
                    "id": "usul_1",
                    "term": "الأصل العملي",
                    "definition": "حكم ظاهري جعله الشارع لتحديد الوظيفة العملية للمكلف عند الشك في الحكم الواقعي بعد الفحص واليأس من الظفر بالدليل المحرز، وأصوله الأربعة هي: البراءة، الاحتياط (الاشتغال)، التخيير، والاستصحاب. (دروس في علم الأصول للسيد الشهيد الصدر).",
                    "letter": "الهمزة",
                    "page": 1,
                    "dictionaryId": "usuli_dict",
                    "sources": ["دروس في علم الأصول"]
                },
                {
                    "id": "usul_2",
                    "term": "الاستصحاب",
                    "definition": "الحكم ببقاء ما كان على ما كان، أي إبقاء اليقين السابق وعدم نقضه بالشك اللاحق استناداً إلى الروايات المعتبرة كقوله (ع): لا تنقض اليقين أبداً بالشك. (أصول المظفر).",
                    "letter": "الهمزة",
                    "page": 1,
                    "dictionaryId": "usuli_dict",
                    "sources": ["أصول المظفر"]
                },
                {
                    "id": "usul_3",
                    "term": "البراءة الشرعية",
                    "definition": "أصل عملي يقتضي التأمين عن العقاب ونفي الإلزام عند الشك في التكليف (الشبهة الحكمية أو الموضوعية) استناداً لحديث الرفع: (رفع عن أمتي ما لا يعلمون).",
                    "letter": "الباء",
                    "page": 2,
                    "dictionaryId": "usuli_dict",
                    "sources": ["دروس في علم الأصول"]
                },
                {
                    "id": "usul_4",
                    "term": "الحجية",
                    "definition": "المنجزية والمعذرية؛ فالدليل الحجة هو الذي ينجز التكليف على المكلف إذا أصاب الواقع، ويعذره أمام المولى إذا أخطأ الواقع.",
                    "letter": "الحاء",
                    "page": 3,
                    "dictionaryId": "usuli_dict",
                    "sources": ["دروس في علم الأصول"]
                }
            ]
        },
        {
            "id": "lughawi_dict",
            "title": "معجم الألفاظ والمفردات اللغوية",
            "category": "معجم لغوي",
            "author": "قسم المعاجم اللغوية",
            "publisher": "تطبيق المعجم",
            "year": "١٤٤٧ هـ",
            "description": "معجم متخصص في الألفاظ اللغوية ومفردات غريب القرآن والحديث الشريف.",
            "icon": "languages",
            "color": "#D97706",
            "isDefault": False,
            "chapters": [
                {"letter": name, "short": short, "startPage": 1}
                for _, name, short in CHAPTERS
            ],
            "sourcesList": ["مجمع البحرين", "المصباح المنير", "لسان العرب", "مفردات الراغب"],
            "entries": [
                {
                    "id": "lugh_1",
                    "term": "الأبّ",
                    "definition": "المرعى المتهيئ للرعي والجزّ مما تنبته الأرض للأنعام، وفي التنزيل العزيز: (وَفَاكِهَةً وَأَبّاً). (مفردات الراغب ومجمع البحرين).",
                    "letter": "الهمزة",
                    "page": 1,
                    "dictionaryId": "lughawi_dict",
                    "sources": ["مفردات الراغب", "مجمع البحرين"]
                },
                {
                    "id": "lugh_2",
                    "term": "العروة الوثقى",
                    "definition": "العروة في الأصل ما يُستمسك به من مقبض الكوز والدلو، واستعيرت في القرآن الكريم للإيمان الحق والولاية المحكمة التي لا انقسام ولا انفصام فيها. (مجمع البحرين).",
                    "letter": "العين",
                    "page": 2,
                    "dictionaryId": "lughawi_dict",
                    "sources": ["مجمع البحرين"]
                }
            ]
        }
    ]
}

os.makedirs('/mnt/d/almogam/src/data', exist_ok=True)
with open('/mnt/d/almogam/src/data/dictionaries.json', 'w', encoding='utf-8') as f:
    json.dump(db, f, ensure_ascii=False, indent=2)

print(f"Saved {len(final_entries)} Fiqhi entries to /mnt/d/almogam/src/data/dictionaries.json")
