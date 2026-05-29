import createSodium from "./libsodium.mjs"

const sodium = {}
sodium.ready = createSodium().then((module) => Object.assign(sodium, module))

export default sodium
