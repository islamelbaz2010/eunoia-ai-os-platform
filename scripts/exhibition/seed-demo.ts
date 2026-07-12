#!/usr/bin/env tsx
/**
 * scripts/exhibition/seed-demo.ts
 * Eunoia AI OS — Exhibition demo account seeder
 *
 * Creates (idempotently):
 *   - Demo user + organization
 *   - 5 Knowledge Base documents with real OpenAI embeddings
 *   - 6 CRM contacts at different pipeline stages
 *   - Timeline events and activities
 *   - Audit log entries
 *   - Usage events (to populate dashboard chart)
 *
 * Usage:
 *   npx tsx scripts/exhibition/seed-demo.ts
 *   npx tsx scripts/exhibition/seed-demo.ts --dry-run
 *   npx tsx scripts/exhibition/seed-demo.ts --reset  (deletes and re-seeds)
 *
 * Requirements:
 *   .env.local with SUPABASE_SERVICE_ROLE_KEY + NEXT_PUBLIC_SUPABASE_URL + OPENAI_API_KEY
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

const ROOT = resolve(import.meta.dirname, "../..");
const ENV_FILE = resolve(ROOT, ".env.local");

// ── Load env ─────────────────────────────────────────────────────────────────
function loadEnv() {
  if (!existsSync(ENV_FILE)) return;
  const lines = readFileSync(ENV_FILE, "utf-8").split("\n");
  for (const raw of lines) {
    const line = raw.split("#")[0].trim();
    if (!line.includes("=")) continue;
    const eq = line.indexOf("=");
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    val = val.replace(/^["']|["']$/g, "");
    if (key && !process.env[key]) process.env[key] = val;
  }
}
loadEnv();

// ── Config ────────────────────────────────────────────────────────────────────
const DRY_RUN = process.argv.includes("--dry-run");
const RESET   = process.argv.includes("--reset");

const SB_URL     = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SB_SROLE   = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const OAI_KEY    = process.env.OPENAI_API_KEY!;

const DEMO_EMAIL    = "demo@eunoiaos.com";
const DEMO_PASSWORD = "EunoiaDemo2026!";
const DEMO_NAME     = "Demo Manager";
const DEMO_ORG      = "Grand Nile Tower Hotel";
const DEMO_SLUG     = "grand-nile-tower-hotel";

// ── Colours ───────────────────────────────────────────────────────────────────
const C = {
  R: "\x1b[31m", G: "\x1b[32m", Y: "\x1b[33m", C: "\x1b[36m",
  B: "\x1b[1m",  N: "\x1b[0m",  D: "\x1b[90m",
};
const ok   = (msg: string) => console.log(`  ${C.G}✓${C.N} ${msg}`);
const err  = (msg: string) => console.log(`  ${C.R}✗${C.N} ${msg}`);
const warn = (msg: string) => console.log(`  ${C.Y}⚠${C.N} ${msg}`);
const inf  = (msg: string) => console.log(`  ${C.D}→${C.N} ${msg}`);
const hdr  = (msg: string) => console.log(`\n${C.B}${C.C}── ${msg} ──${C.N}`);

// ── Demo data ─────────────────────────────────────────────────────────────────
const KB_DOCUMENTS = [
  {
    title: "VIP Guest Protocol",
    language: "en",
    content: `VIP Guest Protocol — Grand Nile Tower Hotel

Definition of VIP Guests:
VIP guests include returning guests with 5+ stays, corporate account holders, guests in Suite categories, travel agency VIP referrals, and guests spending above EGP 10,000 per stay.

Pre-Arrival Preparation:
- General Manager personally reviews VIP arrival list at 8:00 AM daily
- Room must be inspected by Housekeeping Manager, not standard staff
- Welcome amenity: seasonal fruit basket, handwritten note from GM, complimentary bottle of water
- Upgrade to higher category room subject to availability — always attempt for VIP guests

Check-In Procedure:
- Front desk manager or senior agent must handle VIP check-in
- Express check-in: pre-key cards ready, skip the queue
- Escort VIP guest personally from lobby to room
- Introduce room features, in-room dining menu, and dedicated concierge line

VIP Amenities:
- Complimentary breakfast for all VIP guests regardless of rate
- Late checkout guaranteed until 3:00 PM at no charge
- Daily turndown service with premium amenity (chocolate, local sweets, or personalized note)
- Priority booking for all hotel facilities (spa, restaurant, pool)
- Dedicated concierge phone line: ext. 1001 (staffed 24/7)

Early Check-In:
- Available from 12:00 PM noon if room is ready
- Suite guests: early check-in guaranteed from 10:00 AM with advance notice
- If room not available, offer luggage storage + access to Executive Lounge

Late Check-Out (after guaranteed 3:00 PM):
- Until 6:00 PM: available at 50% of one night's room rate
- Until 8:00 PM: available at full one night's room rate
- After 8:00 PM: full night's charge applies

Problem Resolution:
- Any VIP complaint escalated immediately to Duty Manager
- GM notified within 30 minutes of any VIP issue
- Compensation authority: Front Desk Manager up to 1 night comp, GM above that
- Follow-up call from GM within 24 hours of any resolved complaint`,
  },
  {
    title: "The Terrace — Rooftop Restaurant Menu",
    language: "en",
    content: `The Terrace — Rooftop Restaurant
Grand Nile Tower Hotel, Corniche El Nil, Cairo

ALLERGEN KEY: (V) Vegan  (VG) Vegetarian  (GF) Gluten-Free  (N) Contains Nuts  (D) Contains Dairy  (SF) Seafood  (H) Halal-Certified

All meats served at The Terrace are Halal-certified.

═══════ COLD STARTERS ═══════

Mezze Platter (VG, GF, N-option)
Traditional hummus, mutabal, tabbouleh, stuffed vine leaves, olives, and warm pita
EGP 185 / serves 2–3

Burrata & Heritage Tomato (VG, GF, D)
Imported burrata, heirloom tomatoes, basil oil, aged balsamic, fleur de sel
EGP 220

Smoked Salmon (GF, SF)
Gravlax cured salmon, cucumber ribbons, capers, dill crème fraîche, blinis
EGP 265

═══════ HOT STARTERS ═══════

Grilled Halloumi (VG, GF, D)
Cypriot halloumi, watermelon, fresh mint, pomegranate molasses
EGP 165

Crispy Calamari (SF)
Lightly fried squid, lemon aioli, harissa dipping sauce
EGP 195

═══════ MAINS ═══════

Grilled Sea Bass (GF, SF)
Mediterranean sea bass fillet, saffron cauliflower purée, caperberry butter sauce
ALLERGENS: Fish, Dairy. Does not contain gluten, nuts, or pork.
EGP 420

Prime Beef Tenderloin (GF, H)
200g grain-fed tenderloin, truffle pomme purée, red wine jus, seasonal vegetables
ALLERGENS: Dairy. Does not contain gluten, seafood, or nuts. Halal-certified beef.
EGP 580

Lamb Rack (GF, H)
Egyptian farm lamb, za'atar crust, roasted beetroot, pomegranate jus
ALLERGENS: None of the 14 major allergens. Halal-certified.
EGP 520

Pappardelle Funghi (VG, D, N)
Wild mushroom ragout, truffle oil, Parmigiano-Reggiano, toasted pine nuts
ALLERGENS: Gluten (pasta), Dairy (Parmesan), Tree Nuts (pine nuts).
EGP 290

Vegan Mezze Bowl (V, GF)
Quinoa, roasted vegetables, muhammara, herb tahini, pickled turnips, flatbread
EGP 245

═══════ DESSERTS ═══════

Umm Ali (VG, D, N)
Traditional Egyptian bread pudding, warm cream, pistachios, rose water
ALLERGENS: Gluten, Dairy, Tree Nuts. Served hot.
EGP 120

Chocolate Fondant (VG, D, N-option)
Dark chocolate lava cake, vanilla bean gelato, caramel sauce
ALLERGENS: Gluten, Dairy, Eggs.
EGP 145

Seasonal Fruit Platter (V, GF)
Selection of local and imported seasonal fruits
EGP 95

═══════ BEVERAGES ═══════

Freshly Squeezed Juices: Orange, Mango, Guava, Sugarcane — EGP 65
Soft Drinks — EGP 45
Mineral Water (500ml / 1L) — EGP 35 / 55
Arabic Coffee with Dates — EGP 75
Specialty Teas — EGP 65

Wine and alcohol available upon request. All wines are imported.

Service hours:
Breakfast: 7:00 AM — 10:30 AM (until 11:00 AM weekends)
Lunch: 12:30 PM — 3:30 PM
Dinner: 7:00 PM — 11:00 PM (until midnight weekends)
Reservations: ext. 1200 or dining@grandniletower.com`,
  },
  {
    title: "Check-In and Check-Out Procedures",
    language: "en",
    content: `Check-In and Check-Out Procedures
Grand Nile Tower Hotel — Front Office Department

STANDARD CHECK-IN

Official Check-In Time: 3:00 PM
Early Check-In: Available from 12:00 PM noon subject to room availability (standard rooms). VIP guests: guaranteed from 10:00 AM.

Step-by-Step Check-In Procedure:
1. Greet guest warmly within 30 seconds of approach: "Welcome to Grand Nile Tower, I'm [Name]. How may I assist you?"
2. Request identification: National ID (Egyptian guests) or Passport (international guests)
3. Verify reservation in PMS against ID. Confirm: name, room type, rate, number of nights, payment method.
4. Collect payment: Credit card pre-authorization OR cash deposit (EGP 1,000 + first night's rate for cash guests)
5. Assign room considering: guest preferences, floor requests, special occasions, proximity requests
6. Issue key cards (2 standard, 3 for families)
7. Explain facilities: breakfast time/location, gym hours, restaurant booking, concierge line (ext. 0)
8. Wish a pleasant stay and offer bell service assistance

Documents Required:
- Egyptian Nationals: National ID or Passport
- GCC Nationals: GCC ID or Passport
- International Guests: Passport (must be valid, not expired)
- Minors: Accompanied by legal guardian with valid ID
- Groups: Group leader ID + rooming list

Police Registration:
All international guests must be registered with Cairo Tourism Police within 24 hours of check-in. The front desk automatically submits registration. Guest does not need to do anything.

STANDARD CHECK-OUT

Official Check-Out Time: 12:00 PM noon
Late Check-Out: Available until 3:00 PM at 50% of one night's rate (subject to occupancy). After 3:00 PM: full night charged.

Step-by-Step Check-Out Procedure:
1. Pull up folio in PMS and review all charges
2. Present itemized bill to guest (print or electronic)
3. Ask about stay experience: "Did you enjoy your stay? Was everything to your satisfaction?"
4. Process payment and obtain signature on checkout receipt
5. Retrieve key cards
6. Offer storage for luggage if guest has later departure
7. Arrange transportation if requested
8. Complete check-out in PMS and update room status to Dirty/Vacant for Housekeeping

Disputed Charges:
- Guest disputes charge → Do NOT remove without authorization
- Escalate to Duty Manager for amounts over EGP 200
- Duty Manager may approve credits up to EGP 500; General Manager above that
- Document all disputes in the incident log

Early Departure:
- Guest checking out before original departure date must notify Front Desk
- No early departure fee for stays over 5 nights
- Short stays under 2 nights: early departure fee = one night's rate
- Advance purchase rates: non-refundable regardless of departure date

GROUP CHECK-IN:
- Groups of 10+ must arrange pre-arrival with Groups Coordinator
- Pre-blocking of rooms required 48 hours in advance
- Group folio prepared separately from individual charges
- Key packets prepared before group arrival`,
  },
  {
    title: "Emergency Response Procedures",
    language: "en",
    content: `Emergency Response Procedures
Grand Nile Tower Hotel — Security and Safety Manual

GENERAL EMERGENCY PRINCIPLES
All staff must:
1. Remain calm and speak in a calm, clear voice
2. Follow chain of command — never take unilateral action on emergencies
3. Do NOT give information to media — all statements through GM or PR Manager
4. Document all incidents in the Incident Report Log (Front Desk, Security Desk)

EMERGENCY CONTACT DIRECTORY:
- Hotel Security:          ext. 999 (24/7)
- Duty Manager:           ext. 100 (24/7)
- General Manager:        ext. 101 (24/7)
- Hotel Doctor (on-call): ext. 102
- Cairo Ambulance:        123
- Cairo Police:           122
- Cairo Fire Department:  180

─────────────────────────────────────────────────────────────
MEDICAL EMERGENCY
─────────────────────────────────────────────────────────────

Step 1: Call Security (ext. 999) immediately. State: location, nature of emergency, guest name if known.
Step 2: Security dispatches on-call hotel doctor within 5 minutes.
Step 3: If life-threatening: call 123 (Cairo Ambulance) simultaneously.
Step 4: Do NOT move injured guest unless in immediate physical danger.
Step 5: Clear the area — ask bystanders to step back.
Step 6: Assign a staff member to wait at the hotel entrance to guide ambulance.
Step 7: Notify Duty Manager within 5 minutes.
Step 8: Complete Incident Report Log before end of shift.

Nearest Hospital: As-Salam International Hospital, Corniche El Nil (8 min by car)
Emergency contacts for hospital: 02-2524-0250

─────────────────────────────────────────────────────────────
FIRE EMERGENCY
─────────────────────────────────────────────────────────────

Upon discovering fire:
1. Activate nearest fire alarm pull station
2. Call Security (ext. 999) — report exact location
3. Evacuate area immediately using NEAREST STAIRWELL (do NOT use elevators)
4. Close (do not lock) all doors as you evacuate
5. Report to assembly point: Hotel Parking, South Side

Floor Evacuation:
- Floor Supervisor leads evacuation of all guests on their floor
- Check every room on your floor — knock and call "FIRE — EVACUATE"
- Assist guests with mobility limitations first (contact Security for wheelchair-accessible routes)
- Do not re-enter the building until All-Clear is given by Fire Department

Assembly Point: Hotel Parking, South Side (Corniche El Nil side)
Fire wardens report to: Fire Marshal (Head of Security or designee)

─────────────────────────────────────────────────────────────
SECURITY INCIDENT / THEFT
─────────────────────────────────────────────────────────────

Guest reports theft:
1. Acknowledge and empathize: "I'm very sorry to hear this. We'll do everything we can."
2. Do NOT admit liability or hotel responsibility before investigation
3. Call Security (ext. 999) immediately
4. Security contacts Cairo Police (122) if guest requests or theft is above EGP 2,000
5. CCTV footage requested by Security within 30 minutes of incident
6. Complete Incident Report within 2 hours
7. GM notified of all guest theft incidents

─────────────────────────────────────────────────────────────
POWER FAILURE
─────────────────────────────────────────────────────────────
- Emergency lighting activates automatically within 15 seconds
- Generator covers: Emergency lighting, elevators (1 elevator operational), front desk systems, kitchen refrigeration
- Contact Engineering (ext. 300) immediately
- Expected maximum duration: 30 minutes (generator fuel for 72 hours)
- Front Desk: switch to paper-based check-in procedure (forms in locked drawer)`,
  },
  {
    title: "Staff Grooming and Presentation Standards",
    language: "en",
    content: `Staff Grooming and Presentation Standards
Grand Nile Tower Hotel — Human Resources Department

These standards apply to all guest-facing staff. Uniform and grooming must be maintained throughout each shift.

UNIFORM STANDARDS

Front Office (Reception, Concierge, Bell):
- Men: Navy blazer with hotel crest, white dress shirt, hotel tie, dark grey trousers, black leather shoes (polished)
- Women: Navy blazer with hotel crest, white blouse, dark grey skirt or trousers, black closed-toe court shoes

Food & Beverage:
- Kitchen: White chef's uniform, hotel-branded apron, chef's hat or hairnet, non-slip shoes
- Servers: Black trousers/skirt, white long-sleeve shirt, black hotel-branded apron, black leather shoes
- Baristas: Black trousers/skirt, black polo with hotel crest, black apron

Housekeeping:
- Teal blue tunic top with hotel crest, grey trousers, black non-slip shoes, white gloves for service

Security:
- Navy uniform with hotel name and security badge, black shoes, radio earpiece

Name Badges:
- All staff must wear name badge on left chest
- Badge includes: first name (large), department (small), flag of native language
- Replacement badges: request from HR within 24 hours of loss

PERSONAL GROOMING

Hair:
- Men: Clean, combed, maximum length touching collar. No extreme styles or colors.
- Women: Hair must be clean and tidy. Long hair above shoulder length must be tied back or pinned up while on duty.
- Color: Natural colors only (black, brown, blonde, dark red). No blue, green, or other non-natural colors.

Facial Hair (Men):
- Well-trimmed beard acceptable maximum 1cm length
- If growing beard: must be tidy at all times
- Stubble (unshaven look) not permitted

Makeup (Women):
- Natural and professional: foundation/powder, subtle eye makeup, neutral or red lipstick
- Avoid heavy eye shadow, glitter, or dramatic makeup
- Nail polish: Neutral colors (nude, light pink, red). No chipped nail polish.

Nails (All Staff):
- Clean and trimmed. Food handlers: unpolished, maximum 3mm beyond fingertip.
- Artificial nails not permitted for food handlers.

Jewelry:
- Men: Wedding band only. No necklaces, earrings, or bracelets visible.
- Women: One set of small stud earrings. Wedding/engagement ring. One bracelet maximum.
- No visible body piercings other than ears.
- Religious jewelry may be worn if discreet (inside uniform).

Fragrance:
- Light, professional fragrance only. No strong or overpowering scents.
- No fragrance for kitchen and food-handling staff.

Footwear:
- Must be clean, polished (leather shoes), and in good repair
- Heels for women: maximum 6cm, no stilettos, must be comfortable for full shift
- Non-slip footwear mandatory in kitchen and outdoor areas

HYGIENE STANDARDS

Hand Hygiene:
- Wash hands minimum every 30 minutes during food service
- Always after: using bathroom, handling waste, sneezing/coughing, handling cash, touching face
- Antibacterial hand sanitizer at all stations — use between handwashing

Illness Policy:
- Staff with fever, vomiting, diarrhea, or contagious illness MUST NOT report to duty
- Inform supervisor immediately; sick leave records are confidential
- Return to work only with signed clearance from company doctor for illness exceeding 3 days

CONSEQUENCES OF NON-COMPLIANCE
First offense: Verbal warning, sent home to change/remedy before returning to shift
Second offense: Written warning, noted in personnel file
Third offense: Formal disciplinary action per Egyptian Labor Law

Grooming inspections are conducted daily at the start of each shift by the department supervisor.`,
  },
];

const CRM_CONTACTS = [
  {
    full_name: "Omar Khalil",
    email: "omar.khalil@grandcairotravel.com",
    phone: "+20 100 234 5678",
    company: "Grand Cairo Travel Agency",
    pipeline_stage: "lead",
    status: "new",
    source: "exhibition",
    notes: "Interested in AI assistant for consultant knowledge base. Mentioned 15 consultants who answer client questions daily.",
  },
  {
    full_name: "Sarah Mitchell",
    email: "s.mitchell@rotanacorporate.com",
    phone: "+971 50 123 4567",
    company: "Rotana Hotels Corporate",
    pipeline_stage: "qualified",
    status: "qualified",
    source: "referral",
    notes: "Corporate account manager at Rotana. Evaluating for 3 properties in Cairo. Key requirement: Arabic UI support for operations staff.",
  },
  {
    full_name: "Ahmed Hassan",
    email: "ahmed.hassan@premierrealty.eg",
    phone: "+20 122 456 7890",
    company: "Premier Realty Egypt",
    pipeline_stage: "proposal",
    status: "qualified",
    source: "demo_request",
    notes: "Real estate agency with 45 agents. Primary use case: unit specification knowledge base and client CRM. Requested proposal for Pro plan.",
  },
  {
    full_name: "Nada Fahmy",
    email: "nada.fahmy@shifaclinic.com",
    phone: "+20 111 789 0123",
    company: "Shifa Medical Center",
    pipeline_stage: "negotiation",
    status: "contacted",
    source: "website",
    notes: "Operations manager at multi-branch clinic. Wants insurance procedure knowledge base. Concern: HIPAA-equivalent data handling (clarified: no patient data enters system).",
  },
  {
    full_name: "Marco Villas",
    email: "marco.villas@mariottoegypt.com",
    phone: "+20 109 876 5432",
    company: "Mariotto Hotels Egypt",
    pipeline_stage: "won",
    status: "won",
    source: "exhibition",
    notes: "GM of Mariotto Zamalek. Signed Starter plan. 4 team members. First documents to upload: F&B menus + VIP protocol.",
  },
  {
    full_name: "Layla Aboud",
    email: "layla.aboud@nilerestaurants.com",
    phone: "+20 100 111 2222",
    company: "Nile Restaurant Group",
    pipeline_stage: "lead",
    status: "new",
    source: "exhibition",
    notes: "F&B Director managing 8 restaurants. Pain point: inconsistent allergen information given by servers across locations. Interested in Starter plan.",
  },
];

// ── OpenAI embedding ──────────────────────────────────────────────────────────
async function embedText(text: string): Promise<number[]> {
  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OAI_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "text-embedding-3-small",
      input: text.slice(0, 8191),
    }),
  });
  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenAI embedding failed (${response.status}): ${err}`);
  }
  const data = await response.json() as { data: Array<{ embedding: number[] }> };
  return data.data[0].embedding;
}

// ── Chunk text for RAG ────────────────────────────────────────────────────────
function chunkText(text: string, chunkSize = 600, overlap = 100): string[] {
  const words = text.split(/\s+/);
  const chunks: string[] = [];
  let start = 0;
  while (start < words.length) {
    const end = Math.min(start + chunkSize, words.length);
    chunks.push(words.slice(start, end).join(" "));
    if (end === words.length) break;
    start += chunkSize - overlap;
  }
  return chunks;
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\n${C.B}${C.C}╔══════════════════════════════════════════════════╗${C.N}`);
  console.log(`${C.B}${C.C}║  Eunoia AI OS — Exhibition Demo Seeder           ║${C.N}`);
  console.log(`${C.B}${C.C}╚══════════════════════════════════════════════════╝${C.N}`);
  if (DRY_RUN) console.log(`\n${C.Y}⚠  DRY RUN — no data will be written${C.N}\n`);

  // Validate requirements
  if (!SB_URL)    { console.error(`${C.R}✗ NEXT_PUBLIC_SUPABASE_URL not set${C.N}`); process.exit(1); }
  if (!SB_SROLE)  { console.error(`${C.R}✗ SUPABASE_SERVICE_ROLE_KEY not set — required for admin operations${C.N}`); process.exit(1); }
  if (!OAI_KEY)   { console.error(`${C.R}✗ OPENAI_API_KEY not set — required for embeddings${C.N}`); process.exit(1); }

  const supabase: SupabaseClient = createClient(SB_URL, SB_SROLE, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // ── Step 1: Create or find demo user ─────────────────────────────────────
  hdr("Step 1: Demo User");

  let userId: string;

  const { data: { users } } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  const existing = users?.find(u => u.email === DEMO_EMAIL);

  if (existing) {
    userId = existing.id;
    ok(`Demo user exists: ${DEMO_EMAIL} (${userId})`);
  } else if (DRY_RUN) {
    inf("DRY RUN: would create user demo@eunoiaos.com");
    userId = "00000000-0000-0000-0000-000000000000";
  } else {
    const { data, error } = await supabase.auth.admin.createUser({
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: DEMO_NAME },
    });
    if (error) { err(`Failed to create user: ${error.message}`); process.exit(1); }
    userId = data.user.id;
    ok(`Created demo user: ${DEMO_EMAIL} (${userId})`);

    // Create profile
    await supabase.from("profiles").upsert({
      id: userId,
      full_name: DEMO_NAME,
    });
    ok("Profile created");
  }

  // ── Step 2: Create or find demo organization ──────────────────────────────
  hdr("Step 2: Demo Organization");

  let orgId: string;

  const { data: existingOrg } = await supabase
    .from("organizations")
    .select("id")
    .eq("slug", DEMO_SLUG)
    .maybeSingle();

  if (existingOrg?.id) {
    orgId = existingOrg.id;
    ok(`Organization exists: ${DEMO_ORG} (${orgId})`);
  } else if (DRY_RUN) {
    inf("DRY RUN: would create organization");
    orgId = "00000000-0000-0000-0000-000000000001";
  } else {
    const { data, error } = await supabase
      .from("organizations")
      .insert({ name: DEMO_ORG, slug: DEMO_SLUG })
      .select("id")
      .single();
    if (error) { err(`Failed to create org: ${error.message}`); process.exit(1); }
    orgId = data.id;
    ok(`Created organization: ${DEMO_ORG} (${orgId})`);
  }

  // ── Step 3: Create membership ─────────────────────────────────────────────
  hdr("Step 3: Organization Membership");

  if (!DRY_RUN) {
    const { error } = await supabase
      .from("organization_members")
      .upsert({ organization_id: orgId, user_id: userId, role: "owner" }, {
        onConflict: "organization_id,user_id",
      });
    if (error) {
      warn(`Membership upsert: ${error.message}`);
    } else {
      ok(`User is owner of ${DEMO_ORG}`);
    }
  } else {
    inf("DRY RUN: would create membership");
  }

  // ── Step 4: Seed Knowledge Base ───────────────────────────────────────────
  hdr("Step 4: Knowledge Base Documents + Embeddings");

  for (const doc of KB_DOCUMENTS) {
    // Check if document already exists
    const { data: existingDoc } = await supabase
      .from("knowledge_base_documents")
      .select("id")
      .eq("organization_id", orgId)
      .eq("title", doc.title)
      .maybeSingle();

    if (existingDoc?.id && !RESET) {
      ok(`KB document already exists: "${doc.title}" (skipping)`);
      continue;
    }

    if (RESET && existingDoc?.id) {
      // Delete existing document + chunks
      await supabase.from("knowledge_base_documents").delete().eq("id", existingDoc.id);
      inf(`Deleted existing document: "${doc.title}"`);
    }

    if (DRY_RUN) {
      inf(`DRY RUN: would create "${doc.title}" + ${chunkText(doc.content).length} chunks`);
      continue;
    }

    // Insert document (status: "draft" while embedding, updated to "published" after)
    const { data: newDoc, error: docErr } = await supabase
      .from("knowledge_base_documents")
      .insert({
        organization_id: orgId,
        title: doc.title,
        content: doc.content,
        language: doc.language,
        status: "draft",
        created_by: userId,
      })
      .select("id")
      .single();

    if (docErr) { err(`Failed to create doc "${doc.title}": ${docErr.message}`); continue; }

    const docId = newDoc.id;
    inf(`Embedding "${doc.title}"...`);

    // Chunk and embed
    const chunks = chunkText(doc.content, 500, 100);
    let chunkSuccess = 0;

    for (const chunk of chunks) {
      try {
        const embedding = await embedText(chunk);
        const { error: chunkErr } = await supabase
          .from("knowledge_base_chunks")
          .insert({
            document_id: docId,
            organization_id: orgId,
            content: chunk,
            embedding: `[${embedding.join(",")}]`,
          });
        if (!chunkErr) chunkSuccess++;
        // Small delay to avoid rate limits
        await new Promise(r => setTimeout(r, 50));
      } catch (e) {
        warn(`Chunk embedding failed: ${(e as Error).message}`);
      }
    }

    // Update status
    await supabase
      .from("knowledge_base_documents")
      .update({ status: "published" })
      .eq("id", docId);

    ok(`"${doc.title}" — ${chunkSuccess}/${chunks.length} chunks embedded`);
  }

  // ── Step 5: Seed CRM Contacts ─────────────────────────────────────────────
  hdr("Step 5: CRM Contacts");

  for (const contact of CRM_CONTACTS) {
    const { data: existingContact } = await supabase
      .from("crm_contacts")
      .select("id")
      .eq("organization_id", orgId)
      .eq("email", contact.email)
      .maybeSingle();

    if (existingContact?.id && !RESET) {
      ok(`Contact already exists: ${contact.full_name} (skipping)`);
      continue;
    }

    if (RESET && existingContact?.id) {
      await supabase.from("crm_contacts").delete().eq("id", existingContact.id);
    }

    if (DRY_RUN) {
      inf(`DRY RUN: would create contact ${contact.full_name}`);
      continue;
    }

    const { data: newContact, error: contactErr } = await supabase
      .from("crm_contacts")
      .insert({
        organization_id: orgId,
        full_name: contact.full_name,
        email: contact.email,
        phone: contact.phone,
        company: contact.company,
        status: contact.status,
        pipeline_stage: contact.pipeline_stage,
        notes: contact.notes,
        created_by: userId,
      })
      .select("id")
      .single();

    if (contactErr) { err(`Failed to create contact ${contact.full_name}: ${contactErr.message}`); continue; }

    ok(`Contact: ${contact.full_name} (${contact.pipeline_stage})`);

    // Add timeline event (ignore if table doesn't exist yet)
    try {
      await supabase.from("crm_timeline_events").insert({
        contact_id: newContact.id,
        organization_id: orgId,
        created_by: userId,
        event_type: "note",
        title: "Initial note",
        body: contact.notes,
      });
    } catch { /* table may not exist */ }
  }

  // ── Step 6: Seed Usage Events ─────────────────────────────────────────────
  hdr("Step 6: Usage Events (Dashboard Chart Data)");

  if (!DRY_RUN) {
    // Idempotency: skip if demo seed events already exist for this org
    const { count: existingUsage } = await supabase
      .from("usage_events")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", orgId)
      .eq("event_type", "ai_query")
      .containedBy("metadata", { question: "demo_seed" });

    if (existingUsage && existingUsage > 0) {
      ok(`Usage events already seeded (${existingUsage} events) — skipping`);
    } else {
      const events = [];
      const now = new Date();
      for (let d = 13; d >= 0; d--) {
        const date = new Date(now);
        date.setDate(date.getDate() - d);
        const count = Math.floor(Math.random() * 8) + 2; // 2–10 events per day
        for (let i = 0; i < count; i++) {
          const eventTime = new Date(date);
          eventTime.setMinutes(Math.floor(Math.random() * 60 * 8));
          events.push({
            organization_id: orgId,
            actor_id: userId,
            event_type: "ai_query",
            metadata: { question: "demo_seed" },
            created_at: eventTime.toISOString(),
          });
        }
      }

      const { error: usageErr } = await supabase
        .from("usage_events")
        .insert(events);

      if (usageErr) {
        warn(`Usage events: ${usageErr.message}`);
      } else {
        ok(`Inserted ${events.length} usage events across 14 days`);
      }
    }
  } else {
    inf("DRY RUN: would insert usage events");
  }

  // ── Step 7: Seed Audit Events ─────────────────────────────────────────────
  hdr("Step 7: Audit Log Entries");

  if (!DRY_RUN) {
    // Idempotency: skip if audit entries already exist for this org
    const { count: existingAudit } = await supabase
      .from("audit_logs")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", orgId)
      .eq("actor_id", userId);

    if (existingAudit && existingAudit > 0) {
      ok(`Audit entries already seeded (${existingAudit} entries) — skipping`);
    } else {
      const auditEvents = [
        { action: "kb_document_created", metadata: { description: "Added VIP Guest Protocol" } },
        { action: "kb_document_created", metadata: { description: "Added F&B Menu document" } },
        { action: "crm_contact_created", metadata: { description: "Added contact: Marco Villas" } },
        { action: "crm_contact_updated", metadata: { description: "Updated stage: Omar Khalil → Qualified" } },
        { action: "member_invited",      metadata: { description: "Invited team member (demo)" } },
      ];

      for (const event of auditEvents) {
        const { error } = await supabase.from("audit_logs").insert({
          organization_id: orgId,
          actor_id: userId,
          ...event,
        });
        if (error) warn(`Audit event failed: ${error.message}`);
      }
      ok(`Inserted ${auditEvents.length} audit events`);
    }
  } else {
    inf("DRY RUN: would insert audit events");
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log(`\n${C.B}${C.C}══════════════════════════════════════════════════${C.N}`);
  console.log(`${C.B}  DEMO SEED COMPLETE${C.N}`);
  console.log(`${C.B}${C.C}══════════════════════════════════════════════════${C.N}`);
  console.log(`  Org:       ${DEMO_ORG}`);
  console.log(`  Email:     ${DEMO_EMAIL}`);
  console.log(`  Password:  ${DEMO_PASSWORD}`);
  console.log(`  KB docs:   ${KB_DOCUMENTS.length}`);
  console.log(`  Contacts:  ${CRM_CONTACTS.length}`);
  console.log(`\n  ${C.G}${C.B}Open https://eunoia-ai-os-platform.vercel.app/login${C.N}`);
  console.log(`  ${C.D}and sign in with the demo credentials above${C.N}\n`);

  if (DRY_RUN) {
    console.log(`  ${C.Y}This was a dry run. Run without --dry-run to apply.${C.N}\n`);
  }
}

main().catch((e) => {
  console.error(`\n${C.R}Fatal error: ${(e as Error).message}${C.N}`);
  process.exit(1);
});
