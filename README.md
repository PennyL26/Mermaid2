# Εξέταση KUMITE / KATA — TRUE/FALSE Web App

Πλήρως λειτουργική, offline-first web εφαρμογή εξέτασης τύπου
TRUE/FALSE για KUMITE και KATA. Καθαρό HTML5/CSS3/JavaScript (ES
Modules), χωρίς backend, χωρίς Java.

## 1. Ένα βήμα πριν την πρώτη εκτέλεση

Η βιβλιοθήκη ανάγνωσης Excel (SheetJS) πρέπει να βρίσκεται τοπικά στο
`/vendor/xlsx.full.min.js` (βλ. `vendor/README.txt` για την ακριβή
εντολή λήψης — ένα `curl -LO ...`). Χωρίς αυτό το αρχείο η εφαρμογή
ανοίγει κανονικά αλλά το KUMITE/KATA θα εμφανίσει φιλικό μήνυμα
σφάλματος αντί να φορτώσει ερωτήσεις.

## 2. Εκτέλεση τοπικά

Οι browsers μπλοκάρουν `fetch()` σε τοπικά αρχεία μέσω `file://`, γι'
αυτό χρειάζεται ένας απλός web server. Οποιοδήποτε από τα παρακάτω:

```bash
# Python (ενσωματωμένο σε κάθε σύγχρονο σύστημα με Python 3)
python3 -m http.server 8000

# Node.js
npx serve .
```

Μετά ανοίξτε: `http://localhost:8000/`

Εναλλακτικά, η επέκταση **Live Server** του VS Code δουλεύει εξίσου
καλά. Για πραγματική χρήση, ανεβάστε τον φάκελο σε **GitHub Pages**
ή αντίστοιχο static hosting — η εφαρμογή δεν χρειάζεται backend.

## 3. Δομή

```
index.html
css/style.css
js/{app,state,quiz,timer,excel,settings,storage,ui,utils}.js
vendor/xlsx.full.min.js   ← κατεβάστε το (βλ. βήμα 1)
data/{qkumite,qkata,mini-affirmations,template-questions}.xlsx
assets/mermaid-1.png … mermaid-13.png
sw.js, manifest.json
```

`data/qkumite.xlsx` και `data/qkata.xlsx` περιέχουν δείγματα 8
ερωτήσεων ο καθένας — αντικαταστήστε τα με τα πραγματικά σας
datasets (ίδια δομή, όσες ερωτήσεις θέλετε, χωρίς τεχνητό όριο).
`data/template-questions.xlsx` είναι το template με οδηγίες
(section 60 του prompt).

`assets/mermaid-1.png` … `mermaid-13.png` είναι **placeholder**
εικόνες (απαλά ροζ σχήματα) — αντικαταστήστε τες με τις πραγματικές
13 εικόνες που θέλετε να εναλλάσσονται στο φόντο της αρχικής οθόνης.

## 4. Τι υλοποιεί η εφαρμογή

- Κεντρικό state machine (`js/state.js`) — καμία ασύνδετη boolean σημαία.
- Ένας μοναδικός, idempotent μηχανισμός ολοκλήρωσης ερώτησης
  (`QuizSession.completeQuestion` στο `js/quiz.js`) στον οποίο
  καταλήγουν TRUE/FALSE, timeout, swipe, click και τα keyboard
  shortcuts — εγγυάται ότι καμία ερώτηση δεν ολοκληρώνεται δύο φορές.
- Timer βασισμένος σε `performance.now()` (`js/timer.js`), όχι σε
  μέτρημα `setInterval` ticks.
- Ανεξάρτητη φόρτωση/validation KUMITE και KATA — η αποτυχία του
  ενός δεν επηρεάζει το άλλο.
- Fisher-Yates shuffle (`js/utils.js`) για unbiased randomization.
- Ρυθμίσεις μέσω `localStorage` με ρητά defaults και ανοχή σε
  corrupt δεδομένα (`js/storage.js`).
- Service worker (`sw.js`) για πλήρη offline λειτουργία μετά την
  πρώτη φόρτωση.
- Export αποτελεσμάτων σε `.csv` + `.txt`.

## 5. Testing (section 57)

Τα 20 σενάρια του section 57 (κανονική απάντηση, timeout, ταυτόχρονα
events, pause/resume, τυχαία/σειριακή επιλογή, 500+ ερωτήσεις,
ελλιπές/άκυρο Excel, corrupt localStorage, portrait mobile, race
condition stress test) πρέπει να ελεγχθούν χειροκίνητα στον browser
πριν τη χρήση σε πραγματική προπόνηση — ο κώδικας είναι σχεδιασμένος
ώστε να τα ικανοποιεί όλα (βλ. σχόλια μέσα στο `js/quiz.js` για το
πώς αποφεύγεται κάθε race condition), αλλά δεν αντικαθιστά το
πραγματικό testing σε πραγματικές συσκευές/browsers.

## 6. Γνωστός περιορισμός ασφαλείας (section 51)

Η εφαρμογή είναι 100% client-side, άρα οι σωστές απαντήσεις
βρίσκονται στον browser. Κατάλληλη για εκπαίδευση/προπόνηση, **όχι**
για επίσημη εξέταση όπου απαιτείται προστασία των απαντήσεων από
τεχνικά καταρτισμένο χρήστη.
