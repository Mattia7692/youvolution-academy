export type VoceChangelog = {
  versione: string;
  data: string;
  titolo: string;
  modifiche: string[];
};

export const CHANGELOG: VoceChangelog[] = [
  {
    versione: "v1.04",
    data: "2026-07-23",
    titolo: "Iscrizione allineata al modulo cartaceo",
    modifiche: [
      "Corsi multi-modulo con pacchetti a prezzo scontato",
      "Early bird calcolato automaticamente (16 giorni prima dell'inizio del primo modulo)",
      "Codice sconto singolo, non cumulabile con l'early bird",
      "Prezzo scomposto in imponibile, IVA e totale",
      "Nuovi campi anagrafici: cellulare, data di nascita, fatturazione alternativa",
      "Doppio consenso richiesto: condizioni contrattuali e privacy",
      "Coordinate bonifico aggiornate con i dati reali (beneficiario, banca, IBAN) e campi completi al passo 2 (data, ammontare, banca ordinante, CRO)",
      "Pulsante di invio rinominato in \"Completa iscrizione\"",
    ],
  },
  {
    versione: "v1.03",
    data: "2026-07-04",
    titolo: "Pagina Informazioni e catalogo con iscrizioni sospese",
    modifiche: [
      "Nuova pagina Informazioni (solo admin): cronologia versioni con card espandibili",
      "Bolla teal per la versione, elenco puntato con spaziatura più leggibile",
      "Catalogo corsi: evidenziazione in arancione dei corsi con iscrizione avviata ma non completata",
      "Il pulsante porta direttamente al passo 2 per completare l'iscrizione sospesa",
    ],
  },
  {
    versione: "v1.02",
    data: "2026-07-04",
    titolo: "Allineamento sidebar all'enterprise",
    modifiche: [
      "Sidebar admin larga 280px, logo ingrandito, divisore sotto il logo",
      "Voci di navigazione raggruppate in sezioni CORSI e ISCRIZIONI",
      "Sidebar ad altezza fissa, con scroll del contenuto indipendente",
      "L'admin atterra su Gestione corsi invece di Coda di verifica dopo il login",
      "Iscrizione passo 1: aggiunta l'opzione Libero professionista",
      "Iscrizione passo 2: card di conferma con posto riservato sopra le coordinate del bonifico",
      "Predisposto il template email di conferma registrazione",
    ],
  },
  {
    versione: "v1.01",
    data: "2026-07-02",
    titolo: "Revisione UX iscrizione e strumenti admin",
    modifiche: [
      "Revisione del flusso di iscrizione (passo 1 e passo 2)",
      "Gestione corsi lato admin: creazione, modifica, attivazione/disattivazione",
      "Pulizia e cancellazione delle iscrizioni con relativo log",
      "Import dei corsi esterni e gestione dei posti disponibili",
    ],
  },
  {
    versione: "v1.00",
    data: "2026-07-01",
    titolo: "Scaffold Youvolution Academy",
    modifiche: [
      "Schema del database: profiles, corsi, iscrizioni, log_azioni con RLS",
      "Autenticazione e registrazione dei corsisti",
      "Wizard di iscrizione ai corsi",
      "Coda di verifica admin per il controllo dei bonifici",
    ],
  },
];
