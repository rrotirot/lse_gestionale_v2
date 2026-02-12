"""
Esempio di integrazione API di sincronizzazione per Bot Discord (Python)
Usa questo codice come base per integrare le API nel tuo bot Discord esistente
"""

import aiohttp
import asyncio
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
import json

class LSESyncAPI:
    """Classe helper per sincronizzare dati con la web app LSE"""
    
    def __init__(self, base_url: str, api_key: str):
        """
        Inizializza il client API
        
        Args:
            base_url: URL base del backend (es: "http://localhost:5000")
            api_key: API Key per l'autenticazione
        """
        self.base_url = base_url.rstrip('/')
        self.api_key = api_key
        self.headers = {
            'X-API-Key': api_key,
            'Content-Type': 'application/json'
        }
        self.last_sync_timestamp = None
    
    async def test_connection(self) -> bool:
        """
        Testa la connessione e l'autenticazione
        
        Returns:
            True se la connessione è valida, False altrimenti
        """
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    f"{self.base_url}/api/sync/test",
                    headers=self.headers
                ) as response:
                    if response.status == 200:
                        data = await response.json()
                        print(f"✅ Connessione valida: {data.get('message')}")
                        return True
                    else:
                        print(f"❌ Errore autenticazione: {response.status}")
                        return False
        except Exception as e:
            print(f"❌ Errore connessione: {e}")
            return False
    
    async def get_members(
        self,
        since: Optional[str] = None,
        tag: Optional[str] = None,
        limit: Optional[int] = None
    ) -> List[Dict[str, Any]]:
        """
        Ottiene la lista dei membri dal database
        
        Args:
            since: Timestamp ISO per sincronizzazione incrementale
            tag: Filtra per tag specifico (es: "LSE-P", "LSE")
            limit: Limita il numero di risultati
        
        Returns:
            Lista di membri
        """
        try:
            params = {}
            if since:
                params['since'] = since
            if tag:
                params['tag'] = tag
            if limit:
                params['limit'] = limit
            
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    f"{self.base_url}/api/sync/members",
                    headers=self.headers,
                    params=params
                ) as response:
                    if response.status == 200:
                        data = await response.json()
                        if data.get('success'):
                            members = data.get('members', [])
                            print(f"📥 Ricevuti {len(members)} membri")
                            return members
                        else:
                            print(f"❌ Errore: {data.get('error')}")
                            return []
                    else:
                        error_text = await response.text()
                        print(f"❌ Errore HTTP {response.status}: {error_text}")
                        return []
        except Exception as e:
            print(f"❌ Errore nel recupero membri: {e}")
            return []
    
    async def sync_members(self, members: List[Dict[str, Any]]) -> bool:
        """
        Sincronizza membri dal bot al database
        
        Args:
            members: Lista di membri da sincronizzare
        
        Returns:
            True se la sincronizzazione è riuscita, False altrimenti
        """
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"{self.base_url}/api/sync/members",
                    headers=self.headers,
                    json={'members': members}
                ) as response:
                    if response.status == 200:
                        data = await response.json()
                        if data.get('success'):
                            print(f"✅ Sincronizzati {data.get('total')} membri "
                                  f"({data.get('inserted')} inseriti, "
                                  f"{data.get('updated')} aggiornati)")
                            return True
                        else:
                            print(f"❌ Errore: {data.get('error')}")
                            return False
                    else:
                        error_text = await response.text()
                        print(f"❌ Errore HTTP {response.status}: {error_text}")
                        return False
        except Exception as e:
            print(f"❌ Errore nella sincronizzazione membri: {e}")
            return False
    
    async def get_events(
        self,
        since: Optional[str] = None,
        upcoming: bool = False,
        event_type: Optional[str] = None,
        limit: Optional[int] = None
    ) -> List[Dict[str, Any]]:
        """
        Ottiene la lista degli eventi dal database
        
        Args:
            since: Timestamp ISO per sincronizzazione incrementale
            upcoming: Solo eventi futuri
            event_type: Filtra per tipo ("evento", "riunione", "attività", "altro")
            limit: Limita il numero di risultati
        
        Returns:
            Lista di eventi
        """
        try:
            params = {}
            if since:
                params['since'] = since
            if upcoming:
                params['upcoming'] = 'true'
            if event_type:
                params['type'] = event_type
            if limit:
                params['limit'] = limit
            
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    f"{self.base_url}/api/sync/events",
                    headers=self.headers,
                    params=params
                ) as response:
                    if response.status == 200:
                        data = await response.json()
                        if data.get('success'):
                            events = data.get('events', [])
                            print(f"📅 Ricevuti {len(events)} eventi")
                            return events
                        else:
                            print(f"❌ Errore: {data.get('error')}")
                            return []
                    else:
                        error_text = await response.text()
                        print(f"❌ Errore HTTP {response.status}: {error_text}")
                        return []
        except Exception as e:
            print(f"❌ Errore nel recupero eventi: {e}")
            return []
    
    async def sync_events(self, events: List[Dict[str, Any]]) -> bool:
        """
        Sincronizza eventi dal bot al database
        
        Args:
            events: Lista di eventi da sincronizzare (devono avere _id o id)
        
        Returns:
            True se la sincronizzazione è riuscita, False altrimenti
        """
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"{self.base_url}/api/sync/events",
                    headers=self.headers,
                    json={'events': events}
                ) as response:
                    if response.status == 200:
                        data = await response.json()
                        if data.get('success'):
                            print(f"✅ Sincronizzati {data.get('total')} eventi "
                                  f"({data.get('updated')} aggiornati)")
                            return True
                        else:
                            print(f"❌ Errore: {data.get('error')}")
                            return False
                    else:
                        error_text = await response.text()
                        print(f"❌ Errore HTTP {response.status}: {error_text}")
                        return False
        except Exception as e:
            print(f"❌ Errore nella sincronizzazione eventi: {e}")
            return False
    
    async def get_sync_status(self) -> Optional[Dict[str, Any]]:
        """
        Ottiene lo stato della sincronizzazione
        
        Returns:
            Dizionario con lo stato o None in caso di errore
        """
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    f"{self.base_url}/api/sync/status",
                    headers=self.headers
                ) as response:
                    if response.status == 200:
                        data = await response.json()
                        if data.get('success'):
                            return data.get('status')
                        else:
                            print(f"❌ Errore: {data.get('error')}")
                            return None
                    else:
                        error_text = await response.text()
                        print(f"❌ Errore HTTP {response.status}: {error_text}")
                        return None
        except Exception as e:
            print(f"❌ Errore nel recupero stato: {e}")
            return None
    
    async def sync_incremental(self) -> Dict[str, Any]:
        """
        Esegue una sincronizzazione incrementale (solo dati modificati)
        
        Returns:
            Dizionario con i risultati della sincronizzazione
        """
        results = {
            'members': [],
            'events': [],
            'timestamp': None
        }
        
        # Calcola timestamp per sincronizzazione incrementale (ultima ora)
        since = (datetime.now() - timedelta(hours=1)).isoformat()
        
        # Sincronizza membri
        members = await self.get_members(since=since)
        results['members'] = members
        
        # Sincronizza eventi
        events = await self.get_events(since=since, upcoming=True)
        results['events'] = events
        
        results['timestamp'] = datetime.now().isoformat()
        
        return results


