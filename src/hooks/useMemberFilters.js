import { useState, useMemo, useCallback } from 'react';

/**
 * Hook personalizzato per gestire i filtri dei membri
 */
export function useMemberFilters(members) {
    const [query, setQuery] = useState('');
    const [selectedTag, setSelectedTag] = useState('Tutti');
    const [selectedIdoneita, setSelectedIdoneita] = useState('Tutti');
    const [selectedValidation, setSelectedValidation] = useState('Tutti');
    const [selectedWatchdog, setSelectedWatchdog] = useState('Tutti');

    /**
     * Estrae tutti i tag unici dai membri
     */
    const tags = useMemo(() => {
        const uniqueTags = new Set(members.map(m => m.tag).filter(Boolean));
        return ['Tutti', ...Array.from(uniqueTags).sort()];
    }, [members]);

    /**
     * Converte una stringa data in un oggetto Date per l'ordinamento
     */
    const parseDate = (dateString) => {
        if (!dateString || typeof dateString !== 'string') {
            return new Date(0); // Data minima per i membri senza data
        }
        
        // Prova a parsare diversi formati di data
        // Formato: "YYYY-MM-DD HH:mm" o "YYYY-MM-DD" o altri formati comuni
        const date = new Date(dateString);
        if (isNaN(date.getTime())) {
            return new Date(0); // Data minima se il parsing fallisce
        }
        return date;
    };

    /**
     * Filtra i membri in base ai criteri selezionati
     */
    const filtered = useMemo(() => {
        const filteredMembers = members.filter(m => {
            // Gestione del filtro per tag
            let matchTag;
            if (selectedTag === 'Tutti') {
                // Mostra tutti i membri non promossi + tutti i membri LSE
                matchTag = m.tag === 'LSE-P' || m.tag === 'LSE';
            } else {
                // Filtro per tag specifico
                matchTag = m.tag === selectedTag;
            }

            const matchIdoneita = selectedIdoneita === 'Tutti'
                ? true
                : selectedIdoneita === 'Idonei'
                    ? m.idoneita === true && m.tag !== 'LSE'
                    : m.idoneita === false && m.tag !== 'LSE';
            const matchValidation = selectedValidation === 'Tutti'
                ? true
                : selectedValidation === 'Validazione fallita'
                    ? m.orgValidation?.isValid === false
                    : selectedValidation === 'Validazione superata'
                        ? m.orgValidation?.isValid === true
                        : true;
            const matchWatchdog = selectedWatchdog === 'Tutti'
                ? true
                : selectedWatchdog === 'Da tenere d\'occhio'
                    ? m.watchdog === true
                    : m.watchdog === false;
            const matchQuery = m.name.toLowerCase().includes(query.toLowerCase()) || (m.id || '').includes(query);
            
            return matchTag && matchIdoneita && matchValidation && matchWatchdog && matchQuery;
        });

        // Ordina i membri: se il filtro è "LSE-P" o "Tutti" (che include LSE-P), ordina per data
        const isLSEPFilter = selectedTag === 'LSE-P' || (selectedTag === 'Tutti' && filteredMembers.some(m => m.tag === 'LSE-P'));
        
        if (isLSEPFilter) {
            // Separa i membri LSE-P dagli altri
            const lsePMembers = filteredMembers.filter(m => m.tag === 'LSE-P');
            const otherMembers = filteredMembers.filter(m => m.tag !== 'LSE-P');
            
            // Ordina i membri LSE-P per data (più recenti prima, o più vecchi prima - assumiamo più vecchi prima)
            lsePMembers.sort((a, b) => {
                const dateA = parseDate(a.date);
                const dateB = parseDate(b.date);
                return dateA.getTime() - dateB.getTime(); // Ordine crescente (più vecchi prima)
            });
            
            // Mantieni l'ordine originale per gli altri membri (ordinati per key dal backend)
            return [...lsePMembers, ...otherMembers];
        }
        
        // Per gli altri filtri, mantieni l'ordine originale
        return filteredMembers;
    }, [members, query, selectedTag, selectedIdoneita, selectedValidation, selectedWatchdog]);

    /**
     * Genera le opzioni del filtro combinato
     */
    const filterOptions = useMemo(() => {
        const options = [
            { value: 'Tutti|Tutti|Tutti|Tutti', label: 'Tutti i membri' }
        ];

        // Aggiungi separatore Tag
        options.push({ type: 'separator', label: '─── Tag ───' });

        // Poi aggiungi i tag specifici (LSE, LSE-P)
        tags.filter(t => t !== 'Tutti').forEach(tag => {
            options.push({ value: `${tag}|Tutti|Tutti|Tutti`, label: tag });
        });

        // Aggiungi separatore
        options.push({ type: 'separator', label: '─── Status ───' });

        // Poi aggiungi i filtri per status
        options.push(
            { value: 'Tutti|Non idonei|Tutti|Tutti', label: 'Non idonei' },
            { value: 'Tutti|Idonei|Tutti|Tutti', label: 'Idonei' },
            { value: 'Tutti|Tutti|Validazione fallita|Tutti', label: 'Validazione fallita' },
            { value: 'Tutti|Tutti|Validazione superata|Tutti', label: 'Validazione superata' },
            { value: 'Tutti|Tutti|Tutti|Da tenere d\'occhio', label: 'Da tenere d\'occhio' }
        );
        
        return options;
    }, [tags]);

    const filterValue = `${selectedTag}|${selectedIdoneita}|${selectedValidation}|${selectedWatchdog}`;

    /**
     * Gestisce il cambio del filtro combinato
     */
    const handleFilterChange = useCallback((value) => {
        const [tag, idoneita, validation, watchdog] = value.split('|');
        setSelectedTag(tag);
        setSelectedIdoneita(idoneita);
        setSelectedValidation(validation || 'Tutti');
        setSelectedWatchdog(watchdog || 'Tutti');
    }, []);

    /**
     * Resetta tutti i filtri
     */
    const resetFilters = useCallback(() => {
        setQuery('');
        setSelectedTag('Tutti');
        setSelectedIdoneita('Tutti');
        setSelectedValidation('Tutti');
        setSelectedWatchdog('Tutti');
    }, []);

    return {
        query,
        setQuery,
        selectedTag,
        setSelectedTag,
        selectedIdoneita,
        setSelectedIdoneita,
        selectedValidation,
        setSelectedValidation,
        selectedWatchdog,
        setSelectedWatchdog,
        tags,
        filtered,
        filterOptions,
        filterValue,
        handleFilterChange,
        resetFilters,
    };
}

