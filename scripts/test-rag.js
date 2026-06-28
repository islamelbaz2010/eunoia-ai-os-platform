const { createClient } = require("@supabase/supabase-js");
const OpenAI = require("openai");

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

function cosineSimilarity(a, b) {
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; magA += a[i] ** 2; magB += b[i] ** 2; }
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

async function cleanup(supabase, orgId) {
  await supabase.from("usage_events").delete().eq("organization_id", orgId);
  await supabase.from("audit_logs").delete().eq("organization_id", orgId);
  await supabase.from("knowledge_base_chunks").delete().eq("organization_id", orgId);
  await supabase.from("knowledge_base_documents").delete().eq("organization_id", orgId);
  await supabase.from("organizations").delete().eq("id", orgId);
}

async function run() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) throw new Error("Missing Supabase env vars");
  if (!OPENAI_API_KEY) throw new Error("Missing OPENAI_API_KEY");

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

  // --- 1. Supabase connectivity ---
  console.log("\n[1] Supabase connectivity...");
  const { error: pingErr } = await supabase.from("organizations").select("id").limit(1);
  if (pingErr) throw new Error("Supabase ping failed: " + pingErr.message);
  console.log("    PASS");

  // Seed: org + document
  const { data: org, error: orgErr } = await supabase
    .from("organizations")
    .insert({ name: "__test_eunoia__", slug: "__test_eunoia__" })
    .select("id").single();
  if (orgErr) throw new Error("Seed org failed: " + orgErr.message);
  const orgId = org.id;

  const { data: doc, error: docErr } = await supabase
    .from("knowledge_base_documents")
    .insert({ organization_id: orgId, title: "Test doc" })
    .select("id").single();
  if (docErr) { await cleanup(supabase, orgId); throw new Error("Seed doc failed: " + docErr.message); }
  const docId = doc.id;
  console.log("    [seed] org=" + orgId.slice(0, 8) + "… doc=" + docId.slice(0, 8) + "…");

  try {
    // --- 2. Embedding generation ---
    console.log("\n[2] Embedding generation...");
    const texts = [
      "The hotel check-in time is 3pm. Check-out is at 11am.",
      "The hotel pool is open from 7am to 10pm daily.",
    ];
    const embRes = await openai.embeddings.create({ model: "text-embedding-3-small", input: texts });
    const embeddings = embRes.data.map((d) => d.embedding);
    if (embeddings[0].length !== 1536) throw new Error("Bad dims: " + embeddings[0].length);
    console.log("    PASS (1536 dims, " + embeddings.length + " vectors)");

    // --- 3. Chunk insertion ---
    console.log("\n[3] Chunk insertion...");
    const { error: insErr } = await supabase.from("knowledge_base_chunks").insert(
      texts.map((content, i) => ({
        document_id: docId,
        organization_id: orgId,
        content,
        embedding: JSON.stringify(embeddings[i]),
      }))
    );
    if (insErr) throw new Error("Insert failed: " + insErr.message);
    const { data: stored } = await supabase
      .from("knowledge_base_chunks").select("id, content").eq("document_id", docId);
    console.log("    PASS (" + stored.length + " chunks stored)");

    // --- 4. Vector search (direct cosine similarity via service_role read) ---
    console.log("\n[4] Vector search...");
    const queryRes = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: "What time is check-in?",
    });
    const queryVec = queryRes.data[0].embedding;

    // Read back stored embeddings and rank by cosine similarity in JS
    const { data: rows, error: fetchErr } = await supabase
      .from("knowledge_base_chunks")
      .select("id, content, embedding")
      .eq("organization_id", orgId);
    if (fetchErr) throw new Error("Fetch chunks failed: " + fetchErr.message);

    const ranked = rows
      .map((r) => ({ ...r, sim: cosineSimilarity(queryVec, JSON.parse(r.embedding)) }))
      .sort((a, b) => b.sim - a.sim);

    if (ranked.length === 0) throw new Error("No chunks retrieved");
    console.log("    PASS (" + ranked.length + " chunks ranked)");
    console.log("    Top sim: " + ranked[0].sim.toFixed(4) + " → \"" + ranked[0].content.slice(0, 55) + "\"");

    // --- 4b. match_kb_chunks RPC reachability ---
    console.log("\n[4b] match_kb_chunks RPC (auth-gated, expect empty without session)...");
    const { data: rpcData, error: rpcErr } = await supabase.rpc("match_kb_chunks", {
      query_embedding: JSON.stringify(queryVec),
      target_org_id: orgId,
      match_count: 3,
    });
    if (rpcErr) throw new Error("RPC call failed entirely: " + rpcErr.message);
    // 0 results is expected — auth.uid() is null in service-role context, so is_org_member returns false
    console.log("    PASS (RPC callable, returned " + (rpcData ? rpcData.length : 0) + " rows — correct: no session)");

    // --- 5. RAG end-to-end (embed → search → GPT-4o-mini) ---
    console.log("\n[5] RAG end-to-end...");
    const context = ranked.map((r, i) => `[${i + 1}] ${r.content}`).join("\n\n");
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are Eunoia, a hospitality AI. Answer only from context. Cite [1],[2] etc." },
        { role: "user", content: `Context:\n${context}\n\nQuestion: What time is check-in?` },
      ],
    });
    const answer = completion.choices[0]?.message?.content;
    if (!answer) throw new Error("No GPT answer");
    console.log("    PASS");
    console.log("    Answer: " + answer);

    // --- 6. Audit logs ---
    console.log("\n[6] Audit logs...");
    const { error: auditInsErr } = await supabase.from("audit_logs").insert({
      organization_id: orgId,
      action: "test_rag_query",
      target_type: "test",
      target_id: "test-1",
    });
    if (auditInsErr) throw new Error("Audit insert failed: " + auditInsErr.message);
    const { data: logs, error: auditSelErr } = await supabase
      .from("audit_logs").select("id, action").eq("organization_id", orgId);
    if (auditSelErr) throw new Error("Audit select failed: " + auditSelErr.message);
    if (!logs || logs.length === 0) throw new Error("No audit logs found after insert");
    console.log("    PASS (" + logs.length + " log(s): " + logs.map((l) => l.action).join(", ") + ")");

    // --- 7. Usage events ---
    console.log("\n[7] Usage events...");
    const { error: usageInsErr } = await supabase.from("usage_events").insert({
      organization_id: orgId,
      event_type: "rag_query",
      quantity: 1,
    });
    if (usageInsErr) throw new Error("Usage insert failed: " + usageInsErr.message);
    const { data: events, error: usageSelErr } = await supabase
      .from("usage_events").select("id, event_type, quantity").eq("organization_id", orgId);
    if (usageSelErr) throw new Error("Usage select failed: " + usageSelErr.message);
    if (!events || events.length === 0) throw new Error("No usage events found after insert");
    console.log("    PASS (" + events.length + " event(s): " + events.map((e) => e.event_type).join(", ") + ")");

  } finally {
    await cleanup(supabase, orgId);
    console.log("\n    [cleanup] test data removed");
  }

  console.log("\n=== ALL CHECKS PASSED ===\n");
}

run().catch((err) => {
  console.error("\nFAILED:", err.message);
  process.exit(1);
});
