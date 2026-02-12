"""
Script semplice per testare le API di sincronizzazione
Esegui questo script per verificare che tutto funzioni correttamente
"""

import asyncio
import sys
import os

# Aggiungi il percorso del file principale
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from discord_bot_sync import LSESyncAPI

# Configurazione
API_BASE_URL = "http://localhost:5000"  # Cambia con l'URL del tuo backend
API_KEY = "your-api-key-here"  # Cambia con la tua API Key

async def main():
    # Inizializza il client API
    api = LSESyncAPI(API_BASE_URL, API_KEY)
    
    print("=" * 50)
    print("TEST API DI SINCRONIZZAZIONE LSE")
    print("=" * 50)
    
    # 1. Test connessione
    print("\n1️⃣ Test connessione...")
    if not await api.test_connection():
        print("❌ Connessione fallita! Verifica API_KEY e URL")
        return
    print("✅ Connessione OK\n")
    
    # 2. Test stato sincronizzazione
    print("2️⃣ Stato sincronizzazione...")
    status = await api.get_sync_status()
    if status:
        print(f"   👥 Membri totali: {status['members']['total']}")
        print(f"   📅 Eventi totali: {status['events']['total']}")
        if status['members']['lastUpdate']:
            print(f"   🕐 Ultimo aggiornamento membri: {status['members']['lastUpdate']}")
        if status['events']['lastUpdate']:
            print(f"   🕐 Ultimo aggiornamento eventi: {status['events']['lastUpdate']}")
    print()
    
    # 3. Test recupero membri
    print("3️⃣ Recupero membri...")
    members = await api.get_members(limit=5)
    if members:
        print(f"   ✅ Ricevuti {len(members)} membri (limit 5)")
        for member in members[:3]:  # Mostra solo i primi 3
            print(f"      - {member.get('name')} ({member.get('tag')})")
    print()
    
    # 4. Test recupero eventi
    print("4️⃣ Recupero eventi futuri...")
    events = await api.get_events(upcoming=True, limit=5)
    if events:
        print(f"   ✅ Ricevuti {len(events)} eventi futuri (limit 5)")
        for event in events[:3]:  # Mostra solo i primi 3
            print(f"      - {event.get('title')} ({event.get('type')})")
    print()
    
    # 5. Test sincronizzazione incrementale
    print("5️⃣ Sincronizzazione incrementale (ultima ora)...")
    results = await api.sync_incremental()
    print(f"   ✅ Membri modificati: {len(results['members'])}")
    print(f"   ✅ Eventi modificati: {len(results['events'])}")
    print()
    
    print("=" * 50)
    print("✅ TUTTI I TEST COMPLETATI")
    print("=" * 50)

if __name__ == "__main__":
    # Esegui i test
    asyncio.run(main())

