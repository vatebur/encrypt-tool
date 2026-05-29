const PUBLIC_KEYS_KEY = "publicKeys"
const CIPHERTEXT_LIMIT = 10
const PUBLIC_KEY_LIMIT = 20
const MAX_NAME_LENGTH = 80
const MAX_VALUE_LENGTH = 12000

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8"
    }
  })
}

async function readList(env, key) {
  const raw = await env.STORE.get(key)
  if(!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

async function writeList(env, key, list) {
  await env.STORE.put(key, JSON.stringify(list))
}

async function readBody(request) {
  try {
    return await request.json()
  } catch {
    return null
  }
}

function cleanString(value) {
  return typeof value === "string" ? value.trim() : ""
}

function assertString(value, field, maxLength = MAX_VALUE_LENGTH) {
  const clean = cleanString(value)
  if(!clean) return `${field} is required.`
  if(clean.length > maxLength) return `${field} is too long.`
  return ""
}

function assertOptionalString(value, field, maxLength = MAX_NAME_LENGTH) {
  const clean = cleanString(value)
  if(!clean) return ""
  if(clean.length > maxLength) return `${field} is too long.`
  return ""
}

function newestFirst(a, b) {
  return String(b.createdAt).localeCompare(String(a.createdAt))
}

function ciphertextsKey(recipientPublicKey) {
  return `ciphertexts:${recipientPublicKey}`
}

async function listCiphertexts(request, env) {
  const url = new URL(request.url)
  const recipientPublicKey = cleanString(url.searchParams.get("recipientPublicKey"))
  if(!recipientPublicKey) return json({ error: "recipientPublicKey is required." }, 400)

  const records = await readList(env, ciphertextsKey(recipientPublicKey))
  return json({ records: records.sort(newestFirst) })
}

async function createCiphertext(request, env) {
  const body = await readBody(request)
  if(!body) return json({ error: "Invalid JSON body." }, 400)

  const nameError = assertString(body.name, "name", MAX_NAME_LENGTH)
  const ciphertextError = assertString(body.ciphertext, "ciphertext")
  const publicKeyError = assertString(body.recipientPublicKey, "recipientPublicKey")
  if(nameError || ciphertextError || publicKeyError){
    return json({ error: nameError || ciphertextError || publicKeyError }, 400)
  }

  const now = new Date().toISOString()
  const record = {
    id: crypto.randomUUID(),
    name: cleanString(body.name),
    ciphertext: cleanString(body.ciphertext),
    recipientPublicKey: cleanString(body.recipientPublicKey),
    createdAt: now
  }
  const records = await readList(env, ciphertextsKey(record.recipientPublicKey))
  records.push(record)
  records.sort(newestFirst)
  await writeList(env, ciphertextsKey(record.recipientPublicKey), records.slice(0, CIPHERTEXT_LIMIT))
  return json({ record }, 201)
}

async function listPublicKeys(env) {
  const records = await readList(env, PUBLIC_KEYS_KEY)
  return json({ records: records.sort(newestFirst) })
}

async function createPublicKey(request, env) {
  const body = await readBody(request)
  if(!body) return json({ error: "Invalid JSON body." }, 400)

  const publicKeyError = assertString(body.publicKey, "publicKey")
  const nameError = assertOptionalString(body.name, "name")
  if(publicKeyError || nameError) return json({ error: publicKeyError || nameError }, 400)

  const publicKey = cleanString(body.publicKey)
  const name = cleanString(body.name)
  const records = await readList(env, PUBLIC_KEYS_KEY)
  const withoutDuplicate = records.filter((record) => record.publicKey !== publicKey)
  const existing = records.find((record) => record.publicKey === publicKey)
  const record = {
    id: existing?.id || crypto.randomUUID(),
    name,
    publicKey,
    createdAt: new Date().toISOString()
  }
  withoutDuplicate.push(record)
  withoutDuplicate.sort(newestFirst)
  await writeList(env, PUBLIC_KEYS_KEY, withoutDuplicate.slice(0, PUBLIC_KEY_LIMIT))
  return json({ record }, 201)
}

async function handleApi(request, env) {
  if(!env.STORE) return json({ error: "KV STORE binding is not configured." }, 500)

  const url = new URL(request.url)
  if(url.pathname === "/api/ciphertexts"){
    if(request.method === "GET") return listCiphertexts(request, env)
    if(request.method === "POST") return createCiphertext(request, env)
  }

  if(url.pathname === "/api/public-keys"){
    if(request.method === "GET") return listPublicKeys(env)
    if(request.method === "POST") return createPublicKey(request, env)
  }

  return json({ error: "Not found." }, 404)
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url)
    if(url.pathname.startsWith("/api/")){
      return handleApi(request, env)
    }
    return env.ASSETS.fetch(request, env, ctx)
  }
}
