# Parv

**पर्व**: the festivals of India, one scroll at a time. Each festival is a single scroll-driven page, painted by hand in code and scored with real recordings.

```bash
npm install
npm run dev     # http://localhost:3000
npm run build
```

| Page | What it is |
|---|---|
| `/` | The Parv home page: every festival in the order it comes round, with the open ones linked (`src/components/parv/ParvHome.tsx`, content in `src/content/festivals.ts`) |
| `/durga-puja`, `/durga-puja/bihar`, `/durga-puja/gujarat` | **Trinayanī**, the Durga Puja journey (WebGL), described below |
| `/diwali` | **Deepāvalī**: one lamp at the door, the rangoli, Lakshmi's footprints, Ayodhya lit for Ram, fireworks, dawn |
| `/chhath` | Chhath: the river at dusk and at dawn |
| `/holi` | Holi: Holika's fire, then the colour |
| `/ganesh-chaturthi` | Ganeshotsav: from the murtikar's clay to the visarjan at Chowpatty |
| `/navratri` | Navratri: the garbo lamp, garba and dandiya, the nine forms, Ravana burning on Dussehra |
| `/lohri-baisakhi` | Lohri and Baisakhi: Punjab's year from the winter bonfire to the wheat harvest and the Khalsa |
| `/makar-sankranti` | Makar Sankranti: a dip at dawn, til-gul, khichdi, and Uttarayan's kites over Ahmedabad |
| `/pongal` | Pongal: Bhogi's fire, the kolam, the pot boiling over, and Mattu Pongal for the cattle |
| `/bihu` | Rongali Bihu: Goru Bihu at the river, the gamosa, husori, and the Bihu dance with dhol and pepa |
| `/onam` | Onam: Mahabali, the pookalam, the snake boats, pulikali and the sadya |
| `/janmashtami` | Janmashtami: midnight in Kamsa's prison, the Yamuna crossing, Vrindavan's jhula and Dahi Handi |

The old Durga Puja links (`/bihar`, `/gujarat`, `/mithila`) redirect to their pages under `/durga-puja` (`next.config.ts`).

## Festival journeys

Every festival after Durga Puja runs on one lighter engine in `src/journeys`, painted on a 2D canvas:

- `types.ts`: what a journey is. `JourneyContent` is plain data the server renders (words, caption timings, metadata). `Kit` is the browser-only code, loaded on its page only (`kits.ts`):
  - `scene`: draws a frame from the scroll progress, and takes pointer and touch
  - `score`: the music, scheduled ahead on the audio clock (`player.ts`)
  - `card`: paints the greeting card
- `src/components/journey/Journey.tsx`: the page. It reuses the Durga Puja layout and styles (captions, hints, header, farewell, sound toggle, and all the phone and landscape handling in `globals.css`).
- `paint.ts`: a 2D camera that eases between shots, cached glow sprites for additive light, and flames.
- `voices.ts`: synthesised instruments (tanpura, pad, bansuri, choir, bells, manjira, dhol and tasha strokes, claps, crackers, water and crowd). `rhythm.ts` steps through drum patterns.
- Each festival lives in its own folder, `src/journeys/{id}/`, with `content.ts`, `scene.ts`, `score.ts`, `card.ts` and `kit.ts`. Diwali is the fullest example.
- Each journey's own-language text is written in its script (`script` in `JourneyContent`: Devanagari, Gujarati, Gurmukhi, Bengali-Assamese, Tamil or Malayalam). The fonts are in `app/layout.tsx`, and the ones only a single page needs are not preloaded.

To add a festival:

1. Add its folder and register it in `types.ts` (`JourneyId`), `content.ts` and `kits.ts`.
2. Add a route (`src/app/{path}/page.tsx`, rendering `<JourneyPage id=... />`), add it to `FESTIVALS` in `src/content/festivals.ts` with `journey(...)`, and give it a small CSS scene in `ParvHome` (`Art`).
3. Add it to `JOURNEYS` in `scripts/share-images.mjs` and run `npm run share-images -- --only {id}`.

# Trinayanī: Durga Puja

A scroll-driven journey through Durga Puja, from the painting of her eyes on Mahalaya to Bisarjan.

## The journey

The scenes are the same in every region. The captions follow each region's own rituals (`STORIES` in `src/content/chapters.ts`):

