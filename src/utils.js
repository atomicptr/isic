function assign(baseObj, ...objects) {
    for(let obj of objects) {
        if(!obj) continue

        for(let member of Object.keys(obj)) {
            if(typeof obj[member] === "object") {
                if(typeof baseObj[member] === "undefined") {
                    baseObj[member] = {}
                }

                // is null...
                if(!obj[member]) {
                    baseObj[member] = null
                    continue
                }

                if(Array.isArray(obj[member])) {
                    baseObj[member] = obj[member]
                    continue
                }

                baseObj[member] = assign({}, baseObj[member], obj[member])
            } else {
                baseObj[member] = obj[member]
            }
        }
    }

    return baseObj
}

module.exports = {assign}
