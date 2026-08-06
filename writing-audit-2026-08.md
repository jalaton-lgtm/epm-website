# Writing audit, whole site, August 2026

> **Status, 6 August 2026.** Scope B applied in full: all of Priority 1 and Priority 2, plus the four rule 1 decisions.
>
> From Priority 3, EP has since ruled on three items. The **Frey translation** is fixed: the three em dashes are rebuilt as a colon and a parenthetical, "excellent" and "superb" stay because they are Frey's judgement rather than EP's claim, and the caption now states that the English is a translation of the Finnish original. One thing stays open there, recorded in the page's own comment: the 2.8.2026 clearance is on record for the Finnish, and whether it covered an English version is unconfirmed. The **home teaser** keeps its Finnish wording, now "kustantaa sen mukaisesti". EP's ruling is that the English claim, that the sport costs more than it pays, does not carry in Finnish prose, so the divergence is deliberate and is marked as such in the file. The **blog paragraph 3** divergence is passed.
>
> Still open from Priority 3: the Advisory paragraph split, and evidence for the governance offer.
>
> Findings below are kept as written, as the record of what was there.

Measured against writing-coach **version 2026-08-06**, the build currently installed.

**Mode check.** The five info pages (home, profile, partners, press, 404) are mode 5, Commercial / Branded, per the skill's 5-vs-7 test: sponsor, partner and profile pages on EP's own site are mode 5 because the personal endorsement and the dated history are the content. The blog post is mode 2, Personal / Introspective, so the Finnish is the master and the English is the rewrite. Mode 5 runs `Floor only` as its Tier 1 stance, which means Tier 0 plus sample matching, and no sentence-length or clause-count numbers apply. So almost everything below is Tier 0, the layer that outranks every profile and every sample.

**Overall impression.** The site is in better shape than a first pass suggests, and the reason is visible in the git history: the pages that got EP's July voice pass are close to clean, and the two that did not are carrying almost every serious Finnish fault on the site. This is not scattered damage. It is concentrated in `fi/profile.astro` and `fi/index.astro`. The single biggest finding is not a sentence, it is a pattern: **terminology rotates across pages** because each page was written and revised on its own, and Tier 0 rule 1 is a whole-site rule that no single-page review would ever catch.

---

## Priority 1: Tier 0 violations in EP's own prose

These are checkable by inspection, not taste, and Tier 0 outranks every profile and sample.

### 1.1 Three semicolons

Rule 8 bans the semicolon outright. Write two sentences.

| Where | Text |
|---|---|
| [partners.astro:124](src/pages/partners.astro:124) | "Finding the problems is the easy part; resolving them takes real work." |
| [press.astro:186](src/pages/press.astro:186) | "...full muscle power in the trunk; some athletes also have a degree of leg function." |
| [fi/press.astro:181](src/pages/fi/press.astro:181) | "...täysi vartalon lihasvoima; osalla urheilijoista on lisäksi..." |

Worth noting that the Finnish twin of the first one already avoids it with a comma ("on helpoin asia, niiden ratkaisu taas..."), so the English is the odd one out, not the Finnish.

### 1.2 The English Frey testimonial is not exempt, and it is the only marketing copy on the site

[partners.astro:139-159](src/pages/partners.astro:139). Three em dashes at lines 145, 151 and 153, plus "excellent" and "superb" at line 143.

The file's own comment says it: "The Finnish is his original and lives on the FI page; this is a translation of it." That matters. Tier 0 exempts **direct quotation**, meaning text reproduced verbatim. The Finnish block at [fi/partners.astro:144-166](src/pages/fi/partners.astro:144) is Frey's actual words and is genuinely exempt, spaced en dashes and all. The English block is a rewrite EP produced, wearing quotation marks. Under the floor's own logic it is EP's text, so rules 5 and 8 apply to it.

