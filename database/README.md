# دليل مجلد قواعد البيانات (Database Directory)

يحتوي هذا المجلد على جميع مصادر وبيانات المعاجم في المشروع:

## 1. `app_active_data/`
- نسخة احتياطية ومرجعية من قاعدة البيانات النشطة للتطبيق (`dictionaries.json`).
- ملاحظة: النسخة التي يقرأ منها التطبيق مباشرة عند التشغيل موجودة في: [`src/data/dictionaries.json`](../src/data/dictionaries.json).

## 2. `original_sources/`
- مصادر البيانات الأصلية بصيغة JSON (قبل الدمج والتنظيف):
  - `MeaningFiqh.json`: مصطلحات المعجم الفقهي الأصلية.
  - `MeaningLang.json`: مصطلحات المعجم اللغوي الأصلية.
  - `MeaningOsoul.json`: مصطلحات معجم أصول الفقه الأصلية.

## 3. `processed/`
- قواعد البيانات والبيانات المستخرجة أو الناتجة عن عمليات المعالجة والفلترة:
  - `cleaned_entries.json` & `fiqhi_terms_complete.json`: مخرجات معالجة المصطلحات الفقهية.
  - `kitab_al_ayn.json`: مصطلحات كتاب العين المستخرجة.
  - `monjed_dictionary.json`: مصطلحات معجم المنجد المستخرجة.
  - `dictionaries.js`: تصدير جافاسكريبت للبيانات.