| Scroll | What happens | Bengal | Bihar | Gujarat |
|---|---|---|---|---|
| 0.00 | The pratima emerges from the dark, her eyes still bare | ত্রিনয়নী | त्रिनयनी | ત્રિનયની |
| 0.11 | A brush paints the left eye, the right eye, then the third | Chokkhu Daan · Mahalaya | Kalash Sthapana · Pratipada | Ghatasthapana · the first night |
| 0.26 | The lamps are lit and the face warms | Bodhon · Shashthi | Bel Nimantran · Shashthi | Garba · the nine nights |
| 0.38 | Ten astras arrive in a ring: drag it, touch one to read its story | Dashabhuja · Saptami | Pat Khulna · Saptami | Amba · Mataji |
| 0.51 | 108 diyas are lit one by one | Sandhi · Ashtami → Navami | Sandhi · Ashtami → Navami | Aatham · the eighth night |
| 0.64 | Mahishasura's shadow changes shape; the third eye opens and burns it away | Mahishāsuramardinī · Navami | Kanya Pujan · Navami | Dandiya Raas · Navami |
| 0.70 | The camera goes into the third eye: rings in the shape of the eye, embers, ॐ दुं दुर्गायै नमः, then her fire fills the screen | · | · | · |
| 0.78 | Sindoor, then the river rises and the clay dissolves | Bisarjan · Dashami | Visarjan · Dashami | Dashera · Dashami |
| 0.90 | A single diya floats on the water | আসছে বছর আবার হবে | माँ, अगले बरस फिर आना | આવતા વર્ષે ફરી આવજો, મા |

Every timing lives in two places, kept in step:

- `src/lib/timeline.ts`: when each scene change happens (`PHASES`)
- `src/content/chapters.ts`: when each caption fades in and out (`CHAPTER_WINDOWS`)

## How it's built

- **Next.js + React Three Fiber.** The DOM (captions, dialog, verses) is server-rendered. The WebGL stage (`src/components/stage`) is client-only.
- **Scroll.** `src/lib/scroll.ts` measures progress through the 1300vh `#journey` section and smooths it. Both the captions and the stage read the same value every frame, outside React state.
- **The pratima** is a 2.5D relief: one painting, displaced by a depth map (`relief.ts`) and shaded in `Pratima.tsx`. The shader also paints the eyes (Chokkhu Daan), lights the third eye, smears the sindoor, dissolves the clay and darkens it below the waterline.
- **Astras** (`astraMeshes.tsx`) are procedural gold meshes; their stories are in `src/content/astras.ts`.
- **Diyas, smoke, water** are GPU point sprites and a shader plane.
- **Regional rituals** (`Rituals.tsx`) are drawn on a 2D canvas over the stage, one per region:
  - Bengal: a dhunuchi arati at Sandhi. The clay censer follows the pointer or finger, and swings by itself when left alone.
  - Bihar: Pat Khulna. A red curtain with a Madhubani border and a pair of fish is drawn across her at night and pulled back at dawn.
  - Gujarat: a garba circle turns round a lit garbo on the floor in front of the cloth (projected through the stage camera, so the dancers drop out of frame in the close-ups), speeds up over the nine nights, and takes up dandiya sticks on Navami.
- **Mahishasura's shadow** (`MahishaShadow.tsx`) rises beside her on Navami. It becomes a buffalo, a lion, a man with a sword and an elephant, as in the Devi Mahatmya, until fire from her third eye burns it into embers.
- **Bijoya card** (`BijoyaCard.tsx`, `src/lib/bijoya.ts`): after the journey, the reader types a name and gets a 1080 × 1350 PNG with her face in the region's style and the Dashami greeting (শুভ বিজয়া, शुभ विजयादशमी, શુભ દશેરા). It can be downloaded, or shared through the phone's share sheet.
- **Inside the third eye** (`ThirdEyePortal.tsx`) is a 2D canvas over the stage. The camera dives into the eye (`CameraRig.tsx`, `dive` in `timeline.ts`) and the canvas fades in over it.
- **Sound** plays through the Web Audio API. It stays off until the visitor presses the sound button, because browsers block audio before a click. After that it follows the scroll.
  - `src/lib/audio.ts` plays the ritual instruments. The dhak and shankh are real recordings, described below. The kansar and ghanta are synthesised. In Gujarat the dhak gives way to a synthesised garba dhol, claps and manjira.
  - `src/lib/score.ts` plays the background score in Raga Durga, with Sa on B♭3. The recorded shankh is raised a semitone to Ma, a fourth above Sa. It is built from a tanpura, a low sub, a wordless choir and bansuri phrases. The whole score swells at the big moments.

  | Scroll | Sound |
  |---|---|
  | Opening | tanpura and a soft drone; the bansuri enters |
  | 0.235 | the first swell, as the eyes are painted |
  | 0.27 | the shankh, then a slow dhak (Gujarat: the garba taal begins) |
  | 0.53 | the shankh, then the fast arati rhythm with the kansar |
  | 0.66 | the shankh and the full swell as the third eye opens |
  | 0.69 | a rush of fire as her third eye burns Mahishasura's shadow |
  | 0.72 | inside the third eye the puja is heard only faintly, until the flash |
| 0.80 | the shankh and a swell; the rhythm slows and fades, and everything goes muffled as the water rises |
  | 0.93 | a last swell and one ghanta for the floating diya |

  Opening an astra card rings the ghanta.

### Recordings

The dhak and shankh in `public/sound/` come from openly licensed recordings on Wikimedia Commons. The authors and licences are listed in `public/sound/CREDITS.md`, and the same credits are shown at the end of the page (`src/content/credits.ts`). The CC BY-SA licence asks for that credit to stay visible wherever the site runs.