This is the sharpest judgement call on the site, because it cuts two ways. Fixing it means editing a named third party's testimonial, which is its own kind of wrong. Leaving it means the one paragraph a partner is most likely to read carries three em dashes and two superlatives, on a page whose whole argument is that a partner is owed a specific claim rather than an adjective. My read: keep the words, replace the three em dashes with full stops or colons, and leave "excellent" and "superb" alone because they are Frey's judgement and removing them would misrepresent him. A short line under the caption saying the English is a translation of the Finnish original would settle it honestly.

### 1.3 `toimia` + essive, three hits, all on the two unpassed pages

Scanner item 1, and the one EP named himself: *"you overuse 'toimii', which is actually quite bad finnish language."*

| Where | Text | Direct verb |
|---|---|---|
| [fi/profile.astro:100](src/pages/fi/profile.astro:100) | "Toimin ... urheilijavaliokunnan puheenjohtajana ja ... hallituksen jäsenenä" | "Johdan ... urheilijavaliokuntaa ja kuulun ... hallitukseen" |
| [fi/profile.astro:109](src/pages/fi/profile.astro:109) | "Aiemmin toimin ... pääsihteerinä" | "Olin aiemmin ... pääsihteeri" |
| [fi/index.astro:52](src/pages/fi/index.astro:52) | "toimin hallitustehtävissä" | "minulla on hallitustehtäviä" |

The contrast is the useful part. Every page that had the voice pass gets this right already: `fi/press.astro:136` has "Hän on ... puheenjohtaja", `fi/press.astro:155` has "hän kuuluu ... hallituksiin", and the Finnish blog post has "Olen ... puheenjohtaja ... sekä kuulun ... hallitukseen". Same fact, three clean statements, one page still using the officialese form. `fi/index.astro:51` even gets the first half right ("johdan ... urheilijavaliokuntaa") and then falls into `toimin` in the second half of the same sentence.

Note also [fi/partners.astro:62](src/pages/fi/partners.astro:62), "se on toiminut jo kerran". That one is fine. It is `toimia` meaning "worked", with no essive, and no direct verb replaces it.

### 1.4 Rule 1, one name for one thing: the largest finding by volume

Rule 1 bans synonym rotation across a piece. Read as a site, these are all one piece.

**The distance.** English prose says "100m" on [profile.astro:74, 78, 86, 87](src/pages/profile.astro:74) and [index.astro:50](src/pages/index.astro:50), and "100 m" throughout press.astro. Finnish is worse, running "100m", "100 metrin" and "100 metrillä". `fi/press.astro`'s own header comment states the house rule, "100 metrin, ei 100m", and [fi/profile.astro:139](src/pages/fi/profile.astro:139) breaks it in the roles list. Compact "100m" in the hero kicker and the stat tiles is correct and should stay, per scanner item 7: the compact form is fine in a label, never in prose.

**The federation.** "Finnish Athletics Federation" at [profile.astro:143](src/pages/profile.astro:143), "Finnish Athletics" at [press.astro:161](src/pages/press.astro:161) and in the blog post.

**The Olympic Committee.** [where-i-am.md:25](src/content/blog/en/where-i-am.md:25) uses "the Finnish Olympic Committee" and "the NOC" in the same sentence, for the same body.

**The advisory work.** Four names for one activity: "advisory work" ([profile.astro:128](src/pages/profile.astro:128), [partners.astro:169](src/pages/partners.astro:169)), "Advisor," ([profile.astro:146](src/pages/profile.astro:146)), "advise on" ([partners.astro:171](src/pages/partners.astro:171)), "consults on" ([press.astro:164](src/pages/press.astro:164)). Finnish mirrors it: "asiantuntijatyö", "Neuvonantaja", "Neuvon", "konsultoi".

**Sponsorship versus partnership, on every page.** The footer's first word is "Sponsorship," ([Footer.astro:18](src/components/Footer.astro:18)) and "Sponsorointi," ([Footer.astro:28](src/components/Footer.astro:28)), linking to a page called Partners / Kumppanit, on a site that otherwise says partner throughout, and whose central line is "not a shirt full of logos". This is the one rule 1 hit that is also an argument problem. Sponsorship is the word for the logo-on-a-shirt relationship the page explicitly declines.