# ==================== ESEMPIO DI USO CON DISCORD.PY ====================

"""
Esempio di integrazione nel tuo bot Discord esistente
"""

import discord
from discord.ext import tasks

# Configurazione
API_BASE_URL = "http://localhost:5000"  # Cambia con l'URL del tuo backend
API_KEY = "your-api-key-here"  # Cambia con la tua API Key

# Inizializza il client API
lse_api = LSESyncAPI(API_BASE_URL, API_KEY)

# Inizializza il bot Discord
intents = discord.Intents.default()
intents.message_content = True
bot = discord.Client(intents=intents)

@bot.event
async def on_ready():
    """Evento quando il bot è pronto"""
    print(f'✅ Bot connesso come {bot.user}')
    
    # Testa la connessione API
    if await lse_api.test_connection():
        print("✅ API di sincronizzazione connessa")
        # Avvia sincronizzazione periodica
        periodic_sync.start()
    else:
        print("❌ Errore connessione API")

@tasks.loop(minutes=5)  # Sincronizza ogni 5 minuti
async def periodic_sync():
    """Sincronizzazione periodica"""
    try:
        # Sincronizzazione incrementale
        results = await lse_api.sync_incremental()
        
        if results['members']:
            print(f"📥 Ricevuti {len(results['members'])} membri aggiornati")
            # Processa i membri nel bot (es: aggiorna ruoli Discord)
            for member in results['members']:
                # Esempio: aggiorna ruolo Discord in base al tag
                # await update_discord_role(member)
                pass
        
        if results['events']:
            print(f"📅 Ricevuti {len(results['events'])} eventi aggiornati")
            # Processa gli eventi nel bot (es: invia notifiche)
            for event in results['events']:
                # Esempio: invia notifica evento
                # await notify_event(event)
                pass
                
    except Exception as e:
        print(f"❌ Errore sincronizzazione periodica: {e}")

