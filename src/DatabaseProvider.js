const {MongoClient} = require("mongodb")

class DatabaseProvider {
    constructor(bot, settings, callback) {
        this.bot = bot
        this.settings = settings

        let authstr = ""

        if(settings.username && settings.password) {
            authstr = `${settings.username}:${settings.password}@`
        }

        let optionsstr = ""

        if(settings.options) {
            let options = []

            for(let option of Object.keys(settings.options)) {
                options.push({key: option, val: settings.options[option]})
            }

            if(options.length > 0) {
                const strings = options.map(o => `${o.key}=${o.val}`)
                optionsstr = `?${strings.join("&")}`
            }
        }

        const url = `mongodb://${authstr}${settings.host}:${settings.port}/${settings.database_name}${optionsstr}`

        this.db = null

        let printurl = url.replace(`${this.settings.username}:${this.settings.password}@`, `${this.settings.username}:**********@`)
        this.bot.log.debug(`trying to connect with database: ${printurl}`)

        MongoClient.connect(url).then(db => {
            this.db = db

            callback()
        }).catch(err => {
            this.bot.log.error(err)
            process.exit(1)
        })
    }

    globalCollection(mod, collectionName) {
        return this.db.collection(this.collectionName(mod, collectionName))
    }

    collection(mod, collectionName, serverId) {
        return this.db.collection(this.collectionName(mod, collectionName, serverId))
    }

    collectionName(mod, collectionName, serverId) {
        const isGlobal = typeof serverId === "undefined"
        return `${isGlobal ? "global" : serverId}::${mod.identifier}::${collectionName}`
    }

    // if you want to query collections from all servers/users might be useful for intervals
    eachCollection(mod, collectionName, callback) {
        return new Promise((resolve, reject) => {
            this.db.listCollections().toArray().then(collections => {
                let affected = collections.filter(collection => collection.name.endsWith(`::${mod.identifier}::${collectionName}`))

                if(typeof callback !== "undefined") {
                    affected.forEach(collection => {
                        callback(this.db.collection(collection.name))
                    })
                }

                resolve(affected.map(col => this.db.collection(col.name)))
            })
        })
    }
}

module.exports = DatabaseProvider