**Meta descriptions.** `/fi` says "pyörätuolikelaaja", `/fi/profile` says "kelaaja".

### 1.5 Rule 6 and the Finnish filler layer, all in the Finnish blog post

| Where | Text | Rule |
|---|---|---|
| [missa-mennaan.md:31](src/content/blog/fi/missa-mennaan.md:31) | "Lopetin **kyseisen** tekstin" | Rule 6, Finnish: `kyseinen` → `sen` |
| [missa-mennaan.md:33](src/content/blog/fi/missa-mennaan.md:33) | "onnistunko **loppuen lopuksi**" | Scanner item 11 hollow connective, and it is a malformed "loppujen lopuksi" besides |
| [missa-mennaan.md:19, 29](src/content/blog/fi/missa-mennaan.md:19) | "**aidosti** kova kamppailu", "**aidosti** hyvää ratkaisua" | Scanner item 11, vacuous intensifier, twice in one short piece |
| [where-i-am.md:21](src/content/blog/en/where-i-am.md:21) | "**It should be said that** this figure does not include living" | English scanner, the "it's worth noting" shape |

### 1.6 Rule 4, one hedge per claim

[missa-mennaan.md:29](src/content/blog/fi/missa-mennaan.md:29): "MM-kisojen finaalissa **olisi mahdollisesti** yksi suomalainen kelaaja vähemmän." Conditional plus `mahdollisesti` is two hedges on the sentence that carries the paragraph's whole argument. The English twin makes the claim flat: "there would be one fewer Finnish racer in a world final." The English is right here and the Finnish is the master, which is the wrong way round.

---

## Priority 2: Finnish that does not parse cleanly

Above register. These are grammar, and a Finnish reader stops on all three.

**[fi/profile.astro:101](src/pages/fi/profile.astro:101).** "Tavoitteenani on luoda urheilijoiden edustuksesta todellinen ääni päätöksenteossa, eikä puhtaasti vain muodollisuutta." The case chain breaks at "eikä ... muodollisuutta", which has nothing to attach to, and "puhtaasti vain" is two fillers doing one job. The English twin is clean and says the thing: "making athlete representation a substantive voice in decision-making rather than a formality."

**[missa-mennaan.md:33](src/content/blog/fi/missa-mennaan.md:33), the last sentence of the piece.** "Tiedän kuitenkin, miltä tuntuisi lopettaa se kysymys yhä auki, mitä olisin voinut saavuttaa." A verb is missing (`jättäen`, or a `kun` clause), and the closing move of the English version is gone entirely: "and I would rather not find out." That final clause is what lands the piece. Mode 2's closing habit is the quiet turn, and the Finnish currently trails off into a broken clause instead. This is the single worst sentence on the site, and it is the last thing a Finnish reader reads.

**[missa-mennaan.md:15](src/content/blog/fi/missa-mennaan.md:15).** "lähempänä maagista 14,00 ajan alitusta" — partitive attribute over a genitive numeral, which does not agree. "lähempänä maagisen 14,00 alitusta" or "lähempänä 14,00 sekunnin alitusta".

---

## Priority 3: structure and argument

**Rule 7, one topic per paragraph.** The Advisory paragraph at [partners.astro:168-176](src/pages/partners.astro:168) carries four subjects: what the advisory work is, the Huawei product story, accessibility and governance, and the KY Secretary General history. Same at [fi/partners.astro:175-184](src/pages/fi/partners.astro:175). It wants to be two paragraphs, present work and track record. [where-i-am.md:21](src/content/blog/en/where-i-am.md:21) has the same shape: the grant, then the cost breakdown, then the funding sources.

**The governance offer has no evidence.** [partners.astro:119-125](src/pages/partners.astro:119). "Sport to business" carries the Frey testimonial. "Governance and athlete representation" carries nothing, and the copy is abstract where the rest of the page is concrete: "Broad experience of how administration organises itself" is a verbless fragment about an unnamed subject. Mode 5's own rule is that a partner is owed a specific claim. This is the offer only EP can sell, on the site's most commercial page, and it is the one block with no number, no date and no name in it.

