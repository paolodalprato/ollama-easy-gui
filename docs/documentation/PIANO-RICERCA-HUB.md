# 🚨 PIANO IMPLEMENTAZIONE VERA RICERCA HUB OLLAMA

## 🎯 **PROBLEMA IDENTIFICATO**
- **Database locale statico** per simulare hub Ollama **NON HA SENSO**
- Serve **vera ricerca sull'hub Ollama** con chiave utente
- Attualmente ricerca "medgemma" fallisce con errore JSON

## 🔧 **SOLUZIONI POSSIBILI**

### **1. API Ollama Hub (IDEALE)**
```bash
# Verificare se esiste API pubblica
curl "https://ollama.com/api/models/search?q=medgemma"
curl "https://registry.ollama.ai/api/search?query=medgemma"
```

### **2. Web Scraping Ollama Hub (FALLBACK)**
```javascript
// Scraping della pagina hub
const searchUrl = `https://ollama.com/search?q=${encodeURIComponent(searchTerm)}`;
// Parse HTML response per estrarre modelli
```

### **3. Integrazione ollama-mcp REALE (FUTURO)**
```javascript
// Usare vero ollama-mcp quando disponibile
const models = await ollamaMcp.search_available_models({
    search_term: searchTerm,
    category: category
});
```

## 🔍 **IMPLEMENTAZIONE IMMEDIATA**

### **Step 1: Test API Hub**
- Verificare se Ollama ha API pubblica per ricerca
- Test con curl/Postman su endpoint hub

### **Step 2: Implementazione Web Scraping**
- Se no API, implementare scraping hub Ollama
- Parse HTML → JSON modelli

### **Step 3: Cache Intelligente**
- Cache risultati ricerca per performance
- Refresh cache periodico

## 📋 **DEBUGGING ERRORE CORRENTE**

### **"File not found" is not valid JSON**
- Server ritorna 404 HTML invece di processare route
- Possibili cause:
  1. Route `/api/models/search` non matcha
  2. Body parsing fallisce
  3. CORS issue
  4. Endpoint non configurato correttamente

### **Fix Immediato:**
1. Aggiungere logging dettagliato server
2. Verificare route matching
3. Test API con Postman
4. Debug response headers

## ⚡ **ACTION PLAN**

### **IMMEDIATO (ora):**
1. ✅ Aggiunte icone ai tab modelli
2. 🔧 Fix errore JSON ricerca
3. 🔍 Debug route `/api/models/search`

### **BREVE TERMINE (oggi):**
1. 🌐 Test API hub Ollama reale
2. 🛠️ Implementazione scraping se no API
3. ✅ Ricerca "medgemma" funzionante

### **MEDIO TERMINE (futuro):**
1. 🔗 Integrazione ollama-mcp vera
2. 📱 Cache intelligente risultati
3. 🚀 Performance optimization

---

**PRIORITÀ:** Fix immediato errore JSON, poi implementazione vera ricerca hub.
