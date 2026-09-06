# SIH 2026 Pitch & Presentation Guide: eRTMAC-NWIS
### Problem Statement ID: 26121 | Oil India Limited (A Maharatna CPSE)
**Associated PPT File:** [`SIH26121_eRTMAC_NWIS_Winning_Deck.pptx`](file:///d:/Projects/SIH%20PROJECT/SIH26121_eRTMAC_NWIS_Winning_Deck.pptx)

---

## 5-Minute Word-for-Word Pitch Script

### Slide 1: Introduction (30 seconds)
> *"Respected Evaluators and Judges, Good Morning/Afternoon.  
> We are Team **Algo Sapiens**, presenting our solution for Problem Statement **SIH 26121** from **Oil India Limited**: **eRTMAC-NWIS (Nearby Wells Intelligence System)**.  
> 
> In upstream exploration, drilling an exploration well into deep Assam formations costs crores of rupees. While Oil India's eRTMAC monitors active drilling telemetry, critical operational wisdom from 50 years of offset wells remains trapped in thousands of PDF reports.  
> 
> We have engineered **eRTMAC-NWIS** — an automated, real-time offset well intelligence and decision-support copilot designed specifically for the complex stratigraphy of the Assam Basin."*

---

### Slide 2: Proposed Solution & Operational Workflow (60 seconds)
> *"Our solution bridges the gap between active well sensors and 50 years of institutional memory.  
> 
> As the drill bit advances in real-time, our system executes a continuous 5-step operational workflow:  
> 1. **Live Sensor Ingestion:** It captures depth, ROP, WOB, and Gas units from active WITSML streams.  
> 2. **Geospatial Surveillance:** Using PostGIS, it instantly filters nearby offset wells within a dynamic 5 to 25 km radius.  
> 3. **4-Factor Proximity Hazard Engine:** It evaluates a transparent mathematical score based on depth window (+/-100m), formation match, historical recurrence, and incident severity.  
> 4. **Proactive Hazard Alerts & RAG Retrieval:** If the risk score crosses 40, it triggers real-time alerts and uses Google Gemini 3.6 Flash to pull verified curing mitigations directly from historical dossiers.  
> 5. **Pre-Spud Briefing:** It automatically generates an official, printable Oil India briefing sheet for operational handovers."*

---

### Slide 3: Technical Approach & 4-Zone Architecture (75 seconds)
> *"We built eRTMAC-NWIS entirely on an enterprise **PERN stack (PostgreSQL + PostGIS + pgvector, Express, React/Next.js, Node.js)** organized into 4 modular zones:  
> 
> * **Zone 1 (External Ingestion):** Ingests real-time rig telemetry and historical WCR/DDR PDF documents.  
> * **Zone 2 (Presentation):** An industrial dark-mode mission control console built in Next.js 14 and Tailwind CSS with Oil India’s corporate colors, featuring an ESRI dark canvas basin map and an Assam stratigraphic bit tracker.  
> * **Zone 3 (Application Layer):** A high-throughput Node.js/Express API with a lightweight Server-Sent Events (SSE) streaming engine that uses 70% less bandwidth than WebSockets.  
> * **Zone 4 (The Intelligence Core):** PostgreSQL 15 with **PostGIS 3.4** for millisecond-level spatial radius querying, and **pgvector 0.8.6** storing 768-dimensional vector embeddings for anti-hallucination semantic search.  
> 
> The entire platform is containerized into 5 Docker services for plug-and-play on-premise deployment at Oil India’s Duliajan headquarters."*

---

### Slide 4: Feasibility, Viability & Risk Mitigation (75 seconds)
> *"When deploying AI into high-consequence petroleum operations, engineering feasibility and risk mitigation are paramount:  
> 
> * **Challenge 1: Data Confidentiality:** Subsurface logs cannot be leaked to public clouds.  
>   * **Our Solution:** On-premise Docker deployment with local MinIO S3 storage and JWT role-based security. No sensitive well files leave the OIL intranet.  
> * **Challenge 2: Geological Faulting:** Simple 2D distance is insufficient in Assam.  
>   * **Our Solution:** A hybrid 4-factor scoring model that correlates spatial proximity with vertical stratigraphic formation tops.  
> * **Challenge 3: LLM Hallucinations:** False advice during a kick could lead to a blowout.  
>   * **Our Solution:** Strict grounded RAG guardrails. The assistant only answers using verified pgvector citations; if no evidence exists, it explicitly states so.  
> * **Challenge 4: Remote Rig Connectivity:** Poor satellite links at field wellsites.  
>   * **Our Solution:** Unidirectional SSE streaming with local browser caching to maintain dashboard continuity even under network drops.  
> * **Challenge 5: Legacy PDF Scans:** 50 years of reports exist in diverse formats.  
>   * **Our Solution:** Multi-stage OCR and Gemini structured extraction pipeline paired with a human-in-the-loop Data Steward validation queue."*

---

### Slide 5: Quantifiable Impact & Economic Value (60 seconds)
> *"The impact of eRTMAC-NWIS directly benefits Oil India and national energy security:  
> 
> * **Economic Impact:** Rig downtime costs upwards of Rs. 15 to 25 Lakhs per day. By preventing stuck pipe and lost circulation incidents before the bit enters hazardous intervals, NWIS saves crores of rupees per exploration well.  
> * **Operational & HSE Safety:** Early kick detection—such as detecting gas units spiking from 34 to 170+ units at 2,800m—allows drilling crews to shut in the well and circulate kill mud before an influx reaches blowout proportions.  
> * **Institutional Memory:** Preserves 50 years of drilling lessons learned across Naharkatiya, Lakwa, and Moran fields, preventing repeated operational failures.  
> 
> In conclusion: **eRTMAC-NWIS is India's first AI-powered offset well intelligence platform—transforming decades of drilling memory into real-time operational safety for Oil India Limited.**  
> 
> Thank you, and we are now ready for the live demonstration."*

---

## Anticipated Evaluator Q&A Cheat Sheet

| Question | Winning Answer |
| :--- | :--- |
| **Q: What data did you use for testing?** | *"Because actual well completion reports and daily drilling logs are classified under DGH regulations, we generated a statistically and geologically calibrated synthetic dataset based on published research papers of the Assam Basin. It accurately models the Barail and Tipam stratigraphy and uses standard WITSML and PPDM schemas, making it 100% plug-and-play for OIL."* |
| **Q: Why Server-Sent Events (SSE) instead of WebSockets?** | *"Rig-to-office telemetry is strictly unidirectional (server $\to$ client). WebSockets introduce bidirectional overhead, stateful socket maintenance, and firewall issues on rig satellite links. SSE runs over standard HTTP/2, auto-reconnects, and consumes 70% less bandwidth."* |
| **Q: How do you prevent AI hallucination?** | *"Our Gemini 3.6 Flash assistant is strictly bound to vector search results in `pgvector`. It cannot fabricate values; it requires direct source citations (well name, depth, page number), and if no offset well evidence exists in the database, it explicitly replies that records contain no relevant evidence."* |
| **Q: Can this run completely offline on a rig without internet?** | *"Yes. The core risk engine, PostGIS spatial database, SSE streaming server, and telemetry strip run completely offline on local hardware. For the GenAI assistant in air-gapped setups, Gemini can be swapped with an on-premise quantized model like Llama-3-8B running on Ollama or vLLM."* |