- `dhak-calm.m4a` plays for Bodhon and again for Bisarjan, where it slows a little as the drummers tire.
- `dhak-arati.m4a` crossfades in for Sandhi and plays through the third eye.
- Each dhak file holds one seamless loop plus 2 s of padding. `SOUND` in `audio.ts` gives the loop start and length.
- The recordings load in the background. Until they arrive, or if they fail to load, the synthesised dhak and shankh play instead.

To rebuild the files, or to change the loop points:

```bash
pip install numpy          # ffmpeg must be on the PATH
python3 tools/make_sounds.py
```

Popular recordings (the Mahalaya broadcast, film or album versions of Aigiri Nandini, garba songs) are copyrighted. Use them only with a licence from their owners. To swap in a recording you do have rights to, replace the file and update `SOUND` and the credits.

## Painting traditions

The switcher at the top left shows the same Durga painted in three regional traditions. Each region has its own page, with its own title, captions and link preview. The switcher changes the URL without reloading:

| Region | Page | Tradition | Relief |
|---|---|---|---|
| Bengal | `/durga-puja` | Kumartuli pratima: varnished clay, a tiered shola mukut framed in silver daker saaj, potol-chera eyes, chandan kolka, kaan-pasha chains, Banarasi zari border | full depth |
| Bihar | `/durga-puja/bihar` | Madhubani: double black outlines, bharni colour and kachni hatching, no empty space, lotus prabhamandal, lotus-bud crown, fish earrings and hansuli | half depth, like a painted mud wall |
| Gujarat | `/durga-puja/gujarat` | Mata ni Pachedi: a portrait shrine cloth on a maroon ground in red, black and white, with toran, shrine arch and black side panels of devotees, peacocks, garbo and diyas | shallow, and it sways like hanging cloth |

All three are drawn in code in `src/components/stage/paintings/`. They share one layout (`layout.ts`: face outline, hairline, crown, eye positions and relief height), so Chokkhu Daan, the sindoor, the third eye and Bisarjan work the same on each. To add a tradition, add a drawing module that follows that layout, register it in `paintings/index.ts` and describe it in `src/lib/styles.ts`, then add its captions to `STORIES` in `src/content/chapters.ts`.

## Using real art

Until you add real art, the stage draws the procedural paintings. A real painting replaces the Bengal style. To use one:

```bash
python3 -m venv .venv && source .venv/bin/activate
pip install -r tools/requirements.txt
python3 tools/make_relief.py path/to/durga.jpg
```

This writes `public/pratima/albedo.png` (figure cut out on alpha) and `public/pratima/height.png` (depth, white = near) using rembg and Depth Anything V2. Then, in `src/lib/pratima.ts`:

1. set `albedoUrl: "/pratima/albedo.png"` and `heightUrl: "/pratima/height.png"`
2. re-measure the `eyes` and `sindoor` ellipses in the 1024×1024 output's pixel coordinates
3. tune `depth` until the nose-to-ear depth looks right

A front-facing, evenly lit painting in the Bangla-mukh style with the eyes clearly separated gives the best relief. Use art you own or have licensed.

## Sharing and SEO

Set the public URL before deploying, so link previews get absolute image URLs (on Vercel the production domain is picked up automatically):

```bash
NEXT_PUBLIC_SITE_URL=https://parv.example
```

- Metadata, Open Graph, Twitter card, canonical, robots and theme colour: `src/app/layout.tsx`, with the copy, `homeMetadata()` for Parv and the per-region `pageMetadata()` in `src/lib/site.ts`
- `robots.txt`, `sitemap.xml`, `manifest.webmanifest` and JSON-LD: `src/app/robots.ts`, `sitemap.ts`, `manifest.ts`, `page.tsx`
- Each region page has its own images in `public/share/`, where `{style}` is `bengal`, `madhubani` or `pachedi`:
  - link preview for WhatsApp, Instagram DMs, X and iMessage: `og-{style}.jpg`, 1200×630
  - for posting: `instagram-story-{style}.jpg` (1080×1920) and `instagram-post-{style}.jpg` (1080×1350)
- The Parv home page has its link preview in `public/share/og-parv.jpg` and its three Durga Puja doors in `public/parv/door-{style}.jpg`
- Each festival journey has the same three images, named by its id: `og-diwali.jpg`, `instagram-story-diwali.jpg`, `instagram-post-diwali.jpg`

All of these are rendered from the live scene, with the text taken from each page. Regenerate them whenever the art changes:

```bash
npm run dev                  # in one terminal
npm run share-images         # in another; add -- --domain parv.example to print the domain on them
npm run share-images -- --only parv   # just the Parv home page's images
npm run share-images -- --only diwali # just one festival (bengal, madhubani, pachedi, durga-puja, diwali, chhath, holi, ganesh, navratri, lohri, sankranti, pongal, bihu, onam, janmashtami)
```

WhatsApp and Instagram cache previews per URL. After changing the image, test by sharing a fresh URL (for example `?v=2`); the [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/) shows what Meta's crawler sees and can force a re-scrape.
