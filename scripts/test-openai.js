const OpenAI = require("openai");

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

async function run() {
  const r = await client.embeddings.create({
    model: "text-embedding-3-small",
    input: "hello world"
  });

  console.log("SUCCESS");
  console.log(r.data[0].embedding.length);
}

run().catch(console.error);