**Two places where the Finnish drops a claim the English makes.**

| | English | Finnish |
|---|---|---|
| Home teaser ([index.astro:105](src/pages/index.astro:105) / [fi/index.astro:105](src/pages/fi/index.astro:105)) | "Racing at world level is a full-time job that costs more than it pays." | "Kilpailu maailman huipulla on ammattiurheilua ja maksaa sen mukaan." |
| Blog, third paragraph | "every race this summer takes place with nobody paying much attention except me, my coach, and the ranking list" | "jokainen tämän kesän kilpailu käydään ennen kaikkea kamppailuna itseäni vastaan. Onneksi sekä tilastot että valmentajani sparraavat." |

The first is a straight loss. The English states a fact a partner can act on. The Finnish states that professional sport costs money, which is close to a tautology and asks nothing of the reader. The second is a genuine decision rather than an error: the English is bleaker than its Finnish master, and mode 2 is Finnish-native, so the English rewrite went somewhere the original did not. Worth knowing it happened. Not worth "fixing" without deciding which version is true.

---

## What is already right, and should survive any edit

Naming these so a rewrite does not sand them off.

- **The partners page argues in figures, not adjectives.** €20,000 a season, 13 million views split 7.7 and 5.7, twenty years, "my own channels are small and I won't pretend otherwise". That is exactly what the floor's rule 5 note asks for: `14.08 over 100m` is a claim, `world-class performance` is an absence. Apart from the translated testimonial, there is not one marketing adjective on the site.
- **The pages that got the July voice pass are clean.** `press.astro`, `fi/press.astro` and both blog posts carry no `toimia` + essive, no marketing adjectives and no filler beyond the four items listed above. The pass worked. It just did not reach `fi/profile.astro` and `fi/index.astro`.
- **The published word counts on the press bios are accurate.** Labelled ~65 / ~155 / ~50 / ~110, measured at 65 / 156 / 48 / 112. And they were measured per language rather than ported, which is the rule.
- **The results table describes itself.** Every non-final row says which round and gives an overall placing. That holds rule 1 across fourteen rows in two languages.
- **The abessive at [missa-mennaan.md:27](src/content/blog/fi/missa-mennaan.md:27)**, "murehtimatta hiljaa mielessäni omaani", is the exact construction scanner item 2 holds up as the right answer instead of `ilman että`.

---

## Not worth doing

- The HUD renders a literal em dash as the placeholder for the countdown before JS fills it in ([Hud.astro:7](src/components/Hud.astro:7)). It is a data placeholder in an `aria-hidden` readout, not prose. Rule 8 is about punctuation. Leave it.
- Compact "100m" in the hero kicker and the stat tiles. Correct as a label.
- The Finnish Frey testimonial's spaced en dashes. Verbatim quotation, genuinely exempt.

---

## Scope options

| Option | What it covers | Rough size |
|---|---|---|
| **A. Floor only** | The three semicolons, the three `toimia` hits, the four Finnish filler words, the double hedge, the three broken Finnish sentences | Nine files, all surgical, no argument changes. Half a sitting. |
| **B. Floor plus rule 1** | A, plus one decision each on 100m / Finnish Athletics / advisory / sponsorship, applied everywhere | Adds a pass over all ten pages plus the footer. One sitting. Highest value per edit, because rule 1 is the finding a per-page review structurally cannot see. |
| **C. Everything** | B, plus the Frey translation call, the Advisory paragraph split, evidence for the governance offer, the two EN/FI claim divergences | Needs EP's decisions on four things before drafting starts. |

If only one thing gets done, do the rule 1 terminology pass. The individual Tier 0 hits are each one line and low stakes. Terminology rotation is the fault that makes a site read as assembled rather than written, it is on every page, and it is the only category here that will silently get worse with every future page.