@bot.command(name='sync_members')
async def sync_members_command(ctx):
    """Comando Discord per sincronizzare manualmente i membri"""
    await ctx.send("🔄 Sincronizzazione membri in corso...")
    
    # Ottieni tutti i membri
    members = await lse_api.get_members()
    
    if members:
        # Processa i membri (esempio: mostra statistiche)
        lse_p = sum(1 for m in members if m.get('tag') == 'LSE-P')
        lse = sum(1 for m in members if m.get('tag') == 'LSE')
        
        await ctx.send(
            f"✅ Sincronizzazione completata!\n"
            f"📊 Totale membri: {len(members)}\n"
            f"🔵 LSE-P: {lse_p}\n"
            f"🟢 LSE: {lse}"
        )
    else:
        await ctx.send("❌ Nessun membro trovato o errore nella sincronizzazione")

@bot.command(name='sync_events')
async def sync_events_command(ctx):
    """Comando Discord per sincronizzare manualmente gli eventi"""
    await ctx.send("🔄 Sincronizzazione eventi in corso...")
    
    # Ottieni solo eventi futuri
    events = await lse_api.get_events(upcoming=True)
    
    if events:
        # Mostra i prossimi eventi
        message = "📅 **Prossimi Eventi:**\n\n"
        for event in events[:5]:  # Mostra solo i primi 5
            event_date = datetime.fromisoformat(event['date'].replace('Z', '+00:00'))
            message += f"**{event['title']}**\n"
            message += f"📆 {event_date.strftime('%d/%m/%Y')}\n"
            if event.get('startTime'):
                message += f"⏰ {event['startTime']}\n"
            message += "\n"
        
        await ctx.send(message)
    else:
        await ctx.send("❌ Nessun evento futuro trovato")

@bot.command(name='sync_status')
async def sync_status_command(ctx):
    """Comando Discord per vedere lo stato della sincronizzazione"""
    status = await lse_api.get_sync_status()
    
    if status:
        members_info = status.get('members', {})
        events_info = status.get('events', {})
        
        message = "📊 **Stato Sincronizzazione:**\n\n"
        message += f"👥 Membri: {members_info.get('total', 0)}\n"
        if members_info.get('lastUpdate'):
            last_update = datetime.fromisoformat(members_info['lastUpdate'].replace('Z', '+00:00'))
            message += f"🕐 Ultimo aggiornamento: {last_update.strftime('%d/%m/%Y %H:%M')}\n"
        message += f"\n📅 Eventi: {events_info.get('total', 0)}\n"
        if events_info.get('lastUpdate'):
            last_update = datetime.fromisoformat(events_info['lastUpdate'].replace('Z', '+00:00'))
            message += f"🕐 Ultimo aggiornamento: {last_update.strftime('%d/%m/%Y %H:%M')}\n"
        
        await ctx.send(message)
    else:
        await ctx.send("❌ Errore nel recupero dello stato")

# Avvia il bot
# bot.run('YOUR_DISCORD_BOT_TOKEN')

